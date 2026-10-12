import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { requireAuth } from "./authGuard.js";
import { clearSession } from "./session.js";
import { clearFieldErrors, showFieldErrors } from "./forms.js";
import { mountShell } from "./shell.js";
import { make, toast, confirmModal } from "./ui.js";

const user = await requireAuth();
const main = mountShell({ user, active: "settings", title: "Settings" });
main.append(make("h1", "dash-title", "Settings"));

const column = make("div", "settings-column");
main.append(column);

function addCard(title, description, extraClass = "") {
  const el = make("div", `card settings-card ${extraClass}`.trim());
  el.append(make("h2", "card-title", title), make("p", "card-text", description));
  column.append(el);
  return el;
}

// Builds a form: fields is [{ name, label, type, autocomplete }]; returns the form element.
function buildForm(id, fields, submitLabel, submitClass = "dash-btn-primary") {
  const form = make("form", "dash-form");
  form.noValidate = true;
  for (const f of fields) {
    const wrap = make("div", "field");
    const label = make("label", "", f.label);
    const input = make("input");
    input.id = `${id}-${f.name}`;
    input.name = f.name;
    input.type = f.type || "text";
    if (f.autocomplete) input.autocomplete = f.autocomplete;
    label.htmlFor = input.id;
    wrap.append(label, input);
    form.append(wrap);
  }
  const error = make("p", "form-error");
  error.setAttribute("role", "alert");
  const button = make("button", `dash-btn ${submitClass}`, submitLabel);
  button.type = "submit";
  form.append(error, button);
  return form;
}

// Which input a known error code belongs to.
const CODE_FIELDS = {
  WRONG_PASSWORD: (form) => (form.elements.currentPassword ? "currentPassword" : "password"),
  SAME_PASSWORD: () => "newPassword",
  EMAIL_EXISTS: () => "email",
  USERNAME_EXISTS: () => "username",
};

function showError(form, error) {
  const fields = { ...(error.fields || {}) };
  const own = CODE_FIELDS[error.code]?.(form);
  if (own) fields[own] = error.message;
  const unmatched = showFieldErrors(form, fields);
  // Field errors speak for themselves; otherwise (or for leftovers) show one general line.
  form.querySelector(".form-error").textContent =
    Object.keys(fields).length === 0 ? error.message : unmatched.join(" ");
}

// Sends one account request. Resolves to the result, or null after showing the error.
async function send(form, path, body) {
  const button = form.querySelector("button[type=submit]");
  form.querySelector(".form-error").textContent = "";
  clearFieldErrors(form);
  button.disabled = true;
  const result = await apiFetch(`${API_PREFIX}/account/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  button.disabled = false;
  if (!result.ok) {
    showError(form, result.error);
    return null;
  }
  return result;
}

// ---- Password ----
{
  const el = addCard("Password", "Changing it logs you out of your other devices.");
  const form = buildForm(
    "pw",
    [
      {
        name: "currentPassword",
        label: "Current password",
        type: "password",
        autocomplete: "current-password",
      },
      {
        name: "newPassword",
        label: "New password",
        type: "password",
        autocomplete: "new-password",
      },
      {
        name: "confirm",
        label: "Confirm new password",
        type: "password",
        autocomplete: "new-password",
      },
    ],
    "Change password",
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = form.elements.currentPassword.value;
    const newPassword = form.elements.newPassword.value;
    if (newPassword !== form.elements.confirm.value) {
      showFieldErrors(form, { confirm: "The passwords don't match" });
      return;
    }
    if (!(await send(form, "password", { currentPassword, newPassword }))) return;
    form.reset();
    toast("Password changed. Your other devices were logged out.", "success");
  });
  el.append(form);
}

// ---- Email ----
{
  const el = addCard("Email", "");
  const status = el.querySelector(".card-text");
  const showCurrent = (email, verified) => {
    status.textContent = `Current address: ${email} (${verified ? "verified" : "not verified"}). A new address must be verified again.`;
  };
  showCurrent(user.email, user.emailVerified);
  const form = buildForm(
    "email",
    [
      { name: "email", label: "New email", type: "email", autocomplete: "email" },
      {
        name: "password",
        label: "Your password",
        type: "password",
        autocomplete: "current-password",
      },
    ],
    "Change email",
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await send(form, "email", {
      email: form.elements.email.value.trim(),
      password: form.elements.password.value,
    });
    if (!result) return;
    form.reset();
    showCurrent(result.data.user.email, result.data.user.emailVerified);
    toast("Email changed. We sent a verification link to the new address.", "success");
  });
  el.append(form);
}

// ---- Username ----
{
  const el = addCard("Username", `Your public page is at /${user.username}.`);
  const form = buildForm(
    "username",
    [{ name: "username", label: "New username", autocomplete: "username" }],
    "Change username",
  );
  form.elements.username.placeholder = user.username;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = form.elements.username.value.trim();
    if (!username) {
      showFieldErrors(form, { username: "Enter a username" });
      return;
    }
    const ok = await confirmModal({
      title: "Change your username?",
      message: `Your page moves to /${username.toLowerCase()}. The old link /${user.username} stops working and is not redirected.`,
      confirmText: "Change username",
    });
    if (!ok) return;
    if (!(await send(form, "username", { username }))) return;
    toast("Username changed.", "success");
    // reload so the top bar and links use the new name
    setTimeout(() => window.location.reload(), 900);
  });
  el.append(form);
}

// ---- Delete account ----
{
  const el = addCard(
    "Delete account",
    "Your portfolio goes offline right away and your data is permanently removed after 14 days.",
    "card-danger",
  );
  const form = buildForm(
    "delete",
    [
      {
        name: "password",
        label: "Your password",
        type: "password",
        autocomplete: "current-password",
      },
    ],
    "Delete my account",
    "dash-btn-danger",
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = form.elements.password.value;
    if (!password) {
      showFieldErrors(form, { password: "Enter your password to continue" });
      return;
    }
    const ok = await confirmModal({
      title: "Delete your account?",
      message: "You will be logged out everywhere and your public page goes offline immediately.",
      confirmText: "Delete account",
      danger: true,
    });
    if (!ok) return;
    if (!(await send(form, "delete", { password }))) return;
    clearSession();
    window.location.href = "/";
  });
  el.append(form);
}
