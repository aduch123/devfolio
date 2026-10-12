# HANDOFF: Devfolio Build

> **Read this first.** This file is the single source of truth for where the project stands. It is written for a fresh Claude chat with no memory of earlier sessions. Keep it updated at the end of every session (see section 9).

**Project name:** **Devfolio** (repo name `devfolio`)
**Last updated:** 2026-10-12 (Session 7, subphase 0.8 implemented, Phase 0 pending final verification; Session 6, subphase 0.7 verified and committed; Session 5, subphase 0.6 verified and committed; Session 4, subphase 0.5 verified and committed; Session 3c, command-block rule; Session 3b, git workflow)
**Current position:** Phase 0, last subphase. **0.5 to 0.7 verified by the user**; **0.8 implemented, awaiting user verification** (`devfolio-0.8-changes.zip`, on top of 0.7). When the 0.8 checks and the regression walkthrough pass, merge `phase-0-foundation` into `main` and start **Phase 1** (section 8b). 0.1 to 0.4 are committed (verification not explicitly confirmed; the walkthrough covers them).
**Code changes made so far:** 0.1 (hygiene and bootstrap, committed on the Phase 0 branch `phase-0-foundation`), 0.2 (restructure and `/api/v1`, pushed to the Phase 0 branch), 0.3 (error contract, `devfolio-0.3-changes.zip`) and 0.4 (validation, `devfolio-0.4-changes.zip`, cumulative on top of 0.3), 0.5 (data integrity, committed), 0.6 (public access and XSS, committed), 0.7 (security middleware, committed), 0.8 (smoke script, README, audit notes, `devfolio-0.8-changes.zip`, on top of 0.7).

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
12. **End every subphase (or batch) with a copy-paste command block for the user.** In the same reply as the zip, give the exact shell commands, in order, for: (a) switching to the phase branch; (b) unzipping if a path is needed; (c) **removals** (`rm`, `git rm` for deleted or renamed files, empty folders to delete); (d) **additions or setup** (`npm install`, `npx prisma generate` or `migrate dev`, new `.env` keys, new ignore entries, anything to install or configure); (e) `git add` for exactly the changed paths, followed by `git status` with a note on what must **not** appear (`.env`, `node_modules`); (f) `git commit -m "type(N.X): summary"`; (g) `git push`. For a batch of subphases, give one block per subphase, in order, with the files each commit should contain. Say clearly when a step is optional, and never tell the user to merge into `main` before the phase is complete.

---

## 1b. Working workflow (follow for every subphase)

1. **Brief first.** Before changing anything, Claude sends a short brief: what it will do, which files it will touch, what is out of scope, and any choices that need a decision. **No code changes until the user approves.**
2. **User approves** (or adjusts the brief).
3. **Claude implements** only that subphase, checking cheaply (`node --check`, lint, import or startup tests where possible). The sandbox has no database and may block Prisma binary downloads, so DB-backed flows are tested by the user locally.
4. **Claude delivers**, in one reply: (a) a **zip of changed and new files only**, with project-relative paths so it can be unzipped over the repo root; (b) a list of **files to delete**, if any; (c) the **updated `HANDOFF.md`** (Claude edits it itself with targeted edits; the user does not paste anything; this applies to every change, see rule 11); (d) a ready-to-run **"Apply and commit" command block** (see rule 12): removals, additions, staging, status check, commit with the suggested message, and push.
5. **User applies and verifies:** unzips over the repo, runs `npm install` if `package.json` changed, runs the subphase's success criteria, commits it on the **phase branch** (`phase-N-name`, one commit per subphase). The phase branch is merged into `main` only when every subphase of the phase passes.
**Batching (allowed when the user asks):** several consecutive subphases can be done in one session. Send one brief covering all of them, build them in order, and deliver **one zip per subphase** (each cumulative on top of the previous) plus one `HANDOFF.md`, so each subphase can still be its own commit on the phase branch. If the session runs long, stop after the last finished subphase and hand off. (First batch: 0.3 + 0.4, Session 3.)
6. **Next session** starts from the updated `HANDOFF.md` (section 8 holds the next task).

**Git conventions (one branch per phase):**
- One branch per **phase**, created from `main` when the phase starts and named `phase-N-name` (Phase 0 is `phase-0-foundation`, Phase 1 would be `phase-1-accounts`). Subphases are **not** separate branches.
- Each subphase is **one commit** (or a few) on the phase branch, made once that subphase's success criteria pass. Suggested format: `type(N.X): summary`, for example `refactor(0.2): move code into modules`. Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`.
- When **all subphases of the phase** are verified, merge the phase branch into `main` with `git merge --no-ff phase-N-name`, then tag it `phase-N-complete`. Tag `v0-baseline` marks the original code.
- Do not merge to `main` mid-phase, unless a fix is urgent.

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

## 4. Current codebase (after subphase 0.7)

**Stack:** Node (ES modules, `"type": "module"`), **Express 5**, **Prisma 7** with PostgreSQL via `@prisma/adapter-pg` (datasource URL is set in `prisma.config.ts`, not in `schema.prisma`), JWT (`jsonwebtoken`), `bcrypt`, `zod` v4, `pino` and `pino-http`, `resend` for email, `helmet`, `express-rate-limit` (0.7), `cors`, `nodemon` in dev. Dev tooling: ESLint 10 (flat config) and Prettier 3. Frontend: **vanilla HTML, CSS and JS** (ES modules), served by Express as static files. No build step, no tests.

