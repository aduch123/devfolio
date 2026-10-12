// Onboarding wizard: 5 saved steps plus a review. Progress lives on the server (OnboardingDraft),
// so closing the tab and coming back resumes at the same step with the data intact.
import { API_PREFIX } from "./config.js";
import { requireAuth } from "./authGuard.js";
import { apiFetch } from "./api.js";
import { showFieldErrors, setFieldError, clearFieldError, errorText } from "./forms.js";
import { skillOptions } from "./skillStyles.js";
import { toast } from "./ui.js";

await requireAuth();

// ---- Constants (mirror the server limits in utils/validators.js; the server stays the authority) ----
const LIMITS = {
  name: 80,
  headline: 120,
  location: 80,
  about: 2000,
  role: 60,
  maxRoles: 5,
  skill: 40,
  maxSkills: 50,
  title: 100,
  description: 1000,
  maxProjects: 20,
  maxSocial: 12,
};

const STEPS = [
  { n: 1, label: "Basics" },
  { n: 2, label: "About" },
  { n: 3, label: "Skills" },
  { n: 4, label: "Projects" },
  { n: 5, label: "Links" },
  { n: 6, label: "Review" },
];
const REVIEW = 6;
const PLATFORMS = [
  ["github", "GitHub"],
  ["linkedin", "LinkedIn"],
  ["x", "X"],
  ["website", "Website"],
  ["youtube", "YouTube"],
  ["instagram", "Instagram"],
  ["dribbble", "Dribbble"],
  ["behance", "Behance"],
  ["medium", "Medium"],
  ["devto", "DEV"],
  ["stackoverflow", "Stack Overflow"],
  ["codepen", "CodePen"],
  ["other", "Other"],
];
const platformLabel = (v) => PLATFORMS.find(([k]) => k === v)?.[1] ?? v;
const PRESETS = skillOptions.filter((s) => s.value !== "other");
const skillLabel = (name) => skillOptions.find((s) => s.value === name)?.label ?? name;

// ---- DOM helpers (no innerHTML anywhere) ----
function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "role" || k.startsWith("data-") || k.startsWith("aria-")) e.setAttribute(k, v);
    else e[k] = v;
  }
  e.append(...kids.flat().filter((x) => x !== undefined && x !== null && x !== false));
  return e;
}
const button = (text, className, onClick, props = {}) =>
  el("button", { type: "button", class: className, text, onclick: onClick, ...props });

const nul = (s) => (s.trim() ? s.trim() : null);
const urlOk = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};
const emailOk = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const URL_MSG = "Enter a full link, like https://example.com";

function textField(label, name, { value = "", textarea = false, hint, rows = 4, ...rest } = {}) {
  const id = `f-${name}`;
  const input = el(textarea ? "textarea" : "input", {
    id,
    name,
    value: value ?? "",
    placeholder: rest.placeholder,
    maxLength: rest.maxLength,
    autocomplete: rest.autocomplete ?? "off",
    ...(textarea ? { rows } : { type: rest.type ?? "text" }),
  });
  const wrap = el("div", { class: "field" }, el("label", { htmlFor: id, text: label }), input);
  if (hint) wrap.append(el("p", { class: "wiz-hint", text: hint }));
  return { wrap, input };
}

// Shows a message under the input on blur, and clears it once the value is fixed.
function attachCheck(input, test) {
  const run = () => {
    clearFieldError(input);
    const message = test(input.value.trim());
    if (message) setFieldError(input, message);
  };
  input.addEventListener("blur", run);
  input.addEventListener("input", () => {
    if (input.hasAttribute("aria-invalid")) run();
  });
}
const optionalUrlCheck = (v) => (v && !urlOk(v) ? URL_MSG : "");

// ---- State ----
let current = 1;
let furthest = 1;
let draft = {}; // { "1": {...}, ... } as saved on the server
let skipped = new Set();
let fromReview = false;
let busy = false;
let ui = null; // the current step: { node, read(forSave), resolve? }

