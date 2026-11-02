import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { make, confirmModal, toast } from "./ui.js";

const specs = [
  {
    path: "profile",
    key: "profile",
    title: "Profile and contact",
    singleton: true,
    fields: [
      ["displayName", "Display name", "text", 80],
      ["headline", "Headline", "text", 120],
      ["location", "Location", "text", 80],
      ["aboutText", "About", "textarea", 2000],
      ["heroRoleTexts", "Roles (one per line, up to 5)", "textarea", 304],
      ["contactEmail", "Contact email", "email", 254],
      ["contactPhone", "Contact phone", "tel", 20],
      ["githubUrl", "GitHub URL", "url", 300],
      ["seoTitle", "Search title", "text", 80],
      ["seoDescription", "Search description", "textarea", 160],
      ["ogImageUrl", "Custom social preview image URL", "url", 300],
    ],
  },
  {
    path: "skills",
    key: "skills",
    title: "Skills",
    fields: [
      ["name", "Name", "text", 40],
      ["level", "Level", ["great", "good", "learning"]],
      ["category", "Category", ["frontend", "backend", "database", "tools", "other"]],
    ],
  },
  {
    path: "projects",
    key: "projects",
    title: "Projects",
    fields: [
      ["title", "Title", "text", 100],
      ["description", "Description", "textarea", 1000],
      ["repoUrl", "Repository URL", "url", 300],
      ["liveUrl", "Live URL", "url", 300],
      ["tags", "Tags (comma separated)", "text", 310],
      ["featured", "Featured", "checkbox"],
    ],
  },
  {
    path: "social",
    key: "links",
    title: "Social links",
    fields: [
      [
        "platform",
        "Platform",
        [
          "github",
          "linkedin",
          "x",
          "website",
          "youtube",
          "instagram",
          "dribbble",
          "behance",
          "medium",
          "devto",
          "stackoverflow",
          "codepen",
          "other",
        ],
      ],
      ["url", "URL", "url", 300],
    ],
  },
  ...["EXPERIENCE", "EDUCATION"].map((type) => ({
    path: "timeline",
    key: "items",
    type,
    title: type === "EXPERIENCE" ? "Experience" : "Education",
    fields: [
      ["title", "Title", "text", 100],
      ["organization", "Organization", "text", 100],
      ["startDate", "Start date", "date"],
      ["endDate", "End date (blank for present)", "date"],
      ["description", "Description", "textarea", 1000],
    ],
  })),
];

