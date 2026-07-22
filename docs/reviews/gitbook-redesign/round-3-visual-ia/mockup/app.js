const params = new URLSearchParams(location.search);
const page = params.get("page") || "home";
const lang = params.get("lang") === "zh" ? "zh" : "en";
const theme = params.get("theme") || "dark";
document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
document.documentElement.dataset.theme = theme;

const copy = {
  en: {
    nav: ["Home", "Documentation", "API Reference", "Changelog", "Help Center"],
    locale: "EN", support: "Support",
    eyebrow: "Policy · evidence · signer control",
    hero: "Decide before agents pay, purchase, or sign.",
    lede: "Evaluate policy, mandate, evidence, counterparty risk, and signer requirements before an AI agent moves money or exercises delegated authority.",
    start: "Start with a safe sample", explore: "Explore API Reference",
    availability: "Sample available · sandbox key issuance and sandbox Base URL remain unavailable",
    serviceEyebrow: "Core API services", serviceTitle: "Start with the control surface that matches your integration.",
    serviceText: "Four first-release outcomes. Availability, authentication, and billing stay explicit.",
    sampleEyebrow: "Safe sample", sampleTitle: "Inspect a response without sending a live request.",
    quickEyebrow: "Five-minute quickstart", quickTitle: "Move from a safe sample to the right production path.",
    quickText: "The current flow does not pretend a sandbox credential or isolated endpoint exists.",
    docsEyebrow: "Documentation", docsTitle: "Build a safe SignGate integration",
    docsLede: "Begin with the free sample, inspect the exact service response, then select a reviewed production integration path.",
    apiEyebrow: "Agent Payment Control", apiTitle: "Evaluate payment risk before execution",
    apiLede: "Return policy and risk evidence for an agent payment request. This paid production operation is read-only, but automatic browser payment remains disabled.",
    changeEyebrow: "Changelog", changeTitle: "Product and API changes",
    changeLede: "Customer-facing release history only. Internal documentation work never appears as a product change.",
    helpEyebrow: "Help Center", helpTitle: "Resolve a SignGate integration question",
    helpLede: "Search decision semantics, signer directives, evidence expiry, x402 billing, authentication, and integration failures."
  },
  zh: {
    nav: ["首頁", "文件", "API 參考", "變更記錄", "幫助中心"],
    locale: "繁中", support: "支援",
    eyebrow: "政策 · 證據 · 簽署控制",
    hero: "在價值移動前，\n先決定 AI Agent 能不能執行。",
    lede: "在 AI Agent 移動資金或行使授權前，先評估政策、Mandate、證據、交易對手風險與 signer 要求。",
    start: "從安全範例開始", explore: "瀏覽 API 參考",
    availability: "安全範例可用 · sandbox API key 與 Base URL 尚未提供",
    serviceEyebrow: "核心 API 服務", serviceTitle: "依整合情境選擇正確的控制入口。",
    serviceText: "首頁只呈現四個第一版服務，並明確標示 availability、authentication 與 billing。",
    sampleEyebrow: "安全範例", sampleTitle: "不發出 live request，也能先理解回應。",
    quickEyebrow: "五分鐘快速開始", quickTitle: "從安全範例走向正確的 production 整合路徑。",
    quickText: "目前流程不會假裝已經有 sandbox credential 或獨立 endpoint。",
    docsEyebrow: "文件", docsTitle: "建立安全的 SignGate 整合",
    docsLede: "先使用免費 sample、檢查服務回應，再選擇經審查的 production 整合路徑。",
    apiEyebrow: "Agent Payment Control", apiTitle: "執行前先評估付款風險",
    apiLede: "回傳代理付款的政策與風險證據；此 production 操作為付費 read-only，瀏覽器自動付款維持停用。",
    changeEyebrow: "變更記錄", changeTitle: "產品與 API 變更",
    changeLede: "只呈現客戶可見的產品更新；內部文件專案不會冒充 product change。",
    helpEyebrow: "幫助中心", helpTitle: "解決 SignGate 整合問題",
    helpLede: "查找 decision 語義、signer directive、證據效期、x402 計費、認證與整合錯誤。"
  }
};
const t = copy[lang];

