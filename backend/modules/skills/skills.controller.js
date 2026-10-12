import prisma from "../../config/prisma.js";
import { conflict, notFound } from "../../utils/AppError.js";
import { isUniqueViolation } from "../../utils/prismaErrors.js";
import { skillDerived, LIMITS } from "../../utils/validators.js";
import { reorderOwned, nextSortOrder } from "../../utils/reorder.js";

const duplicateSkill = () => conflict("You already added this skill", "SKILL_EXISTS");
const SKILL_ORDER = [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }];

export const getSkills = async (req, res) => {
  const skills = await prisma.skill.findMany({
    where: { userId: req.user.id },
    orderBy: SKILL_ORDER,
  });
  res.status(200).json({ skills });
};

export const createSkill = async (req, res) => {
  const existing = await prisma.skill.findFirst({
    where: { userId: req.user.id, name: { equals: req.body.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw duplicateSkill();

  const count = await prisma.skill.count({ where: { userId: req.user.id } });
  if (count >= LIMITS.maxSkills) {
    throw conflict(`You can have at most ${LIMITS.maxSkills} skills`, "SKILL_LIMIT");
  }

  try {
    const skill = await prisma.skill.create({
      data: {
        ...req.body,
        ...skillDerived(req.body.name, req.body.category),
        sortOrder: await nextSortOrder("skill", req.user.id),
        userId: req.user.id,
      },
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
    const data = { ...req.body };
    if (data.name) {
      // Renaming can turn a custom skill into a preset or back; the category follows only if none was sent.
      const derived = skillDerived(data.name, data.category);
      data.isCustom = derived.isCustom;
      if (data.category === undefined && skill.category === "other") data.category = derived.category;
    }
    const updated = await prisma.skill.update({ where: { id }, data });
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

export const reorderSkills = async (req, res) => {
  await reorderOwned("skill", req.user.id, req.body.ids, {
    notFoundCode: "SKILL_NOT_FOUND",
    label: "Skill",
  });
  res.status(204).send();
};
