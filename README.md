# Helper4U – Maid & Nanny Service Management Platform

PERN stack: PostgreSQL, Express, React (Vite + Tailwind, coming in later modules), Node.

## Modules
- [x] 1. Backend foundation + authentication (household / helper / admin)
- [ ] 2. Helper profiles & document upload
- [ ] 3. Admin verification & service categories
- [ ] 4. Browse / search / filter helpers
- [ ] 5. Bookings & service plans (hourly / monthly / yearly)
- [ ] 6. Reviews, service history, earnings view
- [ ] 7. Complaints & admin analytics
- [ ] 8. Frontend (React) & deployment

## Run the backend
1. Get a PostgreSQL database (see below) and put its connection string in `backend/.env` as `DATABASE_URL`.
2. Set a long random `JWT_SECRET` in `backend/.env`.
3. From `backend/`:
   ```
   npm install
   npm run db:init      # creates the tables (safe to re-run)
   npm run seed:admin   # creates the first admin
   npm run dev
   ```
4. Check http://localhost:5000/api/health

### Database options
- **Hosted, no install (easiest):** create a free project at https://neon.tech, copy the connection string, set `DATABASE_URL` to it and `DB_SSL=true`.
- **Local:** install PostgreSQL from https://www.postgresql.org/download/windows/ , then create a database named `helper4u` and use `postgresql://postgres:YOUR_PASSWORD@localhost:5432/helper4u`.

## Auth API
| Method | Endpoint | Access | Body |
|---|---|---|---|
| POST | /api/auth/register | public | name, email, password (min 8), phone?, city?, role (`household`\|`helper`) |
| POST | /api/auth/login | public | email, password |
| GET | /api/auth/me | logged in | – |
| PUT | /api/auth/me | logged in | name?, phone?, city? |
| PUT | /api/auth/change-password | logged in | currentPassword, newPassword |

Send the returned token as `Authorization: Bearer <token>`. Admins cannot self-register; use `npm run seed:admin`.