document.querySelectorAll(".topnav a").forEach((a, i) => {
  a.textContent = t.nav[i];
  a.href = `?page=${a.dataset.page}&lang=${lang}&theme=${theme}`;
  a.classList.toggle("active", a.dataset.page === page || (page === "endpoint" && a.dataset.page === "api"));
});
document.querySelectorAll("[data-page]").forEach(a => a.href = `?page=${a.dataset.page}&lang=${lang}&theme=${theme}`);
document.querySelector(".support-button").textContent = t.support;
document.querySelector(".search-button span:nth-child(2)").textContent = lang === "zh" ? "搜尋文件" : "Search docs";
document.getElementById("localeButton").textContent = t.locale;
document.getElementById("localeButton").onclick = () => location.search = `?page=${page}&lang=${lang === "en" ? "zh" : "en"}&theme=${theme}`;

const services = lang === "zh" ? [
  ["PC", "Agent Payment Control", "代理付款前先評估政策、Mandate 與風險。", "Production · x402", "Explore reference"],
  ["AC", "Agentic Commerce", "購買前檢查買方、商家、Mandate 與情境。", "Safe sample", "View safe sample"],
  ["AS", "Approval & Signer Control", "理解 approval 與 signer directive，不暗示已強制執行。", "Guidance only", "Understand directives"],
  ["XT", "Merchant & x402 Trust", "購買前檢查 merchant、origin、server 與 resource。", "Production · x402", "Explore trust APIs"]
] : [
  ["PC", "Agent Payment Control", "Evaluate policy, mandate, and risk before an agent pays.", "Production · x402", "Explore reference"],
  ["AC", "Agentic Commerce", "Check buyer, merchant, mandate, and purchase context.", "Safe sample", "View safe sample"],
  ["AS", "Approval & Signer Control", "Interpret approval and signer directives without implying enforcement.", "Guidance only", "Understand directives"],
  ["XT", "Merchant & x402 Trust", "Inspect merchants, origins, servers, and paid resources.", "Production · x402", "Explore trust APIs"]
];

const sideDocs = lang === "zh" ? {
  "開始使用": ["服務概觀", "五分鐘快速開始", "認證與 API key", "環境與 Base URL"],
  "核心概念": ["回應格式", "Decision model", "Mandate", "Evidence", "Approval", "Signer directive", "錯誤處理", "Rate limits", "Pricing / usage"],
  "整合指南": ["Agent payment", "API purchase / x402", "Signer execution", "Human approval", "JavaScript / Python SDK", "MCP 整合"]
} : {
  "GET STARTED": ["Service overview", "Five-minute quickstart", "Authentication & API keys", "Environments & Base URLs"],
  "CORE CONCEPTS": ["Response format", "Decision model", "Mandate", "Evidence", "Approval", "Signer directive", "Error handling", "Rate limits", "Pricing & usage"],
  "INTEGRATION GUIDES": ["Agent payment", "API purchase / x402", "Signer execution", "Human approval", "JavaScript & Python SDKs", "MCP integration"]
};
const sideApi = ["Agent Payment Control", "Agentic Commerce", "Approval & Signer Control", "Merchant & x402 Trust", "Wallet & Transaction Evidence", "Agent / API Supply Chain", "System & Audit", "Models", "Download OpenAPI spec"];

function serviceCards() {
  return services.map((s, i) => `<article class="service-card">
    <div class="card-head"><div class="card-icon">${s[0]}</div><span class="availability-badge ${i === 1 ? "sample" : i === 2 ? "restricted" : ""}">${s[3]}</span></div>
    <h3>${s[1]}</h3><p>${s[2]}</p><div class="service-facts"><span>${i === 1 ? "Free · no auth" : i === 2 ? "Service-dependent" : "Paid · read-only"}</span><span>${s[4]} <i class="arrow"></i></span></div>
  </article>`).join("");
}

