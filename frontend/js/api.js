import { API_BASE_URL, API_PREFIX } from "./config.js";
import { clearSession } from "./session.js";

const fail = (status, code, message, fields) => ({
  ok: false,
  status,
  data: null,
  error: { code, message, ...(fields ? { fields } : {}) },
});

const LOGIN_PAGE = "/pages/auth.html";

// One refresh at a time: parallel 401s share the same request.
let refreshing = null;

function refreshSession() {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE_URL}${API_PREFIX}/auth/refresh`, {
      method: "POST",
      credentials: "same-origin",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

// Always resolves to { ok, status, data, error }.
// error is { code, message, fields? } (the backend's standard error shape).
// Options: any fetch option, plus
//   skipAuthRedirect  login/signup: a 401 is a normal answer (no refresh, no redirect)
//   noRedirect        try a silent refresh on 401, but never send the visitor to login
//   anonymous         public pages: never refresh, never redirect
// On a 401 the client refreshes the session once and retries; only if that fails does it go to login.
export async function apiFetch(path, options = {}) {
  const { skipAuthRedirect = false, noRedirect = false, anonymous = false, _retried = false, ...fetchOptions } = options;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });
  } catch {
    return fail(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.");
  }

  if (res.status === 401 && !skipAuthRedirect && !anonymous) {
    if (!_retried && (await refreshSession())) {
      return apiFetch(path, { ...options, _retried: true });
    }
    clearSession();
    if (!noRedirect) {
      window.location.href = LOGIN_PAGE;
    }
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
