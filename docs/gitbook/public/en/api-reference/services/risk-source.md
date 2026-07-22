# Risk Source API

**Contract status:** Proposed candidate for the normalized Address Risk endpoint; underlying BCS evidence wrappers are separately verified.

Address Risk is the center of this service. Candidate coverage includes address score, labels/entity classification, counterparty exposure, transaction/fund flow, behavioral signals, multi-hop exposure, sanctions/adverse evidence, asset/contract risk, and audit metadata only when verified evidence supports each field.

## First-release endpoint

`POST /v1/risk-source/address-risk` — candidate, not deployed. Authentication, scope, billing, and price remain TBD.

{% hint style="warning" %}
Do not use this candidate path as a live endpoint. Missing evidence is never presented as low risk.
{% endhint %}