function samplePanel() {
  return `<div class="sample-shell">
    <div class="sample-intro"><div class="sample-alert"><strong>SAMPLE RESPONSE</strong><b>NO LIVE REQUEST SENT</b></div><h3>${t.sampleTitle}</h3><p>Endpoint: <code>GET /v1/agentic-commerce/preflight/sample</code></p><div class="sample-meta"><span>environment=sample</span><span>HTTP 200 example</span><span>request_id: not returned</span></div><p class="sample-disclaimer">This captured fixture does not verify live AP2, x402, KYT, or chain state. It is not a sandbox response.</p></div>
    <div class="terminal-card"><div class="terminal-head"><span>sample-response.json</span><button>Copy</button></div><div class="terminal-tabs"><span class="active">Response</span><span>Request</span><span>cURL</span></div><pre class="terminal-code">{
  <span class="dim">"decision"</span>: <span class="green">"REQUIRE_APPROVAL"</span>,
  <span class="dim">"decision_id"</span>: <span class="cyan">"dec_sample"</span>,
  <span class="dim">"signer_directive"</span>: {
    <span class="dim">"required"</span>: <span class="amber">true</span>,
    <span class="dim">"agent_may_directly_sign"</span>: <span class="amber">false</span>
  }
}
<span class="result-row"><b>SAFE STOP</b> Approval required before execution</span></pre></div>
  </div>`;
}

function quickstart() {
  const steps = lang === "zh" ? ["選擇安全範例", "設定 sample Base URL", "送出 sample request", "檢查 response", "選擇 production 整合路徑"] : ["Choose a safe sample", "Set the sample Base URL", "Send the sample request", "Inspect the response", "Select the production integration path"];
  return `<div class="quickstart-shell"><div class="steps">${steps.map((x, i) => `<div class="step ${i === 0 ? "active" : ""}"><div class="step-number">${i + 1}</div><div><h4>${x}</h4><p>${i < 4 ? "Safe sample · no credential" : "Sandbox comes later"}</p></div></div>`).join("")}</div><div><div class="code-panel"><div class="code-tabs"><span class="active">cURL</span><span>JavaScript</span><span>Python</span><button>Copy</button><small>sample · no credential</small></div><pre class="code-block"><span class="comment"># Safe documentation sample — not sandbox</span>
SIGNGATE_SAMPLE_URL=<span class="string">"https://api.nomoslabs.io"</span>
curl <span class="string">"$SIGNGATE_SAMPLE_URL/v1/agentic-commerce/preflight/sample"</span> \\
  --header <span class="string">"Accept: application/json"</span>

<span class="comment"># Read the service-local decision and fail closed.</span></pre></div><div class="gap-callout"><strong>Sandbox comes later</strong><span>No sandbox key issuance or isolated sandbox Base URL is verified. Production Test it remains disabled.</span></div></div></div>`;
}

