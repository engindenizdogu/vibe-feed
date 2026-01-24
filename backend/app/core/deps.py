from typing import Annotated, Optional
from functools import lru_cache
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from jose import jwt, jwk
from jose.exceptions import JWTError, JWKError

from .config import get_settings, Settings

security = HTTPBearer(auto_error=False)


def get_supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


@lru_cache(maxsize=1)
def get_jwks(jwks_url: str) -> dict:
    """Fetch and cache the JWKS from Supabase."""
    response = httpx.get(jwks_url)
    response.raise_for_status()
    return response.json()


def get_signing_key(token: str, jwks_url: str) -> str:
    """Get the signing key from JWKS that matches the token's kid."""
    try:
        # Get the key ID from the token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing key ID",
            )

        # Fetch JWKS and find matching key
        jwks = get_jwks(jwks_url)
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return jwk.construct(key)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to find matching key",
        )
    except JWKError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid key: {str(e)}",
        )


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    settings: Annotated[Settings, Depends(get_settings)],
    supabase: Annotated[Client, Depends(get_supabase)],
) -> dict:
    """Get current authenticated user from JWT token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        token = credentials.credentials

        # Get the signing key from JWKS
        signing_key = get_signing_key(token, settings.supabase_jwks_url)

        # Verify the Supabase JWT with ES256
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["ES256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        # Get user from Supabase
        result = supabase.table("users").select("*").eq("id", user_id).single().execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return result.data

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


async def get_optional_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    settings: Annotated[Settings, Depends(get_settings)],
    supabase: Annotated[Client, Depends(get_supabase)],
) -> Optional[dict]:
    """Get current user if authenticated, None otherwise."""
    if not credentials:
        return None

    try:
        return await get_current_user(credentials, settings, supabase)
    except HTTPException:
        return None
