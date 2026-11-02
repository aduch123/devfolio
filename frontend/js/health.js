import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { make } from "./ui.js";
export async function mountHealth(root) {
  const host = make("section", "card health-panel");
  host.append(make("h2", "", "Portfolio health"));
  const button = make("button", "dash-btn dash-btn-primary", "Recheck links");
  button.type = "button";
  const status = make("p");
  status.setAttribute("role", "status");
  const content = make("div");
  host.append(button, status, content);
  root.append(host);
  function render(report) {
    content.replaceChildren();
    const score = make("div", "health-score", `${report.score}/100`);
    score.setAttribute("role", "img");
    score.setAttribute("aria-label", `Portfolio health score ${report.score} out of 100`);
    score.style.setProperty("--health-progress", `${Math.max(0, Math.min(100, report.score))}%`);
    content.append(
      score,
      make(
        "p",
        "",
        report.trend === null
          ? "No previous check yet"
          : `${report.trend >= 0 ? "+" : ""}${report.trend} points since the last check`,
      ),
    );
    const categories = make("ul");
    for (const [name, max] of [
      ["completeness", 40],
      ["links", 25],
      ["seo", 20],
      ["contact", 15],
    ])
      categories.append(make("li", "", `${name.toUpperCase()}: ${report.categories[name]}/${max}`));
    content.append(categories);
    content.append(make("h3", "", "Suggested improvements"));
    const list = make("ul");
    for (const suggestion of report.suggestions) {
      const item = make("li", "editor-item");
      const fix = make("a", "card-link", "Fix");
      fix.href = suggestion.fix;
      const dismiss = make("button", "dash-btn dash-btn-ghost", "Dismiss");
      dismiss.type = "button";
      dismiss.addEventListener("click", async () => {
        dismiss.disabled = true;
        const result = await apiFetch(`${API_PREFIX}/health/dismiss`, {
          method: "POST",
          body: JSON.stringify({ key: suggestion.key }),
        });
        if (result.ok) await load();
        else {
          status.textContent = result.error.message;
          dismiss.disabled = false;
        }
      });
      item.append(
        make(
          "span",
          "",
          `${suggestion.label}${suggestion.points ? ` (+${suggestion.points} points)` : ""}`,
        ),
        fix,
        dismiss,
      );
      list.append(item);
    }
    if (!list.children.length)
      list.append(make("li", "", "No outstanding suggestions. Keep your portfolio current!"));
    content.append(list, make("h3", "", "Link status"));
    const table = make("table", "analytics-table");
    table.append(make("caption", "", "Latest checks of saved public links"));
    const head = make("tr");
    for (const title of ["Link", "Status", "Checked"]) {
      const th = make("th", "", title);
      th.scope = "col";
      head.append(th);
    }
    const thead = make("thead");
    thead.append(head);
    table.append(thead);
    const body = make("tbody");
    for (const check of report.checks) {
      const row = make("tr");
      row.append(
        make("th", "", check.label),
        make(
          "td",
          "",
          `${check.status}${check.httpStatus ? ` (${check.httpStatus})` : ""}${check.reason ? `: ${check.reason}` : ""}`,
        ),
        make(
          "td",
          "",
          check.checkedAt ? new Date(check.checkedAt).toLocaleString() : "Not checked",
        ),
      );
      body.append(row);
    }
    table.append(body);
    content.append(table);
    content.append(
      make(
        "p",
        "",
        "Health suggestions are advisory and do not block publishing. Link checks can be skipped when a site restricts automated access. A successful notification records provider acceptance, not a guarantee that it reached an inbox.",
      ),
    );
  }
  async function load() {
    const result = await apiFetch(`${API_PREFIX}/health/report`);
    if (!result.ok) {
      status.textContent = result.error.message;
      return null;
    }
    render(result.data);
    status.textContent = result.data.progress
      ? `Checking links: ${result.data.progress.done}/${result.data.progress.total}`
      : "";
    return result.data;
  }
  async function poll(attempt = 0) {
    if (!document.contains(host)) return;
    const report = await load();
    if (report?.progress && attempt < 120) setTimeout(() => void poll(attempt + 1), 750);
    else {
      button.disabled = false;
      if (report?.progress)
        status.textContent = "Checks continue in the background. Return later for the results.";
    }
  }
  button.addEventListener("click", async () => {
    button.disabled = true;
    const result = await apiFetch(`${API_PREFIX}/health/links/recheck`, { method: "POST" });
    if (!result.ok) {
      status.textContent = result.error.message;
      button.disabled = false;
      return;
    }
    await poll();
  });
  const report = await load();
  if (report?.progress) {
    button.disabled = true;
    void poll();
  }
}
