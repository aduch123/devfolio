import prisma from "../config/prisma.js";
import { DAY } from "../modules/analytics/visitor.js";
export async function rollupViews(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 13);
  cutoff.setUTCHours(0, 0, 0, 0);
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7193107)`;
      const groups =
        await tx.$queryRaw`SELECT "userId", date_trunc('day',"createdAt") AS day, COUNT(*) AS views, COUNT(DISTINCT "visitorHash") AS visitors FROM "View" WHERE "createdAt" < ${cutoff} GROUP BY 1,2 ORDER BY 2 LIMIT 100`;
      let removed = 0;
      for (const group of groups) {
        const end = new Date(group.day.getTime() + DAY),
          where = { userId: group.userId, createdAt: { gte: group.day, lt: end } };
        const [sources, devices, current] = await Promise.all([
          tx.view.groupBy({ by: ["referrerHost"], where, _count: true }),
          tx.view.groupBy({ by: ["deviceType"], where, _count: true }),
          tx.dailyMetric.findUnique({
            where: { userId_day: { userId: group.userId, day: group.day } },
          }),
        ]);
        const merge = (old, rows, field) => {
          const result = Object.assign(Object.create(null), old || {});
          for (const row of rows) {
            const key = row[field] || "Direct";
            result[key] = (result[key] || 0) + row._count;
          }
          return result;
        };
        const data = {
          views: (current?.views || 0) + Number(group.views),
          uniqueVisitors: (current?.uniqueVisitors || 0) + Number(group.visitors),
          sources: merge(current?.sources, sources, "referrerHost"),
          devices: merge(current?.devices, devices, "deviceType"),
        };
        await tx.dailyMetric.upsert({
          where: { userId_day: { userId: group.userId, day: group.day } },
          create: { userId: group.userId, day: group.day, ...data },
          update: data,
        });
        removed += (await tx.view.deleteMany({ where })).count;
      }
      return { days: groups.length, removed };
    },
    { timeout: 60000 },
  );
}
