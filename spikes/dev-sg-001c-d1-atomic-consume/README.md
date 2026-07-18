# DEV-SG-001C D1 Atomic Consume Spike

TASK_ID=DEV-SG-001

Status: isolated spike

This spike tests the SQL transaction pattern for SignGate atomic consume before
any production application code, production migrations, Worker routes, or
deployment config are modified.

The closest local environment used here is SQLite 3.51.0 through Python's
standard `sqlite3` module. Cloudflare D1 is SQLite-backed, but D1-specific
acceptance still requires the implementation phase to run the same pattern
through the Worker/D1 API before release candidate status.

## Mechanism

The spike uses a guarded transaction:

1. `BEGIN IMMEDIATE`
2. Persist expiry first when `expires_at <= server_now`.
3. Conditional `AVAILABLE -> CONSUMED` update sets a unique
   `consume_lock_token` to the execution attempt ID.
4. Receipt insert is guarded by the same decision, organization, fingerprint,
   and lock token.
5. Success audit insert is guarded by the same lock token.
6. If receipt or audit insert fails, rollback restores the decision to
   `AVAILABLE`.
7. If the conditional update affects zero rows, no receipt or success audit is
   created. The caller checks for exact same-attempt receipt; otherwise it
   returns conflict/expired.

## Commands

```sh
python3 run_spike.py
```

The script writes:

- `evidence/results.json`
- `evidence/stdout.txt`

## Expected Gate

The spike must prove:

- exactly one concurrent consume attempt succeeds;
- same execution attempt returns the same receipt;
- different attempt ID returns conflict;
- zero-row update cannot create receipt/audit;
- injected receipt failure rolls back decision transition;
- injected audit failure rolls back decision transition and receipt;
- no observation has `decision=CONSUMED` and missing receipt;
- successful consume has one receipt and one success audit;
- expiry is persistent and cannot revive.
