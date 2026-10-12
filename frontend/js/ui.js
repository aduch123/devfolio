// Shared dashboard components: toast, confirm modal, skeleton, empty and error states.
// Everything is built with createElement and textContent (never innerHTML).

export function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function makeIcon(name) {
  const i = make("i", `fa-solid ${name}`);
  i.setAttribute("aria-hidden", "true");
  return i;
}

// ---- Toasts ----
function toastHost() {
  let host = document.getElementById("toasts");
  if (!host) {
    host = make("div", "toasts");
    host.id = "toasts";
    host.setAttribute("aria-live", "polite");
    document.body.append(host);
  }
  return host;
}

// type: "info" | "success" | "error"
export function toast(message, type = "info") {
  const el = make("div", `toast toast-${type}`, message);
  el.setAttribute("role", type === "error" ? "alert" : "status");
  toastHost().append(el);
  setTimeout(() => el.remove(), type === "error" ? 6000 : 4000);
}

// ---- Confirm modal ----
// Resolves true when confirmed, false when cancelled (button, Escape or a click outside).
export function confirmModal({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
}) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const overlay = make("div", "modal-overlay");
    const dialog = make("div", "modal");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    const titleEl = make("h2", "modal-title", title);
    titleEl.id = "modal-title";
    dialog.setAttribute("aria-labelledby", "modal-title");
    const text = make("p", "modal-text", message);
    const actions = make("div", "modal-actions");
    const cancel = make("button", "dash-btn dash-btn-ghost", cancelText);
    cancel.type = "button";
    const ok = make(
      "button",
      `dash-btn ${danger ? "dash-btn-danger" : "dash-btn-primary"}`,
      confirmText,
    );
    ok.type = "button";
    actions.append(cancel, ok);
    dialog.append(titleEl, text, actions);
    overlay.append(dialog);

    const close = (result) => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      if (previous && typeof previous.focus === "function") previous.focus();
      resolve(result);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        close(false);
      } else if (e.key === "Tab") {
        // keep focus inside the dialog
        const first = cancel;
        const last = ok;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    cancel.addEventListener("click", () => close(false));
    ok.addEventListener("click", () => close(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener("keydown", onKey);
    document.body.append(overlay);
    cancel.focus();
  });
}

// ---- Loading, empty and error states ----
export function skeleton(lines = 3) {
  const wrap = make("div", "skeleton");
  wrap.setAttribute("aria-hidden", "true");
  for (let i = 0; i < lines; i++) wrap.append(make("div", "skeleton-line"));
  return wrap;
}

// action: optional { label, href } (a link) or { label, onClick } (a button)
export function emptyState({ icon = "fa-inbox", title, text, action }) {
  const box = make("div", "state");
  box.append(makeIcon(icon), make("h2", "state-title", title));
  if (text) box.append(make("p", "state-text", text));
  if (action) {
    let el;
    if (action.href) {
      el = make("a", "dash-btn dash-btn-primary", action.label);
      el.href = action.href;
    } else {
      el = make("button", "dash-btn dash-btn-primary", action.label);
      el.type = "button";
      el.addEventListener("click", action.onClick);
    }
    box.append(el);
  }
  return box;
}

export function errorState({ message = "Something went wrong.", onRetry }) {
  const box = make("div", "state state-error");
  box.setAttribute("role", "alert");
  box.append(makeIcon("fa-triangle-exclamation"), make("h2", "state-title", "Couldn't load this"));
  box.append(make("p", "state-text", message));
  if (onRetry) {
    const retry = make("button", "dash-btn dash-btn-primary", "Try again");
    retry.type = "button";
    retry.addEventListener("click", onRetry);
    box.append(retry);
  }
  return box;
}
