# Sumsub Evidence Services v0

Status: sandbox productization draft

These services package Sumsub sandbox entitlements as normalized SignGate evidence services. They do not create applicants, upload documents, move funds, sign transactions, or claim production compliance.

## Contract

All services share the same outer service metadata:

```json
{
  "id": "sumsub.kyt",
  "provider": "sumsub",
  "entitlement": "KYT",
  "enabled": true,
  "status": "productized_sandbox_v0",
  "normalized_output": "kyt_transaction_evidence.v0",
  "pricing_tier": "risk_evidence",
  "error_model": {
    "unavailable": "SUMSUB_SERVICE_NOT_ENABLED",
    "auth_failed": "SUMSUB_AUTH_FAILED",
    "missing_input": "SUMSUB_REQUIRED_INPUT_MISSING",
    "upstream_error": "SUMSUB_UPSTREAM_ERROR"
  },
  "demo": {
    "mode": "currency_metadata_live_plus_fixture_risk",
    "creates_real_applicant": false,
    "moves_money": false,
    "production_signing": false
  }
}
```

The service catalog is produced by `buildSumsubEvidenceManifest()` from Sumsub `allowedChecks`.

## Services

### 1. `sumsub.case_management`

- Entitlement: `CASE_MANAGEMENT`
- Normalized output: `case_management_evidence.v0`
- Purpose: Compliance-ops review state for elevated-risk agent actions.
- SignGate use: `REQUIRE_APPROVAL` evidence, reviewer workflow evidence, audit escalation context.
- Required input: case ID or linked applicant/transaction reference.
- Pricing tier: `audit_ops`
- Demo: read-only or fixture-first.

### 2. `sumsub.db_net`

- Entitlement: `DB_NET`
- Normalized output: `identity_database_evidence.v0`
- Purpose: Database-backed identity evidence for the principal behind an agent mandate.
- SignGate use: principal verification and mandate authority checks.
- Required input: applicant ID or verified principal reference.
- Pricing tier: `identity_evidence`
- Demo: fixture or applicant-reference based.

### 3. `sumsub.kyt`

- Entitlement: `KYT`
- Normalized output: `kyt_transaction_evidence.v0`
- Purpose: Transaction and counterparty risk evidence before an agent commits value.
- SignGate use: high risk can `DENY`; medium risk can `REQUIRE_APPROVAL`; low risk can support `ALLOW`.
- Required input: transaction ID, transaction intent, or counterparty reference.
- Pricing tier: `risk_evidence`
- Demo: live currency metadata plus fixture risk response.

### 4. `sumsub.payment_method_crypto`

- Entitlement: `PAYMENT_METHOD_CRYPTO`
- Normalized output: `crypto_payment_method_evidence.v0`
- Purpose: Crypto payment method and wallet ownership/risk evidence.
- SignGate use: validate whether a wallet/payment method is acceptable for an agent payment.
- Required input: applicant ID and wallet/payment method reference.
- Pricing tier: `risk_evidence`
- Demo: fixture-first.

### 5. `sumsub.poa`

- Entitlement: `POA`
- Normalized output: `proof_of_address_evidence.v0`
- Purpose: Address/residency evidence for buyer, merchant, or responsible principal.
- SignGate use: jurisdiction, residency, and enterprise onboarding policy gates.
- Required input: applicant ID or verified principal reference.
- Pricing tier: `identity_evidence`
- Demo: fixture or applicant-reference based.

### 6. `sumsub.crystal_crypto_risk`

- Entitlement: `TM_CRYPTO_RISK_SCORING_CRYSTAL`
- Normalized output: `crystal_crypto_risk_evidence.v0`
- Purpose: Crystal-backed crypto risk scoring as a premium transaction evidence source.
- SignGate use: stronger risk score evidence for high-impact crypto transfers.
- Required input: crypto transaction or wallet reference.
- Pricing tier: `premium_risk_evidence`
- Demo: fixture-first.

### 7. `sumsub.travel_rule`

- Entitlement: `TRAVEL_RULE`
- Normalized output: `travel_rule_evidence.v0`
- Purpose: VASP originator/beneficiary compliance evidence for regulated crypto transfers.
- SignGate use: block or escalate agent transfers that lack required Travel Rule evidence.
- Required input: originator, beneficiary, VASP, or transaction reference.
- Pricing tier: `compliance_evidence`
- Demo: fixture-first.

### 8. `sumsub.watchlists`

- Entitlement: `WATCHLISTS`
- Normalized output: `watchlist_aml_evidence.v0`
- Purpose: Sanctions, PEP, watchlist, and adverse-media evidence for counterparties.
- SignGate use: sanctions hit should `DENY`; unresolved AML hit should `REQUIRE_APPROVAL`.
- Required input: applicant ID, merchant principal, or counterparty reference.
- Pricing tier: `aml_evidence`
- Demo: fixture or applicant-reference based.

## Pricing Model

Price the normalized evidence object, not the raw Sumsub endpoint.

- `identity_evidence`: medium
- `risk_evidence`: medium
- `premium_risk_evidence`: premium
- `compliance_evidence`: premium
- `aml_evidence`: premium
- `audit_ops`: enterprise

## Error Handling

All services fail closed.

- Missing entitlement: `SUMSUB_SERVICE_NOT_ENABLED`
- Auth failure: `SUMSUB_AUTH_FAILED`
- Missing input: `SUMSUB_REQUIRED_INPUT_MISSING`
- Upstream failure: `SUMSUB_UPSTREAM_ERROR`

Do not turn missing evidence into `ALLOW`. If evidence is required by policy and cannot be obtained, return `REQUIRE_APPROVAL` or `DENY`.

## Demo Boundaries

Sandbox demos may use:

- live tenant capability discovery
- live verification level discovery
- live KYT metadata discovery
- fixture-based applicant, AML, Travel Rule, POA, and crypto-risk evidence

Sandbox demos must not:

- use production PII
- create real applicants without explicit approval
- upload identity documents
- issue production compliance claims
- move money
- sign transactions
- imply cryptographic Decision Artifact enforcement

