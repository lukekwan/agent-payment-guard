import test from "node:test";
import assert from "node:assert/strict";

import worker, {
  buildApprovalRisk,
  buildAddressPreflight,
  buildAlphaRiskContext,
  buildTokenAlphaSnapshot,
  buildA2aAgentCardPreflight,
  buildContractVerification,
  buildDexMarketMonitor,
  buildDomainTrustPreflight,
  buildEventLogMonitor,
  buildGasFeeQuote,
  buildGithubRepositoryHealth,
  buildMerchantTrust,
  buildNpmPackagePreflight,
  buildNonceReadiness,
  buildOpenApiSpecPreflight,
  buildPaymentGuardDecision,
  buildPaymentProof,
  buildPredictionMarketSnapshot,
  buildPypiPackagePreflight,
  buildNewPoolRisk,
  buildAgentBuyerIdentityPreflight,
  buildAgenticCommercePreflight,
  buildAgentSpendRoutePlan,
  buildSumsubEvidenceServiceResponse,
  sampleAgenticCommercePreflightInput,
  buildAgentPaymentAuthorization,
  buildAgentCapabilitySecurityPreflight,
  buildStablecoinBalance,
  buildTokenPreflight,
  buildTokenExitRisk,
  buildTransactionIntent,
  buildVerifiableIntent,
  buildUsdcReceipt,
  buildWalletCopytradeRisk,
  buildWalletActivityDelta,
  buildWalletCounterparty,
  bcsGatewayRequest,
  shouldRecordX402PurchaseEvent,
  buildX402OriginDueDiligence,
  buildX402ResourceCompare,
  buildX402ServerTrust,
  buildX402EndpointPreflight,
  buildFeedSnapshot,
  signPaymentGuardDecision,
  simulateBaseTransaction,
  urlChangeFingerprint,
  validatePublicUrl,
  verifyPaymentGuardDecision,
} from "../src/index.js";

test("buildAddressPreflight flags an unverified contract", () => {
  const result = buildAddressPreflight({
    address: "0x1111111111111111111111111111111111111111",
    profile: {
      hash: "0x1111111111111111111111111111111111111111",
      is_contract: true,
      is_verified: false,
      is_scam: false,
      reputation: "ok",
      implementations: [],
      proxy_type: null,
    },
    counters: {
      transactions_count: "3",
      token_transfers_count: "2",
      gas_usage_count: "3",
    },
    transfers: { items: [] },
    fetchedAt: "2026-06-21T00:00:00.000Z",
  });

  assert.equal(result.product, "base-address-preflight");
  assert.equal(result.identity.type, "contract");
  assert.equal(result.assessment.risk_level, "medium");
  assert.equal(result.assessment.risk_score, 20);
  assert.equal(result.assessment.flags[0].code, "UNVERIFIED_CONTRACT");
});

test("buildAddressPreflight elevates scam metadata", () => {
  const result = buildAddressPreflight({
    address: "0x2222222222222222222222222222222222222222",
    profile: {
      hash: "0x2222222222222222222222222222222222222222",
      is_contract: false,
      is_verified: false,
      is_scam: true,
      reputation: "scam",
      implementations: [],
      proxy_type: null,
    },
    counters: {
      transactions_count: "10",
      token_transfers_count: "10",
      gas_usage_count: "2",
    },
    transfers: { items: [] },
  });

  assert.equal(result.assessment.risk_level, "high");
  assert.equal(result.assessment.risk_score, 100);
});

