const ORG = "org_d1_spike";
const FINGERPRINT = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const POLICY = "deploy_policy_spike_v1";

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function nowFromRequest(request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("now");
  if (raw) {
    return Number(raw);
  }
  return Date.now();
}

async function readJson(request) {
  if (request.method === "GET") {
    return {};
  }
  return request.json().catch(() => ({}));
}

async function seed(env, id, options = {}) {
  const now = Date.now();
  const expiresAt = options.expires_at ?? (now + 60000);
  const state = options.state ?? "AVAILABLE";
  await env.DB.prepare(
    `INSERT INTO decisions (
      organization_id, decision_id, state, action_fingerprint, policy_version,
      expires_at
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    options.organization_id ?? ORG,
    id,
    state,
    options.action_fingerprint ?? FINGERPRINT,
    options.policy_version ?? POLICY,
    expiresAt
  ).run();
  return { id, state, expires_at: expiresAt };
}

async function reset(env) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM decision_audit_events"),
    env.DB.prepare("DELETE FROM consume_receipts"),
    env.DB.prepare("DELETE FROM decisions")
  ]);
}

async function inspect(env, id, org = ORG) {
  const decision = await env.DB.prepare(
    "SELECT * FROM decisions WHERE organization_id = ? AND decision_id = ?"
  ).bind(org, id).first();
  const receipts = await env.DB.prepare(
    "SELECT * FROM consume_receipts WHERE organization_id = ? AND decision_id = ? ORDER BY receipt_id"
  ).bind(org, id).all();
  const audits = await env.DB.prepare(
    "SELECT * FROM decision_audit_events WHERE organization_id = ? AND decision_id = ? ORDER BY audit_id"
  ).bind(org, id).all();
  return {
    decision,
    receipts: receipts.results ?? [],
    audits: audits.results ?? []
  };
}

async function observeExpiry(env, input, serverNow) {
  const expiryToken = `expiry_${input.decision_id}_${serverNow}`;
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE decisions
       SET state = 'EXPIRED', expired_at = ?
       WHERE organization_id = ?
         AND decision_id = ?
         AND state = 'AVAILABLE'
         AND expires_at <= ?`
    ).bind(serverNow, input.organization_id, input.decision_id, serverNow),
    env.DB.prepare(
      `INSERT INTO decision_audit_events (
        audit_id, organization_id, decision_id, event_type, observed_at
      )
      SELECT ?, organization_id, decision_id, 'EXPIRED_OBSERVED', ?
      FROM decisions
      WHERE organization_id = ?
        AND decision_id = ?
        AND state = 'EXPIRED'
        AND expired_at = ?
        AND NOT EXISTS (
          SELECT 1 FROM decision_audit_events
          WHERE organization_id = ?
            AND decision_id = ?
            AND event_type = 'EXPIRED_OBSERVED'
        )`
    ).bind(
      expiryToken,
      serverNow,
      input.organization_id,
      input.decision_id,
      serverNow,
      input.organization_id,
      input.decision_id
    )
  ]);
  return inspect(env, input.decision_id, input.organization_id);
}

