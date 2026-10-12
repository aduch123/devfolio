import { API_BASE_URL } from "./config.js";

const fail = (status, code, message, fields) => ({
  ok: false,
  status,
  data: null,
  error: { code, message, ...(fields ? { fields } : {}) },
});

// Always resolves to { ok, status, data, error }.
// error is { code, message, fields? } (the backend's standard error shape).
// Options: any fetch option, plus skipAuthRedirect (for login/signup, where a 401 is a normal answer)
// and anonymous (public pages: never send the stored token, never redirect to login).
export async function apiFetch(path, options = {}) {
  const { skipAuthRedirect = false, anonymous = false, ...fetchOptions } = options;
  const token = anonymous ? null : localStorage.getItem("token");

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
      },
    });
  } catch {
    return fail(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.");
  }

  if (res.status === 401 && !skipAuthRedirect && !anonymous) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/pages/auth.html";
    return fail(401, "UNAUTHORIZED", "Please log in");
  }

  if (res.status === 204) {
    return { ok: true, status: 204, data: null, error: null };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.ok) {
    return { ok: true, status: res.status, data: body, error: null };
  }

  if (body && typeof body.error === "object" && body.error && typeof body.error.message === "string") {
    return { ok: false, status: res.status, data: null, error: body.error };
  }
  if (res.status === 429) {
    return fail(429, "RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
  }
  return fail(res.status, `HTTP_${res.status}`, "Something went wrong. Try again.");
}
