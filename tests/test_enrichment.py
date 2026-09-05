"""
Automated Pytest for zk-proof-of-vaccination-pki Enrichment Modules.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from enrichment import (
    FeaturesEngine,
    ZkVaccinationCredentialWithoutIdentityDisclosureEngine,
    MultivaccineZkCredentialWithSelectiveDisclosureEngine,
    ZkVaccinationCredentialWithExpiryVerificationEngine,
    BatchVaccinationVerificationForMassEventsEngine,
    ZkVaccinationPassportForInternationalTravelEngine,
    RevocableZkVaccinationCredentialEngine,
    ZkProofForVaccinationRateStatisticsEngine,
    ZkproofofvaccinationpkiEnrichmentSuite,
    enrichment_suite,
)

def test_enrichment_suite_execution():
    suite = ZkproofofvaccinationpkiEnrichmentSuite()
    res = suite.execute_all(primary_val=0.5, secondary_val=0.2)
    assert len(res) >= 1
    for k, v in res.items():
        assert v.status in ["OPTIMAL", "WARNING", "CRITICAL_ALERT"]
        assert isinstance(v.recommendations, list)

def test_enrichment_threshold_escalation():
    suite = ZkproofofvaccinationpkiEnrichmentSuite()
    res = suite.execute_all(primary_val=10.0, secondary_val=5.0)
    for k, v in res.items():
        assert v.status in ["WARNING", "CRITICAL_ALERT"]
        assert len(v.alerts) > 0


def test_enrichment_suite_all_engines_present():
    """Verify all 8 enrichment engines execute and return results."""
    suite = ZkproofofvaccinationpkiEnrichmentSuite()
    res = suite.execute_all(primary_val=0.5, secondary_val=0.2)
    assert len(res) == 8
    expected_keys = {
        "FeaturesEngine",
        "ZkVaccinationCredentialWithoutIdentityDisclosureEngine",
        "MultivaccineZkCredentialWithSelectiveDisclosureEngine",
        "ZkVaccinationCredentialWithExpiryVerificationEngine",
        "BatchVaccinationVerificationForMassEventsEngine",
        "ZkVaccinationPassportForInternationalTravelEngine",
        "RevocableZkVaccinationCredentialEngine",
        "ZkProofForVaccinationRateStatisticsEngine",
    }
    assert set(res.keys()) == expected_keys


def test_enrichment_suite_no_duplicate_attributes():
    """Verify the enrichment suite has distinct attributes for each engine."""
    suite = ZkproofofvaccinationpkiEnrichmentSuite()
    assert hasattr(suite, 'zkvaccinationcredent_without_identity')
    assert hasattr(suite, 'zkvaccinationcredent_expiry')
    assert suite.zkvaccinationcredent_without_identity is not suite.zkvaccinationcredent_expiry
