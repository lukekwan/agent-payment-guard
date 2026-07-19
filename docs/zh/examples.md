# 程式碼範例

所有範例都從環境變數讀取 credential，並預設使用 placeholder preview host。

```sh
export SIGNGATE_BASE_URL="https://preview.signgate.local"
export SIGNGATE_AGENT_KEY="<decision:create credential>"
export SIGNGATE_EXECUTOR_KEY="<decision:consume credential>"
```

不得提交真實 credential，也不得將 credential 直接寫入範例原始碼。

## curl

- [建立 decision](../examples/curl/create-decision.sh)
- [Consume decision](../examples/curl/consume-decision.sh)

## JavaScript

[查看完整 JavaScript 範例](../examples/javascript/create-decision.mjs)

```sh
node docs/examples/javascript/create-decision.mjs
```

## Python

[查看完整 Python 範例](../examples/python/create_decision.py)

```sh
python3 docs/examples/python/create_decision.py
```

Create 範例會在 HTTP request 失敗或 response decision 不是 `ALLOW` 時停止。Executor 仍必須驗證 bound action，並在 execution 前完成 atomic consume。
