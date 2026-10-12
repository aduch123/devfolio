import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { showFieldErrors, errorText } from "./forms.js";
import { logout } from "./authGuard.js";
import { skillStyles } from "./skillStyles.js";

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

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

  const result = await apiFetch(endpoint);

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
  el.innerHTML = "";
  if (!aboutText) return;

  aboutText.split("\n\n").forEach((para) => {
    const p = document.createElement("p");
    p.textContent = para;
    el.appendChild(p);
  });
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
  grid.innerHTML = "";

  skills.forEach((skill) => {
    const style = skillStyles[skill.name] || skillStyles.other;

    const card = document.createElement("div");
    card.className = "skill-card";
    card.innerHTML = `
      <i class="${style.icon}" style="color:${style.color}" aria-hidden="true"></i>
      <span>${skillLabel(skill.name)}</span>
      <small>${skill.level}</small>
    `;
    grid.appendChild(card);
  });
}

function skillLabel(value) {
  const map = {
    html: "HTML", css: "CSS", javascript: "JavaScript", python: "Python",
    react: "React", nodejs: "Node.js", express: "Express", java: "Java",
    typescript: "TypeScript", nextjs: "Next.js", postgresql: "PostgreSQL",
    mongodb: "MongoDB", prisma: "Prisma", git: "Git", docker: "Docker",
    other: "Other",
  };
  return map[value] || value;
}

function renderProjects(projects) {
  const grid = document.getElementById("projects-grid");
  grid.innerHTML = "";

  projects.forEach((project) => {
    const article = document.createElement("article");
    article.className = "project-card";

    const tags = (project.tags || [])
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join("");

    const links = [];
    
    links.push(`<a href="${project.repoUrl ? project.repoUrl : "#"}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github" aria-hidden="true"></i> Code</a>`);
    links.push(`<a href="${project.liveUrl ? project.liveUrl : "#"}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Live</a>`);
    

    article.innerHTML = `
      <div class="project-card-head">
        <i class="fa-regular fa-file-code" aria-hidden="true"></i>
        <h3>${escapeHtml(project.title)}</h3>
      </div>
      ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ""}
      <div class="project-tags">${tags}</div>
      <div class="project-links">${links.join("")}</div>
    `;
    grid.appendChild(article);
  });
}

function renderContact(profile) {
  const list = document.getElementById("socials-list");
  list.innerHTML = "";

  if (profile.githubUrl) {
    list.innerHTML += `<a href="${profile.githubUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github" aria-hidden="true"></i> GitHub</a>`;
  }
  if (profile.contactEmail) {
    list.innerHTML += `<a href="mailto:${profile.contactEmail}"><i class="fa-solid fa-envelope" aria-hidden="true"></i> Email</a>`;
  }
  if (profile.contactPhone) {
    list.innerHTML += `<a href="tel:${profile.contactPhone}"><i class="fa-solid fa-phone" aria-hidden="true"></i> Phone</a>`;
  }
}

function setupOwnerControls(viewedUsername) {
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  if (!storedUser || storedUser.username !== viewedUsername) return;

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
        <input type="text" id="share-link-input" value="${shareUrl}" readonly>
        <button type="button" id="copy-share-link" aria-label="Copy link"><i class="fa-regular fa-copy"></i></button>
      </div>
      <div class="share-actions">
        <button type="button" id="regenerate-share">Regenerate</button>
        <button type="button" id="revoke-share">Revoke</button>
      </div>
    `;

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
      setTimeout(() => { btn.innerHTML = `<i class="fa-regular fa-copy"></i>`; }, 1500);
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

    setTimeout(() => { status.textContent = ""; }, 5000);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

init();