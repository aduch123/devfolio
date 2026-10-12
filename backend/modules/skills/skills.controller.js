import prisma from "../../config/prisma.js";
import { notFound } from "../../utils/AppError.js";

export const getSkills = async (req, res) => {
  const skills = await prisma.skill.findMany({
    where: { userId: req.user.id },
  });
  res.status(200).json({ skills });
};

export const createSkill = async (req, res) => {
  const skill = await prisma.skill.create({
    data: { ...req.body, userId: req.user.id },
  });

  res.status(201).json({ skill });
};

export const updateSkill = async (req, res) => {
  const { id } = req.params;
  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill || skill.userId !== req.user.id) {
    throw notFound("Skill not found", "SKILL_NOT_FOUND");
  }

  const updated = await prisma.skill.update({
    where: { id },
    data: req.body,
  });

  res.status(200).json({ skill: updated });
};

export const deleteSkill = async (req, res) => {
  const { id } = req.params;

  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill || skill.userId !== req.user.id) {
    throw notFound("Skill not found", "SKILL_NOT_FOUND");
  }

  await prisma.skill.delete({ where: { id } });
  res.status(204).send();
};