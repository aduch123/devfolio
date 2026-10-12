import prisma from "../../config/prisma.js";
import { conflict, notFound, validationError } from "../../utils/AppError.js";
import { reorderOwned, nextSortOrder } from "../../utils/reorder.js";
import { LIMITS } from "../../utils/validators.js";

export const TIMELINE_ORDER = [
  { type: "asc" },
  { sortOrder: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
];

export const getTimeline = async (req, res) => {
  const type = req.validatedQuery?.type;
  const items = await prisma.timelineItem.findMany({
    where: { userId: req.user.id, ...(type ? { type } : {}) },
    orderBy: TIMELINE_ORDER,
  });
  res.status(200).json({ items });
};

export const createTimelineItem = async (req, res) => {
  const count = await prisma.timelineItem.count({ where: { userId: req.user.id } });
  if (count >= LIMITS.maxTimeline) {
    throw conflict(`You can have at most ${LIMITS.maxTimeline} timeline items`, "TIMELINE_LIMIT");
  }
  const item = await prisma.timelineItem.create({
    data: {
      ...req.body,
      sortOrder: await nextSortOrder("timelineItem", req.user.id, { type: req.body.type }),
      userId: req.user.id,
    },
  });
  res.status(201).json({ item });
};

export const updateTimelineItem = async (req, res) => {
  const existing = await prisma.timelineItem.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user.id) {
    throw notFound("Timeline item not found", "TIMELINE_NOT_FOUND");
  }

  // Re-check the date order against the values that will be stored.
  const start = req.body.startDate ?? existing.startDate;
  const end = req.body.endDate === undefined ? existing.endDate : req.body.endDate;
  if (end && end < start) {
    throw validationError({ endDate: "End date can't be before the start date" });
  }

  const item = await prisma.timelineItem.update({ where: { id: existing.id }, data: req.body });
  res.status(200).json({ item });
};

export const deleteTimelineItem = async (req, res) => {
  const existing = await prisma.timelineItem.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user.id) {
    throw notFound("Timeline item not found", "TIMELINE_NOT_FOUND");
  }
  await prisma.timelineItem.delete({ where: { id: existing.id } });
  res.status(204).send();
};

export const reorderTimeline = async (req, res) => {
  await reorderOwned("timelineItem", req.user.id, req.body.ids, {
    where: { type: req.body.type },
    notFoundCode: "TIMELINE_NOT_FOUND",
    label: "Timeline item",
  });
  res.status(204).send();
};
