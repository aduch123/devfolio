import path from "path";
import { fileURLToPath } from "url";
import prisma from "../config/prisma.js";
import { ACCESS_COOKIE } from "../config/constants.js";
import { decodeAccessToken } from "../utils/session.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.join(__dirname, "../../frontend");

export const LANDING_PAGE = path.join(FRONTEND, "index.html");
export const pageFile = (name) => path.join(FRONTEND, "pages", name);

// Pages the login page may send the user back to after logging in.
const NEXT_RE = /^\/(dashboard(\/[a-z-]+)?|settings)$/;

// Who is behind this page request? Reads the access cookie ignoring token expiry (see setAccessCookie)
// and checks in the database that the session is live and the account not deleted, so a revoked
// session never gets an app page. Returns { onboardingComplete } or null. Never throws on a bad cookie.
async function pageUser(req) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return null;
  let payload;
  try {
    payload = decodeAccessToken(token);
  } catch {
    return null;
  }
  if (typeof payload?.sid !== "string" || typeof payload?.id !== "string") return null;
  const session = await prisma.session.findFirst({
    where: {
      id: payload.sid,
      userId: payload.id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { deletedAt: null },
    },
    select: { user: { select: { onboardingComplete: true } } },
  });
  return session ? { onboardingComplete: session.user.onboardingComplete } : null;
}

const send = (res, file) => {
  // Redirect decisions depend on the session, so browsers must not reuse them.
  res.set("Cache-Control", "no-store");
  res.sendFile(file);
};

const homeFor = (user) => (user.onboardingComplete ? "/dashboard" : "/onboarding");

// Landing, login and signup: a logged-in visitor goes straight to the app (no flash of the page).
// "?reauth=1" skips that redirect: the client sets it when its own session check failed, which breaks
// any redirect loop between the app and the login page.
export const guestPage = (file) => async (req, res) => {
  if (!("reauth" in req.query)) {
    const user = await pageUser(req);
    if (user) return res.redirect(302, homeFor(user));
  }
  send(res, file);
};

// App pages. onboarding: "any" (default), "complete" (unfinished users go to the wizard) or
// "incomplete" (finished users go to the dashboard).
export const appPage =
  (file, { onboarding = "any" } = {}) =>
  async (req, res) => {
    const user = await pageUser(req);
    if (!user) {
      const next = NEXT_RE.test(req.path) ? `?next=${encodeURIComponent(req.path)}` : "";
      return res.redirect(302, `/login${next}`);
    }
    if (onboarding === "complete" && !user.onboardingComplete) return res.redirect(302, "/onboarding");
    if (onboarding === "incomplete" && user.onboardingComplete) return res.redirect(302, "/dashboard");
    send(res, file);
  };