const panel = document.getElementById("wiz-panel");
const stepsEl = document.getElementById("wiz-steps");
const previewEl = document.getElementById("wiz-preview");

const sync = (state) => {
  draft = state.data ?? {};
  skipped = new Set(state.skipped ?? []);
};

const putStep = (n, body) =>
  apiFetch(`${API_PREFIX}/onboarding/step/${n}`, { method: "PUT", body: JSON.stringify(body) });

// ---- Steps ----
// Each builder returns { node, read(forSave), resolve? }. read(true) tidies the form (drops empty rows)
// so that server error keys like "projects.1.title" match the inputs on screen.

function step1(v = {}) {
  const name = textField("Display name", "displayName", {
    value: v.displayName,
    placeholder: "Ada Lovelace",
    maxLength: LIMITS.name,
    autocomplete: "name",
    hint: "Shown at the top of your portfolio.",
  });
  const headline = textField("Headline (optional)", "headline", {
    value: v.headline,
    placeholder: "Full-stack developer who loves clean UIs",
    maxLength: LIMITS.headline,
  });
  const location = textField("Location (optional)", "location", {
    value: v.location,
    placeholder: "Lisbon, Portugal",
    maxLength: LIMITS.location,
  });
  const email = textField("Contact email (optional)", "contactEmail", {
    value: v.contactEmail,
    type: "email",
    placeholder: "ada@example.com",
    autocomplete: "email",
  });
  const phone = textField("Phone (optional)", "contactPhone", {
    value: v.contactPhone,
    type: "tel",
    placeholder: "+351 912 345 678",
    autocomplete: "tel",
  });
  attachCheck(name.input, (x) => (x ? "" : "Enter your name"));
  attachCheck(email.input, (x) => (x && !emailOk(x) ? "Enter a valid email address" : ""));
  attachCheck(phone.input, (x) =>
    x && (x.length < 7 || x.length > 20) ? "Use 7 to 20 characters" : "",
  );
  return {
    node: el(
      "div",
      { class: "wiz-grid" },
      name.wrap,
      headline.wrap,
      el("div", { class: "wiz-grid wiz-grid-2" }, location.wrap, phone.wrap),
      email.wrap,
    ),
    read: () => ({
      displayName: name.input.value.trim(),
      headline: nul(headline.input.value),
      location: nul(location.input.value),
      contactEmail: nul(email.input.value),
      contactPhone: nul(phone.input.value),
    }),
  };
}

function step2(v = {}) {
  const about = textField("About you (optional)", "aboutText", {
    value: v.aboutText,
    textarea: true,
    rows: 6,
    maxLength: LIMITS.about,
    placeholder:
      "Example: I'm a developer who enjoys turning ideas into simple, fast web apps. Right now I'm learning Rust and looking for my first full-time role.",
  });
  const count = el("p", { class: "wiz-count" });
  const updateCount = () => {
    count.textContent = `${about.input.value.length} / ${LIMITS.about}`;
  };
  about.input.addEventListener("input", updateCount);
  updateCount();

  const rolesBox = el("div");
  const addRoleBtn = button("+ Add a role phrase", "btn btn-outline", () => {
    addRole();
    renderPreview();
  });
  const renumber = () => {
    [...rolesBox.children].forEach((row, i) => {
      row.querySelector("input").name = `heroRoleTexts.${i}`;
    });
    addRoleBtn.disabled = rolesBox.children.length >= LIMITS.maxRoles;
  };
  function addRole(value = "") {
    const input = el("input", {
      type: "text",
      value,
      maxLength: LIMITS.role,
      placeholder: "e.g. clean UIs",
      "aria-label": "Role phrase",
    });
    const row = el(
      "div",
      { class: "wiz-row" },
      input,
      button(
        "×",
        "wiz-remove",
        () => {
          row.remove();
          renumber();
          renderPreview();
        },
        { "aria-label": "Remove this phrase" },
      ),
    );
    rolesBox.append(row);
    renumber();
  }
  const saved = v.heroRoleTexts?.length ? v.heroRoleTexts : [""];
  saved.forEach((r) => addRole(r));

  const readRoles = (forSave) => {
    if (forSave) {
      [...rolesBox.children].forEach((row) => {
        if (!row.querySelector("input").value.trim()) row.remove();
      });
      renumber();
    }
    return [...rolesBox.querySelectorAll("input")].map((i) => i.value.trim()).filter(Boolean);
  };

  return {
    node: el(
      "div",
      { class: "wiz-grid" },
      el("div", { class: "field" }, about.wrap.firstChild, about.input, count),
      el(
        "div",
        {},
        el("p", { class: "wiz-section-label", text: "Role phrases (optional, up to 5)" }),
        el("p", {
          class: "wiz-hint",
          text: "Short phrases that rotate under your name. Example: clean UIs, reliable APIs.",
        }),
        rolesBox,
        addRoleBtn,
      ),
    ),
    read: (forSave) => ({ aboutText: nul(about.input.value), heroRoleTexts: readRoles(forSave) }),
  };
}

