import { z } from "zod";

export const SKILL_VALUES = [
  "html", "css", "javascript", "python", "react", "nodejs",
  "express", "java", "typescript", "nextjs", "postgresql",
  "mongodb", "prisma", "git", "docker", "other",
];
export const SKILL_LEVELS = ["great", "good", "learning"];
export const SKILL_CATEGORIES = ["frontend", "backend", "database", "tools", "other"];
// Presets are suggestions, not a hard list. Their category is the default when none is sent.
export const PRESET_CATEGORY = {
  html: "frontend", css: "frontend", javascript: "frontend", react: "frontend",
  typescript: "frontend", nextjs: "frontend",
  python: "backend", nodejs: "backend", express: "backend", java: "backend",
  postgresql: "database", mongodb: "database", prisma: "database",
  git: "tools", docker: "tools", other: "other",
};

export const LIMITS = {
  displayName: 80,
  aboutText: 2000,
  roleText: 60,
  maxRoles: 5,
  email: 254,
  url: 300,
  phoneMin: 7,
  phoneMax: 20,
  projectTitle: 100,
  projectDescription: 1000,
  tag: 30,
  maxTags: 10,
  skillName: 40,
  maxSkills: 50,
  maxProjects: 20,
  message: 2000,
  personName: 100,
};

const tooLong = (max) => `Must be at most ${max} characters`;

const isHttpUrl = (value) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

// "" and whitespace-only strings become null; undefined stays undefined (field not sent).
const emptyToNull = (value) =>
  typeof value === "string" && value.trim() === "" ? null : value;

// Wraps a schema so the field accepts a value, "" or null, and normalizes "" to null.
const clearable = (schema) =>
  z.preprocess(emptyToNull, schema.nullable().optional());

// ---- Required pieces ----
export const requiredText = (label, max) =>
  z.string().trim().min(1, `${label} is required`).max(max, tooLong(max));

// ---- Base pieces ----
export const safeUrl = (max = LIMITS.url) =>
  z
    .string()
    .trim()
    .max(max, tooLong(max))
    .refine(isHttpUrl, "Enter a valid link starting with http:// or https://");

export const phone = z
  .string()
  .trim()
  .regex(
    new RegExp(`^\\+?[0-9\\s\\-()]{${LIMITS.phoneMin},${LIMITS.phoneMax}}$`),
    `Enter a valid phone number (${LIMITS.phoneMin} to ${LIMITS.phoneMax} characters: digits, spaces, + - ( ))`
  );

const email = z
  .string()
  .trim()
  .max(LIMITS.email, tooLong(LIMITS.email))
  .email("Enter a valid email address");

// ---- Optional (clearable) pieces ----
export const optionalText = (max) => clearable(z.string().trim().max(max, tooLong(max)));
export const optionalUrl = clearable(safeUrl());
export const optionalEmail = clearable(email);
export const optionalPhone = clearable(phone);

// ---- Shared compound pieces ----
export const requiredEmail = email;
export const identityEmail = email.toLowerCase();

export const tagsList = z
  .array(
    z.string().trim().min(1, "Tags can't be empty").max(LIMITS.tag, tooLong(LIMITS.tag))
  )
  .max(LIMITS.maxTags, `At most ${LIMITS.maxTags} tags`);

export const heroRoleTexts = z
  .array(
    z.string().trim().min(1, "Role phrases can't be empty").max(LIMITS.roleText, tooLong(LIMITS.roleText))
  )
  .max(LIMITS.maxRoles, `At most ${LIMITS.maxRoles} role phrases`);

// A preset name (any casing) is stored as its lowercase preset value; anything else is a custom skill.
export const skillName = z
  .string({ error: "Enter a skill name" })
  .trim()
  .min(1, "Enter a skill name")
  .max(LIMITS.skillName, tooLong(LIMITS.skillName))
  .transform((v) => (SKILL_VALUES.includes(v.toLowerCase()) ? v.toLowerCase() : v));

export const skillFields = {
  name: skillName,
  level: z.enum(SKILL_LEVELS, { error: "Choose a level: great, good or learning" }),
  category: z.enum(SKILL_CATEGORIES, { error: "Choose a category" }).optional(),
};

// Extra columns derived on the server for a skill name (never trusted from the client).
export const skillDerived = (name, category) => ({
  isCustom: !SKILL_VALUES.includes(name),
  category: category ?? PRESET_CATEGORY[name] ?? "other",
});

export const projectFields = {
  title: requiredText("Title", LIMITS.projectTitle),
  description: optionalText(LIMITS.projectDescription),
  repoUrl: optionalUrl,
  liveUrl: optionalUrl,
  tags: tagsList.optional(),
};
