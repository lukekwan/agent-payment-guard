# Risk Source API: request schemas

CONTRACT_STATUS=PROPOSED_CANDIDATE

## POST /v1/risk-source/address-risk

- Purpose: Evaluate one chain address with optional behavioral and multi-hop evidence.
- Availability: Candidate; not deployed
- Authentication / required scope: TBD; no scope asserted
- Billing / price: TBD; no approved price
- Headers: Accept application/json; POST also requires Content-Type application/json. x402 routes use payment challenge/proof headers. Candidate Authorization is TBD.
- Parameters and body: JSON body: chain required enum ethereum|tron|bitcoin; address required chain-valid string 1–128; options optional object; include_behavioral_signals boolean default false; include_multi_hop_exposure boolean default false; max_hops integer 1–5 default 2. Reject unknown fields and nulls in candidate.
- Idempotency: read-only evaluation. Repeats can return fresher evidence and may be separately billed. No storage-level idempotency is claimed; candidate Idempotency-Key requires approval.
- Time: query_time is SignGate completion; data_time is authoritative evidence time only when supplied; latency_ms measures request receipt to response completion.
- Evidence/mandate: optional opaque references only; never fabricate evidence_id or mandate authority.
- Security: Omit fields unavailable from sources. Score 0–10; LOW 0–2.9, MODERATE 3–5.9, HIGH 6–7.9, SEVERE 8–10. Reliability taxonomy and rule authority require approval.
