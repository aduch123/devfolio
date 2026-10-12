import prisma from "../../config/prisma.js";
import { conflict, notFound } from "../../utils/AppError.js";
import { reorderOwned, nextSortOrder } from "../../utils/reorder.js";
import { LIMITS } from "../../utils/validators.js";

export const SOCIAL_ORDER = [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }];

const findOwned = async (req) => {
  const link = await prisma.socialLink.findUnique({ where: { id: req.params.id } });
  if (!link || link.userId !== req.user.id) throw notFound("Link not found", "SOCIAL_NOT_FOUND");
  return link;
};

export const getSocialLinks = async (req, res) => {
  const links = await prisma.socialLink.findMany({ where: { userId: req.user.id }, orderBy: SOCIAL_ORDER });
  res.status(200).json({ links });
};

export const createSocialLink = async (req, res) => {
  const count = await prisma.socialLink.count({ where: { userId: req.user.id } });
  if (count >= LIMITS.maxSocial) {
    throw conflict(`You can have at most ${LIMITS.maxSocial} links`, "SOCIAL_LIMIT");
  }
  const link = await prisma.socialLink.create({
    data: { ...req.body, sortOrder: await nextSortOrder("socialLink", req.user.id), userId: req.user.id },
  });
  res.status(201).json({ link });
};

export const updateSocialLink = async (req, res) => {
  await findOwned(req);
  const link = await prisma.socialLink.update({ where: { id: req.params.id }, data: req.body });
  res.status(200).json({ link });
};

export const deleteSocialLink = async (req, res) => {
  await findOwned(req);
  await prisma.socialLink.delete({ where: { id: req.params.id } });
  res.status(204).send();
};

export const reorderSocialLinks = async (req, res) => {
  await reorderOwned("socialLink", req.user.id, req.body.ids, {
    notFoundCode: "SOCIAL_NOT_FOUND",
    label: "Link",
  });
  res.status(204).send();
};
