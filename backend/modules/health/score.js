import { requiredEmail } from "../../utils/validators.js";
export const fixLink = (path = "profile", id = "profile", field = "displayName") =>
  `/dashboard/portfolio?focus=${encodeURIComponent(`${path}:${id}:${field}`)}`;
export function healthScore(user, checks = [], { delivered = false, dismissed = [] } = {}) {
  const p = user.profile || {},
    projects = user.projects || [],
    skills = user.skills || [],
    timeline = user.timelineItems || [],
    socials = user.socialLinks || [];
  const suggestions = [],
    categories = { completeness: 0, links: 0, seo: 0, contact: 0 };
  function credit(category, key, ok, points, label, fix) {
    if (ok) categories[category] += points;
    else suggestions.push({ key, label, points, fix });
  }
  credit(
    "completeness",
    "avatar",
    !!p.avatarUrl,
    4,
    "Upload a profile photo",
    fixLink("media", "profile", "avatar"),
  );
  credit("completeness", "name", !!p.displayName?.trim(), 2, "Add your display name", fixLink());
  credit(
    "completeness",
    "headline",
    !!p.headline?.trim(),
    3,
    "Add a headline",
    fixLink("profile", "profile", "headline"),
  );
  credit(
    "completeness",
    "about",
    (p.aboutText?.trim().length || 0) >= 100,
    4,
    "Write at least 100 characters about yourself",
    fixLink("profile", "profile", "aboutText"),
  );
  credit(
    "completeness",
    "roles",
    !!p.heroRoleTexts?.length,
    2,
    "Add a role phrase",
    fixLink("profile", "profile", "heroRoleTexts"),
  );
  credit(
    "completeness",
    "skills",
    skills.length >= 5,
    5,
    "Add at least five skills",
    fixLink("skills", "new", "name"),
  );
  credit(
    "completeness",
    "projects",
    projects.length >= 2,
    4,
    "Add at least two projects",
    fixLink("projects", "new", "title"),
  );
  credit(
    "completeness",
    "projectDescription",
    projects.some((item) => (item.description?.trim().length || 0) >= 50),
    4,
    "Add a detailed project description (at least 50 characters)",
    fixLink("projects", projects[0]?.id || "new", "description"),
  );
  credit(
    "completeness",
    "socials",
    socials.length > 0,
    2,
    "Add a social link",
    fixLink("social", "new", "url"),
  );
  credit(
    "completeness",
    "resume",
    !!p.resumeUrl,
    4,
    "Upload a resume",
    fixLink("media", "profile", "resume"),
  );
  credit(
    "completeness",
    "timeline",
    timeline.length > 0,
    3,
    "Add experience or education",
    fixLink("timeline", "new", "title"),
  );
  credit(
    "completeness",
    "location",
    !!p.location?.trim(),
    3,
    "Add your location",
    fixLink("profile", "profile", "location"),
  );
  const eligible = checks.filter((check) => check.status !== "SKIPPED"),
    healthy = eligible.filter((check) => check.status === "OK").length;
  categories.links = eligible.length ? Math.round((25 * healthy) / eligible.length) : 0;
  if (!eligible.length || eligible.some((check) => check.status === "PENDING"))
    suggestions.push({
      key: "checkLinks",
      label: "Check your portfolio links",
      points: 0,
      fix: "/dashboard/health",
    });
  for (const check of eligible.filter((item) => ["BROKEN", "TIMEOUT"].includes(item.status)))
    suggestions.push({
      key: `link:${check.sourceType}:${check.sourceId}`,
      label: `Fix ${check.label || check.sourceType}: ${check.status.toLowerCase()}`,
      points: Math.round((25 * (healthy + 1)) / eligible.length) - categories.links,
      fix: check.fix || fixLink(),
    });
  credit(
    "seo",
    "seoTitle",
    !!p.seoTitle?.trim(),
    4,
    "Add a custom search title",
    fixLink("profile", "profile", "seoTitle"),
  );
  credit(
    "seo",
    "seoDescription",
    (p.seoDescription?.trim().length || 0) >= 80,
    4,
    "Write an 80–160 character search description",
    fixLink("profile", "profile", "seoDescription"),
  );
  credit(
    "seo",
    "previewImage",
    !!p.ogImageUrl || !!p.published,
    4,
    "Publish to enable the generated preview image, or set a custom image",
    fixLink("profile", "profile", "ogImageUrl"),
  );
  credit(
    "seo",
    "avatarAlt",
    !!p.avatarUrl && !!p.displayName,
    4,
    "Add a photo and display name for accessible image text",
    fixLink("media", "profile", "avatar"),
  );
  credit(
    "seo",
    "published",
    !!p.published,
    4,
    "Publish your portfolio when ready",
    "/dashboard/portfolio",
  );
  credit(
    "contact",
    "contactEmail",
    requiredEmail.safeParse(p.contactEmail || user.email).success,
    4,
    "Set a valid contact email",
    fixLink("profile", "profile", "contactEmail"),
  );
  credit(
    "contact",
    "verifiedEmail",
    !!user.emailVerifiedAt,
    6,
    "Verify your account email",
    "/settings#email-verification",
  );
  credit(
    "contact",
    "delivery",
    delivered,
    5,
    "Confirm a successful contact notification",
    "/dashboard/messages",
  );
  const avatar = suggestions.find((item) => item.key === "avatar"),
    name = suggestions.find((item) => item.key === "name"),
    published = suggestions.find((item) => item.key === "published");
  if (avatar && p.displayName) avatar.points += 4;
  if (name && p.avatarUrl) name.points += 4;
  if (published && !p.ogImageUrl) published.points += 4;

  return {
    score: Object.values(categories).reduce((n, value) => n + value, 0),
    categories,
    suggestions: suggestions
      .filter((item) => !dismissed.includes(item.key) && item.key !== "avatarAlt")
      .sort((a, b) => b.points - a.points),
  };
}
