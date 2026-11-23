// Dashboard metrics and charts are derived from the live backend API responses.
const Dashboard = (() => {
  const root = document.querySelector("#view-dashboard");

  function barChart(items, labelKey, valueKey, options = {}) {
    if (!items.length) return `<p class="empty">No data available for this chart.</p>`;
    const values = items.map((item) => Number(item[valueKey]));
    const magnitudes = options.invert
      ? values.map((value) => Math.max(0, 100 + value))
      : values;
    const max = Math.max(...magnitudes.filter(Number.isFinite), 1);
    return `<div class="bar-chart">${items.map((item, index) => {
      const value = values[index];
      const percentage = Number.isFinite(value) ? Math.max(1.5, (magnitudes[index] / max) * 100) : 0;
      const shown = Number.isFinite(value)
        ? `${value.toFixed(options.decimals || 0)}${options.suffix || ""}`
        : "—";
      return `<div class="bar-row">
        <span class="bar-label" title="${escapeHtml(item[labelKey])}">${escapeHtml(item[labelKey])}</span>
        <span class="bar-track"><span class="bar-fill" style="display:block;width:${percentage}%;${options.color ? `--bar-color:${options.color}` : ""}"></span></span>
        <span class="bar-value">${escapeHtml(shown)}</span>
      </div>`;
    }).join("")}</div>`;
  }

  function comparisonChart(items) {
    if (!items.length) return `<p class="empty">No speed data available.</p>`;
    const max = Math.max(...items.flatMap((item) => [
      Number(item.average_download) || 0,
      Number(item.average_upload) || 0
    ]), 1);
    return `<div class="comparison-chart">${items.map((item) => {
      const download = Number(item.average_download) || 0;
      const upload = Number(item.average_upload) || 0;
      return `<div class="comparison-row">
        <span class="bar-label" title="${escapeHtml(item.location_name)}">${escapeHtml(item.location_name)}</span>
        <div class="comparison-bars">
          <div class="comparison-line"><span class="bar-track"><span class="bar-fill download" style="width:${Math.max(1.5, download / max * 100)}%"></span></span><span class="bar-value">${download.toFixed(1)} Mbps</span></div>
          <div class="comparison-line"><span class="bar-track"><span class="bar-fill upload" style="width:${Math.max(1.5, upload / max * 100)}%"></span></span><span class="bar-value">${upload.toFixed(1)} Mbps</span></div>
        </div>
      </div>`;
    }).join("")}</div>
    <div class="legend">
      <span style="--legend-color:#55c5e8">Average download</span>
      <span style="--legend-color:#9b8cff">Average upload</span>
    </div>`;
  }

  function metricCard(label, value, note, icon) {
    return `<article class="stat-card">
      <div class="stat-topline"><p class="stat-label">${escapeHtml(label)}</p><span class="stat-icon" aria-hidden="true">${icon}</span></div>
      <p class="stat-value">${escapeHtml(value)}</p>
      <p class="stat-note">${escapeHtml(note)}</p>
    </article>`;
  }

  async function load() {
    root.innerHTML = `<div class="card loading-state"><span><span class="spinner"></span>Loading live campus network metrics…</span></div>`;
    try {
      const [
        summaryResult,
        signalResult,
        activityResult,
        roleResult,
        timeSlotResult,
        weakSignalResult,
        accessPointResult,
        accessPointPerformanceResult,
        speedResult,
        latencyResult,
        readingsResult
      ] = await Promise.all([
        api.get("/api/reports/summary"),
        api.get("/api/reports/location-summary"),
        api.get("/api/reports/location-activity"),
        api.get("/api/reports/role-activity"),
        api.get("/api/reports/time-slot-activity"),
        api.get("/api/reports/weak-signals"),
        api.get("/api/access-points"),
        api.get("/api/reports/ap-performance"),
        api.get("/api/reports/location-speeds"),
        api.get("/api/reports/high-latency"),
        api.get("/api/readings")
      ]);

      const summary = summaryResult.data;
      if (!summary || !Array.isArray(signalResult.data) || !Array.isArray(activityResult.data) ||
          !Array.isArray(roleResult.data) || !Array.isArray(timeSlotResult.data) ||
          !Array.isArray(weakSignalResult.data) || !Array.isArray(accessPointResult.data) ||
          !Array.isArray(accessPointPerformanceResult.data) ||
          !Array.isArray(speedResult.data) || !Array.isArray(latencyResult.data) ||
          !Array.isArray(readingsResult.data)) {
        throw new Error("One or more dashboard APIs returned an unexpected response.");
      }

      const readings = readingsResult.data;
      const validSignals = readings.map((row) => Number(row.signal_dbm)).filter(Number.isFinite);
      const averageSignal = validSignals.length
        ? (validSignals.reduce((sum, value) => sum + value, 0) / validSignals.length).toFixed(1)
        : "—";
      const activePoints = accessPointResult.data.filter((row) => row.ap_status === "Active").length;
      const inactivePoints = accessPointResult.data.filter((row) => row.ap_status === "Inactive").length;

      root.innerHTML = `
        <div class="view-head">
          <div><h2>Campus network overview</h2><p>Live database metrics. Seeded demonstration measurements are simulated.</p></div>
          <button type="button" class="btn" data-dashboard-refresh>↻ Refresh data</button>
        </div>
        <div class="stat-grid">
          ${metricCard("Campus locations", summary.total_locations, "Locations with campus coverage", "⌖")}
          ${metricCard("Access points", summary.total_access_points, `${activePoints} active · ${inactivePoints} inactive`, "⌁")}
          ${metricCard("Campus users", summary.total_users, "Registered measurement participants", "♙")}
          ${metricCard("Wi-Fi readings", summary.total_readings, "Measurements recorded", "⌁")}
        </div>
        <div class="dashboard-secondary">
          <div class="mini-stat"><span>Average signal strength</span><strong>${escapeHtml(averageSignal)}${validSignals.length ? " dBm" : ""}</strong></div>
          <div class="mini-stat"><span>Weak signal readings (&lt; -75 dBm)</span><strong>${weakSignalResult.data.length}</strong></div>
          <div class="mini-stat"><span>High-latency access points (&gt; 50 ms)</span><strong>${latencyResult.data.length}</strong></div>
        </div>
        <div class="dash-grid">
          <article class="card dash-card">
            <h3>Average signal by location</h3>
            <p class="card-subtitle">Signal strength in dBm · stronger values are closer to 0</p>
            ${barChart(signalResult.data, "location_name", "average_signal", { invert: true, decimals: 1, suffix: " dBm" })}
            <div class="legend">
              <span style="--legend-color:#56d6a0">Excellent ≥ -50</span>
              <span style="--legend-color:#8bd17c">Good ≥ -67</span>
              <span style="--legend-color:#f6bd60">Fair ≥ -75</span>
              <span style="--legend-color:#f27878">Poor &lt; -75</span>
            </div>
          </article>
          <article class="card dash-card">
            <h3>Wi-Fi activity by location</h3>
            <p class="card-subtitle">Readings grouped by campus location</p>
            ${barChart(activityResult.data, "location_name", "total_readings", { color: "#55c5e8" })}
          </article>
          <article class="card dash-card">
            <h3>Activity by user role</h3>
            <p class="card-subtitle">Readings and participation across campus roles</p>
            ${barChart(roleResult.data, "user_role", "total_readings", { color: "#9b8cff" })}
          </article>
          <article class="card dash-card">
            <h3>Activity by time slot</h3>
            <p class="card-subtitle">Reading count across measurement periods</p>
            ${barChart(timeSlotResult.data, "slot_name", "total_readings", { color: "#f6bd60" })}
          </article>
          <article class="card dash-card wide">
            <h3>Download and upload by location</h3>
            <p class="card-subtitle">Average measured throughput in Mbps</p>
            ${comparisonChart(speedResult.data)}
          </article>
          <article class="card dash-card wide">
            <h3>Access point performance</h3>
            <p class="card-subtitle">Average signal strength across readings</p>
            ${barChart(
              accessPointPerformanceResult.data,
              "ap_code",
              "average_signal",
              { invert: true, decimals: 1, suffix: " dBm" }
            )}
          </article>
        </div>`;

      root.querySelector("[data-dashboard-refresh]").addEventListener("click", load);
    } catch (error) {
      root.innerHTML = `<div class="card error-state dashboard-error">
        <div><h2>Dashboard data unavailable</h2><p>${escapeHtml(error.message)}</p>
        <button type="button" class="btn" data-dashboard-refresh>Try again</button></div>
      </div>`;
      root.querySelector("[data-dashboard-refresh]").addEventListener("click", load);
    }
  }

  return { load, barChart };
})();
