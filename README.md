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
| `MAX_FEATURED_PROJECTS` | no | Most projects a user may feature (default `3`) |
| `UPLOAD_DIR` | no | Folder for uploaded images and resumes (default `backend/uploads`, git-ignored; use a persistent disk in production) |
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
    auth/ account/ profile/ skills/ projects/ social/ timeline/ media/ onboarding/ share/ messages/
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
| Profile | `GET`, `PATCH profile` (incl. `headline`, `location`, `sectionConfig`); `POST`, `DELETE profile/avatar` and `profile/resume` (multipart field `file`) | yes |
| Skills | `GET`, `POST skills`; `PATCH`, `DELETE skills/:id`; `PUT skills/order` (`{ ids }`, 204) | yes |
| Projects | `GET`, `POST projects`; `PATCH`, `DELETE projects/:id`; `PUT projects/order` (`{ ids }`); `POST`, `DELETE projects/:id/cover` (multipart `file`) | yes |
| Social links | `GET`, `POST social`; `PATCH`, `DELETE social/:id`; `PUT social/order` (`{ ids }`) | yes |
| Timeline | `GET timeline?type=`, `POST timeline`; `PATCH`, `DELETE timeline/:id`; `PUT timeline/order` (`{ type, ids }`) | yes |
| Share link | `POST`, `GET`, `DELETE share` | yes |
| Public portfolio | `GET portfolio/:username`, `GET portfolio/share/:token` | no |
| Contact form | `POST portfolio/:username/message`, `POST portfolio/share/:token/message` | no |

**Sessions:** login sets two `HttpOnly`, `SameSite=Lax` cookies (`Secure` in production): `dev_access` (JWT, 15 minutes) and `dev_refresh` (30 days, sent only to `/api/v1/auth`). The refresh token is stored hashed in the `Session` table and rotates on every refresh; presenting an already-rotated token after a 10-second grace window revokes that session. The client refreshes silently once on a 401 and retries. Logout revokes the session server-side, and protected routes check the session in the database on every request. State-changing `/api/v1` requests whose `Origin` header is another site are refused (`BAD_ORIGIN`, 403). Run `npm install` after pulling (adds `cookie-parser`).

**Email verification:** signup emails a single-use link (`/verify-email?token=...`, valid 24 hours; only the token hash is stored in `EmailToken`). The page posts the token to the API, so a link scanner opening the URL cannot use it up. Resending is public by email, answers the same for every address, and has a 60-second cooldown per account plus 5 requests per hour per IP. Nothing is blocked for unverified users yet. Resend's test sender only delivers to your own Resend account email until you verify a domain.

**Password reset:** `/forgot-password` always answers the same for any email (5 per hour per IP, 60 s cooldown per account). The emailed link (`/reset-password?token=...`) is single-use and valid for 1 hour. Resetting sets the new password and revokes every session of that account (protected routes check the session in the database, so they stop working at once).

Public portfolio responses contain only public fields (no account email, ids, hashes or share token).

## Pages and redirects

Page routes decide by session on the server (no flash of the wrong page): `/`, `/login` and `/signup` redirect a logged-in visitor to `/dashboard` (or `/onboarding` if onboarding is unfinished); `/dashboard`, `/dashboard/<portfolio|messages|analytics|health>`, `/settings`, `/onboarding` and `/edit` redirect a logged-out visitor to `/login` (dashboard and settings add `?next=` so login returns there). `/dashboard` sends unfinished users to `/onboarding`; `/onboarding` sends finished users to `/dashboard`. The check reads the access cookie ignoring token expiry and confirms the session in the database, so a user whose 15-minute token just expired still gets the page and the browser refreshes silently. `/login?reauth=1` skips the redirect (the client sets it when its own session check fails, which prevents loops). The settings page uses the account endpoints above.

## Usernames

