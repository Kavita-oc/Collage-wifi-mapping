// Application navigation and backend connectivity indicator.
(() => {
  const status = document.querySelector("#connection-status");
  const statusContainer = document.querySelector(".topbar-status");
  const title = document.querySelector("#page-title");
  const navButtons = [...document.querySelectorAll(".main-nav button")];
  const views = [...document.querySelectorAll(".view")];
  const sidebar = document.querySelector("#sidebar");
  const menuToggle = document.querySelector("#menu-toggle");
  const shell = document.querySelector(".app-shell");

  const pages = {
    dashboard: { title: "Dashboard", load: () => Dashboard.load() },
    locations: { title: "Locations", load: () => Locations.refresh() },
    accessPoints: { title: "Access points", load: () => AccessPoints.refresh() },
    users: { title: "Campus users", load: () => Users.refresh() },
    readings: { title: "Wi-Fi readings", load: () => Readings.refresh() },
    reports: { title: "Reports & analytics", load: () => Reports.load() }
  };

  function setMenuOpen(open) {
    sidebar.classList.toggle("open", open);
    shell.classList.toggle("nav-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
  }

  function showView(name, updateHash = true) {
    const page = pages[name];
    if (!page) return;

    navButtons.forEach((button) => {
      const active = button.dataset.view === name;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    views.forEach((view) => view.classList.toggle("active", view.id === `view-${name}`));
    title.textContent = page.title;
    setMenuOpen(false);

    if (updateHash) history.replaceState(null, "", `#${name}`);
    Promise.resolve(page.load()).catch((error) => {
      toast(`Could not load ${page.title.toLowerCase()}: ${error.message}`, "error");
    });
  }

  navButtons.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  shell.addEventListener("click", (event) => {
    if (event.target === shell && sidebar.classList.contains("open")) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuOpen(false);
  });

  api.get("/api/health")
    .then(() => {
      status.textContent = "Backend online";
      statusContainer.classList.add("connected");
    })
    .catch((error) => {
      status.textContent = `Backend unavailable: ${error.message}`;
      statusContainer.classList.add("error");
    });

  const initialView = location.hash.slice(1);
  showView(pages[initialView] ? initialView : "dashboard", false);
})();
