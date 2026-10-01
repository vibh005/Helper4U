# Helper4U – Maid & Nanny Service Management Platform

PERN stack: PostgreSQL, Express, React (Vite + Tailwind), Node.

## Modules
- [x] 1. Backend foundation + authentication (household / helper / admin)
- [x] 2. Helper profiles & document upload
- [x] 3. Admin verification & service categories
- [x] 4. Household profile + browse / search / filter helpers
- [x] 5. Bookings & service plans (hourly / monthly / yearly)
- [x] 6. Reviews, earnings, reliability, complaints, notifications, admin analytics
- [x] 8. Frontend (React) & deployment

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

## Household API (role: household)
Run `npm run db:init` after pulling this module.

| Method | Endpoint | Notes |
|---|---|---|
| GET | /api/households/me/profile | Profile or `null` |
| PUT | /api/households/me/profile | Create or partially update: `address`, `pincode` (6 digits), `family_size`, `children_count`, `has_pets`, `notes` |

## Browse API (roles: household, admin)
Only **verified** helpers with an active account are visible. Email, phone and internal ids are never exposed.

| Method | Endpoint | Notes |
|---|---|---|
| GET | /api/browse/helpers | Filters below, `page`, `limit` (max 100) |
| GET | /api/browse/helpers/:id | Full public profile of one verified helper |

