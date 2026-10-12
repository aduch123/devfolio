import { z } from "zod";
import prisma from "../../config/prisma.js";

const projectSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  repoUrl: z.string().url().optional(),
  liveUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
});

export const getProjects = async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.user.id },
  });
  res.status(200).json({ projects });
};

export const createProject = async (req, res) => {
  const result = projectSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const project = await prisma.project.create({
    data: { ...result.data, userId: req.user.id },
  });

  res.status(201).json({ project });
};

export const updateProject = async (req, res) => {
  const { id } = req.params;
  const result = projectSchema.partial().safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: "Project not found" });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: result.data,
  });

  res.status(200).json({ project: updated });
};

export const deleteProject = async (req, res) => {
  const { id } = req.params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: "Project not found" });
  }

  await prisma.project.delete({ where: { id } });
  res.status(204).send();
};