function step3(v = {}) {
  let skills = (v.skills ?? []).map((s) => ({
    name: s.name,
    level: s.level,
    category: s.category,
  }));
  const chips = el("div", { class: "wiz-chips" });
  const list = el("ul", { class: "wiz-skill-list" });
  const has = (name) => skills.some((s) => s.name.toLowerCase() === name.toLowerCase());
  const errorEl = el("p", { class: "field-error", role: "alert", hidden: true });
  const say = (msg) => {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  };

  const refresh = () => {
    chips.replaceChildren(
      ...PRESETS.map((p) =>
        button(p.label, `wiz-chip${has(p.value) ? " is-on" : ""}`, () => toggle(p.value), {
          "aria-pressed": String(has(p.value)),
        }),
      ),
    );
    list.replaceChildren(
      ...skills.map((s, i) => {
        const select = el(
          "select",
          { name: `skills.${i}.level`, "aria-label": `Level for ${skillLabel(s.name)}` },
          ...["great", "good", "learning"].map((l) =>
            el("option", { value: l, text: l, selected: s.level === l }),
          ),
        );
        select.addEventListener("change", () => {
          s.level = select.value;
        });
        return el(
          "li",
          { class: "wiz-row" },
          el("span", { text: skillLabel(s.name), class: "wiz-section-label" }),
          select,
          button(
            "×",
            "wiz-remove",
            () => {
              skills.splice(i, 1);
              refresh();
              renderPreview();
            },
            { "aria-label": `Remove ${skillLabel(s.name)}` },
          ),
        );
      }),
    );
  };
  function add(name) {
    say("");
    if (has(name)) return say("You already added that skill");
    if (skills.length >= LIMITS.maxSkills)
      return say(`You can add up to ${LIMITS.maxSkills} skills`);
    skills.push({ name, level: "good" });
    refresh();
    renderPreview();
  }
  function toggle(name) {
    say("");
    const i = skills.findIndex((s) => s.name.toLowerCase() === name.toLowerCase());
    if (i >= 0) {
      skills.splice(i, 1);
      refresh();
      renderPreview();
    } else add(name);
  }

  const custom = el("input", {
    type: "text",
    maxLength: LIMITS.skill,
    placeholder: "Something else, e.g. Figma",
    "aria-label": "Add another skill",
  });
  const addCustom = () => {
    const value = custom.value.trim();
    if (!value) return say("Type a skill name first");
    add(value);
    if (!errorEl.textContent) custom.value = "";
  };
  custom.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    }
  });
  refresh();

  return {
    node: el(
      "div",
      { class: "wiz-grid" },
      el("div", {}, el("p", { class: "wiz-section-label", text: "Tap the ones you use" }), chips),
      el("div", { class: "wiz-row" }, custom, button("Add", "btn btn-outline", addCustom), errorEl),
      el(
        "div",
        {},
        el("p", { class: "wiz-section-label", text: "Your skills" }),
        el("p", { class: "wiz-hint", text: "Set how confident you are with each one." }),
        list,
      ),
    ),
    read: () => ({ skills: skills.map(({ name, level }) => ({ name, level })) }),
    resolve: (key) => {
      const m = key.match(/^skills\.(\d+)/);
      return m ? list.children[Number(m[1])]?.querySelector("select") : null;
    },
  };
}

