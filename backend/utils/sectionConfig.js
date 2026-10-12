import { z } from "zod";
import { validationError } from "./AppError.js";

// Which sections a portfolio shows and in what order. Stored in Profile.sectionConfig (JSON).
// Missing sections fall back to these defaults, so older profiles and partial updates just work.
export const SECTIONS = ["about", "skills", "projects", "experience", "education", "contact"];

export const DEFAULT_SECTION_CONFIG = Object.fromEntries(
  SECTIONS.map((name, order) => [name, { visible: true, order }]),
);

const sectionPatch = z.strictObject({
  visible: z.boolean({ error: "Must be true or false" }).optional(),
  order: z
    .number({ error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Must be 0 or more")
    .max(SECTIONS.length - 1, `Must be at most ${SECTIONS.length - 1}`)
    .optional(),
});

// Partial update: any subset of the known sections, each with any subset of { visible, order }.
// Unknown section names are rejected. `null` resets everything to the defaults.
export const sectionConfigSchema = z
  .strictObject(Object.fromEntries(SECTIONS.map((name) => [name, sectionPatch.optional()])))
  .nullable()
  .optional();

// Stored value (or null) + optional patch -> the full config with every section filled in.
export function resolveSectionConfig(stored, patch) {
  if (patch === null) return structuredClone(DEFAULT_SECTION_CONFIG);
  const out = {};
  for (const name of SECTIONS) {
    out[name] = {
      ...DEFAULT_SECTION_CONFIG[name],
      ...(stored?.[name] ?? {}),
      ...(patch?.[name] ?? {}),
    };
  }
  return out;
}

// Like resolve, but refuses a result where two sections share a position.
export function mergeSectionConfig(stored, patch) {
  const merged = resolveSectionConfig(stored, patch);
  const seen = new Map();
  for (const name of SECTIONS) {
    const { order } = merged[name];
    if (seen.has(order)) {
      throw validationError({
        sectionConfig: `"${seen.get(order)}" and "${name}" cannot share position ${order}`,
      });
    }
    seen.set(order, name);
  }
  return merged;
}

// Profile rows as returned by the API: sectionConfig always complete.
export const presentProfile = (profile) =>
  profile && { ...profile, sectionConfig: resolveSectionConfig(profile.sectionConfig) };

// A public portfolio payload with a complete sectionConfig inside `profile`.
export const presentPublic = (user) => user && { ...user, profile: presentProfile(user.profile) };
