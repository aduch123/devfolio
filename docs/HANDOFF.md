# HANDOFF: Devfolio Build

> **Read this first.** This file is the single source of truth for where the project stands. It is written for a fresh Claude chat with no memory of earlier sessions. Keep it updated at the end of every session (see section 9).

**Project name:** **Devfolio** (repo name `devfolio`)
**Last updated:** 2026-10-12 (Session 0, planning only)
**Current position:** Phase 0, Subphase **0.1** (not started)
**Code changes made so far:** **None.** The uploaded project is exactly as the user wrote it.

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
8. **Deliver only changed and new files**, not a zip of the whole project, unless asked.
9. **Watch the context budget.** If the session is getting long or you are near the limit, stop adding scope, finish the current edit, and produce the handoff update block (section 9) **before** running out.
10. **Verify cheaply.** Run `node --check`, lint or a quick import test on changed files when possible. The user will run the app, database migrations and browser tests locally, since the chat sandbox has no access to their database.

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

## 4. Current codebase (as of the uploaded zip)

**Stack:** Node (ES modules, `"type": "module"`), **Express 5**, **Prisma 7** with PostgreSQL via `@prisma/adapter-pg` (datasource URL is set in `prisma.config.ts`, not in `schema.prisma`), JWT (`jsonwebtoken`), `bcrypt`, `zod` v4, `pino` and `pino-http`, `resend` for email, `nodemon` in dev. Frontend: **vanilla HTML, CSS and JS** (ES modules), served by Express as static files. No build step, no tests, no linter.

**Notes on the stack that matter:**
- Express 5 forwards rejected promises from async handlers to the error middleware automatically, so the existing `catchAsync` wrapper is redundant (keep or remove consistently in 0.2 or 0.3).
- Prisma client is created in `config/prisma.js` with the `PrismaPg` adapter and `process.env.DATABASE_URL`.

**Backend layout (flat, to be restructured in 0.2):**
```
backend/
  server.js                 # app setup + listen (to split in 0.1)
  config/                   # prisma.js, logger.js (pino-pretty always on)
  middleware/               # auth.middleware.js (Bearer JWT), error.middleware.js
  routes/                   # auth, profile, skill, project, onboarding, share, message
  controllers/              # same names
  utils/                    # catchAsync.js, mailer.js (Resend, from onboarding@resend.dev)
  prisma/                   # schema.prisma + 4 migrations
  models/                   # EMPTY folder (delete)
  .env                      # NOT to be uploaded (contains secrets)
```

**Frontend layout:**
```
frontend/
  index.html                # landing, "Get started" -> /pages/auth.html
  pages/                    # auth, onboarding, edit, portfolio (.html)
  js/                       # config (API_BASE_URL=""), api (apiFetch), authGuard, auth,
                            # onboarding, edit, portfolio, script (nav/scroll-reveal), skillStyles
  css/                      # global, auth, onboarding, edit
```

**Current data model:** `User` (email, username, passwordHash, onboardingComplete, shareToken?, createdAt) → one `Profile` (displayName, aboutText, heroRoleTexts[], contactEmail, contactPhone, githubUrl), many `Skill` (name enum-limited to 16 presets, icon?, level great/good/learning), many `Project` (title, description, repoUrl, liveUrl, tags[]). Cascade deletes. No `createdAt` on Skill or Project.

**Current API (all under `/api`, to move to `/api/v1`):**
`POST auth/signup`, `POST auth/login`, `POST auth/onboarding/complete` (unused), `POST onboarding`, `GET|PATCH profile`, `GET portfolio/:username` (**wrongly requires auth**), `GET|POST skills`, `PATCH|DELETE skills/:id`, `GET|POST projects`, `PATCH|DELETE projects/:id`, `POST|GET|DELETE share`, `GET portfolio/share/:token`, `POST portfolio/:username/message`, `POST portfolio/share/:token/message`.

**Page routes in `server.js`:** static files, `/health`, API routers, then `/onboarding`, `/edit`, `/share/:token`, `/:username` (catch-all that serves `portfolio.html`), then a 404 handler and the error handler.

**Auth today:** login returns a JWT (7 days); the frontend stores `token` and `user` in `localStorage`; `apiFetch` adds the `Authorization: Bearer` header and on any 401 clears storage and redirects to `/pages/auth.html`. (This is replaced by cookies in Phase 1. Do not change it in Phase 0.)

---

## 5. Known problems (the Phase 0 backlog)

| # | Problem | Fixed in |
|---|---|---|
| 1 | Secrets (`.env`) were shared in a zip, so they must be rotated | 0.1 (user action) |
| 2 | No env validation, no `.env.example`, server and app not split, no linter, dead code (`models/`, unused endpoint) | 0.1 |
| 3 | Flat structure, unversioned API | 0.2 |
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

---

## 7. Status tracker

Mark with `[x]` when **all** success criteria of that item are verified by the user.

