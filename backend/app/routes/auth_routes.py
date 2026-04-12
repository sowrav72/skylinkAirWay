import uuid
from fastapi import APIRouter, HTTPException
from app.schemas import (
    UserRegisterSchema, StaffRegisterSchema, LoginSchema,
    ForgotPasswordSchema, ResetPasswordSchema,
)
from app.database import query, execute
from app.auth import (
    hash_password, verify_password,
    create_access_token, create_reset_token, verify_reset_token,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ══════════════════════════════════════════
#  REGISTER — PASSENGER
# ══════════════════════════════════════════
@router.post("/register/user")
async def register_user(body: UserRegisterSchema):
    # Check duplicate email
    existing = query("SELECT id FROM profiles WHERE email = :email", {"email": body.email})
    if existing:
        raise HTTPException(400, "An account with this email already exists")

    new_id = str(uuid.uuid4())
    hashed = hash_password(body.password)

    try:
        execute(
            """INSERT INTO profiles (id, full_name, email, phone, password_hash, role)
               VALUES (:id, :full_name, :email, :phone, :password_hash, 'user')""",
            {"id": new_id, "full_name": body.full_name, "email": body.email,
             "phone": body.phone, "password_hash": hashed},
        )
        return {"message": "Account created successfully", "user_id": new_id, "role": "user"}
    except Exception as e:
        raise HTTPException(400, f"Registration failed: {e}")


# ══════════════════════════════════════════
#  REGISTER — STAFF
# ══════════════════════════════════════════
@router.post("/register/staff")
async def register_staff(body: StaffRegisterSchema):
    # Validate staff code
    code = query(
        "SELECT * FROM valid_staff_codes WHERE code = :code AND used = FALSE",
        {"code": body.staff_id},
    )
    if not code:
        raise HTTPException(400, "Invalid or already used Staff ID. Contact your manager.")

    # Duplicate email check in both tables
    dup = query("SELECT id FROM profiles WHERE email = :e UNION SELECT id FROM staff WHERE email = :e",
                {"e": body.email})
    if dup:
        raise HTTPException(400, "An account with this email already exists")

    new_id = str(uuid.uuid4())
    hashed = hash_password(body.password)
    dept   = body.department or code[0].get("department", "General")

    try:
        # Insert into profiles (role = staff)
        execute(
            """INSERT INTO profiles (id, full_name, email, phone, password_hash, role)
               VALUES (:id, :full_name, :email, :phone, :password_hash, 'staff')""",
            {"id": new_id, "full_name": body.full_name, "email": body.email,
             "phone": body.phone, "password_hash": hashed},
        )
        # Insert into staff table
        execute(
            """INSERT INTO staff (id, full_name, email, phone, staff_id, department, password_hash)
               VALUES (:id, :full_name, :email, :phone, :staff_id, :department, :password_hash)""",
            {"id": new_id, "full_name": body.full_name, "email": body.email,
             "phone": body.phone, "staff_id": body.staff_id,
             "department": dept, "password_hash": hashed},
        )
        # Mark code as used
        execute("UPDATE valid_staff_codes SET used = TRUE WHERE code = :code", {"code": body.staff_id})

        return {"message": "Staff account created successfully", "user_id": new_id, "role": "staff"}
    except Exception as e:
        raise HTTPException(400, f"Registration failed: {e}")


# ══════════════════════════════════════════
#  LOGIN
# ══════════════════════════════════════════
@router.post("/login")
async def login(body: LoginSchema):
    role = body.role.lower()
    if role not in ("user", "staff"):
        raise HTTPException(400, "Role must be 'user' or 'staff'")

    if role == "user":
        rows = query(
            "SELECT * FROM profiles WHERE email = :email AND role = 'user'",
            {"email": body.email},
        )
        if not rows:
            raise HTTPException(401, "No passenger account found with this email")

        user = rows[0]
        if not verify_password(body.password, user["password_hash"]):
            raise HTTPException(401, "Incorrect password")

        token = create_access_token(str(user["id"]), "user")
        return {
            "access_token": token,
            "token_type":   "bearer",
            "user_id":      str(user["id"]),
            "role":         "user",
            "full_name":    user["full_name"],
            "email":        user["email"],
            "phone":        user.get("phone") or "",
            "created_at":   str(user.get("created_at", "")),
        }

    else:  # staff
        rows = query("SELECT * FROM staff WHERE email = :email", {"email": body.email})
        if not rows:
            raise HTTPException(401, "No staff account found with this email")

        staff = rows[0]
        if not verify_password(body.password, staff["password_hash"]):
            raise HTTPException(401, "Incorrect password")

        token = create_access_token(str(staff["id"]), "staff")
        return {
            "access_token": token,
            "token_type":   "bearer",
            "user_id":      str(staff["id"]),
            "role":         "staff",
            "full_name":    staff["full_name"],
            "email":        staff["email"],
            "phone":        staff.get("phone") or "",
            "staff_id":     staff["staff_id"],
            "department":   staff["department"],
            "created_at":   str(staff.get("created_at", "")),
        }


# ══════════════════════════════════════════
#  FORGOT PASSWORD
# ══════════════════════════════════════════
@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordSchema):
    # Check if email exists in either table
    rows = query(
        "SELECT email FROM profiles WHERE email = :e UNION SELECT email FROM staff WHERE email = :e",
        {"e": body.email},
    )

    if not rows:
        # Don't reveal if email exists
        return {"message": "If this email is registered, a reset token has been generated."}

    reset_token = create_reset_token(body.email)

    # Store token in DB
    execute(
        """INSERT INTO password_reset_tokens (email, token)
           VALUES (:email, :token)""",
        {"email": body.email, "token": reset_token},
    )

    # In production: send email with this token
    # For now: return token directly (class project)
    return {
        "message": "Reset token generated. Use it at /reset-password.",
        "reset_token": reset_token,   # remove this in production, send via email instead
    }


# ══════════════════════════════════════════
#  RESET PASSWORD
# ══════════════════════════════════════════
@router.post("/reset-password")
async def reset_password(body: ResetPasswordSchema):
    # 1. Verify JWT reset token
    email = verify_reset_token(body.token)   # raises 401 if invalid/expired

    # 2. Check token in DB (not used, not expired)
    rows = query(
        """SELECT * FROM password_reset_tokens
           WHERE token = :token AND used = FALSE AND expires_at > NOW()""",
        {"token": body.token},
    )
    if not rows:
        raise HTTPException(400, "Reset token has already been used or has expired")

    # 3. Update passwords
    new_hash = hash_password(body.new_password)
    execute("UPDATE profiles SET password_hash = :h WHERE email = :e", {"h": new_hash, "e": email})
    execute("UPDATE staff    SET password_hash = :h WHERE email = :e", {"h": new_hash, "e": email})

    # 4. Mark token as used
    execute("UPDATE password_reset_tokens SET used = TRUE WHERE token = :t", {"t": body.token})

    return {"message": "Password updated successfully. You can now sign in."}


# ══════════════════════════════════════════
#  LOGOUT
# ══════════════════════════════════════════
@router.post("/logout")
async def logout():
    # JWT is stateless — client just deletes the token
    return {"message": "Logged out successfully"}