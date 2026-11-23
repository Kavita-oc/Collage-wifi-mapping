
require("dotenv").config();

const express = require("express");
const path = require("path");
const pool = require("./config/db");

const locationsRouter = require("./routes/locations");
const accessPointsRouter = require("./routes/accessPoints");
const usersRouter = require("./routes/users");
const readingsRouter = require("./routes/readings");
const reportsRouter = require("./routes/reports");
const timeSlotsRouter = require("./routes/timeSlots");

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "127.0.0.1";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({
            success: true,
            status: "College WiFi server is running!",
            database: "connected"
        });
    } catch (error) {
        console.error(`Health check failed (${error.code || "UNKNOWN"}).`);
        res.status(503).json({
            success: false,
            status: "Database unavailable",
            message: "The database connection is unavailable."
        });
    }
});

// Test MySQL connection and retrieve actual locations
app.get("/api/db-test", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT location_id, location_name, building_block, area_type
             FROM locations
             ORDER BY location_id`
        );

        res.json({
            success: true,
            message: "MySQL connected successfully!",
            totalLocations: rows.length,
            locations: rows
        });

    } catch (error) {
        console.error(`Database test failed (${error.code || "UNKNOWN"}).`);

        res.status(503).json({
            success: false,
            message: "Database query failed."
        });
    }
});

// Existing API routes
app.use("/api/locations", locationsRouter);
app.use("/api/access-points", accessPointsRouter);
app.use("/api/users", usersRouter);
app.use("/api/readings", readingsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/time-slots", timeSlotsRouter);

app.use("/api", (_req, res) => {
    res.status(404).json({ success: false, message: "API endpoint not found." });
});

app.use((error, _req, res, _next) => {
    const status = error.type === "entity.parse.failed" ? 400 :
        error.type === "entity.too.large" ? 413 : 500;
    const message = status === 400 ? "Request body contains invalid JSON." :
        status === 413 ? "Request body is too large." : "The request could not be processed.";
    console.error(`Request failed (${error.type || error.code || "UNKNOWN"}).`);
    res.status(status).json({ success: false, message });
});

// Start server only after checking MySQL
async function startServer() {
    try {
        await pool.query("SELECT 1");

        console.log("MySQL Database Connected Successfully!");

        app.listen(port, host, () => {
            console.log(`College WiFi running at http://${host}:${port}`);
        });

    } catch (error) {
        console.error(`MySQL connection failed (${error.code || "UNKNOWN"}).`);
        await pool.end();
        process.exitCode = 1;
    }
}

startServer();