function step4(v = {}) {
  const box = el("div");
  const addBtn = button("+ Add a project", "btn btn-outline", () => {
    addProject();
    renderPreview();
  });
  const renumber = () => {
    [...box.children].forEach((card, i) => {
      card.querySelector(".wiz-project-n").textContent = `Project ${i + 1}`;
      card.querySelectorAll("[data-f]").forEach((inp) => {
        inp.name = `projects.${i}.${inp.dataset.f}`;
      });
    });
    addBtn.disabled = box.children.length >= LIMITS.maxProjects;
  };
  const f = (label, key, props = {}) => {
    const input = el(props.textarea ? "textarea" : "input", {
      "data-f": key,
      value: props.value ?? "",
      placeholder: props.placeholder,
      maxLength: props.maxLength,
      ...(props.textarea ? { rows: 3 } : { type: props.type ?? "text" }),
    });
    return { input, wrap: el("div", { class: "field" }, el("label", { text: label }), input) };
  };
  function addProject(p = {}) {
    const title = f("Title", "title", {
      value: p.title,
      placeholder: "Portfolio builder",
      maxLength: LIMITS.title,
    });
    const desc = f("Description (optional)", "description", {
      value: p.description,
      textarea: true,
      maxLength: LIMITS.description,
      placeholder: "What it does, who it's for, and what you built.",
    });
    const repo = f("Repository link (optional)", "repoUrl", {
      value: p.repoUrl,
      type: "url",
      placeholder: "https://github.com/you/project",
    });
    const live = f("Live link (optional)", "liveUrl", {
      value: p.liveUrl,
      type: "url",
      placeholder: "https://project.example.com",
    });
    const tags = f("Tags (optional, comma separated)", "tags", {
      value: (p.tags ?? []).join(", "),
      placeholder: "react, node, postgres",
    });
    attachCheck(repo.input, optionalUrlCheck);
    attachCheck(live.input, optionalUrlCheck);
    const card = el(
      "div",
      { class: "wiz-project" },
      el(
        "div",
        { class: "wiz-project-head" },
        el("span", { class: "wiz-project-n" }),
        button("Remove", "wiz-link", () => {
          card.remove();
          renumber();
          renderPreview();
        }),
      ),
      title.wrap,
      desc.wrap,
      el("div", { class: "wiz-grid wiz-grid-2" }, repo.wrap, live.wrap),
      tags.wrap,
    );
    box.append(card);
    renumber();
  }
  (v.projects?.length ? v.projects : [{}]).forEach((p) => addProject(p));

  const val = (card, key) => card.querySelector(`[data-f="${key}"]`).value;
  const read = (forSave) => {
    if (forSave) {
      [...box.children].forEach((card) => {
        const empty = ["title", "description", "repoUrl", "liveUrl", "tags"].every(
          (k) => !val(card, k).trim(),
        );
        if (empty) card.remove();
      });
      renumber();
    }
    return {
      projects: [...box.children].map((card) => ({
        title: val(card, "title").trim(),
        description: nul(val(card, "description")),
        repoUrl: nul(val(card, "repoUrl")),
        liveUrl: nul(val(card, "liveUrl")),
        tags: val(card, "tags")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })),
    };
  };
  return {
    node: el("div", {}, box, addBtn),
    read,
  };
}

