import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "../../config/prisma.js";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(8),
});

export const signup = async (req, res) => {
  const result = signupSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const { email, username, password } = result.data;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existingUser) {
    return res.status(409).json({ error: "Email or username already in use" });
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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const login = async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid email or password" });
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
