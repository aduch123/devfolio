import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { showFieldErrors, clearFieldError, errorText } from "./forms.js";
import { initPasswordToggles, passwordStrength } from "./authUi.js";

const form = document.getElementById("signup-form");
const errorEl = document.getElementById("signup-error");
const usernameInput = document.getElementById("signup-username");
const passwordInput = document.getElementById("signup-password");
const confirmInput = document.getElementById("signup-confirm");
const status = document.getElementById("username-status");
const strengthBar = document.getElementById("strength-bar");
const strengthText = document.getElementById("strength-text");

const USERNAME_HELP = status.textContent;
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

initPasswordToggles();

// Live username availability: debounced, and only the newest answer is used.
let timer = null;
let checkId = 0;

const setStatus = (text, state) => {
  status.textContent = text;
  status.dataset.state = state || "";
};

usernameInput.addEventListener("input", () => {
  clearTimeout(timer);
  clearFieldError(usernameInput);
  const value = usernameInput.value.trim().toLowerCase();
  checkId++;

  if (!value) return setStatus(USERNAME_HELP, "");
  if (value.length < 3) return setStatus("At least 3 characters.", "bad");
  if (!USERNAME_RE.test(value)) return setStatus("Use only letters, numbers and dashes, with no dash at the start or end.", "bad");

  setStatus("Checking…", "");
  const mine = checkId;
  timer = setTimeout(async () => {
    const result = await apiFetch(`${API_PREFIX}/auth/username-available?username=${encodeURIComponent(value)}`, {
      anonymous: true,
    });
    if (mine !== checkId) return;
    if (!result.ok) return setStatus("Couldn't check right now. You can still submit.", "");
    setStatus(result.data.available ? `${value} is available` : result.data.message, result.data.available ? "ok" : "bad");
  }, 400);
});

passwordInput.addEventListener("input", () => {
  const { score, label } = passwordStrength(passwordInput.value);
  strengthBar.dataset.score = String(score);
  strengthText.textContent = label;
  clearFieldError(passwordInput.closest(".password-wrap"));
});

confirmInput.addEventListener("input", () => clearFieldError(confirmInput));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  showFieldErrors(form, {});

  const email = form.elements.email.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const confirm = confirmInput.value;

  const fields = {};
  if (!email) fields.email = "Enter your email";
  if (!username) fields.username = "Choose a username";
  else if (!USERNAME_RE.test(username.toLowerCase()) || username.length < 3) fields.username = "Use 3 to 30 letters, numbers or dashes, with no dash at the start or end";
  else if (status.dataset.state === "bad") fields.username = status.textContent;
  if (password.length < 8) fields.password = "Password must be at least 8 characters";
  if (confirm !== password) fields.confirm = "Passwords do not match";
  if (Object.keys(fields).length) {
    showFieldErrors(form, fields, (key) => (key === "password" ? passwordInput.closest(".password-wrap") : null));
    return;
  }

  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  const result = await apiFetch(`${API_PREFIX}/auth/signup`, {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
    skipAuthRedirect: true,
  });
  button.disabled = false;

  if (!result.ok) {
    const resolve = (key) => (key === "password" ? passwordInput.closest(".password-wrap") : null);
    const unmatched = showFieldErrors(form, result.error.fields, resolve);
    errorEl.textContent = errorText(result.error, unmatched);
    return;
  }

  window.location.href = "/login?registered=1";
});
