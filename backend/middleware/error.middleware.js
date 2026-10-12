import logger from "../config/logger.js";

export const errorHandler = (err, req, res, next) => {
  logger.error(err);

  const status = err.status || 500;
  const message = status === 500 ? "Internal server error" : err.message;

  res.status(status).json({ error: message });
};