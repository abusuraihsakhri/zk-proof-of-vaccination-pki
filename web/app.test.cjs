"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluate } = require("./app.js");

const input = {
  task_id: "T-1", target_identifier: "DEMO-1",
  primary_metric: 15, secondary_metric: 5,
  status_descriptor: "NOMINAL", is_critical_flag: false
};
test("nominal input produces no alerts and no cryptographic proof", () => {
  const result = evaluate(input);
  assert.equal(result.overall_urgency, "ROUTINE");
  assert.equal(result.total_alerts, 0);
  assert.equal(result.cryptographic_proof_generated, false);
  assert.equal(result.audit_hash, null);
});
test("thresholds are strict", () => {
  assert.equal(evaluate({ ...input, primary_metric: 25, secondary_metric: 12 }).total_alerts, 0);
  assert.equal(evaluate({ ...input, primary_metric: 25.01 }).total_alerts, 1);
  assert.equal(evaluate({ ...input, secondary_metric: 12.01 }).total_alerts, 1);
});
test("critical flag and anomaly descriptor follow Python supervisor classification", () => {
  const result = evaluate({ ...input, is_critical_flag: true, status_descriptor: "DISCORDANT", primary_metric: 30 });
  assert.equal(result.critical_alerts_count, 1);
  assert.equal(result.total_alerts, 3);
  assert.equal(result.overall_urgency, "CRITICAL_STAT_PANIC");
  assert.equal(result.integrity_status, "RECALIBRATION_REQUIRED");
});
test("rejects invalid identifiers and nonfinite numbers", () => {
  assert.throws(() => evaluate({ ...input, task_id: "../secret" }));
  assert.throws(() => evaluate({ ...input, secondary_metric: "Infinity" }));
  assert.throws(() => evaluate({ ...input, primary_metric: "" }));
  assert.throws(() => evaluate({ ...input, primary_metric: 1e10 }));
});
