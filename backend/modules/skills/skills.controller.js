import prisma from "../../config/prisma.js";
import { conflict, notFound } from "../../utils/AppError.js";
import { isUniqueViolation } from "../../utils/prismaErrors.js";

const duplicateSkill = () => conflict("You already added this skill", "SKILL_EXISTS");

export const getSkills = async (req, res) => {
  const skills = await prisma.skill.findMany({
    where: { userId: req.user.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  res.status(200).json({ skills });
};

export const createSkill = async (req, res) => {
  const existing = await prisma.skill.findFirst({
    where: { userId: req.user.id, name: { equals: req.body.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw duplicateSkill();

  try {
    const skill = await prisma.skill.create({
      data: { ...req.body, userId: req.user.id },
    });
    res.status(201).json({ skill });
  } catch (err) {
    if (isUniqueViolation(err)) throw duplicateSkill();
    throw err;
  }
};

export const updateSkill = async (req, res) => {
  const { id } = req.params;
  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill || skill.userId !== req.user.id) {
    throw notFound("Skill not found", "SKILL_NOT_FOUND");
  }

  if (req.body.name) {
    const clash = await prisma.skill.findFirst({
      where: {
        userId: req.user.id,
        id: { not: id },
        name: { equals: req.body.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (clash) throw duplicateSkill();
  }

  try {
    const updated = await prisma.skill.update({ where: { id }, data: req.body });
    res.status(200).json({ skill: updated });
  } catch (err) {
    if (isUniqueViolation(err)) throw duplicateSkill();
    throw err;
  }
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