Filters (all optional, combinable): `service_type`, `experience_level` (`entry` 0-2 yrs, `intermediate` 3-5, `expert` 6+), `min_experience`, `availability` (available/busy/unavailable), `day` (Mon..Sun), `plan` (hourly/monthly/yearly), `max_price` (needs `plan`; compares that plan's rate), `min_rating`, `city`, `search` (name or bio).
Sorting: `sort=rating` (default) | `experience` | `newest` | `price_asc` | `price_desc` (price uses `plan`, default hourly).
Example: `/api/browse/helpers?service_type=maid&day=Mon&plan=monthly&max_price=12000&sort=price_asc`

## Bookings API
Run `npm run db:init` after pulling this module. Set `APP_TIMEZONE` in `.env` (default `Asia/Kolkata`).

| Method | Endpoint | Who | Notes |
|---|---|---|---|
| POST | /api/bookings | household | Request a helper. Body: `helper_id`, `plan_type`, `start_date` (YYYY-MM-DD), `start_time`, `end_time` (HH:MM daily window), plus per plan below. Optional `address` (defaults to household profile), `notes` |
| GET | /api/bookings | household / helper | Own bookings (household) or assigned jobs and work history (helper). Filters: `status`, `plan_type`, `page`, `limit` |
| GET | /api/bookings/:id | household / helper / admin | Only participants and admins can open it |
| PATCH | /api/bookings/:id/respond | helper | `{ "decision": "accept" \| "reject", "reason" }` |
| PATCH | /api/bookings/:id/cancel | household / helper / admin | `{ "reason" }` (required once accepted) |
| POST | /api/bookings/:id/complete | household / helper | Allowed once the service period has ended |
| POST | /api/bookings/:id/attendance | helper | `{ "date", "status": "present" \| "absent", "note" }`, one record per day (re-marking updates it) |
| GET | /api/bookings/:id/attendance | participants / admin | Records plus present/absent summary |
| GET | /api/admin/bookings | admin | Filters: `status`, `plan_type`, `helper_id`, `household_id`, `from`, `to`, `page`, `limit` |

**Plans**
- `hourly`: one session on `start_date`; price = hourly rate x hours in the time window.
- `monthly`: `duration_months` 1-11 (default 1); price = monthly rate x months; `schedule_days` optional (defaults to the helper's working days).
- `yearly`: `duration_years` 1-3 (default 1); price = yearly rate x years.
The rate is copied into the booking, so later rate changes never alter existing bookings.

**Rules enforced**
- Only verified, active helpers who offer that plan can be booked, within their working days and hours.
- A helper can never be double-booked: an accept is refused if it overlaps an accepted booking on any shared weekday and time (checked under a database lock).
- Address and phone numbers are shared only after the helper accepts.
- Status flow: `pending` -> `accepted` / `rejected` / `cancelled` -> `completed`. Responses include a `phase`: `awaiting_response`, `expired`, `upcoming`, `ongoing`, `ready_to_complete`.

## Reviews, earnings, complaints, notifications, analytics
Run `npm run db:init` after pulling this module.

| Method | Endpoint | Who | Notes |
|---|---|---|---|
| POST | /api/bookings/:id/review | household | `{ rating 1-5, comment }`, once per completed booking. Updates the helper's public rating |
| GET | /api/browse/helpers/:id/reviews | household / admin | Paginated; reviewer names shortened ("Priya S.") |
| DELETE | /api/admin/reviews/:id | admin | Moderation; rating is recomputed |
| GET | /api/helpers/me/earnings | helper | View-only: total earned, expected from active jobs, per-month breakdown |
| GET | /api/helpers/me/stats | helper | Rating and reliability score |
| POST | /api/complaints | household / helper | `{ booking_id, category (no_show/misconduct/payment/quality/other), description }`; filed against the other party on that booking |
| GET | /api/complaints | household / helper | Complaints I filed |
| GET | /api/admin/complaints | admin | Filters `status`, `category` |
| PATCH | /api/admin/complaints/:id | admin | `{ status (open/in_review/resolved/dismissed), resolution_note }`; note required to resolve or dismiss |
| GET | /api/notifications | any user | `?unread=true`; response includes `unread_count` |
| PATCH | /api/notifications/:id/read, POST /api/notifications/read-all | any user | |
| GET | /api/admin/analytics | admin | KPIs: households, verified helpers, completion rate, reliability, satisfaction, monthly active users, etc., plus breakdowns and a 6-month trend |
| GET | /api/admin/attendance | admin | Filters `status`, `from`, `to` |

**Reliability score** (0-100) = attendance rate x share of accepted bookings the helper did not cancel. Helpers with no history start at 100.
Notifications are created automatically for new requests, accept/reject, cancellations, completion, reviews, verification decisions and complaints.


## Frontend (React + Vite + Tailwind)

```bash
cd frontend
npm install
cp .env.example .env     # optional locally; the dev server proxies /api to localhost:5000
npm run dev              # http://localhost:5173
npm run build            # production build in frontend/dist
```

Run the API first (`cd backend && npm install && npm run db:init && npm run seed:admin && npm run dev`).

Optional sample data: `npm run seed:demo` in `backend/` adds a household (`priya@demo.com`) and three verified helpers (`asha@demo.com`, `bina@demo.com`, `chitra@demo.com`). Password for all: `Demo@1234`.

Full documentation: [PRD](docs/PRD.md) and [technical documentation](docs/TECHNICAL.md).

Screens by role:
- **Household:** profile, browse and filter helpers, helper detail with live price estimate, booking, booking detail (attendance, review, cancel, report), complaints, notifications.
- **Helper:** dashboard (requests, earnings, reliability, rating), profile with plans and rates, document upload, submit for verification, jobs.
- **Admin:** overview analytics, helper verification, users, service categories, bookings and attendance, complaints.

## Deployment

| Part | Suggested host | Settings |
|---|---|---|
| Database | Neon / Supabase / Render Postgres | Copy the connection string |
| API (`backend/`) | Render / Railway | Build `npm install`, start `npm start`, then run `npm run db:init` and `npm run seed:admin` once. Env: `DATABASE_URL`, `DB_SSL=true`, `JWT_SECRET` (long random), `CLIENT_URL` (your frontend URL, for CORS), `ADMIN_*`, `APP_TIMEZONE`, `NODE_ENV=production` |
| Frontend (`frontend/`) | Vercel / Netlify | Build `npm run build`, output `dist`, env `VITE_API_URL=https://<your-api>/api`; `vercel.json` and `public/_redirects` already route every path to `index.html` |

Uploaded verification documents are stored on the API server's disk. On hosts with ephemeral disks, attach a persistent volume or move uploads to object storage.