**Notes on the stack that matter:**
- Express 5 forwards rejected promises from async handlers (and errors thrown in sync middleware) to the error middleware automatically. `catchAsync` was removed in 0.3: controllers and routes are plain `async` functions that `throw` an `AppError`.
- **Error contract (0.3):** every API error is `{ "error": { "code", "message", "fields?" } }`. Throw helpers from `utils/AppError.js` (`badRequest`, `validationError`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `tooMany`). Request validation is `validate(schema)` middleware in the route (`middleware/validate.js`), which replaces `req.body` with the parsed data, so controllers read `req.body` as already valid. Unknown errors become a generic 500 and are logged only.
- **Validation (0.4):** reusable zod pieces live in `utils/validators.js` (`safeUrl` http/https only, `phone`, `optionalText/Url/Email/Phone` which turn `""` into `null`, `requiredText`, tags and role lists, the single `SKILL_VALUES` list, and `LIMITS`). Optional fields can be cleared by sending `null` or `""`; omitted keys mean "do not change".
- **Data integrity (0.5):** `email` and `username` are lowercased by the zod schemas (`identityEmail` in `utils/validators.js`, `usernameSchema` in `modules/auth/auth.schema.js`), so signup and login always see lowercase. Username lookups from URL params call `.toLowerCase()`. Username rules: 3 to 30, `a-z 0-9 -`, no leading or trailing dash, reserved names in `RESERVED_USERNAMES` (`config/constants.js`). Skills are unique per user, case-insensitive (raw SQL index `Skill_userId_lower_name_key`; controllers pre-check and also map Prisma `P2002` via `utils/prismaErrors.js` to `409 SKILL_EXISTS`). Onboarding returns `409 ALREADY_ONBOARDED` (atomic `updateMany ... onboardingComplete:false` inside an interactive transaction). Every list and public read orders by `createdAt asc, id asc`.
- **Public access (0.6):** `GET /api/v1/portfolio/:username` and `GET /api/v1/portfolio/share/:token` need no login and return only `PUBLIC_PORTFOLIO_SELECT` (`utils/publicPortfolio.js`): `username`, profile (`displayName, aboutText, heroRoleTexts, contactEmail, contactPhone, githubUrl`), skills (`name, icon, level`), projects (`title, description, repoUrl, liveUrl, tags`), ordered by `createdAt, id`. No user id, account email, hash, share token or row ids. `contactEmail` is the owner's chosen public contact address. Add new public fields in that one file.
- **Frontend rendering rule (0.6):** `portfolio.js` builds the page with `createElement` and `textContent` only (helpers `make`, `makeIcon`, `makeLink`, `safeHref` allowing `http`, `https`, `mailto`, `tel`). Never use `innerHTML` with stored values there. Empty links, skills, projects and about are not rendered (section and nav link hidden). `apiFetch(path, { anonymous: true })` sends no token and never redirects to login; use it for every public call (portfolio read, contact form).
- **Security middleware (0.7):** `app.js` order is `trust proxy` (from `TRUST_PROXY`), `helmet` with a CSP (self scripts; styles from self, Google Fonts, cdnjs and `'unsafe-inline'` because of inline `style=""` attributes, to be tightened in Phase 10; fonts from `fonts.gstatic.com` and cdnjs; images self and `data:`; `frame-ancestors 'none'`; `upgrade-insecure-requests` and HSTS only when `NODE_ENV=production`), `cors` (same-origin unless `CORS_ORIGINS`), `express.json({ limit: "100kb" })` (413 `PAYLOAD_TOO_LARGE`), pino, static, health routes, then `globalLimiter` on `/api/v1`. Limiters live in `middleware/rateLimit.js` and all answer 429 `RATE_LIMITED` in the standard shape: global 300 per 15 min per IP, `authLimiter` 10 per 15 min per IP (login and signup share one bucket), `contactLimiter` 5 per hour per IP and portfolio. Limiters are skipped when `NODE_ENV=test`. Counters are in memory (reset on restart; fine for one instance, revisit in Phase 10).
- **Mailer (0.7):** sender comes from `RESEND_FROM` (default `Devfolio <onboarding@resend.dev>`); Resend returns failures in `error` instead of throwing, so the mailer checks both and throws `502 EMAIL_SEND_FAILED` with a generic message (details only in logs).
- All environment access now goes through `config/env.js` (`import { env } from "../config/env.js"`). Do not read `process.env` elsewhere. (Exception: `prisma.config.ts` is the Prisma CLI config and still reads `process.env.DATABASE_URL` directly on purpose.)
- `app.js` exports the Express app (no `listen`); `server.js` only calls `listen`.
- Prisma 7: `migrate dev` does not auto-run `generate`, so run `npx prisma generate` after installing.

**Backend layout:**
```
backend/
  app.js                    # builds Express app: middleware, static, /health + /healthz, /api/v1 routers, page routes, 404, errorHandler
  server.js                 # imports app, listens on env.PORT
  modules/<name>/           # <name>.routes.js + <name>.controller.js + <name>.schema.js (zod schemas; messages and onboarding included)
                            # names: auth, profile, skills, projects, onboarding, share, messages
  config/                   # env.js (zod-validated env, exits on error), constants.js (APP_NAME),
                            # prisma.js, logger.js (pino-pretty only when NODE_ENV != production)
  middleware/               # auth.middleware.js (Bearer JWT, throws AppError), validate.js (validate(schema), zodFields),
                            # error.middleware.js (errorHandler + notFoundHandler, standard error shape)
  utils/                    # AppError.js, prismaErrors.js (isUniqueViolation), publicPortfolio.js (public select), validators.js, mailer.js (Resend, from "Portfolio Contact <onboarding@resend.dev>", renamed in 0.7)
  prisma/                   # schema.prisma + 6 migrations (0.5 added lowercase_identities and skill_project_created_at_unique_skills)
  eslint.config.js, .prettierrc, .prettierignore, .env.example
  .env                      # NOT to be uploaded (contains secrets)
README.md                   # at repo root
```

