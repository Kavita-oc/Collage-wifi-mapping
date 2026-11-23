// Dashboard view: summary cards + quick charts
const Dashboard = (() => {
  const root = document.querySelector("#view-dashboard");

  function barChart(items, labelKey, valueKey, { color, suffix = "", decimals = 0, invert = false } = {}) {
    if (!items.length) return `<p class="empty">No data.</p>`;
    const values = items.map((i) => Number(i[valueKey]));
    // For negative dBm values, convert to a 0-100 style magnitude so stronger signal = longer bar.
    const scaled = invert ? values.map((v) => Math.max(0, 100 + v)) : values;
    const max = Math.max(...scaled, 1);

    return `<div class="bar-chart">${items
      .map((item, idx) => {
        const pct = Math.max(2, (scaled[idx] / max) * 100);
        return `<div class="bar-row">
          <span class="bar-label" title="${escapeHtml(item[labelKey])}">${escapeHtml(item[labelKey])}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;${color ? `--bar-color:${color}` : ""}"></div></div>
          <span class="bar-value">${values[idx].toFixed(decimals)}${suffix}</span>
        </div>`;
      })
      .join("")}</div>`;
  }

  async function load() {
    root.innerHTML = `<p class="empty">Loading dashboard…</p>`;
    try {
      const [summary, signal, activity, timeSlots] = await Promise.all([
        api.get("/api/reports/summary"),
        api.get("/api/reports/location-summary"),
        api.get("/api/reports/location-activity"),
        api.get("/api/reports/time-slot-activity")
      ]);

      const s = summary.data;
      root.innerHTML = `
        <div class="view-head">
          <div>
            <h2>Dashboard</h2>
            <p class="muted">Simulated campus Wi-Fi measurements for coursework</p>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card"><p class="stat-label">Locations</p><p class="stat-value">${s.total_locations}</p></div>
          <div class="stat-card"><p class="stat-label">Access points</p><p class="stat-value">${s.total_access_points}</p></div>
          <div class="stat-card"><p class="stat-label">Participants</p><p class="stat-value">${s.total_users}</p></div>
          <div class="stat-card"><p class="stat-label">Readings</p><p class="stat-value">${s.total_readings}</p></div>
        </div>

        <div class="dash-grid">
          <div class="card">
            <h3>Average signal by location (dBm)</h3>
            ${barChart(signal.data, "location_name", "average_signal", { invert: true, decimals: 1, suffix: " dBm" })}
            <div class="legend">
              <span style="--c:#1b8a4b">Excellent ≥ -50</span>
              <span style="--c:#3f8f2f">Good ≥ -67</span>
              <span style="--c:#c77d0a">Fair ≥ -75</span>
              <span style="--c:#c0392b">Poor &lt; -75</span>
            </div>
          </div>

          <div class="card">
            <h3>Readings per location</h3>
            ${barChart(activity.data, "location_name", "total_readings", { color: "#1d5a8a" })}
          </div>

          <div class="card">
            <h3>Activity by time slot</h3>
            ${barChart(timeSlots.data, "slot_name", "total_readings", { color: "#c77d0a" })}
          </div>
        </div>`;
    } catch (error) {
      root.innerHTML = `<p class="empty">Failed to load dashboard: ${escapeHtml(error.message)}</p>`;
    }
  }

  return { load, barChart };
})();
