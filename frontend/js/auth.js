import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { showFieldErrors, errorText } from "./forms.js";

const API_BASE = `${API_PREFIX}/auth`;

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const filename = document.getElementById("auth-filename");

document.querySelectorAll("[data-target]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    switchPanel(link.dataset.target);
  });
});

function switchPanel(target) {
  const current = document.querySelector(".auth-panel.active");
  const next = target === "login" ? loginForm : signupForm;

  if (current === next) return;

  current.classList.add("leave");
  current.classList.remove("active");

  setTimeout(() => {
    current.classList.remove("leave");
  }, 250);

  next.classList.add("active");
  filename.textContent = target === "login" ? "login.js" : "signup.js";
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";
  showFieldErrors(loginForm, {});

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const result = await apiFetch(`${API_BASE}/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuthRedirect: true,
  });

  if (!result.ok) {
    const unmatched = showFieldErrors(loginForm, result.error.fields);
    errorEl.textContent = errorText(result.error, unmatched);
    return;
  }

  const { token, user } = result.data;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));

  window.location.href = user.onboardingComplete ? `/${user.username}` : "/onboarding";
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("signup-error");
  errorEl.textContent = "";
  showFieldErrors(signupForm, {});

  const email = document.getElementById("signup-email").value;
  const username = document.getElementById("signup-username").value;
  const password = document.getElementById("signup-password").value;

  const result = await apiFetch(`${API_BASE}/signup`, {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
    skipAuthRedirect: true,
  });

  if (!result.ok) {
    const unmatched = showFieldErrors(signupForm, result.error.fields);
    errorEl.textContent = errorText(result.error, unmatched);
    return;
  }

  switchPanel("login");
});
