import { applyPortfolioTheme } from "./theme.js";
import { portfolioView, viewToDom } from "./portfolioView.js";

export function render(data, options = {}) {
  const p = data.profile || {};
  applyPortfolioTheme(p, document, options);
  const name = p.displayName || data.username;
  for (const id of ["nav-username", "footer-name"]) document.getElementById(id).textContent = name;
  document.getElementById("page-title").textContent = `${name} | Portfolio`;
  document
    .getElementById("portfolio-content")
    .replaceChildren(...viewToDom(portfolioView(data, options), document));
  for (const name of ["about", "skills", "projects", "experience", "education", "contact"]) {
    const link = document.querySelector(`.nav-links a[data-tab="${name}"]`);
    if (link) link.hidden = document.getElementById(name).hidden;
  }
}