3 to 30 characters: letters, numbers and dashes, with no dash at the start or end. Usernames and emails are stored in lowercase. These names are reserved (they would collide with routes): `api`, `edit`, `dashboard`, `login`, `logout`, `signup`, `register`, `settings`, `account`, `onboarding`, `share`, `pages`, `css`, `js`, `uploads`, `static`, `assets`, `admin`, `help`, `support`, `health`, `healthz`, `auth`, `portfolio`, `profile`, `skills`, `projects`, `messages`, `about`, `terms`, `privacy`, `www`, `root`, `null`, `undefined` (list: `backend/config/constants.js`).

## Errors

Every API error is `{ "error": { "code": "...", "message": "...", "fields": { "fieldName": "message" } } }` (`fields` only for validation errors). Common codes: `VALIDATION_ERROR` (400), `INVALID_CREDENTIALS`, `UNAUTHORIZED`, `INVALID_TOKEN`, `NO_REFRESH_TOKEN`, `INVALID_REFRESH_TOKEN` and `REFRESH_TOKEN_REUSED` (401), `BAD_ORIGIN` (403), `*_NOT_FOUND` and `ROUTE_NOT_FOUND` (404), `USER_EXISTS`, `SKILL_EXISTS`, `SKILL_LIMIT`, `SOCIAL_LIMIT`, `TIMELINE_LIMIT`, `FEATURED_LIMIT` and `ALREADY_ONBOARDED` (409), `INVALID_ORDER`, `INVALID_FILE`, `NO_FILE` and `BAD_UPLOAD` (400), `FILE_TOO_LARGE` (413), `PAYLOAD_TOO_LARGE` (413), `RATE_LIMITED` (429), `EMAIL_SEND_FAILED` (502), `INTERNAL_ERROR` (500).

## Notes

