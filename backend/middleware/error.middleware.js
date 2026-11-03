import { reportServerError } from "../utils/errorReporter.js";
import { escapeHtml } from "../../frontend/js/portfolioView.js";
import { ZodError } from "zod";
import logger from "../config/logger.js";
import { AppError, notFound } from "../utils/AppError.js";
import { zodFields } from "./validate.js";

export const notFoundHandler = (req, res, next) => {
  next(notFound("Route not found", "ROUTE_NOT_FOUND"));
};

const send = (req, res, status, code, message, fields) => {
  if (!req.path.startsWith("/api/") && req.accepts(["html", "json"]) === "html") {
    const title =
      status === 404
        ? "Page not found"
        : status >= 500
          ? "We couldn't load this page"
          : "This request could not be completed";
    return res
      .status(status)
      .set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" })
      .type("html")
      .send(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | Devfolio</title><link rel="stylesheet" href="/css/global.css"><link rel="stylesheet" href="/css/themes.css"><script src="/js/colorMode.js"></script></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="/">Back to Devfolio</a></main></body></html>`,
      );
  }
  res.status(status).json({ error: { code, message, ...(fields ? { fields } : {}) } });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const log = req.log || logger;

  if (err instanceof AppError) {
    if (err.status >= 500) {
      log.error({ err }, err.message);
      reportServerError({ requestId: req.id });
    }
    return send(req, res, err.status, err.code, err.message, err.fields);
  }

  if (err instanceof ZodError) {
    return send(
      req,
      res,
      400,
      "VALIDATION_ERROR",
      "Please check the highlighted fields",
      zodFields(err),
    );
  }

  // body-parser errors (malformed JSON, payload too large)
  if (err?.type === "entity.parse.failed") {
    return send(req, res, 400, "INVALID_JSON", "Request body is not valid JSON");
  }
  if (err?.type === "entity.too.large") {
    return send(req, res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }

  log.error({ err }, "Unhandled error");
  reportServerError({ requestId: req.id });
  send(req, res, 500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
};
