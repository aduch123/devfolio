import sharp from "sharp";
import prisma from "../../config/prisma.js";
import { storage } from "../../config/storage.js";
import { badRequest, notFound } from "../../utils/AppError.js";
import { sniffImage, isPdf } from "../../utils/fileType.js";
import { presentProfile } from "../../utils/sectionConfig.js";

const invalid = (message) => badRequest(message, { file: message }, "INVALID_FILE");

// Decode, resize and re-encode as WebP. Re-encoding drops metadata and anything hidden in the original.
async function processImage(buffer, kind) {
  if (!sniffImage(buffer)) throw invalid("Upload a JPEG, PNG or WebP image");
  const image = sharp(buffer, { limitInputPixels: 40_000_000 }).rotate();
  const sized =
    kind === "avatar"
      ? image.resize(512, 512, { fit: "cover" })
      : image.resize(1600, 1000, { fit: "inside", withoutEnlargement: true });
  try {
    return await sized.webp({ quality: 82 }).toBuffer();
  } catch {
    throw invalid("That image could not be read. Try another file.");
  }
}

// Save the new file, point the row at it, and only then delete the old one (the old file stays if the write fails).
async function replaceFile({ kind, ext, buffer, currentUrl, write }) {
  const url = await storage.save(kind, buffer, ext);
  let result;
  try {
    result = await write(url);
  } catch (err) {
    await storage.remove(url);
    throw err;
  }
  await storage.remove(currentUrl);
  return result;
}

const profileOf = (userId) => prisma.profile.findUnique({ where: { userId } });
const setProfile = (userId, data) => prisma.profile.update({ where: { userId }, data });

export const uploadAvatar = async (req, res) => {
  const buffer = await processImage(req.file.buffer, "avatar");
  const current = await profileOf(req.user.id);
  const profile = await replaceFile({
    kind: "avatars", ext: ".webp", buffer, currentUrl: current?.avatarUrl,
    write: (url) => setProfile(req.user.id, { avatarUrl: url }),
  });
  res.status(200).json({ profile: presentProfile(profile) });
};

export const deleteAvatar = async (req, res) => {
  const current = await profileOf(req.user.id);
  await setProfile(req.user.id, { avatarUrl: null });
  await storage.remove(current?.avatarUrl);
  res.status(204).send();
};

export const uploadResume = async (req, res) => {
  if (!isPdf(req.file.buffer)) throw invalid("Upload a PDF file");
  const current = await profileOf(req.user.id);
  const profile = await replaceFile({
    kind: "resumes", ext: ".pdf", buffer: req.file.buffer, currentUrl: current?.resumeUrl,
    write: (url) => setProfile(req.user.id, { resumeUrl: url }),
  });
  res.status(200).json({ profile: presentProfile(profile) });
};

export const deleteResume = async (req, res) => {
  const current = await profileOf(req.user.id);
  await setProfile(req.user.id, { resumeUrl: null });
  await storage.remove(current?.resumeUrl);
  res.status(204).send();
};

const ownedProject = async (req) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project || project.userId !== req.user.id) throw notFound("Project not found", "PROJECT_NOT_FOUND");
  return project;
};

export const uploadCover = async (req, res) => {
  const project = await ownedProject(req);
  const buffer = await processImage(req.file.buffer, "cover");
  const updated = await replaceFile({
    kind: "covers", ext: ".webp", buffer, currentUrl: project.coverImageUrl,
    write: (url) => prisma.project.update({ where: { id: project.id }, data: { coverImageUrl: url } }),
  });
  res.status(200).json({ project: updated });
};

export const deleteCover = async (req, res) => {
  const project = await ownedProject(req);
  await prisma.project.update({ where: { id: project.id }, data: { coverImageUrl: null } });
  await storage.remove(project.coverImageUrl);
  res.status(204).send();
};
