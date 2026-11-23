// Wi-Fi reading CRUD, with related labels supplied by the backend APIs.
const Readings = createCrudView({
  root: "#view-readings",
  title: "Wi-Fi readings",
  subtitle: "Review and manage measured signal, speed, and latency records.",
  singular: "Reading",
  endpoint: "/api/readings",
  idKey: "reading_id",
  load: () => api.get("/api/readings"),
  searchPlaceholder: "Search readings…",
  filters: [
    { key: "location_name", label: "location" },
    { key: "ap_code", label: "access point" },
    { key: "user_role", label: "user role" },
    { key: "slot_name", label: "time slot" }
  ],
  columns: [
    { key: "reading_id", label: "Reading" },
    { key: "participant_code", label: "Participant" },
    {
      key: "user_role",
      label: "Role",
      render: (row) => `<span class="badge ${escapeHtml(String(row.user_role).toLowerCase())}">${escapeHtml(row.user_role)}</span>`
    },
    { key: "ap_code", label: "Access point" },
    { key: "location_name", label: "Location" },
    { key: "slot_name", label: "Time slot" },
    {
      key: "signal_dbm",
      label: "Signal",
      render: (row) => `<span class="signal-value">${escapeHtml(row.signal_dbm)} dBm</span> ${signalBadge(row.signal_dbm)}`
    },
    { key: "download_mbps", label: "Download (Mbps)" },
    { key: "upload_mbps", label: "Upload (Mbps)" },
    { key: "ping_ms", label: "Ping (ms)" },
    { key: "measured_at", label: "Measured at", render: (row) => escapeHtml(formatDateTime(row.measured_at)) }
  ],
  fields: async () => {
    const [accessPoints, users, timeSlots] = await Promise.all([
      api.get("/api/access-points"),
      api.get("/api/users"),
      api.get("/api/time-slots")
    ]);

    if (!Array.isArray(accessPoints.data) || !Array.isArray(users.data) || !Array.isArray(timeSlots.data)) {
      throw new Error("A related API returned an unexpected response.");
    }
    if (accessPoints.data.length === 0 || users.data.length === 0 || timeSlots.data.length === 0) {
      throw new Error("At least one access point, campus user, and time slot are required before adding a reading.");
    }

    return [
      {
        name: "ap_id",
        label: "Access point",
        type: "select",
        options: accessPoints.data.map((point) => ({
          value: point.ap_id,
          label: `${point.ap_code} — ${point.location_name}`
        }))
      },
      {
        name: "user_id",
        label: "Participant",
        type: "select",
        options: users.data.map((user) => ({
          value: user.user_id,
          label: `${user.participant_code} — ${user.user_role}`
        }))
      },
      {
        name: "time_slot_id",
        label: "Time slot",
        type: "select",
        options: timeSlots.data.map((slot) => ({
          value: slot.time_slot_id,
          label: slot.slot_name
        }))
      },
      { name: "signal_dbm", label: "Signal strength (dBm)", type: "number", min: -100, max: 0, step: 0.01 },
      { name: "download_mbps", label: "Download speed (Mbps)", type: "number", min: 0, step: 0.01 },
      { name: "upload_mbps", label: "Upload speed (Mbps)", type: "number", min: 0, step: 0.01 },
      { name: "ping_ms", label: "Ping (ms)", type: "number", min: 0, step: 0.01 },
      { name: "measured_at", label: "Measurement date and time", type: "datetime-local" }
    ];
  },
  toFormValues: (row) => ({
    ...row,
    measured_at: toInputDateTime(row.measured_at)
  }),
  beforeSubmit: (data) => ({
    ap_id: Number(data.ap_id),
    user_id: Number(data.user_id),
    time_slot_id: Number(data.time_slot_id),
    signal_dbm: Number(data.signal_dbm),
    download_mbps: Number(data.download_mbps),
    upload_mbps: Number(data.upload_mbps),
    ping_ms: Number(data.ping_ms),
    measured_at: `${data.measured_at.replace("T", " ")}:00`
  })
});
