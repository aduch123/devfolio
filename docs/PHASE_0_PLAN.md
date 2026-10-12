# Devfolio: Phase 0 Subphase Implementation Plan

Phase 0 from `BUILD_PLAN.md` (foundation, cleanup and critical fixes) split into **8 subphases**. Each one is sized to fit in a single chat session: roughly **5 to 12 files touched**, one clear theme, and a result you can test before moving on.

**Rule:** do the subphases **in order**. Later ones assume earlier ones are finished. Do not start a new subphase until the current one's checks pass. By default one subphase per chat; several consecutive subphases may share a chat when the user asks (see `HANDOFF.md`, "Batching").

**Git:** all of Phase 0 lives on **one branch, `phase-0-foundation`**, with one commit per subphase (for example `refactor(0.2): move code into modules`). The branch is merged into `main` (`git merge --no-ff phase-0-foundation`) and tagged `phase-0-complete` only after **0.8** passes. See "Git conventions" in `HANDOFF.md`.

---

## Overview

| # | Subphase | Theme | Rough size | You must do outside the chat |
|---|---|---|---|---|
| 0.1 | Hygiene and bootstrap | Env, app/server split, dead code, lint | Small | Rotate secrets |
| 0.2 | Restructure and API versioning | Move into modules, `/api/v1`, `/healthz` | Medium (mechanical) | None |
| 0.3 | Error contract | One error shape, backend and frontend | Medium | None |
| 0.4 | Input validation and clearable fields | Safe URLs, phone, nullable fields | Medium | None |
| 0.5 | Data integrity | Lowercase identities, reserved names, unique skills, idempotent onboarding, ordering | Medium | Run migrations locally |
| 0.6 | Public access and XSS fixes | Public page opens, escaping, empty-state rendering | Medium | None |
| 0.7 | Security middleware | helmet and CSP, rate limits, email config | Small to medium | Add `RESEND_FROM` to `.env` |
| 0.8 | Verification and docs | Payload tests, regression pass, README | Small | Manual testing |

---

## How to run each session

**Start of every chat**
1. Upload the project as a zip. **Delete `.env` and `node_modules` first.** Never upload secrets.
2. Paste this plan's section for the current subphase (only that one).
3. Paste the **handoff note** from the previous subphase, if there is one.
4. Say: *"Implement subphase 0.X exactly as written. Don't do work from other subphases."*

**End of every chat**
1. Ask Claude for the changed files, either as a zip or as a list with full contents.
2. Ask for a **handoff note** using the template below.
3. Apply the changes, run the check list for that subphase, and fix anything broken **in the same chat** before closing it. Then commit on `phase-0-foundation` (one commit for the subphase).

**Handoff note template** (Claude writes it, you save it)
```
Subphase completed: 0.X
Files created / changed / deleted:
Decisions made (and why):
New env vars / commands to run:
Known leftovers or TODOs for later subphases:
Anything the next session must not break:
```

**Scope guard.** If a chat starts drifting into work from another subphase, stop it. Note it in the handoff under leftovers instead.

---

## 0.1: Hygiene and bootstrap

**Goal:** a project that boots safely from a clean clone, with a testable app structure and no dead code.

