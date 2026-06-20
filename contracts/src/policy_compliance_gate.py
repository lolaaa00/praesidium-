# PolicyComplianceGate — GenLayer Intelligent Contract
#
# Decentralized compliance validation for AI agent actions. Organizations
# register policies; agents submit actions; the contract runs an LLM-backed
# leader/validator consensus check before recording a verdict on-chain.
#
# Consensus design note (read before changing validate_action):
# Validators reach agreement by INDEPENDENTLY re-running the same evaluation
# prompt and comparing the result against the leader's, not by checking
# whether the leader's output is well-formed JSON. A schema-only check (e.g.
# "did the leader return valid JSON with the right keys") is explicitly the
# wrong pattern for GenLayer equivalence principles: every leader response
# would trivially satisfy it, so it never actually catches disagreement and
# inflates false confidence. What we instead compare is the substance of the
# decision — the verdict category must match exactly (that's the actual
# decision the contract is recording), while compliance_score/risk_score use
# a tolerance band rather than exact equality, since two independent LLM
# calls over the same input will naturally produce slightly different
# numbers even when they agree in substance. Reasoning text is never
# compared. This keeps the check both grounded (validators independently
# verify against the same source data) and tolerant enough that ordinary LLM
# sampling noise doesn't push transactions into Undetermined.
#
# Schema note: only fully-parameterized generics are usable in storage —
# TreeMap[str, X], not TreeMap or dict; DynArray[T], not list[T]. Plain
# `int` is rejected in favor of sized aliases (u32, u256, ...). Every nested
# record type must be a @dataclass decorated with @allow_storage. Getting
# any of this wrong is the most common cause of a "could not load contract
# schema" error when deploying or interacting with the contract.

from genlayer import *
from dataclasses import dataclass
import json

# ──────────────────────────────────────────
# Constants
# ──────────────────────────────────────────

VERDICT_APPROVED = "approved"
VERDICT_CONDITIONAL = "conditional"
VERDICT_ESCALATED = "escalated"
VERDICT_REJECTED = "rejected"
VALID_VERDICTS = (VERDICT_APPROVED, VERDICT_CONDITIONAL, VERDICT_ESCALATED, VERDICT_REJECTED)

AGENT_STATUS_ACTIVE = "active"
AGENT_STATUS_SUSPENDED = "suspended"
AGENT_STATUS_REVOKED = "revoked"
VALID_AGENT_STATUSES = (AGENT_STATUS_ACTIVE, AGENT_STATUS_SUSPENDED, AGENT_STATUS_REVOKED)

ESCALATION_STATUS_OPEN = "open"
ESCALATION_STATUS_RESOLVED = "resolved"
ESCALATION_STATUS_DISMISSED = "dismissed"
VALID_ESCALATION_STATUSES = (ESCALATION_STATUS_OPEN, ESCALATION_STATUS_RESOLVED, ESCALATION_STATUS_DISMISSED)

# Tolerance band for numeric agreement between leader and validator scores.
# Two independent LLM calls over the same prompt will drift slightly even
# when they substantively agree; too tight a band pushes transactions into
# Undetermined for no real disagreement, too loose lets genuine errors slip
# through. 15 points was chosen as a middle ground for a 0-100 scale.
SCORE_TOLERANCE = 15

DEFAULT_VALIDATOR_COUNT = 3

# Upper bounds on free-text storage fields, so a single registration call
# can't bloat contract storage unboundedly.
MAX_ID_LENGTH = 128
MAX_NAME_LENGTH = 256
MAX_REASON_LENGTH = 2000


# ──────────────────────────────────────────
# Storage records
# ──────────────────────────────────────────


@allow_storage
@dataclass
class OrgRecord:
    org_id: str
    name: str
    owner: Address
    active: bool
    policy_count: u256
    agent_count: u256
    validation_count: u256


@allow_storage
@dataclass
class PolicyRecord:
    policy_id: str
    org_id: str
    name: str
    version: u32
    rules_hash: str
    active: bool
    validation_count: u256


@allow_storage
@dataclass
class AgentRecord:
    agent_id: str
    org_id: str
    name: str
    agent_type: str
    status: str
    can_write: bool
    can_external_call: bool
    registered_by: Address


@allow_storage
@dataclass
class ValidationRecord:
    request_id: str
    agent_id: str
    org_id: str
    policy_id: str
    action_type: str
    verdict: str
    compliance_score: u32
    risk_score: u32
    reasoning: str
    violations: str  # JSON-encoded array
    validator_count: u32


