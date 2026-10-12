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
