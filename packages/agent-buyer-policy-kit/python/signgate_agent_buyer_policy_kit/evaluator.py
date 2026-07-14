from __future__ import annotations

from datetime import datetime, timezone
import re
from typing import Any


DEFAULT_POLICY: dict[str, Any] = {
    "policy_version": "signgate-agent-buyer-policy-2026-07-14",
    "default_decision": "APPROVAL_REQUIRED",
    "roles": {
        "research_agent": {
            "description": "Security, protocol, market, and technical research agent.",
            "default_spend_limit_usdc": 1,
            "allowed_categories": [
                "wallet_risk",
                "token_risk",
                "market_intelligence",
                "chain_data",
                "api_security",
                "protocol_research",
            ],
            "approval_required_categories": [
                "invoice_verification",
                "payment_execution",
                "production_deploy",
            ],
            "denied_categories": ["payroll", "customer_pii"],
        },
        "writer_agent": {
            "description": "Content, documentation, and public writing agent.",
            "default_spend_limit_usdc": 0.1,
            "allowed_categories": ["content_research", "public_docs", "market_summary"],
            "approval_required_categories": [
                "wallet_risk",
                "token_risk",
                "market_intelligence",
            ],
            "denied_categories": [
                "payment_execution",
                "production_deploy",
                "invoice_verification",
                "customer_pii",
            ],
        },
        "accounting_agent": {
            "description": "Invoice, reconciliation, vendor, and bookkeeping agent.",
            "default_spend_limit_usdc": 0.5,
            "allowed_categories": [
                "invoice_verification",
                "receipt_reconciliation",
                "vendor_due_diligence",
            ],
            "approval_required_categories": ["wallet_risk", "payment_execution"],
            "denied_categories": [
                "market_intelligence",
                "token_risk",
                "trading_alpha",
                "production_deploy",
            ],
        },
        "finance_agent": {
            "description": "Treasury, settlement, payment review, and financial risk agent.",
            "default_spend_limit_usdc": 1,
            "allowed_categories": [
                "invoice_verification",
                "receipt_reconciliation",
                "treasury_risk",
                "vendor_due_diligence",
            ],
            "approval_required_categories": [
                "payment_execution",
                "wallet_risk",
                "market_intelligence",
            ],
            "denied_categories": ["production_deploy", "code_execution"],
        },
        "operator_agent": {
            "description": "Runtime, API, deployment-prep, and service reliability agent.",
            "default_spend_limit_usdc": 0.25,
            "allowed_categories": [
                "service_monitoring",
                "api_security",
                "domain_trust",
                "openapi_preflight",
                "github_health",
            ],
            "approval_required_categories": [
                "production_deploy",
                "payment_execution",
                "wallet_risk",
            ],
            "denied_categories": ["payroll", "customer_pii"],
        },
    },
}

_PRIORITY = {"ALLOW": 1, "APPROVAL_REQUIRED": 2, "DENY": 3}


def _normalize(value: Any) -> str:
    token = re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower())
    return token.strip("_")


def _amount(value: Any) -> float:
    try:
        parsed = float(value or 0)
    except (TypeError, ValueError):
        return 0.0
    return parsed if parsed >= 0 else 0.0


def _has(values: list[str] | None, category: str) -> bool:
    return category in {_normalize(value) for value in values or []}


def _stronger(current: str, candidate: str) -> str:
    return candidate if _PRIORITY[candidate] > _PRIORITY[current] else current


def evaluate_agent_buyer_preflight(
    input_data: dict[str, Any],
    policy: dict[str, Any] | None = None,
) -> dict[str, Any]:
    policy = policy or DEFAULT_POLICY
    roles = policy.get("roles", {})
    agent_role = _normalize(input_data.get("agent_role"))
    product_category = _normalize(input_data.get("product_category"))
    data_sensitivity = _normalize(input_data.get("data_sensitivity", "medium"))
    price_usdc = _amount(input_data.get("price_usdc"))
    agent_status = _normalize(input_data.get("agent_status", "active"))
    approval_ref = str(input_data.get("approval_ref") or "").strip()
    role_policy = roles.get(agent_role)
    decision = policy.get("default_decision", "APPROVAL_REQUIRED")
    reason_codes: list[str] = []
    flags: list[str] = []
    role_product_fit = "unknown"

    if not role_policy:
        decision = "DENY"
        reason_codes.append("UNKNOWN_AGENT_ROLE")
        role_product_fit = "unknown_role"
    elif agent_status not in {"active", "enabled"}:
        decision = "DENY"
        reason_codes.append("INACTIVE_AGENT")
        role_product_fit = "inactive_agent"
    elif _has(role_policy.get("denied_categories"), product_category):
        decision = "DENY"
        reason_codes.append("ROLE_PRODUCT_CATEGORY_DENIED")
        role_product_fit = "mismatch"
    elif _has(role_policy.get("allowed_categories"), product_category):
        decision = "ALLOW"
        reason_codes.append("ROLE_PRODUCT_CATEGORY_ALLOWED")
        role_product_fit = "fit"
    elif _has(role_policy.get("approval_required_categories"), product_category):
        decision = "APPROVAL_REQUIRED"
        reason_codes.append("ROLE_PRODUCT_CATEGORY_APPROVAL_REQUIRED")
        role_product_fit = "approval_gated"
    else:
        decision = "APPROVAL_REQUIRED"
        reason_codes.append("ROLE_PRODUCT_CATEGORY_APPROVAL_REQUIRED")
        role_product_fit = "unclassified_category"

    if role_policy and data_sensitivity == "restricted":
        decision = _stronger(decision, "DENY")
        reason_codes.append("RESTRICTED_DATA_SENSITIVITY")
        flags.append("restricted_data")
    elif role_policy and data_sensitivity in {"high", "sensitive"}:
        decision = _stronger(decision, "APPROVAL_REQUIRED")
        reason_codes.append("HIGH_DATA_SENSITIVITY")
        flags.append("high_data_sensitivity")

    if role_policy and product_category == "payment_execution":
        decision = _stronger(decision, "APPROVAL_REQUIRED")
        reason_codes.append("PAYMENT_EXECUTION_REQUIRES_APPROVAL")
        flags.append("payment_execution")

    spend_limit = _amount((role_policy or {}).get("default_spend_limit_usdc"))
    if role_policy and spend_limit > 0 and price_usdc > spend_limit:
        decision = _stronger(decision, "APPROVAL_REQUIRED")
        reason_codes.append("PRICE_EXCEEDS_ROLE_LIMIT")
        flags.append("price_over_role_limit")

    if approval_ref:
        reason_codes.append("APPROVAL_REFERENCE_PRESENT")
        flags.append("approval_reference_present")

    return {
        "schema_version": "agent_buyer_preflight_result.v1",
        "policy_version": policy.get("policy_version"),
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "decision": decision,
        "reason_codes": list(dict.fromkeys(reason_codes)),
        "role_product_fit": role_product_fit,
        "audit_required": True,
        "input": {
            "agent_role": agent_role,
            "product_category": product_category,
            "purpose": str(input_data.get("purpose") or "unspecified").strip(),
            "price_usdc": price_usdc,
            "data_sensitivity": data_sensitivity,
            "agent_status": agent_status,
            "approval_ref": approval_ref or None,
        },
        "flags": flags,
        "recommended_next_action": (
            "proceed_to_x402_payment"
            if decision == "ALLOW"
            else "request_owner_or_policy_controller_approval"
            if decision == "APPROVAL_REQUIRED"
            else "do_not_purchase"
        ),
    }
