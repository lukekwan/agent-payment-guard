const params = new URLSearchParams(location.search);
const page = params.get("page") || "home";
const lang = params.get("lang") === "zh" ? "zh" : "en";
const theme = params.get("theme") || "dark";
document.documentElement.dataset.theme = theme;
document.documentElement.lang = lang === "zh" ? "zh-TW" : "en";

const copy = {
  en: {
    nav:["Home","Documentation","API Reference","Changelog","Help Center"], support:"Get support", locale:"EN",
    heroEyebrow:"Policy decisions for autonomous systems",
    hero:"Control agent actions <span>before value moves.</span>",
    lede:"SignGate evaluates authority, mandate, evidence, risk, and policy before an agent pays, purchases an API, or asks a signer to execute.",
    start:"Start with a safe sample", explore:"Explore API services", availability:"Sandbox API keys and a true sandbox endpoint are not yet available.",
    services:"API services", servicesTitle:"One control layer, organized by developer task.", servicesText:"Availability is explicit. Only approved public endpoints enter executable reference.",
    quickEyebrow:"Five-minute quickstart", quickTitle:"From zero to a fail-closed decision flow.", quickText:"The current proposal demonstrates the onboarding sequence without pretending a sandbox exists.",
    outcomes:"Decision outcomes", outcomesTitle:"Interpret the service contract—never infer permission.",
    testTitle:"Test safely before you integrate", testText:"Run deterministic, credential-free samples now. Sandbox execution remains disabled until an isolated environment exists.", testAction:"Open sample runner",
    docsEyebrow:"Documentation", docsTitle:"Build a safe SignGate integration", docsLede:"Start with a fixed sample, learn the service-specific response, then move to sandbox only after credentials and endpoints are available.",
    apiEyebrow:"API Reference", apiTitle:"Approved public operations", apiLede:"Operations are grouped by service family. Candidate, internal, and implemented-unverified routes never appear as executable reference.",
    changeEyebrow:"Changelog", changeTitle:"Product and API changes", changeLede:"Track endpoints, breaking changes, deprecations, and environment availability with an explicit migration action.",
    helpEyebrow:"Help Center", helpTitle:"How can we help?", helpLede:"Find answers about keys, x402 billing, test environments, decision interpretation, and integrations."
  },
  zh: {
    nav:["首頁","文件","API 參考","變更記錄","幫助中心"], support:"取得支援", locale:"繁中",
    heroEyebrow:"自主系統的政策決策層",
    hero:"在價值移動前，<span>控制代理行動。</span>",
    lede:"在 AI Agent 付款、購買 API 或要求簽章器執行前，SignGate 會評估權限、授權範圍、證據、風險與政策。",
    start:"從安全範例開始", explore:"瀏覽 API 服務", availability:"目前尚無 sandbox API key 與真正的 sandbox endpoint。",
    services:"API 服務", servicesTitle:"一個控制層，依開發者任務清楚分類。", servicesText:"明確顯示 availability；只有核准的公開 endpoint 才能進入可執行 API 參考。",
    quickEyebrow:"五分鐘快速開始", quickTitle:"從零建立 fail-closed decision flow。", quickText:"本提案展示正確 onboarding 順序，不會假裝 sandbox 已存在。",
    outcomes:"決策結果", outcomesTitle:"依服務 contract 判讀，不得自行推測權限。",
    testTitle:"整合前先安全測試", testText:"現在可執行不需 credential 的固定 sample；真正 sandbox 建立前，sandbox execution 維持停用。", testAction:"開啟 sample runner",
    docsEyebrow:"文件", docsTitle:"建立安全的 SignGate 整合", docsLede:"先使用固定 sample，理解各服務 response，再於 sandbox credential 與 endpoint 可用後進入 sandbox。",
    apiEyebrow:"API 參考", apiTitle:"已核准的公開操作", apiLede:"依 service family 分組。Candidate、internal 與 implemented-unverified route 不得出現在可執行 reference。",
    changeEyebrow:"變更記錄", changeTitle:"產品與 API 變更", changeLede:"清楚記錄 endpoint、breaking change、deprecation、環境狀態與 migration action。",
    helpEyebrow:"幫助中心", helpTitle:"需要什麼協助？", helpLede:"查找 API key、x402 計費、測試環境、decision 判讀與整合問題。"
  }
};
const t=copy[lang];
document.querySelectorAll(".topnav a").forEach((a,i)=>{a.textContent=t.nav[i];a.href=`?page=${a.dataset.page}&lang=${lang}&theme=${theme}`;a.classList.toggle("active",a.dataset.page===page)});
document.querySelectorAll("[data-page]").forEach(a=>a.href=`?page=${a.dataset.page}&lang=${lang}&theme=${theme}`);
document.querySelector(".support-button").textContent=t.support;
document.getElementById("localeButton").textContent=t.locale;
document.querySelector(".search-button span:nth-child(2)").textContent=lang==="zh"?"搜尋文件":"Search docs";
document.getElementById("localeButton").onclick=()=>location.search=`?page=${page}&lang=${lang==="en"?"zh":"en"}&theme=${theme}`;