- Contact-form emails use `RESEND_FROM` (default: Resend's test sender, which only delivers to the email of your Resend account until you verify a domain).
- `.env` is git-ignored; only `.env.example` is committed. Rotate any secret that was ever shared.
- Known dev-only advisories from `npm audit` (Prisma CLI and nodemon tooling) are tracked in `docs/HANDOFF.md`.
- The project is being built in phases: see `docs/BUILD_PLAN.md`.


## Account settings and cleanup

Changing the password ends all other sessions; changing the email marks it unverified and sends a new link; changing the username makes the old portfolio URL return 404 (no redirect). Deleting the account (password required) hides it and ends all sessions at once; a daily job (`node-cron`, 03:30 server time, and once 30 s after start) removes accounts 14 days after deletion, expired sessions and used or expired email tokens. Run `npm install node-cron` after pulling. Signup with a deleted account's email or username stays blocked until the account is removed.

## Tests

`npm test` (in `backend/`) runs `node:test` with Supertest against a **separate** database. One-time setup: create an empty database (for example `devfolio_test`), put its URL in `backend/.env` as `DATABASE_URL_TEST`, then apply the migrations to it with `DATABASE_URL=<that url> npx prisma migrate deploy`. The tests refuse to run if `DATABASE_URL_TEST` is missing or equal to `DATABASE_URL`. They create users with the email domain `@devfolio-test.dev` and delete them afterwards; no email is sent (messages are collected in memory) and rate limits are off. Install once with `npm install -D supertest` and `npm pkg set scripts.test="node --test --test-concurrency=1 \"tests/**/*.test.js\""`.

**Content and uploads (Phase 2):** skills (preset or custom, with a category), projects (cover image, featured), social links and a timeline (experience and education) all have create, update, delete and a `PUT .../order` endpoint that takes the full list of ids in the new order; another user's id gives 404. Public reads return everything in the saved order. Uploads: avatar and cover images (JPEG, PNG or WebP, 2 MB) are checked by their content, resized and re-encoded as WebP; resumes (PDF, 5 MB) are checked by signature. Files get random names under `UPLOAD_DIR`, are served from `/uploads` with `nosniff` and a locked-down CSP, and the old file is deleted when replaced. Run `npm install multer sharp` after pulling.

**Section config:** `profile.sectionConfig` says which sections the portfolio shows and in what order: `about`, `skills`, `projects`, `experience`, `education`, `contact`, each `{ visible, order }` (order 0 to 5, unique). `PATCH /profile` takes any subset and merges it into the saved config (two sections cannot share a position, so move several in one request); `null` resets to the defaults. `GET /profile` and the public portfolio always return all six sections.

## Portfolio editor (Phase 4)

Editing now lives at `/dashboard/portfolio`; `/edit` redirects there. The dashboard provides responsive preview, inline autosave with retry, profile/contact and content panels, uploads, ordering and section controls. New portfolios are drafts. Publishing requires a verified email, display name and about text; private share links can still open drafts. Apply the publishing migration with `npx prisma migrate deploy` before starting the updated app. Section configuration also accepts an optional `title` (1–80 characters) per section.

## Public pages and private sharing (Phase 5)

Public `/:username` pages are rendered on the server using the same view tree as the dashboard preview. They include canonical, Open Graph/Twitter and JSON-LD metadata. `/sitemap.xml` lists only published active accounts; `/robots.txt` excludes private/app routes. Default preview images are generated at `/:username/og.png`. Set `APP_URL` to your production origin for canonical URLs and QR codes. Profile settings accept `seoTitle`, `seoDescription` and `ogImageUrl`.

Authenticated share management: `GET`/`POST /api/v1/share-links`, `PATCH`/`DELETE /api/v1/share-links/:id`, and `GET /api/v1/share-links/qr` for the public URL QR image. A private link has a label and optional future expiry. Its token is returned only when created; listing never returns tokens or hashes. Revocation is permanent. Private links can open drafts and are always noindex. Existing tokens are migrated to SHA-256 hashes before the plaintext column is removed, preserving existing URLs. Legacy `/share` endpoints remain for compatibility, but `GET /share` cannot recover a token.

Run `npm install` in backend for QR support, then `npx prisma migrate deploy` and `npx prisma generate` before running this version. The migrations add SEO fields and replace the old share-token column. Private/verification request URLs and authentication cookies are redacted from logs; normal test request logs are suppressed. Browser and Lighthouse checks are deferred at the user's request, so no visual/performance score is claimed. Per-link view counts are delivered with Phase 7 analytics.

## Messages and inbox (Phase 6)

Contact submissions are saved before notification delivery. Failed notifications do not lose the message; owners can read it under `/dashboard/messages`. The inbox supports status filters, sender/text search, 20-message pages, read/unread, archive/restore, confirmed deletion and email-client replies. Email notifications can be disabled without disabling message storage.

Public contact requests require a published portfolio; active private links can accept draft messages. Requests include `name`, `email`, `message`, an empty `website` honeypot and `startedAt` (milliseconds, between 2 seconds and 24 hours ago). Global IP, IP/URL and recipient-wide limits apply. These are basic spam controls, not proof of a human visitor. Optional third-party CAPTCHA is not enabled.

Owner endpoints: `GET /api/v1/messages?status=UNREAD|READ|ARCHIVED&q=&page=1`, `GET /messages/unread`, `PATCH /messages/:id` (`{ status }`), `DELETE /messages/:id`, and `GET`/`PATCH /messages/preferences` (`{ emailNotifications }`), all under `/api/v1` and authenticated. Message state and preferences are private and excluded from public portfolio data. Apply the message-inbox migration before starting this version.

Live email delivery still requires a verified Resend sending domain and correct `RESEND_FROM`/`APP_URL`. No external email-account configuration was changed by the implementation. Actual domain/delivery verification remains a launch gate; tests simulate successful delivery, provider failure and notification opt-out. Browser testing remains deferred.

## Analytics and likes (Phase 7)

Public portfolios and active private links send first-party view/click beacons; owner visits and known bot agents are excluded. Repeated views in the same fixed 30-minute window are deduplicated per portfolio and visitor hash. Referrers are reduced to hostnames, devices to broad categories, and no raw IP or full user-agent is stored in analytics tables. Visitor hashes use HMAC with the server secret, UTC date and portfolio ID. Multi-day unique totals are therefore visitor-days, not distinct people. Likes use a separately scoped stable hash so daily rotation does not permit another like. Shared networks, changed IPs/user agents or server-secret rotation can affect deduplication.

Engagement routes under `/api/v1/portfolio/:username` and `/portfolio/share/:token`: `POST view`, `POST click`, `GET engagement`, `POST like`, `DELETE like`. Clicks must match the portfolio's saved links. Drafts accept private-link views/clicks but cannot be liked. Tracking failure never blocks navigation. Owner analytics: `GET /api/v1/analytics/{summary,timeseries,sources,devices,clicks}?days=7|30|90` and `GET /api/v1/activity`. The dashboard includes period comparisons, accessible chart tables, activity and private-link view counts.

Daily maintenance transactionally rolls raw views older than 13 months into daily totals, preserving source/device distributions and lifetime counts, then deletes those raw rows. It processes up to 100 portfolio-days per run; larger backlogs drain across runs. Per-link cumulative counters survive retention. `/privacy` explains collection and still needs operator-specific legal/contact details before launch. Deploy the analytics migration before starting this version. Run the optional load fixture with `RUN_ANALYTICS_PERF=1 node --test tests/analytics.test.js` in backend against the isolated test DB. The local 100,000-row chart query measured 291 ms; deployment hardware may differ.

## Portfolio health (Phase 8)

`GET /api/v1/health/report` returns the owner's score (completeness 40, checked links 25, SEO 20, contact 15), category breakdown, suggestions, link statuses, progress and recent snapshots. `POST /health/links/recheck` starts an asynchronous recheck (202), limited to five starts per 15 minutes per owner. Suggestions can be dismissed with `POST /health/dismiss` (`{ key }`) or restored with `DELETE /health/dismiss/:key`. All endpoints require authentication. The dashboard shows advisory publish warnings and Fix links that open the corresponding editor field. A settings action resends verification to the account email.

The checker accepts only HTTP(S) on ports 80/443, rejects URL credentials and non-public/reserved IP ranges, validates every DNS answer and redirect, and pins each connection to a validated address while retaining normal TLS verification. Requests use a named user agent, three-second per-hop DNS/request limits, a 16 KB header limit, a 64 KB body cap, HEAD with GET fallback and at most five redirects. Global checker concurrency is three. Sites returning 401/403/429 are SKIPPED rather than declared broken. Pending links receive no health credit until checked; skipped links are excluded from the checked-link ratio. Automated requests are advisory and cannot prove browser availability.

Published portfolios are checked daily at 04:00 UTC. Score snapshots and dismissed suggestions persist; deleting an account cascades them. Contact health uses the latest successful notification acceptance recorded by the app, not proof of inbox delivery or domain verification. Deploy the health migration before running this version. Focused tests use mocked DNS/transports and do not probe real private networks. Browser interaction/layout checks remain deferred.

## Themes, appearance and polish (Phase 9)

Choose Editor, Minimal, Bold or Gradient in the profile editor, plus a six-digit accent color and default appearance (Auto/Light/Dark). Changes preview immediately and persist when saved. Accent foregrounds and link colors are adjusted to meet 4.5:1 contrast on the supported light/dark surfaces; the focused test covers 216 color-cube samples. This token test is not a claim of a complete WCAG audit. Visitors can override portfolio appearance locally, and app appearance has its own local preference. No credential or account data is stored with these preferences.

The landing page includes a live fictional `/demo`, with messaging and analytics disabled. Privacy and development terms pages are available; operator-specific legal/contact details must be finalized before launch. Browser error pages preserve HTTP status codes and use friendly HTML; API errors keep their JSON format. The editor warns before leaving with unsaved panel changes. Ctrl/Cmd+S saves the active editor panel or flushes pending inline changes; Ctrl/Cmd+Enter opens publishing. Destructive persisted actions use confirmation dialogs. CSS includes visible focus, reduced motion, responsive layouts and mobile navigation rules.

Deploy the theme migration before starting this version. Keyboard flows, responsive layout, axe and Lighthouse checks remain deferred under the user's no-browser-testing instruction; no audit/performance score is claimed for these interfaces.
