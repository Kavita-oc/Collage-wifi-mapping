// App entry point: health check + view navigation.
// Loaded last so every view module (Dashboard, Locations, ...) already exists.
(() => {
  const statusPill = document.querySelector("#connection-status");
  const navButtons = document.querySelectorAll(".main-nav button");
  const views = document.querySelectorAll(".view");

  const loaders = {
    dashboard: () => Dashboard.load(),
    locations: () => Locations.refresh(),
    accessPoints: () => AccessPoints.refresh(),
    users: () => Users.refresh(),
    readings: () => Readings.refresh(),
    reports: () => Reports.load()
  };

  function showView(name) {
    navButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    views.forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
    loaders[name]();
    history.replaceState(null, "", `#${name}`);
  }

  navButtons.forEach((btn) => btn.addEventListener("click", () => showView(btn.dataset.view)));

  // Server health check
  fetch("/api/health")
    .then((response) => {
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      return response.json();
    })
    .then(() => {
      statusPill.textContent = "Server connected";
      statusPill.classList.add("ok");
    })
    .catch((error) => {
      statusPill.textContent = `Server unreachable: ${error.message}`;
      statusPill.classList.add("error");
    });

  const initial = location.hash.replace("#", "");
  showView(loaders[initial] ? initial : "dashboard");
})();
