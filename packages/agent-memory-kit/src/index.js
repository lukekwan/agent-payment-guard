import defaultPolicy from "../policy/default-memory-policy.json" with { type: "json" };

export { defaultPolicy };

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return String(value)
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function token(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function daysBetween(a, b) {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

export function normalizeMemoryEntry(entry = {}) {
  return {
    schema_version: "agent_memory_entry.v1",
    memory_id: String(entry.memory_id || entry.id || ""),
    type: token(entry.type || "fact"),
    claim: String(entry.claim || "").trim(),
    source_episode_id: String(entry.source_episode_id || "").trim(),
    evidence_ref: String(entry.evidence_ref || "").trim(),
    confidence: Number.isFinite(Number(entry.confidence))
      ? Math.max(0, Math.min(1, Number(entry.confidence)))
      : 0,
    importance: Number.isFinite(Number(entry.importance))
      ? Math.max(0, Math.min(1, Number(entry.importance)))
      : 0.5,
    tags: toArray(entry.tags).map(token),
    scopes: toArray(entry.scopes || entry.scope).map(token),
    created_at: entry.created_at || new Date().toISOString(),
    expires_at: entry.expires_at || null,
    pinned: Boolean(entry.pinned),
    supersedes: toArray(entry.supersedes),
    owner: String(entry.owner || "").trim(),
  };
}

export function validateMemoryEntry(entry = {}, policy = defaultPolicy) {
  const normalized = normalizeMemoryEntry(entry);
  const missing = [];
  for (const field of policy.promotion_required_fields || []) {
    if (field === "tags") {
      if (normalized.tags.length === 0) missing.push(field);
    } else if (!normalized[field]) {
      missing.push(field);
    }
  }
  const errors = [];
  if (missing.length) errors.push(`missing_required_fields:${missing.join(",")}`);
  if (normalized.confidence < policy.min_confidence) {
    errors.push("confidence_below_policy_minimum");
  }
  if (!normalized.claim || normalized.claim.length < 8) {
    errors.push("claim_too_short");
  }
  return {
    ok: errors.length === 0,
    errors,
    entry: normalized,
  };
}

export function promoteMemoryCandidate(candidate = {}, policy = defaultPolicy) {
  const entry = normalizeMemoryEntry({
    ...candidate,
    memory_id:
      candidate.memory_id ||
      `mem_${token(candidate.source_episode_id || "episode")}_${token(candidate.type || "fact")}_${Math.abs(hashText(candidate.claim || "")).toString(16)}`,
  });
  const validation = validateMemoryEntry(entry, policy);
  return {
    decision: validation.ok ? "PROMOTE" : "REJECT",
    reason_codes: validation.ok ? ["MEMORY_PROMOTION_VALID"] : validation.errors,
    entry,
  };
}

export function scoreMemoryEntry(entry = {}, query = {}, policy = defaultPolicy) {
  const normalized = normalizeMemoryEntry(entry);
  const now = parseDate(query.now) || new Date();
  const created = parseDate(normalized.created_at) || now;
  const expires = parseDate(normalized.expires_at);
  const queryTags = new Set(toArray(query.tags).map(token));
  const queryScopes = new Set(toArray(query.scopes || query.scope).map(token));
  const queryTypes = new Set(toArray(query.types || query.type).map(token));
  let score = normalized.importance * 10 + normalized.confidence * 10;
  let expired = false;

  for (const tag of normalized.tags) {
    if (queryTags.has(tag)) score += policy.scoring.tag_match;
  }
  for (const scope of normalized.scopes) {
    if (queryScopes.has(scope)) score += policy.scoring.scope_match;
  }
  if (queryTypes.size && queryTypes.has(normalized.type)) {
    score += policy.scoring.type_match;
  }
  if (normalized.pinned) score += policy.scoring.pinned;
  if (daysBetween(now, created) <= policy.scoring.recent_within_days) {
    score += policy.scoring.recent_bonus;
  }
  if (expires && expires.getTime() < now.getTime()) {
    score += policy.scoring.expired_penalty;
    expired = true;
  }
  if (normalized.confidence < policy.min_confidence) {
    score += policy.scoring.stale_penalty;
  }

  return {
    memory_id: normalized.memory_id,
    score,
    expired,
    entry: normalized,
  };
}

export function buildMemoryContext({
  entries = [],
  query = {},
  maxChars = defaultPolicy.max_context_chars,
  policy = defaultPolicy,
} = {}) {
  const scored = entries
    .map(entry => scoreMemoryEntry(entry, query, policy))
    .filter(item => !item.expired)
    .filter(item => item.entry.confidence >= policy.min_confidence || item.entry.pinned)
    .sort((a, b) => b.score - a.score);

  const selected = [];
  let usedChars = 0;
  for (const item of scored) {
    const line = memoryLine(item.entry);
    if (usedChars + line.length > maxChars) continue;
    selected.push({ ...item, line });
    usedChars += line.length;
  }

  return {
    schema_version: "agent_memory_context.v1",
    generated_at: new Date().toISOString(),
    policy_version: policy.policy_version,
    max_context_chars: maxChars,
    used_chars: usedChars,
    selected_count: selected.length,
    selected_memory_ids: selected.map(item => item.memory_id),
    context: selected.map(item => item.line).join("\n"),
    rejected_count: Math.max(0, entries.length - selected.length),
  };
}

function memoryLine(entry) {
  const tags = entry.tags.length ? ` tags=${entry.tags.join(",")}` : "";
  const scopes = entry.scopes.length ? ` scopes=${entry.scopes.join(",")}` : "";
  return `- [${entry.type}] ${entry.claim} (id=${entry.memory_id}; confidence=${entry.confidence}; evidence=${entry.evidence_ref}; source=${entry.source_episode_id}${tags}${scopes})`;
}

function hashText(value) {
  let hash = 0;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
