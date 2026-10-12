import multer from "multer";
import { AppError, badRequest } from "../utils/AppError.js";

const MB = 1024 * 1024;
export const IMAGE_MAX_BYTES = 2 * MB;
export const RESUME_MAX_BYTES = 5 * MB;

// Single file in the form field "file", kept in memory (it is checked and re-encoded before it is stored).
const single = (maxBytes, label) => {
  const parse = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1 } }).single("file");
  return (req, res, next) =>
    parse(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new AppError(413, "FILE_TOO_LARGE", `${label} must be ${maxBytes / MB} MB or smaller`));
        }
        return next(badRequest("Send one file in the field called \"file\"", undefined, "BAD_UPLOAD"));
      }
      if (err) return next(err);
      if (!req.file) {
        return next(badRequest("Choose a file to upload", { file: "Choose a file to upload" }, "NO_FILE"));
      }
      next();
    });
};

export const imageUpload = single(IMAGE_MAX_BYTES, "The image");
export const resumeUpload = single(RESUME_MAX_BYTES, "The resume");