**Frontend layout:**
```
frontend/
  index.html                # landing (title "Devfolio"), "Get started" -> /pages/auth.html
  pages/                    # auth (title "Log in | Devfolio"), onboarding, edit, portfolio (.html)
  js/                       # config (API_BASE_URL="", API_PREFIX="/api/v1"), api (apiFetch -> { ok, status, data, error }),
                            # forms (showFieldErrors, setFieldError, clearFieldErrors, errorText), authGuard, auth,
                            # onboarding, edit, portfolio, script (nav/scroll-reveal), skillStyles
  css/                      # global, auth, onboarding, edit
```

**Scripts (run in `backend/`):** `dev`, `start`, `smoke` (0.8, checks a running server), `lint`, `lint:fix`, `format`, `format:check`. Lint and format scripts `cd ..` first so they cover `backend/` and `frontend/` together; configs live in `backend/`.

**Current data model:** `User` (email, username, passwordHash, onboardingComplete, shareToken?, createdAt) -> one `Profile` (displayName, aboutText, heroRoleTexts[], contactEmail, contactPhone, githubUrl), many `Skill` (name enum-limited to 16 presets, icon?, level great/good/learning), many `Project` (title, description, repoUrl, liveUrl, tags[]). Cascade deletes. `Skill` and `Project` have `createdAt` (0.5). `Skill` has a unique `(userId, lower(name))` index. Note: `other` is one of the 16 skill presets, so a user can have only one `other` skill until custom skills arrive in Phase 2.

**Current API (all under `/api/v1`; paths below are relative to it):**
`GET /healthz` (outside the prefix, with DB ping; `/health` kept as alias), `POST auth/signup`, `POST auth/login`, `POST onboarding`, `GET|PATCH profile`, `GET portfolio/:username` (public since 0.6), `GET|POST skills`, `PATCH|DELETE skills/:id`, `GET|POST projects`, `PATCH|DELETE projects/:id`, `POST|GET|DELETE share`, `GET portfolio/share/:token`, `POST portfolio/:username/message`, `POST portfolio/share/:token/message`. (The unused `auth/onboarding/complete` route was removed in 0.1.)

**Page routes in `app.js`:** static files, `/health`, `/healthz`, API routers (`/api/v1`), then `/onboarding`, `/edit`, `/share/:token`, `/:username` (catch-all that serves `portfolio.html`), then a 404 handler and the error handler.

**Auth today:** login returns a JWT (7 days); the frontend stores `token` and `user` in `localStorage`; `apiFetch` adds the `Authorization: Bearer` header, always resolves to `{ ok, status, data, error }` (never throws, network failures give `NETWORK_ERROR`), accepts `skipAuthRedirect` (used by login and signup), and on any other 401 clears storage and redirects to `/pages/auth.html`. (Replaced by cookies in Phase 1. Do not change it in Phase 0.)

---

## 5. Known problems (the Phase 0 backlog)

| # | Problem | Fixed in |
|---|---|---|
| 1 | Secrets (`.env`) were shared in a zip, so they must be rotated | 0.1 (user action, **pending user confirmation**) |
| 2 | No env validation, no `.env.example`, server and app not split, no linter, dead code (`models/`, unused endpoint) | 0.1 **(implemented, awaiting verification)** |
| 3 | Flat structure, unversioned API | 0.2 **(implemented, awaiting verification)** |
| 4 | Inconsistent errors; flattened zod object shows "[object Object]" in the UI | 0.3 **(implemented, awaiting verification)** |
| 5 | URL fields accept `javascript:`; phone is free text; no max lengths; optional fields cannot be cleared (`undefined` is dropped from JSON) | 0.4 **(implemented, awaiting verification)** |
| 6 | Email and username case-sensitive; reserved usernames collide with routes; duplicate skills allowed; onboarding resubmit duplicates data; list order unstable | 0.5 **(done)** |
| 7 | Public portfolio route requires login; stored XSS via unescaped `githubUrl`, `repoUrl`, `liveUrl`, `contactPhone`; dead `#` buttons and empty sections render | 0.6 **(done)** |
| 8 | No security headers or rate limits; mail sender hardcoded | 0.7 **(done)** |
| 9 | No end-to-end verification or docs | 0.8 **(implemented, awaiting verification)** |

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

- **D12** **Git: one branch per phase** (`phase-N-name`), one commit per subphase, merge to `main` when the whole phase is verified (see "Git conventions" in section 1b). Decided in Session 3b; the original per-subphase branches idea was dropped, and `phase-0.1-hygiene` is renamed to `phase-0-foundation`.

**Phase 0 specific decisions**
- Onboarding resubmission is **rejected with 409** (not replaced). The wizard replaces it in Phase 3.
- Usernames: lowercase `a-z 0-9 -`, 3 to 30 characters, no leading or trailing dash, reserved names blocked.
- Empty optional fields are normalized to `null`.

