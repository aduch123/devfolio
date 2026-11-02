import { it } from "node:test";
import assert from "node:assert/strict";
import { healthScore } from "../modules/health/score.js";
const complete = () => ({
  email: "owner@example.com",
  emailVerifiedAt: new Date(),
  profile: {
    displayName: "Developer",
    avatarUrl: "/uploads/avatars/photo.webp",
    headline: "Engineer",
    aboutText: "a".repeat(100),
    heroRoleTexts: ["apps"],
    resumeUrl: "/uploads/resumes/cv.pdf",
    location: "Addis Ababa",
    seoTitle: "Developer portfolio",
    seoDescription: "a".repeat(100),
    published: true,
  },
  skills: Array(5).fill({}),
  projects: [{ id: "first", description: "a".repeat(50) }, { id: "second" }],
  socialLinks: [{}],
  timelineItems: [{}],
});
const checks = [{ status: "OK", sourceType: "PROJECT_REPO", sourceId: "first" }];
it("scores empty and complete fixtures and reports promised marginal improvements", () => {
  assert.equal(healthScore({ profile: {} }).score, 0);
  const user = complete(),
    full = healthScore(user, checks, { delivered: true });
  assert.equal(full.score, 100);
  user.profile.avatarUrl = null;
  const partial = healthScore(user, checks, { delivered: true });
  const suggestion = partial.suggestions.find((item) => item.key === "avatar");
  assert.equal(full.score - partial.score, suggestion.points);
  assert.equal(suggestion.points, 8);
});
it("calculates link repair gains and preserves dismissals without changing scores", () => {
  const user = complete(),
    broken = [...checks, { status: "BROKEN", sourceType: "SOCIAL", sourceId: "social" }];
  const before = healthScore(user, broken, { delivered: true });
  const after = healthScore(
    user,
    broken.map((row) => ({ ...row, status: "OK" })),
    { delivered: true },
  );
  assert.equal(
    after.score - before.score,
    before.suggestions.find((item) => item.key.startsWith("link:")).points,
  );
  const dismissed = healthScore(user, broken, {
    delivered: true,
    dismissed: ["link:SOCIAL:social"],
  });
  assert.equal(dismissed.score, before.score);
  assert.equal(dismissed.suggestions.length, 0);
});
