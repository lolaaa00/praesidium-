"""
Direct Mode tests for PolicyComplianceGate.

Runs the contract in-memory (no network, no GEN spent) via genlayer-test.
LLM calls are mocked so test outcomes are deterministic.

Note on consensus: gltest's Direct Mode patches gl.vm.run_nondet to just
call leader_fn() and return its result — validator_fn is never invoked.
That's fine here: these tests cover validate_action's business logic
(parsing, storage, reputation, guards), not GenLayer's consensus mechanics.
The tolerant leader/validator agreement check (_verdicts_agree) is exercised
against a real network in Studio Mode integration tests.

Run with:
    python3.12 -m pip install -r requirements-test.txt
    python3.12 -m pytest tests/ -v
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


def _validation_payload(action_type="api_call", org_id="org-test", policy_id=""):
    return json.dumps(
        {
            "policy": "GDPR-EU-2024",
            "policyId": policy_id,
            "rules": "1. No bulk export of PII without verified consent.",
            "actionType": action_type,
            "actionPayload": {"records": 12400},
            "context": {"orgId": org_id},
        }
    )


def _mock_leader(direct_vm, leader_response):
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r"strict AI policy compliance evaluator", leader_response)


def _register_org(contract, org_id="org-test", name="Test Org"):
    assert contract.register_org(org_id, name) is True


def _register_policy(contract, policy_id="pol-1", org_id="org-test", name="GDPR-EU-2024"):
    assert contract.register_policy(policy_id, org_id, name, "0xdeadbeef") is True


def _register_agent(contract, agent_id="agent-1", org_id="org-test", name="Test Agent"):
    assert contract.register_agent(agent_id, org_id, name, "automation", True, False) is True


# ──────────────────────────────────────────
# Deployment / ownership
# ──────────────────────────────────────────


def test_deploy_initializes_empty_state(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    assert int(contract.get_validation_count()) == 0
    stats = json.loads(contract.get_contract_stats())
    assert stats == {
        "validation_count": 0,
        "escalation_count": 0,
        "policy_count": 0,
        "agent_count": 0,
        "org_count": 0,
        "paused": False,
    }


def test_get_owner_returns_deployer(direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT_PATH)
    assert contract.get_owner().as_bytes == direct_owner


def test_owner_is_admin_by_default(direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT_PATH)
    from gltest.direct.loader import create_address

    assert contract.is_admin(create_address("default_sender")) is True


def test_non_owner_cannot_transfer_ownership(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    from gltest.direct.loader import create_address

    alice = create_address("alice")
    with direct_vm.prank(alice):
        try:
            contract.transfer_ownership(alice)
            assert False, "expected an assertion error"
        except Exception as e:
            assert "owner" in str(e)


# ──────────────────────────────────────────
# Pause switch
# ──────────────────────────────────────────


def test_pause_blocks_validate_action(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    assert contract.pause() is True
    assert contract.is_paused() is True

    _mock_leader(direct_vm, APPROVED_LEADER_RESPONSE)
    try:
        contract.validate_action("req-paused", "agent-x", _validation_payload())
        assert False, "expected an assertion error"
    except Exception as e:
        assert "paused" in str(e)

    assert contract.unpause() is True
    assert contract.is_paused() is False


# ──────────────────────────────────────────
# Org management
# ──────────────────────────────────────────


def test_register_org_and_get_org(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract, "org-1", "Acme Inc")

    org = json.loads(contract.get_org("org-1"))
    assert org["org_id"] == "org-1"
    assert org["name"] == "Acme Inc"
    assert org["active"] is True
    assert org["agent_count"] == 0
    assert org["policy_count"] == 0


def test_register_org_duplicate_fails(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract, "org-1")
    try:
        contract.register_org("org-1", "Other Name")
        assert False, "expected an assertion error"
    except Exception as e:
        assert "already registered" in str(e)


def test_deactivate_and_reactivate_org(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract, "org-1")

    assert contract.deactivate_org("org-1") is True
    assert json.loads(contract.get_org("org-1"))["active"] is False

    assert contract.reactivate_org("org-1") is True
    assert json.loads(contract.get_org("org-1"))["active"] is True


def test_get_org_unknown_returns_error(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    result = json.loads(contract.get_org("does-not-exist"))
    assert "error" in result


# ──────────────────────────────────────────
# Policy management
# ──────────────────────────────────────────


def test_register_policy_and_get_policy(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract)
    _register_policy(contract, "pol-1", "org-test", "GDPR-EU-2024")

    policy = json.loads(contract.get_policy("pol-1"))
    assert policy["policy_id"] == "pol-1"
    assert policy["org_id"] == "org-test"
    assert policy["version"] == 1
    assert policy["active"] is True

    org = json.loads(contract.get_org("org-test"))
    assert org["policy_count"] == 1


def test_register_policy_requires_active_org(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract)
    contract.deactivate_org("org-test")

    try:
        contract.register_policy("pol-1", "org-test", "GDPR", "0xhash")
        assert False, "expected an assertion error"
    except Exception as e:
        assert "not active" in str(e)


def test_update_policy_rules_bumps_version(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract)
    _register_policy(contract)

    assert contract.update_policy_rules("pol-1", "0xnewhash") is True
    policy = json.loads(contract.get_policy("pol-1"))
    assert policy["version"] == 2
    assert policy["rules_hash"] == "0xnewhash"


def test_deactivate_policy(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract)
    _register_policy(contract)

    assert contract.deactivate_policy("pol-1") is True
    assert json.loads(contract.get_policy("pol-1"))["active"] is False

    assert contract.reactivate_policy("pol-1") is True
    assert json.loads(contract.get_policy("pol-1"))["active"] is True


# ──────────────────────────────────────────
# Agent management
# ──────────────────────────────────────────


def test_register_agent_and_get_agent(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract)
    _register_agent(contract, "agent-1", "org-test", "DataSync Agent")

    agent = json.loads(contract.get_agent("agent-1"))
    assert agent["agent_id"] == "agent-1"
    assert agent["status"] == "active"
    assert agent["can_write"] is True
    assert agent["can_external_call"] is False

    org = json.loads(contract.get_org("org-test"))
    assert org["agent_count"] == 1


def test_suspend_and_reinstate_agent(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract)
    _register_agent(contract)

    assert contract.suspend_agent("agent-1") is True
    assert json.loads(contract.get_agent("agent-1"))["status"] == "suspended"

    assert contract.reinstate_agent("agent-1") is True
    assert json.loads(contract.get_agent("agent-1"))["status"] == "active"


def test_revoked_agent_cannot_be_reinstated(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract)
    _register_agent(contract)

    assert contract.revoke_agent("agent-1") is True
    try:
        contract.reinstate_agent("agent-1")
        assert False, "expected an assertion error"
    except Exception as e:
        assert "revoked" in str(e)


def test_suspended_agent_cannot_submit_validation(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract)
    _register_agent(contract)
    contract.suspend_agent("agent-1")

    _mock_leader(direct_vm, APPROVED_LEADER_RESPONSE)
    try:
        contract.validate_action("req-1", "agent-1", _validation_payload())
        assert False, "expected an assertion error"
    except Exception as e:
        assert "suspended" in str(e)


def test_unregistered_agent_can_still_submit_validation(direct_deploy, direct_vm):
    """Agents that haven't been registered on-chain yet are permitted —
    on-chain registration is additive, not a hard prerequisite, so the
    engine's existing integration keeps working without changes."""
    contract = direct_deploy(CONTRACT_PATH)
    _mock_leader(direct_vm, APPROVED_LEADER_RESPONSE)

    result = json.loads(
        contract.validate_action("req-1", "never-registered-agent", _validation_payload())
    )
    assert result["verdict"] == "approved"


