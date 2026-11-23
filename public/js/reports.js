// Twelve SQL reports, each loaded from its matching existing backend endpoint.
const Reports = (() => {
  const root = document.querySelector("#view-reports");
  let selectedReport = null;

  const reports = [
    {
      id: 1,
      title: "Campus locations and access points",
      description: "See the campus locations, blocks, and Wi-Fi access points associated with each area.",
      endpoint: "/api/access-points/location-details",
      columns: ["location_name", "building_block", "ap_code", "network_label", "ap_status"]
    },
    {
      id: 2,
      title: "Complete Wi-Fi reading details",
      description: "Review measurement details from the database view, including participant and location context.",
      endpoint: "/api/readings/details",
      columns: ["reading_id", "participant_code", "user_role", "department", "ap_code", "location_name", "slot_name", "signal_dbm", "download_mbps", "upload_mbps", "ping_ms", "measured_at"]
    },
    {
      id: 3,
      title: "Wi-Fi activity per location",
      description: "Compare the number of Wi-Fi readings recorded at each campus location.",
      endpoint: "/api/reports/location-activity",
      columns: ["location_name", "total_readings"],
      chart: { label: "location_name", value: "total_readings", color: "#55c5e8" }
    },
    {
      id: 4,
      title: "Wi-Fi usage by user role",
      description: "Compare reading activity and participating users across student, faculty, and staff roles.",
      endpoint: "/api/reports/role-activity",
      columns: ["user_role", "total_readings", "total_users"],
      chart: { label: "user_role", value: "total_readings", color: "#9b8cff" }
    },
    {
      id: 5,
      title: "Wi-Fi activity by time slot",
      description: "Compare readings and participating users across the configured measurement periods.",
      endpoint: "/api/reports/time-slot-activity",
      columns: ["slot_name", "total_readings", "total_users"],
      chart: { label: "slot_name", value: "total_readings", color: "#f6bd60" }
    },
    {
      id: 6,
      title: "Average signal strength by location",
      description: "Compare measured average signal strength and reading volume for each location.",
      endpoint: "/api/reports/location-summary",
      columns: ["location_name", "total_readings", "average_signal"],
      chart: { label: "location_name", value: "average_signal", invert: true, decimals: 1, suffix: " dBm" }
    },
    {
      id: 7,
      title: "Signal quality classification",
      description: "View readings classified as Excellent, Good, Fair, or Poor using the backend thresholds.",
      endpoint: "/api/readings/signal-quality",
      columns: ["reading_id", "participant_code", "user_role", "location_name", "ap_code", "signal_dbm", "signal_quality"],
      chartType: "quality"
    },
    {
      id: 8,
      title: "Users experiencing weak Wi-Fi",
      description: "Find measurements below -75 dBm, with participant, access point, and location details.",
      endpoint: "/api/reports/weak-signals",
      columns: ["participant_code", "ap_code", "location_name", "signal_dbm", "measured_at"],
      chartType: "weak"
    },
    {
      id: 9,
      title: "Download and upload by location",
      description: "Compare average measured download and upload throughput across campus locations.",
      endpoint: "/api/reports/location-speeds",
      columns: ["location_name", "average_download", "average_upload"],
      chartType: "speeds"
    },
    {
      id: 10,
      title: "Access point performance ranking",
      description: "Compare access points by average signal, download performance, and reading volume.",
      endpoint: "/api/reports/ap-performance",
      columns: ["ap_code", "network_label", "location_name", "total_readings", "average_signal", "average_download", "average_ping"],
      chart: { label: "ap_code", value: "average_signal", invert: true, decimals: 1, suffix: " dBm" }
    },
    {
      id: 11,
      title: "High-latency access points",
      description: "Review access points whose average measured ping exceeds 50 milliseconds.",
      endpoint: "/api/reports/high-latency",
      columns: ["ap_code", "location_name", "average_latency"],
      chart: { label: "ap_code", value: "average_latency", color: "#f27878", decimals: 1, suffix: " ms" }
    },
    {
      id: 12,
      title: "Readings below campus-average speed",
      description: "Identify readings with download speed below the overall campus reading average.",
      endpoint: "/api/reports/below-average-speed",
      columns: ["reading_id", "participant_code", "ap_code", "location_name", "download_mbps"],
      chart: { label: "participant_code", value: "download_mbps", color: "#f6bd60", decimals: 1, suffix: " Mbps" }
    }
  ];

  function renderCatalog() {
    root.innerHTML = `
      <div class="view-head">
        <div><h2>Reports &amp; analytics</h2><p>Twelve live reports powered by existing MySQL-backed APIs.</p></div>
      </div>
      <div class="report-grid">
        ${reports.map((report) => `<article class="card report-card">
          <div class="report-number">${String(report.id).padStart(2, "0")}</div>
          <h3>${escapeHtml(report.title)}</h3>
          <p>${escapeHtml(report.description)}</p>
          <button type="button" class="btn" data-report="${report.id}">Open report <span aria-hidden="true">→</span></button>
        </article>`).join("")}
      </div>`;

    root.querySelectorAll("[data-report]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedReport = reports.find((report) => report.id === Number(button.dataset.report));
        loadSelected();
      });
    });
  }

  function columnTitle(key) {
    const titles = {
      ap_code: "Access point",
      ap_status: "Status",
      average_download: "Average download (Mbps)",
      average_latency: "Average latency (ms)",
      average_ping: "Average ping (ms)",
      average_signal: "Average signal (dBm)",
      average_upload: "Average upload (Mbps)",
      building_block: "Building block",
      department: "Department",
      download_mbps: "Download (Mbps)",
      location_name: "Location",
      measured_at: "Measured at",
      network_label: "Network label",
      participant_code: "Participant",
      ping_ms: "Ping (ms)",
      reading_id: "Reading ID",
      signal_dbm: "Signal (dBm)",
      signal_quality: "Signal quality",
      slot_name: "Time slot",
      total_readings: "Total readings",
      total_users: "Total users",
      upload_mbps: "Upload (Mbps)",
      user_role: "User role"
    };
    return titles[key] || key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function cellValue(key, value) {
    if (value == null || value === "") return "—";
    if (key === "measured_at") return escapeHtml(formatDateTime(value));
    if (key === "signal_quality" || key === "ap_status" || key === "user_role") {
      const tone = String(value).toLowerCase().replace(/[^a-z]/g, "");
      return `<span class="badge ${escapeHtml(tone)}">${escapeHtml(value)}</span>`;
    }
    if (typeof value === "number") {
      if (key === "signal_dbm" || key === "average_signal" || key === "average_download" ||
          key === "average_upload" || key === "average_latency" || key === "average_ping" ||
          key.endsWith("_mbps") || key.endsWith("_ms")) {
        return escapeHtml(value.toFixed(2));
      }
      return escapeHtml(value.toLocaleString());
    }
    return escapeHtml(value);
  }

  function qualityChart(rows) {
    const order = ["Excellent", "Good", "Fair", "Poor"];
    const counts = new Map(order.map((quality) => [quality, 0]));
    rows.forEach((row) => {
      if (counts.has(row.signal_quality)) counts.set(row.signal_quality, counts.get(row.signal_quality) + 1);
    });
    const colors = { Excellent: "#56d6a0", Good: "#8bd17c", Fair: "#f6bd60", Poor: "#f27878" };
    const max = Math.max(...counts.values(), 1);
    return `<div class="bar-chart">${order.map((quality) => {
      const count = counts.get(quality);
      return `<div class="bar-row">
        <span class="bar-label">${quality}</span>
        <span class="bar-track"><span class="bar-fill" style="display:block;width:${Math.max(1.5, count / max * 100)}%;background:${colors[quality]}"></span></span>
        <span class="bar-value">${count}</span>
      </div>`;
    }).join("")}</div>`;
  }

  function weakSignalChart(rows) {
    const counts = new Map();
    rows.forEach((row) => counts.set(row.location_name, (counts.get(row.location_name) || 0) + 1));
    const items = [...counts.entries()]
      .map(([location_name, total]) => ({ location_name, total }))
      .sort((a, b) => b.total - a.total);
    return Dashboard.barChart(items, "location_name", "total", { color: "#f27878" });
  }

  function speedChart(rows) {
    if (!rows.length) return `<p class="empty">No speed data available for this report.</p>`;
    const max = Math.max(...rows.flatMap((row) => [
      Number(row.average_download) || 0,
      Number(row.average_upload) || 0
    ]), 1);
    return `<div class="comparison-chart">${rows.map((row) => {
      const download = Number(row.average_download) || 0;
      const upload = Number(row.average_upload) || 0;
      return `<div class="comparison-row">
        <span class="bar-label" title="${escapeHtml(row.location_name)}">${escapeHtml(row.location_name)}</span>
        <div class="comparison-bars">
          <div class="comparison-line"><span class="bar-track"><span class="bar-fill download" style="width:${Math.max(1.5, download / max * 100)}%"></span></span><span class="bar-value">${download.toFixed(1)} Mbps</span></div>
          <div class="comparison-line"><span class="bar-track"><span class="bar-fill upload" style="width:${Math.max(1.5, upload / max * 100)}%"></span></span><span class="bar-value">${upload.toFixed(1)} Mbps</span></div>
        </div>
      </div>`;
    }).join("")}</div>
    <div class="legend"><span style="--legend-color:#55c5e8">Download</span><span style="--legend-color:#9b8cff">Upload</span></div>`;
  }

  function chartFor(report, rows) {
    if (report.chartType === "quality") return qualityChart(rows);
    if (report.chartType === "weak") return weakSignalChart(rows);
    if (report.chartType === "speeds") return speedChart(rows);
    if (!report.chart) return "";
    return Dashboard.barChart(rows, report.chart.label, report.chart.value, report.chart);
  }

  function reportTable(report, rows) {
    if (!rows.length) return `<div class="card empty">This API returned no records for this report.</div>`;
    return `<div class="card table-wrap report-table">
      <div class="table-count">${rows.length.toLocaleString()} records returned by ${escapeHtml(report.endpoint)}</div>
      <div class="table-scroll"><table>
        <thead><tr>${report.columns.map((key) => `<th>${escapeHtml(columnTitle(key))}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${report.columns.map((key) =>
          `<td>${cellValue(key, row[key])}</td>`
        ).join("")}</tr>`).join("")}</tbody>
      </table></div>
    </div>`;
  }

  async function loadSelected() {
    if (!selectedReport) {
      renderCatalog();
      return;
    }

    const report = selectedReport;
    root.innerHTML = `
      <div class="view-head">
        <div class="section-heading">
          <button type="button" class="text-button" data-back>← All reports</button>
          <h2>${escapeHtml(report.title)}</h2>
          <p>${escapeHtml(report.description)}</p>
        </div>
        <button type="button" class="btn" data-refresh>↻ Refresh report</button>
      </div>
      <div class="card loading-state"><span><span class="spinner"></span>Loading report from the database…</span></div>`;
    root.querySelector("[data-back]").addEventListener("click", () => {
      selectedReport = null;
      renderCatalog();
    });
    root.querySelector("[data-refresh]").addEventListener("click", loadSelected);

    try {
      const result = await api.get(report.endpoint);
      if (!result || !Array.isArray(result.data)) {
        throw new Error("The report API returned an unexpected response format.");
      }
      const rows = result.data;
      root.innerHTML = `
        <div class="view-head">
          <div class="section-heading">
            <button type="button" class="text-button" data-back>← All reports</button>
            <h2>${escapeHtml(report.title)}</h2>
            <p>${escapeHtml(report.description)}</p>
          </div>
          <button type="button" class="btn" data-refresh>↻ Refresh report</button>
        </div>
        ${report.chart ? `<article class="card report-chart"><h3>Data visualization</h3>${chartFor(report, rows)}</article>` :
          report.chartType ? `<article class="card report-chart"><h3>${report.chartType === "quality" ? "Readings by signal quality" : report.chartType === "weak" ? "Weak readings by location" : "Download and upload comparison"}</h3>${chartFor(report, rows)}</article>` : ""}
        ${reportTable(report, rows)}`;
      root.querySelector("[data-back]").addEventListener("click", () => {
        selectedReport = null;
        renderCatalog();
      });
      root.querySelector("[data-refresh]").addEventListener("click", loadSelected);
    } catch (error) {
      root.innerHTML = `
        <div class="view-head">
          <div class="section-heading">
            <button type="button" class="text-button" data-back>← All reports</button>
            <h2>${escapeHtml(report.title)}</h2>
            <p>${escapeHtml(report.description)}</p>
          </div>
          <button type="button" class="btn" data-refresh>↻ Try again</button>
        </div>
        <div class="card error-state"><p>Could not load report: ${escapeHtml(error.message)}</p></div>`;
      root.querySelector("[data-back]").addEventListener("click", () => {
        selectedReport = null;
        renderCatalog();
      });
      root.querySelector("[data-refresh]").addEventListener("click", loadSelected);
    }
  }

  function load() {
    return selectedReport ? loadSelected() : renderCatalog();
  }

  return { load, reports };
})();
