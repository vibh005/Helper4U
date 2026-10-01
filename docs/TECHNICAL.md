# Helper4U: Technical Documentation

## Architecture
```
React (Vite, Tailwind)  --HTTPS/JSON-->  Express REST API  --pg-->  PostgreSQL
                                          |
                                          (verification documents are stored in the database)
```
- **Frontend:** React 18, react-router 6, axios, Tailwind CSS v4.
- **Backend:** Node.js, Express 4. Routes call controllers, controllers call models in `src/db`, models run SQL through a `pg` pool.
- **Database:** PostgreSQL. The schema is in `backend/src/db/schema.sql` and is safe to run repeatedly.

## Folder structure
```
backend/
  server.js                 starts the server
  src/app.js                middleware and route mounting
  src/config/db.js          pool, type parsers, withTransaction
  src/routes/               URL to controller mapping, role checks
  src/controllers/          request validation and responses
  src/db/                   SQL models and schema.sql
  src/middleware/           auth, error handler, file upload
  src/utils/                dates, pagination, SQL filter builder, notifications
  src/scripts/              initDb, seedAdmin, seedDemo
frontend/
  src/App.jsx               routes and role guards
  src/api.js                axios client
  src/auth/                 login state
  src/components/           shared UI and layout
  src/pages/                screens, grouped by role
docs/                       PRD and this document
```

## Database
Tables: `users`, `helper_profiles`, `helper_documents`, `service_categories`, `household_profiles`, `bookings`, `booking_attendance`, `reviews`, `complaints`, `notifications`.

Key relations:
- `helper_profiles.user_id` and `household_profiles.user_id` point to `users`.
- `bookings` link a household user and a helper profile and store the plan, dates, time window, schedule days, rate and total price.
- `booking_attendance` has one row per booking and date.
- `reviews` has one row per booking; `helper_profiles.avg_rating` and `review_count` are recomputed when reviews change.
- `complaints` link a booking, the person who filed it and the person it is against.

## Authentication and access
- Passwords are hashed with bcrypt. Login returns a JWT (7 days) sent as `Authorization: Bearer <token>`.
- `protect` checks the token and that the account is active. `authorize(...roles)` checks the role.
- Deactivated users cannot log in or use an existing token.

## Booking logic
- A booking's status moves only through allowed transitions: pending, accepted or rejected, then completed or cancelled. Each change is a conditional `UPDATE ... WHERE status = ...`, so two requests cannot both succeed.
- Creating a booking runs in a transaction that locks the helper row (`FOR UPDATE`) before checking for overlaps.
- "Today" is computed in `APP_TIMEZONE` (default Asia/Kolkata). Dates are handled as `YYYY-MM-DD` strings.

## Security measures
helmet headers, CORS limited to `CLIENT_URL`, request body size limit, rate limits on auth routes, parameterized queries only (sort and filter columns are whitelisted), uploads restricted by type and size and stored in the database, never served as static files, error messages that do not leak internals.

## API reference
See the tables in the root `README.md`. Every response has `success: true` or `success: false` with a `message`. List endpoints return `total`, `page`, `limit` and `pages`.

## Configuration
| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `DB_SSL` | `true` for hosted databases such as Neon |
| `JWT_SECRET` | Long random secret for tokens |
| `JWT_EXPIRES_IN` | Token lifetime, default 7d |
| `CLIENT_URL` | Frontend origin allowed by CORS (only needed if the frontend is hosted separately) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used by `npm run seed:admin` |
| `APP_TIMEZONE` | Time zone for "today" |
| `VITE_API_URL` (frontend) | API base URL, only if the API is hosted separately |

## Running locally
```
cd backend && npm install && npm run db:init && npm run seed:admin && npm run seed:demo && npm run dev
cd frontend && npm install && npm run dev
```
`seed:demo` is optional and adds sample helpers and a household (password `Demo@1234`).

## Deployment
Everything runs on Vercel:
- `vercel.json` builds the frontend (`frontend/dist`) and sends `/api/*` requests to the serverless function in `api/index.js`, which loads the Express app. All other paths go to `index.html`.
- The root `package.json` lists the backend dependencies so the function can install them.
- The database is a free PostgreSQL project (Neon). Run `npm run db:init` and `npm run seed:admin` once from `backend/` against it.
- Vercel environment variables: `DATABASE_URL`, `DB_SSL=true`, `JWT_SECRET`, `NODE_ENV=production`, optionally `APP_TIMEZONE`.
- Verification documents are stored in the `helper_documents.file_data` column (limit 4 MB per file because of Vercel's request size limit).

## Testing performed
- API: 117 automated checks covering every endpoint, permissions and booking rules.
- Browser: a 30-step end-to-end run covering all three roles on desktop and mobile widths.