export async function mountContentEditor(root, { canChange, refreshPreview }) {
  const host = make("div", "content-editor");
  root.append(host);
  async function mutate(path, options) {
    if (!canChange()) {
      toast("Wait for inline edits to save, or retry failed edits first.", "error");
      return false;
    }
    const result = await apiFetch(`${API_PREFIX}/${path}`, options);
    if (!result.ok) {
      toast(result.error.message, "error");
      return false;
    }
    refreshPreview();
    return true;
  }
  function button(label, handler) {
    const el = make("button", "dash-btn dash-btn-ghost", label);
    el.type = "button";
    el.addEventListener("click", async () => {
      el.disabled = true;
      try {
        await handler();
      } finally {
        el.disabled = false;
      }
    });
    return el;
  }
  function upload(path, label, accept) {
    const wrap = make("div", "editor-upload");
    const field = make("input");
    field.type = "file";
    field.accept = accept;
    field.setAttribute("aria-label", label);
    const preview = make("img", "editor-image-preview");
    preview.hidden = true;
    field.addEventListener("change", () => {
      const file = field.files[0];
      preview.hidden = !file?.type.startsWith("image/");
      if (!preview.hidden) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          preview.src = reader.result;
        });
        reader.readAsDataURL(file);
      }
    });
    wrap.append(
      make("p", "", label),
      field,
      preview,
      button("Upload", async () => {
        if (!field.files[0]) {
          toast("Choose a file first", "error");
          return;
        }
        const body = new FormData();
        body.append("file", field.files[0]);
        if (await mutate(path, { method: "POST", body })) {
          field.value = "";
          preview.hidden = true;
        }
      }),
      button("Remove", async () => {
        if (
          await confirmModal({
            title: `Remove ${label.toLowerCase()}?`,
            message: "This removes the uploaded file from your portfolio.",
            danger: true,
          })
        )
          await mutate(path, { method: "DELETE" });
      }),
    );
    return wrap;
  }
  const media = make("details", "card");
  media.append(
    make("summary", "", "Profile images and resume"),
    upload("profile/avatar", "Profile photo", "image/jpeg,image/png,image/webp"),
    upload("profile/resume", "Resume", "application/pdf"),
  );
  host.append(media);

  for (const spec of specs) {
    const panel = make("details", "card");
    panel.append(make("summary", "", spec.title));
    const list = make("div");
    const formHost = make("div");
    const status = make("p");
    status.setAttribute("role", "status");
    panel.append(
      list,
      ...(spec.singleton ? [] : [button(`Add ${spec.title.toLowerCase()}`, () => edit())]),
      formHost,
      status,
    );
    host.append(panel);
    let items = [];
    async function load() {
      const result = await apiFetch(
        `${API_PREFIX}/${spec.path}${spec.type ? `?type=${spec.type}` : ""}`,
      );
      if (!result.ok) {
        status.textContent = result.error.message;
        return;
      }
      items = spec.singleton ? [result.data[spec.key]] : result.data[spec.key] || [];
      render();
    }
    async function move(from, to) {
      if (from < 0 || from === to || to < 0 || to >= items.length) return;
      const ordered = [...items];
      ordered.splice(to, 0, ordered.splice(from, 1)[0]);
      if (
        await mutate(`${spec.path}/order`, {
          method: "PUT",
          body: JSON.stringify({
            ids: ordered.map((item) => item.id),
            ...(spec.type ? { type: spec.type } : {}),
          }),
        })
      )
        await load();
    }
    function render() {
      list.replaceChildren();
      if (spec.singleton) {
        list.append(button("Edit profile and contact", () => edit(items[0])));
        return;
      }
      if (!items.length) list.append(make("p", "", "No items yet. Add your first one below."));
      items.forEach((item, index) => {
        const row = make("div", "editor-item");
        row.draggable = true;
        row.addEventListener("dragstart", (event) => {
          event.dataTransfer.setData("text/plain", `${spec.path}:${spec.type || ""}:${item.id}`);
        });
        row.addEventListener("dragover", (event) => event.preventDefault());
        row.addEventListener("drop", async (event) => {
          event.preventDefault();
          const prefix = `${spec.path}:${spec.type || ""}:`;
          const value = event.dataTransfer.getData("text/plain");
          if (value.startsWith(prefix))
            await move(
              items.findIndex((entry) => entry.id === value.slice(prefix.length)),
              index,
            );
        });
        row.append(
          make("strong", "", item.title || item.name || item.platform),
          button("Edit", () => edit(item)),
          button("Move up", () => move(index, index - 1)),
          button("Move down", () => move(index, index + 1)),
          button("Delete", async () => {
            if (
              await confirmModal({
                title: "Delete item?",
                message: "This permanently removes this item from your portfolio.",
                danger: true,
              })
            ) {
              if (await mutate(`${spec.path}/${item.id}`, { method: "DELETE" })) await load();
            }
          }),
        );
        if (spec.path === "projects")
          row.append(
            upload(`projects/${item.id}/cover`, "Project cover", "image/jpeg,image/png,image/webp"),
          );
        list.append(row);
      });
    }
    function edit(item = {}) {
      const form = make("form", "editor-form");
      const controls = new Map();
      for (const [name, label, kind, max] of spec.fields) {
        const wrapper = make("label", "", label);
        let input;
        if (Array.isArray(kind)) {
          input = make("select");
          for (const value of kind) {
            const option = make("option", "", value);
            option.value = value;
            input.append(option);
          }
        } else {
          input = make(kind === "textarea" ? "textarea" : "input");
          if (kind !== "textarea") input.type = kind;
        }
        input.name = name;
        if (max) input.maxLength = max;
        if (["name", "title", "organization", "startDate", "url"].includes(name))
          input.required = true;
        if (kind === "checkbox") input.checked = !!item[name];
        else if (item[name] != null)
          input.value =
            name === "heroRoleTexts"
              ? item[name].join("\n")
              : name === "tags"
                ? item[name].join(", ")
                : kind === "date"
                  ? item[name].slice(0, 10)
                  : item[name];
        wrapper.append(input);
        form.append(wrapper);
        controls.set(name, input);
      }
      const error = make("p");
      error.setAttribute("role", "alert");
      const save = make("button", "dash-btn dash-btn-primary", "Save");
      save.type = "submit";
      form.append(
        error,
        save,
        button("Cancel", () => formHost.replaceChildren()),
      );
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!canChange()) {
          error.textContent = "Save or retry inline changes first.";
          return;
        }
        const data = Object.fromEntries(
          [...controls].map(([name, input]) => [
            name,
            input.type === "checkbox"
              ? input.checked
              : name === "heroRoleTexts"
                ? input.value
                    .split("\n")
                    .map((role) => role.trim())
                    .filter(Boolean)
                : name === "tags"
                  ? input.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                  : input.value,
          ]),
        );
        if (spec.type && !item.id) data.type = spec.type;
        save.disabled = true;
        const result = await apiFetch(
          `${API_PREFIX}/${spec.path}${item.id && !spec.singleton ? `/${item.id}` : ""}`,
          {
            method: item.id || spec.singleton ? "PATCH" : "POST",
            body: JSON.stringify(data),
          },
        );
        save.disabled = false;
        if (!result.ok) {
          error.textContent =
            Object.values(result.error.fields || {}).join(" ") || result.error.message;
          return;
        }
        formHost.replaceChildren();
        refreshPreview();
        await load();
      });
      formHost.replaceChildren(form);
      form.querySelector("input,select,textarea")?.focus();
    }
    await load();
  }
  const sectionPanel = make("details", "card");
  sectionPanel.append(make("summary", "", "Section visibility and order"));
  const sectionRows = make("div");
  sectionPanel.append(sectionRows);
  host.prepend(sectionPanel);
  let config;
  const profileResult = await apiFetch(`${API_PREFIX}/profile`);
  if (!profileResult.ok) {
    sectionRows.textContent = profileResult.error.message;
    return;
  }
  config = profileResult.data.profile.sectionConfig;
  async function saveConfig(next) {
    if (
      await mutate("profile", {
        method: "PATCH",
        body: JSON.stringify({
          sectionConfig: Object.fromEntries(
            Object.entries(next).map(([name, { visible, order }]) => [name, { visible, order }]),
          ),
        }),
      })
    ) {
      config = next;
      renderSections();
    } else renderSections();
  }
  function renderSections() {
    sectionRows.replaceChildren();
    const names = Object.keys(config).sort((a, b) => config[a].order - config[b].order);
    async function moveSection(from, to) {
      if (from < 0 || to < 0 || from >= names.length || to >= names.length || from === to) return;
      const ordered = [...names];
      ordered.splice(to, 0, ordered.splice(from, 1)[0]);
      await saveConfig(
        Object.fromEntries(ordered.map((name, order) => [name, { ...config[name], order }])),
      );
    }
    names.forEach((name, index) => {
      const row = make("div", "editor-item");
      row.draggable = true;
      row.addEventListener("dragstart", (event) =>
        event.dataTransfer.setData("text/plain", `section:${name}`),
      );
      row.addEventListener("dragover", (event) => event.preventDefault());
      row.addEventListener("drop", async (event) => {
        event.preventDefault();
        const value = event.dataTransfer.getData("text/plain");
        if (value.startsWith("section:")) await moveSection(names.indexOf(value.slice(8)), index);
      });
      const label = make("label", "", name);
      const checkbox = make("input");
      checkbox.type = "checkbox";
      checkbox.checked = config[name].visible;
      checkbox.addEventListener("change", () =>
        saveConfig({
          ...config,
          [name]: { ...config[name], visible: checkbox.checked },
        }),
      );
      label.prepend(checkbox);
      row.append(
        label,
        button("Move up", () => moveSection(index, index - 1)),
        button("Move down", () => moveSection(index, index + 1)),
      );
      sectionRows.append(row);
    });
  }
  renderSections();
}
