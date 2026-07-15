# SG-MVP-003 - Decision Artifact v0

Status: design draft

Goal: prove that a SignGate decision can control execution, not merely advise
it.

```text
Agent request
-> SignGate evaluates
-> Decision Artifact v0
-> Independent Verifier
-> Reference Signer
-> ALLOW permits mock execution
```

`DENY`, `REQUIRE_APPROVAL`, expired, tampered, invalidly signed, or
wrong-request artifacts must be rejected.

## Non-Goals

- No production signing code.
- No real custody integration.
- No token approvals.
- No money movement.
- No HSM, KMS, custody, wallet, or smart account vendor integration.
- No new Nomos Labs future product layer.

## Product Boundary

Current public API responses are Decision Responses. They are useful for
inspection and integration testing, but they are not cryptographically
verifiable execution artifacts.

SG-MVP-003 introduces a separate Decision Artifact v0 that can be verified by
an executor or signer before allowing a mock/reference signing path.

## Artifact Semantics

Only `ALLOW` can authorize execution.

`REQUIRE_APPROVAL` and `DENY` are non-authorizing for v0. A future approval
workflow may produce a later `ALLOW` artifact, but this milestone does not
implement that workflow.

Artifacts are bound to a specific request by digest. A valid artifact for one
request must not authorize another request.

Artifacts are short-lived. Expired artifacts must fail closed.

## Decision Artifact v0 Schema

Required top-level fields:

```json
{
  "artifact_version": "signgate.decision-artifact.v0",
  "artifact_id": "da_...",
  "response_kind": "decision_artifact",
  "issuer": "signgate:local-dev",
  "issued_at": "2026-07-15T00:00:00.000Z",
  "expires_at": "2026-07-15T00:05:00.000Z",
  "nonce": "base64url-random",
  "decision": "ALLOW",
  "decision_id": "dec_...",
  "policy_version": "agentic-commerce-policy-v0.1",
  "evaluator_version": "signgate-agent-buyer-policy-kit@0.1.0",
  "request_digest": "sha256:...",
  "policy_digest": "sha256:...",
  "mandate_digest": "sha256:...",
  "evidence_digest": "sha256:...",
  "reason_codes": [],
  "signer_directive": {
    "agent_may_directly_sign": false,
    "execution_may_be_agent_initiated": true,
    "signer_isolation_required": true,
    "required_signer": {
      "mode": "out_of_agent",
      "allowed_classes": [
        "human_fido2",
        "hsm",
        "kms",
        "custody",
        "smart_account_module"
      ]
    }
  },
  "signature": {
    "alg": "Ed25519",
    "kid": "signgate-local-dev-1",
    "value": "base64url-signature"
  }
}
```

## Canonicalization

The signed payload is the artifact without the `signature` field.

Canonical JSON rules for v0:

- UTF-8 JSON bytes.
- Object keys sorted lexicographically.
- No insignificant whitespace.
- Arrays remain order-sensitive.
- No runtime-generated fields may be added after signing.

If implementation uses a JSON canonicalization library, the library and version
must be pinned in tests.

## Digest Rules

All digests use:

```text
sha256:<lowercase_hex_digest>
```

Required digest inputs:

- `request_digest`: canonical execution request.
- `policy_digest`: policy object or policy version payload used for evaluation.
- `mandate_digest`: mandate evidence used for authorization.
- `evidence_digest`: canonical evidence bundle, including merchant, wallet,
  KYT, transaction, or resource signals used by the decision.

Digest mismatches must fail verification.

## Verifier SDK Contract

Function shape:

```text
verifyDecisionArtifact(artifact, executionRequest, options) -> result
```

Required result fields:

```json
{
  "ok": false,
  "decision": "DENY",
  "artifact_id": "da_...",
  "reason_codes": ["ARTIFACT_EXPIRED"],
  "verified_at": "2026-07-15T00:00:00.000Z"
}
```

Verifier must check:

- `artifact_version` is supported.
- `response_kind` is `decision_artifact`.
- Required fields are present.
- `decision` is exactly `ALLOW`.
- `issued_at` is not in the future beyond configured clock skew.
- `expires_at` is not expired.
- `request_digest` matches the supplied execution request.
- Signature verifies against the configured issuer public key.
- Artifact payload has not been changed after signing.
- `signer_directive.signer_isolation_required` is true for payment execution.

Verifier must return stable reason codes and fail closed on malformed input.

## Reference Signer Contract

The reference signer is a mock executor. It proves enforcement behavior without
touching real keys or funds.

Function shape:

```text
referenceSign(executionRequest, artifact, signerConfig) -> result
```

Behavior:

- If verifier returns `ok=true`, return a deterministic mock signature record.
- If verifier returns `ok=false`, reject and include verifier reason codes.
- Never broadcast transactions.
- Never call a wallet, HSM, KMS, custody provider, or chain RPC for signing.

## Acceptance Criteria

Design acceptance:

- Artifact schema documented.
- Canonicalization and digest rules documented.
- Verifier contract documented.
- Reference signer contract documented.
- Non-goals explicitly exclude production signing and money movement.

Implementation acceptance for SG-MVP-003:

- Valid `ALLOW` artifact verifies.
- Valid `ALLOW` artifact allows reference signer mock output.
- `DENY` artifact rejects.
- `REQUIRE_APPROVAL` artifact rejects.
- Expired artifact rejects.
- Artifact with invalid signature rejects.
- Tampered artifact rejects.
- Artifact for a different transaction/request rejects.
- Missing required fields reject.
- Unsupported `artifact_version` rejects.
- Tests are deterministic and do not require network access.

Evidence required before marking DONE:

- Verifier SDK tests pass.
- Reference signer tests pass.
- At least one fixture for each acceptance case.
- README or integration note shows the flow:
  Decision Response -> Decision Artifact -> Verifier -> Reference Signer.
- No production deploy unless separately approved.

