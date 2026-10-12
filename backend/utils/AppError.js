export class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    if (fields) this.fields = fields;
  }
}

export const badRequest = (message = "Bad request", fields, code = "BAD_REQUEST") =>
  new AppError(400, code, message, fields);

export const validationError = (fields, message = "Please check the highlighted fields") =>
  new AppError(400, "VALIDATION_ERROR", message, fields);

export const unauthorized = (message = "Please log in", code = "UNAUTHORIZED") =>
  new AppError(401, code, message);

export const forbidden = (message = "Not allowed", code = "FORBIDDEN") =>
  new AppError(403, code, message);

export const notFound = (message = "Not found", code = "NOT_FOUND") =>
  new AppError(404, code, message);

export const conflict = (message = "Conflict", code = "CONFLICT") =>
  new AppError(409, code, message);

export const tooMany = (message = "Too many requests, try again later", code = "RATE_LIMITED") =>
  new AppError(429, code, message);
