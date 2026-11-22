
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// VIEW all campus users
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT user_id, participant_code, user_role, department
            FROM campus_users
            ORDER BY user_id
        `);

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ADD a campus user
router.post("/", async (req, res) => {
    try {
        const { participant_code, user_role, department } = req.body;

        if (!participant_code || !user_role || !department) {
            return res.status(400).json({
                success: false,
                message: "All campus user fields are required."
            });
        }

        const [[row]] = await pool.query(
            "SELECT COALESCE(MAX(user_id), 0) + 1 AS nextId FROM campus_users"
        );

        const nextId = row.nextId;

        await pool.execute(
            `INSERT INTO campus_users
             (user_id, participant_code, user_role, department)
             VALUES (?, ?, ?, ?)`,
            [nextId, participant_code, user_role, department]
        );

        res.status(201).json({
            success: true,
            message: "Campus user added successfully.",
            user_id: nextId
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// UPDATE a campus user
router.put("/:id", async (req, res) => {
    try {
        const { participant_code, user_role, department } = req.body;

        if (!participant_code || !user_role || !department) {
            return res.status(400).json({
                success: false,
                message: "All campus user fields are required."
            });
        }

        const [result] = await pool.execute(
            `UPDATE campus_users
             SET participant_code = ?, user_role = ?, department = ?
             WHERE user_id = ?`,
            [participant_code, user_role, department, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Campus user not found."
            });
        }

        res.json({
            success: true,
            message: "Campus user updated successfully."
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// DELETE a campus user
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await pool.execute(
            "DELETE FROM campus_users WHERE user_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Campus user not found."
            });
        }

        res.json({
            success: true,
            message: "Campus user deleted successfully."
        });

    } catch (error) {
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                success: false,
                message: "Cannot delete this user because Wi-Fi readings are linked to this user."
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
