# backend/app/routes/auth.py
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import UserRegister, UserLogin, UserResponse, AuthProvidersResponse
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.services.authentik_service import authentik_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ==========================================
# Authentication Dependencies
# ==========================================

def get_optional_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Retrieve authenticated user from cookie or Authorization header, or None."""
    token: Optional[str] = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if not user and "email" in payload:
        user = db.query(User).filter(User.email == payload["email"]).first()

    return user

def get_current_user(
    user: Optional[User] = Depends(get_optional_user)
) -> User:
    """Ensure user is authenticated, otherwise raise HTTP 401."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nicht authentifiziert"
        )
    return user

def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure authenticated user has ADMIN role, otherwise raise HTTP 403."""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administratorrechte erforderlich"
        )
    return current_user

# ==========================================
# Routes
# ==========================================

@router.post("/register", response_model=UserResponse)
def register(
    data: UserRegister,
    response: Response,
    db: Session = Depends(get_db)
):
    """Register a new user. The first registered user receives the ADMIN role."""
    email = data.email.lower().strip()
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="E-Mail ist erforderlich")

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-Mail ist bereits registriert"
        )

    # First user becomes ADMIN, subsequent users receive MEMBER
    user_count = db.query(User).count()
    role = "ADMIN" if user_count == 0 else "MEMBER"

    password_hash = hash_password(data.password)
    new_user = User(
        email=email,
        name=data.name.strip() if data.name else None,
        passwordHash=password_hash,
        role=role,
        authProvider="credentials"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate JWT and set HttpOnly session cookie
    token = create_access_token({
        "sub": new_user.id,
        "email": new_user.email,
        "role": new_user.role
    })
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        samesite="lax"
    )

    return new_user

@router.post("/login", response_model=UserResponse)
def login(
    data: UserLogin,
    response: Response,
    db: Session = Depends(get_db)
):
    """Log in with email and password, setting an HttpOnly access token cookie."""
    email = data.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(data.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültige E-Mail-Adresse oder Passwort"
        )

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role
    })
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        samesite="lax"
    )

    return user

@router.post("/logout")
def logout(response: Response):
    """Log out by clearing the access token cookie."""
    response.delete_cookie(key=settings.COOKIE_NAME, path="/")
    return {"ok": True, "message": "Erfolgreich abgemeldet"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently logged-in user."""
    return current_user

@router.get("/providers", response_model=AuthProvidersResponse)
def get_providers():
    """Return available authentication providers."""
    return {"authentik": authentik_service.is_configured()}

def get_authentik_callback_url(request: Request) -> str:
    """
    Determine callback redirect_uri for Authentik OIDC.
    Prioritizes AUTHENTIK_REDIRECT_URI if set, then AUTH_URL / reverse-proxy headers.
    Defaults to NextAuth standard callback path /api/auth/callback/authentik.
    """
    if settings.AUTHENTIK_REDIRECT_URI:
        return settings.AUTHENTIK_REDIRECT_URI

    if settings.AUTH_URL:
        base_url = settings.AUTH_URL.rstrip("/")
    else:
        proto = request.headers.get("x-forwarded-proto") or request.url.scheme
        host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
        base_url = f"{proto}://{host}".rstrip("/")

    return f"{base_url}/api/auth/callback/authentik"

@router.get("/authentik/login")
async def authentik_login(request: Request, redirect: Optional[str] = "/"):
    """Initiate Authentik OIDC OAuth authorization flow with CSRF state protection."""
    if not authentik_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentik ist nicht konfiguriert"
        )

    callback_url = get_authentik_callback_url(request)
    oauth_state = secrets.token_urlsafe(32)
    auth_url = await authentik_service.get_authorization_url(
        redirect_uri=callback_url,
        state=oauth_state
    )

    safe_redirect = (
        redirect
        if (redirect and redirect.startswith("/") and not redirect.startswith("//") and not redirect.startswith("/\\"))
        else "/"
    )

    response = RedirectResponse(url=auth_url)
    response.set_cookie(
        key="oauth_state",
        value=oauth_state,
        httponly=True,
        max_age=300,
        path="/",
        samesite="lax"
    )
    response.set_cookie(
        key="oauth_redirect",
        value=safe_redirect,
        httponly=True,
        max_age=300,
        path="/",
        samesite="lax"
    )
    response.set_cookie(
        key="oauth_callback_url",
        value=callback_url,
        httponly=True,
        max_age=300,
        path="/",
        samesite="lax"
    )
    return response

@router.get("/callback/authentik")
@router.get("/authentik/callback")
async def authentik_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Handle OIDC callback from Authentik."""
    # Open Redirect Prevention: validate redirect target or state
    raw_target = request.cookies.get("oauth_redirect") or state
    target_redirect = (
        raw_target
        if (raw_target and raw_target.startswith("/") and not raw_target.startswith("//") and not raw_target.startswith("/\\"))
        else "/"
    )

    def cleanup_cookies(response: RedirectResponse):
        response.delete_cookie("oauth_state", path="/")
        response.delete_cookie("oauth_redirect", path="/")
        response.delete_cookie("oauth_callback_url", path="/")
        return response

    # CSRF Verification: verify request.cookies.get("oauth_state") == state
    stored_state = request.cookies.get("oauth_state")
    if not stored_state or not state or stored_state != state:
        resp = RedirectResponse(url=f"{target_redirect}?error=invalid_state")
        return cleanup_cookies(resp)

    if error or not code:
        err_msg = error or "missing_code"
        resp = RedirectResponse(url=f"{target_redirect}?error={err_msg}")
        return cleanup_cookies(resp)

    callback_url = request.cookies.get("oauth_callback_url") or get_authentik_callback_url(request)

    try:
        tokens = await authentik_service.exchange_code_for_token(code=code, redirect_uri=callback_url)
        userinfo = await authentik_service.get_user_info(access_token=tokens["access_token"])

        email = userinfo.get("email")
        if not email:
            resp = RedirectResponse(url=f"{target_redirect}?error=no_email_returned")
            return cleanup_cookies(resp)

        email = email.lower().strip()
        name = userinfo.get("name") or userinfo.get("preferred_username")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user_count = db.query(User).count()
            role = "ADMIN" if user_count == 0 else "MEMBER"
            user = User(
                email=email,
                name=name,
                passwordHash="",
                role=role,
                authProvider="authentik"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_access_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role
        })

        redirect_response = RedirectResponse(url=target_redirect, status_code=status.HTTP_302_FOUND)
        cleanup_cookies(redirect_response)
        redirect_response.set_cookie(
            key=settings.COOKIE_NAME,
            value=token,
            httponly=True,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/",
            samesite="lax"
        )
        return redirect_response
    except Exception as e:
        resp = RedirectResponse(url=f"{target_redirect}?error=authentik_exchange_failed")
        return cleanup_cookies(resp)


