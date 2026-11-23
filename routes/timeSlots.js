const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { sendDatabaseError } = require("./helpers");

router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT time_slot_id, slot_name, start_time, end_time
      FROM time_slots
      ORDER BY time_slot_id
    `);
    res.json({ success: true, total: rows.length, data: rows });
  } catch (error) {
    sendDatabaseError(res, error, "List time slots");
  }
});

module.exports = router;