test("worker exposes discovery documents", async () => {
  const health = await worker.fetch(new Request("https://example.test/health"));
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const openapi = await worker.fetch(
    new Request("https://example.test/openapi.json"),
  );
  const document = await openapi.json();
  assert.ok(document.paths["/v1/x402/base/address-preflight"]);
  assert.ok(document.paths["/v1/x402/base/token-preflight"]);
  assert.ok(document.paths["/v1/x402/base/merchant-trust"]);
  assert.ok(document.paths["/v1/x402/base/payment-proof"]);
  assert.ok(document.paths["/v1/x402/base/wallet-activity-delta"]);
  assert.ok(document.paths["/v1/x402/base/approval-risk"]);
  assert.ok(document.paths["/v1/x402/base/contract-verification"]);
  assert.ok(document.paths["/v1/x402/base/usdc-receipt"]);
  assert.ok(document.paths["/v1/x402/base/wallet-counterparty"]);
  assert.ok(document.paths["/v1/x402/base/event-log-monitor"]);
  assert.ok(document.paths["/v1/x402/base/gas-fee-quote"]);
  assert.ok(document.paths["/v1/x402/base/nonce-readiness"]);
  assert.ok(document.paths["/v1/x402/base/stablecoin-balance"]);
  assert.ok(document.paths["/v1/x402/base/dex-market-monitor"]);
  assert.ok(document.paths["/v1/x402/prediction/market-snapshot"]);
  assert.ok(document.paths["/v1/x402/web/endpoint-preflight"]);
  assert.ok(document.paths["/v1/x402/software/npm-package-preflight"]);
  assert.ok(document.paths["/v1/x402/software/github-repository-health"]);
  assert.ok(document.paths["/v1/x402/web/url-change-fingerprint"]);
  assert.ok(document.paths["/v1/x402/web/feed-snapshot"]);
  assert.ok(document.paths["/v1/x402/base/transaction-intent"]);
  assert.ok(document.paths["/v1/x402/agent/a2a-card-preflight"]);
  assert.ok(document.paths["/v1/x402/web/openapi-preflight"]);
  assert.ok(document.paths["/v1/x402/web/domain-trust-preflight"]);
  assert.ok(document.paths["/v1/x402/software/pypi-package-preflight"]);
  assert.ok(document.paths["/v1/x402/agent/capability-security-preflight"]);
  assert.ok(document.paths["/v1/x402/payment-guard/evaluate"]);
  assert.ok(document.paths["/v1/x402/base/alpha-risk"]);
  assert.ok(document.paths["/v1/x402/base/token-alpha-snapshot"]);
  assert.ok(document.paths["/v1/x402/base/wallet-copytrade-risk"]);
  assert.ok(document.paths["/v1/x402/base/new-pool-risk"]);
  assert.ok(document.paths["/v1/x402/x402/server-trust"]);
  assert.ok(document.paths["/v1/x402/x402/origin-due-diligence"]);
  assert.ok(document.paths["/v1/x402/x402/resource-compare"]);
  assert.ok(document.paths["/v1/x402/agent/spend-route-plan"]);
  assert.ok(document.paths["/v1/x402/agent/buyer-identity-preflight"]);
  assert.ok(document.paths["/v1/x402/agent/payment-risk-gateway"]);
  assert.ok(document.paths["/v1/x402/agent/rpc-preflight"]);
  assert.ok(document.paths["/v1/x402/chain/rpc-capability-probe"]);
  assert.ok(document.paths["/v1/x402/agent/chain-data-route-plan"]);
  assert.ok(document.paths["/v1/x402/chain/indexed-query-preflight"]);
  assert.ok(document.paths["/v1/x402/agent/rpc-payment-guard"]);
  assert.ok(document.paths["/v1/x402/agent-risk/address-risk"]);
  assert.ok(document.paths["/v1/x402/agent-risk/token-risk"]);
  assert.ok(document.paths["/v1/x402/agent-risk/transaction-decode-risk"]);
  assert.ok(document.paths["/v1/x402/agent-risk/wallet-dossier"]);
  assert.ok(document.paths["/v1/x402/agent-risk/safe-transaction-review"]);
  assert.ok(document.paths["/v1/x402/agent-risk/swap-preflight"]);
  assert.ok(document.paths["/v1/x402/agent-risk/stablecoin-health"]);
  assert.ok(document.paths["/v1/x402/agent-risk/policy-decide"]);
  assert.ok(document.paths["/v1/x402/base/token-exit-risk"]);
  assert.ok(document.paths["/v1/x402/bcs/labels"]);
  assert.ok(document.paths["/v1/x402/bcs/assets"]);
  assert.ok(document.paths["/v1/x402/bcs/chains"]);
  assert.ok(document.paths["/v1/x402/bcs/registry"]);
  assert.ok(document.paths["/v1/x402/bcs/resolve"]);
  assert.ok(document.paths["/v1/x402/bcs/address-risk"]);
  assert.ok(document.paths["/v1/x402/bcs/address-classify"]);
  assert.ok(document.paths["/v1/x402/bcs/wallet-overview"]);
  assert.ok(document.paths["/v1/x402/bcs/trace"]);
  assert.ok(document.paths["/v1/x402/bcs/cross-chain"]);
  assert.ok(document.paths["/v1/x402/address-risk/lookup"]);
  assert.ok(document.paths["/v1/x402/address-risk/sample"]);
  assert.ok(document.paths["/v1/x402/address-risk/snapshot"]);
  assert.ok(document.paths["/v1/x402/address-risk/delta"]);
  assert.ok(document.paths["/v1/x402/sumsub/case-management-evidence"]);
  assert.ok(document.paths["/v1/x402/sumsub/db-net-evidence"]);
  assert.ok(document.paths["/v1/x402/sumsub/kyt-evidence"]);
  assert.ok(document.paths["/v1/x402/sumsub/payment-method-crypto-evidence"]);
  assert.ok(document.paths["/v1/x402/sumsub/poa-evidence"]);
  assert.ok(document.paths["/v1/x402/sumsub/crystal-crypto-risk-evidence"]);
  assert.ok(document.paths["/v1/x402/sumsub/travel-rule-evidence"]);
  assert.ok(document.paths["/v1/x402/sumsub/watchlist-aml-evidence"]);
  assert.ok(document.paths["/v1/x402/transaction/preflight"]);
  assert.ok(document.paths["/v1/x402/transaction/preflight-lite"]);
  assert.ok(document.paths["/v1/x402/transaction/preflight-plus"]);
  assert.ok(document.paths["/v1/agentic-commerce/preflight/sample"]);
  assert.ok(document.paths["/v1/agentic-commerce/preflight"].post);
  assert.ok(
    document.paths["/v1/x402/payment-guard/policies"].post.requestBody,
  );
  assert.equal(document.paths["/v1/intents/verify"], undefined);
  assert.equal(document.paths["/v1/payments/preflight"], undefined);
  assert.equal(document.paths["/v1/payments/authorize"], undefined);
  assert.equal(document.paths["/v1/payment-guard/lifecycle"], undefined);
  assert.equal(document.paths["/v1/payment-guard/status"], undefined);
  assert.equal(document.paths["/v1/payment-guard/approvals"], undefined);
  assert.equal(document.paths["/v1/payment-guard/delivery"], undefined);
  assert.equal(document.paths["/v1/payment-guard/webhooks"], undefined);
  assert.equal(document.paths["/mcp"], undefined);

  const catalog = await worker.fetch(
    new Request("https://example.test/catalog.json"),
  );
  const catalogDocument = await catalog.json();
  assert.equal(catalogDocument.product_families, 77);
  assert.equal(catalogDocument.paid_operations_observed_on_x402scan, 79);
  assert.equal(catalogDocument.pricing_version, "x402-pricing-v1-20260720");
  assert.ok(
    catalogDocument.products.find(
      product => product.id === "x402-origin-due-diligence",
    ).ai_should_buy_when,
  );
  assert.ok(
    catalogDocument.products.find(
      product => product.id === "agent-rpc-preflight",
    ).ai_should_buy_when,
  );
  assert.ok(
    catalogDocument.products.find(
      product => product.id === "agent-buyer-identity-preflight",
    ).ai_should_buy_when,
  );
  assert.ok(
    catalogDocument.products.find(
      product => product.id === "sumsub-kyt-evidence",
    ).ai_should_buy_when,
  );
  assert.match(catalogDocument.description, /economic policy decisions/i);
  assert.equal(
    catalogDocument.products.find(
      product => product.id === "agent-buyer-policy-kit",
    ).price_usdc,
    "$49.00",
  );
  assert.ok(
    catalogDocument.groups.find(group => group.id === "agent-chain-data"),
  );
  assert.ok(
    catalogDocument.recommended_workflows.find(
      workflow => workflow.id === "agent-buyer-identity-before-x402-purchase",
    ),
  );
  assert.ok(
    catalogDocument.recommended_workflows.find(
      workflow => workflow.id === "x402-transaction-preflight-before-agent-pay",
    ),
  );

  const card = await worker.fetch(
    new Request("https://example.test/.well-known/agent-card.json"),
  );
  assert.equal((await card.json()).skills.length, 77);

  const x402Discovery = await worker.fetch(
    new Request("https://example.test/.well-known/x402"),
  );
  const x402DiscoveryDocument = await x402Discovery.json();
  assert.equal(x402DiscoveryDocument.resources.length, 77);
  assert.equal(x402DiscoveryDocument.operation_count, 79);
  assert.equal(x402DiscoveryDocument.paid_operations.length, 79);
  assert.ok(
    x402DiscoveryDocument.paid_operations.find(
      operation =>
        operation.id === "agent-payment-guard-json-evaluate" &&
        operation.method === "POST",
    ),
  );
  assert.ok(
    x402DiscoveryDocument.paid_operations.find(
      operation =>
        operation.id === "agent-payment-guard-policy-create" &&
        operation.method === "POST",
    ),
  );
  assert.ok(
    x402DiscoveryDocument.resources.includes(
      "https://example.test/v1/x402/agent/rpc-preflight",
    ),
  );
  assert.ok(
    x402DiscoveryDocument.resources.includes(
      "https://example.test/v1/x402/agent/buyer-identity-preflight",
    ),
  );
  assert.ok(
    x402DiscoveryDocument.resources.includes(
      "https://example.test/v1/x402/sumsub/kyt-evidence",
    ),
  );
  assert.ok(
    x402DiscoveryDocument.resources.includes(
      "https://example.test/v1/x402/transaction/preflight",
    ),
  );
  assert.ok(
    x402DiscoveryDocument.paid_operations.find(
      operation =>
        operation.id === "agent-buyer-policy-kit" &&
        operation.price_usdc === "$49.00",
    ),
  );

  const registry = await worker.fetch(
    new Request("https://example.test/registry.json"),
  );
  const registryDocument = await registry.json();
  assert.equal(registryDocument.counts.product_families, 77);
  assert.equal(registryDocument.counts.paid_operations, 79);
  assert.equal(registryDocument.pricing_version, "x402-pricing-v1-20260720");
  assert.ok(
    registryDocument.operations.find(
      operation => operation.id === "x402-rpc-payment-guard",
    ),
  );
  assert.ok(
    registryDocument.clusters.find(
      cluster => cluster.id === "x402-payment-safety",
    ),
  );
  assert.ok(
    registryDocument.clusters.find(
      cluster => cluster.id === "sumsub-compliance-evidence",
    ),
  );

  const mcp = await worker.fetch(
    new Request("https://example.test/.well-known/mcp.json"),
  );
  assert.ok((await mcp.json()).tools.includes("evaluate_payment"));

  const endpoints = await worker.fetch(
    new Request("https://example.test/endpoints.txt"),
  );
  const endpointsText = await endpoints.text();
  assert.match(endpointsText, /POST https:\/\/example.test\/v1\/x402\/payment-guard\/evaluate/);
  assert.match(endpointsText, /GET https:\/\/example.test\/v1\/x402\/agent-risk\/address-risk/);
  assert.match(endpointsText, /agent-tool-supply-chain/);

  const workflows = await worker.fetch(
    new Request("https://example.test/workflows.json"),
  );
  const workflowDocument = await workflows.json();
  assert.ok(
    workflowDocument.workflows.find(
      workflow => workflow.id === "ai-buyer-before-paying-x402-api",
    ),
  );

  const verify = await worker.fetch(
    new Request("https://example.test/verify"),
  );
  assert.equal(verify.status, 200);
  assert.match(await verify.text(), /Deployment Verification/);

  const agenticPage = await worker.fetch(
    new Request("https://example.test/agentic-commerce-preflight"),
  );
  assert.equal(agenticPage.status, 200);
  assert.match(await agenticPage.text(), /Policy decisions between agents and money movement/);

  const agenticSample = await worker.fetch(
    new Request("https://example.test/v1/agentic-commerce/preflight/sample"),
  );
  assert.equal(agenticSample.status, 200);
  const sampleDocument = await agenticSample.json();
  assert.equal(sampleDocument.sample_response.decision, "REQUIRE_APPROVAL");
  assert.equal(sampleDocument.sample_response.response_kind, "decision_response");
  assert.equal(sampleDocument.sample_response.decision_artifact.issued, false);
  assert.equal(
    sampleDocument.sample_response.signer_directive.agent_may_directly_sign,
    false,
  );
  assert.equal(
    sampleDocument.sample_response.signer_directive.execution_may_be_agent_initiated,
    true,
  );

  const agenticPost = await worker.fetch(
    new Request("https://example.test/v1/agentic-commerce/preflight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sampleAgenticCommercePreflightInput()),
    }),
  );
  assert.equal(agenticPost.status, 200);
  const agenticPostDocument = await agenticPost.json();
  assert.equal(agenticPostDocument.schema_version, "agentic_commerce_preflight_result.v1");
  assert.equal(agenticPostDocument.response_kind, "decision_response");
  assert.equal(agenticPostDocument.decision, "REQUIRE_APPROVAL");
  assert.equal(agenticPostDocument.decision_artifact.issued, false);
  assert.ok(
    agenticPostDocument.reason_codes.includes(
      "PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER",
    ),
  );

  const mcpTools = await worker.fetch(
    new Request("https://example.test/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    }),
  );
  assert.equal(mcpTools.status, 200);
  const mcpToolsDocument = await mcpTools.json();
  assert.deepEqual(
    mcpToolsDocument.result.tools.map(tool => tool.name),
    ["evaluate_payment"],
  );

  const mcpCall = await worker.fetch(
    new Request("https://example.test/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "evaluate_payment",
          arguments: {
            agent: { id: "agent.finance.001", role: "finance_agent" },
            buyer: { id: "buyer.acme" },
            mandate: sampleAgenticCommercePreflightInput().mandate,
            merchant: sampleAgenticCommercePreflightInput().merchant,
            resource: {
              id: "paid-resource",
              url: "https://api.example.com/v1/x402/data",
              category: "payment_execution",
            },
            requested_amount: "0.025",
            asset: "USDC",
            network: "base",
            payment_scheme: "x402",
          },
        },
      }),
    }),
  );
  assert.equal(mcpCall.status, 200);
  const mcpCallDocument = await mcpCall.json();
  const mcpDecision = JSON.parse(mcpCallDocument.result.content[0].text);
  assert.equal(mcpDecision.response_kind, "decision_response");
  assert.equal(mcpDecision.decision, "REQUIRE_APPROVAL");
  assert.equal(mcpDecision.signer_directive.agent_may_directly_sign, false);
});

