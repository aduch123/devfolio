import fs from "node:fs";
import sharp from "sharp";
import prisma from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { APP_NAME } from "../../config/constants.js";
import { PUBLIC_PORTFOLIO_SELECT } from "../../utils/publicPortfolio.js";
import { presentPublic } from "../../utils/sectionConfig.js";
import {
  portfolioView,
  viewToHtml,
  escapeHtml,
  safeHref,
} from "../../../frontend/js/portfolioView.js";

const template = fs.readFileSync(
  new URL("../../../frontend/pages/portfolio.html", import.meta.url),
  "utf8",
);
const origin = () => env.APP_URL || `http://localhost:${env.PORT}`;
const json = (value) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
export function unavailablePage(res, message = "This portfolio is not available") {
  return res
    .status(404)
    .set({ "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" })
    .type("html")
    .send(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Portfolio unavailable | ${APP_NAME}</title><link rel="stylesheet" href="/css/global.css"></head><body><main><h1>${escapeHtml(message)}</h1><p>The portfolio may be unpublished or the link may have expired or been revoked.</p><a href="/">Go to ${APP_NAME}</a></main></body></html>`,
    );
}
export function sendPortfolioPage(res, user, { privateLink = false } = {}) {
  const data = presentPublic(user);
  const p = data.profile || {};
  const name = p.displayName || user.username;
  const title = p.seoTitle || `${name} | ${APP_NAME}`;
  const description =
    p.seoDescription ||
    (p.aboutText || p.headline || `${name}'s developer portfolio`)
      .replace(/\s+/g, " ")
      .slice(0, 160);
  const canonical = `${origin()}/${encodeURIComponent(user.username)}`;
  const image = safeHref(p.ogImageUrl) || `${canonical}/og.png`;
  const head = `<meta name="robots" content="${privateLink ? "noindex,nofollow" : "index,follow"}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:site_name" content="${APP_NAME}"><meta property="og:type" content="profile"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image)}"><script type="application/ld+json">${json({ "@context": "https://schema.org", "@type": "Person", name, description, url: canonical, ...(p.headline ? { jobTitle: p.headline } : {}), sameAs: (data.socialLinks || []).map((item) => safeHref(item.url)).filter(Boolean) })}</script>`;
  let html = template
    .replace(/<title[^>]*>.*?<\/title>/, `<title id="page-title">${escapeHtml(title)}</title>`)
    .replace(
      /<meta name="description"[^>]*\/>/,
      `<meta name="description" content="${escapeHtml(description)}" id="page-description">`,
    )
    .replace("</head>", `${head}</head>`);
  html = html.replace(
    /<main id="main">[\s\S]*?<\/main>/,
    `<main id="main"><div id="portfolio-loading" hidden></div><div id="portfolio-error" hidden></div><div id="portfolio-content">${viewToHtml(portfolioView(data))}</div></main><script id="portfolio-data" type="application/json">${json(data)}</script>`,
  );
  for (const id of ["nav-username", "footer-name"])
    html = html.replace(
      new RegExp(`(<span id="${id}">)[^<]*(</span>)`),
      (_, open, close) => `${open}${escapeHtml(name)}${close}`,
    );
  html = html
    .replace('<span id="year"></span>', `<span id="year">${new Date().getUTCFullYear()}</span>`)
    .replaceAll('href="../css/', 'href="/css/')
    .replaceAll('src="../js/', 'src="/js/');
  for (const name of ["about", "skills", "projects", "experience", "education", "contact"]) {
    if (!html.includes(`id="${name}"`))
      html = html.replace(new RegExp(`<a href="#${name}" data-tab="${name}">[^<]*</a>`), "");
  }
  res
    .set({
      "Cache-Control": "no-store",
      ...(privateLink ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    })
    .type("html")
    .send(html);
}
export async function publicPortfolioPage(req, res) {
  const user = await prisma.user.findUnique({
    where: {
      username: req.params.username.toLowerCase(),
      deletedAt: null,
      profile: { published: true },
    },
    select: PUBLIC_PORTFOLIO_SELECT,
  });
  if (!user) return unavailablePage(res);
  return sendPortfolioPage(res, user);
}
export async function portfolioImage(req, res) {
  const user = await prisma.user.findUnique({
    where: {
      username: req.params.username.toLowerCase(),
      deletedAt: null,
      profile: { published: true },
    },
    select: { username: true, profile: { select: { displayName: true, headline: true } } },
  });
  if (!user) return res.status(404).end();
  const name = escapeHtml((user.profile.displayName || user.username).slice(0, 60));
  const headline = escapeHtml((user.profile.headline || "Developer portfolio").slice(0, 85));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#101827"/><text x="80" y="150" fill="#68e0b0" font-size="32">${APP_NAME}</text><text x="80" y="310" fill="white" font-family="sans-serif" font-size="54">${name}</text><text x="80" y="405" fill="#cbd5e1" font-family="sans-serif" font-size="28">${headline}</text></svg>`;
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  res.type("png").set("Cache-Control", "public, max-age=300").send(buffer);
}
export async function sitemap(req, res) {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, profile: { published: true } },
    select: { username: true },
  });
  res
    .type("application/xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${users.map((user) => `<url><loc>${escapeHtml(`${origin()}/${encodeURIComponent(user.username)}`)}</loc></url>`).join("")}</urlset>`,
    );
}
export function robots(req, res) {
  res
    .type("text/plain")
    .send(
      `User-agent: *\nDisallow: /dashboard\nDisallow: /preview\nDisallow: /share/\nDisallow: /api/\nSitemap: ${origin()}/sitemap.xml\n`,
    );
}
