export class PaymentGuardClient {
  constructor({
    baseUrl,
    paidFetch,
    fetchImpl = fetch,
    profileId = null,
    agentToken = null,
    ownerToken = null,
  }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.paidFetch = paidFetch;
    this.fetch = fetchImpl;
    this.profileId = profileId;
    this.agentToken = agentToken;
    this.ownerToken = ownerToken;
  }

  async json(path, body, { paid = false } = {}) {
    const transport = paid ? this.paidFetch : this.fetch;
    if (!transport) throw new Error("paidFetch is required for paid operations");
    const response = await transport(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message ?? payload.error ?? `HTTP ${response.status}`);
    }
    return payload;
  }

  evaluate(input) {
    return this.json(
      "/v1/x402/payment-guard/evaluate",
      {
        ...input,
        ...(this.profileId ? { profile_id: this.profileId } : {}),
        ...(this.agentToken ? { agent_token: this.agentToken } : {}),
      },
      { paid: true },
    );
  }

  status() {
    return this.json("/v1/payment-guard/status", {
      profile_id: this.profileId,
      owner_token: this.ownerToken,
    });
  }

  approve(requestId, action, note = null) {
    return this.json("/v1/payment-guard/approvals", {
      profile_id: this.profileId,
      owner_token: this.ownerToken,
      request_id: requestId,
      action,
      note,
    });
  }

  commit(decisionToken, txHash) {
    return this.json("/v1/payment-guard/lifecycle", {
      action: "commit",
      decision_token: decisionToken,
      tx_hash: txHash,
    });
  }

  release(decisionToken) {
    return this.json("/v1/payment-guard/lifecycle", {
      action: "release",
      decision_token: decisionToken,
    });
  }

  reportDelivery(decisionToken, evidence) {
    return this.json("/v1/payment-guard/delivery", {
      decision_token: decisionToken,
      ...evidence,
    });
  }
}

export function createGuardedFetch({ guard, merchantFetch }) {
  return async function guardedFetch(url, init = {}, policy = {}) {
    const requestId = policy.request_id ?? crypto.randomUUID();
    const decision = await guard.evaluate({
      url,
      session_id: policy.session_id ?? "default",
      request_id: requestId,
      tool_id: policy.tool_id,
      purpose: policy.purpose,
      ...policy,
    });
    if (decision.decision !== "ALLOW") {
      const error = new Error(`Payment Guard decision: ${decision.decision}`);
      error.decision = decision;
      throw error;
    }
    return merchantFetch(url, init);
  };
}
