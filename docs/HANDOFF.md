# HANDOFF: Devfolio Build

> **Read this first.** This file is the single source of truth for where the project stands. It is written for a fresh Claude chat with no memory of earlier sessions. Keep it updated at the end of every session (see section 9).

**Project name:** **Devfolio** (repo name `devfolio`)
**Last updated:** 2026-10-12 (Session 5, subphase 0.6 implemented; Session 4, subphase 0.5 verified and committed; Session 3c, command-block rule; Session 3b, git workflow)
**Current position:** Phase 0. Subphase **0.5 verified by the user**; **0.6 implemented, awaiting user verification** (`devfolio-0.6-changes.zip`, on top of 0.5). 0.1 to 0.4 are committed on `phase-0-foundation` (user verification of 0.1 to 0.4 not explicitly confirmed). Next: **0.7**.
**Code changes made so far:** 0.1 (hygiene and bootstrap, committed on the Phase 0 branch `phase-0-foundation`), 0.2 (restructure and `/api/v1`, pushed to the Phase 0 branch), 0.3 (error contract, `devfolio-0.3-changes.zip`) and 0.4 (validation, `devfolio-0.4-changes.zip`, cumulative on top of 0.3), 0.5 (data integrity, committed), 0.6 (public access and XSS, `devfolio-0.6-changes.zip`, on top of 0.5).

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

## 4. Current codebase (after subphase 0.6)

**Stack:** Node (ES modules, `"type": "module"`), **Express 5**, **Prisma 7** with PostgreSQL via `@prisma/adapter-pg` (datasource URL is set in `prisma.config.ts`, not in `schema.prisma`), JWT (`jsonwebtoken`), `bcrypt`, `zod` v4, `pino` and `pino-http`, `resend` for email, `nodemon` in dev. Dev tooling: ESLint 10 (flat config) and Prettier 3. Frontend: **vanilla HTML, CSS and JS** (ES modules), served by Express as static files. No build step, no tests.

**Notes on the stack that matter:**
- Express 5 forwards rejected promises from async handlers (and errors thrown in sync middleware) to the error middleware automatically. `catchAsync` was removed in 0.3: controllers and routes are plain `async` functions that `throw` an `AppError`.
- **Error contract (0.3):** every API error is `{ "error": { "code", "message", "fields?" } }`. Throw helpers from `utils/AppError.js` (`badRequest`, `validationError`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `tooMany`). Request validation is `validate(schema)` middleware in the route (`middleware/validate.js`), which replaces `req.body` with the parsed data, so controllers read `req.body` as already valid. Unknown errors become a generic 500 and are logged only.
- **Validation (0.4):** reusable zod pieces live in `utils/validators.js` (`safeUrl` http/https only, `phone`, `optionalText/Url/Email/Phone` which turn `""` into `null`, `requiredText`, tags and role lists, the single `SKILL_VALUES` list, and `LIMITS`). Optional fields can be cleared by sending `null` or `""`; omitted keys mean "do not change".
- **Data integrity (0.5):** `email` and `username` are lowercased by the zod schemas (`identityEmail` in `utils/validators.js`, `usernameSchema` in `modules/auth/auth.schema.js`), so signup and login always see lowercase. Username lookups from URL params call `.toLowerCase()`. Username rules: 3 to 30, `a-z 0-9 -`, no leading or trailing dash, reserved names in `RESERVED_USERNAMES` (`config/constants.js`). Skills are unique per user, case-insensitive (raw SQL index `Skill_userId_lower_name_key`; controllers pre-check and also map Prisma `P2002` via `utils/prismaErrors.js` to `409 SKILL_EXISTS`). Onboarding returns `409 ALREADY_ONBOARDED` (atomic `updateMany ... onboardingComplete:false` inside an interactive transaction). Every list and public read orders by `createdAt asc, id asc`.
- **Public access (0.6):** `GET /api/v1/portfolio/:username` and `GET /api/v1/portfolio/share/:token` need no login and return only `PUBLIC_PORTFOLIO_SELECT` (`utils/publicPortfolio.js`): `username`, profile (`displayName, aboutText, heroRoleTexts, contactEmail, contactPhone, githubUrl`), skills (`name, icon, level`), projects (`title, description, repoUrl, liveUrl, tags`), ordered by `createdAt, id`. No user id, account email, hash, share token or row ids. `contactEmail` is the owner's chosen public contact address. Add new public fields in that one file.
- **Frontend rendering rule (0.6):** `portfolio.js` builds the page with `createElement` and `textContent` only (helpers `make`, `makeIcon`, `makeLink`, `safeHref` allowing `http`, `https`, `mailto`, `tel`). Never use `innerHTML` with stored values there. Empty links, skills, projects and about are not rendered (section and nav link hidden). `apiFetch(path, { anonymous: true })` sends no token and never redirects to login; use it for every public call (portfolio read, contact form).
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

**Scripts (run in `backend/`):** `dev`, `start`, `lint`, `lint:fix`, `format`, `format:check`. Lint and format scripts `cd ..` first so they cover `backend/` and `frontend/` together; configs live in `backend/`.

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
| 7 | Public portfolio route requires login; stored XSS via unescaped `githubUrl`, `repoUrl`, `liveUrl`, `contactPhone`; dead `#` buttons and empty sections render | 0.6 **(implemented, awaiting verification)** |
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

- **D12** **Git: one branch per phase** (`phase-N-name`), one commit per subphase, merge to `main` when the whole phase is verified (see "Git conventions" in section 1b). Decided in Session 3b; the original per-subphase branches idea was dropped, and `phase-0.1-hygiene` is renamed to `phase-0-foundation`.

