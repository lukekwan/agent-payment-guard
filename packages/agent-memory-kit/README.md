# SignGate Agent Memory Kit

Deterministic memory promotion and context packing for AI agents.

This is not a vector database and not a longer prompt. It is a small policy kit
for deciding which verified memories should enter an agent's working context.

## Why

Raw chat logs are not memory.

Enterprise agent memory needs:

- source episode
- evidence reference
- confidence
- expiry
- scope
- tags
- promotion decision
- bounded context packing

## Included

- `policy/default-memory-policy.json`
- `validateMemoryEntry`
- `promoteMemoryCandidate`
- `scoreMemoryEntry`
- `buildMemoryContext`
- tests

## Usage

```js
import { buildMemoryContext } from "@signgate/agent-memory-kit";

const context = buildMemoryContext({
  entries: [
    {
      memory_id: "mem_signgate_identity_wedge",
      type: "decision",
      claim: "SignGate should lead with Agent Buyer Identity for x402.",
      source_episode_id: "episode_signgate_agent_buyer_identity",
      evidence_ref: "commit:5e5f233",
      confidence: 0.9,
      importance: 0.8,
      tags: ["signgate", "identity", "x402"],
      scopes: ["product", "marketing"]
    }
  ],
  query: {
    tags: ["signgate", "x402"],
    scopes: ["product"]
  },
  maxChars: 6000
});

console.log(context.context);
```

## Product Shape

Hosted product later:

```text
Agent Memory Context Pack
```

Questions it answers:

- What should this agent remember for this task?
- Which memory is evidence-backed?
- Which memory is stale or expired?
- Which memory should be promoted from the last episode?
- How much memory fits in the current context budget?

## Non-Goals

- No model-specific prompt framework.
- No hidden long-term memory.
- No automatic promotion from raw chat.
- No vector database dependency in v0.1.
- No private data export.

## Relationship To Runtime

Memory should be promoted from Episode Packages, not raw conversations.

Recommended flow:

```text
Episode Package -> MEMORY_CANDIDATES.md -> reviewed MemoryEntry ->
buildMemoryContext()
```