**Decisions made in 0.1**
- `JWT_SECRET` must be at least 32 characters (enforced at startup). `PORT` defaults to 5000; `NODE_ENV` defaults to `development`. `RESEND_API_KEY` stays required. New optional vars in 0.7: `RESEND_FROM`, `TRUST_PROXY` (number of proxy hops or `false`; `true` is rejected), `CORS_ORIGINS`.
- `APP_NAME = "Devfolio"` lives in `config/constants.js` (0.5 adds the reserved-username list there).
- Prettier is **configured but not applied**: running it now would reformat every file (`format:check` reports about 37 files). Apply once, in its own commit on the phase branch (`style: format with prettier`), at a clean point between subphases, so later diffs stay readable.
- ESLint rule `no-unused-vars` is set with `args: none` (Express error handlers need unused `next`) and `caughtErrors: none` (existing `catch (err)` blocks left unchanged to avoid behavior edits).
- README lives at the repo root; setup instructions run `npx prisma migrate dev` then `npx prisma generate`.

---

## 7. Status tracker

Mark `[x]` when **all** success criteria of that item are verified by the user. `[~]` means implemented but not yet verified.

### Phase 0: Foundation, cleanup and critical fixes
- [~] **0.1** Hygiene and bootstrap: committed on `phase-0-foundation` (renamed from `phase-0.1-hygiene`); user verification not yet confirmed
- [~] 0.2 Restructure and API versioning: **implemented, awaiting user verification** (see section 8a)
- [~] 0.3 Error contract: **implemented, awaiting user verification** (see section 8a)
- [~] 0.4 Input validation and clearable fields: **implemented, awaiting user verification** (see section 8a)
- [x] 0.5 Data integrity: verified by the user
- [x] 0.6 Public access and XSS fixes: verified by the user
- [x] 0.7 Security middleware: verified by the user
- [~] 0.8 Verification and docs: **implemented, awaiting user verification** (see section 8a)

### Phases 1 to 10
- [ ] Phase 1  ← **NEXT** (after Phase 0 is merged) · [ ] Phase 2 · [ ] Phase 3 · [ ] Phase 4 · [ ] Phase 5
- [ ] Phase 6 · [ ] Phase 7 · [ ] Phase 8 · [ ] Phase 9 · [ ] Phase 10

---

## 8. NEXT TASK

### 8a. First: finish Phase 0

Apply `devfolio-0.8-changes.zip` over the repo root. No new dependencies, no migrations. Then in `backend/` run `npm pkg set scripts.smoke="node scripts/smoke.js"` (adds the `smoke` script to your own `package.json`; commit it). Also run `npm audit fix` (see the audit note in the Session 7 log; it is non-breaking) and commit the lock file separately if it changes.

**0.8 checks**
- [ ] `npm run lint` passes and `npm run smoke` (server running, `SMOKE_USERNAME=<your username>` set) ends with "All checks passed."
- [ ] README setup works from a clean clone with only `.env.example` (boots, `npx prisma migrate dev`, `npx prisma generate`).
- [ ] `git ls-files | grep .env` lists only `backend/.env.example`; secrets (JWT secret, Resend key, database password) have been **rotated**.
- [ ] **Regression walkthrough passes** (browser, normal and private window):
  1. Sign up (`Test@Mail.com`, valid username), then log in with `test@mail.com`.
  2. Onboarding with 2 skills and 1 project; a second submit is refused.
  3. View your portfolio logged in (owner controls visible) and in a private window (no controls, no redirect).
  4. Edit profile; clear an optional field and reload (stays empty).
  5. Skills: add, change level, delete; adding a duplicate shows a message.
  6. Projects: add, edit, delete; a project without URLs shows no buttons.
  7. Share link: create, open in a private window, regenerate (old link dies), revoke.
  8. Contact form sends an email; bad input shows field errors.
  9. Log out; protected pages send you to login.
  10. Paste `"><img src=x onerror=alert(1)>` into name, about, role, project title, description and tags: it shows as plain text on the portfolio, share page and edit page.
- [ ] No CSP violations in the browser console on all pages.

When everything passes, **close Phase 0** (these steps replace the usual per-subphase merge rule):

```bash
git checkout main
git pull
git merge --no-ff phase-0-foundation -m "merge: phase 0 foundation"
git tag phase-0-complete
git push && git push --tags
git checkout -b phase-1-accounts
```

Optional, as its own commit before the merge (it reformats every file): `cd backend && npm run format`, then `git add -A` and `git commit -m "style: format with prettier"`.

Tick `[x]` for 0.1 to 0.8 and Phase 0 in section 7 after the walkthrough.

### 8b. Then: Phase 1: Accounts and secure sessions

**Goal:** a complete, secure account system: signup through recovery and deletion.

### Tasks

**Sessions**
- Replace the 7-day JWT in `localStorage` with an **httpOnly, Secure, SameSite=Lax** access cookie (about 15 minutes) and a **rotating refresh token** (about 30 days) stored hashed in `Session`.
- Add `POST /auth/refresh`, `POST /auth/logout` (revokes the session) and `GET /auth/me`.
- The frontend API client silently refreshes once on a 401 and retries, then redirects to login only if the refresh fails.
- Add Origin/CSRF protection for state-changing requests (SameSite plus an Origin header check).
- Auth middleware also supports page requests, so the server can redirect based on the session.

**Signup and login UX**
- Separate `/signup` and `/login` pages, with signup as the default for new visitors coming from "Get started".
- Live **username availability** check (debounced).
- Show/hide password toggle, a password strength hint and a confirm-password field.
- Field-level inline errors from the standard error shape.
- Generic login failure messages (no account enumeration) and login attempt rate limiting.

