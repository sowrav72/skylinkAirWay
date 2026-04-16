# Airline Management System — Backend API

## Render Deployment Settings

| Setting           | Value                          |
|-------------------|-------------------------------|
| **Language**      | Node                          |
| **Root Directory**| `airline-backend`             |
| **Build Command** | `npm install && npx prisma generate && npx prisma db push` |
| **Start Command** | `node server.js`              |

## Environment Variables (add in Render Dashboard)

| Key               | Value                                                         |
|-------------------|---------------------------------------------------------------|
| `DATABASE_URL`    | PostgreSQL connection string from Neon (with `?sslmode=require`) |
| `JWT_SECRET`      | Any long random string (e.g. 64-char hex)                     |
| `ALLOWED_ORIGINS` | Comma-separated deployed frontend URLs                        |
| `PORT`            | Set by Render automatically — do NOT set manually             |

## Local Development

```bash
cp .env.example .env
# fill in .env with your Neon DATABASE_URL and JWT_SECRET

npm install
npx prisma generate
npx prisma db push   # creates tables on Neon
node server.js
```

## API Reference

### Auth
| Method | Endpoint              | Auth | Description        |
|--------|-----------------------|------|--------------------|
| POST   | /api/auth/register    | —    | Register passenger |
| POST   | /api/auth/login       | —    | Login any role     |

### Flights
| Method | Endpoint                      | Auth         | Description              |
|--------|-------------------------------|--------------|--------------------------|
| GET    | /api/flights                  | —            | Search flights           |
| GET    | /api/flights/:id              | —            | Flight detail            |
| POST   | /api/flights                  | admin        | Create flight            |
| PUT    | /api/flights/:id              | admin/staff  | Update flight            |
| DELETE | /api/flights/:id              | admin        | Delete flight            |
| GET    | /api/flights/:id/passengers   | admin/staff  | Passenger list           |
| GET    | /api/flights/staff/assigned   | staff/admin  | Staff's assigned flights |

### Bookings
| Method | Endpoint              | Auth      | Description        |
|--------|-----------------------|-----------|--------------------|
| POST   | /api/bookings         | passenger | Book a seat        |
| GET    | /api/bookings/user    | any       | My bookings        |
| DELETE | /api/bookings/:id     | any       | Cancel booking     |

### Seats
| Method | Endpoint              | Auth | Description           |
|--------|-----------------------|------|-----------------------|
| GET    | /api/seats/:flightId  | —    | Seat map for flight   |

### Tickets & Receipts
| Method | Endpoint                     | Auth | Description        |
|--------|------------------------------|------|--------------------|
| GET    | /api/tickets/:id/download    | any  | Download PDF ticket|
| GET    | /api/receipts/:id/download   | any  | Download PDF receipt|

### Notifications
| Method | Endpoint                        | Auth | Description           |
|--------|---------------------------------|------|-----------------------|
| GET    | /api/notifications              | any  | Get my notifications  |
| PUT    | /api/notifications/:id/read     | any  | Mark as read          |

### Users (Admin)
| Method | Endpoint                    | Auth  | Description           |
|--------|-----------------------------|-------|-----------------------|
| GET    | /api/users                  | admin | All users             |
| POST   | /api/users                  | admin | Create staff/admin    |
| DELETE | /api/users/:id              | admin | Delete user           |
| POST   | /api/users/assign-staff     | admin | Assign staff to flight|

### Analytics (Admin)
| Method | Endpoint          | Auth  | Description     |
|--------|-------------------|-------|-----------------|
| GET    | /api/analytics    | admin | Dashboard stats |
