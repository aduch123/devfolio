import { skillStyles } from "./skillStyles.js";
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

export function render(data) {
  const { username: uname, profile = {}, skills = [], projects = [] } = data;

  document.getElementById("nav-username").textContent =
    profile.displayName || uname;
  document.getElementById("page-title").textContent =
    `${profile.displayName || uname} | Portfolio`;
  document.getElementById("hero-name").textContent =
    `"${profile.displayName || uname}"`;
  document.getElementById("footer-name").textContent =
    profile.displayName || uname;

  renderAbout(profile.aboutText);
  renderRoleTyping(profile.heroRoleTexts || []);
  renderSkills(skills);
  renderProjects(projects);
  renderContact(profile);
  renderExtras(data);
  const sections = [
    "about",
    "skills",
    "projects",
    "experience",
    "education",
    "contact",
  ];
  const defaultOrder = Object.fromEntries(
    sections.map((name, index) => [name, index]),
  );
  sections.sort(
    (a, b) =>
      (profile.sectionConfig?.[a]?.order ?? defaultOrder[a]) -
      (profile.sectionConfig?.[b]?.order ?? defaultOrder[b]),
  );
  const root = document.getElementById("portfolio-content");
  for (const name of sections) {
    const section = document.getElementById(name);
    if (!section) continue;
    root.append(section);
    if (profile.sectionConfig?.[name]?.visible === false)
      setSectionVisible(name, false);
  }
}