**Email verification**
- On signup, send a verification email with a single-use token (hashed in DB, 24-hour expiry).
- `/verify-email` page consumes the token. A resend button is rate limited.
- Unverified users can log in and edit, but **cannot publish** until verified (enforced in Phase 4).

**Password reset**
- `/forgot-password` accepts an email and always replies with the same message.
- `/reset-password` consumes the token, sets a new password and **revokes all sessions**.

**Account settings** (backend now, UI in Phase 3)
- Change email (re-verification), username (checked against reserved list and uniqueness, with old-URL behavior documented) and password (requires current password).
- **Delete account**: requires password, soft-deletes immediately, hard-deletes all data after a grace window by cron, and revokes all sessions.

### Success criteria

- [ ] No token appears in `localStorage`, and cookies are `HttpOnly`.
- [ ] After the 15-minute access expiry, a user mid-session continues without being logged out.
- [ ] Logging out on one device invalidates that session's refresh token server-side.
- [ ] Signup shows live username availability and per-field errors.
- [ ] Verification email arrives, the link works once, and an expired or reused link shows a helpful message.
- [ ] Forgot-password gives an identical response for existing and non-existing emails.
- [ ] Completing a password reset logs out all other sessions.
- [ ] Changing password requires the current password.
- [ ] Deleting an account removes access immediately and all rows after the grace window (verified in DB).
- [ ] Auth endpoints are rate limited and covered by automated tests (happy path plus at least 3 failure paths each).

**Phase 1 starts like every phase: split it into subphases (a `PHASE_1_PLAN.md`, about 6 to 8 steps), send a brief, and wait for approval.** Read section 12 first.

---

## 9. How this file is updated

(Every update to this file also follows rule 12: the delivery reply ends with the command block.)

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
- `npm run format:check` reports about 37 files; apply `npm run format` in its own commit on the phase branch.
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

### Session 3: Subphases 0.3 + 0.4 (batch) (2026-10-12)
Result: **implemented; awaiting user verification** (DB-backed flows and browser UI were not testable in the sandbox)

**0.3 Error contract**
Files created: `backend/utils/AppError.js`, `backend/middleware/validate.js`, `backend/modules/<auth|profile|skills|projects|onboarding|messages>/<name>.schema.js` (schemas moved out of controllers unchanged), `frontend/js/forms.js`
Files changed: `backend/app.js` (notFoundHandler), `backend/middleware/error.middleware.js`, `backend/middleware/auth.middleware.js`, all 7 controllers and routes (use `validate(schema)` and `throw AppError`), `frontend/js/api.js`, `auth.js`, `onboarding.js`, `edit.js`, `portfolio.js`, `frontend/css/global.css` (`.field-error`)
Files deleted: `backend/utils/catchAsync.js`
New env vars / commands: none
Sandbox checks: `node --check` and lint clean; app booted with a stubbed Prisma client and all standard-shape cases returned correctly: bad signup (field error on `username`), wrong login 401 `INVALID_CREDENTIALS`, missing/invalid token 401, 404 portfolio / share / contact, unknown `/api/v1/...` route 404 `ROUTE_NOT_FOUND`, malformed JSON 400 `INVALID_JSON`, forced server error 500 with a generic message (the thrown message did not leak), onboarding nested field keys (`skills.0.name`). Browser behavior of the frontend was not tested here.
Decisions made (and why): `<name>.schema.js` per module (needed by `validate`); `catchAsync` removed (Express 5); `apiFetch` returns `{ ok, status, data, error }` and never throws; `skipAuthRedirect` option added so login and signup 401s show a message; nested onboarding errors map to rows via `resolveNested`; the 401 redirect behavior for other calls is unchanged (0.6 will exempt public pages).

**0.4 Input validation**
Files created: `backend/utils/validators.js`
Files changed: all `<name>.schema.js` files now use the shared validators; `frontend/js/edit.js` and `onboarding.js` (send `null` for emptied optional fields, tags filtered for blanks, `escapeAttr` now escapes `& < > " '`, skill label escaped)
New env vars / commands: none
Sandbox checks: lint clean; over HTTP with a stubbed Prisma client: `javascript:`, `data:` and `ftp:` rejected for `githubUrl`, `repoUrl` and `liveUrl` (field errors); phone `"><script>` rejected; clearing contact email, phone, GitHub URL and project description, repo, live URL, tags reaches Prisma as `null` / `[]`; over-length name, about and description rejected; bad skill rejected; onboarding row errors reported as `projects.0.title` and `projects.0.repoUrl`. Persistence after reload needs a real DB (user to verify).
Decisions made (and why): `""` and whitespace-only become `null`, omitted keys are left unchanged; profile `displayName` and `aboutText` stay required (cannot be cleared) since the editor marks them required; limits: display name 80, about 2000, role phrase 60 (max 5), email 254, URL 300, project title 100, description 1000, tag 30 (max 10 per project), 20 projects and 16 skills in onboarding, contact name 100, contact message 2000, password 8 to 128; `http:` and `https:` are the only allowed URL schemes; phone is 7 to 20 characters of digits, spaces, `+ - ( )`.
Leftovers / TODOs for later:
- Zod default messages are used for `email` shape errors only where not customized; add more friendly messages as schemas grow.
- `GET /api/v1/portfolio/:username` still requires auth (0.6). `apiFetch` still redirects to login on any non-login 401, which is why 0.6 must exempt public calls.
- Mailer sender still says "Portfolio Contact" (0.7). Prettier still not applied (separate `style:` commit).
- Signup username limit is still 3 to 20 characters (0.5 changes the rules to 3 to 30 lowercase with reserved names).
Must not break: every API error uses the standard shape; controllers never build error JSON by hand; all validation goes through `validate(schema)`; frontend API calls go through `apiFetch`; `app.js` importable without starting a server; env access via `config/env.js`.

