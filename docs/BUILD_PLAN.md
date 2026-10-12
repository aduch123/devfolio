# Devfolio: Build Plan

**Devfolio** is the product name: a platform where developers build, manage, publish and track their portfolio.

A phase-by-phase plan to turn the current portfolio generator into a full portfolio platform: build, manage from a dashboard, publish, share, track and improve.

**How to use this document:** work through the phases in order. Each phase ends with **Success criteria**, a checklist that must be fully ticked before the next phase starts. Every phase should leave the app in a working, runnable state.

---

## Table of contents

1. [Guiding decisions](#1-guiding-decisions)
2. [Target architecture](#2-target-architecture)
3. [Final data model](#3-final-data-model)
4. [Final API surface](#4-final-api-surface)
5. [Phase 0: Foundation, cleanup and critical fixes](#phase-0--foundation-cleanup-and-critical-fixes)
6. [Phase 1: Accounts and secure sessions](#phase-1--accounts-and-secure-sessions)
7. [Phase 2: Content model and editor API](#phase-2--content-model-and-editor-api)
8. [Phase 3: Routing, onboarding wizard and dashboard shell](#phase-3--routing-onboarding-wizard-and-dashboard-shell)
9. [Phase 4: Live preview, inline editing and publishing](#phase-4--live-preview-inline-editing-and-publishing)
10. [Phase 5: Public portfolio, SEO and sharing](#phase-5--public-portfolio-seo-and-sharing)
11. [Phase 6: Messages and inbox](#phase-6--messages-and-inbox)
12. [Phase 7: Analytics and likes](#phase-7--analytics-and-likes)
13. [Phase 8: Portfolio health](#phase-8--portfolio-health)
14. [Phase 9: Themes, landing page and polish](#phase-9--themes-landing-page-and-polish)
15. [Phase 10: Hardening, testing and launch](#phase-10--hardening-testing-and-launch)
16. [Appendix A: Fix traceability](#appendix-a--fix-traceability)
17. [Appendix B: Feature traceability](#appendix-b--feature-traceability)
18. [Appendix C: Global definition of done](#appendix-c--global-definition-of-done)

---

## 1. Guiding decisions

These shape every phase. Change them now rather than mid-build.

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Frontend approach | Keep **vanilla JS + ES modules**, no framework, but split into small modules and shared components | Keeps the project approachable. A framework can be added later if the dashboard outgrows it. |
| D2 | Session storage | Move from `localStorage` JWT to **httpOnly cookies** (short-lived access token + rotating refresh token) | Lets the server know who you are on page loads (needed for `/` → dashboard redirect), and removes token theft via XSS. |
| D3 | Public page rendering | **Server-side render** `/:username` with a template function | Real `<title>`, meta and Open Graph tags for SEO and link previews, and a faster first paint. |
| D4 | API versioning | Prefix all JSON endpoints with `/api/v1` | Lets the API change without breaking the frontend. |
| D5 | Error format | One shape everywhere: `{ error: { code, message, fields? } }` | Fixes the "[object Object]" bug and makes frontend error handling uniform. |
| D6 | File storage | Local `/uploads` in development, behind a storage interface so S3-compatible storage can be swapped in | Avoids lock-in, easy to start. |
| D7 | Background work | `node-cron` inside the server process for link checks and cleanup | Enough for this scale, with no queue infrastructure. |
| D8 | Analytics privacy | Store **no raw IPs**: hash `ip + user-agent + daily salt` for unique-visitor counting | Privacy-friendly and avoids cookie banners. |
| D9 | Testing | `node:test` or Vitest + Supertest for the API | Small, fast, runs in CI. |
| D10 | Validation | Keep **zod** for every request body and query | Already in the project. |
| D11 | Product name | **Devfolio** (repo `devfolio`, package name `devfolio`) | Used consistently in page titles, email sender name (`Devfolio <...>`), Open Graph `og:site_name`, landing page, README and legal pages. The name is stored in one config constant (`APP_NAME`) so it can change in one place. |

---

## 2. Target architecture

```
backend/
  server.js                 # app bootstrap only
  app.js                    # express app assembly (testable)
  config/                   # env, prisma, logger, constants (reserved usernames)
  middleware/               # auth, error, rateLimit, validate, upload, security headers
  modules/
    auth/                   # routes, controller, service, schema
    users/ (account settings)
    profile/
    skills/
    projects/
    social/
    timeline/               # experience + education
    media/                  # avatar, resume, project covers
    portfolio/              # public read + SSR rendering
    share/
    messages/
    analytics/              # views, likes, clicks
    health/                 # score, link checker, suggestions
  views/                    # server-rendered templates (public portfolio, errors)
  jobs/                     # cron: link checks, token cleanup, retention
  utils/
  prisma/
frontend/
  index.html                # landing
  pages/                    # login, signup, onboarding, dashboard, settings, verify, reset
  js/
    core/                   # api client, auth state, router helpers, toast, modal
    components/             # reusable UI pieces (card, tabs, chart, inline-editable)
    pages/                  # one entry file per page
  css/                      # tokens, base, components, themes, per-page
tests/
```

**Route map**

| URL | Purpose | Access |
|---|---|---|
| `/` | Landing (redirects to `/dashboard` if logged in) | Public |
| `/login`, `/signup` | Auth pages (redirect if logged in) | Public |
| `/verify-email`, `/forgot-password`, `/reset-password` | Account recovery | Public |
| `/onboarding` | First-run wizard | Logged in |
| `/dashboard` | Home: overview, preview, analytics, health, inbox | Logged in |
| `/settings` | Account settings | Logged in |
| `/share/:token` | Private share link | Token |
| `/:username` | Public portfolio | Public (if published) |

Reserved words (`dashboard`, `login`, `api`, `edit`, and so on) can never be usernames.

---

## 3. Final data model

*(Prisma sketch. Existing tables are extended, not replaced, and migrations are additive where possible.)*

- **User**: `id`, `email` (lowercased), `username` (lowercased), `passwordHash`, `emailVerifiedAt?`, `onboardingComplete`, `createdAt`, `deletedAt?`
- **Session**: `id`, `userId`, `refreshTokenHash`, `userAgent`, `expiresAt`, `revokedAt?`
- **AuthToken**: `id`, `userId`, `type` (`VERIFY_EMAIL` | `RESET_PASSWORD`), `tokenHash`, `expiresAt`, `usedAt?`
- **Profile**: `displayName`, `headline`, `aboutText`, `location`, `heroRoleTexts[]`, `avatarUrl`, `resumeUrl`, `contactEmail`, `contactPhone`, `published` (bool), `publishedAt?`, `theme`, `accentColor`, `sectionConfig` (JSON: per-section `visible` and `order`), `seoTitle`, `seoDescription`, `ogImageUrl`
- **Skill**: `id`, `userId`, `name`, `iconKey`, `category`, `level`, `isCustom`, `sortOrder`, `createdAt`. **Unique** `(userId, lower(name))`.
- **Project**: `id`, `userId`, `title`, `description`, `repoUrl`, `liveUrl`, `tags[]`, `coverImageUrl`, `featured`, `sortOrder`, `createdAt`
- **SocialLink**: `id`, `userId`, `platform` (`github`, `linkedin`, `x`, `website`, ...), `url`, `sortOrder`
- **TimelineItem**: `id`, `userId`, `type` (`EXPERIENCE` | `EDUCATION`), `title`, `organization`, `startDate`, `endDate?`, `description`, `sortOrder`
- **ShareLink**: `id`, `userId`, `tokenHash`, `label`, `expiresAt?`, `revokedAt?`, `createdAt`
- **Message**: `id`, `userId`, `senderName`, `senderEmail`, `body`, `status` (`UNREAD` | `READ` | `ARCHIVED`), `createdAt`
- **View**: `id`, `userId`, `visitorHash`, `referrerHost?`, `deviceType`, `isShareLink`, `createdAt`
- **Like**: `id`, `userId`, `visitorHash`, `createdAt`. **Unique** `(userId, visitorHash)`.
- **ClickEvent**: `id`, `userId`, `targetType` (`PROJECT_REPO` | `PROJECT_LIVE` | `SOCIAL` | `RESUME` | `CONTACT`), `targetId?`, `visitorHash`, `createdAt`
- **LinkCheck**: `id`, `userId`, `url`, `sourceType`, `sourceId`, `status` (`OK` | `BROKEN` | `TIMEOUT` | `SKIPPED`), `httpStatus?`, `checkedAt`

All user-owned tables cascade-delete with the user.

---

## 4. Final API surface

All routes under `/api/v1`. "Auth" means a valid session cookie.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `GET /auth/me`, `GET /auth/username-available?u=`, `POST /auth/verify-email`, `/auth/resend-verification`, `/auth/forgot-password`, `/auth/reset-password` |
| Account | `PATCH /account/email`, `/account/username`, `/account/password`, `DELETE /account` |
| Profile | `GET`/`PATCH /profile`, `POST /profile/publish`, `/profile/unpublish`, `POST /profile/avatar`, `/profile/resume`, `DELETE` of both |
| Skills | `GET`/`POST /skills`, `PATCH`/`DELETE /skills/:id`, `PUT /skills/order` |
| Projects | `GET`/`POST /projects`, `PATCH`/`DELETE /projects/:id`, `POST /projects/:id/cover`, `PUT /projects/order` |
| Social | `GET`/`POST /social`, `PATCH`/`DELETE /social/:id`, `PUT /social/order` |
| Timeline | `GET`/`POST /timeline`, `PATCH`/`DELETE /timeline/:id`, `PUT /timeline/order` |
| Onboarding | `GET /onboarding/state`, `PUT /onboarding/step/:n`, `POST /onboarding/complete` |
| Share links | `GET`/`POST /share-links`, `PATCH`/`DELETE /share-links/:id` |
| Messages | `GET /messages`, `PATCH /messages/:id`, `DELETE /messages/:id`, `POST /portfolio/:username/messages` (public) |
| Public data | `GET /portfolio/:username`, `GET /portfolio/share/:token` (return 404 for drafts or revoked links) |
| Engagement | `POST /portfolio/:username/like`, `DELETE /portfolio/:username/like`, `POST /portfolio/:username/view`, `POST /portfolio/:username/click` |
| Analytics | `GET /analytics/summary`, `/analytics/timeseries`, `/analytics/sources`, `/analytics/devices`, `/analytics/clicks` |
| Health | `GET /health/report`, `POST /health/links/recheck` |
| Activity | `GET /activity` |
| System | `GET /healthz` |

---

# Phase 0: Foundation, cleanup and critical fixes

**Goal:** make the existing app correct and safe, and put the structure in place for everything after it. No new user-facing features yet.

### Tasks

**Project hygiene**
- Initialize git hygiene. `.env` stays ignored, a `.env.example` is added, and the old `.env` secrets are **rotated** (JWT secret, Resend key, database password) because they were in a shared zip.
- Split `server.js` into `app.js` (assembly) and `server.js` (listen) so the app can be tested.
- Add config validation at boot: the server refuses to start if a required env var is missing.
- Reorganize into the module folder structure from section 2 (move code, don't rewrite behavior).
- Remove the empty `models/` folder and the unused `/auth/onboarding/complete` endpoint.
- Add ESLint and Prettier and an `npm run lint` script.

**Security fixes**
- Escape every user value rendered into `innerHTML` (`githubUrl`, `repoUrl`, `liveUrl`, `contactPhone`, `contactEmail` and anything else). Prefer `textContent` and DOM creation.
- Add a shared `safeUrl()` validator allowing only `http:` and `https:`, applied in zod schemas, so `javascript:` URLs are rejected.
- Validate `contactPhone` against a phone pattern.
- Add `helmet` with a Content Security Policy and set it up for the font and icon CDNs in use.
- Add `express-rate-limit` globally, with stricter limits on auth and the contact endpoint.

**Behavior fixes**
- Remove `requireAuth` from the public portfolio read so logged-out visitors can see portfolios.
- Make optional fields **clearable**: zod schemas accept `null` or `""` for optional fields, and the frontend sends `null` instead of `undefined`.
- Introduce the standard error shape (D5) via a central `AppError` class and update the error middleware.
- Fix auth error display so field errors map to the right inputs and never print "[object Object]".
- Make onboarding **idempotent**: reject or replace rather than append on resubmission.
- Normalize emails and usernames to lowercase (migration for existing rows).
- Prevent duplicate skills with a unique index on `(userId, lower(name))` after de-duplicating existing rows.
- Add `orderBy` to every list query as an interim fix before real ordering lands.
- Stop rendering Code or Live buttons when the URL is empty, and hide sections that have no content.
- Block reserved usernames and restrict usernames to `a-z 0-9 -` (3 to 30 characters, no leading or trailing dash).
- Add `GET /healthz` and move API routes under `/api/v1`.

**Email**
- Document the Resend limitation (the test sender only delivers to the account owner) and make the `from` address a config value, with the display name **Devfolio** (for example `Devfolio <onboarding@resend.dev>` in development).

**Branding**
- Rename the package to `devfolio` in `package.json`, add an `APP_NAME` constant (`Devfolio`) in config, and use it for page titles on the landing and auth pages and in the README title.

### Success criteria

- [ ] App boots from a clean clone using only `.env.example` and the README steps.
- [ ] Server fails fast with a clear message when an env var is missing.
- [ ] A logged-out browser can open `/<username>` and see the portfolio.
- [ ] Saving `javascript:alert(1)` as any URL field is rejected with a field-level error.
- [ ] A phone value containing quotes or HTML is rejected, and no stored value can execute script on the public page (manually tested with a payload list).
- [ ] Clearing any optional field in the editor persists the empty value after reload.
- [ ] Every API error response matches the standard shape, and no UI ever shows "[object Object]".
- [ ] Submitting onboarding twice does not duplicate skills or projects.
- [ ] Adding the same skill twice returns a clear error.
- [ ] Signing up with `edit`, `Dashboard`, `a b` or `ab` is rejected.
- [ ] Hitting the login endpoint more than the limit returns HTTP 429.
- [ ] Empty sections and empty-URL buttons no longer render on the public page.
- [ ] Secrets rotated, and `.env` confirmed absent from version control.
- [ ] The package, README title and landing and auth page titles say **Devfolio**.
- [ ] `npm run lint` passes.

---

# Phase 1: Accounts and secure sessions

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

---

# Phase 2: Content model and editor API

**Goal:** the full content backend, so every portfolio feature has a place to live before any UI is built on it.

### Tasks

**Schema and migrations**
- Add the fields and tables from section 3: `Profile` extensions, `SocialLink`, `TimelineItem`, and `sortOrder`, `category`, `iconKey` and `isCustom` on `Skill`, plus `coverImageUrl`, `featured` and `sortOrder` on `Project`.
- Write a data migration that preserves existing users' content and sets initial `sortOrder` by creation order.

**Skills**
- Support **custom skills** (free-text name with a generic icon) alongside the preset list. Presets stay as suggestions rather than a hard enum.
- Add categories (for example Frontend, Backend, Tools) and levels.
- `PUT /skills/order` accepts an ordered array of IDs and validates ownership.

**Projects, social, timeline**
- CRUD endpoints for all three, with ownership checks and consistent ordering endpoints.
- `featured` projects are limited to a configurable maximum.

**Media uploads**
- Add `multer` with strict limits: avatar and cover images (JPEG, PNG or WebP, max 2 MB), resume (PDF, max 5 MB).
- Verify file type by **content signature**, not only extension. Re-encode or resize images with `sharp`.
- Generate random filenames, and serve uploads from a dedicated path with safe headers.
- Delete the old file when a new one replaces it.
- Put storage behind an interface (D6).

**Section configuration**
- `sectionConfig` JSON controls visibility and order of about, skills, projects, experience, education and contact. Validate it with zod.

**Shared concerns**
- All content endpoints validate input with zod and return the standard error shape.
- Bulk-order endpoints run in a transaction.

### Success criteria

- [ ] All migrations apply cleanly on a database that already holds Phase 0 data, and no existing content is lost.
- [ ] Every content type supports create, read, update, delete and reorder through the API (covered by tests).
- [ ] A user cannot read, edit, delete or reorder another user's items (tests prove 404 or 403).
- [ ] Custom skills can be added and rendered, and presets still appear as suggestions.
- [ ] Uploading a `.exe` renamed to `.png` is rejected, and oversized files are rejected with a clear message.
- [ ] Replacing an avatar removes the old file from disk.
- [ ] Reordering persists after reload, and public reads return items in saved order.
- [ ] Section visibility and order saved in `sectionConfig` are returned by the profile endpoint.

---

# Phase 3: Routing, onboarding wizard and dashboard shell

**Goal:** logged-in users land on a dashboard, new users get a guided first-run, and the app finally feels like a product.

### Tasks

**Routing and redirects**
- Server-side redirects based on the session:
  - `/`, `/login` and `/signup` → `/dashboard` when logged in.
  - `/dashboard`, `/settings` and `/onboarding` → `/login` when logged out.
  - A user who has not finished onboarding is sent to `/onboarding` from `/dashboard`.
  - A finished user visiting `/onboarding` goes to `/dashboard`.
- Login success always goes to `/dashboard` (or `/onboarding` for new users). Add a "back to dashboard" link to the portfolio owner bar.

**Onboarding wizard**
- Multi-step flow with a progress indicator: **Basics → About and roles → Skills → Projects → Links → Review**.
- Server-saved progress (`GET /onboarding/state`, `PUT /onboarding/step/:n`), so refresh or abandoning does not lose work.
- Steps beyond the basics can be skipped, and skipped sections are flagged in the dashboard for later.
- A live preview pane (desktop) shows the portfolio filling in as the user types.
- Helpful examples and placeholders, plus inline validation.

**Dashboard shell**
- Persistent layout: sidebar (Overview, Portfolio, Messages, Analytics, Health, Settings), top bar with publish status, "View public page" link and account menu.
- Responsive: the sidebar collapses to a bottom or hamburger nav on mobile.
- Shared components: toast notifications, confirm modal, loading skeletons, empty states, error states.
- **Settings page** UI for email, username, password and account deletion (wired to Phase 1 endpoints) and a **log out** button available everywhere in the dashboard.
- Overview page with placeholder cards that the later phases fill.

### Success criteria

- [ ] A logged-in user opening `/`, `/login` or `/signup` is redirected to `/dashboard` with no flash of the landing page.
- [ ] A logged-out user opening `/dashboard` lands on `/login`, and returns to the dashboard after logging in.
- [ ] A new user is guided through every wizard step, and closing the tab mid-wizard then returning resumes at the same step with data intact.
- [ ] Skipping steps still allows finishing, and the dashboard lists what was skipped.
- [ ] The live preview updates as the user types.
- [ ] The dashboard shell renders correctly at 360 px, 768 px and 1280 px widths.
- [ ] Every settings action works end to end (change password, change username, delete account).
- [ ] Logout is reachable from every dashboard page.

---

# Phase 4: Live preview, inline editing and publishing

**Goal:** the signature feature. The owner sees their real portfolio inside the dashboard and edits it directly, with changes saved safely, and controls publication.

### Tasks

**Live preview**
- Render the portfolio in the dashboard using the **same render code** as the public page (shared template or component), so preview and public cannot drift apart.
- Device toggle (desktop, tablet, mobile) to preview responsive layouts.

**Inline editing (done carefully)**
- Click-to-edit on text fields (name, headline, about, role phrases, project titles and descriptions), skill levels, links and section titles.
- Use `contenteditable` or swapped inputs only where needed, and **always read back via `textContent`** (never `innerHTML`) to stay XSS-safe.
- Plain-text paste only. Enforce max lengths and show a character counter on long fields.
- Edit controls (add, remove, reorder, hide section) appear on hover or focus and are keyboard accessible.
- Complex edits (adding a project, uploading images, the resume) open a side panel or modal form instead of inline.
- **Drag-and-drop reordering** for skills, projects and sections (with keyboard-accessible move up and down buttons).
- Image upload UI for avatar and project covers with crop or preview.

**Autosave**
- Debounced autosave per field with a visible status: *Saving… → Saved → Failed (Retry)*.
- A queue prevents out-of-order writes, and unsaved changes trigger a warning if the user leaves.
- Failed saves keep the typed value and allow retry.
- Optimistic updates with rollback on failure.

**Publishing**
- `POST /profile/publish` and `/unpublish`. **New portfolios default to Draft.**
- Publish requires a verified email and passes a minimum completeness gate (display name and about text at minimum).
- Draft portfolios return the "not available" page to the public but remain visible to the owner and via private share links.
- Publish dialog shows what will happen, the public URL, and a link to the health report (Phase 8) when available.
- Status badge (Draft / Published) and a **Publish** or **Unpublish** button always visible in the top bar.

### Success criteria

- [ ] The preview in the dashboard is pixel-identical to the public page for the same data (same code path).
- [ ] Every text field on the preview can be edited in place and persists after reload.
- [ ] Pasting rich HTML or `<script>` into an editable field results in plain text only.
- [ ] Autosave shows all three states, and a forced network failure shows "Failed" with a working Retry without losing the text.
- [ ] Rapid typing never causes older values to overwrite newer ones.
- [ ] Reordering by drag and by keyboard both work and persist.
- [ ] Unpublished portfolios return the "not available" page to a logged-out visitor, and the owner can still preview them.
- [ ] An unverified user cannot publish and sees why.
- [ ] Leaving the page with unsaved or failed changes prompts a warning.
- [ ] All inline-edit paths are covered by at least one automated or scripted UI test.

---

# Phase 5: Public portfolio, SEO and sharing

**Goal:** a fast, shareable, search-friendly public page and a mature sharing system.

### Tasks

**Server-rendered public page**
- `/:username` rendered on the server from a template using the shared render code from Phase 4, with only the data the public needs (no internal IDs or emails that were not meant to be public).
- Proper 404 and "This portfolio isn't published yet" pages, with correct HTTP status codes.
- Sections obey `sectionConfig` order and visibility, and empty sections are not rendered.
- Render **experience and education timeline**, social links, resume download button and avatar.
- Per-page `<title>` and meta description, canonical URL, `robots` rules (draft pages `noindex`).

**Link previews and SEO**
- Open Graph and Twitter Card tags (`og:site_name` = Devfolio), with a default share image generated from name and headline (or the user's custom `ogImageUrl`).
- JSON-LD `Person` structured data.
- Auto-generated `/sitemap.xml` (published portfolios only) and `/robots.txt`.

**Sharing**
- Replace the single `shareToken` with the `ShareLink` table: **multiple private links**, each with a **label** and optional **expiry**.
- Tokens stored hashed and shown **once** on creation, with copy buttons.
- **Revoke** with a confirmation, and clear states for active, expired and revoked links.
- Private links work for **drafts** and are `noindex`.
- Share panel in the dashboard: public URL copy, QR code, quick links (LinkedIn, X, email), and per-link view counts (using Phase 7 data).
- Migrate existing `shareToken` values into `ShareLink`.

### Success criteria

- [ ] Viewing page source of `/<username>` shows the real name in `<title>` and populated meta and Open Graph tags (no JavaScript required).
- [ ] Pasting the URL into a link-preview debugger (LinkedIn, X, or Slack) shows the title, description and image.
- [ ] A draft portfolio returns the correct status code and `noindex`, and does not appear in the sitemap.
- [ ] The page renders correctly with JavaScript disabled for content (animations may degrade).
- [ ] Private links: create, label, expire, and revoke all work, and expired and revoked links show a clear message.
- [ ] A private link opens a draft portfolio, and the public URL for the same draft does not.
- [ ] Existing share tokens from before the migration still work after it.
- [ ] Lighthouse on the public page scores **90+** for Performance, Accessibility, Best Practices and SEO on mobile.

---

# Phase 6: Messages and inbox

**Goal:** contact messages become a real feature instead of a fire-and-forget email.

### Tasks

**Capture and protect**
- Store every message in `Message`, then send the notification email (email failure must **not** lose the message).
- Spam protection: honeypot field, minimum time-to-submit check, per-IP and per-portfolio rate limits, length limits, and optional Cloudflare Turnstile (feature-flagged).
- Block messages to unpublished portfolios (except via private links).
- Validate and sanitize all fields. Escape everything in the email body and in the inbox.

**Inbox UI**
- Messages page with list and detail view, unread badge in the sidebar, and unread count on the overview.
- Mark read or unread, **archive**, delete (with confirm), and filter by status.
- Reply button opening the user's mail client with the sender's address prefilled (reply-to from the visitor).
- Pagination and search by sender or text.

**Notifications**
- Email notification with a link to the dashboard inbox, and a setting to turn email notifications on or off.
- Messages appear in the activity feed.

**Email delivery**
- Verified sending domain configured with Resend, with the `from` address from config.

### Success criteria

- [ ] Every submitted message appears in the inbox, even if the email provider is forced to fail.
- [ ] The notification email arrives at the owner's contact email (or account email if blank) for a verified-domain setup.
- [ ] A bot-style submission (honeypot filled, or submitted instantly) is rejected without creating a message.
- [ ] Exceeding the rate limit returns 429 and shows a friendly message to the visitor.
- [ ] HTML or script in a message renders as plain text everywhere (inbox and email).
- [ ] Read, archive and delete states persist, and the unread badge stays accurate.
- [ ] Messages to a draft portfolio via the public URL are rejected.
- [ ] Turning off email notifications stops emails but still stores messages.

---

# Phase 7: Analytics and likes

**Goal:** the dashboard shows how the portfolio is performing, and visitors can like it.

### Tasks

**Collection**
- Lightweight beacon from the public page (`POST /view`) recording one `View` per visit with the hashed visitor ID (`ip + user-agent + daily salt`), referrer **host** only, and device type from the user agent.
- Exclude: the owner's own visits (session check), known bots (user-agent list), and repeat refreshes by the same visitor within a short window.
- Record `ClickEvent` for project repo and live links, social links, resume download and contact submit. Use `sendBeacon` so tracking never blocks navigation.
- Tracking failure must never affect page load or interaction.

**Likes**
- Heart button on the public page. Anonymous, **one like per visitor hash**, toggleable (like or unlike).
- Show the like count on the public page and in the dashboard.
- Rate limit like and unlike, and do not allow likes on drafts.

**Aggregation and API**
- Endpoints for summary totals, **time series** (7 / 30 / 90 days), unique vs total views, top referrers, device split and clicks per project or link.
- Database indexes on `(userId, createdAt)` for fast queries.
- Data retention job: raw views older than the retention window (for example 13 months) are rolled up into daily aggregates and purged.

**Dashboard UI**
- Overview cards: views, unique visitors, likes, clicks, unread messages (with change vs the previous period).
- Charts: views over time, referrer breakdown, device split, top projects by clicks. Use a small chart library or inline SVG, with accessible text alternatives.
- Date-range selector and an **activity feed** (recent views, likes, messages and clicks combined).
- Friendly empty states ("No views yet. Share your link!").

**Privacy**
- Plain-language privacy note on the dashboard and a public privacy statement. No raw IPs stored, and no third-party tracker.

### Success criteria

- [ ] Opening the public page twice from one browser within the window counts as one unique visitor and the expected number of views.
- [ ] The owner viewing their own portfolio does not increase counts.
- [ ] A request with a known bot user-agent is not counted.
- [ ] Clicking a project link records a click and still navigates immediately.
- [ ] With the analytics endpoint forced to fail, the public page works normally.
- [ ] Liking twice from the same visitor results in one like, and unliking removes it.
- [ ] Dashboard numbers match a manual database count for a seeded test dataset.
- [ ] Charts load in under 1 second for 100,000 seeded view rows.
- [ ] The database contains no raw IP addresses (verified by schema and sample rows).
- [ ] The retention job runs and old raw rows are rolled up with totals preserved.

---

# Phase 8: Portfolio health

**Goal:** tell the owner how good their portfolio is and exactly what to do to make it better.

### Tasks

**Health score (0 to 100)**
A weighted score from four categories, calculated on the server:
- **Completeness (about 40%):** photo, headline, about length, role phrases, at least N skills, at least N projects, project descriptions, links filled, resume attached, and a timeline entry.
- **Links (about 25%):** share of repo, live and social links that currently resolve.
- **SEO (about 20%):** custom title, description length, preview image set, avatar alt data and a published state.
- **Contact (about 15%):** valid contact email, verified account email, and a message-delivery test that passes.

**Link checker**
- Cron job and on-demand "Recheck" to request each saved URL (HEAD with GET fallback, redirects followed, short timeout, concurrency limit).
- Store results in `LinkCheck` (`OK`, `BROKEN`, `TIMEOUT`, `SKIPPED`).
- **SSRF protection is mandatory:** block private, loopback and link-local IP ranges (including after DNS resolution and redirects), allow only `http(s)`, cap response size, and set a custom user-agent.
- Rate limit the manual recheck.
- Treat some sites that block bots as `SKIPPED` rather than broken, to avoid false alarms.

**Suggestions engine**
- Turn failed checks into a **prioritized list** ("Add a project description", "Your Live link for *X* is returning 404", "Upload a profile photo"), ordered by points gained.
- Each suggestion has a **one-click "Fix" action** that jumps to the exact field in the editor.
- Dismissible suggestions that stay dismissed.

**Dashboard UI**
- Score ring with category breakdown, trend since last check, suggestion list and per-link status table.
- Warning shown on the publish dialog if the score is low or links are broken, as advice and never a block.

### Success criteria

- [ ] An empty portfolio scores low, and a complete portfolio scores 90+ (verified with two fixtures).
- [ ] Adding a missing item raises the score by the amount the suggestion promised.
- [ ] A deliberately broken URL is flagged as `BROKEN`, and fixing it clears the flag after a recheck.
- [ ] Requests to `http://127.0.0.1`, `http://169.254.169.254` and a hostname resolving to a private IP are refused by the checker (SSRF tests pass).
- [ ] A redirect chain ending at a private IP is also refused.
- [ ] The link check never blocks the web server, and failures are logged without crashing.
- [ ] Each suggestion's "Fix" button lands on the correct field.
- [ ] The manual recheck is rate limited and shows progress.

---

# Phase 9: Themes, landing page and polish

**Goal:** make it look and feel excellent: themes, dark mode, the front door of the product, and a full UX pass.

### Tasks

**Themes**
- Theme system built on CSS variables with **3 to 5 templates** (for example Editor, Minimal, Bold, Gradient) and an **accent colour** picker with contrast validation.
- **Dark mode** for the dashboard and for portfolios (portfolio default chosen by owner, with visitor toggle that respects `prefers-color-scheme`).
- Theme chooser in the dashboard with a live preview, and theme saved in `Profile`.

**Landing page**
- Real marketing page: value proposition, how it works (3 steps), feature highlights, **live sample portfolio** (a demo account or embedded preview), and clear calls to action.
- Footer with privacy and terms pages.

**UX polish**
- Consistent micro-interactions, loading skeletons, empty states, success toasts and friendly error pages (404, 500, expired link).
- **Confirmation on destructive actions** (delete project, skill, message, account, revoke link) and **undo toasts** where practical.
- Keyboard shortcuts for common actions (save, publish) and visible focus states.
- Copy review: replace generic errors like "Something went wrong" with specific, actionable messages.
- Respect `prefers-reduced-motion` everywhere, including new animations.

**Accessibility and responsiveness**
- WCAG AA contrast on all themes and accent colours, labels for all form fields, ARIA for tabs, modals, drag-and-drop and live regions.
- Audit at 320 px, 768 px, 1024 px and 1440 px.

### Success criteria

- [ ] Switching theme or accent changes the preview instantly and persists on the public page.
- [ ] All themes pass AA contrast checks (automated check on tokens), and a bad accent colour is warned or blocked.
- [ ] Dark mode has no unreadable text or invisible borders on any page.
- [ ] The landing page includes a working sample portfolio and loads fast (Lighthouse Performance 90+).
- [ ] Every destructive action asks for confirmation or offers undo.
- [ ] A keyboard-only user can complete signup, onboarding, editing, publishing and logout.
- [ ] axe (or equivalent) reports **no critical or serious** issues on any page.
- [ ] No horizontal scrolling at 320 px on any page.

---

# Phase 10: Hardening, testing and launch

**Goal:** make it reliable, observable, documented and deployable.

### Tasks

**Testing**
- API test suite with Supertest: auth, ownership isolation, validation, uploads, sharing, messages, analytics and health.
- A small end-to-end suite (Playwright): signup → onboarding → edit → publish → visitor views → like → message → analytics appear.
- CI runs lint and tests on every push and blocks merges on failure.
- Seed script producing a realistic demo dataset (also used for the landing sample).

**Security review**
- Re-run the XSS payload list against every rendered field, including inline edit paths and emails.
- Check security headers, cookie flags, CORS, upload handling, rate limits and the SSRF protections.
- Dependency audit (`npm audit`) and a plan to update.
- Confirm no secrets in code or git history.

**Reliability and observability**
- Structured logging (pino without pretty transport in production), request IDs and log redaction for sensitive fields.
- Graceful shutdown, DB connection handling, and process manager config.
- Error reporting (for example Sentry) with a basic alert on error spikes.
- Daily database backups and a documented, **tested restore**.

**Performance**
- Indexes reviewed against real queries, gzip or brotli compression, cache headers for static assets and short caching for public pages (invalidated on publish and edit).
- Image optimization (responsive sizes) for avatars and covers.

**Documentation and launch**
- README: setup, env vars, scripts, architecture diagram and API overview.
- Deployment guide (hosting, managed Postgres, storage, domain, email domain verification, cron).
- Production checklist, privacy policy and terms pages.
- Staging environment mirroring production.

### Success criteria

- [ ] CI is green, with API test coverage on all critical paths and the E2E happy path passing.
- [ ] A stranger can clone the repo, follow the README and run the app in under 15 minutes.
- [ ] Security checklist completed with zero open high-severity issues, and `npm audit` shows no high or critical vulnerabilities.
- [ ] Logs show request IDs and contain no passwords, tokens or full email bodies.
- [ ] A backup was restored successfully into a clean database.
- [ ] Load test of the public page (for example 50 concurrent users) stays responsive with p95 under 500 ms.
- [ ] Production deployment is live with HTTPS, a verified email domain and working cron jobs.

---

# Appendix A: Fix traceability

Every issue found in the original code review maps to a phase.

| Issue | Fixed in |
|---|---|
| Public portfolio requires login | Phase 0 |
| Optional fields cannot be cleared | Phase 0 |
| Stored XSS in links and phone | Phase 0 (and re-tested in Phases 4, 6, 10) |
| `javascript:` URLs accepted | Phase 0 |
| "[object Object]" in auth errors | Phase 0 |
| Unstable skill and project order | Phase 0 (interim), Phase 2 (real ordering) |
| Onboarding resubmit duplicates data | Phase 0 |
| Unused `/auth/onboarding/complete` endpoint | Phase 0 |
| No rate limiting on contact or auth | Phase 0, Phase 6 |
| Resend test sender limitation | Phase 0 (config), Phase 6 (verified domain) |
| Duplicate skills allowed | Phase 0 |
| Case-sensitive username and email | Phase 0 |
| Empty `models/` folder | Phase 0 |
| `.env` secrets shared in the zip | Phase 0 (rotate), Phase 10 (verify) |
| Reserved usernames collide with routes | Phase 0 |
| Empty-URL "Code" and "Live" buttons show as `#` | Phase 0 |
| Empty sections render only a heading | Phase 0, Phase 5 |
| Landing page does not redirect logged-in users | Phase 3 |
| Logout missing outside the portfolio page | Phase 3 |
| Inconsistent saving in editor and no feedback | Phase 4 |
| Instant deletes with no confirmation | Phase 9 (and Phase 3 modal component) |
| Share link regenerated or revoked without confirm | Phase 5 |
| Page title and meta set by JavaScript only | Phase 5 |
| Messages not stored | Phase 6 |
| Token in `localStorage` | Phase 1 |

---

# Appendix B: Feature traceability

Every feature from the project definition and where it is delivered.

| Feature | Phase |
|---|---|
| Signup and login with clear field errors | 0, 1 |
| Email verification | 1 |
| Password reset | 1 |
| Account settings (email, username, password) | 1 (API), 3 (UI) |
| Account deletion | 1 (API), 3 (UI) |
| Secure sessions | 1 |
| Onboarding wizard with live preview and skip | 3 |
| Dashboard as logged-in home, with `/` redirect | 3 |
| Overview cards | 3 (shell), 7 (data) |
| Live portfolio preview | 4 |
| Inline editing | 4 |
| Autosave with feedback | 4 |
| Quick actions (publish, share, edit, view) | 3, 4, 5 |
| Activity feed | 7 |
| Profile (headline, location, avatar, role phrases) | 2, 4 |
| Skills (preset plus custom, categories) | 2, 4 |
| Projects (cover image, featured) | 2, 4 |
| Social links | 2, 4 |
| Experience and education | 2, 4, 5 |
| Resume upload and download | 2, 4, 5 |
| Reordering | 2, 4 |
| Section visibility | 2, 4, 5 |
| Themes and dark mode | 9 |
| Completeness score, link checker, SEO check, contact check, suggestions | 8 |
| Views, unique visitors, sources, devices, project clicks | 7 |
| Likes | 7 |
| Privacy by design (hashed IPs, owner excluded) | 7 |
| Public portfolio (no login, mobile layout) | 0, 5 |
| Open Graph and share previews | 5 |
| Draft protection | 4, 5 |
| Contact form with spam protection | 6 |
| Message inbox, read, archive, delete | 6 |
| Email notification of messages | 6 |
| Public link and private share links, revoke, expiry | 5 |
| Reserved usernames and username rules | 0 |
| Idempotent onboarding | 0 |
| Clearable fields | 0 |
| Stable ordering | 0, 2 |
| Server-side rendering for SEO | 5 |
| Security (escaping, URL allowlist, rate limits, headers) | 0, 10 |
| Accessibility and responsiveness | 3, 9 |
| Tests and maintainability | 0, 10 |
| Secrets hygiene | 0, 10 |

---

# Appendix C: Global definition of done

A phase is complete only when **all** are true:

- [ ] Every success criterion in the phase is ticked.
- [ ] New and changed endpoints have validation, ownership checks, and automated tests.
- [ ] New UI works at 360 px and 1280 px widths, and with keyboard only.
- [ ] No new `innerHTML` with user-controlled data.
- [ ] Migrations are committed, reversible where possible, and tested on a copy of existing data.
- [ ] `.env.example` and README are updated for any new config.
- [ ] The app starts from scratch, and the previous phase's flows still work (regression pass).
