# Code examples

All examples use environment variables for credentials and default to the placeholder preview host.

```sh
export SIGNGATE_BASE_URL="https://preview.signgate.local"
export SIGNGATE_AGENT_KEY="<decision:create credential>"
export SIGNGATE_EXECUTOR_KEY="<decision:consume credential>"
```

Never commit real credentials or place them directly in example source.

## curl

- [Create a decision](../examples/curl/create-decision.sh)
- [Consume a decision](../examples/curl/consume-decision.sh)

```sh
sh docs/examples/curl/create-decision.sh
```

For consume, also set the decision ID, action fingerprint, policy version, and a stable execution-attempt ID from the validated `ALLOW` flow.

## JavaScript

[View the complete JavaScript example](../examples/javascript/create-decision.mjs).

```sh
node docs/examples/javascript/create-decision.mjs
```

## Python

[View the complete Python example](../examples/python/create_decision.py).

```sh
python3 docs/examples/python/create_decision.py
```

The create examples deliberately stop unless the HTTP request succeeds and the response decision is `ALLOW`. The executor must still validate the bound action and complete atomic consume before execution.
