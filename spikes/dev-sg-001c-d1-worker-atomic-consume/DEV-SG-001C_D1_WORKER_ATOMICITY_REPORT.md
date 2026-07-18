# DEV-SG-001C D1 Worker Atomicity Spike Report

TASK_ID=DEV-SG-001

Spike: DEV-SG-001C_D1_WORKER_ATOMIC_CONSUME

Status: PROPOSED_PASS_PENDING_PM_ACKNOWLEDGEMENT

Recorded at: 2026-07-18T23:35:19+08:00

Repository: `lukekwan/agent-payment-guard`

Branch: `dev/sg-001-deploy-change-decision`

Harness path:

`spikes/dev-sg-001c-d1-worker-atomic-consume/`

## Isolation

This spike used a disposable Cloudflare D1 database and disposable Worker:

- D1 database name: `signgate-dev-sg-001c-atomic-20260718-2335`
- D1 database ID: `e69f49ff-2430-4116-b472-4527462bbdcc`
- Worker name: `signgate-dev-sg-001c-atomic-consume-20260718`
- Worker URL during test:
  `https://signgate-dev-sg-001c-atomic-consume-20260718.bytoken2023.workers.dev`
- Worker version ID: `ed8e2a53-a94c-4052-89b5-b5e1da7517f0`

No production D1, production credentials, production migrations, product
application source, live product routes, production deployment configuration,
production data, or product secrets were used.

Cleanup evidence:

- Disposable Worker was deleted.
- Disposable D1 database was deleted.
- Cleanup log: `evidence/cleanup.txt`.

## Runtime Versions

```text
Node v24.15.0
npm 11.12.1
Wrangler 4.112.0
compatibility_date 2026-07-18
```

## Mechanism

The spike used the actual D1 Worker Binding API via `env.DB.batch()`.

The mechanism is:

1. Conditional ownership acquisition by `UPDATE decisions ... WHERE state =
   'AVAILABLE' ... AND consume_lock_token IS NULL`.
2. Unique per-attempt `consume_lock_token` is written only by the winning
   ownership update.
3. Receipt creation is guarded by
   `INSERT INTO consume_receipts ... SELECT ... FROM decisions WHERE
   consume_lock_token = ?`.
4. Success audit creation is guarded by
   `INSERT INTO decision_audit_events ... SELECT ... FROM consume_receipts
   WHERE consume_lock_token = ?`.
5. Failure injection proves D1 batch rollback on statement failure for receipt
   and audit failures.
6. Zero-row ownership acquisition is not treated as statement failure; guarded
   `INSERT ... SELECT` produces zero receipt/audit rows when ownership was not
   acquired.
7. Same-attempt retry reads and returns the original receipt without creating a
   second receipt or success audit.
8. First-observed expiry persists `EXPIRED` plus expiry audit and cannot revive.

## Invariant Results

| # | Invariant | Result |
|---|---|---|
| 1 | zero-row ownership acquisition creates no receipt | PASS |
| 2 | zero-row ownership acquisition creates no success audit | PASS |
| 3 | receipt failure rolls back decision state and audit | PASS |
| 4 | audit failure rolls back decision state and receipt | PASS |
| 5 | concurrent different-attempt requests yield exactly one success | PASS |
| 6 | losing different attempts receive conflict semantics | PASS |
| 7 | same execution_attempt_id returns exact original receipt | PASS |
| 8 | same-attempt retry creates no second receipt or success audit | PASS |
| 9 | foreign tenant creates no receipt/audit and does not reveal existence | PASS |
| 10 | wrong decision enum creates no receipt/audit | PASS |
| 11 | wrong state creates no receipt/audit | PASS |
| 12 | wrong fingerprint creates no receipt/audit | PASS |
| 13 | wrong policy version creates no receipt/audit | PASS |
| 14 | expired decision creates no consume receipt/success audit | PASS |
| 15 | first-observed expiry persists EXPIRED plus expiry audit | PASS |
| 16 | backward-clock simulation cannot revive EXPIRED | PASS |
| 17 | successful consume exposes CONSUMED, one receipt and one audit together | PASS |
| 18 | no observable state has CONSUMED with missing receipt | PASS |
| 19 | external-action failure after consume leaves decision permanently consumed | PASS |
| 20 | repeated stress runs preserve all invariants | PASS |

Stress runs: 10

Main concurrent run: 12 different attempts, exactly 1 success and 11 conflicts.

Request/response log entries: 181

## Evidence

- `schema.sql`
- `worker.mjs`
- `run-d1-spike.mjs`
- `wrangler.jsonc`
- `evidence/d1-create.txt`
- `evidence/d1-schema-apply.txt`
- `evidence/worker-deploy.txt`
- `evidence/d1-spike-test.txt`
- `evidence/d1-invariant-results.json`
- `evidence/request-response-log.json`
- `evidence/versions-and-hashes.txt`
- `evidence/cleanup.txt`

## Hashes

