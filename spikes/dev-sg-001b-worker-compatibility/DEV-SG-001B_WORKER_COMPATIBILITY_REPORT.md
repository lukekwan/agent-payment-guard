# DEV-SG-001B Worker Compatibility Harness Report

TASK_ID=DEV-SG-001

Harness: DEV-SG-001B_WORKER_COMPATIBILITY

Status: PASS

Recorded at: 2026-07-18T23:35:19+08:00

Repository: `lukekwan/agent-payment-guard`

Branch: `dev/sg-001-deploy-change-decision`

Harness path:

`spikes/dev-sg-001b-worker-compatibility/`

Compatibility date:

`2026-07-18`

## Isolation

This harness has isolated package metadata and does not modify the product
`package.json`, product `package-lock.json`, production application source,
production migrations, Worker routes, product deployment configuration,
production secrets, or production infrastructure.

## Versions

```text
Node v24.15.0
npm 11.12.1
Wrangler 4.112.0
Miniflare 4.20260714.0
@humanwhocodes/momoa 3.3.10
canonicalize 3.0.0
esbuild 0.28.1
```

## Package / Lock Hashes

```text
32d356730708688b7a47242d9c182fefd26fe276cca20346eba4051144a56266  package.json
18752feded5ea6b2653448415d56ccf24f79a8cbf18573eaa558ca5e01a0d72f  package-lock.json
9fc3068562aa20c1bbe010cc4d45e751582a8bc1deea6b659156d5b01143cd91  worker.mjs
f2d3035c9325c9ef49144d9adaf717458dee29194b037d21bc99733691a2760b  test-runner.mjs
0d2ccd9f2fc96ac72a0f828e445f98768bd08a6f1e1a53becc17de3ca50d6062  dist/worker.bundle.mjs
a12a9f39176b3478418a1587219fd11cb0ddd2ea61af1d6386fec6c6bd97c2d7  evidence/worker-compatibility-results.json
```

## Required Results

| Requirement | Result |
|---|---|
| Both packages bundle and execute | PASS |
| Momoa strict JSON mode rejects comments | PASS |
| Trailing commas are rejected | PASS |
| Ordinary duplicate keys are detected before evaluation | PASS |
| Escaped-equivalent duplicate keys are detected before evaluation | PASS |
| Nested duplicate keys are detected | PASS |
| Duplicate keys in objects inside arrays are detected | PASS |
| Malformed escapes are rejected | PASS |
| Unsupported numeric forms are rejected | PASS |
| Configured resource bounds are enforced | PASS |
| Unknown fields are rejected before fingerprinting | PASS |
| `canonicalize@3.0.0` output matches RFC 8785 golden bytes | PASS |
| Web Crypto SHA-256 produces expected lowercase digest | PASS |
| Every `deploy_change` field participates in fingerprint | PASS |
| Unicode, arrays, omission/null and case vectors pass | PASS |

## Evidence

- `evidence/npm-test.txt`
- `evidence/versions-and-hashes.txt`
- `evidence/worker-compatibility-results.json`
- `dist/worker.bundle.mjs`

## Gate Proposal

WORKER_COMPATIBILITY_HARNESS=PASS

DEV_SG_001B_BASELINE_GATE=PROPOSED_PASS_PENDING_PM_ACKNOWLEDGEMENT

FULL_APPLICATION_IMPLEMENTATION_STATUS=BLOCKED

PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED

## Final Evidence Correction

Correction status: PROPOSED_PASS_PENDING_PM_ACKNOWLEDGEMENT

Recorded at: 2026-07-19T00:16:39+08:00

Corrected evidence:

- `evidence/npm-test-correction.txt`
- `evidence/worker-compatibility-results-correction.json`
- `evidence/versions-and-hashes-correction.txt`

Corrections added:

- UTF-8 byte-length enforcement for all byte-declared limits.
- Boundary tests at limit - 1, exact limit, and limit + 1 for raw bytes,
  nesting depth, object members, array length, generic string bytes,
  changed-path item bytes, and intent bytes.
- Multibyte UTF-8 cases where code-unit length differs from byte length.
- RFC 8785 canonical-byte and SHA-256 vectors for numeric boundaries,
  integer/decimal normalization, exponent formatting, negative zero, Unicode
  escaping, control characters, non-ASCII Unicode, key ordering, and the full
  SignGate `deploy_change` fingerprint envelope.
- Fingerprint semantics for Unicode mutation, semantically significant array
  ordering, set-normalized changed paths/routes, omitted optional field versus
  present field, schema-invalid null rejection, explicit no-null policy, enum
  case sensitivity, identifier case sensitivity, changed-path normalization,
  changed-route normalization, and every execution-relevant field mutation.

Correction result:

RESOURCE_BOUND_RESULTS=PASS

RFC8785_VECTOR_RESULTS=PASS

FINGERPRINT_SEMANTIC_RESULTS=PASS

WORKER_COMPATIBILITY_HARNESS=PROPOSED_PASS_PENDING_PM_ACKNOWLEDGEMENT

DEV_SG_001B_BASELINE_GATE=PROPOSED_PASS_PENDING_PM_ACKNOWLEDGEMENT
