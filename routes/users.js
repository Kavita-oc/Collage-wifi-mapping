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

const USER_ROLES = ["Student", "Faculty", "Staff"];

function validUser(body) {
    return isNonEmptyString(body.participant_code, 20) &&
        isOneOf(body.user_role, USER_ROLES) &&
        isNonEmptyString(body.department, 100);
}

function userValues(body) {
    return [body.participant_code.trim(), body.user_role, body.department.trim()];
}

router.get("/", async (_req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT user_id, participant_code, user_role, department
            FROM campus_users
            ORDER BY user_id
        `);
        res.json({ success: true, total: rows.length, data: rows });
    } catch (error) {
        sendDatabaseError(res, error, "List campus users");
    }
});

router.post("/", async (req, res) => {
    const body = req.body || {};
    if (!validUser(body)) {
        return res.status(400).json({
            success: false,
            message: "Provide a participant code (up to 20 characters), valid user role, and department (up to 100 characters)."
        });
    }

    try {
        const userId = await insertWithNextId(pool, "users", (connection, nextId) =>
            connection.execute(
                `INSERT INTO campus_users (user_id, participant_code, user_role, department)
                 VALUES (?, ?, ?, ?)`,
                [nextId, ...userValues(body)]
            )
        );
        res.status(201).json({
            success: true,
            message: "Campus user added successfully.",
            user_id: userId
        });
    } catch (error) {
        sendDatabaseError(res, error, "Add campus user");
    }
});

router.put("/:id", async (req, res) => {
    if (!isPositiveInteger(req.params.id)) return invalidIdResponse(res);
    const body = req.body || {};
    if (!validUser(body)) {
        return res.status(400).json({
            success: false,
            message: "Provide a participant code (up to 20 characters), valid user role, and department (up to 100 characters)."
        });
    }

    try {
        const [existing] = await pool.execute(
            "SELECT user_id FROM campus_users WHERE user_id = ?",
            [Number(req.params.id)]
        );
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Campus user not found." });
        }
        await pool.execute(
            `UPDATE campus_users
             SET participant_code = ?, user_role = ?, department = ?
             WHERE user_id = ?`,
            [...userValues(body), Number(req.params.id)]
        );
        res.json({ success: true, message: "Campus user updated successfully." });
    } catch (error) {
        sendDatabaseError(res, error, "Update campus user");
    }
});

router.delete("/:id", async (req, res) => {
    if (!isPositiveInteger(req.params.id)) return invalidIdResponse(res);
    try {
        const [result] = await pool.execute(
            "DELETE FROM campus_users WHERE user_id = ?",
            [Number(req.params.id)]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Campus user not found." });
        }
        res.json({ success: true, message: "Campus user deleted successfully." });
    } catch (error) {
        sendDatabaseError(res, error, "Delete campus user");
    }
});

module.exports = router;
