import {
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { paymentMiddlewareFromHTTPServer } from "@x402/hono";
import { Hono } from "hono";
import { parse as parseYaml } from "yaml";

const BASE_MAINNET = "eip155:8453";
const BLOCKSCOUT = "https://base.blockscout.com";
const BASE_RPCS = [
  "https://base.blockscout.com/api/eth-rpc",
  "https://mainnet.base.org",
  "https://base-rpc.publicnode.com",
];
const FACILITATOR = "https://facilitator.payai.network";
const SERVICE_ORIGIN =
  "https://base-agent-preflight.bytoken2023.workers.dev";
const SERVICE_ICON = `${SERVICE_ORIGIN}/icon.svg`;
const STATIC_FACILITATOR_SUPPORT = {
  kinds: [{ x402Version: 2, scheme: "exact", network: BASE_MAINNET }],
  extensions: [
    "bazaar",
    "eip2612GasSponsoring",
    "erc20ApprovalGasSponsoring",
  ],
  signers: {},
};
const PAY_TO = "0x94F751f04b98507D31b500b7Ed50bE68A1514873";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const STABLECOINS = [
  { symbol: "USDC", address: USDC, decimals: 6 },
  {
    symbol: "USDT",
    address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    decimals: 6,
  },
  {
    symbol: "DAI",
    address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    decimals: 18,
  },
];
const KALSHI = "https://external-api.kalshi.com/trade-api/v2";
const PRODUCTS = [
  {
    id: "base-address-preflight",
    path: "/v1/x402/base/address-preflight",
    price: "$0.02",
    description:
      "Inspect a Base address before an autonomous payment or contract interaction.",
    input: {
      address: "0x94F751f04b98507D31b500b7Ed50bE68A1514873",
    },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base address to inspect before an autonomous payment.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-token-preflight",
    path: "/v1/x402/base/token-preflight",
    price: "$0.02",
    description:
      "Inspect a Base token contract, public reputation, holder count, and DEX liquidity before trading.",
    input: { token: USDC },
    inputSchema: {
      properties: {
        token: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base ERC-20 token contract to inspect.",
        },
      },
      required: ["token"],
    },
  },
  {
    id: "x402-merchant-trust",
    path: "/v1/x402/base/merchant-trust",
    price: "$0.03",
    description:
      "Summarize a Base merchant's public USDC receipt history and payer concentration.",
    input: { address: PAY_TO },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base merchant payment recipient address.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-payment-proof",
    path: "/v1/x402/base/payment-proof",
    price: "$0.01",
    description:
      "Verify a Base transaction contains the expected canonical USDC payment.",
    input: {
      tx: "0xb2d1308a0df026083e5793106af4ed2342d4b517d42935e05c1fb2f91544707f",
      recipient: PAY_TO,
      amount: "0.02",
    },
    inputSchema: {
      properties: {
        tx: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{64}$",
          description: "Base transaction hash.",
        },
        recipient: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Expected USDC recipient.",
        },
        amount: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Expected USDC amount in decimal units.",
        },
      },
      required: ["tx", "recipient", "amount"],
    },
  },
  {
    id: "base-wallet-activity-delta",
    path: "/v1/x402/base/wallet-activity-delta",
    price: "$0.01",
    description:
      "Return recent Base ERC-20 activity for a wallet after a caller-supplied timestamp.",
    input: {
      address: PAY_TO,
      since: "2026-06-21T00:00:00Z",
    },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base wallet to monitor.",
        },
        since: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}T.+Z$",
          description: "Return transfers observed at or after this timestamp.",
        },
      },
      required: ["address", "since"],
    },
  },
  {
    id: "base-approval-risk",
    path: "/v1/x402/base/approval-risk",
    price: "$0.005",
    description:
      "Read a live ERC-20 allowance on Base and flag unlimited or unusually large approvals.",
    input: { token: USDC, owner: PAY_TO, spender: PAY_TO },
    inputSchema: {
      properties: {
        token: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "ERC-20 token contract.",
        },
        owner: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Token owner that granted the allowance.",
        },
        spender: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Address authorized to spend the owner's tokens.",
        },
      },
      required: ["token", "owner", "spender"],
    },
  },
  {
    id: "base-contract-verification",
    path: "/v1/x402/base/contract-verification",
    price: "$0.005",
    description:
      "Inspect Base source verification, compiler metadata, proxy type, and resolved implementations.",
    input: { address: "0x4200000000000000000000000000000000000006" },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base contract address to verify.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-usdc-receipt",
    path: "/v1/x402/base/usdc-receipt",
    price: "$0.003",
    description:
      "Extract canonical Base USDC transfers and transaction finality from a transaction hash.",
    input: {
      tx: "0xb2d1308a0df026083e5793106af4ed2342d4b517d42935e05c1fb2f91544707f",
    },
    inputSchema: {
      properties: {
        tx: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{64}$",
          description: "Base transaction hash.",
        },
      },
      required: ["tx"],
    },
  },
  {
    id: "base-wallet-counterparty",
    path: "/v1/x402/base/wallet-counterparty",
    price: "$0.005",
    description:
      "Rank counterparties in a Base wallet's recent transactions and ERC-20 transfers.",
    input: { address: PAY_TO },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base wallet or contract to analyze.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-event-log-monitor",
    path: "/v1/x402/base/event-log-monitor",
    price: "$0.003",
    description:
      "Return recent decoded Base event logs at or after a caller-supplied block.",
    input: {
      address: "0x4200000000000000000000000000000000000006",
      from_block: "47600000",
    },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base address whose emitted logs should be monitored.",
        },
        from_block: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Return logs from this Base block onward.",
        },
      },
      required: ["address", "from_block"],
    },
  },
  {
    id: "base-gas-fee-quote",
    path: "/v1/x402/base/gas-fee-quote",
    price: "$0.003",
    description:
      "Return live Base gas fees and an estimated transaction cost for a caller-supplied gas limit.",
    input: { gas_limit: "21000" },
    inputSchema: {
      properties: {
        gas_limit: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Expected transaction gas limit.",
        },
      },
      required: ["gas_limit"],
    },
  },
  {
    id: "base-nonce-readiness",
    path: "/v1/x402/base/nonce-readiness",
    price: "$0.003",
    description:
      "Compare confirmed and pending Base nonces before an autonomous transaction is signed.",
    input: { address: PAY_TO },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base account whose transaction nonce should be checked.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-stablecoin-balance",
    path: "/v1/x402/base/stablecoin-balance",
    price: "$0.003",
    description:
      "Return live Base USDC, USDT, and DAI balances with public USD reference rates.",
    input: { address: PAY_TO },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base wallet or contract whose stablecoin balances should be read.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-dex-market-monitor",
    path: "/v1/x402/base/dex-market-monitor",
    price: "$0.005",
    description:
      "Monitor Base DEX price, liquidity, volume, and trade activity for a token.",
    input: { token: USDC },
    inputSchema: {
      properties: {
        token: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base token contract to monitor across DEX pairs.",
        },
      },
      required: ["token"],
    },
  },
  {
    id: "prediction-market-snapshot",
    path: "/v1/x402/prediction/market-snapshot",
    price: "$0.005",
    description:
      "Return a public Kalshi prediction-market quote, volume, open interest, and orderbook snapshot.",
    input: { ticker: "KXWCFIRSTGOAL-26JUN21ESPKSA-ESPLYAMAL10" },
    inputSchema: {
      properties: {
        ticker: {
          type: "string",
          pattern: "^[A-Za-z0-9._-]{3,160}$",
          description: "Kalshi market ticker.",
        },
      },
      required: ["ticker"],
    },
  },
  {
    id: "x402-endpoint-preflight",
    path: "/v1/x402/web/endpoint-preflight",
    price: "$0.005",
    description:
      "Inspect an unpaid x402 endpoint, decode its payment requirements, and flag unsafe or malformed commerce metadata.",
    input: {
      url: "https://x402.twit.sh/tweets/by/id?id=1110302988",
    },
    inputSchema: {
      properties: {
        url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public HTTP(S) x402 resource URL to inspect without paying.",
        },
      },
      required: ["url"],
    },
  },
  {
    id: "npm-package-preflight",
    path: "/v1/x402/software/npm-package-preflight",
    price: "$0.005",
    description:
      "Check npm package metadata, maintenance signals, deprecation, license, dependencies, and OSV vulnerabilities.",
    input: { package: "express", version: "4.18.2" },
    inputSchema: {
      properties: {
        package: {
          type: "string",
          minLength: 1,
          maxLength: 214,
          description: "npm package name, including an optional scope.",
        },
        version: {
          type: "string",
          minLength: 1,
          maxLength: 80,
          description: "Exact npm version or latest. Defaults to latest.",
        },
      },
      required: ["package"],
    },
  },
  {
    id: "github-repository-health",
    path: "/v1/x402/software/github-repository-health",
    price: "$0.005",
    description:
      "Score a public GitHub repository using maintenance, release, license, archive, issue, and popularity signals.",
    input: { owner: "cloudflare", repo: "workers-sdk" },
    inputSchema: {
      properties: {
        owner: {
          type: "string",
          pattern: "^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$",
          description: "GitHub repository owner or organization.",
        },
        repo: {
          type: "string",
          pattern: "^[A-Za-z0-9._-]{1,100}$",
          description: "Public GitHub repository name.",
        },
      },
      required: ["owner", "repo"],
    },
  },
  {
    id: "url-change-fingerprint",
    path: "/v1/x402/web/url-change-fingerprint",
    price: "$0.003",
    description:
      "Fetch a public URL and return redirect, metadata, cache validators, and a SHA-256 content fingerprint.",
    input: { url: "https://www.cloudflare.com/" },
    inputSchema: {
      properties: {
        url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public HTTP(S) document URL to fingerprint.",
        },
      },
      required: ["url"],
    },
  },
  {
    id: "feed-snapshot",
    path: "/v1/x402/web/feed-snapshot",
    price: "$0.003",
    description:
      "Normalize the latest entries from a public RSS or Atom feed with stable item fingerprints.",
    input: { url: "https://github.com/cloudflare/workers-sdk/releases.atom" },
    inputSchema: {
      properties: {
        url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public RSS or Atom feed URL.",
        },
      },
      required: ["url"],
    },
  },
  {
    id: "evm-transaction-intent",
    path: "/v1/x402/base/transaction-intent",
    price: "$0.005",
    description:
      "Decode Base transaction calldata before signing and flag token transfers, approvals, unlimited spending, and unknown selectors.",
    input: {
      to: USDC,
      data:
        "0x095ea7b300000000000000000000000094f751f04b98507d31b500b7ed50be68a1514873ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      value: "0",
    },
    inputSchema: {
      properties: {
        to: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base destination contract or account.",
        },
        data: {
          type: "string",
          pattern: "^0x(?:[a-fA-F0-9]{2})*$",
          maxLength: 8194,
          description: "Hex-encoded EVM calldata.",
        },
        value: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Native ETH value in wei. Defaults to zero.",
        },
      },
      required: ["to", "data"],
    },
  },
  {
    id: "a2a-agent-card-preflight",
    path: "/v1/x402/agent/a2a-card-preflight",
    price: "$0.005",
    description:
      "Discover and validate a public A2A Agent Card, its skills, provider, authentication, endpoint consistency, and unsafe URLs.",
    input: {
      url: "https://base-agent-preflight.bytoken2023.workers.dev",
    },
    inputSchema: {
      properties: {
        url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public agent origin or direct Agent Card URL.",
        },
      },
      required: ["url"],
    },
  },
  {
    id: "openapi-spec-preflight",
    path: "/v1/x402/web/openapi-preflight",
    price: "$0.005",
    description:
      "Validate a public OpenAPI JSON or YAML document, server URLs, authentication declarations, operation coverage, and content fingerprint.",
    input: {
      url: "https://base-agent-preflight.bytoken2023.workers.dev/openapi.json",
    },
    inputSchema: {
      properties: {
        url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public OpenAPI JSON or YAML document URL.",
        },
      },
      required: ["url"],
    },
  },
  {
    id: "domain-trust-preflight",
    path: "/v1/x402/web/domain-trust-preflight",
    price: "$0.005",
    description:
      "Inspect public DNS, DNSSEC, mail, CNAME resolution, RDAP registration age, expiration, and domain trust signals.",
    input: { domain: "github.com" },
    inputSchema: {
      properties: {
        domain: {
          type: "string",
          pattern:
            "^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,63}$",
          description: "Registrable or delegated public DNS domain name.",
        },
      },
      required: ["domain"],
    },
  },
  {
    id: "pypi-package-preflight",
    path: "/v1/x402/software/pypi-package-preflight",
    price: "$0.005",
    description:
      "Check PyPI package metadata, release age, yanked status, Python requirements, dependencies, license, and OSV vulnerabilities.",
    input: { package: "requests", version: "latest" },
    inputSchema: {
      properties: {
        package: {
          type: "string",
          pattern: "^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,198}[A-Za-z0-9])?$",
          description: "PyPI project name.",
        },
        version: {
          type: "string",
          pattern: "^(?:latest|[A-Za-z0-9][A-Za-z0-9._+!-]{0,99})$",
          description: "Exact PyPI version or latest. Defaults to latest.",
        },
      },
      required: ["package"],
    },
  },
  {
    id: "agent-payment-guard",
    path: "/v1/x402/payment-guard/evaluate",
    price: "$0.01",
    description:
      "AI agent x402 payment firewall: enforce budgets and mandates, simulate transactions, score merchant and domain risk, prevent replay, require human approval, and audit delivery before autonomous spending.",
    input: {
      url: "https://x402.twit.sh/tweets/by/id?id=1110302988",
      session_id: "demo-session",
      request_id: "demo-request-1",
      max_single_usdc: "0.10",
      session_budget_usdc: "1.00",
      daily_budget_usdc: "5.00",
    },
    inputSchema: {
      properties: {
        url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public x402 resource URL to evaluate before payment.",
        },
        session_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,96}$",
          description: "Caller-defined budget and audit scope.",
        },
        request_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Caller-defined idempotency key.",
        },
        max_single_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Maximum allowed price for one payment.",
        },
        session_budget_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Maximum reserved spend for this session.",
        },
        daily_budget_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Maximum reserved spend for this session in one UTC day.",
        },
        allow_pay_to: {
          type: "string",
          maxLength: 2048,
          description: "Optional comma-separated recipient allowlist.",
        },
        block_pay_to: {
          type: "string",
          maxLength: 2048,
          description: "Optional comma-separated recipient blocklist.",
        },
        to: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Optional transaction destination for intent decoding.",
        },
        data: {
          type: "string",
          pattern: "^0x(?:[a-fA-F0-9]{2})*$",
          maxLength: 8194,
          description: "Optional EVM calldata.",
        },
        value: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Optional native ETH value in wei.",
        },
      },
      required: ["url", "session_id", "request_id"],
    },
  },
];
const PAID_PATHS = new Set(PRODUCTS.map(product => product.path));
const PAYMENT_GUARD_POLICY_PATH = "/v1/x402/payment-guard/policies";
const PAYMENT_GUARD_POLICY_MANAGE_PATH =
  "/v1/payment-guard/policies/manage";
const PAYMENT_GUARD_LIFECYCLE_PATH = "/v1/payment-guard/lifecycle";
const PAYMENT_GUARD_STATUS_PATH = "/v1/payment-guard/status";
const PAYMENT_GUARD_APPROVAL_PATH = "/v1/payment-guard/approvals";
const PAYMENT_GUARD_DELIVERY_PATH = "/v1/payment-guard/delivery";
const PAYMENT_GUARD_WEBHOOK_PATH = "/v1/payment-guard/webhooks";
const PAYMENT_GUARD_MCP_PATH = "/mcp";
const PAYMENT_GUARD_PATHS = new Set([
  PAYMENT_GUARD_POLICY_PATH,
  PAYMENT_GUARD_POLICY_MANAGE_PATH,
  PAYMENT_GUARD_LIFECYCLE_PATH,
  PAYMENT_GUARD_STATUS_PATH,
  PAYMENT_GUARD_APPROVAL_PATH,
  PAYMENT_GUARD_DELIVERY_PATH,
  PAYMENT_GUARD_WEBHOOK_PATH,
  PAYMENT_GUARD_MCP_PATH,
]);
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const TX_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const UPSTREAM_TIMEOUT_MS = 10_000;

class ResilientFacilitatorClient {
  constructor(client) {
    this.client = client;
  }

  verify(paymentPayload, paymentRequirements) {
    return this.client.verify(paymentPayload, paymentRequirements);
  }

  settle(paymentPayload, paymentRequirements) {
    return this.client.settle(paymentPayload, paymentRequirements);
  }

  async getSupported() {
    try {
      return await this.client.getSupported();
    } catch (error) {
      console.warn(
        `Facilitator supported lookup failed; using Base exact fallback: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return STATIC_FACILITATOR_SUPPORT;
    }
  }
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=60" : "no-store",
      "access-control-allow-origin": "*",
      ...headers,
    },
  });
}

async function fetchJson(
  url,
  fetchImpl = fetch,
  timeoutMs = UPSTREAM_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        "user-agent": "BaseAgentPreflight/0.1",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Blockscout returned HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function rpcCall(method, params, fetchImpl = fetch) {
  const failures = [];
  for (const rpc of BASE_RPCS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const response = await fetchImpl(rpc, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "user-agent": "BaseAgentPreflight/0.3",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (payload.error) {
        throw new Error(payload.error.message ?? "request failed");
      }
      return payload.result;
    } catch (error) {
      failures.push(
        `${new URL(rpc).hostname}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`All Base RPC providers failed (${failures.join("; ")})`);
}

async function rpcBatchCall(calls, fetchImpl = fetch) {
  const failures = [];
  for (const rpc of BASE_RPCS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const response = await fetchImpl(rpc, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "user-agent": "BaseAgentPreflight/0.4",
        },
        body: JSON.stringify(
          calls.map((call, index) => ({
            jsonrpc: "2.0",
            id: index + 1,
            method: call.method,
            params: call.params,
          })),
        ),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error("invalid batch response");
      const ordered = [...payload].sort((a, b) => Number(a.id) - Number(b.id));
      const failed = ordered.find(item => item.error);
      if (failed) throw new Error(failed.error.message ?? "batch request failed");
      if (ordered.length !== calls.length) throw new Error("incomplete batch response");
      return ordered.map(item => item.result);
    } catch (error) {
      failures.push(
        `${new URL(rpc).hostname}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`All Base RPC batch providers failed (${failures.join("; ")})`);
}

function parseCount(value) {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function encodeAddressWord(address) {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function formatUnits(value, decimals) {
  const safeDecimals = Math.max(0, Math.min(Number(decimals ?? 0), 36));
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const raw = absolute.toString().padStart(safeDecimals + 1, "0");
  const whole = safeDecimals ? raw.slice(0, -safeDecimals) : raw;
  const fraction = safeDecimals
    ? raw.slice(-safeDecimals).replace(/0+$/, "")
    : "";
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function summarizeTransfer(item) {
  return {
    timestamp: item.timestamp ?? null,
    direction: item.to?.hash?.toLowerCase() === item._subject ? "in" : "out",
    from: item.from?.hash ?? null,
    to: item.to?.hash ?? null,
    token: {
      symbol: item.token?.symbol ?? null,
      name: item.token?.name ?? null,
      contract: item.token?.address_hash ?? null,
      reputation: item.token?.reputation ?? null,
    },
    amount_atomic: item.total?.value ?? null,
    decimals: Number(item.total?.decimals ?? item.token?.decimals ?? 0),
  };
}

export function buildAddressPreflight({
  address,
  profile,
  counters,
  transfers,
  fetchedAt = new Date().toISOString(),
}) {
  const normalized = address.toLowerCase();
  const recentTransfers = (transfers?.items ?? []).slice(0, 10).map(item =>
    summarizeTransfer({ ...item, _subject: normalized }),
  );
  const flags = [];
  let score = 0;

  if (profile.is_scam) {
    flags.push({
      code: "BLOCKSCOUT_SCAM_FLAG",
      severity: "critical",
      detail: "Blockscout marks this address as scam-associated.",
    });
    score += 90;
  }
  if (profile.reputation && profile.reputation !== "ok") {
    flags.push({
      code: "ADDRESS_REPUTATION_NOT_OK",
      severity: "high",
      detail: `Blockscout reputation is ${profile.reputation}.`,
    });
    score += 50;
  }
  if (profile.is_contract && !profile.is_verified) {
    flags.push({
      code: "UNVERIFIED_CONTRACT",
      severity: "medium",
      detail: "The address is a contract without verified source code.",
    });
    score += 20;
  }
  if (profile.proxy_type && !profile.implementations?.length) {
    flags.push({
      code: "UNRESOLVED_PROXY",
      severity: "medium",
      detail: `Proxy type ${profile.proxy_type} has no resolved implementation metadata.`,
    });
    score += 15;
  }

  const suspiciousTokens = recentTransfers.filter(transfer =>
    ["scam", "spam", "suspicious"].includes(
      String(transfer.token.reputation ?? "").toLowerCase(),
    ),
  );
  if (suspiciousTokens.length) {
    flags.push({
      code: "SUSPICIOUS_TOKEN_ACTIVITY",
      severity: "medium",
      detail: `${suspiciousTokens.length} recent token transfer(s) have adverse reputation metadata.`,
    });
    score += Math.min(30, suspiciousTokens.length * 10);
  }

  const transactionCount = parseCount(counters.transactions_count);
  const transferCount = parseCount(counters.token_transfers_count);
  if (transactionCount === 0 && transferCount === 0) {
    flags.push({
      code: "NO_OBSERVED_HISTORY",
      severity: "info",
      detail: "No transaction or token-transfer history is visible on Base.",
    });
    score += 5;
  }

  score = Math.min(score, 100);
  const riskLevel =
    score >= 70 ? "high" : score >= 15 ? "medium" : "low";

  return {
    product: "base-address-preflight",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address: profile.hash ?? address,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: riskLevel,
      risk_score: score,
      flags,
      decision_hint:
        riskLevel === "high"
          ? "Do not automate payment without independent review."
          : riskLevel === "medium"
            ? "Apply tighter payment limits and verify the counterparty."
            : "No major public warning was found; this is not a guarantee of safety.",
    },
    identity: {
      type: profile.is_contract ? "contract" : "eoa",
      is_contract: Boolean(profile.is_contract),
      is_verified_contract: Boolean(profile.is_verified),
      proxy_type: profile.proxy_type ?? null,
      implementations: profile.implementations ?? [],
      name: profile.name ?? null,
      reputation: profile.reputation ?? null,
      is_scam: Boolean(profile.is_scam),
    },
    activity: {
      transactions_count: transactionCount,
      token_transfers_count: transferCount,
      gas_usage_count: parseCount(counters.gas_usage_count),
      recent_token_transfers: recentTransfers,
    },
    provenance: {
      provider: "Blockscout Base",
      address_url: `${BLOCKSCOUT}/address/${address}`,
      api_endpoints: [
        `${BLOCKSCOUT}/api/v2/addresses/${address}`,
        `${BLOCKSCOUT}/api/v2/addresses/${address}/counters`,
        `${BLOCKSCOUT}/api/v2/addresses/${address}/token-transfers?type=ERC-20`,
      ],
    },
    limitations: [
      "Public-chain heuristics cannot prove ownership, intent, solvency, or future behavior.",
      "Absence of a warning is not evidence that an address is safe.",
      "Token spam can be sent to an address without the owner's participation.",
    ],
  };
}

export async function addressPreflight(address, fetchImpl = fetch) {
  const encoded = encodeURIComponent(address);
  const [profile, counters, transfers] = await Promise.all([
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}`, fetchImpl),
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}/counters`, fetchImpl),
    fetchJson(
      `${BLOCKSCOUT}/api/v2/addresses/${encoded}/token-transfers?type=ERC-20`,
      fetchImpl,
    ),
  ]);
  return buildAddressPreflight({ address, profile, counters, transfers });
}

export function buildTokenPreflight({
  token,
  profile,
  tokenInfo,
  dexPairs,
  fetchedAt = new Date().toISOString(),
}) {
  const basePairs = (dexPairs ?? [])
    .filter(pair => pair.chainId === "base")
    .sort(
      (a, b) =>
        Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0),
    );
  const bestPair = basePairs[0] ?? null;
  const liquidityUsd = Number(bestPair?.liquidity?.usd ?? 0);
  const holdersCount = parseCount(tokenInfo.holders_count);
  const flags = [];
  let score = 0;

  if (!profile.is_contract) {
    flags.push({
      code: "NOT_A_CONTRACT",
      severity: "critical",
      detail: "The supplied address is not identified as a contract.",
    });
    score += 90;
  }
  if (profile.is_scam || tokenInfo.reputation === "scam") {
    flags.push({
      code: "PUBLIC_SCAM_FLAG",
      severity: "critical",
      detail: "Public Blockscout metadata marks the token or contract as scam-associated.",
    });
    score += 90;
  }
  if (profile.is_contract && !profile.is_verified) {
    flags.push({
      code: "UNVERIFIED_TOKEN_CONTRACT",
      severity: "high",
      detail: "The token contract source code is not verified on Blockscout.",
    });
    score += 35;
  }
  if (
    tokenInfo.reputation &&
    !["ok", "neutral"].includes(String(tokenInfo.reputation).toLowerCase())
  ) {
    flags.push({
      code: "TOKEN_REPUTATION_NOT_OK",
      severity: "high",
      detail: `Token reputation is ${tokenInfo.reputation}.`,
    });
    score += 40;
  }
  if (holdersCount > 0 && holdersCount < 100) {
    flags.push({
      code: "LOW_HOLDER_COUNT",
      severity: "medium",
      detail: `Only ${holdersCount} holder(s) are reported.`,
    });
    score += 15;
  }
  if (!bestPair) {
    flags.push({
      code: "NO_BASE_DEX_PAIR",
      severity: "medium",
      detail: "DexScreener returned no Base liquidity pair for this token.",
    });
    score += 20;
  } else if (liquidityUsd < 10_000) {
    flags.push({
      code: "LOW_DEX_LIQUIDITY",
      severity: "medium",
      detail: `The deepest observed Base pair has about $${liquidityUsd.toFixed(2)} liquidity.`,
    });
    score += 20;
  }

  score = Math.min(score, 100);
  const riskLevel =
    score >= 70 ? "high" : score >= 25 ? "medium" : score > 0 ? "low" : "low";

  return {
    product: "base-token-preflight",
    schema_version: "1.0",
    network: BASE_MAINNET,
    token,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: riskLevel,
      risk_score: score,
      flags,
      decision_hint:
        riskLevel === "high"
          ? "Do not automate a trade without independent contract review."
          : riskLevel === "medium"
            ? "Use strict size and slippage limits and verify liquidity independently."
            : "No major public warning was found; token behavior is not guaranteed.",
    },
    contract: {
      is_contract: Boolean(profile.is_contract),
      is_verified: Boolean(profile.is_verified),
      is_scam: Boolean(profile.is_scam),
      proxy_type: profile.proxy_type ?? null,
      implementations: profile.implementations ?? [],
    },
    token_metadata: {
      name: tokenInfo.name ?? null,
      symbol: tokenInfo.symbol ?? null,
      type: tokenInfo.type ?? null,
      decimals: Number(tokenInfo.decimals ?? 0),
      holders_count: holdersCount,
      total_supply_atomic: tokenInfo.total_supply ?? null,
      reputation: tokenInfo.reputation ?? null,
      exchange_rate_usd: tokenInfo.exchange_rate ?? null,
    },
    dex_liquidity: {
      pair_count_on_base: basePairs.length,
      best_pair: bestPair
        ? {
            dex: bestPair.dexId ?? null,
            pair_address: bestPair.pairAddress ?? null,
            url: bestPair.url ?? null,
            liquidity_usd: liquidityUsd,
            price_usd: bestPair.priceUsd ?? null,
            volume_24h_usd: Number(bestPair.volume?.h24 ?? 0),
            buys_24h: Number(bestPair.txns?.h24?.buys ?? 0),
            sells_24h: Number(bestPair.txns?.h24?.sells ?? 0),
            pair_created_at: bestPair.pairCreatedAt
              ? new Date(bestPair.pairCreatedAt).toISOString()
              : null,
          }
        : null,
    },
    provenance: {
      blockscout_token_url: `${BLOCKSCOUT}/token/${token}`,
      dexscreener_url: `https://dexscreener.com/search?q=${token}`,
    },
    limitations: [
      "This check does not simulate buys or sells and cannot prove a token is not a honeypot.",
      "Holder count does not measure holder concentration.",
      "DEX liquidity and reputation metadata can change quickly.",
    ],
  };
}

