// The only fields a visitor may ever receive. No user id, email, passwordHash,
// shareToken, or internal row ids.
const stableOrder = [{ createdAt: "asc" }, { id: "asc" }];

export const PUBLIC_PORTFOLIO_SELECT = {
  username: true,
  profile: {
    select: {
      displayName: true,
      aboutText: true,
      heroRoleTexts: true,
      contactEmail: true,
      contactPhone: true,
      githubUrl: true,
      headline: true,
      location: true,
      avatarUrl: true,
      resumeUrl: true,
      sectionConfig: true,
    },
  },
  skills: {
    select: { name: true, icon: true, level: true, category: true, isCustom: true },
    orderBy: [{ sortOrder: "asc" }, ...stableOrder],
  },
  projects: {
    select: {
      title: true,
      description: true,
      repoUrl: true,
      liveUrl: true,
      tags: true,
      coverImageUrl: true,
      featured: true,
    },
    orderBy: [{ sortOrder: "asc" }, ...stableOrder],
  },
  socialLinks: {
    select: { platform: true, url: true },
    orderBy: [{ sortOrder: "asc" }, ...stableOrder],
  },
  timelineItems: {
    select: {
      type: true,
      title: true,
      organization: true,
      startDate: true,
      endDate: true,
      description: true,
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, ...stableOrder],
  },
};
