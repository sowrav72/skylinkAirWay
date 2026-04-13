# SkylinkAirWay Backend Deployment Fix - TODO (Iteration 2: Postgres Schema Error)

## Previous Steps (pydantic fix):
- [x] 1-3. requirements.txt updated/pinned.

## New Plan: Fix Postgres "no schema selected" for ENUM CREATE TYPE
- [x] 1. User approved update database.py (add search_path=public to URL).
- [x] 2. Edit backend/database.py DATABASE_URL += '&options=-csearch_path%3Dpublic'.
- [ ] 3. Test local: `cd backend && uvicorn main:app --reload` (no schema errors).
- [ ] 4. Commit/push.
- [ ] 5. Re-deploy Render, check startup/logs.
- [ ] 6. Test endpoints.

Next: Edit database.py.

