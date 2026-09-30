# Helper4U – Maid & Nanny Service Management Platform

PERN stack: PostgreSQL, Express, React (Vite + Tailwind, coming in later modules), Node.

## Modules
- [x] 1. Backend foundation + authentication (household / helper / admin)
- [x] 2. Helper profiles & document upload
- [x] 3. Admin verification & service categories
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

## Helper API (role: helper)
Run `npm run db:init` again after pulling this module (it adds new tables safely).

| Method | Endpoint | Notes |
|---|---|---|
| GET | /api/helpers/me/profile | Returns profile (or `null`) and uploaded documents |
| PUT | /api/helpers/me/profile | Create (needs `service_type`) or partially update. Fields: `service_type` (maid/babysitter/nanny), `bio`, `experience_years`, `skills[]`, `languages[]`, `available_days[]` (Mon..Sun), `available_from`/`available_to` (HH:MM), `availability_status`, `preferred_plans[]` (hourly/monthly/yearly), `hourly_rate`, `monthly_rate`, `yearly_rate` |
| POST | /api/helpers/me/documents | multipart form: `document` (PDF/JPG/PNG, max 5 MB) + `doc_type` (identity, address_proof, police_verification, background_check, other) |
| DELETE | /api/helpers/me/documents/:id | Not allowed while under review or once approved |
| POST | /api/helpers/me/submit-verification | Needs at least one `identity` document; sets status to `pending` |
| GET | /api/helpers/documents/:id/file | Owner or admin only. Files are private and never served statically |

Verification status flow: `unverified` -> `pending` -> `verified` / `rejected` (admin decision comes in Module 3).

## Categories API
| Method | Endpoint | Notes |
|---|---|---|
| GET | /api/categories | Public. Active service categories (maid, babysitter, nanny + any the admin adds) |

## Admin API (role: admin)
Run `npm run db:init` after pulling this module. All routes need an admin token.

| Method | Endpoint | Notes |
|---|---|---|
| GET | /api/admin/helpers | Filters: `status`, `service_type`, `search` (name/email), `page`, `limit` |
| GET | /api/admin/helpers/:id | Full profile, contact details and documents |
| PATCH | /api/admin/documents/:id | `{ "status": "approved" \| "rejected" }` |
| PATCH | /api/admin/helpers/:id/verification | `{ "decision": "approve" \| "reject", "note" }`. Only `pending` profiles. Approve needs an approved identity document; reject needs a note (shown to the helper, who can fix and resubmit) |
| GET | /api/admin/users | Filters: `role`, `active`, `search`, `page`, `limit` |
| PATCH | /api/admin/users/:id/status | `{ "is_active": false }` deactivates a user (not yourself, not other admins) |
| GET / POST | /api/admin/categories | List all (incl. inactive) / create `{ name, description }` |
| PUT | /api/admin/categories/:id | `{ name, description, is_active }`. Categories are deactivated, never deleted |

