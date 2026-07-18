# SignGate PM Handoff - 2026-07-18

## Current Position

SignGate should be positioned as Nomos Labs' first core product for Agent Policy
and Execution Control. x402 remains supported, but it is a protocol and commerce
use case, not the whole company category or product identity.

Working description:

> SignGate helps teams run AI agents with policy gates, verification loops,
> budgets, audit trails, and human approval before high-impact actions execute.

Chinese shorthand:

> SignGate 不是另一個 AI agent，而是 AI agent 執行前的政策、驗收、預算與人工審核控制層。

Do not claim Nomos Labs is legally cleared. Do not present SignGate as a crypto
company, payment API only, wallet risk API only, KYT API only, or x402 scanner.
Do not claim roadmap capabilities as live.

## What Is Already Done

- Public Nomos Labs X account exists:
  `https://x.com/NomosLabs_ai`.
- Public listing identity was updated from narrow commerce/risk wording to
  `SignGate - Agent Policy & Execution Control`.
- Live discovery surfaces were updated:
  - `/openapi.json`
  - `/.well-known/x402`
  - `/.well-known/service.json`
  - `/.well-known/agent-card.json`
  - `/registry.json`
  - `/workflows.json`
  - `/catalog.json`
  - `/endpoints.txt`
  - runtime x402 `serviceName`
  - `/icon.svg`
- Existing worker name, domain, routes, package names, repo names, prices, and
  x402 support were intentionally kept unchanged.
- x402scan public origin re-registration succeeded through its public endpoint.
- The fetched x402scan server page HTML contained
  `SignGate - Agent Policy & Execution Control` and no
  `Agent Commerce Safety API` match at verification time.
- Contact form is live at
  `https://base-agent-preflight.bytoken2023.workers.dev/signgate#contact`.
- Formspree endpoint is configured through Worker secret:
  `FORMSPREE_ENDPOINT=https://formspree.io/f/xjgnwgzz`.
- Live `/signgate` HTML renders the contact form with that Formspree action and
  `data-enabled="true"`.
- A harmless test Formspree submission returned `ok: true`.

## Current Website Demo Status

There is also a separate website demo currently visible at:

`https://jelsoft-francis-joined-permit.trycloudflare.com/zh`

This appears to be a temporary Cloudflare tunnel / preview URL, not the durable
production domain. PM should treat it as the current website demo state, not a
final production launch.

Observed pages and state:

- Home page `/zh` is live and positions Nomos Labs as autonomous AI agent
  decision, risk, and verification infrastructure.
- The site navigation includes Platform, Agent Assurance, SignGate, x402scan,
  Preflight Demo, Solutions, API Docs, Company, and Contact.
- `/zh/signgate` is live and marks SignGate as `PREVIEW / IN DEVELOPMENT`.
- `/zh/signgate` positions SignGate as the policy and risk decision layer before
  high-impact agent actions.
- `/zh/signgate` already shows decision outcomes:
  - `ALLOW`
  - `REQUIRE_APPROVAL`
  - `DENY`
- `/zh/signgate` includes a current decision contract and planned extension, but
  it also clearly says the formal API deployment is not yet verified.
- `/zh/signgate` lists planned/not deployed endpoints:
  - `POST /v1/agentic-commerce/preflight`
  - `GET /v1/agentic-commerce/preflight/sample`
- `/zh/docs` exists as a developer documentation entrance, but it is not a
  complete API documentation site yet.
- `/zh/docs` currently says GitBook and production API base URL are not set.
- `/zh/docs` lists documentation categories as `文件建置中`, including:
  - Platform Overview
  - Agent Assurance
  - SignGate Decision API
  - x402scan API
  - Policy Model
  - Risk Signals
  - Behavioral Signals
  - Transaction Context
  - Decision Contract
  - Integration Guides
  - Webhooks
  - Security & Verification
  - Changelog

