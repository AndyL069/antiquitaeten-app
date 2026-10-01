# backend/tests/test_auth.py
import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.database import Base, engine, get_db
from app.models import User
from app.routes import auth
from app.routes.auth import get_current_user, require_admin

app = FastAPI()
app.include_router(auth.router)

@app.get("/api/test/admin-only")
def admin_only_route(admin: User = Depends(require_admin)):
    return {"message": "hello admin", "user": admin.email}

@pytest.fixture(autouse=True)
def clean_database():
    """Ensure clean database tables for each test."""
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(User.__table__.delete())
    yield
    with engine.begin() as conn:
        conn.execute(User.__table__.delete())

client = TestClient(app)

def test_register_and_login_flow():
    email = "admin@antik.de"
    # Register
    res = client.post("/api/auth/register", json={
        "email": email,
        "name": "Admin Antik",
        "password": "geheimespasswort123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == email
    assert data["role"] in ["ADMIN", "MEMBER"]
    assert "access_token" in res.cookies
    
    # Login
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": "geheimespasswort123"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.cookies
    assert login_res.json()["email"] == email
    
    # Me endpoint with cookie
    me_res = client.get("/api/auth/me", cookies=login_res.cookies)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

def test_first_user_admin_second_member():
    # First user
    res1 = client.post("/api/auth/register", json={
        "email": "first@antik.de",
        "name": "First User",
        "password": "password123"
    })
    assert res1.status_code == 200
    assert res1.json()["role"] == "ADMIN"
    
    # Second user
    res2 = client.post("/api/auth/register", json={
        "email": "second@antik.de",
        "name": "Second User",
        "password": "password123"
    })
    assert res2.status_code == 200
    assert res2.json()["role"] == "MEMBER"

def test_register_duplicate_email():
    client.post("/api/auth/register", json={
        "email": "dup@antik.de",
        "password": "password123"
    })
    dup_res = client.post("/api/auth/register", json={
        "email": "dup@antik.de",
        "password": "otherpassword"
    })
    assert dup_res.status_code in [400, 409]

def test_login_invalid_password():
    client.post("/api/auth/register", json={
        "email": "user@antik.de",
        "password": "correctpassword"
    })
    wrong_res = client.post("/api/auth/login", json={
        "email": "user@antik.de",
        "password": "wrongpassword"
    })
    assert wrong_res.status_code == 401

def test_bearer_token_and_logout():
    reg_res = client.post("/api/auth/register", json={
        "email": "bearer@antik.de",
        "password": "password123"
    })
    token = reg_res.cookies.get("access_token")
    assert token is not None
    
    # Test Authorization header
    me_header_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_header_res.status_code == 200
    assert me_header_res.json()["email"] == "bearer@antik.de"
    
    # Test logout
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200

def test_require_admin_protection():
    # Register first user (ADMIN)
    admin_reg = client.post("/api/auth/register", json={
        "email": "admin_role@antik.de",
        "password": "password123"
    })
    admin_cookies = admin_reg.cookies
    
    # Register second user (MEMBER)
    member_reg = client.post("/api/auth/register", json={
        "email": "member_role@antik.de",
        "password": "password123"
    })
    member_cookies = member_reg.cookies
    
    # Admin accesses admin route
    admin_res = client.get("/api/test/admin-only", cookies=admin_cookies)
    assert admin_res.status_code == 200
    assert admin_res.json()["user"] == "admin_role@antik.de"
    
    # Member is forbidden
    member_res = client.get("/api/test/admin-only", cookies=member_cookies)
    assert member_res.status_code == 403

def test_providers_endpoint():
    res = client.get("/api/auth/providers")
    assert res.status_code == 200
    data = res.json()
    assert "authentik" in data

def test_authentik_login_not_configured():
    from app.config import settings
    orig_issuer = settings.AUTHENTIK_ISSUER
    try:
        settings.AUTHENTIK_ISSUER = ""
        res = client.get("/api/auth/authentik/login", follow_redirects=False)
        assert res.status_code == 400
    finally:
        settings.AUTHENTIK_ISSUER = orig_issuer

def test_authentik_login_configured(monkeypatch):
    from app.config import settings
    from app.services.authentik_service import authentik_service

    monkeypatch.setattr(settings, "AUTHENTIK_ISSUER", "https://auth.example.com")
    monkeypatch.setattr(settings, "AUTHENTIK_CLIENT_ID", "test-client-id")
    monkeypatch.setattr(settings, "AUTHENTIK_CLIENT_SECRET", "test-client-secret")

    # Mock get_openid_config to avoid discovery network wait
    async def mock_openid_config():
        return {
            "authorization_endpoint": "https://auth.example.com/application/o/authorize/",
            "token_endpoint": "https://auth.example.com/application/o/token/",
            "userinfo_endpoint": "https://auth.example.com/application/o/userinfo/",
        }
    monkeypatch.setattr(authentik_service, "get_openid_config", mock_openid_config)
    
    res = client.get("/api/auth/authentik/login?redirect=/catalog", follow_redirects=False)
    assert res.status_code in [302, 307]
    location = res.headers["location"]
    assert "https://auth.example.com" in location
    assert "test-client-id" in location
    assert "oauth_state" in res.cookies
    assert "oauth_redirect" in res.cookies
    cookie_state = res.cookies["oauth_state"]
    assert f"state={cookie_state}" in location

def test_authentik_callback_error():
    res = client.get(
        "/api/auth/authentik/callback?error=access_denied&state=csrf-123",
        cookies={"oauth_state": "csrf-123", "oauth_redirect": "/catalog"},
        follow_redirects=False
    )
    assert res.status_code in [302, 307]
    assert "/catalog?error=access_denied" in res.headers["location"]

def test_authentik_callback_csrf_mismatch():
    # State parameter doesn't match cookie
    res = client.get(
        "/api/auth/authentik/callback?code=valid-code&state=attack-state",
        cookies={"oauth_state": "legit-state", "oauth_redirect": "/catalog"},
        follow_redirects=False
    )
    assert res.status_code in [302, 307]
    assert "error=invalid_state" in res.headers["location"]

def test_authentik_callback_open_redirect_prevention(monkeypatch):
    from app.services.authentik_service import authentik_service

    async def mock_exchange(code: str, redirect_uri: str):
        return {"access_token": "mocked-authentik-token"}

    async def mock_user_info(access_token: str):
        return {"email": "open_redirect_user@antik.de", "name": "Open Redirect User"}

    monkeypatch.setattr(authentik_service, "exchange_code_for_token", mock_exchange)
    monkeypatch.setattr(authentik_service, "get_user_info", mock_user_info)

    # Malicious redirect URL attempt with protocol-relative slash
    res = client.get(
        "/api/auth/authentik/callback?code=valid-code&state=csrf-token",
        cookies={"oauth_state": "csrf-token", "oauth_redirect": "//evil.com"},
        follow_redirects=False
    )
    assert res.status_code == 302
    # Must fallback to "/" and not redirect to //evil.com
    assert res.headers["location"] == "/"

def test_authentik_callback_success(monkeypatch):
    from app.services.authentik_service import authentik_service

    async def mock_exchange(code: str, redirect_uri: str):
        return {"access_token": "mocked-authentik-token"}

    async def mock_user_info(access_token: str):
        return {"email": "sso_user@antik.de", "name": "SSO User"}

    monkeypatch.setattr(authentik_service, "exchange_code_for_token", mock_exchange)
    monkeypatch.setattr(authentik_service, "get_user_info", mock_user_info)

    res = client.get(
        "/api/auth/authentik/callback?code=valid-code&state=valid-state-123",
        cookies={"oauth_state": "valid-state-123", "oauth_redirect": "/catalog"},
        follow_redirects=False
    )
    assert res.status_code == 302
    assert res.headers["location"] == "/catalog"
    assert "access_token" in res.cookies

    # Verify user was created in DB and role is ADMIN (first user in clean db)
    me_res = client.get("/api/auth/me", cookies=res.cookies)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "sso_user@antik.de"
    assert me_res.json()["role"] == "ADMIN"
    assert me_res.json()["authProvider"] == "authentik"

def test_register_password_length_validation():
    # Password shorter than 8 chars
    res_short = client.post("/api/auth/register", json={
        "email": "short@antik.de",
        "password": "short"
    })
    assert res_short.status_code == 422

    # Password longer than 72 chars
    res_long = client.post("/api/auth/register", json={
        "email": "long@antik.de",
        "password": "a" * 73
    })
    assert res_long.status_code == 422

def test_authentik_callback_nextauth_path(monkeypatch):
    """Verify both /callback/authentik and /authentik/callback resolve correctly."""
    from app.services.authentik_service import authentik_service

    async def mock_exchange(code: str, redirect_uri: str):
        return {"access_token": "mocked-authentik-token"}

    async def mock_user_info(access_token: str):
        return {"email": "nextauth_path_user@antik.de", "name": "NextAuth Path User"}

    monkeypatch.setattr(authentik_service, "exchange_code_for_token", mock_exchange)
    monkeypatch.setattr(authentik_service, "get_user_info", mock_user_info)

    # Call NextAuth standard path: /api/auth/callback/authentik
    res = client.get(
        "/api/auth/callback/authentik?code=valid-code&state=valid-state-456",
        cookies={"oauth_state": "valid-state-456", "oauth_redirect": "/catalog"},
        follow_redirects=False
    )
    assert res.status_code == 302
    assert res.headers["location"] == "/catalog"
    assert "access_token" in res.cookies

def test_get_authentik_callback_url_resolution(monkeypatch):
    from app.config import settings
    from app.routes.auth import get_authentik_callback_url
    from starlette.requests import Request

    # 1. Default with proxy headers
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/auth/authentik/login",
        "headers": [
            (b"host", b"antik.am-homelab.de"),
            (b"x-forwarded-proto", b"https"),
            (b"x-forwarded-host", b"antik.am-homelab.de"),
        ],
    }
    req = Request(scope)
    monkeypatch.setattr(settings, "AUTH_URL", "")
    monkeypatch.setattr(settings, "AUTHENTIK_REDIRECT_URI", "")
    url = get_authentik_callback_url(req)
    assert url == "https://antik.am-homelab.de/api/auth/callback/authentik"

    # 2. Overridden with AUTH_URL
    monkeypatch.setattr(settings, "AUTH_URL", "https://custom.am-homelab.de")
    url2 = get_authentik_callback_url(req)
    assert url2 == "https://custom.am-homelab.de/api/auth/callback/authentik"

    # 3. Explicit AUTHENTIK_REDIRECT_URI
    monkeypatch.setattr(settings, "AUTHENTIK_REDIRECT_URI", "https://antik.am-homelab.de/api/custom/callback")
    url3 = get_authentik_callback_url(req)
    assert url3 == "https://antik.am-homelab.de/api/custom/callback"