@allow_storage
@dataclass
class AgentReputation:
    total_validations: u256
    approved_count: u256
    conditional_count: u256
    rejected_count: u256
    escalated_count: u256
    cumulative_compliance: u256


@allow_storage
@dataclass
class EscalationRecord:
    escalation_id: str
    request_id: str
    org_id: str
    reason: str
    status: str
    resolution_notes: str
    resolved_by: str  # hex address, empty string until resolved


# ──────────────────────────────────────────
# Events — emitted for off-chain indexers (the web dashboard's realtime
# sync and audit trail read from Supabase, not directly from these, but
# they let any third-party indexer follow contract activity independently).
# ──────────────────────────────────────────


class OrgRegisteredEvent(gl.Event):
    def __init__(self, org_id: str, /): ...


class PolicyRegisteredEvent(gl.Event):
    def __init__(self, policy_id: str, org_id: str, /): ...


class AgentRegisteredEvent(gl.Event):
    def __init__(self, agent_id: str, org_id: str, /): ...


class AgentStatusChangedEvent(gl.Event):
    def __init__(self, agent_id: str, status: str, /): ...


class ValidationCompletedEvent(gl.Event):
    def __init__(self, request_id: str, agent_id: str, verdict: str, /): ...


class EscalationOpenedEvent(gl.Event):
    def __init__(self, escalation_id: str, request_id: str, /): ...


class EscalationResolvedEvent(gl.Event):
    def __init__(self, escalation_id: str, status: str, /): ...


# ──────────────────────────────────────────
# Contract
# ──────────────────────────────────────────