async function consume(env, request) {
  const serverNow = nowFromRequest(request);
  const body = await readJson(request);
  const input = {
    organization_id: body.organization_id ?? ORG,
    decision_id: body.decision_id,
    execution_attempt_id: body.execution_attempt_id,
    action_fingerprint: body.action_fingerprint ?? FINGERPRINT,
    policy_version: body.policy_version ?? POLICY,
    inject_receipt_failure: body.inject_receipt_failure === true,
    inject_audit_failure: body.inject_audit_failure === true
  };

  if (!input.decision_id || !input.execution_attempt_id) {
    return json({ error: "missing decision_id or execution_attempt_id" }, 422);
  }

  const existingSameAttempt = await env.DB.prepare(
    `SELECT * FROM consume_receipts
     WHERE organization_id = ?
       AND decision_id = ?
       AND execution_attempt_id = ?`
  ).bind(input.organization_id, input.decision_id, input.execution_attempt_id).first();
  if (existingSameAttempt) {
    return json({ status: "SAME_ATTEMPT_RETRY", receipt: existingSameAttempt });
  }

  const before = await env.DB.prepare(
    "SELECT state, expires_at FROM decisions WHERE organization_id = ? AND decision_id = ?"
  ).bind(input.organization_id, input.decision_id).first();

  if (!before) {
    return json({ status: "NOT_FOUND_OR_FORBIDDEN" }, 404);
  }

  if (before.state === "EXPIRED" || before.expires_at <= serverNow) {
    const expired = await observeExpiry(env, input, serverNow);
    return json({ status: "EXPIRED", observed: expired }, 409);
  }

  const token = `tok_${input.decision_id}_${input.execution_attempt_id}_${crypto.randomUUID()}`;
  const receiptId = `rcpt_${input.decision_id}_${input.execution_attempt_id}`;
  const auditId = `audit_${input.decision_id}_${input.execution_attempt_id}`;

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE decisions
       SET state = 'CONSUMED',
           consumed_at = ?,
           execution_attempt_id = ?,
           consume_lock_token = ?
       WHERE organization_id = ?
         AND decision_id = ?
         AND state = 'AVAILABLE'
         AND action_fingerprint = ?
         AND policy_version = ?
         AND expires_at > ?
         AND consume_lock_token IS NULL`
    ).bind(
      serverNow,
      input.execution_attempt_id,
      token,
      input.organization_id,
      input.decision_id,
      input.action_fingerprint,
      input.policy_version,
      serverNow
    ),
    env.DB.prepare(
      `INSERT INTO consume_receipts (
        organization_id, decision_id, execution_attempt_id, receipt_id,
        action_fingerprint, policy_version, consumed_at, consume_lock_token
      )
      SELECT
        organization_id,
        decision_id,
        execution_attempt_id,
        CASE WHEN ? THEN NULL ELSE ? END,
        action_fingerprint,
        policy_version,
        consumed_at,
        consume_lock_token
      FROM decisions
      WHERE organization_id = ?
        AND decision_id = ?
        AND state = 'CONSUMED'
        AND consume_lock_token = ?`
    ).bind(
      input.inject_receipt_failure ? 1 : 0,
      receiptId,
      input.organization_id,
      input.decision_id,
      token
    ),
    env.DB.prepare(
      `INSERT INTO decision_audit_events (
        audit_id, organization_id, decision_id, event_type,
        execution_attempt_id, receipt_id, observed_at, consume_lock_token
      )
      SELECT
        CASE WHEN ? THEN NULL ELSE ? END,
        organization_id,
        decision_id,
        'CONSUME_SUCCESS',
        execution_attempt_id,
        receipt_id,
        consumed_at,
        consume_lock_token
      FROM consume_receipts
      WHERE organization_id = ?
        AND decision_id = ?
        AND consume_lock_token = ?`
    ).bind(
      input.inject_audit_failure ? 1 : 0,
      auditId,
      input.organization_id,
      input.decision_id,
      token
    )
  ]);

  const receipt = await env.DB.prepare(
    `SELECT * FROM consume_receipts
     WHERE organization_id = ?
       AND decision_id = ?
       AND execution_attempt_id = ?`
  ).bind(input.organization_id, input.decision_id, input.execution_attempt_id).first();

  if (receipt) {
    return json({ status: "CONSUMED", receipt });
  }

  const existingAny = await env.DB.prepare(
    `SELECT * FROM consume_receipts
     WHERE organization_id = ?
       AND decision_id = ?`
  ).bind(input.organization_id, input.decision_id).first();
  if (existingAny) {
    return json({ status: "CONFLICT_DIFFERENT_ATTEMPT", receipt: null }, 409);
  }

  const after = await inspect(env, input.decision_id, input.organization_id);
  return json({ status: "NO_OWNERSHIP", observed: after }, 409);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/reset") {
        await reset(env);
        return json({ status: "RESET" });
      }
      if (url.pathname === "/seed") {
        const body = await readJson(request);
        return json(await seed(env, body.decision_id, body));
      }
      if (url.pathname === "/consume") {
        return consume(env, request);
      }
      if (url.pathname === "/inspect") {
        return json(await inspect(env, url.searchParams.get("decision_id"), url.searchParams.get("organization_id") ?? ORG));
      }
      if (url.pathname === "/constants") {
        return json({ ORG, FINGERPRINT, POLICY });
      }
      return json({ status: "DEV_SG_001C_D1_SPIKE_ONLY" });
    } catch (error) {
      return json({ error: String(error.stack || error) }, 500);
    }
  }
};
