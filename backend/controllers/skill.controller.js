import { z } from "zod";
import prisma from "../config/prisma.js";

const SKILL_VALUES = [
  "html", "css", "javascript", "python", "react", "nodejs",
  "express", "java", "typescript", "nextjs", "postgresql",
  "mongodb", "prisma", "git", "docker", "other",
];

const skillSchema = z.object({
  name: z.enum(SKILL_VALUES),
  level: z.enum(["great", "good", "learning"]),
});

export const getSkills = async (req, res) => {
  const skills = await prisma.skill.findMany({
    where: { userId: req.user.id },
  });
  res.status(200).json({ skills });
};

export const createSkill = async (req, res) => {
  const result = skillSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const skill = await prisma.skill.create({
    data: { ...result.data, userId: req.user.id },
  });

  res.status(201).json({ skill });
};

export const updateSkill = async (req, res) => {
  const { id } = req.params;
  const result = skillSchema.partial().safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill || skill.userId !== req.user.id) {
    return res.status(404).json({ error: "Skill not found" });
  }

  const updated = await prisma.skill.update({
    where: { id },
    data: result.data,
  });

  res.status(200).json({ skill: updated });
};

export const deleteSkill = async (req, res) => {
  const { id } = req.params;

  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill || skill.userId !== req.user.id) {
    return res.status(404).json({ error: "Skill not found" });
  }

  await prisma.skill.delete({ where: { id } });
  res.status(204).send();
};