const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const {
    insertWithNextId,
    invalidIdResponse,
    isNumberInRange,
    isPositiveInteger,
    isValidMySqlDateTime,
    sendDatabaseError
} = require("./helpers");

function validReading(body) {
    return isPositiveInteger(body.ap_id) &&
        isPositiveInteger(body.user_id) &&
        isPositiveInteger(body.time_slot_id) &&
        isNumberInRange(body.signal_dbm, -100, 0) &&
        isNumberInRange(body.download_mbps, 0, 999999.99) &&
        isNumberInRange(body.upload_mbps, 0, 999999.99) &&
        isNumberInRange(body.ping_ms, 0, 999999.99) &&
        isValidMySqlDateTime(body.measured_at);
}

function readingValues(body) {
    return [
        Number(body.ap_id),
        Number(body.user_id),
        Number(body.time_slot_id),
        Number(body.signal_dbm),
        Number(body.download_mbps),
        Number(body.upload_mbps),
        Number(body.ping_ms),
        body.measured_at
    ];
}

router.get("/", async (_req, res) => {
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
        sendDatabaseError(res, error, "List Wi-Fi readings");
    }
});

router.get("/details", async (_req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT *
            FROM vw_wifi_reading_details
            ORDER BY measured_at
        `);
        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        sendDatabaseError(res, error, "List Wi-Fi reading details");
    }
});

router.get("/signal-quality", async (_req, res) => {
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
        sendDatabaseError(res, error, "Classify Wi-Fi signal quality");
    }
});

router.post("/", async (req, res) => {
    const body = req.body || {};
    if (!validReading(body)) {
        return res.status(400).json({
            success: false,
            message: "Provide positive access-point, user, and time-slot IDs; signal from -100 to 0 dBm; non-negative measurements with at most two decimal places; and a valid date/time."
        });
    }

    try {
        const readingId = await insertWithNextId(pool, "readings", (connection, nextId) =>
            connection.execute(
                `INSERT INTO wifi_readings
                 (reading_id, ap_id, user_id, time_slot_id, signal_dbm,
                  download_mbps, upload_mbps, ping_ms, measured_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [nextId, ...readingValues(body)]
            )
        );
        res.status(201).json({
            success: true,
            message: "Wi-Fi reading added successfully.",
            reading_id: readingId
        });
    } catch (error) {
        sendDatabaseError(res, error, "Add Wi-Fi reading");
    }
});

router.put("/:id", async (req, res) => {
    if (!isPositiveInteger(req.params.id)) return invalidIdResponse(res);
    const body = req.body || {};
    if (!validReading(body)) {
        return res.status(400).json({
            success: false,
            message: "Provide positive access-point, user, and time-slot IDs; signal from -100 to 0 dBm; non-negative measurements with at most two decimal places; and a valid date/time."
        });
    }

    try {
        const [existing] = await pool.execute(
            "SELECT reading_id FROM wifi_readings WHERE reading_id = ?",
            [Number(req.params.id)]
        );
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Wi-Fi reading not found." });
        }
        await pool.execute(
            `UPDATE wifi_readings
             SET ap_id = ?, user_id = ?, time_slot_id = ?, signal_dbm = ?,
                 download_mbps = ?, upload_mbps = ?, ping_ms = ?, measured_at = ?
             WHERE reading_id = ?`,
            [...readingValues(body), Number(req.params.id)]
        );
        res.json({ success: true, message: "Wi-Fi reading updated successfully." });
    } catch (error) {
        sendDatabaseError(res, error, "Update Wi-Fi reading");
    }
});

router.delete("/:id", async (req, res) => {
    if (!isPositiveInteger(req.params.id)) return invalidIdResponse(res);
    try {
        const [result] = await pool.execute(
            "DELETE FROM wifi_readings WHERE reading_id = ?",
            [Number(req.params.id)]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Wi-Fi reading not found." });
        }
        res.json({ success: true, message: "Wi-Fi reading deleted successfully." });
    } catch (error) {
        sendDatabaseError(res, error, "Delete Wi-Fi reading");
    }
});

module.exports = router;
