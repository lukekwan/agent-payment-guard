from __future__ import annotations

from datetime import datetime, timezone
import re
from typing import Any


DEFAULT_POLICY: dict[str, Any] = {
    "policy_version": "signgate-agentic-commerce-policy-2026-07-15",
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
    "agentic_commerce": {
        "supported_mandate_types": ["intent", "checkout", "payment"],
        "signer_required_categories": ["payment_execution"],
        "default_signer_directive": {
            "required": False,
            "mode": "none",
            "agent_may_directly_sign": False,
            "execution_may_be_agent_initiated": True,
            "signer_isolation_required": False,
            "required_signer": {"mode": "none", "allowed_classes": []},
        },
        "payment_signer_directive": {
            "required": True,
            "mode": "human_fido2_or_controlled_signer",
            "agent_may_directly_sign": False,
            "execution_may_be_agent_initiated": True,
            "signer_isolation_required": True,
            "required_signer": {
                "mode": "out_of_agent",
                "allowed_classes": [
                    "human_fido2",
                    "hsm",
                    "kms",
                    "custody",
                    "smart_account_module",
                ],
            },
            "reason_code": "PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER",
        },
    },
}

_PRIORITY = {"ALLOW": 1, "APPROVAL_REQUIRED": 2, "REQUIRE_APPROVAL": 2, "DENY": 3}


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


def _public_decision(value: str) -> str:
    return "REQUIRE_APPROVAL" if value == "APPROVAL_REQUIRED" else value


def _domain(value: Any) -> str:
    raw = str(value or "").strip().lower()
    raw = re.sub(r"^https?://", "", raw)
    return raw.split("/", 1)[0]


def _address(value: Any) -> str:
    return str(value or "").strip().lower()


def _contains_normalized(values: list[Any] | None, value: Any) -> bool:
    return _normalize(value) in {_normalize(item) for item in values or []}


def _contains_domain(values: list[Any] | None, value: Any) -> bool:
    return _domain(value) in {_domain(item) for item in values or []}


def _contains_address(values: list[Any] | None, value: Any) -> bool:
    return _address(value) in {_address(item) for item in values or []}


def _timestamp(value: Any) -> float | None:
    if not value:
        return None
    try:
        normalized = str(value).replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).timestamp()
    except ValueError:
        return None


def _push_unique(values: list[str], value: str | None) -> None:
    if value and value not in values:
        values.append(value)


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


