# DEV-SG-001A Implementation Decision Record V2.1 Addendum

TASK_ID=DEV-SG-001

Checkpoint: DEV-SG-001A-V2.1 - Design Addendum

Status: READY_FOR_PM_REVIEW

Created at: 2026-07-18T23:01:10+08:00

Reviewed V2 commit:

`de5af528006c86c63f659ab1cfe9799a099ceac2`

Reviewed V2 design record:

`DEV-SG-001A_IMPLEMENTATION_DECISION_RECORD_V2.md`

Developer worktree:

`/Users/0xkwan/.openclaw/worktrees/dev-sg-001`

Approved PM contract commit:

`900ec4ff27420524f27a5cc8d9a403867aaf4c4e`

IMPLEMENTATION_STATUS=NOT_STARTED

PM_CONTRACT_DEVIATIONS=NONE

IMPLEMENTED_ACTION_SCOPE=deploy_change

COMMERCE_ADAPTER_STATUS=DOCUMENTED_NON_LIVE_STUB

PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED

QA_STATUS=BLOCKED_PENDING_IMPLEMENTATION

INDEPENDENT_REVIEW_STATUS=BLOCKED_PENDING_IMPLEMENTATION

## 1. Production ALLOW Semantics

Decision status: SELECTED

Before separate Founder Gate 4 passes:

- Production actions may be represented.
- Production actions may be fingerprinted.
- Production actions may be evaluated.
- Production actions may not receive an executable `ALLOW`.
- Founder policy approval alone is insufficient to authorize production
  execution.
- The standard wrapper must never receive an `ALLOW` for production that it is
  nevertheless required to reject.

Required evaluation behavior before Gate 4:

- Return `REQUIRE_APPROVAL` with reason code `PRODUCTION_GATE_4_REQUIRED`; or
- Return `DENY` with reason code `PRODUCTION_EXECUTION_NOT_AUTHORIZED`.

Rejected behavior:

- Do not issue production `ALLOW` and rely on the wrapper to reject it.
- Do not represent production intent as a preview strategy.
- Do not treat Founder approval grant as Gate 4.

### Approval Lifecycle Dogfood Scenario

Move executable approval lifecycle dogfood away from production deployment.

Selected executable approval scenario:

`preview deploy + touches_permissions=true`

Expected flow:

```text
REQUIRE_APPROVAL
-> trusted Founder grant
-> fresh evaluation
-> new ALLOW
-> atomic consume
-> preview/local execution
```

Production scenario remains non-executable until Gate 4:

```text
production deploy request
-> REQUIRE_APPROVAL / PRODUCTION_GATE_4_REQUIRED
or DENY / PRODUCTION_EXECUTION_NOT_AUTHORIZED
-> no executable ALLOW
-> no production execution
```

## 2. Expiry Persistence

Decision status: SELECTED

Add persistent decision transition:

`AVAILABLE -> EXPIRED`

When `expires_at <= authoritative server_now` is first observed:

- atomically mark the decision `EXPIRED`;
- record `expired_at`;
- create expiry audit evidence;
- never allow `EXPIRED -> AVAILABLE`;
- never allow `EXPIRED -> CONSUMED`.

Backward clock observations must not revive an already observed expired
decision. Expiry state is persistent once recorded.

Implementation consequence for later code:

- Consume first checks/observes expiry using authoritative server time.
- If decision is expired, the state/audit transition to `EXPIRED` must be
  persisted in a transaction-safe pattern.
- Subsequent consume attempts return expired/conflict semantics, not a fresh
  availability check that can revive the row.

## 3. Strict JSON Parser Options

Decision status: SELECTED

Pinned parser:

`@humanwhocodes/momoa@3.3.10`

Required parser options:

- `mode=json`
- `allowTrailingCommas=false`

Reject:

- comments;
- trailing commas;
- duplicate keys;
- escaped-equivalent duplicate names;
- malformed JSON;
- invalid escapes;
- unsupported numeric forms;
- excessive nesting;
- unknown top-level fields;
- unknown action fields.

Duplicate detection rule:

- Detect duplicate member names after interpreting JSON string escapes, so
  `"target"` and `"tar\\u0067et"` collide.
