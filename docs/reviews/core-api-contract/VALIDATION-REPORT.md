# Core API contract validation report

TASK_ID=SG-DOCS-003

## Contract fixture validator

Command: node tools/validate-core-api-contract.mjs

```json
{
  "status": "PASS",
  "endpoints": 6,
  "request_scenarios": 36,
  "response_envelopes": 12,
  "curl_blocks": 6,
  "javascript_blocks": 6,
  "python_blocks": 6,
  "failures": []
}
```

## Repository regression

Command: npm test

Result: PASS — 62 tests, 0 failures.

## Documentation integrity

- Local Markdown links: PASS — 104 files checked, 0 broken links.
- Git diff whitespace: PASS.
- Secret patterns: PASS — no sk_live_, ghp_, or private-key header.
- Internal public-route patterns: PASS — none found in the new public/contract corpus.
- Candidate labeling: PASS — 36 CONTRACT_STATUS=PROPOSED_CANDIDATE markers across the 35 service documents and fixture metadata.
- Runtime code changed: false.
- Production OpenAPI changed: false.

## Known non-validation

- Candidate auth scopes and prices are deliberately TBD.
- Agent Payment price is blocked by the verified repository conflict: src registry says $0.15 while README says 0.005 USDC.
- External link probing is limited to the signed-in GitBook UI and public site inspection; no production API request was sent.
- End-to-end Variant publication, sandbox, production Test it, and paid features were not exercised.
