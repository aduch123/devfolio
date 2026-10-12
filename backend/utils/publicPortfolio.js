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
    },
  },
  skills: {
    select: { name: true, icon: true, level: true },
    orderBy: stableOrder,
  },
  projects: {
    select: { title: true, description: true, repoUrl: true, liveUrl: true, tags: true },
    orderBy: stableOrder,
  },
};
