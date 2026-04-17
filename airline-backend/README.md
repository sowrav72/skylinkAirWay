# SkyWings Backend API v2.0

## Render Deployment

| Setting           | Value                                                            |
|-------------------|------------------------------------------------------------------|
| **Language**      | Node                                                             |
| **Root Directory**| `airline-backend`                                                |
| **Build Command** | `npm install && npx prisma generate && npx prisma db push`       |
| **Start Command** | `node server.js`                                                 |

## Environment Variables

| Key               | Description                                         | Required |
|-------------------|-----------------------------------------------------|----------|
| `DATABASE_URL`    | Neon PostgreSQL connection string (`?sslmode=require`) | ✅ |
| `DIRECT_URL`      | Same as DATABASE_URL (for Prisma migrations on Neon)   | ✅ |
| `JWT_SECRET`      | Long random secret (min 64 chars). Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | ✅ |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs (no wildcards)        | ✅ |
| `NODE_ENV`        | `production`                                        | ✅ |

## Seed Demo Data

After deploying, run the seed script once:

```bash
# If you have direct database access / Render shell:
npm run db:seed
```

Or run locally pointing at the Neon database:
```bash
DATABASE_URL="..." npm run db:seed
```

## Demo Credentials (after seeding)

| Role      | Email                      | Password               |
|-----------|----------------------------|------------------------|
| Admin     | admin@skywings.com         | Admin@SkyWings2025!    |
| Staff 1   | sarah.jones@skywings.com   | Staff@SkyWings2025!    |
| Staff 2   | mike.chen@skywings.com     | Staff@SkyWings2025!    |
| Passenger | alice.rahman@gmail.com     | Pass@SkyWings2025!     |
| Passenger | bob.hasan@gmail.com        | Pass@SkyWings2025!     |
| Passenger | carol.ahmed@gmail.com      | Pass@SkyWings2025!     |

⚠️ Change all passwords immediately after first login!

## Security Fixes in v2.0

- ✅ Rate limiting on auth (10/15min) and all APIs (200/min)
- ✅ Explicit CORS allowlist — no wildcards
- ✅ Zod input validation on all endpoints
- ✅ Booking race condition fixed with DB transactions
- ✅ Staff can only edit assigned flights
- ✅ Cancelled bookings don't block seat availability
- ✅ Audit log for all admin actions
- ✅ Password change endpoint
- ✅ Paginated flights, bookings, notifications (no browser crash at scale)
- ✅ Notification cleanup endpoint
- ✅ Unique flightNumber field
- ✅ DB indexes on all foreign keys and search fields
- ✅ bcrypt cost factor raised to 12
- ✅ Error messages never reveal internal details