### Session 3b: Git workflow change (2026-10-12)
Result: completed (docs only, no code changed)
Files changed: `docs/HANDOFF.md` (git conventions, workflow step 5, D12, tracker, section 8a), `docs/PHASE_0_PLAN.md`, `docs/BUILD_PLAN.md`
Decisions made (and why): branches are per **phase**, not per subphase: fewer branches to manage, subphases are already small verified commits, and `main` only receives a fully verified phase. `phase-0.1-hygiene` is renamed to `phase-0-foundation` (`git branch -m`, which keeps all commits). The remote branch `phase-0.1-hygiene` is replaced by `phase-0-foundation`.
User action: run the rename and push commands given in the chat, then check `git branch -a` shows only `main` and `phase-0-foundation`.
Must not break: all later subphase work goes on the phase branch; nothing is merged to `main` until the phase is complete.

### Session 3c: Command-block rule (2026-10-12)
Result: completed (docs only, no code changed)
Files changed: `docs/HANDOFF.md` (rule 12 in section 1, workflow step 4(d), this log entry)
Decisions made (and why): the user wants ready-to-run commands at the end of each subphase (staging, committing, removals, additions and setup) instead of only a suggested commit message, to avoid mistakes when applying zips (for example, when two cumulative zips are unzipped together).
Must not break: every delivery ends with the "Apply and commit" block described in rule 12.

### Session 4: Subphase 0.5, Data integrity (2026-10-12)
Result: **implemented; awaiting user verification** (migrations and DB flows could not run in the sandbox)
Files created: `backend/utils/prismaErrors.js`, `backend/prisma/migrations/20261012100000_lowercase_identities/migration.sql`, `backend/prisma/migrations/20261012100100_skill_project_created_at_unique_skills/migration.sql`
Files changed: `backend/prisma/schema.prisma` (`createdAt` on Skill and Project), `backend/config/constants.js` (`RESERVED_USERNAMES`), `backend/utils/validators.js` (`identityEmail`), `backend/modules/auth/auth.schema.js` and `auth.controller.js`, `skills.controller.js`, `onboarding.controller.js` and `onboarding.schema.js`, `projects.controller.js`, `profile.controller.js`, `share.controller.js`, `messages.controller.js`, `frontend/pages/auth.html`, `frontend/css/global.css` (`.field-hint`), `docs/HANDOFF.md`
Files deleted: none
New env vars / commands: none; run `npx prisma migrate dev` and `npx prisma generate` in `backend/` (back up the dev DB first)
Sandbox checks passed: lint clean; schema tests (`edit`, `Dashboard`, `a b`, `ab`, `-bob`, `bob-`, 31 characters rejected; `Bob-1` accepted as `bob-1`; `ALI@x.com` lowercased on login); duplicate skill names in onboarding give `skills.1.name`; with a stubbed Prisma client: second onboarding returns 409 `ALREADY_ONBOARDED`, duplicate skill 409 `SKILL_EXISTS`, signup unique-violation race 409 `USER_EXISTS`, list queries ordered by `createdAt, id`. Not run: the migrations themselves.
Decisions made (and why): lowercasing happens in the zod schemas so every consumer sees normalized values; migration 1 aborts on email or username collisions with a readable message; duplicate skills keep the oldest (ties by smallest `id`, because old rows all get the same `createdAt`); the unique index is raw SQL because Prisma cannot express `lower(name)`; controllers pre-check and also map `P2002` for races; onboarding claims the flag atomically with `updateMany` inside an interactive transaction; reserved list extended beyond the plan (`logout`, `register`, `uploads`, `static`, `assets`, `account`, `auth`, `portfolio`, and similar); the username HTML `pattern` allows uppercase letters because the server lowercases them.
Leftovers / TODOs for later:
- Existing users whose usernames break the new rules (spaces, underscores, reserved words) are not changed by the migration; they keep working but cannot be recreated. Check dev data by hand.
- `other` is a skill preset, so only one `other` skill per user until Phase 2 custom skills.
- A second onboarding submit only shows the generic error text in the UI; the wizard replaces it in Phase 3.
Must not break: identities are lowercase everywhere; list queries keep `orderBy createdAt, id`; skills unique per user; all earlier rules.