test("agent buyer identity preflight maps five roles to purchase fit", () => {
  const research = buildAgentBuyerIdentityPreflight({
    agentRole: "research_agent",
    productCategory: "wallet_risk",
    purpose: "security_research",
    priceUsdc: "0.005",
    dataSensitivity: "medium",
  });
  assert.equal(research.decision, "ALLOW");
  assert.equal(research.role_product_fit, "fit");

  const writer = buildAgentBuyerIdentityPreflight({
    agentRole: "writer_agent",
    productCategory: "wallet_risk",
    purpose: "article_drafting",
    priceUsdc: "0.005",
    dataSensitivity: "medium",
  });
  assert.equal(writer.decision, "APPROVAL_REQUIRED");

  const accountingWrong = buildAgentBuyerIdentityPreflight({
    agentRole: "accounting_agent",
    productCategory: "market_intelligence",
    purpose: "accounts_payable",
    priceUsdc: "0.005",
    dataSensitivity: "medium",
  });
  assert.equal(accountingWrong.decision, "DENY");

  const accountingRight = buildAgentBuyerIdentityPreflight({
    agentRole: "accounting_agent",
    productCategory: "invoice_verification",
    purpose: "accounts_payable",
    priceUsdc: "0.005",
    dataSensitivity: "low",
  });
  assert.equal(accountingRight.decision, "ALLOW");

  const finance = buildAgentBuyerIdentityPreflight({
    agentRole: "finance_agent",
    productCategory: "payment_execution",
    purpose: "settlement",
    priceUsdc: "0.05",
    dataSensitivity: "high",
  });
  assert.equal(finance.decision, "APPROVAL_REQUIRED");

  const operator = buildAgentBuyerIdentityPreflight({
    agentRole: "operator_agent",
    productCategory: "api_security",
    purpose: "service_monitoring",
    priceUsdc: "0.005",
    dataSensitivity: "low",
  });
  assert.equal(operator.decision, "ALLOW");
});

test("agentic commerce preflight returns unified decision contract", () => {
  const sample = buildAgenticCommercePreflight(sampleAgenticCommercePreflightInput());
  assert.equal(sample.product, "agentic-commerce-preflight");
  assert.equal(sample.decision, "REQUIRE_APPROVAL");
  assert.equal(sample.response_kind, "decision_response");
  assert.equal(sample.signer_directive.agent_may_directly_sign, false);
  assert.equal(sample.signer_directive.execution_may_be_agent_initiated, true);
  assert.deepEqual(sample.signer_directive.required_signer.allowed_classes, [
    "human_fido2",
    "hsm",
    "kms",
    "custody",
    "smart_account_module",
  ]);
  assert.equal(sample.decision_artifact.issued, false);
  assert.ok(
    sample.reason_codes.includes("PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER"),
  );

  const missingMandate = buildAgenticCommercePreflight({
    ...sampleAgenticCommercePreflightInput(),
    mandate: null,
  });
  assert.equal(missingMandate.decision, "DENY");
  assert.ok(missingMandate.reason_codes.includes("MANDATE_MISSING"));

  const merchantMismatch = buildAgenticCommercePreflight({
    ...sampleAgenticCommercePreflightInput(),
    merchant: {
      ...sampleAgenticCommercePreflightInput().merchant,
      expected_wallet: "0xdef0000000000000000000000000000000000002",
    },
  });
  assert.equal(merchantMismatch.decision, "DENY");
  assert.ok(merchantMismatch.reason_codes.includes("MERCHANT_WALLET_MISMATCH"));
});

test("purchase event logging ignores probes and requires payment evidence", () => {
  assert.equal(
    shouldRecordX402PurchaseEvent({
      method: "HEAD",
      status: 200,
      paymentHeader: "proof",
    }),
    false,
  );
  assert.equal(
    shouldRecordX402PurchaseEvent({
      method: "OPTIONS",
      status: 200,
      paymentHeader: "proof",
    }),
    false,
  );
  assert.equal(
    shouldRecordX402PurchaseEvent({
      method: "GET",
      status: 200,
      paymentHeader: "",
    }),
    false,
  );
  assert.equal(
    shouldRecordX402PurchaseEvent({
      method: "GET",
      status: 402,
      paymentHeader: "proof",
    }),
    false,
  );
  assert.equal(
    shouldRecordX402PurchaseEvent({
      method: "GET",
      status: 200,
      paymentHeader: "proof",
    }),
    true,
  );
});

test("bcsGatewayRequest wraps BlockchainSecurity responses without exposing API key", async () => {
  let observedUrl = null;
  let observedKey = null;
  const result = await bcsGatewayRequest({
    product: "bcs-address-labels",
    apiKey: "ak_live_test_secret",
    upstreamPath: "/v1/labels",
    query: {
      chain: "ethereum",
      address: "0x28c6c06298d514db089934071355e5743bf21d60",
      sources: "all",
    },
    fetchImpl: async (url, init) => {
      observedUrl = url;
      observedKey = init.headers["x-api-key"];
      return new Response(
        JSON.stringify({
          data: {
            address: "0x28c6c06298d514db089934071355e5743bf21d60",
            results: [{ source: "misttrack", labels: ["Binance", "hot"] }],
          },
          meta: { request_id: "upstream-request" },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-request-id": "upstream-request",
            "x-credit-cost": "5",
            "x-credit-remaining": "9999994",
          },
        },
      );
    },
  });

  assert.equal(observedKey, "ak_live_test_secret");
  assert.match(observedUrl, /\/v1\/labels\?chain=ethereum/);
  assert.equal(result.product, "bcs-address-labels");
  assert.equal(result.upstream_headers.credit_cost, "5");
  assert.equal(result.upstream_headers.credit_remaining, "9999994");
  assert.equal(result.upstream_response.data.results[0].labels[0], "Binance");
  assert.doesNotMatch(JSON.stringify(result), /ak_live_test_secret/);
});

test("buildX402ServerTrust scores x402 marketplace adoption and concentration", () => {
  const trusted = buildX402ServerTrust({
    serverUrl: "https://api.nansen.ai",
    seller: "0x94F751f04b98507D31b500b7Ed50bE68A1514873",
    volumeUsdc: "108.45",
    txns: "6115",
    buyers: "107",
    latestSeenHours: "3",
    chains: "base, solana",
    merchant: {
      assessment: { risk_level: "low", risk_score: 0 },
      receipt_sample: {
        sampled_usdc_receipts: 20,
        unique_payers: 12,
        top_payer_share_percent: 22.4,
      },
    },
  });

  assert.equal(trusted.product, "x402-server-trust");
  assert.equal(trusted.assessment.risk_level, "low");
  assert.ok(trusted.assessment.trust_score >= 80);
  assert.equal(trusted.marketplace_activity.buyers, 107);

  const concentrated = buildX402ServerTrust({
    serverUrl: "https://example.com/x402",
    volumeUsdc: "0.351",
    txns: "42",
    buyers: "1",
    latestSeenHours: "400",
    chains: "base",
  });

  assert.equal(concentrated.assessment.risk_level, "medium");
  assert.ok(
    concentrated.assessment.flags.some(
      flag => flag.code === "VERY_LOW_BUYER_DIVERSITY",
    ),
  );
});

