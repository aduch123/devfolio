# PHASE 1 PLAN: Accounts and secure sessions

Goal: a complete, secure account system, from signup to recovery and deletion. Built as 7 subphases, one commit each on `phase-1-accounts`. Batches: 1.1 + 1.2, then 1.3 + 1.4 + 1.5, then 1.6 + 1.7.

**Decisions (approved):** deletion grace window 14 days; after a username change the old URL returns 404 (no redirect), documented; signup keeps the 409 "already in use" answer; tests use a separate `DATABASE_URL_TEST`; new dependencies `cookie-parser` (1.1), `node-cron` (1.6), `supertest` (1.7).

| # | Subphase | Tasks | Success criteria |
|---|---|---|---|
| 1.1 | Session backend | `Session` table (hashed rotating refresh token, reuse detection with a 10 s grace). `POST auth/refresh`, `POST auth/logout`, `GET auth/me`. httpOnly `SameSite=Lax` cookies (access 15 min, refresh 30 days, `Secure` in production). Origin check on state-changing requests. | Cookies are HttpOnly; refresh rotates; a reused old token after the grace window revokes the session; logout kills the refresh token server-side; foreign Origin gets 403 `BAD_ORIGIN`. |
| 1.2 | Frontend sessions | No token in `localStorage`. `apiFetch` sends cookies, refreshes once on 401 and retries, redirects to login only if the refresh fails. `authGuard` uses `/auth/me`. `/onboarding` and `/edit` redirect server-side without a session. Bearer support removed. | After the access cookie expires, a user mid-session continues; parallel 401s trigger one refresh; logout ends the session. |
| 1.3 | Signup and login UX | Separate `/signup` and `/login` pages; debounced username availability; show/hide password, strength hint, confirm field; inline errors; generic login failures (no timing leak). | Live availability and per-field errors. |
| 1.4 | Email verification | `emailVerifiedAt`; hashed single-use token table (24 h); verification email on signup; `/verify-email` page; rate-limited resend. | Link works once; expired or reused link gives a helpful message. |
| 1.5 | Password reset | `/forgot-password` (identical reply for any email), `/reset-password` (consumes token, revokes all sessions). | Identical responses; other sessions logged out. |
| 1.6 | Account settings API | Change password (current password required), email (re-verify), username (reserved list, uniqueness); delete account (password, soft delete, revoke sessions, `node-cron` hard delete after 14 days; also purges expired sessions). | Deleted account loses access at once; rows gone after the grace window. |
| 1.7 | Auth tests | `node:test` + Supertest against `DATABASE_URL_TEST`; happy path plus at least 3 failure paths per auth endpoint. | `npm test` passes. |
