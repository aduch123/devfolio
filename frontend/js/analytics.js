import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { make } from "./ui.js";
export async function mountAnalytics(root, { compact = false } = {}) {
  const host = make("section", "card analytics-panel");
  host.append(make("h2", "", "Portfolio performance"));
  const label = make("label", "", "Date range (UTC)");
  const range = make("select");
  for (const days of [7, 30, 90]) {
    const option = make("option", "", `${days} days`);
    option.value = String(days);
    option.selected = days === 30;
    range.append(option);
  }
  label.append(range);
  const status = make("p");
  status.setAttribute("role", "status");
  const content = make("div");
  host.append(label, status, content);
  root.append(host);
  async function load() {
    range.disabled = true;
    status.textContent = "Loading analytics…";
    const paths = compact ? ["summary"] : ["summary", "timeseries", "sources", "devices", "clicks"];
    const [results, feed] = await Promise.all([
      Promise.all(
        paths.map((path) => apiFetch(`${API_PREFIX}/analytics/${path}?days=${range.value}`)),
      ),
      apiFetch(`${API_PREFIX}/activity`),
    ]);
    range.disabled = false;
    if (results.some((result) => !result.ok)) {
      status.textContent = "Analytics could not load. Change the date range to retry.";
      return;
    }
    status.textContent = "";
    content.replaceChildren();
    const data = results[0].data;
    const cards = make("div", "cards");
    for (const [key, title] of [
      ["views", "Views"],
      ["uniqueVisitors", "Daily unique visitors"],
      ["likes", "New likes"],
      ["clicks", "Link clicks"],
    ]) {
      const card = make("article", "card");
      const change = data.change[key];
      card.append(
        make("h3", "", title),
        make("p", "card-value", String(data.current[key])),
        make(
          "p",
          "",
          change === null
            ? "No prior-period baseline"
            : `${change >= 0 ? "+" : ""}${change}% vs previous period`,
        ),
      );
      cards.append(card);
    }
    content.append(
      cards,
      make(
        "p",
        "",
        `All-time views: ${data.lifetimeViews}. Current likes: ${data.totalLikes}. Unread messages: ${data.unread}.`,
      ),
    );
    if (!data.current.views)
      content.append(make("p", "", "No views yet. Share your portfolio link!"));
    content.append(
      make(
        "p",
        "",
        "Privacy: no analytics cookies or third-party trackers. We store hashed visitor identifiers, referrer host and device category—not raw IP addresses. Identifiers rotate daily, so multi-day unique totals count visitor-days, not distinct people.",
      ),
    );
    if (!compact) {
      const series = results[1].data.series;
      const table = make("table", "analytics-table");
      table.append(make("caption", "", "Views and daily unique visitors by date"));
      const head = make("tr");
      for (const text of ["Date", "Views", "Daily unique visitors"]) {
        const th = make("th", "", text);
        th.scope = "col";
        head.append(th);
      }
      const thead = make("thead");
      thead.append(head);
      table.append(thead);
      const body = make("tbody");
      const max = Math.max(1, ...series.map((row) => row.views));
      for (const row of series) {
        const tr = make("tr");
        const date = make("th", "", row.day);
        date.scope = "row";
        const count = make("td");
        const bar = make("meter");
        bar.min = 0;
        bar.max = max;
        bar.value = row.views;
        bar.setAttribute("aria-label", `${row.day}: ${row.views} views`);
        count.append(bar, ` ${row.views}`);
        tr.append(date, count, make("td", "", String(row.uniqueVisitors)));
        body.append(tr);
      }
      table.append(body);
      content.append(table);
      for (const [index, title] of [
        [2, "Referrer hosts"],
        [3, "Devices"],
        [4, "Link clicks"],
      ]) {
        const section = make("section");
        section.append(make("h3", "", title));
        const list = make("ul");
        for (const row of results[index].data.items)
          list.append(make("li", "", `${row.label}: ${row.count}`));
        if (!list.children.length) list.append(make("li", "", "No data yet"));
        section.append(list);
        content.append(section);
      }
    }
    if (feed.ok) {
      const section = make("section");
      section.append(make("h3", "", "Recent activity"));
      const list = make("ul");
      for (const item of feed.data.items)
        list.append(make("li", "", `${new Date(item.createdAt).toLocaleString()}: ${item.label}`));
      if (!list.children.length) list.append(make("li", "", "No activity yet"));
      section.append(list);
      content.append(section);
    }
  }
  range.addEventListener("change", load);
  await load();
}
