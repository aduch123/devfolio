# HANDOFF: Devfolio Build

> **Read this first.** This file is the single source of truth for where the project stands. It is written for a fresh Claude chat with no memory of earlier sessions. Keep it updated at the end of every session (see section 9).

**Project name:** **Devfolio** (repo name `devfolio`)
**Last updated:** 2026-10-13 (Session 19: 3.3 verified clean by the user; 3.4 wizard UI implemented, awaiting verification)
**Current position:** Phases 0 to 2 are merged and tagged. On **Phase 3** (branch `phase-3-dashboard`): 3.1 and 3.2 are committed; **3.3 (wizard backend) is verified clean** (`npm test` all green after `npm run migrate:test`); **3.4 (wizard UI) is implemented, awaiting user verification**. Next: verify and commit 3.4, then 3.5 (tests, Prettier commit, merge `--no-ff`, tag `phase-3-complete`).
**Code changes made so far:** Phase 0 complete (0.1 to 0.8). Phase 1: 1.1 to 1.7. Phase 2: 2.1 to 2.5. Phase 3: 3.1 and 3.2 (Session 17), 3.3 (Session 18), 3.4 (Session 19).

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
| `PHASE_3_PLAN.md` | Phase 3 split into 5 subphases (3.1 to 3.5) with tasks, success criteria and the approved decisions | Starting a **new Phase 3 subphase** (paste only that row) |
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

## 4. Current codebase (after subphase 1.2)

**Stack:** Node (ES modules, `"type": "module"`), **Express 5**, **Prisma 7** with PostgreSQL via `@prisma/adapter-pg` (datasource URL is set in `prisma.config.ts`, not in `schema.prisma`), JWT access tokens (`jsonwebtoken`) in httpOnly cookies via `cookie-parser`, `bcrypt`, `zod` v4, `pino` and `pino-http`, `resend` for email, `helmet`, `express-rate-limit` (0.7), `cors`, `nodemon` in dev. Dev tooling: ESLint 10 (flat config) and Prettier 3. Frontend: **vanilla HTML, CSS and JS** (ES modules), served by Express as static files. No build step, no tests.