function step5(v = {}) {
  const github = textField("GitHub profile (optional)", "githubUrl", {
    value: v.githubUrl,
    type: "url",
    placeholder: "https://github.com/you",
  });
  attachCheck(github.input, optionalUrlCheck);

  const box = el("div");
  const addBtn = button("+ Add a link", "btn btn-outline", () => {
    addLink();
    renderPreview();
  });
  const renumber = () => {
    [...box.children].forEach((row, i) => {
      row.querySelector("select").name = `socialLinks.${i}.platform`;
      row.querySelector("input").name = `socialLinks.${i}.url`;
    });
    addBtn.disabled = box.children.length >= LIMITS.maxSocial;
  };
  function addLink(l = {}) {
    const select = el(
      "select",
      { "aria-label": "Platform" },
      ...PLATFORMS.map(([value, label]) =>
        el("option", { value, text: label, selected: (l.platform ?? "linkedin") === value }),
      ),
    );
    const input = el("input", {
      type: "url",
      value: l.url ?? "",
      placeholder: "https://linkedin.com/in/you",
      "aria-label": "Link",
    });
    attachCheck(input, optionalUrlCheck);
    const row = el(
      "div",
      { class: "wiz-row" },
      select,
      input,
      button(
        "×",
        "wiz-remove",
        () => {
          row.remove();
          renumber();
          renderPreview();
        },
        { "aria-label": "Remove this link" },
      ),
    );
    box.append(row);
    renumber();
  }
  (v.socialLinks?.length ? v.socialLinks : [{}]).forEach((l) => addLink(l));

  const read = (forSave) => {
    if (forSave) {
      [...box.children].forEach((row) => {
        if (!row.querySelector("input").value.trim()) row.remove();
      });
      renumber();
    }
    return {
      githubUrl: nul(github.input.value),
      socialLinks: [...box.children].map((row) => ({
        platform: row.querySelector("select").value,
        url: row.querySelector("input").value.trim(),
      })),
    };
  };
  return {
    node: el(
      "div",
      { class: "wiz-grid" },
      github.wrap,
      el(
        "div",
        {},
        el("p", { class: "wiz-section-label", text: "Other places to find you" }),
        box,
        addBtn,
      ),
    ),
    read,
  };
}

const BUILDERS = { 1: step1, 2: step2, 3: step3, 4: step4, 5: step5 };

const COPY = {
  1: [
    "Let's start with the basics",
    "Your progress is saved each time you continue, so you can close this tab and come back.",
  ],
  2: [
    "Tell your story",
    "A short intro helps visitors get to know you. You can skip this and add it later.",
  ],
  3: ["What do you work with?", "Pick your skills and say how comfortable you are with each."],
  4: ["Show your best work", "Add a few projects. Even one is a great start."],
  5: ["Where can people find you?", "Link your GitHub and any other profiles."],
};

// ---- Client checks (quick feedback; the server remains the authority) ----
function clientCheck(n, data) {
  const fields = {};
  if (n === 1) {
    if (!data.displayName) fields.displayName = "Enter your name";
    if (data.contactEmail && !emailOk(data.contactEmail))
      fields.contactEmail = "Enter a valid email address";
    if (data.contactPhone && (data.contactPhone.length < 7 || data.contactPhone.length > 20)) {
      fields.contactPhone = "Use 7 to 20 characters";
    }
  } else if (n === 4) {
    data.projects.forEach((p, i) => {
      if (!p.title) fields[`projects.${i}.title`] = "Give the project a title";
      if (p.repoUrl && !urlOk(p.repoUrl)) fields[`projects.${i}.repoUrl`] = URL_MSG;
      if (p.liveUrl && !urlOk(p.liveUrl)) fields[`projects.${i}.liveUrl`] = URL_MSG;
    });
  } else if (n === 5) {
    if (data.githubUrl && !urlOk(data.githubUrl)) fields.githubUrl = URL_MSG;
    data.socialLinks.forEach((l, i) => {
      if (!urlOk(l.url)) fields[`socialLinks.${i}.url`] = URL_MSG;
    });
  }
  return fields;
}

