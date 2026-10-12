import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { showFieldErrors, errorText } from "./forms.js";
import { logout } from "./authGuard.js";
import { hasSessionHint } from "./session.js";
import { skillStyles } from "./skillStyles.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const pathParts = window.location.pathname.split("/").filter(Boolean);
const isShareMode = pathParts[0] === "share";
const shareToken = isShareMode ? pathParts[1] : null;
const username = isShareMode ? null : pathParts[0];

const loadingEl = document.getElementById("portfolio-loading");
const errorEl = document.getElementById("portfolio-error");
const contentEl = document.getElementById("portfolio-content");

async function init() {
  if (!isShareMode && !username) {
    showError();
    return;
  }

  const endpoint = isShareMode
    ? `${API_PREFIX}/portfolio/share/${shareToken}`
    : `${API_PREFIX}/portfolio/${username}`;

  const result = await apiFetch(endpoint, { anonymous: true });

  if (!result.ok) {
    showError();
    return;
  }

  render(result.data);
  setupContactForm();

  if (!isShareMode) {
    setupOwnerControls(username);
  }

  loadingEl.style.display = "none";
  contentEl.style.display = "block";

  if (window.setupScrollReveal) {
    window.setupScrollReveal(contentEl);
  }
}

function showError() {
  loadingEl.style.display = "none";
  errorEl.style.display = "block";
}

function render(data) {
  const { username: uname, profile = {}, skills = [], projects = [] } = data;

  document.getElementById("nav-username").textContent = profile.displayName || uname;
  document.getElementById("page-title").textContent = `${profile.displayName || uname} | Portfolio`;
  document.getElementById("hero-name").textContent = `"${profile.displayName || uname}"`;
  document.getElementById("footer-name").textContent = profile.displayName || uname;

  renderAbout(profile.aboutText);
  renderRoleTyping(profile.heroRoleTexts || []);
  renderSkills(skills);
  renderProjects(projects);
  renderContact(profile);
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
    card.append(ico, make("span", "", skillLabel(skill.name)), make("small", "", skill.level));
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
    head.append(makeIcon("fa-regular fa-file-code"), make("h3", "", project.title));
    article.appendChild(head);

    if (project.description) article.appendChild(make("p", "", project.description));

    const tags = make("div", "project-tags");
    (project.tags || []).forEach((t) => tags.appendChild(make("span", "tag", t)));
    article.appendChild(tags);

    const links = make("div", "project-links");
    const repo = makeLink(project.repoUrl, "fa-brands fa-github", "Code", true);
    const live = makeLink(project.liveUrl, "fa-solid fa-arrow-up-right-from-square", "Live", true);
    if (repo) links.appendChild(repo);
    if (live) links.appendChild(live);
    if (links.children.length > 0) article.appendChild(links);

    grid.appendChild(article);
  });
}

function renderContact(profile) {
  const list = document.getElementById("socials-list");
  list.replaceChildren();

  const github = makeLink(profile.githubUrl, "fa-brands fa-github", "GitHub", true);
  const email = profile.contactEmail
    ? makeLink(`mailto:${profile.contactEmail}`, "fa-solid fa-envelope", "Email", false)
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

async function setupOwnerControls(viewedUsername) {
  // Anonymous visitors have no session hint, so they never trigger a session call.
  if (!hasSessionHint()) return;
  const me = await apiFetch(`${API_PREFIX}/auth/me`, { noRedirect: true });
  if (!me.ok || me.data.user.username !== viewedUsername) return;

  document.getElementById("owner-controls").classList.add("visible");

  document.getElementById("logout-btn").addEventListener("click", logout);

  document.getElementById("edit-btn").addEventListener("click", () => {
    window.location.href = "/edit";
  });

  setupShareButton();
}

function setupShareButton() {
  const shareBtn = document.getElementById("share-btn");
  const dropdown = document.getElementById("share-dropdown");
  let loaded = false;

  shareBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const opening = !dropdown.classList.contains("visible");
    dropdown.classList.toggle("visible", opening);
    shareBtn.classList.toggle("active", opening);

    if (opening && !loaded) {
      loaded = true;
      dropdown.innerHTML = `<p style="color:var(--ink-soft); font-size:12px;">Generating link…</p>`;

      const existing = await apiFetch(`${API_PREFIX}/share`);
      let token = existing.data?.shareToken;

      if (!token) {
        const created = await apiFetch(`${API_PREFIX}/share`, { method: "POST" });
        token = created.data?.shareToken;
      }

      renderShareDropdown(token || null);
    }
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== shareBtn) {
      dropdown.classList.remove("visible");
      shareBtn.classList.remove("active");
    }
  });

  function renderShareDropdown(token) {
    if (!token) {
      dropdown.innerHTML = `<p style="color:var(--ink-soft); font-size:12px;">Couldn't generate a link. Try again.</p>`;
      return;
    }

    const shareUrl = `${window.location.origin}/share/${token}`;

    dropdown.innerHTML = `
      <div class="share-link-row">
        <input type="text" id="share-link-input" readonly>
        <button type="button" id="copy-share-link" aria-label="Copy link"><i class="fa-regular fa-copy"></i></button>
      </div>
      <div class="share-actions">
        <button type="button" id="regenerate-share">Regenerate</button>
        <button type="button" id="revoke-share">Revoke</button>
      </div>
    `;

    document.getElementById("share-link-input").value = shareUrl;

    document.getElementById("regenerate-share")?.addEventListener("click", async () => {
      const result = await apiFetch(`${API_PREFIX}/share`, { method: "POST" });
      if (result.ok) renderShareDropdown(result.data.shareToken);
    });

    document.getElementById("revoke-share")?.addEventListener("click", async () => {
      await apiFetch(`${API_PREFIX}/share`, { method: "DELETE" });
      loaded = false;
      dropdown.classList.remove("visible");
      shareBtn.classList.remove("active");
    });

    document.getElementById("copy-share-link")?.addEventListener("click", () => {
      const input = document.getElementById("share-link-input");
      // input.select();
      navigator.clipboard.writeText(input.value);
      const btn = document.getElementById("copy-share-link");
      btn.innerHTML = `<i class="fa-solid fa-check"></i>`;
      setTimeout(() => {
        btn.innerHTML = `<i class="fa-regular fa-copy"></i>`;
      }, 1500);
    });
  }
}

function setupContactForm() {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const submitBtn = document.getElementById("submit-btn");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    status.textContent = "";
    showFieldErrors(form, {});

    const endpoint = isShareMode
      ? `${API_PREFIX}/portfolio/share/${shareToken}/message`
      : `${API_PREFIX}/portfolio/${username}/message`;

    const result = await apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ name, email, message }),
      anonymous: true,
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Send message";

    if (!result.ok) {
      const unmatched = showFieldErrors(form, result.error.fields);
      status.textContent = errorText(result.error, unmatched);
      return;
    }

    status.textContent = `Thanks ${name}! Your message has been sent.`;
    form.reset();

    setTimeout(() => {
      status.textContent = "";
    }, 5000);
  });
}

init();
