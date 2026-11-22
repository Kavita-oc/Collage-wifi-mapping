
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// VIEW all locations
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM locations ORDER BY location_id"
        );

        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// ADD a location
router.post("/", async (req, res) => {
    try {
        const { location_name, building_block, area_type } = req.body;

        if (!location_name || !area_type) {
            return res.status(400).json({
                success: false,
                message: "Location name and area type are required."
            });
        }

        // Generate the next location ID
        const [[row]] = await pool.query(
            "SELECT COALESCE(MAX(location_id), 0) + 1 AS nextId FROM locations"
        );

        const nextId = row.nextId;

        const [result] = await pool.execute(
            `INSERT INTO locations
             (location_id, location_name, building_block, area_type)
             VALUES (?, ?, ?, ?)`,
            [nextId, location_name, building_block || null, area_type]
        );

        res.status(201).json({
            success: true,
            message: "Location added successfully.",
            location_id: nextId
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// UPDATE a location
router.put("/:id", async (req, res) => {
    try {
        const { location_name, building_block, area_type } = req.body;

        if (!location_name || !area_type) {
            return res.status(400).json({
                success: false,
                message: "Location name and area type are required."
            });
        }

        const [result] = await pool.execute(
            `UPDATE locations
             SET location_name = ?, building_block = ?, area_type = ?
             WHERE location_id = ?`,
            [location_name, building_block || null, area_type, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Location not found."
            });
        }

        res.json({ success: true, message: "Location updated successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE a location
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await pool.execute(
            "DELETE FROM locations WHERE location_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Location not found."
            });
        }

        res.json({ success: true, message: "Location deleted successfully." });
    } catch (error) {
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                success: false,
                message: "Cannot delete this location because access points are linked to it."
            });
        }

        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
