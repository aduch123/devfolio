export const APP_NAME = "Devfolio";


// Usernames that would collide with routes, static folders or reserved words.
export const RESERVED_USERNAMES = new Set([
  "api", "edit", "dashboard", "login", "logout", "signup", "register",
  "settings", "account", "onboarding", "share", "pages", "css", "js",
  "uploads", "static", "assets", "admin", "help", "support", "health",
  "healthz", "auth", "verify-email", "forgot-password", "reset-password", "portfolio", "profile", "skills", "projects",
  "messages", "about", "terms", "privacy", "www", "root", "null", "undefined",
]);

// Sessions (Phase 1): short-lived access cookie plus a rotating refresh cookie.
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// A refresh token that was just rotated may be presented again for this long (two tabs refreshing at once).
export const REFRESH_REUSE_GRACE_MS = 10 * 1000;
export const ACCESS_COOKIE = "dev_access";
export const REFRESH_COOKIE = "dev_refresh";
// The refresh cookie is only ever sent to the auth endpoints.
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

// Email tokens (Phase 1): verification links live 24 hours; a new one may be requested after the cooldown.
export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_RESEND_COOLDOWN_MS = 60 * 1000;

// Password reset links live 1 hour; the resend cooldown above also applies.
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

// Account deletion (Phase 1): soft delete first, rows are removed for good after this many days.
export const ACCOUNT_DELETE_GRACE_DAYS = 14;
