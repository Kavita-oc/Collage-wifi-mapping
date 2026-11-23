// Campus-user CRUD backed by the existing users API.
const USER_ROLES = ["Student", "Faculty", "Staff"];

const Users = createCrudView({
  root: "#view-users",
  title: "Campus users",
  subtitle: "Manage participant profiles used for Wi-Fi experience readings.",
  singular: "User",
  endpoint: "/api/users",
  idKey: "user_id",
  load: () => api.get("/api/users"),
  searchPlaceholder: "Search participant or department…",
  filters: [{ key: "user_role", label: "role" }],
  columns: [
    { key: "user_id", label: "ID" },
    { key: "participant_code", label: "Participant code" },
    {
      key: "user_role",
      label: "Role",
      render: (row) => `<span class="badge ${escapeHtml(String(row.user_role).toLowerCase())}">${escapeHtml(row.user_role)}</span>`
    },
    { key: "department", label: "Department" }
  ],
  fields: async () => [
    { name: "participant_code", label: "Participant code", type: "text", maxLength: 20 },
    {
      name: "user_role",
      label: "User role",
      type: "select",
      options: USER_ROLES.map((role) => ({ value: role, label: role }))
    },
    { name: "department", label: "Department", type: "text", maxLength: 100 }
  ],
  beforeSubmit: (data) => ({
    participant_code: data.participant_code.trim(),
    user_role: data.user_role,
    department: data.department.trim()
  })
});
