import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException
from passlib.context import CryptContext

SECRET_KEY = os.getenv("SECRET_KEY", "changeme-use-a-long-random-string")
ALGORITHM  = "HS256"

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password ───────────────────────────────
def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


# ── JWT ────────────────────────────────────
def create_token(data: dict, expires_hours: int = 24) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=expires_hours)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        raise HTTPException(401, f"Invalid or expired token: {e}")


def create_access_token(user_id: str, role: str) -> str:
    return create_token({"sub": user_id, "role": role}, expires_hours=24)


def create_reset_token(email: str) -> str:
    """Short-lived token for password reset (1 hour)."""
    return create_token({"email": email, "purpose": "reset"}, expires_hours=1)


def verify_reset_token(token: str) -> str:
    """Returns the email from a valid reset token."""
    payload = decode_token(token)
    if payload.get("purpose") != "reset":
        raise HTTPException(400, "Invalid reset token")
    return payload["email"]