# backend/app/routes/auth.py
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

@router.get("/authentik/login")
async def authentik_login(request: Request, redirect: Optional[str] = "/"):
    """Initiate Authentik OIDC OAuth authorization flow."""
    if not authentik_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentik ist nicht konfiguriert"
        )

    base_url = str(request.base_url).rstrip("/")
    callback_url = f"{base_url}/api/auth/authentik/callback"
    auth_url = await authentik_service.get_authorization_url(
        redirect_uri=callback_url,
        state=redirect or "/"
    )
    return RedirectResponse(url=auth_url)

@router.get("/authentik/callback")
async def authentik_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Handle OIDC callback from Authentik."""
    target_redirect = state if state and state.startswith("/") else "/"

    if error or not code:
        err_msg = error or "missing_code"
        return RedirectResponse(url=f"{target_redirect}?error={err_msg}")

    base_url = str(request.base_url).rstrip("/")
    callback_url = f"{base_url}/api/auth/authentik/callback"

    try:
        tokens = await authentik_service.exchange_code_for_token(code=code, redirect_uri=callback_url)
        userinfo = await authentik_service.get_user_info(access_token=tokens["access_token"])

        email = userinfo.get("email")
        if not email:
            return RedirectResponse(url=f"{target_redirect}?error=no_email_returned")

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
        return RedirectResponse(url=f"{target_redirect}?error=authentik_exchange_failed")
