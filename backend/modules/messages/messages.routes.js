import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import {
  contactLimiter,
  contactIpLimiter,
  portfolioContactLimiter,
} from "../../middleware/rateLimit.js";
import {
  unreadMessages,
  sendContactMessage,
  resolveMessageRecipient,
  listMessages,
  updateMessage,
  deleteMessage,
  getMessagePreferences,
  setMessagePreferences,
} from "./messages.controller.js";
import {
  messageSchema,
  messageListSchema,
  messageUpdateSchema,
  messagePreferencesSchema,
} from "./messages.schema.js";
const router = Router();
for (const path of ["/portfolio/:username/message", "/portfolio/share/:token/message"])
  router.post(
    path,
    contactIpLimiter,
    contactLimiter,
    validate(messageSchema),
    resolveMessageRecipient,
    portfolioContactLimiter,
    sendContactMessage,
  );
router.get("/messages/unread", requireAuth, unreadMessages);
router.get("/messages", requireAuth, validate(messageListSchema, "query"), listMessages);
router.get("/messages/preferences", requireAuth, getMessagePreferences);
router.patch(
  "/messages/preferences",
  requireAuth,
  validate(messagePreferencesSchema),
  setMessagePreferences,
);
router.patch("/messages/:id", requireAuth, validate(messageUpdateSchema), updateMessage);
router.delete("/messages/:id", requireAuth, deleteMessage);
export default router;
