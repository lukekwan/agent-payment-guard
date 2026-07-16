#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

import { evaluatePaymentFailClosed } from "./signgate-client.js";

const server = new McpServer({
  name: "signgate-mcp",
  version: "0.1.0",
});

const agentSchema = z.object({
  id: z.string().min(1).describe("Authenticated or configured agent id."),
  role: z.string().min(1).describe("Policy role, for example finance_agent."),
});

const buyerSchema = z.object({
  id: z.string().min(1).describe("Buyer, tenant, organization, or principal id."),
});

const mandateSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    buyer_id: z.string().optional(),
    agent_id: z.string().optional(),
    agent_role: z.string().optional(),
    merchant_domains: z.array(z.string()).optional(),
    merchant_wallets: z.array(z.string()).optional(),
    allowed_categories: z.array(z.string()).optional(),
    max_amount_usdc: z.union([z.string(), z.number()]).optional(),
    assets: z.array(z.string()).optional(),
    chains: z.array(z.string()).optional(),
    expires_at: z.string().optional(),
  })
  .passthrough();

const merchantSchema = z
  .object({
    id: z.string().optional(),
    domain: z.string().optional(),
    wallet: z.string().optional(),
    expected_wallet: z.string().optional(),
    openapi_domain: z.string().optional(),
    agent_card_domain: z.string().optional(),
    category: z.string().optional(),
    kyt_risk: z.string().optional(),
  })
  .passthrough();

const resourceSchema = z
  .object({
    id: z.string().optional(),
    url: z.string().optional(),
    category: z.string().min(1),
    asset: z.string().optional(),
    network: z.string().optional(),
    payment_scheme: z.string().optional(),
  })
  .passthrough();

server.registerTool(
  "evaluate_payment",
  {
    title: "Evaluate Payment",
    description:
      "Call the real SignGate Agentic Commerce Preflight endpoint before an agent pays, calls a signer, or buys an x402 resource. The tool never signs or moves funds.",
    inputSchema: {
      agent: agentSchema,
      buyer: buyerSchema,
      mandate: mandateSchema.nullable(),
      merchant: merchantSchema,
      resource: resourceSchema,
      requested_amount: z.union([z.string(), z.number()]),
      asset: z.string().optional(),
      network: z.string().optional(),
      payment_scheme: z.string().optional(),
      evidence_refs: z.array(z.unknown()).optional(),
    },
    outputSchema: {
      schema_version: z.literal("signgate.mcp.evaluate_payment.v1"),
      response_kind: z.literal("mcp_decision_envelope"),
      decision: z.enum(["ALLOW", "REQUIRE_APPROVAL", "DENY"]),
      decision_id: z.string().nullable(),
      policy_version: z.string().nullable(),
      request_hash: z.string().nullable(),
      evaluated_at: z.string().nullable(),
      expires_at: z.string().nullable(),
      agent: z.unknown().nullable(),
      buyer: z.unknown().nullable(),
      mandate: z.unknown().nullable(),
      merchant: z.unknown().nullable(),
      resource: z.unknown().nullable(),
      reason_codes: z.array(z.string()),
      evidence: z.array(z.unknown()),
      signer_directive: z.unknown(),
      auto_payment_allowed: z.boolean(),
      fail_closed: z.boolean(),
      signgate_response: z.unknown().nullable(),
    },
  },
  async input => {
    const result = await evaluatePaymentFailClosed(input);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
      isError: result.fail_closed,
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SignGate MCP server running on stdio");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
