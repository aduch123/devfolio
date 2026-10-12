import { ZodError } from "zod";
import logger from "../config/logger.js";
import { AppError, notFound } from "../utils/AppError.js";
import { zodFields } from "./validate.js";

export const notFoundHandler = (req, res, next) => {
  next(notFound("Route not found", "ROUTE_NOT_FOUND"));
};

const send = (res, status, code, message, fields) => {
  res.status(status).json({ error: { code, message, ...(fields ? { fields } : {}) } });
};

export const errorHandler = (err, req, res, next) => {
  const log = req.log || logger;

  if (err instanceof AppError) {
    if (err.status >= 500) log.error({ err }, err.message);
    return send(res, err.status, err.code, err.message, err.fields);
  }

  if (err instanceof ZodError) {
    return send(res, 400, "VALIDATION_ERROR", "Please check the highlighted fields", zodFields(err));
  }

  // body-parser errors (malformed JSON, payload too large)
  if (err?.type === "entity.parse.failed") {
    return send(res, 400, "INVALID_JSON", "Request body is not valid JSON");
  }
  if (err?.type === "entity.too.large") {
    return send(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }

  log.error({ err }, "Unhandled error");
  send(res, 500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
};
