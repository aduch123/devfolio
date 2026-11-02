import { skillStyles } from "./skillStyles.js";
// Shared, environment-independent view tree. Browser rendering uses DOM nodes;
// server rendering escapes the same tree into HTML. Stored values are always text.
const h = (tag, attrs = {}, ...children) => ({
  tag,
  attrs,
  children: children.flat(Infinity).filter((v) => v !== null && v !== undefined && v !== false),
});
export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
export function safeHref(value, protocols = ["https:", "http:"]) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
const link = (url, label, protocols) => {
  const href = safeHref(url, protocols);
  return href
    ? h(
        "a",
        {
          href,
          ...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {}),
        },
        label,
      )
    : null;
};
const media = (url, alt, className) =>
  typeof url === "string" && /^\/uploads\/(?:[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9._-]+$/.test(url)
    ? h("img", { src: url, alt, class: className, loading: "lazy" })
    : null;
const field = (id, label, type = "text") =>
  h(
    "div",
    { class: "field" },
    h("label", { for: id }, label),
    h(type === "textarea" ? "textarea" : "input", {
      id,
      name: id,
      ...(type === "textarea" ? { rows: 5 } : { type }),
      required: true,
      maxlength: id === "message" ? 2000 : 254,
    }),
  );
const dateText = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const defaults = {
  about: "A bit about me",
  skills: "What I work with",
  projects: "Things I've built",
  experience: "Experience",
  education: "Education",
  contact: "Let's work together",
};
export function portfolioView(data, { preview = false } = {}) {
  const p = data.profile || {};
  const skills = data.skills || [],
    projects = data.projects || [],
    timeline = data.timelineItems || [];
  const section = (name, children, populated = true) =>
    h(
      "section",
      {
        id: name,
        class: name,
        ...(!populated || p.sectionConfig?.[name]?.visible === false ? { hidden: true } : {}),
      },
      h("p", { class: "eyebrow" }, `// ${name}`),
      h("h2", {}, p.sectionConfig?.[name]?.title || defaults[name]),
      children,
    );
  const sections = {
    about: section(
      "about",
      h(
        "div",
        { id: "about-content" },
        (p.aboutText || (preview ? "Add your about text" : ""))
          .split(/\n\n/)
          .filter(Boolean)
          .map((text) => h("p", {}, text)),
      ),
      !!p.aboutText || preview,
    ),
    skills: section(
      "skills",
      h(
        "div",
        { id: "skills-grid", class: "skills-grid" },
        skills.map((skill) =>
          h(
            "div",
            { class: "skill-card" },
            h("i", {
              class: (Object.hasOwn(skillStyles, skill.name)
                ? skillStyles[skill.name]
                : skillStyles.other
              ).icon,
              "aria-hidden": "true",
            }),
            h("span", {}, skill.name),
            h("small", {}, skill.level),
          ),
        ),
      ),
      skills.length > 0,
    ),
    projects: section(
      "projects",
      h(
        "div",
        { id: "projects-grid", class: "projects-grid" },
        projects.map((project, index) => {
          return h(
            "article",
            { class: "project-card", "data-project-index": index },
            media(project.coverImageUrl, project.title, "portfolio-cover"),
            h("div", { class: "project-card-head" }, h("h3", {}, project.title)),
            h("p", { class: "project-description" }, project.description || ""),
            h(
              "div",
              { class: "project-tags" },
              (project.tags || []).map((tag) => h("span", { class: "tag" }, tag)),
            ),
            h(
              "div",
              { class: "project-links" },
              link(project.repoUrl, "Code"),
              link(project.liveUrl, "Live"),
            ),
          );
        }),
      ),
      projects.length > 0,
    ),
    contact: section("contact", [
      h("p", {}, "Feel free to reach out! I'd love to hear from you."),
      h(
        "form",
        { id: "contact-form" },
        field("name", "Name"),
        field("email", "Email", "email"),
        field("message", "Message", "textarea"),
        h(
          "label",
          { class: "contact-trap", "aria-hidden": "true" },
          "Leave this field empty",
          h("input", { name: "website", tabindex: -1, autocomplete: "off" }),
        ),
        h("button", { id: "submit-btn", type: "submit", class: "btn" }, "Send message"),
        h("p", { id: "form-status", role: "status", "aria-live": "polite" }),
      ),
      h(
        "div",
        { id: "socials-list", class: "socials" },
        link(p.githubUrl, "GitHub"),
        p.contactEmail ? link(`mailto:${p.contactEmail}`, "Email", ["mailto:"]) : null,
        p.contactPhone ? link(`tel:${p.contactPhone.replace(/\s/g, "")}`, "Phone", ["tel:"]) : null,
        (data.socialLinks || []).map((item) => link(item.url, item.platform)),
      ),
    ]),
  };
  for (const [name, type] of [
    ["experience", "EXPERIENCE"],
    ["education", "EDUCATION"],
  ]) {
    const items = timeline.filter((item) => item.type === type);
    sections[name] = section(
      name,
      items.map((item) =>
        h(
          "article",
          { class: "project-card" },
          h("h3", {}, item.title),
          h("p", {}, item.organization),
          h(
            "p",
            {},
            `${dateText(item.startDate)} – ${item.endDate ? dateText(item.endDate) : "Present"}`,
          ),
          h("p", {}, item.description || ""),
        ),
      ),
      items.length > 0,
    );
  }
  const names = Object.keys(defaults).sort(
    (a, b) =>
      (p.sectionConfig?.[a]?.order ?? Object.keys(defaults).indexOf(a)) -
      (p.sectionConfig?.[b]?.order ?? Object.keys(defaults).indexOf(b)),
  );
  return [
    h(
      "section",
      { class: "hero" },
      h(
        "div",
        { class: "editor-window" },
        h(
          "div",
          { class: "editor-titlebar" },
          ["red", "amber", "green"].map((color) =>
            h("span", { class: `dot dot-${color}`, "aria-hidden": "true" }),
          ),
          h("span", { class: "editor-filename" }, "hero.dev"),
        ),
        h(
          "div",
          { class: "editor-body" },
          media(p.avatarUrl, p.displayName || data.username, "portfolio-avatar profile-extra"),
          h("p", { class: "code-line code-comment" }, "// software developer"),
          h(
            "h1",
            { class: "code-line" },
            h("span", { class: "code-keyword" }, "const"),
            " developer = ",
            h(
              "span",
              { id: "hero-name", class: "code-string" },
              `"${p.displayName || data.username}"`,
            ),
            ";",
          ),
          h(
            "p",
            { class: "code-line hero-role" },
            "developer.builds(",
            h(
              "span",
              { id: "role-text", class: "code-string" },
              (p.heroRoleTexts || []).join(", "),
            ),
            ");",
          ),
          ["headline", "location"].map((name) =>
            p[name]
              ? h("p", { class: "profile-extra", "data-profile-field": name }, p[name])
              : null,
          ),
          p.resumeUrl && /^\/uploads\/(?:[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9._-]+$/.test(p.resumeUrl)
            ? h("a", { href: p.resumeUrl, class: "btn" }, "Download resume")
            : null,
          h(
            "div",
            { class: "hero-buttons" },
            projects.length && p.sectionConfig?.projects?.visible !== false
              ? h("a", { href: "#projects", class: "btn" }, "View work")
              : null,
            p.sectionConfig?.contact?.visible !== false
              ? h("a", { href: "#contact", class: "btn btn-outline" }, "Contact me")
              : null,
          ),
        ),
      ),
    ),
    ...names.map((name) => sections[name]),
  ];
}
const voids = new Set(["input", "img", "br", "meta", "link"]);
export function viewToHtml(nodes) {
  return nodes
    .map((node) => {
      if (typeof node !== "object") return escapeHtml(node);
      if (node.attrs.hidden) return "";
      const attrs = Object.entries(node.attrs)
        .map(([key, value]) => (value === true ? ` ${key}` : ` ${key}="${escapeHtml(value)}"`))
        .join("");
      return `<${node.tag}${attrs}>${voids.has(node.tag) ? "" : `${viewToHtml(node.children)}</${node.tag}>`}`;
    })
    .join("");
}
export function viewToDom(nodes, document) {
  return nodes.map((node) => {
    if (typeof node !== "object") return document.createTextNode(String(node));
    const element = document.createElement(node.tag);
    for (const [key, value] of Object.entries(node.attrs))
      element.setAttribute(key, value === true ? "" : String(value));
    element.append(...viewToDom(node.children, document));
    return element;
  });
}
