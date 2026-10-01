# backend/app/services/authentik_service.py
from typing import Optional, Dict, Any
from urllib.parse import urlencode
import httpx
from app.config import settings

class AuthentikService:
    def __init__(self):
        self._cached_config: Optional[Dict[str, Any]] = None

    def is_configured(self) -> bool:
        """Check if Authentik SSO is configured."""
        return bool(
            settings.AUTHENTIK_ISSUER and
            settings.AUTHENTIK_CLIENT_ID and
            settings.AUTHENTIK_CLIENT_SECRET
        )

    async def get_openid_config(self) -> Dict[str, Any]:
        """Fetch OIDC discovery document or return fallback endpoints."""
        if self._cached_config:
            return self._cached_config

        issuer = settings.AUTHENTIK_ISSUER.rstrip("/")
        well_known_url = f"{issuer}/.well-known/openid-configuration"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(well_known_url)
                if response.status_code == 200:
                    self._cached_config = response.json()
                    return self._cached_config
        except Exception:
            pass

        # Fallback to standard Authentik endpoint paths
        fallback = {
            "authorization_endpoint": f"{issuer}/application/o/authorize/",
            "token_endpoint": f"{issuer}/application/o/token/",
            "userinfo_endpoint": f"{issuer}/application/o/userinfo/",
        }
        return fallback

    async def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Construct the Authentik OAuth2 authorization URL."""
        config = await self.get_openid_config()
        auth_endpoint = config.get(
            "authorization_endpoint",
            f"{settings.AUTHENTIK_ISSUER.rstrip('/')}/application/o/authorize/"
        )

        params = {
            "response_type": "code",
            "client_id": settings.AUTHENTIK_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": "openid profile email",
            "state": state,
        }
        return f"{auth_endpoint}?{urlencode(params)}"

    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange the authorization code for tokens."""
        config = await self.get_openid_config()
        token_endpoint = config.get(
            "token_endpoint",
            f"{settings.AUTHENTIK_ISSUER.rstrip('/')}/application/o/token/"
        )

        data = {
            "grant_type": "authorization_code",
            "client_id": settings.AUTHENTIK_CLIENT_ID,
            "client_secret": settings.AUTHENTIK_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(token_endpoint, data=data)
            response.raise_for_status()
            return response.json()

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Fetch user profile information using the access token."""
        config = await self.get_openid_config()
        userinfo_endpoint = config.get(
            "userinfo_endpoint",
            f"{settings.AUTHENTIK_ISSUER.rstrip('/')}/application/o/userinfo/"
        )

        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(userinfo_endpoint, headers=headers)
            response.raise_for_status()
            return response.json()

authentik_service = AuthentikService()
