# Merchant & x402 Trust: examples

CONTRACT_STATUS=PROPOSED_CANDIDATE

All hosts use example.invalid. No secret, payment proof, internal route, or live production request is included.

## GET /v1/x402/base/merchant-trust

The validated fixture set includes exactly: (1) minimal valid, (2) complete valid, (3) invalid, (4) authentication failure, (5) billing failure, and (6) stale/unavailable evidence. Candidate auth/billing failures remain labelled TBD rather than invented.

### cURL

```bash
curl --fail-with-body -X GET 'https://api.example.invalid/v1/x402/base/merchant-trust'
```

### JavaScript / TypeScript

```js
const response = await fetch("https://api.example.invalid/v1/x402/base/merchant-trust", { method: "GET" });
if (!response.ok) throw new Error(`HTTP ${response.status}`);
console.log(await response.json());
```

### Python

```python
from urllib.request import Request, urlopen
request = Request("https://api.example.invalid/v1/x402/base/merchant-trust", method="GET")
with urlopen(request, timeout=10) as response:
    print(response.read().decode("utf-8"))
```

These are non-live syntax samples. See ../contract-fixtures.json for full request/response cases.

## GET /v1/x402/web/endpoint-preflight

The validated fixture set includes exactly: (1) minimal valid, (2) complete valid, (3) invalid, (4) authentication failure, (5) billing failure, and (6) stale/unavailable evidence. Candidate auth/billing failures remain labelled TBD rather than invented.

### cURL

```bash
curl --fail-with-body -X GET 'https://api.example.invalid/v1/x402/web/endpoint-preflight'
```

### JavaScript / TypeScript

```js
const response = await fetch("https://api.example.invalid/v1/x402/web/endpoint-preflight", { method: "GET" });
if (!response.ok) throw new Error(`HTTP ${response.status}`);
console.log(await response.json());
```

### Python

```python
from urllib.request import Request, urlopen
request = Request("https://api.example.invalid/v1/x402/web/endpoint-preflight", method="GET")
with urlopen(request, timeout=10) as response:
    print(response.read().decode("utf-8"))
```

These are non-live syntax samples. See ../contract-fixtures.json for full request/response cases.