const isEmpty = (n, data) =>
  n === 2
    ? !data.aboutText && !data.heroRoleTexts.length
    : n === 3
      ? !data.skills.length
      : n === 4
        ? !data.projects.length
        : n === 5
          ? !data.githubUrl && !data.socialLinks.length
          : false;

// ---- Saving and navigation ----
const errorLine = () => panel.querySelector(".wiz-error");

function showFields(fields) {
  const unmatched = showFieldErrors(panel, fields, ui?.resolve);
  const line = errorLine();
  if (line) line.textContent = unmatched.length ? unmatched.join(" ") : "";
  panel.querySelector("[aria-invalid]")?.focus();
}

function setBusy(on) {
  busy = on;
  document.querySelectorAll("#wiz-panel button, #wiz-steps button").forEach((b) => {
    if (on) {
      b.dataset.wasDisabled = b.disabled ? "1" : "";
      b.disabled = true;
    } else if ("wasDisabled" in b.dataset) {
      // Buttons made while busy (after a step change) already have their right state.
      b.disabled = b.dataset.wasDisabled === "1";
      delete b.dataset.wasDisabled;
    }
  });
}

// strict: show problems and report failure (Next, step 1 jumps). Quiet: best effort for Back and
// the progress bar, and only when something changed, so a skipped step stays skipped.
async function saveCurrent(next, strict) {
  const data = ui.read(true);
  const fields = clientCheck(current, data);
  if (Object.keys(fields).length) {
    if (strict) showFields(fields);
    return false;
  }
  if (!strict) {
    const prior = draft[current];
    const untouched = isEmpty(current, data) && (!prior || skipped.has(current));
    if (untouched) return true;
  }
  const result = await putStep(current, { data, next });
  if (!result.ok) {
    if (result.error.code === "ALREADY_ONBOARDED") window.location.href = "/dashboard";
    else if (strict) {
      showFields(result.error.fields ?? {});
      if (!result.error.fields) errorLine().textContent = result.error.message;
    }
    return false;
  }
  sync(result.data);
  return true;
}

async function guarded(fn) {
  if (busy) return;
  setBusy(true);
  try {
    await fn();
  } finally {
    setBusy(false);
  }
}

const nextTarget = () => (fromReview ? REVIEW : Math.min(current + 1, REVIEW));

const onNext = () =>
  guarded(async () => {
    const target = nextTarget();
    if (await saveCurrent(target, true)) go(target);
  });

const onSkip = () =>
  guarded(async () => {
    const target = nextTarget();
    const result = await putStep(current, { skip: true, next: target });
    if (!result.ok) {
      if (result.error.code === "ALREADY_ONBOARDED") window.location.href = "/dashboard";
      else errorLine().textContent = result.error.message;
      return;
    }
    sync(result.data);
    go(target);
  });

const onBack = () =>
  guarded(async () => {
    const target = fromReview ? REVIEW : current - 1;
    if (current <= 5) await saveCurrent(target, false);
    go(target);
  });

const onJump = (target) =>
  guarded(async () => {
    if (target === current) return;
    if (current === 1) {
      if (!(await saveCurrent(target, true))) return;
    } else if (current <= 5) {
      await saveCurrent(target, false);
    }
    fromReview = false;
    go(target);
  });

const onEditFromReview = (n) => {
  fromReview = true;
  go(n);
};

async function onFinish() {
  await guarded(async () => {
    const result = await apiFetch(`${API_PREFIX}/onboarding/complete`, { method: "POST" });
    if (result.ok || result.error.code === "ALREADY_ONBOARDED") {
      window.location.href = "/dashboard";
      return;
    }
    if (result.error.code === "BASICS_REQUIRED") {
      toast("Please fill in your basics first.", "error");
      fromReview = false;
      go(1);
      return;
    }
    errorLine().textContent = errorText(result.error);
  });
}

