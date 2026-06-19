# PolicyComplianceGate — GenLayer Intelligent Contract
# Decentralized compliance validation for AI agent actions using
# multi-validator LLM consensus via prompt_non_comparative equivalence.

from genlayer import *
from dataclasses import dataclass
import json


@allow_storage
@dataclass
class ValidationRecord:
    request_id: str
    agent_id: str
    org_id: str
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
    rejected_count: u256
    escalated_count: u256
    cumulative_compliance: u256
    # No timestamp field: this GenVM SDK version exposes no deterministic
    # block-time primitive, and a wall-clock read would diverge between
    # leader and validators during consensus replay. Supabase's created_at
    # is the source of truth for validation timing off-chain.


class PolicyComplianceGate(gl.Contract):
    owner: Address
    validation_count: u256
    validations: TreeMap[str, ValidationRecord]
    agent_reputations: TreeMap[str, AgentReputation]
    org_validation_counts: TreeMap[str, u256]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.validation_count = u256(0)

    # ────────────────────────────────────────
    # Core validation — uses prompt_non_comparative
    # ────────────────────────────────────────

    @gl.public.write
    def validate_action(
        self,
        request_id: str,
        agent_id: str,
        validation_data: str,
    ) -> str:
        """
        Submit an action for policy compliance validation.

        The leader evaluates the action against the policy rules and produces
        a structured verdict. Validators then independently check whether the
        leader's verdict is correct by evaluating the same data against the
        same rules using prompt_non_comparative (each validator checks the
        leader's answer rather than producing their own full analysis).

        Args:
            request_id: Unique ID for this validation request
            agent_id: The agent submitting the action
            validation_data: JSON string containing:
                - policy: Policy name
                - rules: Formatted policy rules with conditions
                - actionType: The type of action being validated
                - actionPayload: The action data to validate
                - context: Additional context

        Returns:
            JSON string with verdict, compliance_score, reasoning, violations
        """
        # Parse the validation data
        data = json.loads(validation_data)
        policy_name = data.get("policy", "Unknown Policy")
        rules_text = data.get("rules", "")
        action_type = data.get("actionType", "unknown")
        action_payload = json.dumps(data.get("actionPayload", {}), indent=2)
        context = json.dumps(data.get("context", {}), indent=2)

        # ── Leader evaluation ──
        # The leader performs the full compliance analysis
        leader_prompt = f"""You are a strict AI policy compliance evaluator for the "{policy_name}" policy.

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

If no violations are found, set violations to an empty array [].
"""

        # ── Validator consensus via prompt_non_comparative ──
        # The leader runs leader_fn() to produce its answer. Each validator
        # independently re-runs leader_fn() and checks the leader's answer
        # against task/criteria, rather than reproducing the full analysis.
        # eq_principle requires fn() to return a str, so the dict from the
        # JSON-mode prompt is re-serialized before being passed back.
        def leader_fn() -> str:
            return json.dumps(gl.nondet.exec_prompt(leader_prompt, response_format="json"))

        leader_result = gl.eq_principle.prompt_non_comparative(
            leader_fn,
            task=(
                "Evaluate whether an AI agent's proposed action complies with the "
                "given policy rules, and produce a structured JSON compliance verdict."
            ),
            criteria=(
                "The verdict (approved/conditional/escalated/rejected) must be "
                "consistent with the compliance_score, and every listed violation "
                "must be a genuine breach of one of the stated policy rules — no "
                "false positives or false negatives. The response must be valid "
                "JSON matching the required schema."
            ),
        )

        # ── Parse and store result ──
        try:
            result = json.loads(leader_result)
            if not isinstance(result, dict):
                raise ValueError("leader result is not a JSON object")
        except (json.JSONDecodeError, ValueError):
            # If the leader produced an unexpected response shape, fall back
            # to a safe default rather than blocking the request.
            result = {
                "verdict": "escalated",
                "compliance_score": 50,
                "risk_score": 50,
                "reasoning": "Leader produced an unexpected response format. Escalating for human review.",
                "violations": [],
            }

        verdict = result.get("verdict", "escalated")
        compliance_score = min(100, max(0, int(result.get("compliance_score", 50))))
        risk_score = min(100, max(0, int(result.get("risk_score", 50))))
        reasoning = result.get("reasoning", "No reasoning provided")
        violations = result.get("violations", [])

        # Store the validation record on-chain
        org_id = data.get("context", {}).get("orgId", "unknown")

        record = ValidationRecord(
            request_id=request_id,
            agent_id=agent_id,
            org_id=org_id,
            action_type=action_type,
            verdict=verdict,
            compliance_score=u32(compliance_score),
            risk_score=u32(risk_score),
            reasoning=reasoning,
            violations=json.dumps(violations),
            validator_count=u32(3),  # Default validator count
        )

        self.validations[request_id] = record
        self.validation_count = u256(int(self.validation_count) + 1)

        # Update org validation count
        current_org_count = self.org_validation_counts.get(org_id, u256(0))
        self.org_validation_counts[org_id] = u256(int(current_org_count) + 1)

        # Update agent reputation
        self._update_reputation(agent_id, verdict, compliance_score)

        # Return the full result
        return json.dumps(result)

    # ────────────────────────────────────────
    # Agent reputation tracking
    # ────────────────────────────────────────

    def _update_reputation(
        self,
        agent_id: str,
        verdict: str,
        compliance_score: int,
    ):
        """Update on-chain agent reputation based on validation outcome."""
        if agent_id in self.agent_reputations:
            rep = self.agent_reputations[agent_id]
            total = int(rep.total_validations) + 1
            approved = int(rep.approved_count) + (1 if verdict == "approved" else 0)
            rejected = int(rep.rejected_count) + (1 if verdict == "rejected" else 0)
            escalated = int(rep.escalated_count) + (1 if verdict == "escalated" else 0)
            cumulative = int(rep.cumulative_compliance) + compliance_score
        else:
            total = 1
            approved = 1 if verdict == "approved" else 0
            rejected = 1 if verdict == "rejected" else 0
            escalated = 1 if verdict == "escalated" else 0
            cumulative = compliance_score

        self.agent_reputations[agent_id] = AgentReputation(
            total_validations=u256(total),
            approved_count=u256(approved),
            rejected_count=u256(rejected),
            escalated_count=u256(escalated),
            cumulative_compliance=u256(cumulative),
        )

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
        if agent_id not in self.agent_reputations:
            return json.dumps({
                "agent_id": agent_id,
                "total_validations": 0,
                "approved_count": 0,
                "rejected_count": 0,
                "escalated_count": 0,
                "avg_compliance_score": 0,
                "approval_rate": 0,
            })

        rep = self.agent_reputations[agent_id]
        total = int(rep.total_validations)
        avg_score = int(rep.cumulative_compliance) / total if total > 0 else 0
        approval_rate = int(rep.approved_count) / total * 100 if total > 0 else 0

        return json.dumps({
            "agent_id": agent_id,
            "total_validations": total,
            "approved_count": int(rep.approved_count),
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