**Tasks**
- Create `.env.example` listing every variable: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY` (and placeholders for ones added later, commented).
- Add `config/env.js`: loads dotenv, validates with zod, **exits with a clear message** if a required variable is missing or too weak (for example `JWT_SECRET` shorter than 32 characters). All other files import config from here instead of reading `process.env` directly.
- Split `server.js` into `app.js` (builds and exports the Express app) and `server.js` (imports the app and calls `listen`).
- Delete the empty `models/` folder and the unused `POST /api/auth/onboarding/complete` route and `completeOnboarding` controller.
- Make logging environment-aware: `pino-pretty` only when not in production.
- Add ESLint and Prettier (config files plus `lint` and `format` scripts), and fix what the linter finds that can be fixed automatically.
- Add a short README titled **Devfolio** with setup steps (install, env, migrate, run).
- **Branding:** rename the package to `devfolio` in `package.json`, add `APP_NAME = "Devfolio"` to `config/constants.js` (or `config/env.js` if constants does not exist yet), and update the `<title>` of `index.html` and `auth.html` to use the name (for example "Devfolio" and "Log in | Devfolio"). Text-only change: no layout or behavior change.

**Files touched (about 10 to 12):** `.env.example`, `config/env.js`, `config/logger.js`, `config/prisma.js`, `server.js`, `app.js`, `auth.routes.js`, `auth.controller.js`, `package.json`, ESLint and Prettier configs, `README.md`, `frontend/index.html`, `frontend/pages/auth.html`.

**Out of scope:** moving folders (0.2), changing any behavior.

**You do:** **rotate** the JWT secret, Resend API key and database password, since they were in a shared zip. Put new values in your local `.env`.

**Success criteria**
- [ ] Removing `JWT_SECRET` from `.env` makes the server exit with a readable error.
- [ ] A fresh clone plus `.env.example` copied to `.env` boots and `/health` works.
- [ ] `app.js` can be imported without starting a server.
- [ ] `npm run lint` passes.
- [ ] The app behaves exactly as before in the browser (login, onboarding, portfolio, edit).
- [ ] Old secrets are rotated, and `.env` is not in the zip you upload next.
- [ ] `package.json` name is `devfolio`, the README title says Devfolio, and the landing and auth page tab titles show the name.

---

## 0.2: Restructure and API versioning

**Goal:** the module folder layout and the `/api/v1` prefix, with **no behavior change**. This is a mechanical move, so keep it separate from logic changes.

**Tasks**
- Move code into `modules/<name>/` with `routes`, `controller` (and a `schema` file where one already exists inline) for: `auth`, `profile`, `skills`, `projects`, `onboarding`, `share`, `messages`. Shared code stays in `config/`, `middleware/` and `utils/`. Update every import.
- Mount all API routers under `/api/v1` in `app.js`.
- Replace the hardcoded `/api/...` strings in the frontend with one `API_PREFIX` constant in `config.js` (`/api/v1`), and update `auth.js`, `api.js`, `onboarding.js`, `edit.js` and `portfolio.js`.
- Rename the routes so they stay consistent after the move, with unchanged behavior (`GET /api/v1/portfolio/:username` and so on).
- Add `GET /healthz` returning `{ status: "ok" }` and a DB ping (`SELECT 1`). Keep `/health` as an alias for now.

**Files touched (about 25, but mostly move-and-fix-imports).** If the chat gets long, ask Claude to do the backend move first, confirm, then do the frontend path changes.

**Out of scope:** new validation, error format, security, any logic changes.

**Success criteria**
- [ ] Server boots with no import errors.
- [ ] Signup, login, onboarding, view portfolio, edit profile, skills and projects, share, and contact form all still work through `/api/v1`.
- [ ] No `/api/` string literal remains in the frontend outside `config.js`.
- [ ] `/healthz` returns 200 with a working DB, and fails clearly if the DB is down.
- [ ] `npm run lint` passes.

---

## 0.3: Error contract

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

## 0.4: Input validation and clearable fields

**Goal:** safe, correct input, and the ability to empty optional fields.

**Tasks**
- Add `utils/validators.js` with shared zod pieces:
  - `safeUrl`: only `http:` and `https:`, max length, trims.
  - `phone`: digits with `+`, spaces, dashes and parentheses (7 to 20 characters).
  - `optionalText(max)`, `optionalUrl`, `optionalEmail`, `optionalPhone`: each accepts a value, `""` or `null`, and **normalizes `""` to `null`**.
- Apply these to profile, onboarding, project and skill schemas, and share a **single** skill-values list instead of the duplicated array in two controllers.
- Add max lengths everywhere (display name, about text, titles, descriptions, tags count and length).
- Frontend: send `null` (not `undefined`) for emptied optional fields in `edit.js` (profile and each project field) and `onboarding.js`.
- Improve the HTML escape helpers: `escapeAttr` must escape `& < > " '`, not just quotes (in `edit.js`, and a shared copy for `portfolio.js` in the next subphase).