### Session 5: Subphase 0.6, Public access and XSS fixes (2026-10-12)
Result: **implemented; awaiting user verification** (browser behavior was tested only with jsdom and a stubbed Prisma client)
Files created: `backend/utils/publicPortfolio.js`
Files changed: `backend/modules/profile/profile.routes.js` (no `requireAuth` on the public read), `profile.controller.js` and `share.controller.js` (use `PUBLIC_PORTFOLIO_SELECT`), `frontend/js/api.js` (`anonymous` option), `frontend/js/portfolio.js` (DOM-built rendering, `safeHref`, empty states, anonymous calls, share URL set via `.value`), `docs/HANDOFF.md`
Files deleted: none
New env vars / commands: none
Sandbox checks passed: lint clean; with a stubbed Prisma client the public route returns 200 with no token and with a garbage `Authorization` header, 404 `USER_NOT_FOUND` for unknown users, and the select contains only public fields; jsdom render of `portfolio.js` with hostile data: no token sent, zero injected `img`, `svg` or `script` nodes, `javascript:` URLs dropped, no `#` links, empty sections hidden, titles and tags rendered as text; `safeHref` rejects `javascript:`, `data:`, `//evil.com`, `#` and empty values.
Decisions made (and why): the public select is one shared constant so share and username views cannot drift; `anonymous` option on `apiFetch` (never sends the token, never redirects) is used for public GET and the contact form; `contactEmail` stays public by design (it is what the Email button uses); `edit.js` and `onboarding.js` reviewed: stored values already go through `escapeAttr` and `escapeHtml`, and the remaining interpolations are constants or server ids, so no change was needed; the contact section always shows because it holds the form.
Leftovers / TODOs for later:
- Users who have not finished onboarding still get a (mostly empty) public page; consider a 404 in Phase 3 or 5.
- The page title still ends in "Portfolio" (`portfolio.js`); switch to the app name when the SSR page arrives (Phase 5).
- Owner controls still depend on `localStorage.user` (replaced by cookies in Phase 1).
Must not break: public reads need no login; public API fields stay limited to `PUBLIC_PORTFOLIO_SELECT`; `portfolio.js` never uses `innerHTML` with stored values; public calls use `anonymous: true`.

### Session 6: Subphase 0.7, Security middleware (2026-10-12)
Result: **implemented; awaiting user verification** (browser CSP behavior and real Resend delivery could not be tested in the sandbox)
Files created: `backend/middleware/rateLimit.js`
Files changed: `backend/app.js`, `backend/config/env.js`, `backend/utils/mailer.js`, `backend/modules/auth/auth.routes.js`, `backend/modules/messages/messages.routes.js`, `backend/.env.example`, `frontend/js/api.js` (429 fallback message), `README.md`, `docs/HANDOFF.md`
Files deleted: none
New env vars / commands: `RESEND_FROM`, `TRUST_PROXY`, `CORS_ORIGINS` (all optional); new dependencies `helmet` and `express-rate-limit` (`npm install helmet express-rate-limit` in `backend/`; `package.json` and the lock file are updated by that command, not shipped in the zip, so they match your local lock)
Sandbox checks passed: lint clean; headers on a page response (CSP with the planned sources, nosniff, no `x-powered-by`, HSTS and `upgrade-insecure-requests` in production); 10th login 401 and 11th 429 `RATE_LIMITED` with `Retry-After`, signup shares the bucket; body over 100 KB gives 413 `PAYLOAD_TOO_LARGE`; contact: 6th message to the same portfolio 429 while another portfolio is still allowed; Resend failure (no network) returns 502 `EMAIL_SEND_FAILED` with a generic message; env validation rejects a bad `RESEND_FROM`, `TRUST_PROXY=true` and bad `CORS_ORIGINS`, defaults are correct.
Decisions made (and why): CSP keeps `style-src 'unsafe-inline'` (many inline `style=""` attributes in HTML and JS-built markup; moving them is not small; marked TODO for Phase 10) while scripts stay `'self'` only; `upgrade-insecure-requests` and HSTS only in production so plain-http local dev keeps working; the global limiter covers `/api/v1` only (static files and health checks are not counted); contact limiter counts every attempt, valid or not, per IP and portfolio; `TRUST_PROXY=true` is rejected because trusting every proxy lets clients spoof IPs; Resend's `{ error }` result is treated as failure (before, a failed send still returned success); limiters skip `NODE_ENV=test` for future tests; in-memory counters are acceptable for one instance.
Leftovers / TODOs for later:
- Tighten the CSP (remove `'unsafe-inline'` styles) in Phase 10; consider self-hosting fonts and icons.
- Rate-limit counters reset on restart and are per instance; use a shared store if the app ever runs multiple instances.
- Resend's test sender only delivers to your own Resend account email until a domain is verified (Phase 6).
- `x-frame-options` is `SAMEORIGIN` from helmet alongside `frame-ancestors 'none'` (CSP wins in modern browsers).
Must not break: all new env vars go through `config/env.js`; every 429 uses the standard error shape; the mailer never returns success on a failed send; limiter middleware stays before `validate` on public write routes.

### Session 7: Subphase 0.8, Verification and docs (2026-10-12)
Result: **implemented; awaiting user verification** (the browser walkthrough and database flows need your machine)
Files created: `backend/scripts/smoke.js`
Files changed: `README.md` (scripts, structure, API table, error codes, usernames and reserved list, notes), `docs/HANDOFF.md` (this file: status, section 8, section 12). No application code changed, so no bugs were found that needed fixing.
Files deleted: none
New env vars / commands: `npm run smoke` (add with `npm pkg set scripts.smoke="node scripts/smoke.js"`; optional `SMOKE_URL`, `SMOKE_USERNAME`)
Sandbox checks passed: lint clean; `smoke.js` against a stubbed-DB server: 6 of 6 checks pass (healthz, public portfolio with no private fields, unknown user 404, unknown route 404, validation error with `fields`, security headers), and the portfolio check is skipped when `SMOKE_USERNAME` is unset; `.env` is ignored and not tracked (only `.env.example`); every key in `config/env.js` is present in `.env.example`.

