# Devfolio

Devfolio is a platform where developers build a portfolio, publish it at a public URL, share it and (soon) track how it performs. It is under active development: see the roadmap below.

## Tech stack

- **Backend:** Node.js (ES modules), Express 5, Prisma 7 with PostgreSQL, JWT auth, zod, pino
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
| `JWT_SECRET` | yes | Secret for signing login tokens, **at least 32 characters** (`openssl rand -hex 32`) |
| `RESEND_API_KEY` | yes | Resend API key for contact-form emails |
| `RESEND_FROM` | no | Email sender, default `Devfolio <onboarding@resend.dev>`. Resend's test sender only delivers to your own Resend account email until you verify a domain (planned for Phase 6) |
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
  middleware/     # auth, validate(schema), error handling
  utils/          # AppError, validators, mailer
  prisma/         # schema and migrations
frontend/
  index.html      # landing page
  pages/          # auth, onboarding, portfolio, edit pages
  js/ css/        # scripts and styles
```

## API

All endpoints live under `/api/v1`. `GET /healthz` returns `{ "status": "ok" }` after a database ping (503 if the DB is unreachable); `/health` is a legacy alias.

## Errors

Every API error is `{ "error": { "code": "...", "message": "...", "fields": { "fieldName": "message" } } }` (`fields` only for validation errors).

## Notes

- Contact-form emails currently use Resend's test sender, which only delivers to the email of your Resend account until you verify a domain.
- The structure above is being reorganized and hardened in stages as part of the build plan.
