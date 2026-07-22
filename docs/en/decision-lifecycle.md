# Decision lifecycle

SignGate separates policy evaluation from execution. A successful HTTP response is not, by itself, permission to deploy.

1. Submit the complete action to [`POST /v1/decisions`](api-reference/create-decision.md).
2. Verify the returned decision and exact `bound_action`.
3. Stop for `REQUIRE_APPROVAL` or `DENY`.
4. For `ALLOW`, verify the action fingerprint and expiry.
5. Immediately before the irreversible action, call [`POST /v1/decisions/{decision_id}/consume`](api-reference/consume-decision.md).
6. Execute only after atomic consume returns a valid receipt.

## Decision meanings

| Decision | Execution directive | Meaning |
| --- | --- | --- |
| `ALLOW` | `EXECUTE`, maximum one use | May proceed only after atomic consume succeeds. |
| `REQUIRE_APPROVAL` | `DO_NOT_EXECUTE` | Does not authorize execution. Obtain a trusted approval grant and submit a fresh decision request. |
| `DENY` | `DO_NOT_EXECUTE` | Does not authorize execution. |

`ALLOW` is action-bound, time-limited to at most 15 minutes, and single-use. Every non-valid-`ALLOW` outcome fails closed.

## Fingerprinting

SignGate calculates SHA-256 over an RFC 8785 canonical envelope containing the contract version, authenticated organization, authenticated or resolved agent identity, and complete normalized action.

`changed_paths` and `changed_routes` use set semantics: exact duplicates are removed, values are sorted deterministically, and case-distinct values remain distinct. Unknown execution-relevant fields are rejected before fingerprinting.
