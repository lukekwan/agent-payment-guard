import test from "node:test";
import assert from "node:assert/strict";

import worker, {
  buildApprovalRisk,
  buildAddressPreflight,
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
  buildStablecoinBalance,
  buildTokenPreflight,
  buildTransactionIntent,
  buildUsdcReceipt,
  buildWalletActivityDelta,
  buildWalletCounterparty,
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
  assert.ok(document.paths["/v1/x402/payment-guard/evaluate"]);

  const card = await worker.fetch(
    new Request("https://example.test/.well-known/agent-card.json"),
  );
  assert.equal((await card.json()).skills.length, 26);

  const verify = await worker.fetch(
    new Request("https://example.test/verify"),
  );
  assert.equal(verify.status, 200);
  assert.match(await verify.text(), /Deployment Verification/);
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

test("twenty-six paid routes advertise their exact Base USDC prices", async () => {
  const cases = [
    [
      "/v1/x402/base/address-preflight?address=0x94F751f04b98507D31b500b7Ed50bE68A1514873",
      "20000",
    ],
    [
      "/v1/x402/base/token-preflight?token=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "20000",
    ],
    [
      "/v1/x402/base/merchant-trust?address=0x94F751f04b98507D31b500b7Ed50bE68A1514873",
      "30000",
    ],
    [
      "/v1/x402/base/payment-proof?tx=0xb2d1308a0df026083e5793106af4ed2342d4b517d42935e05c1fb2f91544707f&recipient=0x94F751f04b98507D31b500b7Ed50bE68A1514873&amount=0.02",
      "10000",
    ],
    [
      "/v1/x402/base/wallet-activity-delta?address=0x94F751f04b98507D31b500b7Ed50bE68A1514873&since=2026-06-21T00%3A00%3A00Z",
      "10000",
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
      "5000",
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
      "5000",
    ],
    [
      "/v1/x402/software/npm-package-preflight?package=express&version=4.18.2",
      "5000",
    ],
    [
      "/v1/x402/software/github-repository-health?owner=cloudflare&repo=workers-sdk",
      "5000",
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
      "5000",
    ],
    [
      "/v1/x402/web/openapi-preflight?url=https%3A%2F%2Fbase-agent-preflight.bytoken2023.workers.dev%2Fopenapi.json",
      "5000",
    ],
    [
      "/v1/x402/web/domain-trust-preflight?domain=github.com",
      "5000",
    ],
    [
      "/v1/x402/software/pypi-package-preflight?package=requests&version=latest",
      "5000",
    ],
    [
      "/v1/x402/payment-guard/evaluate?url=https%3A%2F%2Fx402.twit.sh%2Ftweets%2Fby%2Fid%3Fid%3D1110302988&session_id=demo-session&request_id=demo-request-1&max_single_usdc=0.10&session_budget_usdc=1.00&daily_budget_usdc=5.00",
      "10000",
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