test("x402 meta and router builders produce buyer-ready decisions", () => {
  const diligence = buildX402OriginDueDiligence({
    serverUrl:
      "https://www.x402scan.com/server/b0ce6f4e-73e9-431d-b23c-814ac89cc77b",
    origin: "https://base-agent-preflight.bytoken2023.workers.dev",
    seller: "0x94F751f04b98507D31b500b7Ed50bE68A1514873",
    resources: "42",
    resourceUrls: [
      "https://base-agent-preflight.bytoken2023.workers.dev/v1/x402/base/alpha-risk",
    ],
    payToAddresses: ["0x94F751f04b98507D31b500b7Ed50bE68A1514873"],
    txns: "42",
    buyers: "3",
    openapi: {
      assessment: { risk_level: "low" },
      specification: { operation_count: 42 },
    },
    serverTrust: {
      assessment: { risk_level: "low", trust_score: 72 },
    },
  });
  assert.equal(diligence.product, "x402-origin-due-diligence");
  assert.equal(diligence.assessment.risk_level, "low");
  assert.equal(diligence.inventory.observed_resource_count, 42);

  const comparison = buildX402ResourceCompare({
    budgetUsdc: "0.01",
    resources: [
      {
        url: "https://example.test/a",
        amount_usdc: "0.003",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        pay_to: "0x94F751f04b98507D31b500b7Ed50bE68A1514873",
        risk_level: "low",
        description: "Cheap resource",
      },
      {
        url: "https://example.test/b",
        amount_usdc: "0.03",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        pay_to: "0x94F751f04b98507D31b500b7Ed50bE68A1514873",
        risk_level: "low",
        description: "Expensive resource",
      },
    ],
  });
  assert.equal(comparison.product, "x402-resource-compare");
  assert.equal(comparison.recommendation.url, "https://example.test/a");
  assert.ok(
    comparison.candidates[1].flags.some(flag => flag.code === "OVER_BUDGET"),
  );

  const route = buildAgentSpendRoutePlan({
    task: "screen a Base token before buying",
    budgetUsdc: "0.02",
    riskTolerance: "low",
  });
  assert.equal(route.product, "agent-spend-route-plan");
  assert.equal(route.recommended_route[0].product, "base-alpha-risk-context");
  assert.ok(
    route.full_route.some(step => step.product === "base-token-exit-risk"),
  );
});

test("buildAlphaRiskContext summarizes bot-ready wallet and token signals", () => {
  const token = buildAlphaRiskContext({
    subject: "0x3333333333333333333333333333333333333333",
    requestedKind: "token",
    tokenRisk: {
      assessment: { risk_score: 20, flags: [] },
      token_metadata: {
        symbol: "TEST",
        name: "Test Token",
        holders_count: 1200,
      },
      dex_liquidity: {
        best_pair: {
          liquidity_usd: 120000,
          volume_24h_usd: 80000,
          buys_24h: 240,
          sells_24h: 180,
          url: "https://dexscreener.com/base/example",
        },
      },
    },
    counterparty: {
      unique_counterparties: 8,
      adverse_counterparties: 0,
      counterparties: [],
    },
  });
  assert.equal(token.product, "base-alpha-risk-context");
  assert.equal(token.detected_kind, "token");
  assert.equal(token.assessment.trade_bias, "watch");
  assert.ok(token.machine_tags.includes("symbol:TEST"));

  const wallet = buildAlphaRiskContext({
    subject: "0x4444444444444444444444444444444444444444",
    requestedKind: "wallet",
    addressRisk: {
      assessment: {
        risk_score: 80,
        flags: [{ code: "PUBLIC_SCAM_FLAG", severity: "critical" }],
      },
      identity: { type: "eoa", is_scam: true },
      activity: { transactions_count: 10, token_transfers_count: 3 },
    },
    counterparty: {
      unique_counterparties: 3,
      adverse_counterparties: 1,
      counterparties: [],
    },
  });
  assert.equal(wallet.detected_kind, "wallet");
  assert.equal(wallet.assessment.risk_level, "high");
  assert.equal(wallet.assessment.trade_bias, "avoid");
});

test("Base trading bot intelligence builders return machine-readable decisions", () => {
  const tokenRisk = {
    assessment: { risk_score: 20, flags: [] },
    token_metadata: {
      symbol: "BOT",
      name: "Bot Token",
      holders_count: 1600,
    },
    dex_liquidity: {
      pair_count_on_base: 1,
      best_pair: {
        liquidity_usd: 150000,
        volume_24h_usd: 90000,
        buys_24h: 320,
        sells_24h: 120,
        pair_created_at: "2026-06-26T00:00:00.000Z",
      },
    },
  };
  const dexMarket = {
    pair_count: 1,
    aggregate_top5: {
      liquidity_usd: 150000,
      volume_24h_usd: 90000,
      buys_24h: 320,
      sells_24h: 120,
    },
    deepest_pair: {
      liquidity_usd: 150000,
      volume_24h_usd: 90000,
      buys_24h: 320,
      sells_24h: 120,
      pair_created_at: "2026-06-26T00:00:00.000Z",
    },
  };

  const tokenAlpha = buildTokenAlphaSnapshot({
    token: "0x3333333333333333333333333333333333333333",
    tokenRisk,
    dexMarket,
  });
  assert.equal(tokenAlpha.product, "base-token-alpha-snapshot");
  assert.equal(tokenAlpha.assessment.trade_bias, "watch");
  assert.equal(tokenAlpha.market.buy_sell_imbalance, 200);
  assert.ok(tokenAlpha.machine_tags.includes("symbol:BOT"));

  const copytrade = buildWalletCopytradeRisk({
    address: "0x4444444444444444444444444444444444444444",
    addressRisk: {
      assessment: { risk_score: 5, flags: [] },
      identity: { type: "eoa" },
      activity: { transactions_count: 900, token_transfers_count: 120 },
    },
    counterparty: {
      unique_counterparties: 20,
      adverse_counterparties: 0,
      counterparties: [],
    },
  });
  assert.equal(copytrade.product, "base-wallet-copytrade-risk");
  assert.equal(copytrade.assessment.recommendation, "candidate");
  assert.ok(copytrade.machine_tags.includes("copytrade:candidate"));

  const newPool = buildNewPoolRisk({
    token: "0x5555555555555555555555555555555555555555",
    tokenRisk,
    dexMarket,
    fetchedAt: "2026-06-26T06:00:00.000Z",
  });
  assert.equal(newPool.product, "base-new-pool-risk");
  assert.equal(newPool.pool.age_hours, 6);
  assert.equal(newPool.assessment.launch_risk, "medium");
  assert.ok(
    newPool.assessment.flags.some(flag => flag.code === "VERY_NEW_PAIR"),
  );

  const exitRisk = buildTokenExitRisk({
    token: "0x5555555555555555555555555555555555555555",
    tokenRisk,
    dexMarket: {
      ...dexMarket,
      aggregate_top5: {
        liquidity_usd: 20000,
        volume_24h_usd: 120000,
        buys_24h: 40,
        sells_24h: 120,
      },
      deepest_pair: {
        liquidity_usd: 20000,
        volume_24h_usd: 120000,
        buys_24h: 40,
        sells_24h: 120,
        pair_created_at: "2026-06-26T00:00:00.000Z",
      },
    },
    fetchedAt: "2026-06-26T06:00:00.000Z",
  });
  assert.equal(exitRisk.product, "base-token-exit-risk");
  assert.equal(exitRisk.assessment.exit_risk, "high");
  assert.ok(
    exitRisk.assessment.flags.some(flag => flag.code === "THIN_EXIT_LIQUIDITY"),
  );
});

test("four additional product builders return machine-readable results", () => {
  const token = buildTokenPreflight({
    token: "0x3333333333333333333333333333333333333333",
    profile: {
      is_contract: true,
      is_verified: true,
      is_scam: false,
      proxy_type: null,
      implementations: [],
    },
    tokenInfo: {
      name: "Test",
      symbol: "TEST",
      decimals: "18",
      holders_count: "500",
      reputation: "ok",
    },
    dexPairs: [],
  });
  assert.equal(token.product, "base-token-preflight");
  assert.equal(token.assessment.flags[0].code, "NO_BASE_DEX_PAIR");

  const merchant = buildMerchantTrust({
    address: "0x4444444444444444444444444444444444444444",
    profile: { is_contract: false, is_scam: false, reputation: "ok" },
    counters: { transactions_count: "5", token_transfers_count: "3" },
    transfers: { items: [] },
  });
  assert.equal(merchant.product, "x402-merchant-trust");

  const proof = buildPaymentProof({
    txHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    recipient: "0x5555555555555555555555555555555555555555",
    amount: "0.02",
    transaction: {
      status: "ok",
      confirmations: 10,
      token_transfers: [
        {
          from: { hash: "0x6666666666666666666666666666666666666666" },
          to: { hash: "0x5555555555555555555555555555555555555555" },
          total: { value: "20000" },
          token: {
            address_hash: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          },
        },
      ],
    },
  });
  assert.equal(proof.verified, true);

  const delta = buildWalletActivityDelta({
    address: "0x7777777777777777777777777777777777777777",
    since: "2026-06-21T00:00:00Z",
    transfers: {
      items: [
        {
          timestamp: "2026-06-21T01:00:00Z",
          from: { hash: "0x8888888888888888888888888888888888888888" },
          to: { hash: "0x7777777777777777777777777777777777777777" },
          token: { symbol: "USDC", reputation: "ok" },
          total: { value: "10000", decimals: "6" },
        },
      ],
    },
  });
  assert.equal(delta.transfer_count, 1);
});

