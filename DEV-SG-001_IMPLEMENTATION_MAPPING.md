# DEV-SG-001 Implementation Mapping

Status: implementation evidence, not a new design proposal.

Base commit: 5ac67be4fe17b5c1b773bcc584080cad704f4959

## Mapping

| Frozen requirement | Implementation module | Route/internal operation | D1 table/migration | Test ID | Audit event | Evidence artifact |
| --- | --- | --- | --- | --- | --- | --- |
| Strict frozen `deploy_change` request intake | `src/signgate-decision.js` | `POST /v1/decisions` | `migrations/0008_signgate_deploy_change_decisions.sql` | contract-strict-json | `decision.created` when evaluation completes | `evidence/dev-sg-001-implementation/contract-results.json` |
| Preview API-key authentication and tenancy | `src/signgate-decision.js` | `POST /v1/decisions`, consume, Founder grant | `signgate_api_credentials` | auth-tenancy | credential last-use metadata | `evidence/dev-sg-001-implementation/contract-results.json` |
| RFC 8785 fingerprint and sorted-unique deploy sets | `src/signgate-decision.js` | decision creation and wrapper verification | `signgate_decisions.action_fingerprint` | fingerprint-golden | `decision.created` | `evidence/dev-sg-001-implementation/fingerprint-results.json` |
| Deploy policy v0.1 decisions | `src/signgate-decision.js` | `POST /v1/decisions` | `signgate_decisions` | policy-matrix, DF-01..DF-07 | `decision.created` | `evidence/dev-sg-001-implementation/policy-results.json` |
| Organization-scoped request idempotency | `src/signgate-decision.js` | `POST /v1/decisions` | `signgate_request_idempotency` | idempotency | existing decision audit reused, mismatch fail-closed | `evidence/dev-sg-001-implementation/contract-results.json` |
| Founder dogfood approval grant | `src/signgate-decision.js` | `POST /internal/dogfood/founder-approval-grants` | `signgate_approval_grants` | approval-lifecycle, DF-02 | `approval_grant.created` | `evidence/dev-sg-001-implementation/df-scenario-results.json` |
| Atomic consume | `src/signgate-decision.js` | `POST /v1/decisions/{decision_id}/consume` | `signgate_consume_receipts`, `signgate_audit_events` | consume-concurrency | `decision.consumed`, `decision.expired` | `evidence/dev-sg-001-implementation/consume-results.json` |
| Preview/local wrapper | `src/signgate-decision.js` | internal exported wrapper service | `signgate_execution_results` | wrapper-fail-closed, DF-01, DF-02, DF-05, DF-06 | execution result metadata | `evidence/dev-sg-001-implementation/wrapper-results.json` |
| Audit and retention | `src/signgate-decision.js` | all operations | all `signgate_*` tables carry `delete_after` where retained | audit-retention | decision, grant, consume, expiry | `evidence/dev-sg-001-implementation/versions-and-hashes.txt` |
| Commerce non-live stub preservation | `src/index.js` | existing `/v1/agentic-commerce/preflight` | none | commerce-stub-preserved | none | `evidence/dev-sg-001-implementation/forbidden-scope-check.txt` |
