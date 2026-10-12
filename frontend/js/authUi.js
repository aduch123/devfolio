// Small helpers shared by the login and signup pages.

// Show/hide buttons: <button class="pw-toggle" data-toggle="<input id>">.
export function initPasswordToggles() {
  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    const input = document.getElementById(btn.dataset.toggle);
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Hide" : "Show";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.setAttribute("aria-pressed", String(show));
    });
  });
}

// Rough strength score 0 to 4 (length and character variety). Only a hint: the server rule is 8 to 128 characters.
export function passwordStrength(pw) {
  if (!pw) return { score: 0, label: "At least 8 characters." };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 8) return { score: 1, label: "Too short: use at least 8 characters." };
  return { score, label: ["", "Weak", "Fair", "Good", "Strong"][score] || "Weak" };
}
