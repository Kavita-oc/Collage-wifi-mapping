const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const {
    insertWithNextId,
    invalidIdResponse,
    isNonEmptyString,
    isOneOf,
    isOptionalString,
    isPositiveInteger,
    sendDatabaseError
} = require("./helpers");

const AREA_TYPES = ["Academic", "Administrative", "Residential", "Student Facility", "Auditorium"];

function validLocation(body) {
    return isNonEmptyString(body.location_name, 100) &&
        isOptionalString(body.building_block, 100) &&
        isOneOf(body.area_type, AREA_TYPES);
}

function locationValues(body) {
    const buildingBlock = typeof body.building_block === "string"
        ? body.building_block.trim() || null
        : null;
    return [body.location_name.trim(), buildingBlock, body.area_type];
}

router.get("/", async (_req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM locations ORDER BY location_id");
        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        sendDatabaseError(res, error, "List locations");
    }
});

router.post("/", async (req, res) => {
    const body = req.body || {};
    if (!validLocation(body)) {
        return res.status(400).json({
            success: false,
            message: "Provide a location name (up to 100 characters), optional building block, and valid area type."
        });
    }

    try {
        const locationId = await insertWithNextId(pool, "locations", (connection, nextId) =>
            connection.execute(
                `INSERT INTO locations (location_id, location_name, building_block, area_type)
                 VALUES (?, ?, ?, ?)`,
                [nextId, ...locationValues(body)]
            )
        );
        res.status(201).json({
            success: true,
            message: "Location added successfully.",
            location_id: locationId
        });
    } catch (error) {
        sendDatabaseError(res, error, "Add location");
    }
});

router.put("/:id", async (req, res) => {
    if (!isPositiveInteger(req.params.id)) return invalidIdResponse(res);
    const body = req.body || {};
    if (!validLocation(body)) {
        return res.status(400).json({
            success: false,
            message: "Provide a location name (up to 100 characters), optional building block, and valid area type."
        });
    }

    try {
        const [existing] = await pool.execute(
            "SELECT location_id FROM locations WHERE location_id = ?",
            [Number(req.params.id)]
        );
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Location not found." });
        }
        await pool.execute(
            `UPDATE locations
             SET location_name = ?, building_block = ?, area_type = ?
             WHERE location_id = ?`,
            [...locationValues(body), Number(req.params.id)]
        );
        res.json({ success: true, message: "Location updated successfully." });
    } catch (error) {
        sendDatabaseError(res, error, "Update location");
    }
});

router.delete("/:id", async (req, res) => {
    if (!isPositiveInteger(req.params.id)) return invalidIdResponse(res);
    try {
        const [result] = await pool.execute(
            "DELETE FROM locations WHERE location_id = ?",
            [Number(req.params.id)]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Location not found." });
        }
        res.json({ success: true, message: "Location deleted successfully." });
    } catch (error) {
        sendDatabaseError(res, error, "Delete location");
    }
});

module.exports = router;
