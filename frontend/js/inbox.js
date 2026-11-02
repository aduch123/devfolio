import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { make, confirmModal, toast } from "./ui.js";
export async function mountInbox(root, updateUnread) {
  const host = make("section", "card");
  const filter = make("form", "editor-form");
  const search = make("input");
  search.type = "search";
  search.maxLength = 200;
  const searchLabel = make("label", "", "Search messages");
  searchLabel.append(search);
  const status = make("select");
  for (const [value, text] of [
    ["", "All messages"],
    ["UNREAD", "Unread"],
    ["READ", "Read"],
    ["ARCHIVED", "Archived"],
  ]) {
    const option = make("option", "", text);
    option.value = value;
    status.append(option);
  }
  const statusLabel = make("label", "", "Status");
  statusLabel.append(status);
  const submit = make("button", "dash-btn dash-btn-primary", "Search");
  submit.type = "submit";
  filter.append(searchLabel, statusLabel, submit);
  const error = make("p");
  error.setAttribute("role", "alert");
  const list = make("div");
  const detail = make("section", "message-detail");
  detail.setAttribute("aria-label", "Message detail");
  const pager = make("div", "card-links");
  const prefs = make("label", "", "Email me when a new message arrives");
  const notification = make("input");
  notification.type = "checkbox";
  prefs.prepend(notification);
  host.append(prefs, filter, error, list, pager, detail);
  root.append(host);
  let page = 1;
  const preference = await apiFetch(`${API_PREFIX}/messages/preferences`);
  if (preference.ok) notification.checked = preference.data.emailNotifications;
  notification.addEventListener("change", async () => {
    notification.disabled = true;
    const result = await apiFetch(`${API_PREFIX}/messages/preferences`, {
      method: "PATCH",
      body: JSON.stringify({ emailNotifications: notification.checked }),
    });
    notification.disabled = false;
    if (!result.ok) {
      notification.checked = !notification.checked;
      toast(result.error.message, "error");
    }
  });
  function button(label, action) {
    const el = make("button", "dash-btn dash-btn-ghost", label);
    el.type = "button";
    el.addEventListener("click", async () => {
      el.disabled = true;
      try {
        await action();
      } finally {
        el.disabled = false;
      }
    });
    return el;
  }
  async function change(message, next) {
    const result = await apiFetch(`${API_PREFIX}/messages/${message.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    if (!result.ok) {
      error.textContent = result.error.message;
      return;
    }
    message.status = next;
    await load();
  }
  async function open(message) {
    if (message.status === "UNREAD") await change(message, "READ");
    const body = make("p", "message-body", message.body);
    const reply = make("a", "card-link", "Reply by email");
    reply.href = `mailto:${encodeURIComponent(message.senderEmail)}?subject=Re%3A%20Portfolio%20message`;
    const archive = button(
      message.status === "ARCHIVED" ? "Restore to inbox" : "Archive",
      async () => {
        await change(message, message.status === "ARCHIVED" ? "READ" : "ARCHIVED");
        archive.textContent = message.status === "ARCHIVED" ? "Restore to inbox" : "Archive";
      },
    );
    detail.replaceChildren(
      make("h2", "", message.senderName),
      make("p", "", message.senderEmail),
      make("p", "", new Date(message.createdAt).toLocaleString()),
      body,
      reply,
      button("Mark unread", () => change(message, "UNREAD")),
      archive,
      button("Delete", async () => {
        if (
          !(await confirmModal({
            title: "Delete message?",
            message: "This permanently deletes the message from your inbox.",
            danger: true,
          }))
        )
          return;
        const result = await apiFetch(`${API_PREFIX}/messages/${message.id}`, { method: "DELETE" });
        if (!result.ok) {
          error.textContent = result.error.message;
          return;
        }
        detail.replaceChildren();
        await load();
      }),
    );
  }
  async function load() {
    error.textContent = "";
    const query = new URLSearchParams({ page: String(page), q: search.value });
    if (status.value) query.set("status", status.value);
    const result = await apiFetch(`${API_PREFIX}/messages?${query}`);
    if (!result.ok) {
      error.textContent = result.error.message;
      return;
    }
    const data = result.data;
    updateUnread(data.unread);
    if (page > Math.max(1, data.pages)) {
      page = Math.max(1, data.pages);
      return load();
    }
    list.replaceChildren();
    if (!data.messages.length)
      list.append(
        make("p", "", "No messages found. Messages from your portfolio will appear here."),
      );
    for (const message of data.messages) {
      const row = make("article", "editor-item");
      row.append(
        button(`${message.status === "UNREAD" ? "Unread: " : ""}${message.senderName}`, () =>
          open(message),
        ),
        make("span", "", message.senderEmail),
        make("span", "", message.body.slice(0, 100)),
      );
      list.append(row);
    }
    const previous = button("Previous", async () => {
      page--;
      await load();
    });
    previous.disabled = page <= 1;
    const next = button("Next", async () => {
      page++;
      await load();
    });
    next.disabled = page >= data.pages;
    pager.replaceChildren(
      previous,
      make("span", "", `Page ${page} of ${Math.max(1, data.pages)}`),
      next,
    );
  }
  filter.addEventListener("submit", async (event) => {
    event.preventDefault();
    page = 1;
    await load();
  });
  status.addEventListener("change", async () => {
    page = 1;
    await load();
  });
  await load();
}