**Phase 0 specific decisions**
- Onboarding resubmission is **rejected with 409** (not replaced). The wizard replaces it in Phase 3.
- Usernames: lowercase `a-z 0-9 -`, 3 to 30 characters, no leading or trailing dash, reserved names blocked.
- Empty optional fields are normalized to `null`.

**Decisions made in 0.1**
- `JWT_SECRET` must be at least 32 characters (enforced at startup). `PORT` defaults to 5000; `NODE_ENV` defaults to `development`. `RESEND_API_KEY` stays required.
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
- [~] 0.6 Public access and XSS fixes: **implemented, awaiting user verification** (see section 8a)
- [ ] 0.7 Security middleware  ← **NEXT** (after 0.6 is verified)
- [ ] 0.8 Verification and docs

### Phases 1 to 10
- [ ] Phase 1 · [ ] Phase 2 · [ ] Phase 3 · [ ] Phase 4 · [ ] Phase 5
- [ ] Phase 6 · [ ] Phase 7 · [ ] Phase 8 · [ ] Phase 9 · [ ] Phase 10

---

## 8. NEXT TASK

### 8a. First: user verifies 0.6

Apply `devfolio-0.6-changes.zip` over the repo root. No new dependencies, no migrations; restart the server.

**0.6 checks**
- [ ] In a private (logged-out) window, `/username` loads the portfolio.
- [ ] With a garbage `token` in `localStorage`, `/username` still loads (no redirect to login).
- [ ] `GET /api/v1/portfolio/<username>` in the browser shows no account email, password hash, share token or ids.
- [ ] Payloads such as `"><img src=x onerror=alert(1)>` saved in name, about, project title, description, tags and skill-adjacent text show as plain text and do not run.
- [ ] A project without URLs shows no Code or Live buttons; empty skills, projects or about sections (and their nav links) are hidden; `javascript:` links cannot be saved (0.4) and would not render anyway.
- [ ] The share link (`/share/<token>`) and the username view both work, and the owner controls still appear when you are logged in on your own page.

Suggested commit on `phase-0-foundation`: `fix(0.6): public portfolio without login, safe DOM rendering, safeHref and empty states`

Tick `[x]` for 0.6 once it passes. **Do not merge to `main` yet.** Also confirm secrets are rotated.

### 8b. Then: Subphase 0.7: Security middleware

**Goal:** baseline protection: headers, rate limits and email configuration.

**Tasks**
- Add `helmet` with a **Content Security Policy** allowing what the app really uses: its own scripts, Google Fonts (`fonts.googleapis.com` styles and `fonts.gstatic.com` fonts), Font Awesome from `cdnjs.cloudflare.com`, and images from self and `data:`. Note that the current HTML uses **inline `style=""` attributes**, so either allow `style-src 'unsafe-inline'` for now or move those styles into CSS (preferred if small). Add a code comment marking this as something to tighten in Phase 10.
- Add `express-rate-limit`:
  - global limiter (for example 300 requests per 15 minutes per IP),
  - auth limiter (for example 10 login or signup attempts per 15 minutes),
  - contact limiter (for example 5 messages per hour per IP and portfolio).
  - Return the standard error shape with code `RATE_LIMITED` and a friendly frontend message.
- Set `app.set("trust proxy", ...)` through an env flag so IP detection works behind a proxy.
- Configure CORS explicitly (same-origin by default) and cap JSON body size (`express.json({ limit: "100kb" })`).
- Email: make the sender a config value (`RESEND_FROM`, for example `Devfolio <onboarding@resend.dev>`), with the test sender as the development default, so emails show **Devfolio** as the sender name (replacing the current "Portfolio Contact"). Validate it in `config/env.js`. Document in the README that Resend's test sender only delivers to the account owner until a domain is verified (Phase 6).
- Make the mailer failure return a clear, generic error rather than crashing the request.

**Files touched (about 7):** `app.js`, `config/env.js`, `middleware/rateLimit.js`, `utils/mailer.js`, routes for auth and messages, `.env.example`, `README.md`, possibly small HTML and CSS changes for inline styles.

**Out of scope:** bot detection and message storage (Phase 6).

**You do:** add `RESEND_FROM` to your `.env`.

**Success criteria**
- [ ] The browser console shows **no CSP violations** on landing, auth, onboarding, portfolio and edit pages (fonts, icons and styles still load).
- [ ] Response headers include the helmet set (check with browser dev tools or `curl -I`).
- [ ] The 11th login attempt in the window returns HTTP 429 with the standard error shape, and the UI shows a friendly message.
- [ ] The 6th contact message in an hour from one IP returns 429.
- [ ] A JSON body over 100 KB is rejected.
- [ ] The contact flow still sends an email (to the account owner while using the Resend test sender).

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

*(Add Session 6 and onward below this line.)*

---

## 11. Starting message to paste into the new chat

> I'm building **Devfolio**, a developer portfolio platform, following the attached plan. I'm on a **free Claude plan, so be very economical with tokens**. Read `HANDOFF.md` (attached) first, and follow its rules in section 1 and the workflow in section 1b. Work on the **NEXT TASK in section 8** only. **Send me a brief first and wait for my approval before changing anything.** Attached: `HANDOFF.md` and my project zip (without `.env` and `node_modules`). When done, send me a zip of the changed files only, the updated `HANDOFF.md`, and a suggested commit message.
