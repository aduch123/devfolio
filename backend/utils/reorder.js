import prisma from "../config/prisma.js";
import { badRequest, notFound } from "./AppError.js";

// Shared by every "PUT .../order" endpoint. `model` is a Prisma delegate name (skill, project...).
// `ids` must be exactly the caller's own rows: an id the user does not own is a 404 (same as a
// missing row), a duplicate or missing id is a 400. The new order is written in one transaction.
export async function reorderOwned(model, userId, ids, { where = {}, notFoundCode, label }) {
  const rows = await prisma[model].findMany({ where: { userId, ...where }, select: { id: true } });
  const owned = new Set(rows.map((r) => r.id));

  if (new Set(ids).size !== ids.length) {
    throw badRequest("The list contains the same id twice", undefined, "INVALID_ORDER");
  }
  if (ids.some((id) => !owned.has(id))) throw notFound(`${label} not found`, notFoundCode);
  if (ids.length !== owned.size) {
    throw badRequest(`Send every one of your ${label.toLowerCase()}s, in the order you want`, undefined, "INVALID_ORDER");
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma[model].update({ where: { id }, data: { sortOrder: index } }))
  );
}

// Next free sortOrder for a user's list (new items go last).
export async function nextSortOrder(model, userId, where = {}) {
  const last = await prisma[model].aggregate({ where: { userId, ...where }, _max: { sortOrder: true } });
  return (last._max.sortOrder ?? -1) + 1;
}
