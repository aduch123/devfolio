# HANDOFF: Devfolio Build

> **Read this first.** This file is the single source of truth for where the project stands. It is written for a fresh Claude chat with no memory of earlier sessions. Keep it updated at the end of every session (see section 9).

**Project name:** **Devfolio** (repo name `devfolio`)
**Last updated:** 2026-10-12 (Session 2, subphase 0.2 implemented)
**Current position:** Phase 0. Subphase **0.2 implemented, awaiting user verification**. Next: **0.3** (after 0.2 is verified and merged).
**Code changes made so far:** 0.1 (hygiene and bootstrap, committed on `phase-0.1-hygiene`) and 0.2 (restructure and `/api/v1`, delivered as `devfolio-0.2-changes.zip`).

---

## 1. Instructions for Claude (token budget)

**The user is on a free Claude plan with tight usage limits.** Every wasted token can cut the session short before the subphase is finished. Follow these rules strictly:

1. **Do only the current subphase.** Never start work from another subphase, and never "while I'm here" refactors.
2. **Read only what you need.** Do not re-read or summarize the whole project. Open just the files the subphase lists. Use `grep` or `head` to peek rather than printing large files.
3. **Edit, don't rewrite.** Use targeted edits (`str_replace`) on existing files. Only create full files when they are new. Do not reprint unchanged code.
4. **Keep replies short.** No long preambles, no restating the plan, no recap of what the user already knows. Briefly say what you changed and what to test.
5. **No extra deliverables.** No extra markdown docs, diagrams, or explanations unless asked. No web searches unless truly needed (the stack facts are in section 4).
6. **Ask at most one question**, and only if blocked. Otherwise state an assumption in one line and continue.
7. **Never print or ask for secrets.** `.env` must not be uploaded. If a real secret appears, tell the user to rotate it.
8. **Deliver only changed and new files** (zip with project-relative paths), not the whole project, unless asked.
9. **Watch the context budget.** If the session is getting long or you are near the limit, stop adding scope, finish the current edit, and produce the handoff update block (section 9) **before** running out.
10. **Verify cheaply.** Run `node --check`, lint or a quick import test on changed files when possible. The user will run the app, database migrations and browser tests locally, since the chat sandbox has no access to their database.
11. **Update `HANDOFF.md` after every change, not just at the end of a subphase.** Any edit to code, docs, config or decisions (including small follow-up fixes the user requests) must be reflected in the handoff in the same reply: header, status tracker, section 4 if the codebase changed, and a session log line. Re-deliver the updated `docs/HANDOFF.md` with it. Never finish a reply that changed something without having updated the handoff.

---

## 1b. Working workflow (follow for every subphase)

1. **Brief first.** Before changing anything, Claude sends a short brief: what it will do, which files it will touch, what is out of scope, and any choices that need a decision. **No code changes until the user approves.**
2. **User approves** (or adjusts the brief).
3. **Claude implements** only that subphase, checking cheaply (`node --check`, lint, import or startup tests where possible). The sandbox has no database and may block Prisma binary downloads, so DB-backed flows are tested by the user locally.
4. **Claude delivers**, in one reply: (a) a **zip of changed and new files only**, with project-relative paths so it can be unzipped over the repo root; (b) a list of **files to delete**, if any; (c) the **updated `HANDOFF.md`** (Claude edits it itself with targeted edits; the user does not paste anything; this applies to every change, see rule 11); (d) a suggested **commit message**.
5. **User applies and verifies:** unzips over the repo, runs `npm install` if `package.json` changed, runs the subphase's success criteria, commits on the subphase branch (`phase-0.X-name`), merges into `main` when all pass.
6. **Next session** starts from the updated `HANDOFF.md` (section 8 holds the next task).

**Git conventions:** one branch per subphase (`git switch -c phase-0.X-name`); tag `v0-baseline` marks the original code; commit messages use `type: summary` (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `style:`).

---

## 2. What this project is

**Devfolio** is a web platform where developers create a portfolio, manage it from a personal **dashboard**, publish it at a public URL (`/username`), share it, and see how it performs.

**Product loop:** Build → Manage → Publish → Share → Track → Improve.

**Today (before any changes)** it is a small portfolio generator: sign up, fill an onboarding form, get a portfolio page, edit it in a basic editor, share via token link, and visitors can email the owner through a contact form.

