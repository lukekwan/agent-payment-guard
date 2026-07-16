import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Shape this as an OpenAI-compatible tool descriptor, while the implementation
// delegates to MCP over stdio. Your agent loop can call `callEvaluatePayment`
// when the model selects this tool.
export const evaluatePaymentTool = {
  type: "function",
  function: {
    name: "evaluate_payment",
    description:
      "Ask SignGate whether an autonomous agent may pay, call a signer, or buy an x402 resource.",
    parameters: {
      type: "object",
      properties: {
        agent: { type: "object" },
        buyer: { type: "object" },
        mandate: { type: ["object", "null"] },
        merchant: { type: "object" },
        resource: { type: "object" },
        requested_amount: { type: ["string", "number"] },
        asset: { type: "string" },
        network: { type: "string" },
        payment_scheme: { type: "string" },
        evidence_refs: { type: "array" }
      },
      required: ["agent", "buyer", "mandate", "merchant", "resource", "requested_amount"]
    }
  }
};

export async function callEvaluatePayment(argumentsObject) {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["./mcp/server.js"],
    env: {
      ...process.env,
      SIGNGATE_BASE_URL:
        process.env.SIGNGATE_BASE_URL ??
        "https://base-agent-preflight.bytoken2023.workers.dev",
      SIGNGATE_API_KEY: process.env.SIGNGATE_API_KEY ?? "",
    },
  });
  const client = new Client({ name: "openai-compatible-signgate-agent", version: "0.1.0" });
  await client.connect(transport);
  try {
    const result = await client.callTool({
      name: "evaluate_payment",
      arguments: argumentsObject,
    });
    return result.structuredContent;
  } finally {
    await client.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await callEvaluatePayment({
    agent: { id: "agent.research.001", role: "research_agent" },
    buyer: { id: "buyer.acme" },
    mandate: {
      id: "mandate-1",
      type: "payment",
      status: "active",
      merchant_domains: ["api.seller.example"],
      merchant_wallets: ["0x1111111111111111111111111111111111111111"],
      allowed_categories: ["wallet_risk"],
      max_amount_usdc: "0.02",
      assets: ["USDC"],
      chains: ["base"]
    },
    merchant: {
      domain: "api.seller.example",
      wallet: "0x1111111111111111111111111111111111111111",
      category: "wallet_risk",
      kyt_risk: "low"
    },
    resource: {
      id: "wallet-risk",
      url: "https://api.seller.example/v1/x402/wallet-risk",
      category: "wallet_risk"
    },
    requested_amount: "0.005",
    asset: "USDC",
    network: "base",
    payment_scheme: "x402",
    evidence_refs: []
  });
  console.log(JSON.stringify(result, null, 2));
}
