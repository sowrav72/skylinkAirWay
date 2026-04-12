from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.schemas import UserProfileUpdate, StaffProfileUpdate
from app.database import engine

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/me")
async def get_my_profile(user_id: str, role: str = "user"):
    if not engine:
        raise HTTPException(503, "Database not configured")
    if not user_id:
        raise HTTPException(401, "Unauthorized")

    table = "staff" if role == "staff" else "profiles"
    with engine.connect() as conn:
        row = conn.execute(
            text(f"SELECT * FROM {table} WHERE id = :user_id LIMIT 1"),
            {"user_id": user_id},
        ).mappings().first()

    if not row:
        raise HTTPException(404, "Profile not found")

    return{"role": role, "profile": dict(row)}


@router.put("/user")
async def update_user_profile(body: UserProfileUpdate, user_id: str):
    if not engine:
        raise HTTPException(503, "Database not configured")

    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No fields to update")

    set_sql = ", ".join(f"{k} = :{k}" for k in update_data.keys()) + ", updated_at = now()"
    params = {**update_data, "user_id": user_id}

    with engine.begin() as conn:
        conn.execute(text(f"UPDATE profiles SET {set_sql} WHERE id = :user_id"), params)
        row = conn.execute(
            text("SELECT * FROM profiles WHERE id = :user_id LIMIT 1"),
            {"user_id": user_id},
        ).mappings().first()

    return {"message": "Profile updated", "profile": dict(row) if row else None}


@router.put("/staff")
async def update_staff_profile(body: StaffProfileUpdate, user_id: str):
    if not engine:
        raise HTTPException(503, "Database not configured")

    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No fields to update")

    set_sql = ", ".join(f"{k} = :{k}" for k in update_data.keys()) + ", updated_at = now()"
    params = {**update_data, "user_id": user_id}

    with engine.begin() as conn:
        conn.execute(text(f"UPDATE staff SET {set_sql} WHERE id = :user_id"), params)
        if "full_name" in update_data or "phone" in update_data:
            mirrored = {k: v for k, v in update_data.items() if k in {"full_name", "phone"}}
            if mirrored:
                mirrored_set = ", ".join(f"{k} = :{k}" for k in mirrored.keys()) + ", updated_at = now()"
                conn.execute(text(f"UPDATE profiles SET {mirrored_set} WHERE id = :user_id"), params)

        row = conn.execute(
            text("SELECT * FROM staff WHERE id = :user_id LIMIT 1"),
            {"user_id": user_id},
        ).mappings().first()

    return {"message": "Staff profile updated", "profile": dict(row) if row else None}