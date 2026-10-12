import path from "path"
import { fileURLToPath } from "url"
import express from 'express'
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser"
import pinoHttp from "pino-http"
import logger from "./config/logger.js"
import prisma from "./config/prisma.js"
import { env } from "./config/env.js"
import { globalLimiter } from "./middleware/rateLimit.js"
import { originCheck } from "./middleware/origin.js"
import { requirePage } from "./middleware/auth.middleware.js"
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js"
import authRoutes from "./modules/auth/auth.routes.js"
import profileRoutes from "./modules/profile/profile.routes.js"
import skillRoutes from "./modules/skills/skills.routes.js"
import projectRoutes from "./modules/projects/projects.routes.js"
import onboardingRoutes from "./modules/onboarding/onboarding.routes.js"
import shareRoutes from "./modules/share/share.routes.js"
import messageRoutes from "./modules/messages/messages.routes.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express()

// Client IPs (used by rate limiting) are only trustworthy behind a proxy if TRUST_PROXY says so.
app.set("trust proxy", env.TRUST_PROXY)

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // TODO(Phase 10): remove 'unsafe-inline' once inline style="" attributes are moved into CSS.
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
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
  })
)

// Same-origin only unless CORS_ORIGINS lists other origins.
app.use(cors({ origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false }))

app.use(express.json({ limit: "100kb" }))
app.use(cookieParser())
app.use(pinoHttp({ logger }));

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server working perfectly!" })
})

app.get("/healthz", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({ status: "ok" })
  } catch (err) {
    req.log.error({ err }, "healthz: database check failed")
    res.status(503).json({ status: "error", db: "unreachable" })
  }
})

app.use("/api/v1", globalLimiter);
app.use("/api/v1", originCheck);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", profileRoutes);
app.use("/api/v1", skillRoutes);
app.use("/api/v1", projectRoutes);
app.use("/api/v1", onboardingRoutes);
app.use("/api/v1", shareRoutes);
app.use("/api/v1", messageRoutes);

app.get("/onboarding", requirePage, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/onboarding.html"));
});

app.get("/edit", requirePage, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/edit.html"));
});

app.get("/share/:token", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/portfolio.html"));
});

app.get("/:username", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/portfolio.html"));
});

app.use(notFoundHandler)

app.use(errorHandler);

export default app
