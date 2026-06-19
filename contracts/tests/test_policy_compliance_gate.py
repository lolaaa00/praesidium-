"""
Direct Mode tests for PolicyComplianceGate.

Runs the contract in-memory (no network, no GEN spent) via genlayer-test.
LLM calls are mocked so test outcomes are deterministic.

Run with:
    pip install -r requirements-test.txt
    pytest tests/ -v
"""
import json

CONTRACT_PATH = "src/policy_compliance_gate.py"

APPROVED_LEADER_RESPONSE = json.dumps(
    {
        "verdict": "approved",
        "compliance_score": 96,
        "risk_score": 5,
        "reasoning": "Action fully complies with the policy rules.",
        "violations": [],
    }
)

REJECTED_LEADER_RESPONSE = json.dumps(
    {
        "verdict": "rejected",
        "compliance_score": 12,
        "risk_score": 88,
        "reasoning": "Action violates the data export rule.",
        "violations": [
            {
                "rule_name": "No bulk export without consent",
                "severity": "critical",
                "description": "Exported 12,400 records without verified consent.",
            }
        ],
    }
)


def _validation_payload(action_type="api_call", org_id="org-test"):
    return json.dumps(
        {
            "policy": "GDPR-EU-2024",
            "rules": "1. No bulk export of PII without verified consent.",
            "actionType": action_type,
            "actionPayload": {"records": 12400},
            "context": {"orgId": org_id},
        }
    )


def _mock_leader(direct_vm, leader_response):
    """Mock the leader's exec_prompt call (the only LLM call gltest's Direct
    Mode can intercept — the eq_principle equivalence check runs separately
    and isn't mockable here; it's exercised in Studio Mode integration tests)."""
    direct_vm.mock_llm(r"strict AI policy compliance evaluator", leader_response)


def test_deploy_initializes_empty_state(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    assert int(contract.get_validation_count()) == 0


def test_get_owner_returns_deployer(direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT_PATH)
    assert contract.get_owner().as_bytes == direct_owner


def test_validate_action_approved_stores_record(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    _mock_leader(direct_vm, APPROVED_LEADER_RESPONSE)

    result = json.loads(
        contract.validate_action("req-1", "agent-1", _validation_payload())
    )

    assert result["verdict"] == "approved"
    assert result["compliance_score"] == 96
    assert int(contract.get_validation_count()) == 1

    record = json.loads(contract.get_validation("req-1"))
    assert record["request_id"] == "req-1"
    assert record["agent_id"] == "agent-1"
    assert record["org_id"] == "org-test"
    assert record["verdict"] == "approved"
    assert record["violations"] == []


def test_validate_action_rejected_records_violations(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    _mock_leader(direct_vm, REJECTED_LEADER_RESPONSE)

    result = json.loads(
        contract.validate_action("req-2", "agent-2", _validation_payload())
    )

    assert result["verdict"] == "rejected"
    assert len(result["violations"]) == 1
    assert result["violations"][0]["severity"] == "critical"


def test_validate_action_unexpected_leader_shape_escalates_safely(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    # A syntactically valid JSON array (not the expected object) — exercises
    # the "unexpected response shape" fallback rather than a decode error,
    # since exec_prompt(response_format="json") guarantees valid JSON syntax.
    _mock_leader(direct_vm, json.dumps(["unexpected", "array", "shape"]))

    result = json.loads(
        contract.validate_action("req-3", "agent-3", _validation_payload())
    )

    assert result["verdict"] == "escalated"
    assert result["compliance_score"] == 50


def test_agent_reputation_accumulates_across_validations(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)

    _mock_leader(direct_vm, APPROVED_LEADER_RESPONSE)
    contract.validate_action("req-4", "agent-4", _validation_payload())

    # mock_llm appends rather than replacing — clear so the new mock for the
    # same prompt pattern isn't shadowed by the first, still-registered one.
    direct_vm.clear_mocks()
    _mock_leader(direct_vm, REJECTED_LEADER_RESPONSE)
    contract.validate_action("req-5", "agent-4", _validation_payload())

    rep = json.loads(contract.get_agent_reputation("agent-4"))
    assert rep["total_validations"] == 2
    assert rep["approved_count"] == 1
    assert rep["rejected_count"] == 1
    assert rep["avg_compliance_score"] == (96 + 12) / 2


def test_org_validation_count_increments_per_org(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    _mock_leader(direct_vm, APPROVED_LEADER_RESPONSE)

    contract.validate_action("req-6", "agent-5", _validation_payload(org_id="org-a"))
    contract.validate_action("req-7", "agent-6", _validation_payload(org_id="org-a"))
    contract.validate_action("req-8", "agent-7", _validation_payload(org_id="org-b"))

    assert int(contract.get_org_validation_count("org-a")) == 2
    assert int(contract.get_org_validation_count("org-b")) == 1


def test_get_validation_unknown_request_returns_error(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    result = json.loads(contract.get_validation("does-not-exist"))
    assert "error" in result


def test_get_agent_reputation_unknown_agent_returns_zeroed_stats(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    rep = json.loads(contract.get_agent_reputation("unknown-agent"))
    assert rep["total_validations"] == 0
    assert rep["approval_rate"] == 0
