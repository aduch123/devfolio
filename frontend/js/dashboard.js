import { mountHealth } from "./health.js";
import { mountAnalytics } from "./analytics.js";
import { mountInbox } from "./inbox.js";
import { mountSharePanel } from "./sharePanel.js";
import { mountContentEditor } from "./contentEditor.js";
import { requireAuth } from "./authGuard.js";
import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { mountShell, NAV_TITLES } from "./shell.js";
import { make, makeIcon, emptyState, confirmModal, toast } from "./ui.js";

let previewDirty = false;
let pendingPreviewRefresh = false;
window.addEventListener("message", (event) => {
  const frame = document.querySelector(".portfolio-preview");
  if (
    event.origin === window.location.origin &&
    event.source === frame?.contentWindow &&
    event.data?.type === "portfolio-save"
  ) {
    previewDirty = event.data.dirty === true;
    if (!previewDirty && pendingPreviewRefresh) {
      pendingPreviewRefresh = false;
      frame.src = "/preview";
    }
  }
});
window.addEventListener("beforeunload", (event) => {
  if (previewDirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});

const user = await requireAuth();

// /dashboard -> overview, /dashboard/<section> -> that section
const section = window.location.pathname.split("/").filter(Boolean)[1];
const active = section && NAV_TITLES[section] ? section : "overview";
const main = mountShell({ user, active, title: NAV_TITLES[active] });

main.append(make("h1", "dash-title", NAV_TITLES[active]));
let unreadMessages = 0;
function updateUnread(count) {
  unreadMessages = count;
  const link = document.querySelector('a[href="/dashboard/messages"]');
  if (link) {
    let badge = link.querySelector(".message-unread-count");
    if (!badge) {
      badge = make("span", "message-unread-count");
      link.append(badge);
    }
    badge.textContent = count ? String(count) : "";
    badge.setAttribute("aria-label", `${count} unread messages`);
  }
}
if (active !== "messages") {
  const result = await apiFetch(`${API_PREFIX}/messages/unread`);
  if (result.ok) updateUnread(result.data.unread);
}

// Publishing controls reflect saved server state, including migrated portfolios.
const profileResult = await apiFetch(`${API_PREFIX}/profile`);
let profile = profileResult.ok ? profileResult.data.profile : null;
if (profile) {
  const controls = make("div", "card-links");
  const badge = make("span", "card-text");
  badge.setAttribute("role", "status");
  const button = make("button", "dash-btn dash-btn-primary");
  button.type = "button";
  const refresh = () => {
    badge.textContent = profile.published ? "Published" : "Draft";
    const topStatus = document.getElementById("portfolio-status");
    if (topStatus) topStatus.textContent = badge.textContent;
    button.textContent = profile.published ? "Unpublish" : "Publish";
  };
  refresh();
  button.addEventListener("click", async () => {
    if (previewDirty) {
      toast("Save or retry your inline changes first.", "error");
      return;
    }
    const action = profile.published ? "unpublish" : "publish";
    let healthAdvice = "";
    if (action === "publish") {
      const health = await apiFetch(`${API_PREFIX}/health/report`);
      if (
        health.ok &&
        (health.data.score < 60 ||
          health.data.checks.some((check) => ["BROKEN", "TIMEOUT"].includes(check.status)))
      )
        healthAdvice = ` Your health score is ${health.data.score}/100. Review your suggestions and links when convenient; you can still publish now.`;
    }
    const confirmed = await confirmModal({
      title: profile.published ? "Unpublish portfolio?" : "Publish portfolio?",
      message: profile.published
        ? "Your public page will become unavailable. Private share links will still work."
        : `Your portfolio will be public at ${window.location.origin}/${user.username}. A verified email, name and about text are required.${healthAdvice}`,
      confirmText: profile.published ? "Unpublish" : "Publish",
    });
    if (!confirmed) return;
    button.disabled = true;
    try {
      const result = await apiFetch(`${API_PREFIX}/profile/${action}`, {
        method: "POST",
      });
      if (!result.ok) {
        toast(result.error.message, "error");
        return;
      }
      profile = result.data.profile;
      refresh();
      toast(profile.published ? "Portfolio published" : "Portfolio unpublished", "success");
    } finally {
      button.disabled = false;
    }
  });
  controls.append(badge, button);
  main.append(controls);
}

// Placeholders that later phases replace with real content.
const PLACEHOLDERS = {
  portfolio: {
    icon: "fa-id-card",
    title: "Edit your portfolio",
    text: "The live editor with a preview is coming soon. For now, use the current editor.",
    action: { label: "Open the editor", href: "/dashboard/portfolio" },
  },
  messages: {
    icon: "fa-envelope",
    title: "No messages yet",
    text: "Messages from your contact form will appear here.",
  },
  analytics: {
    icon: "fa-chart-line",
    title: "No analytics yet",
    text: "Views, likes and where your visitors come from will show up here.",
  },
  health: {
    icon: "fa-heart-pulse",
    title: "Portfolio health",
    text: "A score and suggestions for improving your portfolio will appear here.",
  },
};

function card({ icon, title, value, text, links = [] }) {
  const el = make("div", "card");
  const head = make("div", "card-head");
  head.append(makeIcon(icon), make("h2", "card-title", title));
  el.append(head, make("p", "card-value", value), make("p", "card-text", text));
  if (links.length) {
    const row = make("div", "card-links");
    for (const l of links) {
      const a = make("a", "card-link", l.label);
      a.href = l.href;
      row.append(a);
    }
    el.append(row);
  }
  return el;
}

// Sections the user skipped in the setup wizard (step numbers 2 to 5).
const SKIPPED_NAMES = {
  2: "About and roles",
  3: "Skills",
  4: "Projects",
  5: "Links",
};

async function skippedNotice() {
  const result = await apiFetch(`${API_PREFIX}/onboarding/state`, {
    noRedirect: true,
  });
  const names = result.ok
    ? (result.data.skipped ?? []).map((n) => SKIPPED_NAMES[n]).filter(Boolean)
    : [];
  if (!names.length) return null;
  const box = make("div", "dash-todo");
  const head = make("div", "card-head");
  head.append(makeIcon("fa-list-check"), make("h2", "card-title", "Finish setting up"));
  const list = make("ul", "dash-todo-list");
  for (const name of names) list.append(make("li", "", name));
  const link = make("a", "card-link", "Add them in the editor");
  link.href = "/dashboard/portfolio";
  box.append(head, make("p", "card-text", "You skipped these sections during setup:"), list, link);
  return box;
}

if (active === "overview") {
  const notice = await skippedNotice();
  if (notice) main.append(notice);
  const grid = make("div", "cards");
  grid.append(
    card({
      icon: "fa-id-card",
      title: "Portfolio",
      value: profile?.published ? "Published" : "Draft",
      text: `Your page lives at /${user.username}.`,
      links: [
        { label: "View public page", href: `/${user.username}` },
        { label: "Edit portfolio", href: "/dashboard/portfolio" },
      ],
    }),
    card({
      icon: "fa-envelope",
      title: "Messages",
      value: String(unreadMessages),
      text: "Messages from visitors will appear here.",
    }),
    card({
      icon: "fa-heart-pulse",
      title: "Health score",
      value: "—",
      text: "Your score and tips will appear here.",
    }),
  );
  main.append(grid);
  await mountAnalytics(main, { compact: true });
} else if (active === "portfolio") {
  const toolbar = make("div", "card-links");
  toolbar.setAttribute("role", "group");
  toolbar.setAttribute("aria-label", "Preview viewport");
  const viewport = make("div", "preview-viewport");
  const frame = make("iframe", "portfolio-preview");
  frame.title = "Your portfolio preview";
  frame.src = "/preview";
  for (const [label, width] of [
    ["Desktop", "100%"],
    ["Tablet", "768px"],
    ["Mobile", "375px"],
  ]) {
    const button = make("button", "dash-btn dash-btn-ghost", label);
    button.type = "button";
    button.setAttribute("aria-pressed", String(label === "Desktop"));
    button.addEventListener("click", () => {
      frame.style.width = width;
      toolbar
        .querySelectorAll("button")
        .forEach((el) => el.setAttribute("aria-pressed", String(el === button)));
    });
    toolbar.append(button);
  }
  viewport.append(frame);
  main.append(toolbar, viewport);
  await mountContentEditor(main, {
    canChange: () => !previewDirty,
    refreshPreview: () => {
      if (previewDirty) pendingPreviewRefresh = true;
      else frame.src = "/preview";
    },
  });
  await mountSharePanel(main, user);
} else if (active === "health") {
  await mountHealth(main);
} else if (active === "analytics") {
  await mountAnalytics(main);
} else if (active === "messages") {
  await mountInbox(main, updateUnread);
} else if (PLACEHOLDERS[active]) {
  main.append(emptyState(PLACEHOLDERS[active]));
}
