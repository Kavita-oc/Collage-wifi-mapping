const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const {
    insertWithNextId,
    invalidIdResponse,
    isNonEmptyString,
    isOneOf,
    isPositiveInteger,
    sendDatabaseError
} = require("./helpers");

const AP_STATUSES = ["Active", "Inactive"];

function validAccessPoint(body) {
    return isNonEmptyString(body.ap_code, 20) &&
        isPositiveInteger(body.location_id) &&
        isNonEmptyString(body.network_label, 80) &&
        isOneOf(body.ap_status, AP_STATUSES);
}

function accessPointValues(body) {
    return [
        body.ap_code.trim(),
        Number(body.location_id),
        body.network_label.trim(),
        body.ap_status
    ];
}

router.get("/", async (_req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.*, l.location_name
            FROM access_points a
            JOIN locations l ON a.location_id = l.location_id
            ORDER BY a.ap_id
        `);
        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        sendDatabaseError(res, error, "List access points");
    }
});

router.get("/location-details", async (_req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT l.location_name, l.building_block,
                   a.ap_code, a.network_label, a.ap_status
            FROM locations l
            INNER JOIN access_points a
                ON l.location_id = a.location_id
            ORDER BY l.location_name
        `);
        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        sendDatabaseError(res, error, "List location access-point details");
    }
});

router.post("/", async (req, res) => {
    const body = req.body || {};
    if (!validAccessPoint(body)) {
        return res.status(400).json({
            success: false,
            message: "Provide an AP code (up to 20 characters), valid location ID, network label (up to 80 characters), and valid status."
        });
    }

    try {
        const apId = await insertWithNextId(pool, "accessPoints", (connection, nextId) =>
            connection.execute(
                `INSERT INTO access_points
                 (ap_id, ap_code, location_id, network_label, ap_status)
                 VALUES (?, ?, ?, ?, ?)`,
                [nextId, ...accessPointValues(body)]
            )
        );
        res.status(201).json({
            success: true,
            message: "Access point added successfully.",
            ap_id: apId
        });
    } catch (error) {
        sendDatabaseError(res, error, "Add access point");
    }
});

router.put("/:id", async (req, res) => {
    if (!isPositiveInteger(req.params.id)) return invalidIdResponse(res);
    const body = req.body || {};
    if (!validAccessPoint(body)) {
        return res.status(400).json({
            success: false,
            message: "Provide an AP code (up to 20 characters), valid location ID, network label (up to 80 characters), and valid status."
        });
    }

    try {
        const [existing] = await pool.execute(
            "SELECT ap_id FROM access_points WHERE ap_id = ?",
            [Number(req.params.id)]
        );
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Access point not found." });
        }
        await pool.execute(
            `UPDATE access_points
             SET ap_code = ?, location_id = ?, network_label = ?, ap_status = ?
             WHERE ap_id = ?`,
            [...accessPointValues(body), Number(req.params.id)]
        );
        res.json({ success: true, message: "Access point updated successfully." });
    } catch (error) {
        sendDatabaseError(res, error, "Update access point");
    }
});

router.delete("/:id", async (req, res) => {
    if (!isPositiveInteger(req.params.id)) return invalidIdResponse(res);
    try {
        const [result] = await pool.execute(
            "DELETE FROM access_points WHERE ap_id = ?",
            [Number(req.params.id)]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Access point not found." });
        }
        res.json({ success: true, message: "Access point deleted successfully." });
    } catch (error) {
        sendDatabaseError(res, error, "Delete access point");
    }
});

module.exports = router;