# ──────────────────────────────────────────
# Core validation
# ──────────────────────────────────────────


def test_validate_action_approved_stores_record(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract)
    _register_policy(contract)
    _mock_leader(direct_vm, APPROVED_LEADER_RESPONSE)

    result = json.loads(
        contract.validate_action("req-1", "agent-1", _validation_payload(policy_id="pol-1"))
    )

    assert result["verdict"] == "approved"
    assert result["compliance_score"] == 96
    assert int(contract.get_validation_count()) == 1

    record = json.loads(contract.get_validation("req-1"))
    assert record["request_id"] == "req-1"
    assert record["agent_id"] == "agent-1"
    assert record["org_id"] == "org-test"
    assert record["policy_id"] == "pol-1"
    assert record["verdict"] == "approved"
    assert record["violations"] == []

    policy = json.loads(contract.get_policy("pol-1"))
    assert policy["validation_count"] == 1


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


def test_validate_action_rejects_duplicate_request_id(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    _mock_leader(direct_vm, APPROVED_LEADER_RESPONSE)
    contract.validate_action("req-dup", "agent-1", _validation_payload())

    try:
        contract.validate_action("req-dup", "agent-1", _validation_payload())
        assert False, "expected an assertion error"
    except Exception as e:
        assert "already processed" in str(e)


def test_validate_action_clamps_out_of_range_scores(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    _mock_leader(
        direct_vm,
        json.dumps(
            {
                "verdict": "approved",
                "compliance_score": 999,
                "risk_score": -50,
                "reasoning": "out of range scores",
                "violations": [],
            }
        ),
    )

    result = json.loads(
        contract.validate_action("req-clamp", "agent-1", _validation_payload())
    )
    assert result["compliance_score"] == 100
    assert result["risk_score"] == 0


def test_validate_action_escalated_opens_escalation(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    _mock_leader(
        direct_vm,
        json.dumps(
            {
                "verdict": "escalated",
                "compliance_score": 55,
                "risk_score": 60,
                "reasoning": "Ambiguous policy interpretation, needs human review.",
                "violations": [],
            }
        ),
    )
    contract.validate_action("req-esc", "agent-1", _validation_payload())

    assert int(contract.get_contract_stats() and json.loads(contract.get_contract_stats())["escalation_count"]) == 1

    escalation = json.loads(contract.get_escalation("esc-req-esc"))
    assert escalation["request_id"] == "req-esc"
    assert escalation["status"] == "open"


def test_validate_action_approved_does_not_open_escalation(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    _mock_leader(direct_vm, APPROVED_LEADER_RESPONSE)
    contract.validate_action("req-ok", "agent-1", _validation_payload())

    stats = json.loads(contract.get_contract_stats())
    assert stats["escalation_count"] == 0


# ──────────────────────────────────────────
# Agent reputation
# ──────────────────────────────────────────


def test_agent_reputation_accumulates_across_validations(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)

    _mock_leader(direct_vm, APPROVED_LEADER_RESPONSE)
    contract.validate_action("req-4", "agent-4", _validation_payload())

    _mock_leader(direct_vm, REJECTED_LEADER_RESPONSE)
    contract.validate_action("req-5", "agent-4", _validation_payload())

    rep = json.loads(contract.get_agent_reputation("agent-4"))
    assert rep["total_validations"] == 2
    assert rep["approved_count"] == 1
    assert rep["rejected_count"] == 1
    assert rep["avg_compliance_score"] == (96 + 12) / 2


def test_get_agent_reputation_unknown_agent_returns_zeroed_stats(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    rep = json.loads(contract.get_agent_reputation("unknown-agent"))
    assert rep["total_validations"] == 0
    assert rep["approval_rate"] == 0


# ──────────────────────────────────────────
# Org-scoped counters and views
# ──────────────────────────────────────────


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


def test_list_agents_by_org(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract, "org-a")
    _register_org(contract, "org-b")
    _register_agent(contract, "agent-1", "org-a")
    _register_agent(contract, "agent-2", "org-a")
    _register_agent(contract, "agent-3", "org-b")

    agents = json.loads(contract.list_agents_by_org("org-a"))
    assert {a["agent_id"] for a in agents} == {"agent-1", "agent-2"}


def test_list_policies_by_org(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract, "org-a")
    _register_policy(contract, "pol-1", "org-a")
    _register_policy(contract, "pol-2", "org-a")

    policies = json.loads(contract.list_policies_by_org("org-a"))
    assert {p["policy_id"] for p in policies} == {"pol-1", "pol-2"}


def test_count_agents_by_status(direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract)
    _register_agent(contract, "agent-1")
    _register_agent(contract, "agent-2")
    contract.suspend_agent("agent-2")

    assert int(contract.count_agents_by_status("org-test", "active")) == 1
    assert int(contract.count_agents_by_status("org-test", "suspended")) == 1


def test_get_org_health(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    _register_org(contract)
    _register_agent(contract, "agent-1")
    _register_agent(contract, "agent-2")
    contract.suspend_agent("agent-2")
    _register_policy(contract)

    _mock_leader(
        direct_vm,
        json.dumps(
            {
                "verdict": "escalated",
                "compliance_score": 55,
                "risk_score": 60,
                "reasoning": "needs review",
                "violations": [],
            }
        ),
    )
    contract.validate_action("req-health", "agent-1", _validation_payload())

    health = json.loads(contract.get_org_health("org-test"))
    assert health["active_agent_count"] == 1
    assert health["suspended_agent_count"] == 1
    assert health["active_policy_count"] == 1
    assert health["open_escalation_count"] == 1
    assert health["validation_count"] == 1


# ──────────────────────────────────────────
# Escalation lifecycle
# ──────────────────────────────────────────


def test_resolve_escalation(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    _mock_leader(
        direct_vm,
        json.dumps(
            {
                "verdict": "escalated",
                "compliance_score": 55,
                "risk_score": 60,
                "reasoning": "needs review",
                "violations": [],
            }
        ),
    )
    contract.validate_action("req-esc-2", "agent-1", _validation_payload())

    assert contract.resolve_escalation("esc-req-esc-2", "resolved", "Reviewed, approved manually.") is True

    escalation = json.loads(contract.get_escalation("esc-req-esc-2"))
    assert escalation["status"] == "resolved"
    assert escalation["resolution_notes"] == "Reviewed, approved manually."


def test_list_escalations_by_status(direct_deploy, direct_vm):
    contract = direct_deploy(CONTRACT_PATH)
    _mock_leader(
        direct_vm,
        json.dumps(
            {
                "verdict": "escalated",
                "compliance_score": 55,
                "risk_score": 60,
                "reasoning": "needs review",
                "violations": [],
            }
        ),
    )
    contract.validate_action("req-esc-3", "agent-1", _validation_payload())

    open_escalations = json.loads(contract.list_escalations_by_status("open"))
    assert len(open_escalations) == 1
    assert open_escalations[0]["request_id"] == "req-esc-3"

    contract.resolve_escalation("esc-req-esc-3", "resolved", "done")

    assert json.loads(contract.list_escalations_by_status("open")) == []
    resolved = json.loads(contract.list_escalations_by_status("resolved"))
    assert len(resolved) == 1
