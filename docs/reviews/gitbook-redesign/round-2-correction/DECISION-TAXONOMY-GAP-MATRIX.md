# Decision Taxonomy Gap Matrix

**Constraint:** this analysis does not change or normalize any runtime enum. Mapping is a documentation candidate only.

## Observed decision and directive contracts

| Service | Endpoint / source | Field name | Observed values | Case style | Meaning | Executable or advisory | Requires approval | Retry semantics | Canonical candidate mapping | Breaking-change risk | Current documentation wording |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Payment Guard evaluation | GET/POST `/v1/x402/payment-guard/evaluate`; `buildPaymentGuardDecision` | `decision` | `ALLOW`, `REVIEW`, `BLOCK` | uppercase snake words | Policy result for a proposed payment | Advisory unless separately enforced | `REVIEW` means hold for review | Re-evaluate with fresh evidence/policy; no universal guarantee | ALLOW→allow; REVIEW→review; BLOCK→deny | High if renamed; clients may switch exhaustively | Current GitBook incorrectly implies the candidate three-value model is universal |
| Payment authorization | POST `/v1/payments/authorize`; `buildAgentPaymentAuthorization` | `decision` | `allow`, `review`, `deny` | lowercase | Authorization-layer disposition | Potentially executable only when the caller enforces directive | `review` | Service-specific; do not retry into execution without new authority | direct mapping by meaning | High: casing and field consumers | Not documented in public GitBook |
| Payment authorization | same | `signing_directive` | `sign_with_policy_controlled_key`, `hold_for_human_review`, `do_not_sign` | lowercase snake_case | Instruction to the signer integration | Executable directive, but enforcement is client/system dependent | `hold_for_human_review` | After approval, obtain a fresh authorization unless service contract says otherwise | sign / hold / do-not-sign | High: security-critical control flow | Not documented; must not claim universal production signer control |
| Agent buyer policy kit | GET `/v1/x402/agent/buyer-policy-kit`; package source | `decision` | `ALLOW`, `APPROVAL_REQUIRED`, `DENY` | uppercase snake words | Policy-kit outcome | Advisory policy output | `APPROVAL_REQUIRED` | Re-evaluate after authorized approval or changed context | APPROVAL_REQUIRED→review | Medium/high: SDK/consumer parsing | Current GitBook uses `REQUIRE_APPROVAL`, not this contract |
| Buyer identity preflight | GET `/v1/x402/agent/buyer-identity-preflight` | status/decision fields | includes `APPROVAL_REQUIRED` | uppercase snake words | Buyer/mandate is insufficient for unattended purchase | Advisory evidence | yes | Re-run with corrected mandate/identity/approval context | →review | Medium | Not documented in current GitBook |
| Agentic Commerce Preflight | POST `/v1/agentic-commerce/preflight`; sample GET | `decision` | `ALLOW`, `REQUIRE_APPROVAL`, `DENY` | uppercase snake words | Commerce preflight disposition | Advisory unless caller honors signer directive | `REQUIRE_APPROVAL` | Re-evaluate after approval or evidence change; no consume contract | direct three-way mapping | Medium/high | GitBook uses same labels but wrongly generalizes them to all services |
| Agentic Commerce Preflight | same | `signer_directive` | object including `agent_may_directly_sign` | snake_case fields + boolean | Whether an agent may proceed to a signer without human review | Executable guidance only when integrated and enforced | false generally means do not directly sign; decision supplies reason | Treat absent/false as fail-closed; obtain a new result after approval | boolean contributes to sign/hold mapping | High: boolean misuse can move money | Missing from current GitBook service story |
| MCP evaluate_payment | POST `/mcp`; `evaluate_payment` tool | decision + `signer_directive.agent_may_directly_sign` | expects `ALLOW`, `REQUIRE_APPROVAL`, `DENY`; boolean direct-sign flag | mixed uppercase + snake_case | Tool result for agent frameworks | Advisory; `auto_payment_allowed` only true for explicit ALLOW + direct-sign true | yes for REQUIRE_APPROVAL/false | Fail closed on unknown/missing; call again after context changes | same as agentic preflight | High: automation boundary | Not documented |
| MCP evaluate_payment | same | `auto_payment_allowed` | `true`, `false` | boolean | Derived convenience flag | Executable gate if caller trusts and enforces it | false is non-executable | Never infer true from a noncanonical string | ALLOW + direct-sign true only | High | Not documented |
| deploy_change candidate | POST `/v1/decisions`; candidate OA and `src/signgate-decision.js` | `decision` | `ALLOW`, `REQUIRE_APPROVAL`, `DENY` | uppercase snake words | Candidate decision for one preview action type | Candidate executable authorization only with all preview checks and consume | `REQUIRE_APPROVAL` | Idempotency/action-binding specific to candidate contract | direct three-way mapping | High: not production/canonical | Overrepresented as platform-wide canonical model |
| deploy_change candidate | create/consume candidate | `execution_directive.action` | `EXECUTE`, `DO_NOT_EXECUTE` | uppercase snake words | Candidate executor instruction | Executable only within candidate contract and successful consume requirements | DO_NOT_EXECUTE covers approval/deny/nonallow states | Client must follow candidate idempotency and consume rules | execute / do-not-execute | High | Documented as if generally available |
| Evidence products | multiple x402 GETs | `decision_hint`, `decision_support`, risk/assessment fields | service-specific values, often allow/review/block-like hints | mixed | Evidence/advice for a caller-owned policy | Advisory | service-specific | Refresh when evidence becomes stale | evidence only; do not coerce silently | Medium | Mostly absent from GitBook |