### Phase 0: Foundation, cleanup and critical fixes
- [ ] **0.1** Hygiene and bootstrap  ← **NEXT**
- [ ] 0.2 Restructure and API versioning
- [ ] 0.3 Error contract
- [ ] 0.4 Input validation and clearable fields
- [ ] 0.5 Data integrity
- [ ] 0.6 Public access and XSS fixes
- [ ] 0.7 Security middleware
- [ ] 0.8 Verification and docs

### Phases 1 to 10
- [ ] Phase 1 · [ ] Phase 2 · [ ] Phase 3 · [ ] Phase 4 · [ ] Phase 5
- [ ] Phase 6 · [ ] Phase 7 · [ ] Phase 8 · [ ] Phase 9 · [ ] Phase 10

---

## 8. NEXT TASK: Subphase 0.1 (Hygiene and bootstrap)

**Goal:** a project that boots safely from a clean clone, with a testable app structure and no dead code. **No behavior changes.**

**Tasks**
1. Create `.env.example` with `PORT`, `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY` (placeholder values, comments for future ones).
2. Add `config/env.js`: load dotenv, validate with zod, **exit with a clear message** if a required variable is missing or weak (for example `JWT_SECRET` under 32 characters). Export a typed `env` object, and replace direct `process.env` reads in other files (`prisma.js`, `mailer.js`, `auth.controller.js`, `auth.middleware.js`, `server.js`) with imports from it.
3. Split `server.js` into `app.js` (builds and exports the Express app with all middleware and routes) and `server.js` (imports the app and calls `listen`). Keep the route order intact.
4. Delete the empty `models/` folder, and remove the unused `POST /api/auth/onboarding/complete` route and the `completeOnboarding` controller (including its import in `auth.routes.js`).
5. Make logging environment-aware: use `pino-pretty` only when `NODE_ENV !== "production"`.
6. Add ESLint (flat config, Node and browser globals as needed) and Prettier, with `lint` and `format` scripts in `package.json`. Auto-fix what can be fixed, and list what remains.
7. Add a short `README.md` titled **Devfolio**: prerequisites, install, env setup, `npx prisma migrate dev`, `npm run dev`, scripts.
8. **Branding (text only):** rename the package to `devfolio` in `package.json`, add `APP_NAME = "Devfolio"` (in `config/env.js` or a new `config/constants.js`), and update the `<title>` of `frontend/index.html` ("Devfolio") and `frontend/pages/auth.html` ("Log in | Devfolio"). The mailer sender rename happens in 0.7.

**Likely files:** `.env.example`, `config/env.js`, `config/logger.js`, `config/prisma.js`, `app.js`, `server.js`, `routes/auth.routes.js`, `controllers/auth.controller.js`, `middleware/auth.middleware.js`, `utils/mailer.js`, `package.json`, ESLint and Prettier configs, `README.md`, `frontend/index.html`, `frontend/pages/auth.html`.

**Out of scope:** moving folders (0.2), error format (0.3), any validation or behavior change.

**User actions outside the chat**
- **Rotate** the JWT secret, Resend API key and database password (they were in a shared zip), and put the new values in the local `.env`.
- Delete `.env` and `node_modules` from the zip before uploading.

**Success criteria (user verifies)**
- [ ] Removing `JWT_SECRET` from `.env` makes the server exit with a readable error.
- [ ] Copying `.env.example` to `.env` (with real values) boots the server and `/health` returns OK.
- [ ] `app.js` can be imported without starting a server.
- [ ] `npm run lint` passes.
- [ ] Login, onboarding, portfolio view, edit and share still work exactly as before.
- [ ] Old secrets are rotated, and `.env` is not in version control or the uploaded zip.
- [ ] `package.json` name is `devfolio`, the README title says Devfolio, and the landing and auth page tab titles show the name.

**After 0.1:** the next subphase is **0.2** (restructure and `/api/v1`). Take its section from `PHASE_0_PLAN.md`.

---

## 9. How to update this file at the end of every session

To save tokens, **do not rewrite this whole file.** Ask Claude to output only this **update block**, then paste the pieces into the right places yourself:

```
### Update block for HANDOFF.md
1. Status tracker changes: (which boxes to tick, which item is now NEXT)
2. Session log entry: (copy of the template in section 10)
3. Codebase changes to record in section 4: (new or moved files, new routes, new env vars, only if they changed)
4. Decisions to add to section 6: (only if new)
5. Next task: (name the next subphase and note anything it must know)
```

Also update "Last updated", "Current position" and "Code changes made so far" at the top.

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

*(Add Session 1 and onward below this line.)*

---

## 11. Starting message to paste into the new chat

> I'm building **Devfolio**, a developer portfolio platform, following the attached plan. I'm on a **free Claude plan, so be very economical with tokens**. Read `HANDOFF.md` (attached) first and follow its rules in section 1. Implement **only** the "NEXT TASK" in section 8 (subphase 0.1). Attached: `HANDOFF.md` and my project zip (without `.env` and `node_modules`). Edit existing files with targeted changes, give me only changed or new files, keep replies short, and at the end give me the "update block" from section 9.
