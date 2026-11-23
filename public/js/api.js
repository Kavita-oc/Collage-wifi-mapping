// Shared helpers: API wrapper, escaping, toasts, dialog form, generic CRUD table.
const api = {
  async request(url, options = {}) {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options
    });

    let body = null;
    try {
      body = await response.json();
    } catch (_) {
      /* non-JSON response */
    }

    if (!response.ok || (body && body.success === false)) {
      throw new Error((body && body.message) || `Request failed (${response.status})`);
    }
    return body;
  },
  get(url) {
    return this.request(url);
  },
  post(url, data) {
    return this.request(url, { method: "POST", body: JSON.stringify(data) });
  },
  put(url, data) {
    return this.request(url, { method: "PUT", body: JSON.stringify(data) });
  },
  del(url) {
    return this.request(url, { method: "DELETE" });
  }
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function toast(message, type = "info") {
  const container = document.querySelector("#toast-container");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// MySQL DATETIME string -> value for <input type="datetime-local">
function toInputDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function signalBadge(dbm) {
  const v = Number(dbm);
  let label = "Poor";
  if (v >= -50) label = "Excellent";
  else if (v >= -67) label = "Good";
  else if (v >= -75) label = "Fair";
  return `<span class="badge ${label.toLowerCase()}">${label}</span>`;
}

/**
 * Opens the shared dialog.
 * fields: [{ name, label, type, required, options:[{value,label}], step, value }]
 * onSubmit(data) must return a promise; errors are shown inside the dialog.
 */
function openForm({ title, fields, values = {}, onSubmit }) {
  const dialog = document.querySelector("#form-dialog");
  const form = dialog.querySelector("form");
  const errorBox = form.querySelector(".form-error");

  form.querySelector("h3").textContent = title;
  errorBox.textContent = "";

  form.querySelector(".form-fields").innerHTML = fields
    .map((f) => {
      const current = values[f.name] ?? f.value ?? "";
      const required = f.required === false ? "" : "required";
      let control;

      if (f.type === "select") {
        control = `<select name="${f.name}" ${required}>
          <option value="">Select…</option>
          ${f.options
            .map(
              (o) =>
                `<option value="${escapeHtml(o.value)}" ${
                  String(o.value) === String(current) ? "selected" : ""
                }>${escapeHtml(o.label)}</option>`
            )
            .join("")}
        </select>`;
      } else {
        control = `<input name="${f.name}" type="${f.type || "text"}"
          value="${escapeHtml(current)}" ${f.step ? `step="${f.step}"` : ""}
          ${f.min !== undefined ? `min="${f.min}"` : ""}
          ${f.max !== undefined ? `max="${f.max}"` : ""} ${required} />`;
      }
      return `<label>${escapeHtml(f.label)}${control}</label>`;
    })
    .join("");

  form.onsubmit = async (event) => {
    event.preventDefault();
    errorBox.textContent = "";
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await onSubmit(data);
      dialog.close();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  };

  form.querySelector("[data-cancel]").onclick = () => dialog.close();
  dialog.showModal();
}

/**
 * Generic CRUD view renderer used by locations, access points, users, readings.
 * config: { root, title, subtitle, endpoint, idKey, columns, load(), fields(), toFormValues(row), beforeSubmit(data), singular }
 */
function createCrudView(config) {
  const root = document.querySelector(config.root);
  let rows = [];
  let filter = "";

  async function refresh() {
    try {
      const result = await config.load();
      rows = result.data;
      render();
    } catch (error) {
      root.innerHTML = `<p class="empty">Failed to load: ${escapeHtml(error.message)}</p>`;
    }
  }

  function render() {
    const needle = filter.trim().toLowerCase();
    const visible = needle
      ? rows.filter((r) => JSON.stringify(Object.values(r)).toLowerCase().includes(needle))
      : rows;

    root.innerHTML = `
      <div class="view-head">
        <div>
          <h2>${escapeHtml(config.title)}</h2>
          <p class="muted">${escapeHtml(config.subtitle)} — ${rows.length} total</p>
        </div>
        <div class="toolbar">
          <input type="search" placeholder="Search…" value="${escapeHtml(filter)}" data-search />
          <button class="btn primary" data-add>+ Add ${escapeHtml(config.singular)}</button>
        </div>
      </div>
      <div class="card table-wrap">
        ${
          visible.length === 0
            ? `<p class="empty">No records found.</p>`
            : `<table>
                <thead><tr>
                  ${config.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}
                  <th>Actions</th>
                </tr></thead>
                <tbody>
                  ${visible
                    .map(
                      (row) => `<tr>
                        ${config.columns
                          .map((c) => `<td>${c.render ? c.render(row) : escapeHtml(row[c.key] ?? "—")}</td>`)
                          .join("")}
                        <td class="actions">
                          <button class="btn small" data-edit="${row[config.idKey]}">Edit</button>
                          <button class="btn small danger" data-delete="${row[config.idKey]}">Delete</button>
                        </td>
                      </tr>`
                    )
                    .join("")}
                </tbody>
              </table>`
        }
      </div>`;

    const search = root.querySelector("[data-search]");
    search.addEventListener("input", (e) => {
      filter = e.target.value;
      render();
      const again = root.querySelector("[data-search]");
      again.focus();
      again.setSelectionRange(filter.length, filter.length);
    });

    root.querySelector("[data-add]").addEventListener("click", () => openEditor(null));
    root.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const row = rows.find((r) => String(r[config.idKey]) === btn.dataset.edit);
        openEditor(row);
      })
    );
    root.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => removeRow(btn.dataset.delete))
    );
  }

  async function openEditor(row) {
    let fields;
    try {
      fields = await config.fields();
    } catch (error) {
      toast(error.message, "error");
      return;
    }

    openForm({
      title: row ? `Edit ${config.singular}` : `Add ${config.singular}`,
      fields,
      values: row ? (config.toFormValues ? config.toFormValues(row) : row) : {},
      onSubmit: async (data) => {
        const payload = config.beforeSubmit ? config.beforeSubmit(data) : data;
        if (row) {
          await api.put(`${config.endpoint}/${row[config.idKey]}`, payload);
          toast(`${config.singular} updated`, "success");
        } else {
          await api.post(config.endpoint, payload);
          toast(`${config.singular} added`, "success");
        }
        await refresh();
      }
    });
  }

  async function removeRow(id) {
    if (!confirm(`Delete this ${config.singular.toLowerCase()}?`)) return;
    try {
      await api.del(`${config.endpoint}/${id}`);
      toast(`${config.singular} deleted`, "success");
      await refresh();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  return { refresh };
}
