
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// VIEW all Wi-Fi readings
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                w.reading_id, w.ap_id, w.user_id, w.time_slot_id,
                u.participant_code, u.user_role, a.ap_code,
                l.location_name, t.slot_name,
                w.signal_dbm, w.download_mbps, w.upload_mbps,
                w.ping_ms, w.measured_at
            FROM wifi_readings w
            JOIN campus_users u ON w.user_id = u.user_id
            JOIN access_points a ON w.ap_id = a.ap_id
            JOIN locations l ON a.location_id = l.location_id
            JOIN time_slots t ON w.time_slot_id = t.time_slot_id
            ORDER BY w.reading_id
        `);

        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// SQL QUERY 2: Complete Wi-Fi reading details using VIEW
router.get("/details", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT *
            FROM vw_wifi_reading_details
            ORDER BY measured_at
        `);

        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// SQL QUERY 7: Classify signal quality
router.get("/signal-quality", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                w.reading_id,
                u.participant_code,
                u.user_role,
                l.location_name,
                a.ap_code,
                w.signal_dbm,
                CASE
                    WHEN w.signal_dbm >= -50 THEN 'Excellent'
                    WHEN w.signal_dbm >= -67 THEN 'Good'
                    WHEN w.signal_dbm >= -75 THEN 'Fair'
                    ELSE 'Poor'
                END AS signal_quality
            FROM wifi_readings w
            JOIN campus_users u ON w.user_id = u.user_id
            JOIN access_points a ON w.ap_id = a.ap_id
            JOIN locations l ON a.location_id = l.location_id
            ORDER BY w.signal_dbm DESC
        `);

        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ADD a Wi-Fi reading
router.post("/", async (req, res) => {
    try {
        const {
            ap_id, user_id, time_slot_id,
            signal_dbm, download_mbps,
            upload_mbps, ping_ms, measured_at
        } = req.body;

        if (
            ap_id == null || user_id == null || time_slot_id == null ||
            signal_dbm == null || download_mbps == null ||
            upload_mbps == null || ping_ms == null || !measured_at
        ) {
            return res.status(400).json({
                success: false,
                message: "All Wi-Fi reading fields are required."
            });
        }

        const numbers = [
            ap_id, user_id, time_slot_id,
            signal_dbm, download_mbps, upload_mbps, ping_ms
        ];

        if (numbers.some(value => !Number.isFinite(Number(value)))) {
            return res.status(400).json({
                success: false,
                message: "All IDs and measurement values must be numeric."
            });
        }

        if (
            Number(ap_id) <= 0 || Number(user_id) <= 0 ||
            Number(time_slot_id) <= 0 ||
            Number(signal_dbm) < -100 || Number(signal_dbm) > 0 ||
            Number(download_mbps) < 0 ||
            Number(upload_mbps) < 0 || Number(ping_ms) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid IDs or Wi-Fi measurement values."
            });
        }

        const [[row]] = await pool.query(
            "SELECT COALESCE(MAX(reading_id), 0) + 1 AS nextId FROM wifi_readings"
        );

        const nextId = row.nextId;

        await pool.execute(
            `INSERT INTO wifi_readings
             (reading_id, ap_id, user_id, time_slot_id,
              signal_dbm, download_mbps, upload_mbps, ping_ms, measured_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nextId, ap_id, user_id, time_slot_id,
                signal_dbm, download_mbps, upload_mbps,
                ping_ms, measured_at
            ]
        );

        res.status(201).json({
            success: true,
            message: "Wi-Fi reading added successfully.",
            reading_id: nextId
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// UPDATE a Wi-Fi reading
router.put("/:id", async (req, res) => {
    try {
        const {
            ap_id, user_id, time_slot_id,
            signal_dbm, download_mbps,
            upload_mbps, ping_ms, measured_at
        } = req.body;

        if (
            ap_id == null || user_id == null || time_slot_id == null ||
            signal_dbm == null || download_mbps == null ||
            upload_mbps == null || ping_ms == null || !measured_at
        ) {
            return res.status(400).json({
                success: false,
                message: "All Wi-Fi reading fields are required."
            });
        }

        const numbers = [
            ap_id, user_id, time_slot_id,
            signal_dbm, download_mbps, upload_mbps, ping_ms
        ];

        if (numbers.some(value => !Number.isFinite(Number(value)))) {
            return res.status(400).json({
                success: false,
                message: "All IDs and measurement values must be numeric."
            });
        }

        if (
            Number(ap_id) <= 0 || Number(user_id) <= 0 ||
            Number(time_slot_id) <= 0 ||
            Number(signal_dbm) < -100 || Number(signal_dbm) > 0 ||
            Number(download_mbps) < 0 ||
            Number(upload_mbps) < 0 || Number(ping_ms) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid IDs or Wi-Fi measurement values."
            });
        }

        const [existing] = await pool.execute(
            "SELECT reading_id FROM wifi_readings WHERE reading_id = ?",
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Wi-Fi reading not found."
            });
        }

        await pool.execute(
            `UPDATE wifi_readings
             SET ap_id = ?, user_id = ?, time_slot_id = ?,
                 signal_dbm = ?, download_mbps = ?,
                 upload_mbps = ?, ping_ms = ?, measured_at = ?
             WHERE reading_id = ?`,
            [
                ap_id, user_id, time_slot_id,
                signal_dbm, download_mbps,
                upload_mbps, ping_ms, measured_at,
                req.params.id
            ]
        );

        res.json({
            success: true,
            message: "Wi-Fi reading updated successfully."
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE a Wi-Fi reading
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await pool.execute(
            "DELETE FROM wifi_readings WHERE reading_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Wi-Fi reading not found."
            });
        }

        res.json({
            success: true,
            message: "Wi-Fi reading deleted successfully."
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
