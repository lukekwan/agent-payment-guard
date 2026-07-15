import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateAgenticCommercePreflight,
  evaluateAgentBuyerPreflight,
  buildSumsubEvidenceManifest,
  listAgentBuyerRoles,
  listProductCategories,
  listSumsubEvidenceServices,
} from "../src/index.js";

test("starter policy defines five buyer roles", () => {
  assert.deepEqual(
    listAgentBuyerRoles().map((role) => role.id),
    [
      "research_agent",
      "writer_agent",
      "accounting_agent",
      "finance_agent",
      "operator_agent",
    ],
  );
});

test("starter policy exposes product categories", () => {
  const ids = listProductCategories().map((category) => category.id);
  assert.ok(ids.includes("wallet_risk"));
  assert.ok(ids.includes("invoice_verification"));
  assert.ok(ids.includes("payment_execution"));
  assert.ok(ids.includes("api_security"));
});

test("role and product category fit returns expected decisions", () => {
  assert.equal(
    evaluateAgentBuyerPreflight({
      agent_role: "research_agent",
      product_category: "wallet_risk",
      purpose: "security_research",
      price_usdc: "0.005",
    }).decision,
    "ALLOW",
  );

  assert.equal(
    evaluateAgentBuyerPreflight({
      agent_role: "writer_agent",
      product_category: "wallet_risk",
      purpose: "blog_draft",
      price_usdc: "0.005",
    }).decision,
    "APPROVAL_REQUIRED",
  );

  assert.equal(
    evaluateAgentBuyerPreflight({
      agent_role: "accounting_agent",
      product_category: "market_intelligence",
      purpose: "vendor_review",
      price_usdc: "0.005",
    }).decision,
    "DENY",
  );

  assert.equal(
    evaluateAgentBuyerPreflight({
      agent_role: "accounting_agent",
      product_category: "invoice_verification",
      purpose: "payables_check",
      price_usdc: "0.005",
    }).decision,
    "ALLOW",
  );

  assert.equal(
    evaluateAgentBuyerPreflight({
      agent_role: "finance_agent",
      product_category: "payment_execution",
      purpose: "settlement",
      price_usdc: "0.005",
      data_sensitivity: "high",
    }).decision,
    "APPROVAL_REQUIRED",
  );

  assert.equal(
    evaluateAgentBuyerPreflight({
      agent_role: "operator_agent",
      product_category: "api_security",
      purpose: "endpoint_preflight",
      price_usdc: "0.005",
    }).decision,
    "ALLOW",
  );
});

test("unknown, inactive, restricted, and over-limit buyers are controlled", () => {
  assert.equal(
    evaluateAgentBuyerPreflight({
      agent_role: "unknown_agent",
      product_category: "wallet_risk",
    }).decision,
    "DENY",
  );

  assert.equal(
    evaluateAgentBuyerPreflight({
      agent_role: "research_agent",
      agent_status: "disabled",
      product_category: "wallet_risk",
    }).decision,
    "DENY",
  );

  assert.equal(
    evaluateAgentBuyerPreflight({
      agent_role: "research_agent",
      product_category: "wallet_risk",
      data_sensitivity: "restricted",
    }).decision,
    "DENY",
  );

  const overLimit = evaluateAgentBuyerPreflight({
    agent_role: "operator_agent",
    product_category: "api_security",
    price_usdc: "2.00",
  });
  assert.equal(overLimit.decision, "APPROVAL_REQUIRED");
  assert.ok(overLimit.reason_codes.includes("PRICE_EXCEEDS_ROLE_LIMIT"));
});

const baseCommerceInput = {
  evaluated_at: "2026-07-15T00:00:00.000Z",
  buyer_id: "buyer.acme",
  agent_id: "agent.finance.001",
  agent_role: "finance_agent",
  product_category: "invoice_verification",
  amount_usdc: "0.25",
  asset: "USDC",
  chain: "base",
  merchant_domain: "pay.vendor.example",
  merchant_wallet: "0xabc0000000000000000000000000000000000001",
  mandate: {
    id: "mandate-001",
    type: "checkout",
    status: "active",
    buyer_id: "buyer.acme",
    agent_id: "agent.finance.001",
    agent_role: "finance_agent",
    merchant_domains: ["pay.vendor.example"],
    merchant_wallets: ["0xabc0000000000000000000000000000000000001"],
    allowed_categories: ["invoice_verification"],
    max_amount_usdc: "1.00",
    assets: ["USDC"],
    chains: ["base"],
    expires_at: "2099-01-01T00:00:00.000Z",
  },
  merchant: {
    domain: "pay.vendor.example",
    wallet: "0xabc0000000000000000000000000000000000001",
    expected_wallet: "0xabc0000000000000000000000000000000000001",
    openapi_domain: "pay.vendor.example",
    agent_card_domain: "pay.vendor.example",
    category: "invoice_verification",
    kyt_risk: "low",
  },
};

test("agentic commerce preflight allows a scoped checkout mandate", () => {
  const result = evaluateAgenticCommercePreflight(baseCommerceInput);

  assert.equal(result.schema_version, "agentic_commerce_preflight_result.v1");
  assert.equal(result.response_kind, "decision_response");
  assert.equal(result.decision, "ALLOW");
  assert.equal(result.signer_directive.required, false);
  assert.equal(result.signer_directive.agent_may_directly_sign, false);
  assert.equal(result.signer_directive.execution_may_be_agent_initiated, true);
  assert.equal(result.decision_artifact.issued, false);
  assert.deepEqual(result.reason_codes, ["ROLE_PRODUCT_CATEGORY_ALLOWED"]);
});

