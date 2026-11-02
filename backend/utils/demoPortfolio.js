export const demoPortfolio = {
  username: "demo",
  profile: {
    displayName: "Alex Example",
    headline: "Full-stack developer · thoughtful interfaces",
    location: "Addis Ababa, Ethiopia",
    aboutText:
      "I build useful software for people. My work combines accessible interfaces, reliable APIs and careful attention to the small details that make a product feel clear and welcoming. This is a fictional sample portfolio made with Devfolio.",
    heroRoleTexts: ["accessible web apps", "reliable APIs", "ideas into products"],
    theme: "minimal",
    accentColor: "#3656b8",
    colorMode: "auto",
    published: true,
    seoTitle: "Alex Example | Devfolio demo",
    seoDescription:
      "Explore a sample developer portfolio built with Devfolio: projects, skills, experience and an accessible responsive layout.",
  },
  skills: [
    { name: "JavaScript", level: "great" },
    { name: "TypeScript", level: "great" },
    { name: "Node.js", level: "good" },
    { name: "PostgreSQL", level: "good" },
    { name: "CSS", level: "great" },
    { name: "Docker", level: "learning" },
  ],
  projects: [
    {
      title: "Atlas",
      description:
        "A collaborative project workspace that makes planning, ownership and progress easy to understand. Built with accessible navigation and a reliable API.",
      tags: ["JavaScript", "Node.js", "PostgreSQL"],
      repoUrl: "https://github.com",
      liveUrl: "https://example.com/atlas",
    },
    {
      title: "Field Notes",
      description:
        "A focused writing space for collecting ideas and sharing what you learn. Fast search and responsive layouts keep the content at the center.",
      tags: ["TypeScript", "CSS"],
      repoUrl: "https://github.com",
      liveUrl: "https://example.com/notes",
    },
    {
      title: "Open Library",
      description:
        "A searchable collection of public learning resources, with clear filters and keyboard-friendly interactions.",
      tags: ["Accessibility", "API"],
      liveUrl: "https://example.com/library",
    },
  ],
  socialLinks: [{ platform: "GitHub", url: "https://github.com" }],
  timelineItems: [
    {
      type: "EXPERIENCE",
      title: "Software developer",
      organization: "Sample Studio",
      startDate: "2024-01-01",
      endDate: null,
      description:
        "Designed and built accessible product features, maintained APIs and helped a small team ship reliable improvements.",
    },
    {
      type: "EDUCATION",
      title: "Computer science",
      organization: "Example University",
      startDate: "2020-09-01",
      endDate: "2024-06-01",
      description: "Focused on software engineering, databases and human-computer interaction.",
    },
  ],
};