test("five new product builders return machine-readable results", () => {
  const approval = buildApprovalRisk({
    token: "0x1111111111111111111111111111111111111111",
    owner: "0x2222222222222222222222222222222222222222",
    spender: "0x3333333333333333333333333333333333333333",
    allowanceAtomic: ((1n << 256n) - 1n).toString(),
    tokenInfo: { symbol: "TEST", decimals: "18" },
    spenderProfile: {
      is_contract: true,
      is_verified: true,
      is_scam: false,
      reputation: "ok",
      implementations: [],
    },
  });
  assert.equal(approval.assessment.flags[0].code, "UNLIMITED_ALLOWANCE");
  assert.equal(approval.allowance.effectively_unlimited, true);

  const contract = buildContractVerification({
    address: "0x4444444444444444444444444444444444444444",
    profile: {
      is_contract: true,
      is_verified: true,
      proxy_type: "eip1967",
      implementations: [{ address_hash: "0x5555555555555555555555555555555555555555" }],
    },
    contract: {
      is_verified: true,
      is_fully_verified: true,
      is_partially_verified: false,
      compiler_version: "0.8.30",
    },
  });
  assert.equal(contract.verification.is_verified, true);
  assert.equal(contract.proxy.type, "eip1967");

  const receipt = buildUsdcReceipt({
    txHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    transaction: {
      status: "ok",
      confirmations: 4,
      token_transfers: [
        {
          from: { hash: "0x6666666666666666666666666666666666666666" },
          to: { hash: "0x7777777777777777777777777777777777777777" },
          total: { value: "5000" },
          token: {
            address_hash: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          },
        },
      ],
    },
  });
  assert.equal(receipt.valid_receipt, true);
  assert.equal(receipt.transfers[0].amount_usdc, "0.005");

  const counterparty = buildWalletCounterparty({
    address: "0x8888888888888888888888888888888888888888",
    transactions: {
      items: [
        {
          from: { hash: "0x8888888888888888888888888888888888888888" },
          to: {
            hash: "0x9999999999999999999999999999999999999999",
            is_contract: true,
            reputation: "ok",
          },
        },
      ],
    },
    transfers: { items: [] },
  });
  assert.equal(counterparty.unique_counterparties, 1);
  assert.equal(counterparty.counterparties[0].outbound, 1);

  const events = buildEventLogMonitor({
    address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    fromBlock: "100",
    logs: {
      items: [
        {
          block_number: 101,
          transaction_hash:
            "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          decoded: { method_call: "Transfer(address,address,uint256)" },
        },
        { block_number: 99 },
      ],
    },
  });
  assert.equal(events.event_count, 1);
});

test("five execution and market-data builders return machine-readable results", () => {
  const gas = buildGasFeeQuote({
    gasLimit: "21000",
    gasPriceHex: "0x64",
    priorityFeeHex: "0x0a",
    block: {
      number: "0x10",
      baseFeePerGas: "0x50",
      gasUsed: "0x32",
      gasLimit: "0x64",
    },
  });
  assert.equal(gas.product, "base-gas-fee-quote");
  assert.equal(gas.estimated_cost.wei, "2100000");

  const nonce = buildNonceReadiness({
    address: "0x1111111111111111111111111111111111111111",
    latestHex: "0x5",
    pendingHex: "0x7",
  });
  assert.equal(nonce.pending_transaction_count, "2");
  assert.equal(nonce.ready, false);

  const stablecoins = buildStablecoinBalance({
    address: "0x2222222222222222222222222222222222222222",
    balances: ["1500000", "2000000", "3000000000000000000"],
    tokenInfo: [
      { exchange_rate: "1", reputation: "ok" },
      { exchange_rate: "1", reputation: "ok" },
      { exchange_rate: "1", reputation: "ok" },
    ],
  });
  assert.equal(stablecoins.assets[0].balance, "1.5");
  assert.equal(stablecoins.total_estimated_value_usd, 6.5);

  const dex = buildDexMarketMonitor({
    token: "0x3333333333333333333333333333333333333333",
    pairs: [
      {
        chainId: "base",
        dexId: "testdex",
        pairAddress: "0x4444444444444444444444444444444444444444",
        liquidity: { usd: 10000 },
        volume: { h24: 5000 },
        txns: { h24: { buys: 10, sells: 8 } },
      },
    ],
  });
  assert.equal(dex.deepest_pair.dex, "testdex");
  assert.equal(dex.aggregate_top5.buys_24h, 10);

  const prediction = buildPredictionMarketSnapshot({
    ticker: "TEST-MARKET",
    market: {
      title: "Test market",
      status: "active",
      yes_bid_dollars: "0.45",
      yes_ask_dollars: "0.47",
    },
    orderbook: {
      orderbook_fp: {
        yes_dollars: [["0.45", "100"]],
        no_dollars: [["0.53", "50"]],
      },
    },
  });
  assert.equal(prediction.venue, "Kalshi");
  assert.equal(prediction.orderbook.yes_bids[0].price_dollars, "0.45");
});

test("five software and web builders return machine-readable results", async () => {
  const endpoint = buildX402EndpointPreflight({
    url: "https://paid.example/resource",
    status: 402,
    requirement: {
      x402Version: 2,
      resource: { url: "https://paid.example/resource" },
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453",
          amount: "5000",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          payTo: "0x1111111111111111111111111111111111111111",
        },
      ],
    },
  });
  assert.equal(endpoint.assessment.risk_level, "low");
  assert.equal(endpoint.x402.accepts[0].amount_usdc, "0.005");

  const npm = buildNpmPackagePreflight({
    packageName: "example",
    requestedVersion: "1.0.0",
    packument: {
      "dist-tags": { latest: "1.1.0" },
      time: { "1.0.0": "2026-01-01T00:00:00.000Z" },
      maintainers: [{ name: "maintainer" }],
      versions: {
        "1.0.0": {
          version: "1.0.0",
          license: "MIT",
          dependencies: { one: "^1.0.0" },
        },
      },
    },
    osv: { vulns: [{ id: "TEST-1", summary: "Test vulnerability" }] },
  });
  assert.equal(npm.metadata.dependency_count, 1);
  assert.equal(npm.vulnerabilities[0].id, "TEST-1");

  const github = buildGithubRepositoryHealth({
    owner: "example",
    repo: "project",
    repository: {
      archived: false,
      disabled: false,
      fork: false,
      pushed_at: new Date().toISOString(),
      license: { spdx_id: "MIT" },
      stargazers_count: 10,
      forks_count: 2,
      open_issues_count: 1,
    },
    release: { tag_name: "v1.0.0", published_at: "2026-01-01T00:00:00Z" },
  });
  assert.equal(github.assessment.risk_level, "low");
  assert.equal(github.health.latest_release.tag, "v1.0.0");

  const feed = await buildFeedSnapshot({
    url: "https://example.com/feed.xml",
    finalUrl: "https://example.com/feed.xml",
    redirects: [],
    xml: `<?xml version="1.0"?><rss><channel><title>Example</title><item><title>One</title><link>https://example.com/one</link><guid>one</guid><pubDate>Sun, 21 Jun 2026 00:00:00 GMT</pubDate></item></channel></rss>`,
  });
  assert.equal(feed.format, "rss");
  assert.equal(feed.item_count, 1);
  assert.equal(feed.items[0].fingerprint.length, 64);

  const fingerprint = await urlChangeFingerprint(
    "https://example.com/page",
    async () =>
      new Response("<html><head><title>Example Page</title></head></html>", {
        headers: {
          "content-type": "text/html",
          etag: '"abc"',
        },
      }),
  );
  assert.equal(fingerprint.content.title, "Example Page");
  assert.equal(fingerprint.content.sha256.length, 64);

  assert.throws(
    () => validatePublicUrl("http://127.0.0.1/private"),
    /private_or_local_url_forbidden/,
  );
});

