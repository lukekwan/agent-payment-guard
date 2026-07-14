import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateAgentBuyerPreflight,
  listAgentBuyerRoles,
  listProductCategories,
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
