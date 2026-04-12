import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

SECRET_KEY = os.getenv("SECRET_KEY", "")
security = HTTPBearer(auto_error=False)


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    if not SECRET_KEY:
        raise HTTPException(status_code=500, detail="SECRET_KEY is not configured")
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    return verify_token(credentials)


def require_role(role: str):
    def checker(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
        payload = verify_token(credentials)
        user_role = payload.get("role","users")
        if user_role != role:
            raise HTTPException(status_code=403, detail=f"Access denied. Required role: {role}")
        return payload
    
    return checker