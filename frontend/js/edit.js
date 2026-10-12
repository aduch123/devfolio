import { requireAuth } from "./authGuard.js";
import { apiFetch } from "./api.js";
import { skillOptions } from "./skillStyles.js";

const { user } = requireAuth();

document.getElementById("back-to-portfolio").href = `/${user.username}`;

// ---- Tab switching ----
const tabs = document.querySelectorAll(".edit-tab[data-tab]");
const panels = document.querySelectorAll(".edit-panel");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
  });
});

// ---- Profile tab ----
const profilePanel = document.getElementById("panel-profile");

async function loadProfileTab() {
  profilePanel.innerHTML = `<p style="color:var(--ink-soft); font-size:13px;">Loading…</p>`;
  const data = await apiFetch("/api/profile");
  const profile = data?.profile || {};

  profilePanel.innerHTML = `
    <form id="profile-form">
      <div class="field">
        <label for="displayName">Display name</label>
        <input type="text" id="displayName" value="${escapeAttr(profile.displayName)}" required>
      </div>
      <div class="field">
        <label for="aboutText">About you</label>
        <textarea id="aboutText" rows="4" required>${escapeHtml(profile.aboutText)}</textarea>
      </div>
      <div class="field">
        <label for="contactEmail">Contact email</label>
        <input type="email" id="contactEmail" value="${escapeAttr(profile.contactEmail)}">
      </div>
      <div class="field">
        <label for="contactPhone">Phone</label>
        <input type="text" id="contactPhone" value="${escapeAttr(profile.contactPhone)}">
      </div>
      <div class="field">
        <label for="githubUrl">GitHub URL</label>
        <input type="url" id="githubUrl" value="${escapeAttr(profile.githubUrl)}">
      </div>

      <label>Role phrases (animated)</label>
      <div id="roles-list"></div>
      <button type="button" class="btn btn-outline" id="add-role">+ Add role phrase</button>

      <p class="auth-error" id="profile-error"></p>
      <button type="submit" class="btn">Save profile</button>
    </form>
  `;

  const rolesList = document.getElementById("roles-list");
  (profile.heroRoleTexts || []).forEach((role) => addRoleRow(rolesList, role));

  document.getElementById("add-role").addEventListener("click", () => addRoleRow(rolesList, ""));

  document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("profile-error");
    errorEl.textContent = "";

    const heroRoleTexts = [...rolesList.querySelectorAll(".role-text")]
      .map((i) => i.value.trim())
      .filter(Boolean);

    const payload = {
      displayName: document.getElementById("displayName").value,
      aboutText: document.getElementById("aboutText").value,
      contactEmail: document.getElementById("contactEmail").value || undefined,
      contactPhone: document.getElementById("contactPhone").value || undefined,
      githubUrl: document.getElementById("githubUrl").value || undefined,
      heroRoleTexts,
    };

    const result = await apiFetch("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (!result || result.error) {
      errorEl.textContent = "Failed to save. Try again.";
      return;
    }

    window.location.href = `/${user.username}`;
  });
}

// ---- Skills tab ---- 
const skillsPanel = document.getElementById("panel-skills");

const skillLabelMap = Object.fromEntries(skillOptions.map((s) => [s.value, s.label]));

async function loadSkillsTab() {
  skillsPanel.innerHTML = `<p style="color:var(--ink-soft); font-size:13px;">Loading…</p>`;
  const data = await apiFetch("/api/skills");
  const skills = data?.skills || [];

  skillsPanel.innerHTML = `
    <div id="existing-skills"></div>

    <label>Add a skill</label>
    <div class="dynamic-row">
      <select id="new-skill-name">
        ${skillOptions.map((s) => `<option value="${s.value}">${s.label}</option>`).join("")}
      </select>
      <select id="new-skill-level">
        <option value="great">great</option>
        <option value="good">good</option>
        <option value="learning">learning</option>
      </select>
      <button type="button" class="btn btn-outline" id="add-skill-btn">Add</button>
    </div>
    <p class="auth-error" id="skills-error"></p>
  `;

  renderExistingSkills(skills);

  document.getElementById("add-skill-btn").addEventListener("click", async () => {
    const errorEl = document.getElementById("skills-error");
    errorEl.textContent = "";

    const name = document.getElementById("new-skill-name").value;
    const level = document.getElementById("new-skill-level").value;

    const result = await apiFetch("/api/skills", {
      method: "POST",
      body: JSON.stringify({ name, level }),
    });

    if (!result || result.error) {
      errorEl.textContent = "Failed to add skill.";
      return;
    }

    loadSkillsTab();
  });
}