- Apply the same rule recursively to nested objects.
- Arrays may contain objects, and duplicate-key detection applies inside each
  object independently.

Test requirements:

- normal duplicate keys;
- escaped-equivalent duplicate keys;
- nested duplicate keys;
- arrays containing duplicate-key objects;
- comments rejected;
- trailing commas rejected;
- invalid escapes rejected;
- unsupported numeric forms rejected;
- malformed JSON rejected;
- excessive nesting rejected;
- unknown fields rejected before fingerprinting.

If `@humanwhocodes/momoa@3.3.10` cannot run in the Worker-compatible build, the
parser decision becomes BLOCKED and Developer must stop for PM review rather
than replacing it casually with a hand-written parser.

## 4. D1 Transactional Limitation

Decision status: SELECTED

Record the limitation:

- D1 batch rollback occurs on statement failure.
- A conditional `UPDATE` affecting zero rows is not itself assumed to be a
  statement failure.

Therefore, the V2 pseudo-SQL is not implementation authorization.

DEV-SG-001C must prove an executable D1-supported mechanism that prevents
receipt/audit creation when consume ownership is not acquired.

Acceptable mechanism candidates:

- SQL constraint;
- trigger;
- guarded insert/update structure;
- another D1-supported transaction pattern.

Required proof:

- update zero-row cannot create a consume receipt;
- update zero-row cannot create a success audit;
- injected receipt failure rolls back decision transition;
- injected audit failure rolls back decision transition and receipt;
- no observation can produce `decision=CONSUMED` and `receipt=missing`;
- successful consume always has one receipt and one success audit;
- concurrent consume produces exactly one logical success.

Do not claim pass based only on `db.batch()` documentation.

If D1 cannot prove these properties:

```text
D1_ATOMICITY_STATUS=FAIL
NEXT_ARCHITECTURE=Durable Objects or another serialization authority
IMPLEMENTATION_STATUS=BLOCKED
```

## 5. DEV-SG-001B Baseline Gate

Decision status: SELECTED

Before adding dependencies or application code:

1. Verify clean worktree.
2. Record Node version.
3. Record npm version.
4. Calculate `package-lock.json` SHA-256.
5. Run `npm ci`.
6. Run `npm run check`.
7. Record complete stdout/stderr and exit codes.
8. Confirm `npm ci` did not alter `package-lock.json`.
9. Confirm git status after baseline.

Required result:

`DEV_SG_001B_BASELINE_GATE=PASS`

If tests fail:

- create `KNOWN_BASELINE_FAILURES.md`;
- include exact test, error, pre-existing evidence, risk, owner, and expiry;
- stop for PM approval;
- do not begin DEV-SG-001C;
- do not begin implementation.

## 6. DEV-SG-001C Isolated Atomicity Spike

Decision status: SELECTED

Run only after DEV-SG-001B baseline passes.

Allowed path:

`spikes/dev-sg-001c-d1-atomic-consume/`

Forbidden paths:

- `src/`
- `migrations/`
- Worker routes
- deployment config
- approved PM artifacts

The spike may create only isolated local test/spike artifacts.

The spike must prove:

1. exactly one concurrent consume attempt succeeds;
2. same `execution_attempt_id` returns the same receipt;
3. different attempt ID returns 409-equivalent conflict;
4. update zero-row cannot create a receipt;
5. update zero-row cannot create a success audit;
6. injected receipt failure rolls back decision transition;
7. injected audit failure rolls back decision transition and receipt;
8. no observation can produce `decision=CONSUMED` and `receipt=missing`;
9. successful consume always has one receipt and one success audit;
10. expired transition is persistent and cannot revive.

The spike must record the exact mechanism used:

- SQL constraint;
- trigger;
- guarded insert/update structure;
- or another D1-supported transaction pattern.

## 7. Scope Lock

APPLICATION_IMPLEMENTATION_STATUS=NOT_STARTED

QA_STATUS=BLOCKED_PENDING_IMPLEMENTATION

INDEPENDENT_REVIEW_STATUS=BLOCKED_PENDING_IMPLEMENTATION

PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED

This addendum authorizes DEV-SG-001B baseline gate and, only if baseline passes,
DEV-SG-001C isolated atomicity spike. It does not authorize full DEV-SG-001
application implementation.
