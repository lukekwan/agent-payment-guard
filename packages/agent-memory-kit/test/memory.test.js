import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMemoryContext,
  promoteMemoryCandidate,
  scoreMemoryEntry,
  validateMemoryEntry,
} from "../src/index.js";

const baseEntry = {
  memory_id: "mem_signgate_identity_wedge",
  type: "decision",
  claim:
    "SignGate should lead with Agent Buyer Identity for x402 instead of broad payment-risk positioning.",
  source_episode_id: "episode_signgate_agent_buyer_identity",
  evidence_ref: "commit:5e5f233",
  confidence: 0.9,
  importance: 0.8,
  tags: ["signgate", "identity", "x402"],
  scopes: ["product", "marketing"],
  created_at: "2026-07-14T04:00:00Z",
};

test("validates memory entries with required evidence", () => {
  assert.equal(validateMemoryEntry(baseEntry).ok, true);
  const invalid = validateMemoryEntry({ ...baseEntry, evidence_ref: "" });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.includes("missing_required_fields:evidence_ref"));
});

test("promotes valid episode memory candidates", () => {
  const promoted = promoteMemoryCandidate(baseEntry);
  assert.equal(promoted.decision, "PROMOTE");
  assert.equal(promoted.entry.type, "decision");
});

test("scores matching memories above unrelated memories", () => {
  const match = scoreMemoryEntry(baseEntry, {
    tags: ["x402", "identity"],
    scopes: ["product"],
    now: "2026-07-14T05:00:00Z",
  });
  const unrelated = scoreMemoryEntry(
    { ...baseEntry, tags: ["weather"], scopes: ["personal"] },
    {
      tags: ["x402", "identity"],
      scopes: ["product"],
      now: "2026-07-14T05:00:00Z",
    },
  );
  assert.ok(match.score > unrelated.score);
});

test("builds bounded memory context with citations", () => {
  const context = buildMemoryContext({
    entries: [
      baseEntry,
      {
        ...baseEntry,
        memory_id: "mem_low_confidence",
        claim: "Low confidence note should not be selected.",
        confidence: 0.2,
      },
    ],
    query: { tags: ["signgate", "x402"], scopes: ["product"] },
    maxChars: 1200,
  });
  assert.equal(context.selected_count, 1);
  assert.ok(context.context.includes("commit:5e5f233"));
  assert.ok(context.context.includes("mem_signgate_identity_wedge"));
});
