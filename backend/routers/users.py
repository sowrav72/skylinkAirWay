import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_staff,
)
import models, schemas
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])
profile_router = APIRouter(prefix="/users", tags=["users"])

# Valid staff IDs (in production store these in DB or config)
VALID_STAFF_IDS = {"STAFF001", "STAFF002", "STAFF003", "SKY-STAFF", "SKYLINK-STAFF"}


# ── REGISTER ───────────────────────────────────────────────────────────────────
@router.post("/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        phone=payload.phone,
        role=models.UserRole.passenger,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return schemas.TokenResponse(access_token=token, user=user)


# ── UPGRADE TO STAFF ────────────────────────────────────────────────────────────
class StaffUpgradeRequest(BaseModel):
    staff_id: str


@router.post("/upgrade-to-staff")
def upgrade_to_staff(
    payload: StaffUpgradeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Allow a newly registered user to become staff if they have a valid staff ID."""
    if current_user.role != models.UserRole.passenger:
        raise HTTPException(status_code=400, detail="User is already staff or admin")
    if payload.staff_id.upper() not in VALID_STAFF_IDS:
        raise HTTPException(status_code=403, detail="Invalid staff ID")
    current_user.role = models.UserRole.staff
    db.commit()
    db.refresh(current_user)
    token = create_access_token({"sub": str(current_user.id)})
    return schemas.TokenResponse(access_token=token, user=current_user)


# ── LOGIN ──────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    token = create_access_token({"sub": str(user.id)})
    return schemas.TokenResponse(access_token=token, user=user)


# ── FORGOT PASSWORD ────────────────────────────────────────────────────────────
@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = hash_password(token)
        user.reset_token_exp = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        return {"message": "Reset token generated", "token": token, "email": user.email}
    return {"message": "If that email is registered you will receive a reset link"}


# ── RESET PASSWORD ─────────────────────────────────────────────────────────────
@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    raise HTTPException(status_code=400, detail="Use /auth/reset-password-confirm with email")


@router.post("/reset-password-confirm")
def reset_password_confirm(
    token: str,
    email: str,
    new_password: str,
    db: Session = Depends(get_db),
):
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = db.query(models.User).filter(models.User.email == email.lower()).first()
    if not user or not user.reset_token or not user.reset_token_exp:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if datetime.now(timezone.utc) > user.reset_token_exp:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    if not verify_password(token, user.reset_token):
        raise HTTPException(status_code=400, detail="Invalid reset token")
    user.hashed_password = hash_password(new_password)
    user.reset_token = None
    user.reset_token_exp = None
    db.commit()
    return {"message": "Password updated successfully"}


# ── ME / PROFILE ───────────────────────────────────────────────────────────────
@profile_router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@profile_router.put("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@profile_router.put("/me/password")
def change_password(
    payload: schemas.UserUpdatePassword,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


# ── STAFF: list all users ──────────────────────────────────────────────────────
@profile_router.get("/", response_model=list[schemas.UserOut])
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _staff: models.User = Depends(require_staff),
):
    return db.query(models.User).offset(skip).limit(limit).all()


@profile_router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _staff: models.User = Depends(require_staff),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@profile_router.patch("/{user_id}/role")
def update_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    _staff: models.User = Depends(require_staff),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        user.role = models.UserRole(role)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {[r.value for r in models.UserRole]}",
        )
    db.commit()
    db.refresh(user)
    return {"message": f"Role updated to {user.role.value}", "user_id": user.id}