# DOC-SG-001 API Documentation Handoff

## Role

The receiving agent is the Nomos Labs SignGate API Documentation Builder.

It owns:

- API documentation drafts
- Public and internal OpenAPI specifications
- English and Traditional Chinese documentation
- Validated API examples
- GitBook draft/change-request automation

It does not own:

- Product requirements
- Application implementation
- PM acceptance
- QA acceptance
- Production publication

## Source of truth

### PM contract

Repository:
lukekwan/openclaw-workspace

Commit:
900ec4ff27420524f27a5cc8d9a403867aaf4c4e

Path:
projects/signgate/specs/pm-contract-v0.1/approved/

### PM implementation gate

Repository:
lukekwan/openclaw-workspace

Commit:
368017761a29b2a72649ce6c3d0e9f0711c8bb8d

Path:
projects/signgate/reviews/dev-sg-001-implementation-gate/SIGNGATE_DEV_SG_001_IMPLEMENTATION_GATE_ACKNOWLEDGEMENT.md

### Frozen implementation

Repository:
lukekwan/agent-payment-guard

Commit:
901080e5315bdef8deb81eb69ed44853f17ce680

### Implementation evidence

Repository:
lukekwan/agent-payment-guard

Commit:
ab643504acf0df6686d18845258842a12aba2882

## Current governance status

APPLICATION_IMPLEMENTATION=COMPLETED_PENDING_PM_REVIEW
QA_STATUS=BLOCKED_PENDING_IMPLEMENTATION_REVIEW
INDEPENDENT_REVIEW_STATUS=BLOCKED
PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED
DOC_DRAFTING_STATUS=AUTHORIZED
DOC_PUBLICATION_STATUS=BLOCKED_PENDING_PM_AND_QA

## Implemented scope

Action:

deploy_change

Public candidate endpoints:

- POST /v1/decisions
- POST /v1/decisions/{decision_id}/consume

Internal-only endpoint:

- POST /internal/dogfood/founder-approval-grants

Other status:

- Preview/local wrapper implemented
- Commerce/x402 enforcement remains a documented non-live stub
- send_external_message is not implemented
- Production execution is not authorized

## Required implementation files

Read:

- DEV-SG-001_IMPLEMENTATION_MAPPING.md
- DEV-SG-001_IMPLEMENTATION_REPORT.md
- src/signgate-decision.js
- src/index.js
- migrations/0008_signgate_deploy_change_decisions.sql
- test/signgate-decision.test.js
- evidence/dev-sg-001-implementation/

## Public/internal documentation boundary

Public documentation may include:

- POST /v1/decisions
- POST /v1/decisions/{decision_id}/consume
- Authentication concepts
- Decision model
- Atomic consume
- Errors
- Security boundaries
- Preview examples

Public documentation must not expose:

- /internal/dogfood/founder-approval-grants
- credential bootstrap mechanics
- API key hashes or secrets
- Founder Gate 4 operating procedures
- internal service credentials
- production resource identifiers

The Founder endpoint may be documented only in the internal specification.

## Required wording

Documentation must clearly state:

- SignGate is in preview
- ALLOW is not executable until atomic consume succeeds
- ALLOW is action-bound, time-limited and single-use
- REQUIRE_APPROVAL does not authorize execution
- DENY does not authorize execution
- Every non-valid-ALLOW outcome fails closed
- Production deployment is not authorized
- Commerce/x402 enforcement is not live in DOC-SG-001

## Planned deliverables

- docs/openapi/signgate-public-v0.1.openapi.json
- docs/openapi/signgate-internal-v0.1.openapi.json
- docs/en/
- docs/zh/
- docs/examples/curl/
- docs/examples/javascript/
- docs/examples/python/
- tools/gitbook-sync/
- DOC-SG-001_API_DOCUMENTATION_REPORT.md

## GitBook rules
