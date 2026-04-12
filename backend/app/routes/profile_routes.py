from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.schemas import UserProfileUpdate, StaffProfileUpdate, GetProfileSchema
from app.database import query, execute
from app.auth import decode_token

router = APIRouter(prefix="/profile", tags=["Profile"])


def get_user_from_token(authorization: Optional[str]) -> dict:
    """Extract and verify user from Authorization: Bearer <token> header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization header missing or invalid")
    token = authorization.split(" ", 1)[1]
    return decode_token(token)


# ══════════════════════════════════════════
#  GET MY PROFILE
# ══════════════════════════════════════════
@router.post("/me")
async def get_my_profile(
    body: GetProfileSchema,
    authorization: Optional[str] = Header(None),
):
    payload = get_user_from_token(authorization)

    # Make sure token belongs to this user_id
    if payload.get("sub") != body.user_id:
        raise HTTPException(403, "Token does not match user")

    role = payload.get("role", "user")

    try:
        if role == "staff":
            rows = query(
                "SELECT id, full_name, email, phone, staff_id, department, created_at, updated_at FROM staff WHERE id = :id",
                {"id": body.user_id},
            )
        else:
            rows = query(
                "SELECT id, full_name, email, phone, role, created_at, updated_at FROM profiles WHERE id = :id",
                {"id": body.user_id},
            )

        if not rows:
            raise HTTPException(404, "Profile not found")

        # Convert datetime objects to string for JSON
        profile = {k: str(v) if hasattr(v, "isoformat") else v for k, v in rows[0].items()}
        return {"role": role, "profile": profile}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))


# ══════════════════════════════════════════
#  UPDATE USER PROFILE
# ══════════════════════════════════════════
@router.put("/user")
async def update_user_profile(
    body: UserProfileUpdate,
    authorization: Optional[str] = Header(None),
):
    payload = get_user_from_token(authorization)
    if payload.get("sub") != body.user_id:
        raise HTTPException(403, "Token does not match user")

    fields, params = [], {"id": body.user_id}

    if body.full_name:
        fields.append("full_name = :full_name")
        params["full_name"] = body.full_name

    if body.phone is not None:
        fields.append("phone = :phone")
        params["phone"] = body.phone

    if not fields:
        raise HTTPException(400, "No fields to update")

    execute(f"UPDATE profiles SET {', '.join(fields)} WHERE id = :id", params)
    return {"message": "Profile updated successfully"}


# ══════════════════════════════════════════
#  UPDATE STAFF PROFILE
# ══════════════════════════════════════════
@router.put("/staff")
async def update_staff_profile(
    body: StaffProfileUpdate,
    authorization: Optional[str] = Header(None),
):
    payload = get_user_from_token(authorization)
    if payload.get("sub") != body.user_id:
        raise HTTPException(403, "Token does not match user")

    fields, params = [], {"id": body.user_id}

    if body.full_name:
        fields.append("full_name = :full_name")
        params["full_name"] = body.full_name

    if body.phone is not None:
        fields.append("phone = :phone")
        params["phone"] = body.phone

    if body.department:
        fields.append("department = :department")
        params["department"] = body.department

    if not fields:
        raise HTTPException(400, "No fields to update")

    execute(f"UPDATE staff SET {', '.join(fields)} WHERE id = :id", params)
    return {"message": "Staff profile updated successfully"}