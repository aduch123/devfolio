import prisma from "../../config/prisma.js";
import { DAY } from "./visitor.js";
const number = (value) => Number(value || 0);
const bounds = (days) => {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + 1);
  return { end, start: new Date(end.getTime() - days * DAY) };
};
async function series(userId, start, end) {
  const [raw, saved] = await Promise.all([
    prisma.$queryRaw`SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS views, COUNT(DISTINCT "visitorHash") AS visitors FROM "View" WHERE "userId" = ${userId} AND "createdAt" >= ${start} AND "createdAt" < ${end} GROUP BY 1 ORDER BY 1`,
    prisma.dailyMetric.findMany({ where: { userId, day: { gte: start, lt: end } } }),
  ]);
  const days = new Map();
  for (let time = start.getTime(); time < end.getTime(); time += DAY)
    days.set(new Date(time).toISOString().slice(0, 10), {
      day: new Date(time).toISOString().slice(0, 10),
      views: 0,
      uniqueVisitors: 0,
    });
  for (const row of [...raw, ...saved]) {
    const day = new Date(row.day).toISOString().slice(0, 10);
    const current = days.get(day);
    if (!current) continue;
    current.views += number(row.views);
    current.uniqueVisitors += number(row.visitors ?? row.uniqueVisitors);
  }
  return [...days.values()];
}
async function totals(userId, start, end) {
  const [rows, likes, clicks] = await Promise.all([
    series(userId, start, end),
    prisma.like.count({ where: { userId, createdAt: { gte: start, lt: end } } }),
    prisma.clickEvent.count({ where: { userId, createdAt: { gte: start, lt: end } } }),
  ]);
  return {
    views: rows.reduce((n, row) => n + row.views, 0),
    uniqueVisitors: rows.reduce((n, row) => n + row.uniqueVisitors, 0),
    likes,
    clicks,
  };
}
export async function summary(req, res) {
  const { days } = req.validatedQuery,
    { start, end } = bounds(days),
    userId = req.user.id;
  const [current, previous, raw, saved, unread, totalLikes] = await Promise.all([
    totals(userId, start, end),
    totals(userId, new Date(start.getTime() - days * DAY), start),
    prisma.view.count({ where: { userId } }),
    prisma.dailyMetric.aggregate({ where: { userId }, _sum: { views: true } }),
    prisma.message.count({ where: { userId, status: "UNREAD" } }),
    prisma.like.count({ where: { userId } }),
  ]);
  const change = Object.fromEntries(
    Object.keys(current).map((key) => [
      key,
      previous[key] ? Math.round(((current[key] - previous[key]) * 100) / previous[key]) : null,
    ]),
  );
  res.set("Cache-Control", "no-store").json({
    days,
    current,
    previous,
    change,
    lifetimeViews: raw + (saved._sum.views || 0),
    totalLikes,
    unread,
    uniqueDefinition:
      "Sum of daily unique visitors (visitor-days); not distinct people across days.",
  });
}
export async function timeseries(req, res) {
  const { start, end } = bounds(req.validatedQuery.days);
  res.json({ series: await series(req.user.id, start, end) });
}
export async function breakdown(req, res) {
  const { start, end } = bounds(req.validatedQuery.days),
    userId = req.user.id;
  const field = req.path.endsWith("sources") ? "referrerHost" : "deviceType";
  const [raw, saved] = await Promise.all([
    prisma.view.groupBy({
      by: [field],
      where: { userId, createdAt: { gte: start, lt: end } },
      _count: true,
    }),
    prisma.dailyMetric.findMany({ where: { userId, day: { gte: start, lt: end } } }),
  ]);
  const counts = new Map(raw.map((row) => [row[field] || "Direct", row._count]));
  for (const row of saved)
    for (const [key, value] of Object.entries(field === "referrerHost" ? row.sources : row.devices))
      counts.set(key, (counts.get(key) || 0) + number(value));
  res.json({
    items: [...counts]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
  });
}
export async function clickBreakdown(req, res) {
  const { start, end } = bounds(req.validatedQuery.days),
    userId = req.user.id;
  const rows = await prisma.clickEvent.groupBy({
    by: ["targetType", "targetId"],
    where: { userId, createdAt: { gte: start, lt: end } },
    _count: true,
  });
  const ids = rows.map((row) => row.targetId).filter(Boolean);
  const [projects, socials] = await Promise.all([
    prisma.project.findMany({
      where: { userId, id: { in: ids } },
      select: { id: true, title: true },
    }),
    prisma.socialLink.findMany({
      where: { userId, id: { in: ids } },
      select: { id: true, platform: true },
    }),
  ]);
  const labels = new Map([
    ...projects.map((row) => [row.id, row.title]),
    ...socials.map((row) => [row.id, row.platform]),
  ]);
  res.json({
    items: rows
      .map((row) => ({
        targetType: row.targetType,
        label: labels.get(row.targetId) || row.targetType,
        count: row._count,
      }))
      .sort((a, b) => b.count - a.count),
  });
}
export async function activity(req, res) {
  const userId = req.user.id;
  const [views, likes, clicks, messages] = await Promise.all([
    prisma.view.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { createdAt: true, deviceType: true },
    }),
    prisma.like.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { createdAt: true },
    }),
    prisma.clickEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { createdAt: true, targetType: true },
    }),
    prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { createdAt: true, senderName: true },
    }),
  ]);
  const items = [
    ...views.map((row) => ({ ...row, type: "view", label: `Portfolio view (${row.deviceType})` })),
    ...likes.map((row) => ({ ...row, type: "like", label: "Portfolio liked" })),
    ...clicks.map((row) => ({ ...row, type: "click", label: `Link clicked (${row.targetType})` })),
    ...messages.map((row) => ({
      ...row,
      type: "message",
      label: `Message from ${row.senderName}`,
    })),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);
  res.set("Cache-Control", "no-store").json({ items });
}
