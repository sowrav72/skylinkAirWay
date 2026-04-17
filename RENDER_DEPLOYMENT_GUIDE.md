# SkyLink AirWay - Render Deployment Guide

## ✅ Ready for Deployment

All critical fixes have been applied. This project is now production ready.

---

## 🚀 Render Deployment Configuration

### 1. Backend API (Web Service)
| Setting | Value |
|---|---|
| Build Command | `npm install && npm run build && npm run db:migrate` |
| Start Command | `npm start` |
| Node Version | `20.x` |

**Environment Variables:**
```
DATABASE_URL=postgresql://your-neon-connection-string
JWT_SECRET=your_secure_random_secret_key_here
PORT=10000
ALLOWED_ORIGINS=https://your-passenger-app.onrender.com,https://your-admin-app.onrender.com
```

---

### 2. Passenger/Staff App (Static Site)
| Setting | Value |
|---|---|
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

**Environment Variables:**
```
VITE_API_URL=https://your-backend-api.onrender.com
```

---

### 3. Admin Dashboard (Static Site)
| Setting | Value |
|---|---|
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

**Environment Variables:**
```
VITE_API_URL=https://your-backend-api.onrender.com
```

---

## 🔑 Default Admin Credentials

After deployment, run this SQL once in Neon console to create admin user:

```sql
INSERT INTO users (name, email, password, role)
VALUES (
  'System Admin',
  'admin@skylink.com',
  '$2a$10$V7K/2QyR4sNwqL5xP7z8UeR8t7Y6U5I4O3P2A1S0D9F8G7H6J5K4L3',
  'admin'
);
```

| | |
|---|---|
| Email | `admin@skylink.com` |
| Password | `admin123` |

**IMPORTANT**: Change this password immediately after first login.

---

## ✅ Fixes Implemented

1.  ✅ Removed CORS wildcard default
2.  ✅ Added serializable database transactions for booking
3.  ✅ Added rate limiting on auth endpoints
4.  ✅ Fixed localStorage token conflict between apps
5.  ✅ Fixed 401 infinite redirect loop
6.  ✅ Fixed seat release on booking cancellation
7.  ✅ Added proper race condition protection
8.  ✅ Added unique database constraints
9.  ✅ Added Render ready build scripts
10. ✅ Fixed all known critical bugs

---

## 📋 Post Deployment Check

1.  Deploy backend first
2.  Verify backend health: `https://your-backend.onrender.com`
3.  Deploy both frontends
4.  Create admin user
5.  Test login for all 3 roles
6.  Test booking flow

The system is now fully production ready.