function go(target) {
  current = target;
  if (target === REVIEW) fromReview = false;
  furthest = Math.max(furthest, target);
  render();
  window.scrollTo({ top: 0 });
}

// ---- Rendering ----
function renderSteps() {
  stepsEl.replaceChildren(
    ...STEPS.map(({ n, label }) => {
      const state =
        n === current
          ? "is-current"
          : skipped.has(n)
            ? "is-skipped"
            : n <= 5 && draft[n]
              ? "is-done"
              : "";
      const mark = skipped.has(n) && n !== current ? "–" : state === "is-done" ? "✓" : String(n);
      const btn = el(
        "button",
        { type: "button", disabled: n > furthest && n !== current, onclick: () => onJump(n) },
        el("span", { class: "wiz-step-num", text: mark }),
        el("span", { class: "wiz-step-label", text: label }),
      );
      if (n === current) btn.setAttribute("aria-current", "step");
      return el("li", { class: `wiz-step ${state}` }, btn);
    }),
  );
}

function summary(n) {
  const d = draft[n];
  if (n === 1 && d) {
    return [d.displayName, d.headline, d.location, d.contactEmail].filter(Boolean).join(" · ");
  }
  if (n === 2 && d) {
    const bits = [];
    if (d.aboutText)
      bits.push(d.aboutText.length > 110 ? `${d.aboutText.slice(0, 110)}…` : d.aboutText);
    if (d.heroRoleTexts?.length) bits.push(`Roles: ${d.heroRoleTexts.join(", ")}`);
    return bits.join(" | ") || "Nothing added";
  }
  if (n === 3 && d)
    return d.skills.length ? d.skills.map((s) => skillLabel(s.name)).join(", ") : "Nothing added";
  if (n === 4 && d)
    return d.projects.length ? d.projects.map((p) => p.title).join(", ") : "Nothing added";
  if (n === 5 && d) {
    const bits = [];
    if (d.githubUrl) bits.push("GitHub");
    d.socialLinks.forEach((l) => bits.push(platformLabel(l.platform)));
    return bits.join(", ") || "Nothing added";
  }
  return "";
}

function renderReview() {
  const items = STEPS.slice(0, 5).map(({ n, label }) => {
    const isSkipped = skipped.has(n) || !draft[n];
    const text = isSkipped ? "Skipped. You can add this later from your dashboard." : summary(n);
    return el(
      "div",
      { class: `wiz-review-item${isSkipped ? " is-skipped" : ""}` },
      el("div", {}, el("h3", { text: label }), el("p", { text })),
      button(isSkipped && n > 1 ? "Add now" : "Edit", "wiz-link", () => onEditFromReview(n)),
    );
  });
  const form = el(
    "form",
    { class: "wiz-card-form", noValidate: true, onsubmit: (e) => e.preventDefault() },
    el("h2", { class: "wiz-title", text: "Review and finish", tabIndex: -1 }),
    el("p", {
      class: "wiz-sub",
      text: "Everything here can be changed later. Skipped sections will be listed on your dashboard.",
    }),
    el("div", { class: "wiz-review" }, ...items),
    el("p", { class: "wiz-error", role: "alert" }),
    el(
      "div",
      { class: "wiz-actions" },
      button("Back", "wiz-btn-ghost", onBack),
      el("span", { class: "wiz-spacer" }),
      button("Finish setup", "btn", onFinish),
    ),
  );
  panel.replaceChildren(form);
  ui = null;
}