const services=lang==="zh"?[
  ["PC","Agent Payment Control","在代理付款前評估權限、政策與風險。","12 個操作"],
  ["AC","Agentic Commerce","檢查買方、商家、Mandate 與購買情境。","1 sample · 1 pending"],
  ["AS","Approval & Signer Control","回傳 approval 與 signer guidance，不暗示已強制執行。","Limited"],
  ["XT","Merchant & x402 Trust","檢查商家、origin、server 與付費資源。","6 個操作"],
  ["WE","Wallet & Transaction Evidence","篩查錢包、代幣、交易與市場情境。","40+ 個操作"],
  ["SC","Agent / API Supply Chain","檢查套件、repository、spec、domain 與 agent card。","8 個操作"],
  ["CE","Compliance Evidence","取得 KYT、AML 與 Travel Rule 等 provider evidence。","8 個操作"],
  ["SI","SDK & MCP","透過 client library 與 agent tool protocol 整合。","Pending verification"]
]:[
  ["PC","Agent Payment Control","Evaluate authority, policy, and risk before an agent pays.","12 operations"],
  ["AC","Agentic Commerce","Check buyer, merchant, mandate, and purchase context.","1 sample · 1 pending"],
  ["AS","Approval & Signer Control","Return approval and signer guidance without implying enforcement.","Limited"],
  ["XT","Merchant & x402 Trust","Inspect merchants, origins, servers, and paid resources.","6 operations"],
  ["WE","Wallet & Transaction Evidence","Screen wallets, tokens, transactions, and market context.","40+ operations"],
  ["SC","Agent / API Supply Chain","Check packages, repositories, specs, domains, and agent cards.","8 operations"],
  ["CE","Compliance Evidence","Retrieve provider-specific KYT, AML, and travel-rule evidence.","8 operations"],
  ["SI","SDK & MCP","Integrate through client libraries and agent tool protocols.","Pending verification"]
];
const sideDocs = lang==="en" ? {
  "GET STARTED":["Service overview","Five-minute quickstart","Authentication & API keys","Environments & Base URLs"],
  "CORE CONCEPTS":["Response format","Decision model","Mandate","Evidence","Approval","Signer directive","Error handling","Rate limits","Pricing & usage"],
  "INTEGRATION GUIDES":["Agent payment","API purchase / x402","Signer execution","Human approval","JavaScript & Python SDKs","MCP integration"]
}:{
  "開始使用":["服務概觀","五分鐘快速開始","認證與 API key","環境與 Base URL"],
  "核心概念":["回應格式","Decision model","Mandate","Evidence","Approval","Signer directive","錯誤處理","Rate limits","Pricing / usage"],
  "整合指南":["Agent payment","API purchase / x402","Signer execution","Human approval","JavaScript / Python SDK","MCP 整合"]
};
const sideApi = lang==="en" ? ["Agent Payment Control","Agentic Commerce","Approval & Signer Control","Merchant & x402 Trust","Wallet & Transaction Evidence","Agent / API Supply Chain","System & Audit","Models","Download OpenAPI spec"]:["Agent Payment Control","Agentic Commerce","Approval & Signer Control","Merchant & x402 Trust","Wallet & Transaction Evidence","Agent / API Supply Chain","System & Audit","Models","下載 OpenAPI spec"];

