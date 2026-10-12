import path from "path"
import { fileURLToPath } from "url"
import express from 'express'
import pinoHttp from "pino-http"
import logger from "./config/logger.js"
import { errorHandler } from "./middleware/error.middleware.js"
import authRoutes from "./routes/auth.routes.js"
import profileRoutes from "./routes/profile.routes.js"
import skillRoutes from "./routes/skill.routes.js"
import projectRoutes from "./routes/project.routes.js"
import onboardingRoutes from "./routes/onboarding.routes.js"
import shareRoutes from "./routes/share.routes.js"
import messageRoutes from "./routes/message.routes.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express()

app.use(express.json())
app.use(pinoHttp({ logger }));

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server working perfectly!" })
})

app.use("/api/auth", authRoutes);
app.use("/api", profileRoutes);
app.use("/api", skillRoutes);
app.use("/api", projectRoutes);
app.use("/api", onboardingRoutes);
app.use("/api", shareRoutes);
app.use("/api", messageRoutes);

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

app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    
    next(err);
})

app.use(errorHandler);

export default app
