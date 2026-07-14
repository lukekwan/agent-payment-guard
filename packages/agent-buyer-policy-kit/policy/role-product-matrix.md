# Role x Product Category Matrix

Default starter policy for x402 agent buyer identity preflight.

Legend:

- `ALLOW`: role can buy this product category by default.
- `APPROVAL_REQUIRED`: role needs human, owner, or policy-controller approval.
- `DENY`: role should not buy this product category.

| Role | wallet_risk | token_risk | market_intelligence | invoice_verification | payment_execution | api_security | production_deploy | customer_pii |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| research_agent | ALLOW | ALLOW | ALLOW | APPROVAL_REQUIRED | APPROVAL_REQUIRED | ALLOW | APPROVAL_REQUIRED | DENY |
| writer_agent | APPROVAL_REQUIRED | APPROVAL_REQUIRED | APPROVAL_REQUIRED | DENY | DENY | APPROVAL_REQUIRED | DENY | DENY |
| accounting_agent | APPROVAL_REQUIRED | DENY | DENY | ALLOW | APPROVAL_REQUIRED | APPROVAL_REQUIRED | DENY | APPROVAL_REQUIRED |
| finance_agent | APPROVAL_REQUIRED | APPROVAL_REQUIRED | APPROVAL_REQUIRED | ALLOW | APPROVAL_REQUIRED | APPROVAL_REQUIRED | DENY | APPROVAL_REQUIRED |
| operator_agent | APPROVAL_REQUIRED | APPROVAL_REQUIRED | APPROVAL_REQUIRED | APPROVAL_REQUIRED | APPROVAL_REQUIRED | ALLOW | APPROVAL_REQUIRED | DENY |

Design intent:

- Writer agents should not silently buy wallet, token, or risk datasets.
- Accounting agents should buy invoice/vendor data, not unrelated market
  intelligence.
- Finance agents can handle financial context, but payment execution remains
  approval-gated.
- Operator agents can buy API/security checks, but production deploys need
  approval.
- Restricted customer data is denied by default in the starter policy.