**Notes on the stack that matter:**
- Express 5 forwards rejected promises from async handlers (and errors thrown in sync middleware) to the error middleware automatically. `catchAsync` was removed in 0.3: controllers and routes are plain `async` functions that `throw` an `AppError`.
- **Error contract (0.3):** every API error is `{ "error": { "code", "message", "fields?" } }`. Throw helpers from `utils/AppError.js` (`badRequest`, `validationError`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `tooMany`). Request validation is `validate(schema)` middleware in the route (`middleware/validate.js`), which replaces `req.body` with the parsed data, so controllers read `req.body` as already valid. Unknown errors become a generic 500 and are logged only.
- **Validation (0.4):** reusable zod pieces live in `utils/validators.js` (`safeUrl` http/https only, `phone`, `optionalText/Url/Email/Phone` which turn `""` into `null`, `requiredText`, tags and role lists, the single `SKILL_VALUES` list, and `LIMITS`). Optional fields can be cleared by sending `null` or `""`; omitted keys mean "do not change".
- **Data integrity (0.5):** `email` and `username` are lowercased by the zod schemas (`identityEmail` in `utils/validators.js`, `usernameSchema` in `modules/auth/auth.schema.js`), so signup and login always see lowercase. Username lookups from URL params call `.toLowerCase()`. Username rules: 3 to 30, `a-z 0-9 -`, no leading or trailing dash, reserved names in `RESERVED_USERNAMES` (`config/constants.js`). Skills are unique per user, case-insensitive (raw SQL index `Skill_userId_lower_name_key`; controllers pre-check and also map Prisma `P2002` via `utils/prismaErrors.js` to `409 SKILL_EXISTS`). Onboarding returns `409 ALREADY_ONBOARDED` (atomic `updateMany ... onboardingComplete:false` inside an interactive transaction). Every list and public read orders by `createdAt asc, id asc`.
- **Public access (0.6):** `GET /api/v1/portfolio/:username` and `GET /api/v1/portfolio/share/:token` need no login and return only `PUBLIC_PORTFOLIO_SELECT` (`utils/publicPortfolio.js`): `username`, profile (`displayName, aboutText, heroRoleTexts, contactEmail, contactPhone, githubUrl`), skills (`name, icon, level`), projects (`title, description, repoUrl, liveUrl, tags`), ordered by `createdAt, id`. No user id, account email, hash, share token or row ids. `contactEmail` is the owner's chosen public contact address. Add new public fields in that one file.
- **Frontend rendering rule (0.6):** `portfolio.js` builds the page with `createElement` and `textContent` only (helpers `make`, `makeIcon`, `makeLink`, `safeHref` allowing `http`, `https`, `mailto`, `tel`). Never use `innerHTML` with stored values there. Empty links, skills, projects and about are not rendered (section and nav link hidden). `apiFetch(path, { anonymous: true })` sends no token and never redirects to login; use it for every public call (portfolio read, contact form).
- **Security middleware (0.7):** `app.js` order is `trust proxy` (from `TRUST_PROXY`), `helmet` with a CSP (self scripts; styles from self, Google Fonts, cdnjs and `'unsafe-inline'` because of inline `style=""` attributes, to be tightened in Phase 10; fonts from `fonts.gstatic.com` and cdnjs; images self and `data:`; `frame-ancestors 'none'`; `upgrade-insecure-requests` and HSTS only when `NODE_ENV=production`), `cors` (same-origin unless `CORS_ORIGINS`), `express.json({ limit: "100kb" })` (413 `PAYLOAD_TOO_LARGE`), pino, static, health routes, then `globalLimiter` on `/api/v1`. Limiters live in `middleware/rateLimit.js` and all answer 429 `RATE_LIMITED` in the standard shape: global 300 per 15 min per IP, `authLimiter` 10 per 15 min per IP (login and signup share one bucket), `contactLimiter` 5 per hour per IP and portfolio. Limiters are skipped when `NODE_ENV=test`. Counters are in memory (reset on restart; fine for one instance, revisit in Phase 10).
- **Mailer (0.7):** sender comes from `RESEND_FROM` (default `Devfolio <onboarding@resend.dev>`); Resend returns failures in `error` instead of throwing, so the mailer checks both and throws `502 EMAIL_SEND_FAILED` with a generic message (details only in logs).
- **Sessions (1.1 and 1.2):** login creates a `Session` row and sets two cookies, both `HttpOnly`, `SameSite=Lax`, `Secure` only when `NODE_ENV=production`: `dev_access` (JWT `{ id, username, sid }`, 15 min, path `/`) and `dev_refresh` (`<sessionId>.<secret>`, 30 days sliding, path `/api/v1/auth` only). Only `sha256(secret)` is stored (`refreshHash`, plus `prevRefreshHash` and `rotatedAt`). `POST auth/refresh` rotates with a compare-and-swap; the previous token is accepted for 10 s (two tabs refreshing: access cookie only), after that it counts as theft and the session is revoked (`REFRESH_TOKEN_REUSED`). `POST auth/logout` revokes that session and clears cookies; `GET auth/me` returns `{ user: { id, email, username, onboardingComplete, emailVerified } }`. Constants (TTLs, cookie names) are in `config/constants.js`; cookie and token helpers in `utils/session.js`. `requireAuth` (async since 1.6) reads only the access cookie; page routes use `middleware/pages.js` since 3.1 (see "Routing and dashboard"). `middleware/origin.js` refuses state-changing `/api/v1` requests whose `Origin` is another site (`BAD_ORIGIN`, 403; requests with no Origin pass). Auth responses send `Cache-Control: no-store`. Since 1.6, `requireAuth` also checks in the database that the access token's session is live and the account not deleted (`401 SESSION_ENDED`), so logout, reset and deletion take effect at once; expired sessions are purged by the 1.6 cron job.
- **Frontend sessions (1.2):** no token or user object in `localStorage`. `apiFetch` uses `credentials: "same-origin"`; on a 401 it calls `POST auth/refresh` once (shared by parallel requests) and retries the request, and only if that fails clears the hint and goes to `/login`. Options: `skipAuthRedirect` (login and signup: no refresh, no redirect), `noRedirect` (refresh yes, redirect no), `anonymous` (public pages). `authGuard.requireAuth()` is async and returns the user from `/auth/me` (use `const user = await requireAuth()`); it never resolves when it is redirecting. `session.js` keeps a non-secret hint `devfolio_session` in `localStorage` so anonymous visitors of public pages never call session endpoints; the owner controls on a portfolio page check `/auth/me` only when the hint is set.
- **Signup and login UX (1.3):** separate pages `/login` and `/signup` (`frontend/pages/login.html`, `signup.html`; routes in `app.js`; scripts `login.js`, `signup.js`, shared `authUi.js` with password show/hide and the strength hint). `pages/auth.html` and `js/auth.js` are gone; every login redirect (`api.js`, `authGuard.js`, `requirePage`, landing "Get started" -> `/signup`) now targets `/login`. `GET /api/v1/auth/username-available?username=` is public, limited to 30 per minute per IP (`usernameCheckLimiter`) and answers 200 `{ available, reason?, message? }` (`reason`: `invalid`, `reserved`, `taken`); the signup page calls it 400 ms after typing stops and ignores stale answers. Signup success redirects to `/login?registered=1` (notice shown; no auto-login). Confirm-password and the strength meter are client-side only (the server rule stays 8 to 128 characters). Login compares against a dummy bcrypt hash when the email is unknown, so unknown email and wrong password take the same time and give the same `401 INVALID_CREDENTIALS`. Signup keeps the 409 "already in use" answer.
- **Email verification (1.4):** `User.emailVerifiedAt` and a generic `EmailToken` table (`type` `VERIFY_EMAIL` or `PASSWORD_RESET`, unique `tokenHash` = sha256 of a 32-byte random token, `expiresAt`, `usedAt`), reused by 1.5. Helpers in `utils/emailTokens.js`: `createEmailToken(userId, type, ttlMs)` (deletes the user's older unused tokens of that type, returns the raw token) and `consumeEmailToken(raw, type)` (atomic `updateMany ... usedAt: null, expiresAt > now`; throws 400 `TOKEN_USED`, `TOKEN_EXPIRED` or `TOKEN_INVALID`), plus `appUrl()`. Signup creates a token and emails `${APP_URL}/verify-email?token=...` without awaiting it (a failed send is only logged). `POST auth/verify-email { token }` (limiter 20 per 15 min) marks the user verified; the `/verify-email` page reads the token from the URL, removes it from the address bar and posts it, so a link scanner's GET never consumes it. `POST auth/resend-verification { email }` (5 per hour per IP) always answers 202 with the same message; per account it skips sending within 60 s of the last token (`EMAIL_RESEND_COOLDOWN_MS`). TTL is `EMAIL_VERIFY_TTL_MS` (24 h). `GET auth/me` and login now include `emailVerified`. Nothing is gated on verification yet. New env var `APP_URL` (optional, default `http://localhost:PORT`). `verify-email` is a reserved username. Mailer: `deliver()` shared by `sendContactEmail` and `sendVerificationEmail`.
- **Password reset (1.5):** `POST auth/forgot-password { email }` (limiter 5 per hour per IP) always answers 202 with the same text; for an existing account it creates a `PASSWORD_RESET` token (`PASSWORD_RESET_TTL_MS` = 1 h, same 60 s per-account cooldown) and emails `${APP_URL}/reset-password?token=...` without awaiting. `POST auth/reset-password { token, password }` (limiter 20 per 15 min) consumes the token, hashes the new password (8 to 128 characters) and, in one transaction, updates it and revokes every session of the user, then clears cookies. Pages `/forgot-password` and `/reset-password` (token removed from the URL on load); login shows "Forgot password?" and a notice after `?reset=1`. `forgot-password` and `reset-password` are reserved usernames. Verification state is not touched by a reset.
- **Account settings and cleanup (1.6):** new module `modules/account` mounted at `/api/v1/account`, all routes behind `requireAuth` and `accountLimiter` (20 per 15 min): `POST password { currentPassword, newPassword }` (204; revokes every other session, keeps this one; same password gives 400 `SAME_PASSWORD`), `POST email { password, email }` (updates at once, sets `emailVerifiedAt` null, emails a new verification link; 409 `EMAIL_EXISTS`; returns `{ user }`), `POST username { username }` (same schema and reserved list as signup; 409 `USERNAME_EXISTS`; issues a fresh access cookie because the JWT carries the username; the old URL 404s, no redirect), `POST delete { password }` (soft delete: `User.deletedAt`, revokes all sessions, clears cookies, 204). A wrong password is **403** `WRONG_PASSWORD` (not 401, so `apiFetch` does not redirect). Deleted accounts: login gives the generic 401, refresh and `/auth/me` refuse, forgot and resend send nothing, public portfolio, share link and contact form return 404 (`deletedAt: null` in those lookups); their email and username stay reserved until removal. `jobs/cleanup.js` (`node-cron`, started from `server.js` unless `NODE_ENV=test`, daily 03:30 and once 30 s after start) deletes users with `deletedAt` older than `ACCOUNT_DELETE_GRACE_DAYS` (14; cascades), sessions expired or revoked over 7 days ago, and email tokens expired or used over a day ago; `runCleanup()` is exported for tests. There is no settings UI yet (API only).
- **Content model (2.1 and 2.2):** migration `20261013100000_content_model` adds `Profile` (`headline`, `location`, `avatarUrl`, `resumeUrl`, `sectionConfig` JSON; unused until 2.4/2.5), `Skill` (`category` default `other`, `iconKey`, `isCustom`, `sortOrder`), `Project` (`coverImageUrl`, `featured`, `sortOrder`; not used by code until 2.3) and new tables `SocialLink` (`platform`, `url`, `sortOrder`) and `TimelineItem` (`type` EXPERIENCE|EDUCATION, `title`, `organization`, `startDate`, `endDate?`, `description?`, `sortOrder`), all cascade with the user. Existing rows got `sortOrder` by `createdAt, id` and presets got a category. **Skills:** the name is any text up to 40 characters (`skillName` in `utils/validators.js`); a name that equals a preset (any casing) is stored as the lowercase preset value with `isCustom=false`, anything else is custom. `category` is `frontend|backend|database|tools|other` (default from the preset map). `skillDerived(name, category)` computes `isCustom` and `category` on the server. Max 50 skills (`409 SKILL_LIMIT`). New skills go last (`nextSortOrder`). `PUT /skills/order { ids }` (204) uses `utils/reorder.js` `reorderOwned(model, userId, ids, { notFoundCode, label })`, which 2.3 reuses: a foreign id gives 404, a duplicate or incomplete list gives 400 `INVALID_ORDER`, and the write is one transaction. Skill lists and the public select order by `sortOrder, createdAt, id`; the public select now also returns `category` and `isCustom`. Onboarding sets `sortOrder` by array index for skills and projects. The frontend already renders unknown skill names with the generic icon; the editor UI for custom skills comes in Phase 4. Projects still list by `createdAt, id` until 2.3.
- **Content API (2.3):** `projects` (now with `featured`, limit `MAX_FEATURED_PROJECTS`, default 3, `409 FEATURED_LIMIT`; ordered by `sortOrder, createdAt, id`; `PUT /projects/order`), new modules `social` (`platform` from `SOCIAL_PLATFORMS`, `url` via `safeUrl`, max 12, `409 SOCIAL_LIMIT`, `PUT /social/order`) and `timeline` (`type` EXPERIENCE|EDUCATION, dates as `YYYY-MM-DD` stored as midnight UTC, end not before start, `type` cannot be changed, max 30, `GET /timeline?type=`, `PUT /timeline/order { type, ids }`, order is per type). All reorders use `reorderOwned` (foreign id 404, duplicate or incomplete list 400 `INVALID_ORDER`). `PATCH /profile` also accepts `headline` (120) and `location` (80). The public select (`utils/publicPortfolio.js`) now also returns profile `headline, location, avatarUrl, resumeUrl`, project `coverImageUrl, featured`, `socialLinks` and `timelineItems`, all in saved order. New env var `MAX_FEATURED_PROJECTS`. The frontend does not use the new fields yet (Phases 4 and 5).
- **Media (2.4):** `modules/media` (`POST|DELETE /profile/avatar`, `/profile/resume`, `/projects/:id/cover`; multipart field `file`; behind `requireAuth` and `uploadLimiter`, 30 per 15 min). `middleware/upload.js` (multer, memory storage, 2 MB images / 5 MB resumes, `413 FILE_TOO_LARGE`, `400 NO_FILE`). `utils/fileType.js` checks magic bytes (JPEG, PNG, WebP; `%PDF-`), never the name or Content-Type. Images are decoded and re-encoded as WebP with `sharp` (avatar 512x512 cover-crop, cover max 1600x1000, metadata dropped, 40 MP pixel cap); a bad file gives `400 INVALID_FILE`. `config/storage.js` is the storage interface (`save(kind, buffer, ext)` returns `/uploads/<kind>/<random>.<ext>`, `remove(url)` only inside the upload root); `UPLOAD_DIR` (default `backend/uploads`, git-ignored) changes the folder. `app.js` serves `/uploads` with `nosniff`, `Content-Security-Policy: default-src 'none'; sandbox` and immutable caching. Replacing saves the new file, updates the row, then deletes the old file; deleting a project removes its cover; the cleanup job removes the files of purged accounts. New dependencies `multer` and `sharp`. Tests use a temporary upload folder (`tests/setup.js`).
- **Section config (2.5):** `utils/sectionConfig.js` holds `SECTIONS` (`about, skills, projects, experience, education, contact`), the defaults (all visible, order 0 to 5), the zod patch schema (strict: unknown sections or keys are rejected), `resolveSectionConfig` (fills defaults), `mergeSectionConfig` (patch merged into the stored value; two sections on one position give `400 VALIDATION_ERROR` on field `sectionConfig`; `null` resets) and `presentProfile` / `presentPublic` (always return the full config). `PATCH /profile` accepts `sectionConfig`; `GET /profile`, the upload responses, the public portfolio and the share-link portfolio return it complete (the public select includes `profile.sectionConfig`). The stored JSON is always the full merged config. Nothing renders from it yet (Phases 4 and 5).
- **Routing and dashboard (3.1 and 3.2):** `middleware/pages.js` exports `guestPage(file)` (landing, `/login`, `/signup`: a live session redirects to `/dashboard`, or `/onboarding` when unfinished; skipped when the query has `reauth`) and `appPage(file, { onboarding })` (`any` default, `complete`, `incomplete`; no session gives 302 to `/login`, with `?next=` only for `/dashboard...` and `/settings`). Both use `pageUser(req)`: the access cookie is verified with `ignoreExpiration` (`decodeAccessToken` in `utils/session.js`) and the session is confirmed in the DB (live, account not deleted). **Why:** the refresh cookie is limited to path `/api/v1/auth`, so page routes never see it (the old `requirePage` check on it could not work); therefore `setAccessCookie` now keeps the cookie for 30 days (`maxAge` = refresh TTL) while the JWT inside still expires in 15 minutes (API calls still reject an expired token, the client refreshes). Pages are sent with `Cache-Control: no-store`. `/` is routed before `express.static`. Routes: `/dashboard`, `/dashboard/:section` (`portfolio|messages|analytics|health`, else 404), `/settings` (any onboarding state), `/onboarding` (unfinished only), `/edit` (any). Client side: `session.js` has `safeNext()` (allowlist regex `^/(dashboard(/[a-z-]+)?|settings)$`) and `loginUrlForPage()` (`/login?reauth=1&next=...`, used by `api.js` when a refresh fails); `login.js` goes to `/onboarding` for unfinished users, else `next` or `/dashboard`; the old onboarding page now ends at `/dashboard`; the portfolio owner bar has a Dashboard button. **Dashboard shell:** pages `dashboard.html` and `settings.html` (only `<div id="app">`), `js/shell.js` (`mountShell({ user, active, title })`: dark sidebar that becomes a fixed bottom bar under 768 px, top bar with a `Public` badge, View public page link and account menu with Settings and Log out; Log out is also in the sidebar), `js/ui.js` (`make`, `makeIcon`, `toast`, `confirmModal`, `skeleton`, `emptyState`, `errorState`), `js/dashboard.js` (overview cards and per-section placeholders), `js/settings.js` (password, email, username, delete; wrong password shows under the password input), `css/dashboard.css`. Do not use bare `<section>`, `<header>` or `<nav>` in dashboard markup (global.css styles those elements for the portfolio page).
- **Onboarding wizard (3.3 and 3.4):** table `OnboardingDraft` (`userId` unique, `step`, `data` JSON keyed by step number as a string, `skipped` int list; migration `20261013120000_add_onboarding_draft`). `modules/onboarding/onboarding.wizard.js`: `GET /onboarding/state` -> `{ step, data, skipped, complete }`; `PUT /onboarding/step/:n` (n 1 to 5, body `{ data }` or `{ skip: true }`, optional `next` 1 to 6 = the step to resume at, default n+1; zod per step in `onboarding.schema.js` `stepSchemas`; step 1 cannot be skipped; 409 `ALREADY_ONBOARDED` once finished); `POST /onboarding/complete` (one transaction under a row lock: claims `onboardingComplete`, 400 `BASICS_REQUIRED` rolls it back, writes Profile, Skill, Project and SocialLink rows after any existing ones, skips duplicate skills, clears `data` but keeps `skipped`; returns `{ skipped }`). The old `POST /onboarding`, its controller and `onboardingSchema` are gone. **Frontend:** `pages/onboarding.html`, `js/onboarding.js`, `css/onboarding.css` (no innerHTML). Steps 1 to 5 plus review (6); `read(forSave)` per step prunes empty rows so server error keys such as `projects.1.title` match input `name` attributes (`showFieldErrors` finds them by name); Back and progress-bar jumps save quietly and only when something changed (a skipped step stays skipped); "Edit" from review uses `next: 6`; the preview pane is hidden below 1024 px by CSS. `js/dashboard.js` Overview shows a "Finish setting up" box from `skipped` (step numbers 2 to 5). `npm run migrate:test` (`scripts/migrate-test.js`) applies migrations to `DATABASE_URL_TEST` (refuses when it equals `DATABASE_URL`); run it after every new migration, because `migrate dev` only touches the dev database.
- **Tests (1.7):** `backend/tests/` with `node:test` and Supertest, run by `npm test` (`node --test --test-concurrency=1 "tests/**/*.test.js"`; script set with `npm pkg set`, `supertest` is a dev dependency). `tests/setup.js` is imported first by `tests/helpers.js` and switches the app to `DATABASE_URL_TEST` (refuses when unset or equal to `DATABASE_URL`) and sets `NODE_ENV=test` (limiters off). `utils/mailer.js` pushes payloads to an in-memory `testOutbox` instead of calling Resend when `NODE_ENV=test`; helpers `waitForMail`, `expectNoMail`, `tokenFromMail` read it (emails are sent without being awaited). Test users use the email domain `@devfolio-test.dev` and are removed by `cleanupUsers()` (before and after each file). Files: `auth.test.js` (signup, login, username-available, me, refresh, logout, Origin), `email-flows.test.js` (verify-email, resend-verification, forgot-password, reset-password), `account.test.js` (password, email, username, delete, `runCleanup`), `skills.test.js` (2.2: custom skills, order, isolation; the onboarding case now goes through the wizard), `content.test.js` (2.3: projects, social links, timeline, headline), `media.test.js` (2.4: uploads, signature checks, replace and delete, cleanup), `sections.test.js` (2.5: section config), `onboarding-wizard.test.js` (3.3: state, steps, skip, complete, 409). Every auth endpoint has its happy path and at least 3 failure paths.
- All environment access now goes through `config/env.js` (`import { env } from "../config/env.js"`). Do not read `process.env` elsewhere. (Exception: `prisma.config.ts` is the Prisma CLI config and still reads `process.env.DATABASE_URL` directly on purpose.)
- `app.js` exports the Express app (no `listen`); `server.js` only calls `listen`.
- Prisma 7: `migrate dev` does not auto-run `generate`, so run `npx prisma generate` after installing.

**Backend layout:**
```
backend/
  app.js                    # builds Express app: middleware, static, /health + /healthz, /api/v1 routers, page routes, 404, errorHandler
  server.js                 # imports app, listens on env.PORT
  modules/<name>/           # <name>.routes.js + <name>.controller.js + <name>.schema.js (zod schemas; messages and onboarding included)
                            # names: auth, account, profile, skills, projects, onboarding, share, messages
  config/                   # env.js (zod-validated env, exits on error), constants.js (APP_NAME),
                            # prisma.js, logger.js (pino-pretty only when NODE_ENV != production)
  middleware/               # auth.middleware.js (requireAuth from the access cookie, readAccessUser), pages.js (guestPage, appPage: server-side page redirects), origin.js (originCheck), validate.js (validate(schema), zodFields),
                            # error.middleware.js (errorHandler + notFoundHandler, standard error shape)
  utils/                    # emailTokens.js (one-time email tokens), session.js (cookies, tokens, hashing), AppError.js, prismaErrors.js (isUniqueViolation), publicPortfolio.js (public select), validators.js, mailer.js (Resend, from "Portfolio Contact <onboarding@resend.dev>", renamed in 0.7)
  prisma/                   # schema.prisma + 7 migrations (0.5 added lowercase_identities and skill_project_created_at_unique_skills; 1.1 added add_sessions)
  eslint.config.js, .prettierrc, .prettierignore, .env.example
  .env                      # NOT to be uploaded (contains secrets)
README.md                   # at repo root
```

**Frontend layout:**
```
frontend/
  index.html                # landing (title "Devfolio"), "Get started" -> /signup
  pages/                    # login, signup, verify-email, forgot-password, reset-password, onboarding, edit, portfolio, dashboard, settings (.html)
  js/                       # config (API_BASE_URL="", API_PREFIX="/api/v1"), api (apiFetch -> { ok, status, data, error }),
                            # forms (showFieldErrors, setFieldError, clearFieldErrors, errorText), authGuard, login, signup, authUi, verifyEmail, forgotPassword, resetPassword,
                            # onboarding, edit, portfolio, session (login hint, safeNext), shell, ui, dashboard, settings, script (nav/scroll-reveal), skillStyles
  css/                      # global, auth, onboarding, edit, dashboard
```

**Scripts (run in `backend/`):** `dev`, `start`, `smoke` (0.8, checks a running server), `lint`, `lint:fix`, `format`, `format:check`. Lint and format scripts `cd ..` first so they cover `backend/` and `frontend/` together; configs live in `backend/`.

**Current data model:** `User` (email, username, passwordHash, onboardingComplete, shareToken?, createdAt) -> many `Session` (refreshHash, prevRefreshHash?, rotatedAt?, expiresAt, revokedAt?, userAgent?, createdAt, lastUsedAt; 1.1) -> one `Profile` (displayName, aboutText, heroRoleTexts[], contactEmail, contactPhone, githubUrl), many `Skill` (name enum-limited to 16 presets, icon?, level great/good/learning), many `Project` (title, description, repoUrl, liveUrl, tags[]). Cascade deletes. `Skill` and `Project` have `createdAt` (0.5). `Skill` has a unique `(userId, lower(name))` index. Note: `other` is one of the 16 skill presets, so a user can have only one `other` skill until custom skills arrive in Phase 2.

**Current API (all under `/api/v1`; paths below are relative to it):**
`GET /healthz` (outside the prefix, with DB ping; `/health` kept as alias), `POST auth/signup`, `POST auth/login`, `GET auth/username-available`, `POST auth/verify-email`, `POST auth/resend-verification`, `POST auth/forgot-password`, `POST auth/reset-password`, `POST account/password|email|username|delete`, `POST auth/refresh`, `POST auth/logout`, `GET auth/me`, `POST onboarding`, `GET|PATCH profile`, `GET portfolio/:username` (public since 0.6), `GET|POST skills`, `PATCH|DELETE skills/:id`, `GET|POST projects`, `PATCH|DELETE projects/:id`, `POST|GET|DELETE share`, `GET portfolio/share/:token`, `POST portfolio/:username/message`, `POST portfolio/share/:token/message`. (The unused `auth/onboarding/complete` route was removed in 0.1.)

**Page routes in `app.js`:** static files, `/health`, `/healthz`, API routers (`/api/v1`), then `/onboarding`, `/edit`, `/share/:token`, `/:username` (catch-all that serves `portfolio.html`), then a 404 handler and the error handler.

**Auth today (since 1.2):** cookie sessions as described under "Sessions" and "Frontend sessions" above. The Phase 0 `localStorage` JWT and the Bearer header are gone. Phase 1 continues with signup/login pages (1.3), email verification (1.4), password reset (1.5) and account settings (1.6).

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

**Phase 3 decisions (approved in Session 16, adjusted in Session 17)**
- Plan file: `docs/PHASE_3_PLAN.md` (added Session 17b). Branch `phase-3-dashboard`, split 3.1 routing, 3.2 shell and settings, 3.3 wizard backend, 3.4 wizard UI, 3.5 tests; batches 3.1+3.2, 3.3+3.4, 3.5.
- Redirects are decided on the server from a live session. Adjustment: the refresh cookie never reaches page routes (path `/api/v1/auth`), so the access cookie now lives 30 days (its JWT still 15 min) and page routes read it ignoring expiry plus a DB session check; this also removes the flash for users whose token just expired.
- The top bar badge says `Public`, not `Draft` as first proposed: every portfolio is publicly visible until Phase 4 adds draft and publish, so `Draft` would be untrue.
- Settings is reachable in any onboarding state (a user mid-wizard can still change a password or delete the account).
- `POST /onboarding` and the old `onboarding.html` were removed in 3.4 (the wizard replaces them); skipped steps live in `OnboardingDraft.skipped` and persist after completion; `/edit` is untouched (Phase 4 replaces it); no new dependencies.
- **3.4 decisions (approved Session 19):** the dashboard needs a finished onboarding, so its "Finish setting up" list links to `/edit` until Phase 4 adds real section editing; the live preview is a compact card (name, headline, about, skills, projects, links), not the full portfolio page.

---

## 7. Status tracker

Mark `[x]` when **all** success criteria of that item are verified by the user. `[~]` means implemented but not yet verified.

### Phase 0: Foundation, cleanup and critical fixes
- [x] 0.1 to 0.8, **Phase 0 merged into `main`** by the user (Session 8). Tag `phase-0-complete` and the 0.8 walkthrough details were not reported back; see the leftovers in Session 7.

### Phase 1: Accounts and secure sessions (branch `phase-1-accounts`, plan in `docs/PHASE_1_PLAN.md`)
- [x] 1.1 Session backend
- [x] 1.2 Frontend sessions
- [x] 1.3 Signup and login UX
- [x] 1.4 Email verification
- [x] 1.5 Password reset 
- [x] 1.6 Account settings API
- [x] 1.7 Auth tests (`npm test` all green, user-confirmed Session 14)

### Phase 2: Content model and editor API (branch `phase-2-content-model`)
- [x] 2.1 Schema and migration
- [x] 2.2 Skills: custom and ordering
- [x] 2.3 Projects, social and timeline CRUD + ordering
- [x] 2.4 Media uploads
- [x] 2.5 Section config and tests (verified clean, Session 17; Phase 2 verified)

### Phase 3: Routing, onboarding wizard and dashboard shell (branch `phase-3-dashboard`)
- [x] 3.1 Routing and redirects (committed)
- [x] 3.2 Dashboard shell and settings UI (committed)
- [x] 3.3 Wizard backend (`OnboardingDraft`, `GET /onboarding/state`, `PUT /onboarding/step/:n`, `POST /onboarding/complete`), user-verified, tests green
- [~] 3.4 Wizard UI (steps, progress, resume, skip, live preview, skipped list on the dashboard): **implemented, awaiting user verification**
- [ ] 3.5 Tests and wrap-up

### Phases 4 to 10
- [ ] Phase 4 · [ ] Phase 5 · [ ] Phase 6 · [ ] Phase 7 · [ ] Phase 8 · [ ] Phase 9 · [ ] Phase 10

---

## 8. NEXT TASK

### 8a. Verify and commit 3.4 (branch `phase-3-dashboard`)

Apply the 3.4 zip over the repo root, delete the removed files, then run `npm run lint` and `npm test` (the old onboarding case in `skills.test.js` now uses the wizard). No migration and no new dependency. Restart the server, then check in the browser with a **new** account:
- [ ] A new account opening `/dashboard` lands on `/onboarding` (step 1). Next with an empty name shows an inline error; the live preview (desktop) updates as you type and is hidden at 360 px.
- [ ] Fill step 1 and continue; on step 2 use Skip. Add skills (preset chips and a custom one), a project with a bad link (inline error) then a good one, and a link.
- [ ] Close the tab mid-wizard and reopen `/onboarding`: it resumes at the same step with the data intact.
- [ ] On Review, the skipped step is highlighted with "Add now"; Edit on another step returns to Review after saving; Finish lands on `/dashboard`, and the Overview lists the skipped sections.
- [ ] A finished user opening `/onboarding` is sent to `/dashboard`; Finish twice (two tabs) does not create duplicates.
- [ ] The public page shows the entered profile, skills, projects and links.

### 8b. Then 3.5 (tests and wrap-up)

New endpoint tests already exist for the wizard (`onboarding-wizard.test.js`); 3.5 adds page-redirect tests with Supertest (logged out to `/login?next=`, logged in away from `/`, `/login`, `/signup`, unfinished onboarding to `/onboarding`, finished users leave it, no loops), updates `scripts/smoke.js`, applies Prettier in its own commit (`style: format with prettier`), and closes Phase 3 (`git merge --no-ff phase-3-dashboard`, tag `phase-3-complete`).

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

### Session 8: Phase 1 batch 1, subphases 1.1 and 1.2 (2026-10-12)
Result: **implemented; awaiting user verification.** Unlike earlier sessions, the sandbox ran a real local PostgreSQL 16 (apt) with all 7 migration SQL files applied by `psql` and the Prisma client generated (`PRISMA_SCHEMA_ENGINE_BINARY=/bin/true npx prisma generate`), so the DB flows were tested for real. `prisma migrate dev` itself could not run (engine download blocked): the new migration SQL was written by hand and applied cleanly, but run `npx prisma migrate dev` locally; if it reports drift, tell Claude.
Context: the user merged Phase 0, approved a 7-subphase Phase 1 in 3 batches and the decisions in `PHASE_1_PLAN.md`.

**1.1 Session backend**
Files created: `backend/utils/session.js`, `backend/middleware/origin.js`, `backend/prisma/migrations/20261012120000_add_sessions/migration.sql`, `docs/PHASE_1_PLAN.md`
Files changed: `backend/prisma/schema.prisma` (`Session`, `User.sessions`), `backend/config/constants.js`, `backend/modules/auth/auth.controller.js` (login starts a session; `refresh`, `logout`, `me`), `auth.routes.js`, `backend/middleware/auth.middleware.js` (access cookie; Bearer kept temporarily in 1.1 only), `backend/middleware/rateLimit.js` (`refreshLimiter`, 60 per 15 min), `backend/app.js` (`cookieParser`, `originCheck`), `backend/scripts/smoke.js` (3 checks)
New dependency: `cookie-parser` (not shipped in the zip; `npm install cookie-parser`). No new env vars.
Tested (real DB, curl): signup, login sets both HttpOnly cookies, `/me`, refresh rotates and sets new cookies, old token within 10 s gets access cookie only, old token after 11 s gives 401 `REFRESH_TOKEN_REUSED` and the newest token of that session is then dead, logout revokes (stale refresh token 401), foreign Origin 403, 4 parallel refreshes with one token all 204, stored hash is 64 chars, smoke 8 of 8 plus 1 skipped.

**1.2 Frontend sessions**
Files created: `frontend/js/session.js`
Files changed: `frontend/js/api.js`, `authGuard.js`, `auth.js`, `onboarding.js`, `edit.js`, `portfolio.js`, `backend/middleware/auth.middleware.js` (Bearer removed, `requirePage`), `backend/modules/auth/auth.controller.js` (login body no longer has `token`), `backend/app.js` (`requirePage` on `/onboarding` and `/edit`), `README.md`, `docs/HANDOFF.md`
Tested (Node harness with a cookie-jar fetch shim against the live server, 13 of 13): cookies in the jar and nothing in storage after login; expired access cookie gives refresh plus retry in one call chain with no redirect; 3 parallel 401s share one refresh; no session redirects to login and clears the hint; `noRedirect` and `anonymous` behave; wrong login shows `INVALID_CREDENTIALS` without refresh or redirect; `requireAuth` resolves or never resolves; logout clears cookies and the server rejects the old refresh token. Page routes: `/edit` and `/onboarding` give 302 to login without cookies and 200 with a session; Bearer no longer works. **Not tested:** real browser rendering (DevTools checks above are yours).
Decisions made (and why): refresh rotation with a compare-and-swap and a 10-second grace so two tabs do not log the user out (the grace issues only a new access cookie, the browser already holds the newer refresh cookie); refresh cookie path limited to `/api/v1/auth`; access JWT is not checked against the DB per request (stateless, 15 min), so logout and password change take effect within 15 minutes for already-issued access tokens (the refresh token dies at once); `localStorage` keeps only a non-secret hint so anonymous visitors do not fire 401 requests; refresh and logout return 204; Origin check allows requests without an Origin header (not cross-site browser requests) and relies on SameSite=Lax for the rest; cookies are same-origin only (no `cors` credentials).
Leftovers / TODOs for later:
- Expired and revoked `Session` rows are not purged yet (cron in 1.6).
- Existing users must log in again after deploying (old localStorage JWTs no longer work); stale `token`/`user` keys are removed on the first `clearSession()`.
- `LOGIN_PAGE` is still `/pages/auth.html` (changes in 1.3). Login timing for unknown emails is fixed in 1.3.
- Phase 0 leftovers still open: Prettier not applied, CSP `'unsafe-inline'` styles, in-memory rate limits, dev-only audit findings.
Must not break: only `requireAuth` reads the access cookie; never put tokens in `localStorage` or response bodies; every new state-changing route sits behind `originCheck` (mounted for all `/api/v1`); the refresh cookie stays on path `/api/v1/auth`; all frontend calls go through `apiFetch`; protected pages use `await requireAuth()`.

### Session 9: Subphase 1.3, Signup and login UX (2026-10-12)
Result: **implemented; awaiting user verification** (no database or `node_modules` in the sandbox, so only `node --check` and a unit check of the strength helper were run; lint and the live flows are for the user)
Files created: `frontend/pages/login.html`, `frontend/pages/signup.html`, `frontend/js/login.js`, `signup.js`, `authUi.js`
Files changed: `backend/app.js` (`/login`, `/signup` routes), `backend/middleware/auth.middleware.js` (redirect to `/login`), `backend/middleware/rateLimit.js` (`usernameCheckLimiter`), `backend/modules/auth/auth.controller.js` (dummy-hash login, `usernameAvailable`), `auth.routes.js`, `frontend/js/api.js`, `authGuard.js` (`LOGIN_PAGE = "/login"`), `frontend/index.html`, `frontend/css/auth.css` (panel switching removed; password toggle, strength bar, notice), `README.md`, `docs/HANDOFF.md`
Files deleted: `frontend/pages/auth.html`, `frontend/js/auth.js`
New env vars / commands: none (no new dependency, no migration)
Decisions made (and why): the availability endpoint is public and returns the reason (taken or reserved) because usernames are already public URLs; signup success redirects to `/login?registered=1` instead of auto-login (login starts the session, and 1.4 will add verification); dummy bcrypt hash computed at startup (cost 10, same as signup) for timing; forms use `novalidate` so the page's own inline errors replace browser bubbles; the strength meter is only a hint.
Leftovers / TODOs for later:
- Username availability is checked again by the server at signup (the 409 race answer is unchanged).
- A logged-in visitor opening `/login` is not redirected to their portfolio.
Must not break: all auth redirects use `/login`; login failures stay generic; `/login` and `/signup` stay in `RESERVED_USERNAMES`.

Follow-up fix (lint): removed unused `setFieldError` import and `usernameOk` variable from `frontend/js/signup.js` (the submit check uses the status element's state instead). No behavior change.

### Session 10: Subphase 1.4, Email verification (2026-10-12)
Result: **implemented; awaiting user verification** (no database, `node_modules` or Resend in the sandbox: only `node --check` was run)
Files created: `backend/prisma/migrations/20261012140000_add_email_verification/migration.sql`, `backend/utils/emailTokens.js`, `frontend/pages/verify-email.html`, `frontend/js/verifyEmail.js`
Files changed: `backend/prisma/schema.prisma` (`emailVerifiedAt`, `EmailTokenType`, `EmailToken`), `backend/config/constants.js` (reserved `verify-email`, TTL and cooldown), `config/env.js` and `.env.example` (`APP_URL`), `utils/mailer.js`, `middleware/rateLimit.js` (`emailTokenLimiter`, `resendLimiter`), `modules/auth/auth.schema.js`, `auth.routes.js`, `auth.controller.js`, `backend/app.js` (`/verify-email` route), `frontend/css/auth.css`, `frontend/js/login.js` (notice text), `README.md`, `docs/HANDOFF.md`
Files deleted: none
New env vars / commands: `APP_URL` (optional); `npx prisma migrate dev` and `npx prisma generate` in `backend/`
Decisions made (and why): the page posts the token (a GET from an email scanner cannot consume it); resend is public by email with an identical 202 reply (the user may not be logged in, and nothing leaks); a 60 s cooldown per account plus an IP limiter; one live link per user (older unused tokens are deleted when a new one is made); signup and resend do not await the email (no timing difference, signup never fails because of mail); `EmailToken` is generic so 1.5 reuses it; existing users stay unverified (nothing is gated yet).
Leftovers / TODOs for later:
- Used and expired `EmailToken` rows are not purged yet (the 1.6 cron job should also delete them).
- No in-app "unverified" banner or resend button for logged-in users; add with the dashboard (Phase 3) if wanted.
- The email is plain text only.
Must not break: only the sha256 of tokens is stored; resend answers identically for every email; the verify page never leaves the token in the URL.

### Session 11: Subphase 1.5, Password reset (2026-10-12)
Result: **implemented; awaiting user verification** (sandbox: only `node --check`; no database or Resend)
Files created: `frontend/pages/forgot-password.html`, `reset-password.html`, `frontend/js/forgotPassword.js`, `resetPassword.js`
Files changed: `backend/config/constants.js` (reserved names, `PASSWORD_RESET_TTL_MS`), `utils/mailer.js` (`sendPasswordResetEmail`), `middleware/rateLimit.js` (`forgotLimiter`), `modules/auth/auth.schema.js`, `auth.routes.js`, `auth.controller.js`, `backend/app.js`, `frontend/pages/login.html` (forgot link), `frontend/js/login.js` (reset notice), `frontend/css/auth.css`, `README.md`, `docs/HANDOFF.md`
Files deleted: none
New env vars / commands: none
Decisions made (and why): reset link TTL is 1 hour (shorter than verification, the plan gave none); reset also revokes all sessions in the same transaction as the password update; forgot-password never awaits the email so timing does not reveal accounts; a reset does not mark the email verified (kept separate); no auto-login after reset (the user logs in with the new password).
Leftovers / TODOs for later:
- Used and expired `EmailToken` rows are still not purged (1.6 cron).
- An access JWT issued before the reset stays valid until it expires (max 15 min), as for logout.
- Password change inside settings (1.6) should also revoke the user's other sessions.
Must not break: forgot-password answers identically for every email; only token hashes are stored; reset always revokes all sessions.

### Session 12: Subphase 1.6, Account settings API (2026-10-12)
Result: **implemented; awaiting user verification** (sandbox: only `node --check`; no database, `node-cron` or network)
Files created: `backend/modules/account/account.routes.js`, `account.controller.js`, `account.schema.js`, `backend/jobs/cleanup.js`, `backend/prisma/migrations/20261012160000_add_user_deleted_at/migration.sql`
Files changed: `backend/prisma/schema.prisma` (`deletedAt`), `config/constants.js` (`ACCOUNT_DELETE_GRACE_DAYS`), `middleware/auth.middleware.js` (async `requireAuth` with DB session check), `middleware/rateLimit.js` (`accountLimiter`), `modules/auth/auth.controller.js` (deleted accounts ignored in login, refresh, me, forgot, resend), `modules/profile/profile.controller.js`, `share/share.controller.js`, `messages/messages.controller.js` (`deletedAt: null`), `backend/app.js`, `backend/server.js` (`startJobs`), `README.md`, `docs/HANDOFF.md`
Files deleted: none
New env vars / commands: none; `npm install node-cron`; `npx prisma migrate dev`; `npx prisma generate`
Decisions made (and why): "loses access at once" needs a DB check, so `requireAuth` now looks up the session and account on every protected request (one indexed query); this also ends the 15-minute window after logout and password reset, so the earlier "stateless" note is superseded; wrong password is 403 so the client does not treat it as an expired session; email change takes effect immediately and re-verifies (no pending-email table); username change reissues the access cookie; password change keeps the current session and revokes the others; soft-deleted accounts keep their email and username until removal (no restore feature); the cron starts from `server.js` so tests importing `app.js` never schedule it; routes are `POST` (including delete) so every call carries a JSON body and goes through the same origin check.
Leftovers / TODOs for later:
- No settings page yet (dashboard, Phase 3). Share links of deleted accounts stop working immediately.
- `runCleanup` runs in every instance; fine for one instance.
- Existing sessions issued before 1.6 keep working (they are real `Session` rows).
Must not break: protected routes check the session in the DB; deleted accounts stay invisible on every public lookup (add `deletedAt: null` to any new public query); account endpoints stay behind `requireAuth` and `accountLimiter`.

### Session 13: Subphase 1.7, Auth tests (2026-10-12)
Result: **implemented; awaiting user verification** (sandbox: only `node --check`; the tests have never been run, no database or `supertest` here)
Files created: `backend/tests/setup.js`, `helpers.js`, `auth.test.js`, `email-flows.test.js`, `account.test.js`
Files changed: `backend/utils/mailer.js` (test outbox), `backend/.env.example` (`DATABASE_URL_TEST`), `README.md`, `docs/HANDOFF.md`
Files deleted: none
New env vars / commands: `DATABASE_URL_TEST` (test only, not in `config/env.js`); `npm install -D supertest`; `npm pkg set scripts.test=...`; `DATABASE_URL=<test url> npx prisma migrate deploy`
Decisions made (and why): a mailer seam (`testOutbox` when `NODE_ENV=test`) because tokens only exist in emails and the tests must never send real mail; tests run one file at a time against one shared test DB and delete their own users by email domain; the safety check refuses to run against the dev database; tokens and cooldowns are manipulated through the DB (`expiresAt`, `createdAt`, `rotatedAt`) instead of waiting; `runCleanup` is tested directly.
Leftovers / TODOs for later:
- First run may need small fixes (cookie-jar details, timing of unawaited emails: `waitForMail` polls up to 2 s).
- No frontend tests; the smoke script is still separate.
- Phase 0 leftovers: Prettier not applied, CSP `'unsafe-inline'` styles, in-memory rate limits.
Must not break: tests never touch the dev database; no real email is sent in tests; new auth or account endpoints need a happy path and at least 3 failure paths.

### Session 14: Phase 1 closed, Phase 2 subphases 2.1 and 2.2 (2026-10-13)
Result: **implemented; awaiting user verification.** Phase 1: the user created `devfolio_test`, set `DATABASE_URL_TEST` and `npm test` passed. Phase 2 brief approved (2.1+2.2, 2.3+2.4, 2.5).
Files created: `backend/prisma/migrations/20261013100000_content_model/migration.sql`, `backend/utils/reorder.js`, `backend/tests/skills.test.js`
Files changed: `backend/prisma/schema.prisma`, `backend/utils/validators.js` (`SKILL_CATEGORIES`, `PRESET_CATEGORY`, `skillName`, `skillDerived`, `LIMITS.skillName`, `maxSkills` 50), `modules/skills/*` (schema, controller, routes), `modules/onboarding/*` (case-insensitive duplicate check, `sortOrder`, derived fields), `utils/publicPortfolio.js`, `README.md`, `docs/HANDOFF.md`
Files deleted: none
New env vars / commands: none; `npx prisma migrate dev`, `npx prisma generate`, migrate the test DB
Checked in the sandbox: the migration SQL ran on a Postgres 16 copy of the earlier migrations with seeded rows (order and categories correct, `isCustom` false); `node --check` on all changed files. **Not run:** `npm test`, lint and the app (npm could not reach the registry from the sandbox, so dependencies were not installed).
Decisions made (and why): preset names stay lowercase values so the existing frontend icon map keeps working; custom names keep the user's casing; `isCustom` and the default category are derived server-side; skill limit raised from 16 to 50 now that skills are free text; a foreign id in a reorder is 404 (not 403) so ids cannot be probed; `icon` column kept next to the new `iconKey`; `githubUrl` stays on `Profile` (no automatic `SocialLink` migration).
Leftovers / TODOs for later: the skills tab in `edit.js` still offers only presets (custom skill UI is Phase 4); projects keep `createdAt` ordering until 2.3; `Skill.icon` vs `iconKey` can be unified later.
Must not break: every list orders by `sortOrder` first where one exists (never read order from `createdAt` alone for skills); new reorder endpoints reuse `reorderOwned`; skill names stay unique per user, case-insensitive.

### Session 15: Phase 2 subphases 2.3 and 2.4 (2026-10-13)
Result: **implemented; awaiting user verification.** User confirmed 2.1 and 2.2 clean (`npm test` green). The sandbox could not install npm packages (registry unreachable), so nothing could be executed beyond `node --check` on every file.
Files created: `backend/modules/social/*`, `backend/modules/timeline/*`, `backend/modules/media/*` (routes and controller), `backend/middleware/upload.js`, `backend/config/storage.js`, `backend/utils/fileType.js`, `backend/tests/content.test.js`, `backend/tests/media.test.js`
Files changed: `backend/utils/validators.js` (social and timeline fields, limits), `modules/projects/*` (featured, order, cover cleanup), `modules/profile/profile.schema.js` (`headline`, `location`), `utils/publicPortfolio.js`, `config/env.js` and `.env.example` (`MAX_FEATURED_PROJECTS`, `UPLOAD_DIR`), `middleware/rateLimit.js` (`uploadLimiter`), `jobs/cleanup.js` (removes files of purged accounts), `app.js` (routers, `/uploads`), `tests/setup.js` (temp upload folder), `README.md`, `docs/HANDOFF.md`
Files deleted: none
New env vars / commands: `MAX_FEATURED_PROJECTS`, `UPLOAD_DIR` (both optional); `npm install multer sharp`
Decisions made (and why): all images are stored as WebP (one format to serve, re-encoding drops hidden data and metadata); avatars are cropped square 512, covers fit inside 1600x1000; resumes are checked by `%PDF-` signature only (no re-encode); files are served from `/uploads` with a sandbox CSP so even a hostile file cannot run script; the old file is deleted only after the row points at the new one; timeline order is per type and `type` is immutable; dates are `YYYY-MM-DD` (midnight UTC); `featured` limit is configurable by env; no per-user project limit added (not requested); a foreign id is 404 everywhere.
Leftovers / TODOs for later: the editor and onboarding UI do not use the new fields (Phases 3 to 5); `githubUrl` and `SocialLink` github overlap (decide in Phase 4); `Skill.icon` vs `iconKey`; uploads live on local disk (an S3 implementation of `config/storage.js` is a Phase 10 deployment item); in-memory rate limits still apply.
Must not break: every list orders by `sortOrder` first; reorder endpoints use `reorderOwned`; upload type is decided by content, never by name; only `storage` touches upload files; no stored value is rendered with `innerHTML`.

### Session 16: Subphase 2.5, Section config (2026-10-13)
Result: **implemented; awaiting user verification.** User confirmed 2.3 and 2.4 clean (one wrong test expectation in `content.test.js` was fixed: the public timeline lists EXPERIENCE before EDUCATION). Sandbox still could not install packages, so only `node --check` was run.
Files created: `backend/utils/sectionConfig.js`, `backend/tests/sections.test.js`
Files changed: `backend/modules/profile/profile.schema.js`, `profile.controller.js`, `backend/modules/share/share.controller.js`, `backend/modules/media/media.controller.js` (use `presentProfile`), `backend/utils/publicPortfolio.js`, `README.md`, `docs/HANDOFF.md`
Files deleted: none
New env vars / commands: none
Decisions made (and why): the config is a patch that is merged into the saved value so a client can change one section; positions must be unique (a partial update that causes a clash is refused, so several moves go in one request); the stored JSON is always the full config, and defaults are also filled on every read so profiles created before 2.5 work; `null` resets (stores the defaults, which avoids Prisma's JSON-null handling); unknown sections or keys are rejected rather than ignored.
Leftovers / TODOs for later: nothing reads `sectionConfig` yet (Phase 4 preview and Phase 5 SSR must apply `visible` and `order`; empty sections still hide regardless); `githubUrl` vs a GitHub `SocialLink`; `Skill.icon` vs `iconKey`; Prettier commit; uploads on local disk until deployment.
Must not break: API responses always carry a complete `sectionConfig`; reads go through `presentProfile` / `presentPublic`; stored config stays valid (unique positions).

### Session 17: Phase 2 closed, Phase 3 batch 1 = 3.1 + 3.2 (2026-10-13)
Result: **implemented; awaiting user verification.** User confirmed 2.5 and all Phase 2 criteria clean (merge and tag were given as commands) and approved the Phase 3 brief. Sandbox could not install npm packages, so only `node --check` on every backend and frontend file and a check of the `next` allowlist regex were run; lint, `npm test` and the browser checks (8a) are yours.
**3.1 Routing**
Files created: `backend/middleware/pages.js`
Files changed: `backend/app.js` (page routes use `guestPage`/`appPage`; `/` before static; `/dashboard`, `/dashboard/:section`, `/settings`), `backend/middleware/auth.middleware.js` (`requirePage` removed), `backend/utils/session.js` (`decodeAccessToken`; access cookie lives 30 days), `frontend/js/session.js` (`safeNext`, `loginUrlForPage`), `frontend/js/api.js`, `frontend/js/login.js`, `frontend/js/onboarding.js` (finish goes to `/dashboard`), `frontend/pages/portfolio.html`, `frontend/js/portfolio.js` and `frontend/css/global.css` (Dashboard button in the owner bar)
**3.2 Dashboard shell and settings**
Files created: `frontend/pages/dashboard.html`, `settings.html`, `frontend/js/shell.js`, `ui.js`, `dashboard.js`, `settings.js`, `frontend/css/dashboard.css`
Files changed: `README.md` (Pages and redirects), `docs/HANDOFF.md`
Files deleted: none
New env vars / commands: none
Decisions made (and why): see "Phase 3 decisions" in section 6. Main points: the refresh cookie is path-limited so page routes could never see it, which would have sent users with an expired access token to `/login` on every page load; fixed by keeping the access cookie 30 days and checking the session in the DB; `?reauth=1` on `/login` breaks loops when the client check fails but the server still sees a live session; `next` is an allowlist regex, not a general URL check; the badge says `Public` (true today); settings is allowed before onboarding finishes.
Leftovers / TODOs for later: cookies issued before this change expire after 15 minutes as before (users just log in again); a logged-in user whose refresh cookie has expired but whose session row is still live cannot occur (session `expiresAt` is checked); no automated tests for page redirects yet (3.5); no unverified-email banner on the dashboard; the dashboard sections other than Overview are placeholders for Phases 4, 6, 7 and 8; Prettier commit and CSP `'unsafe-inline'` styles still pending.
Must not break: page redirects always go through `middleware/pages.js` (never trust a cookie's presence alone); `next` stays allowlisted; no `<section>`, `<header>` or `<nav>` in dashboard markup; dashboard scripts use `await requireAuth()` and `mountShell`; stored values are rendered with `textContent` only.

### Session 17b: Phase 3 plan file (2026-10-13)
Result: completed (docs only, no code changed). The user could not find the Phase 3 plan: it existed only inside the Session 16 brief and HANDOFF. Created `docs/PHASE_3_PLAN.md` (same format as `PHASE_1_PLAN.md`: the 3.1 to 3.5 table, approved decisions, and the Phase 3 success criteria copied from `BUILD_PLAN.md`) and listed it in section 3.
Files created: `docs/PHASE_3_PLAN.md`. Files changed: `docs/HANDOFF.md`.
Must not break: the plan file mirrors only approved decisions; the 3.3 + 3.4 brief (tests moved into 3.3) is still awaiting approval and is not recorded there.

### Session 18: Subphase 3.3, Wizard backend (2026-10-13)
Result: **verified clean by the user** (`npm test` all green). Files: `backend/prisma/schema.prisma` and migration `20261013120000_add_onboarding_draft`, `backend/modules/onboarding/onboarding.wizard.js`, `onboarding.schema.js` (`stepSchemas`, `saveStepSchema`), `onboarding.routes.js`, `backend/middleware/rateLimit.js` (`onboardingLimiter`), `backend/tests/onboarding-wizard.test.js`.
Follow-up in the same session: the first test run returned 500s because the migration was applied only to the dev database; added `backend/scripts/migrate-test.js` and the npm script `migrate:test` (`npm pkg set scripts.migrate:test="node scripts/migrate-test.js"`), which runs `prisma migrate deploy` against `DATABASE_URL_TEST`.
Must not break: run `npm run migrate:test` after every new migration; the wizard stores step data keyed by step number as a string and `skipped` as numbers.

### Session 19: Subphase 3.4, Wizard UI (2026-10-13)
Result: **implemented; awaiting user verification.** Brief approved (links in the dashboard skipped list point to `/edit` until Phase 4; compact preview card). Checked in the sandbox with a headless Chromium run against a mocked API (inline errors, resume after reload, skip, custom skills, bad-link error, edit from review, finish, preview hidden at 360 px, no console errors) and screenshots at 1280 and 360 px; lint, `npm test` and the real-server checks (8a) are the user's.
Files created: none new (the three wizard files replace the old ones). Files changed: `frontend/pages/onboarding.html`, `frontend/js/onboarding.js`, `frontend/css/onboarding.css` (rewritten), `frontend/js/dashboard.js` and `frontend/css/dashboard.css` (skipped-sections box), `backend/modules/onboarding/onboarding.routes.js`, `onboarding.schema.js` (old `onboardingSchema` removed), `backend/tests/skills.test.js` (onboarding case moved to the wizard), `docs/HANDOFF.md`.
Files deleted: `backend/modules/onboarding/onboarding.controller.js`.
New env vars / commands: none.
Leftovers: the `skipped` list persists after completion and is not cleared when a section is filled later (Phase 4 can prune it); the Prettier commit is still pending (3.5), so new files may not match the formatter yet.
Must not break: the wizard builds all DOM with `createElement` and `textContent`; input `name` attributes must equal the server's error keys; `read(true)` prunes empty rows before saving; quiet saves (Back, progress bar) must not mark a skipped step as filled.

*(Add Session 18 and onward below this line.)*

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