export async function tokenPreflight(token, fetchImpl = fetch) {
  const encoded = encodeURIComponent(token);
  const [profile, tokenInfo, dex] = await Promise.all([
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}`, fetchImpl),
    fetchJson(`${BLOCKSCOUT}/api/v2/tokens/${encoded}`, fetchImpl),
    fetchJson(
      `https://api.dexscreener.com/latest/dex/tokens/${encoded}`,
      fetchImpl,
    ),
  ]);
  return buildTokenPreflight({
    token,
    profile,
    tokenInfo,
    dexPairs: dex.pairs ?? [],
  });
}

export function buildMerchantTrust({
  address,
  profile,
  counters,
  transfers,
  fetchedAt = new Date().toISOString(),
}) {
  const normalized = address.toLowerCase();
  const receipts = (transfers?.items ?? []).filter(
    item =>
      item.to?.hash?.toLowerCase() === normalized &&
      item.token?.address_hash?.toLowerCase() === USDC.toLowerCase(),
  );
  const payerTotals = new Map();
  let totalAtomic = 0n;
  for (const receipt of receipts) {
    const payer = receipt.from?.hash?.toLowerCase() ?? "unknown";
    const amount = BigInt(receipt.total?.value ?? 0);
    totalAtomic += amount;
    payerTotals.set(payer, (payerTotals.get(payer) ?? 0n) + amount);
  }
  const sortedPayers = [...payerTotals.entries()].sort((a, b) =>
    a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0,
  );
  const topPayerShare =
    totalAtomic > 0n && sortedPayers.length
      ? Number((sortedPayers[0][1] * 10_000n) / totalAtomic) / 100
      : null;
  const flags = [];
  let score = 0;

  if (profile.is_scam || profile.reputation === "scam") {
    flags.push({
      code: "PUBLIC_SCAM_FLAG",
      severity: "critical",
      detail: "Blockscout marks this merchant address as scam-associated.",
    });
    score += 90;
  }
  if (receipts.length === 0) {
    flags.push({
      code: "NO_USDC_RECEIPTS_IN_SAMPLE",
      severity: "info",
      detail: "No canonical Base USDC receipts appear in the current Blockscout sample.",
    });
    score += 5;
  }
  if (receipts.length >= 3 && payerTotals.size === 1) {
    flags.push({
      code: "SINGLE_PAYER_CONCENTRATION",
      severity: "medium",
      detail: "All sampled USDC receipts came from one payer.",
    });
    score += 25;
  } else if (topPayerShare !== null && topPayerShare >= 80) {
    flags.push({
      code: "HIGH_PAYER_CONCENTRATION",
      severity: "medium",
      detail: `The largest payer accounts for ${topPayerShare.toFixed(2)}% of sampled receipts.`,
    });
    score += 15;
  }

  score = Math.min(score, 100);
  const riskLevel =
    score >= 70 ? "high" : score >= 20 ? "medium" : "low";
  return {
    product: "x402-merchant-trust",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: riskLevel,
      risk_score: score,
      flags,
    },
    merchant_identity: {
      type: profile.is_contract ? "contract" : "eoa",
      reputation: profile.reputation ?? null,
      is_scam: Boolean(profile.is_scam),
      name: profile.name ?? null,
    },
    receipt_sample: {
      sampled_usdc_receipts: receipts.length,
      unique_payers: payerTotals.size,
      total_usdc: (Number(totalAtomic) / 1_000_000).toFixed(6),
      top_payer_share_percent: topPayerShare,
      has_more_pages: Boolean(transfers?.next_page_params),
      latest_receipt_at: receipts[0]?.timestamp ?? null,
      receipts: receipts.slice(0, 20).map(item => ({
        timestamp: item.timestamp ?? null,
        transaction_hash: item.transaction_hash ?? null,
        payer: item.from?.hash ?? null,
        amount_atomic: item.total?.value ?? null,
      })),
    },
    address_activity: {
      transactions_count: parseCount(counters.transactions_count),
      token_transfers_count: parseCount(counters.token_transfers_count),
    },
    provenance: {
      provider: "Blockscout Base",
      address_url: `${BLOCKSCOUT}/address/${address}`,
    },
    limitations: [
      "Receipt statistics cover the current Blockscout page, not guaranteed lifetime history.",
      "Onchain volume does not prove independent customers or successful service delivery.",
      "A concentrated payer set can be legitimate and is not proof of wash activity.",
    ],
  };
}

export async function merchantTrust(address, fetchImpl = fetch) {
  const encoded = encodeURIComponent(address);
  const [profile, counters, transfers] = await Promise.all([
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}`, fetchImpl),
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}/counters`, fetchImpl),
    fetchJson(
      `${BLOCKSCOUT}/api/v2/addresses/${encoded}/token-transfers?type=ERC-20`,
      fetchImpl,
    ),
  ]);
  return buildMerchantTrust({ address, profile, counters, transfers });
}

function usdcToAtomic(value) {
  if (!/^[0-9]+(?:\.[0-9]{1,6})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

export function buildPaymentProof({
  txHash,
  recipient,
  amount,
  transaction,
  fetchedAt = new Date().toISOString(),
}) {
  const expectedAtomic = usdcToAtomic(amount);
  const normalizedRecipient = recipient.toLowerCase();
  const usdcTransfers = (transaction.token_transfers ?? []).filter(
    transfer =>
      transfer.token?.address_hash?.toLowerCase() === USDC.toLowerCase(),
  );
  const matchingTransfer = usdcTransfers.find(
    transfer =>
      transfer.to?.hash?.toLowerCase() === normalizedRecipient &&
      BigInt(transfer.total?.value ?? 0) === expectedAtomic,
  );
  const successful = transaction.status === "ok";
  const confirmations = parseCount(transaction.confirmations);
  return {
    product: "base-payment-proof",
    schema_version: "1.0",
    network: BASE_MAINNET,
    fetched_at: fetchedAt,
    transaction_hash: txHash,
    verified: Boolean(successful && matchingTransfer && confirmations >= 1),
    finality: {
      status: transaction.status ?? null,
      confirmations,
      block_number: transaction.block_number ?? null,
      timestamp: transaction.timestamp ?? null,
    },
    expected: {
      token: USDC,
      recipient,
      amount_usdc: amount,
      amount_atomic: expectedAtomic?.toString() ?? null,
    },
    matched_transfer: matchingTransfer
      ? {
          payer: matchingTransfer.from?.hash ?? null,
          recipient: matchingTransfer.to?.hash ?? null,
          amount_atomic: matchingTransfer.total?.value ?? null,
          token: matchingTransfer.token?.address_hash ?? null,
        }
      : null,
    observed_usdc_transfers: usdcTransfers.map(transfer => ({
      payer: transfer.from?.hash ?? null,
      recipient: transfer.to?.hash ?? null,
      amount_atomic: transfer.total?.value ?? null,
    })),
    provenance: {
      provider: "Blockscout Base",
      transaction_url: `${BLOCKSCOUT}/tx/${txHash}`,
    },
  };
}

export async function paymentProof(txHash, recipient, amount, fetchImpl = fetch) {
  const transaction = await fetchJson(
    `${BLOCKSCOUT}/api/v2/transactions/${encodeURIComponent(txHash)}`,
    fetchImpl,
  );
  return buildPaymentProof({
    txHash,
    recipient,
    amount,
    transaction,
  });
}

export function buildWalletActivityDelta({
  address,
  since,
  transfers,
  fetchedAt = new Date().toISOString(),
}) {
  const sinceMs = Date.parse(since);
  const items = (transfers?.items ?? [])
    .filter(item => Date.parse(item.timestamp ?? "") >= sinceMs)
    .map(item =>
      summarizeTransfer({ ...item, _subject: address.toLowerCase() }),
    );
  return {
    product: "base-wallet-activity-delta",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    since,
    fetched_at: fetchedAt,
    transfer_count: items.length,
    transfers: items,
    truncated: Boolean(transfers?.next_page_params),
    provenance: {
      provider: "Blockscout Base",
      address_url: `${BLOCKSCOUT}/address/${address}`,
    },
    limitations: [
      "The endpoint covers the current Blockscout result page.",
      "A truncated response requires pagination-aware follow-up monitoring.",
    ],
  };
}

export async function walletActivityDelta(address, since, fetchImpl = fetch) {
  const transfers = await fetchJson(
    `${BLOCKSCOUT}/api/v2/addresses/${encodeURIComponent(address)}/token-transfers?type=ERC-20`,
    fetchImpl,
  );
  return buildWalletActivityDelta({ address, since, transfers });
}

export function buildApprovalRisk({
  token,
  owner,
  spender,
  allowanceAtomic,
  tokenInfo,
  spenderProfile,
  fetchedAt = new Date().toISOString(),
}) {
  const allowance = BigInt(allowanceAtomic);
  const decimals = Number(tokenInfo.decimals ?? 0);
  const maxUint256 = (1n << 256n) - 1n;
  const effectivelyUnlimited = allowance >= maxUint256 / 2n;
  const largeThreshold = 1_000_000n * 10n ** BigInt(Math.min(decimals, 36));
  const unusuallyLarge = !effectivelyUnlimited && allowance >= largeThreshold;
  const flags = [];
  let score = 0;

  if (effectivelyUnlimited) {
    flags.push({
      code: "UNLIMITED_ALLOWANCE",
      severity: "high",
      detail: "The allowance is effectively unlimited.",
    });
    score += 60;
  } else if (unusuallyLarge) {
    flags.push({
      code: "LARGE_ALLOWANCE",
      severity: "medium",
      detail: "The allowance is at least one million whole tokens.",
    });
    score += 25;
  }
  if (spenderProfile.is_scam || spenderProfile.reputation === "scam") {
    flags.push({
      code: "SPENDER_PUBLIC_SCAM_FLAG",
      severity: "critical",
      detail: "Blockscout marks the spender as scam-associated.",
    });
    score += 90;
  } else if (spenderProfile.is_contract && !spenderProfile.is_verified) {
    flags.push({
      code: "UNVERIFIED_SPENDER_CONTRACT",
      severity: "medium",
      detail: "The spender is a contract without verified source code.",
    });
    score += 20;
  }

  score = Math.min(score, 100);
  return {
    product: "base-approval-risk",
    schema_version: "1.0",
    network: BASE_MAINNET,
    fetched_at: fetchedAt,
    token,
    owner,
    spender,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        allowance === 0n
          ? "No current spending allowance was found."
          : effectivelyUnlimited
            ? "Revoke or replace this approval with a transaction-sized allowance unless unlimited access is required."
            : "Confirm the spender identity and reduce the allowance when practical.",
    },
    allowance: {
      atomic: allowance.toString(),
      formatted: formatUnits(allowance, decimals),
      decimals,
      symbol: tokenInfo.symbol ?? null,
      effectively_unlimited: effectivelyUnlimited,
    },
    spender_identity: {
      type: spenderProfile.is_contract ? "contract" : "eoa",
      is_verified_contract: Boolean(spenderProfile.is_verified),
      is_scam: Boolean(spenderProfile.is_scam),
      reputation: spenderProfile.reputation ?? null,
      name: spenderProfile.name ?? null,
      proxy_type: spenderProfile.proxy_type ?? null,
      implementations: spenderProfile.implementations ?? [],
    },
    provenance: {
      rpc_providers: BASE_RPCS,
      token_url: `${BLOCKSCOUT}/token/${token}`,
      spender_url: `${BLOCKSCOUT}/address/${spender}`,
      block_tag: "latest",
    },
    limitations: [
      "An allowance alone does not prove malicious intent.",
      "Spender ownership and upgradeability can change after this check.",
    ],
  };
}

export async function approvalRisk(token, owner, spender, fetchImpl = fetch) {
  const data = `0xdd62ed3e${encodeAddressWord(owner)}${encodeAddressWord(spender)}`;
  const [allowanceHex, tokenInfo, spenderProfile] = await Promise.all([
    rpcCall("eth_call", [{ to: token, data }, "latest"], fetchImpl),
    fetchJson(`${BLOCKSCOUT}/api/v2/tokens/${encodeURIComponent(token)}`, fetchImpl),
    fetchJson(
      `${BLOCKSCOUT}/api/v2/addresses/${encodeURIComponent(spender)}`,
      fetchImpl,
    ),
  ]);
  return buildApprovalRisk({
    token,
    owner,
    spender,
    allowanceAtomic: BigInt(allowanceHex || "0x0").toString(),
    tokenInfo,
    spenderProfile,
  });
}

export function buildContractVerification({
  address,
  profile,
  contract,
  fetchedAt = new Date().toISOString(),
}) {
  const flags = [];
  let score = 0;
  if (!profile.is_contract) {
    flags.push({
      code: "NOT_A_CONTRACT",
      severity: "critical",
      detail: "The supplied address is not identified as a contract.",
    });
    score += 90;
  } else if (!profile.is_verified || !contract.is_verified) {
    flags.push({
      code: "SOURCE_NOT_VERIFIED",
      severity: "high",
      detail: "Verified source code is not available on Blockscout.",
    });
    score += 45;
  }
  if (contract.is_partially_verified && !contract.is_fully_verified) {
    flags.push({
      code: "PARTIAL_VERIFICATION",
      severity: "medium",
      detail: "Only partial contract verification is reported.",
    });
    score += 15;
  }
  if (profile.proxy_type && !(profile.implementations ?? []).length) {
    flags.push({
      code: "UNRESOLVED_PROXY_IMPLEMENTATION",
      severity: "high",
      detail: "A proxy is detected but no implementation was resolved.",
    });
    score += 35;
  }
  if (contract.is_changed_bytecode) {
    flags.push({
      code: "CHANGED_BYTECODE",
      severity: "high",
      detail: "Blockscout reports changed deployed bytecode.",
    });
    score += 40;
  }

  score = Math.min(score, 100);
  return {
    product: "base-contract-verification",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 15 ? "medium" : "low",
      risk_score: score,
      flags,
    },
    verification: {
      is_contract: Boolean(profile.is_contract),
      is_verified: Boolean(profile.is_verified && contract.is_verified),
      is_fully_verified: Boolean(contract.is_fully_verified),
      is_partially_verified: Boolean(contract.is_partially_verified),
      verified_at: contract.verified_at ?? null,
      name: contract.name ?? profile.name ?? null,
      language: contract.language ?? null,
      compiler_version: contract.compiler_version ?? null,
      evm_version: contract.evm_version ?? null,
      optimization_enabled: contract.optimization_enabled ?? null,
      optimization_runs: contract.optimization_runs ?? null,
      license_type: contract.license_type ?? null,
      file_path: contract.file_path ?? null,
      verified_via_sourcify: Boolean(contract.is_verified_via_sourcify),
      changed_bytecode: Boolean(contract.is_changed_bytecode),
    },
    proxy: {
      type: profile.proxy_type ?? contract.proxy_type ?? null,
      implementations:
        profile.implementations?.length
          ? profile.implementations
          : contract.implementations ?? [],
      conflicting_implementations: contract.conflicting_implementations ?? [],
    },
    provenance: {
      provider: "Blockscout Base",
      contract_url: `${BLOCKSCOUT}/address/${address}?tab=contract`,
    },
    limitations: [
      "Verified source does not prove the contract is safe.",
      "Proxy implementations and admin controls can change after this check.",
    ],
  };
}

export async function contractVerification(address, fetchImpl = fetch) {
  const encoded = encodeURIComponent(address);
  const [profile, contract] = await Promise.all([
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}`, fetchImpl),
    fetchJson(`${BLOCKSCOUT}/api/v2/smart-contracts/${encoded}`, fetchImpl),
  ]);
  return buildContractVerification({ address, profile, contract });
}

export function buildUsdcReceipt({
  txHash,
  transaction,
  fetchedAt = new Date().toISOString(),
}) {
  const transfers = (transaction.token_transfers ?? [])
    .filter(
      transfer =>
        transfer.token?.address_hash?.toLowerCase() === USDC.toLowerCase(),
    )
    .map(transfer => ({
      payer: transfer.from?.hash ?? null,
      recipient: transfer.to?.hash ?? null,
      amount_atomic: transfer.total?.value ?? null,
      amount_usdc: formatUnits(BigInt(transfer.total?.value ?? 0), 6),
      log_index: transfer.log_index ?? null,
    }));
  const confirmations = parseCount(transaction.confirmations);
  return {
    product: "base-usdc-receipt",
    schema_version: "1.0",
    network: BASE_MAINNET,
    transaction_hash: txHash,
    fetched_at: fetchedAt,
    valid_receipt: transaction.status === "ok" && transfers.length > 0,
    finality: {
      status: transaction.status ?? null,
      confirmations,
      confirmed: confirmations >= 1,
      block_number: transaction.block_number ?? null,
      timestamp: transaction.timestamp ?? null,
    },
    canonical_usdc: USDC,
    transfer_count: transfers.length,
    transfers,
    provenance: {
      provider: "Blockscout Base",
      transaction_url: `${BLOCKSCOUT}/tx/${txHash}`,
    },
  };
}

export async function usdcReceipt(txHash, fetchImpl = fetch) {
  const transaction = await fetchJson(
    `${BLOCKSCOUT}/api/v2/transactions/${encodeURIComponent(txHash)}`,
    fetchImpl,
  );
  return buildUsdcReceipt({ txHash, transaction });
}

export function buildWalletCounterparty({
  address,
  transactions,
  transfers,
  fetchedAt = new Date().toISOString(),
}) {
  const subject = address.toLowerCase();
  const peers = new Map();
  const add = (candidate, kind, direction, adverse = false) => {
    const hash = candidate?.hash;
    if (!hash || hash.toLowerCase() === subject) return;
    const key = hash.toLowerCase();
    const row = peers.get(key) ?? {
      address: hash,
      interactions: 0,
      transactions: 0,
      token_transfers: 0,
      inbound: 0,
      outbound: 0,
      is_contract: Boolean(candidate.is_contract),
      is_scam: Boolean(candidate.is_scam),
      reputation: candidate.reputation ?? null,
    };
    row.interactions += 1;
    row[kind] += 1;
    row[direction] += 1;
    row.is_scam ||= adverse || Boolean(candidate.is_scam);
    peers.set(key, row);
  };

  for (const tx of transactions?.items ?? []) {
    const inbound = tx.to?.hash?.toLowerCase() === subject;
    add(inbound ? tx.from : tx.to, "transactions", inbound ? "inbound" : "outbound");
  }
  for (const transfer of transfers?.items ?? []) {
    const inbound = transfer.to?.hash?.toLowerCase() === subject;
    const tokenAdverse = ["scam", "spam", "suspicious"].includes(
      String(transfer.token?.reputation ?? "").toLowerCase(),
    );
    add(
      inbound ? transfer.from : transfer.to,
      "token_transfers",
      inbound ? "inbound" : "outbound",
      tokenAdverse,
    );
  }
  const ranked = [...peers.values()].sort(
    (a, b) => b.interactions - a.interactions,
  );
  return {
    product: "base-wallet-counterparty",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    fetched_at: fetchedAt,
    unique_counterparties: ranked.length,
    adverse_counterparties: ranked.filter(
      row => row.is_scam || !["ok", null].includes(row.reputation),
    ).length,
    counterparties: ranked.slice(0, 25),
    truncated: Boolean(
      transactions?.next_page_params || transfers?.next_page_params,
    ),
    provenance: {
      provider: "Blockscout Base",
      address_url: `${BLOCKSCOUT}/address/${address}`,
    },
    limitations: [
      "This ranks the current Blockscout result pages, not guaranteed lifetime history.",
      "Token spam can create unsolicited counterparties.",
    ],
  };
}

export async function walletCounterparty(address, fetchImpl = fetch) {
  const encoded = encodeURIComponent(address);
  const [transactions, transfers] = await Promise.all([
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}/transactions`, fetchImpl),
    fetchJson(
      `${BLOCKSCOUT}/api/v2/addresses/${encoded}/token-transfers?type=ERC-20`,
      fetchImpl,
    ),
  ]);
  return buildWalletCounterparty({ address, transactions, transfers });
}

export function buildEventLogMonitor({
  address,
  fromBlock,
  logs,
  fetchedAt = new Date().toISOString(),
}) {
  const minimum = Number(fromBlock);
  const items = (logs?.items ?? [])
    .filter(item => Number(item.block_number ?? 0) >= minimum)
    .map(item => ({
      block_number: Number(item.block_number ?? 0),
      block_timestamp: item.block_timestamp ?? null,
      transaction_hash: item.transaction_hash ?? null,
      log_index: item.index ?? null,
      emitter: item.address?.hash ?? address,
      event: item.decoded?.method_call ?? null,
      event_id: item.decoded?.method_id ?? null,
      parameters: item.decoded?.parameters ?? [],
      topics: item.topics ?? [],
      data: item.data ?? null,
    }));
  return {
    product: "base-event-log-monitor",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    from_block: minimum,
    fetched_at: fetchedAt,
    event_count: items.length,
    latest_block: items[0]?.block_number ?? null,
    events: items,
    truncated: Boolean(logs?.next_page_params),
    provenance: {
      provider: "Blockscout Base",
      address_url: `${BLOCKSCOUT}/address/${address}?tab=logs`,
    },
    limitations: [
      "Only the current Blockscout result page is filtered.",
      "Some event logs may not have decoded signatures or parameters.",
    ],
  };
}

export async function eventLogMonitor(address, fromBlock, fetchImpl = fetch) {
  const logs = await fetchJson(
    `${BLOCKSCOUT}/api/v2/addresses/${encodeURIComponent(address)}/logs`,
    fetchImpl,
    25_000,
  );
  return buildEventLogMonitor({ address, fromBlock, logs });
}

function hexToBigInt(value) {
  return BigInt(value || "0x0");
}

export function buildGasFeeQuote({
  gasLimit,
  gasPriceHex,
  priorityFeeHex,
  block,
  fetchedAt = new Date().toISOString(),
}) {
  const gasPrice = hexToBigInt(gasPriceHex);
  const priorityFee = hexToBigInt(priorityFeeHex);
  const baseFee = hexToBigInt(block.baseFeePerGas);
  const limit = BigInt(gasLimit);
  const estimatedWei = gasPrice * limit;
  return {
    product: "base-gas-fee-quote",
    schema_version: "1.0",
    network: BASE_MAINNET,
    fetched_at: fetchedAt,
    block_number: Number(hexToBigInt(block.number)),
    gas_limit: gasLimit,
    fees: {
      gas_price_wei: gasPrice.toString(),
      gas_price_gwei: formatUnits(gasPrice, 9),
      base_fee_wei: baseFee.toString(),
      base_fee_gwei: formatUnits(baseFee, 9),
      priority_fee_wei: priorityFee.toString(),
      priority_fee_gwei: formatUnits(priorityFee, 9),
    },
    estimated_cost: {
      wei: estimatedWei.toString(),
      eth: formatUnits(estimatedWei, 18),
    },
    block_utilization_percent:
      Number(block.gasLimit ?? 0) > 0
        ? Number(
            (
              (Number(hexToBigInt(block.gasUsed)) /
                Number(hexToBigInt(block.gasLimit))) *
              100
            ).toFixed(4),
          )
        : null,
    provenance: {
      rpc_providers: BASE_RPCS,
      block_tag: "latest",
    },
    limitations: [
      "The estimate uses the supplied gas limit and current gas price, not transaction simulation.",
      "Fees can change before a transaction is submitted or included.",
    ],
  };
}

export async function gasFeeQuote(gasLimit, fetchImpl = fetch) {
  const [gasPriceHex, priorityFeeHex, block] = await Promise.all([
    rpcCall("eth_gasPrice", [], fetchImpl),
    rpcCall("eth_maxPriorityFeePerGas", [], fetchImpl),
    rpcCall("eth_getBlockByNumber", ["latest", false], fetchImpl),
  ]);
  return buildGasFeeQuote({
    gasLimit,
    gasPriceHex,
    priorityFeeHex,
    block,
  });
}

export function buildNonceReadiness({
  address,
  latestHex,
  pendingHex,
  fetchedAt = new Date().toISOString(),
}) {
  const confirmed = hexToBigInt(latestHex);
  const pending = hexToBigInt(pendingHex);
  const pendingCount = pending >= confirmed ? pending - confirmed : 0n;
  return {
    product: "base-nonce-readiness",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    fetched_at: fetchedAt,
    confirmed_nonce: confirmed.toString(),
    pending_nonce: pending.toString(),
    pending_transaction_count: pendingCount.toString(),
    ready: pendingCount === 0n,
    decision_hint:
      pendingCount === 0n
        ? `Use nonce ${pending.toString()} for the next transaction.`
        : `${pendingCount.toString()} transaction(s) appear pending; use nonce ${pending.toString()} or inspect the queue before replacement.`,
    provenance: {
      rpc_providers: BASE_RPCS,
      confirmed_block_tag: "latest",
      pending_block_tag: "pending",
    },
  };
}

