// Access Points CRUD
const AccessPoints = createCrudView({
  root: "#view-accessPoints",
  title: "Access Points",
  subtitle: "Wi-Fi access points installed across campus",
  singular: "Access point",
  endpoint: "/api/access-points",
  idKey: "ap_id",
  load: () => api.get("/api/access-points"),
  columns: [
    { key: "ap_id", label: "ID" },
    { key: "ap_code", label: "AP code" },
    { key: "location_name", label: "Location" },
    { key: "network_label", label: "Network" },
    {
      key: "ap_status",
      label: "Status",
      render: (r) => `<span class="badge ${escapeHtml(String(r.ap_status).toLowerCase())}">${escapeHtml(r.ap_status)}</span>`
    }
  ],
  fields: async () => {
    const locations = (await api.get("/api/locations")).data;
    return [
      { name: "ap_code", label: "AP code", type: "text" },
      {
        name: "location_id",
        label: "Location",
        type: "select",
        options: locations.map((l) => ({ value: l.location_id, label: l.location_name }))
      },
      { name: "network_label", label: "Network label", type: "text", value: "REVA-WiFi-DEMO" },
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
  }
});
