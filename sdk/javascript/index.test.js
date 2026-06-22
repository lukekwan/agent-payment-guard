import assert from "node:assert/strict";
import test from "node:test";

import { PaymentGuardClient, createGuardedFetch } from "./index.js";

test("evaluate sends profile credentials through paid transport", async () => {
  let request;
  const client = new PaymentGuardClient({
    baseUrl: "https://guard.example/",
    profileId: "profile-1",
    agentToken: "agent-secret",
    paidFetch: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ decision: "ALLOW" }));
    },
  });

  const result = await client.evaluate({
    url: "https://merchant.example/data",
    session_id: "session-1",
    request_id: "request-1",
  });

  assert.equal(result.decision, "ALLOW");
  assert.equal(
    request.url,
    "https://guard.example/v1/x402/payment-guard/evaluate",
  );
  assert.deepEqual(JSON.parse(request.init.body), {
    url: "https://merchant.example/data",
    session_id: "session-1",
    request_id: "request-1",
    profile_id: "profile-1",
    agent_token: "agent-secret",
  });
});

test("guarded fetch blocks non-ALLOW decisions", async () => {
  const guardedFetch = createGuardedFetch({
    guard: { evaluate: async () => ({ decision: "BLOCK", risk_score: 90 }) },
    merchantFetch: async () => {
      throw new Error("merchant transport must not run");
    },
  });

  await assert.rejects(
    guardedFetch("https://merchant.example/data"),
    /Payment Guard decision: BLOCK/,
  );
});