function render() {
  renderSteps();
  if (current === REVIEW) {
    renderReview();
  } else {
    ui = BUILDERS[current](draft[current]);
    const [title, sub] = COPY[current];
    const actions = el(
      "div",
      { class: "wiz-actions" },
      current > 1 || fromReview
        ? button(fromReview ? "Back to review" : "Back", "wiz-btn-ghost", onBack)
        : null,
      el("span", { class: "wiz-spacer" }),
      current >= 2 ? button("Skip for now", "wiz-btn-ghost", onSkip) : null,
      el("button", {
        type: "submit",
        class: "btn",
        text: fromReview ? "Save and return to review" : current === 5 ? "Review" : "Next",
      }),
    );
    const form = el(
      "form",
      { class: "wiz-card-form", noValidate: true, onsubmit: (e) => (e.preventDefault(), onNext()) },
      el("h2", { class: "wiz-title", text: title, tabIndex: -1 }),
      el("p", { class: "wiz-sub", text: sub }),
      ui.node,
      el("p", { class: "wiz-error", role: "alert" }),
      actions,
    );
    panel.replaceChildren(form);
  }
  panel.querySelector(".wiz-title")?.focus({ preventScroll: true });
  renderPreview();
}

// ---- Live preview (the pane is hidden by CSS below 1024px) ----
function renderPreview() {
  const d = { ...draft };
  if (ui && current <= 5) d[current] = ui.read(false);
  const b = d[1] ?? {};
  const about = d[2] ?? {};
  const skills = d[3]?.skills ?? [];
  const projects = (d[4]?.projects ?? []).filter((p) => p.title);
  const links = d[5] ?? {};
  const socials = (links.socialLinks ?? []).filter((l) => l.url);

  const card = el("div", { class: "pv-card" });
  card.append(
    el("h2", {
      class: `pv-name${b.displayName ? "" : " pv-placeholder"}`,
      text: b.displayName || "Your name",
    }),
  );
  if (b.headline) card.append(el("p", { class: "pv-muted", text: b.headline }));
  if (b.location) card.append(el("p", { class: "pv-muted", text: b.location }));
  if (about.heroRoleTexts?.length)
    card.append(el("p", { class: "pv-roles", text: about.heroRoleTexts.join(" · ") }));
  if (about.aboutText) {
    const t = about.aboutText;
    card.append(el("p", { class: "pv-muted", text: t.length > 220 ? `${t.slice(0, 220)}…` : t }));
  }
  if (skills.length) {
    card.append(
      el("p", { class: "pv-h", text: "Skills" }),
      el(
        "div",
        { class: "pv-tags" },
        ...skills.map((s) => el("span", { class: "pv-tag", text: skillLabel(s.name) })),
      ),
    );
  }
  if (projects.length) {
    card.append(
      el("p", { class: "pv-h", text: "Projects" }),
      el("ul", { class: "pv-list" }, ...projects.map((p) => el("li", { text: p.title }))),
    );
  }
  const linkNames = [
    links.githubUrl ? "GitHub" : null,
    ...socials.map((l) => platformLabel(l.platform)),
  ].filter(Boolean);
  if (linkNames.length) {
    card.append(
      el("p", { class: "pv-h", text: "Links" }),
      el("p", { class: "pv-muted", text: linkNames.join(" · ") }),
    );
  }
  if (b.contactEmail) card.append(el("p", { class: "pv-muted", text: b.contactEmail }));
  previewEl.replaceChildren(el("p", { class: "pv-label", text: "Live preview" }), card);
}

panel.addEventListener("input", renderPreview);
panel.addEventListener("change", renderPreview);

// ---- Boot ----
const state = await apiFetch(`${API_PREFIX}/onboarding/state`);
if (!state.ok) {
  panel.replaceChildren(el("p", { class: "wiz-error", role: "alert", text: state.error.message }));
} else if (state.data.complete) {
  window.location.href = "/dashboard";
} else {
  sync(state.data);
  current = draft[1] ? Math.min(Math.max(state.data.step, 1), REVIEW) : 1;
  furthest = current;
  render();
}
