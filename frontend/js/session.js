// A non-secret hint that this browser probably has a session (the real tokens are httpOnly cookies
// that scripts cannot read). Lets public pages skip session calls for anonymous visitors.
const HINT_KEY = "devfolio_session";

export const markSession = () => {
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {
    // storage unavailable: the hint is only an optimization
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem(HINT_KEY);
    // leftovers from before cookie sessions (Phase 0)
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch {
    // ignore
  }
};

export const hasSessionHint = () => {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
};

// Pages the login page may return to. Anything else is ignored, so "?next=" can never be used to
// send someone to another site.
const NEXT_RE = /^\/(dashboard(\/[a-z-]+)?|settings)$/;

export const safeNext = (value) => (typeof value === "string" && NEXT_RE.test(value) ? value : null);

// Login URL used when a session check fails in the browser. "reauth=1" tells the server to show the
// login page even if it still thinks the session is live (prevents a redirect loop).
export const loginUrlForPage = () => {
  const next = safeNext(window.location.pathname);
  return `/login?reauth=1${next ? `&next=${encodeURIComponent(next)}` : ""}`;
};
