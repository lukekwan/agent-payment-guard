# DOC-SG-001 API Documentation Report

## Intake

- DOC_SOURCE_INTAKE: PASS
- Repository: lukekwan/agent-payment-guard
- Handoff branch: handoff/doc-sg-001-api-docs
- Handoff commit: be7d64eb49004e46b54481ac53139130dde28cb3
- Handoff file: docs/handoffs/DOC-SG-001_HANDOFF.md
- Handoff file SHA-256: 5e0892c5f6a0e045fb4c9bcca3f3b81dbbd457d628141dbc689c25ebe1ef89c0
- Frozen implementation commit: 901080e5315bdef8deb81eb69ed44853f17ce680
- Implementation evidence commit: ab643504acf0df6686d18845258842a12aba2882
- Documentation working branch: docs/doc-sg-001-api-docs

## Deliverables

- Public OpenAPI: docs/openapi/signgate-public-v0.1.openapi.json
- Internal OpenAPI: docs/openapi/signgate-internal-v0.1.openapi.json
- English documentation: docs/en/README.md
- Traditional Chinese documentation: docs/zh/README.md
- curl examples: docs/examples/curl/
- JavaScript example: docs/examples/javascript/create-decision.mjs
- Python example: docs/examples/python/create_decision.py
- GitBook validation and dry-run tooling: tools/gitbook-sync/

## Public/Internal Boundary

PUBLIC_INTERNAL_BOUNDARY_STATUS=PASS

The public OpenAPI specification documents only:

- POST /v1/decisions
- POST /v1/decisions/{decision_id}/consume

The public OpenAPI specification does not include:

- POST /internal/dogfood/founder-approval-grants

The internal OpenAPI specification includes the Founder dogfood grant endpoint and marks it `x-internal: true`.

## Required Wording

The English and Traditional Chinese documentation state:

- SignGate is in preview
- ALLOW is not executable until atomic consume succeeds
- ALLOW is action-bound, time-limited and single-use
- REQUIRE_APPROVAL does not authorize execution
- DENY does not authorize execution
- Every non-valid-ALLOW outcome fails closed
- Production deployment is not authorized
- Commerce/x402 enforcement is not live in DOC-SG-001

## Validation

Validation commands executed:

```sh
node tools/gitbook-sync/validate-docs.mjs
node tools/gitbook-sync/dry-run.mjs
node -e "JSON.parse(require('fs').readFileSync('docs/openapi/signgate-public-v0.1.openapi.json','utf8')); JSON.parse(require('fs').readFileSync('docs/openapi/signgate-internal-v0.1.openapi.json','utf8')); console.log('OPENAPI_JSON_PARSE=PASS')"
sh -n docs/examples/curl/create-decision.sh
sh -n docs/examples/curl/consume-decision.sh
node --check docs/examples/javascript/create-decision.mjs
python3 -m py_compile docs/examples/python/create_decision.py
```

Validation results:

- PUBLIC_OPENAPI_STATUS=PASS
- INTERNAL_OPENAPI_STATUS=PASS
- EN_DOCS_STATUS=PASS
- ZH_DOCS_STATUS=PASS
- EXAMPLE_VALIDATION_STATUS=PASS
- PUBLIC_INTERNAL_BOUNDARY_STATUS=PASS
- GITBOOK_VALIDATION_STATUS=PASS
- GITBOOK_DRY_RUN_STATUS=PASS

Validation evidence:

- docs/examples/validation/doc-validation-results.json
- docs/examples/validation/doc-validation.txt
- docs/examples/validation/gitbook-dry-run-results.json
- docs/examples/validation/gitbook-dry-run.txt
- docs/examples/validation/openapi-json-parse.txt
- docs/examples/validation/curl-syntax.txt
- docs/examples/validation/javascript-syntax.txt
- docs/examples/validation/python-syntax.txt

## GitBook Status

- GitBook validation: local only
- GitBook dry-run: local only
- GitBook publication: not performed
- GitBook token usage: none
- Production credentials: not used

## Scope Check

APPLICATION_SOURCE_CHANGED=NO

Changed paths are limited to:

- docs/openapi/
- docs/en/
- docs/zh/
- docs/examples/
- tools/gitbook-sync/
- DOC-SG-001_API_DOCUMENTATION_REPORT.md

Forbidden paths were not changed:

- src/
- migrations/
- test/
- package.json
- package-lock.json
- wrangler.jsonc
- existing evidence
- PM artifacts

## Publication Status

PUBLICATION_STATUS=BLOCKED_PENDING_PM_AND_QA

No GitBook publication, main merge, QA approval claim, production availability claim, application behavior change, production credential use, or production deployment was performed.