class PolicyComplianceGate(gl.Contract):
    owner: Address
    paused: bool

    validation_count: u256
    escalation_count: u256
    policy_count: u256
    agent_count: u256
    org_count: u256

    orgs: TreeMap[str, OrgRecord]
    policies: TreeMap[str, PolicyRecord]
    agents: TreeMap[str, AgentRecord]
    validations: TreeMap[str, ValidationRecord]
    agent_reputations: TreeMap[str, AgentReputation]
    org_validation_counts: TreeMap[str, u256]
    escalations: TreeMap[str, EscalationRecord]
    admins: TreeMap[str, bool]  # hex address -> is_admin

    def __init__(self):
        self.owner = gl.message.sender_address
        self.paused = False
        self.validation_count = u256(0)
        self.escalation_count = u256(0)
        self.policy_count = u256(0)
        self.agent_count = u256(0)
        self.org_count = u256(0)

    # ────────────────────────────────────────
    # Internal guards
    # ────────────────────────────────────────

    def _is_admin(self, address: Address) -> bool:
        if address == self.owner:
            return True
        return self.admins.get(address.as_hex, False)

    def _require_owner(self):
        assert gl.message.sender_address == self.owner, "caller is not the contract owner"

    def _require_admin(self):
        assert self._is_admin(gl.message.sender_address), "caller is not an admin"

    def _require_not_paused(self):
        assert not self.paused, "contract is paused"

    def _safe_int(self, value, default: int) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    def _safe_str(self, value, default: str) -> str:
        if isinstance(value, str):
            return value
        return default

    # ────────────────────────────────────────
    # Admin: ownership, admins, pause switch
    # ────────────────────────────────────────

    @gl.public.write
    def transfer_ownership(self, new_owner: Address) -> bool:
        """Transfer contract ownership. Owner-only."""
        self._require_owner()
        self.owner = new_owner
        return True

    @gl.public.write
    def add_admin(self, address: Address) -> bool:
        """Grant admin rights (escalation resolution, pause/unpause). Owner-only."""
        self._require_owner()
        self.admins[address.as_hex] = True
        return True

    @gl.public.write
    def remove_admin(self, address: Address) -> bool:
        """Revoke admin rights. Owner-only."""
        self._require_owner()
        self.admins[address.as_hex] = False
        return True

    @gl.public.write
    def pause(self) -> bool:
        """Pause validate_action — used to halt processing during an incident. Admin-only."""
        self._require_admin()
        self.paused = True
        return True

    @gl.public.write
    def unpause(self) -> bool:
        """Resume validate_action. Admin-only."""
        self._require_admin()
        self.paused = False
        return True

    # ────────────────────────────────────────
    # Organization management
    # ────────────────────────────────────────

    @gl.public.write
    def register_org(self, org_id: str, name: str) -> bool:
        """Register a new organization. Fails if org_id is already taken."""
        assert org_id not in self.orgs, "org_id already registered"
        assert 0 < len(org_id) <= MAX_ID_LENGTH, "org_id must be 1-128 characters"
        assert len(name) <= MAX_NAME_LENGTH, "name too long"

        self.orgs[org_id] = OrgRecord(
            org_id=org_id,
            name=name,
            owner=gl.message.sender_address,
            active=True,
            policy_count=u256(0),
            agent_count=u256(0),
            validation_count=u256(0),
        )
        self.org_count = u256(int(self.org_count) + 1)
        OrgRegisteredEvent(org_id).emit()
        return True

    def _require_org_owner_or_admin(self, org_id: str):
        sender = gl.message.sender_address
        if self._is_admin(sender):
            return
        org = self.orgs.get(org_id)
        assert org is not None, "org not found"
        assert org.owner == sender, "caller is not the org owner or an admin"

    @gl.public.write
    def deactivate_org(self, org_id: str) -> bool:
        """Deactivate an org. New policies/agents under it are rejected. Org owner or admin."""
        self._require_org_owner_or_admin(org_id)
        org = self.orgs[org_id]
        org.active = False
        self.orgs[org_id] = org
        return True

    @gl.public.write
    def reactivate_org(self, org_id: str) -> bool:
        """Reactivate a previously deactivated org. Org owner or admin."""
        self._require_org_owner_or_admin(org_id)
        org = self.orgs[org_id]
        org.active = True
        self.orgs[org_id] = org
        return True

    @gl.public.view
    def get_org(self, org_id: str) -> str:
        """Get an organization's record as JSON."""
        org = self.orgs.get(org_id)
        if org is None:
            return json.dumps({"error": "Organization not found"})
        return json.dumps({
            "org_id": org.org_id,
            "name": org.name,
            "owner": org.owner.as_hex,
            "active": org.active,
            "policy_count": int(org.policy_count),
            "agent_count": int(org.agent_count),
            "validation_count": int(org.validation_count),
        })

    # ────────────────────────────────────────
    # Policy management
    #
    # Policy rule text itself lives off-chain (Supabase) since it changes
    # more often than is worth a transaction per edit. What's recorded
    # on-chain is a hash of the active rules text, so a validation record
    # can be checked against the exact rules that were in force when it ran.
    # ────────────────────────────────────────

    @gl.public.write
    def register_policy(self, policy_id: str, org_id: str, name: str, rules_hash: str) -> bool:
        """Register a new policy under an org. Fails if policy_id already exists or org is inactive."""
        org = self.orgs.get(org_id)
        assert org is not None, "org not found"
        assert org.active, "org is not active"
        assert policy_id not in self.policies, "policy_id already registered"
        assert 0 < len(policy_id) <= MAX_ID_LENGTH, "policy_id must be 1-128 characters"
        assert len(name) <= MAX_NAME_LENGTH, "name too long"

        self.policies[policy_id] = PolicyRecord(
            policy_id=policy_id,
            org_id=org_id,
            name=name,
            version=u32(1),
            rules_hash=rules_hash,
            active=True,
            validation_count=u256(0),
        )
        org.policy_count = u256(int(org.policy_count) + 1)
        self.orgs[org_id] = org
        self.policy_count = u256(int(self.policy_count) + 1)
        PolicyRegisteredEvent(policy_id, org_id).emit()
        return True

    @gl.public.write
    def update_policy_rules(self, policy_id: str, new_rules_hash: str) -> bool:
        """Record a new rules hash for a policy and bump its version. Org owner or admin."""
        policy = self.policies.get(policy_id)
        assert policy is not None, "policy not found"
        self._require_org_owner_or_admin(policy.org_id)

        policy.rules_hash = new_rules_hash
        policy.version = u32(int(policy.version) + 1)
        self.policies[policy_id] = policy
        return True

    @gl.public.write
    def deactivate_policy(self, policy_id: str) -> bool:
        """Deactivate a policy. Validations against it are rejected. Org owner or admin."""
        policy = self.policies.get(policy_id)
        assert policy is not None, "policy not found"
        self._require_org_owner_or_admin(policy.org_id)
        policy.active = False
        self.policies[policy_id] = policy
        return True

    @gl.public.write
    def reactivate_policy(self, policy_id: str) -> bool:
        """Reactivate a previously deactivated policy. Org owner or admin."""
        policy = self.policies.get(policy_id)
        assert policy is not None, "policy not found"
        self._require_org_owner_or_admin(policy.org_id)
        policy.active = True
        self.policies[policy_id] = policy
        return True

    @gl.public.view
    def get_policy(self, policy_id: str) -> str:
        """Get a policy's record as JSON."""
        policy = self.policies.get(policy_id)
        if policy is None:
            return json.dumps({"error": "Policy not found"})
        return json.dumps({
            "policy_id": policy.policy_id,
            "org_id": policy.org_id,
            "name": policy.name,
            "version": int(policy.version),
            "rules_hash": policy.rules_hash,
            "active": policy.active,
            "validation_count": int(policy.validation_count),
        })

    # ────────────────────────────────────────
    # Agent management
    # ────────────────────────────────────────

    @gl.public.write
    def register_agent(
        self,
        agent_id: str,
        org_id: str,
        name: str,
        agent_type: str,
        can_write: bool,
        can_external_call: bool,
    ) -> bool:
        """Register a new agent under an org. Fails if agent_id already exists or org is inactive."""
        org = self.orgs.get(org_id)
        assert org is not None, "org not found"
        assert org.active, "org is not active"
        assert agent_id not in self.agents, "agent_id already registered"
        assert 0 < len(agent_id) <= MAX_ID_LENGTH, "agent_id must be 1-128 characters"
        assert len(name) <= MAX_NAME_LENGTH, "name too long"

        self.agents[agent_id] = AgentRecord(
            agent_id=agent_id,
            org_id=org_id,
            name=name,
            agent_type=agent_type,
            status=AGENT_STATUS_ACTIVE,
            can_write=can_write,
            can_external_call=can_external_call,
            registered_by=gl.message.sender_address,
        )
        org.agent_count = u256(int(org.agent_count) + 1)
        self.orgs[org_id] = org
        self.agent_count = u256(int(self.agent_count) + 1)
        AgentRegisteredEvent(agent_id, org_id).emit()
        return True

    def _set_agent_status(self, agent_id: str, status: str) -> bool:
        assert status in VALID_AGENT_STATUSES, "invalid agent status"
        agent = self.agents.get(agent_id)
        assert agent is not None, "agent not found"
        self._require_org_owner_or_admin(agent.org_id)

        agent.status = status
        self.agents[agent_id] = agent
        AgentStatusChangedEvent(agent_id, status).emit()
        return True

    @gl.public.write
    def suspend_agent(self, agent_id: str) -> bool:
        """Suspend an agent — its actions will be rejected until reinstated. Org owner or admin."""
        return self._set_agent_status(agent_id, AGENT_STATUS_SUSPENDED)

    @gl.public.write
    def revoke_agent(self, agent_id: str) -> bool:
        """Permanently revoke an agent. Org owner or admin."""
        return self._set_agent_status(agent_id, AGENT_STATUS_REVOKED)

    @gl.public.write
    def reinstate_agent(self, agent_id: str) -> bool:
        """Reinstate a suspended agent. Revoked agents cannot be reinstated. Org owner or admin."""
        agent = self.agents.get(agent_id)
        assert agent is not None, "agent not found"
        assert agent.status != AGENT_STATUS_REVOKED, "revoked agents cannot be reinstated"
        return self._set_agent_status(agent_id, AGENT_STATUS_ACTIVE)

    @gl.public.view
    def get_agent(self, agent_id: str) -> str:
        """Get an agent's record as JSON."""
        agent = self.agents.get(agent_id)
        if agent is None:
            return json.dumps({"error": "Agent not found"})
        return json.dumps({
            "agent_id": agent.agent_id,
            "org_id": agent.org_id,
            "name": agent.name,
            "agent_type": agent.agent_type,
            "status": agent.status,
            "can_write": agent.can_write,
            "can_external_call": agent.can_external_call,
            "registered_by": agent.registered_by.as_hex,
        })

    # ────────────────────────────────────────
    # Core validation
    # ────────────────────────────────────────

    def _build_leader_prompt(
        self,
        policy_name: str,
        rules_text: str,
        action_type: str,
        action_payload: str,
        context: str,
        agent_id: str,
    ) -> str:
        return f"""You are a strict AI policy compliance evaluator for the "{policy_name}" policy.

TASK: Evaluate whether the following AI agent action complies with ALL policy rules.

POLICY RULES:
{rules_text}

ACTION TO EVALUATE:
- Type: {action_type}
- Payload: {action_payload}
- Context: {context}
- Agent ID: {agent_id}

INSTRUCTIONS:
1. Check the action against EVERY enabled rule
2. For each rule, determine if the action complies or violates
3. Assign a compliance score (0-100)
4. Determine the final verdict based on violations found

SCORING GUIDE:
- 90-100: Fully compliant, no issues
- 70-89: Minor issues, conditionally approved
- 40-69: Significant violations, needs review
- 0-39: Critical violations, must be rejected

VERDICT OPTIONS:
- "approved": No violations, fully compliant (score >= 90)
- "conditional": Minor issues exist but action can proceed with caveats (score 70-89)
- "escalated": Significant issues require human review (score 40-69)
- "rejected": Critical policy violations, action must be blocked (score < 40)

You MUST respond with ONLY a valid JSON object (no markdown, no explanation outside JSON):
{{
    "verdict": "approved|conditional|escalated|rejected",
    "compliance_score": <number 0-100>,
    "risk_score": <number 0-100>,
    "reasoning": "<2-3 sentence explanation>",
    "violations": [
        {{
            "rule_name": "<name of violated rule>",
            "severity": "low|medium|high|critical",
            "description": "<what specifically violates the rule>"
        }}
    ]
}}

If no violations are found, set violations to an empty array []."""

    def _verdicts_agree(self, leader_data: dict, validator_data: dict) -> bool:
        """
        Grounded, tolerant agreement check between two independently-run
        evaluations of the same action. The verdict category is the actual
        decision being recorded on-chain, so it must match exactly. The
        numeric scores are allowed to drift within SCORE_TOLERANCE, since
        two independent LLM calls naturally produce slightly different
        numbers even when they substantively agree.
        """
        leader_verdict = self._safe_str(leader_data.get("verdict"), VERDICT_ESCALATED)
        validator_verdict = self._safe_str(validator_data.get("verdict"), VERDICT_ESCALATED)
        if leader_verdict not in VALID_VERDICTS or validator_verdict not in VALID_VERDICTS:
            return False
        if leader_verdict != validator_verdict:
            return False

        leader_score = self._safe_int(leader_data.get("compliance_score"), 50)
        validator_score = self._safe_int(validator_data.get("compliance_score"), 50)
        if abs(leader_score - validator_score) > SCORE_TOLERANCE:
            return False

        leader_risk = self._safe_int(leader_data.get("risk_score"), 50)
        validator_risk = self._safe_int(validator_data.get("risk_score"), 50)
        if abs(leader_risk - validator_risk) > SCORE_TOLERANCE:
            return False

        return True

    @gl.public.write
    def validate_action(
        self,
        request_id: str,
        agent_id: str,
        validation_data: str,
    ) -> str:
        """
        Submit an action for policy compliance validation.

        validation_data is a JSON string containing:
            - policy: Policy name
            - rules: Formatted policy rules with conditions
            - actionType: The type of action being validated
            - actionPayload: The action data to validate
            - context: Additional context (expects an "orgId" key)

        Returns a JSON string with verdict, compliance_score, risk_score,
        reasoning, and violations.
        """
        self._require_not_paused()
        assert request_id not in self.validations, "request_id already processed"

        agent = self.agents.get(agent_id)
        if agent is not None:
            assert agent.status == AGENT_STATUS_ACTIVE, f"agent is {agent.status}, cannot submit actions"

        data = json.loads(validation_data)
        policy_name = self._safe_str(data.get("policy"), "Unknown Policy")
        rules_text = self._safe_str(data.get("rules"), "")
        action_type = self._safe_str(data.get("actionType"), "unknown")
        action_payload = json.dumps(data.get("actionPayload", {}), indent=2)
        context = json.dumps(data.get("context", {}), indent=2)
        org_id = self._safe_str(data.get("context", {}).get("orgId"), "unknown")
        policy_id = self._safe_str(data.get("policyId"), "")

        leader_prompt = self._build_leader_prompt(
            policy_name, rules_text, action_type, action_payload, context, agent_id
        )

        def leader_fn():
            response = gl.nondet.exec_prompt(leader_prompt, response_format="json")
            if not isinstance(response, dict):
                return {
                    "verdict": VERDICT_ESCALATED,
                    "compliance_score": 50,
                    "risk_score": 50,
                    "reasoning": "Leader produced an unexpected response format. Escalating for human review.",
                    "violations": [],
                }
            return response

        def validator_fn(leaders_result) -> bool:
            if not isinstance(leaders_result, gl.vm.Return):
                return False
            leader_data = leaders_result.calldata
            if not isinstance(leader_data, dict):
                return False
            validator_data = leader_fn()
            return self._verdicts_agree(leader_data, validator_data)

        result = gl.vm.run_nondet(leader_fn, validator_fn)

        verdict = self._safe_str(result.get("verdict"), VERDICT_ESCALATED)
        if verdict not in VALID_VERDICTS:
            verdict = VERDICT_ESCALATED
        compliance_score = min(100, max(0, self._safe_int(result.get("compliance_score"), 50)))
        risk_score = min(100, max(0, self._safe_int(result.get("risk_score"), 50)))
        reasoning = self._safe_str(result.get("reasoning"), "No reasoning provided")[:MAX_REASON_LENGTH]

        violations_raw = result.get("violations", [])
        violations = violations_raw if isinstance(violations_raw, list) else []

        record = ValidationRecord(
            request_id=request_id,
            agent_id=agent_id,
            org_id=org_id,
            policy_id=policy_id,
            action_type=action_type,
            verdict=verdict,
            compliance_score=u32(compliance_score),
            risk_score=u32(risk_score),
            reasoning=reasoning,
            violations=json.dumps(violations),
            validator_count=u32(DEFAULT_VALIDATOR_COUNT),
        )
        self.validations[request_id] = record
        self.validation_count = u256(int(self.validation_count) + 1)

        if org_id in self.orgs:
            org = self.orgs[org_id]
            org.validation_count = u256(int(org.validation_count) + 1)
            self.orgs[org_id] = org

        current_org_count = self.org_validation_counts.get(org_id, u256(0))
        self.org_validation_counts[org_id] = u256(int(current_org_count) + 1)

        if policy_id in self.policies:
            policy = self.policies[policy_id]
            policy.validation_count = u256(int(policy.validation_count) + 1)
            self.policies[policy_id] = policy

        self._update_reputation(agent_id, verdict, compliance_score)

        if verdict == VERDICT_ESCALATED:
            self._open_escalation(request_id, org_id, reasoning)

        ValidationCompletedEvent(request_id, agent_id, verdict).emit()

        return json.dumps({
            "verdict": verdict,
            "compliance_score": compliance_score,
            "risk_score": risk_score,
            "reasoning": reasoning,
            "violations": violations,
        })

    # ────────────────────────────────────────
    # Agent reputation tracking
    # ────────────────────────────────────────

    def _update_reputation(self, agent_id: str, verdict: str, compliance_score: int):
        existing = self.agent_reputations.get(agent_id)
        if existing is not None:
            total = int(existing.total_validations) + 1
            approved = int(existing.approved_count) + (1 if verdict == VERDICT_APPROVED else 0)
            conditional = int(existing.conditional_count) + (1 if verdict == VERDICT_CONDITIONAL else 0)
            rejected = int(existing.rejected_count) + (1 if verdict == VERDICT_REJECTED else 0)
            escalated = int(existing.escalated_count) + (1 if verdict == VERDICT_ESCALATED else 0)
            cumulative = int(existing.cumulative_compliance) + compliance_score
        else:
            total = 1
            approved = 1 if verdict == VERDICT_APPROVED else 0
            conditional = 1 if verdict == VERDICT_CONDITIONAL else 0
            rejected = 1 if verdict == VERDICT_REJECTED else 0
            escalated = 1 if verdict == VERDICT_ESCALATED else 0
            cumulative = compliance_score

        self.agent_reputations[agent_id] = AgentReputation(
            total_validations=u256(total),
            approved_count=u256(approved),
            conditional_count=u256(conditional),
            rejected_count=u256(rejected),
            escalated_count=u256(escalated),
            cumulative_compliance=u256(cumulative),
        )

    # ────────────────────────────────────────
    # Escalation management
    # ────────────────────────────────────────

    def _open_escalation(self, request_id: str, org_id: str, reason: str) -> str:
        escalation_id = f"esc-{request_id}"
        self.escalations[escalation_id] = EscalationRecord(
            escalation_id=escalation_id,
            request_id=request_id,
            org_id=org_id,
            reason=reason,
            status=ESCALATION_STATUS_OPEN,
            resolution_notes="",
            resolved_by="",
        )
        self.escalation_count = u256(int(self.escalation_count) + 1)
        EscalationOpenedEvent(escalation_id, request_id).emit()
        return escalation_id

    @gl.public.write
    def resolve_escalation(self, escalation_id: str, status: str, resolution_notes: str) -> bool:
        """Resolve or dismiss an open escalation. Admin-only."""
        self._require_admin()
        assert status in (ESCALATION_STATUS_RESOLVED, ESCALATION_STATUS_DISMISSED), (
            "status must be 'resolved' or 'dismissed'"
        )
        assert len(resolution_notes) <= MAX_REASON_LENGTH, "resolution_notes too long"
        escalation = self.escalations.get(escalation_id)
        assert escalation is not None, "escalation not found"
        assert escalation.status == ESCALATION_STATUS_OPEN, "escalation is not open"

        escalation.status = status
        escalation.resolution_notes = resolution_notes
        escalation.resolved_by = gl.message.sender_address.as_hex
        self.escalations[escalation_id] = escalation

        EscalationResolvedEvent(escalation_id, status).emit()
        return True

    @gl.public.view
    def get_escalation(self, escalation_id: str) -> str:
        """Get an escalation's record as JSON."""
        escalation = self.escalations.get(escalation_id)
        if escalation is None:
            return json.dumps({"error": "Escalation not found"})
        return json.dumps({
            "escalation_id": escalation.escalation_id,
            "request_id": escalation.request_id,
            "org_id": escalation.org_id,
            "reason": escalation.reason,
            "status": escalation.status,
            "resolution_notes": escalation.resolution_notes,
            "resolved_by": escalation.resolved_by,
        })

    # ────────────────────────────────────────
    # View methods (read-only, no consensus)
    # ────────────────────────────────────────

    @gl.public.view
    def get_validation(self, request_id: str) -> str:
        """Get a specific validation record by request ID."""
        if request_id not in self.validations:
            return json.dumps({"error": "Validation not found"})

        record = self.validations[request_id]
        return json.dumps({
            "request_id": record.request_id,
            "agent_id": record.agent_id,
            "org_id": record.org_id,
            "policy_id": record.policy_id,
            "action_type": record.action_type,
            "verdict": record.verdict,
            "compliance_score": int(record.compliance_score),
            "risk_score": int(record.risk_score),
            "reasoning": record.reasoning,
            "violations": json.loads(record.violations),
            "validator_count": int(record.validator_count),
        })

    @gl.public.view
    def get_agent_reputation(self, agent_id: str) -> str:
        """Get an agent's on-chain reputation metrics."""
        rep = self.agent_reputations.get(agent_id)
        if rep is None:
            return json.dumps({
                "agent_id": agent_id,
                "total_validations": 0,
                "approved_count": 0,
                "conditional_count": 0,
                "rejected_count": 0,
                "escalated_count": 0,
                "avg_compliance_score": 0,
                "approval_rate": 0,
            })

        total = int(rep.total_validations)
        avg_score = int(rep.cumulative_compliance) / total if total > 0 else 0
        approval_rate = int(rep.approved_count) / total * 100 if total > 0 else 0

        return json.dumps({
            "agent_id": agent_id,
            "total_validations": total,
            "approved_count": int(rep.approved_count),
            "conditional_count": int(rep.conditional_count),
            "rejected_count": int(rep.rejected_count),
            "escalated_count": int(rep.escalated_count),
            "avg_compliance_score": round(avg_score, 2),
            "approval_rate": round(approval_rate, 2),
        })

    @gl.public.view
    def get_validation_count(self) -> u256:
        """Get total number of validations processed."""
        return self.validation_count

    @gl.public.view
    def get_org_validation_count(self, org_id: str) -> u256:
        """Get validation count for a specific organization."""
        return self.org_validation_counts.get(org_id, u256(0))

    @gl.public.view
    def get_owner(self) -> Address:
        """Get the contract owner address."""
        return self.owner

    @gl.public.view
    def is_paused(self) -> bool:
        """Whether validate_action is currently paused."""
        return self.paused

    @gl.public.view
    def is_admin(self, address: Address) -> bool:
        """Whether an address has admin rights (owner always does)."""
        return self._is_admin(address)

    @gl.public.view
    def get_contract_stats(self) -> str:
        """Aggregate contract-wide counters, for dashboards/health checks."""
        return json.dumps({
            "validation_count": int(self.validation_count),
            "escalation_count": int(self.escalation_count),
            "policy_count": int(self.policy_count),
            "agent_count": int(self.agent_count),
            "org_count": int(self.org_count),
            "paused": self.paused,
        })

    # ────────────────────────────────────────
    # Org-scoped listing views
    #
    # These scan the relevant TreeMap and filter by org_id/status. TreeMap
    # is a full MutableMapping here (supports iteration), so this is a
    # genuine read over current state rather than a maintained side index —
    # fine for view calls, which aren't gas-metered the way writes are.
    # ────────────────────────────────────────

    @gl.public.view
    def list_agents_by_org(self, org_id: str) -> str:
        """List all agents registered under an org, as a JSON array."""
        results = []
        for agent_id, agent in self.agents.items():
            if agent.org_id != org_id:
                continue
            results.append({
                "agent_id": agent_id,
                "name": agent.name,
                "agent_type": agent.agent_type,
                "status": agent.status,
                "can_write": agent.can_write,
                "can_external_call": agent.can_external_call,
            })
        return json.dumps(results)

    @gl.public.view
    def list_policies_by_org(self, org_id: str) -> str:
        """List all policies registered under an org, as a JSON array."""
        results = []
        for policy_id, policy in self.policies.items():
            if policy.org_id != org_id:
                continue
            results.append({
                "policy_id": policy_id,
                "name": policy.name,
                "version": int(policy.version),
                "active": policy.active,
                "validation_count": int(policy.validation_count),
            })
        return json.dumps(results)

    @gl.public.view
    def list_escalations_by_status(self, status: str) -> str:
        """List escalations matching a status ('open', 'resolved', 'dismissed'), as a JSON array."""
        assert status in VALID_ESCALATION_STATUSES, "invalid escalation status"
        results = []
        for escalation_id, escalation in self.escalations.items():
            if escalation.status != status:
                continue
            results.append({
                "escalation_id": escalation_id,
                "request_id": escalation.request_id,
                "org_id": escalation.org_id,
                "reason": escalation.reason,
            })
        return json.dumps(results)

    @gl.public.view
    def list_escalations_by_org(self, org_id: str, status: str) -> str:
        """List an org's escalations matching a status, as a JSON array."""
        assert status in VALID_ESCALATION_STATUSES, "invalid escalation status"
        results = []
        for escalation_id, escalation in self.escalations.items():
            if escalation.org_id != org_id or escalation.status != status:
                continue
            results.append({
                "escalation_id": escalation_id,
                "request_id": escalation.request_id,
                "reason": escalation.reason,
            })
        return json.dumps(results)

    @gl.public.view
    def count_agents_by_status(self, org_id: str, status: str) -> u256:
        """Count agents in an org matching a status — cheaper than listing when only a count is needed."""
        assert status in VALID_AGENT_STATUSES, "invalid agent status"
        count = 0
        for _agent_id, agent in self.agents.items():
            if agent.org_id == org_id and agent.status == status:
                count += 1
        return u256(count)

    @gl.public.view
    def get_org_health(self, org_id: str) -> str:
        """
        Single-call aggregate of an org's standing: counters plus a live
        breakdown of agent statuses and open escalations, so a dashboard
        doesn't need one round-trip per metric.
        """
        org = self.orgs.get(org_id)
        if org is None:
            return json.dumps({"error": "Organization not found"})

        active_agents = 0
        suspended_agents = 0
        revoked_agents = 0
        for _agent_id, agent in self.agents.items():
            if agent.org_id != org_id:
                continue
            if agent.status == AGENT_STATUS_ACTIVE:
                active_agents += 1
            elif agent.status == AGENT_STATUS_SUSPENDED:
                suspended_agents += 1
            elif agent.status == AGENT_STATUS_REVOKED:
                revoked_agents += 1

        active_policies = 0
        for _policy_id, policy in self.policies.items():
            if policy.org_id == org_id and policy.active:
                active_policies += 1

        open_escalations = 0
        for _escalation_id, escalation in self.escalations.items():
            if escalation.org_id == org_id and escalation.status == ESCALATION_STATUS_OPEN:
                open_escalations += 1

        return json.dumps({
            "org_id": org_id,
            "active": org.active,
            "validation_count": int(org.validation_count),
            "policy_count": int(org.policy_count),
            "active_policy_count": active_policies,
            "agent_count": int(org.agent_count),
            "active_agent_count": active_agents,
            "suspended_agent_count": suspended_agents,
            "revoked_agent_count": revoked_agents,
            "open_escalation_count": open_escalations,
        })
