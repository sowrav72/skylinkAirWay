from fastapi import APIRouter, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials
from app.auth import security, get_current_user
from app.schemas import UserProfileUpdate, StaffProfileUpdate
from app.database import supabase

router = APIRouter(prefix="/profile", tags=["Profile"])


# ── GET MY PROFILE ─────────────────────────
@router.get("/me")
async def get_my_profile(
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    payload = get_current_user(credentials)
    user_id = payload.get("sub")
    role = payload.get("user_metadata", {}).get("role", "user")

    if not user_id:
        raise HTTPException(401, "Unauthorized")

    try:
        if role == "staff":
            # Get from staff table
            res = supabase.table("staff").select("*").eq("id", user_id).single().execute()
        else:
            # Get from profiles table
            res = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not res.data:
            raise HTTPException(404, "Profile not found")

        return {"role": role, "profile": res.data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))


# ── UPDATE USER PROFILE ────────────────────
@router.put("/user")
async def update_user_profile(
    body: UserProfileUpdate,
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    payload = get_current_user(credentials)
    user_id = payload.get("sub")
    role = payload.get("user_metadata", {}).get("role", "user")

    if role != "user":
        raise HTTPException(403, "Not a user account")

    try:
        update_data = {k: v for k, v in body.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(400, "No fields to update")

        res = (
            supabase.table("profiles")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )
        return {"message": "Profile updated", "profile": res.data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))


# ── UPDATE STAFF PROFILE ───────────────────
@router.put("/staff")
async def update_staff_profile(
    body: StaffProfileUpdate,
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    payload = get_current_user(credentials)
    user_id = payload.get("sub")
    role = payload.get("user_metadata", {}).get("role", "user")

    if role != "staff":
        raise HTTPException(403, "Not a staff account")

    try:
        update_data = {k: v for k, v in body.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(400, "No fields to update")

        res = (
            supabase.table("staff")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )
        return {"message": "Staff profile updated", "profile": res.data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))