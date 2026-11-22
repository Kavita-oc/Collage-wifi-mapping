
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// 1. Dashboard summary
router.get("/summary", async (req, res) => {
    try {
        const [locations] = await pool.query("SELECT COUNT(*) AS total FROM locations");
        const [accessPoints] = await pool.query("SELECT COUNT(*) AS total FROM access_points");
        const [users] = await pool.query("SELECT COUNT(*) AS total FROM campus_users");
        const [readings] = await pool.query("SELECT COUNT(*) AS total FROM wifi_readings");

        res.json({
            success: true,
            data: {
                total_locations: locations[0].total,
                total_access_points: accessPoints[0].total,
                total_users: users[0].total,
                total_readings: readings[0].total
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Readings grouped by location (Q6)
router.get("/location-summary", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT l.location_name,
                   COUNT(w.reading_id) AS total_readings,
                   ROUND(AVG(w.signal_dbm), 2) AS average_signal
            FROM locations l
            JOIN access_points a ON l.location_id = a.location_id
            JOIN wifi_readings w ON a.ap_id = w.ap_id
            GROUP BY l.location_id, l.location_name
            ORDER BY average_signal DESC
        `);

        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Weak signal readings (Q8)
router.get("/weak-signals", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.participant_code, a.ap_code,
                   l.location_name, w.signal_dbm, w.measured_at
            FROM wifi_readings w
            JOIN campus_users u ON w.user_id = u.user_id
            JOIN access_points a ON w.ap_id = a.ap_id
            JOIN locations l ON a.location_id = l.location_id
            WHERE w.signal_dbm < -75
            ORDER BY w.signal_dbm ASC
        `);

        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Access point performance (Q10)
router.get("/ap-performance", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.ap_code, l.location_name,
                   COUNT(w.reading_id) AS total_readings,
                   ROUND(AVG(w.signal_dbm), 2) AS average_signal,
                   ROUND(AVG(w.download_mbps), 2) AS average_download,
                   ROUND(AVG(w.ping_ms), 2) AS average_ping
            FROM access_points a
            JOIN locations l ON a.location_id = l.location_id
            JOIN wifi_readings w ON a.ap_id = w.ap_id
            GROUP BY a.ap_id, a.ap_code, l.location_name
            ORDER BY average_signal DESC
        `);

        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. SQL QUERY 3: Wi-Fi activity per location
router.get("/location-activity", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT l.location_name,
                   COUNT(w.reading_id) AS total_readings
            FROM locations l
            JOIN access_points a ON l.location_id = a.location_id
            JOIN wifi_readings w ON a.ap_id = w.ap_id
            GROUP BY l.location_id, l.location_name
            ORDER BY total_readings DESC
        `);

        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. SQL QUERY 4: Wi-Fi usage by user role
router.get("/role-activity", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.user_role,
                   COUNT(w.reading_id) AS total_readings,
                   COUNT(DISTINCT u.user_id) AS total_users
            FROM campus_users u
            LEFT JOIN wifi_readings w ON u.user_id = w.user_id
            GROUP BY u.user_role
            ORDER BY total_readings DESC
        `);

        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 7. SQL QUERY 5: Wi-Fi activity by time slot
router.get("/time-slot-activity", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.slot_name,
                   COUNT(w.reading_id) AS total_readings,
                   COUNT(DISTINCT w.user_id) AS total_users
            FROM time_slots t
            LEFT JOIN wifi_readings w ON t.time_slot_id = w.time_slot_id
            GROUP BY t.time_slot_id, t.slot_name
            ORDER BY total_readings DESC
        `);

        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 8. SQL QUERY 9: Compare download/upload speeds across locations
router.get("/location-speeds", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT l.location_name,
                   ROUND(AVG(w.download_mbps), 2) AS average_download,
                   ROUND(AVG(w.upload_mbps), 2) AS average_upload
            FROM locations l
            JOIN access_points a ON l.location_id = a.location_id
            JOIN wifi_readings w ON a.ap_id = w.ap_id
            GROUP BY l.location_id, l.location_name
            ORDER BY average_download DESC
        `);

        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 9. SQL QUERY 11: APs with high network latency
router.get("/high-latency", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.ap_code, l.location_name,
                   ROUND(AVG(w.ping_ms), 2) AS average_latency
            FROM access_points a
            JOIN locations l ON a.location_id = l.location_id
            JOIN wifi_readings w ON a.ap_id = w.ap_id
            GROUP BY a.ap_id, a.ap_code, l.location_name
            HAVING AVG(w.ping_ms) > 50
            ORDER BY average_latency DESC
        `);

        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 10. SQL QUERY 12: Readings below campus average download speed
router.get("/below-average-speed", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT w.reading_id, u.participant_code,
                   a.ap_code, l.location_name,
                   w.download_mbps
            FROM wifi_readings w
            JOIN campus_users u ON w.user_id = u.user_id
            JOIN access_points a ON w.ap_id = a.ap_id
            JOIN locations l ON a.location_id = l.location_id
            WHERE w.download_mbps < (
                SELECT AVG(download_mbps)
                FROM wifi_readings
            )
            ORDER BY w.download_mbps ASC
        `);

        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
