# DEV-SG-001C Atomic Consume Spike Report

TASK_ID=DEV-SG-001

Spike: DEV-SG-001C isolated D1 atomicity spike

Status: PASS_CLOSEST_SUPPORTED_SQLITE_SPIKE

Captured at: 2026-07-18T23:08:02+08:00

## Environment

The spike used local SQLite 3.51.0 through Python `sqlite3` as the closest local
D1-compatible SQL transaction environment available in this runtime.

Cloudflare D1-specific acceptance still requires the implementation phase to
run this mechanism through the Worker/D1 API before release candidate status.

## Mechanism

ATOMICITY_MECHANISM=transactional guarded update with consume_lock_token,
guarded receipt insert, guarded audit insert, rollback on receipt/audit failure,
persistent expiry transition

The executable pattern is:

1. Begin an immediate transaction.
2. Persist `AVAILABLE -> EXPIRED` and expiry audit first when
   `expires_at <= server_now`.
3. Conditional `AVAILABLE -> CONSUMED` update sets `consume_lock_token` to the
   winning `execution_attempt_id`.
4. Receipt insert selects only the row holding the matching lock token.
5. Success audit insert selects only the row holding the matching lock token.
6. Receipt or audit failure rolls back the whole transaction.
7. Zero-row update produces no matching lock token, so it cannot create receipt
   or success audit.

## Results

| Required proof | Result |
|---|---|
| exactly one concurrent consume attempt succeeds | PASS |
| same `execution_attempt_id` returns same receipt | PASS |
| different attempt ID returns conflict | PASS |
| update zero-row cannot create receipt | PASS |
| update zero-row cannot create success audit | PASS |
| injected receipt failure rolls back decision transition | PASS |
| injected audit failure rolls back decision transition and receipt | PASS |
| no observation can produce `decision=CONSUMED` and `receipt=missing` | PASS |
| successful consume always has one receipt and one success audit | PASS |
| expired transition is persistent and cannot revive | PASS |

## Evidence

- `run_spike.py`
- `evidence/stdout.txt`
- `evidence/results.json`
- `evidence/stdout-failed-attempt-1.txt`

The first failed attempt is retained as debugging evidence. It found the spike
schema was missing a uniqueness constraint on `consume_receipt_id`; the isolated
spike schema was corrected before the passing run.

## Gate Result

DEV_SG_001C_STATUS=PASS

D1_ATOMICITY_STATUS=PASS_CLOSEST_SUPPORTED_SQLITE_SPIKE

CONCURRENT_CONSUME_RESULT=PASS_EXACTLY_ONE_SUCCESS

ORPHAN_STATE_TEST_RESULT=PASS_NO_CONSUMED_WITHOUT_RECEIPT

EXPIRY_PERSISTENCE_TEST_RESULT=PASS_EXPIRED_DOES_NOT_REVIVE

APPLICATION_IMPLEMENTATION_STATUS=NOT_STARTED

PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED
