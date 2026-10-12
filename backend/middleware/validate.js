import { validationError } from "../utils/AppError.js";

// Turns zod issues into { "field.path": "first message" }
export const zodFields = (error) => {
  const fields = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
};

// validate(schema) parses req.body; validate(schema, "query") parses req.query
// into req.validatedQuery (req.query is read-only in Express 5).
export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      return next(validationError(zodFields(result.error)));
    }
    if (source === "body") req.body = result.data;
    else req.validatedQuery = result.data;
    next();
  };
