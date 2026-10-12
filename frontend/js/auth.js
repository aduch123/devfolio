import { API_BASE_URL, API_PREFIX } from "./config.js";

const API_BASE = `${API_BASE_URL}${API_PREFIX}/auth`;

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

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || "Login failed";
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    window.location.href = data.user.onboardingComplete
      ? `/${data.user.username}`
      : "/onboarding";
  } catch (err) {
    errorEl.textContent = "Something went wrong. Try again.";
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("signup-error");
  errorEl.textContent = "";

  const email = document.getElementById("signup-email").value;
  const username = document.getElementById("signup-username").value;
  const password = document.getElementById("signup-password").value;

  try {
    const res = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error?.formErrors?.[0] || data.error || "Signup failed";
      return;
    }

    switchPanel("login");
  } catch (err) {
    errorEl.textContent = "Something went wrong. Try again.";
  }
});