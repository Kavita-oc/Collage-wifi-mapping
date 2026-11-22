const statusMessage = document.querySelector("#connection-status");

fetch("/api/health")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return response.json();
  })
  .then((health) => {
    statusMessage.textContent =
      health.status === "ok" ? "Server is connected." : "Server status is unknown.";
  })
  .catch((error) => {
    statusMessage.textContent = `Unable to connect to the server: ${error.message}`;
  });
