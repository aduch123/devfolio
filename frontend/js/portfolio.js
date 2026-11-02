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

  const result = await apiFetch(endpoint, { anonymous: !isPreview });

  if (!result.ok) {
    showError();
    return;
  }

  render(result.data, { preview: isPreview });
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
  const shareBtn = document.getElementById("share-btn");
  const dropdown = document.getElementById("share-dropdown");
  let loaded = false;

  shareBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const opening = !dropdown.classList.contains("visible");
    dropdown.classList.toggle("visible", opening);
    shareBtn.classList.toggle("active", opening);

    if (opening && !loaded) {
      loaded = true;
      dropdown.innerHTML = `<p style="color:var(--ink-soft); font-size:12px;">Generating link…</p>`;

      const existing = await apiFetch(`${API_PREFIX}/share`);
      let token = existing.data?.shareToken;

      if (!token) {
        const created = await apiFetch(`${API_PREFIX}/share`, {
          method: "POST",
        });
        token = created.data?.shareToken;
      }

      renderShareDropdown(token || null);
    }
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== shareBtn) {
      dropdown.classList.remove("visible");
      shareBtn.classList.remove("active");
    }
  });

  function renderShareDropdown(token) {
    if (!token) {
      dropdown.innerHTML = `<p style="color:var(--ink-soft); font-size:12px;">Couldn't generate a link. Try again.</p>`;
      return;
    }

    const shareUrl = `${window.location.origin}/share/${token}`;

    dropdown.innerHTML = `
      <div class="share-link-row">
        <input type="text" id="share-link-input" readonly>
        <button type="button" id="copy-share-link" aria-label="Copy link"><i class="fa-regular fa-copy"></i></button>
      </div>
      <div class="share-actions">
        <button type="button" id="regenerate-share">Regenerate</button>
        <button type="button" id="revoke-share">Revoke</button>
      </div>
    `;

    document.getElementById("share-link-input").value = shareUrl;

    document.getElementById("regenerate-share")?.addEventListener("click", async () => {
      const result = await apiFetch(`${API_PREFIX}/share`, {
        method: "POST",
      });
      if (result.ok) renderShareDropdown(result.data.shareToken);
    });

    document.getElementById("revoke-share")?.addEventListener("click", async () => {
      await apiFetch(`${API_PREFIX}/share`, { method: "DELETE" });
      loaded = false;
      dropdown.classList.remove("visible");
      shareBtn.classList.remove("active");
    });

    document.getElementById("copy-share-link")?.addEventListener("click", () => {
      const input = document.getElementById("share-link-input");
      // input.select();
      navigator.clipboard.writeText(input.value);
      const btn = document.getElementById("copy-share-link");
      btn.innerHTML = `<i class="fa-solid fa-check"></i>`;
      setTimeout(() => {
        btn.innerHTML = `<i class="fa-regular fa-copy"></i>`;
      }, 1500);
    });
  }
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