export async function nonceReadiness(address, fetchImpl = fetch) {
  const [latestHex, pendingHex] = await Promise.all([
    rpcCall("eth_getTransactionCount", [address, "latest"], fetchImpl),
    rpcCall("eth_getTransactionCount", [address, "pending"], fetchImpl),
  ]);
  return buildNonceReadiness({ address, latestHex, pendingHex });
}

export function buildStablecoinBalance({
  address,
  balances,
  tokenInfo,
  fetchedAt = new Date().toISOString(),
}) {
  let totalUsd = 0;
  const assets = STABLECOINS.map((coin, index) => {
    const atomic = BigInt(balances[index]);
    const formatted = formatUnits(atomic, coin.decimals);
    const referenceRate = Number(tokenInfo[index]?.exchange_rate ?? 1);
    const usdValue = Number(formatted) * referenceRate;
    totalUsd += Number.isFinite(usdValue) ? usdValue : 0;
    return {
      symbol: coin.symbol,
      contract: coin.address,
      atomic: atomic.toString(),
      balance: formatted,
      reference_rate_usd: Number.isFinite(referenceRate)
        ? referenceRate
        : null,
      estimated_value_usd: Number.isFinite(usdValue)
        ? Number(usdValue.toFixed(6))
        : null,
      reputation: tokenInfo[index]?.reputation ?? null,
    };
  });
  return {
    product: "base-stablecoin-balance",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    fetched_at: fetchedAt,
    total_estimated_value_usd: Number(totalUsd.toFixed(6)),
    assets,
    provenance: {
      rpc_providers: BASE_RPCS,
      block_tag: "latest",
    },
    limitations: [
      "Reference rates are public metadata and may lag market prices.",
      "Only the three listed Base stablecoin contracts are included.",
    ],
  };
}

export async function stablecoinBalance(address, fetchImpl = fetch) {
  const data = `0x70a08231${encodeAddressWord(address)}`;
  const balances = await rpcBatchCall(
    STABLECOINS.map(coin => ({
      method: "eth_call",
      params: [{ to: coin.address, data }, "latest"],
    })),
    fetchImpl,
  );
  return buildStablecoinBalance({
    address,
    balances: balances.map(value => hexToBigInt(value).toString()),
    tokenInfo: STABLECOINS.map(() => ({
      exchange_rate: "1",
      reputation: "ok",
    })),
  });
}

export function buildDexMarketMonitor({
  token,
  pairs,
  fetchedAt = new Date().toISOString(),
}) {
  const basePairs = (pairs ?? [])
    .filter(pair => pair.chainId === "base")
    .sort(
      (a, b) =>
        Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0),
    );
  const topPairs = basePairs.slice(0, 5).map(pair => ({
    dex: pair.dexId ?? null,
    pair_address: pair.pairAddress ?? null,
    url: pair.url ?? null,
    base_token: pair.baseToken ?? null,
    quote_token: pair.quoteToken ?? null,
    price_usd: pair.priceUsd ?? null,
    price_native: pair.priceNative ?? null,
    liquidity_usd: Number(pair.liquidity?.usd ?? 0),
    volume_24h_usd: Number(pair.volume?.h24 ?? 0),
    buys_24h: Number(pair.txns?.h24?.buys ?? 0),
    sells_24h: Number(pair.txns?.h24?.sells ?? 0),
    price_change: pair.priceChange ?? {},
    pair_created_at: pair.pairCreatedAt
      ? new Date(pair.pairCreatedAt).toISOString()
      : null,
  }));
  return {
    product: "base-dex-market-monitor",
    schema_version: "1.0",
    network: BASE_MAINNET,
    token,
    fetched_at: fetchedAt,
    pair_count: basePairs.length,
    aggregate_top5: {
      liquidity_usd: Number(
        topPairs.reduce((sum, pair) => sum + pair.liquidity_usd, 0).toFixed(2),
      ),
      volume_24h_usd: Number(
        topPairs.reduce((sum, pair) => sum + pair.volume_24h_usd, 0).toFixed(2),
      ),
      buys_24h: topPairs.reduce((sum, pair) => sum + pair.buys_24h, 0),
      sells_24h: topPairs.reduce((sum, pair) => sum + pair.sells_24h, 0),
    },
    deepest_pair: topPairs[0] ?? null,
    pairs: topPairs,
    provenance: {
      provider: "DexScreener",
      url: `https://dexscreener.com/search?q=${token}`,
    },
    limitations: [
      "The same economic liquidity can appear across related pools or routes.",
      "DEX prices and liquidity can change between observation and execution.",
    ],
  };
}

export async function dexMarketMonitor(token, fetchImpl = fetch) {
  const payload = await fetchJson(
    `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(token)}`,
    fetchImpl,
  );
  return buildDexMarketMonitor({ token, pairs: payload.pairs ?? [] });
}

export function buildPredictionMarketSnapshot({
  ticker,
  market,
  orderbook,
  fetchedAt = new Date().toISOString(),
}) {
  const yesLevels = orderbook?.orderbook_fp?.yes_dollars ?? [];
  const noLevels = orderbook?.orderbook_fp?.no_dollars ?? [];
  return {
    product: "prediction-market-snapshot",
    schema_version: "1.0",
    venue: "Kalshi",
    ticker,
    fetched_at: fetchedAt,
    market: {
      event_ticker: market.event_ticker ?? null,
      title: market.title ?? null,
      yes_subtitle: market.yes_sub_title ?? null,
      no_subtitle: market.no_sub_title ?? null,
      status: market.status ?? null,
      close_time: market.close_time ?? null,
      yes_bid_dollars: market.yes_bid_dollars ?? null,
      yes_ask_dollars: market.yes_ask_dollars ?? null,
      no_bid_dollars: market.no_bid_dollars ?? null,
      no_ask_dollars: market.no_ask_dollars ?? null,
      last_price_dollars: market.last_price_dollars ?? null,
      previous_price_dollars: market.previous_price_dollars ?? null,
      volume: market.volume_fp ?? null,
      volume_24h: market.volume_24h_fp ?? null,
      open_interest: market.open_interest_fp ?? null,
      liquidity_dollars: market.liquidity_dollars ?? null,
      result: market.result ?? null,
    },
    orderbook: {
      yes_bids: yesLevels.slice(-10).reverse().map(([price, size]) => ({
        price_dollars: price,
        size,
      })),
      no_bids: noLevels.slice(-10).reverse().map(([price, size]) => ({
        price_dollars: price,
        size,
      })),
    },
    provenance: {
      provider: "Kalshi public Trade API",
      market_url: `${KALSHI}/markets/${ticker}`,
      orderbook_url: `${KALSHI}/markets/${ticker}/orderbook?depth=10`,
    },
    limitations: [
      "This is a read-only snapshot and does not place or recommend trades.",
      "Orderbook levels and quotes can change immediately after retrieval.",
    ],
  };
}

export async function predictionMarketSnapshot(ticker, fetchImpl = fetch) {
  const encoded = encodeURIComponent(ticker);
  const [marketPayload, orderbook] = await Promise.all([
    fetchJson(`${KALSHI}/markets/${encoded}`, fetchImpl),
    fetchJson(`${KALSHI}/markets/${encoded}/orderbook?depth=10`, fetchImpl),
  ]);
  return buildPredictionMarketSnapshot({
    ticker,
    market: marketPayload.market ?? {},
    orderbook,
  });
}

const MAX_DOCUMENT_BYTES = 512_000;
const MAX_FEED_BYTES = 1_000_000;
const NPM_PACKAGE_PATTERN =
  /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i;
const GITHUB_OWNER_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const GITHUB_REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
const DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
const PYPI_PACKAGE_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,198}[A-Za-z0-9])?$/;

function isBlockedIpv4(hostname) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return false;
  const octets = hostname.split(".").map(Number);
  if (octets.some(octet => octet < 0 || octet > 255)) return true;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && [18, 19].includes(b)) ||
    a >= 224
  );
}

export function validatePublicUrl(value) {
  if (typeof value !== "string" || value.length < 8 || value.length > 2048) {
    throw new Error("invalid_url_length");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("invalid_url");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("unsupported_url_protocol");
  }
  if (parsed.username || parsed.password) throw new Error("url_credentials_forbidden");
  if (parsed.port && !["80", "443"].includes(parsed.port)) {
    throw new Error("url_port_forbidden");
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname ||
    hostname.includes(":") ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa") ||
    isBlockedIpv4(hostname)
  ) {
    throw new Error("private_or_local_url_forbidden");
  }
  return parsed;
}