## Explicit enum vocabulary coverage

The inventory above covers `ALLOW`, `REVIEW`, `BLOCK`, `DENY`, `REQUIRE_APPROVAL`, `APPROVAL_REQUIRED`, lowercase `allow`, `review`, `deny`, `signer_directive`, `execution_directive`, `agent_may_directly_sign`, `hold_for_human_review`, `do_not_sign`, and `sign_with_policy_controlled_key`. Similar spelling does not establish identical semantics.

## Exactly three PM decision strategies

### Strategy A — preserve service-local enums and document boundaries

- **Approach:** publish each service's values, case, retry behavior, and executable/advisory meaning exactly as implemented. Add no universal response promise.
- **Benefits:** no runtime breaking change; fastest truthful correction; lowest implementation risk.
- **Costs:** integrators handle multiple enums; cross-service examples require adapters; higher documentation burden.
- **Best fit now:** safest immediate documentation strategy while public authority and service contracts remain mixed.

### Strategy B — canonical decision envelope plus compatibility fields

- **Approach:** introduce a versioned envelope such as canonical `allow | review | deny`, retain every existing service field as a compatibility field, and specify a non-lossy mapping with `source_service` and `source_value`.
- **Benefits:** one integration surface without deleting legacy meaning; supports gradual migration and shared SDK helpers.
- **Costs:** envelope design and mapping governance; ambiguous values must not be flattened; response size/complexity; requires implementation and contract work not authorized in this round.
- **Risk:** medium/high unless every directive, approval and retry semantic is represented.

### Strategy C — unify in the next major version

- **Approach:** design a single enum/directive model for v2, provide migration adapters, and deprecate service-local values on an announced schedule.
- **Benefits:** cleanest long-term developer model and generated documentation.
- **Costs:** highest coordination and breaking-change risk; versioning, dual-run period, SDK migrations and customer communication required.
- **Risk:** high; cannot be treated as a docs-only change.

## Recommendation pending PM

Use **Strategy A** for any near-term correction because it is the only option that does not alter contracts. PM should separately decide whether B or C is the product direction. Until that decision, homepage wording must say that services return service-specific allow/review/approval/deny-style outcomes and directives; it must not declare one platform-wide enum.
