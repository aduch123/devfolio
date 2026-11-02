import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { showFieldErrors, errorText } from "./forms.js";
import { logout } from "./authGuard.js";
import { hasSessionHint } from "./session.js";
import { setupInlineEditor } from "./inlineEditor.js";
import { render } from "./render.js";

const isPreview = window.location.pathname === "/preview";

const pathParts = window.location.pathname.split("/").filter(Boolean);
const isShareMode = pathParts[0] === "share";
const shareToken = isShareMode ? pathParts[1] : null;
const username = isShareMode ? null : pathParts[0];

const loadingEl = document.getElementById("portfolio-loading");
const errorEl = document.getElementById("portfolio-error");
const contentEl = document.getElementById("portfolio-content");

async function init() {
  if (!isPreview && !isShareMode && !username) {
    showError();
    return;
  }

  const endpoint = isPreview
    ? `${API_PREFIX}/portfolio/me`
    : isShareMode
      ? `${API_PREFIX}/portfolio/share/${shareToken}`
      : `${API_PREFIX}/portfolio/${username}`;

  const serverData = document.getElementById("portfolio-data");
  const result =
    serverData && !isPreview
      ? { ok: true, data: JSON.parse(serverData.textContent) }
      : await apiFetch(endpoint, { anonymous: !isPreview });

  if (!result.ok) {
    showError();
    return;
  }

  if (!serverData || isPreview) render(result.data, { preview: isPreview });
  if (isPreview) await setupInlineEditor(result.data);
  if (!isPreview) setupContactForm();
  else {
    document
      .getElementById("contact-form")
      ?.querySelectorAll("input, textarea, button")
      .forEach((el) => {
        el.disabled = true;
      });
  }

  if (!isShareMode && !isPreview) {
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

async function setupOwnerControls(viewedUsername) {
  // Anonymous visitors have no session hint, so they never trigger a session call.
  if (!hasSessionHint()) return;
  const me = await apiFetch(`${API_PREFIX}/auth/me`, { noRedirect: true });
  if (!me.ok || me.data.user.username !== viewedUsername) return;

  document.getElementById("owner-controls").classList.add("visible");

  document.getElementById("logout-btn").addEventListener("click", logout);

  document.getElementById("dashboard-btn").addEventListener("click", () => {
    window.location.href = "/dashboard";
  });

  document.getElementById("edit-btn").addEventListener("click", () => {
    window.location.href = "/dashboard/portfolio";
  });

  setupShareButton();
}

function setupShareButton() {
  document.getElementById("share-btn").addEventListener("click", () => {
    window.location.href = "/dashboard/portfolio#sharing";
  });
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

    const endpoint = isPreview
      ? `${API_PREFIX}/portfolio/me`
      : isShareMode
        ? `${API_PREFIX}/portfolio/share/${shareToken}/message`
        : `${API_PREFIX}/portfolio/${username}/message`;

    const result = await apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ name, email, message }),
      anonymous: true,
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

    setTimeout(() => {
      status.textContent = "";
    }, 5000);
  });
}

init();