function home() {
  return `<main class="page home"><section class="hero"><div><div class="eyebrow">${t.eyebrow}</div><h1>${t.hero.replace("\n", "<br>")}</h1><p class="lede">${t.lede}</p><div class="hero-actions"><a class="button-primary" data-page="docs">${t.start}<i class="arrow"></i></a><a class="button-secondary" data-page="api">${t.explore}<i class="arrow"></i></a></div><div class="availability-note"><span class="dot"></span>${t.availability}</div></div></section>
  <section class="section-wrap service-section"><div class="section-heading"><div class="eyebrow">${t.serviceEyebrow}</div><h2>${t.serviceTitle}</h2><p>${t.serviceText}</p></div><div class="service-grid">${serviceCards()}</div></section>
  <section class="section-wrap section-border"><div class="section-heading"><div class="eyebrow">${t.sampleEyebrow}</div><h2>${t.sampleTitle}</h2></div>${samplePanel()}</section>
  <section class="section-wrap section-border"><div class="section-heading"><div class="eyebrow">${t.quickEyebrow}</div><h2>${t.quickTitle}</h2><p>${t.quickText}</p></div>${quickstart()}</section>
  <section class="section-wrap section-border"><div class="section-heading"><div class="eyebrow">Decision outcomes</div><h2>Use the exact service contract, then fail closed.</h2></div><div class="outcome-grid"><article class="outcome allow"><span class="tag">ALLOW</span><h3>Continue only when every control permits</h3><p>Validate expiry, evidence, mandate, and signer conditions.</p></article><article class="outcome review"><span class="tag">REQUIRE_APPROVAL</span><h3>Pause the economic action</h3><p>Obtain authorized approval and refresh the evaluation when required.</p></article><article class="outcome deny"><span class="tag">DENY / BLOCK</span><h3>Do not proceed</h3><p>Unknown, malformed, expired, or blocked results fail closed.</p></article></div></section>
  <section class="section-wrap section-border"><div class="resource-row"><article class="resource-card"><h3>SDK & MCP</h3><p>Production-restricted until package, version, auth, and route authority are approved.</p></article><article class="resource-card"><h3>Changelog</h3><p>Product releases, breaking changes, and migrations.</p></article><article class="resource-card"><h3>Help Center</h3><p>Decision, signer, evidence, billing, and error guidance.</p></article><article class="resource-card secondary"><h3>Contact support</h3><p>Secondary action. Never send private keys or payment secrets.</p></article></div></section></main>`;
}

function sidebar(kind) {
  if (kind === "api") return `<aside class="sidebar"><div class="side-label">SERVICE FAMILIES</div>${sideApi.map((x, i) => `<div class="side-link ${i === 0 ? "active" : ""}"><span>${x}</span>${i < 8 ? '<i class="chevron"></i>' : ""}</div>`).join("")}</aside>`;
  if (kind === "change") return `<aside class="sidebar"><div class="side-label">CHANGELOG</div>${["All product updates", "API", "SDK & MCP", "Sandbox / production", "Security", "Deprecations"].map((x, i) => `<div class="side-link ${i === 0 ? "active" : ""}">${x}</div>`).join("")}</aside>`;
  if (kind === "help") return `<aside class="sidebar"><div class="side-label">HELP CENTER</div>${["Overview", "Getting started", "Keys & authentication", "Sandbox & production", "Decision interpretation", "Signer directives", "Evidence & expiry", "Pricing & x402", "Errors", "Troubleshooting", "Contact support"].map((x, i) => `<div class="side-link ${i === 0 ? "active" : ""}">${x}</div>`).join("")}</aside>`;
  return `<aside class="sidebar">${Object.entries(sideDocs).map(([group, items]) => `<div class="side-label">${group}</div>${items.map(x => `<div class="side-link ${x.includes("quick") || x.includes("快速") ? "active" : ""}">${x}</div>`).join("")}`).join("")}</aside>`;
}

function portalContent(kind, inner, toc = ["Overview", "Prerequisites", "Request", "Response", "Next steps"]) {
  return `<main class="page portal-layout">${sidebar(kind)}<article class="content">${inner}</article><aside class="toc"><div class="side-label">ON THIS PAGE</div>${toc.map((x, i) => `<a class="${i === 0 ? "active" : ""}">${x}</a>`).join("")}</aside></main>`;
}

