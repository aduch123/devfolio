# PHASE 3 PLAN: Routing, onboarding wizard and dashboard shell

Goal: logged-in users land on a dashboard, new users get a guided first run, and the app feels like a product. Source: Phase 3 in `BUILD_PLAN.md`. Built as 5 subphases, one commit each on `phase-3-dashboard`. Batches: 3.1 + 3.2, then 3.3 + 3.4, then 3.5.

**Decisions (approved):** redirects are decided on the server from a live session (access cookie read ignoring expiry plus a database check; see HANDOFF section 4); the top bar badge says `Public` until Phase 4 adds draft and publish; settings is reachable before onboarding is finished; `POST /onboarding` and the old `onboarding.html` stay until 3.4 replaces them; skipped steps live in `OnboardingDraft.skipped` and persist after completion; `/edit` is untouched (Phase 4 replaces it); no new dependencies.

| # | Subphase | Tasks | Success criteria |
|---|---|---|---|
| 3.1 | Routing and redirects | Server-side redirects: `/`, `/login`, `/signup` to `/dashboard` when logged in; `/dashboard`, `/settings`, `/onboarding` to `/login` (with `?next=`) when logged out; unfinished onboarding goes to `/onboarding`, finished users leave it. Login success goes to `/dashboard` or `/onboarding`. "Dashboard" button on the portfolio owner bar. | No flash of the landing page when logged in; login returns to the page you came from; no redirect loops. |
| 3.2 | Dashboard shell and settings | Sidebar (Overview, Portfolio, Messages, Analytics, Health, Settings) that becomes a bottom bar on mobile; top bar with status, "View public page" and account menu; toast, confirm modal, skeleton, empty and error components; Overview placeholder cards; settings UI for password, email, username and account deletion; log out everywhere. | Correct at 360, 768 and 1280 px; every settings action works end to end; logout reachable from every dashboard page. |
| 3.3 | Wizard backend | `OnboardingDraft` table (`userId` unique, `step`, `data` JSON, `skipped` list) and migration. `GET /onboarding/state`, `PUT /onboarding/step/:n` (n 1 to 5, zod per step, step 1 not skippable), `POST /onboarding/complete` (writes Profile, Skill, Project and SocialLink rows in one transaction). | Progress survives refresh; complete is atomic and gives 409 `ALREADY_ONBOARDED` the second time. |
| 3.4 | Wizard UI | Basics, About and roles, Skills, Projects, Links, Review; progress indicator; resume at the saved step; skip on steps 2 to 5; live preview pane on desktop; examples and inline validation; dashboard lists skipped sections; old route and page removed. | Closing the tab mid-wizard resumes at the same step with data intact; skipping still allows finishing; preview updates as you type. |
| 3.5 | Tests and wrap-up | `node:test` and Supertest for the new endpoints (at least 3 failure paths each) and for page redirects; smoke script update; Prettier commit; close the phase. | `npm test` passes; Phase 3 merged with `--no-ff` and tagged `phase-3-complete`. |

**Phase 3 success criteria** (from `BUILD_PLAN.md`)
- A logged-in user opening `/`, `/login` or `/signup` is redirected to `/dashboard` with no flash of the landing page.
- A logged-out user opening `/dashboard` lands on `/login`, and returns to the dashboard after logging in.
- A new user is guided through every wizard step, and closing the tab mid-wizard then returning resumes at the same step with data intact.
- Skipping steps still allows finishing, and the dashboard lists what was skipped.
- The live preview updates as the user types.
- The dashboard shell renders correctly at 360 px, 768 px and 1280 px widths.
- Every settings action works end to end (change password, change username, delete account).
- Logout is reachable from every dashboard page.
