import { apiFetch } from "./api.js";
import { API_PREFIX } from "./config.js";
import { createSaveQueue } from "./saveQueue.js";
import { pasteText } from "./pasteText.js";

export async function setupInlineEditor(data) {
  const fields = new Map();
  const queue = createSaveQueue({
    async save(key, value) {
      const field = fields.get(key);
      const result = await apiFetch(`${API_PREFIX}/${field.endpoint}`, {
        method: "PATCH",
        body: JSON.stringify({
          [field.name]: field.encode ? field.encode(value) : value,
        }),
      });
      if (!result.ok) throw new Error(result.error.message);
    },
    onState(key, state, error) {
      const field = fields.get(key);
      if (!field) return;
      field.status.textContent = error ? `Failed: ${error.message}` : state;
      field.retry.hidden = state !== "Failed";
      queueMicrotask(() =>
        window.parent.postMessage(
          { type: "portfolio-save", dirty: queue.dirty },
          window.location.origin,
        ),
      );
    },
  });
  function attach(
    element,
    {
      key,
      name,
      value = "",
      max,
      endpoint = "profile",
      encode,
      multiline = false,
    },
  ) {
    if (!element) return;
    const edit = document.createElement("textarea");
    edit.className = "inline-input";
    edit.value = value;
    edit.maxLength = max;
    edit.rows = multiline ? 4 : 1;
    edit.setAttribute("aria-label", `Edit ${name}`);
    const status = document.createElement("span");
    status.className = "inline-status";
    status.setAttribute("role", "status");
    const counter = document.createElement("small");
    const retry = document.createElement("button");
    retry.textContent = "Retry";
    retry.type = "button";
    retry.hidden = true;
    retry.addEventListener("click", () => queue.retry(key));
    fields.set(key, { name, endpoint, encode, status, retry });
    const input = () => {
      counter.textContent = `${edit.value.length}/${max}`;
      queue.enqueue(key, edit.value);
    };
    edit.addEventListener("input", input);
    edit.addEventListener("paste", (event) => {
      event.preventDefault();
      edit.value = pasteText(
        edit.value,
        edit.selectionStart,
        edit.selectionEnd,
        event.clipboardData.getData("text/plain"),
        max,
      );
      input();
    });
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "inline-edit-trigger";
    trigger.textContent = "Edit";
    trigger.setAttribute("aria-label", `Edit ${name}`);
    element.after(trigger);
    const open = () => {
      if (element.contains(edit)) return;
      element.replaceChildren(edit, counter, status, retry);
      trigger.hidden = true;
      edit.focus();
      counter.textContent = `${edit.value.length}/${max}`;
    };
    trigger.addEventListener("click", open);
    element.tabIndex = 0;
    element.classList.add("inline-editable");
    element.setAttribute("aria-label", `Edit ${name}`);
    element.addEventListener("click", open);
    element.addEventListener("keydown", (event) => {
      if (event.target === element && ["Enter", " "].includes(event.key)) {
        event.preventDefault();
        open();
      }
    });
  }
  const profile = data.profile || {};
  for (const name of [
    "about",
    "skills",
    "projects",
    "experience",
    "education",
    "contact",
  ]) {
    const title = document.querySelector(`#${name} h2`);
    attach(title, {
      key: `section:${name}`,
      name: "sectionConfig",
      value: title?.textContent,
      max: 80,
      encode: (value) => ({ [name]: { title: value } }),
    });
  }
  attach(document.getElementById("hero-name"), {
    key: "name",
    name: "displayName",
    value: profile.displayName,
    max: 80,
  });
  attach(document.getElementById("about-content"), {
    key: "about",
    name: "aboutText",
    value: profile.aboutText,
    max: 2000,
    multiline: true,
  });
  // Typing animation is disabled in previews so it cannot overwrite the input.
  attach(document.getElementById("role-text"), {
    key: "roles",
    name: "heroRoleTexts",
    value: profile.heroRoleTexts?.join("\n"),
    max: 304,
    multiline: true,
    encode: (text) =>
      text
        .split("\n")
        .map((role) => role.trim())
        .filter(Boolean),
  });
  for (const [name, max] of [
    ["headline", 120],
    ["location", 80],
  ]) {
    let element = document.querySelector(`[data-profile-field="${name}"]`);
    if (!element) {
      element = document.createElement("p");
      element.textContent = `Add ${name}`;
      document.querySelector(".editor-body").append(element);
    }
    attach(element, { key: name, name, value: profile[name], max });
  }
  const projects = await apiFetch(`${API_PREFIX}/projects`);
  if (projects.ok) {
    document
      .querySelectorAll(".project-card[data-project-index]")
      .forEach((card) => {
        const project =
          projects.data.projects[Number(card.dataset.projectIndex)];
        if (!project) return;
        attach(card.querySelector("h3"), {
          key: `${project.id}:title`,
          name: "title",
          value: project.title,
          max: 100,
          endpoint: `projects/${project.id}`,
        });
        let description = card.querySelector(".project-description");
        if (!description) {
          description = document.createElement("p");
          description.textContent = "Add description";
          card.append(description);
        }
        attach(description, {
          key: `${project.id}:description`,
          name: "description",
          value: project.description,
          max: 1000,
          endpoint: `projects/${project.id}`,
          multiline: true,
        });
      });
  }
  window.addEventListener("beforeunload", (event) => {
    if (queue.dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
}