function docs() {
  const steps = [
    ["Choose the safe sample", "Use the free GET sample. It performs no purchase, transfer, signing, or live provider verification."],
    ["Set the sample Base URL", "Keep sample, future sandbox, and production origins visibly distinct."],
    ["Send the sample request", `<pre class="mini-code">curl "$SIGNGATE_SAMPLE_URL/v1/agentic-commerce/preflight/sample" \\\n+  -H "Accept: application/json"</pre>`],
    ["Inspect the exact response", "Read decision, reason codes, expiry, evidence, and signer directive. The current sample does not return request_id."],
    ["Select the production integration path", "Choose endpoint-specific auth and billing only after allowlist, contract, and security review. Sandbox is coming later."]
  ];
  return portalContent("docs", `<div class="breadcrumbs">Documentation / <span>Five-minute quickstart</span></div><div class="eyebrow">${t.docsEyebrow}</div><h1>${t.docsTitle}</h1><p class="content-lede">${t.docsLede}</p><div class="callout warning"><div><strong>No sandbox is represented here.</strong> A sandbox key issuance flow and isolated Base URL remain implementation gaps. The steps below use a free sample.</div></div><h2>Five steps to a truthful first request</h2><div class="doc-steps">${steps.map((s, i) => `<div class="doc-step" data-step="${i + 1}"><h3>${s[0]}</h3><p>${s[1]}</p></div>`).join("")}</div><div class="code-panel compact"><div class="code-tabs"><span class="active">cURL</span><span>JavaScript</span><span>Python</span><button>Copy</button></div><pre class="code-block"><span class="comment"># sample environment · no credential · no live purchase</span>
curl "https://api.nomoslabs.io/v1/agentic-commerce/preflight/sample"</pre></div><h2>Choose the reviewed integration path</h2><div class="content-card-grid"><div class="content-card"><h3>Agent payment</h3><p>Production x402. Confirm exact price and fail-closed handling.</p></div><div class="content-card"><h3>API purchase / x402</h3><p>Review merchant and resource evidence before payment.</p></div><div class="content-card"><h3>Signer execution</h3><p>Keep signing authority out of the agent process.</p></div><div class="content-card"><h3>Sandbox</h3><p><span class="warning-text">Coming later.</span> No key or Base URL is currently promised.</p></div></div>`);
}

