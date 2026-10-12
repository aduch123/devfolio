import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { showFieldErrors, errorText } from "./forms.js";

const form = document.getElementById("forgot-form");
const errorEl = document.getElementById("forgot-error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  showFieldErrors(form, {});
  const email = form.elements.email.value.trim();
  if (!email) {
    showFieldErrors(form, { email: "Enter your email" });
    return;
  }

  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  const result = await apiFetch(`${API_PREFIX}/auth/forgot-password`, {
    method: "POST",
    body: JSON.stringify({ email }),
    skipAuthRedirect: true,
  });
  button.disabled = false;

  if (!result.ok) {
    const unmatched = showFieldErrors(form, result.error.fields);
    errorEl.textContent = errorText(result.error, unmatched);
    return;
  }
  document.getElementById("forgot-title").textContent = "Check your inbox";
  document.getElementById("forgot-message").textContent = result.data.message;
  form.querySelectorAll(".field, button[type=submit]").forEach((el) => (el.hidden = true));
});