async function fetchPublicResource(
  value,
  {
    fetchImpl = fetch,
    headers = {},
    method = "GET",
    maxRedirects = 5,
    timeoutMs = UPSTREAM_TIMEOUT_MS,
  } = {},
) {
  let current = validatePublicUrl(value);
  const redirects = [];
  for (let index = 0; index <= maxRedirects; index += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(current.toString(), {
        method,
        redirect: "manual",
        headers: {
          accept: "*/*",
          "user-agent": "AgentCommerceSafety/0.5",
          ...headers,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return { response, finalUrl: current.toString(), redirects };
    }
    const location = response.headers.get("location");
    if (!location) throw new Error("redirect_without_location");
    if (index === maxRedirects) throw new Error("too_many_redirects");
    const next = validatePublicUrl(new URL(location, current).toString());
    redirects.push({
      status: response.status,
      from: current.toString(),
      to: next.toString(),
    });
    current = next;
  }
  throw new Error("too_many_redirects");
}

async function readResponseBytes(response, maxBytes) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error("upstream_document_too_large");
  if (!response.body) return { bytes: new Uint8Array(), truncated: false };
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.length > maxBytes) {
      const remaining = Math.max(0, maxBytes - total);
      if (remaining) chunks.push(value.slice(0, remaining));
      total += remaining;
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    total += value.length;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { bytes, truncated };
}

function bytesToText(bytes) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

async function sha256Hex(value) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function decodePaymentRequirement(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    try {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }
}

export function buildX402EndpointPreflight({
  url,
  status,
  requirement,
  redirects = [],
  fetchedAt = new Date().toISOString(),
}) {
  const accepts = Array.isArray(requirement?.accepts) ? requirement.accepts : [];
  const flags = [];
  let score = 0;
  if (status !== 402) {
    flags.push({
      code: "NOT_PAYMENT_REQUIRED",
      severity: "medium",
      detail: `The unpaid probe returned HTTP ${status}, not HTTP 402.`,
    });
    score += 25;
  }
  if (!requirement || accepts.length === 0) {
    flags.push({
      code: "MISSING_PAYMENT_REQUIREMENTS",
      severity: "high",
      detail: "No decodable x402 payment requirement with accepted methods was found.",
    });
    score += 55;
  }
  for (const accept of accepts) {
    if (!accept.network || !accept.scheme || !accept.amount || !accept.payTo) {
      flags.push({
        code: "INCOMPLETE_PAYMENT_METHOD",
        severity: "high",
        detail: "An accepted payment method is missing network, scheme, amount, or payTo.",
      });
      score += 35;
    }
    if (
      accept.network === BASE_MAINNET &&
      String(accept.asset ?? "").toLowerCase() !== USDC.toLowerCase()
    ) {
      flags.push({
        code: "NON_CANONICAL_BASE_USDC",
        severity: "high",
        detail: "A Base payment method does not use the canonical Base USDC contract.",
      });
      score += 45;
    }
    if (accept.payTo && !ADDRESS_PATTERN.test(accept.payTo)) {
      flags.push({
        code: "INVALID_EVM_RECIPIENT",
        severity: "high",
        detail: "An EVM payment recipient is malformed.",
      });
      score += 40;
    }
    try {
      if (BigInt(accept.amount ?? 0) <= 0n) throw new Error("non-positive");
    } catch {
      flags.push({
        code: "INVALID_PAYMENT_AMOUNT",
        severity: "high",
        detail: "An accepted payment amount is not a positive integer.",
      });
      score += 40;
    }
  }
  if (!requirement?.resource?.url) {
    flags.push({
      code: "MISSING_RESOURCE_METADATA",
      severity: "info",
      detail: "The requirement does not identify its protected resource URL.",
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "x402-endpoint-preflight",
    schema_version: "1.0",
    url,
    fetched_at: fetchedAt,
    http_status: status,
    redirects,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        score >= 70
          ? "Do not pay this endpoint until its x402 metadata is corrected and independently reviewed."
          : score >= 20
            ? "Review the decoded payment method and resource identity before paying."
            : "The unpaid x402 requirement is structurally valid; this does not verify service quality.",
    },
    x402: {
      version: requirement?.x402Version ?? requirement?.x402_version ?? null,
      error: requirement?.error ?? null,
      resource: requirement?.resource ?? null,
      accepts: accepts.map(accept => ({
        scheme: accept.scheme ?? null,
        network: accept.network ?? null,
        amount_atomic: accept.amount ?? null,
        amount_usdc:
          accept.network === BASE_MAINNET &&
          String(accept.asset ?? "").toLowerCase() === USDC.toLowerCase() &&
          /^\d+$/.test(String(accept.amount ?? ""))
            ? formatUnits(BigInt(accept.amount), 6)
            : null,
        asset: accept.asset ?? null,
        pay_to: accept.payTo ?? null,
        max_timeout_seconds: accept.maxTimeoutSeconds ?? null,
        extra: accept.extra ?? null,
      })),
      bazaar: requirement?.extensions?.bazaar ?? null,
    },
    limitations: [
      "This performs an unpaid protocol probe and does not verify paid delivery.",
      "Structurally valid payment metadata does not prove merchant identity or service quality.",
    ],
  };
}

export async function x402EndpointPreflight(url, fetchImpl = fetch) {
  const { response, finalUrl, redirects } = await fetchPublicResource(url, {
    fetchImpl,
    headers: { accept: "application/json" },
  });
  const header =
    response.headers.get("payment-required") ??
    response.headers.get("x-payment-required");
  let requirement = decodePaymentRequirement(header);
  if (!requirement) {
    const { bytes } = await readResponseBytes(response, 128_000);
    requirement = decodePaymentRequirement(bytesToText(bytes));
  }
  return buildX402EndpointPreflight({
    url: finalUrl,
    status: response.status,
    requirement,
    redirects,
  });
}

function dependencyCount(metadata) {
  return Object.keys(metadata ?? {}).length;
}

export function buildNpmPackagePreflight({
  packageName,
  requestedVersion,
  packument,
  osv,
  fetchedAt = new Date().toISOString(),
}) {
  const resolvedVersion =
    requestedVersion === "latest"
      ? packument["dist-tags"]?.latest
      : requestedVersion;
  const metadata = packument.versions?.[resolvedVersion] ?? {};
  const publishedAt = packument.time?.[resolvedVersion] ?? null;
  const publishAgeDays = publishedAt
    ? Math.floor((Date.now() - Date.parse(publishedAt)) / 86_400_000)
    : null;
  const vulnerabilities = Array.isArray(osv?.vulns) ? osv.vulns : [];
  const flags = [];
  let score = 0;
  if (!metadata.version) {
    flags.push({
      code: "VERSION_NOT_FOUND",
      severity: "critical",
      detail: "The requested package version was not found in npm metadata.",
    });
    score += 90;
  }
  if (metadata.deprecated) {
    flags.push({
      code: "DEPRECATED_PACKAGE_VERSION",
      severity: "high",
      detail: String(metadata.deprecated),
    });
    score += 45;
  }
  if (!metadata.license) {
    flags.push({
      code: "LICENSE_NOT_DECLARED",
      severity: "medium",
      detail: "The selected package version does not declare a license.",
    });
    score += 20;
  }
  if (vulnerabilities.length) {
    flags.push({
      code: "KNOWN_OSV_VULNERABILITIES",
      severity: vulnerabilities.length >= 5 ? "high" : "medium",
      detail: `${vulnerabilities.length} known OSV vulnerability record(s) affect this version.`,
    });
    score += Math.min(60, vulnerabilities.length * 15);
  }
  if (publishAgeDays !== null && publishAgeDays > 1095) {
    flags.push({
      code: "OLD_SELECTED_VERSION",
      severity: "info",
      detail: `The selected version was published about ${publishAgeDays} days ago.`,
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "npm-package-preflight",
    schema_version: "1.0",
    package: packageName,
    requested_version: requestedVersion,
    resolved_version: resolvedVersion ?? null,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        vulnerabilities.length || metadata.deprecated
          ? "Review vulnerability details and upgrade or replace the dependency before autonomous installation."
          : "No deprecation or known OSV vulnerability was found for this exact version.",
    },
    metadata: {
      latest_version: packument["dist-tags"]?.latest ?? null,
      published_at: publishedAt,
      publish_age_days: publishAgeDays,
      deprecated: metadata.deprecated ?? null,
      license:
        typeof metadata.license === "string"
          ? metadata.license
          : metadata.license?.type ?? null,
      maintainers: (packument.maintainers ?? []).slice(0, 20).map(item => ({
        name: item.name ?? null,
        email: item.email ?? null,
      })),
      dependency_count: dependencyCount(metadata.dependencies),
      optional_dependency_count: dependencyCount(metadata.optionalDependencies),
      peer_dependency_count: dependencyCount(metadata.peerDependencies),
      repository: metadata.repository ?? null,
      homepage: metadata.homepage ?? null,
      integrity: metadata.dist?.integrity ?? null,
    },
    vulnerabilities: vulnerabilities.slice(0, 25).map(vulnerability => ({
      id: vulnerability.id ?? null,
      summary: vulnerability.summary ?? null,
      aliases: vulnerability.aliases ?? [],
      modified: vulnerability.modified ?? null,
      references: (vulnerability.references ?? []).slice(0, 5),
    })),
    provenance: {
      npm: `https://www.npmjs.com/package/${encodeURIComponent(packageName)}/v/${encodeURIComponent(resolvedVersion ?? requestedVersion)}`,
      osv: "https://osv.dev/",
    },
    limitations: [
      "OSV results cover disclosed vulnerabilities and cannot prove a package is safe.",
      "This does not execute, install, or inspect package tarball contents or lifecycle scripts.",
    ],
  };
}

export async function npmPackagePreflight(
  packageName,
  requestedVersion = "latest",
  fetchImpl = fetch,
) {
  const encoded = encodeURIComponent(packageName);
  const response = await fetchImpl(`https://registry.npmjs.org/${encoded}`, {
    headers: {
      accept: "application/json",
      "user-agent": "AgentCommerceSafety/0.5",
    },
  });
  if (!response.ok) throw new Error(`npm_registry_http_${response.status}`);
  const { bytes, truncated } = await readResponseBytes(response, 2_500_000);
  if (truncated) throw new Error("npm_metadata_too_large");
  const packument = JSON.parse(bytesToText(bytes));
  const resolvedVersion =
    requestedVersion === "latest"
      ? packument["dist-tags"]?.latest
      : requestedVersion;
  const osvResponse = await fetchImpl("https://api.osv.dev/v1/query", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "AgentCommerceSafety/0.5",
    },
    body: JSON.stringify({
      package: { ecosystem: "npm", name: packageName },
      version: resolvedVersion,
    }),
  });
  if (!osvResponse.ok) throw new Error(`osv_http_${osvResponse.status}`);
  const osv = await osvResponse.json();
  return buildNpmPackagePreflight({
    packageName,
    requestedVersion,
    packument,
    osv,
  });
}

export function buildGithubRepositoryHealth({
  owner,
  repo,
  repository,
  release,
  provider = "GitHub REST API",
  fetchedAt = new Date().toISOString(),
}) {
  const pushedAt = repository.pushed_at ?? null;
  const staleDays = pushedAt
    ? Math.floor((Date.now() - Date.parse(pushedAt)) / 86_400_000)
    : null;
  const flags = [];
  let score = 0;
  if (repository.archived) {
    flags.push({
      code: "REPOSITORY_ARCHIVED",
      severity: "high",
      detail: "GitHub marks this repository as archived.",
    });
    score += 65;
  }
  if (repository.disabled) {
    flags.push({
      code: "REPOSITORY_DISABLED",
      severity: "critical",
      detail: "GitHub marks this repository as disabled.",
    });
    score += 90;
  }
  if (!repository.license?.spdx_id) {
    flags.push({
      code: "LICENSE_NOT_DETECTED",
      severity: "medium",
      detail: "GitHub did not detect an SPDX license.",
    });
    score += 20;
  }
  if (staleDays !== null && staleDays > 730) {
    flags.push({
      code: "STALE_REPOSITORY",
      severity: "medium",
      detail: `The repository has not been pushed to for about ${staleDays} days.`,
    });
    score += 25;
  }
  if (repository.fork) {
    flags.push({
      code: "REPOSITORY_IS_FORK",
      severity: "info",
      detail: "This repository is a fork; verify the upstream project and divergence.",
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "github-repository-health",
    schema_version: "1.0",
    repository: `${owner}/${repo}`,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
    },
    health: {
      archived: Boolean(repository.archived),
      disabled: Boolean(repository.disabled),
      fork: Boolean(repository.fork),
      visibility: repository.visibility ?? null,
      pushed_at: pushedAt,
      stale_days: staleDays,
      created_at: repository.created_at ?? null,
      default_branch: repository.default_branch ?? null,
      license: repository.license?.spdx_id ?? null,
      stars: Number(repository.stargazers_count ?? 0),
      forks: Number(repository.forks_count ?? 0),
      watchers: Number(repository.subscribers_count ?? 0),
      open_issues: Number(repository.open_issues_count ?? 0),
      size_kb: Number(repository.size ?? 0),
      topics: repository.topics ?? [],
      latest_release: release
        ? {
            tag: release.tag_name ?? null,
            name: release.name ?? null,
            published_at: release.published_at ?? null,
            prerelease: Boolean(release.prerelease),
            draft: Boolean(release.draft),
            url: release.html_url ?? null,
          }
        : null,
    },
    provenance: {
      provider,
      repository_url: repository.html_url ?? `https://github.com/${owner}/${repo}`,
    },
    limitations: [
      "Popularity and recent commits do not prove code quality or security.",
      "Open issue counts can include pull requests and vary by project workflow.",
    ],
  };
}

async function githubJson(url, token, fetchImpl = fetch, allow404 = false) {
  const response = await fetchImpl(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "AgentCommerceSafety/0.5",
      "x-github-api-version": "2022-11-28",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (allow404 && response.status === 404) return null;
  if (!response.ok) throw new Error(`github_http_${response.status}`);
  return response.json();
}

function parseCompactCount(value) {
  const normalized = value.trim().toLowerCase().replace(/,/g, "");
  const match = normalized.match(/^([\d.]+)([km])?$/);
  if (!match) return 0;
  const multiplier = match[2] === "k" ? 1_000 : match[2] === "m" ? 1_000_000 : 1;
  return Math.round(Number(match[1]) * multiplier);
}

function githubPageCount(html, owner, repo, suffix) {
  const escapedPath = `${owner}/${repo}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `href="/${escapedPath}/${suffix}"[\\s\\S]{0,700}?<strong>([^<]+)</strong>`,
      "i",
    ),
  );
  return match ? parseCompactCount(match[1]) : 0;
}

async function githubRepositoryHealthFromPublicPages(
  owner,
  repo,
  fetchImpl = fetch,
) {
  const repositoryUrl = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const pageResponse = await fetchImpl(repositoryUrl, {
    headers: { accept: "text/html", "user-agent": "AgentCommerceSafety/0.5" },
  });
  if (!pageResponse.ok) throw new Error(`github_page_http_${pageResponse.status}`);
  const html = await pageResponse.text();
  const defaultBranch =
    html.match(/"defaultBranch":"([^"]+)"/)?.[1] ??
    html.match(/"refInfo":\{"name":"([^"]+)"/)?.[1] ??
    "main";
  const commitsResponse = await fetchImpl(
    `${repositoryUrl}/commits/${encodeURIComponent(defaultBranch)}.atom`,
    { headers: { accept: "application/atom+xml", "user-agent": "AgentCommerceSafety/0.5" } },
  );
  const commitsAtom = commitsResponse.ok ? await commitsResponse.text() : "";
  const pushedAt = commitsAtom.match(/<updated>([^<]+)<\/updated>/)?.[1] ?? null;
  const embedded = html.match(
    /"repo":\{"id":\d+,"defaultBranch":"[^"]+","name":"[^"]+","ownerLogin":"[^"]+","currentUserCanPush":(?:true|false),"isFork":(true|false),"isEmpty":(?:true|false),"createdAt":"([^"]+)"[\s\S]{0,300}?"public":(true|false),"private":(true|false)/,
  );
  const repository = {
    archived: /This repository was archived/i.test(html),
    disabled: false,
    fork:
      embedded?.[1] === "true" ||
      /octolytics-dimension-repository_is_fork" content="true"/i.test(html),
    visibility: embedded?.[3] === "true" ? "public" : "private",
    pushed_at: pushedAt,
    created_at: embedded?.[2] ?? null,
    default_branch: defaultBranch,
    license: {
      spdx_id:
        html.match(/"preferredFileType":"license","tabName":"([^"]+)"/)?.[1] ?? null,
    },
    stargazers_count: githubPageCount(html, owner, repo, "stargazers"),
    forks_count: githubPageCount(html, owner, repo, "forks"),
    subscribers_count: githubPageCount(html, owner, repo, "watchers"),
    open_issues_count: Number(
      html.match(/id="issues-repo-tab-count"[\s\S]{0,150}?title="([\d,]+)"/)?.[1]?.replace(
        /,/g,
        "",
      ) ?? 0,
    ),
    size: 0,
    topics: [],
    html_url: repositoryUrl,
  };
  return buildGithubRepositoryHealth({
    owner,
    repo,
    repository,
    release: null,
    provider: "GitHub public HTML and Atom fallback",
  });
}

export async function githubRepositoryHealth(
  owner,
  repo,
  token,
  fetchImpl = fetch,
) {
  const encodedOwner = encodeURIComponent(owner);
  const encodedRepo = encodeURIComponent(repo);
  const base = `https://api.github.com/repos/${encodedOwner}/${encodedRepo}`;
  try {
    const [repository, release] = await Promise.all([
      githubJson(base, token, fetchImpl),
      githubJson(`${base}/releases/latest`, token, fetchImpl, true),
    ]);
    return buildGithubRepositoryHealth({ owner, repo, repository, release });
  } catch (error) {
    if (token || !/github_http_(403|429)/.test(String(error))) throw error;
    return githubRepositoryHealthFromPublicPages(owner, repo, fetchImpl);
  }
}

function extractHtmlMetadata(text) {
  const title =
    text.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/\s+/g, " ")
      .trim() ?? null;
  const canonical =
    text.match(
      /<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    )?.[1] ??
    text.match(
      /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*canonical[^"']*["'][^>]*>/i,
    )?.[1] ??
    null;
  return { title, canonical };
}

export async function urlChangeFingerprint(url, fetchImpl = fetch) {
  const { response, finalUrl, redirects } = await fetchPublicResource(url, {
    fetchImpl,
    headers: { accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" },
  });
  if (!response.ok) throw new Error(`document_http_${response.status}`);
  const { bytes, truncated } = await readResponseBytes(
    response,
    MAX_DOCUMENT_BYTES,
  );
  const contentType = response.headers.get("content-type") ?? "";
  const text =
    contentType.includes("text") ||
    contentType.includes("html") ||
    contentType.includes("json") ||
    contentType.includes("xml")
      ? bytesToText(bytes)
      : "";
  const metadata = extractHtmlMetadata(text);
  return {
    product: "url-change-fingerprint",
    schema_version: "1.0",
    requested_url: url,
    final_url: finalUrl,
    fetched_at: new Date().toISOString(),
    http_status: response.status,
    redirects,
    content: {
      content_type: contentType || null,
      bytes_hashed: bytes.length,
      truncated,
      sha256: await sha256Hex(bytes),
      etag: response.headers.get("etag"),
      last_modified: response.headers.get("last-modified"),
      title: metadata.title,
      canonical: metadata.canonical,
    },
    decision_hint:
      "Compare sha256, etag, or last_modified with a previous snapshot to detect a change.",
    limitations: [
      "Dynamic, personalized, or rotating content can change without a meaningful document update.",
      `The fingerprint covers at most ${MAX_DOCUMENT_BYTES} response bytes.`,
    ],
  };
}

function decodeXmlEntities(value) {
  return String(value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .trim();
}

function xmlTag(block, names) {
  for (const name of names) {
    const match = block.match(
      new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"),
    );
    if (match) return decodeXmlEntities(match[1].replace(/<[^>]+>/g, " "));
  }
  return null;
}

function atomLink(block) {
  const alternate = block.match(
    /<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i,
  );
  const any = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return decodeXmlEntities(alternate?.[1] ?? any?.[1] ?? "");
}

export async function buildFeedSnapshot({
  url,
  finalUrl,
  redirects,
  xml,
  fetchedAt = new Date().toISOString(),
}) {
  const atom = /<feed\b/i.test(xml);
  const blocks = atom
    ? [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)]
    : [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  const rawItems = blocks.slice(0, 20).map(match => {
    const block = match[1];
    const title = xmlTag(block, ["title"]);
    const link = atom ? atomLink(block) : xmlTag(block, ["link"]);
    const id = xmlTag(block, ["guid", "id"]) ?? link;
    const published = xmlTag(block, [
      "published",
      "updated",
      "pubDate",
      "dc:date",
    ]);
    const summary = xmlTag(block, [
      "summary",
      "description",
      "content",
      "content:encoded",
    ]);
    return { title, link: link || null, id: id || null, published, summary };
  });
  const items = [];
  for (const item of rawItems) {
    items.push({
      ...item,
      summary: item.summary?.slice(0, 1000) ?? null,
      fingerprint: await sha256Hex(
        [item.id, item.link, item.title, item.published].join("|"),
      ),
    });
  }
  return {
    product: "feed-snapshot",
    schema_version: "1.0",
    requested_url: url,
    final_url: finalUrl,
    fetched_at: fetchedAt,
    format: atom ? "atom" : "rss",
    redirects,
    feed: {
      title: xmlTag(xml, ["title"]),
      description: xmlTag(xml, ["subtitle", "description"]),
    },
    item_count: items.length,
    items,
    limitations: [
      "Only the first 20 entries in the returned feed are normalized.",
      "Malformed XML or feeds rendered only by JavaScript may not be parsed completely.",
    ],
  };
}

export async function feedSnapshot(url, fetchImpl = fetch) {
  const { response, finalUrl, redirects } = await fetchPublicResource(url, {
    fetchImpl,
    headers: {
      accept:
        "application/atom+xml,application/rss+xml,application/xml,text/xml;q=0.9",
    },
  });
  if (!response.ok) throw new Error(`feed_http_${response.status}`);
  const { bytes, truncated } = await readResponseBytes(response, MAX_FEED_BYTES);
  if (truncated) throw new Error("feed_document_too_large");
  const xml = bytesToText(bytes);
  if (!/<(?:rss|feed|rdf:RDF)\b/i.test(xml)) {
    throw new Error("unsupported_feed_document");
  }
  return buildFeedSnapshot({ url, finalUrl, redirects, xml });
}

const KNOWN_EVM_CALLS = {
  "0xa9059cbb": {
    signature: "transfer(address,uint256)",
    action: "token_transfer",
    fields: [
      ["recipient", "address", 0],
      ["amount", "uint256", 1],
    ],
  },
  "0x095ea7b3": {
    signature: "approve(address,uint256)",
    action: "token_approval",
    fields: [
      ["spender", "address", 0],
      ["amount", "uint256", 1],
    ],
  },
  "0x23b872dd": {
    signature: "transferFrom(address,address,uint256)",
    action: "token_transfer_from",
    fields: [
      ["owner", "address", 0],
      ["recipient", "address", 1],
      ["amount", "uint256", 2],
    ],
  },
  "0x42842e0e": {
    signature: "safeTransferFrom(address,address,uint256)",
    action: "nft_transfer",
    fields: [
      ["owner", "address", 0],
      ["recipient", "address", 1],
      ["token_id", "uint256", 2],
    ],
  },
  "0xb88d4fde": {
    signature: "safeTransferFrom(address,address,uint256,bytes)",
    action: "nft_transfer",
    fields: [
      ["owner", "address", 0],
      ["recipient", "address", 1],
      ["token_id", "uint256", 2],
    ],
  },
  "0xd505accf": {
    signature: "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",
    action: "signed_token_approval",
    fields: [
      ["owner", "address", 0],
      ["spender", "address", 1],
      ["amount", "uint256", 2],
      ["deadline", "uint256", 3],
    ],
  },
};

function calldataWord(data, index) {
  const raw = data.replace(/^0x/, "").slice(8 + index * 64, 8 + (index + 1) * 64);
  return raw.length === 64 ? raw : null;
}

function decodeCalldataField(data, type, index) {
  const word = calldataWord(data, index);
  if (!word) return null;
  if (type === "address") return `0x${word.slice(24)}`;
  if (type === "uint256") return BigInt(`0x${word}`).toString();
  return `0x${word}`;
}

export function buildTransactionIntent({
  to,
  data,
  value,
  profile = {},
  tokenInfo = null,
  candidateSignatures = [],
  fetchedAt = new Date().toISOString(),
}) {
  const selector = data.length >= 10 ? data.slice(0, 10).toLowerCase() : null;
  const known = selector ? KNOWN_EVM_CALLS[selector] : null;
  const decoded = {};
  for (const [name, type, index] of known?.fields ?? []) {
    decoded[name] = decodeCalldataField(data, type, index);
  }
  const flags = [];
  let score = 0;
  if (profile.is_scam || profile.reputation === "scam") {
    flags.push({
      code: "SCAM_DESTINATION",
      severity: "critical",
      detail: "The destination has public scam or malicious reputation metadata.",
    });
    score += 100;
  }
  if (profile.is_contract && !profile.is_verified) {
    flags.push({
      code: "UNVERIFIED_DESTINATION_CONTRACT",
      severity: "medium",
      detail: "The destination is a contract without verified source code.",
    });
    score += 20;
  }
  if (data === "0x" && BigInt(value) > 0n) {
    flags.push({
      code: "NATIVE_VALUE_TRANSFER",
      severity: "info",
      detail: "This transaction transfers native ETH without contract calldata.",
    });
  } else if (!known) {
    flags.push({
      code: "UNKNOWN_CALL_SELECTOR",
      severity: "medium",
      detail: selector
        ? `The selector ${selector} was not decoded by the deterministic safety decoder.`
        : "The calldata does not contain a complete EVM selector.",
    });
    score += 25;
  }
  const amount = decoded.amount ? BigInt(decoded.amount) : null;
  const unlimited = amount === (1n << 256n) - 1n;
  if (known?.action.includes("approval")) {
    flags.push({
      code: unlimited ? "UNLIMITED_TOKEN_APPROVAL" : "TOKEN_APPROVAL",
      severity: unlimited ? "high" : "medium",
      detail: unlimited
        ? "This call grants the maximum possible token allowance."
        : "This call grants a token allowance to another address.",
    });
    score += unlimited ? 70 : 25;
  }
  if (known?.action.includes("transfer")) {
    flags.push({
      code: "ASSET_TRANSFER",
      severity: "info",
      detail: "This call transfers fungible tokens or NFTs.",
    });
  }
  score = Math.min(score, 100);
  const decimals = tokenInfo?.decimals === undefined ? null : Number(tokenInfo.decimals);
  return {
    product: "evm-transaction-intent",
    schema_version: "1.0",
    network: BASE_MAINNET,
    fetched_at: fetchedAt,
    transaction: {
      to,
      value_wei: value,
      value_eth: formatUnits(BigInt(value), 18),
      calldata_bytes: Math.max(0, (data.length - 2) / 2),
      selector,
    },
    destination: {
      is_contract: Boolean(profile.is_contract),
      is_verified_contract: Boolean(profile.is_verified),
      proxy_type: profile.proxy_type ?? null,
      implementations: profile.implementations ?? [],
      reputation: profile.reputation ?? null,
      is_scam: Boolean(profile.is_scam),
      token: tokenInfo
        ? {
            name: tokenInfo.name ?? null,
            symbol: tokenInfo.symbol ?? null,
            decimals,
          }
        : null,
    },
    intent: {
      recognized: Boolean(known),
      signature: known?.signature ?? null,
      action: known?.action ?? (data === "0x" ? "native_transfer" : "unknown_contract_call"),
      decoded,
      amount_display:
        amount !== null && Number.isInteger(decimals)
          ? formatUnits(amount, decimals)
          : null,
      unlimited_approval: unlimited,
      candidate_signatures: candidateSignatures.slice(0, 5),
    },
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        score >= 70
          ? "Do not sign until the destination, spender, and decoded amount are independently verified."
          : score >= 20
            ? "Review the decoded destination, spender, and amount before signing."
            : "No high-risk intent was identified by the deterministic decoder.",
    },
    limitations: [
      "Only common transfer, approval, permit, and NFT selectors are decoded deterministically.",
      "Proxy behavior, delegatecalls, fallback functions, and downstream contract calls can change the effective result.",
      "Four-byte candidate signatures are hints and can be ambiguous or incorrect.",
    ],
  };
}

export async function transactionIntent(to, data, value, fetchImpl = fetch) {
  const encoded = encodeURIComponent(to);
  const profilePromise = fetchJson(
    `${BLOCKSCOUT}/api/v2/addresses/${encoded}`,
    fetchImpl,
  );
  const tokenPromise = fetchJson(
    `${BLOCKSCOUT}/api/v2/tokens/${encoded}`,
    fetchImpl,
  ).catch(() => null);
  const selector = data.length >= 10 ? data.slice(0, 10).toLowerCase() : null;
  const signaturePromise =
    selector && !KNOWN_EVM_CALLS[selector]
      ? fetchJson(
          `https://www.4byte.directory/api/v1/signatures/?hex_signature=${encodeURIComponent(selector)}`,
          fetchImpl,
        ).catch(() => ({ results: [] }))
      : Promise.resolve({ results: [] });
  const [profile, tokenInfo, signatures] = await Promise.all([
    profilePromise,
    tokenPromise,
    signaturePromise,
  ]);
  return buildTransactionIntent({
    to,
    data,
    value,
    profile,
    tokenInfo,
    candidateSignatures: (signatures.results ?? []).map(item => item.text_signature),
  });
}

export async function simulateBaseTransaction(
  to,
  data,
  value = "0",
  from = null,
  fetchImpl = fetch,
) {
  const transaction = {
    to,
    data,
    value: `0x${BigInt(value).toString(16)}`,
    ...(from ? { from } : {}),
  };
  const startedAt = Date.now();
  try {
    const [returnData, gasHex] = await Promise.all([
      rpcCall("eth_call", [transaction, "latest"], fetchImpl),
      rpcCall("eth_estimateGas", [transaction], fetchImpl).catch(() => null),
    ]);
    return {
      success: true,
      return_data: returnData,
      estimated_gas: gasHex ? Number(BigInt(gasHex)) : null,
      latency_ms: Date.now() - startedAt,
      provider_mode: "public_rpc",
    };
  } catch (error) {
    return {
      success: false,
      revert_reason: error instanceof Error ? error.message : String(error),
      latency_ms: Date.now() - startedAt,
      provider_mode: "public_rpc",
    };
  }
}

function nestedPublicUrl(value) {
  if (!value) return { valid: false, reason: "missing" };
  try {
    const parsed = validatePublicUrl(value);
    return { valid: true, url: parsed.toString() };
  } catch (error) {
    return {
      valid: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function buildA2aAgentCardPreflight({
  requestedUrl,
  cardUrl,
  card,
  redirects = [],
  fetchedAt = new Date().toISOString(),
}) {
  const flags = [];
  let score = 0;
  const endpoint = nestedPublicUrl(card.url);
  if (!card.name) {
    flags.push({
      code: "MISSING_AGENT_NAME",
      severity: "medium",
      detail: "The Agent Card does not declare a name.",
    });
    score += 15;
  }
  if (!endpoint.valid) {
    flags.push({
      code: "INVALID_AGENT_ENDPOINT",
      severity: "high",
      detail: `The Agent Card URL is invalid or unsafe: ${endpoint.reason}.`,
    });
    score += 50;
  } else if (new URL(endpoint.url).origin !== new URL(cardUrl).origin) {
    flags.push({
      code: "CROSS_ORIGIN_AGENT_ENDPOINT",
      severity: "medium",
      detail: "The advertised agent endpoint is hosted on a different origin than the Agent Card.",
    });
    score += 15;
  }
  const skills = Array.isArray(card.skills) ? card.skills : [];
  if (skills.length === 0) {
    flags.push({
      code: "NO_DECLARED_SKILLS",
      severity: "medium",
      detail: "The Agent Card does not declare any callable skills.",
    });
    score += 20;
  }
  const duplicateSkillIds = skills
    .map(skill => skill?.id)
    .filter(Boolean)
    .filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicateSkillIds.length) {
    flags.push({
      code: "DUPLICATE_SKILL_IDS",
      severity: "medium",
      detail: `Duplicate skill IDs: ${[...new Set(duplicateSkillIds)].join(", ")}.`,
    });
    score += 15;
  }
  const providerUrl = nestedPublicUrl(card.provider?.url);
  if (card.provider?.url && !providerUrl.valid) {
    flags.push({
      code: "INVALID_PROVIDER_URL",
      severity: "medium",
      detail: `The provider URL is invalid or unsafe: ${providerUrl.reason}.`,
    });
    score += 20;
  }
  const securitySchemes =
    card.securitySchemes ?? card.security_schemes ?? card.authentication ?? null;
  if (!securitySchemes) {
    flags.push({
      code: "AUTHENTICATION_NOT_DECLARED",
      severity: "info",
      detail: "The Agent Card does not declare authentication or security schemes.",
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "a2a-agent-card-preflight",
    schema_version: "1.0",
    requested_url: requestedUrl,
    card_url: cardUrl,
    fetched_at: fetchedAt,
    redirects,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        score >= 70
          ? "Do not connect until the Agent Card endpoint and identity metadata are corrected."
          : score >= 20
            ? "Review endpoint ownership, authentication, and skill declarations before connecting."
            : "The Agent Card is structurally usable; this does not prove the agent is trustworthy.",
    },
    agent: {
      name: card.name ?? null,
      description: card.description ?? null,
      url: endpoint.valid ? endpoint.url : card.url ?? null,
      version: card.version ?? null,
      protocol_version: card.protocolVersion ?? card.protocol_version ?? null,
      preferred_transport: card.preferredTransport ?? card.preferred_transport ?? null,
      provider: card.provider ?? null,
      capabilities: card.capabilities ?? null,
      authentication: securitySchemes,
      default_input_modes: card.defaultInputModes ?? card.default_input_modes ?? [],
      default_output_modes: card.defaultOutputModes ?? card.default_output_modes ?? [],
      skill_count: skills.length,
      skills: skills.slice(0, 50).map(skill => ({
        id: skill?.id ?? null,
        name: skill?.name ?? null,
        description: skill?.description ?? null,
        tags: skill?.tags ?? [],
      })),
    },
    limitations: [
      "A valid Agent Card is self-declared metadata and does not prove operator identity or runtime behavior.",
      "This check does not invoke agent skills or send credentials.",
    ],
  };
}

export async function a2aAgentCardPreflight(url, fetchImpl = fetch) {
  const parsed = validatePublicUrl(url);
  const directJson = /\.json$/i.test(parsed.pathname);
  const candidates = directJson
    ? [parsed.toString()]
    : [
        new URL("/.well-known/agent-card.json", parsed.origin).toString(),
        new URL("/.well-known/agent.json", parsed.origin).toString(),
      ];
  const failures = [];
  for (const candidate of candidates) {
    try {
      const { response, finalUrl, redirects } = await fetchPublicResource(candidate, {
        fetchImpl,
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        failures.push(`${candidate}: HTTP ${response.status}`);
        continue;
      }
      const { bytes, truncated } = await readResponseBytes(response, MAX_DOCUMENT_BYTES);
      if (truncated) throw new Error("agent_card_too_large");
      const card = JSON.parse(bytesToText(bytes));
      return buildA2aAgentCardPreflight({
        requestedUrl: url,
        cardUrl: finalUrl,
        card,
        redirects,
      });
    } catch (error) {
      failures.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`agent_card_not_found (${failures.join("; ")})`);
}

function openApiOperations(document) {
  const operations = [];
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of ["get", "post", "put", "patch", "delete", "options", "head"]) {
      if (pathItem?.[method]) operations.push({ path, method, operation: pathItem[method] });
    }
  }
  return operations;
}

export async function buildOpenApiSpecPreflight({
  requestedUrl,
  finalUrl,
  redirects = [],
  document,
  raw,
  fetchedAt = new Date().toISOString(),
}) {
  const flags = [];
  let score = 0;
  const version = document.openapi ?? document.swagger ?? null;
  if (!version) {
    flags.push({
      code: "MISSING_OPENAPI_VERSION",
      severity: "high",
      detail: "The document does not declare an OpenAPI or Swagger version.",
    });
    score += 45;
  }
  const operations = openApiOperations(document);
  if (operations.length === 0) {
    flags.push({
      code: "NO_API_OPERATIONS",
      severity: "high",
      detail: "The specification does not declare any HTTP operations.",
    });
    score += 55;
  }
  const servers = Array.isArray(document.servers)
    ? document.servers.map(server => server?.url).filter(Boolean)
    : document.host
      ? [`${document.schemes?.[0] ?? "https"}://${document.host}${document.basePath ?? ""}`]
      : [];
  const serverChecks = servers.map(server => {
    try {
      const resolved = new URL(server, finalUrl).toString();
      const checked = nestedPublicUrl(resolved);
      return { declared: server, resolved, valid_public_url: checked.valid, reason: checked.reason ?? null };
    } catch {
      return { declared: server, resolved: null, valid_public_url: false, reason: "invalid_url" };
    }
  });
  const unsafeServers = serverChecks.filter(server => !server.valid_public_url);
  if (unsafeServers.length) {
    flags.push({
      code: "UNSAFE_OR_INVALID_SERVER_URL",
      severity: "high",
      detail: `${unsafeServers.length} declared server URL(s) are invalid, private, or unsupported.`,
    });
    score += 40;
  }
  if (servers.length === 0) {
    flags.push({
      code: "NO_SERVER_DECLARATION",
      severity: "info",
      detail: "No API server URL is declared; clients must infer the document origin.",
    });
    score += 5;
  }
  const missingOperationIds = operations.filter(item => !item.operation.operationId).length;
  if (missingOperationIds) {
    flags.push({
      code: "MISSING_OPERATION_IDS",
      severity: "info",
      detail: `${missingOperationIds} operation(s) do not declare operationId.`,
    });
    score += Math.min(10, missingOperationIds);
  }
  const securitySchemes =
    document.components?.securitySchemes ?? document.securityDefinitions ?? {};
  if (Object.keys(securitySchemes).length === 0) {
    flags.push({
      code: "NO_SECURITY_SCHEMES",
      severity: "info",
      detail: "The specification does not define authentication or security schemes.",
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "openapi-spec-preflight",
    schema_version: "1.0",
    requested_url: requestedUrl,
    final_url: finalUrl,
    fetched_at: fetchedAt,
    redirects,
    fingerprint_sha256: await sha256Hex(raw),
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        score >= 70
          ? "Do not generate or execute API calls until the specification is corrected."
          : score >= 20
            ? "Review server URLs, authentication, and operation definitions before use."
            : "The specification is structurally usable; upstream behavior can still differ.",
    },
    specification: {
      title: document.info?.title ?? null,
      version,
      api_version: document.info?.version ?? null,
      path_count: Object.keys(document.paths ?? {}).length,
      operation_count: operations.length,
      operations_missing_id: missingOperationIds,
      security_scheme_names: Object.keys(securitySchemes),
      servers: serverChecks,
    },
    limitations: [
      "This performs structural checks and does not prove the server implements the specification.",
      "External references are not recursively downloaded or validated.",
    ],
  };
}

export async function openApiSpecPreflight(url, fetchImpl = fetch) {
  const { response, finalUrl, redirects } = await fetchPublicResource(url, {
    fetchImpl,
    headers: {
      accept: "application/json,application/yaml,text/yaml,text/x-yaml,*/*;q=0.5",
    },
  });
  if (!response.ok) throw new Error(`openapi_http_${response.status}`);
  const { bytes, truncated } = await readResponseBytes(response, MAX_DOCUMENT_BYTES);
  if (truncated) throw new Error("openapi_document_too_large");
  const raw = bytesToText(bytes);
  let document;
  try {
    document = JSON.parse(raw);
  } catch {
    document = parseYaml(raw);
  }
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("invalid_openapi_document");
  }
  return buildOpenApiSpecPreflight({
    requestedUrl: url,
    finalUrl,
    redirects,
    document,
    raw,
  });
}

function dnsAnswers(payload) {
  return (payload?.Answer ?? []).map(answer => ({
    name: answer.name ?? null,
    type: Number(answer.type ?? 0),
    ttl: Number(answer.TTL ?? 0),
    data: answer.data ?? null,
  }));
}

async function dnsQuery(domain, type, fetchImpl = fetch) {
  const response = await fetchImpl(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`,
    {
      headers: {
        accept: "application/dns-json",
        "user-agent": "AgentCommerceSafety/0.6",
      },
    },
  );
  if (!response.ok) throw new Error(`doh_http_${response.status}`);
  return response.json();
}

function rdapEventDate(rdap, action) {
  return rdap?.events?.find(event => event.eventAction === action)?.eventDate ?? null;
}

export function buildDomainTrustPreflight({
  domain,
  dns,
  rdap = null,
  cnameTargetDns = null,
  fetchedAt = new Date().toISOString(),
}) {
  const flags = [];
  let score = 0;
  const a = dnsAnswers(dns.A);
  const aaaa = dnsAnswers(dns.AAAA);
  const cname = dnsAnswers(dns.CNAME);
  const mx = dnsAnswers(dns.MX);
  const dnskey = dnsAnswers(dns.DNSKEY);
  const resolves = a.length > 0 || aaaa.length > 0 || cname.length > 0;
  if (!resolves) {
    flags.push({
      code: "DOMAIN_DOES_NOT_RESOLVE",
      severity: "high",
      detail: "No A, AAAA, or CNAME answer was returned.",
    });
    score += 60;
  }
  const dnssecAuthenticated = [dns.A, dns.AAAA, dns.CNAME, dns.DNSKEY].some(
    payload => payload?.AD === true,
  );
  if (!dnssecAuthenticated && dnskey.length === 0) {
    flags.push({
      code: "DNSSEC_NOT_OBSERVED",
      severity: "info",
      detail: "The DNS responses were not authenticated and no DNSKEY answer was observed.",
    });
    score += 5;
  }
  if (cname.length && cnameTargetDns) {
    const targetResolves =
      dnsAnswers(cnameTargetDns.A).length > 0 ||
      dnsAnswers(cnameTargetDns.AAAA).length > 0 ||
      dnsAnswers(cnameTargetDns.CNAME).length > 0;
    if (!targetResolves) {
      flags.push({
        code: "DANGLING_CNAME_CANDIDATE",
        severity: "high",
        detail: "The CNAME target did not return A, AAAA, or another CNAME answer.",
      });
      score += 55;
    }
  }
  const createdAt =
    rdapEventDate(rdap, "registration") ?? rdapEventDate(rdap, "registered");
  const expiresAt =
    rdapEventDate(rdap, "expiration") ?? rdapEventDate(rdap, "expiry");
  const ageDays = createdAt
    ? Math.max(0, Math.floor((Date.now() - Date.parse(createdAt)) / 86_400_000))
    : null;
  const daysToExpiry = expiresAt
    ? Math.floor((Date.parse(expiresAt) - Date.now()) / 86_400_000)
    : null;
  if (ageDays !== null && ageDays < 30) {
    flags.push({
      code: "NEWLY_REGISTERED_DOMAIN",
      severity: "high",
      detail: `The domain was registered approximately ${ageDays} day(s) ago.`,
    });
    score += 45;
  } else if (ageDays !== null && ageDays < 180) {
    flags.push({
      code: "YOUNG_DOMAIN",
      severity: "medium",
      detail: `The domain was registered approximately ${ageDays} day(s) ago.`,
    });
    score += 20;
  }
  if (daysToExpiry !== null && daysToExpiry < 0) {
    flags.push({
      code: "RDAP_EXPIRATION_PASSED",
      severity: "high",
      detail: "The published RDAP expiration date is in the past.",
    });
    score += 55;
  } else if (daysToExpiry !== null && daysToExpiry < 30) {
    flags.push({
      code: "DOMAIN_EXPIRING_SOON",
      severity: "medium",
      detail: `The published RDAP expiration date is approximately ${daysToExpiry} day(s) away.`,
    });
    score += 25;
  }
  if (!rdap) {
    flags.push({
      code: "RDAP_UNAVAILABLE",
      severity: "info",
      detail: "Public registration metadata was not available from the RDAP bootstrap service.",
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "domain-trust-preflight",
    schema_version: "1.0",
    domain,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        score >= 70
          ? "Do not send credentials or payment until domain ownership and resolution are independently verified."
          : score >= 20
            ? "Apply tighter trust limits and verify the operator through another channel."
            : "No major DNS or registration warning was observed; this is not proof of ownership.",
    },
    dns: {
      resolves,
      dnssec_authenticated: dnssecAuthenticated,
      a,
      aaaa,
      cname,
      mx,
      dnskey_count: dnskey.length,
    },
    registration: rdap
      ? {
          handle: rdap.handle ?? null,
          status: rdap.status ?? [],
          created_at: createdAt,
          expires_at: expiresAt,
          age_days: ageDays,
          days_to_expiry: daysToExpiry,
          nameservers: (rdap.nameservers ?? []).map(item => item.ldhName).filter(Boolean),
          secure_dns: rdap.secureDNS ?? null,
        }
      : null,
    provenance: {
      dns_provider: "Cloudflare DNS over HTTPS",
      rdap_provider: "RDAP bootstrap service",
    },
    limitations: [
      "Domain age, DNSSEC, and mail configuration do not prove that a service is legitimate.",
      "A dangling CNAME warning is a candidate signal and does not prove takeover is possible.",
      "RDAP fields vary by registry and can be redacted or stale.",
    ],
  };
}

export async function domainTrustPreflight(domain, fetchImpl = fetch) {
  const normalized = domain.toLowerCase().replace(/\.$/, "");
  const [a, aaaa, cname, mx, dnskey, rdapResult] = await Promise.all([
    dnsQuery(normalized, "A", fetchImpl),
    dnsQuery(normalized, "AAAA", fetchImpl),
    dnsQuery(normalized, "CNAME", fetchImpl),
    dnsQuery(normalized, "MX", fetchImpl),
    dnsQuery(normalized, "DNSKEY", fetchImpl),
    fetchJson(`https://rdap.org/domain/${encodeURIComponent(normalized)}`, fetchImpl).catch(
      () => null,
    ),
  ]);
  const cnameTarget = dnsAnswers(cname)[0]?.data?.replace(/\.$/, "") ?? null;
  const cnameTargetDns = cnameTarget
    ? {
        A: await dnsQuery(cnameTarget, "A", fetchImpl),
        AAAA: await dnsQuery(cnameTarget, "AAAA", fetchImpl),
        CNAME: await dnsQuery(cnameTarget, "CNAME", fetchImpl),
      }
    : null;
  return buildDomainTrustPreflight({
    domain: normalized,
    dns: { A: a, AAAA: aaaa, CNAME: cname, MX: mx, DNSKEY: dnskey },
    rdap: rdapResult,
    cnameTargetDns,
  });
}

export function buildPypiPackagePreflight({
  packageName,
  requestedVersion,
  payload,
  osv,
  fetchedAt = new Date().toISOString(),
}) {
  const info = payload.info ?? {};
  const resolvedVersion = info.version ?? requestedVersion;
  const files = payload.urls ?? [];
  const releaseTimes = files
    .map(file => file.upload_time_iso_8601 ?? file.upload_time)
    .filter(Boolean)
    .map(value => Date.parse(value))
    .filter(Number.isFinite);
  const lastPublishedAt = releaseTimes.length
    ? new Date(Math.max(...releaseTimes)).toISOString()
    : null;
  const staleDays = lastPublishedAt
    ? Math.max(0, Math.floor((Date.now() - Date.parse(lastPublishedAt)) / 86_400_000))
    : null;
  const vulnerabilities = (osv?.vulns ?? []).map(vulnerability => ({
    id: vulnerability.id ?? null,
    summary: vulnerability.summary ?? null,
    aliases: vulnerability.aliases ?? [],
    modified: vulnerability.modified ?? null,
    references: vulnerability.references?.slice(0, 5) ?? [],
  }));
  const flags = [];
  let score = 0;
  if (files.length > 0 && files.every(file => file.yanked)) {
    flags.push({
      code: "YANKED_RELEASE",
      severity: "high",
      detail: "All published files for the resolved release are marked as yanked.",
    });
    score += 55;
  } else if (files.some(file => file.yanked)) {
    flags.push({
      code: "PARTIALLY_YANKED_RELEASE",
      severity: "medium",
      detail: "One or more files for the resolved release are marked as yanked.",
    });
    score += 20;
  }
  if (vulnerabilities.length) {
    flags.push({
      code: "KNOWN_OSV_VULNERABILITIES",
      severity: "high",
      detail: `${vulnerabilities.length} OSV vulnerability record(s) affect this package version.`,
    });
    score += Math.min(75, 35 + vulnerabilities.length * 10);
  }
  if (staleDays !== null && staleDays > 1095) {
    flags.push({
      code: "STALE_RELEASE",
      severity: "medium",
      detail: `The resolved release is approximately ${staleDays} days old.`,
    });
    score += 20;
  }
  if (!info.license && !info.license_expression) {
    flags.push({
      code: "LICENSE_NOT_DECLARED",
      severity: "medium",
      detail: "The package metadata does not declare a license.",
    });
    score += 15;
  }
  if (!info.requires_python) {
    flags.push({
      code: "PYTHON_REQUIREMENT_NOT_DECLARED",
      severity: "info",
      detail: "The package metadata does not declare requires_python.",
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "pypi-package-preflight",
    schema_version: "1.0",
    package: packageName,
    requested_version: requestedVersion,
    resolved_version: resolvedVersion,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        score >= 70
          ? "Do not install until vulnerability and yanked-release findings are reviewed."
          : score >= 20
            ? "Review package metadata, release age, and vulnerability findings before installation."
            : "No major public package warning was found; pin hashes and review provenance before installation.",
    },
    metadata: {
      name: info.name ?? packageName,
      summary: info.summary ?? null,
      author: info.author ?? null,
      project_url: info.project_url ?? null,
      package_url: info.package_url ?? null,
      license: info.license_expression ?? info.license ?? null,
      requires_python: info.requires_python ?? null,
      dependency_count: Array.isArray(info.requires_dist) ? info.requires_dist.length : 0,
      dependencies: (info.requires_dist ?? []).slice(0, 100),
      file_count: files.length,
      all_files_yanked: files.length > 0 && files.every(file => file.yanked),
      last_published_at: lastPublishedAt,
      stale_days: staleDays,
    },
    vulnerabilities,
    provenance: {
      provider: "PyPI JSON API and Google OSV",
      pypi_url: `https://pypi.org/project/${encodeURIComponent(packageName)}/${encodeURIComponent(resolvedVersion)}/`,
    },
    limitations: [
      "Package metadata is publisher-controlled and does not prove the uploaded artifacts are safe.",
      "OSV coverage is not exhaustive and newly disclosed issues may not appear immediately.",
      "This check does not inspect wheel or source-distribution contents.",
    ],
  };
}

export async function pypiPackagePreflight(
  packageName,
  requestedVersion = "latest",
  fetchImpl = fetch,
) {
  const encodedPackage = encodeURIComponent(packageName);
  const metadataUrl =
    requestedVersion === "latest"
      ? `https://pypi.org/pypi/${encodedPackage}/json`
      : `https://pypi.org/pypi/${encodedPackage}/${encodeURIComponent(requestedVersion)}/json`;
  const payload = await fetchJson(metadataUrl, fetchImpl);
  const resolvedVersion = payload.info?.version ?? requestedVersion;
  const response = await fetchImpl("https://api.osv.dev/v1/query", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "AgentCommerceSafety/0.6",
    },
    body: JSON.stringify({
      package: { ecosystem: "PyPI", name: packageName },
      version: resolvedVersion,
    }),
  });
  if (!response.ok) throw new Error(`osv_http_${response.status}`);
  const osv = await response.json();
  return buildPypiPackagePreflight({
    packageName,
    requestedVersion,
    payload,
    osv,
  });
}

function parseAddressList(value) {
  if (!value) return [];
  return [...new Set(
    value
      .split(",")
      .map(item => item.trim().toLowerCase())
      .filter(item => ADDRESS_PATTERN.test(item)),
  )];
}

function parseStringList(value, maxItems = 50) {
  if (!value) return [];
  const input = Array.isArray(value) ? value : String(value).split(",");
  return [...new Set(
    input
      .map(item => String(item).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, maxItems),
  )];
}

function guardReason(code, severity, detail, source = "policy") {
  return { code, severity, detail, source };
}

function safeAtomicNumber(value) {
  try {
    const parsed = BigInt(value ?? 0);
    return parsed >= 0n && parsed <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(parsed)
      : null;
  } catch {
    return null;
  }
}

function randomToken(prefix) {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const encoded = [...bytes]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${encoded}`;
}

function base64UrlEncode(value) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function hmacSha256(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
  );
}

async function aesKeyFromSecret(secret) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptSecret(value, masterSecret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKeyFromSecret(masterSecret);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(value),
    ),
  );
  return `${base64UrlEncode(iv)}.${base64UrlEncode(encrypted)}`;
}

async function decryptSecret(value, masterSecret) {
  const [encodedIv, encodedCiphertext] = String(value).split(".");
  const key = await aesKeyFromSecret(masterSecret);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlDecode(encodedIv) },
    key,
    base64UrlDecode(encodedCiphertext),
  );
  return new TextDecoder().decode(decrypted);
}

export async function signPaymentGuardDecision(payload, secret) {
  if (!secret) throw new Error("payment_guard_signing_secret_missing");
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(await hmacSha256(encodedPayload, secret));
  return `${encodedPayload}.${signature}`;
}

export async function verifyPaymentGuardDecision(
  token,
  secret,
  { allowExpired = false } = {},
) {
  if (!secret || !token?.includes(".")) {
    throw new Error("invalid_decision_token");
  }
  const [encodedPayload, encodedSignature] = token.split(".");
  const expected = await hmacSha256(encodedPayload, secret);
  const supplied = base64UrlDecode(encodedSignature);
  if (
    expected.length !== supplied.length ||
    !expected.every((byte, index) => byte === supplied[index])
  ) {
    throw new Error("invalid_decision_token_signature");
  }
  const payload = JSON.parse(
    new TextDecoder().decode(base64UrlDecode(encodedPayload)),
  );
  if (
    !payload.expires_at ||
    (!allowExpired && Date.parse(payload.expires_at) <= Date.now())
  ) {
    throw new Error("decision_token_expired");
  }
  return payload;
}

function paymentGuardPolicyFromInput(input) {
  const maxSingleAtomic = usdcToAtomic(input.max_single_usdc ?? "0.10");
  const sessionBudgetAtomic = usdcToAtomic(
    input.session_budget_usdc ?? "1.00",
  );
  const dailyBudgetAtomic = usdcToAtomic(input.daily_budget_usdc ?? "5.00");
  const reservationTtlSeconds = Number(
    input.reservation_ttl_seconds ?? 300,
  );
  const retentionDays = Number(input.retention_days ?? 30);
  const activeFromHourUtc = Number(input.active_from_hour_utc ?? 0);
  const activeUntilHourUtc = Number(input.active_until_hour_utc ?? 24);
  const humanReviewAtomic = usdcToAtomic(
    input.human_review_above_usdc ?? input.max_single_usdc ?? "0.10",
  );
  if (
    maxSingleAtomic === null ||
    sessionBudgetAtomic === null ||
    dailyBudgetAtomic === null ||
    maxSingleAtomic > 1_000_000_000_000n ||
    sessionBudgetAtomic > 1_000_000_000_000n ||
    dailyBudgetAtomic > 1_000_000_000_000n ||
    humanReviewAtomic === null ||
    humanReviewAtomic > 1_000_000_000_000n ||
    !Number.isInteger(reservationTtlSeconds) ||
    reservationTtlSeconds < 30 ||
    reservationTtlSeconds > 3600 ||
    !Number.isInteger(retentionDays) ||
    retentionDays < 1 ||
    retentionDays > 365
    || !Number.isInteger(activeFromHourUtc)
    || !Number.isInteger(activeUntilHourUtc)
    || activeFromHourUtc < 0
    || activeFromHourUtc > 23
    || activeUntilHourUtc < 1
    || activeUntilHourUtc > 24
    || activeFromHourUtc >= activeUntilHourUtc
  ) {
    throw new Error("invalid_payment_guard_policy");
  }
  return {
    maxSingleAtomic: Number(maxSingleAtomic),
    sessionBudgetAtomic: Number(sessionBudgetAtomic),
    dailyBudgetAtomic: Number(dailyBudgetAtomic),
    allowPayTo: parseAddressList(input.allow_pay_to ?? ""),
    blockPayTo: parseAddressList(input.block_pay_to ?? ""),
    reservationTtlSeconds,
    retentionDays,
    humanReviewAtomic: Number(humanReviewAtomic),
    failClosed:
      input.fail_closed === undefined
        ? true
        : !["false", "0", "no"].includes(
            String(input.fail_closed).toLowerCase(),
          ),
    allowedDomains: parseStringList(input.allowed_domains),
    allowedTools: parseStringList(input.allowed_tools),
    allowedPurposes: parseStringList(input.allowed_purposes),
    activeFromHourUtc,
    activeUntilHourUtc,
  };
}

async function createPaymentGuardProfile(db, input) {
  if (!db) throw new Error("payment_guard_database_unavailable");
  const policy = paymentGuardPolicyFromInput(input);
  const profileId = `pgp_${crypto.randomUUID()}`;
  const ownerToken = randomToken("pgo");
  const agentToken = randomToken("pga");
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO payment_guard_profiles
       (profile_id, name, owner_token_hash, agent_token_hash, policy_json,
        policy_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .bind(
      profileId,
      String(input.name ?? "Payment policy").slice(0, 120),
      await sha256Hex(ownerToken),
      await sha256Hex(agentToken),
      JSON.stringify(policy),
      now,
      now,
    )
    .run();
  return {
    profile_id: profileId,
    name: String(input.name ?? "Payment policy").slice(0, 120),
    policy_version: 1,
    policy: {
      max_single_usdc: formatUnits(BigInt(policy.maxSingleAtomic), 6),
      session_budget_usdc: formatUnits(
        BigInt(policy.sessionBudgetAtomic),
        6,
      ),
      daily_budget_usdc: formatUnits(BigInt(policy.dailyBudgetAtomic), 6),
      reservation_ttl_seconds: policy.reservationTtlSeconds,
      retention_days: policy.retentionDays,
      human_review_above_usdc: formatUnits(
        BigInt(policy.humanReviewAtomic),
        6,
      ),
      fail_closed: policy.failClosed,
      allowed_domains: policy.allowedDomains,
      allowed_tools: policy.allowedTools,
      allowed_purposes: policy.allowedPurposes,
      active_hours_utc: [
        policy.activeFromHourUtc,
        policy.activeUntilHourUtc,
      ],
      allow_pay_to: policy.allowPayTo,
      block_pay_to: policy.blockPayTo,
    },
    owner_token: ownerToken,
    agent_token: agentToken,
    warning:
      "Store both tokens securely. They are returned once and cannot be recovered.",
  };
}

async function loadPaymentGuardProfile(db, profileId, token, role = "agent") {
  if (!db || !profileId || !token) throw new Error("policy_auth_required");
  const profile = await db
    .prepare(
      `SELECT profile_id, name, owner_token_hash, agent_token_hash, policy_json,
              policy_version, active, revoked_at, created_at, updated_at
       FROM payment_guard_profiles WHERE profile_id = ? LIMIT 1`,
    )
    .bind(profileId)
    .first();
  if (!profile) throw new Error("policy_not_found");
  if (!Number(profile.active)) throw new Error("policy_revoked");
  const tokenHash = await sha256Hex(token);
  const expected =
    role === "owner" ? profile.owner_token_hash : profile.agent_token_hash;
  if (tokenHash !== expected) throw new Error("policy_auth_failed");
  return {
    ...profile,
    policy: JSON.parse(profile.policy_json),
  };
}

async function managePaymentGuardProfile(db, input) {
  const profile = await loadPaymentGuardProfile(
    db,
    String(input.profile_id ?? ""),
    String(input.owner_token ?? ""),
    "owner",
  );
  const action = String(input.action ?? "");
  const now = new Date().toISOString();
  if (action === "update_policy") {
    const policy = paymentGuardPolicyFromInput(input);
    await db
      .prepare(
        `UPDATE payment_guard_profiles
         SET policy_json = ?, policy_version = policy_version + 1,
             updated_at = ?
         WHERE profile_id = ? AND active = 1`,
      )
      .bind(JSON.stringify(policy), now, profile.profile_id)
      .run();
    await enqueuePaymentGuardEvent(db, profile.profile_id, "policy.updated", {
      profile_id: profile.profile_id,
      policy_version: Number(profile.policy_version) + 1,
    });
    return {
      profile_id: profile.profile_id,
      action,
      policy_version: Number(profile.policy_version) + 1,
      updated_at: now,
    };
  }
  if (action === "rotate_agent_token") {
    const agentToken = randomToken("pga");
    await db
      .prepare(
        `UPDATE payment_guard_profiles
         SET agent_token_hash = ?, updated_at = ?
         WHERE profile_id = ? AND active = 1`,
      )
      .bind(await sha256Hex(agentToken), now, profile.profile_id)
      .run();
    return {
      profile_id: profile.profile_id,
      action,
      agent_token: agentToken,
      warning: "The previous agent token is invalid immediately.",
    };
  }
  if (action === "rotate_owner_token") {
    const ownerToken = randomToken("pgo");
    await db
      .prepare(
        `UPDATE payment_guard_profiles
         SET owner_token_hash = ?, updated_at = ?
         WHERE profile_id = ? AND active = 1`,
      )
      .bind(await sha256Hex(ownerToken), now, profile.profile_id)
      .run();
    return {
      profile_id: profile.profile_id,
      action,
      owner_token: ownerToken,
      warning: "The previous owner token is invalid immediately.",
    };
  }
  if (action === "revoke") {
    await db
      .prepare(
        `UPDATE payment_guard_profiles
         SET active = 0, revoked_at = ?, updated_at = ?
         WHERE profile_id = ?`,
      )
      .bind(now, now, profile.profile_id)
      .run();
    await enqueuePaymentGuardEvent(db, profile.profile_id, "policy.revoked", {
      profile_id: profile.profile_id,
      revoked_at: now,
    });
    return {
      profile_id: profile.profile_id,
      action,
      revoked_at: now,
    };
  }
  throw new Error("invalid_policy_management_action");
}

const PAYMENT_GUARD_WEBHOOK_EVENTS = new Set([
  "decision.allow",
  "decision.review",
  "decision.block",
  "approval.approved",
  "approval.denied",
  "payment.committed",
  "reservation.released",
  "delivery.success",
  "delivery.failure",
  "policy.updated",
  "policy.revoked",
]);

async function managePaymentGuardWebhook(db, input, signingSecret) {
  const profile = await loadPaymentGuardProfile(
    db,
    String(input.profile_id ?? ""),
    String(input.owner_token ?? ""),
    "owner",
  );
  const action = String(input.action ?? "create");
  if (action === "delete") {
    await db
      .prepare(
        `UPDATE payment_guard_webhooks SET active = 0, updated_at = ?
         WHERE webhook_id = ? AND profile_id = ?`,
      )
      .bind(
        new Date().toISOString(),
        String(input.webhook_id ?? ""),
        profile.profile_id,
      )
      .run();
    return { webhook_id: input.webhook_id, active: false };
  }
  if (action !== "create") throw new Error("invalid_webhook_action");
  const parsedUrl = validatePublicUrl(String(input.url ?? ""));
  const eventTypes = parseStringList(input.event_types).filter(event =>
    PAYMENT_GUARD_WEBHOOK_EVENTS.has(event),
  );
  if (!eventTypes.length) throw new Error("invalid_webhook_event_types");
  const webhookId = `pgw_${crypto.randomUUID()}`;
  const webhookSecret = randomToken("pgwh");
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO payment_guard_webhooks
       (webhook_id, profile_id, url, encrypted_secret, event_types,
        active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .bind(
      webhookId,
      profile.profile_id,
      parsedUrl.toString(),
      await encryptSecret(webhookSecret, signingSecret),
      JSON.stringify(eventTypes),
      now,
      now,
    )
    .run();
  return {
    webhook_id: webhookId,
    url: parsedUrl.toString(),
    event_types: eventTypes,
    webhook_secret: webhookSecret,
    warning: "The webhook signing secret is returned once.",
  };
}

async function enqueuePaymentGuardEvent(db, profileId, eventType, payload) {
  if (!db || !profileId || !PAYMENT_GUARD_WEBHOOK_EVENTS.has(eventType)) return;
  const hooks = await db
    .prepare(
      `SELECT webhook_id, event_types FROM payment_guard_webhooks
       WHERE profile_id = ? AND active = 1`,
    )
    .bind(profileId)
    .all();
  const now = new Date().toISOString();
  for (const hook of hooks.results ?? []) {
    const eventTypes = JSON.parse(hook.event_types ?? "[]");
    if (!eventTypes.includes(eventType)) continue;
    await db
      .prepare(
        `INSERT INTO payment_guard_webhook_outbox
         (webhook_id, event_type, payload_json, status, attempts,
          next_attempt_at, created_at)
         VALUES (?, ?, ?, 'pending', 0, ?, ?)`,
      )
      .bind(
        hook.webhook_id,
        eventType,
        JSON.stringify({
          event_id: crypto.randomUUID(),
          type: eventType,
          created_at: now,
          data: payload,
        }),
        now,
        now,
      )
      .run();
  }
}

async function processPaymentGuardWebhookOutbox(
  db,
  signingSecret,
  fetchImpl = fetch,
) {
  if (!db || !signingSecret) return;
  const now = new Date().toISOString();
  const due = await db
    .prepare(
      `SELECT o.id, o.webhook_id, o.event_type, o.payload_json, o.attempts,
              w.url, w.encrypted_secret
       FROM payment_guard_webhook_outbox o
       JOIN payment_guard_webhooks w ON w.webhook_id = o.webhook_id
       WHERE o.status = 'pending' AND o.next_attempt_at <= ?
         AND w.active = 1
       ORDER BY o.id LIMIT 25`,
    )
    .bind(now)
    .all();
  for (const item of due.results ?? []) {
    try {
      validatePublicUrl(item.url);
      const secret = await decryptSecret(item.encrypted_secret, signingSecret);
      const signature = base64UrlEncode(
        await hmacSha256(item.payload_json, secret),
      );
      const response = await fetchImpl(item.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-payment-guard-event": item.event_type,
          "x-payment-guard-signature": `v1=${signature}`,
        },
        body: item.payload_json,
        redirect: "error",
      });
      if (!response.ok) throw new Error(`webhook_http_${response.status}`);
      await db
        .prepare(
          `UPDATE payment_guard_webhook_outbox
           SET status = 'delivered', attempts = attempts + 1,
               delivered_at = ?, last_error = NULL WHERE id = ?`,
        )
        .bind(new Date().toISOString(), item.id)
        .run();
    } catch (error) {
      const attempts = Number(item.attempts ?? 0) + 1;
      const terminal = attempts >= 8;
      const nextAttempt = new Date(
        Date.now() + Math.min(3600, 2 ** attempts * 15) * 1000,
      ).toISOString();
      await db
        .prepare(
          `UPDATE payment_guard_webhook_outbox
           SET status = ?, attempts = ?, next_attempt_at = ?, last_error = ?
           WHERE id = ?`,
        )
        .bind(
          terminal ? "failed" : "pending",
          attempts,
          nextAttempt,
          (error instanceof Error ? error.message : String(error)).slice(0, 500),
          item.id,
        )
        .run();
    }
  }
}

export async function buildPaymentGuardDecision({
  targetUrl,
  sessionId,
  requestId,
  endpoint,
  merchant = null,
  domain = null,
  intent = null,
  simulation = null,
  history = {},
  policy,
  profile = null,
  transactionExpected = false,
  toolId = null,
  purpose = null,
  evaluatedAt = new Date().toISOString(),
}) {
  const methods = endpoint?.x402?.accepts ?? [];
  const payment =
    methods.find(
      method =>
        method.network === BASE_MAINNET &&
        String(method.asset ?? "").toLowerCase() === USDC.toLowerCase() &&
        ADDRESS_PATTERN.test(method.pay_to ?? "") &&
        /^\d+$/.test(String(method.amount_atomic ?? "")),
    ) ?? null;
  const reasons = [];
  let riskScore = Math.min(100, Number(endpoint?.assessment?.risk_score ?? 100));
  let hardBlock = false;
  let needsReview = false;
  const failClosed = policy.failClosed ?? true;

  if (!payment) {
    reasons.push(
      guardReason(
        "NO_SUPPORTED_PAYMENT_METHOD",
        "critical",
        "No valid Base exact-payment method using canonical USDC was found.",
        "x402",
      ),
    );
    hardBlock = true;
  }
  const targetDomain = new URL(endpoint?.url ?? targetUrl).hostname.toLowerCase();
  if (
    policy.allowedDomains?.length &&
    !policy.allowedDomains.some(
      domain =>
        targetDomain === domain || targetDomain.endsWith(`.${domain}`),
    )
  ) {
    reasons.push(
      guardReason(
        "MANDATE_DOMAIN_VIOLATION",
        "critical",
        "The target domain is outside the policy mandate.",
        "mandate",
      ),
    );
    hardBlock = true;
  }
  if (
    policy.allowedTools?.length &&
    (!toolId || !policy.allowedTools.includes(String(toolId).toLowerCase()))
  ) {
    reasons.push(
      guardReason(
        "MANDATE_TOOL_VIOLATION",
        "critical",
        "The calling tool is missing or outside the policy mandate.",
        "mandate",
      ),
    );
    hardBlock = true;
  }
  if (
    policy.allowedPurposes?.length &&
    (!purpose ||
      !policy.allowedPurposes.includes(String(purpose).toLowerCase()))
  ) {
    reasons.push(
      guardReason(
        "MANDATE_PURPOSE_VIOLATION",
        "critical",
        "The declared payment purpose is missing or outside the policy mandate.",
        "mandate",
      ),
    );
    hardBlock = true;
  }
  const currentHour = new Date(evaluatedAt).getUTCHours();
  if (
    Number.isInteger(policy.activeFromHourUtc) &&
    Number.isInteger(policy.activeUntilHourUtc) &&
    (currentHour < policy.activeFromHourUtc ||
      currentHour >= policy.activeUntilHourUtc)
  ) {
    reasons.push(
      guardReason(
        "MANDATE_TIME_WINDOW_VIOLATION",
        "critical",
        "The payment is outside the policy's permitted UTC time window.",
        "mandate",
      ),
    );
    hardBlock = true;
  }

  const amountAtomic = safeAtomicNumber(payment?.amount_atomic);
  const payTo = payment?.pay_to?.toLowerCase() ?? null;
  if (payment && amountAtomic === null) {
    reasons.push(
      guardReason(
        "UNSAFE_PAYMENT_AMOUNT",
        "critical",
        "The payment amount is invalid or exceeds the safe accounting range.",
        "x402",
      ),
    );
    hardBlock = true;
  }

  if (payTo && policy.blockPayTo.includes(payTo)) {
    reasons.push(
      guardReason(
        "RECIPIENT_BLOCKED",
        "critical",
        "The payment recipient is on the caller's blocklist.",
      ),
    );
    hardBlock = true;
  }
  if (payTo && policy.allowPayTo.length && !policy.allowPayTo.includes(payTo)) {
    reasons.push(
      guardReason(
        "RECIPIENT_NOT_ALLOWLISTED",
        "critical",
        "The payment recipient is not on the caller's allowlist.",
      ),
    );
    hardBlock = true;
  }
  if (amountAtomic !== null && amountAtomic > policy.maxSingleAtomic) {
    reasons.push(
      guardReason(
        "SINGLE_PAYMENT_LIMIT_EXCEEDED",
        "critical",
        `The requested ${formatUnits(BigInt(amountAtomic), 6)} USDC exceeds the ${formatUnits(BigInt(policy.maxSingleAtomic), 6)} USDC single-payment limit.`,
      ),
    );
    hardBlock = true;
  }
  if (
    amountAtomic !== null &&
    Number.isFinite(policy.humanReviewAtomic) &&
    amountAtomic >= policy.humanReviewAtomic
  ) {
    reasons.push(
      guardReason(
        "HUMAN_APPROVAL_REQUIRED",
        "medium",
        "The payment meets the policy threshold for explicit human review.",
      ),
    );
    needsReview = true;
  }

  const projectedSession =
    Number(history.sessionReservedAtomic ?? 0) + Number(amountAtomic ?? 0);
  const projectedDaily =
    Number(history.dailyReservedAtomic ?? 0) + Number(amountAtomic ?? 0);
  if (projectedSession > policy.sessionBudgetAtomic) {
    reasons.push(
      guardReason(
        "SESSION_BUDGET_EXCEEDED",
        "critical",
        "This payment would exceed the configured session budget.",
      ),
    );
    hardBlock = true;
  }
  if (projectedDaily > policy.dailyBudgetAtomic) {
    reasons.push(
      guardReason(
        "DAILY_BUDGET_EXCEEDED",
        "critical",
        "This payment would exceed the configured UTC-day budget.",
      ),
    );
    hardBlock = true;
  }
  if (history.duplicateFingerprint) {
    reasons.push(
      guardReason(
        "POSSIBLE_REPLAY",
        "critical",
        "An equivalent payment was evaluated for this session within the replay window.",
      ),
    );
    hardBlock = true;
  }
  if (Number(history.evaluationsLastMinute ?? 0) >= 20) {
    reasons.push(
      guardReason(
        "HIGH_PAYMENT_VELOCITY",
        "high",
        "At least 20 payment evaluations occurred in this policy scope during the last minute.",
        "behavior",
      ),
    );
    needsReview = true;
    riskScore += 25;
  }
  if (Number(history.recipientEvaluationsTenMinutes ?? 0) >= 10) {
    reasons.push(
      guardReason(
        "RECIPIENT_VELOCITY_SPIKE",
        "medium",
        "This recipient has been evaluated at least 10 times in the last ten minutes.",
        "behavior",
      ),
    );
    needsReview = true;
    riskScore += 15;
  }
  if (
    amountAtomic !== null &&
    Number(history.previousAmountAtomic ?? 0) > 0 &&
    amountAtomic > Number(history.previousAmountAtomic) * 3
  ) {
    reasons.push(
      guardReason(
        "PRICE_SPIKE",
        "high",
        "The requested amount is more than three times the last observed amount for this resource.",
        "behavior",
      ),
    );
    needsReview = true;
    riskScore += 25;
  }
  const missingEvidence = [];
  if (payment?.pay_to && !merchant) missingEvidence.push("merchant");
  if (!domain) missingEvidence.push("domain");
  if (transactionExpected && !intent) missingEvidence.push("transaction intent");
  if (transactionExpected && !simulation) missingEvidence.push("transaction simulation");
  if (missingEvidence.length) {
    reasons.push(
      guardReason(
        "REQUIRED_EVIDENCE_UNAVAILABLE",
        failClosed ? "critical" : "high",
        `Required evidence was unavailable: ${missingEvidence.join(", ")}.`,
        "evidence",
      ),
    );
    if (failClosed) hardBlock = true;
    else needsReview = true;
    riskScore += failClosed ? 50 : 25;
  }

  const componentAssessments = [
    ["x402", endpoint?.assessment],
    ["merchant", merchant?.assessment],
    ["domain", domain?.assessment],
    ["transaction", intent?.assessment],
  ];
  for (const [source, assessment] of componentAssessments) {
    for (const flag of assessment?.flags ?? []) {
      reasons.push(
        guardReason(
          flag.code,
          flag.severity ?? "info",
          flag.detail,
          source,
        ),
      );
    }
  }

  if (merchant) riskScore += Math.round(Number(merchant.assessment?.risk_score ?? 0) * 0.35);
  if (domain) riskScore += Math.round(Number(domain.assessment?.risk_score ?? 0) * 0.25);
  if (intent) riskScore += Math.round(Number(intent.assessment?.risk_score ?? 0) * 0.6);
  if (transactionExpected && simulation && !simulation.success) {
    reasons.push(
      guardReason(
        "TRANSACTION_SIMULATION_REVERTED",
        "critical",
        simulation.revert_reason ?? "The proposed transaction reverted during simulation.",
        "simulation",
      ),
    );
    hardBlock = true;
    riskScore += 70;
  }
  riskScore = Math.min(100, riskScore);
  if (intent?.assessment?.risk_level === "high") hardBlock = true;

  const decision = hardBlock
    ? "BLOCK"
    : needsReview || riskScore >= 30
      ? "REVIEW"
      : "ALLOW";
  const fingerprint = await sha256Hex(
    JSON.stringify({
      session_id: sessionId,
      target_url: endpoint?.url ?? targetUrl,
      pay_to: payTo,
      amount_atomic: amountAtomic,
      asset: payment?.asset ?? null,
      network: payment?.network ?? null,
      to: intent?.transaction?.to ?? null,
      selector: intent?.transaction?.selector ?? null,
    }),
  );
  const reservedAtomic = decision === "ALLOW" ? Number(amountAtomic ?? 0) : 0;

  return {
    product: "agent-payment-guard",
    schema_version: "1.0",
    evaluated_at: evaluatedAt,
    decision,
    risk_score: riskScore,
    request_id: requestId,
    session_id: sessionId,
    profile: profile
      ? {
          profile_id: profile.profile_id,
          name: profile.name,
          policy_version: Number(profile.policy_version),
        }
      : null,
    fingerprint,
    payment: {
      target_url: endpoint?.url ?? targetUrl,
      network: payment?.network ?? null,
      scheme: payment?.scheme ?? null,
      asset: payment?.asset ?? null,
      pay_to: payTo,
      amount_atomic: amountAtomic,
      amount_usdc:
        amountAtomic === null ? null : formatUnits(BigInt(amountAtomic), 6),
    },
    policy: {
      max_single_usdc: formatUnits(BigInt(policy.maxSingleAtomic), 6),
      session_budget_usdc: formatUnits(BigInt(policy.sessionBudgetAtomic), 6),
      daily_budget_usdc: formatUnits(BigInt(policy.dailyBudgetAtomic), 6),
      allow_pay_to: policy.allowPayTo,
      block_pay_to: policy.blockPayTo,
      reservation_ttl_seconds: policy.reservationTtlSeconds ?? 300,
      retention_days: policy.retentionDays ?? 30,
      human_review_above_usdc: Number.isFinite(policy.humanReviewAtomic)
        ? formatUnits(BigInt(policy.humanReviewAtomic), 6)
        : null,
      fail_closed: failClosed,
      mandate: {
        allowed_domains: policy.allowedDomains ?? [],
        allowed_tools: policy.allowedTools ?? [],
        allowed_purposes: policy.allowedPurposes ?? [],
        active_hours_utc: [
          policy.activeFromHourUtc ?? 0,
          policy.activeUntilHourUtc ?? 24,
        ],
        supplied_tool_id: toolId,
        supplied_purpose: purpose,
      },
    },
    budget: {
      storage_mode: history.storageMode ?? "stateless",
      prior_session_reserved_usdc: formatUnits(
        BigInt(history.sessionReservedAtomic ?? 0),
        6,
      ),
      prior_daily_reserved_usdc: formatUnits(
        BigInt(history.dailyReservedAtomic ?? 0),
        6,
      ),
      reserved_by_this_decision_usdc: formatUnits(BigInt(reservedAtomic), 6),
      remaining_session_usdc: formatUnits(
        BigInt(Math.max(0, policy.sessionBudgetAtomic - projectedSession)),
        6,
      ),
      remaining_daily_usdc: formatUnits(
        BigInt(Math.max(0, policy.dailyBudgetAtomic - projectedDaily)),
        6,
      ),
    },
    reasons,
    evidence: {
      x402: endpoint,
      merchant,
      domain,
      transaction_intent: intent,
      transaction_simulation: simulation,
    },
    limitations: [
      "ALLOW is a policy decision based on public data, not a guarantee of merchant honesty or successful delivery.",
      "An ALLOW decision reserves budget for replay protection; callers should use a new request_id for a distinct purchase.",
      "This service never holds keys, signs transactions, or submits payments.",
    ],
  };
}

async function loadPaymentGuardHistory(
  db,
  sessionId,
  requestId,
  fingerprintSeed,
  profileId = null,
  payTo = null,
  targetResource = null,
  now = new Date(),
) {
  if (!db) {
    return {
      storageMode: "stateless",
      duplicateFingerprint: false,
      sessionReservedAtomic: 0,
      dailyReservedAtomic: 0,
      evaluationsLastMinute: 0,
      recipientEvaluationsTenMinutes: 0,
      previousAmountAtomic: 0,
      existingRequest: null,
    };
  }
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const replayStart = new Date(now.getTime() - 10 * 60 * 1000);
  const minuteStart = new Date(now.getTime() - 60 * 1000);
  const scopeColumn = profileId ? "profile_id" : "session_id";
  const scopeValue = profileId ?? sessionId;
  const [sessionBudget, dailyBudget, duplicate, existing, behavior] =
    await db.batch([
    db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE
            WHEN reservation_status = 'committed'
              OR (reservation_status = 'reserved' AND expires_at > ?)
            THEN amount_atomic ELSE 0 END), 0) AS reserved
         FROM payment_guard_evaluations
         WHERE session_id = ? AND (? IS NULL OR profile_id = ?)`,
      )
      .bind(
        now.toISOString(),
        sessionId,
        profileId,
        profileId,
      ),
    db
      .prepare(
        `SELECT COALESCE(SUM(CASE
          WHEN reservation_status = 'committed'
            OR (reservation_status = 'reserved' AND expires_at > ?)
          THEN amount_atomic ELSE 0 END), 0) AS reserved
         FROM payment_guard_evaluations
         WHERE created_at >= ? AND ${scopeColumn} = ?`,
      )
      .bind(now.toISOString(), dayStart.toISOString(), scopeValue),
    db
      .prepare(
        `SELECT request_id FROM payment_guard_evaluations
         WHERE session_id = ? AND fingerprint = ? AND created_at >= ?
           AND reservation_status IN ('reserved', 'committed')
           AND (reservation_status = 'committed' OR expires_at > ?)
         LIMIT 1`,
      )
      .bind(
        sessionId,
        fingerprintSeed,
        replayStart.toISOString(),
        now.toISOString(),
      ),
    db
      .prepare(
        `SELECT request_id, decision, risk_score, reasons_json, created_at,
                reservation_status, expires_at, tx_hash, decision_token
         FROM payment_guard_evaluations WHERE request_id = ? LIMIT 1`,
      )
      .bind(requestId),
    db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0)
            AS evaluations_last_minute,
          COALESCE(SUM(CASE WHEN created_at >= ? AND pay_to = ?
            THEN 1 ELSE 0 END), 0) AS recipient_evaluations_ten_minutes,
          COALESCE((
            SELECT amount_atomic FROM payment_guard_evaluations
            WHERE ${scopeColumn} = ? AND target_url = ?
            ORDER BY id DESC LIMIT 1
          ), 0) AS previous_amount
         FROM payment_guard_evaluations WHERE ${scopeColumn} = ?`,
      )
      .bind(
        minuteStart.toISOString(),
        replayStart.toISOString(),
        payTo,
        scopeValue,
        targetResource,
        scopeValue,
      ),
  ]);
  return {
    storageMode: "d1",
    duplicateFingerprint: Boolean(duplicate.results?.[0]),
    sessionReservedAtomic: Number(
      sessionBudget.results?.[0]?.reserved ?? 0,
    ),
    dailyReservedAtomic: Number(dailyBudget.results?.[0]?.reserved ?? 0),
    evaluationsLastMinute: Number(
      behavior.results?.[0]?.evaluations_last_minute ?? 0,
    ),
    recipientEvaluationsTenMinutes: Number(
      behavior.results?.[0]?.recipient_evaluations_ten_minutes ?? 0,
    ),
    previousAmountAtomic: Number(
      behavior.results?.[0]?.previous_amount ?? 0,
    ),
    existingRequest: existing.results?.[0] ?? null,
  };
}

async function savePaymentGuardEvaluation(db, result) {
  if (!db) return;
  const auditUrl = new URL(result.payment.target_url);
  auditUrl.search = "";
  auditUrl.hash = "";
  const retentionCutoff = new Date(
    Date.parse(result.evaluated_at) -
      Number(result.policy.retention_days ?? 30) * 86_400_000,
  ).toISOString();
  if (result.profile?.profile_id) {
    await db
      .prepare(
        `DELETE FROM payment_guard_evaluations
         WHERE profile_id = ? AND created_at < ?`,
      )
      .bind(result.profile.profile_id, retentionCutoff)
      .run();
  } else {
    await db
      .prepare(
        `DELETE FROM payment_guard_evaluations
         WHERE profile_id IS NULL AND session_id = ? AND created_at < ?`,
      )
      .bind(result.session_id, retentionCutoff)
      .run();
  }
  await db
    .prepare(
      `INSERT INTO payment_guard_evaluations
       (request_id, session_id, fingerprint, target_url, pay_to, amount_atomic,
        decision, risk_score, reasons_json, created_at, profile_id,
        reservation_status, expires_at, decision_token, approval_status,
        mandate_json, simulation_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      result.request_id,
      result.session_id,
      result.fingerprint,
      auditUrl.toString(),
      result.payment.pay_to,
      result.payment.amount_atomic ?? 0,
      result.decision,
      result.risk_score,
      JSON.stringify(result.reasons),
      result.evaluated_at,
      result.profile?.profile_id ?? null,
      result.decision === "ALLOW" ? "reserved" : "none",
      result.reservation?.expires_at ?? null,
      result.decision_token ?? null,
      result.decision === "REVIEW" && result.profile?.profile_id
        ? "pending"
        : "not_required",
      JSON.stringify(result.policy.mandate ?? null),
      JSON.stringify(result.evidence.transaction_simulation ?? null),
    )
    .run();
  const origin = new URL(result.payment.target_url).origin;
  const merchantKey = await sha256Hex(
    `${origin}|${result.payment.pay_to ?? ""}`,
  );
  await db
    .prepare(
      `INSERT INTO payment_guard_merchant_stats
       (merchant_key, origin, pay_to, evaluation_count, allow_count,
        review_count, block_count, last_amount_atomic, last_seen_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(merchant_key) DO UPDATE SET
         evaluation_count = evaluation_count + 1,
         allow_count = allow_count + excluded.allow_count,
         review_count = review_count + excluded.review_count,
         block_count = block_count + excluded.block_count,
         last_amount_atomic = excluded.last_amount_atomic,
         last_seen_at = excluded.last_seen_at,
         updated_at = excluded.updated_at`,
    )
    .bind(
      merchantKey,
      origin,
      result.payment.pay_to,
      result.decision === "ALLOW" ? 1 : 0,
      result.decision === "REVIEW" ? 1 : 0,
      result.decision === "BLOCK" ? 1 : 0,
      result.payment.amount_atomic ?? 0,
      result.evaluated_at,
      result.evaluated_at,
    )
    .run();
}

export async function paymentGuardEvaluate({
  targetUrl,
  sessionId,
  requestId,
  policy,
  to = null,
  data = null,
  value = "0",
  db = null,
  profile = null,
  signingSecret = null,
  toolId = null,
  purpose = null,
  fetchImpl = fetch,
}) {
  const endpoint = await x402EndpointPreflight(targetUrl, fetchImpl);
  const method =
    endpoint.x402.accepts.find(
      item =>
        item.network === BASE_MAINNET &&
        String(item.asset ?? "").toLowerCase() === USDC.toLowerCase(),
    ) ?? endpoint.x402.accepts[0] ?? null;
  const domainName = new URL(endpoint.url).hostname;
  const fingerprintSeed = await sha256Hex(
    JSON.stringify({
      target_url: endpoint.url,
      pay_to: method?.pay_to?.toLowerCase() ?? null,
      amount_atomic: method?.amount_atomic ?? null,
      to: to?.toLowerCase() ?? null,
      data: data?.toLowerCase() ?? null,
      value,
    }),
  );
  const history = await loadPaymentGuardHistory(
    db,
    sessionId,
    requestId,
    fingerprintSeed,
    profile?.profile_id ?? null,
    method?.pay_to?.toLowerCase() ?? null,
    new URL(endpoint.url).origin + new URL(endpoint.url).pathname,
  );
  if (history.existingRequest) {
    return {
      product: "agent-payment-guard",
      schema_version: "1.0",
      decision: history.existingRequest.decision,
      risk_score: Number(history.existingRequest.risk_score),
      request_id: requestId,
      session_id: sessionId,
      idempotent_replay: true,
      original_evaluated_at: history.existingRequest.created_at,
      reservation_status: history.existingRequest.reservation_status,
      expires_at: history.existingRequest.expires_at,
      tx_hash: history.existingRequest.tx_hash,
      decision_token: history.existingRequest.decision_token,
      reasons: JSON.parse(history.existingRequest.reasons_json),
    };
  }
  const [merchant, domain, intent, simulation] = await Promise.all([
    method?.pay_to && ADDRESS_PATTERN.test(method.pay_to)
      ? merchantTrust(method.pay_to, fetchImpl).catch(() => null)
      : Promise.resolve(null),
    domainTrustPreflight(domainName, fetchImpl).catch(() => null),
    to && data
      ? transactionIntent(to, data, value, fetchImpl).catch(() => null)
      : Promise.resolve(null),
    to && data
      ? simulateBaseTransaction(to, data, value, null, fetchImpl).catch(
          () => null,
        )
      : Promise.resolve(null),
  ]);
  const result = await buildPaymentGuardDecision({
    targetUrl,
    sessionId,
    requestId,
    endpoint,
    merchant,
    domain,
    intent,
    simulation,
    history: {
      ...history,
      duplicateFingerprint:
        history.duplicateFingerprint || Boolean(history.fingerprintSeed),
    },
    policy,
    profile,
    transactionExpected: Boolean(to && data),
    toolId,
    purpose,
  });
  result.fingerprint = fingerprintSeed;
  if (result.decision === "ALLOW") {
    const expiresAt = new Date(
      Date.now() + Number(policy.reservationTtlSeconds ?? 300) * 1000,
    ).toISOString();
    result.reservation = {
      status: "reserved",
      expires_at: expiresAt,
      commit_url: PAYMENT_GUARD_LIFECYCLE_PATH,
    };
    result.decision_token = await signPaymentGuardDecision(
      {
        request_id: result.request_id,
        session_id: result.session_id,
        profile_id: result.profile?.profile_id ?? null,
        policy_version: result.profile?.policy_version
          ? Number(result.profile.policy_version)
          : null,
        fingerprint: result.fingerprint,
        target_url: result.payment.target_url,
        pay_to: result.payment.pay_to,
        amount_atomic: result.payment.amount_atomic,
        issued_at: result.evaluated_at,
        expires_at: expiresAt,
      },
      signingSecret,
    );
  }
  await savePaymentGuardEvaluation(db, result);
  await enqueuePaymentGuardEvent(
    db,
    result.profile?.profile_id ?? null,
    `decision.${result.decision.toLowerCase()}`,
    {
      request_id: result.request_id,
      session_id: result.session_id,
      decision: result.decision,
      risk_score: result.risk_score,
      payment: result.payment,
      reasons: result.reasons,
    },
  );
  return result;
}

async function updatePaymentGuardReservation({
  db,
  action,
  decisionToken,
  txHash = null,
  signingSecret,
  fetchImpl = fetch,
}) {
  if (!db) throw new Error("payment_guard_database_unavailable");
  const token = await verifyPaymentGuardDecision(
    decisionToken,
    signingSecret,
  );
  const record = await db
    .prepare(
      `SELECT e.request_id, e.reservation_status, e.expires_at, e.tx_hash,
              e.profile_id, e.target_url, e.pay_to, e.amount_atomic,
              p.policy_version, p.active
       FROM payment_guard_evaluations e
       LEFT JOIN payment_guard_profiles p ON p.profile_id = e.profile_id
       WHERE e.request_id = ? LIMIT 1`,
    )
    .bind(token.request_id)
    .first();
  if (!record) throw new Error("reservation_not_found");
  if (
    record.profile_id &&
    (!Number(record.active) ||
      Number(record.policy_version) !== Number(token.policy_version))
  ) {
    throw new Error("reservation_policy_invalidated");
  }
  if (record.reservation_status === "committed") {
    return {
      request_id: token.request_id,
      status: "committed",
      tx_hash: record.tx_hash,
      idempotent: true,
    };
  }
  if (action === "release") {
    await db
      .prepare(
        `UPDATE payment_guard_evaluations
         SET reservation_status = 'released'
         WHERE request_id = ? AND reservation_status = 'reserved'`,
      )
      .bind(token.request_id)
      .run();
    await enqueuePaymentGuardEvent(
      db,
      record.profile_id,
      "reservation.released",
      { request_id: token.request_id },
    );
    return {
      request_id: token.request_id,
      status: "released",
      released_at: new Date().toISOString(),
    };
  }
  if (action !== "commit" || !TX_PATTERN.test(txHash ?? "")) {
    throw new Error("invalid_reservation_action");
  }
  const amountUsdc = formatUnits(BigInt(token.amount_atomic ?? 0), 6);
  const proof = await paymentProof(
    txHash,
    token.pay_to,
    amountUsdc,
    fetchImpl,
  );
  if (!proof.verified) throw new Error("payment_proof_not_verified");
  await db
    .prepare(
      `UPDATE payment_guard_evaluations
       SET reservation_status = 'committed', tx_hash = ?
       WHERE request_id = ? AND reservation_status = 'reserved'`,
    )
    .bind(txHash, token.request_id)
    .run();
  await enqueuePaymentGuardEvent(db, record.profile_id, "payment.committed", {
    request_id: token.request_id,
    tx_hash: txHash,
    amount_atomic: Number(record.amount_atomic ?? 0),
  });
  await db
    .prepare(
      `UPDATE payment_guard_merchant_stats
       SET committed_count = committed_count + 1,
           total_committed_atomic = total_committed_atomic + ?,
           updated_at = ?
       WHERE origin = ? AND pay_to = ?`,
    )
    .bind(
      Number(record.amount_atomic ?? 0),
      new Date().toISOString(),
      new URL(record.target_url).origin,
      record.pay_to,
    )
    .run();
  return {
    request_id: token.request_id,
    status: "committed",
    committed_at: new Date().toISOString(),
    tx_hash: txHash,
    payment_proof: proof,
  };
}

async function decidePaymentGuardApproval({
  db,
  profileId,
  ownerToken,
  requestId,
  action,
  note = null,
  signingSecret,
}) {
  const profile = await loadPaymentGuardProfile(
    db,
    profileId,
    ownerToken,
    "owner",
  );
  const record = await db
    .prepare(
      `SELECT request_id, session_id, fingerprint, target_url, pay_to,
              amount_atomic, approval_status, created_at
       FROM payment_guard_evaluations
       WHERE request_id = ? AND profile_id = ? LIMIT 1`,
    )
    .bind(requestId, profileId)
    .first();
  if (!record) throw new Error("approval_request_not_found");
  if (record.approval_status !== "pending") {
    return {
      request_id: requestId,
      approval_status: record.approval_status,
      idempotent: true,
    };
  }
  const now = new Date();
  if (action === "deny") {
    await db
      .prepare(
        `UPDATE payment_guard_evaluations
         SET approval_status = 'denied', denied_at = ?, approval_note = ?,
             decision = 'BLOCK', reservation_status = 'none'
         WHERE request_id = ? AND approval_status = 'pending'`,
      )
      .bind(now.toISOString(), String(note ?? "").slice(0, 500), requestId)
      .run();
    await enqueuePaymentGuardEvent(db, profileId, "approval.denied", {
      request_id: requestId,
      note: String(note ?? "").slice(0, 500),
    });
    return {
      request_id: requestId,
      approval_status: "denied",
      decision: "BLOCK",
      denied_at: now.toISOString(),
    };
  }
  if (action !== "approve") throw new Error("invalid_approval_action");
  const policy = profile.policy;
  const history = await loadPaymentGuardHistory(
    db,
    record.session_id,
    `approval-check:${requestId}`,
    `approval-check:${record.fingerprint}`,
    profileId,
    record.pay_to,
    record.target_url,
    now,
  );
  const amountAtomic = Number(record.amount_atomic ?? 0);
  if (
    amountAtomic > Number(policy.maxSingleAtomic) ||
    Number(history.sessionReservedAtomic) + amountAtomic >
      Number(policy.sessionBudgetAtomic) ||
    Number(history.dailyReservedAtomic) + amountAtomic >
      Number(policy.dailyBudgetAtomic)
  ) {
    throw new Error("approval_budget_exceeded");
  }
  const expiresAt = new Date(
    now.getTime() + Number(policy.reservationTtlSeconds ?? 300) * 1000,
  ).toISOString();
  const decisionToken = await signPaymentGuardDecision(
    {
      request_id: record.request_id,
      session_id: record.session_id,
      profile_id: profileId,
      policy_version: Number(profile.policy_version),
      fingerprint: record.fingerprint,
      target_url: record.target_url,
      pay_to: record.pay_to,
      amount_atomic: amountAtomic,
      issued_at: now.toISOString(),
      expires_at: expiresAt,
      human_approved: true,
    },
    signingSecret,
  );
  await db
    .prepare(
      `UPDATE payment_guard_evaluations
       SET approval_status = 'approved', approved_at = ?, approval_note = ?,
           decision = 'ALLOW', reservation_status = 'reserved',
           expires_at = ?, decision_token = ?
       WHERE request_id = ? AND approval_status = 'pending'`,
    )
    .bind(
      now.toISOString(),
      String(note ?? "").slice(0, 500),
      expiresAt,
      decisionToken,
      requestId,
    )
    .run();
  await enqueuePaymentGuardEvent(db, profileId, "approval.approved", {
    request_id: requestId,
    expires_at: expiresAt,
  });
  return {
    request_id: requestId,
    approval_status: "approved",
    decision: "ALLOW",
    approved_at: now.toISOString(),
    reservation: { status: "reserved", expires_at: expiresAt },
    decision_token: decisionToken,
  };
}

async function reportPaymentGuardDelivery({
  db,
  decisionToken,
  status,
  httpStatus = null,
  contentType = null,
  latencyMs = null,
  contentHash = null,
  signingSecret,
}) {
  if (!["success", "failure"].includes(status)) {
    throw new Error("invalid_delivery_status");
  }
  const token = await verifyPaymentGuardDecision(decisionToken, signingSecret, {
    allowExpired: true,
  });
  const record = await db
    .prepare(
      `SELECT request_id, target_url, pay_to, reservation_status,
              delivery_status
       FROM payment_guard_evaluations WHERE request_id = ? LIMIT 1`,
    )
    .bind(token.request_id)
    .first();
  if (!record) throw new Error("delivery_request_not_found");
  if (record.reservation_status !== "committed") {
    throw new Error("delivery_requires_committed_payment");
  }
  const normalizedHttpStatus =
    httpStatus === null ? null : Number(httpStatus);
  const normalizedLatency = latencyMs === null ? null : Number(latencyMs);
  if (
    (normalizedHttpStatus !== null &&
      (!Number.isInteger(normalizedHttpStatus) ||
        normalizedHttpStatus < 100 ||
        normalizedHttpStatus > 599)) ||
    (normalizedLatency !== null &&
      (!Number.isInteger(normalizedLatency) ||
        normalizedLatency < 0 ||
        normalizedLatency > 300_000)) ||
    (contentHash &&
      !/^[a-fA-F0-9]{64}$/.test(String(contentHash)))
  ) {
    throw new Error("invalid_delivery_evidence");
  }
  const deliveredAt = new Date().toISOString();
  await db
    .prepare(
      `UPDATE payment_guard_evaluations
       SET delivery_status = ?, delivery_http_status = ?,
           delivery_content_type = ?, delivery_latency_ms = ?,
           delivery_hash = ?, delivered_at = ?
       WHERE request_id = ?`,
    )
    .bind(
      status,
      normalizedHttpStatus,
      String(contentType ?? "").slice(0, 200) || null,
      normalizedLatency,
      contentHash ? String(contentHash).toLowerCase() : null,
      deliveredAt,
      token.request_id,
    )
    .run();
  const profileRecord = await db
    .prepare(
      `SELECT profile_id FROM payment_guard_evaluations
       WHERE request_id = ? LIMIT 1`,
    )
    .bind(token.request_id)
    .first();
  await enqueuePaymentGuardEvent(
    db,
    profileRecord?.profile_id ?? null,
    `delivery.${status}`,
    {
      request_id: token.request_id,
      status,
      http_status: normalizedHttpStatus,
      latency_ms: normalizedLatency,
    },
  );
  await db
    .prepare(
      `UPDATE payment_guard_merchant_stats
       SET delivery_success_count = delivery_success_count + ?,
           delivery_failure_count = delivery_failure_count + ?,
           updated_at = ?
       WHERE origin = ? AND pay_to = ?`,
    )
    .bind(
      status === "success" ? 1 : 0,
      status === "failure" ? 1 : 0,
      deliveredAt,
      new URL(record.target_url).origin,
      record.pay_to,
    )
    .run();
  return {
    request_id: token.request_id,
    delivery_status: status,
    delivered_at: deliveredAt,
    evidence: {
      attestation: "client_reported",
      http_status: normalizedHttpStatus,
      content_type: contentType ?? null,
      latency_ms: normalizedLatency,
      content_sha256: contentHash?.toLowerCase() ?? null,
    },
  };
}

async function paymentGuardStatus(db, profileId, ownerToken) {
  const profile = await loadPaymentGuardProfile(
    db,
    profileId,
    ownerToken,
    "owner",
  );
  const now = new Date().toISOString();
  const summary = await db
    .prepare(
      `SELECT
        COUNT(*) AS evaluation_count,
        COALESCE(SUM(CASE WHEN reservation_status = 'committed'
          THEN amount_atomic ELSE 0 END), 0) AS committed_atomic,
        COALESCE(SUM(CASE WHEN reservation_status = 'reserved' AND expires_at > ?
          THEN amount_atomic ELSE 0 END), 0) AS reserved_atomic,
        COALESCE(SUM(CASE WHEN decision = 'BLOCK' THEN 1 ELSE 0 END), 0) AS blocked_count
       FROM payment_guard_evaluations WHERE profile_id = ?`,
    )
    .bind(now, profileId)
    .first();
  const recent = await db
    .prepare(
      `SELECT request_id, session_id, target_url, pay_to, amount_atomic,
              decision, risk_score, reservation_status, expires_at, tx_hash,
              approval_status, approved_at, denied_at, delivery_status,
              delivery_http_status, delivery_latency_ms, delivered_at,
              created_at
       FROM payment_guard_evaluations
       WHERE profile_id = ? ORDER BY id DESC LIMIT 25`,
    )
    .bind(profileId)
    .all();
  const merchants = await db
    .prepare(
      `SELECT origin, pay_to, evaluation_count, allow_count, review_count,
              block_count, committed_count, delivery_success_count,
              delivery_failure_count, total_committed_atomic,
              last_amount_atomic, last_seen_at
       FROM payment_guard_merchant_stats
       WHERE pay_to IN (
         SELECT DISTINCT pay_to FROM payment_guard_evaluations
         WHERE profile_id = ? AND pay_to IS NOT NULL
       )
       ORDER BY last_seen_at DESC LIMIT 25`,
    )
    .bind(profileId)
    .all();
  return {
    profile: {
      profile_id: profile.profile_id,
      name: profile.name,
      policy_version: Number(profile.policy_version),
      policy: profile.policy,
    },
    summary: {
      evaluation_count: Number(summary?.evaluation_count ?? 0),
      blocked_count: Number(summary?.blocked_count ?? 0),
      reserved_usdc: formatUnits(
        BigInt(summary?.reserved_atomic ?? 0),
        6,
      ),
      committed_usdc: formatUnits(
        BigInt(summary?.committed_atomic ?? 0),
        6,
      ),
    },
    recent: (recent.results ?? []).map(item => ({
      ...item,
      amount_usdc: formatUnits(BigInt(item.amount_atomic ?? 0), 6),
    })),
    merchants: (merchants.results ?? []).map(item => ({
      ...item,
      total_committed_usdc: formatUnits(
        BigInt(item.total_committed_atomic ?? 0),
        6,
      ),
      last_amount_usdc: formatUnits(
        BigInt(item.last_amount_atomic ?? 0),
        6,
      ),
      delivery_success_rate:
        Number(item.delivery_success_count ?? 0) +
          Number(item.delivery_failure_count ?? 0) >
        0
          ? Number(item.delivery_success_count ?? 0) /
            (Number(item.delivery_success_count ?? 0) +
              Number(item.delivery_failure_count ?? 0))
          : null,
    })),
  };
}

function discovery(product) {
  if (product.id === "agent-payment-guard") {
    return declareDiscoveryExtension({
      method: "GET",
      input: product.input,
      inputSchema: product.inputSchema,
      output: {
        example: {
          product: "agent-payment-guard",
          decision: "ALLOW",
          risk_score: 4,
          payment: {
            network: BASE_MAINNET,
            amount_usdc: "0.01",
            pay_to: PAY_TO,
          },
          policy: {
            budget_enforced: true,
            replay_protection: true,
            human_approval: true,
            mandate_enforced: true,
          },
          evidence: {
            merchant_risk: "low",
            domain_risk: "low",
            transaction_simulation: "success",
          },
          reasons: [],
        },
        schema: {
          properties: {
            product: { type: "string" },
            decision: { type: "string", enum: ["ALLOW", "REVIEW", "BLOCK"] },
            risk_score: { type: "number" },
            payment: { type: "object" },
            policy: { type: "object" },
            budget: { type: "object" },
            reasons: { type: "array" },
            evidence: { type: "object" },
            decision_token: { type: "string" },
          },
          required: ["product", "decision", "risk_score", "payment", "reasons"],
        },
      },
    });
  }
  return declareDiscoveryExtension({
    method: "GET",
    input: product.input,
    inputSchema: product.inputSchema,
    output: {
      example: {
        product: product.id,
        network: BASE_MAINNET,
        assessment: { risk_level: "low", risk_score: 0, flags: [] },
      },
      schema: {
        properties: {
          product: { type: "string" },
          network: { type: "string" },
          assessment: { type: "object" },
          identity: { type: "object" },
          activity: { type: "object" },
          provenance: { type: "object" },
        },
      },
    },
  });
}

function openApi(origin) {
  const document = {
    openapi: "3.1.0",
    info: {
      title: "Agent Payment Guard API",
      version: "2.0.0",
      description:
        "A stateful x402 payment firewall for AI agents with budget policy, merchant and domain risk, transaction simulation, human approval, replay protection, delivery evidence, webhooks, MCP, and twenty-five underlying safety tools.",
    },
    servers: [{ url: origin }],
    paths: {},
  };
  for (const product of PRODUCTS) {
    document.paths[product.path] = {
      get: {
        operationId: `buy${product.id
          .split("-")
          .map(part => part[0].toUpperCase() + part.slice(1))
          .join("")}`,
        summary: product.description,
        parameters: Object.entries(product.inputSchema.properties).map(
          ([name, schema]) => ({
            name,
            in: "query",
            required: product.inputSchema.required?.includes(name) ?? false,
            schema,
          }),
        ),
        "x-payment-protocol": "x402",
        "x-price-usdc": product.price,
        responses: {
          200: { description: "Paid safety intelligence response" },
          400: { description: "Invalid input" },
          402: { description: "x402 payment required" },
          502: { description: "Public-chain data provider unavailable" },
        },
      },
    };
  }
  document.paths[PRODUCTS[25].path].post = {
    operationId: "evaluateAgentPaymentGuardJson",
    summary:
      "Evaluate a payment using a JSON body and an optional owner-controlled policy profile.",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              url: { type: "string", format: "uri" },
              session_id: { type: "string" },
              request_id: { type: "string" },
              profile_id: { type: "string" },
              agent_token: { type: "string" },
              max_single_usdc: { type: "string" },
              session_budget_usdc: { type: "string" },
              daily_budget_usdc: { type: "string" },
              reservation_ttl_seconds: {
                type: "integer",
                minimum: 30,
                maximum: 3600,
              },
              retention_days: {
                type: "integer",
                minimum: 1,
                maximum: 365,
              },
              human_review_above_usdc: { type: "string" },
              fail_closed: { type: "boolean", default: true },
              allowed_domains: {
                oneOf: [
                  { type: "string" },
                  { type: "array", items: { type: "string" } },
                ],
              },
              allowed_tools: {
                oneOf: [
                  { type: "string" },
                  { type: "array", items: { type: "string" } },
                ],
              },
              allowed_purposes: {
                oneOf: [
                  { type: "string" },
                  { type: "array", items: { type: "string" } },
                ],
              },
              active_from_hour_utc: {
                type: "integer",
                minimum: 0,
                maximum: 23,
              },
              active_until_hour_utc: {
                type: "integer",
                minimum: 1,
                maximum: 24,
              },
              tool_id: { type: "string" },
              purpose: { type: "string" },
              allow_pay_to: { type: "string" },
              block_pay_to: { type: "string" },
              to: { type: "string" },
              data: { type: "string" },
              value: { type: "string" },
            },
            required: ["url", "session_id", "request_id"],
          },
        },
      },
    },
    "x-payment-protocol": "x402",
    "x-price-usdc": PRODUCTS[25].price,
    responses: {
      200: { description: "Signed Payment Guard decision" },
      400: { description: "Invalid request" },
      402: { description: "x402 payment required" },
      403: { description: "Policy authentication failed" },
    },
  };
  document.paths[PAYMENT_GUARD_POLICY_PATH] = {
    post: {
      operationId: "createPaymentGuardPolicy",
      summary:
        "Create an owner-controlled policy profile and one-time owner and agent tokens.",
      "x-payment-protocol": "x402",
      "x-price-usdc": PRODUCTS[25].price,
      responses: {
        200: { description: "Policy profile and one-time tokens" },
        402: { description: "x402 payment required" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_LIFECYCLE_PATH] = {
    post: {
      operationId: "updatePaymentGuardReservation",
      summary:
        "Commit a reservation with a verified Base USDC transaction or release it.",
      responses: {
        200: { description: "Updated reservation state" },
        400: { description: "Invalid or expired decision token" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_POLICY_MANAGE_PATH] = {
    post: {
      operationId: "managePaymentGuardPolicy",
      summary:
        "Update or revoke a policy profile and rotate owner or agent credentials.",
      responses: {
        200: { description: "Updated policy or credentials" },
        403: { description: "Owner authentication failed" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_STATUS_PATH] = {
    post: {
      operationId: "getPaymentGuardStatus",
      summary:
        "Read authenticated policy budget, reservation, and recent audit status.",
      responses: {
        200: { description: "Authenticated policy status" },
        403: { description: "Owner authentication failed" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_APPROVAL_PATH] = {
    post: {
      operationId: "decidePaymentGuardApproval",
      summary: "Approve or deny a REVIEW decision using the policy owner token.",
      responses: {
        200: { description: "Approval decision and optional signed reservation" },
        400: { description: "Approval failed" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_DELIVERY_PATH] = {
    post: {
      operationId: "reportPaymentGuardDelivery",
      summary:
        "Attach client-reported post-payment delivery evidence to a committed payment.",
      responses: {
        200: { description: "Delivery evidence recorded" },
        400: { description: "Invalid delivery evidence" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_WEBHOOK_PATH] = {
    post: {
      operationId: "managePaymentGuardWebhook",
      summary: "Create or disable a signed policy webhook.",
      responses: {
        200: { description: "Webhook configuration" },
        400: { description: "Webhook configuration failed" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_MCP_PATH] = {
    post: {
      operationId: "paymentGuardMcp",
      summary: "MCP JSON-RPC endpoint for Payment Guard discovery and status.",
      responses: {
        200: { description: "MCP JSON-RPC response" },
      },
    },
  };
  return document;
}

function agentCard(origin) {
  const orderedProducts = [
    PRODUCTS[25],
    ...PRODUCTS.filter(product => product !== PRODUCTS[25]),
  ];
  return {
    name: "Agent Payment Guard",
    description:
      "Protect autonomous AI-agent spending with x402 payment risk scoring, budget and mandate enforcement, transaction simulation, human approval, replay protection, and auditable delivery evidence.",
    url: origin,
    version: "2.0.0",
    documentationUrl: `${origin}/openapi.json`,
    defaultInputModes: ["application/json", "text/plain"],
    defaultOutputModes: ["application/json"],
    skills: orderedProducts.map(product => ({
      id: product.id,
      name: product.id
        .split("-")
        .map(part => part[0].toUpperCase() + part.slice(1))
        .join(" "),
      description: product.description,
      tags:
        product.id === "agent-payment-guard"
          ? ["x402", "AI agent", "payment firewall", "risk", "budget"]
          : ["Base", "x402", "agent-commerce", "payment-safety"],
      examples: [product.description],
    })),
    provider: {
      organization: "Agent Commerce Safety",
      url: origin,
    },
  };
}

function serviceManifest(origin) {
  const orderedProducts = [
    PRODUCTS[25],
    ...PRODUCTS.filter(product => product !== PRODUCTS[25]),
  ];
  return {
    schema_version: "1.0",
    name: "Agent Payment Guard API",
    description:
      "Agent Payment Guard with policy, budget, replay, audit, merchant, domain, and transaction checks, plus twenty-five underlying tools.",
    base_url: origin,
    openapi_url: `${origin}/openapi.json`,
    agent_card_url: `${origin}/.well-known/agent-card.json`,
    mcp_url: `${origin}${PAYMENT_GUARD_MCP_PATH}`,
    authentication: { type: "x402", network: BASE_MAINNET },
    facilitator: FACILITATOR,
    payment_recipient: PAY_TO,
    main_product: {
      id: PRODUCTS[25].id,
      path: PRODUCTS[25].path,
      price_usdc: PRODUCTS[25].price,
      capabilities: [
        "owner-controlled policy profiles",
        "POST JSON evaluation",
        "signed decision tokens",
        "reservation commit and release",
        "TTL and replay protection",
        "authenticated audit status",
        "fail-closed evidence policy",
        "profile-wide daily budgets",
        "velocity and price-spike detection",
        "policy update, credential rotation, and revocation",
        "query-redacted audit storage and retention controls",
        "human approval queue",
        "post-payment delivery evidence",
        "merchant delivery and payment history",
        "Base transaction simulation",
        "signed webhook outbox with retries",
        "tool, purpose, domain, and time-window mandates",
        "JavaScript and Python SDKs",
        "MCP discovery and status tools",
      ],
    },
    products: orderedProducts.map(product => ({
        id: product.id,
        method: "GET",
        path: product.path,
        price_usdc: product.price,
        description: product.description,
      })),
  };
}

function productExampleUrl(origin, product) {
  const query = new URLSearchParams(product.input);
  return `${origin}${product.path}?${query.toString()}`;
}

async function verificationData(origin) {
  let bazaarMatches = [];
  let bazaarError = null;
  try {
    const responses = await Promise.all(
      [0, 100, 200].map(offset =>
        fetch(
          `${FACILITATOR}/discovery/resources?type=http&limit=100&offset=${offset}`,
          { headers: { accept: "application/json" } },
        ),
      ),
    );
    const failed = responses.find(response => !response.ok);
    if (failed) throw new Error(`PayAI returned HTTP ${failed.status}`);
    const payloads = await Promise.all(responses.map(response => response.json()));
    bazaarMatches = payloads
      .flatMap(payload => payload.items ?? [])
      .filter(item => item.resource?.startsWith(origin))
      .map(item => ({
        resource: item.resource,
        method: item.method,
        amount_atomic: item.accepts?.[0]?.amount ?? null,
        network: item.accepts?.[0]?.network ?? null,
        pay_to: item.accepts?.[0]?.payTo ?? null,
        last_updated: item.lastUpdated ?? null,
      }));
  } catch (error) {
    bazaarError = error instanceof Error ? error.message : String(error);
  }

  return {
    service: "Agent Commerce Safety API",
    deployment_url: origin,
    checked_at: new Date().toISOString(),
    openapi_url: `${origin}/openapi.json`,
    agent_card_url: `${origin}/.well-known/agent-card.json`,
    service_manifest_url: `${origin}/.well-known/service.json`,
    expected_product_count: PRODUCTS.length,
    bazaar_indexed_count: bazaarMatches.length,
    all_products_indexed: bazaarMatches.length === PRODUCTS.length,
    products: PRODUCTS.map(product => {
      const indexed = bazaarMatches.find(
        item => item.resource === `${origin}${product.path}`,
      );
      return {
        id: product.id,
        path: product.path,
        price_usdc: product.price,
        example_url: productExampleUrl(origin, product),
        bazaar_indexed: Boolean(indexed),
        bazaar_record: indexed ?? null,
      };
    }),
    payai_discovery_url: `${FACILITATOR}/discovery/resources?type=http&limit=100&offset=0`,
    bazaar_error: bazaarError,
  };
}

function verificationHtml(origin) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Agent Payment Guard — Deployment Verification</title>
  <style>
    body{font:16px/1.5 system-ui,sans-serif;max-width:920px;margin:40px auto;padding:0 18px;background:#0b1020;color:#edf2ff}
    h1{font-size:28px}.ok{color:#62e6a7}.bad{color:#ff8b8b}
    .card{background:#151d33;border:1px solid #2a3658;border-radius:12px;padding:16px;margin:12px 0}
    a{color:#8fc7ff;overflow-wrap:anywhere}code{color:#ffd580}small{color:#aeb9d5}
  </style>
</head>
<body>
  <h1>Agent Payment Guard API</h1>
  <p id="summary">Checking deployment and PayAI Bazaar…</p>
  <div id="products"></div>
  <p><a href="/openapi.json">OpenAPI</a> · <a href="/.well-known/agent-card.json">Agent Card</a> · <a href="/.well-known/service.json">Service Manifest</a> · <a href="/verification.json">Raw verification JSON</a></p>
  <script>
    fetch('/verification.json').then(r=>r.json()).then(data=>{
      const good=data.all_products_indexed;
      document.getElementById('summary').innerHTML =
        '<strong class="'+(good?'ok':'bad')+'">'+data.bazaar_indexed_count+'/'+data.expected_product_count+
        ' products indexed in PayAI Bazaar</strong><br><small>Checked '+data.checked_at+'</small>';
      document.getElementById('products').innerHTML=data.products.map(p =>
        '<div class="card"><strong>'+p.id+'</strong> — <code>'+p.price_usdc+' USDC</code><br>'+
        '<span class="'+(p.bazaar_indexed?'ok':'bad')+'">Bazaar: '+(p.bazaar_indexed?'indexed':'not indexed')+'</span><br>'+
        '<a href="'+p.example_url+'">'+p.example_url+'</a></div>'
      ).join('');
    }).catch(error=>{
      document.getElementById('summary').textContent='Verification failed: '+error;
    });
  </script>
</body>
</html>`;
}

function landingHtml(origin) {
  const example = productExampleUrl(origin, PRODUCTS[25]);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Agent Payment Guard — x402 Payment Firewall for AI Agents</title>
  <meta name="description" content="Protect autonomous AI-agent payments with x402 risk scoring, budgets, mandates, transaction simulation, human approval, replay protection, and delivery audits.">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <style>
    :root{color-scheme:dark}body{margin:0;background:#07101f;color:#edf5ff;font:16px/1.55 system-ui,sans-serif}
    main{max-width:960px;margin:auto;padding:64px 22px}.hero{padding:38px;border:1px solid #294369;border-radius:22px;background:linear-gradient(145deg,#101d35,#0b1629)}
    h1{font-size:clamp(36px,7vw,68px);line-height:1.02;margin:0 0 18px}.tag{color:#70e1ae;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    .lead{font-size:21px;color:#c5d5ec;max-width:760px}.buttons{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}
    a.button{padding:11px 16px;border-radius:10px;text-decoration:none;background:#3d82f6;color:white;font-weight:700}.secondary{background:#172a48!important}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:28px 0}.card{padding:18px;border:1px solid #263b5e;border-radius:14px;background:#0d192d}
    code{color:#ffd27d;overflow-wrap:anywhere}.price{font-size:30px;font-weight:800;color:#70e1ae}a{color:#8bc5ff}
  </style>
</head>
<body><main>
  <section class="hero">
    <div class="tag">Agentic commerce safety</div>
    <h1>Stop unsafe agent payments before they happen.</h1>
    <p class="lead">Agent Payment Guard is a stateful x402 payment firewall for autonomous AI agents. It returns one decision—ALLOW, REVIEW, or BLOCK—after enforcing budgets, mandates, merchant and domain risk, transaction simulation, replay protection, and human approval.</p>
    <div class="price">0.01 USDC / evaluation</div>
    <div class="buttons">
      <a class="button" href="${example}">Try the x402 endpoint</a>
      <a class="button secondary" href="/openapi.json">OpenAPI</a>
      <a class="button secondary" href="/.well-known/mcp.json">MCP</a>
    </div>
  </section>
  <section class="grid">
    <div class="card"><h2>Policy enforcement</h2><p>Single, session, and daily budgets; allowlists, blocklists, tool and purpose mandates, UTC windows, and credential rotation.</p></div>
    <div class="card"><h2>Risk evidence</h2><p>x402 metadata, merchant history, domain trust, Base transaction intent, simulation, approvals, velocity, and price changes.</p></div>
    <div class="card"><h2>Operational controls</h2><p>Signed decision tokens, reserve/commit/release, human approval queue, delivery evidence, audit history, and signed webhooks.</p></div>
  </section>
  <p><strong>For agents:</strong> <code>GET ${PRODUCTS[25].path}</code> or POST JSON to the same path.</p>
  <p><a href="/.well-known/service.json">Service manifest</a> · <a href="/.well-known/agent-card.json">A2A Agent Card</a> · <a href="/llms.txt">llms.txt</a> · <a href="/verify">Deployment verification</a></p>
</main></body></html>`;
}

function createPaidApp() {
  const facilitatorClient = new ResilientFacilitatorClient(
    new HTTPFacilitatorClient({ url: FACILITATOR }),
  );
  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    BASE_MAINNET,
    new ExactEvmScheme(),
  );
  const app = new Hono();
  const routes = {};
  for (const product of PRODUCTS) {
    routes[`GET ${product.path}`] = {
      accepts: [
        {
          scheme: "exact",
          price: product.price,
          network: BASE_MAINNET,
          payTo: PAY_TO,
        },
      ],
      description: product.description,
      mimeType: "application/json",
      serviceName:
        product.id === "agent-payment-guard"
          ? "Agent Payment Guard"
          : "Agent Commerce Safety",
      tags:
        product.id === "agent-payment-guard"
          ? ["x402", "AI agents", "payment firewall", "risk", "budget"]
          : ["x402", "Base", "agent safety"],
      iconUrl: SERVICE_ICON,
      extensions: discovery(product),
    };
  }
  const guardProduct = PRODUCTS[25];
  routes[`POST ${guardProduct.path}`] = {
    accepts: [
      {
        scheme: "exact",
        price: guardProduct.price,
        network: BASE_MAINNET,
        payTo: PAY_TO,
      },
    ],
    description: `${guardProduct.description} Accepts a JSON request body.`,
    mimeType: "application/json",
    serviceName: "Agent Payment Guard",
    tags: ["x402", "AI agents", "payment firewall", "risk", "budget"],
    iconUrl: SERVICE_ICON,
  };
  routes[`POST ${PAYMENT_GUARD_POLICY_PATH}`] = {
    accepts: [
      {
        scheme: "exact",
        price: guardProduct.price,
        network: BASE_MAINNET,
        payTo: PAY_TO,
      },
    ],
    description:
      "Create an owner-controlled Payment Guard policy profile and receive one-time owner and agent tokens.",
    mimeType: "application/json",
    serviceName: "Agent Payment Guard",
    tags: ["x402", "AI agents", "payment policy", "budget", "security"],
    iconUrl: SERVICE_ICON,
  };
  const httpServer = new x402HTTPResourceServer(resourceServer, routes);
  app.use("*", paymentMiddlewareFromHTTPServer(httpServer));

  app.get(PRODUCTS[0].path, async c => {
  const address = c.req.query("address") ?? "";
  if (!ADDRESS_PATTERN.test(address)) {
    return c.json({ error: "invalid_base_address" }, 400);
  }
  try {
    return c.json(await addressPreflight(address));
  } catch (error) {
    return c.json(
      {
        error: "upstream_unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
  });

  app.get(PRODUCTS[1].path, async c => {
  const token = c.req.query("token") ?? "";
  if (!ADDRESS_PATTERN.test(token)) {
    return c.json({ error: "invalid_base_token_contract" }, 400);
  }
  try {
    return c.json(await tokenPreflight(token));
  } catch (error) {
    return c.json(
      {
        error: "upstream_unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
  });

  app.get(PRODUCTS[2].path, async c => {
  const address = c.req.query("address") ?? "";
  if (!ADDRESS_PATTERN.test(address)) {
    return c.json({ error: "invalid_base_merchant_address" }, 400);
  }
  try {
    return c.json(await merchantTrust(address));
  } catch (error) {
    return c.json(
      {
        error: "upstream_unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
  });

  app.get(PRODUCTS[3].path, async c => {
  const tx = c.req.query("tx") ?? "";
  const recipient = c.req.query("recipient") ?? "";
  const amount = c.req.query("amount") ?? "";
  if (
    !TX_PATTERN.test(tx) ||
    !ADDRESS_PATTERN.test(recipient) ||
    usdcToAtomic(amount) === null
  ) {
    return c.json({ error: "invalid_payment_proof_input" }, 400);
  }
  try {
    return c.json(await paymentProof(tx, recipient, amount));
  } catch (error) {
    return c.json(
      {
        error: "upstream_unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
  });

  app.get(PRODUCTS[4].path, async c => {
  const address = c.req.query("address") ?? "";
  const since = c.req.query("since") ?? "";
  if (!ADDRESS_PATTERN.test(address) || !Number.isFinite(Date.parse(since))) {
    return c.json({ error: "invalid_wallet_activity_input" }, 400);
  }
  try {
    return c.json(await walletActivityDelta(address, since));
  } catch (error) {
    return c.json(
      {
        error: "upstream_unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
  });

  app.get(PRODUCTS[5].path, async c => {
    const token = c.req.query("token") ?? "";
    const owner = c.req.query("owner") ?? "";
    const spender = c.req.query("spender") ?? "";
    if (
      !ADDRESS_PATTERN.test(token) ||
      !ADDRESS_PATTERN.test(owner) ||
      !ADDRESS_PATTERN.test(spender)
    ) {
      return c.json({ error: "invalid_approval_risk_input" }, 400);
    }
    try {
      return c.json(await approvalRisk(token, owner, spender));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[6].path, async c => {
    const address = c.req.query("address") ?? "";
    if (!ADDRESS_PATTERN.test(address)) {
      return c.json({ error: "invalid_contract_address" }, 400);
    }
    try {
      return c.json(await contractVerification(address));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[7].path, async c => {
    const tx = c.req.query("tx") ?? "";
    if (!TX_PATTERN.test(tx)) {
      return c.json({ error: "invalid_usdc_receipt_input" }, 400);
    }
    try {
      return c.json(await usdcReceipt(tx));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[8].path, async c => {
    const address = c.req.query("address") ?? "";
    if (!ADDRESS_PATTERN.test(address)) {
      return c.json({ error: "invalid_counterparty_address" }, 400);
    }
    try {
      return c.json(await walletCounterparty(address));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[9].path, async c => {
    const address = c.req.query("address") ?? "";
    const fromBlock = c.req.query("from_block") ?? "";
    if (
      !ADDRESS_PATTERN.test(address) ||
      !/^[0-9]+$/.test(fromBlock) ||
      !Number.isSafeInteger(Number(fromBlock))
    ) {
      return c.json({ error: "invalid_event_monitor_input" }, 400);
    }
    try {
      return c.json(await eventLogMonitor(address, fromBlock));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[10].path, async c => {
    const gasLimit = c.req.query("gas_limit") ?? "";
    const parsed = Number(gasLimit);
    if (
      !/^[0-9]+$/.test(gasLimit) ||
      !Number.isSafeInteger(parsed) ||
      parsed < 21_000 ||
      parsed > 30_000_000
    ) {
      return c.json({ error: "invalid_gas_limit" }, 400);
    }
    try {
      return c.json(await gasFeeQuote(gasLimit));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[11].path, async c => {
    const address = c.req.query("address") ?? "";
    if (!ADDRESS_PATTERN.test(address)) {
      return c.json({ error: "invalid_nonce_address" }, 400);
    }
    try {
      return c.json(await nonceReadiness(address));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[12].path, async c => {
    const address = c.req.query("address") ?? "";
    if (!ADDRESS_PATTERN.test(address)) {
      return c.json({ error: "invalid_stablecoin_address" }, 400);
    }
    try {
      return c.json(await stablecoinBalance(address));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[13].path, async c => {
    const token = c.req.query("token") ?? "";
    if (!ADDRESS_PATTERN.test(token)) {
      return c.json({ error: "invalid_dex_token" }, 400);
    }
    try {
      return c.json(await dexMarketMonitor(token));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[14].path, async c => {
    const ticker = c.req.query("ticker") ?? "";
    if (!/^[A-Za-z0-9._-]{3,160}$/.test(ticker)) {
      return c.json({ error: "invalid_prediction_market_ticker" }, 400);
    }
    try {
      return c.json(await predictionMarketSnapshot(ticker));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[15].path, async c => {
    const target = c.req.query("url") ?? "";
    try {
      validatePublicUrl(target);
    } catch (error) {
      return c.json(
        {
          error: "invalid_public_x402_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    try {
      return c.json(await x402EndpointPreflight(target));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[16].path, async c => {
    const packageName = c.req.query("package") ?? "";
    const version = c.req.query("version") ?? "latest";
    if (
      !NPM_PACKAGE_PATTERN.test(packageName) ||
      !/^(?:latest|[0-9A-Za-z][0-9A-Za-z.+_-]{0,79})$/.test(version)
    ) {
      return c.json({ error: "invalid_npm_package_input" }, 400);
    }
    try {
      return c.json(await npmPackagePreflight(packageName, version));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[17].path, async c => {
    const owner = c.req.query("owner") ?? "";
    const repo = c.req.query("repo") ?? "";
    if (
      !GITHUB_OWNER_PATTERN.test(owner) ||
      !GITHUB_REPO_PATTERN.test(repo)
    ) {
      return c.json({ error: "invalid_github_repository_input" }, 400);
    }
    try {
      return c.json(
        await githubRepositoryHealth(owner, repo, c.env?.GITHUB_TOKEN),
      );
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[18].path, async c => {
    const target = c.req.query("url") ?? "";
    try {
      validatePublicUrl(target);
    } catch (error) {
      return c.json(
        {
          error: "invalid_public_document_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    try {
      return c.json(await urlChangeFingerprint(target));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[19].path, async c => {
    const target = c.req.query("url") ?? "";
    try {
      validatePublicUrl(target);
    } catch (error) {
      return c.json(
        {
          error: "invalid_public_feed_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    try {
      return c.json(await feedSnapshot(target));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[20].path, async c => {
    const to = c.req.query("to") ?? "";
    const data = c.req.query("data") ?? "";
    const value = c.req.query("value") ?? "0";
    if (
      !ADDRESS_PATTERN.test(to) ||
      !/^0x(?:[a-fA-F0-9]{2})*$/.test(data) ||
      data.length > 8194 ||
      !/^[0-9]+$/.test(value)
    ) {
      return c.json({ error: "invalid_transaction_intent_input" }, 400);
    }
    try {
      return c.json(await transactionIntent(to, data, value));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[21].path, async c => {
    const target = c.req.query("url") ?? "";
    let parsedTarget;
    try {
      parsedTarget = validatePublicUrl(target);
    } catch (error) {
      return c.json(
        {
          error: "invalid_public_agent_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    try {
      const requestOrigin = new URL(c.req.url).origin;
      if (parsedTarget.origin === requestOrigin) {
        return c.json(
          buildA2aAgentCardPreflight({
            requestedUrl: target,
            cardUrl: `${requestOrigin}/.well-known/agent-card.json`,
            card: agentCard(requestOrigin),
          }),
        );
      }
      return c.json(await a2aAgentCardPreflight(target));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[22].path, async c => {
    const target = c.req.query("url") ?? "";
    let parsedTarget;
    try {
      parsedTarget = validatePublicUrl(target);
    } catch (error) {
      return c.json(
        {
          error: "invalid_public_openapi_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    try {
      const requestOrigin = new URL(c.req.url).origin;
      if (
        parsedTarget.origin === requestOrigin &&
        parsedTarget.pathname === "/openapi.json"
      ) {
        const document = openApi(requestOrigin);
        return c.json(
          await buildOpenApiSpecPreflight({
            requestedUrl: target,
            finalUrl: `${requestOrigin}/openapi.json`,
            document,
            raw: JSON.stringify(document),
          }),
        );
      }
      return c.json(await openApiSpecPreflight(target));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[23].path, async c => {
    const domain = (c.req.query("domain") ?? "").toLowerCase().replace(/\.$/, "");
    if (!DOMAIN_PATTERN.test(domain)) {
      return c.json({ error: "invalid_public_domain" }, 400);
    }
    try {
      return c.json(await domainTrustPreflight(domain));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[24].path, async c => {
    const packageName = c.req.query("package") ?? "";
    const version = c.req.query("version") ?? "latest";
    if (
      !PYPI_PACKAGE_PATTERN.test(packageName) ||
      !/^(?:latest|[A-Za-z0-9][A-Za-z0-9._+!-]{0,99})$/.test(version)
    ) {
      return c.json({ error: "invalid_pypi_package_input" }, 400);
    }
    try {
      return c.json(await pypiPackagePreflight(packageName, version));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[25].path, async c => {
    const targetUrl = c.req.query("url") ?? "";
    const sessionId = c.req.query("session_id") ?? "";
    const requestId = c.req.query("request_id") ?? "";
    const maxSingle = c.req.query("max_single_usdc") ?? "0.10";
    const sessionBudget = c.req.query("session_budget_usdc") ?? "1.00";
    const dailyBudget = c.req.query("daily_budget_usdc") ?? "5.00";
    const to = c.req.query("to") || null;
    const data = c.req.query("data") || null;
    const value = c.req.query("value") ?? "0";
    try {
      validatePublicUrl(targetUrl);
    } catch (error) {
      return c.json(
        {
          error: "invalid_payment_guard_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    if (
      !/^[A-Za-z0-9._:-]{1,96}$/.test(sessionId) ||
      !/^[A-Za-z0-9._:-]{1,128}$/.test(requestId)
    ) {
      return c.json({ error: "invalid_payment_guard_identity" }, 400);
    }
    const maxSingleAtomic = usdcToAtomic(maxSingle);
    const sessionBudgetAtomic = usdcToAtomic(sessionBudget);
    const dailyBudgetAtomic = usdcToAtomic(dailyBudget);
    if (
      maxSingleAtomic === null ||
      sessionBudgetAtomic === null ||
      dailyBudgetAtomic === null ||
      maxSingleAtomic > 1_000_000_000_000n ||
      sessionBudgetAtomic > 1_000_000_000_000n ||
      dailyBudgetAtomic > 1_000_000_000_000n
    ) {
      return c.json({ error: "invalid_payment_guard_budget" }, 400);
    }
    if (
      (to !== null && !ADDRESS_PATTERN.test(to)) ||
      (data !== null &&
        (!/^0x(?:[a-fA-F0-9]{2})*$/.test(data) || data.length > 8194)) ||
      ((to === null) !== (data === null)) ||
      !/^[0-9]+$/.test(value)
    ) {
      return c.json({ error: "invalid_payment_guard_transaction" }, 400);
    }
    try {
      return c.json(
        await paymentGuardEvaluate({
          targetUrl,
          sessionId,
          requestId,
          policy: {
            maxSingleAtomic: Number(maxSingleAtomic),
            sessionBudgetAtomic: Number(sessionBudgetAtomic),
            dailyBudgetAtomic: Number(dailyBudgetAtomic),
            allowPayTo: parseAddressList(c.req.query("allow_pay_to") ?? ""),
            blockPayTo: parseAddressList(c.req.query("block_pay_to") ?? ""),
            reservationTtlSeconds: 300,
            retentionDays: 30,
            humanReviewAtomic: Number(maxSingleAtomic),
            failClosed: true,
            allowedDomains: [],
            allowedTools: [],
            allowedPurposes: [],
            activeFromHourUtc: 0,
            activeUntilHourUtc: 24,
          },
          to,
          data,
          value,
          db: c.env?.GUARD_DB ?? null,
          signingSecret: c.env?.GUARD_SIGNING_SECRET ?? null,
          toolId: c.req.query("tool_id") ?? null,
          purpose: c.req.query("purpose") ?? null,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("UNIQUE constraint failed")) {
        return c.json({ error: "request_id_conflict" }, 409);
      }
      return c.json({ error: "payment_guard_failed", message }, 502);
    }
  });

  app.post(PAYMENT_GUARD_POLICY_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(await createPaymentGuardProfile(c.env?.GUARD_DB, input));
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_policy_creation_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.post(PRODUCTS[25].path, async c => {
    let input;
    try {
      input = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json_body" }, 400);
    }
    const targetUrl = String(input.url ?? "");
    const sessionId = String(input.session_id ?? "");
    const requestId = String(input.request_id ?? "");
    try {
      validatePublicUrl(targetUrl);
    } catch (error) {
      return c.json(
        {
          error: "invalid_payment_guard_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    if (
      !/^[A-Za-z0-9._:-]{1,96}$/.test(sessionId) ||
      !/^[A-Za-z0-9._:-]{1,128}$/.test(requestId)
    ) {
      return c.json({ error: "invalid_payment_guard_identity" }, 400);
    }
    const to = input.to ? String(input.to) : null;
    const data = input.data ? String(input.data) : null;
    const value = String(input.value ?? "0");
    if (
      (to !== null && !ADDRESS_PATTERN.test(to)) ||
      (data !== null &&
        (!/^0x(?:[a-fA-F0-9]{2})*$/.test(data) || data.length > 8194)) ||
      ((to === null) !== (data === null)) ||
      !/^[0-9]+$/.test(value)
    ) {
      return c.json({ error: "invalid_payment_guard_transaction" }, 400);
    }
    try {
      let profile = null;
      let policy;
      if (input.profile_id || input.agent_token) {
        profile = await loadPaymentGuardProfile(
          c.env?.GUARD_DB,
          String(input.profile_id ?? ""),
          String(input.agent_token ?? ""),
          "agent",
        );
        policy = profile.policy;
      } else {
        policy = paymentGuardPolicyFromInput(input);
      }
      return c.json(
        await paymentGuardEvaluate({
          targetUrl,
          sessionId,
          requestId,
          policy,
          profile,
          to,
          data,
          value,
          db: c.env?.GUARD_DB ?? null,
          signingSecret: c.env?.GUARD_SIGNING_SECRET ?? null,
          toolId: input.tool_id ? String(input.tool_id) : null,
          purpose: input.purpose ? String(input.purpose) : null,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return c.json(
        {
          error: message.startsWith("policy_")
            ? "payment_guard_policy_auth_failed"
            : "payment_guard_failed",
          message,
        },
        message.startsWith("policy_") ? 403 : 502,
      );
    }
  });

  app.post(PAYMENT_GUARD_LIFECYCLE_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await updatePaymentGuardReservation({
          db: c.env?.GUARD_DB,
          action: String(input.action ?? ""),
          decisionToken: String(input.decision_token ?? ""),
          txHash: input.tx_hash ? String(input.tx_hash) : null,
          signingSecret: c.env?.GUARD_SIGNING_SECRET,
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_lifecycle_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.post(PAYMENT_GUARD_POLICY_MANAGE_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await managePaymentGuardProfile(c.env?.GUARD_DB, input),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_policy_management_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        403,
      );
    }
  });

  app.post(PAYMENT_GUARD_STATUS_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await paymentGuardStatus(
          c.env?.GUARD_DB,
          String(input.profile_id ?? ""),
          String(input.owner_token ?? ""),
        ),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_status_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        403,
      );
    }
  });

  app.post(PAYMENT_GUARD_APPROVAL_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await decidePaymentGuardApproval({
          db: c.env?.GUARD_DB,
          profileId: String(input.profile_id ?? ""),
          ownerToken: String(input.owner_token ?? ""),
          requestId: String(input.request_id ?? ""),
          action: String(input.action ?? ""),
          note: input.note ?? null,
          signingSecret: c.env?.GUARD_SIGNING_SECRET,
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_approval_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.post(PAYMENT_GUARD_DELIVERY_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await reportPaymentGuardDelivery({
          db: c.env?.GUARD_DB,
          decisionToken: String(input.decision_token ?? ""),
          status: String(input.status ?? ""),
          httpStatus: input.http_status ?? null,
          contentType: input.content_type ?? null,
          latencyMs: input.latency_ms ?? null,
          contentHash: input.content_sha256 ?? null,
          signingSecret: c.env?.GUARD_SIGNING_SECRET,
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_delivery_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.post(PAYMENT_GUARD_WEBHOOK_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await managePaymentGuardWebhook(
          c.env?.GUARD_DB,
          input,
          c.env?.GUARD_SIGNING_SECRET,
        ),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_webhook_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.post(PAYMENT_GUARD_MCP_PATH, async c => {
    let request;
    try {
      request = await c.req.json();
    } catch {
      return c.json(
        { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
        400,
      );
    }
    if (request.method === "initialize") {
      return c.json({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "agent-payment-guard", version: "2.0.0" },
        },
      });
    }
    if (request.method === "tools/list") {
      return c.json({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: [
            {
              name: "payment_guard_evaluate",
              description:
                "Evaluate an x402 payment. The paid HTTP endpoint returns an x402 challenge before execution.",
              inputSchema: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  session_id: { type: "string" },
                  request_id: { type: "string" },
                  profile_id: { type: "string" },
                  agent_token: { type: "string" },
                  tool_id: { type: "string" },
                  purpose: { type: "string" },
                },
                required: ["url", "session_id", "request_id"],
              },
            },
            {
              name: "payment_guard_status",
              description: "Read authenticated policy, budget, merchant, and audit status.",
              inputSchema: {
                type: "object",
                properties: {
                  profile_id: { type: "string" },
                  owner_token: { type: "string" },
                },
                required: ["profile_id", "owner_token"],
              },
            },
          ],
        },
      });
    }
    if (request.method === "tools/call") {
      const name = request.params?.name;
      const args = request.params?.arguments ?? {};
      if (name === "payment_guard_status") {
        try {
          const result = await paymentGuardStatus(
            c.env?.GUARD_DB,
            String(args.profile_id ?? ""),
            String(args.owner_token ?? ""),
          );
          return c.json({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              content: [{ type: "text", text: JSON.stringify(result) }],
            },
          });
        } catch (error) {
          return c.json({
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32001,
              message: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }
      if (name === "payment_guard_evaluate") {
        return c.json({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  paid_endpoint: `${new URL(c.req.url).origin}${PRODUCTS[25].path}`,
                  method: "POST",
                  price_usdc: PRODUCTS[25].price,
                  body: args,
                }),
              },
            ],
          },
        });
      }
      return c.json({
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32602, message: "Unknown tool" },
      });
    }
    return c.json({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32601, message: "Method not found" },
    });
  });

  return app;
}

const paidApp = createPaidApp();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (PAID_PATHS.has(url.pathname) || PAYMENT_GUARD_PATHS.has(url.pathname)) {
      return paidApp.fetch(request, env, ctx);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,HEAD,POST,OPTIONS",
          "access-control-allow-headers": "content-type,payment-signature",
        },
      });
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      return json({ error: "method_not_allowed" }, 405, {
        allow: "GET, HEAD, POST",
      });
    }

    const origin = url.origin;
    let response;
    if (url.pathname === "/health") {
      response = json({
        ok: true,
        service: "agent-payment-guard",
        network: BASE_MAINNET,
        products: PRODUCTS.length,
      });
    } else if (url.pathname === "/openapi.json") {
      response = json(openApi(origin));
    } else if (url.pathname === "/.well-known/agent-card.json") {
      response = json(agentCard(origin));
    } else if (url.pathname === "/.well-known/service.json") {
      response = json(serviceManifest(origin));
    } else if (url.pathname === "/.well-known/mcp.json") {
      response = json({
        name: "agent-payment-guard",
        version: "2.0.0",
        transport: {
          type: "streamable-http",
          url: `${origin}${PAYMENT_GUARD_MCP_PATH}`,
        },
        tools: ["payment_guard_evaluate", "payment_guard_status"],
      });
    } else if (url.pathname === "/verification.json") {
      response = json(await verificationData(origin), 200, {
        "cache-control": "no-store",
      });
    } else if (url.pathname === "/verify") {
      response = new Response(verificationHtml(origin), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } else if (url.pathname === "/icon.svg") {
      response = new Response(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="26" fill="#0b1629"/><path d="M64 15 108 32v31c0 26-17 43-44 53C37 106 20 89 20 63V32l44-17Z" fill="#3d82f6"/><path d="M43 64 58 79l29-34" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        {
          headers: {
            "content-type": "image/svg+xml",
            "cache-control": "public, max-age=86400",
          },
        },
      );
    } else if (url.pathname === "/robots.txt") {
      response = new Response(
        `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
        { headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    } else if (url.pathname === "/sitemap.xml") {
      response = new Response(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url><url><loc>${origin}/verify</loc></url><url><loc>${origin}/openapi.json</loc></url><url><loc>${origin}/.well-known/agent-card.json</loc></url><url><loc>${origin}/.well-known/mcp.json</loc></url></urlset>`,
        { headers: { "content-type": "application/xml; charset=utf-8" } },
      );
    } else if (url.pathname === "/llms.txt") {
      response = new Response(
        `# Agent Payment Guard API

Stateful x402 payment firewall for autonomous AI agents, plus twenty-five underlying commerce and safety tools.

- OpenAPI: ${origin}/openapi.json
- Agent card: ${origin}/.well-known/agent-card.json
- Product catalog: ${origin}/.well-known/service.json
- Main Payment Guard: ${productExampleUrl(origin, PRODUCTS[25])}
- Address preflight: ${origin}${PRODUCTS[0].path}?address=${PAY_TO}
- Token preflight: ${origin}${PRODUCTS[1].path}?token=${USDC}
- Merchant trust: ${origin}${PRODUCTS[2].path}?address=${PAY_TO}
- Payment proof: ${origin}${PRODUCTS[3].path}?tx=0x...&recipient=${PAY_TO}&amount=0.02
- Wallet activity delta: ${origin}${PRODUCTS[4].path}?address=${PAY_TO}&since=2026-06-21T00:00:00Z
- Approval risk: ${productExampleUrl(origin, PRODUCTS[5])}
- Contract verification: ${productExampleUrl(origin, PRODUCTS[6])}
- USDC receipt: ${productExampleUrl(origin, PRODUCTS[7])}
- Wallet counterparty: ${productExampleUrl(origin, PRODUCTS[8])}
- Event log monitor: ${productExampleUrl(origin, PRODUCTS[9])}
- Gas and fee quote: ${productExampleUrl(origin, PRODUCTS[10])}
- Nonce readiness: ${productExampleUrl(origin, PRODUCTS[11])}
- Stablecoin balance: ${productExampleUrl(origin, PRODUCTS[12])}
- DEX market monitor: ${productExampleUrl(origin, PRODUCTS[13])}
- Prediction market snapshot: ${productExampleUrl(origin, PRODUCTS[14])}
- x402 endpoint preflight: ${productExampleUrl(origin, PRODUCTS[15])}
- npm package preflight: ${productExampleUrl(origin, PRODUCTS[16])}
- GitHub repository health: ${productExampleUrl(origin, PRODUCTS[17])}
- URL change fingerprint: ${productExampleUrl(origin, PRODUCTS[18])}
- RSS or Atom feed snapshot: ${productExampleUrl(origin, PRODUCTS[19])}
- EVM transaction intent: ${productExampleUrl(origin, PRODUCTS[20])}
- A2A Agent Card preflight: ${productExampleUrl(origin, PRODUCTS[21])}
- OpenAPI specification preflight: ${productExampleUrl(origin, PRODUCTS[22])}
- Domain trust preflight: ${productExampleUrl(origin, PRODUCTS[23])}
- PyPI package preflight: ${productExampleUrl(origin, PRODUCTS[24])}

Use these services before or after an autonomous payment, software installation, agent connection, API integration, web-monitoring task, or contract interaction.
Results are public-data heuristics, not guarantees of safety.
`,
        {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=300",
            "access-control-allow-origin": "*",
          },
        },
      );
    } else if (url.pathname === "/") {
      response = request.headers.get("accept")?.includes("application/json")
        ? json(serviceManifest(origin))
        : new Response(landingHtml(origin), {
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "public, max-age=300",
            },
          });
    } else {
      response = json({ error: "route_not_found" }, 404);
    }

    return request.method === "HEAD"
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      processPaymentGuardWebhookOutbox(
        env.GUARD_DB,
        env.GUARD_SIGNING_SECRET,
      ),
    );
  },
};
