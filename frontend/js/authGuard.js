import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { clearSession, markSession } from "./session.js";

const LOGIN_PAGE = "/pages/auth.html";

// For protected pages: asks the server who is logged in (cookies are sent automatically).
// Resolves to the user. If there is no session, apiFetch has already started the redirect to login,
// so this never resolves and the page script stops. Usage: const user = await requireAuth();
export async function requireAuth() {
  const result = await apiFetch(`${API_PREFIX}/auth/me`);
  if (result.ok) {
    markSession();
    return result.data.user;
  }
  if (result.status !== 401) {
    document.body.textContent = result.error.message;
  }
  return new Promise(() => {});
}

export async function logout() {
  await apiFetch(`${API_PREFIX}/auth/logout`, { method: "POST", skipAuthRedirect: true });
  clearSession();
  window.location.href = LOGIN_PAGE;
}
