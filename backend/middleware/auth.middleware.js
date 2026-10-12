import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { unauthorized } from "../utils/AppError.js";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw unauthorized("Please log in");
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw unauthorized("Invalid or expired token", "INVALID_TOKEN");
  }
  next();
};