**Target (full vision):** a platform with a dashboard as the logged-in home, live preview with inline editing, draft and publish control, public SEO-friendly pages, private share links, message inbox, analytics (views, likes, sources, devices, clicks), portfolio health score with link checker, themes and dark mode, email verification, password reset and account management.

The goal is an **intermediate-level** project that is also well structured and secure.

---

## 3. Planning documents (what exists)

| File | Contents | Use it when |
|---|---|---|
| `BUILD_PLAN.md` | Full 11-phase plan (0 to 10), data model, API surface, architecture, success criteria per phase, traceability appendices | Starting a **new phase** (paste only that phase's section) |
| `PHASE_0_PLAN.md` | Phase 0 split into 8 subphases (0.1 to 0.8) with tasks and success criteria | Starting a **new subphase** (paste only that subphase's section) |
| `HANDOFF.md` (this file) | Status, context, rules, log | **Every** new chat |

**To save tokens, upload only this file plus the subphase section you are working on**, not the full plans, unless Claude needs something specific.

### Phase roadmap (one line each)

| Phase | Theme |
|---|---|
| 0 | Foundation, cleanup and critical fixes (8 subphases) |
| 1 | Accounts and secure sessions (httpOnly cookies, email verification, password reset, account deletion) |
| 2 | Content model and editor API (custom skills, social links, experience and education, uploads, ordering, section config) |
| 3 | Routing, onboarding wizard and dashboard shell (`/` redirects to `/dashboard`) |
| 4 | Live preview, inline editing, autosave, publish and draft |
| 5 | Server-rendered public page, SEO, private share links |
| 6 | Messages inbox and spam protection |
| 7 | Analytics and likes |
| 8 | Portfolio health (score, link checker, suggestions) |
| 9 | Themes, dark mode, landing page, UX and accessibility polish |
| 10 | Hardening, tests, observability, launch |

---

## 4. Current codebase (after subphase 0.2)

**Stack:** Node (ES modules, `"type": "module"`), **Express 5**, **Prisma 7** with PostgreSQL via `@prisma/adapter-pg` (datasource URL is set in `prisma.config.ts`, not in `schema.prisma`), JWT (`jsonwebtoken`), `bcrypt`, `zod` v4, `pino` and `pino-http`, `resend` for email, `nodemon` in dev. Dev tooling: ESLint 10 (flat config) and Prettier 3. Frontend: **vanilla HTML, CSS and JS** (ES modules), served by Express as static files. No build step, no tests.

**Notes on the stack that matter:**
- Express 5 forwards rejected promises from async handlers to the error middleware automatically, so the existing `catchAsync` wrapper is redundant (still present; keep or remove consistently in 0.2 or 0.3).
- All environment access now goes through `config/env.js` (`import { env } from "../config/env.js"`). Do not read `process.env` elsewhere. (Exception: `prisma.config.ts` is the Prisma CLI config and still reads `process.env.DATABASE_URL` directly on purpose.)
- `app.js` exports the Express app (no `listen`); `server.js` only calls `listen`.
- Prisma 7: `migrate dev` does not auto-run `generate`, so run `npx prisma generate` after installing.

**Backend layout:**
```
backend/
  app.js                    # builds Express app: middleware, static, /health + /healthz, /api/v1 routers, page routes, 404, errorHandler
  server.js                 # imports app, listens on env.PORT
  modules/<name>/           # <name>.routes.js + <name>.controller.js (validation still inline in controllers)
                            # names: auth, profile, skills, projects, onboarding, share, messages
  config/                   # env.js (zod-validated env, exits on error), constants.js (APP_NAME),
                            # prisma.js, logger.js (pino-pretty only when NODE_ENV != production)
  middleware/               # auth.middleware.js (Bearer JWT), error.middleware.js
  utils/                    # catchAsync.js, mailer.js (Resend, from "Portfolio Contact <onboarding@resend.dev>", renamed in 0.7)
  prisma/                   # schema.prisma + 4 migrations
  eslint.config.js, .prettierrc, .prettierignore, .env.example
  .env                      # NOT to be uploaded (contains secrets)
README.md                   # at repo root
```

**Frontend layout:**
```
frontend/
  index.html                # landing (title "Devfolio"), "Get started" -> /pages/auth.html
  pages/                    # auth (title "Log in | Devfolio"), onboarding, edit, portfolio (.html)
  js/                       # config (API_BASE_URL="", API_PREFIX="/api/v1"), api (apiFetch), authGuard, auth,
                            # onboarding, edit, portfolio, script (nav/scroll-reveal), skillStyles
  css/                      # global, auth, onboarding, edit
```

**Scripts (run in `backend/`):** `dev`, `start`, `lint`, `lint:fix`, `format`, `format:check`. Lint and format scripts `cd ..` first so they cover `backend/` and `frontend/` together; configs live in `backend/`.

**Current data model:** `User` (email, username, passwordHash, onboardingComplete, shareToken?, createdAt) -> one `Profile` (displayName, aboutText, heroRoleTexts[], contactEmail, contactPhone, githubUrl), many `Skill` (name enum-limited to 16 presets, icon?, level great/good/learning), many `Project` (title, description, repoUrl, liveUrl, tags[]). Cascade deletes. No `createdAt` on Skill or Project.

**Current API (all under `/api/v1`; paths below are relative to it):**
`GET /healthz` (outside the prefix, with DB ping; `/health` kept as alias), `POST auth/signup`, `POST auth/login`, `POST onboarding`, `GET|PATCH profile`, `GET portfolio/:username` (**wrongly requires auth**), `GET|POST skills`, `PATCH|DELETE skills/:id`, `GET|POST projects`, `PATCH|DELETE projects/:id`, `POST|GET|DELETE share`, `GET portfolio/share/:token`, `POST portfolio/:username/message`, `POST portfolio/share/:token/message`. (The unused `auth/onboarding/complete` route was removed in 0.1.)

**Page routes in `app.js`:** static files, `/health`, `/healthz`, API routers (`/api/v1`), then `/onboarding`, `/edit`, `/share/:token`, `/:username` (catch-all that serves `portfolio.html`), then a 404 handler and the error handler.

**Auth today:** login returns a JWT (7 days); the frontend stores `token` and `user` in `localStorage`; `apiFetch` adds the `Authorization: Bearer` header and on any 401 clears storage and redirects to `/pages/auth.html`. (Replaced by cookies in Phase 1. Do not change it in Phase 0.)

---

## 5. Known problems (the Phase 0 backlog)

| # | Problem | Fixed in |
|---|---|---|
| 1 | Secrets (`.env`) were shared in a zip, so they must be rotated | 0.1 (user action, **pending user confirmation**) |
| 2 | No env validation, no `.env.example`, server and app not split, no linter, dead code (`models/`, unused endpoint) | 0.1 **(implemented, awaiting verification)** |
| 3 | Flat structure, unversioned API | 0.2 **(implemented, awaiting verification)** |
| 4 | Inconsistent errors; flattened zod object shows "[object Object]" in the UI | 0.3 |
| 5 | URL fields accept `javascript:`; phone is free text; no max lengths; optional fields cannot be cleared (`undefined` is dropped from JSON) | 0.4 |
| 6 | Email and username case-sensitive; reserved usernames collide with routes; duplicate skills allowed; onboarding resubmit duplicates data; list order unstable | 0.5 |
| 7 | Public portfolio route requires login; stored XSS via unescaped `githubUrl`, `repoUrl`, `liveUrl`, `contactPhone`; dead `#` buttons and empty sections render | 0.6 |
| 8 | No security headers or rate limits; mail sender hardcoded | 0.7 |
| 9 | No end-to-end verification or docs | 0.8 |

---

## 6. Design decisions (assumed accepted unless the user changes them)

- **D1** Keep **vanilla JS** with ES modules, no framework.
- **D2** Move to **httpOnly cookie sessions** (access plus rotating refresh) in **Phase 1** (not before).
- **D3** **Server-side render** the public page in **Phase 5**.
- **D4** API prefix **`/api/v1`**.
- **D5** One error shape everywhere: `{ "error": { "code", "message", "fields?" } }`.
- **D6** Local `/uploads` behind a storage interface (Phase 2).
- **D7** `node-cron` for background jobs (Phase 7 and 8).
- **D8** Analytics store no raw IPs (hashed visitor ID).
- **D9** Tests with `node:test` or Vitest plus Supertest (Phase 10).
- **D10** `zod` for all validation.
- **D11** Product name is **Devfolio**. Used in `package.json` (`devfolio`), page titles, README, email sender display name (`Devfolio <...>`), Open Graph `og:site_name`, landing page and legal pages. Keep the name in one `APP_NAME` constant. (The code today still says "Portfolio"; `package.json` name is `Portfolio`, `index.html` title is "Portfolio Builder", mailer sender is "Portfolio Contact".)

**Phase 0 specific decisions**
- Onboarding resubmission is **rejected with 409** (not replaced). The wizard replaces it in Phase 3.
- Usernames: lowercase `a-z 0-9 -`, 3 to 30 characters, no leading or trailing dash, reserved names blocked.
- Empty optional fields are normalized to `null`.

**Decisions made in 0.1**
- `JWT_SECRET` must be at least 32 characters (enforced at startup). `PORT` defaults to 5000; `NODE_ENV` defaults to `development`. `RESEND_API_KEY` stays required.
- `APP_NAME = "Devfolio"` lives in `config/constants.js` (0.5 adds the reserved-username list there).
- Prettier is **configured but not applied**: running it now would reformat every file (`format:check` reports about 37 files). Apply once, in its own commit (`style: format with prettier`), right after 0.1 is merged and before 0.2, so later diffs stay readable.
- ESLint rule `no-unused-vars` is set with `args: none` (Express error handlers need unused `next`) and `caughtErrors: none` (existing `catch (err)` blocks left unchanged to avoid behavior edits).
- README lives at the repo root; setup instructions run `npx prisma migrate dev` then `npx prisma generate`.

---

## 7. Status tracker

Mark `[x]` when **all** success criteria of that item are verified by the user. `[~]` means implemented but not yet verified.

### Phase 0: Foundation, cleanup and critical fixes
- [~] **0.1** Hygiene and bootstrap: committed on `phase-0.1-hygiene`; user verification and merge into `main` not yet confirmed
- [~] 0.2 Restructure and API versioning: **implemented, awaiting user verification** (see section 8a)
- [ ] 0.3 Error contract  ← **NEXT** (after 0.2 is verified)
- [ ] 0.4 Input validation and clearable fields
- [ ] 0.5 Data integrity
- [ ] 0.6 Public access and XSS fixes
- [ ] 0.7 Security middleware
- [ ] 0.8 Verification and docs

### Phases 1 to 10
- [ ] Phase 1 · [ ] Phase 2 · [ ] Phase 3 · [ ] Phase 4 · [ ] Phase 5
- [ ] Phase 6 · [ ] Phase 7 · [ ] Phase 8 · [ ] Phase 9 · [ ] Phase 10

---

## 8. NEXT TASK

### 8a. First: user verifies 0.2 (no Claude work needed)

Unzip `devfolio-0.2-changes.zip` over the repo root, then **delete the now-empty `backend/routes/` and `backend/controllers/` folders** (the old files are replaced by `backend/modules/`). Run `cd backend && npm install` if you have not since 0.1 (the old `package-lock.json` was out of sync with `package.json`; commit the regenerated lock), then check:

- [ ] Server boots with no import errors.
- [ ] Signup, login, onboarding, view portfolio, edit profile, skills and projects, share, and contact form all work through `/api/v1`.
- [ ] `grep -rn "/api" frontend` shows the prefix only in `frontend/js/config.js`.
- [ ] `GET /healthz` returns 200 with the DB up; with the DB stopped it returns 503.
- [ ] `npm run lint` passes.

Then commit on `phase-0.2-structure` (suggested: `refactor: move code into modules, version API under /api/v1, add /healthz`), merge into `main`, and tick `[x]` for 0.2 in section 7. Also confirm 0.1 is merged and secrets rotated (a `.env` and `.git` were inside the last uploaded zip: do not include them again).

### 8b. Then: Subphase 0.3 (Error contract)

**Goal:** one error shape everywhere, so the "[object Object]" bug disappears and later phases have a stable foundation.

**Tasks**
- Add `utils/AppError.js` (`status`, `code`, `message`, optional `fields`) with helpers like `badRequest`, `unauthorized`, `notFound`, `conflict`, `tooMany`.
- Add `middleware/validate.js`: takes a zod schema, parses `req.body` (or query), and on failure throws a `400 VALIDATION_ERROR` with `fields: { fieldName: "message" }`.
- Standard response: `{ "error": { "code": "...", "message": "...", "fields": { ... } } }`. Update `error.middleware.js` to produce it for `AppError`, for zod errors, for unknown errors (500 with a generic message, full error only in logs) and for the 404 handler.
- Refactor all controllers: replace `res.status(...).json({ error: ... })` and inline `safeParse` blocks with `validate(schema)` plus thrown `AppError`s.
- Frontend: update `api.js` to return a consistent result shape (for example `{ ok, data, error }`), and update `auth.js`, `onboarding.js`, `edit.js` and `portfolio.js` to show `error.message` and map `error.fields` to the matching inputs.
- Add a small `showFieldErrors(form, fields)` helper in the frontend.

**Files touched (about 15):** error and validate utilities, error middleware, all controllers, `api.js`, `auth.js`, `onboarding.js`, `edit.js`, `portfolio.js`, one helper file.

**Out of scope:** changing what is validated (0.4).

**Success criteria**
- [ ] Every API failure response matches the standard shape (check at least: bad signup, wrong login, 404 portfolio, unauthorized, server error).
- [ ] Signing up with a 25-character username shows a message next to the username field, never "[object Object]".
- [ ] A forced server error returns a generic 500 message without leaking internals.
- [ ] Unknown `/api/v1/...` routes return the standard 404 shape.
- [ ] Frontend shows readable errors on login, signup, onboarding, edit tabs and the contact form.

---

## 9. How this file is updated

At the end of every subphase, **Claude updates this file itself** (workflow step 4) using **targeted edits** (do not regenerate the whole file; that wastes tokens). Each update must:

1. Update the header (**Last updated**, **Current position**, **Code changes made so far**).
2. Update the status tracker (section 7): `[~]` when implemented, `[x]` only after the user confirms verification.
3. Update section 4 only where the codebase changed (layout, routes, env vars, scripts, conventions).
4. Add any new decisions to section 6 and tick off backlog items in section 5.
5. Replace section 8 with the next task (copy that subphase's spec from `PHASE_0_PLAN.md`, or the next phase's section from `BUILD_PLAN.md`).
6. Append a session log entry (section 10, template below).

If a session is about to run out of context, Claude stops adding scope and does steps 1 to 6 first.

---

## 10. Session log

**Template (copy for each session)**
```
### Session N: Subphase 0.X (date)
Result: completed | partially completed (what remains)
Files created:
Files changed:
Files deleted:
New env vars / commands to run:
Decisions made (and why):
User verification: (which success criteria passed or failed)
Leftovers / TODOs for later:
Must not break:
```

**Log**

### Session 0: Planning (2026-10-12)
Result: completed
- Reviewed the uploaded project end to end (backend, frontend, data model, flows).
- Documented the current UX and feature gaps.
- Defined the target product and wrote `BUILD_PLAN.md` (11 phases) and `PHASE_0_PLAN.md` (8 subphases) and this `HANDOFF.md`.
- **No source code was changed.**
- Leftovers: user must rotate the shared secrets (see 0.1); user to confirm or change decisions D1 to D4 (assumed accepted).

### Session 0b: Naming (2026-10-12)
Result: completed
- Project named **Devfolio** (decision D11). Updated `BUILD_PLAN.md`, `PHASE_0_PLAN.md` and `HANDOFF.md` to use the name and added rename tasks to 0.1 (package, README, page titles) and 0.7 (email sender name).
- Leftover: user to check that the name is free on GitHub, npm and as a domain (`devfolio.*`). Similar products may exist, so confirm before registering a domain. If it must change, update `APP_NAME` and the places listed in D11.

### Session 1: Subphase 0.1, Hygiene and bootstrap (2026-10-12)
Result: **implemented; awaiting user verification** (DB-backed flows could not be tested in the sandbox)
Files created: `README.md` (repo root), `backend/.env.example`, `backend/.prettierrc`, `backend/.prettierignore`, `backend/eslint.config.js`, `backend/app.js`, `backend/config/env.js`, `backend/config/constants.js`
Files changed: `backend/server.js` (now only `listen`), `backend/package.json` (name `devfolio`, new scripts, dev deps: eslint, @eslint/js, globals, prettier, eslint-config-prettier), `backend/config/logger.js`, `backend/config/prisma.js`, `backend/controllers/auth.controller.js` (uses `env`, removed `completeOnboarding`), `backend/middleware/auth.middleware.js`, `backend/routes/auth.routes.js` (removed `/onboarding/complete` route), `backend/utils/mailer.js`, `frontend/index.html` (title), `frontend/pages/auth.html` (title)
Files deleted: `backend/models/` (empty folder; delete locally)
New env vars / commands: `NODE_ENV` (optional); run `cd backend && npm install` (new dev deps; updates `package-lock.json`); `npm run lint`
Sandbox checks passed: `node --check` on all backend files; lint clean on backend and frontend; env validation exits with readable messages (all missing, only `JWT_SECRET` missing, short secret); `app.js` imports as a plain Express app (Prisma client stubbed); live server served `/health` (200), `/` (200, title "Devfolio") and returned 404 for the removed `/api/auth/onboarding/complete`; production logs are JSON.
Not testable in sandbox: anything using the database or Resend, and `prisma generate` (binary download blocked).
Decisions made: see section 6, "Decisions made in 0.1".
Leftovers / TODOs for later:
- `npm run format:check` reports about 37 files; apply `npm run format` in its own commit after 0.1 merges.
- `catchAsync` is redundant under Express 5; decide in 0.2 or 0.3.
- Mailer sender still says "Portfolio Contact" (renamed in 0.7).
- `prisma.config.ts` still reads `process.env` directly (intentional, Prisma CLI config).
Must not break: `app.js` must stay importable without starting a server; all env access goes through `config/env.js`.

### Session 2: Subphase 0.2, Restructure and API versioning (2026-10-12)
Result: **implemented; awaiting user verification** (DB-backed flows could not be tested in the sandbox)
Files created: none new besides moved files; `backend/modules/<name>/<name>.routes.js` and `<name>.controller.js` for auth, profile, skills, projects, onboarding, share, messages
Files changed: `backend/app.js` (imports, `/api/v1` mounts, `/healthz`), `frontend/js/config.js` (`API_PREFIX`), `frontend/js/auth.js`, `edit.js`, `onboarding.js`, `portfolio.js` (use `API_PREFIX`), `README.md`, `docs/HANDOFF.md`
Files deleted: `backend/routes/*`, `backend/controllers/*` (moved with `git mv`; delete the empty folders locally)
New env vars / commands: none
Sandbox checks passed: `node --check` on all backend files; `npm run lint` clean; app booted with a stubbed Prisma client: `/health` 200, `/healthz` 503 when DB unreachable, `/api/v1/*` protected routes 401, `/api/v1/auth/login` with empty body 400, old `/api/profile` 404.
Process note: user added rule 11 (update the handoff after every change), added to section 1 and workflow step 4.
Decisions made (and why): validation left inline in controllers (extracting is a logic-adjacent change, done in 0.3/0.4); `catchAsync` left in place (revisit in 0.3); `/healthz` sits outside `/api/v1`.
Leftovers / TODOs for later:
- `GET /api/v1/portfolio/:username` still wrongly requires auth (0.6).
- `catchAsync` is redundant under Express 5; decide in 0.3.
- `package-lock.json` in the uploaded zip was out of sync with `package.json`; user should run `npm install` and commit it.
- Prettier still not applied (separate `style:` commit).
Must not break: `app.js` importable without starting a server; all env access via `config/env.js`; frontend API paths only via `API_PREFIX`.

*(Add Session 3 and onward below this line.)*

---

## 11. Starting message to paste into the new chat

> I'm building **Devfolio**, a developer portfolio platform, following the attached plan. I'm on a **free Claude plan, so be very economical with tokens**. Read `HANDOFF.md` (attached) first, and follow its rules in section 1 and the workflow in section 1b. Work on the **NEXT TASK in section 8** only. **Send me a brief first and wait for my approval before changing anything.** Attached: `HANDOFF.md` and my project zip (without `.env` and `node_modules`). When done, send me a zip of the changed files only, the updated `HANDOFF.md`, and a suggested commit message.
