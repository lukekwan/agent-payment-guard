# agent-payment-guard

Python client for the hosted Agent Payment Guard x402 service.

```sh
pip install agent-payment-guard
```

```python
from payment_guard import PaymentGuardClient

guard = PaymentGuardClient(
    "https://base-agent-preflight.bytoken2023.workers.dev",
    paid_transport=paid_transport,  # Your x402-capable transport.
    profile_id="profile-id",
    agent_token="agent-token",
)

decision = guard.evaluate(
    url="https://merchant.example/resource",
    session_id="agent-run-42",
    request_id="request-42",
    tool_id="research-agent",
    purpose="market-data",
)
```

The SDK uses only Python's standard library and never stores wallet keys.