test("five agent, intent, domain, and package builders return machine-readable results", async () => {
  const intent = buildTransactionIntent({
    to: "0x1111111111111111111111111111111111111111",
    data:
      "0x095ea7b30000000000000000000000002222222222222222222222222222222222222222ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    value: "0",
    profile: { is_contract: true, is_verified: true, reputation: "ok" },
    tokenInfo: { name: "Test", symbol: "TEST", decimals: "18" },
  });
  assert.equal(intent.intent.action, "token_approval");
  assert.equal(intent.intent.unlimited_approval, true);
  assert.equal(intent.assessment.risk_level, "high");

  const card = buildA2aAgentCardPreflight({
    requestedUrl: "https://agent.example",
    cardUrl: "https://agent.example/.well-known/agent-card.json",
    card: {
      name: "Example Agent",
      url: "https://agent.example/rpc",
      skills: [{ id: "search", name: "Search" }],
      securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
    },
  });
  assert.equal(card.agent.skill_count, 1);
  assert.equal(card.assessment.risk_level, "low");

  const openapi = await buildOpenApiSpecPreflight({
    requestedUrl: "https://api.example/openapi.json",
    finalUrl: "https://api.example/openapi.json",
    raw: '{"openapi":"3.1.0"}',
    document: {
      openapi: "3.1.0",
      info: { title: "Example", version: "1.0.0" },
      servers: [{ url: "https://api.example" }],
      paths: {
        "/status": {
          get: {
            operationId: "getStatus",
            responses: { 200: { description: "ok" } },
          },
        },
      },
      components: {
        securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
      },
    },
  });
  assert.equal(openapi.specification.operation_count, 1);
  assert.equal(openapi.fingerprint_sha256.length, 64);

  const domain = buildDomainTrustPreflight({
    domain: "example.com",
    dns: {
      A: { AD: true, Answer: [{ name: "example.com", type: 1, TTL: 60, data: "93.184.216.34" }] },
      AAAA: { AD: true, Answer: [] },
      CNAME: { AD: true, Answer: [] },
      MX: { AD: true, Answer: [] },
      DNSKEY: { AD: true, Answer: [{ name: "example.com", type: 48, TTL: 60, data: "key" }] },
    },
    rdap: {
      events: [
        { eventAction: "registration", eventDate: "1995-08-14T00:00:00Z" },
        { eventAction: "expiration", eventDate: "2030-08-13T00:00:00Z" },
      ],
      nameservers: [{ ldhName: "A.IANA-SERVERS.NET" }],
    },
  });
  assert.equal(domain.dns.resolves, true);
  assert.equal(domain.assessment.risk_level, "low");

  const pypi = buildPypiPackagePreflight({
    packageName: "example",
    requestedVersion: "latest",
    payload: {
      info: {
        name: "example",
        version: "1.0.0",
        license: "MIT",
        requires_python: ">=3.10",
        requires_dist: ["dependency>=1"],
      },
      urls: [
        {
          yanked: false,
          upload_time_iso_8601: new Date().toISOString(),
        },
      ],
    },
    osv: { vulns: [] },
  });
  assert.equal(pypi.metadata.dependency_count, 1);
  assert.equal(pypi.assessment.risk_level, "low");
});

test("payment guard combines policy, budget, replay, and evidence into one decision", async () => {
  const result = await buildPaymentGuardDecision({
    targetUrl: "https://paid.example/resource",
    sessionId: "session-1",
    requestId: "request-1",
    endpoint: {
      url: "https://paid.example/resource",
      assessment: { risk_score: 0, flags: [] },
      x402: {
        accepts: [
          {
            scheme: "exact",
            network: "eip155:8453",
            asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            pay_to: "0x1111111111111111111111111111111111111111",
            amount_atomic: "5000",
          },
        ],
      },
    },
    merchant: { assessment: { risk_score: 0, flags: [] } },
    domain: { assessment: { risk_score: 0, flags: [] } },
    history: {
      storageMode: "d1",
      duplicateFingerprint: false,
      sessionReservedAtomic: 10_000,
      dailyReservedAtomic: 20_000,
    },
    policy: {
      maxSingleAtomic: 100_000,
      sessionBudgetAtomic: 1_000_000,
      dailyBudgetAtomic: 5_000_000,
      allowPayTo: [],
      blockPayTo: [],
    },
  });
  assert.equal(result.decision, "ALLOW");
  assert.equal(result.payment.amount_usdc, "0.005");
  assert.equal(result.budget.storage_mode, "d1");
  assert.equal(result.budget.reserved_by_this_decision_usdc, "0.005");

  const replay = await buildPaymentGuardDecision({
    targetUrl: "https://paid.example/resource",
    sessionId: "session-1",
    requestId: "request-2",
    endpoint: result.evidence.x402,
    history: {
      storageMode: "d1",
      duplicateFingerprint: true,
      sessionReservedAtomic: 15_000,
      dailyReservedAtomic: 25_000,
    },
    policy: {
      maxSingleAtomic: 100_000,
      sessionBudgetAtomic: 1_000_000,
      dailyBudgetAtomic: 5_000_000,
      allowPayTo: [],
      blockPayTo: [],
    },
  });
  assert.equal(replay.decision, "BLOCK");
  assert.ok(replay.reasons.some(reason => reason.code === "POSSIBLE_REPLAY"));
});

test("payment guard decision tokens are signed, verified, and expire", async () => {
  const secret = "test-signing-secret";
  const token = await signPaymentGuardDecision(
    {
      request_id: "request-1",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
    secret,
  );
  const payload = await verifyPaymentGuardDecision(token, secret);
  assert.equal(payload.request_id, "request-1");
  await assert.rejects(
    () => verifyPaymentGuardDecision(token, "wrong-secret"),
    /invalid_decision_token_signature/,
  );
  const expired = await signPaymentGuardDecision(
    {
      request_id: "request-2",
      expires_at: new Date(Date.now() - 1_000).toISOString(),
    },
    secret,
  );
  await assert.rejects(
    () => verifyPaymentGuardDecision(expired, secret),
    /decision_token_expired/,
  );
});

test("verifiable intent normalizes stablecoin payment context", () => {
  const result = buildVerifiableIntent({
    evaluatedAt: "2026-07-03T13:00:00.000Z",
    input: {
      request_id: "req-1",
      session_id: "sess-1",
      agent_id: "agent-1",
      purpose: "api_purchase",
      pay_to: "0x1111111111111111111111111111111111111111",
      amount_usdc: "0.025",
      invoice_id: "inv-1",
      nonce: "nonce-123456",
      expires_at: "2026-07-03T13:05:00.000Z",
    },
  });

  assert.equal(result.valid, true);
  assert.equal(result.normalized_intent.chain, "eip155:8453");
  assert.equal(result.normalized_intent.amount_atomic, 25_000);
  assert.equal(result.normalized_intent.amount_usdc, "0.025");
});

test("agent payment authorization allows safe intents and signs only directives", async () => {
  const result = await buildAgentPaymentAuthorization({
    signingSecret: "test-signing-secret",
    evaluatedAt: "2026-07-03T13:00:00.000Z",
    input: {
      request_id: "req-allow",
      agent_id: "agent-1",
      purpose: "api_purchase",
      pay_to: "0x1111111111111111111111111111111111111111",
      amount_usdc: "0.025",
      invoice_id: "inv-allow",
      nonce: "nonce-allow-123",
      expires_at: "2026-07-03T13:05:00.000Z",
      max_single_usdc: "0.10",
      human_review_above_usdc: "0.09",
      risk: { score: 8, labels: ["known-merchant"] },
    },
  });

  assert.equal(result.decision, "allow");
  assert.equal(result.signing_directive, "sign_with_policy_controlled_key");
  assert.ok(result.authorization_token);
  assert.equal(result.next_action.includes("never disclose private keys"), true);
});

test("agent payment authorization denies blocked or high-risk recipients", async () => {
  const result = await buildAgentPaymentAuthorization({
    evaluatedAt: "2026-07-03T13:00:00.000Z",
    input: {
      request_id: "req-deny",
      agent_id: "agent-1",
      purpose: "api_purchase",
      pay_to: "0x2222222222222222222222222222222222222222",
      amount_usdc: "0.025",
      invoice_id: "inv-deny",
      nonce: "nonce-deny-123",
      expires_at: "2026-07-03T13:05:00.000Z",
      block_pay_to: "0x2222222222222222222222222222222222222222",
      risk: { score: 92, labels: ["drainer"], drainer: true },
    },
  });

  assert.equal(result.decision, "deny");
  assert.equal(result.signing_directive, "do_not_sign");
  assert.ok(result.reasons.some(reason => reason.code === "RECIPIENT_BLOCKED"));
  assert.ok(
    result.reasons.some(reason => reason.code === "KNOWN_ABUSE_INFRASTRUCTURE"),
  );
});

test("agent payment authorization reviews medium risk or review-threshold intents", async () => {
  const result = await buildAgentPaymentAuthorization({
    evaluatedAt: "2026-07-03T13:00:00.000Z",
    input: {
      request_id: "req-review",
      agent_id: "agent-1",
      purpose: "api_purchase",
      pay_to: "0x3333333333333333333333333333333333333333",
      amount_usdc: "0.08",
      invoice_id: "inv-review",
      nonce: "nonce-review-123",
      expires_at: "2026-07-03T13:05:00.000Z",
      max_single_usdc: "0.10",
      human_review_above_usdc: "0.05",
      risk: { score: 42, labels: ["new-counterparty"] },
    },
  });

  assert.equal(result.decision, "review");
  assert.equal(result.signing_directive, "hold_for_human_review");
  assert.ok(
    result.reasons.some(reason => reason.code === "HUMAN_APPROVAL_REQUIRED"),
  );
});

test("payment guard enforces mandates and simulates Base transactions", async () => {
  const mandate = await buildPaymentGuardDecision({
    targetUrl: "https://blocked.example/resource",
    sessionId: "session-mandate",
    requestId: "request-mandate",
    endpoint: {
      url: "https://blocked.example/resource",
      assessment: { risk_score: 0, flags: [] },
      x402: {
        accepts: [
          {
            scheme: "exact",
            network: "eip155:8453",
            asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            pay_to: "0x1111111111111111111111111111111111111111",
            amount_atomic: "5000",
          },
        ],
      },
    },
    merchant: { assessment: { risk_score: 0, flags: [] } },
    domain: { assessment: { risk_score: 0, flags: [] } },
    history: {},
    policy: {
      maxSingleAtomic: 100_000,
      sessionBudgetAtomic: 1_000_000,
      dailyBudgetAtomic: 5_000_000,
      allowPayTo: [],
      blockPayTo: [],
      allowedDomains: ["allowed.example"],
      allowedTools: ["browser"],
      allowedPurposes: ["research"],
      activeFromHourUtc: 0,
      activeUntilHourUtc: 24,
      failClosed: true,
    },
    toolId: "browser",
    purpose: "research",
  });
  assert.equal(mandate.decision, "BLOCK");
  assert.ok(
    mandate.reasons.some(reason => reason.code === "MANDATE_DOMAIN_VIOLATION"),
  );

  const responses = [
    new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x" }), {
      headers: { "content-type": "application/json" },
    }),
    new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x5208" }), {
      headers: { "content-type": "application/json" },
    }),
  ];
  const simulation = await simulateBaseTransaction(
    "0x1111111111111111111111111111111111111111",
    "0x",
    "0",
    null,
    async () => responses.shift(),
  );
  assert.equal(simulation.success, true);
  assert.equal(simulation.estimated_gas, 21000);
});

