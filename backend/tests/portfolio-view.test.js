import { it } from "node:test";
import assert from "node:assert/strict";
import { portfolioView, viewToHtml } from "../../frontend/js/portfolioView.js";
it("escapes stored values and excludes unsafe links in the shared renderer", () => {
  const html = viewToHtml(
    portfolioView({
      username: "developer",
      profile: {
        displayName: "<script>alert(1)</script>",
        avatarUrl: "/uploads/avatars/photo.webp",
        resumeUrl: "/uploads/resumes/file.pdf",
      },
      projects: [
        {
          title: "<img onerror=alert(1)>",
          repoUrl: "javascript:alert(1)",
          liveUrl: "https://example.com/?x=1&y=2",
        },
      ],
    }),
  );
  assert.doesNotMatch(html, /<script>|javascript:|<img onerror/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /\/uploads\/avatars\/photo.webp/);
  assert.match(html, /\/uploads\/resumes\/file.pdf/);
  assert.match(html, /x=1&amp;y=2/);
});
it("honors section order and visibility and renders timeline entries", () => {
  const html = viewToHtml(
    portfolioView({
      username: "dev",
      profile: {
        aboutText: "About me",
        sectionConfig: {
          about: { visible: false, order: 5 },
          education: { visible: true, order: 0 },
        },
      },
      timelineItems: [
        {
          type: "EDUCATION",
          title: "Degree",
          organization: "University",
          startDate: "2020-01-01",
          endDate: null,
        },
      ],
    }),
  );
  assert.doesNotMatch(html, /id="about"/);
  assert.match(html, /Degree/);
  assert.ok(html.indexOf('id="education"') < html.indexOf('id="contact"'));
});