Important PM note: the site already communicates the right broad direction
better than the older x402-only framing, but API docs are still a visible gap.
The docs page currently functions as a placeholder / entry point, not a finished
developer experience.

## Product Thesis

The market is moving from prompt engineering toward harness engineering and loop
engineering. Companies will not only ask "can the model do this?" They will ask
"can we control, verify, audit, and stop the agent before it takes risky
actions?"

SignGate's opportunity is to become the external policy and verification layer
around AI agents. It should sit between an agent and the systems that can cause
real-world consequences: email, social posting, deployment, production data,
payments, API purchases, wallets, signers, CRM, spreadsheets, and internal tools.

The core product promise:

> Agent can request. SignGate decides. Execution happens only when policy allows.

## Initial Service Shape

Start as a managed service plus API demo, not a full dashboard platform.

The managed service offer:

1. Map the customer's AI agent workflow.
2. Identify high-impact actions that need policy control.
3. Define allow, review, and deny rules.
4. Add verification checks and stop conditions.
5. Add audit logging.
6. Provide a simple API or middleware that the customer's agent calls before
   execution.

The first repeatable use cases should be:

- Email and messaging approval before an agent contacts customers.
- Social posting approval before an agent posts to X, LinkedIn, Discord, or
  Telegram.
- Deployment approval before an agent deploys code, changes DNS, edits secrets,
  or changes production routes.
- Payment and x402 approval before an agent buys APIs, pays merchants, triggers
  a signer, or spends from a wallet.
- Data-change approval before an agent edits CRM, Sheets, Notion, or internal
  operational records.

## Core API

The MVP API should be a decision endpoint:

```http
POST /v1/decision
```

Example request:

```json
{
  "agent_id": "sales-agent-01",
  "action_type": "send_email",
  "target": "customer@example.com",
  "intent": "follow up with pricing",
  "draft": "...",
  "cost_usd": 0,
  "risk_level": "medium",
  "context": {}
}
```

Example response:

```json
{
  "decision": "REVIEW",
  "reason": "External email with pricing requires human approval.",
  "required_checks": ["human_approval"],
  "audit_id": "sg_audit_123"
}
```

Decision vocabulary:

- `ALLOW`: the agent may continue.
- `REVIEW`: a human or external checker must approve before execution.
- `DENY`: the action must not execute.

## Policy Templates

Initial policy templates should be simple, readable, and customer-editable later.

### Communications Policy

Controls email, DM, customer replies, and social posts.

Typical checks:

- Is this an external recipient?
- Does the message mention price, legal claims, security claims, or commitments?
- Is it replying as a human or as an agent?
- Does it need founder, PM, legal, or customer success approval?
- Is the account identity verified before posting?

### Deployment Policy

Controls production deploys, route changes, DNS changes, environment secrets,
database migrations, and public website updates.

Typical checks:

- Did tests pass?
- Is the diff small and scoped?
- Are secrets, DNS, or production resources touched?
- Is the deployment reversible?
- Is a human approval required?

### Payment Policy

Controls x402 purchases, API purchases, merchant payments, wallet actions, and
signer directives.

Typical checks:

- Does the agent have a mandate to spend?
- Is the merchant or endpoint acceptable?
- Is price within per-transaction and daily budget?
- Is recipient or signer risk acceptable?
- Is this a new counterparty requiring manual review?

## Verification Loop

SignGate should not let the same worker self-grade its own result. The loop
should separate:

- Worker: proposes an action.
- SignGate: checks policy.
- Checker: validates output against rubric, tests, or external signals.
- Human: approves only when risk or policy requires it.

If verification fails, the system returns a concrete reason and the next action:

- revise draft
- run tests
- reduce scope
- request approval
- stop

## Budget And Stop Conditions

Every loop must have explicit limits:

- max retries
- max wall-clock time
- max model/tool cost
- max external spend
- max failed checks
- escalation threshold

These limits should be enforced by code, not only written in prompts.

## Memory And Audit Trail

Every decision should produce an audit record:

