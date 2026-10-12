import crypto from "crypto";
import prisma from "../config/prisma.js";

export const generateShareToken = async (req, res) => {
  const shareToken = crypto.randomBytes(16).toString("hex");

  await prisma.user.update({
    where: { id: req.user.id },
    data: { shareToken },
  });

  res.status(200).json({ shareToken });
};

export const revokeShareToken = async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { shareToken: null },
  });

  res.status(204).send();
};

export const getSharedPortfolio = async (req, res) => {
  const { token } = req.params;

  const user = await prisma.user.findUnique({
    where: { shareToken: token },
    select: {
      username: true,
      profile: true,
      skills: true,
      projects: true,
    },
  });

  if (!user) {
    return res.status(404).json({ error: "Invalid or expired share link" });
  }

  res.status(200).json(user);
};

export const getShareToken = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { shareToken: true },
  });

  res.status(200).json({ shareToken: user.shareToken });
};