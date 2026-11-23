// Shared API, formatting, notification, dialog, and CRUD helpers.
const api = {
  async request(url, options = {}) {
    const headers = { Accept: "application/json", ...options.headers };
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    let response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (error) {
      throw new Error(`Could not reach the server: ${error.message}`);
    }

    const contentType = response.headers.get("content-type") || "";
    let body = null;
    if (contentType.includes("application/json")) {
      body = await response.json();
    } else if (response.status !== 204) {
      const text = await response.text();
      if (!response.ok && text) {
        throw new Error(text.slice(0, 240));
      }
    }

    if (!response.ok || (body && body.success === false)) {
      throw new Error(
        (body && (body.message || body.error)) || `Request failed (${response.status})`
      );
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
  if (!container) return;

  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function toInputDateTime(value) {
  if (!value) return "";
  const raw = String(value);
  const zonedDate = raw.match(/[zZ]|[+-]\d{2}:\d{2}$/);
  if (!zonedDate) {
    const mysqlDate = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    if (mysqlDate) return `${mysqlDate[1]}T${mysqlDate[2]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function signalBadge(dbm) {
  const value = Number(dbm);
  let label = "Poor";
  if (value >= -50) label = "Excellent";
  else if (value >= -67) label = "Good";
  else if (value >= -75) label = "Fair";
  return `<span class="badge ${label.toLowerCase()}">${label}</span>`;
}

function openForm({ title, fields, values = {}, onSubmit }) {
  const dialog = document.querySelector("#form-dialog");
  dialog.oncancel = () => dialog.close();
  dialog.onkeydown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
    }
  };
  const form = dialog.querySelector("form");
  const errorBox = form.querySelector(".form-error");
  const submitButton = form.querySelector('[type="submit"]');

  form.querySelector("h2").textContent = title;
  errorBox.textContent = "";
  form.querySelector(".form-fields").innerHTML = fields
    .map((field) => {
      const current = values[field.name] ?? field.value ?? "";
      const required = field.required === false ? "" : "required";
      const controlId = `field-${field.name}`;
      const help = field.help
        ? `<span class="field-help">${escapeHtml(field.help)}</span>`
        : "";
      let control;

      if (field.type === "select") {
        const options = (field.options || [])
          .map(
            (option) => `<option value="${escapeHtml(option.value)}" ${
              String(option.value) === String(current) ? "selected" : ""
            }>${escapeHtml(option.label)}</option>`
          )
          .join("");
        control = `<select id="${controlId}" name="${escapeHtml(field.name)}" ${required}>
          <option value="">Select…</option>${options}
        </select>`;
      } else {
        control = `<input id="${controlId}" name="${escapeHtml(field.name)}"
          type="${escapeHtml(field.type || "text")}" value="${escapeHtml(current)}"
          ${field.step !== undefined ? `step="${escapeHtml(field.step)}"` : ""}
          ${field.min !== undefined ? `min="${escapeHtml(field.min)}"` : ""}
          ${field.max !== undefined ? `max="${escapeHtml(field.max)}"` : ""}
          ${field.maxLength ? `maxlength="${escapeHtml(field.maxLength)}"` : ""}
          ${required} />`;
      }
      return `<label for="${controlId}">${escapeHtml(field.label)}${control}${help}</label>`;
    })
    .join("");

  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    errorBox.textContent = "";
    submitButton.disabled = true;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await onSubmit(data);
      dialog.close();
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      submitButton.disabled = false;
    }
  };

  form.querySelectorAll("[data-cancel]").forEach((button) => {
    button.onclick = () => dialog.close();
  });
  dialog.showModal();
}

function createCrudView(config) {
  const root = document.querySelector(config.root);
  let rows = [];
  let search = "";
  const filters = Object.fromEntries((config.filters || []).map((filter) => [filter.key, ""]));

  function renderHeader(stats = []) {
    return `
      <div class="view-head">
        <div>
          <h2>${escapeHtml(config.title)}</h2>
          <p>${escapeHtml(config.subtitle)}</p>
        </div>
        <div class="toolbar">
          <input type="search" placeholder="${escapeHtml(config.searchPlaceholder || "Search records…")}"
            value="${escapeHtml(search)}" data-search aria-label="Search ${escapeHtml(config.title)}" />
          ${(config.filters || [])
            .map((filter) => {
              const choices = filter.options || [...new Set(rows.map((row) => row[filter.key]).filter((v) => v != null && v !== ""))]
                .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
              return `<select class="filter-select" data-filter="${escapeHtml(filter.key)}"
                aria-label="${escapeHtml(filter.label)}">
                <option value="">All ${escapeHtml(filter.label.toLowerCase())}</option>
                ${choices.map((choice) => `<option value="${escapeHtml(choice)}"
                  ${String(filters[filter.key]) === String(choice) ? "selected" : ""}>${escapeHtml(choice)}</option>`).join("")}
              </select>`;
            })
            .join("")}
          <button type="button" class="btn primary" data-add>＋ Add ${escapeHtml(config.singular)}</button>
        </div>
      </div>
      ${stats.length ? `<div class="summary-strip">${stats.map((stat) =>
        `<span class="summary-chip">${escapeHtml(stat.label)} <strong>${escapeHtml(stat.value)}</strong></span>`
      ).join("")}</div>` : ""}`;
  }

  function render() {
    const needle = search.trim().toLocaleLowerCase();
    const visible = rows.filter((row) => {
      if (needle && !Object.values(row).some((value) => String(value ?? "").toLocaleLowerCase().includes(needle))) {
        return false;
      }
      return (config.filters || []).every((filter) =>
        !filters[filter.key] || String(row[filter.key]) === String(filters[filter.key])
      );
    });
    const stats = config.stats ? config.stats(rows) : [];

    root.innerHTML = `${renderHeader(stats)}
      <div class="card table-wrap">
        <div class="table-count">Showing ${visible.length} of ${rows.length} ${escapeHtml(config.singular.toLowerCase())} records</div>
        <div class="table-scroll">
          ${visible.length === 0
            ? `<div class="empty">${rows.length ? "No records match the current search or filters." : "No records available yet."}</div>`
            : `<table>
                <thead><tr>${config.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}<th>Actions</th></tr></thead>
                <tbody>${visible.map((row) => `<tr>
                  ${config.columns.map((column) =>
                    `<td>${column.render ? column.render(row) : escapeHtml(row[column.key] ?? "—")}</td>`
                  ).join("")}
                  <td class="actions">
                    <button type="button" class="btn small" data-edit="${escapeHtml(row[config.idKey])}">Edit</button>
                    <button type="button" class="btn small danger" data-delete="${escapeHtml(row[config.idKey])}">Delete</button>
                  </td>
                </tr>`).join("")}</tbody>
              </table>`}
        </div>
      </div>`;

    root.querySelector("[data-search]").addEventListener("input", (event) => {
      search = event.target.value;
      const position = search.length;
      render();
      const input = root.querySelector("[data-search]");
      input.focus();
      input.setSelectionRange(position, position);
    });
    root.querySelectorAll("[data-filter]").forEach((select) => {
      select.addEventListener("change", () => {
        filters[select.dataset.filter] = select.value;
        render();
      });
    });
    root.querySelector("[data-add]").addEventListener("click", () => openEditor(null));
    root.querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const row = rows.find((item) => String(item[config.idKey]) === button.dataset.edit);
        if (row) openEditor(row);
      });
    });
    root.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener("click", () => removeRow(button.dataset.delete));
    });
  }

  async function refresh() {
    root.innerHTML = `<div class="card loading-state"><span><span class="spinner"></span>Loading ${escapeHtml(config.title.toLowerCase())}…</span></div>`;
    try {
      const result = await config.load();
      if (!result || !Array.isArray(result.data)) {
        throw new Error("The API returned an unexpected response format.");
      }
      rows = result.data;
      render();
    } catch (error) {
      root.innerHTML = `${renderHeader()}<div class="card error-state">
        <div><p>Could not load ${escapeHtml(config.title.toLowerCase())}: ${escapeHtml(error.message)}</p>
        <button type="button" class="btn" data-retry>Try again</button></div>
      </div>`;
      root.querySelector("[data-retry]").addEventListener("click", refresh);
    }
  }

  async function openEditor(row) {
    let fields;
    try {
      fields = await config.fields();
    } catch (error) {
      toast(`Could not prepare the form: ${error.message}`, "error");
      return;
    }

    openForm({
      title: `${row ? "Edit" : "Add"} ${config.singular}`,
      fields,
      values: row ? (config.toFormValues ? config.toFormValues(row) : row) : {},
      onSubmit: async (data) => {
        const payload = config.beforeSubmit ? config.beforeSubmit(data) : data;
        if (row) {
          await api.put(`${config.endpoint}/${encodeURIComponent(row[config.idKey])}`, payload);
          toast(`${config.singular} updated successfully.`, "success");
        } else {
          await api.post(config.endpoint, payload);
          toast(`${config.singular} added successfully.`, "success");
        }
        await refresh();
      }
    });
  }

  async function removeRow(id) {
    if (!window.confirm(`Delete this ${config.singular.toLowerCase()}? This action cannot be undone.`)) return;
    try {
      await api.del(`${config.endpoint}/${encodeURIComponent(id)}`);
      toast(`${config.singular} deleted successfully.`, "success");
      await refresh();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  return { refresh };
}
