import path from "path"
import { fileURLToPath } from "url"
import express from 'express'
import pinoHttp from "pino-http"
import logger from "./config/logger.js"
import prisma from "./config/prisma.js"
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

app.use(express.json())
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

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", profileRoutes);
app.use("/api/v1", skillRoutes);
app.use("/api/v1", projectRoutes);
app.use("/api/v1", onboardingRoutes);
app.use("/api/v1", shareRoutes);
app.use("/api/v1", messageRoutes);

app.get("/onboarding", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/onboarding.html"));
});

app.get("/edit", (req, res) => {
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
