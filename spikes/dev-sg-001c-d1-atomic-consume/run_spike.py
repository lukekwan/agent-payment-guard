#!/usr/bin/env python3
import concurrent.futures
import json
import os
import sqlite3
import tempfile
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EVIDENCE = ROOT / "evidence"
EVIDENCE.mkdir(parents=True, exist_ok=True)


def connect(db_path):
    conn = sqlite3.connect(db_path, timeout=30, isolation_level=None)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_schema(conn):
    conn.executescript(
        """
        CREATE TABLE decisions (
          organization_id TEXT NOT NULL,
          decision_id TEXT NOT NULL,
          decision TEXT NOT NULL CHECK (decision IN ('ALLOW', 'REQUIRE_APPROVAL', 'DENY')),
          state TEXT NOT NULL CHECK (state IN ('AVAILABLE', 'CONSUMED', 'NON_EXECUTABLE', 'EXPIRED')),
          action_fingerprint TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          consumed_at INTEGER,
          expired_at INTEGER,
          consume_lock_token TEXT,
          PRIMARY KEY (organization_id, decision_id),
          UNIQUE (organization_id, decision_id, consume_lock_token)
        );

        CREATE TABLE consume_receipts (
          organization_id TEXT NOT NULL,
          decision_id TEXT NOT NULL,
          consume_receipt_id TEXT NOT NULL,
          execution_attempt_id TEXT NOT NULL,
          action_fingerprint TEXT NOT NULL,
          consumed_at INTEGER NOT NULL,
          PRIMARY KEY (organization_id, decision_id),
          UNIQUE (consume_receipt_id),
          UNIQUE (organization_id, decision_id, execution_attempt_id),
          FOREIGN KEY (organization_id, decision_id)
            REFERENCES decisions (organization_id, decision_id)
        );

        CREATE TABLE audit_events (
          audit_id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL,
          decision_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          result_code TEXT NOT NULL CHECK (result_code != 'INJECT_AUDIT_FAILURE'),
          created_at INTEGER NOT NULL,
          FOREIGN KEY (organization_id, decision_id)
            REFERENCES decisions (organization_id, decision_id)
        );
        """
    )


def seed_decision(conn, decision_id, expires_at, state="AVAILABLE"):
    conn.execute(
        """
        INSERT INTO decisions (
          organization_id, decision_id, decision, state, action_fingerprint, expires_at
        ) VALUES ('org_1', ?, 'ALLOW', ?, 'sha256:action', ?)
        """,
        (decision_id, state, expires_at),
    )