function renderExistingSkills(skills) {
  const container = document.getElementById("existing-skills");
  container.innerHTML = "";

  if (skills.length === 0) {
    container.innerHTML = `<p style="color:var(--ink-soft); font-size:13px;">No skills added yet.</p>`;
    return;
  }

  skills.forEach((skill) => {
    const row = document.createElement("div");
    row.className = "existing-item";
    row.innerHTML = `
      <span>${skillLabelMap[skill.name] || skill.name}</span>
      <select class="skill-level-select">
        <option value="great" ${skill.level === "great" ? "selected" : ""}>great</option>
        <option value="good" ${skill.level === "good" ? "selected" : ""}>good</option>
        <option value="learning" ${skill.level === "learning" ? "selected" : ""}>learning</option>
      </select>
      <button type="button" class="remove-row">&times;</button>
    `;

    row.querySelector(".skill-level-select").addEventListener("change", async (e) => {
      await apiFetch(`/api/skills/${skill.id}`, {
        method: "PATCH",
        body: JSON.stringify({ level: e.target.value }),
      });
    });

    row.querySelector(".remove-row").addEventListener("click", async () => {
      await apiFetch(`/api/skills/${skill.id}`, { method: "DELETE" });
      row.remove();
    });

    container.appendChild(row);
  });
}

// ---- Projects tab ----
const projectsPanel = document.getElementById("panel-projects");

async function loadProjectsTab() {
  projectsPanel.innerHTML = `<p style="color:var(--ink-soft); font-size:13px;">Loading…</p>`;
  const data = await apiFetch("/api/projects");
  const projects = data?.projects || [];

  projectsPanel.innerHTML = `
    <div id="existing-projects"></div>

    <label>Add a project</label>
    <div class="dynamic-row" style="grid-template-columns:1fr;">
      <input type="text" placeholder="Project title" id="new-project-title">
      <input type="text" placeholder="Description" id="new-project-desc">
      <input type="url" placeholder="Repo URL" id="new-project-repo">
      <input type="url" placeholder="Live URL" id="new-project-live">
      <input type="text" placeholder="Tags (comma separated)" id="new-project-tags">
      <button type="button" class="btn btn-outline" id="add-project-btn">Add project</button>
    </div>
    <p class="auth-error" id="projects-error"></p>
  `;

  renderExistingProjects(projects);

  document.getElementById("add-project-btn").addEventListener("click", async () => {
    const errorEl = document.getElementById("projects-error");
    errorEl.textContent = "";

    const title = document.getElementById("new-project-title").value.trim();
    if (!title) {
      errorEl.textContent = "Title is required.";
      return;
    }

    const payload = {
      title,
      description: document.getElementById("new-project-desc").value || undefined,
      repoUrl: document.getElementById("new-project-repo").value || undefined,
      liveUrl: document.getElementById("new-project-live").value || undefined,
      tags: document.getElementById("new-project-tags").value
        ? document.getElementById("new-project-tags").value.split(",").map((t) => t.trim())
        : [],
    };

    const result = await apiFetch("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!result || result.error) {
      errorEl.textContent = "Failed to add project.";
      return;
    }

    loadProjectsTab();
  });
}

function renderExistingProjects(projects) {
  const container = document.getElementById("existing-projects");
  container.innerHTML = "";

  if (projects.length === 0) {
    container.innerHTML = `<p style="color:var(--ink-soft); font-size:13px;">No projects added yet.</p>`;
    return;
  }

  projects.forEach((project) => {
    const wrapper = document.createElement("div");
    wrapper.className = "existing-item";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "stretch";
    wrapper.style.gap = "8px";

    wrapper.innerHTML = `
      <input type="text" class="proj-title" value="${escapeAttr(project.title)}">
      <input type="text" class="proj-desc" value="${escapeAttr(project.description)}" placeholder="Description">
      <input type="url" class="proj-repo" value="${escapeAttr(project.repoUrl)}" placeholder="Repo URL">
      <input type="url" class="proj-live" value="${escapeAttr(project.liveUrl)}" placeholder="Live URL">
      <input type="text" class="proj-tags" value="${escapeAttr((project.tags || []).join(", "))}" placeholder="Tags">
      <button type="button" class="remove-row" style="align-self:flex-end;">Delete project</button>
    `;

    const saveField = async (field, value) => {
      await apiFetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
    };

    wrapper.querySelector(".proj-title").addEventListener("blur", (e) => saveField("title", e.target.value));
    wrapper.querySelector(".proj-desc").addEventListener("blur", (e) => saveField("description", e.target.value || undefined));
    wrapper.querySelector(".proj-repo").addEventListener("blur", (e) => saveField("repoUrl", e.target.value || undefined));
    wrapper.querySelector(".proj-live").addEventListener("blur", (e) => saveField("liveUrl", e.target.value || undefined));
    wrapper.querySelector(".proj-tags").addEventListener("blur", (e) => {
      const tags = e.target.value ? e.target.value.split(",").map((t) => t.trim()) : [];
      saveField("tags", tags);
    });

    wrapper.querySelector(".remove-row").addEventListener("click", async () => {
      await apiFetch(`/api/projects/${project.id}`, { method: "DELETE" });
      wrapper.remove();
    });

    container.appendChild(wrapper);
  });
}

function addRoleRow(container, value) {
  const row = document.createElement("div");
  row.className = "dynamic-row";
  row.innerHTML = `
    <input type="text" placeholder="e.g. clean UIs" class="role-text" value="${escapeAttr(value)}" required>
    <button type="button" class="remove-row">&times;</button>
  `;
  row.querySelector(".remove-row").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || "").replace(/"/g, "&quot;");
}

loadProfileTab();
loadSkillsTab();
loadProjectsTab();