**XSS payload pass** (payload `"><img src=x onerror=alert(1)>` and variants; jsdom with a stubbed API)
| Field | Server | Rendering |
|---|---|---|
| displayName, aboutText, hero roles | accepted as text | public page: text only; edit form: value intact, nothing injected |
| project title, description, tags | accepted as text | public page: text only; edit form: intact |
| skill name | enum only | n/a |
| contactEmail, contactPhone | rejected | n/a |
| githubUrl, repoUrl, liveUrl (`javascript:`, `data:`) | rejected | `safeHref` would also drop them |
| username | rejected | n/a |
| contact form name, message | accepted as text | plain-text email, never rendered as HTML |
Result: 0 injected `img`, `svg` or `script` nodes and 0 inline event handlers in the public and edit pages. Onboarding and auth pages render no stored data. Real-browser confirmation is part of the walkthrough in 8a.

**npm audit** (`npm audit` on the lock file from the uploaded project): 12 findings. `npm audit fix` (non-breaking) clears the critical one (`proxy-addr`, via Express), the moderate ones (`qs`, `fast-copy`) and 3 highs (`fast-uri`, `brace-expansion`). 7 highs remain, all **dev-only tooling**: `prisma` CLI chain (`@prisma/config`, `deepmerge-ts`, `mysql2`) and `nodemon` chain (`braces`, `chokidar`). Audit's suggested "fixes" are major downgrades (`prisma@6`, `nodemon@1`), so they are **not applied**. They do not ship in production (`npm ci --omit=dev`). Revisit in Phase 10.
Decisions made (and why): the XSS pass and audit are recorded here instead of new docs; the smoke script uses plain `fetch` and exits non-zero on failure; the validation check uses `POST auth/login` and counts as one attempt of the auth rate limit; Prettier is left as an optional separate `style:` commit before the merge.
Leftovers / TODOs for later:
- Verify with the walkthrough, then merge Phase 0 (see 8a).
- Prettier still not applied (`npm run format:check` lists many files).
- Dev-only audit findings above; rate-limit counters are in memory; CSP still allows `'unsafe-inline'` styles (Phase 10).
- Public page for users who skipped onboarding is still mostly empty (Phase 3 or 5).
Must not break: see section 12.

*(Add Session 8 and onward below this line.)*

---

## 11. Starting message to paste into the new chat

> I'm building **Devfolio**, a developer portfolio platform, following the attached plan. I'm on a **free Claude plan, so be very economical with tokens**. Read `HANDOFF.md` (attached) first, and follow its rules in section 1 and the workflow in section 1b. Work on the **NEXT TASK in section 8** only. **Send me a brief first and wait for my approval before changing anything.** Attached: `HANDOFF.md` and my project zip (without `.env` and `node_modules`). When done, send me a zip of the changed files only, the updated `HANDOFF.md`, and a suggested commit message.

---

## 12. Phase 0 summary (carry into Phase 1)

**Final backend tree**
```
backend/
  app.js  server.js  eslint.config.js  .prettierrc  .env.example  prisma.config.ts
  config/       env.js (all env access) constants.js (APP_NAME, RESERVED_USERNAMES) prisma.js logger.js
  middleware/   auth.middleware.js  validate.js  rateLimit.js  error.middleware.js
  modules/<n>/  <n>.routes.js  <n>.controller.js  <n>.schema.js   (auth profile skills projects onboarding share messages)
  utils/        AppError.js  validators.js  publicPortfolio.js  prismaErrors.js  mailer.js
  scripts/      smoke.js
  prisma/       schema.prisma  migrations/ (6)
frontend/       index.html  pages/ (auth onboarding edit portfolio)  js/ (config api forms authGuard auth onboarding edit portfolio script skillStyles)  css/
docs/           HANDOFF.md  BUILD_PLAN.md  PHASE_0_PLAN.md
```

**Conventions (do not break)**
- **Errors:** controllers `throw` helpers from `utils/AppError.js`; the only error shape is `{ error: { code, message, fields? } }`; never build error JSON by hand. Express 5 forwards async errors, so no `try/catch` unless mapping something (for example `isUniqueViolation`).
- **Validation:** zod schema in `<n>.schema.js`, built from `utils/validators.js` pieces, applied with `validate(schema)` in the route; controllers read already-valid `req.body`. Optional fields: `""` and `null` clear them, an omitted key means unchanged.
- **Env:** only through `config/env.js`; add a key there, to `.env.example` and to the README table together.
- **Identities:** email and username are lowercase everywhere (normalized in schemas, params lowercased on lookup).
- **Lists:** every list query orders by `createdAt, id`; public reads use `PUBLIC_PORTFOLIO_SELECT` (add public fields only there).
- **Frontend:** API calls only through `apiFetch` (`API_PREFIX`; `anonymous: true` for public pages); never `innerHTML` with stored values (use `textContent` or `escapeAttr`/`escapeHtml`); links through `safeHref`/`makeLink`.
- **Security:** limiters in `middleware/rateLimit.js` come before `validate`; every new public write endpoint needs a limiter; any new external host needs a CSP entry in `app.js`.
- **Git:** one branch per phase (`phase-N-name`), one commit per subphase (`type(N.X): summary`), merge `--no-ff` and tag `phase-N-complete` when the phase is verified.

**How to add a route:** (1) schema in `modules/<n>/<n>.schema.js`; (2) controller function that throws `AppError`s; (3) route in `<n>.routes.js` with `requireAuth`, a limiter if public, then `validate(schema)`; (4) mounted under `/api/v1` in `app.js` if it is a new module; (5) update README API table and this file; (6) add a smoke check if it is a key endpoint.

**Known debt carried forward:** Phase 1 replaces `localStorage` JWT with cookies (the `apiFetch` 401 redirect and `authGuard.js` change with it); CSP `'unsafe-inline'` styles; in-memory rate limits; dev-only audit findings; Prettier not applied; `other` is a single skill preset until Phase 2.

