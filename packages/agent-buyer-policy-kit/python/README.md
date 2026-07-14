# signgate-agent-buyer-policy-kit

Python evaluator for the SignGate Agent Buyer Policy Kit.

It mirrors the JavaScript package and returns `ALLOW`, `DENY`, or
`APPROVAL_REQUIRED` before an AI agent buys an x402 API, dataset, or tool.

## Usage

```python
from signgate_agent_buyer_policy_kit import evaluate_agent_buyer_preflight

result = evaluate_agent_buyer_preflight({
    "agent_role": "research_agent",
    "product_category": "wallet_risk",
    "purpose": "security_research",
    "price_usdc": "0.005",
})

print(result["decision"])  # ALLOW
```

## Test

```sh
python -m unittest discover -s tests
```
