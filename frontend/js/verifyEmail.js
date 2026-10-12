import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { showFieldErrors, errorText } from "./forms.js";

const title = document.getElementById("verify-title");
const message = document.getElementById("verify-message");
const loginLink = document.getElementById("verify-login");
const resendForm = document.getElementById("resend-form");
const resendError = document.getElementById("resend-error");

const show = (heading, text) => {
  title.textContent = heading;
  message.textContent = text;
};

async function verify(token) {
  const result = await apiFetch(`${API_PREFIX}/auth/verify-email`, {
    method: "POST",
    body: JSON.stringify({ token }),
    skipAuthRedirect: true,
  });
  if (result.ok) {
    show("Email verified", "Thanks! Your email address is confirmed.");
    loginLink.hidden = false;
    return;
  }
  show("We couldn't verify your email", result.error.message);
  if (result.status === 400) {
    resendForm.hidden = false;
    loginLink.hidden = false;
  }
}

const token = new URLSearchParams(window.location.search).get("token");
if (token) {
  // Keep the token out of the address bar, history and any later referrer.
  window.history.replaceState(null, "", window.location.pathname);
  verify(token);
} else {
  show("Verify your email", "Open the link we emailed you, or enter your email to get a new one.");
  resendForm.hidden = false;
}

resendForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  resendError.textContent = "";
  showFieldErrors(resendForm, {});
  const email = resendForm.elements.email.value.trim();
  if (!email) {
    showFieldErrors(resendForm, { email: "Enter your email" });
    return;
  }
  const result = await apiFetch(`${API_PREFIX}/auth/resend-verification`, {
    method: "POST",
    body: JSON.stringify({ email }),
    skipAuthRedirect: true,
  });
  if (!result.ok) {
    const unmatched = showFieldErrors(resendForm, result.error.fields);
    resendError.textContent = errorText(result.error, unmatched);
    return;
  }
  resendForm.hidden = true;
  show("Check your inbox", result.data.message);
});
