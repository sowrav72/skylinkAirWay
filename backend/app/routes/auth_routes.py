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


# ── USER REGISTER ──────────────────────────
@router.post("/register/user")
async def register_user(body: UserRegisterSchema):
    if not supabase:
        raise HTTPException(503, "Supabase not configured")
    try:
        res = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {
                "data": {"role": "user", "full_name": body.full_name}
            },
        })
        if res.user is None:
            raise HTTPException(400, "Registration failed — check your email")

        # Insert into profiles table
        supabase.table("profiles").insert({
            "id": res.user.id,
            "full_name": body.full_name,
            "role": "user",
        }).execute()

        return {"message": "User registered. Please verify your email.", "user_id": res.user.id}

    except Exception as e:
        raise HTTPException(400, str(e))


# ── STAFF REGISTER ─────────────────────────
@router.post("/register/staff")
async def register_staff(body: StaffRegisterSchema):
    if not supabase:
        raise HTTPException(503, "Supabase not configured")

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
        res = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {
                "data": {
                    "role": "staff",
                    "full_name": body.full_name,
                    "staff_id": body.staff_id,
                }
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

        return {"message": "Staff account created. Please verify your email.", "user_id": res.user.id}

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
        supabase.auth.reset_password_email(
            body.email,
            options={"redirect_to": "http://localhost:3000/reset-password"},
        )
        return {"message": "If this email exists, a reset link has been sent."}
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