function endpoint() {
  return `<main class="page endpoint-layout">${sidebar("api")}<article class="endpoint-main">
    <div class="breadcrumbs">API Reference / Agent Payment Control / <span>Evaluate payment risk</span></div>
    <div class="endpoint-title"><span class="method large">GET</span><div><div class="eyebrow">${t.apiEyebrow}</div><h1>${t.apiTitle}</h1></div></div>
    <p class="endpoint-summary">${t.apiLede}</p>
    <div class="endpoint-workspace"><section class="endpoint-doc-column">
      <div class="endpoint-path"><code>/v1/x402/payment-guard/evaluate</code><button>Copy</button></div>
      <div class="endpoint-facts"><div><span>Availability</span><strong>Production · paid read-only</strong></div><div><span>Authentication</span><strong>x402 payment challenge</strong></div><div><span>Price / billing</span><strong>$0.10 USDC · x402</strong></div><div><span>Rate limit</span><strong>Not publicly specified</strong></div></div>
      <div class="callout warning compact-callout"><div><strong>Production Test it disabled.</strong> Sample only; sandbox key and Base URL are unavailable.</div></div>
      <div class="compact-section"><h2>Request parameters</h2><table class="param-table"><thead><tr><th>Name</th><th>In</th><th>Required</th><th>Description</th></tr></thead><tbody><tr><td><code>agent_id</code></td><td>query</td><td>Yes</td><td>Agent/integration identifier.</td></tr><tr><td><code>amount</code></td><td>query</td><td>Yes</td><td>Requested payment amount.</td></tr><tr><td><code>merchant</code></td><td>query</td><td>Yes</td><td>Counterparty context.</td></tr></tbody></table></div>
      <div class="compact-strip"><strong>Request body</strong><span>None for this GET operation.</span></div>
      <div class="compact-safety"><div><h2>Retry behavior</h2><p>Do not blindly retry paid requests. Retry only documented transient failures with idempotency and billing safeguards.</p></div><div><h2>Security notes</h2><p>HTTP 200 is not permission. Validate decision, expiry, evidence, and signer directive.</p></div></div>
      <div class="related-row"><strong>Related guides</strong><span>Interpret payment decisions</span><span>Handle x402 billing</span></div>
    </section><aside class="endpoint-code-column">
      <div class="code-panel"><div class="code-tabs"><span class="active">cURL</span><span>JavaScript</span><span>Python</span><button>Copy</button></div><pre class="code-block"><span class="comment"># Illustrative paid production call</span>
curl --get <span class="string">"https://api.nomoslabs.io/v1/x402/payment-guard/evaluate"</span> \\
  --data-urlencode <span class="string">"agent_id=agent.finance.001"</span> \\
  --data-urlencode <span class="string">"amount=0.25"</span></pre></div>
      <div class="compact-section"><h2>Response schema</h2><div class="schema-grid"><div><code>decision</code><span>service enum</span></div><div><code>reason_codes[]</code><span>reasons</span></div><div><code>evidence[]</code><span>evidence</span></div><div><code>signer_directive</code><span>constraint</span></div></div></div>
      <div class="example-grid stacked"><div class="example-card"><h3>Success example <span>HTTP 200</span></h3><pre>{ "decision": "REQUIRE_APPROVAL",\n  "signer_directive": { "required": true } }</pre></div><div class="example-card danger-card"><h3>Error example <span>HTTP 4xx</span></h3><pre>{ "error": { "code": "INVALID_REQUEST",\n  "message": "…" } }</pre></div></div>
      <div class="disabled-test"><div><strong>Test it unavailable</strong><p>Sample only · sandbox blocked · production auto-payment disabled.</p></div><button disabled>Run</button></div>
    </aside></div>
  </article></main>`;
}

function api() { return endpoint(); }

function changelog() {
  const entries = [
    ["2026-08-14", "added", "Agentic Commerce sample endpoint", "GET /v1/agentic-commerce/preflight/sample", "No", "Review sample response handling", "2026-08-14"],
    ["2026-09-02", "changed", "Merchant trust price example", "GET /v1/x402/base/merchant-trust", "No", "Confirm displayed x402 price before calling", "2026-09-09"],
    ["2026-10-01", "deprecated", "Legacy SDK method", "JavaScript SDK evaluateLegacy()", "Yes", "Migrate to the replacement method before sunset", "2026-12-01"]
  ];
  return portalContent("change", `<div class="breadcrumbs">Changelog / <span>All product updates</span></div><div class="eyebrow">${t.changeEyebrow}</div><h1>${t.changeTitle}</h1><p class="content-lede">${t.changeLede}</p><div class="callout"><div><strong>Illustrative format only.</strong> These entries demonstrate the required customer-facing structure and are not release claims.</div></div><div class="timeline">${entries.map(e => `<article class="change"><div class="change-date">${e[0]}</div><div class="change-body"><div class="change-head"><span class="type-badge ${e[1]}">${e[1]}</span><h3>${e[2]}</h3></div><p><strong>Affected:</strong> <code>${e[3]}</code></p><div class="change-meta"><span>Breaking: ${e[4]}</span><span>Customer action: ${e[5]}</span><span>Effective: ${e[6]}</span></div></div></article>`).join("")}</div>`);
}

