// The dashboard layout: sidebar (bottom bar on phones), top bar and account menu.
// mountShell() replaces the page's #app contents and returns the <main> element to fill.
import { apiFetch } from "./api.js";
import { API_PREFIX } from "./config.js";
import { logout } from "./authGuard.js";
import { make, makeIcon } from "./ui.js";

const NAV = [
  { id: "overview", label: "Overview", href: "/dashboard", icon: "fa-house" },
  {
    id: "portfolio",
    label: "Portfolio",
    href: "/dashboard/portfolio",
    icon: "fa-id-card",
  },
  {
    id: "messages",
    label: "Messages",
    href: "/dashboard/messages",
    icon: "fa-envelope",
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: "fa-chart-line",
  },
  {
    id: "health",
    label: "Health",
    href: "/dashboard/health",
    icon: "fa-heart-pulse",
  },
  { id: "settings", label: "Settings", href: "/settings", icon: "fa-gear" },
];

export const NAV_TITLES = Object.fromEntries(NAV.map((n) => [n.id, n.label]));

function buildSidebar(active) {
  const side = make("div", "dash-side");
  side.setAttribute("role", "navigation");
  side.setAttribute("aria-label", "Main");

  const brand = make("a", "dash-brand", "dev");
  brand.href = "/dashboard";
  brand.append(make("span", "dash-brand-accent", "folio"));

  const list = make("ul", "dash-nav");
  for (const item of NAV) {
    const li = make("li");
    const a = make("a", "dash-nav-link");
    a.href = item.href;
    a.append(makeIcon(item.icon), make("span", "dash-nav-label", item.label));
    if (item.id === active) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
    li.append(a);
    list.append(li);
  }

  const out = make("button", "dash-logout");
  out.type = "button";
  out.append(makeIcon("fa-right-from-bracket"), make("span", "dash-nav-label", "Log out"));
  out.addEventListener("click", logout);

  side.append(brand, list, out);
  return side;
}

function buildAccountMenu(user) {
  const wrap = make("div", "account");
  const btn = make("button", "account-btn");
  btn.type = "button";
  btn.setAttribute("aria-haspopup", "menu");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-label", "Account menu");
  btn.append(
    make("span", "account-avatar", user.username.slice(0, 1).toUpperCase()),
    make("span", "account-name", user.username),
    makeIcon("fa-chevron-down"),
  );

  const menu = make("div", "account-menu");
  menu.setAttribute("role", "menu");
  menu.hidden = true;
  menu.append(make("p", "account-email", user.email));
  const settings = make("a", "account-item", "Settings");
  settings.href = "/settings";
  settings.setAttribute("role", "menuitem");
  const out = make("button", "account-item", "Log out");
  out.type = "button";
  out.setAttribute("role", "menuitem");
  out.addEventListener("click", logout);
  menu.append(settings, out);

  const setOpen = (open) => {
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
  };
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(menu.hidden);
  });
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      setOpen(false);
      btn.focus();
    }
  });

  wrap.append(btn, menu);
  return wrap;
}

function buildTopbar(user) {
  const top = make("div", "dash-top");
  top.setAttribute("role", "banner");

  const brand = make("a", "dash-top-brand", "dev");
  brand.href = "/dashboard";
  brand.append(make("span", "dash-brand-accent", "folio"));

  // The dashboard fills this from the saved profile state.
  const status = make("span", "status-badge", "Loading…");
  status.id = "portfolio-status";

  const view = make("a", "dash-top-link");
  view.href = `/${user.username}`;
  view.target = "_blank";
  view.rel = "noopener";
  view.append(
    make("span", "dash-top-link-text", "View public page"),
    makeIcon("fa-arrow-up-right-from-square"),
  );
  view.setAttribute("aria-label", "View public page (opens in a new tab)");

  const right = make("div", "dash-top-right");
  const appearance = make(
    "button",
    "dash-btn dash-btn-ghost",
    `Appearance: ${document.documentElement.dataset.colorMode || "auto"}`,
  );
  appearance.type = "button";
  appearance.setAttribute(
    "aria-label",
    `App appearance: ${document.documentElement.dataset.colorMode || "auto"}. Activate to change.`,
  );
  appearance.addEventListener("click", () => {
    const modes = ["auto", "light", "dark"],
      current = document.documentElement.dataset.colorMode || "auto";
    const mode = modes[(modes.indexOf(current) + 1) % modes.length];
    document.documentElement.dataset.colorMode = mode;
    appearance.textContent = `Appearance: ${mode}`;
    appearance.setAttribute("aria-label", `App appearance: ${mode}. Activate to change.`);
    try {
      localStorage.setItem("devfolio-app-mode", mode);
    } catch {
      /* optional preference */
    }
  });
  right.append(status, appearance, view, buildAccountMenu(user));
  top.append(brand, right);
  return top;
}

export function mountShell({ user, active, title }) {
  document.title = `${title} | Devfolio`;
  const app = document.getElementById("app");
  const main = make("main", "dash-content");
  main.id = "main";
  const column = make("div", "dash-main");
  column.append(buildTopbar(user), main);
  app.replaceChildren(buildSidebar(active), column);
  if (active === "settings") {
    apiFetch(`${API_PREFIX}/profile`).then((result) => {
      if (result.ok)
        document.getElementById("portfolio-status").textContent = result.data.profile.published
          ? "Published"
          : "Draft";
    });
    apiFetch(`${API_PREFIX}/messages/unread`).then((result) => {
      if (!result.ok || !result.data.unread) return;
      const badge = make("span", "message-unread-count", String(result.data.unread));
      badge.setAttribute("aria-label", `${result.data.unread} unread messages`);
      app.querySelector('a[href="/dashboard/messages"]')?.append(badge);
    });
  }
  return main;
}
