// Helpers for showing API errors next to form inputs.

export function setFieldError(input, message) {
  clearFieldError(input);
  const p = document.createElement("p");
  p.className = "field-error";
  p.setAttribute("role", "alert");
  p.textContent = message;
  input.setAttribute("aria-invalid", "true");
  input.insertAdjacentElement("afterend", p);
}

export function clearFieldError(input) {
  input.removeAttribute("aria-invalid");
  const next = input.nextElementSibling;
  if (next && next.classList.contains("field-error")) next.remove();
}

export function clearFieldErrors(root) {
  root.querySelectorAll(".field-error").forEach((el) => el.remove());
  root.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
}

function findInput(root, key) {
  return (
    root.querySelector(`[name="${CSS.escape(key)}"]`) ||
    root.querySelector(`#${CSS.escape(key)}`) ||
    root.querySelector(`[id$="-${CSS.escape(key)}"]`)
  );
}

// Puts each message in `fields` ({ fieldName: message }) under its input.
// resolve(key) may return an element (or null) to override the default lookup.
// Returns the messages that had no matching input so callers can show them elsewhere.
export function showFieldErrors(root, fields = {}, resolve) {
  clearFieldErrors(root);
  const unmatched = [];
  for (const [key, message] of Object.entries(fields)) {
    const input = (resolve && resolve(key)) || findInput(root, key);
    if (input) setFieldError(input, message);
    else unmatched.push(key === "_" ? message : `${key}: ${message}`);
  }
  return unmatched;
}

// One line of text for a general error area.
export function errorText(error, unmatched = []) {
  return [error.message, ...unmatched].join(" ");
}