def evaluate_agentic_commerce_preflight(
    input_data: dict[str, Any],
    policy: dict[str, Any] | None = None,
) -> dict[str, Any]:
    policy = policy or DEFAULT_POLICY
    mandate = input_data.get("mandate")
    merchant = input_data.get("merchant") or {}
    payment = input_data.get("payment") or {}
    evaluated_at = input_data.get("evaluated_at") or datetime.now(timezone.utc).isoformat()
    expires_at = input_data.get("expires_at") or datetime.fromtimestamp(
        (_timestamp(evaluated_at) or datetime.now(timezone.utc).timestamp()) + 300,
        timezone.utc,
    ).isoformat()
    now_ts = _timestamp(evaluated_at) or datetime.now(timezone.utc).timestamp()
    agent_role = _normalize(input_data.get("agent_role") or (mandate or {}).get("agent_role"))
    product_category = _normalize(
        input_data.get("product_category") or payment.get("product_category")
    )
    amount_usdc = _amount(
        input_data.get("amount_usdc")
        or payment.get("amount_usdc")
        or input_data.get("price_usdc")
    )
    asset = _normalize(input_data.get("asset") or payment.get("asset") or "USDC").upper()
    chain = _normalize(input_data.get("chain") or payment.get("chain") or "base")
    merchant_domain = _domain(
        input_data.get("merchant_domain")
        or payment.get("merchant_domain")
        or merchant.get("domain")
    )
    merchant_wallet = _address(
        input_data.get("merchant_wallet")
        or payment.get("merchant_wallet")
        or merchant.get("wallet")
    )
    buyer_id = str(input_data.get("buyer_id") or (mandate or {}).get("buyer_id") or "").strip()
    agent_id = str(input_data.get("agent_id") or (mandate or {}).get("agent_id") or "").strip()

    buyer_result = evaluate_agent_buyer_preflight(
        {
            **input_data,
            "agent_id": agent_id or input_data.get("agent_id"),
            "agent_role": agent_role,
            "product_category": product_category,
            "price_usdc": amount_usdc,
        },
        policy,
    )
    decision = _public_decision(buyer_result["decision"])
    reason_codes = list(buyer_result["reason_codes"])
    flags = list(buyer_result.get("flags", []))

    if not mandate:
        decision = _stronger(decision, "DENY")
        _push_unique(reason_codes, "MANDATE_MISSING")
        _push_unique(flags, "mandate_missing")
    else:
        mandate_type = _normalize(mandate.get("type", "intent"))
        mandate_status = _normalize(mandate.get("status", "active"))
        expires_at = _timestamp(mandate.get("expires_at"))
        commerce_policy = policy.get("agentic_commerce", {})

        if not _contains_normalized(commerce_policy.get("supported_mandate_types"), mandate_type):
            decision = _stronger(decision, "DENY")
            _push_unique(reason_codes, "MANDATE_TYPE_UNSUPPORTED")
        if mandate_status not in {"active", "enabled"}:
            decision = _stronger(decision, "DENY")
            _push_unique(reason_codes, "MANDATE_INACTIVE")
        if expires_at is not None and expires_at < now_ts:
            decision = _stronger(decision, "DENY")
            _push_unique(reason_codes, "MANDATE_EXPIRED")
        if mandate.get("buyer_id") and buyer_id and str(mandate["buyer_id"]).strip() != buyer_id:
            decision = _stronger(decision, "DENY")
            _push_unique(reason_codes, "MANDATE_BUYER_MISMATCH")
        if mandate.get("agent_id") and agent_id and str(mandate["agent_id"]).strip() != agent_id:
            decision = _stronger(decision, "DENY")
            _push_unique(reason_codes, "MANDATE_AGENT_MISMATCH")
        if mandate.get("agent_role") and _normalize(mandate["agent_role"]) != agent_role:
            decision = _stronger(decision, "DENY")
            _push_unique(reason_codes, "MANDATE_ROLE_MISMATCH")
        if isinstance(mandate.get("merchant_domains"), list) and not _contains_domain(
            mandate["merchant_domains"], merchant_domain
        ):
            decision = _stronger(decision, "DENY")
            _push_unique(reason_codes, "MANDATE_MERCHANT_DOMAIN_MISMATCH")
        if isinstance(mandate.get("merchant_wallets"), list) and not _contains_address(
            mandate["merchant_wallets"], merchant_wallet
        ):
            decision = _stronger(decision, "DENY")
            _push_unique(reason_codes, "MANDATE_MERCHANT_WALLET_MISMATCH")
        if isinstance(mandate.get("allowed_categories"), list) and not _contains_normalized(
            mandate["allowed_categories"], product_category
        ):
            decision = _stronger(decision, "DENY")
            _push_unique(reason_codes, "MANDATE_CATEGORY_MISMATCH")
        if _amount(mandate.get("max_amount_usdc")) > 0 and amount_usdc > _amount(
            mandate.get("max_amount_usdc")
        ):
            decision = _stronger(decision, "DENY")
            _push_unique(reason_codes, "MANDATE_AMOUNT_EXCEEDED")
        if isinstance(mandate.get("assets"), list) and not _contains_normalized(
            mandate["assets"], asset
        ):
            decision = _stronger(decision, "DENY")
            _push_unique(reason_codes, "MANDATE_ASSET_MISMATCH")
        if isinstance(mandate.get("chains"), list) and not _contains_normalized(
            mandate["chains"], chain
        ):
            decision = _stronger(decision, "DENY")
            _push_unique(reason_codes, "MANDATE_CHAIN_MISMATCH")

    if not merchant_domain:
        decision = _stronger(decision, "REQUIRE_APPROVAL")
        _push_unique(reason_codes, "MERCHANT_DOMAIN_MISSING")
    if not merchant_wallet:
        decision = _stronger(decision, "REQUIRE_APPROVAL")
        _push_unique(reason_codes, "MERCHANT_WALLET_MISSING")
    if merchant.get("expected_wallet") and _address(merchant["expected_wallet"]) != merchant_wallet:
        decision = _stronger(decision, "DENY")
        _push_unique(reason_codes, "MERCHANT_WALLET_MISMATCH")
    if merchant.get("openapi_domain") and _domain(merchant["openapi_domain"]) != merchant_domain:
        decision = _stronger(decision, "REQUIRE_APPROVAL")
        _push_unique(reason_codes, "MERCHANT_OPENAPI_DOMAIN_MISMATCH")
    if merchant.get("agent_card_domain") and _domain(merchant["agent_card_domain"]) != merchant_domain:
        decision = _stronger(decision, "REQUIRE_APPROVAL")
        _push_unique(reason_codes, "MERCHANT_AGENT_CARD_DOMAIN_MISMATCH")
    if merchant.get("category") and _normalize(merchant["category"]) != product_category:
        decision = _stronger(decision, "REQUIRE_APPROVAL")
        _push_unique(reason_codes, "MERCHANT_CATEGORY_MISMATCH")

    kyt_risk = _normalize(merchant.get("kyt_risk") or input_data.get("kyt_risk") or "unknown")
    if kyt_risk == "high":
        decision = _stronger(decision, "DENY")
        _push_unique(reason_codes, "MERCHANT_KYT_HIGH_RISK")
        _push_unique(flags, "high_kyt_risk")
    elif kyt_risk == "medium":
        decision = _stronger(decision, "REQUIRE_APPROVAL")
        _push_unique(reason_codes, "MERCHANT_KYT_MEDIUM_RISK")
        _push_unique(flags, "medium_kyt_risk")

    commerce_policy = policy.get("agentic_commerce", {})
    signer_required = _contains_normalized(
        commerce_policy.get("signer_required_categories"), product_category
    )
    signer_directive = dict(
        commerce_policy.get(
            "payment_signer_directive" if signer_required else "default_signer_directive",
            {},
        )
    )
    if signer_required:
        decision = _stronger(decision, "REQUIRE_APPROVAL")
        _push_unique(reason_codes, signer_directive.get("reason_code"))
        _push_unique(flags, "out_of_agent_signer_required")

    return {
        "schema_version": "agentic_commerce_preflight_result.v1",
        "response_kind": "decision_response",
        "evaluator_version": "signgate-agentic-commerce-evaluator.0.1.0",
        "policy_version": policy.get("policy_version"),
        "evaluated_at": evaluated_at,
        "expires_at": expires_at,
        "decision": decision,
        "reason_codes": reason_codes,
        "buyer_preflight": {
            "decision": buyer_result["decision"],
            "reason_codes": buyer_result["reason_codes"],
            "role_product_fit": buyer_result["role_product_fit"],
        },
        "mandate_preflight": {
            "present": bool(mandate),
            "mandate_id": (mandate or {}).get("id"),
            "mandate_type": _normalize((mandate or {}).get("type")) or None,
        },
        "merchant_trust": {
            "domain": merchant_domain or None,
            "wallet": merchant_wallet or None,
            "category": _normalize(merchant.get("category")) or None,
            "kyt_risk": kyt_risk,
        },
        "signer_directive": signer_directive,
        "decision_artifact": {
            "issued": False,
            "status": "not_cryptographically_signed",
            "note": (
                "Decision Artifact is a future signed object with request, "
                "policy, mandate, and evidence digests."
            ),
        },
        "audit_required": True,
        "input": {
            "buyer_id": buyer_id or None,
            "agent_id": agent_id or None,
            "agent_role": agent_role,
            "product_category": product_category,
            "amount_usdc": amount_usdc,
            "asset": asset,
            "chain": chain,
            "merchant_domain": merchant_domain or None,
            "merchant_wallet": merchant_wallet or None,
        },
        "flags": flags,
        "recommended_next_action": (
            "proceed_to_payment_or_checkout"
            if decision == "ALLOW"
            else "block_agentic_commerce_action"
            if decision == "DENY"
            else "request_owner_policy_or_signer_approval"
        ),
    }