test("buildSumsubEvidenceServiceResponse returns fail-closed evidence contract", () => {
  const result = buildSumsubEvidenceServiceResponse({
    productId: "sumsub-kyt-evidence",
    input: {
      transaction_id: "tx_demo_001",
      asset: "USDC",
      chain: "base",
    },
    fetchedAt: "2026-07-16T00:00:00.000Z",
  });

  assert.equal(result.provider, "sumsub");
  assert.equal(result.service.id, "sumsub.kyt");
  assert.equal(result.service.enabled, true);
  assert.equal(result.decision_support, "EVIDENCE_READY");
  assert.equal(result.evidence.evidence_digest_ready, true);
  assert.equal(result.evidence.demo_result.production_signing, false);

  const missing = buildSumsubEvidenceServiceResponse({
    productId: "sumsub-watchlist-aml-evidence",
    input: {},
    fetchedAt: "2026-07-16T00:00:00.000Z",
  });
  assert.equal(missing.decision_support, "REQUIRE_APPROVAL");
  assert.ok(
    missing.reason_codes.includes("SUMSUB_REQUIRED_INPUT_MISSING_APPLICANT_ID"),
  );
});

test("paid routes advertise their exact Base USDC prices", async () => {
  const cases = [
    [
      "/v1/x402/base/address-preflight?address=0x94F751f04b98507D31b500b7Ed50bE68A1514873",
      "75000",
    ],
    [
      "/v1/x402/base/token-preflight?token=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "75000",
    ],
    [
      "/v1/x402/base/merchant-trust?address=0x94F751f04b98507D31b500b7Ed50bE68A1514873",
      "100000",
    ],
    [
      "/v1/x402/base/payment-proof?tx=0xb2d1308a0df026083e5793106af4ed2342d4b517d42935e05c1fb2f91544707f&recipient=0x94F751f04b98507D31b500b7Ed50bE68A1514873&amount=0.02",
      "30000",
    ],
    [
      "/v1/x402/base/wallet-activity-delta?address=0x94F751f04b98507D31b500b7Ed50bE68A1514873&since=2026-06-21T00%3A00%3A00Z",
      "30000",
    ],
    [
      "/v1/x402/base/approval-risk?token=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&owner=0x94F751f04b98507D31b500b7Ed50bE68A1514873&spender=0x94F751f04b98507D31b500b7Ed50bE68A1514873",
      "5000",
    ],
    [
      "/v1/x402/base/contract-verification?address=0x4200000000000000000000000000000000000006",
      "5000",
    ],
    [
      "/v1/x402/base/usdc-receipt?tx=0xb2d1308a0df026083e5793106af4ed2342d4b517d42935e05c1fb2f91544707f",
      "3000",
    ],
    [
      "/v1/x402/base/wallet-counterparty?address=0x94F751f04b98507D31b500b7Ed50bE68A1514873",
      "20000",
    ],
    [
      "/v1/x402/base/event-log-monitor?address=0x4200000000000000000000000000000000000006&from_block=47600000",
      "3000",
    ],
    ["/v1/x402/base/gas-fee-quote?gas_limit=21000", "3000"],
    [
      "/v1/x402/base/nonce-readiness?address=0x94F751f04b98507D31b500b7Ed50bE68A1514873",
      "3000",
    ],
    [
      "/v1/x402/base/stablecoin-balance?address=0x94F751f04b98507D31b500b7Ed50bE68A1514873",
      "3000",
    ],
    [
      "/v1/x402/base/dex-market-monitor?token=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "5000",
    ],
    [
      "/v1/x402/prediction/market-snapshot?ticker=KXWCFIRSTGOAL-26JUN21ESPKSA-ESPLYAMAL10",
      "5000",
    ],
    [
      "/v1/x402/web/endpoint-preflight?url=https%3A%2F%2Fx402.twit.sh%2Ftweets%2Fby%2Fid%3Fid%3D1110302988",
      "15000",
    ],
    [
      "/v1/x402/software/npm-package-preflight?package=express&version=4.18.2",
      "15000",
    ],
    [
      "/v1/x402/software/github-repository-health?owner=cloudflare&repo=workers-sdk",
      "20000",
    ],
    [
      "/v1/x402/web/url-change-fingerprint?url=https%3A%2F%2Fwww.cloudflare.com%2F",
      "3000",
    ],
    [
      "/v1/x402/web/feed-snapshot?url=https%3A%2F%2Fgithub.com%2Fcloudflare%2Fworkers-sdk%2Freleases.atom",
      "3000",
    ],
    [
      "/v1/x402/base/transaction-intent?to=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&data=0x095ea7b300000000000000000000000094f751f04b98507d31b500b7ed50be68a1514873ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff&value=0",
      "5000",
    ],
    [
      "/v1/x402/agent/a2a-card-preflight?url=https%3A%2F%2Fbase-agent-preflight.bytoken2023.workers.dev",
      "20000",
    ],
    [
      "/v1/x402/web/openapi-preflight?url=https%3A%2F%2Fbase-agent-preflight.bytoken2023.workers.dev%2Fopenapi.json",
      "15000",
    ],
    [
      "/v1/x402/web/domain-trust-preflight?domain=github.com",
      "15000",
    ],
    [
      "/v1/x402/agent/capability-security-preflight?target_type=agent&identifier=demo&agent_card_url=https%3A%2F%2Fbase-agent-preflight.bytoken2023.workers.dev&github_owner=cloudflare&github_repo=workers-sdk&npm_package=express&domain=github.com&openapi_url=https%3A%2F%2Fbase-agent-preflight.bytoken2023.workers.dev%2Fopenapi.json&x402_url=https%3A%2F%2Fbase-agent-preflight.bytoken2023.workers.dev%2Fv1%2Fx402%2Fbase%2Falpha-risk",
      "100000",
    ],
    [
      "/v1/x402/software/pypi-package-preflight?package=requests&version=latest",
      "5000",
    ],
    [
      "/v1/x402/payment-guard/evaluate?url=https%3A%2F%2Fx402.twit.sh%2Ftweets%2Fby%2Fid%3Fid%3D1110302988&session_id=demo-session&request_id=demo-request-1&max_single_usdc=0.10&session_budget_usdc=1.00&daily_budget_usdc=5.00",
      "100000",
    ],
    [
      "/v1/x402/base/alpha-risk?subject=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&kind=token",
      "3000",
    ],
    [
      "/v1/x402/base/token-alpha-snapshot?token=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "3000",
    ],
    [
      "/v1/x402/base/wallet-copytrade-risk?address=0x94F751f04b98507D31b500b7Ed50bE68A1514873",
      "3000",
    ],
    [
      "/v1/x402/base/new-pool-risk?token=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "3000",
    ],
    [
      "/v1/x402/x402/origin-due-diligence?server_url=https%3A%2F%2Fwww.x402scan.com%2Fserver%2Fb0ce6f4e-73e9-431d-b23c-814ac89cc77b&seller=0x94F751f04b98507D31b500b7Ed50bE68A1514873",
      "10000",
    ],
    [
      "/v1/x402/x402/resource-compare?resources=https%3A%2F%2Fbase-agent-preflight.bytoken2023.workers.dev%2Fv1%2Fx402%2Fbase%2Falpha-risk%2Chttps%3A%2F%2Fbase-agent-preflight.bytoken2023.workers.dev%2Fv1%2Fx402%2Fbase%2Ftoken-alpha-snapshot&budget_usdc=0.02",
      "10000",
    ],
    [
      "/v1/x402/agent/spend-route-plan?task=screen%20a%20Base%20token%20before%20buying&budget_usdc=0.02&risk_tolerance=medium",
      "50000",
    ],
    [
      "/v1/x402/agent/payment-risk-gateway?request_id=demo-request-1&agent_id=demo-agent&purpose=api_purchase&pay_to=0x94F751f04b98507D31b500b7Ed50bE68A1514873&amount_usdc=0.025&invoice_id=demo-invoice&nonce=demo-nonce-123&max_single_usdc=0.10&human_review_above_usdc=0.09&risk_score=5",
      "150000",
    ],
    [
      "/v1/x402/agent/rpc-preflight?endpoint_url=https%3A%2F%2Fx402.example.com%2Frpc%2Fbase&chain=base&method=eth_blockNumber&max_price_usdc=0.001&session_budget_usdc=1.00",
      "5000",
    ],
    [
      "/v1/x402/chain/rpc-capability-probe?chain=ethereum&methods=eth_blockNumber%2Ceth_getLogs%2Ceth_getStorageAt&historical_block=17000000&requires_trace=false&requires_websocket=false",
      "5000",
    ],
    [
      "/v1/x402/agent/chain-data-route-plan?task=investigate%20Base%20logs%20before%20payment&chain=base&data_need=logs&budget_usdc=0.02&risk_tolerance=medium",
      "5000",
    ],
    [
      "/v1/x402/chain/indexed-query-preflight?chain=base&query_type=event_logs&estimated_rows=5000&max_price_usdc=0.02",
      "5000",
    ],
    [
      "/v1/x402/agent/rpc-payment-guard?request_id=rpc-request-1&endpoint_url=https%3A%2F%2Fx402.example.com%2Frpc%2Fbase&chain=base&method=eth_getLogs&pay_to=0x94F751f04b98507D31b500b7Ed50bE68A1514873&amount_usdc=0.001&max_single_usdc=0.01&session_budget_usdc=1.00",
      "100000",
    ],
    [
      "/v1/x402/base/token-exit-risk?token=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "3000",
    ],
  ];

  for (const [path, amount] of cases) {
    const response = await worker.fetch(
      new Request(`https://example.test${path}`),
      {},
    );
    assert.equal(response.status, 402);
    const header =
      response.headers.get("payment-required") ??
      response.headers.get("x-payment-required");
    assert.ok(header);
    const requirement = JSON.parse(
      Buffer.from(header, "base64").toString("utf8"),
    );
    assert.equal(requirement.accepts[0].amount, amount);
    assert.equal(requirement.accepts[0].network, "eip155:8453");
  }
});

