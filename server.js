
require("dotenv").config();

const express = require("express");
const path = require("path");
const pool = require("./config/db");

const locationsRouter = require("./routes/locations");
const accessPointsRouter = require("./routes/accessPoints");
const usersRouter = require("./routes/users");
const readingsRouter = require("./routes/readings");
const reportsRouter = require("./routes/reports");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// Test server
app.get("/api/health", (req, res) => {
    res.json({ status: "College WiFi server is running!" });
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
            message: "MySQL connected successfully!",
            totalLocations: rows.length,
            locations: rows
        });

    } catch (error) {
        console.error("Database query error:", error.message);

        res.status(500).json({
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

// Start server only after checking MySQL
async function startServer() {
    try {
        await pool.query("SELECT 1");

        console.log("MySQL Database Connected Successfully!");

        app.listen(port, () => {
            console.log(`College WiFi running at http://localhost:${port}`);
        });

    } catch (error) {
        console.error("MySQL Connection Failed:", error.message);
    }
}

startServer();