function help() {
  const topics = [
    ["RA", "Why did SignGate return REQUIRE_APPROVAL?", "Read reason codes, mandate context, and the required approval path."],
    ["SD", "What does signer_directive mean?", "Keep signer authority isolated and enforce every required signer class."],
    ["AL", "Can an ALLOW decision be reused?", "Check service contract, expiry, nonce, evidence freshness, and replay rules."],
    ["EX", "What happens when evidence expires?", "Stop and request a fresh evaluation instead of trusting stale evidence."],
    ["BL", "Why was a payment denied or blocked?", "Use exact service reason codes; never infer from HTTP status alone."],
    ["X4", "How does x402 billing work?", "Confirm amount, asset, network, and charge result from authoritative metadata."],
    ["VR", "How do I verify a decision before execution?", "Validate decision, expiry, evidence, signer directive, and binding."],
    ["KY", "API key and authorization", "Issuance, scope, rotation, revocation, and secret handling."],
    ["SB", "Sandbox and production", "Know that the safe sample is not a sandbox and production Test it is disabled."],
    ["ER", "Common errors and retries", "Resolve schema, auth, payment, policy, and transient failures safely."],
    ["TR", "Integration troubleshooting", "Debug request context, environment, response fields, SDK, and MCP status."],
    ["CS", "Contact support", "Include non-secret request context; no SLA is implied by this proposal."]
  ];
  return portalContent("help", `<div class="breadcrumbs">Help Center / <span>Overview</span></div><div class="eyebrow">${t.helpEyebrow}</div><h1>${t.helpTitle}</h1><p class="content-lede">${t.helpLede}</p><div class="help-primary"><div class="help-search"><span class="search-icon"></span>Search SignGate help</div><a class="button-secondary" data-page="api">Explore API Reference</a></div><div class="help-grid">${topics.map(x => `<article class="help-card"><div class="card-icon">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join("")}</div><div class="support-secondary"><div><strong>Still blocked?</strong><p>Contact support with endpoint, environment, HTTP status, and timestamp. Never send credentials, private keys, or payment secrets.</p></div><a class="button-secondary">Contact support</a></div>`);
}

function contrast() {
  const rows = [
    ["Primary text", "#F3F7F7", "#070A0C", "18.40:1", "AAA"],
    ["Secondary text", "#AFBEC3", "#070A0C", "10.38:1", "AAA"],
    ["Metadata / inactive", "#91A2A8", "#070A0C", "7.50:1", "AAA"],
    ["Link / active", "#5EEAD4", "#070A0C", "13.42:1", "AAA"],
    ["Warning", "#F4C95D", "#17150D", "11.62:1", "AAA"],
    ["Danger", "#FF8EA0", "#1A1013", "8.54:1", "AAA"]
  ];
  return `<main class="page contrast-page"><div class="breadcrumbs">Visual QA / <span>Contrast evidence</span></div><div class="eyebrow">Accessibility evidence</div><h1>Readable under normal laptop brightness.</h1><p class="content-lede">WCAG relative-luminance ratios for the corrected dark tokens. Normal text requires 4.5:1; large text requires 3:1. Native GitBook rendering must be rechecked before publication.</p><div class="contrast-grid">${rows.map(r => `<article class="contrast-card" style="--fg:${r[1]};--sample-bg:${r[2]}"><div class="contrast-swatch"><strong>${r[0]}</strong><span>Readable sample Aa</span></div><div><code>${r[1]} on ${r[2]}</code><strong>${r[3]}</strong><span>${r[4]} · normal text pass</span></div></article>`).join("")}</div><div class="surface-evidence"><div>Page<br><code>#070A0C</code></div><div>Card<br><code>#0D1417</code></div><div>Raised<br><code>#131C20</code></div><div>Code<br><code>#090E10</code></div><div>Border<br><code>#2B3A40</code></div></div><div class="callout warning"><div>Contrast is necessary but not sufficient. Final GitBook QA must also verify keyboard focus, zoom, touch targets, code scrolling, headings, reduced motion, and English/Traditional Chinese wrapping.</div></div></main>`;
}

const render = { home, docs, api, endpoint, changelog, help, contrast };
document.getElementById("app").innerHTML = (render[page] || home)();
document.querySelectorAll("[data-page]").forEach(a => a.href = `?page=${a.dataset.page}&lang=${lang}&theme=${theme}`);
