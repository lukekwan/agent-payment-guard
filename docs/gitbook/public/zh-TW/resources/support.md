---
description: 準備安全且可採取行動的 integration support request。
---

# Support 與 contact

提供 identifiers 與 symptoms，但不要傳送 API keys、raw secrets 或 prohibited action content。

{% hint style="info" %}
**Primary constraint:** Support 不能 override decision 或授權 execution。
{% endhint %}

## 應包含

- UTC timestamp
- Preview environment identifier
- HTTP status
- Request ID
- Available decision 與 audit IDs
- Reason codes
- Redacted client 與 executor logs

## 不得包含

Authorization headers、API keys、private keys、tokens、environment files、raw secret values 或完整 sensitive payloads。

## Contact

使用與 preview access 關聯的 authorized Nomos Labs integration support channel。

## Request access

若要申請 preview access，請提供公司名稱、integration use case、預期的 Agent action types、目標環境，以及 Agent 是否會接觸 payments、production data、credentials、permissions 或 external services。

Email: [hello@nomos-labs.xyz](mailto:hello@nomos-labs.xyz)

## Contact us

如需 partnership、integration review 或 developer documentation 支援，請簡短說明 Agent 需要執行什麼、會接觸哪些系統，以及哪個 execution boundary 需要 review。

Email: [hello@nomos-labs.xyz](mailto:hello@nomos-labs.xyz)
