import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { showFieldErrors, errorText } from "./forms.js";
import { clearSession } from "./session.js";
import { initPasswordToggles } from "./authUi.js";

const form = document.getElementById("reset-form");
const errorEl = document.getElementById("reset-error");
const message = document.getElementById("reset-message");
const pwField = (key) => (key === "password" ? form.elements.password.closest(".password-wrap") : null);

initPasswordToggles();

const token = new URLSearchParams(window.location.search).get("token");
if (token) {
  // Keep the token out of the address bar, history and any later referrer.
  window.history.replaceState(null, "", window.location.pathname);
} else {
  message.textContent = "This page needs the link from your email.";
  form.querySelectorAll(".field, button[type=submit]").forEach((el) => (el.hidden = true));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  showFieldErrors(form, {});

  const password = form.elements.password.value;
  const confirm = form.elements.confirm.value;
  const fields = {};
  if (password.length < 8) fields.password = "Password must be at least 8 characters";
  if (confirm !== password) fields.confirm = "Passwords do not match";
  if (Object.keys(fields).length) {
    showFieldErrors(form, fields, pwField);
    return;
  }

  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  const result = await apiFetch(`${API_PREFIX}/auth/reset-password`, {
    method: "POST",
    body: JSON.stringify({ token, password }),
    skipAuthRedirect: true,
  });
  button.disabled = false;

  if (!result.ok) {
    const unmatched = showFieldErrors(form, result.error.fields, pwField);
    errorEl.textContent = errorText(result.error, unmatched);
    return;
  }
  clearSession();
  window.location.href = "/login?reset=1";
});