def consume(db_path, decision_id, attempt_id, now, inject=None):
    conn = connect(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE")
        # Expiry is persistent once observed.
        expiry_update = conn.execute(
            """
            UPDATE decisions
            SET state='EXPIRED',
                expired_at=?
            WHERE organization_id='org_1'
              AND decision_id=?
              AND state='AVAILABLE'
              AND expires_at <= ?
            """,
            (now, decision_id, now),
        )
        if expiry_update.rowcount == 1:
            conn.execute(
                """
                INSERT INTO audit_events (
                  audit_id, organization_id, decision_id, event_type, result_code, created_at
                ) VALUES (?, 'org_1', ?, 'decision_expired', 'DECISION_EXPIRED', ?)
                """,
                (f"audit_expired_{decision_id}_{now}", decision_id, now),
            )
            conn.commit()
            return {"status": "EXPIRED"}

        transition = conn.execute(
            """
            UPDATE decisions
            SET state='CONSUMED',
                consumed_at=?,
                consume_lock_token=?
            WHERE organization_id='org_1'
              AND decision_id=?
              AND decision='ALLOW'
              AND state='AVAILABLE'
              AND action_fingerprint='sha256:action'
              AND expires_at > ?
            """,
            (now, attempt_id, decision_id, now),
        )

        if transition.rowcount == 0:
            conn.commit()
            existing = conn.execute(
                """
                SELECT consume_receipt_id
                FROM consume_receipts
                WHERE organization_id='org_1'
                  AND decision_id=?
                  AND execution_attempt_id=?
                """,
                (decision_id, attempt_id),
            ).fetchone()
            if existing:
                return {"status": "SAME_ATTEMPT_RECEIPT", "receipt": existing[0]}
            state = conn.execute(
                """
                SELECT state
                FROM decisions
                WHERE organization_id='org_1' AND decision_id=?
                """,
                (decision_id,),
            ).fetchone()
            return {"status": "CONFLICT", "state": state[0] if state else "MISSING"}

        receipt_id = (
            "duplicate_receipt"
            if inject == "receipt_failure"
            else f"receipt_{decision_id}_{attempt_id}"
        )
        conn.execute(
            """
            INSERT INTO consume_receipts (
              organization_id,
              decision_id,
              consume_receipt_id,
              execution_attempt_id,
              action_fingerprint,
              consumed_at
            )
            SELECT organization_id,
                   decision_id,
                   ?,
                   ?,
                   action_fingerprint,
                   consumed_at
            FROM decisions
            WHERE organization_id='org_1'
              AND decision_id=?
              AND state='CONSUMED'
              AND consume_lock_token=?
            """,
            (receipt_id, attempt_id, decision_id, attempt_id),
        )
        if conn.total_changes == 0:
            raise AssertionError("guarded receipt insert made no change")

        result_code = (
            "INJECT_AUDIT_FAILURE"
            if inject == "audit_failure"
            else "CONSUME_PASS"
        )
        conn.execute(
            """
            INSERT INTO audit_events (
              audit_id, organization_id, decision_id, event_type, result_code, created_at
            )
            SELECT ?,
                   organization_id,
                   decision_id,
                   'decision_consumed',
                   ?,
                   consumed_at
            FROM decisions
            WHERE organization_id='org_1'
              AND decision_id=?
              AND state='CONSUMED'
              AND consume_lock_token=?
            """,
            (f"audit_consume_{decision_id}_{attempt_id}", result_code, decision_id, attempt_id),
        )

        conn.commit()
        return {"status": "CONSUMED", "receipt": receipt_id}
    except Exception as error:
        conn.rollback()
        return {"status": "ERROR_ROLLED_BACK", "error": str(error)}
    finally:
        conn.close()


def counts(conn, decision_id):
    state = conn.execute(
        "SELECT state FROM decisions WHERE organization_id='org_1' AND decision_id=?",
        (decision_id,),
    ).fetchone()
    receipts = conn.execute(
        "SELECT COUNT(*) FROM consume_receipts WHERE organization_id='org_1' AND decision_id=?",
        (decision_id,),
    ).fetchone()[0]
    success_audits = conn.execute(
        """
        SELECT COUNT(*) FROM audit_events
        WHERE organization_id='org_1'
          AND decision_id=?
          AND event_type='decision_consumed'
          AND result_code='CONSUME_PASS'
        """,
        (decision_id,),
    ).fetchone()[0]
    expiry_audits = conn.execute(
        """
        SELECT COUNT(*) FROM audit_events
        WHERE organization_id='org_1'
          AND decision_id=?
          AND event_type='decision_expired'
        """,
        (decision_id,),
    ).fetchone()[0]
    return {
        "state": state[0] if state else None,
        "receipts": receipts,
        "success_audits": success_audits,
        "expiry_audits": expiry_audits,
    }


def assert_true(condition, name, results):
    results[name] = "PASS" if condition else "FAIL"
    if not condition:
        raise AssertionError(name)


def main():
    db_path = os.path.join(tempfile.mkdtemp(prefix="signgate-d1-spike-"), "spike.sqlite")
    conn = connect(db_path)
    init_schema(conn)
    now = int(time.time())

    # Pre-seed duplicate receipt ID to force a receipt insert failure later.
    seed_decision(conn, "d_receipt_duplicate_seed", now + 300)
    conn.execute(
        """
        INSERT INTO consume_receipts (
          organization_id, decision_id, consume_receipt_id, execution_attempt_id,
          action_fingerprint, consumed_at
        ) VALUES (
          'org_1', 'd_receipt_duplicate_seed', 'duplicate_receipt',
          'seed_attempt', 'sha256:action', ?
        )
        """,
        (now,),
    )
    seed_decision(conn, "d_concurrent", now + 300)
    conn.close()

    results = {"db_path": db_path}

    attempts = [f"attempt_{i}" for i in range(10)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        concurrent_results = list(
            executor.map(
                lambda attempt: consume(db_path, "d_concurrent", attempt, now),
                attempts,
            )
        )
    consumed = [r for r in concurrent_results if r["status"] == "CONSUMED"]
    conflicts = [r for r in concurrent_results if r["status"] == "CONFLICT"]
    conn = connect(db_path)
    c = counts(conn, "d_concurrent")
    assert_true(len(consumed) == 1, "exactly_one_concurrent_consume", results)
    assert_true(len(conflicts) == 9, "concurrent_losers_conflict", results)
    assert_true(c["state"] == "CONSUMED", "concurrent_final_state_consumed", results)
    assert_true(c["receipts"] == 1, "successful_consume_has_one_receipt", results)
    assert_true(c["success_audits"] == 1, "successful_consume_has_one_success_audit", results)
    assert_true(
        not (c["state"] == "CONSUMED" and c["receipts"] == 0),
        "no_consumed_without_receipt",
        results,
    )
    winning_attempt = consumed[0]["receipt"].split("_")[-1]
    same_retry = consume(db_path, "d_concurrent", f"attempt_{winning_attempt}", now + 1)
    assert_true(
        same_retry["status"] == "SAME_ATTEMPT_RECEIPT",
        "same_attempt_returns_same_receipt",
        results,
    )
    different_retry = consume(db_path, "d_concurrent", "attempt_replay", now + 2)
    assert_true(
        different_retry["status"] == "CONFLICT",
        "different_attempt_returns_conflict",
        results,
    )
    c_after_replay = counts(conn, "d_concurrent")
    assert_true(
        c_after_replay["receipts"] == 1,
        "zero_row_update_cannot_create_receipt",
        results,
    )
    assert_true(
        c_after_replay["success_audits"] == 1,
        "zero_row_update_cannot_create_success_audit",
        results,
    )
    conn.close()

    conn = connect(db_path)
    seed_decision(conn, "d_receipt_failure", now + 300)
    conn.close()
    receipt_failure = consume(
        db_path,
        "d_receipt_failure",
        "receipt_failure_attempt",
        now,
        inject="receipt_failure",
    )
    conn = connect(db_path)
    c_receipt_failure = counts(conn, "d_receipt_failure")
    assert_true(
        receipt_failure["status"] == "ERROR_ROLLED_BACK",
        "injected_receipt_failure_returns_error",
        results,
    )
    assert_true(
        c_receipt_failure["state"] == "AVAILABLE" and c_receipt_failure["receipts"] == 0,
        "injected_receipt_failure_rolls_back_decision",
        results,
    )
    conn.close()

    conn = connect(db_path)
    seed_decision(conn, "d_audit_failure", now + 300)
    conn.close()
    audit_failure = consume(
        db_path,
        "d_audit_failure",
        "audit_failure_attempt",
        now,
        inject="audit_failure",
    )
    conn = connect(db_path)
    c_audit_failure = counts(conn, "d_audit_failure")
    assert_true(
        audit_failure["status"] == "ERROR_ROLLED_BACK",
        "injected_audit_failure_returns_error",
        results,
    )
    assert_true(
        c_audit_failure["state"] == "AVAILABLE"
        and c_audit_failure["receipts"] == 0
        and c_audit_failure["success_audits"] == 0,
        "injected_audit_failure_rolls_back_decision_and_receipt",
        results,
    )
    conn.close()

    conn = connect(db_path)
    seed_decision(conn, "d_expired", now - 1)
    conn.close()
    expired_first = consume(db_path, "d_expired", "expired_attempt", now)
    expired_backward = consume(db_path, "d_expired", "expired_attempt_backwards", now - 100)
    conn = connect(db_path)
    c_expired = counts(conn, "d_expired")
    assert_true(expired_first["status"] == "EXPIRED", "expired_transition_observed", results)
    assert_true(c_expired["state"] == "EXPIRED", "expired_state_persistent", results)
    assert_true(c_expired["expiry_audits"] == 1, "expired_audit_created", results)
    assert_true(
        expired_backward["status"] == "CONFLICT"
        and counts(conn, "d_expired")["state"] == "EXPIRED",
        "backward_time_does_not_revive_expired",
        results,
    )
    conn.close()

    results["D1_ATOMICITY_STATUS"] = "PASS_CLOSEST_SUPPORTED_SQLITE_SPIKE"
    results["ATOMICITY_MECHANISM"] = (
        "transactional guarded update with consume_lock_token, guarded receipt "
        "insert, guarded audit insert, rollback on receipt/audit failure, "
        "persistent expiry transition"
    )
    results["CONCURRENT_CONSUME_RESULT"] = "PASS_EXACTLY_ONE_SUCCESS"
    results["ORPHAN_STATE_TEST_RESULT"] = "PASS_NO_CONSUMED_WITHOUT_RECEIPT"
    results["EXPIRY_PERSISTENCE_TEST_RESULT"] = "PASS_EXPIRED_DOES_NOT_REVIVE"

    (EVIDENCE / "results.json").write_text(json.dumps(results, indent=2, sort_keys=True))
    print(json.dumps(results, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
