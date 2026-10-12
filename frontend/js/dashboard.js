import { requireAuth } from "./authGuard.js";
import { mountShell, NAV_TITLES } from "./shell.js";
import { make, makeIcon, emptyState } from "./ui.js";

const user = await requireAuth();

// /dashboard -> overview, /dashboard/<section> -> that section
const section = window.location.pathname.split("/").filter(Boolean)[1];
const active = section && NAV_TITLES[section] ? section : "overview";
const main = mountShell({ user, active, title: NAV_TITLES[active] });

main.append(make("h1", "dash-title", NAV_TITLES[active]));

// Placeholders that later phases replace with real content.
const PLACEHOLDERS = {
  portfolio: {
    icon: "fa-id-card",
    title: "Edit your portfolio",
    text: "The live editor with a preview is coming soon. For now, use the current editor.",
    action: { label: "Open the editor", href: "/edit" },
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

if (active === "overview") {
  const grid = make("div", "cards");
  grid.append(
    card({
      icon: "fa-id-card",
      title: "Portfolio",
      value: "Public",
      text: `Your page lives at /${user.username}.`,
      links: [
        { label: "View public page", href: `/${user.username}` },
        { label: "Edit portfolio", href: "/edit" },
      ],
    }),
    card({
      icon: "fa-chart-line",
      title: "Views and likes",
      value: "—",
      text: "Analytics will appear here.",
    }),
    card({
      icon: "fa-envelope",
      title: "Messages",
      value: "—",
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
} else if (PLACEHOLDERS[active]) {
  main.append(emptyState(PLACEHOLDERS[active]));
}