function serviceCards(){return services.map(s=>`<article class="service-card"><div class="card-icon">${s[0]}</div><h3>${s[1]}</h3><p>${s[2]}</p><div class="card-meta"><span class="availability">${s[3].includes("Pending")||s[3]==="Limited"?s[3]:"Available"}</span><span>${s[3]}</span></div></article>`).join("")}
function terminal(){return `<div class="terminal-card"><div class="terminal-head"><i></i><i></i><i></i><span>sample-response.json</span></div><div class="terminal-tabs"><span class="active">Response</span><span>Headers</span><span>cURL</span></div><pre class="terminal-code">{
  <span class="dim">"data"</span>: {
    <span class="dim">"decision"</span>: <span class="green">"REQUIRE_APPROVAL"</span>,
    <span class="dim">"signer_directive"</span>: {
      <span class="dim">"agent_may_directly_sign"</span>: <span class="amber">false</span>
    }
  },
  <span class="dim">"meta"</span>: {
    <span class="dim">"request_id"</span>: <span class="cyan">"req_sample_01"</span>,
    <span class="dim">"environment"</span>: <span class="cyan">"sample"</span>
  }
}
<span class="result-row"><b>SAFE STOP</b> Approval required before execution</span></pre></div>`}
function quickstart(){return `<div class="quickstart-shell"><div class="steps">${["Get a sandbox API key","Set the Base URL","Send your first request","Inspect the response","Stop, approve, or continue"].map((x,i)=>`<div class="step ${i===2?"active":""}"><div class="step-number">${i+1}</div><div><h4>${x}</h4><p>${i<2?"Implementation gap documented":"Fail closed on every unknown state"}</p></div></div>`).join("")}</div><div><div class="code-panel"><div class="code-tabs"><span class="active">cURL</span><span>JavaScript</span><span>Python</span><small>sample · no credential</small></div><pre class="code-block"><span class="comment"># Deterministic documentation sample</span>
curl --request GET \\
  --url <span class="string">https://sample.signgate.example/v1/preflight</span> \\
  --header <span class="string">'Accept: application/json'</span>

<span class="comment"># Never infer permission from HTTP 200</span>
decision=$(jq -r <span class="string">'.data.decision'</span> response.json)
[[ <span class="string">"$decision"</span> == <span class="string">"ALLOW"</span> ]] || exit 1</pre></div><div class="gap-callout"><strong>Implementation gap</strong><span>No sandbox key issuance or isolated sandbox Base URL exists yet. Production Test it stays disabled.</span></div></div></div>`}
function home(){return `<main class="page home"><section class="hero"><div><div class="eyebrow">${t.heroEyebrow}</div><h1>${t.hero}</h1><p class="lede">${t.lede}</p><div class="hero-actions"><a class="button-primary" data-page="docs">${t.start}<i class="arrow"></i></a><a class="button-secondary" data-page="api">${t.explore}<i class="arrow"></i></a></div><div class="availability-note"><span class="dot"></span>${t.availability}</div></div>${terminal()}</section><section class="section-wrap section-border"><div class="section-heading"><div class="eyebrow">${t.services}</div><h2>${t.servicesTitle}</h2><p>${t.servicesText}</p></div><div class="service-grid">${serviceCards()}</div></section><section class="section-wrap section-border"><div class="section-heading"><div class="eyebrow">${t.quickEyebrow}</div><h2>${t.quickTitle}</h2><p>${t.quickText}</p></div>${quickstart()}</section><section class="section-wrap section-border"><div class="section-heading"><div class="eyebrow">${t.outcomes}</div><h2>${t.outcomesTitle}</h2></div><div class="outcome-grid"><article class="outcome allow"><span class="tag">ALLOW</span><h3>Continue only when the service contract permits</h3><p>Check every required directive and enforcement condition.</p></article><article class="outcome review"><span class="tag">REVIEW / APPROVAL</span><h3>Pause the economic action</h3><p>Obtain authorized review, then request a fresh evaluation when required.</p></article><article class="outcome deny"><span class="tag">DENY / BLOCK</span><h3>Do not proceed</h3><p>Unknown, malformed, expired, or blocked results fail closed.</p></article></div></section><section class="section-wrap section-border"><div class="test-banner"><div><h3>${t.testTitle}</h3><p>${t.testText}</p></div><a class="button-primary">${t.testAction}<i class="arrow"></i></a></div></section><section class="section-wrap section-border"><div class="resource-row"><article class="resource-card"><h3>JavaScript, Python & MCP</h3><p>Client patterns mapped only to verified service contracts.</p></article><article class="resource-card"><h3>Changelog</h3><p>Breaking changes and migrations.</p></article><article class="resource-card"><h3>Help Center</h3><p>Keys, billing, errors, sandbox.</p></article><article class="resource-card"><h3>Support</h3><p>Integration assistance.</p></article></div></section></main>`}
function sidebar(kind){
  if(kind==="api")return `<aside class="sidebar"><div class="side-label">SERVICE FAMILIES</div>${sideApi.map((x,i)=>`<div class="side-link ${i===0?"active":""}"><span>${x}</span>${i<8?'<i class="chevron"></i>':''}</div>`).join("")}</aside>`;
  if(kind==="change")return `<aside class="sidebar"><div class="side-label">CHANGELOG</div>${["All updates","API","SDK & MCP","Sandbox / production","Security","Deprecations"].map((x,i)=>`<div class="side-link ${i===0?"active":""}">${x}</div>`).join("")}<div class="side-label">ARCHIVE</div>${["2026","2025"].map(x=>`<div class="side-link">${x}<span class="count">0</span></div>`).join("")}</aside>`;
  if(kind==="help")return `<aside class="sidebar"><div class="side-label">HELP CENTER</div>${["Overview","Getting started","Keys & authentication","Sandbox & production","Decisions","Rate limits","Pricing & x402","Errors","Troubleshooting","Contact support"].map((x,i)=>`<div class="side-link ${i===0?"active":""}">${x}</div>`).join("")}</aside>`;
  return `<aside class="sidebar">${Object.entries(sideDocs).map(([g,items])=>`<div class="side-label">${g}</div>${items.map((x,i)=>`<div class="side-link ${x.includes("quick")||x.includes("快速")?"active":""}">${x}</div>`).join("")}`).join("")}</aside>`
}
function portalContent(kind,inner){return `<main class="page portal-layout">${sidebar(kind)}<article class="content">${inner}</article><aside class="toc"><div class="side-label">ON THIS PAGE</div><a class="active">Overview</a><a>Prerequisites</a><a>Request</a><a>Response</a><a>Next steps</a></aside></main>`}
function docs(){return portalContent("docs",`<div class="breadcrumbs">Documentation / <span>Five-minute quickstart</span></div><div class="eyebrow">${t.docsEyebrow}</div><h1>${t.docsTitle}</h1><p class="content-lede">${t.docsLede}</p><div class="callout warning"><div><strong>Sandbox implementation gap.</strong> A real sandbox Base URL and key flow are not available. The sequence below uses a deterministic sample and must not be described as live sandbox access.</div></div><h2>Five steps to a safe first request</h2><div class="doc-steps"><div class="doc-step" data-step="1"><h3>Get a sandbox API key</h3><p>Future step. Define issuance, scope, expiry, rotation, and revocation before exposing this UI.</p></div><div class="doc-step" data-step="2"><h3>Set the Base URL</h3><p>Use <code>SIGNGATE_BASE_URL</code>; keep sample, sandbox, and production visibly distinct.</p></div><div class="doc-step" data-step="3"><h3>Send the first request</h3><pre class="mini-code">curl "$SIGNGATE_BASE_URL/v1/agentic-commerce/preflight/sample" \\
  -H "Accept: application/json"</pre></div><div class="doc-step" data-step="4"><h3>Inspect response and metadata</h3><p>Read the exact service decision, request ID, environment, expiry, and directive.</p></div><div class="doc-step" data-step="5"><h3>Stop, approve, or continue</h3><p>Proceed only when the service-specific contract and every enforcement check permit it.</p></div></div><h2>Choose an integration path</h2><div class="content-card-grid"><div class="content-card"><h3>Agent payment</h3><p>Evaluate mandate, policy, merchant, amount, evidence, and signer guidance.</p><span class="link">Open guide <i class="arrow"></i></span></div><div class="content-card"><h3>API purchase / x402</h3><p>Review price and trust evidence before a payment-aware client buys.</p><span class="link">Open guide <i class="arrow"></i></span></div><div class="content-card"><h3>SDK integration</h3><p>Confirm package and endpoint authority before adopting a client method.</p><span class="link">View SDK status <i class="arrow"></i></span></div><div class="content-card"><h3>MCP integration</h3><p>Fail closed when decision or signer directive is absent or malformed.</p><span class="link">View MCP guide <i class="arrow"></i></span></div></div>`)}