```text
ade75eb86a0d6f981a37ca9b06d50a1473deea215fb4507025388aa1cfebdb1f  package.json
63779edb3274014b937041f7c4b99ca6b0226c6c0e83dca6c3c860293cf07f2f  package-lock.json
6d65a20807ccdaebfee1bc237e90389c7d3bb46b411f916b5af5b83acf979283  wrangler.jsonc
c62a6ec2f3df64df7c71bd24f861b25dc6caa66bdfcdf586357701ba5d4c7b17  schema.sql
22a810ce9de6b07413072ad45177b5c0f1f6ebcd6be312992e626f4f6d9ae519  worker.mjs
ce7746fe741bb509a7b9b75ba2a780835776eafd0e52a58a34b504396afbfb9a  run-d1-spike.mjs
d60de21882105a81d1c889aa9d9dd3807bd6d36bc54008613dc0ed2e771fb2ce  evidence/d1-invariant-results.json
8184db4d49773aad54ef84497ede8d820814a69701d7c4f2d0d24887904f01d8  evidence/request-response-log.json
48c79efb75212416e23de9058e5334040932884d9a5e31805b67be30fa58e43d  evidence/d1-spike-test.txt
ccf949f347e15b59a6cbb927bd7c8c748c0ffe97c98b9ba6198d27ee0dca70f9  evidence/d1-create.txt
14d866b5fa4f90d16d385a7af4023b527c9c161a1b643cd0922440746c667163  evidence/d1-schema-apply.txt
1541ed7216af16b97b3a50f0c442e24102640bb58d9323a29a38dae4e1b84f28  evidence/worker-deploy.txt
2eec771ed829480de8d4322887ade3e7a424f28770fcef0726e58e717ada599e  evidence/cleanup.txt
```

## Gate Proposal

D1_RUNTIME_ATOMICITY=PROPOSED_PROVEN_PENDING_PM_ACKNOWLEDGEMENT

DEV_SG_001C_D1_ATOMICITY_SPIKE=PROPOSED_PASS_PENDING_PM_ACKNOWLEDGEMENT

FULL_APPLICATION_IMPLEMENTATION_STATUS=BLOCKED

PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED

## Final Evidence Correction

Correction status: PROPOSED_PASS_PENDING_PM_ACKNOWLEDGEMENT

Recorded at: 2026-07-19T00:16:39+08:00

Corrected disposable resources:

- D1 database name: `signgate-dev-sg-001c-atomic-correction-20260719-0017`
- D1 database ID: `4b090521-222d-4aff-afed-421b70385ad1`
- Worker name: `signgate-dev-sg-001c-atomic-correction-20260719`
- Worker URL during test:
  `https://signgate-dev-sg-001c-atomic-correction-20260719.bytoken2023.workers.dev`
- Worker version ID: `9dd93c23-334f-475c-a05e-6e7187fc6256`

Cleanup:

- Disposable Worker deleted.
- Disposable D1 deleted.
- Cleanup evidence: `evidence/cleanup-correction.txt`.

Corrections added:

- Separate `decision TEXT NOT NULL CHECK decision IN ('ALLOW',
  'REQUIRE_APPROVAL', 'DENY')` column.
- Ownership acquisition requires both `decision='ALLOW'` and
  `state='AVAILABLE'`.
- Explicit DENY refusal test.
- Explicit REQUIRE_APPROVAL refusal test.
- Both decision-refusal cases create no receipt, no success audit, do not reveal
  cross-tenant data, and leave the decision unchanged.
- Explicit downstream execution failure endpoint records an
  `execution_results` row and `DOWNSTREAM_EXECUTION_FAILED` audit after a
  successful consume.
- Downstream failure evidence verifies state remains `CONSUMED`, original
  receipt remains unchanged, no second consume succeeds, and `AVAILABLE` is not
  restored.
- Caller-controlled `now` is documented in result JSON as
  `TEST_HARNESS_ONLY`, not part of the product contract, and not production
  implementation authorization.
- Ten complete-suite stress cycles were executed, not a concurrency-only loop.

Correction results:

- Full-suite stress cycles: 10.
- Full-suite stress pass count: 10.
- Per-invariant pass count: 10/10 for every invariant.
- HTTP status counts: 200=385, 404=33, 409=209, 500=44.
- Complete request/response log entries: 880.

Corrected evidence:

- `evidence/d1-create-correction.txt`
- `evidence/d1-schema-apply-correction.txt`
- `evidence/worker-deploy-correction.txt`
- `evidence/d1-spike-test-correction.txt`
- `evidence/d1-invariant-results-correction.json`
- `evidence/request-response-log-correction.json`
- `evidence/versions-and-hashes-correction.txt`
- `evidence/cleanup-correction.txt`

Decision enum results:

- DENY consume result: PASS.
- REQUIRE_APPROVAL consume result: PASS.

Downstream failure result:

- PASS.

D1_RUNTIME_ATOMICITY=PROPOSED_PROVEN_PENDING_PM_ACKNOWLEDGEMENT

DEV_SG_001C_D1_ATOMICITY_SPIKE=PROPOSED_PASS_PENDING_PM_ACKNOWLEDGEMENT
