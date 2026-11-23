// Access-point CRUD backed by the existing access-points and locations APIs.
const AccessPoints = createCrudView({
  root: "#view-accessPoints",
  title: "Access points",
  subtitle: "Manage campus access points and network status.",
  singular: "Access point",
  endpoint: "/api/access-points",
  idKey: "ap_id",
  load: () => api.get("/api/access-points"),
  searchPlaceholder: "Search APs or networks…",
  filters: [
    { key: "location_name", label: "location" },
    { key: "ap_status", label: "status", options: ["Active", "Inactive"] }
  ],
  stats: (rows) => [
    { label: "Total", value: rows.length },
    { label: "Active", value: rows.filter((row) => row.ap_status === "Active").length },
    { label: "Inactive", value: rows.filter((row) => row.ap_status === "Inactive").length }
  ],
  columns: [
    { key: "ap_id", label: "ID" },
    { key: "ap_code", label: "AP code" },
    { key: "location_name", label: "Location" },
    { key: "network_label", label: "Network" },
    {
      key: "ap_status",
      label: "Status",
      render: (row) => `<span class="badge ${escapeHtml(String(row.ap_status).toLowerCase())}">${escapeHtml(row.ap_status)}</span>`
    }
  ],
  fields: async () => {
    const result = await api.get("/api/locations");
    if (!Array.isArray(result.data)) throw new Error("Locations API returned an unexpected response.");
    if (result.data.length === 0) throw new Error("Create a location before adding an access point.");
    return [
      { name: "ap_code", label: "Access point code", type: "text", maxLength: 20 },
      {
        name: "location_id",
        label: "Campus location",
        type: "select",
        options: result.data.map((location) => ({
          value: location.location_id,
          label: location.location_name
        }))
      },
      { name: "network_label", label: "Network label", type: "text", maxLength: 80 },
      {
        name: "ap_status",
        label: "Status",
        type: "select",
        options: [
          { value: "Active", label: "Active" },
          { value: "Inactive", label: "Inactive" }
        ]
      }
    ];
  },
  beforeSubmit: (data) => ({
    ap_code: data.ap_code.trim(),
    location_id: Number(data.location_id),
    network_label: data.network_label.trim(),
    ap_status: data.ap_status
  })
});