function renderAbout(aboutText) {
  const el = document.getElementById("about-content");
  el.replaceChildren();
  const paragraphs = (aboutText || "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
  setSectionVisible("about", paragraphs.length > 0);

  paragraphs.forEach((para) => el.appendChild(make("p", "", para)));
}

function renderRoleTyping(roles) {
  const roleTextEl = document.getElementById("role-text");
  if (!roleTextEl || roles.length === 0) return;

  if (prefersReducedMotion) {
    roleTextEl.textContent = roles[0];
    return;
  }

  let roleIndex = 0;
  let charIndex = roles[0].length;
  let deleting = false;

  function tick() {
    const current = roles[roleIndex];

    if (!deleting) {
      charIndex++;
      if (charIndex > current.length) {
        deleting = true;
        setTimeout(tick, 500);
        return;
      }
    } else {
      charIndex--;
      if (charIndex < 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        charIndex = 0;
      }
    }

    roleTextEl.textContent = roles[roleIndex].slice(0, charIndex);
    setTimeout(tick, deleting ? 40 : 70);
  }

  setTimeout(tick, 700);
}

function renderSkills(skills) {
  const grid = document.getElementById("skills-grid");
  grid.replaceChildren();
  setSectionVisible("skills", skills.length > 0);

  skills.forEach((skill) => {
    const style = Object.hasOwn(skillStyles, skill.name)
      ? skillStyles[skill.name]
      : skillStyles.other;

    const card = make("div", "skill-card");
    const ico = makeIcon(style.icon);
    ico.style.color = style.color;
    card.append(
      ico,
      make("span", "", skillLabel(skill.name)),
      make("small", "", skill.level),
    );
    grid.appendChild(card);
  });
}

function skillLabel(value) {
  const map = {
    html: "HTML",
    css: "CSS",
    javascript: "JavaScript",
    python: "Python",
    react: "React",
    nodejs: "Node.js",
    express: "Express",
    java: "Java",
    typescript: "TypeScript",
    nextjs: "Next.js",
    postgresql: "PostgreSQL",
    mongodb: "MongoDB",
    prisma: "Prisma",
    git: "Git",
    docker: "Docker",
    other: "Other",
  };
  return map[value] || value;
}

function renderProjects(projects) {
  const grid = document.getElementById("projects-grid");
  grid.replaceChildren();
  setSectionVisible("projects", projects.length > 0);
  const viewWork = document.querySelector('.hero-buttons a[href="#projects"]');
  if (viewWork) viewWork.style.display = projects.length > 0 ? "" : "none";

  projects.forEach((project) => {
    const article = make("article", "project-card");

    const head = make("div", "project-card-head");
    head.append(
      makeIcon("fa-regular fa-file-code"),
      make("h3", "", project.title),
    );
    article.appendChild(head);

    if (project.description)
      article.appendChild(make("p", "", project.description));

    const tags = make("div", "project-tags");
    (project.tags || []).forEach((t) =>
      tags.appendChild(make("span", "tag", t)),
    );
    article.appendChild(tags);

    const links = make("div", "project-links");
    const repo = makeLink(project.repoUrl, "fa-brands fa-github", "Code", true);
    const live = makeLink(
      project.liveUrl,
      "fa-solid fa-arrow-up-right-from-square",
      "Live",
      true,
    );
    if (repo) links.appendChild(repo);
    if (live) links.appendChild(live);
    if (links.children.length > 0) article.appendChild(links);

    grid.appendChild(article);
  });
}

function renderContact(profile) {
  const list = document.getElementById("socials-list");
  list.replaceChildren();

  const github = makeLink(
    profile.githubUrl,
    "fa-brands fa-github",
    "GitHub",
    true,
  );
  const email = profile.contactEmail
    ? makeLink(
        `mailto:${profile.contactEmail}`,
        "fa-solid fa-envelope",
        "Email",
        false,
      )
    : null;
  const phone = profile.contactPhone
    ? makeLink(
        `tel:${profile.contactPhone.replace(/\s+/g, "")}`,
        "fa-solid fa-phone",
        "Phone",
        false,
      )
    : null;

  [github, email, phone].forEach((a) => a && list.appendChild(a));
  list.style.display = list.children.length > 0 ? "" : "none";
}

// ---- safe DOM helpers (never build HTML from stored values) ----
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function safeHref(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function makeIcon(classes) {
  const i = make("i", classes);
  i.setAttribute("aria-hidden", "true");
  return i;
}

// Returns null when the URL is empty or not an allowed scheme, so no dead "#" links render.
function makeLink(rawHref, iconClasses, label, newTab) {
  const href = safeHref(rawHref);
  if (!href) return null;
  const a = make("a");
  a.href = href;
  if (newTab) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  a.append(makeIcon(iconClasses), ` ${label}`);
  return a;
}

function setSectionVisible(id, visible) {
  const section = document.getElementById(id);
  if (section) section.style.display = visible ? "" : "none";
  const link = document.querySelector(`.nav-links a[data-tab="${id}"]`);
  if (link) link.style.display = visible ? "" : "none";
}

function renderExtras({
  profile = {},
  projects = [],
  socialLinks = [],
  timelineItems = [],
}) {
  const hero = document.querySelector(".editor-body");
  hero.querySelectorAll(".profile-extra").forEach((el) => el.remove());
  for (const field of ["headline", "location"]) {
    if (profile[field]) hero.append(make("p", "profile-extra", profile[field]));
  }
  const image = (raw, alt, className) => {
    if (!raw || !raw.startsWith("/uploads/")) return null;
    const img = make("img", className);
    img.src = raw;
    img.alt = alt;
    img.loading = "lazy";
    return img;
  };
  const avatar = image(
    profile.avatarUrl,
    profile.displayName || "Profile photo",
    "profile-extra portfolio-avatar",
  );
  if (avatar) hero.prepend(avatar);
  const resume = profile.resumeUrl?.startsWith("/uploads/")
    ? make("a", "profile-extra btn", "Download resume")
    : null;
  if (resume) {
    resume.href = profile.resumeUrl;
    hero.append(resume);
  }
  const socials = document.getElementById("socials-list");
  for (const link of socialLinks) {
    const anchor = makeLink(link.url, "", link.platform, true);
    if (anchor) socials.append(anchor);
  }
  socials.style.display = socials.children.length ? "" : "none";
  document.querySelectorAll(".project-card").forEach((card, index) => {
    const cover = image(
      projects[index]?.coverImageUrl,
      projects[index]?.title || "Project",
      "portfolio-cover",
    );
    if (cover) card.prepend(cover);
  });
  for (const [id, type, title] of [
    ["experience", "EXPERIENCE", "Experience"],
    ["education", "EDUCATION", "Education"],
  ]) {
    let section = document.getElementById(id);
    if (!section) {
      section = make("section", id);
      section.id = id;
      document.getElementById("portfolio-content").append(section);
    }
    section.replaceChildren(make("h2", "", title));
    const items = timelineItems.filter((item) => item.type === type);
    for (const item of items) {
      const article = make("article", "project-card");
      article.append(
        make("h3", "", item.title),
        make("p", "", item.organization),
      );
      article.append(
        make(
          "p",
          "",
          `${item.startDate?.slice(0, 10) || ""} – ${item.endDate?.slice(0, 10) || "Present"}`,
        ),
      );
      if (item.description) article.append(make("p", "", item.description));
      section.append(article);
    }
    setSectionVisible(id, items.length > 0);
  }
}
