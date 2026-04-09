# SkyLink AirWay

Full-stack project layout:

- `frontend/` → React (JSX)
- `backend/` → Python FastAPI
- `render.yaml` → Render Blueprint for both services
- `docs/RENDER_SETUP.md` → Full Render + Supabase setup guide

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

## Supabase

Set `DATABASE_URL` in backend environment:

```bash
postgresql://postgres:[YOUR-PASSWORD]@db.zevqkeaxmclpdorzbrxx.supabase.co:5432/postgres
```

For deployment steps, see [`docs/RENDER_SETUP.md`](docs/RENDER_SETUP.md).