function api(){return portalContent("api",`<div class="breadcrumbs">API Reference / <span>Approved public operations</span></div><div class="eyebrow">${t.apiEyebrow}</div><h1>${t.apiTitle}</h1><p class="content-lede">${t.apiLede}</p><div class="callout key"><div><strong>Reference gate:</strong> only VERIFIED_PUBLIC operations from the approved OpenAPI appear here. Every paid operation displays price before execution.</div></div><div class="api-list"><div class="api-group"><div class="api-group-head"><div class="card-icon">PC</div><div><h3>Agent Payment Control</h3><p>Policy and risk checks before autonomous payment</p></div><span class="badge">3 approved</span></div><div class="endpoint-row"><span class="method">GET</span><code>/v1/x402/payment-guard/evaluate</code><small>$0.10 · x402</small></div><div class="endpoint-row"><span class="method">GET</span><code>/v1/x402/agent/payment-risk-gateway</code><small>$0.15 · x402</small></div><div class="endpoint-row"><span class="method">GET</span><code>/v1/x402/agent-risk/policy-decide</code><small>$0.10 · x402</small></div></div><div class="api-group"><div class="api-group-head"><div class="card-icon">XT</div><div><h3>Merchant & x402 Trust</h3><p>Merchant, origin, server, and resource evidence</p></div><span class="badge">6 approved</span></div><div class="endpoint-row"><span class="method">GET</span><code>/v1/x402/base/merchant-trust</code><small>$0.03 · x402</small></div><div class="endpoint-row"><span class="method">GET</span><code>/v1/x402/x402/server-trust</code><small>$0.01 · x402</small></div></div><div class="api-group"><div class="api-group-head"><div class="card-icon">WE</div><div><h3>Wallet & Transaction Evidence</h3><p>Risk, classification, trace, and transaction evidence</p></div><span class="badge">40+ approved</span></div></div></div><div class="endpoint-preview"><div class="endpoint-preview-head"><span class="method">GET</span><code>/v1/x402/payment-guard/evaluate</code></div><div class="endpoint-preview-body"><div class="spec-row"><span>Availability</span><span>Production · paid read-only · browser execution conditional</span></div><div class="spec-row"><span>Authentication</span><span>x402 payment challenge</span></div><div class="spec-row"><span>Pricing</span><span>$0.10 USDC per request</span></div><div class="spec-row"><span>Test it</span><span>Sample response only; production auto-payment disabled</span></div></div></div>`)}
function changelog(){return portalContent("change",`<div class="breadcrumbs">Changelog / <span>All updates</span></div><div class="eyebrow">${t.changeEyebrow}</div><h1>${t.changeTitle}</h1><p class="content-lede">${t.changeLede}</p><div class="timeline"><div class="change"><div class="change-date">2026-07-22</div><div class="change-body"><div class="change-head"><span class="type-badge">added</span><h3>Public API inventory baseline</h3></div><p>Recorded 100 primary operations and authority status without changing the runtime contract.</p><div class="change-meta"><span>Affected: documentation catalog</span><span>Breaking: no</span><span>Action: review service allowlist</span></div></div></div><div class="change"><div class="change-date">Effective TBD</div><div class="change-body"><div class="change-head"><span class="type-badge changed">changed</span><h3>Service-led navigation proposal</h3></div><p>Proposes five top-level destinations and separate Documentation/API Reference sidebars.</p><div class="change-meta"><span>Affected: portal navigation</span><span class="breaking">Breaking: navigation only</span><span>Action: update bookmarks after approval</span></div></div></div><div class="change"><div class="change-date">Planned</div><div class="change-body"><div class="change-head"><span class="type-badge fixed">fixed</span><h3>Validation claim scope</h3></div><p>Renamed existing pass evidence to document-structure validation, not API correctness.</p><div class="change-meta"><span>Affected: validation evidence</span><span>Breaking: no</span><span>Action: none</span></div></div></div></div>`)}
function help(){const topics=[["GS","Getting started checklist","Choose a service, environment, and safe first request."],["QY","What can I query?","Find approved services, required inputs, and limitations."],["KY","API key management","Issuance, scopes, rotation, revocation, and secret handling."],["AU","Authentication & authorization","Understand x402, API keys, agent tokens, and owner tokens."],["SB","Sandbox & production","Know which environment is real and which gaps remain."],["DS","Decision interpretation","Handle service-specific allow, review, approval, deny, and block states."],["RL","Rate limits","Read quota headers and design backoff safely."],["PX","Pricing, credits & x402","Review exact prices before any paid request."],["ER","Common errors","Resolve auth, schema, payment, and policy failures."],["TR","Integration troubleshooting","Debug SDK, MCP, CORS, request IDs, and retries."],["CS","Contact support","Provide request ID, environment, endpoint, and timestamp." ] ];return portalContent("help",`<div class="breadcrumbs">Help Center / <span>Overview</span></div><div class="eyebrow">${t.helpEyebrow}</div><h1>${t.helpTitle}</h1><p class="content-lede">${t.helpLede}</p><div class="help-search"><span class="search-icon"></span>Search the Help Center</div><div class="help-grid">${topics.map(x=>`<article class="help-card"><div class="card-icon">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join("")}</div><div class="callout key"><div><strong>Contact support</strong><br>Include the request ID, environment, endpoint, HTTP status, and timestamp. Never send private keys or payment secrets.</div></div>`)}

const render={home,docs,api,changelog,help};
document.getElementById("app").innerHTML=(render[page]||home)();
document.querySelectorAll("[data-page]").forEach(a=>a.href=`?page=${a.dataset.page}&lang=${lang}&theme=${theme}`);
