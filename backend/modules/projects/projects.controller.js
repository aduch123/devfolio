import prisma from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { conflict, notFound } from "../../utils/AppError.js";
import { storage } from "../../config/storage.js";
import { reorderOwned, nextSortOrder } from "../../utils/reorder.js";

export const PROJECT_ORDER = [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }];

const assertFeaturedRoom = async (userId, exceptId) => {
  const featured = await prisma.project.count({
    where: { userId, featured: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
  if (featured >= env.MAX_FEATURED_PROJECTS) {
    throw conflict(`You can feature at most ${env.MAX_FEATURED_PROJECTS} projects`, "FEATURED_LIMIT");
  }
};

export const getProjects = async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.user.id },
    orderBy: PROJECT_ORDER,
  });
  res.status(200).json({ projects });
};

export const createProject = async (req, res) => {
  if (req.body.featured) await assertFeaturedRoom(req.user.id);

  const project = await prisma.project.create({
    data: {
      ...req.body,
      sortOrder: await nextSortOrder("project", req.user.id),
      userId: req.user.id,
    },
  });

  res.status(201).json({ project });
};

export const updateProject = async (req, res) => {
  const { id } = req.params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== req.user.id) {
    throw notFound("Project not found", "PROJECT_NOT_FOUND");
  }

  if (req.body.featured === true && !project.featured) await assertFeaturedRoom(req.user.id, id);

  const updated = await prisma.project.update({
    where: { id },
    data: req.body,
  });

  res.status(200).json({ project: updated });
};

export const deleteProject = async (req, res) => {
  const { id } = req.params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== req.user.id) {
    throw notFound("Project not found", "PROJECT_NOT_FOUND");
  }

  await prisma.project.delete({ where: { id } });
  await storage.remove(project.coverImageUrl);
  res.status(204).send();
};

export const reorderProjects = async (req, res) => {
  await reorderOwned("project", req.user.id, req.body.ids, {
    notFoundCode: "PROJECT_NOT_FOUND",
    label: "Project",
  });
  res.status(204).send();
};