**Files touched (about 9):** `utils/validators.js`, profile, project, skill and onboarding schemas and controllers, `edit.js`, `onboarding.js`.

**Out of scope:** rendering fixes on the public page (0.6), database changes (0.5).

**Success criteria**
- [ ] `javascript:alert(1)`, `data:` and `ftp:` URLs are rejected with a field error for `githubUrl`, `repoUrl` and `liveUrl`.
- [ ] A phone value like `"><script>` is rejected.
- [ ] Clearing description, repo URL, live URL, tags, contact email, phone and GitHub URL in the editor persists as empty after reload.
- [ ] Over-length values are rejected with a clear message.
- [ ] The duplicated skill list no longer exists.

---

## 0.5: Data integrity

**Goal:** make the data layer correct: identities, uniqueness, ordering and onboarding repeatability.

**Tasks**
- **Lowercase identities:** normalize `email` and `username` to lowercase in signup and login (and in the lookups by username in the public portfolio, share and message code). Write a migration that lowercases existing rows, and **check for collisions first** (the migration should stop with a message if two users would collide).
- **Username rules:** zod schema `^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$` (3 to 30, no leading or trailing dash). Add `config/constants.js` with a **reserved list** (`api`, `edit`, `dashboard`, `login`, `signup`, `settings`, `onboarding`, `share`, `pages`, `css`, `js`, `admin`, `help`, `healthz`, `health`, and similar) and reject those at signup.
- **Unique skills:** de-duplicate existing skill rows (keep the oldest), then add a **unique index on `(userId, lower(name))`** through a raw SQL migration (Prisma cannot express this in the schema file). Return a `409` with a clear message when a user adds a duplicate.
- **Idempotent onboarding:** if `onboardingComplete` is already true, return `409 ALREADY_ONBOARDED`. Wrap the update in the existing transaction. (The wizard in Phase 3 will replace this endpoint.)
- **Stable ordering:** add `createdAt` to `Skill` and `Project` (migration), and add `orderBy: { createdAt: "asc" }` to every list query (own lists and public portfolio reads). Real drag-ordering comes in Phase 2.
- Frontend: add `pattern` and `maxlength` to the username input in `auth.html` and show the rules as helper text.

**Files touched (about 10):** `schema.prisma`, 2 to 3 migration files, `auth`, `skill`, `onboarding`, `profile` and `share` controllers, `constants.js`, `auth.html`.

**Out of scope:** custom skill names (Phase 2), the wizard (Phase 3).

**You do:** back up your dev database, then run `npx prisma migrate dev`. Report any collision errors back to the chat.

**Success criteria**
- [ ] Migrations apply cleanly on your existing dev data and no rows are lost.
- [ ] `Ali@Mail.com` and `ali@mail.com` are the same account, and login works with either casing.
- [ ] Signing up as `edit`, `Dashboard`, `a b`, `ab`, `-bob` or `bob-` is rejected with a field error.
- [ ] Adding the same skill twice returns a `409` and the editor shows the message.
- [ ] Posting onboarding a second time returns `409` and creates no extra rows.
- [ ] Skills and projects keep a consistent order across reloads.

---

## 0.6: Public access and XSS fixes

**Goal:** logged-out visitors can view portfolios, and no stored value can run script.

