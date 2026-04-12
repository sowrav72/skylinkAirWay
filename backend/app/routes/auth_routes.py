import uuid
from datetime import datetime,timedelta,timezone

from fastapi import APIRouter, HTTPException
from jose import jwt,JWTError
from passlib.context import CryptContext
from sqlalchemy import text

from app.database import engine
from app.schemas import (
    UserRegisterSchema,
    StaffRegisterSchema,
    LoginSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")   #bcrypt context#


def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def create_token(user_id: str, role: str, expires_minutes: int = 60 * 24 * 7) -> str:
    from os import getenv

    secret = getenv("SECRET_KEY", "")
    if not secret:
        raise HTTPException(500, "SECRET_KEY is not configured")

    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


@router.post("/register/user")
async def register_user(body: UserRegisterSchema):
    if not engine:
        raise HTTPException(503, "Database not configured")

    new_id = str(uuid.uuid4()) #checke duplicate id#
    hashed = hash_password(body.password)

    with engine.begin() as conn:
        existing = conn.execute(
            text("SELECT 1 FROM profiles WHERE email = :email LIMIT 1"),
            {"email": body.email},
        ).first()
        if existing:
            raise HTTPException(400, "An account with this email already exists")

        conn.execute(
            text(
                "INSERT INTO users (id, email, password_hash) VALUES (:id, :email, :password_hash)"
            ),
            {"id": new_id, "email": body.email, "password_hash": hashed},
        )
        conn.execute(
            text(
                """
                INSERT INTO profiles (id, full_name, email, phone, password_hash, role)
                VALUES (:id, :full_name, :email, :phone, :password_hash, 'user')
                """
            ),
            {
                "id": new_id,
                "full_name": body.full_name,
                "email": body.email,
                "phone": body.phone,
                "password_hash": hashed,
            },
        )

    return {"message": "Account Created successfully", "user_id": new_id, "role": "user"}


@router.post("/register/staff")     #register user#
async def register_staff(body: StaffRegisterSchema):
    if not engine:
        raise HTTPException(503, "Database not configured")

    new_id = str(uuid.uuid4())
    hashed = hash_password(body.password)

    with engine.begin() as conn:
        code = conn.execute(
            text("SELECT code FROM valid_staff_codes WHERE code=:code AND used=false LIMIT 1"),
            {"code": body.staff_id},
        ).first()
        if not code:
            raise HTTPException(400, "Invalid or already used Staff ID. Contact your manager.")

        dup = conn.execute(
            text("SELECT 1 FROM profiles WHERE email=:email UNION SELECT 1 FROM staff WHERE email=:email LIMIT 1"),
            {"email": body.email},
        ).first()
        if dup:
            raise HTTPException(400, "An account with this email already exists")

        conn.execute(
            text(
                "INSERT INTO users (id, email, password_hash) VALUES (:id, :email, :password_hash)"
            ),
            {"id": new_id, "email": body.email, "password_hash": hashed},
        )
        conn.execute(
            text(
                """
                INSERT INTO profiles (id, full_name, email, phone, password_hash, role)
                VALUES (:id, :full_name, :email, :phone, :password_hash, 'staff')
                """
            ),
            {
                "id": new_id,
                "full_name": body.full_name,
                "email": body.email,
                "phone": body.phone,
                "password_hash": hashed,
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO staff (id, full_name, email, staff_id, department, phone, password_hash)
                VALUES (:id, :full_name, :email, :staff_id, :department, :phone, :password_hash)
                """
            ),
            {
                "id": new_id,
                "full_name": body.full_name,
                "email": body.email,
                "staff_id": body.staff_id,
                "department": body.department or "General",
                "phone": body.phone,
                "password_hash": hashed,
            },
        )
        conn.execute(
            text("UPDATE valid_staff_codes SET used=true WHERE code=:code"),
            {"code": body.staff_id},
        )

    return {"message": "Staff account created successfully", "user_id": new_id, "role": "staff"}


@router.post("/login")      #login (user+staff)#
async def login(body: LoginSchema):
    if not engine:
        raise HTTPException(503, "Database not configured")

    role = body.role.lower()
    if role not in ("user", "staff"):
        raise HTTPException(400, "Invalid role. Must be 'user' or 'staff'")

    with engine.connect() as conn:
        if role == "user":
            row = conn.execute(
                text(
                    """
                    SELECT id, full_name, email, phone, role, password_hash, created_at
                    FROM profiles
                    WHERE email=:email AND role='user'
                    LIMIT 1
                    """
                ),
                {"email": body.email},
            ).mappings().first()
            if not row:
                raise HTTPException(401, "No passenger account found with this email")
            if not verify_password(body.password, row["password_hash"]):
                raise HTTPException(401, "Incorrect password")
            token = create_token(row["id"], "user")
            return {
                "message": "Login successful",
                "token": token,
                "user_id": row["id"],
                "role": "user",
                "full_name": row["full_name"],
                "email": row["email"],
                "phone": row.get("phone"),
                "created_at": str(row.get("created_at", "")),
            }

        row = conn.execute(
            text(
                """
                SELECT id, full_name, email, phone, staff_id, department, password_hash, created_at
                FROM staff
                WHERE email=:email
                LIMIT 1
                """
            ),
            {"email": body.email},
        ).mappings().first()
        if not row:
            raise HTTPException(401, "No staff account found with this email")
        if not verify_password(body.password, row["password_hash"]):
            raise HTTPException(401, "Incorrect password")
        token = create_token(row["id"], "staff")
        return {
            "message": "Login successful",
            "token": token,
            "user_id": row["id"],
            "role": "staff",
            "full_name": row["full_name"],
            "email": row["email"],
            "phone": row.get("phone"),
            "staff_id": row["staff_id"],
            "department": row["department"],
            "created_at": str(row.get("created_at", "")),
        }


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordSchema):
    # Neon-only fallback: return short-lived reset token when user exists.
    if not engine:
        raise HTTPException(503, "Database not configured")

    with engine.connect() as conn:
        user = conn.execute(
            text("SELECT id FROM users WHERE email=:email LIMIT 1"),
            {"email": body.email},
        ).first()

    if not user:
        return {"message": "If this email is registered, a reset link has been sent."}
    
    reset_token = create_token(str(user[0]), "password_reset", expires_minutes=30)
    return {
        "message": "If this email is registered, a reset link has been sent.",
        "reset_token": reset_token,
    }


@router.post("/reset-password")
async def reset_password(body: ResetPasswordSchema):
    if not engine:
        raise HTTPException(503, "Database not configured")

    from os import getenv

    secret = getenv("SECRET_KEY", "")
    if not secret:
        raise HTTPException(500, "SECRET_KEY is not configured")

    try:
        payload = jwt.decode(body.access_token, secret, algorithms=["HS256"])
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(400, "Invalid reset token")

    except JWTError:
        raise HTTPException(400, "Invalid or expired reset token")

    new_hash = hash_password(body.new_password)

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE users SET password_hash=:hash WHERE id=:id"),
            {"hash": new_hash, "id": user_id},
        )
        conn.execute(
            text("UPDATE profiles SET password_hash=:hash, updated_at=now() WHERE id=:id"),
            {"hash": new_hash, "id": user_id},
        )
        conn.execute(
            text("UPDATE staff SET password_hash=:hash, updated_at=now() WHERE id=:id"),
            {"hash": new_hash, "id": user_id},
        )

    return {"message": "Password updated successfully, You can now sign in."}

@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}