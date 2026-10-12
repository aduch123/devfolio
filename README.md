# Devfolio

Devfolio is a platform where developers build a portfolio, publish it at a public URL, share it and (soon) track how it performs. It is under active development: see the roadmap below.

## Tech stack

- **Backend:** Node.js (ES modules), Express 5, Prisma 7 with PostgreSQL, cookie sessions (short-lived JWT access cookie + rotating refresh token), zod, pino
- **Frontend:** plain HTML, CSS and JavaScript (no build step), served by the Express server
- **Email:** Resend (contact form notifications)

## Prerequisites

- Node.js 20.19 or newer (required by Prisma 7)
- A running PostgreSQL database
- A [Resend](https://resend.com) API key

## Setup

```bash
cd backend
npm install
cp .env.example .env        # then edit .env with your real values
npx prisma migrate dev      # applies the database migrations
npx prisma generate         # generates the Prisma client
npm run dev                 # starts the server with auto-reload
```

Open <http://localhost:5000> (or the `PORT` you set). The Express server serves both the API and the frontend.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Secret for signing access tokens, **at least 32 characters** (`openssl rand -hex 32`) |
| `RESEND_API_KEY` | yes | Resend API key for contact-form emails |
| `RESEND_FROM` | no | Email sender, default `Devfolio <onboarding@resend.dev>`. Resend's test sender only delivers to your own Resend account email until you verify a domain (planned for Phase 6) |
| `APP_URL` | no | Public address used in email links, e.g. `https://devfolio.example` (default `http://localhost:PORT`) |
| `TRUST_PROXY` | no | Number of reverse proxies in front of the app (default `false`). Set `1` behind one proxy so rate limits see real client IPs |
| `CORS_ORIGINS` | no | Comma-separated origins allowed to call the API cross-origin (default: none, same-origin only) |
| `PORT` | no | Server port (default `5000`) |
| `NODE_ENV` | no | `development` (default), `test` or `production` |

Security defaults: helmet headers with a Content Security Policy, JSON bodies capped at 100 KB, and rate limits (API 300 requests per 15 minutes, login and signup 10 per 15 minutes, contact form 5 per hour per portfolio, all per IP). Hitting a limit returns HTTP 429 with code `RATE_LIMITED`; restart the server to reset the counters while developing.

The server validates these at startup and exits with a clear message if any are missing or invalid. Never commit `.env`.

## Scripts (run inside `backend/`)

| Command | What it does |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start normally |
| `npm run smoke` | Check a running server: `/healthz`, a public portfolio (set `SMOKE_USERNAME`), 404 and validation error shapes, security headers |
| `npm run lint` | Lint backend and frontend with ESLint |
| `npm run lint:fix` | Lint and auto-fix what is fixable |
| `npm run format:check` | Check formatting with Prettier |
| `npm run format` | Format all files with Prettier |

## Project structure

```
backend/
  app.js          # builds the Express app (importable without starting a server)
  server.js       # starts the HTTP server
  config/         # env validation, constants, prisma client, logger
  modules/        # one folder per feature: <name>.routes.js + .controller.js + .schema.js
    auth/ profile/ skills/ projects/ onboarding/ share/ messages/
  middleware/     # auth (cookie session, page guard), origin check, validate(schema), rateLimit, error handling
  utils/          # AppError, validators, publicPortfolio (public fields), prismaErrors, session (cookies, tokens), mailer
  scripts/        # smoke.js (npm run smoke)
  prisma/         # schema and migrations
frontend/
  index.html      # landing page
  pages/          # auth, onboarding, portfolio, edit pages
  js/ css/        # scripts and styles
```

## API

All endpoints live under `/api/v1`. `GET /healthz` returns `{ "status": "ok" }` after a database ping (503 if the DB is unreachable); `/health` is a legacy alias.

| Area | Endpoints (relative to `/api/v1`) | Account | `POST account/password`, `POST account/email`, `POST account/username`, `POST account/delete` | yes (current password required except for username) |
| Auth |
|---|---|---|
| Auth | `POST auth/signup`, `POST auth/login`, `GET auth/username-available`, `POST auth/verify-email`, `POST auth/resend-verification`, `POST auth/forgot-password`, `POST auth/reset-password`, `POST auth/refresh`, `POST auth/logout` | no (refresh and logout use the cookies) |
| Session | `GET auth/me` | yes |
| Onboarding | `POST onboarding` (409 `ALREADY_ONBOARDED` if repeated) | yes |
| Profile | `GET`, `PATCH profile` | yes |
| Skills | `GET`, `POST skills`; `PATCH`, `DELETE skills/:id`; `PUT skills/order` (`{ ids }`, 204) | yes |
| Projects | `GET`, `POST projects`; `PATCH`, `DELETE projects/:id` | yes |
| Share link | `POST`, `GET`, `DELETE share` | yes |
| Public portfolio | `GET portfolio/:username`, `GET portfolio/share/:token` | no |
| Contact form | `POST portfolio/:username/message`, `POST portfolio/share/:token/message` | no |

**Sessions:** login sets two `HttpOnly`, `SameSite=Lax` cookies (`Secure` in production): `dev_access` (JWT, 15 minutes) and `dev_refresh` (30 days, sent only to `/api/v1/auth`). The refresh token is stored hashed in the `Session` table and rotates on every refresh; presenting an already-rotated token after a 10-second grace window revokes that session. The client refreshes silently once on a 401 and retries. Logout revokes the session server-side, and protected routes check the session in the database on every request. State-changing `/api/v1` requests whose `Origin` header is another site are refused (`BAD_ORIGIN`, 403). Run `npm install` after pulling (adds `cookie-parser`).

**Email verification:** signup emails a single-use link (`/verify-email?token=...`, valid 24 hours; only the token hash is stored in `EmailToken`). The page posts the token to the API, so a link scanner opening the URL cannot use it up. Resending is public by email, answers the same for every address, and has a 60-second cooldown per account plus 5 requests per hour per IP. Nothing is blocked for unverified users yet. Resend's test sender only delivers to your own Resend account email until you verify a domain.

**Password reset:** `/forgot-password` always answers the same for any email (5 per hour per IP, 60 s cooldown per account). The emailed link (`/reset-password?token=...`) is single-use and valid for 1 hour. Resetting sets the new password and revokes every session of that account (protected routes check the session in the database, so they stop working at once).

Public portfolio responses contain only public fields (no account email, ids, hashes or share token).

## Usernames

3 to 30 characters: letters, numbers and dashes, with no dash at the start or end. Usernames and emails are stored in lowercase. These names are reserved (they would collide with routes): `api`, `edit`, `dashboard`, `login`, `logout`, `signup`, `register`, `settings`, `account`, `onboarding`, `share`, `pages`, `css`, `js`, `uploads`, `static`, `assets`, `admin`, `help`, `support`, `health`, `healthz`, `auth`, `portfolio`, `profile`, `skills`, `projects`, `messages`, `about`, `terms`, `privacy`, `www`, `root`, `null`, `undefined` (list: `backend/config/constants.js`).

## Errors

Every API error is `{ "error": { "code": "...", "message": "...", "fields": { "fieldName": "message" } } }` (`fields` only for validation errors). Common codes: `VALIDATION_ERROR` (400), `INVALID_CREDENTIALS`, `UNAUTHORIZED`, `INVALID_TOKEN`, `NO_REFRESH_TOKEN`, `INVALID_REFRESH_TOKEN` and `REFRESH_TOKEN_REUSED` (401), `BAD_ORIGIN` (403), `*_NOT_FOUND` and `ROUTE_NOT_FOUND` (404), `USER_EXISTS`, `SKILL_EXISTS`, `SKILL_LIMIT` and `ALREADY_ONBOARDED` (409), `INVALID_ORDER` (400), `PAYLOAD_TOO_LARGE` (413), `RATE_LIMITED` (429), `EMAIL_SEND_FAILED` (502), `INTERNAL_ERROR` (500).

## Notes

- Contact-form emails use `RESEND_FROM` (default: Resend's test sender, which only delivers to the email of your Resend account until you verify a domain).
- `.env` is git-ignored; only `.env.example` is committed. Rotate any secret that was ever shared.
- Known dev-only advisories from `npm audit` (Prisma CLI and nodemon tooling) are tracked in `docs/HANDOFF.md`.
- The project is being built in phases: see `docs/BUILD_PLAN.md`.


## Account settings and cleanup

Changing the password ends all other sessions; changing the email marks it unverified and sends a new link; changing the username makes the old portfolio URL return 404 (no redirect). Deleting the account (password required) hides it and ends all sessions at once; a daily job (`node-cron`, 03:30 server time, and once 30 s after start) removes accounts 14 days after deletion, expired sessions and used or expired email tokens. Run `npm install node-cron` after pulling. Signup with a deleted account's email or username stays blocked until the account is removed.

## Tests

`npm test` (in `backend/`) runs `node:test` with Supertest against a **separate** database. One-time setup: create an empty database (for example `devfolio_test`), put its URL in `backend/.env` as `DATABASE_URL_TEST`, then apply the migrations to it with `DATABASE_URL=<that url> npx prisma migrate deploy`. The tests refuse to run if `DATABASE_URL_TEST` is missing or equal to `DATABASE_URL`. They create users with the email domain `@devfolio-test.dev` and delete them afterwards; no email is sent (messages are collected in memory) and rate limits are off. Install once with `npm install -D supertest` and `npm pkg set scripts.test="node --test --test-concurrency=1 \"tests/**/*.test.js\""`.