- who/what requested the action
- what action was requested
- what evidence was checked
- what decision was returned
- why it was allowed, reviewed, or denied
- whether a human approved it
- what happened after approval

This becomes both customer compliance evidence and product learning data.

## Website Changes Needed Next

Update the SignGate website so the first viewport no longer feels focused only
on x402 or payment guard.

Recommended hero:

Headline:

> Control AI agent execution before high-impact actions happen.

Subcopy:

> SignGate gives teams policy gates, verification loops, budgets, audit trails,
> and human approval before agents send messages, deploy code, change data, or
> make payments.

Sections to add:

- Use Cases:
  - Email and messaging
  - Social posting
  - Deployment
  - Payment and x402
  - CRM and data changes
- How It Works:
  - Agent requests action
  - SignGate checks policy and evidence
  - Decision returns `ALLOW`, `REVIEW`, or `DENY`
  - Approved actions execute through the customer's existing tool or signer
  - Audit trail is stored
- Contact form field:
  - "Which agent action do you want to control?"
  - Options: Email/messaging, social posting, deployment, payment/x402,
    CRM/Sheets/data changes, other.
- Add public social link:
  - Nomos Labs X: `https://x.com/NomosLabs_ai`

## Near-Term Roadmap

### Phase 1 - Positioning And Lead Capture

- Update landing page positioning.
- Add use-case-oriented contact form field.
- Keep Formspree as lead capture.
- Keep x402 as a visible supported use case below the fold.
- Avoid claiming dashboard or full enterprise integrations are live.
- Align the temporary website demo with the Worker-backed contact form and the
  PM-approved positioning.

### Phase 2 - API Demo

- Add `POST /v1/decision` demo endpoint.
- Implement rule-based decisions for `send_email`, `social_post`, `deploy`, and
  `payment`.
- Return `ALLOW`, `REVIEW`, or `DENY` with reasons and audit IDs.
- Provide sample payloads and curl examples.
- Replace placeholder docs with initial API docs for:
  - authentication / preview access status
  - decision request schema
  - decision response schema
  - example use cases
  - error codes
  - webhook/event model, if included

### Phase 3 - Internal Dogfood

- Use SignGate-style checks for Nomos/OpenClaw actions:
  - publishing X posts
  - verifying active account identity for `https://x.com/NomosLabs_ai`
  - deploying SignGate worker changes
  - sending external messages
  - making x402 or payment-like calls
- Use these as demos and case studies without overclaiming customer adoption.

### Phase 4 - Managed Customer Pilots

- Offer PM-led discovery with early users:
  - what agents they use
  - what tools those agents can access
  - which actions are risky
  - who should approve
  - what logs they need
- Configure one policy template per customer.
- Deliver a lightweight integration guide and decision endpoint.

### Phase 5 - Dashboard

- Only after repeated pilot patterns are clear:
  - policy editor
  - approval queue
  - audit log
  - usage analytics
  - integrations
  - organization/team roles

## Open Questions For PM

- Which first vertical has the strongest pain: sales/customer email, social
  posting, deployment, payments, or data changes?
- Are we selling to AI-native startups, dev teams, compliance/security teams, or
  agencies building agents for clients?
- Should the first offer be "managed setup" priced per pilot, or API usage from
  day one?
- Which integrations matter first: Gmail, Slack/Discord/Telegram, GitHub,
  Cloudflare, Google Sheets, Notion, wallet/signers, or x402 clients?
- What should require human approval by default?
- What audit artifacts would make the product feel trustworthy to a buyer?

## PM Summary

SignGate's immediate path is to stop being framed narrowly as an x402/payment
tool and become the execution control layer for AI agents. x402 remains a useful
commerce protocol and demo case, but the broader product is policy, verification,
budget, approval, and audit before agent actions execute.

The fastest route is to update the website and intake form, then build a small
decision API demo around four actions: email, social posting, deployment, and
payment/x402. Sell early as a managed setup while collecting repeated patterns
for a future dashboard.
