import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { conflict, unauthorized } from "../../utils/AppError.js";

export const signup = async (req, res) => {
  const { email, username, password } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existingUser) {
    throw conflict("Email or username already in use", "USER_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      profile: { create: {} },
    },
    select: { id: true, email: true, username: true },
  });

  res.status(201).json({ user });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      onboardingComplete: user.onboardingComplete,
    },
  });
};
