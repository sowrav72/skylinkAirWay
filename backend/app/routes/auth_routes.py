import time
from fastapi import APIRouter, HTTPException
from app.schemas import (
    UserRegisterSchema,
    StaffRegisterSchema,
    LoginSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
)
from app.database import supabase, supabase_admin

router = APIRouter(prefix="/auth", tags=["Auth"])

# Simple in-memory cooldowns (moderate security for class project)
EMAIL_COOLDOWN_SECONDS = 60
_email_action_timestamps = {}


def _enforce_email_cooldown(action: str, email: str):
    key = f"{action}:{email.strip().lower()}"
    now = time.time()
    last = _email_action_timestamps.get(key, 0)
    wait_left = int(EMAIL_COOLDOWN_SECONDS - (now - last))
    if wait_left > 0:
        raise HTTPException(429, f"Please wait {wait_left} seconds before trying again")
    _email_action_timestamps[key] = now


# ── USER REGISTER ──────────────────────────
@router.post("/register/user")
async def register_user(body: UserRegisterSchema):
    if not supabase_admin:
        raise HTTPException(503, "Supabase admin not configured")
    try:
        # Admin create_user avoids Supabase signup confirmation email
        res = supabase_admin.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
            "user_metadata": {"role": "user", "full_name": body.full_name},
        })
        if res.user is None:
            raise HTTPException(400, "Registration failed")

        # Insert into profiles table
        supabase.table("profiles").insert({
            "id": res.user.id,
            "full_name": body.full_name,
            "role": "user",
        }).execute()

        return {"message": "User registered successfully.", "user_id": res.user.id}

    except Exception as e:
        raise HTTPException(400, str(e))


# ── STAFF REGISTER ─────────────────────────
@router.post("/register/staff")
async def register_staff(body: StaffRegisterSchema):
    if not supabase_admin:
        raise HTTPException(503, "Supabase admin not configured")

    # Validate staff_id exists and is unused
    code_check = (
        supabase.table("valid_staff_codes")
        .select("*")
        .eq("code", body.staff_id)
        .eq("used", False)
        .execute()
    )
    if not code_check.data:
        raise HTTPException(400, "Invalid or already used Staff ID")

    try:
        # Admin create_user avoids Supabase signup confirmation email
        res = supabase_admin.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
            "user_metadata": {
                "role": "staff",
                "full_name": body.full_name,
                "staff_id": body.staff_id,
            },
        })
        if res.user is None:
            raise HTTPException(400, "Registration failed")

        # Insert into profiles with role=staff
        supabase.table("profiles").insert({
            "id": res.user.id,
            "full_name": body.full_name,
            "phone": body.phone,
            "role": "staff",
        }).execute()

        # Insert into staff table
        supabase.table("staff").insert({
            "id": res.user.id,
            "full_name": body.full_name,
            "staff_id": body.staff_id,
            "department": body.department or "General",
            "phone": body.phone,
        }).execute()

        # Mark staff code as used
        supabase.table("valid_staff_codes").update({"used": True}).eq("code", body.staff_id).execute()

        return {"message": "Staff account created successfully.", "user_id": res.user.id}

    except Exception as e:
        raise HTTPException(400, str(e))


# ── LOGIN (user + staff) ───────────────────
@router.post("/login")
async def login(body: LoginSchema):
    if not supabase:
        raise HTTPException(503, "Supabase not configured")
    try:
        res = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
        if res.user is None:
            raise HTTPException(401, "Invalid credentials")

        # Check role matches
        user_role = res.user.user_metadata.get("role", "user")
        if user_role != body.role:
            raise HTTPException(403, f"This account is not a {body.role} account")

        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "role": user_role,
            "user_id": res.user.id,
            "full_name": res.user.user_metadata.get("full_name", ""),
            "email": res.user.email,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(401, str(e))


# ── FORGOT PASSWORD ────────────────────────
@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordSchema):
    if not supabase:
        raise HTTPException(503, "Supabase not configured")
    try:
        _enforce_email_cooldown("forgot_password", body.email)
        supabase.auth.reset_password_email(
            body.email,
            options={"redirect_to": "http://localhost:3000/reset-password"},
        )
        return {"message": "If this email exists, a reset link has been sent."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))


# ── RESET PASSWORD ─────────────────────────
@router.post("/reset-password")
async def reset_password(body: ResetPasswordSchema):
    if not supabase:
        raise HTTPException(503, "Supabase not configured")
    try:
        # Set session with access token from email link
        supabase.auth.set_session(body.access_token, "")
        supabase.auth.update_user({"password": body.new_password})
        return {"message": "Password updated successfully"}
    except Exception as e:
        raise HTTPException(400, str(e))


# ── LOGOUT ────────────────────────────────
@router.post("/logout")
async def logout():
    if not supabase:
        raise HTTPException(503, "Supabase not configured")
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(400, str(e))
