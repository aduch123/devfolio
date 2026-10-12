import prisma from "../../config/prisma.js";
import { notFound } from "../../utils/AppError.js";

export const getProjects = async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.user.id },
  });
  res.status(200).json({ projects });
};

export const createProject = async (req, res) => {
  const project = await prisma.project.create({
    data: { ...req.body, userId: req.user.id },
  });

  res.status(201).json({ project });
};

export const updateProject = async (req, res) => {
  const { id } = req.params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== req.user.id) {
    throw notFound("Project not found", "PROJECT_NOT_FOUND");
  }

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
  res.status(204).send();
};