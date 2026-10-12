import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import logger from "./config/logger.js";
import prisma from "./config/prisma.js";
import { env } from "./config/env.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { originCheck } from "./middleware/origin.js";
import { appPage, guestPage, LANDING_PAGE, pageFile } from "./middleware/pages.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import authRoutes from "./modules/auth/auth.routes.js";
import accountRoutes from "./modules/account/account.routes.js";
import profileRoutes from "./modules/profile/profile.routes.js";
import skillRoutes from "./modules/skills/skills.routes.js";
import projectRoutes from "./modules/projects/projects.routes.js";
import socialRoutes from "./modules/social/social.routes.js";
import timelineRoutes from "./modules/timeline/timeline.routes.js";
import onboardingRoutes from "./modules/onboarding/onboarding.routes.js";
import shareRoutes from "./modules/share/share.routes.js";
import mediaRoutes from "./modules/media/media.routes.js";
import { storage } from "./config/storage.js";
import messageRoutes from "./modules/messages/messages.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Client IPs (used by rate limiting) are only trustworthy behind a proxy if TRUST_PROXY says so.
app.set("trust proxy", env.TRUST_PROXY);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // TODO(Phase 10): remove 'unsafe-inline' once inline style="" attributes are moved into CSS.
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        // Upgrading to https would break plain-http local development.
        upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : null,
      },
    },
    // Browsers ignore HSTS over http; only send it in production.
    strictTransportSecurity: env.NODE_ENV === "production",
  }),
);

// Same-origin only unless CORS_ORIGINS lists other origins.
app.use(cors({ origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false }));

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));

// The landing page must be decided before static files: a logged-in visitor is redirected, not shown it.
app.get("/", guestPage(LANDING_PAGE));

app.use(express.static(path.join(__dirname, "../frontend")));

// Uploaded files: random names never change, so they cache well. The headers keep a hostile file inert.
app.use(
  "/uploads",
  express.static(storage.root, {
    dotfiles: "deny",
    index: false,
    setHeaders(res) {
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  }),
);

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server working perfectly!" });
});

app.get("/healthz", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok" });
  } catch (err) {
    req.log.error({ err }, "healthz: database check failed");
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

app.use("/api/v1", globalLimiter);
app.use("/api/v1", originCheck);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/account", accountRoutes);
app.use("/api/v1", profileRoutes);
app.use("/api/v1", skillRoutes);
app.use("/api/v1", projectRoutes);
app.use("/api/v1", socialRoutes);
app.use("/api/v1", mediaRoutes);
app.use("/api/v1", timelineRoutes);
app.use("/api/v1", onboardingRoutes);
app.use("/api/v1", shareRoutes);
app.use("/api/v1", messageRoutes);

app.get("/login", guestPage(pageFile("login.html")));

app.get("/signup", guestPage(pageFile("signup.html")));

app.get("/verify-email", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/verify-email.html"));
});

app.get("/forgot-password", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/forgot-password.html"));
});

app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/reset-password.html"));
});

// App pages: logged-out visitors go to /login, and the dashboard needs a finished onboarding.
const dashboardPage = appPage(pageFile("dashboard.html"), { onboarding: "complete" });
const DASHBOARD_SECTIONS = new Set(["portfolio", "messages", "analytics", "health"]);

app.get("/dashboard", dashboardPage);

app.get("/dashboard/:section", (req, res, next) =>
  DASHBOARD_SECTIONS.has(req.params.section) ? dashboardPage(req, res, next) : next(),
);

app.get("/settings", appPage(pageFile("settings.html")));

app.get("/onboarding", appPage(pageFile("onboarding.html"), { onboarding: "incomplete" }));

app.get("/edit", appPage(pageFile("edit.html")));

app.get("/share/:token", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/portfolio.html"));
});

app.get("/:username", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/portfolio.html"));
});

app.use(notFoundHandler);

app.use(errorHandler);

export default app;
