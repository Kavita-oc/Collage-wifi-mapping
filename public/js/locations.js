// Locations CRUD
const AREA_TYPES = ["Academic", "Administrative", "Residential", "Student Facility", "Auditorium"];

const Locations = createCrudView({
  root: "#view-locations",
  title: "Locations",
  subtitle: "Manage campus areas and building blocks.",
  singular: "Location",
  endpoint: "/api/locations",
  idKey: "location_id",
  load: () => api.get("/api/locations"),
  searchPlaceholder: "Search locations…",
  filters: [{ key: "area_type", label: "area type" }],
  columns: [
    { key: "location_id", label: "ID" },
    { key: "location_name", label: "Location" },
    { key: "building_block", label: "Building block" },
    { key: "area_type", label: "Area type" }
  ],
  fields: async () => [
    { name: "location_name", label: "Location name", type: "text" },
    { name: "building_block", label: "Building block (optional)", type: "text", required: false },
    {
      name: "area_type",
      label: "Area type",
      type: "select",
      options: AREA_TYPES.map((t) => ({ value: t, label: t }))
    }
  ],
  beforeSubmit: (data) => ({
    location_name: data.location_name.trim(),
    building_block: data.building_block.trim(),
    area_type: data.area_type
  })
});
