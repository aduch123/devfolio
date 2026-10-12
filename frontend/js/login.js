import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { showFieldErrors, errorText } from "./forms.js";
import { markSession } from "./session.js";
import { initPasswordToggles } from "./authUi.js";

const form = document.getElementById("login-form");
const errorEl = document.getElementById("login-error");
const notice = document.getElementById("login-notice");
const pwField = (key) => (key === "password" ? form.elements.password.closest(".password-wrap") : null);

initPasswordToggles();

if (new URLSearchParams(window.location.search).get("registered") === "1") {
  notice.textContent = "Account created. Log in to continue.";
  notice.hidden = false;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  showFieldErrors(form, {});

  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;

  const fields = {};
  if (!email) fields.email = "Enter your email";
  if (!password) fields.password = "Enter your password";
  if (Object.keys(fields).length) {
    showFieldErrors(form, fields, pwField);
    return;
  }

  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  const result = await apiFetch(`${API_PREFIX}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuthRedirect: true,
  });
  button.disabled = false;

  if (!result.ok) {
    const unmatched = showFieldErrors(form, result.error.fields, pwField);
    errorEl.textContent = errorText(result.error, unmatched);
    return;
  }

  const { user } = result.data;
  markSession();
  window.location.href = user.onboardingComplete ? `/${user.username}` : "/onboarding";
});
