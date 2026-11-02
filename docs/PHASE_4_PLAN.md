# PHASE 4 PLAN: Live preview, inline editing and publishing

Goal: the owner sees their real portfolio inside the dashboard, edits it in place with safe autosave, and controls whether it is public. Source: Phase 4 in `BUILD_PLAN.md`. Built as 5 subphases, one commit each on `phase-4-editor`. Batches: 4.1 + 4.2, then 4.3 + 4.4, then 4.5.

**Decisions (approved by user for implementation, 2026-11-02):**
1. Users who already finished onboarding become `Published` in the migration (nobody's page disappears); new portfolios start as `Draft`.
2. The preview is a same-origin **iframe** of the shared render (media queries need a real viewport for the tablet and mobile toggle); editing happens inside the frame and status is passed up to the dashboard. CSP `frame-ancestors` changes from `'none'` to `'self'`; nothing else is loosened.
3. The owner reads a draft through a new `GET /portfolio/me` (login required, same shape as the public response). `PUBLIC_PORTFOLIO_SELECT` stays the only public surface.
4. Unverified users can edit but cannot publish (403 `EMAIL_NOT_VERIFIED`) and the dialog says why; unpublish is always allowed.
5. The shared renderer also covers experience and education (rendering in 4.2, editing in 4.4).
6. No new dependencies: editing logic is written as DOM-free modules covered by `node:test`; browser testing is deferred at the user’s explicit request to conserve tokens; use focused syntax, lint and unit/API checks.
7. `/edit`, `edit.js` and `edit.css` are removed in 4.4, once the new editor covers everything they did.

**Out of scope:** server-rendered public page, SEO and "not available" pages (Phase 5); blocking messages to drafts (Phase 6); health link in the publish dialog (Phase 8). Until Phase 5 the public page shows a simple "not available" state for a draft.

| # | Subphase | Tasks | Success criteria |
|---|---|---|---|
| 4.1 | Publish backend and draft protection | Migration: `Profile.published` (bool) and `publishedAt`; existing finished users set to published. `POST /profile/publish` (verified email; display name and about text present; 403 `EMAIL_NOT_VERIFIED`, 400 `INCOMPLETE_PROFILE`) and `POST /profile/unpublish`. `GET /portfolio/:username` returns 404 for drafts; share links still work for drafts. `GET /portfolio/me` for the owner. Top bar: Draft or Published badge and a Publish or Unpublish button with a confirm dialog (what happens, public URL, reason when blocked). `published` shown in the `GET /profile` response. | New portfolios are Draft; a logged-out visitor gets 404 for a draft and 200 after publish; a share link opens a draft; unverified users see why they cannot publish; unpublish always works; the owner still sees the draft. |
| 4.2 | Shared render and live preview | One `render.js` used by `portfolio.js` and the preview, extended to headline, location, avatar, social links, experience, education, section order and visibility (empty sections stay hidden). Dashboard **Portfolio** page with the iframe preview and a desktop, tablet and mobile toggle. Preview route behind login, `frame-ancestors 'self'`. | The preview and the public page use the same code and look identical for the same data; the toggle shows true responsive layouts; no `innerHTML` with stored values. |
| 4.3 | Inline text editing and autosave | Click-to-edit on name, headline, about, role phrases, project titles and descriptions, and section titles. Plain-text paste only, read back via `textContent`, max lengths and a counter on long fields. Per-field debounced autosave with Saving, Saved and Failed (Retry); an ordered write queue; optimistic update with rollback; failed saves keep the text; `beforeunload` warning on unsaved or failed changes. DOM-free `saveQueue` and `pasteText` modules. | Edits persist after reload; pasting HTML or `<script>` gives plain text; a forced network failure shows Failed and Retry works without losing text; rapid typing never lets an older value overwrite a newer one; leaving with pending changes prompts. |
| 4.4 | Lists, uploads and reordering | Side panels or modals for adding and editing projects, skills (including custom), links and timeline items. Avatar, project cover and resume upload with preview. Drag-and-drop plus keyboard move up and down for skills, projects and sections. Show and hide sections. Edit controls on hover and focus, keyboard accessible. Remove `/edit`, `edit.js`, `edit.css`; "Finish setting up" links point to the new editor. | Everything `/edit` did works in the preview; reordering by drag and by keyboard both persist; uploads show a preview and survive reload; hidden sections disappear from the public page. |
| 4.5 | Tests and wrap-up | `node:test` and Supertest for publish, unpublish, draft 404, share link on a draft and `GET /portfolio/me` (at least 3 failure paths each); unit tests for `saveQueue` and `pasteText`; scripted browser pass for the inline paths; smoke script update; Prettier commit; close the phase. | `npm test` passes; every inline-edit path has at least one automated or scripted test; Phase 4 merged with `--no-ff` and tagged `phase-4-complete`. |

**Phase 4 success criteria** (from `BUILD_PLAN.md`)
- The preview in the dashboard is pixel-identical to the public page for the same data (same code path).
- Every text field on the preview can be edited in place and persists after reload.
- Pasting rich HTML or `<script>` into an editable field results in plain text only.
- Autosave shows all three states, and a forced network failure shows "Failed" with a working Retry without losing the text.
- Rapid typing never causes older values to overwrite newer ones.
- Reordering by drag and by keyboard both work and persist.
- Unpublished portfolios return the "not available" page to a logged-out visitor, and the owner can still preview them.
- An unverified user cannot publish and sees why.
- Leaving the page with unsaved or failed changes prompts a warning.
- All inline-edit paths are covered by at least one automated or scripted UI test.

## Acceptance scope — 2026-11-02

At the user's request, browser/layout testing is deferred to conserve tokens. A lightweight DOM adapter exercises the actual inline handlers for all six section titles, name, about, roles, headline, location, project title and description. It checks generated requests, plain-text paste, failed-save retention, retry and unsaved-change warnings. This does not establish visual parity, real-browser interaction, drag geometry, responsive layout or pixel accuracy. Those remain documented validation limits rather than claimed results. API tests cover draft access, owner reads, publish requirements, unpublish, private draft links, section config and routes. Full regression, lint and configured formatting checks gate the Phase 4 merge.

**Final non-browser validation:** 136 tests pass; lint, repository-configured Prettier and 11 smoke checks pass. Phase implementation is accepted under the user-requested browser-testing deferral. Push, no-ff merge and completion tag follow this closure commit.
