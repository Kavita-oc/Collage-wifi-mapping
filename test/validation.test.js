const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isNonEmptyString,
  isNumberInRange,
  isOneOf,
  isOptionalString,
  isPositiveInteger,
  isValidMySqlDateTime
} = require("../routes/helpers");

test("validates bounded required and optional text", () => {
  assert.equal(isNonEmptyString(" REVA ", 10), true);
  assert.equal(isNonEmptyString("   ", 10), false);
  assert.equal(isNonEmptyString("too long", 3), false);
  assert.equal(isOptionalString(null, 3), true);
  assert.equal(isOptionalString("too long", 3), false);
});

test("validates enum values and positive integer IDs", () => {
  assert.equal(isOneOf("Student", ["Student", "Faculty"]), true);
  assert.equal(isOneOf("student", ["Student", "Faculty"]), false);
  assert.equal(isPositiveInteger("12"), true);
  assert.equal(isPositiveInteger(0), false);
  assert.equal(isPositiveInteger("1.2"), false);
  assert.equal(isPositiveInteger("1e2"), false);
  assert.equal(isPositiveInteger(""), false);
});

test("validates numeric measurement bounds and decimal precision", () => {
  assert.equal(isNumberInRange("-100", -100, 0), true);
  assert.equal(isNumberInRange("0.01", 0), true);
  assert.equal(isNumberInRange("-101", -100, 0), false);
  assert.equal(isNumberInRange("1.234", 0), false);
  assert.equal(isNumberInRange("   ", 0), false);
  assert.equal(isNumberInRange("Infinity", 0), false);
});

test("validates MySQL DATETIME values without timezone coercion", () => {
  assert.equal(isValidMySqlDateTime("2024-02-29 23:59:59"), true);
  assert.equal(isValidMySqlDateTime("2023-02-29 12:00:00"), false);
  assert.equal(isValidMySqlDateTime("2024-13-01 12:00:00"), false);
  assert.equal(isValidMySqlDateTime("2024-01-01T12:00"), true);
  assert.equal(isValidMySqlDateTime("2024-01-01T12:00:00Z"), false);
});