test("agentic commerce preflight denies missing mandate", () => {
  const result = evaluateAgenticCommercePreflight({
    ...baseCommerceInput,
    mandate: null,
  });

  assert.equal(result.decision, "DENY");
  assert.ok(result.reason_codes.includes("MANDATE_MISSING"));
});

test("agentic commerce preflight denies mandate role mismatch", () => {
  const result = evaluateAgenticCommercePreflight({
    ...baseCommerceInput,
    mandate: {
      ...baseCommerceInput.mandate,
      agent_role: "research_agent",
    },
  });

  assert.equal(result.decision, "DENY");
  assert.ok(result.reason_codes.includes("MANDATE_ROLE_MISMATCH"));
});

test("agentic commerce preflight denies merchant wallet mismatch", () => {
  const result = evaluateAgenticCommercePreflight({
    ...baseCommerceInput,
    merchant: {
      ...baseCommerceInput.merchant,
      expected_wallet: "0xdef0000000000000000000000000000000000002",
    },
  });

  assert.equal(result.decision, "DENY");
  assert.ok(result.reason_codes.includes("MERCHANT_WALLET_MISMATCH"));
});

test("agentic commerce payment execution requires out-of-agent signer", () => {
  const result = evaluateAgenticCommercePreflight({
    ...baseCommerceInput,
    product_category: "payment_execution",
    mandate: {
      ...baseCommerceInput.mandate,
      type: "payment",
      allowed_categories: ["payment_execution"],
    },
    merchant: {
      ...baseCommerceInput.merchant,
      category: "payment_execution",
    },
  });

  assert.equal(result.decision, "REQUIRE_APPROVAL");
  assert.equal(result.signer_directive.required, true);
  assert.equal(result.signer_directive.agent_may_directly_sign, false);
  assert.equal(result.signer_directive.execution_may_be_agent_initiated, true);
  assert.deepEqual(result.signer_directive.required_signer.allowed_classes, [
    "human_fido2",
    "hsm",
    "kms",
    "custody",
    "smart_account_module",
  ]);
  assert.ok(
    result.reason_codes.includes("PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER"),
  );
});

const sumsubAllowedChecksFixture = {
  allowedChecks: {
    CASE_MANAGEMENT: "Case Management",
    DB_NET: "Database network verification",
    KYT: "Know Your Transaction",
    PAYMENT_METHOD_CRYPTO: "Crypto payment method check",
    POA: "Proof of Address",
    TM_CRYPTO_RISK_SCORING_CRYSTAL: "Crystal crypto risk scoring",
    TRAVEL_RULE: "Travel Rule compliance",
    WATCHLISTS: "AML Screening",
  },
};

test("Sumsub evidence catalog productizes eight sandbox capabilities", () => {
  const services = listSumsubEvidenceServices();

  assert.equal(services.length, 8);
  assert.deepEqual(
    services.map((service) => service.id),
    [
      "sumsub.case_management",
      "sumsub.db_net",
      "sumsub.kyt",
      "sumsub.payment_method_crypto",
      "sumsub.poa",
      "sumsub.crystal_crypto_risk",
      "sumsub.travel_rule",
      "sumsub.watchlists",
    ],
  );

  for (const service of services) {
    assert.equal(service.status, "productized_sandbox_v0");
    assert.ok(service.entitlement);
    assert.ok(service.normalized_output.endsWith("_evidence.v0"));
    assert.ok(service.pricing_tier);
    assert.ok(service.demo_mode);
    assert.equal(service.fail_closed_on_error, true);
  }
});

test("Sumsub evidence manifest maps enabled entitlements to service states", () => {
  const manifest = buildSumsubEvidenceManifest({
    ...sumsubAllowedChecksFixture,
    evaluated_at: "2026-07-15T15:30:00.000Z",
  });

  assert.equal(manifest.schema_version, "sumsub_evidence_service_catalog.v0");
  assert.equal(manifest.environment, "sandbox");
  assert.equal(manifest.service_count, 8);
  assert.equal(manifest.enabled_service_count, 8);
  assert.equal(manifest.disabled_service_count, 0);
  assert.equal(manifest.signgate_mapping.evidence_digest_ready, true);
  assert.equal(manifest.signgate_mapping.decision_artifact_ready, false);

  for (const service of manifest.services) {
    assert.equal(service.enabled, true);
    assert.equal(service.demo.creates_real_applicant, false);
    assert.equal(service.demo.moves_money, false);
    assert.equal(service.demo.production_signing, false);
    assert.equal(service.error_model.unavailable, "SUMSUB_SERVICE_NOT_ENABLED");
  }
});

test("Sumsub evidence manifest fails closed for missing entitlements", () => {
  const manifest = buildSumsubEvidenceManifest({
    allowedChecks: {
      KYT: "Know Your Transaction",
      WATCHLISTS: "AML Screening",
    },
  });

  assert.equal(manifest.service_count, 8);
  assert.equal(manifest.enabled_service_count, 2);
  assert.equal(manifest.disabled_service_count, 6);
  assert.equal(
    manifest.services.find((service) => service.id === "sumsub.kyt").enabled,
    true,
  );
  assert.equal(
    manifest.services.find((service) => service.id === "sumsub.travel_rule").enabled,
    false,
  );
});