test("payment guard POST routes advertise bazaar input and output schemas", async () => {
  for (const path of [
    "/v1/x402/payment-guard/evaluate",
    "/v1/x402/payment-guard/policies",
  ]) {
    const response = await worker.fetch(
      new Request(`https://example.test${path}`, { method: "POST" }),
      {},
    );
    assert.equal(response.status, 402);
    const header =
      response.headers.get("payment-required") ??
      response.headers.get("x-payment-required");
    assert.ok(header);
    const requirement = JSON.parse(
      Buffer.from(header, "base64").toString("utf8"),
    );
    const bazaar = requirement.extensions?.bazaar;
    assert.ok(bazaar);
    assert.equal(bazaar.info.input.method, "POST");
    assert.equal(bazaar.info.input.bodyType, "json");
    assert.ok(bazaar.schema.properties.input);
    assert.ok(bazaar.schema.properties.output);
  }
});

test("agent capability security bundle keeps pass warn fail and unavailable evidence explicit", () => {
  const allow = buildAgentCapabilitySecurityPreflight({
    target: { type: "agent", identifier: "agent-ok" },
    generatedAt: "2026-07-20T00:00:00.000Z",
    checks: [
      { check: "agent_card", status: "pass", reason_codes: ["AGENT_CARD_OK"] },
      { check: "github_repository_health", status: "pass", reason_codes: ["REPO_OK"] },
      { check: "npm_package_preflight", status: "pass", reason_codes: ["NPM_OK"] },
      { check: "domain_trust", status: "pass", reason_codes: ["DOMAIN_OK"] },
      { check: "openapi_spec", status: "pass", reason_codes: ["OPENAPI_OK"] },
      { check: "x402_endpoint", status: "pass", reason_codes: ["X402_OK"] },
    ],
  });
  assert.equal(allow.decision, "ALLOW");
  assert.equal(allow.pricing_version, "x402-pricing-v1-20260720");
  assert.equal(allow.summary.passed, 6);

  const review = buildAgentCapabilitySecurityPreflight({
    target: { type: "api", identifier: "api-review" },
    checks: [
      { check: "agent_card", status: "pass", reason_codes: ["AGENT_CARD_OK"] },
      {
        check: "github_repository_health",
        status: "warn",
        reason_codes: ["STALE_REPOSITORY"],
        evidence: { risk_level: "medium" },
      },
      {
        check: "openapi_spec",
        status: "unavailable",
        reason_codes: ["OPENAPI_URL_MISSING"],
      },
    ],
  });
  assert.equal(review.decision, "REVIEW");
  assert.equal(review.summary.warned, 1);
  assert.equal(review.summary.unavailable, 1);
  assert.ok(review.reason_codes.includes("OPENAPI_URL_MISSING"));

  const deny = buildAgentCapabilitySecurityPreflight({
    target: { type: "package", identifier: "bad-package" },
    checks: [
      {
        check: "npm_package_preflight",
        status: "fail",
        reason_codes: ["KNOWN_OSV_VULNERABILITIES"],
        evidence: { risk_level: "high", secret: undefined },
      },
    ],
  });
  assert.equal(deny.decision, "DENY");
  assert.equal(deny.summary.failed, 1);
  assert.equal(JSON.stringify(deny), JSON.stringify(deny).replace(/bearer|api[_-]?key|authorization/i, ""));
});

test("admin purchases accepts fixed query token links and redirects browser users to login", async () => {
  const purchaseDb = {
    prepare() {
      return {
        bind() {
          return this;
        },
        async first() {
          return {};
        },
        async all() {
          return { results: [] };
        },
      };
    },
  };
  const response = await worker.fetch(
    new Request("https://example.test/admin/purchases?token=current-secret"),
    { ADMIN_DASHBOARD_TOKEN_V2: "current-secret", GUARD_DB: purchaseDb },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);

  const redirectResponse = await worker.fetch(
    new Request("https://example.test/admin/purchases"),
    { ADMIN_DASHBOARD_TOKEN_V2: "current-secret", GUARD_DB: purchaseDb },
  );
  assert.equal(redirectResponse.status, 303);
  assert.equal(redirectResponse.headers.get("location"), "/admin/login");

  const apiResponse = await worker.fetch(
    new Request("https://example.test/admin/purchases.json"),
    { ADMIN_DASHBOARD_TOKEN_V2: "current-secret" },
  );
  assert.equal(apiResponse.status, 401);
  assert.equal((await apiResponse.json()).error, "admin_unauthorized");
});
