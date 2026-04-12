import uuid
from fastapi import APIRouter, HTTPException
from passlib.context import CryptContext
from app.schemas import (
    UserRegisterSchema,
    StaffRegisterSchema,
    LoginSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
)
from app.database import supabase, supabase_admin

router = APIRouter(prefix="/auth", tags=["Auth"])

# ── bcrypt context ─────────────────────────
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


# ══════════════════════════════════════════
#  REGISTER USER
# ══════════════════════════════════════════
@router.post("/register/user")
async def register_user(body: UserRegisterSchema):
    if not supabase_admin:
        raise HTTPException(503, "Database not configured")

    # Check duplicate email
    existing = supabase_admin.table("profiles").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(400, "An account with this email already exists")

    hashed = hash_password(body.password)
    new_id = str(uuid.uuid4())

    try:
        supabase_admin.table("profiles").insert({
            "id":            new_id,
            "full_name":     body.full_name,
            "email":         body.email,
            "phone":         body.phone,
            "password_hash": hashed,
            "role":          "user",
        }).execute()

        return {
            "message": "Account created successfully",
            "user_id": new_id,
            "role":    "user",
        }

    except Exception as e:
        raise HTTPException(400, f"Registration failed: {str(e)}")


# ══════════════════════════════════════════
#  REGISTER STAFF
# ══════════════════════════════════════════
@router.post("/register/staff")
async def register_staff(body: StaffRegisterSchema):
    if not supabase_admin:
        raise HTTPException(503, "Database not configured")

    # 1. Validate staff_id exists and is unused
    code = (
        supabase_admin.table("valid_staff_codes")
        .select("*")
        .eq("code", body.staff_id)
        .eq("used", False)
        .execute()
    )
    if not code.data:
        raise HTTPException(400, "Invalid or already used Staff ID. Contact your manager.")

    # 2. Check duplicate email in profiles OR staff
    dup_profile = supabase_admin.table("profiles").select("id").eq("email", body.email).execute()
    dup_staff   = supabase_admin.table("staff").select("id").eq("email", body.email).execute()
    if dup_profile.data or dup_staff.data:
        raise HTTPException(400, "An account with this email already exists")

    hashed = hash_password(body.password)
    new_id = str(uuid.uuid4())

    try:
        # Insert into profiles with role=staff
        supabase_admin.table("profiles").insert({
            "id":            new_id,
            "full_name":     body.full_name,
            "email":         body.email,
            "phone":         body.phone,
            "password_hash": hashed,
            "role":          "staff",
        }).execute()

        # Insert into staff table
        supabase_admin.table("staff").insert({
            "id":            new_id,
            "full_name":     body.full_name,
            "email":         body.email,
            "staff_id":      body.staff_id,
            "department":    body.department or "General",
            "phone":         body.phone,
            "password_hash": hashed,
        }).execute()

        # Mark staff code as used
        supabase_admin.table("valid_staff_codes").update({"used": True}).eq("code", body.staff_id).execute()

        return {
            "message": "Staff account created successfully",
            "user_id": new_id,
            "role":    "staff",
        }

    except Exception as e:
        raise HTTPException(400, f"Registration failed: {str(e)}")


# ══════════════════════════════════════════
#  LOGIN  (user + staff)
# ══════════════════════════════════════════
@router.post("/login")
async def login(body: LoginSchema):
    if not supabase_admin:
        raise HTTPException(503, "Database not configured")

    role = body.role.lower()
    if role not in ("user", "staff"):
        raise HTTPException(400, "Invalid role. Must be 'user' or 'staff'")

    try:
        if role == "user":
            # Look up in profiles table
            res = (
                supabase_admin.table("profiles")
                .select("id, full_name, email, phone, role, password_hash, created_at")
                .eq("email", body.email)
                .eq("role", "user")
                .execute()
            )
            if not res.data:
                raise HTTPException(401, "No passenger account found with this email")

            user = res.data[0]

            # Verify password
            if not verify_password(body.password, user["password_hash"]):
                raise HTTPException(401, "Incorrect password")

            return {
                "message":    "Login successful",
                "user_id":    user["id"],
                "role":       "user",
                "full_name":  user["full_name"],
                "email":      user["email"],
                "phone":      user.get("phone"),
                "created_at": str(user.get("created_at", "")),
            }

        else:
            # Look up in staff table
            res = (
                supabase_admin.table("staff")
                .select("id, full_name, email, phone, staff_id, department, password_hash, created_at")
                .eq("email", body.email)
                .execute()
            )
            if not res.data:
                raise HTTPException(401, "No staff account found with this email")

            staff = res.data[0]

            # Verify password
            if not verify_password(body.password, staff["password_hash"]):
                raise HTTPException(401, "Incorrect password")

            return {
                "message":    "Login successful",
                "user_id":    staff["id"],
                "role":       "staff",
                "full_name":  staff["full_name"],
                "email":      staff["email"],
                "phone":      staff.get("phone"),
                "staff_id":   staff["staff_id"],
                "department": staff["department"],
                "created_at": str(staff.get("created_at", "")),
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Login error: {str(e)}")


# ══════════════════════════════════════════
#  FORGOT PASSWORD  (Supabase sends email)
# ══════════════════════════════════════════
@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordSchema):
    if not supabase:
        raise HTTPException(503, "Supabase not configured")
    try:
        # Supabase Auth handles sending the email
        supabase.auth.reset_password_email(
            body.email,
            options={"redirect_to": "http://localhost:3000/reset-password"},
        )
        # Always return success to avoid email enumeration
        return {"message": "If this email is registered, a reset link has been sent."}
    except Exception as e:
        # Still return success (don't reveal if email exists)
        return {"message": "If this email is registered, a reset link has been sent."}


# ══════════════════════════════════════════
#  RESET PASSWORD  (Supabase JWT from email)
# ══════════════════════════════════════════
@router.post("/reset-password")
async def reset_password(body: ResetPasswordSchema):
    """
    Supabase sends an email with a link containing an access_token.
    We use that token to update the password.
    We also update the bcrypt hash in our DB so login still works.
    """
    if not supabase:
        raise HTTPException(503, "Supabase not configured")
    try:
        # Set Supabase session from the token in the email link
        session = supabase.auth.set_session(body.access_token, "")

        # Update password in Supabase Auth
        supabase.auth.update_user({"password": body.new_password})

        # Also update bcrypt hash in our profiles/staff tables
        user_email = session.user.email if session and session.user else None
        if user_email:
            new_hash = hash_password(body.new_password)
            # Update profiles
            supabase_admin.table("profiles").update({"password_hash": new_hash}).eq("email", user_email).execute()
            # Update staff (if they exist there too)
            supabase_admin.table("staff").update({"password_hash": new_hash}).eq("email", user_email).execute()

        return {"message": "Password updated successfully. You can now sign in."}

    except Exception as e:
        raise HTTPException(400, f"Password reset failed: {str(e)}")


# ══════════════════════════════════════════
#  LOGOUT  (just a confirmation — real
#  logout happens by clearing localStorage)
# ══════════════════════════════════════════
@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}