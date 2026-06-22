# agent-payment-guard

JavaScript client for the hosted Agent Payment Guard x402 service.

```sh
npm install agent-payment-guard
```

```js
import {
  PaymentGuardClient,
  createGuardedFetch,
} from "agent-payment-guard";

const guard = new PaymentGuardClient({
  baseUrl: "https://base-agent-preflight.bytoken2023.workers.dev",
  paidFetch, // Your x402-capable fetch implementation.
  profileId: process.env.PAYMENT_GUARD_PROFILE_ID,
  agentToken: process.env.PAYMENT_GUARD_AGENT_TOKEN,
});

const guardedFetch = createGuardedFetch({
  guard,
  merchantFetch: paidFetch,
});

const response = await guardedFetch("https://merchant.example/resource", {}, {
  session_id: "agent-run-42",
  tool_id: "research-agent",
  purpose: "market-data",
});
```

The SDK never stores wallet keys. The caller controls the paid transport and
merchant request implementation.
