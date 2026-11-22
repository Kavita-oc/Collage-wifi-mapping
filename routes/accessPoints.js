
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// VIEW all access points
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.*, l.location_name
            FROM access_points a
            JOIN locations l ON a.location_id = l.location_id
            ORDER BY a.ap_id
        `);

        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// SQL QUERY 1: Campus locations and their Wi-Fi access points
router.get("/location-details", async (req, res) => {
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
        res.status(500).json({ success: false, message: error.message });
    }
});

// ADD an access point
router.post("/", async (req, res) => {
    try {
        const { ap_code, location_id, network_label, ap_status } = req.body;

        if (!ap_code || !location_id || !network_label || !ap_status) {
            return res.status(400).json({
                success: false,
                message: "All access point fields are required."
            });
        }

        const [[row]] = await pool.query(
            "SELECT COALESCE(MAX(ap_id), 0) + 1 AS nextId FROM access_points"
        );

        const nextId = row.nextId;

        await pool.execute(
            `INSERT INTO access_points
             (ap_id, ap_code, location_id, network_label, ap_status)
             VALUES (?, ?, ?, ?, ?)`,
            [nextId, ap_code, location_id, network_label, ap_status]
        );

        res.status(201).json({
            success: true,
            message: "Access point added successfully.",
            ap_id: nextId
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// UPDATE an access point
router.put("/:id", async (req, res) => {
    try {
        const { ap_code, location_id, network_label, ap_status } = req.body;

        if (!ap_code || !location_id || !network_label || !ap_status) {
            return res.status(400).json({
                success: false,
                message: "All access point fields are required."
            });
        }

        const [result] = await pool.execute(
            `UPDATE access_points
             SET ap_code = ?, location_id = ?,
                 network_label = ?, ap_status = ?
             WHERE ap_id = ?`,
            [ap_code, location_id, network_label, ap_status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Access point not found."
            });
        }

        res.json({ success: true, message: "Access point updated successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE an access point
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await pool.execute(
            "DELETE FROM access_points WHERE ap_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Access point not found."
            });
        }

        res.json({ success: true, message: "Access point deleted successfully." });
    } catch (error) {
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                success: false,
                message: "Cannot delete this access point because Wi-Fi readings are linked to it."
            });
        }

        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