**Tasks**
- Remove `requireAuth` from `GET /api/v1/portfolio/:username`. Return only public fields (no user `id`, email, `passwordHash`, `shareToken`, or internal IDs that are not needed).
- Make sure a **visitor with an expired or stale token** does not get redirected to the login page from a public page (public calls must not trigger the 401 redirect).
- Frontend `portfolio.js`:
  - Escape or build via DOM every value inserted into HTML: `githubUrl`, `repoUrl`, `liveUrl`, `contactEmail`, `contactPhone`, skill name and level, project fields and the share URL.
  - Add a `safeHref()` helper that allows only `http`, `https`, `mailto` and `tel` as defense in depth.
  - Prefer `createElement` and `textContent` over template strings with `innerHTML`.
- **Empty states:** hide the Code button when `repoUrl` is empty, the Live button when `liveUrl` is empty, and entire sections (skills, projects, about) when they have no content. Also hide the matching nav link.
- Review `edit.js` and `onboarding.js` for any remaining unescaped interpolation.

**Files touched (about 6):** `profile.routes.js`, profile controller, `api.js`, `portfolio.js`, `edit.js`, `portfolio.html` (nav handling).

**Out of scope:** headers and CSP (0.7), server-side rendering (Phase 5).

**Success criteria**
- [ ] In a private (logged-out) browser window, `/username` loads the portfolio.
- [ ] A logged-out visitor with a garbage token in `localStorage` still sees the portfolio (no redirect).
- [ ] The public API response contains no email, password hash, share token or user ID.
- [ ] Stored payloads such as `"><img src=x onerror=alert(1)>` in name, about, project title, description, tags, skill-adjacent text and links do not execute and show as plain text.
- [ ] A project without URLs shows no dead `#` buttons, and an empty skills or projects section is not rendered.
- [ ] Share link view and username view both still work.

---

## 0.7: Security middleware

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

## 0.8: Verification and docs

**Goal:** prove Phase 0 is done and leave the project documented. Little new code, mostly testing and writing.

**Tasks**
- Run an **XSS payload pass** against every user-editable field and every place it renders (public page, share page, edit forms, onboarding). Record results in a short table. Fix anything found.
- Run a **regression walkthrough** of every flow: signup, login, onboarding, view portfolio (logged in and out), edit profile, add, edit and delete skills and projects, share link create, regenerate and revoke, contact form, logout.
- Add a small **smoke test script** (`npm run smoke`) that hits `/healthz`, a public portfolio, a 404 and a validation error and checks the response shapes (a few `fetch` calls in a Node script, no framework needed yet).
- Update the README: setup, env variables, scripts, folder structure, API base path, error format and reserved usernames.
- Confirm `.env` is ignored and `.env.example` is complete, and run `npm audit` and note results.
- Write the **Phase 0 handoff summary** to carry into Phase 1 (final folder tree, conventions: error shape, validators, naming, how to add a route).

**Files touched (about 4 to 6):** smoke script, README, `package.json`, plus any bugs found.

**Success criteria:** the full Phase 0 checklist below.

---

## Phase 0 success criteria mapped to subphases

| Phase 0 criterion (from `BUILD_PLAN.md`) | Closed in |
|---|---|
| App boots from a clean clone using `.env.example` | 0.1 |
| Server fails fast when an env var is missing | 0.1 |
| Logged-out browser can open `/<username>` | 0.6 |
| `javascript:` URL rejected on any URL field | 0.4 |
| Phone with quotes or HTML rejected, no stored value executes | 0.4, 0.6, 0.8 |
| Clearing any optional field persists after reload | 0.4 |
| Every API error uses the standard shape, no "[object Object]" | 0.3 |
| Onboarding twice does not duplicate data | 0.5 |
| Adding the same skill twice gives a clear error | 0.5 |
| Reserved or invalid usernames rejected | 0.5 |
| Login endpoint rate limited (429) | 0.7 |
| Empty sections and empty-URL buttons no longer render | 0.6 |
| Secrets rotated, `.env` not in version control | 0.1, 0.8 |
| `npm run lint` passes | 0.1, rechecked in every subphase |

**Phase 0 is finished when:** every box in the table above is ticked, the 0.8 regression walkthrough passes with no failures, and the handoff summary is saved for Phase 1.
