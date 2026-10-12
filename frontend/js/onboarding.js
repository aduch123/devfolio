import { requireAuth } from "./authGuard.js";
import { apiFetch } from "./api.js";
import { skillOptions } from "./skillStyles.js";

const { user } = requireAuth();

const form = document.getElementById("onboarding-form");
const rolesList = document.getElementById("roles-list");
const skillsList = document.getElementById("skills-list");
const projectsList = document.getElementById("projects-list");
const errorEl = document.getElementById("onboarding-error");

function addRemovableRow(container, innerHTML) {
  const row = document.createElement("div");
  row.className = "dynamic-row";
  row.innerHTML = innerHTML;
  row.querySelector(".remove-row").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

document.getElementById("add-role").addEventListener("click", () => {
  addRemovableRow(rolesList, `
    <input type="text" placeholder="e.g. clean UIs" class="role-text" required>
    <button type="button" class="remove-row">&times;</button>
  `);
});

document.getElementById("add-skill").addEventListener("click", () => {
  const optionsHtml = skillOptions
    .map((s) => `<option value="${s.value}">${s.label}</option>`)
    .join("");

  addRemovableRow(skillsList, `
    <select class="skill-name">${optionsHtml}</select>
    <select class="skill-level">
      <option value="great">great</option>
      <option value="good">good</option>
      <option value="learning">learning</option>
    </select>
    <button type="button" class="remove-row">&times;</button>
  `);
});

document.getElementById("add-project").addEventListener("click", () => {
  addRemovableRow(projectsList, `
    <input type="text" placeholder="Project title" class="project-title" required>
    <input type="text" placeholder="Description" class="project-desc">
    <input type="url" placeholder="Repo URL" class="project-repo">
    <input type="url" placeholder="Live URL" class="project-live">
    <input type="text" placeholder="Tags (comma separated)" class="project-tags">
    <button type="button" class="remove-row">&times;</button>
  `);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const heroRoleTexts = [...rolesList.querySelectorAll(".role-text")]
    .map((i) => i.value.trim())
    .filter(Boolean);

  const skills = [...skillsList.querySelectorAll(".dynamic-row")].map((row) => ({
    name: row.querySelector(".skill-name").value,
    level: row.querySelector(".skill-level").value,
  }));

  const projects = [...projectsList.querySelectorAll(".dynamic-row")].map((row) => ({
    title: row.querySelector(".project-title").value,
    description: row.querySelector(".project-desc").value || undefined,
    repoUrl: row.querySelector(".project-repo").value || undefined,
    liveUrl: row.querySelector(".project-live").value || undefined,
    tags: row.querySelector(".project-tags").value
      ? row.querySelector(".project-tags").value.split(",").map((t) => t.trim())
      : [],
  }));

  const payload = {
    displayName: document.getElementById("displayName").value,
    aboutText: document.getElementById("aboutText").value,
    contactEmail: document.getElementById("contactEmail").value || undefined,
    contactPhone: document.getElementById("contactPhone").value || undefined,
    githubUrl: document.getElementById("githubUrl").value || undefined,
    heroRoleTexts,
    skills,
    projects,
  };

  const data = await apiFetch("/api/onboarding", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!data || data.error) {
    errorEl.textContent = "Something went wrong. Try again.";
    return;
  }

  const updatedUser = { ...user, onboardingComplete: true };
  localStorage.setItem("user", JSON.stringify(updatedUser));

  window.location.href = `/${user.username}`;
});