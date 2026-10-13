/* Deterministic browser-only illustration of the Python supervisor's threshold rules.
   No credential issuance, BBS+ signing, ZK proof, or cryptographic audit occurs here. */
(function (root) {
  "use strict";

  function cleanIdentifier(value, field) {
    const text = String(value == null ? "" : value).trim();
    if (!text || text.length > 128 || text.includes("..") ||
        text.includes("/") || text.includes("\\")) {
      throw new Error(field + " must be 1–128 characters without slashes or '..'.");
    }
    return text;
  }

  function cleanMetric(value, field) {
    if (value === "" || value === null || value === undefined) {
      throw new Error(field + " is required.");
    }
    const number = Number(value);
    if (!Number.isFinite(number) || Math.abs(number) > 1e9) {
      throw new Error(field + " must be a finite number within ±1e9.");
    }
    return number;
  }

  function evaluate(raw) {
    const taskId = cleanIdentifier(raw.task_id, "Task ID");
    const targetId = cleanIdentifier(raw.target_identifier, "Target identifier");
    const descriptor = cleanIdentifier(raw.status_descriptor, "Status descriptor");
    const primary = cleanMetric(raw.primary_metric, "Primary metric");
    const secondary = cleanMetric(raw.secondary_metric, "Secondary metric");
    const critical = raw.is_critical_flag === true;
    const alerts = [];

    if (primary > 25) {
      alerts.push({
        origin_worker: "InvariantQCWorker",
        urgency: "ELEVATED_RISK",
        summary: "Primary metric exceeds the demonstration threshold of 25"
      });
    }
    if (critical || secondary > 12) {
      alerts.push({
        origin_worker: "SafetyEscalationWorker",
        urgency: critical ? "CRITICAL_STAT_PANIC" : "ELEVATED_RISK",
        summary: "Critical flag or secondary metric exceeds the demonstration threshold of 12"
      });
    }
    if (["DISCORDANT", "ANOMALY", "MUTANT", "VIOLATION", "FAIL", "REJECT"]
      .some((word) => descriptor.toUpperCase().includes(word))) {
      alerts.push({
        origin_worker: "ProtocolConformanceWorker",
        urgency: "ELEVATED_RISK",
        summary: "Status descriptor contains an anomaly indicator"
      });
    }
    const criticalCount = alerts.filter((item) => item.urgency === "CRITICAL_STAT_PANIC").length;
    const urgency = criticalCount ? "CRITICAL_STAT_PANIC" :
      alerts.length ? "ELEVATED_RISK" : "ROUTINE";
    return {
      mode: "BROWSER_DEMONSTRATION_ONLY",
      task_id: taskId,
      target_identifier: targetId,
      overall_urgency: urgency,
      integrity_status: criticalCount ? "RECALIBRATION_REQUIRED" :
        alerts.length ? "DISCORDANT_ANOMALY" : "VALIDATED_OPTIMAL",
      total_alerts: alerts.length,
      critical_alerts_count: criticalCount,
      alerts,
      cryptographic_proof_generated: false,
      audit_hash: null
    };
  }

  const api = { evaluate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ThresholdDemo = api;

  if (typeof document === "undefined") return;
  function ready() {
    const form = document.getElementById("audit-form");
    if (!form) return;
    const output = document.getElementById("result");
    const count = document.getElementById("run-count");
    const state = document.getElementById("run-state");
    let runs = 0;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const mode = document.getElementById("mode").value;
      const raw = {
        task_id: document.getElementById("task-id").value,
        target_identifier: document.getElementById("target-id").value,
        primary_metric: document.getElementById("primary").value,
        secondary_metric: document.getElementById("secondary").value,
        status_descriptor: document.getElementById("descriptor").value,
        is_critical_flag: document.getElementById("critical").checked
      };
      const submit = document.getElementById("submit");
      submit.disabled = true;
      state.textContent = mode === "local" ? "Evaluating locally" : "Contacting API";
      try {
        // Validate before any network request, including in connected-API mode.
        evaluate(raw);
        let result;
        if (mode === "api") {
          const response = await fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(raw)
          });
          if (!response.ok) throw new Error("API returned HTTP " + response.status +
            ". This mode requires a running same-origin FastAPI backend.");
          result = await response.json();
        } else {
          result = evaluate(raw);
        }
        output.textContent = JSON.stringify(result, null, 2);
        runs += 1;
        count.textContent = String(runs);
        state.textContent = mode === "local" ? "Local demonstration complete" : "API response received";
      } catch (error) {
        output.textContent = "Error: " + error.message;
        state.textContent = "Evaluation failed";
      } finally {
        submit.disabled = false;
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})(typeof window !== "undefined" ? window : globalThis);
