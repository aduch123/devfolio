import { z } from "zod";
import { timelineFields, TIMELINE_TYPES, LIMITS } from "../../utils/validators.js";

const endAfterStart = (data, ctx) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date can't be before the start date" });
  }
};

export const timelineSchema = z.object(timelineFields).superRefine(endAfterStart);

// The type cannot change after creation (its order is kept per type); dates are re-checked in the controller.
export const timelineUpdateSchema = z.object(timelineFields).omit({ type: true }).partial();

export const timelineQuerySchema = z.object({ type: z.enum(TIMELINE_TYPES).optional() });

export const timelineOrderSchema = z.object({
  type: z.enum(TIMELINE_TYPES, { error: "Choose experience or education" }),
  ids: z.array(z.string().min(1)).max(LIMITS.maxTimeline, `At most ${LIMITS.maxTimeline} items`),
});
