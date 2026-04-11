import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

security = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """Verify Supabase JWT and return payload."""
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """Return verified user payload."""
    return verify_token(credentials)


def require_role(role: str):
    """Role-based dependency factory."""
    def checker(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
        payload = verify_token(credentials)
        user_role = payload.get("user_metadata", {}).get("role", "user")
        if user_role != role:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role: {role}"
            )
        return payload
    return checker