const ENTITY_IDS = Object.freeze({
  locations: { table: "locations", column: "location_id" },
  accessPoints: { table: "access_points", column: "ap_id" },
  users: { table: "campus_users", column: "user_id" },
  readings: { table: "wifi_readings", column: "reading_id" }
});

function isNonEmptyString(value, maxLength) {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength;
}

function isOptionalString(value, maxLength) {
  return value == null ||
    (typeof value === "string" && value.trim().length <= maxLength);
}

function isOneOf(value, allowedValues) {
  return typeof value === "string" && allowedValues.includes(value);
}

function isPositiveInteger(value) {
  if (typeof value !== "number" && typeof value !== "string") return false;
  if (typeof value === "string" && !/^[1-9]\d*$/.test(value.trim())) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0;
}

function isNumberInRange(value, min, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || typeof value === "boolean" ||
      (typeof value === "string" && value.trim() === "")) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) &&
    parsed >= min &&
    parsed <= max &&
    Math.abs(parsed * 100 - Math.round(parsed * 100)) < 1e-7;
}

function isValidMySqlDateTime(value) {
  if (typeof value !== "string") return false;
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/
  );
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0"] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (year < 1000 || month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

async function insertWithNextId(pool, entity, insert) {
  const definition = ENTITY_IDS[entity];
  if (!definition) throw new Error(`Unknown ID allocation entity: ${entity}`);

  const connection = await pool.getConnection();
  const lockName = `reva_wifi_mapping:${entity}:id`;
  let lockAcquired = false;
  let destroyConnection = false;

  try {
    const [lockRows] = await connection.query("SELECT GET_LOCK(?, 10) AS acquired", [lockName]);
    if (Number(lockRows[0].acquired) !== 1) {
      const error = new Error("Timed out waiting for an ID allocation lock.");
      error.code = "ID_ALLOCATION_TIMEOUT";
      throw error;
    }
    lockAcquired = true;

    const [idRows] = await connection.query(
      `SELECT COALESCE(MAX(${definition.column}), 0) + 1 AS nextId FROM ${definition.table}`
    );
    const nextId = idRows[0].nextId;
    await insert(connection, nextId);
    return nextId;
  } finally {
    if (lockAcquired) {
      try {
        const [releaseRows] = await connection.query("SELECT RELEASE_LOCK(?) AS released", [lockName]);
        if (Number(releaseRows[0].released) !== 1) {
          console.error(`Could not confirm release of ID allocation lock for ${entity}.`);
          destroyConnection = true;
        }
      } catch (error) {
        console.error(`Could not release ID allocation lock for ${entity} (${error.code || "UNKNOWN"}).`);
        destroyConnection = true;
      }
    }

    if (destroyConnection) connection.destroy();
    else connection.release();
  }
}

function sendDatabaseError(res, error, context) {
  console.error(`${context} failed (${error.code || "UNKNOWN"}).`);

  const clientErrors = {
    ER_DUP_ENTRY: [409, "A record with the same unique value already exists."],
    ER_NO_REFERENCED_ROW_2: [400, "A referenced record does not exist."],
    ER_ROW_IS_REFERENCED_2: [409, "This record is still referenced by related data."],
    ER_CHECK_CONSTRAINT_VIOLATED: [400, "One or more values are outside the allowed range."],
    ER_DATA_TOO_LONG: [400, "One or more values exceed the allowed length."],
    ER_BAD_NULL_ERROR: [400, "A required value is missing."],
    ER_TRUNCATED_WRONG_VALUE: [400, "One or more values have an invalid format."],
    ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: [400, "One or more values have an invalid format."],
    ER_WARN_DATA_OUT_OF_RANGE: [400, "One or more values are outside the allowed range."],
    ID_ALLOCATION_TIMEOUT: [503, "Could not allocate a record ID. Please try again."]
  };
  const mapped = Object.prototype.hasOwnProperty.call(clientErrors, error.code)
    ? clientErrors[error.code]
    : null;
  if (mapped) {
    return res.status(mapped[0]).json({ success: false, message: mapped[1] });
  }
  return res.status(500).json({ success: false, message: "The database operation failed." });
}

function invalidIdResponse(res) {
  return res.status(400).json({ success: false, message: "ID must be a positive integer." });
}

module.exports = {
  insertWithNextId,
  invalidIdResponse,
  isNonEmptyString,
  isNumberInRange,
  isOneOf,
  isOptionalString,
  isPositiveInteger,
  isValidMySqlDateTime,
  sendDatabaseError
};
