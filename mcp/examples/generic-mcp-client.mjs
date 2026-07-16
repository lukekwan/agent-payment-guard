import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

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

const client = new Client({
  name: "generic-signgate-mcp-client",
  version: "0.1.0",
});

await client.connect(transport);

const tools = await client.listTools();
console.log(tools.tools.map(tool => tool.name));

const result = await client.callTool({
  name: "evaluate_payment",
  arguments: {
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
  },
});

console.log(JSON.stringify(result.structuredContent, null, 2));
await client.close();
