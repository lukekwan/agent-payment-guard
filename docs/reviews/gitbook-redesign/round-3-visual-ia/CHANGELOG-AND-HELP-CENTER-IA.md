# Changelog and Help Center Information Architecture

## Changelog

### Entry schema

| Field | Required | Rule |
| --- | --- | --- |
| Date | yes | Publication date in ISO form; separate effective date below |
| Type | yes | Exactly one primary: `added`, `changed`, `deprecated`, `fixed`, `security` |
| Title | yes | User-visible outcome, not internal ticket name |
| Summary | yes | What changed and why it matters |
| Affected endpoints | yes | Exact method/path list, `none` for portal-only entries |
| Breaking change | yes | `yes` or `no`; explain compatibility impact |
| Migration action | yes | Concrete developer action or `none` |
| Effective date | yes | Date/time or `not yet scheduled` |
| Environment | yes | sample, sandbox, production, docs, SDK/MCP as applicable |
| Source/version | yes | Approved contract/release reference |

### Navigation

```text
Changelog
  All updates
  API
  SDK & MCP
  Sandbox / production
  Security
  Deprecations
  Archive by year
```

Filters must not hide breaking/security/deprecation entries by default. Each endpoint page links to filtered history. Deprecations state replacement, first notice, sunset date, and expected response/header behavior. A docs-only proposal does not appear as a production API change.

Internal documentation events—including inventory baselines, navigation proposals, and validation-claim corrections—never appear in the customer Changelog. The local screenshot uses explicitly labeled illustrative external product changes only: endpoint added, price changed, and SDK deprecation.

### Visual treatment

Use a vertical date timeline on desktop and a single-column list on mobile. Type badges use semantic tokens: added teal; changed amber; deprecated/danger red; fixed neutral blue-gray; security red with explicit text. Color is never the only differentiator.

## Help Center

### Required destinations

1. Getting started checklist
2. What can I query?
3. API key management
4. Authentication and authorization
5. Sandbox and production
6. Decision interpretation
7. Rate limits
8. Pricing / credits / x402
9. Common errors
10. Integration troubleshooting
11. Contact support

The first viewport must also expose SignGate-specific questions:

- Why did SignGate return `REQUIRE_APPROVAL`?
- What does `signer_directive` mean?
- Can an `ALLOW` decision be reused?
- What happens when evidence expires?
- Why was a payment denied or blocked?
- How does x402 billing work?
- How do I verify a decision before execution?

### Article template

```text
Question / task title
Short answer
Applies to (service, SDK, environment, version)
Checklist or steps
Examples
Known limitations
Related reference/guides
Escalation criteria
Contact payload (request_id, environment, endpoint, status, timestamp)
```

Support guidance must tell users never to send API keys, private keys, payment secrets, authorization headers or full sensitive payloads. A support bundle contains redacted request metadata and the exact `request_id`.

### Search and taxonomy

Help search is scoped to help content, with aliases for `402`, x402, key/token, approval/review, sandbox, signer, MCP and SDK. Articles declare service/environment tags but avoid duplicating API reference. Broken contract or runtime behavior escalates to status/changelog rather than being hidden in an FAQ.

## Ownership

| Surface | Owner | Review |
| --- | --- | --- |
| Changelog API facts | Developer + PM | QA validates source/release/effective date |
| Breaking/deprecation wording | PM | Reviewer approves migration/sunset claim |
| Security entries | Security/Reviewer | PM + Founder publication gate as required |
| Help technical answer | Docs | Developer/QA verifies against current contract |
| Billing/x402 help | PM/Operations | Reviewer checks price/payment risk |
| Contact workflow | Support owner | Security checks redaction |
