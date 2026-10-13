"""Regression tests for integrity, validation, and CSV processing."""
import csv

import pytest
from pydantic import ValidationError

from agents.base import AuditTrail
from agents.models import SystemTaskPayload
from cli import main as cli_main
from zk_health_pass.cli import main as alternate_main


def test_audit_tampering_is_detected():
    audit = AuditTrail(secret_key="fixture-only-test-key")
    audit.log("tester", "test", "FIRST", {"value": 1})
    audit.log("tester", "test", "SECOND", {"value": 2})
    assert audit.verify_integrity()
    audit.logs[0]["actor"] = "forged"
    assert not audit.verify_integrity()


def test_audit_forged_signature_and_link_are_detected():
    audit = AuditTrail(secret_key="fixture-only-test-key")
    audit.log("tester", "test", "FIRST", {"value": 1})
    audit.log("tester", "test", "SECOND", {"value": 2})
    audit.logs[0]["current_hash"] = "a" * 64
    audit.logs[1]["prev_hash"] = "a" * 64
    assert not audit.verify_integrity()


def test_audit_output_cannot_mutate_internal_state():
    audit = AuditTrail(secret_key="fixture-only-test-key")
    returned = audit.log("tester", "test", "FIRST", {"value": 1})
    returned["actor"] = "forged"
    audit.get_trail()[0]["event_type"] = "forged"
    assert audit.verify_integrity()
    assert audit.get_trail()[0]["actor"] == "tester"


@pytest.mark.parametrize("value", [float("inf"), -float("inf"), float("nan")])
def test_nonfinite_metrics_rejected(value):
    with pytest.raises(ValidationError):
        SystemTaskPayload(task_id="T1", target_identifier="TARGET", primary_metric=value)


@pytest.mark.parametrize("runner,summary_column", [
    (cli_main, "overall_urgency"),
    (alternate_main, "overall_status"),
])
def test_csv_false_does_not_trigger_critical_flag(tmp_path, runner, summary_column):
    input_path = tmp_path / "in.csv"
    output_path = tmp_path / "out.csv"
    input_path.write_text(
        "task_id,target_identifier,primary_metric,secondary_metric,is_critical_flag,status_descriptor\n"
        "T1,DEMO-1,10,4,False,NOMINAL\n"
        "T2,DEMO-2,10,4,True,NOMINAL\n", encoding="utf-8"
    )
    assert runner(["batch", "-i", str(input_path), "-o", str(output_path)]) == 0
    with output_path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 2
    assert "CRITICAL" not in rows[0][summary_column]
    assert "CRITICAL" in rows[1][summary_column]


def test_api_rejects_disallowed_identifier():
    from fastapi.testclient import TestClient
    from agents.api import app
    client = TestClient(app)
    result = client.post("/api/audit", json={
        "task_id": "T1", "target_identifier": "MRN-123456",
        "primary_metric": 5, "status_descriptor": "NOMINAL"
    })
    assert result.status_code == 422
    assert client.get("/health").status_code == 200
