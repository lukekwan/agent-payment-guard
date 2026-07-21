import {
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { paymentMiddlewareFromHTTPServer } from "@x402/hono";
import { Hono } from "hono";
import { parse as parseYaml } from "yaml";
import {
  buildSumsubEvidenceManifest,
  evaluateAgenticCommercePreflight as evaluateAgenticCommercePolicy,
  listSumsubEvidenceServices,
} from "../packages/agent-buyer-policy-kit/src/index.js";

const BASE_MAINNET = "eip155:8453";
const BLOCKSCOUT = "https://base.blockscout.com";
const BASE_RPCS = [
  "https://base.blockscout.com/api/eth-rpc",
  "https://mainnet.base.org",
  "https://base-rpc.publicnode.com",
];
const FACILITATOR = "https://facilitator.payai.network";
const SERVICE_ORIGIN =
  "https://base-agent-preflight.bytoken2023.workers.dev";
const SERVICE_ICON = `${SERVICE_ORIGIN}/icon.svg`;
const PUBLIC_BRAND_NAME = "SignGate";
const PUBLIC_PRODUCT_POSITION = "Agent Policy & Execution Control";
const PUBLIC_LISTING_NAME = `${PUBLIC_BRAND_NAME} - ${PUBLIC_PRODUCT_POSITION}`;
const PUBLIC_LISTING_DESCRIPTION =
  "SignGate is Nomos Labs' agent policy and execution control product. It evaluates authority, mandates, approval requirements, signer boundaries, and evidence before autonomous agents buy, pay, call infrastructure, or trigger money movement. x402 is a supported protocol and commerce use case, not the product category.";
const PRICING_VERSION = "x402-pricing-v1-20260720";
const CONTACT_EMAIL = "nomolabs2026@gmail.com";
const STATIC_FACILITATOR_SUPPORT = {
  kinds: [{ x402Version: 2, scheme: "exact", network: BASE_MAINNET }],
  extensions: [
    "bazaar",
    "eip2612GasSponsoring",
    "erc20ApprovalGasSponsoring",
  ],
  signers: {},
};
const PAY_TO = "0x94F751f04b98507D31b500b7Ed50bE68A1514873";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const STABLECOINS = [
  { symbol: "USDC", address: USDC, decimals: 6 },
  {
    symbol: "USDT",
    address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    decimals: 6,
  },
  {
    symbol: "DAI",
    address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    decimals: 18,
  },
];
const KALSHI = "https://external-api.kalshi.com/trade-api/v2";
const BCS_API_BASE = "https://api.blockchainsecurity.asia";
const CATALOG_GROUPS = [
  {
    id: "kyt-wallet-risk",
    name: "KYT wallet and contract risk",
    buyer_goal:
      "Decide whether an AI agent, wallet, VASP, or backend should interact with a Base address, token, contract, or counterparty.",
  },
  {
    id: "x402-payment-safety",
    name: "x402 payment safety",
    buyer_goal:
      "Let an autonomous buyer verify x402 merchants, payment requirements, proof of payment, and seller reputation before or after spending.",
  },
  {
    id: "agent-chain-data",
    name: "Agent chain-data and RPC routing",
    buyer_goal:
      "Help autonomous agents decide whether to pay for RPC or indexed chain-data access before signing or routing requests.",
  },
  {
    id: "trading-bot-alpha-risk",
    name: "Trading bot alpha and risk",
    buyer_goal:
      "Give bots low-cost pre-trade filters for Base wallets, tokens, pools, liquidity, and copytrade decisions.",
  },
  {
    id: "agent-api-supply-chain",
    name: "Agent and API supply-chain preflight",
    buyer_goal:
      "Check tools, packages, domains, OpenAPI specs, feeds, and agent cards before an AI runtime depends on them.",
  },
  {
    id: "blockchainsecurity-data",
    name: "Wallet risk and BlockchainSecurity intelligence",
    buyer_goal:
      "Screen wallets, download source-attributed public risk data, or buy deeper BlockchainSecurity scoring and tracing through x402.",
  },
  {
    id: "sumsub-compliance-evidence",
    name: "Sumsub-backed compliance evidence",
    buyer_goal:
      "Let SignGate buyers purchase normalized KYB, KYT, AML, Travel Rule, identity, and review evidence before an agent-triggered economic action.",
  },
  {
    id: "market-context",
    name: "Market context",
    buyer_goal:
      "Fetch compact public market context when an agent needs a paid signal inside a workflow.",
  },
];

const CATALOG_METADATA = {
  "base-address-preflight": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "Before paying, onboarding, allowlisting, or routing a Base address into an automated workflow.",
    returns:
      "Risk score, risk level, identity type, scam/reputation flags, verification status, recent transfer summary, and decision hint.",
    price_reason:
      "Higher-priced KYT-style check because it combines address profile, counters, transfer signals, and action guidance.",
  },
  "base-token-preflight": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "Before a bot buys a Base token or an agent approves/interacts with a token contract.",
    returns:
      "Token identity, public reputation, holder and transfer context, DEX liquidity/activity, risk flags, and decision hint.",
    price_reason:
      "Higher-priced token preflight because it joins contract and market-risk context.",
  },
  "x402-merchant-trust": {
    group: "x402-payment-safety",
    when_to_buy:
      "Before trusting a paid API merchant or comparing sellers on x402 marketplaces.",
    returns:
      "USDC receipt history, payer concentration, public activity, merchant trust score, and review guidance.",
    price_reason:
      "Premium merchant intelligence call because it summarizes payment history and concentration, not just one transaction.",
  },
  "base-payment-proof": {
    group: "x402-payment-safety",
    when_to_buy:
      "After an agent claims it paid, or before delivery when a seller needs to verify the exact Base USDC transaction.",
    returns:
      "Canonical USDC payment match, recipient/amount verification, finality, transaction evidence, and failure reasons.",
    price_reason:
      "Mid-priced verification because it prevents delivery disputes and payment spoofing.",
  },
  "base-wallet-activity-delta": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "When an agent needs recent wallet movement since a known timestamp for monitoring or KYT refresh.",
    returns:
      "Recent ERC-20 activity, direction, token metadata, timestamps, and risk-oriented deltas.",
    price_reason:
      "Mid-priced monitoring call for incremental activity rather than a static lookup.",
  },
  "base-approval-risk": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "Before signing or keeping an ERC-20 approval, especially for autonomous trading or spending agents.",
    returns:
      "Live allowance, unlimited/large approval flags, owner/spender/token context, and decision hint.",
    price_reason: "Low-cost focused check for a single approval risk question.",
  },
  "base-contract-verification": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "Before an agent calls a Base contract, routes funds to it, or treats it as a trusted integration.",
    returns:
      "Source verification, compiler metadata, proxy type, implementation resolution, and risk notes.",
    price_reason: "Low-cost contract hygiene check using public explorer metadata.",
  },
  "base-usdc-receipt": {
    group: "x402-payment-safety",
    when_to_buy:
      "When a seller or agent only needs to extract USDC transfer evidence from one Base transaction.",
    returns: "Canonical USDC transfers, sender/recipient/amount, block status, and transaction finality.",
    price_reason: "Very low-cost receipt extractor for high-frequency post-payment checks.",
  },
  "base-wallet-counterparty": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "When a risk agent needs to know who a wallet has recently interacted with before a higher-cost enrichment.",
    returns: "Ranked counterparties, interaction counts, transfer context, and concentration signals.",
    price_reason: "Low-cost counterparty summary that can trigger deeper review only when needed.",
  },
  "base-event-log-monitor": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "When an agent monitors a contract or address for new events after a known Base block.",
    returns: "Recent decoded logs, topics, block numbers, transaction hashes, and monitoring metadata.",
    price_reason: "Very low-cost event feed slice for repeated polling.",
  },
  "base-gas-fee-quote": {
    group: "x402-payment-safety",
    when_to_buy:
      "Before an agent signs or prices a Base transaction and needs current gas cost context.",
    returns: "Live gas fee data and estimated transaction cost for a caller-supplied gas limit.",
    price_reason: "Very low-cost utility call designed for frequent autonomous transaction checks.",
  },
  "base-nonce-readiness": {
    group: "x402-payment-safety",
    when_to_buy:
      "Before an agent submits a Base transaction and needs to avoid nonce collision or pending-transaction confusion.",
    returns: "Confirmed nonce, pending nonce, readiness state, and transaction submission guidance.",
    price_reason: "Very low-cost transaction hygiene call.",
  },
  "base-stablecoin-balance": {
    group: "x402-payment-safety",
    when_to_buy:
      "Before an agent decides whether a wallet has enough stablecoin liquidity for a task.",
    returns: "USDC, USDT, DAI balances, token metadata, and public USD reference context.",
    price_reason: "Very low-cost balance check for high-frequency payment readiness.",
  },
  "base-dex-market-monitor": {
    group: "trading-bot-alpha-risk",
    when_to_buy:
      "Before a bot trades a Base token or when an agent needs live DEX liquidity and activity context.",
    returns: "DEX pair, price, liquidity, volume, buys/sells, and market-risk signals.",
    price_reason: "Low-cost market snapshot for repeated token monitoring.",
  },
  "prediction-market-snapshot": {
    group: "market-context",
    when_to_buy:
      "When an agent needs compact public Kalshi market context inside a decision workflow.",
    returns: "Quote, volume, open interest, orderbook snapshot, and market metadata.",
    price_reason: "Low-cost external market signal rather than a full trading analytics product.",
  },
  "x402-endpoint-preflight": {
    group: "x402-payment-safety",
    when_to_buy:
      "Before paying an unknown x402 endpoint, especially when the buyer is an autonomous agent.",
    returns: "Decoded payment requirements, payTo, network, amount, metadata validity, and malformed/unsafe flags.",
    price_reason: "Low-cost marketplace hygiene check that can prevent paying broken or suspicious resources.",
  },
  "npm-package-preflight": {
    group: "agent-api-supply-chain",
    when_to_buy:
      "Before a coding agent installs or recommends an npm package.",
    returns: "Package metadata, maintenance signals, license, dependencies, deprecation, and OSV vulnerability summary.",
    price_reason: "Low-cost software supply-chain preflight using public registries and vulnerability data.",
  },
  "github-repository-health": {
    group: "agent-api-supply-chain",
    when_to_buy:
      "Before an agent depends on a GitHub repository, library, template, or integration.",
    returns: "Maintenance, release, archive, license, issue, popularity, and repository health signals.",
    price_reason: "Low-cost repository diligence for code agents.",
  },
  "url-change-fingerprint": {
    group: "agent-api-supply-chain",
    when_to_buy:
      "When an agent monitors a URL for content or redirect changes without downloading a full archive.",
    returns: "Redirects, metadata, cache validators, SHA-256 content fingerprint, and fetch evidence.",
    price_reason: "Very low-cost high-frequency web monitoring primitive.",
  },
  "feed-snapshot": {
    group: "agent-api-supply-chain",
    when_to_buy:
      "When an agent needs the latest normalized entries from an RSS or Atom feed.",
    returns: "Recent items, stable fingerprints, titles, links, dates, and feed metadata.",
    price_reason: "Very low-cost polling primitive for alerting and research agents.",
  },
  "evm-transaction-intent": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "Before an agent signs EVM calldata, approves a spender, or submits an unknown transaction.",
    returns: "Decoded selector, token transfer/approval intent, unlimited-spend flags, unknown selector warnings, and decision hint.",
    price_reason: "Low-cost pre-signing safety check for autonomous wallets.",
  },
  "a2a-agent-card-preflight": {
    group: "agent-api-supply-chain",
    when_to_buy:
      "Before one agent delegates work to another public A2A agent.",
    returns: "Agent Card discovery, skill/provider/authentication details, endpoint consistency, and unsafe URL flags.",
    price_reason: "Low-cost trust preflight for inter-agent delegation.",
  },
  "openapi-spec-preflight": {
    group: "agent-api-supply-chain",
    when_to_buy:
      "Before an AI runtime imports, calls, or pays for a public API described by OpenAPI.",
    returns: "OpenAPI validity, server URLs, authentication declarations, operation coverage, content fingerprint, and warnings.",
    price_reason: "Low-cost API diligence check for tool discovery.",
  },
  "domain-trust-preflight": {
    group: "agent-api-supply-chain",
    when_to_buy:
      "Before an agent trusts a domain, follows a hosted API, or sends users to a web destination.",
    returns: "DNS, DNSSEC, mail, CNAME, RDAP registration age/expiration, and trust signals.",
    price_reason: "Low-cost domain trust check for web and API workflows.",
  },
  "pypi-package-preflight": {
    group: "agent-api-supply-chain",
    when_to_buy:
      "Before a coding agent installs or recommends a PyPI package.",
    returns: "PyPI metadata, release age, yanked status, Python requirements, dependencies, license, and OSV vulnerabilities.",
    price_reason: "Low-cost Python supply-chain preflight using public registries and vulnerability data.",
  },
  "agent-payment-guard": {
    group: "x402-payment-safety",
    when_to_buy:
      "Before an autonomous agent spends through x402 and needs a policy decision, budget enforcement, and audit trail.",
    returns:
      "ALLOW/REVIEW/BLOCK decision, risk score, policy/budget state, reasons, evidence, signed decision token, and reservation metadata.",
    price_reason:
      "Premium payment-control decision because it combines policy, budget enforcement, replay protection, simulation, signer directives, and auditable evidence before autonomous spend.",
  },
  "agent-payment-risk-gateway": {
    group: "x402-payment-safety",
    when_to_buy:
      "Before an AI agent asks a policy-controlled signer to execute a stablecoin payment.",
    returns:
      "Verifiable intent normalization, dynamic limit decision, recipient risk outcome, signer directive, and reason codes.",
    price_reason:
      "Premium pre-signing payment-control check because it returns a signer directive for autonomous stablecoin payment attempts.",
  },
  "base-alpha-risk-context": {
    group: "trading-bot-alpha-risk",
    when_to_buy:
      "As a cheap first-pass screen before copying, buying, or interacting with a Base wallet or token.",
    returns: "Risk score, alpha score, trade bias, wallet/token context, machine tags, and next action.",
    price_reason: "Very low-cost bot filter intended for repeated pre-trade calls.",
  },
  "base-token-alpha-snapshot": {
    group: "trading-bot-alpha-risk",
    when_to_buy:
      "Before a bot decides whether a Base token has enough liquidity/activity to continue analysis.",
    returns: "Liquidity, volume, buy/sell imbalance, risk flags, and trade bias.",
    price_reason: "Very low-cost token alpha snapshot for high-frequency filtering.",
  },
  "base-wallet-copytrade-risk": {
    group: "trading-bot-alpha-risk",
    when_to_buy:
      "Before a copytrading bot follows a Base wallet or assigns it to a watchlist.",
    returns: "Public risk, activity, counterparty quality, and follow/monitor/avoid recommendation.",
    price_reason: "Very low-cost wallet suitability filter.",
  },
  "base-new-pool-risk": {
    group: "trading-bot-alpha-risk",
    when_to_buy:
      "Before buying a newly launched Base pool or letting a bot chase launch-stage liquidity.",
    returns: "Pair age, liquidity, activity imbalance, contract flags, launch-stage risk score, and next action.",
    price_reason: "Very low-cost new-pool risk screen for fast bot decisions.",
  },
  "x402-server-trust": {
    group: "x402-payment-safety",
    when_to_buy:
      "When an AI buyer is comparing x402 API servers or deciding whether marketplace activity looks credible.",
    returns: "Server trust score, buyer concentration risk, micro-payment/ranking risk, freshness, chain coverage, seller enrichment, and decision hint.",
    price_reason: "Mid-priced marketplace trust product that scores the seller/server, not just one endpoint.",
  },
  "x402-origin-due-diligence": {
    group: "x402-payment-safety",
    when_to_buy:
      "Before an autonomous buyer spends on an x402scan origin or a newly discovered x402 server.",
    returns:
      "Origin/resource count, seller/payment consistency, metadata quality, due-diligence risk score, and recommended next checks.",
    price_reason:
      "Mid-priced meta-check that combines origin, resource, schema, and payment-safety evidence for agent buyers.",
  },
  "x402-resource-compare": {
    group: "x402-payment-safety",
    when_to_buy:
      "When an agent has multiple x402 resources or servers that could satisfy the same task and needs a ranked choice.",
    returns:
      "Ranked resource candidates, decoded price/payment metadata, risk flags, budget fit, and selection rationale.",
    price_reason:
      "Mid-priced comparison call because it probes multiple resources and produces an agent-ready recommendation.",
  },
  "agent-spend-route-plan": {
    group: "x402-payment-safety",
    when_to_buy:
      "When an agent has a task and budget but needs to decide which Agent Payment Guard resources to buy and in what order.",
    returns:
      "Ordered spend route, estimated cost, stop conditions, escalation triggers, and alternative products.",
    price_reason:
      "Control-plane router priced above telemetry because it shapes autonomous spend before paid resources are purchased.",
  },
  "agent-buyer-identity-preflight": {
    group: "x402-payment-safety",
    when_to_buy:
      "Before an AI agent buys an x402 API or data product and the buyer must verify role, purpose, price, and data-category fit as evidence for a larger SignGate decision.",
    returns:
      "ALLOW/APPROVAL_REQUIRED/DENY decision, role-product fit, reason codes, spend assessment, and audit guidance.",
    price_reason:
      "Governance decision priced above telemetry because it determines whether an agent role, authority, and purpose fit a paid x402 purchase.",
  },
  "agent-buyer-policy-kit": {
    group: "x402-payment-safety",
    when_to_buy:
      "When a team wants to embed the Agentic Commerce Policy Engine locally instead of only calling the hosted SignGate API.",
    returns:
      "Developer kit manifest, starter policy pack, mandate checks, merchant trust checks, signer directive rules, JavaScript and Python usage, release terms, and integration checklist.",
    price_reason:
      "One-time developer-kit price for reusable economic policy decision templates and evaluator integration, not a single API lookup.",
  },
  "base-token-exit-risk": {
    group: "trading-bot-alpha-risk",
    when_to_buy:
      "Before a trading bot enters or keeps a Base token position and needs to know whether exit liquidity or sellability looks fragile.",
    returns:
      "Exit-risk score, liquidity depth, volume/liquidity ratio, sell pressure, pair-age context, flags, and bot action guidance.",
    price_reason:
      "Very low-cost pre-trade and position-management filter for repeated bot workflows.",
  },
  "bcs-address-labels": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When an agent needs an address label or entity hint from BlockchainSecurity/MistTrack-backed data.",
    returns: "Upstream BlockchainSecurity label response, request id, credit headers, provenance, and upstream envelope.",
    price_reason: "Higher-priced wrapper because the upstream label lookup consumes paid BlockchainSecurity credits.",
  },
  "bcs-assets": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When an agent needs asset specs for one BlockchainSecurity-supported chain.",
    returns: "Chain asset list/specs from BlockchainSecurity with provenance.",
    price_reason: "Very low-cost registry lookup with minimal upstream risk.",
  },
  "bcs-chains": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When an agent needs the list of BlockchainSecurity-supported chains and native/token entries.",
    returns: "Supported chains and chain-level token entries.",
    price_reason: "Very low-cost discovery lookup.",
  },
  "bcs-token-registry": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When an agent needs the full BlockchainSecurity token registry for symbol/chain normalization.",
    returns: "Full token registry with symbols, chains, addresses, decimals, and provenance.",
    price_reason: "Low-cost broad registry lookup.",
  },
  "bcs-asset-resolve": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When an agent needs to resolve symbols or contracts into canonical BlockchainSecurity asset specs.",
    returns: "Resolved assets, contract/symbol matches, decimals, stablecoin mode, and upstream provenance.",
    price_reason: "Low-cost resolver that prevents wrong-token mistakes before downstream calls.",
  },
  "bcs-address-risk-score": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "Before onboarding, paying, accepting deposits from, or routing funds to an Ethereum or Tron address.",
    returns:
      "BlockchainSecurity behavior-based risk score, risk level, triggered suspicious behavior patterns, evidence, request id, and credit headers.",
    price_reason:
      "Premium KYT call because it runs behavior detection over an address, not just a static label lookup.",
  },
  "bcs-address-classify": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When an agent needs likely entity type classification for one or many addresses before enrichment or compliance review.",
    returns:
      "ML-predicted address type, confidence score, upstream response envelope, request id, and provenance.",
    price_reason:
      "Mid-priced batch classifier because it can classify up to 100 addresses and helps route downstream KYT checks.",
  },
  "bcs-wallet-overview": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When an agent needs a compact activity and balance profile for an address before deciding whether deeper investigation is worth buying.",
    returns:
      "Balances, receipt/payment counts, first and last activity timing, selected asset scope, request id, and provenance.",
    price_reason:
      "Mid-priced wallet profile that is broader than labels but cheaper than full tracing.",
  },
  "bcs-fund-trace": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When an investigator or KYT workflow needs multi-hop inbound or outbound fund-flow paths from a starting address.",
    returns:
      "Expanded multi-hop fund-flow paths, related transactions, configured trace direction/depth/filter metadata, request id, and provenance.",
    price_reason:
      "High-priced investigation call because graph expansion is heavier and more valuable than single-address enrichment.",
  },
  "bcs-cross-chain-track": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When an agent needs to connect a bridge transaction from source chain to destination chain and identify both sides.",
    returns:
      "Cross-chain transaction match, source and destination chain details, bridge label context, addresses, tx hashes, request id, and provenance.",
    price_reason:
      "Premium bridge-following call because it solves a specific investigation step that static labels cannot.",
  },
  "public-wallet-risk-lookup": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When an agent, KYT workflow, VASP, or payment backend needs to screen one wallet before onboarding, payout, or interaction.",
    returns:
      "Hit/no-hit, risk score, risk level, labels, sanctions/scam/ransomware/stablecoin blacklist categories, confidence, source keys, and evidence URLs.",
    price_reason:
      "Premium single-address intelligence because it merges curated public enforcement, scam, ransomware, and issuer blacklist sources with provenance.",
  },
  "public-wallet-risk-sample": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When a buyer or agent wants to inspect the dataset schema, provenance fields, evidence URLs, and label format before buying the full snapshot.",
    returns:
      "A small paid JSON sample from the hosted wallet-risk dataset plus manifest counts, schema hints, and next recommended paid resources.",
    price_reason:
      "Low-friction trial endpoint priced to help agents validate the data format before buying higher-priced lookup, delta, or snapshot resources.",
  },
  "public-wallet-risk-snapshot": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When a customer wants the complete current wallet-risk intelligence file for local KYT/AML screening or internal enrichment.",
    returns:
      "Full JSONL snapshot of active wallet-risk labels with source attribution, confidence, evidence URLs, manifest hashes, and schema metadata.",
    price_reason:
      "High-value dataset download: the buyer receives a system-importable risk intelligence snapshot, not a one-off lookup.",
  },
  "public-wallet-risk-delta": {
    group: "blockchainsecurity-data",
    when_to_buy:
      "When a customer already has a snapshot and wants the latest batch delta without redownloading the whole dataset.",
    returns:
      "JSONL batch delta with new/changed labels, on-chain blacklist events, batch metadata, source attribution, and evidence.",
    price_reason:
      "Priced as incremental intelligence that saves customers from re-running all public sources and parsers.",
  },
  "agent-rpc-preflight": {
    group: "agent-chain-data",
    when_to_buy:
      "Before an autonomous agent pays for an RPC or x402 chain-data endpoint and needs method, budget, and payment-context checks.",
    returns:
      "Endpoint origin, requested method, chain context, price and budget assessment, flags, and an allow/review/block decision hint.",
    price_reason:
      "Low-cost preflight that protects high-frequency agent RPC purchases before a wallet signs.",
  },
  "rpc-capability-probe": {
    group: "agent-chain-data",
    when_to_buy:
      "When a research agent needs to know whether an RPC route likely fits logs, storage, historical reads, trace, or fork workflows.",
    returns:
      "Capability requirements, missing/unknown support, recommended probes, research fitness, and limitations.",
    price_reason:
      "Low-cost compatibility probe for repeated chain-data vendor and endpoint comparisons.",
  },
  "agent-chain-data-route-plan": {
    group: "agent-chain-data",
    when_to_buy:
      "When an agent has a chain-data task and budget but needs to choose between RPC, indexed data, cached data, or human review.",
    returns:
      "Ordered route steps, estimated cost, stop conditions, required checks, and escalation guidance.",
    price_reason:
      "Low-cost planning call that routes agent spend before expensive data access begins.",
  },
  "indexed-chain-query-preflight": {
    group: "agent-chain-data",
    when_to_buy:
      "Before an agent pays for indexed blockchain SQL or analytics-style data and needs schema, row, cost, and query-safety checks.",
    returns:
      "Query type, estimated rows, risk flags, cost fit, schema-discovery recommendation, and next safe query shape.",
    price_reason:
      "Low-cost query preflight that can prevent expensive or overly broad indexed-data requests.",
  },
  "x402-rpc-payment-guard": {
    group: "agent-chain-data",
    when_to_buy:
      "Immediately before an agent signs payment for RPC or indexed chain-data access.",
    returns:
      "ALLOW/REVIEW/BLOCK decision, recipient and budget checks, replay context, signer directive, and limitations.",
    price_reason:
      "Payment-control guard priced above telemetry because it decides whether an agent should pay for RPC or indexed chain-data access before signer execution.",
  },
  "address-risk": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "Before an agent pays, allowlists, messages, or routes value to an address.",
    returns:
      "ALLOW/REVIEW/BLOCK decision, risk score, labels, exposure hints, evidence summary, and signed-receipt placeholder.",
    price_reason:
      "Low-cost agent-native address screening built for high-frequency pre-payment checks.",
  },
  "token-risk": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "Before an agent buys, approves, routes through, or recommends a token contract.",
    returns:
      "Token risk decision, honeypot/tax/proxy/authority/liquidity/concentration flags, and recommended next action.",
    price_reason:
      "Low-cost token safety preflight that can stop unsafe approvals or trades before signing.",
  },
  "transaction-decode-risk": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "Before an autonomous wallet signs unknown calldata or a transaction request.",
    returns:
      "Decoded intent, spender/recipient hints, approval/transfer risk, flags, and signing decision.",
    price_reason:
      "Low-cost pre-signing transaction review for repeated agent wallet actions.",
  },
  "wallet-dossier": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "When an agent needs one compact wallet intelligence packet before deeper KYT or payment decisions.",
    returns:
      "Wallet summary, labels, risk, counterparties, exposure, recent behavior, and next recommended paid checks.",
    price_reason:
      "Mid-priced dossier because it packages multiple wallet-risk signals into one agent-ready result.",
  },
  "safe-transaction-review": {
    group: "x402-payment-safety",
    when_to_buy:
      "Before an agent executes a payment, approval, swap, bridge, or contract call through a signer.",
    returns:
      "Policy decision, transaction risk, counterparty risk, value-at-risk context, and escalation guidance.",
    price_reason:
      "Premium transaction-control review because it combines payment policy, counterparty risk, calldata risk, and signer escalation guidance.",
  },
  "swap-preflight": {
    group: "trading-bot-alpha-risk",
    when_to_buy:
      "Before a bot or agent signs a swap or quotes a route for a token trade.",
    returns:
      "Swap decision, token risk, slippage and liquidity checks, route red flags, and stop conditions.",
    price_reason:
      "Low-cost swap guardrail intended to run before high-frequency autonomous DEX actions.",
  },
  "stablecoin-health": {
    group: "kyt-wallet-risk",
    when_to_buy:
      "Before an agent holds, accepts, pays, or routes through a stablecoin or issuer-controlled token.",
    returns:
      "Stablecoin health decision, blacklist/freeze/issuer authority flags, liquidity hints, and monitoring guidance.",
    price_reason:
      "Low-cost stablecoin risk packet for payment agents and treasury policies.",
  },
  "policy-decide": {
    group: "x402-payment-safety",
    when_to_buy:
      "When an AI runtime needs a single normalized policy decision before paying, signing, or invoking a paid tool.",
    returns:
      "ALLOW/REVIEW/BLOCK decision, reason codes, evidence summary, policy version, and signed-decision placeholder.",
    price_reason:
      "Premium generic policy decision endpoint because it is the shared control schema for agent payments, signing, and paid tool calls.",
  },
  "sumsub-case-management-evidence": {
    group: "sumsub-compliance-evidence",
    when_to_buy:
      "When an agent payment or merchant onboarding decision requires human/compliance review state as evidence.",
    returns:
      "Normalized Sumsub case-management evidence schema, required inputs, fail-closed states, demo response, and audit limitations.",
    price_reason:
      "Enterprise evidence endpoint because it supports reviewer workflow and audit context rather than a single risk lookup.",
  },
  "sumsub-db-net-evidence": {
    group: "sumsub-compliance-evidence",
    when_to_buy:
      "When SignGate needs identity database evidence for the verified principal behind an agent mandate.",
    returns:
      "Normalized identity database evidence contract, entitlement state, required applicant/principal reference, and decision mapping.",
    price_reason:
      "Identity evidence endpoint priced above utility calls because it supports principal and mandate authority checks.",
  },
  "sumsub-kyt-evidence": {
    group: "sumsub-compliance-evidence",
    when_to_buy:
      "Before an autonomous agent commits value and needs Sumsub KYT transaction or counterparty risk evidence.",
    returns:
      "Normalized KYT evidence contract, supported currency context, transaction reference input, and SignGate decision usage.",
    price_reason:
      "Risk evidence endpoint for transaction monitoring signals that can directly influence ALLOW/REQUIRE_APPROVAL/DENY.",
  },
  "sumsub-payment-method-crypto-evidence": {
    group: "sumsub-compliance-evidence",
    when_to_buy:
      "When a wallet or crypto payment method must be checked before accepting it in an agent payment workflow.",
    returns:
      "Normalized crypto payment-method evidence schema, wallet/payment-method references, fail-closed model, and demo response.",
    price_reason:
      "Risk evidence endpoint because wallet/payment-method suitability can gate agent payment execution.",
  },
  "sumsub-poa-evidence": {
    group: "sumsub-compliance-evidence",
    when_to_buy:
      "When buyer, merchant, or responsible-principal jurisdiction/residency evidence is needed for policy gates.",
    returns:
      "Normalized proof-of-address evidence contract, applicant/principal input requirements, and decision mapping.",
    price_reason:
      "Identity evidence endpoint for residency and address policy gates rather than high-frequency transaction checks.",
  },
  "sumsub-crystal-crypto-risk-evidence": {
    group: "sumsub-compliance-evidence",
    when_to_buy:
      "When a high-impact crypto transfer needs premium Crystal-backed risk scoring evidence.",
    returns:
      "Normalized Crystal crypto risk evidence contract, crypto transaction or wallet reference, and fail-closed response.",
    price_reason:
      "Premium risk evidence endpoint because it represents a stronger crypto risk scoring source for material transfers.",
  },
  "sumsub-travel-rule-evidence": {
    group: "sumsub-compliance-evidence",
    when_to_buy:
      "When a VASP-style crypto transfer needs originator, beneficiary, and Travel Rule compliance evidence.",
    returns:
      "Normalized Travel Rule evidence contract, originator/beneficiary reference requirements, and signer-boundary usage.",
    price_reason:
      "Premium compliance evidence endpoint for regulated transfer workflows and auditability.",
  },
  "sumsub-watchlist-aml-evidence": {
    group: "sumsub-compliance-evidence",
    when_to_buy:
      "Before paying or onboarding a counterparty that needs sanctions, PEP, watchlist, or adverse-media evidence.",
    returns:
      "Normalized AML/watchlist evidence contract, applicant or counterparty reference inputs, and DENY/escalation mapping.",
    price_reason:
      "Premium AML evidence endpoint because sanctions or unresolved hits can directly block autonomous payments.",
  },
  "agent-capability-security-preflight": {
    group: "agent-api-supply-chain",
    when_to_buy:
      "Before installing, trusting, calling, or delegating to another agent, MCP server, API, package, repository, or capability.",
    returns:
      "Unified ALLOW/REVIEW/DENY decision with Agent Card, repository, package, domain, OpenAPI, and x402 endpoint checks when those underlying capabilities are available.",
    price_reason:
      "Bundle-priced security decision that replaces repeated separate preflight purchases for the same capability workflow.",
  },
  "base-payment-due-diligence-bundle": {
    group: "base-payment-due-diligence",
    when_to_buy:
      "Before an agent pays a Base merchant, signs a USDC transfer, or trusts a wallet/payment workflow.",
    returns:
      "One workflow-level bundle with merchant trust, wallet activity, counterparty, balance, nonce, gas, optional receipt/payment-proof, approval, event-log, and contract checks.",
    price_reason:
      "Bundle-priced replacement for repeated separate Base payment due-diligence purchases.",
  },
  "x402-transaction-preflight-lite": {
    group: "x402-transaction-preflight",
    when_to_buy:
      "Low-friction price test before an agent pays an x402 merchant or signs a Base transaction.",
    returns:
      "ALLOW/REQUIRE_REVIEW/DENY plus PASS/WARN/FAIL evidence checks for the transaction workflow.",
    price_reason: "0.15 USDC variant for automated agent flows with lower value at risk.",
  },
  "x402-transaction-preflight": {
    group: "x402-transaction-preflight",
    when_to_buy:
      "Primary transaction preflight before an agent pays an x402 merchant or signs a Base transaction.",
    returns:
      "One explainable transaction decision with merchant, wallet, payment proof, receipt, contract, gas, nonce, and balance evidence.",
    price_reason:
      "0.25 USDC primary test price because it replaces multiple round trips and evidence purchases.",
  },
  "x402-transaction-preflight-plus": {
    group: "x402-transaction-preflight",
    when_to_buy:
      "Higher-assurance price test for enterprise, compliance, or high-value x402 transaction review.",
    returns:
      "ALLOW/REQUIRE_REVIEW/DENY plus the same explainable evidence set at the high-value variant price.",
    price_reason: "0.50 USDC variant for enterprise/compliance willingness-to-pay testing.",
  },
};
const PRODUCTS = [
  {
    id: "base-address-preflight",
    path: "/v1/x402/base/address-preflight",
    price: "$0.075",
    description:
      "Inspect a Base address before an autonomous payment or contract interaction.",
    input: {
      address: "0x94F751f04b98507D31b500b7Ed50bE68A1514873",
    },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base address to inspect before an autonomous payment.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-token-preflight",
    path: "/v1/x402/base/token-preflight",
    price: "$0.075",
    description:
      "Inspect a Base token contract, public reputation, holder count, and DEX liquidity before trading.",
    input: { token: USDC },
    inputSchema: {
      properties: {
        token: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base ERC-20 token contract to inspect.",
        },
      },
      required: ["token"],
    },
  },
  {
    id: "x402-merchant-trust",
    path: "/v1/x402/base/merchant-trust",
    price: "$0.100",
    description:
      "Summarize a Base merchant's public USDC receipt history and payer concentration.",
    input: { address: PAY_TO },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base merchant payment recipient address.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-payment-proof",
    path: "/v1/x402/base/payment-proof",
    price: "$0.030",
    description:
      "Verify a Base transaction contains the expected canonical USDC payment.",
    input: {
      tx: "0xb2d1308a0df026083e5793106af4ed2342d4b517d42935e05c1fb2f91544707f",
      recipient: PAY_TO,
      amount: "0.02",
    },
    inputSchema: {
      properties: {
        tx: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{64}$",
          description: "Base transaction hash.",
        },
        recipient: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Expected USDC recipient.",
        },
        amount: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Expected USDC amount in decimal units.",
        },
      },
      required: ["tx", "recipient", "amount"],
    },
  },
  {
    id: "base-wallet-activity-delta",
    path: "/v1/x402/base/wallet-activity-delta",
    price: "$0.030",
    description:
      "Return recent Base ERC-20 activity for a wallet after a caller-supplied timestamp.",
    input: {
      address: PAY_TO,
      since: "2026-06-21T00:00:00Z",
    },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base wallet to monitor.",
        },
        since: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}T.+Z$",
          description: "Return transfers observed at or after this timestamp.",
        },
      },
      required: ["address", "since"],
    },
  },
  {
    id: "base-approval-risk",
    path: "/v1/x402/base/approval-risk",
    price: "$0.005",
    description:
      "Read a live ERC-20 allowance on Base and flag unlimited or unusually large approvals.",
    input: { token: USDC, owner: PAY_TO, spender: PAY_TO },
    inputSchema: {
      properties: {
        token: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "ERC-20 token contract.",
        },
        owner: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Token owner that granted the allowance.",
        },
        spender: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Address authorized to spend the owner's tokens.",
        },
      },
      required: ["token", "owner", "spender"],
    },
  },
  {
    id: "base-contract-verification",
    path: "/v1/x402/base/contract-verification",
    price: "$0.005",
    description:
      "Inspect Base source verification, compiler metadata, proxy type, and resolved implementations.",
    input: { address: "0x4200000000000000000000000000000000000006" },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base contract address to verify.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-usdc-receipt",
    path: "/v1/x402/base/usdc-receipt",
    price: "$0.003",
    description:
      "Extract canonical Base USDC transfers and transaction finality from a transaction hash.",
    input: {
      tx: "0xb2d1308a0df026083e5793106af4ed2342d4b517d42935e05c1fb2f91544707f",
    },
    inputSchema: {
      properties: {
        tx: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{64}$",
          description: "Base transaction hash.",
        },
      },
      required: ["tx"],
    },
  },
  {
    id: "base-wallet-counterparty",
    path: "/v1/x402/base/wallet-counterparty",
    price: "$0.020",
    description:
      "Rank counterparties in a Base wallet's recent transactions and ERC-20 transfers.",
    input: { address: PAY_TO },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base wallet or contract to analyze.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-event-log-monitor",
    path: "/v1/x402/base/event-log-monitor",
    price: "$0.003",
    description:
      "Return recent decoded Base event logs at or after a caller-supplied block.",
    input: {
      address: "0x4200000000000000000000000000000000000006",
      from_block: "47600000",
    },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base address whose emitted logs should be monitored.",
        },
        from_block: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Return logs from this Base block onward.",
        },
      },
      required: ["address", "from_block"],
    },
  },
  {
    id: "base-gas-fee-quote",
    path: "/v1/x402/base/gas-fee-quote",
    price: "$0.003",
    description:
      "Return live Base gas fees and an estimated transaction cost for a caller-supplied gas limit.",
    input: { gas_limit: "21000" },
    inputSchema: {
      properties: {
        gas_limit: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Expected transaction gas limit.",
        },
      },
      required: ["gas_limit"],
    },
  },
  {
    id: "base-nonce-readiness",
    path: "/v1/x402/base/nonce-readiness",
    price: "$0.003",
    description:
      "Compare confirmed and pending Base nonces before an autonomous transaction is signed.",
    input: { address: PAY_TO },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base account whose transaction nonce should be checked.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-stablecoin-balance",
    path: "/v1/x402/base/stablecoin-balance",
    price: "$0.003",
    description:
      "Return live Base USDC, USDT, and DAI balances with public USD reference rates.",
    input: { address: PAY_TO },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base wallet or contract whose stablecoin balances should be read.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-dex-market-monitor",
    path: "/v1/x402/base/dex-market-monitor",
    price: "$0.005",
    description:
      "Monitor Base DEX price, liquidity, volume, and trade activity for a token.",
    input: { token: USDC },
    inputSchema: {
      properties: {
        token: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base token contract to monitor across DEX pairs.",
        },
      },
      required: ["token"],
    },
  },
  {
    id: "prediction-market-snapshot",
    path: "/v1/x402/prediction/market-snapshot",
    price: "$0.005",
    description:
      "Return a public Kalshi prediction-market quote, volume, open interest, and orderbook snapshot.",
    input: { ticker: "KXWCFIRSTGOAL-26JUN21ESPKSA-ESPLYAMAL10" },
    inputSchema: {
      properties: {
        ticker: {
          type: "string",
          pattern: "^[A-Za-z0-9._-]{3,160}$",
          description: "Kalshi market ticker.",
        },
      },
      required: ["ticker"],
    },
  },
  {
    id: "x402-endpoint-preflight",
    path: "/v1/x402/web/endpoint-preflight",
    price: "$0.015",
    description:
      "Inspect an unpaid x402 endpoint, decode its payment requirements, and flag unsafe or malformed commerce metadata.",
    input: {
      url: "https://x402.twit.sh/tweets/by/id?id=1110302988",
    },
    inputSchema: {
      properties: {
        url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public HTTP(S) x402 resource URL to inspect without paying.",
        },
      },
      required: ["url"],
    },
  },
  {
    id: "npm-package-preflight",
    path: "/v1/x402/software/npm-package-preflight",
    price: "$0.015",
    description:
      "Check npm package metadata, maintenance signals, deprecation, license, dependencies, and OSV vulnerabilities.",
    input: { package: "express", version: "4.18.2" },
    inputSchema: {
      properties: {
        package: {
          type: "string",
          minLength: 1,
          maxLength: 214,
          description: "npm package name, including an optional scope.",
        },
        version: {
          type: "string",
          minLength: 1,
          maxLength: 80,
          description: "Exact npm version or latest. Defaults to latest.",
        },
      },
      required: ["package"],
    },
  },
  {
    id: "github-repository-health",
    path: "/v1/x402/software/github-repository-health",
    price: "$0.020",
    description:
      "Score a public GitHub repository using maintenance, release, license, archive, issue, and popularity signals.",
    input: { owner: "cloudflare", repo: "workers-sdk" },
    inputSchema: {
      properties: {
        owner: {
          type: "string",
          pattern: "^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$",
          description: "GitHub repository owner or organization.",
        },
        repo: {
          type: "string",
          pattern: "^[A-Za-z0-9._-]{1,100}$",
          description: "Public GitHub repository name.",
        },
      },
      required: ["owner", "repo"],
    },
  },
  {
    id: "url-change-fingerprint",
    path: "/v1/x402/web/url-change-fingerprint",
    price: "$0.003",
    description:
      "Fetch a public URL and return redirect, metadata, cache validators, and a SHA-256 content fingerprint.",
    input: { url: "https://www.cloudflare.com/" },
    inputSchema: {
      properties: {
        url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public HTTP(S) document URL to fingerprint.",
        },
      },
      required: ["url"],
    },
  },
  {
    id: "feed-snapshot",
    path: "/v1/x402/web/feed-snapshot",
    price: "$0.003",
    description:
      "Normalize the latest entries from a public RSS or Atom feed with stable item fingerprints.",
    input: { url: "https://github.com/cloudflare/workers-sdk/releases.atom" },
    inputSchema: {
      properties: {
        url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public RSS or Atom feed URL.",
        },
      },
      required: ["url"],
    },
  },
  {
    id: "evm-transaction-intent",
    path: "/v1/x402/base/transaction-intent",
    price: "$0.005",
    description:
      "Decode Base transaction calldata before signing and flag token transfers, approvals, unlimited spending, and unknown selectors.",
    input: {
      to: USDC,
      data:
        "0x095ea7b300000000000000000000000094f751f04b98507d31b500b7ed50be68a1514873ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      value: "0",
    },
    inputSchema: {
      properties: {
        to: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base destination contract or account.",
        },
        data: {
          type: "string",
          pattern: "^0x(?:[a-fA-F0-9]{2})*$",
          maxLength: 8194,
          description: "Hex-encoded EVM calldata.",
        },
        value: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Native ETH value in wei. Defaults to zero.",
        },
      },
      required: ["to", "data"],
    },
  },
  {
    id: "a2a-agent-card-preflight",
    path: "/v1/x402/agent/a2a-card-preflight",
    price: "$0.020",
    description:
      "Discover and validate a public A2A Agent Card, its skills, provider, authentication, endpoint consistency, and unsafe URLs.",
    input: {
      url: "https://base-agent-preflight.bytoken2023.workers.dev",
    },
    inputSchema: {
      properties: {
        url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public agent origin or direct Agent Card URL.",
        },
      },
      required: ["url"],
    },
  },
  {
    id: "openapi-spec-preflight",
    path: "/v1/x402/web/openapi-preflight",
    price: "$0.015",
    description:
      "Validate a public OpenAPI JSON or YAML document, server URLs, authentication declarations, operation coverage, and content fingerprint.",
    input: {
      url: "https://base-agent-preflight.bytoken2023.workers.dev/openapi.json",
    },
    inputSchema: {
      properties: {
        url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public OpenAPI JSON or YAML document URL.",
        },
      },
      required: ["url"],
    },
  },
  {
    id: "domain-trust-preflight",
    path: "/v1/x402/web/domain-trust-preflight",
    price: "$0.015",
    description:
      "Inspect public DNS, DNSSEC, mail, CNAME resolution, RDAP registration age, expiration, and domain trust signals.",
    input: { domain: "github.com" },
    inputSchema: {
      properties: {
        domain: {
          type: "string",
          pattern:
            "^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,63}$",
          description: "Registrable or delegated public DNS domain name.",
        },
      },
      required: ["domain"],
    },
  },
  {
    id: "pypi-package-preflight",
    path: "/v1/x402/software/pypi-package-preflight",
    price: "$0.005",
    description:
      "Check PyPI package metadata, release age, yanked status, Python requirements, dependencies, license, and OSV vulnerabilities.",
    input: { package: "requests", version: "latest" },
    inputSchema: {
      properties: {
        package: {
          type: "string",
          pattern: "^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,198}[A-Za-z0-9])?$",
          description: "PyPI project name.",
        },
        version: {
          type: "string",
          pattern: "^(?:latest|[A-Za-z0-9][A-Za-z0-9._+!-]{0,99})$",
          description: "Exact PyPI version or latest. Defaults to latest.",
        },
      },
      required: ["package"],
    },
  },
  {
    id: "agent-payment-guard",
    path: "/v1/x402/payment-guard/evaluate",
    price: "$0.10",
    description:
      "AI agent x402 payment firewall: enforce budgets and mandates, simulate transactions, score merchant and domain risk, prevent replay, require human approval, and audit delivery before autonomous spending.",
    input: {
      url: "https://x402.twit.sh/tweets/by/id?id=1110302988",
      session_id: "demo-session",
      request_id: "demo-request-1",
      max_single_usdc: "0.10",
      session_budget_usdc: "1.00",
      daily_budget_usdc: "5.00",
    },
    inputSchema: {
      properties: {
        url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public x402 resource URL to evaluate before payment.",
        },
        session_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,96}$",
          description: "Caller-defined budget and audit scope.",
        },
        request_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Caller-defined idempotency key.",
        },
        max_single_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Maximum allowed price for one payment.",
        },
        session_budget_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Maximum reserved spend for this session.",
        },
        daily_budget_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Maximum reserved spend for this session in one UTC day.",
        },
        allow_pay_to: {
          type: "string",
          maxLength: 2048,
          description: "Optional comma-separated recipient allowlist.",
        },
        block_pay_to: {
          type: "string",
          maxLength: 2048,
          description: "Optional comma-separated recipient blocklist.",
        },
        to: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Optional transaction destination for intent decoding.",
        },
        data: {
          type: "string",
          pattern: "^0x(?:[a-fA-F0-9]{2})*$",
          maxLength: 8194,
          description: "Optional EVM calldata.",
        },
        value: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Optional native ETH value in wei.",
        },
      },
      required: ["url", "session_id", "request_id"],
    },
  },
  {
    id: "base-alpha-risk-context",
    path: "/v1/x402/base/alpha-risk",
    price: "$0.003",
    description:
      "High-frequency Base wallet or token risk and alpha context for trading bots before copying, buying, or interacting.",
    input: {
      subject: USDC,
      kind: "auto",
    },
    inputSchema: {
      properties: {
        subject: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base wallet, contract, or ERC-20 token address to score.",
        },
        kind: {
          type: "string",
          enum: ["auto", "wallet", "token"],
          description:
            "Optional interpretation hint. Defaults to auto detection.",
        },
      },
      required: ["subject"],
    },
  },
  {
    id: "base-token-alpha-snapshot",
    path: "/v1/x402/base/token-alpha-snapshot",
    price: "$0.003",
    description:
      "Fast Base token alpha snapshot for trading bots: liquidity, volume, buy/sell imbalance, risk flags, and bot-ready trade bias.",
    input: { token: USDC },
    inputSchema: {
      properties: {
        token: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base ERC-20 token address to score.",
        },
      },
      required: ["token"],
    },
  },
  {
    id: "base-wallet-copytrade-risk",
    path: "/v1/x402/base/wallet-copytrade-risk",
    price: "$0.003",
    description:
      "Copytrade risk snapshot for a Base wallet: public risk, activity, counterparty quality, and whether a bot should follow, monitor, or avoid.",
    input: { address: PAY_TO },
    inputSchema: {
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base wallet to evaluate before copytrading.",
        },
      },
      required: ["address"],
    },
  },
  {
    id: "base-new-pool-risk",
    path: "/v1/x402/base/new-pool-risk",
    price: "$0.003",
    description:
      "New Base pool risk snapshot for bots: pair age, liquidity, activity imbalance, contract flags, and launch-stage risk score.",
    input: { token: USDC },
    inputSchema: {
      properties: {
        token: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base token address whose deepest pool should be checked.",
        },
      },
      required: ["token"],
    },
  },
  {
    id: "x402-server-trust",
    path: "/v1/x402/x402/server-trust",
    price: "$0.01",
    description:
      "Score an x402 API server using public payment volume, transaction count, buyer concentration, seller address, freshness, and chain coverage.",
    input: {
      server_url: SERVICE_ORIGIN,
      seller: PAY_TO,
      volume_usdc: "109300",
      txns: "9500000",
      buyers: "626",
      latest_seen_hours: "2",
      chains: "base",
    },
    inputSchema: {
      properties: {
        server_url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "Public x402 server origin or endpoint URL.",
        },
        seller: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Optional Base seller or payment recipient address.",
        },
        volume_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Observed public x402 volume in USDC.",
        },
        txns: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Observed public x402 transaction count.",
        },
        buyers: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Observed public unique buyer count.",
        },
        latest_seen_hours: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,2})?$",
          description: "Hours since the latest observed payment.",
        },
        chains: {
          type: "string",
          pattern: "^[A-Za-z0-9, _-]{1,120}$",
          description: "Comma-separated chain names reported by the marketplace.",
        },
      },
      required: ["server_url"],
    },
  },
  {
    id: "x402-origin-due-diligence",
    path: "/v1/x402/x402/origin-due-diligence",
    price: "$0.01",
    description:
      "Run x402 origin due diligence for an AI buyer: resources, payment consistency, metadata quality, seller risk, and next checks.",
    input: {
      server_url:
        "https://www.x402scan.com/server/b0ce6f4e-73e9-431d-b23c-814ac89cc77b",
      seller: PAY_TO,
      resources: "42",
      txns: "42",
      buyers: "3",
    },
    inputSchema: {
      properties: {
        server_url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "x402scan server URL, x402 server origin, or x402 endpoint URL.",
        },
        seller: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Optional expected seller/payment recipient address.",
        },
        resources: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Optional observed resource count from a marketplace page.",
        },
        txns: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Optional observed public x402 transaction count.",
        },
        buyers: {
          type: "string",
          pattern: "^[0-9]+$",
          description: "Optional observed unique buyer count.",
        },
      },
      required: ["server_url"],
    },
  },
  {
    id: "x402-resource-compare",
    path: "/v1/x402/x402/resource-compare",
    price: "$0.01",
    description:
      "Compare two to five x402 resources or servers by price, payment metadata, schema quality, seller consistency, and budget fit.",
    input: {
      resources: `${SERVICE_ORIGIN}/v1/x402/base/alpha-risk,${SERVICE_ORIGIN}/v1/x402/base/token-alpha-snapshot`,
      budget_usdc: "0.02",
    },
    inputSchema: {
      properties: {
        resources: {
          type: "string",
          pattern: "^https?://",
          maxLength: 4096,
          description: "Comma-separated list of two to five public x402 resource or server URLs.",
        },
        budget_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Optional maximum acceptable spend for one chosen resource.",
        },
      },
      required: ["resources"],
    },
  },
  {
    id: "agent-spend-route-plan",
    path: "/v1/x402/agent/spend-route-plan",
    price: "$0.05",
    description:
      "Plan which Agent Payment Guard x402 resources an autonomous agent should buy for a task, budget, and risk tolerance.",
    input: {
      task: "screen a Base token before buying",
      budget_usdc: "0.02",
      risk_tolerance: "medium",
    },
    inputSchema: {
      properties: {
        task: {
          type: "string",
          minLength: 3,
          maxLength: 500,
          description: "Natural-language task the agent wants to complete.",
        },
        budget_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Maximum planned spend for the route.",
        },
        risk_tolerance: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "How much uncertainty the buyer can tolerate.",
        },
      },
      required: ["task"],
    },
  },
  {
    id: "agent-buyer-identity-preflight",
    path: "/v1/x402/agent/buyer-identity-preflight",
    price: "$0.05",
    description:
      "Check whether an AI agent's role, purpose, authority, and spend limit fit the x402 service or data product it wants to buy.",
    input: {
      agent_role: "research_agent",
      product_category: "wallet_risk",
      purpose: "security_research",
      price_usdc: "0.005",
      data_sensitivity: "medium",
    },
    inputSchema: {
      properties: {
        agent_role: {
          type: "string",
          enum: [
            "research_agent",
            "writer_agent",
            "accounting_agent",
            "finance_agent",
            "operator_agent",
          ],
          description: "Declared or credential-mapped buyer agent role.",
        },
        product_category: {
          type: "string",
          pattern: "^[a-z0-9_-]{2,80}$",
          description:
            "Normalized category of the x402 service, such as wallet_risk, invoice_verification, or market_intelligence.",
        },
        purpose: {
          type: "string",
          pattern: "^[a-z0-9_-]{2,80}$",
          description: "Normalized intended use for the purchase.",
        },
        price_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Quoted x402 price for this purchase.",
        },
        data_sensitivity: {
          type: "string",
          enum: ["low", "medium", "high", "restricted"],
          description: "Sensitivity level of the service or returned data.",
        },
        agent_status: {
          type: "string",
          enum: ["active", "paused", "disabled"],
          description: "Lifecycle state of the buyer agent.",
        },
        approval_ref: {
          type: "string",
          maxLength: 160,
          description: "Optional human approval reference for elevated purchases.",
        },
      },
      required: ["agent_role", "product_category"],
    },
  },
  {
    id: "agent-buyer-policy-kit",
    path: "/v1/x402/agent/buyer-policy-kit",
    price: "$49.00",
    description:
      "Buy the SignGate Agent Buyer Policy Kit: starter roles, product taxonomy, role-product matrix, JS/Python evaluator guidance, and self-host integration terms.",
    input: {
      format: "manifest",
      buyer_type: "developer",
    },
    inputSchema: {
      properties: {
        format: {
          type: "string",
          enum: ["manifest", "policy", "quickstart"],
          description: "Delivery format. manifest returns the full kit manifest.",
        },
        buyer_type: {
          type: "string",
          enum: ["developer", "startup", "enterprise"],
          description: "Buyer segment for install and integration guidance.",
        },
      },
      required: [],
    },
  },
  {
    id: "base-token-exit-risk",
    path: "/v1/x402/base/token-exit-risk",
    price: "$0.003",
    description:
      "Estimate Base token exit risk for bots using liquidity depth, volume/liquidity pressure, sell imbalance, pair age, and token flags.",
    input: { token: USDC },
    inputSchema: {
      properties: {
        token: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Base ERC-20 token address to evaluate for exit risk.",
        },
      },
      required: ["token"],
    },
  },
  {
    id: "bcs-address-labels",
    path: "/v1/x402/bcs/labels",
    price: "$0.02",
    description:
      "Proxy BlockchainSecurity address labels for AI agents using a paid x402 call and a server-side API key.",
    input: {
      chain: "ethereum",
      address: "0x28c6c06298d514db089934071355e5743bf21d60",
      sources: "all",
    },
    inputSchema: {
      properties: {
        chain: {
          type: "string",
          pattern: "^[a-z0-9_-]{2,32}$",
          description: "BlockchainSecurity chain slug, such as ethereum, bsc, or tron.",
        },
        address: {
          type: "string",
          pattern: "^[A-Za-z0-9:_-]{3,128}$",
          description: "Address to label on the selected chain.",
        },
        sources: {
          type: "string",
          pattern: "^[A-Za-z0-9,_-]{1,80}$",
          description: "Optional BlockchainSecurity sources selector, such as misttrack or all.",
        },
        refresh: {
          type: "string",
          pattern: "^(?:true|false)$",
          description: "Optional true to bypass upstream cache when supported.",
        },
      },
      required: ["chain", "address"],
    },
  },
  {
    id: "bcs-assets",
    path: "/v1/x402/bcs/assets",
    price: "$0.003",
    description:
      "Return BlockchainSecurity asset specs for a chain through an x402-paid AI-friendly wrapper.",
    input: { chain: "ethereum" },
    inputSchema: {
      properties: {
        chain: {
          type: "string",
          pattern: "^[a-z0-9_-]{2,32}$",
          description: "BlockchainSecurity chain slug.",
        },
      },
      required: ["chain"],
    },
  },
  {
    id: "bcs-chains",
    path: "/v1/x402/bcs/chains",
    price: "$0.003",
    description:
      "Return BlockchainSecurity supported chains and native/token entries for AI agents.",
    input: {},
    inputSchema: {
      properties: {},
      required: [],
    },
  },
  {
    id: "bcs-token-registry",
    path: "/v1/x402/bcs/registry",
    price: "$0.005",
    description:
      "Return the BlockchainSecurity token registry through an x402 paid resource.",
    input: {},
    inputSchema: {
      properties: {},
      required: [],
    },
  },
  {
    id: "bcs-asset-resolve",
    path: "/v1/x402/bcs/resolve",
    price: "$0.005",
    description:
      "Resolve BlockchainSecurity asset symbols or contracts into asset specs through an x402 paid wrapper.",
    input: { blockchain: "ethereum", symbols: "usdt,weth" },
    inputSchema: {
      properties: {
        blockchain: {
          type: "string",
          pattern: "^[a-z0-9_-]{2,32}$",
          description: "BlockchainSecurity blockchain slug.",
        },
        symbols: {
          type: "string",
          pattern: "^[A-Za-z0-9,._-]{1,240}$",
          description: "Comma-separated symbols to resolve.",
        },
        contracts: {
          type: "string",
          pattern: "^[A-Za-z0-9,:._-]{1,1000}$",
          description: "Optional comma-separated contract addresses to resolve.",
        },
      },
      required: ["blockchain"],
    },
  },
  {
    id: "bcs-address-risk-score",
    path: "/v1/x402/bcs/address-risk",
    price: "$0.15",
    description:
      "Run BlockchainSecurity behavior-based address risk scoring for Ethereum or Tron through an x402 paid wrapper.",
    input: {
      blockchain: "tron",
      address: "TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9",
      symbols: "usdt,usdc",
    },
    inputSchema: {
      properties: {
        blockchain: {
          type: "string",
          pattern: "^(?:ethereum|tron)$",
          description: "BlockchainSecurity chain slug. Address risk currently supports ethereum or tron.",
        },
        address: {
          type: "string",
          pattern: "^[A-Za-z0-9:_-]{3,128}$",
          description: "Address to risk-score.",
        },
        symbols: {
          type: "string",
          pattern: "^[A-Za-z0-9,._-]{1,240}$",
          description: "Optional comma-separated asset symbols to include.",
        },
        contracts: {
          type: "string",
          pattern: "^[A-Za-z0-9,:._-]{1,1000}$",
          description: "Optional comma-separated token contracts to include.",
        },
      },
      required: ["blockchain", "address"],
    },
  },
  {
    id: "bcs-address-classify",
    path: "/v1/x402/bcs/address-classify",
    price: "$0.10",
    description:
      "Classify one or more blockchain addresses by likely entity type using BlockchainSecurity ML classification.",
    input: {
      blockchain: "tron",
      addresses: "TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9",
    },
    inputSchema: {
      properties: {
        blockchain: {
          type: "string",
          pattern: "^(?:ethereum|tron|bitcoin)$",
          description: "BlockchainSecurity chain slug. Defaults upstream to tron when omitted.",
        },
        addresses: {
          type: "string",
          pattern: "^[A-Za-z0-9,:._-]{3,4000}$",
          description: "Comma-separated addresses to classify, up to 100.",
        },
      },
      required: ["addresses"],
    },
  },
  {
    id: "bcs-wallet-overview",
    path: "/v1/x402/bcs/wallet-overview",
    price: "$0.08",
    description:
      "Fetch a BlockchainSecurity wallet activity and balance overview through an x402 paid wrapper.",
    input: {
      blockchain: "tron",
      address: "TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9",
      symbols: "usdt,usdc",
    },
    inputSchema: {
      properties: {
        blockchain: {
          type: "string",
          pattern: "^[a-z0-9_-]{2,32}$",
          description: "BlockchainSecurity chain slug.",
        },
        address: {
          type: "string",
          pattern: "^[A-Za-z0-9:_-]{3,128}$",
          description: "Address to summarize.",
        },
        symbols: {
          type: "string",
          pattern: "^[A-Za-z0-9,._-]{1,240}$",
          description: "Optional comma-separated asset symbols to include.",
        },
        contracts: {
          type: "string",
          pattern: "^[A-Za-z0-9,:._-]{1,1000}$",
          description: "Optional comma-separated token contracts to include.",
        },
        output_asset: {
          type: "string",
          pattern: "^[A-Za-z0-9._-]{1,40}$",
          description: "Optional output asset for valuation where supported.",
        },
      },
      required: ["blockchain", "address"],
    },
  },
  {
    id: "bcs-fund-trace",
    path: "/v1/x402/bcs/trace",
    price: "$0.49",
    description:
      "Run BlockchainSecurity multi-hop fund-flow tracing from a starting address through an x402 paid wrapper.",
    input: {
      blockchain: "tron",
      address: "TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9",
      direction: "out",
      depth: "2",
      limit: "50",
    },
    inputSchema: {
      properties: {
        blockchain: {
          type: "string",
          pattern: "^(?:ethereum|tron|bitcoin)$",
          description: "BlockchainSecurity chain slug.",
        },
        address: {
          type: "string",
          pattern: "^[A-Za-z0-9:_-]{3,128}$",
          description: "Starting address for tracing.",
        },
        direction: {
          type: "string",
          enum: ["in", "out", "both"],
          description: "Trace direction hint mapped into track_setting.",
        },
        depth: {
          type: "string",
          pattern: "^[1-5]$",
          description: "Trace depth hint mapped into track_setting.",
        },
        limit: {
          type: "string",
          pattern: "^[1-9][0-9]{0,2}$",
          description: "Maximum path or transaction items requested.",
        },
        symbols: {
          type: "string",
          pattern: "^[A-Za-z0-9,._-]{1,240}$",
          description: "Optional comma-separated asset symbols to filter.",
        },
        min_value: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]+)?$",
          description: "Optional minimum value filter.",
        },
      },
      required: ["blockchain", "address"],
    },
  },
  {
    id: "bcs-cross-chain-track",
    path: "/v1/x402/bcs/cross-chain",
    price: "$0.29",
    description:
      "Track a bridge transaction across chains using BlockchainSecurity cross-chain intelligence.",
    input: {
      txhash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      label: "across",
    },
    inputSchema: {
      properties: {
        txhash: {
          type: "string",
          pattern: "^[A-Za-z0-9:_-]{16,160}$",
          description: "Source transaction hash.",
        },
        label: {
          type: "string",
          pattern: "^[A-Za-z0-9_-]{2,40}$",
          description: "Bridge protocol label, such as across, axelar, celer, or wormhole.",
        },
      },
      required: ["txhash", "label"],
    },
  },
  {
    id: "agent-payment-risk-gateway",
    path: "/v1/x402/agent/payment-risk-gateway",
    price: "$0.15",
    description:
      "x402-discoverable AI agent stablecoin payment firewall: verify intent, enforce dynamic limits, score recipient risk, and return a signer directive before payment execution.",
    input: {
      request_id: "demo-request-1",
      agent_id: "demo-agent",
      purpose: "api_purchase",
      pay_to: PAY_TO,
      amount_usdc: "0.025",
      invoice_id: "demo-invoice",
      nonce: "demo-nonce-123",
      max_single_usdc: "0.10",
      human_review_above_usdc: "0.09",
      risk_score: "5",
    },
    inputSchema: {
      properties: {
        request_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Caller-defined idempotency key for the intent.",
        },
        agent_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,96}$",
          description: "AI agent or runtime requesting payment authorization.",
        },
        purpose: {
          type: "string",
          maxLength: 80,
          description: "Short audit purpose for the payment.",
        },
        pay_to: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Recipient address.",
        },
        amount_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Stablecoin amount in USDC.",
        },
        invoice_id: {
          type: "string",
          maxLength: 160,
          description: "Commercial context binding the payment to an invoice or order.",
        },
        invoice_hash: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{64}$",
          description: "Optional invoice or order hash.",
        },
        nonce: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{8,128}$",
          description: "Replay-prevention nonce.",
        },
        max_single_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Maximum allowed amount for one payment.",
        },
        human_review_above_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Amount at or above which the decision becomes review.",
        },
        allow_pay_to: {
          type: "string",
          maxLength: 2048,
          description: "Optional comma-separated recipient allowlist.",
        },
        block_pay_to: {
          type: "string",
          maxLength: 2048,
          description: "Optional comma-separated recipient blocklist.",
        },
        risk_score: {
          type: "string",
          pattern: "^[0-9]{1,3}$",
          description: "Caller-supplied recipient risk score from 0 to 100.",
        },
        risk_labels: {
          type: "string",
          maxLength: 512,
          description: "Optional comma-separated risk labels.",
        },
      },
      required: [
        "request_id",
        "agent_id",
        "purpose",
        "pay_to",
        "amount_usdc",
        "nonce",
      ],
    },
  },
  {
    id: "agent-rpc-preflight",
    path: "/v1/x402/agent/rpc-preflight",
    price: "$0.005",
    description:
      "Preflight an agent RPC or x402 chain-data request before payment: endpoint origin, method risk, chain fit, price, and budget checks.",
    input: {
      endpoint_url: "https://x402.example.com/rpc/base",
      chain: "base",
      method: "eth_blockNumber",
      max_price_usdc: "0.001",
      session_budget_usdc: "1.00",
    },
    inputSchema: {
      properties: {
        endpoint_url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "RPC, x402, REST, or indexed chain-data endpoint URL.",
        },
        chain: {
          type: "string",
          pattern: "^[A-Za-z0-9:_ -]{2,80}$",
          description: "Requested chain or CAIP-2 network label.",
        },
        method: {
          type: "string",
          pattern: "^[A-Za-z0-9_.:-]{2,80}$",
          description: "RPC method, REST operation, or query action.",
        },
        max_price_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Maximum acceptable price for this request.",
        },
        session_budget_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Remaining session budget available to the agent.",
        },
      },
      required: ["endpoint_url", "chain", "method"],
    },
  },
  {
    id: "rpc-capability-probe",
    path: "/v1/x402/chain/rpc-capability-probe",
    price: "$0.005",
    description:
      "Score whether an RPC route likely fits agent chain-data work: logs, storage, historical reads, trace, WebSocket, and local-fork research.",
    input: {
      chain: "ethereum",
      methods: "eth_blockNumber,eth_getLogs,eth_getStorageAt",
      historical_block: "17000000",
      requires_trace: "false",
      requires_websocket: "false",
    },
    inputSchema: {
      properties: {
        chain: {
          type: "string",
          pattern: "^[A-Za-z0-9:_ -]{2,80}$",
          description: "Requested chain or CAIP-2 network label.",
        },
        methods: {
          type: "string",
          pattern: "^[A-Za-z0-9_.,:-]{2,400}$",
          description: "Comma-separated RPC methods the workflow needs.",
        },
        historical_block: {
          type: "string",
          pattern: "^[0-9]{1,12}$",
          description: "Optional historical block number needed by the workflow.",
        },
        requires_trace: {
          type: "string",
          pattern: "^(?:true|false)$",
          description: "Whether debug/trace methods are required.",
        },
        requires_websocket: {
          type: "string",
          pattern: "^(?:true|false)$",
          description: "Whether subscription/WebSocket support is required.",
        },
      },
      required: ["chain", "methods"],
    },
  },
  {
    id: "agent-chain-data-route-plan",
    path: "/v1/x402/agent/chain-data-route-plan",
    price: "$0.005",
    description:
      "Plan a budget-aware route for agent chain-data tasks across RPC reads, indexed data, cached intelligence, and payment review.",
    input: {
      task: "investigate recent Base token transfers before payment",
      chain: "base",
      data_need: "logs",
      budget_usdc: "0.02",
      risk_tolerance: "medium",
    },
    inputSchema: {
      properties: {
        task: {
          type: "string",
          minLength: 3,
          maxLength: 500,
          description: "Natural-language chain-data task.",
        },
        chain: {
          type: "string",
          pattern: "^[A-Za-z0-9:_ -]{2,80}$",
          description: "Requested chain or CAIP-2 network label.",
        },
        data_need: {
          type: "string",
          enum: ["rpc", "logs", "storage", "trace", "indexed", "sql", "fork", "mixed"],
          description: "Primary data access shape.",
        },
        budget_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Maximum planned spend for this route.",
        },
        risk_tolerance: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "How much uncertainty the buyer can tolerate.",
        },
      },
      required: ["task", "chain"],
    },
  },
  {
    id: "indexed-chain-query-preflight",
    path: "/v1/x402/chain/indexed-query-preflight",
    price: "$0.005",
    description:
      "Preflight an indexed chain-data query before payment: schema discovery, query type, estimated rows, cost fit, and safety flags.",
    input: {
      chain: "base",
      query_type: "event_logs",
      estimated_rows: "5000",
      max_price_usdc: "0.02",
    },
    inputSchema: {
      properties: {
        chain: {
          type: "string",
          pattern: "^[A-Za-z0-9:_ -]{2,80}$",
          description: "Requested chain or CAIP-2 network label.",
        },
        query_type: {
          type: "string",
          enum: ["schema", "event_logs", "transfers", "balances", "transactions", "sql", "protocol_timeline"],
          description: "Indexed data query family.",
        },
        estimated_rows: {
          type: "string",
          pattern: "^[0-9]{1,10}$",
          description: "Caller-estimated row count or result size.",
        },
        max_price_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Maximum acceptable query price.",
        },
      },
      required: ["chain", "query_type"],
    },
  },
  {
    id: "x402-rpc-payment-guard",
    path: "/v1/x402/agent/rpc-payment-guard",
    price: "$0.10",
    description:
      "Guard an agent payment for RPC or indexed chain-data access with endpoint, recipient, amount, budget, and signer-directive checks.",
    input: {
      request_id: "rpc-request-1",
      endpoint_url: "https://x402.example.com/rpc/base",
      chain: "base",
      method: "eth_getLogs",
      pay_to: PAY_TO,
      amount_usdc: "0.001",
      max_single_usdc: "0.01",
      session_budget_usdc: "1.00",
    },
    inputSchema: {
      properties: {
        request_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Caller-defined idempotency key for this RPC purchase.",
        },
        endpoint_url: {
          type: "string",
          pattern: "^https?://",
          maxLength: 2048,
          description: "RPC, x402, REST, or indexed chain-data endpoint URL.",
        },
        chain: {
          type: "string",
          pattern: "^[A-Za-z0-9:_ -]{2,80}$",
          description: "Requested chain or CAIP-2 network label.",
        },
        method: {
          type: "string",
          pattern: "^[A-Za-z0-9_.:-]{2,80}$",
          description: "RPC method, REST operation, or query action.",
        },
        pay_to: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Payment recipient address.",
        },
        amount_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Requested stablecoin payment amount.",
        },
        max_single_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Maximum allowed amount for one RPC/data purchase.",
        },
        session_budget_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Remaining budget for this agent session.",
        },
      },
      required: ["request_id", "endpoint_url", "chain", "method", "amount_usdc"],
    },
  },
  {
    id: "address-risk",
    path: "/v1/x402/agent-risk/address-risk",
    price: "$0.01",
    description:
      "Return an agent-ready risk decision before paying, allowlisting, or interacting with an address.",
    input: { chain: "base", address: PAY_TO, action: "payment" },
    inputSchema: {
      properties: {
        chain: {
          type: "string",
          pattern: "^[A-Za-z0-9:_ -]{2,80}$",
          description: "Chain or network label for the address.",
        },
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Wallet or contract address to screen.",
        },
        action: {
          type: "string",
          pattern: "^[A-Za-z0-9_.:-]{2,80}$",
          description: "Planned agent action, such as payment, approval, onboarding, or call.",
        },
      },
      required: ["chain", "address"],
    },
  },
  {
    id: "token-risk",
    path: "/v1/x402/agent-risk/token-risk",
    price: "$0.01",
    description:
      "Return token safety flags for honeypot, tax, proxy, authority, liquidity, concentration, and approval risk.",
    input: { chain: "base", token: USDC, action: "swap" },
    inputSchema: {
      properties: {
        chain: {
          type: "string",
          pattern: "^[A-Za-z0-9:_ -]{2,80}$",
          description: "Chain or network label for the token.",
        },
        token: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Token contract to screen.",
        },
        action: {
          type: "string",
          pattern: "^[A-Za-z0-9_.:-]{2,80}$",
          description: "Planned agent action, such as swap, approve, bridge, or hold.",
        },
      },
      required: ["chain", "token"],
    },
  },
  {
    id: "transaction-decode-risk",
    path: "/v1/x402/agent-risk/transaction-decode-risk",
    price: "$0.01",
    description:
      "Decode an EVM transaction shape and return pre-signing risk flags for transfers, approvals, and unknown calldata.",
    input: { chain: "base", to: PAY_TO, value_usdc: "0.01", calldata: "0x" },
    inputSchema: {
      properties: {
        chain: {
          type: "string",
          pattern: "^[A-Za-z0-9:_ -]{2,80}$",
          description: "Chain or network label for the transaction.",
        },
        to: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Transaction recipient or contract.",
        },
        value_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Approximate value at risk in USDC.",
        },
        calldata: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]*$",
          maxLength: 4096,
          description: "EVM calldata or 0x for a simple transfer.",
        },
      },
      required: ["chain", "to"],
    },
  },
  {
    id: "wallet-dossier",
    path: "/v1/x402/agent-risk/wallet-dossier",
    price: "$0.03",
    description:
      "Return a compact wallet dossier with risk, exposure, counterparty, behavior, and next-check guidance.",
    input: { chain: "base", address: PAY_TO },
    inputSchema: {
      properties: {
        chain: {
          type: "string",
          pattern: "^[A-Za-z0-9:_ -]{2,80}$",
          description: "Chain or network label for the wallet dossier.",
        },
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Wallet or contract address to summarize.",
        },
      },
      required: ["chain", "address"],
    },
  },
  {
    id: "safe-transaction-review",
    path: "/v1/x402/agent-risk/safe-transaction-review",
    price: "$0.25",
    description:
      "Review a planned payment, approval, swap, bridge, or contract call before an agent signs.",
    input: {
      chain: "base",
      from: PAY_TO,
      to: PAY_TO,
      action: "payment",
      amount_usdc: "0.01",
    },
    inputSchema: {
      properties: {
        chain: { type: "string", pattern: "^[A-Za-z0-9:_ -]{2,80}$" },
        from: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        to: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        action: { type: "string", pattern: "^[A-Za-z0-9_.:-]{2,80}$" },
        amount_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
        },
      },
      required: ["chain", "from", "to", "action"],
    },
  },
  {
    id: "swap-preflight",
    path: "/v1/x402/agent-risk/swap-preflight",
    price: "$0.01",
    description:
      "Preflight a token swap route for token safety, liquidity, slippage, route, and policy risk.",
    input: {
      chain: "base",
      token_in: USDC,
      token_out: "0x4200000000000000000000000000000000000006",
      amount_usdc: "10",
      max_slippage_bps: "100",
    },
    inputSchema: {
      properties: {
        chain: { type: "string", pattern: "^[A-Za-z0-9:_ -]{2,80}$" },
        token_in: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        token_out: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        amount_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
        },
        max_slippage_bps: { type: "string", pattern: "^[0-9]{1,5}$" },
      },
      required: ["chain", "token_in", "token_out"],
    },
  },
  {
    id: "stablecoin-health",
    path: "/v1/x402/agent-risk/stablecoin-health",
    price: "$0.01",
    description:
      "Check stablecoin payment suitability, issuer controls, blacklist/freeze risk, and treasury policy fit.",
    input: { chain: "base", token: USDC, use_case: "agent_payment" },
    inputSchema: {
      properties: {
        chain: { type: "string", pattern: "^[A-Za-z0-9:_ -]{2,80}$" },
        token: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        use_case: { type: "string", pattern: "^[A-Za-z0-9_.:-]{2,80}$" },
      },
      required: ["chain", "token"],
    },
  },
  {
    id: "policy-decide",
    path: "/v1/x402/agent-risk/policy-decide",
    price: "$0.10",
    description:
      "Return a normalized ALLOW/REVIEW/BLOCK policy decision for an agent payment, signing, or tool-call request.",
    input: {
      request_id: "policy-request-1",
      action: "x402_payment",
      amount_usdc: "0.01",
      risk_score: "20",
    },
    inputSchema: {
      properties: {
        request_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
        },
        action: { type: "string", pattern: "^[A-Za-z0-9_.:-]{2,80}$" },
        amount_usdc: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
        },
        risk_score: { type: "string", pattern: "^[0-9]{1,3}$" },
      },
      required: ["request_id", "action"],
    },
  },
  {
    id: "public-wallet-risk-lookup",
    path: "/v1/x402/address-risk/lookup",
    price: "$0.10",
    description:
      "Look up one wallet against a curated public-source sanctions, scam, ransomware, and stablecoin blacklist intelligence feed.",
    input: { chain: "ETH", address: PAY_TO },
    inputSchema: {
      properties: {
        chain: {
          type: "string",
          enum: ["ETH"],
          description: "Chain namespace for the address. Current hosted feed supports ETH/EVM labels.",
        },
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Wallet or contract address to screen.",
        },
      },
      required: ["chain", "address"],
    },
  },
  {
    id: "public-wallet-risk-snapshot",
    path: "/v1/x402/address-risk/snapshot",
    price: "$499.00",
    description:
      "Download the full source-attributed public wallet risk intelligence snapshot as JSONL.",
    input: {},
    inputSchema: {
      properties: {},
      required: [],
    },
  },
  {
    id: "public-wallet-risk-sample",
    path: "/v1/x402/address-risk/sample",
    price: "$0.005",
    description:
      "Return a small paid sample of the public wallet risk intelligence schema, provenance, and label format before buying lookup or dataset downloads.",
    input: { limit: "5" },
    inputSchema: {
      properties: {
        limit: {
          type: "string",
          pattern: "^[1-9]$|^10$",
          description: "Number of sample JSONL records to return, from 1 to 10. Defaults to 5.",
        },
      },
      required: [],
    },
  },
  {
    id: "public-wallet-risk-delta",
    path: "/v1/x402/address-risk/delta",
    price: "$99.00",
    description:
      "Download the latest or requested wallet risk intelligence batch delta as JSONL.",
    input: { batch_key: "2026-W27" },
    inputSchema: {
      properties: {
        batch_key: {
          type: "string",
          pattern: "^20[0-9]{2}-W[0-9]{2}$",
          description: "Batch key to download. Defaults to the latest available batch.",
        },
      },
      required: [],
    },
  },
  {
    id: "sumsub-case-management-evidence",
    path: "/v1/x402/sumsub/case-management-evidence",
    price: "$0.05",
    description:
      "Return the Sumsub case-management evidence contract for review state, escalation, and audit workflows.",
    input: { case_id: "case_demo_001", reference_id: "agent-payment-review-1" },
    inputSchema: {
      properties: {
        case_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Sumsub case id or sandbox fixture reference.",
        },
        reference_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Internal SignGate request, applicant, or transaction reference.",
        },
      },
      required: ["case_id"],
    },
  },
  {
    id: "sumsub-db-net-evidence",
    path: "/v1/x402/sumsub/db-net-evidence",
    price: "$0.03",
    description:
      "Return the Sumsub DB_NET identity database evidence contract for verified-principal and mandate checks.",
    input: { applicant_id: "applicant_demo_001", principal_reference: "merchant_demo" },
    inputSchema: {
      properties: {
        applicant_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Sumsub applicant id or sandbox fixture reference.",
        },
        principal_reference: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Buyer, merchant, or responsible principal reference.",
        },
      },
      required: ["applicant_id"],
    },
  },
  {
    id: "sumsub-kyt-evidence",
    path: "/v1/x402/sumsub/kyt-evidence",
    price: "$0.03",
    description:
      "Return the Sumsub KYT transaction evidence contract for crypto transaction and counterparty risk.",
    input: { transaction_id: "tx_demo_001", asset: "USDC", chain: "base" },
    inputSchema: {
      properties: {
        transaction_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Sumsub transaction id, SignGate transaction reference, or sandbox fixture id.",
        },
        asset: { type: "string", pattern: "^[A-Za-z0-9._:-]{2,32}$" },
        chain: { type: "string", pattern: "^[A-Za-z0-9._:-]{2,64}$" },
      },
      required: ["transaction_id"],
    },
  },
  {
    id: "sumsub-payment-method-crypto-evidence",
    path: "/v1/x402/sumsub/payment-method-crypto-evidence",
    price: "$0.03",
    description:
      "Return the Sumsub crypto payment-method evidence contract for wallet ownership and payment method risk.",
    input: { applicant_id: "applicant_demo_001", wallet: PAY_TO },
    inputSchema: {
      properties: {
        applicant_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Sumsub applicant id or sandbox fixture reference.",
        },
        wallet: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Crypto wallet/payment method address.",
        },
      },
      required: ["applicant_id", "wallet"],
    },
  },
  {
    id: "sumsub-poa-evidence",
    path: "/v1/x402/sumsub/poa-evidence",
    price: "$0.03",
    description:
      "Return the Sumsub proof-of-address evidence contract for residency, jurisdiction, and onboarding policy gates.",
    input: { applicant_id: "applicant_demo_001", jurisdiction: "HK" },
    inputSchema: {
      properties: {
        applicant_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Sumsub applicant id or sandbox fixture reference.",
        },
        jurisdiction: {
          type: "string",
          pattern: "^[A-Z]{2}$",
          description: "ISO-3166 country code used by the policy gate.",
        },
      },
      required: ["applicant_id"],
    },
  },
  {
    id: "sumsub-crystal-crypto-risk-evidence",
    path: "/v1/x402/sumsub/crystal-crypto-risk-evidence",
    price: "$0.05",
    description:
      "Return the Sumsub Crystal crypto risk scoring evidence contract for high-impact crypto transfers.",
    input: { wallet: PAY_TO, transaction_reference: "crystal_demo_001" },
    inputSchema: {
      properties: {
        wallet: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Wallet or crypto counterparty address.",
        },
        transaction_reference: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Crypto transaction or SignGate request reference.",
        },
      },
      required: ["wallet"],
    },
  },
  {
    id: "sumsub-travel-rule-evidence",
    path: "/v1/x402/sumsub/travel-rule-evidence",
    price: "$0.05",
    description:
      "Return the Sumsub Travel Rule evidence contract for originator, beneficiary, and VASP compliance checks.",
    input: {
      transfer_reference: "travel_rule_demo_001",
      originator: "merchant_demo",
      beneficiary: "vendor_demo",
    },
    inputSchema: {
      properties: {
        transfer_reference: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Crypto transfer, VASP, or SignGate payment reference.",
        },
        originator: { type: "string", pattern: "^[A-Za-z0-9._:-]{1,128}$" },
        beneficiary: { type: "string", pattern: "^[A-Za-z0-9._:-]{1,128}$" },
      },
      required: ["transfer_reference"],
    },
  },
  {
    id: "sumsub-watchlist-aml-evidence",
    path: "/v1/x402/sumsub/watchlist-aml-evidence",
    price: "$0.05",
    description:
      "Return the Sumsub watchlist and AML evidence contract for sanctions, PEP, watchlist, and adverse-media screening.",
    input: { applicant_id: "applicant_demo_001", counterparty_reference: "merchant_demo" },
    inputSchema: {
      properties: {
        applicant_id: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Sumsub applicant id or sandbox fixture reference.",
        },
        counterparty_reference: {
          type: "string",
          pattern: "^[A-Za-z0-9._:-]{1,128}$",
          description: "Merchant, buyer, VASP, or counterparty reference.",
        },
      },
      required: ["applicant_id"],
    },
  },
  {
    id: "agent-capability-security-preflight",
    path: "/v1/x402/agent/capability-security-preflight",
    price: "$0.100",
    description:
      "Bundle Agent Card, repository, package, domain, OpenAPI, and x402 endpoint preflight checks before an agent installs or delegates to a capability.",
    input: {
      target_type: "agent",
      identifier: SERVICE_ORIGIN,
      agent_card_url: SERVICE_ORIGIN,
      github_owner: "cloudflare",
      github_repo: "workers-sdk",
      npm_package: "express",
      npm_version: "latest",
      domain: "github.com",
      openapi_url: `${SERVICE_ORIGIN}/openapi.json`,
      x402_url: `${SERVICE_ORIGIN}/v1/x402/base/alpha-risk`,
    },
    inputSchema: {
      properties: {
        target_type: {
          type: "string",
          enum: ["agent", "package", "repository", "api", "capability"],
          description: "Capability type being evaluated.",
        },
        identifier: {
          type: "string",
          minLength: 1,
          maxLength: 512,
          description: "Human-readable package, repository, agent, API, or capability identifier.",
        },
        agent_card_url: { type: "string", pattern: "^https?://", maxLength: 2048 },
        github_owner: {
          type: "string",
          pattern: "^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$",
        },
        github_repo: { type: "string", pattern: "^[A-Za-z0-9._-]{1,100}$" },
        npm_package: { type: "string", minLength: 1, maxLength: 214 },
        npm_version: { type: "string", minLength: 1, maxLength: 80 },
        domain: {
          type: "string",
          pattern:
            "^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,63}$",
        },
        openapi_url: { type: "string", pattern: "^https?://", maxLength: 2048 },
        x402_url: { type: "string", pattern: "^https?://", maxLength: 2048 },
      },
      required: ["target_type", "identifier"],
    },
  },
  {
    id: "x402-transaction-preflight-lite",
    path: "/v1/x402/transaction/preflight-lite",
    price: "$0.150",
    description:
      "Low-friction x402 transaction preflight price test with one explainable decision and bundled Base evidence.",
    input: {
      merchant_address: PAY_TO,
      wallet_address: PAY_TO,
      tx: "0xb2d1308a0df026083e5793106af4ed2342d4b517d42935e05c1fb2f91544707f",
      expected_recipient: PAY_TO,
      expected_amount: "0.02",
      token: USDC,
      owner: PAY_TO,
      spender: PAY_TO,
      contract_address: "0x4200000000000000000000000000000000000006",
      from_block: "47600000",
      gas_limit: "21000",
    },
    inputSchema: {
      properties: {
        merchant_address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Merchant or payment recipient to trust-score.",
        },
        wallet_address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Buyer, merchant, or workflow wallet to inspect.",
        },
        tx: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{64}$",
          description: "Optional Base transaction hash for receipt and payment proof checks.",
        },
        expected_recipient: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
          description: "Expected USDC recipient for payment proof.",
        },
        expected_amount: {
          type: "string",
          pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$",
          description: "Expected USDC amount for payment proof.",
        },
        token: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        owner: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        spender: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        contract_address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        from_block: { type: "string", pattern: "^[0-9]+$" },
        gas_limit: { type: "string", pattern: "^[0-9]+$" },
        since: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}T.+Z$",
          description: "Wallet activity lower bound. Defaults to 30 days ago.",
        },
      },
      required: ["merchant_address"],
    },
  },
  {
    id: "x402-transaction-preflight",
    path: "/v1/x402/transaction/preflight",
    price: "$0.250",
    description:
      "Explainable x402 transaction preflight: return ALLOW, REQUIRE_REVIEW, or DENY with bundled Base evidence before an agent pays.",
    input: {
      merchant_address: PAY_TO,
      wallet_address: PAY_TO,
      tx: "0xb2d1308a0df026083e5793106af4ed2342d4b517d42935e05c1fb2f91544707f",
      expected_recipient: PAY_TO,
      expected_amount: "0.02",
      token: USDC,
      owner: PAY_TO,
      spender: PAY_TO,
      contract_address: "0x4200000000000000000000000000000000000006",
      from_block: "47600000",
      gas_limit: "21000",
    },
    inputSchema: {
      properties: {
        merchant_address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        wallet_address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        tx: { type: "string", pattern: "^0x[a-fA-F0-9]{64}$" },
        expected_recipient: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        expected_amount: { type: "string", pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$" },
        token: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        owner: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        spender: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        contract_address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        from_block: { type: "string", pattern: "^[0-9]+$" },
        gas_limit: { type: "string", pattern: "^[0-9]+$" },
        since: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T.+Z$" },
      },
      required: ["merchant_address"],
    },
  },
  {
    id: "x402-transaction-preflight-plus",
    path: "/v1/x402/transaction/preflight-plus",
    price: "$0.500",
    description:
      "Higher-assurance x402 transaction preflight price test for enterprise, compliance, or high-value agent payments.",
    input: {
      merchant_address: PAY_TO,
      wallet_address: PAY_TO,
      tx: "0xb2d1308a0df026083e5793106af4ed2342d4b517d42935e05c1fb2f91544707f",
      expected_recipient: PAY_TO,
      expected_amount: "0.02",
      token: USDC,
      owner: PAY_TO,
      spender: PAY_TO,
      contract_address: "0x4200000000000000000000000000000000000006",
      from_block: "47600000",
      gas_limit: "21000",
    },
    inputSchema: {
      properties: {
        merchant_address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        wallet_address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        tx: { type: "string", pattern: "^0x[a-fA-F0-9]{64}$" },
        expected_recipient: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        expected_amount: { type: "string", pattern: "^[0-9]+(?:\\.[0-9]{1,6})?$" },
        token: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        owner: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        spender: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        contract_address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        from_block: { type: "string", pattern: "^[0-9]+$" },
        gas_limit: { type: "string", pattern: "^[0-9]+$" },
        since: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T.+Z$" },
      },
      required: ["merchant_address"],
    },
  },
];
const PAID_PATHS = new Set(PRODUCTS.map(product => product.path));
const PRODUCTS_BY_ID = Object.fromEntries(PRODUCTS.map(product => [product.id, product]));
const PRODUCTS_BY_PATH = Object.fromEntries(PRODUCTS.map(product => [product.path, product]));
const SUMSUB_PRODUCT_TO_SERVICE_ID = {
  "sumsub-case-management-evidence": "sumsub.case_management",
  "sumsub-db-net-evidence": "sumsub.db_net",
  "sumsub-kyt-evidence": "sumsub.kyt",
  "sumsub-payment-method-crypto-evidence": "sumsub.payment_method_crypto",
  "sumsub-poa-evidence": "sumsub.poa",
  "sumsub-crystal-crypto-risk-evidence": "sumsub.crystal_crypto_risk",
  "sumsub-travel-rule-evidence": "sumsub.travel_rule",
  "sumsub-watchlist-aml-evidence": "sumsub.watchlists",
};
const SUMSUB_EVIDENCE_PRODUCT_IDS = Object.keys(SUMSUB_PRODUCT_TO_SERVICE_ID);
const SUMSUB_SANDBOX_ALLOWED_CHECKS = {
  CASE_MANAGEMENT: "Case Management",
  DB_NET: "Database Network",
  KYT: "KYT",
  PAYMENT_METHOD_CRYPTO: "Payment Method Crypto",
  POA: "Proof of Address",
  TM_CRYPTO_RISK_SCORING_CRYSTAL: "Crystal crypto risk scoring",
  TRAVEL_RULE: "Travel Rule",
  WATCHLISTS: "Watchlists",
};
const PAYMENT_GUARD_POLICY_PATH = "/v1/x402/payment-guard/policies";
const PAYMENT_GUARD_POLICY_MANAGE_PATH =
  "/v1/payment-guard/policies/manage";
const PAYMENT_GUARD_LIFECYCLE_PATH = "/v1/payment-guard/lifecycle";
const PAYMENT_GUARD_STATUS_PATH = "/v1/payment-guard/status";
const PAYMENT_GUARD_APPROVAL_PATH = "/v1/payment-guard/approvals";
const PAYMENT_GUARD_DELIVERY_PATH = "/v1/payment-guard/delivery";
const PAYMENT_GUARD_WEBHOOK_PATH = "/v1/payment-guard/webhooks";
const PAYMENT_GUARD_OUTPUT = {
  example: {
    product: "agent-payment-guard",
    decision: "ALLOW",
    risk_score: 4,
    payment: {
      network: BASE_MAINNET,
      amount_usdc: "0.01",
      pay_to: PAY_TO,
    },
    policy: {
      budget_enforced: true,
      replay_protection: true,
      human_approval: true,
      mandate_enforced: true,
    },
    evidence: {
      merchant_risk: "low",
      domain_risk: "low",
      transaction_simulation: "success",
    },
    reasons: [],
  },
  schema: {
    properties: {
      product: { type: "string" },
      decision: { type: "string", enum: ["ALLOW", "REVIEW", "BLOCK"] },
      risk_score: { type: "number" },
      payment: { type: "object" },
      policy: { type: "object" },
      budget: { type: "object" },
      reasons: { type: "array" },
      evidence: { type: "object" },
      decision_token: { type: "string" },
    },
    required: ["product", "decision", "risk_score", "payment", "reasons"],
  },
};
const PAYMENT_GUARD_EVALUATE_BODY_EXAMPLE = {
  url: "https://x402.twit.sh/tweets/by/id?id=1110302988",
  session_id: "demo-session",
  request_id: "demo-request-1",
  max_single_usdc: "0.10",
  session_budget_usdc: "1.00",
  daily_budget_usdc: "5.00",
};
const PAYMENT_GUARD_EVALUATE_BODY_SCHEMA = {
  type: "object",
  properties: {
    url: { type: "string", format: "uri" },
    session_id: { type: "string" },
    request_id: { type: "string" },
    profile_id: { type: "string" },
    agent_token: { type: "string" },
    max_single_usdc: { type: "string" },
    session_budget_usdc: { type: "string" },
    daily_budget_usdc: { type: "string" },
    reservation_ttl_seconds: {
      type: "integer",
      minimum: 30,
      maximum: 3600,
    },
    retention_days: {
      type: "integer",
      minimum: 1,
      maximum: 365,
    },
    human_review_above_usdc: { type: "string" },
    fail_closed: { type: "boolean", default: true },
    allowed_domains: {
      oneOf: [
        { type: "string" },
        { type: "array", items: { type: "string" } },
      ],
    },
    allowed_tools: {
      oneOf: [
        { type: "string" },
        { type: "array", items: { type: "string" } },
      ],
    },
    allowed_purposes: {
      oneOf: [
        { type: "string" },
        { type: "array", items: { type: "string" } },
      ],
    },
    active_from_hour_utc: {
      type: "integer",
      minimum: 0,
      maximum: 23,
    },
    active_until_hour_utc: {
      type: "integer",
      minimum: 1,
      maximum: 24,
    },
    tool_id: { type: "string" },
    purpose: { type: "string" },
    allow_pay_to: { type: "string" },
    block_pay_to: { type: "string" },
    to: { type: "string" },
    data: { type: "string" },
    value: { type: "string" },
  },
  required: ["url", "session_id", "request_id"],
};
const PAYMENT_GUARD_POLICY_BODY_EXAMPLE = {
  name: "demo-agent-policy",
  max_single_usdc: "0.10",
  session_budget_usdc: "1.00",
  daily_budget_usdc: "5.00",
  fail_closed: true,
};
const PAYMENT_GUARD_POLICY_BODY_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    max_single_usdc: { type: "string" },
    session_budget_usdc: { type: "string" },
    daily_budget_usdc: { type: "string" },
    reservation_ttl_seconds: {
      type: "integer",
      minimum: 30,
      maximum: 3600,
    },
    human_review_above_usdc: { type: "string" },
    fail_closed: { type: "boolean" },
    retention_days: {
      type: "integer",
      minimum: 1,
      maximum: 365,
    },
    allowed_domains: {
      oneOf: [
        { type: "string" },
        { type: "array", items: { type: "string" } },
      ],
    },
    allowed_tools: {
      oneOf: [
        { type: "string" },
        { type: "array", items: { type: "string" } },
      ],
    },
    allowed_purposes: {
      oneOf: [
        { type: "string" },
        { type: "array", items: { type: "string" } },
      ],
    },
    active_from_hour_utc: {
      type: "integer",
      minimum: 0,
      maximum: 23,
    },
    active_until_hour_utc: {
      type: "integer",
      minimum: 1,
      maximum: 24,
    },
    webhook_url: { type: "string", format: "uri" },
  },
};
const PAYMENT_GUARD_MCP_PATH = "/mcp";
const INTENT_VERIFY_PATH = "/v1/intents/verify";
const PAYMENT_PREFLIGHT_PATH = "/v1/payments/preflight";
const PAYMENT_AUTHORIZE_PATH = "/v1/payments/authorize";
const PAYMENT_GUARD_PATHS = new Set([
  PAYMENT_GUARD_POLICY_PATH,
  PAYMENT_GUARD_POLICY_MANAGE_PATH,
  PAYMENT_GUARD_LIFECYCLE_PATH,
  PAYMENT_GUARD_STATUS_PATH,
  PAYMENT_GUARD_APPROVAL_PATH,
  PAYMENT_GUARD_DELIVERY_PATH,
  PAYMENT_GUARD_WEBHOOK_PATH,
  PAYMENT_GUARD_MCP_PATH,
  INTENT_VERIFY_PATH,
  PAYMENT_PREFLIGHT_PATH,
  PAYMENT_AUTHORIZE_PATH,
]);
const MARKETPLACE_HIDDEN_OPENAPI_PATHS = [
  PAYMENT_GUARD_POLICY_MANAGE_PATH,
  PAYMENT_GUARD_LIFECYCLE_PATH,
  PAYMENT_GUARD_STATUS_PATH,
  PAYMENT_GUARD_APPROVAL_PATH,
  PAYMENT_GUARD_DELIVERY_PATH,
  PAYMENT_GUARD_WEBHOOK_PATH,
  PAYMENT_GUARD_MCP_PATH,
  INTENT_VERIFY_PATH,
  PAYMENT_PREFLIGHT_PATH,
  PAYMENT_AUTHORIZE_PATH,
];
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const TX_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const UPSTREAM_TIMEOUT_MS = 10_000;
const ADDRESS_RISK_MANIFEST_KEY = "address-risk:manifest";
const ADDRESS_RISK_SNAPSHOT_KEY = "address-risk:snapshot";
const ADDRESS_RISK_DELTA_PREFIX = "address-risk:delta:";
const ADDRESS_RISK_DEFAULT_BATCH = "2026-W27";

class ResilientFacilitatorClient {
  constructor(client) {
    this.client = client;
  }

  verify(paymentPayload, paymentRequirements) {
    return this.client.verify(paymentPayload, paymentRequirements);
  }

  settle(paymentPayload, paymentRequirements) {
    return this.client.settle(paymentPayload, paymentRequirements);
  }

  async getSupported() {
    try {
      return await this.client.getSupported();
    } catch (error) {
      console.warn(
        `Facilitator supported lookup failed; using Base exact fallback: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return STATIC_FACILITATOR_SUPPORT;
    }
  }
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=60" : "no-store",
      "access-control-allow-origin": "*",
      ...headers,
    },
  });
}

async function addressRiskManifest(env) {
  const manifest = await env.ADDRESS_RISK_KV?.get(ADDRESS_RISK_MANIFEST_KEY, {
    type: "json",
  });
  if (!manifest) throw new Error("address_risk_manifest_unavailable");
  return manifest;
}

async function addressRiskLookup(env, chain, address) {
  const normalizedChain = (chain || "ETH").toUpperCase();
  const normalizedAddress = (address || "").toLowerCase();
  if (normalizedChain !== "ETH" || !ADDRESS_PATTERN.test(normalizedAddress)) {
    return { error: "invalid_address_risk_lookup_input" };
  }
  const manifest = await addressRiskManifest(env);
  const key = `label:${normalizedChain}:${normalizedAddress}`;
  const hit = await env.ADDRESS_RISK_KV?.get(key, { type: "json" });
  return {
    product: "public-wallet-risk-lookup",
    schema_version: "1.0",
    chain: normalizedChain,
    address: normalizedAddress,
    hit: Boolean(hit?.hit),
    risk_score: hit?.risk_score ?? 0,
    risk_level: hit?.risk_level ?? "none",
    labels: hit?.labels ?? [],
    provenance: {
      ...(hit?.provenance ?? { source_count: 0, source_keys: [] }),
      manifest_sha256: manifest.files?.snapshot?.sha256 ?? null,
      batch_key: manifest.batch_key ?? ADDRESS_RISK_DEFAULT_BATCH,
    },
    dataset: {
      active_labels: manifest.active_labels,
      source_count: manifest.source_count,
      risk_type_counts: manifest.risk_type_counts,
    },
    limitations: manifest.limitations ?? [],
  };
}

async function addressRiskSample(env, origin, limit = 5) {
  const manifest = await addressRiskManifest(env);
  const cappedLimit = Math.max(1, Math.min(10, Number(limit) || 5));
  const value = await env.ADDRESS_RISK_KV?.get(ADDRESS_RISK_SNAPSHOT_KEY, {
    type: "arrayBuffer",
  });
  if (!value) throw new Error("address_risk_snapshot_unavailable");
  const text = bytesToText(new Uint8Array(value));
  const records = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      if (record?.type === "metadata") continue;
      records.push(record);
      if (records.length >= cappedLimit) break;
    } catch {
      continue;
    }
  }
  return {
    product: "public-wallet-risk-sample",
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    sample_size: records.length,
    records,
    dataset: {
      active_labels: manifest.active_labels,
      source_count: manifest.source_count,
      risk_type_counts: manifest.risk_type_counts,
      batch_key: manifest.batch_key ?? ADDRESS_RISK_DEFAULT_BATCH,
      snapshot_sha256: manifest.files?.snapshot?.sha256 ?? null,
      delta_sha256: manifest.files?.delta?.sha256 ?? null,
    },
    paid_next_steps: {
      lookup: `${origin}${PRODUCTS_BY_ID["public-wallet-risk-lookup"].path}?chain=ETH&address=0x...&campaign=sample`,
      snapshot: `${origin}${PRODUCTS_BY_ID["public-wallet-risk-snapshot"].path}?campaign=sample`,
      delta: `${origin}${PRODUCTS_BY_ID["public-wallet-risk-delta"].path}?batch_key=${encodeURIComponent(manifest.batch_key ?? ADDRESS_RISK_DEFAULT_BATCH)}&campaign=sample`,
    },
    limitations: manifest.limitations ?? [],
  };
}

async function publicWalletRiskManifest(env, origin) {
  const manifest = await addressRiskManifest(env);
  return {
    schema_version: "1.0",
    name: "Public Wallet Risk Intelligence",
    description:
      "Source-attributed wallet risk lookup, paid sample, full JSONL snapshot, and batch delta for KYT and AML screening.",
    origin,
    product_page: `${origin}/wallet-risk`,
    openapi_url: `${origin}/openapi.json`,
    ai_buyer_catalog_url: `${origin}/catalog.json`,
    current_batch: manifest.batch_key ?? ADDRESS_RISK_DEFAULT_BATCH,
    dataset: {
      active_labels: manifest.active_labels,
      source_count: manifest.source_count,
      risk_type_counts: manifest.risk_type_counts,
      files: manifest.files ?? {},
      limitations: manifest.limitations ?? [],
    },
    paid_resources: {
      lookup: {
        method: "GET",
        path: PRODUCTS_BY_ID["public-wallet-risk-lookup"].path,
        price_usdc: PRODUCTS_BY_ID["public-wallet-risk-lookup"].price,
        example: `${origin}${PRODUCTS_BY_ID["public-wallet-risk-lookup"].path}?chain=ETH&address=0x...&campaign=manifest`,
      },
      sample: {
        method: "GET",
        path: PRODUCTS_BY_ID["public-wallet-risk-sample"].path,
        price_usdc: PRODUCTS_BY_ID["public-wallet-risk-sample"].price,
        example: `${origin}${PRODUCTS_BY_ID["public-wallet-risk-sample"].path}?limit=5&campaign=manifest`,
      },
      snapshot: {
        method: "GET",
        path: PRODUCTS_BY_ID["public-wallet-risk-snapshot"].path,
        price_usdc: PRODUCTS_BY_ID["public-wallet-risk-snapshot"].price,
        example: `${origin}${PRODUCTS_BY_ID["public-wallet-risk-snapshot"].path}?campaign=manifest`,
      },
      delta: {
        method: "GET",
        path: PRODUCTS_BY_ID["public-wallet-risk-delta"].path,
        price_usdc: PRODUCTS_BY_ID["public-wallet-risk-delta"].price,
        example: `${origin}${PRODUCTS_BY_ID["public-wallet-risk-delta"].path}?batch_key=${encodeURIComponent(manifest.batch_key ?? ADDRESS_RISK_DEFAULT_BATCH)}&campaign=manifest`,
      },
    },
    response_schema_hint: {
      lookup:
        "JSON object with hit, risk_score, risk_level, labels[], provenance, dataset counts, and limitations.",
      sample:
        "JSON object with sample records from the snapshot, dataset counts, paid_next_steps, and limitations.",
      snapshot:
        "application/x-ndjson full active-label snapshot with source attribution and evidence fields.",
      delta:
        "application/x-ndjson batch delta with label changes and on-chain blacklist event metadata.",
    },
    recommended_campaigns: [
      "x402scan-profile",
      "twitter-thread",
      "agentcash-community",
    ],
  };
}

async function addressRiskFileResponse(env, key, filename) {
  const value = await env.ADDRESS_RISK_KV?.get(key, { type: "arrayBuffer" });
  if (!value) return json({ error: "address_risk_file_not_found", key }, 404);
  return new Response(value, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}

async function fetchJson(
  url,
  fetchImpl = fetch,
  timeoutMs = UPSTREAM_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        "user-agent": "BaseAgentPreflight/0.1",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Blockscout returned HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function rpcCall(method, params, fetchImpl = fetch) {
  const failures = [];
  for (const rpc of BASE_RPCS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const response = await fetchImpl(rpc, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "user-agent": "BaseAgentPreflight/0.3",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (payload.error) {
        throw new Error(payload.error.message ?? "request failed");
      }
      return payload.result;
    } catch (error) {
      failures.push(
        `${new URL(rpc).hostname}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`All Base RPC providers failed (${failures.join("; ")})`);
}

async function rpcBatchCall(calls, fetchImpl = fetch) {
  const failures = [];
  for (const rpc of BASE_RPCS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const response = await fetchImpl(rpc, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "user-agent": "BaseAgentPreflight/0.4",
        },
        body: JSON.stringify(
          calls.map((call, index) => ({
            jsonrpc: "2.0",
            id: index + 1,
            method: call.method,
            params: call.params,
          })),
        ),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error("invalid batch response");
      const ordered = [...payload].sort((a, b) => Number(a.id) - Number(b.id));
      const failed = ordered.find(item => item.error);
      if (failed) throw new Error(failed.error.message ?? "batch request failed");
      if (ordered.length !== calls.length) throw new Error("incomplete batch response");
      return ordered.map(item => item.result);
    } catch (error) {
      failures.push(
        `${new URL(rpc).hostname}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`All Base RPC batch providers failed (${failures.join("; ")})`);
}

function parseCount(value) {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function encodeAddressWord(address) {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function formatUnits(value, decimals) {
  const safeDecimals = Math.max(0, Math.min(Number(decimals ?? 0), 36));
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const raw = absolute.toString().padStart(safeDecimals + 1, "0");
  const whole = safeDecimals ? raw.slice(0, -safeDecimals) : raw;
  const fraction = safeDecimals
    ? raw.slice(-safeDecimals).replace(/0+$/, "")
    : "";
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function summarizeTransfer(item) {
  return {
    timestamp: item.timestamp ?? null,
    direction: item.to?.hash?.toLowerCase() === item._subject ? "in" : "out",
    from: item.from?.hash ?? null,
    to: item.to?.hash ?? null,
    token: {
      symbol: item.token?.symbol ?? null,
      name: item.token?.name ?? null,
      contract: item.token?.address_hash ?? null,
      reputation: item.token?.reputation ?? null,
    },
    amount_atomic: item.total?.value ?? null,
    decimals: Number(item.total?.decimals ?? item.token?.decimals ?? 0),
  };
}

export function buildAddressPreflight({
  address,
  profile,
  counters,
  transfers,
  fetchedAt = new Date().toISOString(),
}) {
  const normalized = address.toLowerCase();
  const recentTransfers = (transfers?.items ?? []).slice(0, 10).map(item =>
    summarizeTransfer({ ...item, _subject: normalized }),
  );
  const flags = [];
  let score = 0;

  if (profile.is_scam) {
    flags.push({
      code: "BLOCKSCOUT_SCAM_FLAG",
      severity: "critical",
      detail: "Blockscout marks this address as scam-associated.",
    });
    score += 90;
  }
  if (profile.reputation && profile.reputation !== "ok") {
    flags.push({
      code: "ADDRESS_REPUTATION_NOT_OK",
      severity: "high",
      detail: `Blockscout reputation is ${profile.reputation}.`,
    });
    score += 50;
  }
  if (profile.is_contract && !profile.is_verified) {
    flags.push({
      code: "UNVERIFIED_CONTRACT",
      severity: "medium",
      detail: "The address is a contract without verified source code.",
    });
    score += 20;
  }
  if (profile.proxy_type && !profile.implementations?.length) {
    flags.push({
      code: "UNRESOLVED_PROXY",
      severity: "medium",
      detail: `Proxy type ${profile.proxy_type} has no resolved implementation metadata.`,
    });
    score += 15;
  }

  const suspiciousTokens = recentTransfers.filter(transfer =>
    ["scam", "spam", "suspicious"].includes(
      String(transfer.token.reputation ?? "").toLowerCase(),
    ),
  );
  if (suspiciousTokens.length) {
    flags.push({
      code: "SUSPICIOUS_TOKEN_ACTIVITY",
      severity: "medium",
      detail: `${suspiciousTokens.length} recent token transfer(s) have adverse reputation metadata.`,
    });
    score += Math.min(30, suspiciousTokens.length * 10);
  }

  const transactionCount = parseCount(counters.transactions_count);
  const transferCount = parseCount(counters.token_transfers_count);
  if (transactionCount === 0 && transferCount === 0) {
    flags.push({
      code: "NO_OBSERVED_HISTORY",
      severity: "info",
      detail: "No transaction or token-transfer history is visible on Base.",
    });
    score += 5;
  }

  score = Math.min(score, 100);
  const riskLevel =
    score >= 70 ? "high" : score >= 15 ? "medium" : "low";

  return {
    product: "base-address-preflight",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address: profile.hash ?? address,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: riskLevel,
      risk_score: score,
      flags,
      decision_hint:
        riskLevel === "high"
          ? "Do not automate payment without independent review."
          : riskLevel === "medium"
            ? "Apply tighter payment limits and verify the counterparty."
            : "No major public warning was found; this is not a guarantee of safety.",
    },
    identity: {
      type: profile.is_contract ? "contract" : "eoa",
      is_contract: Boolean(profile.is_contract),
      is_verified_contract: Boolean(profile.is_verified),
      proxy_type: profile.proxy_type ?? null,
      implementations: profile.implementations ?? [],
      name: profile.name ?? null,
      reputation: profile.reputation ?? null,
      is_scam: Boolean(profile.is_scam),
    },
    activity: {
      transactions_count: transactionCount,
      token_transfers_count: transferCount,
      gas_usage_count: parseCount(counters.gas_usage_count),
      recent_token_transfers: recentTransfers,
    },
    provenance: {
      provider: "Blockscout Base",
      address_url: `${BLOCKSCOUT}/address/${address}`,
      api_endpoints: [
        `${BLOCKSCOUT}/api/v2/addresses/${address}`,
        `${BLOCKSCOUT}/api/v2/addresses/${address}/counters`,
        `${BLOCKSCOUT}/api/v2/addresses/${address}/token-transfers?type=ERC-20`,
      ],
    },
    limitations: [
      "Public-chain heuristics cannot prove ownership, intent, solvency, or future behavior.",
      "Absence of a warning is not evidence that an address is safe.",
      "Token spam can be sent to an address without the owner's participation.",
    ],
  };
}

export async function addressPreflight(address, fetchImpl = fetch) {
  const encoded = encodeURIComponent(address);
  const [profile, counters, transfers] = await Promise.all([
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}`, fetchImpl),
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}/counters`, fetchImpl),
    fetchJson(
      `${BLOCKSCOUT}/api/v2/addresses/${encoded}/token-transfers?type=ERC-20`,
      fetchImpl,
    ),
  ]);
  return buildAddressPreflight({ address, profile, counters, transfers });
}

export function buildTokenPreflight({
  token,
  profile,
  tokenInfo,
  dexPairs,
  fetchedAt = new Date().toISOString(),
}) {
  const basePairs = (dexPairs ?? [])
    .filter(pair => pair.chainId === "base")
    .sort(
      (a, b) =>
        Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0),
    );
  const bestPair = basePairs[0] ?? null;
  const liquidityUsd = Number(bestPair?.liquidity?.usd ?? 0);
  const holdersCount = parseCount(tokenInfo.holders_count);
  const flags = [];
  let score = 0;

  if (!profile.is_contract) {
    flags.push({
      code: "NOT_A_CONTRACT",
      severity: "critical",
      detail: "The supplied address is not identified as a contract.",
    });
    score += 90;
  }
  if (profile.is_scam || tokenInfo.reputation === "scam") {
    flags.push({
      code: "PUBLIC_SCAM_FLAG",
      severity: "critical",
      detail: "Public Blockscout metadata marks the token or contract as scam-associated.",
    });
    score += 90;
  }
  if (profile.is_contract && !profile.is_verified) {
    flags.push({
      code: "UNVERIFIED_TOKEN_CONTRACT",
      severity: "high",
      detail: "The token contract source code is not verified on Blockscout.",
    });
    score += 35;
  }
  if (
    tokenInfo.reputation &&
    !["ok", "neutral"].includes(String(tokenInfo.reputation).toLowerCase())
  ) {
    flags.push({
      code: "TOKEN_REPUTATION_NOT_OK",
      severity: "high",
      detail: `Token reputation is ${tokenInfo.reputation}.`,
    });
    score += 40;
  }
  if (holdersCount > 0 && holdersCount < 100) {
    flags.push({
      code: "LOW_HOLDER_COUNT",
      severity: "medium",
      detail: `Only ${holdersCount} holder(s) are reported.`,
    });
    score += 15;
  }
  if (!bestPair) {
    flags.push({
      code: "NO_BASE_DEX_PAIR",
      severity: "medium",
      detail: "DexScreener returned no Base liquidity pair for this token.",
    });
    score += 20;
  } else if (liquidityUsd < 10_000) {
    flags.push({
      code: "LOW_DEX_LIQUIDITY",
      severity: "medium",
      detail: `The deepest observed Base pair has about $${liquidityUsd.toFixed(2)} liquidity.`,
    });
    score += 20;
  }

  score = Math.min(score, 100);
  const riskLevel =
    score >= 70 ? "high" : score >= 25 ? "medium" : score > 0 ? "low" : "low";

  return {
    product: "base-token-preflight",
    schema_version: "1.0",
    network: BASE_MAINNET,
    token,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: riskLevel,
      risk_score: score,
      flags,
      decision_hint:
        riskLevel === "high"
          ? "Do not automate a trade without independent contract review."
          : riskLevel === "medium"
            ? "Use strict size and slippage limits and verify liquidity independently."
            : "No major public warning was found; token behavior is not guaranteed.",
    },
    contract: {
      is_contract: Boolean(profile.is_contract),
      is_verified: Boolean(profile.is_verified),
      is_scam: Boolean(profile.is_scam),
      proxy_type: profile.proxy_type ?? null,
      implementations: profile.implementations ?? [],
    },
    token_metadata: {
      name: tokenInfo.name ?? null,
      symbol: tokenInfo.symbol ?? null,
      type: tokenInfo.type ?? null,
      decimals: Number(tokenInfo.decimals ?? 0),
      holders_count: holdersCount,
      total_supply_atomic: tokenInfo.total_supply ?? null,
      reputation: tokenInfo.reputation ?? null,
      exchange_rate_usd: tokenInfo.exchange_rate ?? null,
    },
    dex_liquidity: {
      pair_count_on_base: basePairs.length,
      best_pair: bestPair
        ? {
            dex: bestPair.dexId ?? null,
            pair_address: bestPair.pairAddress ?? null,
            url: bestPair.url ?? null,
            liquidity_usd: liquidityUsd,
            price_usd: bestPair.priceUsd ?? null,
            volume_24h_usd: Number(bestPair.volume?.h24 ?? 0),
            buys_24h: Number(bestPair.txns?.h24?.buys ?? 0),
            sells_24h: Number(bestPair.txns?.h24?.sells ?? 0),
            pair_created_at: bestPair.pairCreatedAt
              ? new Date(bestPair.pairCreatedAt).toISOString()
              : null,
          }
        : null,
    },
    provenance: {
      blockscout_token_url: `${BLOCKSCOUT}/token/${token}`,
      dexscreener_url: `https://dexscreener.com/search?q=${token}`,
    },
    limitations: [
      "This check does not simulate buys or sells and cannot prove a token is not a honeypot.",
      "Holder count does not measure holder concentration.",
      "DEX liquidity and reputation metadata can change quickly.",
    ],
  };
}

export async function tokenPreflight(token, fetchImpl = fetch) {
  const encoded = encodeURIComponent(token);
  const [profile, tokenInfo, dex] = await Promise.all([
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}`, fetchImpl),
    fetchJson(`${BLOCKSCOUT}/api/v2/tokens/${encoded}`, fetchImpl),
    fetchJson(
      `https://api.dexscreener.com/latest/dex/tokens/${encoded}`,
      fetchImpl,
    ),
  ]);
  return buildTokenPreflight({
    token,
    profile,
    tokenInfo,
    dexPairs: dex.pairs ?? [],
  });
}

export function buildMerchantTrust({
  address,
  profile,
  counters,
  transfers,
  fetchedAt = new Date().toISOString(),
}) {
  const normalized = address.toLowerCase();
  const receipts = (transfers?.items ?? []).filter(
    item =>
      item.to?.hash?.toLowerCase() === normalized &&
      item.token?.address_hash?.toLowerCase() === USDC.toLowerCase(),
  );
  const payerTotals = new Map();
  let totalAtomic = 0n;
  for (const receipt of receipts) {
    const payer = receipt.from?.hash?.toLowerCase() ?? "unknown";
    const amount = BigInt(receipt.total?.value ?? 0);
    totalAtomic += amount;
    payerTotals.set(payer, (payerTotals.get(payer) ?? 0n) + amount);
  }
  const sortedPayers = [...payerTotals.entries()].sort((a, b) =>
    a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0,
  );
  const topPayerShare =
    totalAtomic > 0n && sortedPayers.length
      ? Number((sortedPayers[0][1] * 10_000n) / totalAtomic) / 100
      : null;
  const flags = [];
  let score = 0;

  if (profile.is_scam || profile.reputation === "scam") {
    flags.push({
      code: "PUBLIC_SCAM_FLAG",
      severity: "critical",
      detail: "Blockscout marks this merchant address as scam-associated.",
    });
    score += 90;
  }
  if (receipts.length === 0) {
    flags.push({
      code: "NO_USDC_RECEIPTS_IN_SAMPLE",
      severity: "info",
      detail: "No canonical Base USDC receipts appear in the current Blockscout sample.",
    });
    score += 5;
  }
  if (receipts.length >= 3 && payerTotals.size === 1) {
    flags.push({
      code: "SINGLE_PAYER_CONCENTRATION",
      severity: "medium",
      detail: "All sampled USDC receipts came from one payer.",
    });
    score += 25;
  } else if (topPayerShare !== null && topPayerShare >= 80) {
    flags.push({
      code: "HIGH_PAYER_CONCENTRATION",
      severity: "medium",
      detail: `The largest payer accounts for ${topPayerShare.toFixed(2)}% of sampled receipts.`,
    });
    score += 15;
  }

  score = Math.min(score, 100);
  const riskLevel =
    score >= 70 ? "high" : score >= 20 ? "medium" : "low";
  return {
    product: "x402-merchant-trust",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: riskLevel,
      risk_score: score,
      flags,
    },
    merchant_identity: {
      type: profile.is_contract ? "contract" : "eoa",
      reputation: profile.reputation ?? null,
      is_scam: Boolean(profile.is_scam),
      name: profile.name ?? null,
    },
    receipt_sample: {
      sampled_usdc_receipts: receipts.length,
      unique_payers: payerTotals.size,
      total_usdc: (Number(totalAtomic) / 1_000_000).toFixed(6),
      top_payer_share_percent: topPayerShare,
      has_more_pages: Boolean(transfers?.next_page_params),
      latest_receipt_at: receipts[0]?.timestamp ?? null,
      receipts: receipts.slice(0, 20).map(item => ({
        timestamp: item.timestamp ?? null,
        transaction_hash: item.transaction_hash ?? null,
        payer: item.from?.hash ?? null,
        amount_atomic: item.total?.value ?? null,
      })),
    },
    address_activity: {
      transactions_count: parseCount(counters.transactions_count),
      token_transfers_count: parseCount(counters.token_transfers_count),
    },
    provenance: {
      provider: "Blockscout Base",
      address_url: `${BLOCKSCOUT}/address/${address}`,
    },
    limitations: [
      "Receipt statistics cover the current Blockscout page, not guaranteed lifetime history.",
      "Onchain volume does not prove independent customers or successful service delivery.",
      "A concentrated payer set can be legitimate and is not proof of wash activity.",
    ],
  };
}

export async function merchantTrust(address, fetchImpl = fetch) {
  const encoded = encodeURIComponent(address);
  const [profile, counters, transfers] = await Promise.all([
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}`, fetchImpl),
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}/counters`, fetchImpl),
    fetchJson(
      `${BLOCKSCOUT}/api/v2/addresses/${encoded}/token-transfers?type=ERC-20`,
      fetchImpl,
    ),
  ]);
  return buildMerchantTrust({ address, profile, counters, transfers });
}

function parseNonNegativeNumber(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseNonNegativeInteger(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (!/^[0-9]+$/.test(String(value))) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseChainList(value) {
  return String(value ?? "")
    .split(",")
    .map(chain => chain.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

export function buildX402ServerTrust({
  serverUrl,
  seller = null,
  volumeUsdc = null,
  txns = null,
  buyers = null,
  latestSeenHours = null,
  chains = [],
  merchant = null,
  fetchedAt = new Date().toISOString(),
}) {
  const parsedUrl = new URL(serverUrl);
  const normalizedChains = Array.isArray(chains)
    ? chains.map(chain => String(chain).trim().toLowerCase()).filter(Boolean)
    : parseChainList(chains);
  const observedVolume = parseNonNegativeNumber(volumeUsdc);
  const observedTxns = parseNonNegativeInteger(txns);
  const observedBuyers = parseNonNegativeInteger(buyers);
  const observedLatestHours = parseNonNegativeNumber(latestSeenHours);
  const flags = [];
  let riskScore = 0;
  let trustScore = 50;

  if (merchant?.assessment?.risk_level === "high") {
    flags.push({
      code: "SELLER_ADDRESS_HIGH_RISK",
      severity: "critical",
      detail: "The seller payment address has high-risk public address signals.",
    });
    riskScore += 70;
    trustScore -= 45;
  } else if (merchant?.assessment?.risk_level === "medium") {
    flags.push({
      code: "SELLER_ADDRESS_REVIEW",
      severity: "medium",
      detail: "The seller payment address has review-worthy public address signals.",
    });
    riskScore += 20;
    trustScore -= 15;
  }

  if (observedTxns === null || observedBuyers === null || observedVolume === null) {
    flags.push({
      code: "INCOMPLETE_MARKETPLACE_STATS",
      severity: "medium",
      detail:
        "Volume, transaction count, or buyer count was not supplied, so marketplace adoption cannot be fully scored.",
    });
    riskScore += 15;
    trustScore -= 10;
  }

  if (observedTxns !== null && observedTxns === 0) {
    flags.push({
      code: "NO_OBSERVED_PAYMENTS",
      severity: "medium",
      detail: "No public x402 payments were supplied for this server.",
    });
    riskScore += 25;
    trustScore -= 20;
  }

  if (observedBuyers !== null && observedTxns !== null && observedTxns >= 20) {
    const txnsPerBuyer = observedBuyers > 0 ? observedTxns / observedBuyers : Infinity;
    if (observedBuyers <= 2) {
      flags.push({
        code: "VERY_LOW_BUYER_DIVERSITY",
        severity: "high",
        detail: "Observed transaction history is concentrated in two or fewer buyers.",
      });
      riskScore += 35;
      trustScore -= 30;
    } else if (txnsPerBuyer >= 1000) {
      flags.push({
        code: "HIGH_TXN_PER_BUYER_RATIO",
        severity: "medium",
        detail: `Observed transactions per buyer is ${txnsPerBuyer.toFixed(2)}, which can indicate automation or concentrated demand.`,
      });
      riskScore += 15;
      trustScore -= 10;
    }
  }

  const averagePaymentUsdc =
    observedVolume !== null && observedTxns && observedTxns > 0
      ? observedVolume / observedTxns
      : null;
  if (averagePaymentUsdc !== null && averagePaymentUsdc < 0.0001) {
    flags.push({
      code: "MICRO_PAYMENT_VOLUME_DENSITY",
      severity: "medium",
      detail: `Average observed payment is ${averagePaymentUsdc.toFixed(8)} USDC, suggesting bot-scale microtransactions or possible volume shaping.`,
    });
    riskScore += 10;
    trustScore -= 5;
  }

  if (observedLatestHours !== null) {
    if (observedLatestHours > 24 * 14) {
      flags.push({
        code: "STALE_PAYMENT_ACTIVITY",
        severity: "medium",
        detail: "The latest supplied x402 payment is older than 14 days.",
      });
      riskScore += 15;
      trustScore -= 15;
    } else if (observedLatestHours <= 24) {
      trustScore += 10;
    }
  }

  if (observedBuyers !== null) {
    if (observedBuyers >= 100) trustScore += 20;
    else if (observedBuyers >= 10) trustScore += 10;
  }
  if (observedTxns !== null) {
    if (observedTxns >= 100_000) trustScore += 15;
    else if (observedTxns >= 1_000) trustScore += 8;
  }
  if (observedVolume !== null) {
    if (observedVolume >= 1_000) trustScore += 10;
    else if (observedVolume >= 10) trustScore += 5;
  }
  if (normalizedChains.length >= 2) trustScore += 5;

  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
  trustScore = Math.max(0, Math.min(100, Math.round(trustScore)));
  const riskLevel =
    riskScore >= 70 ? "high" : riskScore >= 25 ? "medium" : "low";
  const decision =
    riskLevel === "high"
      ? "review_or_block"
      : trustScore >= 75
        ? "allow"
        : "review";

  return {
    product: "x402-server-trust",
    schema_version: "1.0",
    network: BASE_MAINNET,
    server: {
      requested_url: serverUrl,
      origin: parsedUrl.origin,
      host: parsedUrl.hostname,
      seller,
      chains: normalizedChains,
    },
    fetched_at: fetchedAt,
    assessment: {
      risk_level: riskLevel,
      risk_score: riskScore,
      trust_score: trustScore,
      decision_hint: decision,
      flags,
    },
    marketplace_activity: {
      volume_usdc: observedVolume,
      txns: observedTxns,
      buyers: observedBuyers,
      average_payment_usdc: averagePaymentUsdc,
      txns_per_buyer:
        observedTxns !== null && observedBuyers
          ? observedTxns / observedBuyers
          : null,
      latest_seen_hours: observedLatestHours,
    },
    seller_address_summary: merchant
      ? {
          risk_level: merchant.assessment.risk_level,
          risk_score: merchant.assessment.risk_score,
          sampled_usdc_receipts:
            merchant.receipt_sample?.sampled_usdc_receipts ?? null,
          unique_payers: merchant.receipt_sample?.unique_payers ?? null,
          top_payer_share_percent:
            merchant.receipt_sample?.top_payer_share_percent ?? null,
        }
      : null,
    provenance: {
      scoring_model: "local heuristic v1",
      suggested_sources: [
        "x402scan marketplace statistics",
        "Base Blockscout seller address data",
        "Public x402 payment records",
      ],
    },
    limitations: [
      "Marketplace statistics are caller-supplied unless a seller address is provided for live Base enrichment.",
      "High transaction count does not prove successful API delivery or independent customers.",
      "This score is designed for preflight review, not as a legal compliance determination.",
    ],
  };
}

export async function x402ServerTrust(input, fetchImpl = fetch) {
  const seller = input.seller || null;
  const merchant =
    seller && ADDRESS_PATTERN.test(seller)
      ? await merchantTrust(seller, fetchImpl)
      : null;
  return buildX402ServerTrust({ ...input, seller, merchant });
}

function productPriceNumber(product) {
  return parseNonNegativeNumber(String(product?.price ?? "").replace(/^\$/, ""));
}

function extractX402scanOrigin(html) {
  const direct =
    html.match(/"origin":"(https?:\/\/[^"]+)"/) ??
    html.match(/\\"origin\\":\\"(https?:\\\/\\\/[^"\\]+)/);
  return direct?.[1]?.replaceAll("\\/", "/") ?? null;
}

function extractX402scanResourceCount(html) {
  const count =
    html.match(/"_count":\{"resources":(\d+)\}/) ??
    html.match(/\\"_count\\":\{\\"resources\\":(\d+)\}/);
  return count ? Number(count[1]) : null;
}

function extractX402scanResourceUrls(html) {
  return Array.from(
    new Set(
      Array.from(
        html.matchAll(/https:\/\/base-agent-preflight\.bytoken2023\.workers\.dev\/v1\/x402\/[^"\\<\s]+/g),
      ).map(match => match[0].replaceAll("\\/", "/")),
    ),
  ).slice(0, 80);
}

function extractPayToAddresses(html) {
  return Array.from(
    new Set(
      Array.from(html.matchAll(/payTo\\?":\\?"(0x[a-fA-F0-9]{40})/g)).map(
        match => match[1],
      ),
    ),
  );
}

export function buildX402OriginDueDiligence({
  serverUrl,
  origin = null,
  title = null,
  seller = null,
  resources = null,
  resourceUrls = [],
  payToAddresses = [],
  txns = null,
  buyers = null,
  openapi = null,
  serverTrust = null,
  fetchedAt = new Date().toISOString(),
}) {
  const parsed = new URL(serverUrl);
  const observedResources = parseNonNegativeInteger(resources);
  const observedTxns = parseNonNegativeInteger(txns);
  const observedBuyers = parseNonNegativeInteger(buyers);
  const uniquePayTo = Array.from(
    new Set(
      [seller, ...payToAddresses]
        .filter(Boolean)
        .map(address => String(address).toLowerCase()),
    ),
  );
  const flags = [];
  let riskScore = 0;
  let confidenceScore = 45;

  if (!origin && parsed.hostname !== "www.x402scan.com") {
    origin = parsed.origin;
  }
  if (!origin) {
    flags.push({
      code: "ORIGIN_NOT_RESOLVED",
      severity: "medium",
      detail: "The x402scan/server page did not expose a resolved service origin.",
    });
    riskScore += 20;
  } else {
    confidenceScore += 10;
  }

  if (observedResources === null && resourceUrls.length === 0) {
    flags.push({
      code: "NO_RESOURCE_INVENTORY",
      severity: "medium",
      detail: "No resource count or resource URLs were available for this origin.",
    });
    riskScore += 20;
  } else {
    confidenceScore += Math.min(20, Math.max(observedResources ?? 0, resourceUrls.length) / 2);
  }

  if (uniquePayTo.length === 0) {
    flags.push({
      code: "NO_PAYMENT_RECIPIENT_EVIDENCE",
      severity: "medium",
      detail: "No payment recipient address was observed or supplied.",
    });
    riskScore += 20;
  } else if (uniquePayTo.length > 1) {
    flags.push({
      code: "MULTIPLE_PAYMENT_RECIPIENTS",
      severity: "medium",
      detail: "Multiple payment recipients were observed; verify this is intentional.",
    });
    riskScore += 15;
  } else {
    confidenceScore += 10;
  }

  if (openapi) {
    if (openapi.assessment?.risk_level === "high") {
      flags.push({
        code: "OPENAPI_HIGH_RISK",
        severity: "high",
        detail: "OpenAPI preflight returned high structural risk.",
      });
      riskScore += 35;
    } else if (openapi.assessment?.risk_level === "medium") {
      flags.push({
        code: "OPENAPI_REVIEW",
        severity: "medium",
        detail: "OpenAPI preflight returned review-worthy warnings.",
      });
      riskScore += 15;
    }
    confidenceScore += 10;
  }

  if (serverTrust?.assessment?.risk_level === "high") {
    flags.push({
      code: "SERVER_TRUST_HIGH_RISK",
      severity: "high",
      detail: "Marketplace activity and seller evidence scored high risk.",
    });
    riskScore += 35;
  } else if (serverTrust?.assessment?.risk_level === "medium") {
    flags.push({
      code: "SERVER_TRUST_REVIEW",
      severity: "medium",
      detail: "Marketplace activity and seller evidence require review.",
    });
    riskScore += 15;
  }

  if (observedTxns !== null && observedBuyers !== null && observedTxns >= 20 && observedBuyers <= 2) {
    flags.push({
      code: "CONCENTRATED_BUYER_ACTIVITY",
      severity: "medium",
      detail: "Observed activity is concentrated in very few buyers.",
    });
    riskScore += 15;
  }

  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
  confidenceScore = Math.max(0, Math.min(100, Math.round(confidenceScore)));
  const riskLevel =
    riskScore >= 70 ? "high" : riskScore >= 25 ? "medium" : "low";

  return {
    product: "x402-origin-due-diligence",
    schema_version: "1.0",
    server_url: serverUrl,
    origin,
    title,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: riskLevel,
      risk_score: riskScore,
      confidence_score: confidenceScore,
      decision_hint:
        riskLevel === "high"
          ? "Do not let an autonomous buyer spend before human review and endpoint-level checks."
          : riskLevel === "medium"
            ? "Allow only low-value probes after endpoint preflight and Payment Guard review."
            : "Origin-level evidence is usable for low-value autonomous spend with normal guardrails.",
      flags,
    },
    inventory: {
      observed_resource_count: observedResources ?? resourceUrls.length,
      sampled_resources: resourceUrls.slice(0, 12),
      pay_to_addresses: uniquePayTo,
    },
    marketplace_activity: {
      txns: observedTxns,
      buyers: observedBuyers,
      txns_per_buyer:
        observedTxns !== null && observedBuyers
          ? observedTxns / Math.max(observedBuyers, 1)
          : null,
    },
    supporting_checks: {
      openapi_risk_level: openapi?.assessment?.risk_level ?? null,
      openapi_operation_count: openapi?.specification?.operation_count ?? null,
      server_trust_risk_level: serverTrust?.assessment?.risk_level ?? null,
      server_trust_score: serverTrust?.assessment?.trust_score ?? null,
    },
    recommended_next_checks: [
      "Run x402-resource-compare for the specific resources that can satisfy the task.",
      "Run x402-endpoint-preflight before paying any endpoint.",
      "Use agent-payment-guard with task budget and recipient allowlist before spending.",
    ],
    limitations: [
      "x402scan pages can lag current origin metadata.",
      "Public purchase activity can come from ecosystem testing bots, not confirmed human demand.",
      "This does not prove paid delivery quality.",
    ],
  };
}

export async function x402OriginDueDiligence(input, fetchImpl = fetch) {
  const parsed = validatePublicUrl(input.serverUrl);
  const suppliedSeller = input.seller || null;
  let html = "";
  let origin = parsed.origin;
  let title = null;
  let resourceUrls = [];
  let payToAddresses = suppliedSeller ? [suppliedSeller] : [];
  let resources = input.resources ?? null;

  try {
    const { response } = await fetchPublicResource(parsed.toString(), {
      fetchImpl,
      headers: { accept: "text/html,application/json,*/*;q=0.5" },
    });
    const { bytes } = await readResponseBytes(response, MAX_DOCUMENT_BYTES);
    html = bytesToText(bytes);
    origin = extractX402scanOrigin(html) ?? origin;
    title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? null;
    resources = resources ?? extractX402scanResourceCount(html);
    resourceUrls = extractX402scanResourceUrls(html);
    payToAddresses = [...payToAddresses, ...extractPayToAddresses(html)];
  } catch {
    // Best-effort metadata enrichment; builder will report missing evidence.
  }

  const openapiUrl = origin ? new URL("/openapi.json", origin).toString() : null;
  let openapi = null;
  if (openapiUrl && origin === SERVICE_ORIGIN) {
    const document = openApi(SERVICE_ORIGIN);
    openapi = await buildOpenApiSpecPreflight({
      requestedUrl: openapiUrl,
      finalUrl: openapiUrl,
      document,
      raw: JSON.stringify(document),
    });
  } else if (openapiUrl) {
    try {
      openapi = await openApiSpecPreflight(openapiUrl, fetchImpl);
    } catch {
      openapi = null;
    }
  }

  const serverTrust = buildX402ServerTrust({
    serverUrl: origin ?? parsed.origin,
    seller: suppliedSeller || payToAddresses[0] || null,
    txns: input.txns,
    buyers: input.buyers,
    chains: "base",
  });

  return buildX402OriginDueDiligence({
    serverUrl: input.serverUrl,
    origin,
    title,
    seller: suppliedSeller,
    resources,
    resourceUrls,
    payToAddresses,
    txns: input.txns,
    buyers: input.buyers,
    openapi,
    serverTrust,
  });
}

function parseResourceList(value) {
  return String(value ?? "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function buildX402ResourceCompare({
  resources,
  budgetUsdc = null,
  fetchedAt = new Date().toISOString(),
}) {
  const budget = parseNonNegativeNumber(budgetUsdc);
  const candidates = resources.map((resource, index) => {
    const amountUsdc =
      resource.amount_usdc ??
      (resource.amount_atomic && resource.asset?.toLowerCase?.() === USDC.toLowerCase()
        ? formatUnits(BigInt(resource.amount_atomic), 6)
        : null);
    const price = parseNonNegativeNumber(amountUsdc);
    const flags = [...(resource.flags ?? [])];
    let score = 60;
    if (resource.risk_level === "high") score -= 50;
    else if (resource.risk_level === "medium") score -= 20;
    if (price === null) {
      flags.push({
        code: "PRICE_UNKNOWN",
        severity: "medium",
        detail: "No canonical Base USDC price was decoded.",
      });
      score -= 20;
    } else {
      score += Math.max(0, 20 - price * 500);
      if (budget !== null && price > budget) {
        flags.push({
          code: "OVER_BUDGET",
          severity: "medium",
          detail: `Resource price ${price} USDC exceeds budget ${budget} USDC.`,
        });
        score -= 35;
      }
    }
    if (resource.pay_to) score += 5;
    if (resource.description) score += 5;
    score = Math.max(0, Math.min(100, Math.round(score)));
    return {
      rank: index + 1,
      url: resource.url,
      description: resource.description ?? null,
      pay_to: resource.pay_to ?? null,
      amount_usdc: price,
      risk_level: resource.risk_level ?? "unknown",
      score,
      flags,
    };
  });
  candidates.sort((a, b) => b.score - a.score);
  candidates.forEach((candidate, index) => {
    candidate.rank = index + 1;
  });
  return {
    product: "x402-resource-compare",
    schema_version: "1.0",
    fetched_at: fetchedAt,
    budget_usdc: budget,
    recommendation: candidates[0] ?? null,
    candidates,
    decision_hint:
      candidates[0]?.score >= 75
        ? "Use the top-ranked resource for low-value autonomous spend with Payment Guard."
        : candidates[0]?.score >= 45
          ? "Use the top-ranked resource only after endpoint preflight and budget guardrails."
          : "Do not pay automatically; no candidate has enough clean metadata.",
    limitations: [
      "Comparison is based on unpaid x402 metadata and caller-supplied URLs.",
      "A lower price does not prove better delivery quality.",
    ],
  };
}

export async function x402ResourceCompare(input, fetchImpl = fetch) {
  const urls = parseResourceList(input.resources);
  if (urls.length < 2 || urls.length > 5) {
    throw new Error("resource_compare_requires_two_to_five_urls");
  }
  const resources = await Promise.all(
    urls.map(async url => {
      const checked = await x402EndpointPreflight(url, fetchImpl);
      const firstAccept = checked.x402.accepts[0] ?? {};
      return {
        url: checked.url,
        description: checked.x402.resource?.description ?? checked.x402.resource?.url ?? null,
        pay_to: firstAccept.pay_to ?? null,
        amount_atomic: firstAccept.amount_atomic ?? null,
        amount_usdc: firstAccept.amount_usdc ?? null,
        asset: firstAccept.asset ?? null,
        risk_level: checked.assessment.risk_level,
        flags: checked.assessment.flags,
      };
    }),
  );
  return buildX402ResourceCompare({
    resources,
    budgetUsdc: input.budgetUsdc,
  });
}

function routeStep(productId, reason) {
  const product = PRODUCTS_BY_ID[productId];
  return {
    product: product.id,
    path: product.path,
    price_usdc: product.price,
    reason,
    stop_if: productId === "agent-payment-guard"
      ? "Stop if decision is REVIEW or BLOCK."
      : "Stop or escalate if risk_level is high or flags include critical/high severity.",
  };
}

export function buildAgentSpendRoutePlan({
  task,
  budgetUsdc = "0.02",
  riskTolerance = "medium",
  fetchedAt = new Date().toISOString(),
}) {
  const lowerTask = String(task).toLowerCase();
  const budget = parseNonNegativeNumber(budgetUsdc, 0.02);
  let route;
  if (/token|pool|trade|buy|sell|exit|liquidity|copytrade/.test(lowerTask)) {
    route = [
      routeStep("base-alpha-risk-context", "Cheap first-pass risk/alpha screen."),
      routeStep("base-token-exit-risk", "Check whether the bot can exit safely before entry or while holding."),
      routeStep("base-token-alpha-snapshot", "Confirm liquidity, volume, and buy/sell imbalance when the first screen passes."),
      routeStep("agent-payment-guard", "Enforce spend budget and recipient policy before paying external services."),
    ];
  } else if (/rpc|chain.?data|indexed|sql|archive|trace|fork|blockchain data/.test(lowerTask)) {
    route = [
      routeStep("agent-rpc-preflight", "Screen endpoint, method, price, and budget before chain-data access."),
      routeStep("rpc-capability-probe", "Check archive, trace, logs, WebSocket, and local-fork requirements."),
      routeStep("indexed-chain-query-preflight", "Preflight indexed-data query shape when SQL or analytics data is involved."),
      routeStep("x402-rpc-payment-guard", "Guard the final RPC or indexed-data payment before wallet signing."),
    ];
  } else if (/x402|api|server|merchant|pay|payment/.test(lowerTask)) {
    route = [
      routeStep("x402-origin-due-diligence", "Screen the server/origin before choosing a paid resource."),
      routeStep("x402-resource-compare", "Rank candidate resources against the task and budget."),
      routeStep("x402-endpoint-preflight", "Decode the final resource payment requirement."),
      routeStep("agent-payment-guard", "Enforce budget, allowlist, replay protection, and audit state before spending."),
    ];
  } else if (/package|npm|pypi|github|repo|openapi|agent|domain|tool/.test(lowerTask)) {
    route = [
      routeStep("domain-trust-preflight", "Check the domain before trusting hosted metadata."),
      routeStep("openapi-spec-preflight", "Validate API/tool schema before import or payment."),
      routeStep("github-repository-health", "Review repository maintenance when code dependency is involved."),
      routeStep("agent-payment-guard", "Guard the final paid call or integration spend."),
    ];
  } else {
    route = [
      routeStep("agent-payment-guard", "Default budget and policy guard for autonomous spend."),
      routeStep("x402-endpoint-preflight", "Decode the endpoint before payment."),
      routeStep("x402-origin-due-diligence", "Escalate to origin review when endpoint metadata is unclear."),
    ];
  }

  const affordable = [];
  let total = 0;
  for (const step of route) {
    const price = parseNonNegativeNumber(step.price_usdc.replace(/^\$/, ""), 0);
    if (total + price <= budget || affordable.length === 0) {
      affordable.push(step);
      total += price;
    }
  }
  return {
    product: "agent-spend-route-plan",
    schema_version: "1.0",
    task,
    risk_tolerance: riskTolerance,
    budget_usdc: budget,
    fetched_at: fetchedAt,
    recommended_route: affordable,
    full_route: route,
    estimated_cost_usdc: Number(total.toFixed(6)),
    stop_conditions: [
      "Any high-risk or critical flag appears.",
      "Decoded payTo is not on the buyer's allowlist.",
      "Cumulative route cost exceeds budget.",
      riskTolerance === "low"
        ? "Any medium-risk finding appears."
        : "Multiple medium-risk findings appear across route steps.",
    ],
    escalation:
      affordable.length < route.length
        ? "Budget is too small for the full route; run the affordable prefix and escalate before paying more."
        : "Route fits budget; use Payment Guard before any external paid call.",
    limitations: [
      "This is a routing plan over this service catalog, not a guarantee of task success.",
      "Actual downstream x402 prices can differ from local catalog examples.",
    ],
  };
}

const AGENT_BUYER_ROLE_POLICIES = {
  research_agent: {
    label: "Research Agent",
    allowed_categories: [
      "wallet_risk",
      "token_risk",
      "market_intelligence",
      "chain_data",
      "api_security",
      "protocol_research",
    ],
    approval_categories: ["invoice_verification", "payment_execution", "production_deploy"],
    denied_categories: ["payroll", "customer_pii"],
    default_limit_usdc: 1,
  },
  writer_agent: {
    label: "Writer Agent",
    allowed_categories: ["content_research", "public_docs", "market_summary"],
    approval_categories: ["wallet_risk", "token_risk", "market_intelligence"],
    denied_categories: ["payment_execution", "production_deploy", "invoice_verification", "customer_pii"],
    default_limit_usdc: 0.1,
  },
  accounting_agent: {
    label: "Accounting Agent",
    allowed_categories: ["invoice_verification", "receipt_reconciliation", "vendor_due_diligence"],
    approval_categories: ["wallet_risk", "payment_execution"],
    denied_categories: ["market_intelligence", "token_risk", "trading_alpha", "production_deploy"],
    default_limit_usdc: 0.5,
  },
  finance_agent: {
    label: "Finance Agent",
    allowed_categories: ["invoice_verification", "receipt_reconciliation", "treasury_risk", "vendor_due_diligence"],
    approval_categories: ["payment_execution", "wallet_risk", "market_intelligence"],
    denied_categories: ["production_deploy", "code_execution"],
    default_limit_usdc: 1,
  },
  operator_agent: {
    label: "Operator Agent",
    allowed_categories: ["service_monitoring", "api_security", "domain_trust", "openapi_preflight", "github_health"],
    approval_categories: ["production_deploy", "payment_execution", "wallet_risk"],
    denied_categories: ["payroll", "customer_pii"],
    default_limit_usdc: 0.25,
  },
};

function normalizePolicyToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCommerceDomain(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function normalizeCommerceAddress(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeCommerceList(values) {
  return Array.isArray(values)
    ? values.map(value => normalizePolicyToken(value)).filter(Boolean)
    : [];
}

function includesCommerceToken(values, value) {
  return normalizeCommerceList(values).includes(normalizePolicyToken(value));
}

function includesCommerceDomain(values, value) {
  const domain = normalizeCommerceDomain(value);
  return Array.isArray(values) && values.map(normalizeCommerceDomain).includes(domain);
}

function includesCommerceAddress(values, value) {
  const address = normalizeCommerceAddress(value);
  return Array.isArray(values) && values.map(normalizeCommerceAddress).includes(address);
}

function parseCommerceTimestamp(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function pushUnique(values, value) {
  if (value && !values.includes(value)) values.push(value);
}

function simpleHash(value) {
  let hash = 0x811c9dc5;
  for (const char of String(value ?? "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function strongerCommerceDecision(current, candidate) {
  const priority = { ALLOW: 1, REQUIRE_APPROVAL: 2, APPROVAL_REQUIRED: 2, DENY: 3 };
  return (priority[candidate] ?? 0) > (priority[current] ?? 0)
    ? candidate
    : current;
}

function agentBuyerDecisionInput({
  agentRole,
  productCategory,
  purpose = "",
  priceUsdc = "0",
  dataSensitivity = "medium",
  agentStatus = "active",
  approvalRef = "",
  fetchedAt = new Date().toISOString(),
}) {
  return {
    agent_role: normalizePolicyToken(agentRole),
    product_category: normalizePolicyToken(productCategory),
    purpose: normalizePolicyToken(purpose),
    price_usdc: parseNonNegativeNumber(priceUsdc, 0),
    data_sensitivity: normalizePolicyToken(dataSensitivity || "medium"),
    agent_status: normalizePolicyToken(agentStatus || "active"),
    approval_ref: String(approvalRef ?? "").trim(),
    fetched_at: fetchedAt,
  };
}

export function buildAgentBuyerIdentityPreflight(input) {
  const normalized = agentBuyerDecisionInput(input);
  const rolePolicy = AGENT_BUYER_ROLE_POLICIES[normalized.agent_role];
  const reasonCodes = [];
  const flags = [];
  let decision = "APPROVAL_REQUIRED";
  let riskScore = 40;

  if (!rolePolicy) {
    return {
      product: "agent-buyer-identity-preflight",
      schema_version: "1.0",
      decision: "DENY",
      reason_codes: ["UNKNOWN_AGENT_ROLE"],
      risk_score: 100,
      role_product_fit: "unknown_role",
      input: normalized,
      recognized_agent_roles: Object.keys(AGENT_BUYER_ROLE_POLICIES),
      recommendation:
        "Deny the purchase until the buyer agent has a registered role and policy.",
      limitations: [
        "This is a policy preflight, not a wallet, signer, or settlement service.",
      ],
    };
  }

  if (normalized.agent_status === "disabled" || normalized.agent_status === "paused") {
    return {
      product: "agent-buyer-identity-preflight",
      schema_version: "1.0",
      decision: "DENY",
      reason_codes: [`AGENT_${normalized.agent_status.toUpperCase()}`],
      risk_score: 100,
      role_product_fit: "blocked_lifecycle",
      input: normalized,
      agent_policy: rolePolicy,
      recommendation: "Do not buy. Reactivate the agent only through owner review.",
      limitations: [
        "This is a policy preflight, not a wallet, signer, or settlement service.",
      ],
    };
  }

  reasonCodes.push("AGENT_ROLE_RECOGNIZED", "AGENT_ACTIVE");

  if (rolePolicy.denied_categories.includes(normalized.product_category)) {
    decision = "DENY";
    riskScore = 90;
    reasonCodes.push("ROLE_PRODUCT_CATEGORY_DENIED");
    flags.push({
      code: "ROLE_PRODUCT_MISMATCH",
      severity: "high",
      detail: `${rolePolicy.label} should not buy ${normalized.product_category}.`,
    });
  } else if (rolePolicy.allowed_categories.includes(normalized.product_category)) {
    decision = "ALLOW";
    riskScore = 10;
    reasonCodes.push("ROLE_ALLOWED_FOR_PRODUCT_CATEGORY");
  } else if (rolePolicy.approval_categories.includes(normalized.product_category)) {
    decision = "APPROVAL_REQUIRED";
    riskScore = 55;
    reasonCodes.push("ROLE_REQUIRES_APPROVAL_FOR_PRODUCT_CATEGORY");
  } else {
    decision = "APPROVAL_REQUIRED";
    riskScore = 60;
    reasonCodes.push("PRODUCT_CATEGORY_NOT_IN_ROLE_POLICY");
  }

  if (normalized.data_sensitivity === "high" || normalized.data_sensitivity === "restricted") {
    reasonCodes.push("SENSITIVE_DATA_CATEGORY");
    riskScore = Math.max(riskScore, normalized.data_sensitivity === "restricted" ? 85 : 65);
    if (decision === "ALLOW") decision = "APPROVAL_REQUIRED";
    flags.push({
      code: "SENSITIVE_DATA_PURCHASE",
      severity: normalized.data_sensitivity === "restricted" ? "high" : "medium",
      detail: `Data sensitivity is ${normalized.data_sensitivity}; require owner review unless explicitly pre-approved.`,
    });
  }

  if (normalized.price_usdc > rolePolicy.default_limit_usdc) {
    reasonCodes.push("PRICE_EXCEEDS_ROLE_LIMIT");
    riskScore = Math.max(riskScore, 70);
    if (decision === "ALLOW") decision = "APPROVAL_REQUIRED";
    flags.push({
      code: "ROLE_SPEND_LIMIT_EXCEEDED",
      severity: "medium",
      detail: `Price ${normalized.price_usdc} USDC exceeds ${rolePolicy.label} default limit ${rolePolicy.default_limit_usdc} USDC.`,
    });
  } else {
    reasonCodes.push("PRICE_WITHIN_ROLE_LIMIT");
  }

  if (decision === "APPROVAL_REQUIRED" && normalized.approval_ref) {
    reasonCodes.push("APPROVAL_REFERENCE_PRESENT");
  }

  const roleProductFit =
    decision === "ALLOW"
      ? "fit"
      : decision === "DENY"
        ? "mismatch"
        : "needs_owner_review";

  return {
    product: "agent-buyer-identity-preflight",
    schema_version: "1.0",
    fetched_at: normalized.fetched_at,
    decision,
    reason_codes: reasonCodes,
    risk_score: Math.max(0, Math.min(100, riskScore)),
    role_product_fit: roleProductFit,
    input: normalized,
    agent_policy: rolePolicy,
    flags,
    recommended_next_action:
      decision === "ALLOW"
        ? "Proceed to x402 payment only if the payment guard also allows the spend."
        : decision === "DENY"
          ? "Do not buy this x402 service with this agent role."
          : "Request owner approval or route the purchase to a better-matched agent role.",
    audit_required: true,
    limitations: [
      "This preflight uses declared or credential-mapped agent role, not proof of human identity.",
      "This endpoint does not custody funds, sign transactions, or settle x402 payments.",
      "Production deployments should bind agent_role to authenticated credentials, not trust query parameters.",
    ],
  };
}

export function sampleAgenticCommercePreflightInput() {
  return {
    buyer_id: "buyer.acme",
    agent_id: "agent.finance.001",
    agent_role: "finance_agent",
    action: "payment_execution",
    product_category: "payment_execution",
    amount_usdc: "0.25",
    asset: "USDC",
    chain: "base",
    merchant_domain: "pay.vendor.example",
    merchant_wallet: "0xabc0000000000000000000000000000000000001",
    mandate: {
      id: "mandate-001",
      type: "payment",
      status: "active",
      buyer_id: "buyer.acme",
      agent_id: "agent.finance.001",
      agent_role: "finance_agent",
      merchant_domains: ["pay.vendor.example"],
      merchant_wallets: ["0xabc0000000000000000000000000000000000001"],
      allowed_categories: ["payment_execution"],
      max_amount_usdc: "1.00",
      assets: ["USDC"],
      chains: ["base"],
      expires_at: "2099-01-01T00:00:00.000Z",
    },
    merchant: {
      domain: "pay.vendor.example",
      wallet: "0xabc0000000000000000000000000000000000001",
      expected_wallet: "0xabc0000000000000000000000000000000000001",
      openapi_domain: "pay.vendor.example",
      agent_card_domain: "pay.vendor.example",
      category: "payment_execution",
      kyt_risk: "low",
    },
  };
}

export function buildAgenticCommercePreflight(input = {}) {
  const fetchedAt = input.evaluated_at || new Date().toISOString();
  const expiresAt =
    input.expires_at ||
    new Date((parseCommerceTimestamp(fetchedAt) ?? Date.now()) + 5 * 60_000).toISOString();
  const nowTimestamp = parseCommerceTimestamp(fetchedAt) ?? Date.now();
  const payment = input.payment && typeof input.payment === "object" ? input.payment : {};
  const mandate = input.mandate && typeof input.mandate === "object" ? input.mandate : null;
  const merchant = input.merchant && typeof input.merchant === "object" ? input.merchant : {};
  const action = normalizePolicyToken(input.action || payment.action || input.product_category || "payment_execution");
  const agentRole = normalizePolicyToken(input.agent_role || mandate?.agent_role);
  const productCategory = normalizePolicyToken(input.product_category || payment.product_category || action);
  const amountUsdc = parseNonNegativeNumber(
    input.amount_usdc ?? payment.amount_usdc ?? input.price_usdc,
    0,
  );
  const asset = normalizePolicyToken(input.asset || payment.asset || "USDC").toUpperCase();
  const chain = normalizePolicyToken(input.chain || payment.chain || "base");
  const merchantDomain = normalizeCommerceDomain(
    input.merchant_domain || payment.merchant_domain || merchant.domain,
  );
  const merchantWallet = normalizeCommerceAddress(
    input.merchant_wallet || payment.merchant_wallet || merchant.wallet,
  );
  const buyerId = String(input.buyer_id || mandate?.buyer_id || "").trim();
  const agentId = String(input.agent_id || mandate?.agent_id || "").trim();
  const decisionIdSeed = [
    buyerId,
    agentId,
    agentRole,
    action,
    merchantDomain,
    merchantWallet,
    amountUsdc.toFixed(6),
    fetchedAt,
  ].join("|");
  const decisionId = `dec_${simpleHash(decisionIdSeed).slice(0, 16)}`;
  const policyResult = evaluateAgenticCommercePolicy({
    ...input,
    evaluated_at: fetchedAt,
    expires_at: expiresAt,
  });
  const buyerResult = buildAgentBuyerIdentityPreflight({
    agentRole,
    productCategory,
    purpose: normalizePolicyToken(input.purpose || action || "agentic_commerce"),
    priceUsdc: String(amountUsdc),
    dataSensitivity: input.data_sensitivity || "medium",
    agentStatus: input.agent_status || "active",
    approvalRef: input.approval_ref || "",
    fetchedAt,
  });
  const reasonCodes = [];
  const evidence = [];
  let decision =
    buyerResult.decision === "APPROVAL_REQUIRED"
      ? "REQUIRE_APPROVAL"
      : buyerResult.decision;

  for (const reason of buyerResult.reason_codes ?? []) pushUnique(reasonCodes, reason);
  evidence.push({
    type: "agent_buyer_identity",
    source: "signgate",
    decision: buyerResult.decision,
    role_product_fit: buyerResult.role_product_fit,
  });

  if (!mandate) {
    decision = strongerCommerceDecision(decision, "DENY");
    pushUnique(reasonCodes, "MANDATE_MISSING");
  } else {
    const mandateType = normalizePolicyToken(mandate.type || "intent");
    const mandateStatus = normalizePolicyToken(mandate.status || "active");
    const expiresAt = parseCommerceTimestamp(mandate.expires_at);
    evidence.push({
      type: "mandate",
      id: mandate.id || null,
      mandate_type: mandateType,
      status: mandateStatus,
      expires_at: mandate.expires_at || null,
    });
    if (!["intent", "checkout", "payment"].includes(mandateType)) {
      decision = strongerCommerceDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_TYPE_UNSUPPORTED");
    }
    if (!["active", "enabled"].includes(mandateStatus)) {
      decision = strongerCommerceDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_INACTIVE");
    }
    if (expiresAt !== null && expiresAt < nowTimestamp) {
      decision = strongerCommerceDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_EXPIRED");
    }
    if (mandate.buyer_id && buyerId && String(mandate.buyer_id).trim() !== buyerId) {
      decision = strongerCommerceDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_BUYER_MISMATCH");
    }
    if (mandate.agent_id && agentId && String(mandate.agent_id).trim() !== agentId) {
      decision = strongerCommerceDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_AGENT_MISMATCH");
    }
    if (mandate.agent_role && agentRole && normalizePolicyToken(mandate.agent_role) !== agentRole) {
      decision = strongerCommerceDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_ROLE_MISMATCH");
    }
    if (Array.isArray(mandate.merchant_domains) && !includesCommerceDomain(mandate.merchant_domains, merchantDomain)) {
      decision = strongerCommerceDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_MERCHANT_DOMAIN_MISMATCH");
    }
    if (Array.isArray(mandate.merchant_wallets) && !includesCommerceAddress(mandate.merchant_wallets, merchantWallet)) {
      decision = strongerCommerceDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_MERCHANT_WALLET_MISMATCH");
    }
    if (Array.isArray(mandate.allowed_categories) && !includesCommerceToken(mandate.allowed_categories, productCategory)) {
      decision = strongerCommerceDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_CATEGORY_MISMATCH");
    }
    if (parseNonNegativeNumber(mandate.max_amount_usdc, 0) > 0 && amountUsdc > parseNonNegativeNumber(mandate.max_amount_usdc, 0)) {
      decision = strongerCommerceDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_AMOUNT_EXCEEDED");
    }
    if (Array.isArray(mandate.assets) && !includesCommerceToken(mandate.assets, asset)) {
      decision = strongerCommerceDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_ASSET_MISMATCH");
    }
    if (Array.isArray(mandate.chains) && !includesCommerceToken(mandate.chains, chain)) {
      decision = strongerCommerceDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_CHAIN_MISMATCH");
    }
  }

  evidence.push({
    type: "merchant_trust",
    domain: merchantDomain || null,
    wallet: merchantWallet || null,
    expected_wallet: merchant.expected_wallet || null,
    openapi_domain: merchant.openapi_domain || null,
    agent_card_domain: merchant.agent_card_domain || null,
    category: normalizePolicyToken(merchant.category || "") || null,
    kyt_risk: normalizePolicyToken(merchant.kyt_risk || input.kyt_risk || "unknown"),
  });

  if (!merchantDomain) {
    decision = strongerCommerceDecision(decision, "REQUIRE_APPROVAL");
    pushUnique(reasonCodes, "MERCHANT_DOMAIN_MISSING");
  }
  if (!merchantWallet) {
    decision = strongerCommerceDecision(decision, "REQUIRE_APPROVAL");
    pushUnique(reasonCodes, "MERCHANT_WALLET_MISSING");
  }
  if (merchant.expected_wallet && merchantWallet && normalizeCommerceAddress(merchant.expected_wallet) !== merchantWallet) {
    decision = strongerCommerceDecision(decision, "DENY");
    pushUnique(reasonCodes, "MERCHANT_WALLET_MISMATCH");
  }
  if (merchant.openapi_domain && merchantDomain && normalizeCommerceDomain(merchant.openapi_domain) !== merchantDomain) {
    decision = strongerCommerceDecision(decision, "REQUIRE_APPROVAL");
    pushUnique(reasonCodes, "MERCHANT_OPENAPI_DOMAIN_MISMATCH");
  }
  if (merchant.agent_card_domain && merchantDomain && normalizeCommerceDomain(merchant.agent_card_domain) !== merchantDomain) {
    decision = strongerCommerceDecision(decision, "REQUIRE_APPROVAL");
    pushUnique(reasonCodes, "MERCHANT_AGENT_CARD_DOMAIN_MISMATCH");
  }
  if (merchant.category && productCategory && normalizePolicyToken(merchant.category) !== productCategory) {
    decision = strongerCommerceDecision(decision, "REQUIRE_APPROVAL");
    pushUnique(reasonCodes, "MERCHANT_CATEGORY_MISMATCH");
  }

  const kytRisk = normalizePolicyToken(merchant.kyt_risk || input.kyt_risk || "unknown");
  if (kytRisk === "high") {
    decision = strongerCommerceDecision(decision, "DENY");
    pushUnique(reasonCodes, "MERCHANT_KYT_HIGH_RISK");
  } else if (kytRisk === "medium") {
    decision = strongerCommerceDecision(decision, "REQUIRE_APPROVAL");
    pushUnique(reasonCodes, "MERCHANT_KYT_MEDIUM_RISK");
  }

  const signerRequired = productCategory === "payment_execution" || action === "payment_execution";
  const signerDirective = signerRequired
    ? {
        required: true,
        mode: "human_fido2_or_controlled_signer",
        agent_may_directly_sign: false,
        execution_may_be_agent_initiated: true,
        signer_isolation_required: true,
        required_signer: {
          mode: "out_of_agent",
          allowed_classes: [
            "human_fido2",
            "hsm",
            "kms",
            "custody",
            "smart_account_module",
          ],
        },
        reason_code: "PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER",
      }
    : {
        required: false,
        mode: "none",
        agent_may_directly_sign: false,
        execution_may_be_agent_initiated: true,
        signer_isolation_required: false,
        required_signer: {
          mode: "none",
          allowed_classes: [],
        },
        reason_code: "SIGNER_NOT_REQUIRED_FOR_THIS_ACTION",
      };

  if (signerRequired) {
    decision = strongerCommerceDecision(decision, "REQUIRE_APPROVAL");
    pushUnique(reasonCodes, signerDirective.reason_code);
  }

  return {
    product: "agentic-commerce-preflight",
    schema_version: "agentic_commerce_preflight_result.v1",
    response_kind: "decision_response",
    evaluator_version:
      policyResult.evaluator_version || "signgate-agentic-commerce-evaluator.0.1.0",
    decision: policyResult.decision || decision,
    decision_id: decisionId,
    evaluated_at: fetchedAt,
    expires_at: policyResult.expires_at || expiresAt,
    policy_version:
      policyResult.policy_version || "signgate-agentic-commerce-policy-2026-07-15",
    action,
    agent: {
      id: agentId || null,
      role: agentRole || null,
    },
    buyer: {
      id: buyerId || null,
    },
    mandate: {
      id: mandate?.id || null,
      type: normalizePolicyToken(mandate?.type || "") || null,
      status: normalizePolicyToken(mandate?.status || "") || null,
    },
    merchant: {
      domain: merchantDomain || null,
      wallet: merchantWallet || null,
      category: normalizePolicyToken(merchant.category || "") || null,
      kyt_risk: kytRisk,
    },
    resource: {
      category: productCategory,
      amount_usdc: amountUsdc,
      asset,
      chain,
    },
    reason_codes: policyResult.reason_codes || reasonCodes,
    evidence,
    signer_directive: policyResult.signer_directive || signerDirective,
    decision_artifact: policyResult.decision_artifact || {
      issued: false,
      status: "not_cryptographically_signed",
      note: "This is a Decision Response. Future Decision Artifacts will add request, policy, mandate, evidence, nonce, issuer, and signature binding.",
    },
    recommended_next_action:
      (policyResult.decision || decision) === "ALLOW"
        ? "proceed_to_payment_or_checkout"
        : (policyResult.decision || decision) === "DENY"
          ? "block_agentic_commerce_action"
          : "request_owner_policy_or_signer_approval",
    limitations: [
      "This demo endpoint is deterministic and does not verify live AP2, x402, KYT, or chain state.",
      "SignGate does not custody funds, hold private keys, sign transactions, or move money.",
      "Production use should bind decisions to authenticated agents, immutable policy versions, nonce, expiry, and signer verification.",
    ],
  };
}

export function buildAgentBuyerPolicyKitDelivery({
  format = "manifest",
  buyerType = "developer",
  fetchedAt = new Date().toISOString(),
} = {}) {
  const normalizedFormat = normalizePolicyToken(format || "manifest");
  const normalizedBuyerType = normalizePolicyToken(buyerType || "developer");
  const roles = Object.fromEntries(
    Object.entries(AGENT_BUYER_ROLE_POLICIES).map(([role, policy]) => [
      role,
      {
        label: policy.label,
        default_limit_usdc: policy.default_limit_usdc,
        allowed_categories: policy.allowed_categories,
        approval_required_categories: policy.approval_categories,
        denied_categories: policy.denied_categories,
      },
    ]),
  );
  const roleProductMatrix = [
    ["research_agent", "wallet_risk", "ALLOW"],
    ["writer_agent", "wallet_risk", "APPROVAL_REQUIRED"],
    ["accounting_agent", "market_intelligence", "DENY"],
    ["accounting_agent", "invoice_verification", "ALLOW"],
    ["finance_agent", "payment_execution", "APPROVAL_REQUIRED"],
    ["operator_agent", "api_security", "ALLOW"],
  ].map(([agent_role, product_category, decision]) => ({
    agent_role,
    product_category,
    decision,
  }));
  return {
    product: "agent-buyer-policy-kit",
    schema_version: "1.0",
    fetched_at: fetchedAt,
    delivery_format: ["manifest", "policy", "quickstart"].includes(normalizedFormat)
      ? normalizedFormat
      : "manifest",
    buyer_type: ["developer", "startup", "enterprise"].includes(normalizedBuyerType)
      ? normalizedBuyerType
      : "developer",
    price_usdc: "49.00",
    positioning:
      "Embed the SignGate Agentic Commerce Policy Engine for mandate, merchant, buyer-role, and signer-directive preflight.",
    product_ladder: {
      hosted_api: "try it",
      policy_kit: "embed it",
      signer_adapter: "enforce it",
      audit_pack: "prove it",
    },
    package: {
      npm_name: "@signgate/agent-buyer-policy-kit",
      python_name: "signgate-agent-buyer-policy-kit",
      version: "0.1.0",
      local_path: "packages/agent-buyer-policy-kit",
      github_snapshot_commit: "b3855b11761a961f5c634dfeb4e338590a1906a3",
    },
    included_files: [
      "README.md",
      "PRICING.md",
      "RELEASE_CHECKLIST.md",
      "policy/default-agent-buyer-policy.json",
      "policy/product-categories.json",
      "policy/role-product-matrix.md",
      "src/index.js",
      "test/evaluator.test.js",
      "evaluateAgenticCommercePreflight",
      "python/signgate_agent_buyer_policy_kit/evaluator.py",
      "python/tests/test_evaluator.py",
      "evaluate_agentic_commerce_preflight",
    ],
    starter_policy: {
      policy_version: "signgate-agentic-commerce-policy-2026-07-15",
      decisions: ["ALLOW", "DENY", "REQUIRE_APPROVAL"],
      roles,
      role_product_matrix: roleProductMatrix,
      mandate_checks: [
        "presence",
        "status",
        "expiry",
        "type",
        "buyer",
        "agent",
        "role",
        "merchant_domain",
        "merchant_wallet",
        "category",
        "amount",
        "asset",
        "chain",
      ],
      merchant_trust_checks: [
        "domain",
        "wallet",
        "expected_wallet",
        "openapi_domain",
        "agent_card_domain",
        "category",
        "kyt_risk",
      ],
      signer_directive: {
        payment_execution: {
          required: true,
          agent_may_directly_sign: false,
          execution_may_be_agent_initiated: true,
          signer_isolation_required: true,
          required_signer: {
            mode: "out_of_agent",
            allowed_classes: [
              "human_fido2",
              "hsm",
              "kms",
              "custody",
              "smart_account_module",
            ],
          },
        },
      },
      global_rules: {
        unknown_role: "DENY",
        inactive_agent: "DENY",
        restricted_data: "DENY",
        high_sensitivity_data: "APPROVAL_REQUIRED",
        price_over_role_limit: "APPROVAL_REQUIRED",
        payment_execution: "APPROVAL_REQUIRED",
      },
    },
    javascript_quickstart: {
      install: "npm install @signgate/agent-buyer-policy-kit",
      example:
        'import { evaluateAgenticCommercePreflight } from "@signgate/agent-buyer-policy-kit";\n\nconst result = evaluateAgenticCommercePreflight({\n  buyer_id: "buyer.acme",\n  agent_id: "agent.finance.001",\n  agent_role: "finance_agent",\n  product_category: "payment_execution",\n  amount_usdc: "0.25",\n  asset: "USDC",\n  chain: "base",\n  merchant_domain: "pay.vendor.example",\n  merchant_wallet: "0xabc0000000000000000000000000000000000001",\n  mandate: { id: "mandate-001", type: "payment", status: "active" },\n  merchant: { domain: "pay.vendor.example", category: "payment_execution", kyt_risk: "low" }\n});\n\nconsole.log(result.decision);\nconsole.log(result.signer_directive.agent_may_directly_sign);',
      test: "npm test",
    },
    python_quickstart: {
      install: "pip install signgate-agent-buyer-policy-kit",
      example:
        'from signgate_agent_buyer_policy_kit import evaluate_agentic_commerce_preflight\n\nresult = evaluate_agentic_commerce_preflight({\n    "buyer_id": "buyer.acme",\n    "agent_id": "agent.finance.001",\n    "agent_role": "finance_agent",\n    "product_category": "payment_execution",\n    "amount_usdc": "0.25",\n    "asset": "USDC",\n    "chain": "base",\n    "mandate": {"id": "mandate-001", "type": "payment", "status": "active"},\n    "merchant": {"domain": "pay.vendor.example", "category": "payment_execution", "kyt_risk": "low"},\n})\n\nprint(result["decision"])\nprint(result["signer_directive"]["agent_may_directly_sign"])',
      test: "python3 -m unittest discover -s tests",
    },
    integration_targets: [
      "x402 buyers",
      "MCP clients",
      "agent runtimes",
      "wallet automation",
      "API marketplaces",
      "signer adapters",
      "custody and KMS policy checks",
      "enterprise AI governance pilots",
    ],
    release_terms: {
      license_status: "commercial_draft",
      public_npm_publish: "not_yet_published",
      public_pypi_publish: "not_yet_published",
      support: "starter kit; no custody, signing, token approval, or money movement",
      customization:
        "Customers should edit policy JSON, role/category matrix, mandate constraints, signer rules, thresholds, approval rules, and audit bindings.",
    },
    limitations: [
      "This paid delivery returns the policy kit manifest and starter policy content; public package registries are not live yet.",
      "Hosted API = try it; Policy Kit = embed it; Signer Adapter = enforce it; Audit Pack = prove it.",
      "Production use should bind agent_role to authenticated credentials instead of trusting plain query parameters.",
      "The kit does not custody funds, sign transactions, approve tokens, or guarantee seller delivery.",
    ],
  };
}

function parseBooleanString(value, fallback = false) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseMethodList(value) {
  return String(value ?? "")
    .split(",")
    .map(method => method.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function rpcMethodRisk(method) {
  const normalized = String(method ?? "").toLowerCase();
  if (/debug_|trace_|admin_|personal_|txpool_|miner_/.test(normalized)) {
    return {
      level: "high",
      score: 45,
      flag: {
        code: "SENSITIVE_RPC_METHOD",
        severity: "high",
        detail: "The requested method is trace, node-admin, mempool, or signer-adjacent and should not be paid automatically.",
      },
    };
  }
  if (/sendrawtransaction|eth_sendtransaction|eth_sign|sign/.test(normalized)) {
    return {
      level: "high",
      score: 55,
      flag: {
        code: "WRITE_OR_SIGNING_METHOD",
        severity: "high",
        detail: "The requested method can broadcast or sign and is outside read-only chain-data preflight.",
      },
    };
  }
  if (/getstorageat|getproof|getlogs|getblock|gettransaction|getreceipt|call|blocknumber|chainid/.test(normalized)) {
    return { level: "low", score: 0, flag: null };
  }
  return {
    level: "medium",
    score: 12,
    flag: {
      code: "UNCLASSIFIED_RPC_METHOD",
      severity: "medium",
      detail: "The method is not in the known read-only allowlist; review before autonomous spend.",
    },
  };
}

function chainDataDecision(riskScore) {
  if (riskScore >= 70) return "BLOCK";
  if (riskScore >= 25) return "REVIEW";
  return "ALLOW";
}

function chainDataRiskLevel(riskScore) {
  if (riskScore >= 70) return "high";
  if (riskScore >= 25) return "medium";
  return "low";
}

export function buildAgentRpcPreflight({
  endpointUrl,
  chain,
  method,
  maxPriceUsdc = null,
  sessionBudgetUsdc = null,
  fetchedAt = new Date().toISOString(),
}) {
  const parsed = validatePublicUrl(endpointUrl);
  const price = parseNonNegativeNumber(maxPriceUsdc);
  const budget = parseNonNegativeNumber(sessionBudgetUsdc);
  const methodRisk = rpcMethodRisk(method);
  const flags = [];
  let riskScore = methodRisk.score;
  if (methodRisk.flag) flags.push(methodRisk.flag);
  if (parsed.protocol !== "https:") {
    flags.push({
      code: "NON_HTTPS_ENDPOINT",
      severity: "high",
      detail: "Paid agent data access should use HTTPS endpoints.",
    });
    riskScore += 35;
  }
  if (price !== null && budget !== null && price > budget) {
    flags.push({
      code: "PRICE_EXCEEDS_SESSION_BUDGET",
      severity: "high",
      detail: "The requested price exceeds the remaining session budget.",
    });
    riskScore += 40;
  }
  if (price !== null && price > 0.05) {
    flags.push({
      code: "HIGH_PRICE_FOR_RPC_READ",
      severity: "medium",
      detail: "The requested price is high for a single read-oriented chain-data call.",
    });
    riskScore += 15;
  }
  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
  return {
    product: "agent-rpc-preflight",
    schema_version: "1.0",
    fetched_at: fetchedAt,
    endpoint: {
      requested_url: endpointUrl,
      origin: parsed.origin,
      host: parsed.hostname,
      chain,
      method,
    },
    payment_context: {
      max_price_usdc: price,
      session_budget_usdc: budget,
      budget_fit: price === null || budget === null ? "unknown" : price <= budget,
    },
    assessment: {
      decision: chainDataDecision(riskScore),
      risk_level: chainDataRiskLevel(riskScore),
      risk_score: riskScore,
      flags,
      next_action:
        riskScore >= 70
          ? "Do not let the agent pay automatically."
          : riskScore >= 25
            ? "Require Payment Guard review or a stricter policy before signing."
            : "Allow low-value read-only use with normal budget guardrails.",
    },
    recommended_next_checks: [
      "Run rpc-capability-probe when the workflow needs historical state, trace, WebSocket, or local-fork compatibility.",
      "Run x402-rpc-payment-guard immediately before wallet signing.",
    ],
    limitations: [
      "This endpoint does not call the upstream data provider.",
      "Capability support must be verified by a live probe before production reliance.",
    ],
  };
}

export function buildRpcCapabilityProbe({
  chain,
  methods,
  historicalBlock = null,
  requiresTrace = false,
  requiresWebsocket = false,
  fetchedAt = new Date().toISOString(),
}) {
  const methodList = parseMethodList(methods);
  const historical = parseNonNegativeInteger(historicalBlock);
  const flags = [];
  let fitScore = 70;
  const sensitiveMethods = methodList
    .map(method => ({ method, risk: rpcMethodRisk(method) }))
    .filter(item => item.risk.flag);
  for (const item of sensitiveMethods) {
    flags.push({ ...item.risk.flag, method: item.method });
    fitScore -= item.risk.level === "high" ? 25 : 10;
  }
  if (historical !== null) {
    flags.push({
      code: "ARCHIVE_STATE_REQUIRED",
      severity: "medium",
      detail: "Historical block reads require archive or equivalent state support.",
    });
    fitScore -= 10;
  }
  if (requiresTrace) {
    flags.push({
      code: "TRACE_REQUIRED",
      severity: "medium",
      detail: "Trace workflows require explicit debug or trace support and can fail on standard RPC routes.",
    });
    fitScore -= 15;
  }
  if (requiresWebsocket) {
    flags.push({
      code: "SUBSCRIPTION_ROUTE_REQUIRED",
      severity: "medium",
      detail: "WebSocket/subscription workflows need a compatible transport, not only HTTP JSON-RPC.",
    });
    fitScore -= 10;
  }
  fitScore = Math.max(0, Math.min(100, Math.round(fitScore)));
  const researchFit =
    fitScore >= 70 ? "good" : fitScore >= 40 ? "needs_live_probe" : "poor";
  return {
    product: "rpc-capability-probe",
    schema_version: "1.0",
    fetched_at: fetchedAt,
    chain,
    requested_capabilities: {
      methods: methodList,
      historical_block: historical,
      requires_trace: requiresTrace,
      requires_websocket: requiresWebsocket,
    },
    assessment: {
      research_fit: researchFit,
      fit_score: fitScore,
      risk_level: chainDataRiskLevel(100 - fitScore),
      flags,
      local_fork_readiness:
        historical !== null || requiresTrace
          ? "verify_archive_and_trace_before_use"
          : "basic_read_only_route_may_be_enough",
    },
    recommended_live_probes: [
      "eth_chainId",
      "eth_blockNumber",
      ...(methodList.includes("eth_getLogs") ? ["eth_getLogs"] : []),
      ...(methodList.includes("eth_getStorageAt") ? ["eth_getStorageAt at the target block"] : []),
      ...(requiresTrace ? ["debug_traceTransaction or trace_transaction"] : []),
    ],
    limitations: [
      "This is a planning probe and does not perform live RPC calls.",
      "Provider-specific archive, trace, REST, gRPC-Web, and WebSocket behavior must be tested on the final route.",
    ],
  };
}

export function buildAgentChainDataRoutePlan({
  task,
  chain,
  dataNeed = "mixed",
  budgetUsdc = "0.02",
  riskTolerance = "medium",
  fetchedAt = new Date().toISOString(),
}) {
  const budget = parseNonNegativeNumber(budgetUsdc, 0.02);
  const need = String(dataNeed || "mixed").toLowerCase();
  const route = [
    routeStep("agent-rpc-preflight", "Screen endpoint, method, price, and budget before chain-data access."),
  ];
  if (["storage", "trace", "fork", "rpc", "mixed"].includes(need)) {
    route.push(
      routeStep("rpc-capability-probe", "Confirm the route fits historical reads, trace, logs, or local-fork research."),
    );
  }
  if (["indexed", "sql", "logs", "mixed"].includes(need)) {
    route.push(
      routeStep("indexed-chain-query-preflight", "Check query shape, result size, and schema discovery before indexed-data spend."),
    );
  }
  route.push(
    routeStep("x402-rpc-payment-guard", "Guard the final RPC or indexed-data payment before wallet signing."),
  );

  const affordable = [];
  let total = 0;
  for (const step of route) {
    const price = parseNonNegativeNumber(step.price_usdc.replace(/^\$/, ""), 0);
    if (total + price <= budget || affordable.length === 0) {
      affordable.push(step);
      total += price;
    }
  }
  return {
    product: "agent-chain-data-route-plan",
    schema_version: "1.0",
    fetched_at: fetchedAt,
    task,
    chain,
    data_need: need,
    risk_tolerance: riskTolerance,
    budget_usdc: budget,
    recommended_route: affordable,
    full_route: route,
    estimated_cost_usdc: Number(total.toFixed(6)),
    stop_conditions: [
      "Endpoint preflight returns BLOCK.",
      "Capability probe says the requested research workflow needs unsupported archive, trace, or WebSocket behavior.",
      "Indexed query estimate exceeds budget or lacks schema discovery.",
      riskTolerance === "low"
        ? "Any medium-risk chain-data flag appears."
        : "Multiple medium-risk chain-data flags appear.",
    ],
    escalation:
      affordable.length < route.length
        ? "Budget is too small for the full chain-data route; run the prefix and escalate before paying more."
        : "Route fits budget; use the payment guard before signing.",
    limitations: [
      "This route plan is provider-neutral and does not disclose or depend on a named upstream.",
      "Live upstream behavior and terms still need owner review for production use.",
    ],
  };
}

export function buildIndexedChainQueryPreflight({
  chain,
  queryType,
  estimatedRows = null,
  maxPriceUsdc = null,
  fetchedAt = new Date().toISOString(),
}) {
  const rows = parseNonNegativeInteger(estimatedRows);
  const maxPrice = parseNonNegativeNumber(maxPriceUsdc);
  const flags = [];
  let riskScore = 0;
  if (queryType !== "schema" && rows === null) {
    flags.push({
      code: "RESULT_SIZE_UNKNOWN",
      severity: "medium",
      detail: "Run schema discovery or add row limits before paying for the query.",
    });
    riskScore += 20;
  } else if (rows !== null && rows > 100_000) {
    flags.push({
      code: "BROAD_QUERY_RESULT",
      severity: "medium",
      detail: "Estimated rows are high; narrow block range, address set, or event topics first.",
    });
    riskScore += 25;
  }
  if (maxPrice !== null && maxPrice > 0.10) {
    flags.push({
      code: "HIGH_QUERY_PRICE_LIMIT",
      severity: "medium",
      detail: "The maximum price is high for an autonomous indexed-data probe.",
    });
    riskScore += 15;
  }
  if (["sql", "protocol_timeline"].includes(queryType) && maxPrice === null) {
    flags.push({
      code: "NO_PRICE_CEILING",
      severity: "high",
      detail: "SQL-style chain-data queries should have a price ceiling before autonomous payment.",
    });
    riskScore += 35;
  }
  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
  return {
    product: "indexed-chain-query-preflight",
    schema_version: "1.0",
    fetched_at: fetchedAt,
    chain,
    query_type: queryType,
    query_context: {
      estimated_rows: rows,
      max_price_usdc: maxPrice,
      schema_discovery_recommended: queryType !== "schema",
    },
    assessment: {
      decision: chainDataDecision(riskScore),
      risk_level: chainDataRiskLevel(riskScore),
      risk_score: riskScore,
      flags,
      next_query_shape:
        queryType === "schema"
          ? "Fetch schema and table metadata before selecting paid query fields."
          : "Use explicit chain, address/topic filters, block range, row limit, and price ceiling.",
    },
    limitations: [
      "This preflight does not execute SQL or fetch indexed data.",
      "Actual query price and available schema depend on the selected provider route.",
    ],
  };
}

export function buildX402RpcPaymentGuard({
  requestId,
  endpointUrl,
  chain,
  method,
  payTo = null,
  amountUsdc,
  maxSingleUsdc = "0.01",
  sessionBudgetUsdc = "1.00",
  fetchedAt = new Date().toISOString(),
}) {
  const preflight = buildAgentRpcPreflight({
    endpointUrl,
    chain,
    method,
    maxPriceUsdc: amountUsdc,
    sessionBudgetUsdc,
    fetchedAt,
  });
  const amount = parseNonNegativeNumber(amountUsdc);
  const maxSingle = parseNonNegativeNumber(maxSingleUsdc, 0.01);
  const sessionBudget = parseNonNegativeNumber(sessionBudgetUsdc, 1);
  const flags = [...preflight.assessment.flags];
  let riskScore = preflight.assessment.risk_score;
  if (amount === null) {
    flags.push({
      code: "INVALID_AMOUNT",
      severity: "high",
      detail: "The requested amount is not a valid non-negative USDC decimal.",
    });
    riskScore += 60;
  } else {
    if (amount > maxSingle) {
      flags.push({
        code: "AMOUNT_EXCEEDS_SINGLE_LIMIT",
        severity: "high",
        detail: "The requested RPC/data payment exceeds the single-payment limit.",
      });
      riskScore += 45;
    }
    if (amount > sessionBudget) {
      flags.push({
        code: "AMOUNT_EXCEEDS_SESSION_BUDGET",
        severity: "high",
        detail: "The requested RPC/data payment exceeds the session budget.",
      });
      riskScore += 45;
    }
  }
  if (payTo && !ADDRESS_PATTERN.test(payTo)) {
    flags.push({
      code: "INVALID_PAYMENT_RECIPIENT",
      severity: "high",
      detail: "The payment recipient is not a valid EVM address.",
    });
    riskScore += 60;
  }
  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
  const decision = chainDataDecision(riskScore);
  return {
    product: "x402-rpc-payment-guard",
    schema_version: "1.0",
    fetched_at: fetchedAt,
    request_id: requestId,
    endpoint: preflight.endpoint,
    payment: {
      pay_to: payTo,
      amount_usdc: amount,
      max_single_usdc: maxSingle,
      session_budget_usdc: sessionBudget,
      protocol: "x402",
    },
    decision,
    signer_directive:
      decision === "ALLOW"
        ? "sign_only_if_wallet_policy_matches_this_request"
        : decision === "REVIEW"
          ? "pause_for_policy_owner_review"
          : "do_not_sign",
    assessment: {
      risk_level: chainDataRiskLevel(riskScore),
      risk_score: riskScore,
      flags,
    },
    replay_protection: {
      idempotency_key: requestId,
      bind_endpoint_origin: preflight.endpoint.origin,
      bind_method: method,
      bind_chain: chain,
    },
    limitations: [
      "This public wrapper does not mint a production authorization token.",
      "Use owner-controlled signer policy, KMS, MPC, or smart-account modules for real signing.",
    ],
  };
}

function agentUtilityDecision(score) {
  if (score >= 70) return "BLOCK";
  if (score >= 30) return "REVIEW";
  return "ALLOW";
}

function riskLevelFromScore(score) {
  if (score >= 70) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function stableReceiptStub(product, input, score, flags) {
  const body = JSON.stringify({
    product,
    input,
    score,
    flags: flags.map(flag => flag.code),
  });
  let hash = 2166136261;
  for (let index = 0; index < body.length; index += 1) {
    hash ^= body.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `signgate-demo:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildAgentRiskUtility({
  productId,
  input,
  fetchedAt = new Date().toISOString(),
}) {
  const flags = [];
  let score = 8;
  const amount = parseNonNegativeNumber(input.amount_usdc ?? input.value_usdc);
  const riskScore = parseNonNegativeInteger(input.risk_score);
  if (riskScore !== null) score += Math.min(100, riskScore);
  if (amount !== null && amount >= 1000) {
    flags.push({
      code: "HIGH_VALUE_ACTION",
      severity: "medium",
      detail: "The value at risk is high enough to require policy review.",
    });
    score += 25;
  }
  if (amount !== null && amount >= 10_000) {
    flags.push({
      code: "MATERIAL_VALUE_ACTION",
      severity: "high",
      detail: "Material-value autonomous actions should not proceed without human approval.",
    });
    score += 35;
  }
  if (input.address && !ADDRESS_PATTERN.test(input.address)) {
    flags.push({
      code: "INVALID_ADDRESS",
      severity: "high",
      detail: "The supplied address is not a valid EVM address.",
    });
    score += 80;
  }
  if (input.token && !ADDRESS_PATTERN.test(input.token)) {
    flags.push({
      code: "INVALID_TOKEN_CONTRACT",
      severity: "high",
      detail: "The supplied token is not a valid EVM contract address.",
    });
    score += 80;
  }
  if (input.to && !ADDRESS_PATTERN.test(input.to)) {
    flags.push({
      code: "INVALID_TRANSACTION_TARGET",
      severity: "high",
      detail: "The transaction target is not a valid EVM address.",
    });
    score += 80;
  }
  if (input.from && !ADDRESS_PATTERN.test(input.from)) {
    flags.push({
      code: "INVALID_TRANSACTION_SENDER",
      severity: "high",
      detail: "The transaction sender is not a valid EVM address.",
    });
    score += 80;
  }
  if (input.calldata && String(input.calldata) !== "0x") {
    flags.push({
      code: "CALLDATA_REQUIRES_DECODE",
      severity: "medium",
      detail: "Non-empty calldata should be decoded before autonomous signing.",
    });
    score += 20;
  }
  if (input.max_slippage_bps && Number(input.max_slippage_bps) > 300) {
    flags.push({
      code: "HIGH_SWAP_SLIPPAGE",
      severity: "medium",
      detail: "The requested slippage tolerance is high for an unattended swap.",
    });
    score += 20;
  }
  if (productId === "token-risk") {
    flags.push(
      {
        code: "HONEYPOT_SIMULATION_REQUIRED",
        severity: "info",
        detail: "Run live buy/sell simulation before treating this token as safe.",
      },
      {
        code: "AUTHORITY_CHECK_REQUIRED",
        severity: "info",
        detail: "Check mint, pause, blacklist, proxy, and owner authority before approval.",
      },
    );
    score += 8;
  }
  if (productId === "stablecoin-health") {
    flags.push({
      code: "ISSUER_CONTROL_REVIEW",
      severity: "info",
      detail: "Stablecoin blacklist, freeze, and issuer-control behavior should be part of treasury policy.",
    });
  }
  if (productId === "wallet-dossier") {
    flags.push({
      code: "DOSSIER_IS_COMPACT",
      severity: "info",
      detail: "Use deeper trace or counterparty checks for high-value or regulated workflows.",
    });
  }
  if (productId === "policy-decide" && !input.risk_score) {
    flags.push({
      code: "CALLER_RISK_SCORE_MISSING",
      severity: "medium",
      detail: "Policy decision used default risk because caller did not provide a risk score.",
    });
    score += 20;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const decision = agentUtilityDecision(score);
  return {
    product: productId,
    schema_version: "1.0",
    fetched_at: fetchedAt,
    decision,
    risk_score: score,
    risk_level: riskLevelFromScore(score),
    reasons: flags.map(flag => flag.code),
    input: Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== null && value !== ""),
    ),
    evidence: {
      flags,
      freshness: "live-preflight",
      source: "signgate-policy-and-risk-heuristics",
      upstream_disclosure:
        "Provider-neutral public endpoint; no named upstream dependency is exposed.",
    },
    valid_until: new Date(Date.now() + 5 * 60_000).toISOString(),
    signed_receipt: stableReceiptStub(productId, input, score, flags),
    next_actions:
      decision === "ALLOW"
        ? ["Proceed only through the owner-controlled signer policy."]
        : decision === "REVIEW"
          ? ["Pause for Payment Guard or policy-owner review before signing."]
          : ["Do not sign or pay until the flagged risk is resolved."],
    limitations: [
      "This endpoint returns preflight intelligence, not custody or transaction execution.",
      "High-value, regulated, or uncertain actions should combine this result with signed Payment Guard policy.",
    ],
  };
}

export function buildSumsubEvidenceServiceResponse({
  productId,
  input = {},
  fetchedAt = new Date().toISOString(),
}) {
  const serviceId = SUMSUB_PRODUCT_TO_SERVICE_ID[productId];
  const product = PRODUCTS_BY_ID[productId];
  const manifest = buildSumsubEvidenceManifest({
    environment: "sandbox",
    evaluated_at: fetchedAt,
    allowedChecks: SUMSUB_SANDBOX_ALLOWED_CHECKS,
  });
  const service =
    manifest.services.find(candidate => candidate.id === serviceId) ??
    listSumsubEvidenceServices().find(candidate => candidate.id === serviceId);
  const missingInputs = (product?.inputSchema.required ?? []).filter(
    key => !input[key],
  );
  const enabled = Boolean(service?.enabled);
  const decisionSupport = !enabled
    ? "DENY"
    : missingInputs.length > 0
      ? "REQUIRE_APPROVAL"
      : "EVIDENCE_READY";

  return {
    product: productId,
    provider: "sumsub",
    schema_version: "sumsub_evidence_response.v0",
    fetched_at: fetchedAt,
    service: {
      id: service?.id ?? serviceId,
      name: service?.name ?? productTitle(product),
      entitlement: service?.entitlement ?? null,
      enabled,
      category: service?.category ?? "compliance_evidence",
      normalized_output: service?.normalized_output ?? "sumsub_evidence.v0",
      pricing_tier: service?.pricing_tier ?? "evidence",
      fail_closed_on_error: service?.fail_closed_on_error ?? true,
    },
    request: Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== null && value !== ""),
    ),
    decision_support: decisionSupport,
    reason_codes: [
      ...(!enabled ? ["SUMSUB_SERVICE_NOT_ENABLED"] : []),
      ...missingInputs.map(key => `SUMSUB_REQUIRED_INPUT_MISSING_${key.toUpperCase()}`),
      "SANDBOX_DEMO_EVIDENCE_ONLY",
    ],
    evidence: {
      status: enabled && missingInputs.length === 0 ? "available" : "not_ready",
      normalized_output_schema: service?.normalized_output ?? "sumsub_evidence.v0",
      entitlement_description: service?.entitlement_description ?? null,
      source: "sumsub-sandbox-capability-manifest",
      evidence_digest_ready: true,
      live_adapter_status: "not_connected_in_worker",
      demo_result: {
        creates_applicant: false,
        uploads_documents: false,
        moves_money: false,
        production_signing: false,
      },
    },
    manifest_summary: {
      schema_version: manifest.schema_version,
      service_count: manifest.service_count,
      enabled_service_count: manifest.enabled_service_count,
      disabled_service_count: manifest.disabled_service_count,
    },
    next_actions:
      decisionSupport === "EVIDENCE_READY"
        ? [
            "Bind this normalized evidence object into a SignGate evidence_digest.",
            "Use live Sumsub API response data only inside a server-side adapter.",
          ]
        : [
            "Fail closed until the required input and Sumsub entitlement are available.",
            "Do not treat missing evidence as approval.",
          ],
    limitations: [
      "This x402 resource productizes the evidence contract and sandbox capability mapping.",
      "It does not create Sumsub applicants, upload documents, trigger real KYC/KYB, move funds, or perform production signing.",
      "Sandbox evidence is for product integration testing only, not a compliance guarantee.",
    ],
    price_usdc: product?.price ?? null,
  };
}

export function buildTokenExitRisk({
  token,
  tokenRisk,
  dexMarket,
  fetchedAt = new Date().toISOString(),
}) {
  const pair =
    dexMarket?.deepest_pair ?? tokenRisk?.dex_liquidity?.best_pair ?? null;
  const liquidityUsd = Number(pair?.liquidity_usd ?? 0);
  const volumeUsd = Number(
    dexMarket?.aggregate_top5?.volume_24h_usd ?? pair?.volume_24h_usd ?? 0,
  );
  const buys = Number(dexMarket?.aggregate_top5?.buys_24h ?? pair?.buys_24h ?? 0);
  const sells = Number(
    dexMarket?.aggregate_top5?.sells_24h ?? pair?.sells_24h ?? 0,
  );
  const ageHours = pairAgeHours(pair?.pair_created_at, fetchedAt);
  const flags = [...(tokenRisk?.assessment?.flags ?? [])];
  let riskScore = Number(tokenRisk?.assessment?.risk_score ?? 0);
  if (!pair) {
    flags.push({
      code: "NO_DEX_EXIT_PATH",
      severity: "high",
      detail: "No Base DEX pair was found for an exit route.",
    });
    riskScore += 45;
  }
  if (liquidityUsd > 0 && liquidityUsd < 50_000) {
    flags.push({
      code: "THIN_EXIT_LIQUIDITY",
      severity: "medium",
      detail: `Observed exit liquidity is about $${liquidityUsd.toFixed(2)}.`,
    });
    riskScore += liquidityUsd < 10_000 ? 30 : 15;
  }
  const volumeToLiquidity = liquidityUsd > 0 ? volumeUsd / liquidityUsd : null;
  if (volumeToLiquidity !== null && volumeToLiquidity > 3) {
    flags.push({
      code: "HIGH_VOLUME_TO_LIQUIDITY",
      severity: "medium",
      detail: "24h volume is high relative to available liquidity, increasing slippage/exit risk.",
    });
    riskScore += 15;
  }
  if (sells >= Math.max(10, buys * 1.5)) {
    flags.push({
      code: "SELL_PRESSURE_EXIT_RISK",
      severity: "medium",
      detail: "Sell count materially exceeds buy count.",
    });
    riskScore += 15;
  }
  if (ageHours !== null && ageHours < 24) {
    flags.push({
      code: "NEW_PAIR_EXIT_UNPROVEN",
      severity: "medium",
      detail: `Deepest pair is about ${ageHours} hour(s) old.`,
    });
    riskScore += 10;
  }
  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
  const exitRisk =
    riskScore >= 70 ? "high" : riskScore >= 35 ? "medium" : "low";
  return {
    product: "base-token-exit-risk",
    schema_version: "1.0",
    network: BASE_MAINNET,
    token,
    fetched_at: fetchedAt,
    market: {
      deepest_pair: pair,
      pair_age_hours: ageHours,
      liquidity_usd: liquidityUsd,
      volume_24h_usd: volumeUsd,
      volume_to_liquidity: volumeToLiquidity,
      buys_24h: buys,
      sells_24h: sells,
      sell_buy_ratio: buys > 0 ? sells / buys : null,
    },
    assessment: {
      exit_risk: exitRisk,
      risk_score: riskScore,
      flags,
      bot_action:
        exitRisk === "high"
          ? "Do not enter automatically; require manual review or a much smaller size."
          : exitRisk === "medium"
            ? "Limit size, recheck immediately before execution, and require slippage controls."
            : "Exit conditions look usable for small automated checks; still enforce slippage and sizing.",
    },
    machine_tags: [
      "kind:token-exit",
      `exit-risk:${exitRisk}`,
      ...(tokenRisk?.token_metadata?.symbol
        ? [`symbol:${tokenRisk.token_metadata.symbol}`]
        : []),
    ],
    provenance: {
      providers: ["Blockscout Base", "DexScreener"],
      token_url: `${BLOCKSCOUT}/token/${token}`,
      dexscreener_url: `https://dexscreener.com/search?q=${token}`,
    },
    limitations: [
      "This is not a sell simulation and does not guarantee successful exit.",
      "Liquidity, taxes, pauses, and route availability can change before execution.",
      "Bots should still enforce max slippage, max size, and post-entry stop conditions.",
    ],
  };
}

export async function tokenExitRisk(token, fetchImpl = fetch) {
  const [tokenRisk, dexMarket] = await Promise.all([
    tokenPreflight(token, fetchImpl),
    dexMarketMonitor(token, fetchImpl),
  ]);
  return buildTokenExitRisk({ token, tokenRisk, dexMarket });
}

function validateBcsChain(value) {
  return /^[a-z0-9_-]{2,32}$/.test(String(value ?? ""));
}

function validateBcsAddress(value) {
  return /^[A-Za-z0-9:_-]{3,128}$/.test(String(value ?? ""));
}

function parseCsvList(value, pattern, limit = 30) {
  return String(value ?? "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
    .filter(item => pattern.test(item))
    .slice(0, limit);
}

function buildBcsGatewayResponse({
  product,
  method,
  upstreamPath,
  request,
  upstream,
  headers = {},
  fetchedAt = new Date().toISOString(),
}) {
  return {
    product,
    schema_version: "1.0",
    network: BASE_MAINNET,
    upstream_service: "blockchainsecurity-atlantis",
    request,
    fetched_at: fetchedAt,
    upstream_status: headers.status ?? null,
    upstream_headers: {
      request_id: headers.requestId ?? null,
      credit_cost: headers.creditCost ?? null,
      credit_remaining: headers.creditRemaining ?? null,
    },
    upstream_response: upstream,
    provenance: {
      upstream_base_url: BCS_API_BASE,
      upstream_path: upstreamPath,
      upstream_method: method,
      auth_model: "server-side X-API-Key secret",
    },
    limitations: [
      "This x402 resource proxies BlockchainSecurity API responses; upstream availability and credits are required.",
      "The caller receives BlockchainSecurity response data but never receives the upstream API key.",
    ],
  };
}

export async function bcsGatewayRequest({
  product,
  apiKey,
  method = "GET",
  upstreamPath,
  query = {},
  body = null,
  fetchImpl = fetch,
}) {
  if (!apiKey) throw new Error("bcs_api_key_missing");
  const url = new URL(upstreamPath, BCS_API_BASE);
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url.toString(), {
      method,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "user-agent": "AgentPaymentGuardBCSProxy/1.0",
        "x-api-key": apiKey,
      },
      body: body === null ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { raw: await response.text() };
    if (!response.ok) {
      const error = new Error(`bcs_http_${response.status}`);
      error.payload = payload;
      throw error;
    }
    return buildBcsGatewayResponse({
      product,
      method,
      upstreamPath,
      request: { ...query, ...(body ? { body } : {}) },
      upstream: payload,
      headers: {
        status: response.status,
        requestId: response.headers.get("x-request-id"),
        creditCost: response.headers.get("x-credit-cost"),
        creditRemaining: response.headers.get("x-credit-remaining"),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function usdcToAtomic(value) {
  if (!/^[0-9]+(?:\.[0-9]{1,6})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

export function buildPaymentProof({
  txHash,
  recipient,
  amount,
  transaction,
  fetchedAt = new Date().toISOString(),
}) {
  const expectedAtomic = usdcToAtomic(amount);
  const normalizedRecipient = recipient.toLowerCase();
  const usdcTransfers = (transaction.token_transfers ?? []).filter(
    transfer =>
      transfer.token?.address_hash?.toLowerCase() === USDC.toLowerCase(),
  );
  const matchingTransfer = usdcTransfers.find(
    transfer =>
      transfer.to?.hash?.toLowerCase() === normalizedRecipient &&
      BigInt(transfer.total?.value ?? 0) === expectedAtomic,
  );
  const successful = transaction.status === "ok";
  const confirmations = parseCount(transaction.confirmations);
  return {
    product: "base-payment-proof",
    schema_version: "1.0",
    network: BASE_MAINNET,
    fetched_at: fetchedAt,
    transaction_hash: txHash,
    verified: Boolean(successful && matchingTransfer && confirmations >= 1),
    finality: {
      status: transaction.status ?? null,
      confirmations,
      block_number: transaction.block_number ?? null,
      timestamp: transaction.timestamp ?? null,
    },
    expected: {
      token: USDC,
      recipient,
      amount_usdc: amount,
      amount_atomic: expectedAtomic?.toString() ?? null,
    },
    matched_transfer: matchingTransfer
      ? {
          payer: matchingTransfer.from?.hash ?? null,
          recipient: matchingTransfer.to?.hash ?? null,
          amount_atomic: matchingTransfer.total?.value ?? null,
          token: matchingTransfer.token?.address_hash ?? null,
        }
      : null,
    observed_usdc_transfers: usdcTransfers.map(transfer => ({
      payer: transfer.from?.hash ?? null,
      recipient: transfer.to?.hash ?? null,
      amount_atomic: transfer.total?.value ?? null,
    })),
    provenance: {
      provider: "Blockscout Base",
      transaction_url: `${BLOCKSCOUT}/tx/${txHash}`,
    },
  };
}

export async function paymentProof(txHash, recipient, amount, fetchImpl = fetch) {
  const transaction = await fetchJson(
    `${BLOCKSCOUT}/api/v2/transactions/${encodeURIComponent(txHash)}`,
    fetchImpl,
  );
  return buildPaymentProof({
    txHash,
    recipient,
    amount,
    transaction,
  });
}

export function buildWalletActivityDelta({
  address,
  since,
  transfers,
  fetchedAt = new Date().toISOString(),
}) {
  const sinceMs = Date.parse(since);
  const items = (transfers?.items ?? [])
    .filter(item => Date.parse(item.timestamp ?? "") >= sinceMs)
    .map(item =>
      summarizeTransfer({ ...item, _subject: address.toLowerCase() }),
    );
  return {
    product: "base-wallet-activity-delta",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    since,
    fetched_at: fetchedAt,
    transfer_count: items.length,
    transfers: items,
    truncated: Boolean(transfers?.next_page_params),
    provenance: {
      provider: "Blockscout Base",
      address_url: `${BLOCKSCOUT}/address/${address}`,
    },
    limitations: [
      "The endpoint covers the current Blockscout result page.",
      "A truncated response requires pagination-aware follow-up monitoring.",
    ],
  };
}

export async function walletActivityDelta(address, since, fetchImpl = fetch) {
  const transfers = await fetchJson(
    `${BLOCKSCOUT}/api/v2/addresses/${encodeURIComponent(address)}/token-transfers?type=ERC-20`,
    fetchImpl,
  );
  return buildWalletActivityDelta({ address, since, transfers });
}

export function buildApprovalRisk({
  token,
  owner,
  spender,
  allowanceAtomic,
  tokenInfo,
  spenderProfile,
  fetchedAt = new Date().toISOString(),
}) {
  const allowance = BigInt(allowanceAtomic);
  const decimals = Number(tokenInfo.decimals ?? 0);
  const maxUint256 = (1n << 256n) - 1n;
  const effectivelyUnlimited = allowance >= maxUint256 / 2n;
  const largeThreshold = 1_000_000n * 10n ** BigInt(Math.min(decimals, 36));
  const unusuallyLarge = !effectivelyUnlimited && allowance >= largeThreshold;
  const flags = [];
  let score = 0;

  if (effectivelyUnlimited) {
    flags.push({
      code: "UNLIMITED_ALLOWANCE",
      severity: "high",
      detail: "The allowance is effectively unlimited.",
    });
    score += 60;
  } else if (unusuallyLarge) {
    flags.push({
      code: "LARGE_ALLOWANCE",
      severity: "medium",
      detail: "The allowance is at least one million whole tokens.",
    });
    score += 25;
  }
  if (spenderProfile.is_scam || spenderProfile.reputation === "scam") {
    flags.push({
      code: "SPENDER_PUBLIC_SCAM_FLAG",
      severity: "critical",
      detail: "Blockscout marks the spender as scam-associated.",
    });
    score += 90;
  } else if (spenderProfile.is_contract && !spenderProfile.is_verified) {
    flags.push({
      code: "UNVERIFIED_SPENDER_CONTRACT",
      severity: "medium",
      detail: "The spender is a contract without verified source code.",
    });
    score += 20;
  }

  score = Math.min(score, 100);
  return {
    product: "base-approval-risk",
    schema_version: "1.0",
    network: BASE_MAINNET,
    fetched_at: fetchedAt,
    token,
    owner,
    spender,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        allowance === 0n
          ? "No current spending allowance was found."
          : effectivelyUnlimited
            ? "Revoke or replace this approval with a transaction-sized allowance unless unlimited access is required."
            : "Confirm the spender identity and reduce the allowance when practical.",
    },
    allowance: {
      atomic: allowance.toString(),
      formatted: formatUnits(allowance, decimals),
      decimals,
      symbol: tokenInfo.symbol ?? null,
      effectively_unlimited: effectivelyUnlimited,
    },
    spender_identity: {
      type: spenderProfile.is_contract ? "contract" : "eoa",
      is_verified_contract: Boolean(spenderProfile.is_verified),
      is_scam: Boolean(spenderProfile.is_scam),
      reputation: spenderProfile.reputation ?? null,
      name: spenderProfile.name ?? null,
      proxy_type: spenderProfile.proxy_type ?? null,
      implementations: spenderProfile.implementations ?? [],
    },
    provenance: {
      rpc_providers: BASE_RPCS,
      token_url: `${BLOCKSCOUT}/token/${token}`,
      spender_url: `${BLOCKSCOUT}/address/${spender}`,
      block_tag: "latest",
    },
    limitations: [
      "An allowance alone does not prove malicious intent.",
      "Spender ownership and upgradeability can change after this check.",
    ],
  };
}

export async function approvalRisk(token, owner, spender, fetchImpl = fetch) {
  const data = `0xdd62ed3e${encodeAddressWord(owner)}${encodeAddressWord(spender)}`;
  const [allowanceHex, tokenInfo, spenderProfile] = await Promise.all([
    rpcCall("eth_call", [{ to: token, data }, "latest"], fetchImpl),
    fetchJson(`${BLOCKSCOUT}/api/v2/tokens/${encodeURIComponent(token)}`, fetchImpl),
    fetchJson(
      `${BLOCKSCOUT}/api/v2/addresses/${encodeURIComponent(spender)}`,
      fetchImpl,
    ),
  ]);
  return buildApprovalRisk({
    token,
    owner,
    spender,
    allowanceAtomic: BigInt(allowanceHex || "0x0").toString(),
    tokenInfo,
    spenderProfile,
  });
}

export function buildContractVerification({
  address,
  profile,
  contract,
  fetchedAt = new Date().toISOString(),
}) {
  const flags = [];
  let score = 0;
  if (!profile.is_contract) {
    flags.push({
      code: "NOT_A_CONTRACT",
      severity: "critical",
      detail: "The supplied address is not identified as a contract.",
    });
    score += 90;
  } else if (!profile.is_verified || !contract.is_verified) {
    flags.push({
      code: "SOURCE_NOT_VERIFIED",
      severity: "high",
      detail: "Verified source code is not available on Blockscout.",
    });
    score += 45;
  }
  if (contract.is_partially_verified && !contract.is_fully_verified) {
    flags.push({
      code: "PARTIAL_VERIFICATION",
      severity: "medium",
      detail: "Only partial contract verification is reported.",
    });
    score += 15;
  }
  if (profile.proxy_type && !(profile.implementations ?? []).length) {
    flags.push({
      code: "UNRESOLVED_PROXY_IMPLEMENTATION",
      severity: "high",
      detail: "A proxy is detected but no implementation was resolved.",
    });
    score += 35;
  }
  if (contract.is_changed_bytecode) {
    flags.push({
      code: "CHANGED_BYTECODE",
      severity: "high",
      detail: "Blockscout reports changed deployed bytecode.",
    });
    score += 40;
  }

  score = Math.min(score, 100);
  return {
    product: "base-contract-verification",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 15 ? "medium" : "low",
      risk_score: score,
      flags,
    },
    verification: {
      is_contract: Boolean(profile.is_contract),
      is_verified: Boolean(profile.is_verified && contract.is_verified),
      is_fully_verified: Boolean(contract.is_fully_verified),
      is_partially_verified: Boolean(contract.is_partially_verified),
      verified_at: contract.verified_at ?? null,
      name: contract.name ?? profile.name ?? null,
      language: contract.language ?? null,
      compiler_version: contract.compiler_version ?? null,
      evm_version: contract.evm_version ?? null,
      optimization_enabled: contract.optimization_enabled ?? null,
      optimization_runs: contract.optimization_runs ?? null,
      license_type: contract.license_type ?? null,
      file_path: contract.file_path ?? null,
      verified_via_sourcify: Boolean(contract.is_verified_via_sourcify),
      changed_bytecode: Boolean(contract.is_changed_bytecode),
    },
    proxy: {
      type: profile.proxy_type ?? contract.proxy_type ?? null,
      implementations:
        profile.implementations?.length
          ? profile.implementations
          : contract.implementations ?? [],
      conflicting_implementations: contract.conflicting_implementations ?? [],
    },
    provenance: {
      provider: "Blockscout Base",
      contract_url: `${BLOCKSCOUT}/address/${address}?tab=contract`,
    },
    limitations: [
      "Verified source does not prove the contract is safe.",
      "Proxy implementations and admin controls can change after this check.",
    ],
  };
}

export async function contractVerification(address, fetchImpl = fetch) {
  const encoded = encodeURIComponent(address);
  const [profile, contract] = await Promise.all([
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}`, fetchImpl),
    fetchJson(`${BLOCKSCOUT}/api/v2/smart-contracts/${encoded}`, fetchImpl),
  ]);
  return buildContractVerification({ address, profile, contract });
}

export function buildUsdcReceipt({
  txHash,
  transaction,
  fetchedAt = new Date().toISOString(),
}) {
  const transfers = (transaction.token_transfers ?? [])
    .filter(
      transfer =>
        transfer.token?.address_hash?.toLowerCase() === USDC.toLowerCase(),
    )
    .map(transfer => ({
      payer: transfer.from?.hash ?? null,
      recipient: transfer.to?.hash ?? null,
      amount_atomic: transfer.total?.value ?? null,
      amount_usdc: formatUnits(BigInt(transfer.total?.value ?? 0), 6),
      log_index: transfer.log_index ?? null,
    }));
  const confirmations = parseCount(transaction.confirmations);
  return {
    product: "base-usdc-receipt",
    schema_version: "1.0",
    network: BASE_MAINNET,
    transaction_hash: txHash,
    fetched_at: fetchedAt,
    valid_receipt: transaction.status === "ok" && transfers.length > 0,
    finality: {
      status: transaction.status ?? null,
      confirmations,
      confirmed: confirmations >= 1,
      block_number: transaction.block_number ?? null,
      timestamp: transaction.timestamp ?? null,
    },
    canonical_usdc: USDC,
    transfer_count: transfers.length,
    transfers,
    provenance: {
      provider: "Blockscout Base",
      transaction_url: `${BLOCKSCOUT}/tx/${txHash}`,
    },
  };
}

export async function usdcReceipt(txHash, fetchImpl = fetch) {
  const transaction = await fetchJson(
    `${BLOCKSCOUT}/api/v2/transactions/${encodeURIComponent(txHash)}`,
    fetchImpl,
  );
  return buildUsdcReceipt({ txHash, transaction });
}

export function buildWalletCounterparty({
  address,
  transactions,
  transfers,
  fetchedAt = new Date().toISOString(),
}) {
  const subject = address.toLowerCase();
  const peers = new Map();
  const add = (candidate, kind, direction, adverse = false) => {
    const hash = candidate?.hash;
    if (!hash || hash.toLowerCase() === subject) return;
    const key = hash.toLowerCase();
    const row = peers.get(key) ?? {
      address: hash,
      interactions: 0,
      transactions: 0,
      token_transfers: 0,
      inbound: 0,
      outbound: 0,
      is_contract: Boolean(candidate.is_contract),
      is_scam: Boolean(candidate.is_scam),
      reputation: candidate.reputation ?? null,
    };
    row.interactions += 1;
    row[kind] += 1;
    row[direction] += 1;
    row.is_scam ||= adverse || Boolean(candidate.is_scam);
    peers.set(key, row);
  };

  for (const tx of transactions?.items ?? []) {
    const inbound = tx.to?.hash?.toLowerCase() === subject;
    add(inbound ? tx.from : tx.to, "transactions", inbound ? "inbound" : "outbound");
  }
  for (const transfer of transfers?.items ?? []) {
    const inbound = transfer.to?.hash?.toLowerCase() === subject;
    const tokenAdverse = ["scam", "spam", "suspicious"].includes(
      String(transfer.token?.reputation ?? "").toLowerCase(),
    );
    add(
      inbound ? transfer.from : transfer.to,
      "token_transfers",
      inbound ? "inbound" : "outbound",
      tokenAdverse,
    );
  }
  const ranked = [...peers.values()].sort(
    (a, b) => b.interactions - a.interactions,
  );
  return {
    product: "base-wallet-counterparty",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    fetched_at: fetchedAt,
    unique_counterparties: ranked.length,
    adverse_counterparties: ranked.filter(
      row => row.is_scam || !["ok", null].includes(row.reputation),
    ).length,
    counterparties: ranked.slice(0, 25),
    truncated: Boolean(
      transactions?.next_page_params || transfers?.next_page_params,
    ),
    provenance: {
      provider: "Blockscout Base",
      address_url: `${BLOCKSCOUT}/address/${address}`,
    },
    limitations: [
      "This ranks the current Blockscout result pages, not guaranteed lifetime history.",
      "Token spam can create unsolicited counterparties.",
    ],
  };
}

export async function walletCounterparty(address, fetchImpl = fetch) {
  const encoded = encodeURIComponent(address);
  const [transactions, transfers] = await Promise.all([
    fetchJson(`${BLOCKSCOUT}/api/v2/addresses/${encoded}/transactions`, fetchImpl),
    fetchJson(
      `${BLOCKSCOUT}/api/v2/addresses/${encoded}/token-transfers?type=ERC-20`,
      fetchImpl,
    ),
  ]);
  return buildWalletCounterparty({ address, transactions, transfers });
}

export function buildEventLogMonitor({
  address,
  fromBlock,
  logs,
  fetchedAt = new Date().toISOString(),
}) {
  const minimum = Number(fromBlock);
  const items = (logs?.items ?? [])
    .filter(item => Number(item.block_number ?? 0) >= minimum)
    .map(item => ({
      block_number: Number(item.block_number ?? 0),
      block_timestamp: item.block_timestamp ?? null,
      transaction_hash: item.transaction_hash ?? null,
      log_index: item.index ?? null,
      emitter: item.address?.hash ?? address,
      event: item.decoded?.method_call ?? null,
      event_id: item.decoded?.method_id ?? null,
      parameters: item.decoded?.parameters ?? [],
      topics: item.topics ?? [],
      data: item.data ?? null,
    }));
  return {
    product: "base-event-log-monitor",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    from_block: minimum,
    fetched_at: fetchedAt,
    event_count: items.length,
    latest_block: items[0]?.block_number ?? null,
    events: items,
    truncated: Boolean(logs?.next_page_params),
    provenance: {
      provider: "Blockscout Base",
      address_url: `${BLOCKSCOUT}/address/${address}?tab=logs`,
    },
    limitations: [
      "Only the current Blockscout result page is filtered.",
      "Some event logs may not have decoded signatures or parameters.",
    ],
  };
}

export async function eventLogMonitor(address, fromBlock, fetchImpl = fetch) {
  const logs = await fetchJson(
    `${BLOCKSCOUT}/api/v2/addresses/${encodeURIComponent(address)}/logs`,
    fetchImpl,
    25_000,
  );
  return buildEventLogMonitor({ address, fromBlock, logs });
}

function hexToBigInt(value) {
  return BigInt(value || "0x0");
}

export function buildGasFeeQuote({
  gasLimit,
  gasPriceHex,
  priorityFeeHex,
  block,
  fetchedAt = new Date().toISOString(),
}) {
  const gasPrice = hexToBigInt(gasPriceHex);
  const priorityFee = hexToBigInt(priorityFeeHex);
  const baseFee = hexToBigInt(block.baseFeePerGas);
  const limit = BigInt(gasLimit);
  const estimatedWei = gasPrice * limit;
  return {
    product: "base-gas-fee-quote",
    schema_version: "1.0",
    network: BASE_MAINNET,
    fetched_at: fetchedAt,
    block_number: Number(hexToBigInt(block.number)),
    gas_limit: gasLimit,
    fees: {
      gas_price_wei: gasPrice.toString(),
      gas_price_gwei: formatUnits(gasPrice, 9),
      base_fee_wei: baseFee.toString(),
      base_fee_gwei: formatUnits(baseFee, 9),
      priority_fee_wei: priorityFee.toString(),
      priority_fee_gwei: formatUnits(priorityFee, 9),
    },
    estimated_cost: {
      wei: estimatedWei.toString(),
      eth: formatUnits(estimatedWei, 18),
    },
    block_utilization_percent:
      Number(block.gasLimit ?? 0) > 0
        ? Number(
            (
              (Number(hexToBigInt(block.gasUsed)) /
                Number(hexToBigInt(block.gasLimit))) *
              100
            ).toFixed(4),
          )
        : null,
    provenance: {
      rpc_providers: BASE_RPCS,
      block_tag: "latest",
    },
    limitations: [
      "The estimate uses the supplied gas limit and current gas price, not transaction simulation.",
      "Fees can change before a transaction is submitted or included.",
    ],
  };
}

export async function gasFeeQuote(gasLimit, fetchImpl = fetch) {
  const [gasPriceHex, priorityFeeHex, block] = await Promise.all([
    rpcCall("eth_gasPrice", [], fetchImpl),
    rpcCall("eth_maxPriorityFeePerGas", [], fetchImpl),
    rpcCall("eth_getBlockByNumber", ["latest", false], fetchImpl),
  ]);
  return buildGasFeeQuote({
    gasLimit,
    gasPriceHex,
    priorityFeeHex,
    block,
  });
}

export function buildNonceReadiness({
  address,
  latestHex,
  pendingHex,
  fetchedAt = new Date().toISOString(),
}) {
  const confirmed = hexToBigInt(latestHex);
  const pending = hexToBigInt(pendingHex);
  const pendingCount = pending >= confirmed ? pending - confirmed : 0n;
  return {
    product: "base-nonce-readiness",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    fetched_at: fetchedAt,
    confirmed_nonce: confirmed.toString(),
    pending_nonce: pending.toString(),
    pending_transaction_count: pendingCount.toString(),
    ready: pendingCount === 0n,
    decision_hint:
      pendingCount === 0n
        ? `Use nonce ${pending.toString()} for the next transaction.`
        : `${pendingCount.toString()} transaction(s) appear pending; use nonce ${pending.toString()} or inspect the queue before replacement.`,
    provenance: {
      rpc_providers: BASE_RPCS,
      confirmed_block_tag: "latest",
      pending_block_tag: "pending",
    },
  };
}

export async function nonceReadiness(address, fetchImpl = fetch) {
  const [latestHex, pendingHex] = await Promise.all([
    rpcCall("eth_getTransactionCount", [address, "latest"], fetchImpl),
    rpcCall("eth_getTransactionCount", [address, "pending"], fetchImpl),
  ]);
  return buildNonceReadiness({ address, latestHex, pendingHex });
}

export function buildStablecoinBalance({
  address,
  balances,
  tokenInfo,
  fetchedAt = new Date().toISOString(),
}) {
  let totalUsd = 0;
  const assets = STABLECOINS.map((coin, index) => {
    const atomic = BigInt(balances[index]);
    const formatted = formatUnits(atomic, coin.decimals);
    const referenceRate = Number(tokenInfo[index]?.exchange_rate ?? 1);
    const usdValue = Number(formatted) * referenceRate;
    totalUsd += Number.isFinite(usdValue) ? usdValue : 0;
    return {
      symbol: coin.symbol,
      contract: coin.address,
      atomic: atomic.toString(),
      balance: formatted,
      reference_rate_usd: Number.isFinite(referenceRate)
        ? referenceRate
        : null,
      estimated_value_usd: Number.isFinite(usdValue)
        ? Number(usdValue.toFixed(6))
        : null,
      reputation: tokenInfo[index]?.reputation ?? null,
    };
  });
  return {
    product: "base-stablecoin-balance",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    fetched_at: fetchedAt,
    total_estimated_value_usd: Number(totalUsd.toFixed(6)),
    assets,
    provenance: {
      rpc_providers: BASE_RPCS,
      block_tag: "latest",
    },
    limitations: [
      "Reference rates are public metadata and may lag market prices.",
      "Only the three listed Base stablecoin contracts are included.",
    ],
  };
}

export async function stablecoinBalance(address, fetchImpl = fetch) {
  const data = `0x70a08231${encodeAddressWord(address)}`;
  const balances = await rpcBatchCall(
    STABLECOINS.map(coin => ({
      method: "eth_call",
      params: [{ to: coin.address, data }, "latest"],
    })),
    fetchImpl,
  );
  return buildStablecoinBalance({
    address,
    balances: balances.map(value => hexToBigInt(value).toString()),
    tokenInfo: STABLECOINS.map(() => ({
      exchange_rate: "1",
      reputation: "ok",
    })),
  });
}

function evidenceOutcome(check) {
  if (check.status === "unavailable" || check.status === "skipped") return "WARN";
  const serialized = JSON.stringify(check.result ?? {}).toLowerCase();
  const riskScore = Number(
    check.result?.risk_score ??
      check.result?.assessment?.risk_score ??
      check.result?.summary?.risk_score ??
      NaN,
  );
  if (/\b(deny|block|blocked|critical|malicious|sanction)\b/.test(serialized)) {
    return "FAIL";
  }
  if (Number.isFinite(riskScore) && riskScore >= 80) return "FAIL";
  if (
    /\b(warn|review|medium|high|suspicious|unverified)\b/.test(serialized) ||
    (Number.isFinite(riskScore) && riskScore >= 50)
  ) {
    return "WARN";
  }
  return "PASS";
}

async function x402TransactionPreflight(input, productId, fetchImpl = fetch) {
  const now = new Date();
  const merchantAddress = String(input.merchant_address ?? "").trim();
  const walletAddress = String(input.wallet_address ?? merchantAddress).trim();
  const tx = String(input.tx ?? "").trim();
  const expectedRecipient = String(input.expected_recipient ?? merchantAddress).trim();
  const expectedAmount = String(input.expected_amount ?? "").trim();
  const token = String(input.token ?? "").trim();
  const owner = String(input.owner ?? walletAddress).trim();
  const spender = String(input.spender ?? merchantAddress).trim();
  const contractAddress = String(input.contract_address ?? merchantAddress).trim();
  const fromBlock = String(input.from_block ?? "").trim();
  const gasLimit = String(input.gas_limit ?? "21000").trim();
  const since =
    String(input.since ?? "").trim() ||
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const checks = [];
  const run = async (id, enabled, fn) => {
    if (!enabled) {
      const check = { id, status: "skipped" };
      checks.push({ ...check, outcome: evidenceOutcome(check) });
      return;
    }
    try {
      const check = { id, status: "ok", result: await fn() };
      checks.push({ ...check, outcome: evidenceOutcome(check) });
    } catch (error) {
      const check = {
        id,
        status: "unavailable",
        error: error instanceof Error ? error.message : String(error),
      };
      checks.push({ ...check, outcome: evidenceOutcome(check) });
    }
  };

  await run("x402-merchant-trust", ADDRESS_PATTERN.test(merchantAddress), () =>
    merchantTrust(merchantAddress, fetchImpl),
  );
  await run(
    "base-wallet-activity-delta",
    ADDRESS_PATTERN.test(walletAddress) && Number.isFinite(Date.parse(since)),
    () => walletActivityDelta(walletAddress, since, fetchImpl),
  );
  await run("base-wallet-counterparty", ADDRESS_PATTERN.test(walletAddress), () =>
    walletCounterparty(walletAddress, fetchImpl),
  );
  await run("base-stablecoin-balance", ADDRESS_PATTERN.test(walletAddress), () =>
    stablecoinBalance(walletAddress, fetchImpl),
  );
  await run("base-nonce-readiness", ADDRESS_PATTERN.test(walletAddress), () =>
    nonceReadiness(walletAddress, fetchImpl),
  );
  await run(
    "base-gas-fee-quote",
    /^[0-9]+$/.test(gasLimit) &&
      Number.isSafeInteger(Number(gasLimit)) &&
      Number(gasLimit) >= 21_000 &&
      Number(gasLimit) <= 30_000_000,
    () => gasFeeQuote(gasLimit, fetchImpl),
  );
  await run("base-usdc-receipt", TX_PATTERN.test(tx), () =>
    usdcReceipt(tx, fetchImpl),
  );
  await run(
    "base-payment-proof",
    TX_PATTERN.test(tx) &&
      ADDRESS_PATTERN.test(expectedRecipient) &&
      usdcToAtomic(expectedAmount) !== null,
    () => paymentProof(tx, expectedRecipient, expectedAmount, fetchImpl),
  );
  await run(
    "base-approval-risk",
    ADDRESS_PATTERN.test(token) &&
      ADDRESS_PATTERN.test(owner) &&
      ADDRESS_PATTERN.test(spender),
    () => approvalRisk(token, owner, spender, fetchImpl),
  );
  await run("base-contract-verification", ADDRESS_PATTERN.test(contractAddress), () =>
    contractVerification(contractAddress, fetchImpl),
  );
  await run(
    "base-event-log-monitor",
    ADDRESS_PATTERN.test(contractAddress) &&
      /^[0-9]+$/.test(fromBlock) &&
      Number.isSafeInteger(Number(fromBlock)),
    () => eventLogMonitor(contractAddress, fromBlock, fetchImpl),
  );

  const ok = checks.filter(check => check.status === "ok").length;
  const unavailable = checks.filter(check => check.status === "unavailable").length;
  const skipped = checks.filter(check => check.status === "skipped").length;
  const failed = checks.filter(check => check.outcome === "FAIL").length;
  const warned = checks.filter(check => check.outcome === "WARN").length;
  const decision = failed > 0 ? "DENY" : warned > 0 ? "REQUIRE_REVIEW" : "ALLOW";
  const product = PRODUCTS_BY_ID[productId] ?? PRODUCTS_BY_ID["x402-transaction-preflight"];
  return {
    product: product.id,
    schema_version: "1.0",
    pricing_version: PRICING_VERSION,
    network: BASE_MAINNET,
    evaluated_at: now.toISOString(),
    decision,
    merchant_address: merchantAddress,
    wallet_address: walletAddress || null,
    summary: {
      checks_total: checks.length,
      checks_ok: ok,
      checks_unavailable: unavailable,
      checks_skipped: skipped,
      evidence_passed: checks.filter(check => check.outcome === "PASS").length,
      evidence_warned: warned,
      evidence_failed: failed,
      recommendation:
        decision === "ALLOW"
          ? "Proceed with the transaction under the caller's policy limits."
          : decision === "REQUIRE_REVIEW"
          ? "Require review before payment because one or more evidence checks warned or were unavailable."
          : "Deny payment because one or more evidence checks failed.",
    },
    replaces_separate_operations: [
      "x402-merchant-trust",
      "base-payment-proof",
      "base-wallet-activity-delta",
      "base-approval-risk",
      "base-contract-verification",
      "base-usdc-receipt",
      "base-wallet-counterparty",
      "base-event-log-monitor",
      "base-gas-fee-quote",
      "base-nonce-readiness",
      "base-stablecoin-balance",
    ],
    separate_list_price_usdc: "0.205",
    preflight_price_usdc: product.price,
    price_variant:
      product.id === "x402-transaction-preflight-lite"
        ? "0.15"
        : product.id === "x402-transaction-preflight-plus"
        ? "0.50"
        : "0.25",
    checks,
  };
}

export function buildDexMarketMonitor({
  token,
  pairs,
  fetchedAt = new Date().toISOString(),
}) {
  const basePairs = (pairs ?? [])
    .filter(pair => pair.chainId === "base")
    .sort(
      (a, b) =>
        Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0),
    );
  const topPairs = basePairs.slice(0, 5).map(pair => ({
    dex: pair.dexId ?? null,
    pair_address: pair.pairAddress ?? null,
    url: pair.url ?? null,
    base_token: pair.baseToken ?? null,
    quote_token: pair.quoteToken ?? null,
    price_usd: pair.priceUsd ?? null,
    price_native: pair.priceNative ?? null,
    liquidity_usd: Number(pair.liquidity?.usd ?? 0),
    volume_24h_usd: Number(pair.volume?.h24 ?? 0),
    buys_24h: Number(pair.txns?.h24?.buys ?? 0),
    sells_24h: Number(pair.txns?.h24?.sells ?? 0),
    price_change: pair.priceChange ?? {},
    pair_created_at: pair.pairCreatedAt
      ? new Date(pair.pairCreatedAt).toISOString()
      : null,
  }));
  return {
    product: "base-dex-market-monitor",
    schema_version: "1.0",
    network: BASE_MAINNET,
    token,
    fetched_at: fetchedAt,
    pair_count: basePairs.length,
    aggregate_top5: {
      liquidity_usd: Number(
        topPairs.reduce((sum, pair) => sum + pair.liquidity_usd, 0).toFixed(2),
      ),
      volume_24h_usd: Number(
        topPairs.reduce((sum, pair) => sum + pair.volume_24h_usd, 0).toFixed(2),
      ),
      buys_24h: topPairs.reduce((sum, pair) => sum + pair.buys_24h, 0),
      sells_24h: topPairs.reduce((sum, pair) => sum + pair.sells_24h, 0),
    },
    deepest_pair: topPairs[0] ?? null,
    pairs: topPairs,
    provenance: {
      provider: "DexScreener",
      url: `https://dexscreener.com/search?q=${token}`,
    },
    limitations: [
      "The same economic liquidity can appear across related pools or routes.",
      "DEX prices and liquidity can change between observation and execution.",
    ],
  };
}

export async function dexMarketMonitor(token, fetchImpl = fetch) {
  const payload = await fetchJson(
    `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(token)}`,
    fetchImpl,
  );
  return buildDexMarketMonitor({ token, pairs: payload.pairs ?? [] });
}

export function buildAlphaRiskContext({
  subject,
  requestedKind = "auto",
  addressRisk = null,
  tokenRisk = null,
  dexMarket = null,
  counterparty = null,
  fetchedAt = new Date().toISOString(),
}) {
  const tokenSignals = tokenRisk?.token_metadata
    ? {
        symbol: tokenRisk.token_metadata.symbol,
        name: tokenRisk.token_metadata.name,
        holders_count: tokenRisk.token_metadata.holders_count,
        liquidity_usd:
          tokenRisk.dex_liquidity?.best_pair?.liquidity_usd ??
          dexMarket?.deepest_pair?.liquidity_usd ??
          0,
        volume_24h_usd:
          dexMarket?.aggregate_top5?.volume_24h_usd ??
          tokenRisk.dex_liquidity?.best_pair?.volume_24h_usd ??
          0,
        buys_24h:
          dexMarket?.aggregate_top5?.buys_24h ??
          tokenRisk.dex_liquidity?.best_pair?.buys_24h ??
          0,
        sells_24h:
          dexMarket?.aggregate_top5?.sells_24h ??
          tokenRisk.dex_liquidity?.best_pair?.sells_24h ??
          0,
        deepest_pair_url:
          dexMarket?.deepest_pair?.url ??
          tokenRisk.dex_liquidity?.best_pair?.url ??
          null,
      }
    : null;
  const detectedKind =
    requestedKind === "token" ||
    (requestedKind === "auto" && tokenSignals)
      ? "token"
      : "wallet";
  const sourceFlags = [
    ...(addressRisk?.assessment?.flags ?? []),
    ...(tokenRisk?.assessment?.flags ?? []),
  ];
  const severeFlagScore = sourceFlags.reduce((score, flag) => {
    const severity = String(flag.severity ?? "").toLowerCase();
    if (severity === "critical") return Math.max(score, 100);
    if (severity === "high") return Math.max(score, 75);
    if (severity === "medium") return Math.max(score, 40);
    return Math.max(score, 10);
  }, 0);
  const baseScore = Math.max(
    Number(addressRisk?.assessment?.risk_score ?? 0),
    Number(tokenRisk?.assessment?.risk_score ?? 0),
    severeFlagScore,
  );
  const counterpartyPenalty =
    Number(counterparty?.adverse_counterparties ?? 0) > 0 ? 15 : 0;
  const liquidityPenalty =
    tokenSignals && tokenSignals.liquidity_usd > 0 && tokenSignals.liquidity_usd < 10_000
      ? 15
      : 0;
  const noLiquidityPenalty =
    detectedKind === "token" && tokenSignals && tokenSignals.liquidity_usd === 0
      ? 20
      : 0;
  const riskScore = Math.min(
    100,
    baseScore + counterpartyPenalty + liquidityPenalty + noLiquidityPenalty,
  );
  const riskLevel =
    riskScore >= 70 ? "high" : riskScore >= 25 ? "medium" : "low";
  const alphaScore =
    detectedKind === "token" && tokenSignals
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              Math.log10(Math.max(tokenSignals.volume_24h_usd, 1)) * 12 +
                Math.log10(Math.max(tokenSignals.liquidity_usd, 1)) * 10 +
                Math.min(tokenSignals.buys_24h + tokenSignals.sells_24h, 500) / 10 -
                riskScore * 0.7,
            ),
          ),
        )
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              Number(counterparty?.unique_counterparties ?? 0) * 3 -
                Number(counterparty?.adverse_counterparties ?? 0) * 12 -
                riskScore * 0.5,
            ),
          ),
        );
  const tradeBias =
    riskLevel === "high"
      ? "avoid"
      : alphaScore >= 65
        ? "watch"
        : alphaScore >= 35
          ? "monitor"
          : "ignore";
  const nextAction =
    tradeBias === "avoid"
      ? "Do not copy, buy, or interact automatically."
      : tradeBias === "watch"
        ? "Add to a short-lived watchlist and recheck before execution."
        : tradeBias === "monitor"
          ? "Monitor only; require stronger liquidity or activity before action."
          : "Ignore unless a separate strategy has a stronger signal.";

  return {
    product: "base-alpha-risk-context",
    schema_version: "1.0",
    network: BASE_MAINNET,
    subject,
    requested_kind: requestedKind,
    detected_kind: detectedKind,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: riskLevel,
      risk_score: riskScore,
      alpha_score: alphaScore,
      trade_bias: tradeBias,
      next_action: nextAction,
      flags: sourceFlags.slice(0, 12),
    },
    token: tokenSignals,
    wallet: {
      identity: addressRisk?.identity ?? null,
      transactions_count:
        addressRisk?.activity?.transactions_count ?? null,
      token_transfers_count:
        addressRisk?.activity?.token_transfers_count ?? null,
      unique_counterparties:
        counterparty?.unique_counterparties ?? null,
      adverse_counterparties:
        counterparty?.adverse_counterparties ?? null,
      top_counterparties:
        counterparty?.counterparties?.slice(0, 5) ?? [],
    },
    machine_tags: [
      `kind:${detectedKind}`,
      `risk:${riskLevel}`,
      `bias:${tradeBias}`,
      ...(tokenSignals?.symbol ? [`symbol:${tokenSignals.symbol}`] : []),
    ],
    provenance: {
      providers: [
        "Blockscout Base",
        ...(tokenSignals ? ["DexScreener"] : []),
      ],
      subject_url: `${BLOCKSCOUT}/address/${subject}`,
      dexscreener_url: tokenSignals
        ? `https://dexscreener.com/search?q=${subject}`
        : null,
    },
    limitations: [
      "This endpoint is a fast pre-trade signal, not investment advice.",
      "Public labels, DEX liquidity, and volume can change quickly.",
      "The response is designed for bot filtering; execution still needs slippage, simulation, and position sizing controls.",
    ],
  };
}

export async function alphaRiskContext(
  subject,
  requestedKind = "auto",
  fetchImpl = fetch,
) {
  const normalizedKind = ["auto", "wallet", "token"].includes(requestedKind)
    ? requestedKind
    : "auto";
  const addressRisk = await addressPreflight(subject, fetchImpl);
  const wantsToken =
    normalizedKind === "token" ||
    (normalizedKind === "auto" && addressRisk.identity?.is_contract);
  const [counterpartyResult, tokenResult, dexResult] = await Promise.allSettled([
    walletCounterparty(subject, fetchImpl),
    wantsToken ? tokenPreflight(subject, fetchImpl) : Promise.resolve(null),
    wantsToken ? dexMarketMonitor(subject, fetchImpl) : Promise.resolve(null),
  ]);
  return buildAlphaRiskContext({
    subject,
    requestedKind: normalizedKind,
    addressRisk,
    counterparty:
      counterpartyResult.status === "fulfilled" ? counterpartyResult.value : null,
    tokenRisk:
      tokenResult.status === "fulfilled" ? tokenResult.value : null,
    dexMarket:
      dexResult.status === "fulfilled" ? dexResult.value : null,
  });
}

function scoreTradingActivity({ liquidityUsd, volumeUsd, buys, sells }) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Math.log10(Math.max(liquidityUsd, 1)) * 9 +
          Math.log10(Math.max(volumeUsd, 1)) * 11 +
          Math.min(buys + sells, 700) / 9,
      ),
    ),
  );
}

function pairAgeHours(pairCreatedAt, fetchedAt) {
  if (!pairCreatedAt) return null;
  const created = Date.parse(pairCreatedAt);
  const fetched = Date.parse(fetchedAt);
  if (!Number.isFinite(created) || !Number.isFinite(fetched)) return null;
  return Math.max(0, Number(((fetched - created) / 3_600_000).toFixed(2)));
}

export function buildTokenAlphaSnapshot({
  token,
  tokenRisk,
  dexMarket,
  fetchedAt = new Date().toISOString(),
}) {
  const pair =
    dexMarket?.deepest_pair ?? tokenRisk?.dex_liquidity?.best_pair ?? null;
  const liquidityUsd = Number(pair?.liquidity_usd ?? 0);
  const volumeUsd = Number(
    dexMarket?.aggregate_top5?.volume_24h_usd ?? pair?.volume_24h_usd ?? 0,
  );
  const buys = Number(dexMarket?.aggregate_top5?.buys_24h ?? pair?.buys_24h ?? 0);
  const sells = Number(
    dexMarket?.aggregate_top5?.sells_24h ?? pair?.sells_24h ?? 0,
  );
  const buySellImbalance = buys - sells;
  const riskScore = Number(tokenRisk?.assessment?.risk_score ?? 0);
  const activityScore = scoreTradingActivity({
    liquidityUsd,
    volumeUsd,
    buys,
    sells,
  });
  const alphaScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        activityScore + Math.max(0, buySellImbalance) / 12 - riskScore * 0.55,
      ),
    ),
  );
  const tradeBias =
    riskScore >= 70
      ? "avoid"
      : alphaScore >= 70
        ? "watch"
        : alphaScore >= 40
          ? "monitor"
          : "ignore";

  return {
    product: "base-token-alpha-snapshot",
    schema_version: "1.0",
    network: BASE_MAINNET,
    token,
    fetched_at: fetchedAt,
    token_metadata: tokenRisk?.token_metadata ?? null,
    market: {
      pair_count:
        dexMarket?.pair_count ?? tokenRisk?.dex_liquidity?.pair_count_on_base ?? 0,
      deepest_pair: pair,
      liquidity_usd: liquidityUsd,
      volume_24h_usd: volumeUsd,
      buys_24h: buys,
      sells_24h: sells,
      buy_sell_imbalance: buySellImbalance,
      price_change: pair?.price_change ?? {},
    },
    assessment: {
      risk_score: riskScore,
      alpha_score: alphaScore,
      activity_score: activityScore,
      trade_bias: tradeBias,
      flags: tokenRisk?.assessment?.flags ?? [],
      next_action:
        tradeBias === "avoid"
          ? "Do not let a bot buy or route through this token automatically."
          : tradeBias === "watch"
            ? "Add to a short-lived watchlist and recheck liquidity before execution."
            : tradeBias === "monitor"
              ? "Monitor only until activity or liquidity strengthens."
              : "Ignore unless another strategy provides a stronger signal.",
    },
    machine_tags: [
      "kind:token",
      `bias:${tradeBias}`,
      `risk:${riskScore >= 70 ? "high" : riskScore >= 25 ? "medium" : "low"}`,
      ...(tokenRisk?.token_metadata?.symbol
        ? [`symbol:${tokenRisk.token_metadata.symbol}`]
        : []),
    ],
    provenance: {
      providers: ["Blockscout Base", "DexScreener"],
      token_url: `${BLOCKSCOUT}/token/${token}`,
      dexscreener_url: `https://dexscreener.com/search?q=${token}`,
    },
    limitations: [
      "This is a fast ranking signal, not investment advice.",
      "It does not simulate buy or sell execution.",
      "Liquidity and volume can change before a bot acts.",
    ],
  };
}

export async function tokenAlphaSnapshot(token, fetchImpl = fetch) {
  const [tokenRisk, dexMarket] = await Promise.all([
    tokenPreflight(token, fetchImpl),
    dexMarketMonitor(token, fetchImpl),
  ]);
  return buildTokenAlphaSnapshot({ token, tokenRisk, dexMarket });
}

export function buildWalletCopytradeRisk({
  address,
  addressRisk,
  counterparty,
  fetchedAt = new Date().toISOString(),
}) {
  const baseRisk = Number(addressRisk?.assessment?.risk_score ?? 0);
  const txCount = Number(addressRisk?.activity?.transactions_count ?? 0);
  const transferCount = Number(addressRisk?.activity?.token_transfers_count ?? 0);
  const uniqueCounterparties = Number(counterparty?.unique_counterparties ?? 0);
  const adverseCounterparties = Number(counterparty?.adverse_counterparties ?? 0);
  const activityScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(Math.log10(Math.max(txCount + transferCount, 1)) * 24),
    ),
  );
  const networkQuality = Math.max(
    0,
    Math.min(100, uniqueCounterparties * 5 - adverseCounterparties * 18),
  );
  const copytradeScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(activityScore * 0.45 + networkQuality * 0.55 - baseRisk * 0.6),
    ),
  );
  const recommendation =
    baseRisk >= 70 || adverseCounterparties >= 3
      ? "avoid"
      : copytradeScore >= 65
        ? "candidate"
        : copytradeScore >= 35
          ? "monitor"
          : "ignore";

  return {
    product: "base-wallet-copytrade-risk",
    schema_version: "1.0",
    network: BASE_MAINNET,
    address,
    fetched_at: fetchedAt,
    assessment: {
      public_risk_score: baseRisk,
      activity_score: activityScore,
      network_quality_score: networkQuality,
      copytrade_score: copytradeScore,
      recommendation,
      flags: addressRisk?.assessment?.flags ?? [],
      next_action:
        recommendation === "avoid"
          ? "Do not copy this wallet automatically."
          : recommendation === "candidate"
            ? "Candidate for a small watchlist; recheck before copy execution."
            : recommendation === "monitor"
              ? "Monitor for repeatable behavior before copying."
              : "Ignore unless another strategy already selected this wallet.",
    },
    wallet: {
      identity: addressRisk?.identity ?? null,
      transactions_count: txCount,
      token_transfers_count: transferCount,
      unique_counterparties: uniqueCounterparties,
      adverse_counterparties: adverseCounterparties,
      top_counterparties: counterparty?.counterparties?.slice(0, 10) ?? [],
    },
    machine_tags: [
      "kind:wallet",
      `copytrade:${recommendation}`,
      `risk:${baseRisk >= 70 ? "high" : baseRisk >= 25 ? "medium" : "low"}`,
    ],
    provenance: {
      provider: "Blockscout Base",
      address_url: `${BLOCKSCOUT}/address/${address}`,
    },
    limitations: [
      "This endpoint does not compute realized trading PnL.",
      "Counterparty quality is based on the current public result pages.",
      "Copytrading still needs sizing, slippage, and strategy controls.",
    ],
  };
}

export async function walletCopytradeRisk(address, fetchImpl = fetch) {
  const [addressRisk, counterparty] = await Promise.all([
    addressPreflight(address, fetchImpl),
    walletCounterparty(address, fetchImpl),
  ]);
  return buildWalletCopytradeRisk({ address, addressRisk, counterparty });
}

export function buildNewPoolRisk({
  token,
  tokenRisk,
  dexMarket,
  fetchedAt = new Date().toISOString(),
}) {
  const pair =
    dexMarket?.deepest_pair ?? tokenRisk?.dex_liquidity?.best_pair ?? null;
  const liquidityUsd = Number(pair?.liquidity_usd ?? 0);
  const volumeUsd = Number(pair?.volume_24h_usd ?? 0);
  const buys = Number(pair?.buys_24h ?? 0);
  const sells = Number(pair?.sells_24h ?? 0);
  const ageHours = pairAgeHours(pair?.pair_created_at, fetchedAt);
  const flags = [...(tokenRisk?.assessment?.flags ?? [])];
  let riskScore = Number(tokenRisk?.assessment?.risk_score ?? 0);
  if (!pair) {
    flags.push({
      code: "NO_BASE_POOL",
      severity: "high",
      detail: "No Base liquidity pool was found.",
    });
    riskScore += 35;
  }
  if (ageHours !== null && ageHours < 24) {
    flags.push({
      code: "VERY_NEW_PAIR",
      severity: "medium",
      detail: `Deepest pair is about ${ageHours} hour(s) old.`,
    });
    riskScore += 20;
  }
  if (liquidityUsd > 0 && liquidityUsd < 25_000) {
    flags.push({
      code: "LOW_LAUNCH_LIQUIDITY",
      severity: "medium",
      detail: `Observed liquidity is about $${liquidityUsd.toFixed(2)}.`,
    });
    riskScore += 20;
  }
  if (sells > buys * 1.8 && sells >= 10) {
    flags.push({
      code: "SELL_PRESSURE",
      severity: "medium",
      detail: "24h sells materially exceed buys on the deepest pair.",
    });
    riskScore += 15;
  }
  riskScore = Math.min(100, riskScore);
  const launchRisk =
    riskScore >= 70 ? "high" : riskScore >= 35 ? "medium" : "low";

  return {
    product: "base-new-pool-risk",
    schema_version: "1.0",
    network: BASE_MAINNET,
    token,
    fetched_at: fetchedAt,
    pool: {
      deepest_pair: pair,
      age_hours: ageHours,
      liquidity_usd: liquidityUsd,
      volume_24h_usd: volumeUsd,
      buys_24h: buys,
      sells_24h: sells,
      buy_sell_imbalance: buys - sells,
    },
    assessment: {
      launch_risk: launchRisk,
      risk_score: riskScore,
      flags,
      next_action:
        launchRisk === "high"
          ? "Block automated buying until liquidity, source, and sellability are independently verified."
          : launchRisk === "medium"
            ? "Allow monitoring only; require a later refresh before execution."
            : "Eligible for watchlist monitoring with normal execution controls.",
    },
    machine_tags: [
      "kind:new-pool",
      `risk:${launchRisk}`,
      ...(tokenRisk?.token_metadata?.symbol
        ? [`symbol:${tokenRisk.token_metadata.symbol}`]
        : []),
    ],
    provenance: {
      providers: ["Blockscout Base", "DexScreener"],
      token_url: `${BLOCKSCOUT}/token/${token}`,
      dexscreener_url: `https://dexscreener.com/search?q=${token}`,
    },
    limitations: [
      "This endpoint does not prove that a token can be sold.",
      "Pair age is based on indexed DEX metadata and may be missing.",
      "Launch-stage liquidity can change abruptly.",
    ],
  };
}

export async function newPoolRisk(token, fetchImpl = fetch) {
  const [tokenRisk, dexMarket] = await Promise.all([
    tokenPreflight(token, fetchImpl),
    dexMarketMonitor(token, fetchImpl),
  ]);
  return buildNewPoolRisk({ token, tokenRisk, dexMarket });
}

export function buildPredictionMarketSnapshot({
  ticker,
  market,
  orderbook,
  fetchedAt = new Date().toISOString(),
}) {
  const yesLevels = orderbook?.orderbook_fp?.yes_dollars ?? [];
  const noLevels = orderbook?.orderbook_fp?.no_dollars ?? [];
  return {
    product: "prediction-market-snapshot",
    schema_version: "1.0",
    venue: "Kalshi",
    ticker,
    fetched_at: fetchedAt,
    market: {
      event_ticker: market.event_ticker ?? null,
      title: market.title ?? null,
      yes_subtitle: market.yes_sub_title ?? null,
      no_subtitle: market.no_sub_title ?? null,
      status: market.status ?? null,
      close_time: market.close_time ?? null,
      yes_bid_dollars: market.yes_bid_dollars ?? null,
      yes_ask_dollars: market.yes_ask_dollars ?? null,
      no_bid_dollars: market.no_bid_dollars ?? null,
      no_ask_dollars: market.no_ask_dollars ?? null,
      last_price_dollars: market.last_price_dollars ?? null,
      previous_price_dollars: market.previous_price_dollars ?? null,
      volume: market.volume_fp ?? null,
      volume_24h: market.volume_24h_fp ?? null,
      open_interest: market.open_interest_fp ?? null,
      liquidity_dollars: market.liquidity_dollars ?? null,
      result: market.result ?? null,
    },
    orderbook: {
      yes_bids: yesLevels.slice(-10).reverse().map(([price, size]) => ({
        price_dollars: price,
        size,
      })),
      no_bids: noLevels.slice(-10).reverse().map(([price, size]) => ({
        price_dollars: price,
        size,
      })),
    },
    provenance: {
      provider: "Kalshi public Trade API",
      market_url: `${KALSHI}/markets/${ticker}`,
      orderbook_url: `${KALSHI}/markets/${ticker}/orderbook?depth=10`,
    },
    limitations: [
      "This is a read-only snapshot and does not place or recommend trades.",
      "Orderbook levels and quotes can change immediately after retrieval.",
    ],
  };
}

export async function predictionMarketSnapshot(ticker, fetchImpl = fetch) {
  const encoded = encodeURIComponent(ticker);
  const [marketPayload, orderbook] = await Promise.all([
    fetchJson(`${KALSHI}/markets/${encoded}`, fetchImpl),
    fetchJson(`${KALSHI}/markets/${encoded}/orderbook?depth=10`, fetchImpl),
  ]);
  return buildPredictionMarketSnapshot({
    ticker,
    market: marketPayload.market ?? {},
    orderbook,
  });
}

const MAX_DOCUMENT_BYTES = 512_000;
const MAX_FEED_BYTES = 1_000_000;
const NPM_PACKAGE_PATTERN =
  /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i;
const GITHUB_OWNER_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const GITHUB_REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
const DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
const PYPI_PACKAGE_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,198}[A-Za-z0-9])?$/;

function isBlockedIpv4(hostname) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return false;
  const octets = hostname.split(".").map(Number);
  if (octets.some(octet => octet < 0 || octet > 255)) return true;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && [18, 19].includes(b)) ||
    a >= 224
  );
}

export function validatePublicUrl(value) {
  if (typeof value !== "string" || value.length < 8 || value.length > 2048) {
    throw new Error("invalid_url_length");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("invalid_url");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("unsupported_url_protocol");
  }
  if (parsed.username || parsed.password) throw new Error("url_credentials_forbidden");
  if (parsed.port && !["80", "443"].includes(parsed.port)) {
    throw new Error("url_port_forbidden");
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname ||
    hostname.includes(":") ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa") ||
    isBlockedIpv4(hostname)
  ) {
    throw new Error("private_or_local_url_forbidden");
  }
  return parsed;
}

async function fetchPublicResource(
  value,
  {
    fetchImpl = fetch,
    headers = {},
    method = "GET",
    maxRedirects = 5,
    timeoutMs = UPSTREAM_TIMEOUT_MS,
  } = {},
) {
  let current = validatePublicUrl(value);
  const redirects = [];
  for (let index = 0; index <= maxRedirects; index += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(current.toString(), {
        method,
        redirect: "manual",
        headers: {
          accept: "*/*",
          "user-agent": "AgentCommerceSafety/0.5",
          ...headers,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return { response, finalUrl: current.toString(), redirects };
    }
    const location = response.headers.get("location");
    if (!location) throw new Error("redirect_without_location");
    if (index === maxRedirects) throw new Error("too_many_redirects");
    const next = validatePublicUrl(new URL(location, current).toString());
    redirects.push({
      status: response.status,
      from: current.toString(),
      to: next.toString(),
    });
    current = next;
  }
  throw new Error("too_many_redirects");
}

async function readResponseBytes(response, maxBytes) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error("upstream_document_too_large");
  if (!response.body) return { bytes: new Uint8Array(), truncated: false };
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.length > maxBytes) {
      const remaining = Math.max(0, maxBytes - total);
      if (remaining) chunks.push(value.slice(0, remaining));
      total += remaining;
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    total += value.length;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { bytes, truncated };
}

function bytesToText(bytes) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

async function sha256Hex(value) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function shouldRecordX402PurchaseEvent({ method, status, paymentHeader }) {
  if (!status || status >= 400) return false;
  if (method === "HEAD" || method === "OPTIONS") return false;
  return Boolean(String(paymentHeader ?? "").trim());
}

function shortHashPrefix(hash, prefix) {
  return hash ? `${prefix}_${hash.slice(0, 24)}` : null;
}

function extractPaymentMetadata(paymentHeader) {
  const decoded = decodePaymentRequirement(paymentHeader) ?? {};
  const payload = decoded.payload ?? decoded;
  const authorization = decoded.authorization ?? payload.authorization ?? {};
  const payerAddress =
    authorization.from ??
    authorization.payer ??
    authorization.address ??
    payload.from ??
    payload.payer ??
    null;
  const paymentHash =
    decoded.paymentHash ??
    decoded.payment_hash ??
    payload.paymentHash ??
    payload.payment_hash ??
    payload.txHash ??
    payload.transactionHash ??
    null;
  return {
    payer_address:
      typeof payerAddress === "string" && ADDRESS_PATTERN.test(payerAddress)
        ? payerAddress
        : null,
    payment_hash:
      typeof paymentHash === "string" && /^0x[a-fA-F0-9]{64}$/.test(paymentHash)
        ? paymentHash
        : null,
  };
}

function classifyInternalTest(c, userAgent) {
  const value = [
    c.req.header("x-openclaw-test"),
    c.req.header("x-founder-test"),
    c.req.header("x-ci-test"),
    c.req.header("x-monitor-check"),
    c.req.header("x-staging-traffic"),
  ]
    .find(item => String(item ?? "").trim())
    ?.toLowerCase();
  if (value?.includes("openclaw")) return "openclaw";
  if (value?.includes("founder")) return "founder";
  if (value?.includes("ci")) return "ci";
  if (value?.includes("monitor") || /health|monitor|uptime/i.test(userAgent)) {
    return "monitor";
  }
  if (value?.includes("staging") || c.req.header("cf-worker")?.includes("staging")) {
    return "staging";
  }
  return "unknown";
}

async function latestSequenceIdForBuyer(db, buyerIdHash, purchasedAt) {
  if (!buyerIdHash) return null;
  const cutoff = new Date(Date.parse(purchasedAt) - 10 * 60_000).toISOString();
  try {
    const row = await db
      .prepare(
        `SELECT sequence_id
         FROM x402_purchase_events
         WHERE buyer_id_hash = ?
           AND purchased_at >= ?
           AND sequence_id IS NOT NULL
         ORDER BY purchased_at DESC
         LIMIT 1`,
      )
      .bind(buyerIdHash, cutoff)
      .first();
    return row?.sequence_id ?? null;
  } catch {
    return null;
  }
}

async function recordX402PurchaseEvent(db, c) {
  if (!db) return;
  const url = new URL(c.req.url);
  const product =
    PRODUCTS_BY_PATH[url.pathname] ??
    (url.pathname === PAYMENT_GUARD_POLICY_PATH
      ? { id: "payment-guard-policy", price: PRODUCTS[25].price }
      : null);
  if (!product) return;
  const paymentHeader =
    c.req.header("x-payment") ??
    c.req.header("payment") ??
    c.req.header("payment-signature") ??
    "";
  if (
    !shouldRecordX402PurchaseEvent({
      method: c.req.method,
      status: c.res?.status,
      paymentHeader,
    })
  ) {
    return;
  }
  const paymentHeaderHash = paymentHeader
    ? await sha256Hex(paymentHeader.slice(0, 4096))
    : null;
  const paymentMetadata = extractPaymentMetadata(paymentHeader);
  const userAgent = (c.req.header("user-agent") ?? "").slice(0, 500);
  const userAgentHash = userAgent ? await sha256Hex(userAgent) : null;
  const country = (c.req.header("cf-ipcountry") ?? "").slice(0, 8);
  const purchasedAt = new Date().toISOString();
  const requestId =
    c.req.header("x-request-id") ??
    c.req.header("cf-ray") ??
    url.searchParams.get("request_id") ??
    null;
  const buyerSeed =
    paymentMetadata.payer_address ??
    c.req.header("x-api-key-id") ??
    paymentHeaderHash ??
    null;
  const buyerIdHash = buyerSeed ? await sha256Hex(`buyer:v1:${buyerSeed}`) : null;
  const sequenceId =
    (await latestSequenceIdForBuyer(db, buyerIdHash, purchasedAt)) ??
    shortHashPrefix(await sha256Hex(`${buyerIdHash ?? paymentHeaderHash}:${purchasedAt}`), "seq");
  const purchaseId = shortHashPrefix(
    await sha256Hex(
      `${product.id}:${paymentHeaderHash}:${requestId ?? ""}:${purchasedAt}`,
    ),
    "pur",
  );
  const price = product.price.replace("$", "");
  const responseStatus = c.res?.status ?? null;
  const decision = c.res?.headers?.get("x-signgate-decision") ?? null;
  const latencyMs = parseNonNegativeInteger(c.res?.headers?.get("server-timing")?.match(/dur=([0-9]+)/)?.[1]);
  const cacheStatus = c.res?.headers?.get("cf-cache-status") ?? c.res?.headers?.get("x-cache") ?? null;
  const internalTest = classifyInternalTest(c, userAgent);
  const campaign = (
    url.searchParams.get("campaign") ??
    url.searchParams.get("utm_campaign") ??
    url.searchParams.get("ref") ??
    ""
  )
    .replace(/[^A-Za-z0-9._:-]/g, "-")
    .slice(0, 120);
  const referrer = (
    c.req.header("referer") ??
    c.req.header("referrer") ??
    url.searchParams.get("utm_source") ??
    ""
  ).slice(0, 500);
  const queryStringHash = url.search
    ? await sha256Hex(url.search.slice(0, 4096))
    : null;
  await db
    .prepare(
      `INSERT INTO x402_purchase_events
       (product_id, method, path, price_usdc, pay_to, payment_header_hash,
        user_agent, country, status, campaign, referrer, query_string_hash,
        created_at, purchase_id, purchased_at, operation_id, service_name,
        pricing_version, quoted_price, paid_amount, currency, network,
        payment_hash, payer_address, buyer_id_hash, request_id, sequence_id,
        user_agent_hash, response_status, decision, latency_ms, cache_status,
        internal_test)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      product.id,
      c.req.method,
      url.pathname,
      productPriceNumber(product),
      PAY_TO,
      paymentHeaderHash,
      null,
      country || null,
      responseStatus,
      campaign || null,
      referrer || null,
      queryStringHash,
      purchasedAt,
      purchaseId,
      purchasedAt,
      product.id,
      productTitle(product),
      PRICING_VERSION,
      price,
      price,
      "USDC",
      BASE_MAINNET,
      paymentMetadata.payment_hash ?? paymentHeaderHash,
      paymentMetadata.payer_address,
      buyerIdHash,
      requestId,
      sequenceId,
      userAgentHash,
      responseStatus,
      decision,
      latencyMs,
      cacheStatus,
      internalTest,
    )
    .run();
}

function decodePaymentRequirement(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    try {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }
}

export function buildX402EndpointPreflight({
  url,
  status,
  requirement,
  redirects = [],
  fetchedAt = new Date().toISOString(),
}) {
  const accepts = Array.isArray(requirement?.accepts) ? requirement.accepts : [];
  const flags = [];
  let score = 0;
  if (status !== 402) {
    flags.push({
      code: "NOT_PAYMENT_REQUIRED",
      severity: "medium",
      detail: `The unpaid probe returned HTTP ${status}, not HTTP 402.`,
    });
    score += 25;
  }
  if (!requirement || accepts.length === 0) {
    flags.push({
      code: "MISSING_PAYMENT_REQUIREMENTS",
      severity: "high",
      detail: "No decodable x402 payment requirement with accepted methods was found.",
    });
    score += 55;
  }
  for (const accept of accepts) {
    if (!accept.network || !accept.scheme || !accept.amount || !accept.payTo) {
      flags.push({
        code: "INCOMPLETE_PAYMENT_METHOD",
        severity: "high",
        detail: "An accepted payment method is missing network, scheme, amount, or payTo.",
      });
      score += 35;
    }
    if (
      accept.network === BASE_MAINNET &&
      String(accept.asset ?? "").toLowerCase() !== USDC.toLowerCase()
    ) {
      flags.push({
        code: "NON_CANONICAL_BASE_USDC",
        severity: "high",
        detail: "A Base payment method does not use the canonical Base USDC contract.",
      });
      score += 45;
    }
    if (accept.payTo && !ADDRESS_PATTERN.test(accept.payTo)) {
      flags.push({
        code: "INVALID_EVM_RECIPIENT",
        severity: "high",
        detail: "An EVM payment recipient is malformed.",
      });
      score += 40;
    }
    try {
      if (BigInt(accept.amount ?? 0) <= 0n) throw new Error("non-positive");
    } catch {
      flags.push({
        code: "INVALID_PAYMENT_AMOUNT",
        severity: "high",
        detail: "An accepted payment amount is not a positive integer.",
      });
      score += 40;
    }
  }
  if (!requirement?.resource?.url) {
    flags.push({
      code: "MISSING_RESOURCE_METADATA",
      severity: "info",
      detail: "The requirement does not identify its protected resource URL.",
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "x402-endpoint-preflight",
    schema_version: "1.0",
    url,
    fetched_at: fetchedAt,
    http_status: status,
    redirects,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        score >= 70
          ? "Do not pay this endpoint until its x402 metadata is corrected and independently reviewed."
          : score >= 20
            ? "Review the decoded payment method and resource identity before paying."
            : "The unpaid x402 requirement is structurally valid; this does not verify service quality.",
    },
    x402: {
      version: requirement?.x402Version ?? requirement?.x402_version ?? null,
      error: requirement?.error ?? null,
      resource: requirement?.resource ?? null,
      accepts: accepts.map(accept => ({
        scheme: accept.scheme ?? null,
        network: accept.network ?? null,
        amount_atomic: accept.amount ?? null,
        amount_usdc:
          accept.network === BASE_MAINNET &&
          String(accept.asset ?? "").toLowerCase() === USDC.toLowerCase() &&
          /^\d+$/.test(String(accept.amount ?? ""))
            ? formatUnits(BigInt(accept.amount), 6)
            : null,
        asset: accept.asset ?? null,
        pay_to: accept.payTo ?? null,
        max_timeout_seconds: accept.maxTimeoutSeconds ?? null,
        extra: accept.extra ?? null,
      })),
      bazaar: requirement?.extensions?.bazaar ?? null,
    },
    limitations: [
      "This performs an unpaid protocol probe and does not verify paid delivery.",
      "Structurally valid payment metadata does not prove merchant identity or service quality.",
    ],
  };
}

export async function x402EndpointPreflight(url, fetchImpl = fetch) {
  const { response, finalUrl, redirects } = await fetchPublicResource(url, {
    fetchImpl,
    headers: { accept: "application/json" },
  });
  const header =
    response.headers.get("payment-required") ??
    response.headers.get("x-payment-required");
  let requirement = decodePaymentRequirement(header);
  if (!requirement) {
    const { bytes } = await readResponseBytes(response, 128_000);
    requirement = decodePaymentRequirement(bytesToText(bytes));
  }
  return buildX402EndpointPreflight({
    url: finalUrl,
    status: response.status,
    requirement,
    redirects,
  });
}

function dependencyCount(metadata) {
  return Object.keys(metadata ?? {}).length;
}

export function buildNpmPackagePreflight({
  packageName,
  requestedVersion,
  packument,
  osv,
  fetchedAt = new Date().toISOString(),
}) {
  const resolvedVersion =
    requestedVersion === "latest"
      ? packument["dist-tags"]?.latest
      : requestedVersion;
  const metadata = packument.versions?.[resolvedVersion] ?? {};
  const publishedAt = packument.time?.[resolvedVersion] ?? null;
  const publishAgeDays = publishedAt
    ? Math.floor((Date.now() - Date.parse(publishedAt)) / 86_400_000)
    : null;
  const vulnerabilities = Array.isArray(osv?.vulns) ? osv.vulns : [];
  const flags = [];
  let score = 0;
  if (!metadata.version) {
    flags.push({
      code: "VERSION_NOT_FOUND",
      severity: "critical",
      detail: "The requested package version was not found in npm metadata.",
    });
    score += 90;
  }
  if (metadata.deprecated) {
    flags.push({
      code: "DEPRECATED_PACKAGE_VERSION",
      severity: "high",
      detail: String(metadata.deprecated),
    });
    score += 45;
  }
  if (!metadata.license) {
    flags.push({
      code: "LICENSE_NOT_DECLARED",
      severity: "medium",
      detail: "The selected package version does not declare a license.",
    });
    score += 20;
  }
  if (vulnerabilities.length) {
    flags.push({
      code: "KNOWN_OSV_VULNERABILITIES",
      severity: vulnerabilities.length >= 5 ? "high" : "medium",
      detail: `${vulnerabilities.length} known OSV vulnerability record(s) affect this version.`,
    });
    score += Math.min(60, vulnerabilities.length * 15);
  }
  if (publishAgeDays !== null && publishAgeDays > 1095) {
    flags.push({
      code: "OLD_SELECTED_VERSION",
      severity: "info",
      detail: `The selected version was published about ${publishAgeDays} days ago.`,
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "npm-package-preflight",
    schema_version: "1.0",
    package: packageName,
    requested_version: requestedVersion,
    resolved_version: resolvedVersion ?? null,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        vulnerabilities.length || metadata.deprecated
          ? "Review vulnerability details and upgrade or replace the dependency before autonomous installation."
          : "No deprecation or known OSV vulnerability was found for this exact version.",
    },
    metadata: {
      latest_version: packument["dist-tags"]?.latest ?? null,
      published_at: publishedAt,
      publish_age_days: publishAgeDays,
      deprecated: metadata.deprecated ?? null,
      license:
        typeof metadata.license === "string"
          ? metadata.license
          : metadata.license?.type ?? null,
      maintainers: (packument.maintainers ?? []).slice(0, 20).map(item => ({
        name: item.name ?? null,
        email: item.email ?? null,
      })),
      dependency_count: dependencyCount(metadata.dependencies),
      optional_dependency_count: dependencyCount(metadata.optionalDependencies),
      peer_dependency_count: dependencyCount(metadata.peerDependencies),
      repository: metadata.repository ?? null,
      homepage: metadata.homepage ?? null,
      integrity: metadata.dist?.integrity ?? null,
    },
    vulnerabilities: vulnerabilities.slice(0, 25).map(vulnerability => ({
      id: vulnerability.id ?? null,
      summary: vulnerability.summary ?? null,
      aliases: vulnerability.aliases ?? [],
      modified: vulnerability.modified ?? null,
      references: (vulnerability.references ?? []).slice(0, 5),
    })),
    provenance: {
      npm: `https://www.npmjs.com/package/${encodeURIComponent(packageName)}/v/${encodeURIComponent(resolvedVersion ?? requestedVersion)}`,
      osv: "https://osv.dev/",
    },
    limitations: [
      "OSV results cover disclosed vulnerabilities and cannot prove a package is safe.",
      "This does not execute, install, or inspect package tarball contents or lifecycle scripts.",
    ],
  };
}

export async function npmPackagePreflight(
  packageName,
  requestedVersion = "latest",
  fetchImpl = fetch,
) {
  const encoded = encodeURIComponent(packageName);
  const response = await fetchImpl(`https://registry.npmjs.org/${encoded}`, {
    headers: {
      accept: "application/json",
      "user-agent": "AgentCommerceSafety/0.5",
    },
  });
  if (!response.ok) throw new Error(`npm_registry_http_${response.status}`);
  const { bytes, truncated } = await readResponseBytes(response, 2_500_000);
  if (truncated) throw new Error("npm_metadata_too_large");
  const packument = JSON.parse(bytesToText(bytes));
  const resolvedVersion =
    requestedVersion === "latest"
      ? packument["dist-tags"]?.latest
      : requestedVersion;
  const osvResponse = await fetchImpl("https://api.osv.dev/v1/query", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "AgentCommerceSafety/0.5",
    },
    body: JSON.stringify({
      package: { ecosystem: "npm", name: packageName },
      version: resolvedVersion,
    }),
  });
  if (!osvResponse.ok) throw new Error(`osv_http_${osvResponse.status}`);
  const osv = await osvResponse.json();
  return buildNpmPackagePreflight({
    packageName,
    requestedVersion,
    packument,
    osv,
  });
}

export function buildGithubRepositoryHealth({
  owner,
  repo,
  repository,
  release,
  provider = "GitHub REST API",
  fetchedAt = new Date().toISOString(),
}) {
  const pushedAt = repository.pushed_at ?? null;
  const staleDays = pushedAt
    ? Math.floor((Date.now() - Date.parse(pushedAt)) / 86_400_000)
    : null;
  const flags = [];
  let score = 0;
  if (repository.archived) {
    flags.push({
      code: "REPOSITORY_ARCHIVED",
      severity: "high",
      detail: "GitHub marks this repository as archived.",
    });
    score += 65;
  }
  if (repository.disabled) {
    flags.push({
      code: "REPOSITORY_DISABLED",
      severity: "critical",
      detail: "GitHub marks this repository as disabled.",
    });
    score += 90;
  }
  if (!repository.license?.spdx_id) {
    flags.push({
      code: "LICENSE_NOT_DETECTED",
      severity: "medium",
      detail: "GitHub did not detect an SPDX license.",
    });
    score += 20;
  }
  if (staleDays !== null && staleDays > 730) {
    flags.push({
      code: "STALE_REPOSITORY",
      severity: "medium",
      detail: `The repository has not been pushed to for about ${staleDays} days.`,
    });
    score += 25;
  }
  if (repository.fork) {
    flags.push({
      code: "REPOSITORY_IS_FORK",
      severity: "info",
      detail: "This repository is a fork; verify the upstream project and divergence.",
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "github-repository-health",
    schema_version: "1.0",
    repository: `${owner}/${repo}`,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
    },
    health: {
      archived: Boolean(repository.archived),
      disabled: Boolean(repository.disabled),
      fork: Boolean(repository.fork),
      visibility: repository.visibility ?? null,
      pushed_at: pushedAt,
      stale_days: staleDays,
      created_at: repository.created_at ?? null,
      default_branch: repository.default_branch ?? null,
      license: repository.license?.spdx_id ?? null,
      stars: Number(repository.stargazers_count ?? 0),
      forks: Number(repository.forks_count ?? 0),
      watchers: Number(repository.subscribers_count ?? 0),
      open_issues: Number(repository.open_issues_count ?? 0),
      size_kb: Number(repository.size ?? 0),
      topics: repository.topics ?? [],
      latest_release: release
        ? {
            tag: release.tag_name ?? null,
            name: release.name ?? null,
            published_at: release.published_at ?? null,
            prerelease: Boolean(release.prerelease),
            draft: Boolean(release.draft),
            url: release.html_url ?? null,
          }
        : null,
    },
    provenance: {
      provider,
      repository_url: repository.html_url ?? `https://github.com/${owner}/${repo}`,
    },
    limitations: [
      "Popularity and recent commits do not prove code quality or security.",
      "Open issue counts can include pull requests and vary by project workflow.",
    ],
  };
}

async function githubJson(url, token, fetchImpl = fetch, allow404 = false) {
  const response = await fetchImpl(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "AgentCommerceSafety/0.5",
      "x-github-api-version": "2022-11-28",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (allow404 && response.status === 404) return null;
  if (!response.ok) throw new Error(`github_http_${response.status}`);
  return response.json();
}

function parseCompactCount(value) {
  const normalized = value.trim().toLowerCase().replace(/,/g, "");
  const match = normalized.match(/^([\d.]+)([km])?$/);
  if (!match) return 0;
  const multiplier = match[2] === "k" ? 1_000 : match[2] === "m" ? 1_000_000 : 1;
  return Math.round(Number(match[1]) * multiplier);
}

function githubPageCount(html, owner, repo, suffix) {
  const escapedPath = `${owner}/${repo}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `href="/${escapedPath}/${suffix}"[\\s\\S]{0,700}?<strong>([^<]+)</strong>`,
      "i",
    ),
  );
  return match ? parseCompactCount(match[1]) : 0;
}

async function githubRepositoryHealthFromPublicPages(
  owner,
  repo,
  fetchImpl = fetch,
) {
  const repositoryUrl = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const pageResponse = await fetchImpl(repositoryUrl, {
    headers: { accept: "text/html", "user-agent": "AgentCommerceSafety/0.5" },
  });
  if (!pageResponse.ok) throw new Error(`github_page_http_${pageResponse.status}`);
  const html = await pageResponse.text();
  const defaultBranch =
    html.match(/"defaultBranch":"([^"]+)"/)?.[1] ??
    html.match(/"refInfo":\{"name":"([^"]+)"/)?.[1] ??
    "main";
  const commitsResponse = await fetchImpl(
    `${repositoryUrl}/commits/${encodeURIComponent(defaultBranch)}.atom`,
    { headers: { accept: "application/atom+xml", "user-agent": "AgentCommerceSafety/0.5" } },
  );
  const commitsAtom = commitsResponse.ok ? await commitsResponse.text() : "";
  const pushedAt = commitsAtom.match(/<updated>([^<]+)<\/updated>/)?.[1] ?? null;
  const embedded = html.match(
    /"repo":\{"id":\d+,"defaultBranch":"[^"]+","name":"[^"]+","ownerLogin":"[^"]+","currentUserCanPush":(?:true|false),"isFork":(true|false),"isEmpty":(?:true|false),"createdAt":"([^"]+)"[\s\S]{0,300}?"public":(true|false),"private":(true|false)/,
  );
  const repository = {
    archived: /This repository was archived/i.test(html),
    disabled: false,
    fork:
      embedded?.[1] === "true" ||
      /octolytics-dimension-repository_is_fork" content="true"/i.test(html),
    visibility: embedded?.[3] === "true" ? "public" : "private",
    pushed_at: pushedAt,
    created_at: embedded?.[2] ?? null,
    default_branch: defaultBranch,
    license: {
      spdx_id:
        html.match(/"preferredFileType":"license","tabName":"([^"]+)"/)?.[1] ?? null,
    },
    stargazers_count: githubPageCount(html, owner, repo, "stargazers"),
    forks_count: githubPageCount(html, owner, repo, "forks"),
    subscribers_count: githubPageCount(html, owner, repo, "watchers"),
    open_issues_count: Number(
      html.match(/id="issues-repo-tab-count"[\s\S]{0,150}?title="([\d,]+)"/)?.[1]?.replace(
        /,/g,
        "",
      ) ?? 0,
    ),
    size: 0,
    topics: [],
    html_url: repositoryUrl,
  };
  return buildGithubRepositoryHealth({
    owner,
    repo,
    repository,
    release: null,
    provider: "GitHub public HTML and Atom fallback",
  });
}

export async function githubRepositoryHealth(
  owner,
  repo,
  token,
  fetchImpl = fetch,
) {
  const encodedOwner = encodeURIComponent(owner);
  const encodedRepo = encodeURIComponent(repo);
  const base = `https://api.github.com/repos/${encodedOwner}/${encodedRepo}`;
  try {
    const [repository, release] = await Promise.all([
      githubJson(base, token, fetchImpl),
      githubJson(`${base}/releases/latest`, token, fetchImpl, true),
    ]);
    return buildGithubRepositoryHealth({ owner, repo, repository, release });
  } catch (error) {
    if (token || !/github_http_(403|429)/.test(String(error))) throw error;
    return githubRepositoryHealthFromPublicPages(owner, repo, fetchImpl);
  }
}

function extractHtmlMetadata(text) {
  const title =
    text.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/\s+/g, " ")
      .trim() ?? null;
  const canonical =
    text.match(
      /<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    )?.[1] ??
    text.match(
      /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*canonical[^"']*["'][^>]*>/i,
    )?.[1] ??
    null;
  return { title, canonical };
}

export async function urlChangeFingerprint(url, fetchImpl = fetch) {
  const { response, finalUrl, redirects } = await fetchPublicResource(url, {
    fetchImpl,
    headers: { accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" },
  });
  if (!response.ok) throw new Error(`document_http_${response.status}`);
  const { bytes, truncated } = await readResponseBytes(
    response,
    MAX_DOCUMENT_BYTES,
  );
  const contentType = response.headers.get("content-type") ?? "";
  const text =
    contentType.includes("text") ||
    contentType.includes("html") ||
    contentType.includes("json") ||
    contentType.includes("xml")
      ? bytesToText(bytes)
      : "";
  const metadata = extractHtmlMetadata(text);
  return {
    product: "url-change-fingerprint",
    schema_version: "1.0",
    requested_url: url,
    final_url: finalUrl,
    fetched_at: new Date().toISOString(),
    http_status: response.status,
    redirects,
    content: {
      content_type: contentType || null,
      bytes_hashed: bytes.length,
      truncated,
      sha256: await sha256Hex(bytes),
      etag: response.headers.get("etag"),
      last_modified: response.headers.get("last-modified"),
      title: metadata.title,
      canonical: metadata.canonical,
    },
    decision_hint:
      "Compare sha256, etag, or last_modified with a previous snapshot to detect a change.",
    limitations: [
      "Dynamic, personalized, or rotating content can change without a meaningful document update.",
      `The fingerprint covers at most ${MAX_DOCUMENT_BYTES} response bytes.`,
    ],
  };
}

function decodeXmlEntities(value) {
  return String(value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .trim();
}

function xmlTag(block, names) {
  for (const name of names) {
    const match = block.match(
      new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"),
    );
    if (match) return decodeXmlEntities(match[1].replace(/<[^>]+>/g, " "));
  }
  return null;
}

function atomLink(block) {
  const alternate = block.match(
    /<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i,
  );
  const any = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return decodeXmlEntities(alternate?.[1] ?? any?.[1] ?? "");
}

export async function buildFeedSnapshot({
  url,
  finalUrl,
  redirects,
  xml,
  fetchedAt = new Date().toISOString(),
}) {
  const atom = /<feed\b/i.test(xml);
  const blocks = atom
    ? [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)]
    : [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  const rawItems = blocks.slice(0, 20).map(match => {
    const block = match[1];
    const title = xmlTag(block, ["title"]);
    const link = atom ? atomLink(block) : xmlTag(block, ["link"]);
    const id = xmlTag(block, ["guid", "id"]) ?? link;
    const published = xmlTag(block, [
      "published",
      "updated",
      "pubDate",
      "dc:date",
    ]);
    const summary = xmlTag(block, [
      "summary",
      "description",
      "content",
      "content:encoded",
    ]);
    return { title, link: link || null, id: id || null, published, summary };
  });
  const items = [];
  for (const item of rawItems) {
    items.push({
      ...item,
      summary: item.summary?.slice(0, 1000) ?? null,
      fingerprint: await sha256Hex(
        [item.id, item.link, item.title, item.published].join("|"),
      ),
    });
  }
  return {
    product: "feed-snapshot",
    schema_version: "1.0",
    requested_url: url,
    final_url: finalUrl,
    fetched_at: fetchedAt,
    format: atom ? "atom" : "rss",
    redirects,
    feed: {
      title: xmlTag(xml, ["title"]),
      description: xmlTag(xml, ["subtitle", "description"]),
    },
    item_count: items.length,
    items,
    limitations: [
      "Only the first 20 entries in the returned feed are normalized.",
      "Malformed XML or feeds rendered only by JavaScript may not be parsed completely.",
    ],
  };
}

export async function feedSnapshot(url, fetchImpl = fetch) {
  const { response, finalUrl, redirects } = await fetchPublicResource(url, {
    fetchImpl,
    headers: {
      accept:
        "application/atom+xml,application/rss+xml,application/xml,text/xml;q=0.9",
    },
  });
  if (!response.ok) throw new Error(`feed_http_${response.status}`);
  const { bytes, truncated } = await readResponseBytes(response, MAX_FEED_BYTES);
  if (truncated) throw new Error("feed_document_too_large");
  const xml = bytesToText(bytes);
  if (!/<(?:rss|feed|rdf:RDF)\b/i.test(xml)) {
    throw new Error("unsupported_feed_document");
  }
  return buildFeedSnapshot({ url, finalUrl, redirects, xml });
}

const KNOWN_EVM_CALLS = {
  "0xa9059cbb": {
    signature: "transfer(address,uint256)",
    action: "token_transfer",
    fields: [
      ["recipient", "address", 0],
      ["amount", "uint256", 1],
    ],
  },
  "0x095ea7b3": {
    signature: "approve(address,uint256)",
    action: "token_approval",
    fields: [
      ["spender", "address", 0],
      ["amount", "uint256", 1],
    ],
  },
  "0x23b872dd": {
    signature: "transferFrom(address,address,uint256)",
    action: "token_transfer_from",
    fields: [
      ["owner", "address", 0],
      ["recipient", "address", 1],
      ["amount", "uint256", 2],
    ],
  },
  "0x42842e0e": {
    signature: "safeTransferFrom(address,address,uint256)",
    action: "nft_transfer",
    fields: [
      ["owner", "address", 0],
      ["recipient", "address", 1],
      ["token_id", "uint256", 2],
    ],
  },
  "0xb88d4fde": {
    signature: "safeTransferFrom(address,address,uint256,bytes)",
    action: "nft_transfer",
    fields: [
      ["owner", "address", 0],
      ["recipient", "address", 1],
      ["token_id", "uint256", 2],
    ],
  },
  "0xd505accf": {
    signature: "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",
    action: "signed_token_approval",
    fields: [
      ["owner", "address", 0],
      ["spender", "address", 1],
      ["amount", "uint256", 2],
      ["deadline", "uint256", 3],
    ],
  },
};

function calldataWord(data, index) {
  const raw = data.replace(/^0x/, "").slice(8 + index * 64, 8 + (index + 1) * 64);
  return raw.length === 64 ? raw : null;
}

function decodeCalldataField(data, type, index) {
  const word = calldataWord(data, index);
  if (!word) return null;
  if (type === "address") return `0x${word.slice(24)}`;
  if (type === "uint256") return BigInt(`0x${word}`).toString();
  return `0x${word}`;
}

export function buildTransactionIntent({
  to,
  data,
  value,
  profile = {},
  tokenInfo = null,
  candidateSignatures = [],
  fetchedAt = new Date().toISOString(),
}) {
  const selector = data.length >= 10 ? data.slice(0, 10).toLowerCase() : null;
  const known = selector ? KNOWN_EVM_CALLS[selector] : null;
  const decoded = {};
  for (const [name, type, index] of known?.fields ?? []) {
    decoded[name] = decodeCalldataField(data, type, index);
  }
  const flags = [];
  let score = 0;
  if (profile.is_scam || profile.reputation === "scam") {
    flags.push({
      code: "SCAM_DESTINATION",
      severity: "critical",
      detail: "The destination has public scam or malicious reputation metadata.",
    });
    score += 100;
  }
  if (profile.is_contract && !profile.is_verified) {
    flags.push({
      code: "UNVERIFIED_DESTINATION_CONTRACT",
      severity: "medium",
      detail: "The destination is a contract without verified source code.",
    });
    score += 20;
  }
  if (data === "0x" && BigInt(value) > 0n) {
    flags.push({
      code: "NATIVE_VALUE_TRANSFER",
      severity: "info",
      detail: "This transaction transfers native ETH without contract calldata.",
    });
  } else if (!known) {
    flags.push({
      code: "UNKNOWN_CALL_SELECTOR",
      severity: "medium",
      detail: selector
        ? `The selector ${selector} was not decoded by the deterministic safety decoder.`
        : "The calldata does not contain a complete EVM selector.",
    });
    score += 25;
  }
  const amount = decoded.amount ? BigInt(decoded.amount) : null;
  const unlimited = amount === (1n << 256n) - 1n;
  if (known?.action.includes("approval")) {
    flags.push({
      code: unlimited ? "UNLIMITED_TOKEN_APPROVAL" : "TOKEN_APPROVAL",
      severity: unlimited ? "high" : "medium",
      detail: unlimited
        ? "This call grants the maximum possible token allowance."
        : "This call grants a token allowance to another address.",
    });
    score += unlimited ? 70 : 25;
  }
  if (known?.action.includes("transfer")) {
    flags.push({
      code: "ASSET_TRANSFER",
      severity: "info",
      detail: "This call transfers fungible tokens or NFTs.",
    });
  }
  score = Math.min(score, 100);
  const decimals = tokenInfo?.decimals === undefined ? null : Number(tokenInfo.decimals);
  return {
    product: "evm-transaction-intent",
    schema_version: "1.0",
    network: BASE_MAINNET,
    fetched_at: fetchedAt,
    transaction: {
      to,
      value_wei: value,
      value_eth: formatUnits(BigInt(value), 18),
      calldata_bytes: Math.max(0, (data.length - 2) / 2),
      selector,
    },
    destination: {
      is_contract: Boolean(profile.is_contract),
      is_verified_contract: Boolean(profile.is_verified),
      proxy_type: profile.proxy_type ?? null,
      implementations: profile.implementations ?? [],
      reputation: profile.reputation ?? null,
      is_scam: Boolean(profile.is_scam),
      token: tokenInfo
        ? {
            name: tokenInfo.name ?? null,
            symbol: tokenInfo.symbol ?? null,
            decimals,
          }
        : null,
    },
    intent: {
      recognized: Boolean(known),
      signature: known?.signature ?? null,
      action: known?.action ?? (data === "0x" ? "native_transfer" : "unknown_contract_call"),
      decoded,
      amount_display:
        amount !== null && Number.isInteger(decimals)
          ? formatUnits(amount, decimals)
          : null,
      unlimited_approval: unlimited,
      candidate_signatures: candidateSignatures.slice(0, 5),
    },
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        score >= 70
          ? "Do not sign until the destination, spender, and decoded amount are independently verified."
          : score >= 20
            ? "Review the decoded destination, spender, and amount before signing."
            : "No high-risk intent was identified by the deterministic decoder.",
    },
    limitations: [
      "Only common transfer, approval, permit, and NFT selectors are decoded deterministically.",
      "Proxy behavior, delegatecalls, fallback functions, and downstream contract calls can change the effective result.",
      "Four-byte candidate signatures are hints and can be ambiguous or incorrect.",
    ],
  };
}

export async function transactionIntent(to, data, value, fetchImpl = fetch) {
  const encoded = encodeURIComponent(to);
  const profilePromise = fetchJson(
    `${BLOCKSCOUT}/api/v2/addresses/${encoded}`,
    fetchImpl,
  );
  const tokenPromise = fetchJson(
    `${BLOCKSCOUT}/api/v2/tokens/${encoded}`,
    fetchImpl,
  ).catch(() => null);
  const selector = data.length >= 10 ? data.slice(0, 10).toLowerCase() : null;
  const signaturePromise =
    selector && !KNOWN_EVM_CALLS[selector]
      ? fetchJson(
          `https://www.4byte.directory/api/v1/signatures/?hex_signature=${encodeURIComponent(selector)}`,
          fetchImpl,
        ).catch(() => ({ results: [] }))
      : Promise.resolve({ results: [] });
  const [profile, tokenInfo, signatures] = await Promise.all([
    profilePromise,
    tokenPromise,
    signaturePromise,
  ]);
  return buildTransactionIntent({
    to,
    data,
    value,
    profile,
    tokenInfo,
    candidateSignatures: (signatures.results ?? []).map(item => item.text_signature),
  });
}

export async function simulateBaseTransaction(
  to,
  data,
  value = "0",
  from = null,
  fetchImpl = fetch,
) {
  const transaction = {
    to,
    data,
    value: `0x${BigInt(value).toString(16)}`,
    ...(from ? { from } : {}),
  };
  const startedAt = Date.now();
  try {
    const [returnData, gasHex] = await Promise.all([
      rpcCall("eth_call", [transaction, "latest"], fetchImpl),
      rpcCall("eth_estimateGas", [transaction], fetchImpl).catch(() => null),
    ]);
    return {
      success: true,
      return_data: returnData,
      estimated_gas: gasHex ? Number(BigInt(gasHex)) : null,
      latency_ms: Date.now() - startedAt,
      provider_mode: "public_rpc",
    };
  } catch (error) {
    return {
      success: false,
      revert_reason: error instanceof Error ? error.message : String(error),
      latency_ms: Date.now() - startedAt,
      provider_mode: "public_rpc",
    };
  }
}

function nestedPublicUrl(value) {
  if (!value) return { valid: false, reason: "missing" };
  try {
    const parsed = validatePublicUrl(value);
    return { valid: true, url: parsed.toString() };
  } catch (error) {
    return {
      valid: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function buildA2aAgentCardPreflight({
  requestedUrl,
  cardUrl,
  card,
  redirects = [],
  fetchedAt = new Date().toISOString(),
}) {
  const flags = [];
  let score = 0;
  const endpoint = nestedPublicUrl(card.url);
  if (!card.name) {
    flags.push({
      code: "MISSING_AGENT_NAME",
      severity: "medium",
      detail: "The Agent Card does not declare a name.",
    });
    score += 15;
  }
  if (!endpoint.valid) {
    flags.push({
      code: "INVALID_AGENT_ENDPOINT",
      severity: "high",
      detail: `The Agent Card URL is invalid or unsafe: ${endpoint.reason}.`,
    });
    score += 50;
  } else if (new URL(endpoint.url).origin !== new URL(cardUrl).origin) {
    flags.push({
      code: "CROSS_ORIGIN_AGENT_ENDPOINT",
      severity: "medium",
      detail: "The advertised agent endpoint is hosted on a different origin than the Agent Card.",
    });
    score += 15;
  }
  const skills = Array.isArray(card.skills) ? card.skills : [];
  if (skills.length === 0) {
    flags.push({
      code: "NO_DECLARED_SKILLS",
      severity: "medium",
      detail: "The Agent Card does not declare any callable skills.",
    });
    score += 20;
  }
  const duplicateSkillIds = skills
    .map(skill => skill?.id)
    .filter(Boolean)
    .filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicateSkillIds.length) {
    flags.push({
      code: "DUPLICATE_SKILL_IDS",
      severity: "medium",
      detail: `Duplicate skill IDs: ${[...new Set(duplicateSkillIds)].join(", ")}.`,
    });
    score += 15;
  }
  const providerUrl = nestedPublicUrl(card.provider?.url);
  if (card.provider?.url && !providerUrl.valid) {
    flags.push({
      code: "INVALID_PROVIDER_URL",
      severity: "medium",
      detail: `The provider URL is invalid or unsafe: ${providerUrl.reason}.`,
    });
    score += 20;
  }
  const securitySchemes =
    card.securitySchemes ?? card.security_schemes ?? card.authentication ?? null;
  if (!securitySchemes) {
    flags.push({
      code: "AUTHENTICATION_NOT_DECLARED",
      severity: "info",
      detail: "The Agent Card does not declare authentication or security schemes.",
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "a2a-agent-card-preflight",
    schema_version: "1.0",
    requested_url: requestedUrl,
    card_url: cardUrl,
    fetched_at: fetchedAt,
    redirects,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        score >= 70
          ? "Do not connect until the Agent Card endpoint and identity metadata are corrected."
          : score >= 20
            ? "Review endpoint ownership, authentication, and skill declarations before connecting."
            : "The Agent Card is structurally usable; this does not prove the agent is trustworthy.",
    },
    agent: {
      name: card.name ?? null,
      description: card.description ?? null,
      url: endpoint.valid ? endpoint.url : card.url ?? null,
      version: card.version ?? null,
      protocol_version: card.protocolVersion ?? card.protocol_version ?? null,
      preferred_transport: card.preferredTransport ?? card.preferred_transport ?? null,
      provider: card.provider ?? null,
      capabilities: card.capabilities ?? null,
      authentication: securitySchemes,
      default_input_modes: card.defaultInputModes ?? card.default_input_modes ?? [],
      default_output_modes: card.defaultOutputModes ?? card.default_output_modes ?? [],
      skill_count: skills.length,
      skills: skills.slice(0, 50).map(skill => ({
        id: skill?.id ?? null,
        name: skill?.name ?? null,
        description: skill?.description ?? null,
        tags: skill?.tags ?? [],
      })),
    },
    limitations: [
      "A valid Agent Card is self-declared metadata and does not prove operator identity or runtime behavior.",
      "This check does not invoke agent skills or send credentials.",
    ],
  };
}

export async function a2aAgentCardPreflight(url, fetchImpl = fetch) {
  const parsed = validatePublicUrl(url);
  const directJson = /\.json$/i.test(parsed.pathname);
  const candidates = directJson
    ? [parsed.toString()]
    : [
        new URL("/.well-known/agent-card.json", parsed.origin).toString(),
        new URL("/.well-known/agent.json", parsed.origin).toString(),
      ];
  const failures = [];
  for (const candidate of candidates) {
    try {
      const { response, finalUrl, redirects } = await fetchPublicResource(candidate, {
        fetchImpl,
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        failures.push(`${candidate}: HTTP ${response.status}`);
        continue;
      }
      const { bytes, truncated } = await readResponseBytes(response, MAX_DOCUMENT_BYTES);
      if (truncated) throw new Error("agent_card_too_large");
      const card = JSON.parse(bytesToText(bytes));
      return buildA2aAgentCardPreflight({
        requestedUrl: url,
        cardUrl: finalUrl,
        card,
        redirects,
      });
    } catch (error) {
      failures.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`agent_card_not_found (${failures.join("; ")})`);
}

function openApiOperations(document) {
  const operations = [];
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of ["get", "post", "put", "patch", "delete", "options", "head"]) {
      if (pathItem?.[method]) operations.push({ path, method, operation: pathItem[method] });
    }
  }
  return operations;
}

export async function buildOpenApiSpecPreflight({
  requestedUrl,
  finalUrl,
  redirects = [],
  document,
  raw,
  fetchedAt = new Date().toISOString(),
}) {
  const flags = [];
  let score = 0;
  const version = document.openapi ?? document.swagger ?? null;
  if (!version) {
    flags.push({
      code: "MISSING_OPENAPI_VERSION",
      severity: "high",
      detail: "The document does not declare an OpenAPI or Swagger version.",
    });
    score += 45;
  }
  const operations = openApiOperations(document);
  if (operations.length === 0) {
    flags.push({
      code: "NO_API_OPERATIONS",
      severity: "high",
      detail: "The specification does not declare any HTTP operations.",
    });
    score += 55;
  }
  const servers = Array.isArray(document.servers)
    ? document.servers.map(server => server?.url).filter(Boolean)
    : document.host
      ? [`${document.schemes?.[0] ?? "https"}://${document.host}${document.basePath ?? ""}`]
      : [];
  const serverChecks = servers.map(server => {
    try {
      const resolved = new URL(server, finalUrl).toString();
      const checked = nestedPublicUrl(resolved);
      return { declared: server, resolved, valid_public_url: checked.valid, reason: checked.reason ?? null };
    } catch {
      return { declared: server, resolved: null, valid_public_url: false, reason: "invalid_url" };
    }
  });
  const unsafeServers = serverChecks.filter(server => !server.valid_public_url);
  if (unsafeServers.length) {
    flags.push({
      code: "UNSAFE_OR_INVALID_SERVER_URL",
      severity: "high",
      detail: `${unsafeServers.length} declared server URL(s) are invalid, private, or unsupported.`,
    });
    score += 40;
  }
  if (servers.length === 0) {
    flags.push({
      code: "NO_SERVER_DECLARATION",
      severity: "info",
      detail: "No API server URL is declared; clients must infer the document origin.",
    });
    score += 5;
  }
  const missingOperationIds = operations.filter(item => !item.operation.operationId).length;
  if (missingOperationIds) {
    flags.push({
      code: "MISSING_OPERATION_IDS",
      severity: "info",
      detail: `${missingOperationIds} operation(s) do not declare operationId.`,
    });
    score += Math.min(10, missingOperationIds);
  }
  const securitySchemes =
    document.components?.securitySchemes ?? document.securityDefinitions ?? {};
  if (Object.keys(securitySchemes).length === 0) {
    flags.push({
      code: "NO_SECURITY_SCHEMES",
      severity: "info",
      detail: "The specification does not define authentication or security schemes.",
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "openapi-spec-preflight",
    schema_version: "1.0",
    requested_url: requestedUrl,
    final_url: finalUrl,
    fetched_at: fetchedAt,
    redirects,
    fingerprint_sha256: await sha256Hex(raw),
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        score >= 70
          ? "Do not generate or execute API calls until the specification is corrected."
          : score >= 20
            ? "Review server URLs, authentication, and operation definitions before use."
            : "The specification is structurally usable; upstream behavior can still differ.",
    },
    specification: {
      title: document.info?.title ?? null,
      version,
      api_version: document.info?.version ?? null,
      path_count: Object.keys(document.paths ?? {}).length,
      operation_count: operations.length,
      operations_missing_id: missingOperationIds,
      security_scheme_names: Object.keys(securitySchemes),
      servers: serverChecks,
    },
    limitations: [
      "This performs structural checks and does not prove the server implements the specification.",
      "External references are not recursively downloaded or validated.",
    ],
  };
}

export async function openApiSpecPreflight(url, fetchImpl = fetch) {
  const { response, finalUrl, redirects } = await fetchPublicResource(url, {
    fetchImpl,
    headers: {
      accept: "application/json,application/yaml,text/yaml,text/x-yaml,*/*;q=0.5",
    },
  });
  if (!response.ok) throw new Error(`openapi_http_${response.status}`);
  const { bytes, truncated } = await readResponseBytes(response, MAX_DOCUMENT_BYTES);
  if (truncated) throw new Error("openapi_document_too_large");
  const raw = bytesToText(bytes);
  let document;
  try {
    document = JSON.parse(raw);
  } catch {
    document = parseYaml(raw);
  }
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("invalid_openapi_document");
  }
  return buildOpenApiSpecPreflight({
    requestedUrl: url,
    finalUrl,
    redirects,
    document,
    raw,
  });
}

function dnsAnswers(payload) {
  return (payload?.Answer ?? []).map(answer => ({
    name: answer.name ?? null,
    type: Number(answer.type ?? 0),
    ttl: Number(answer.TTL ?? 0),
    data: answer.data ?? null,
  }));
}

async function dnsQuery(domain, type, fetchImpl = fetch) {
  const response = await fetchImpl(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`,
    {
      headers: {
        accept: "application/dns-json",
        "user-agent": "AgentCommerceSafety/0.6",
      },
    },
  );
  if (!response.ok) throw new Error(`doh_http_${response.status}`);
  return response.json();
}

function rdapEventDate(rdap, action) {
  return rdap?.events?.find(event => event.eventAction === action)?.eventDate ?? null;
}

export function buildDomainTrustPreflight({
  domain,
  dns,
  rdap = null,
  cnameTargetDns = null,
  fetchedAt = new Date().toISOString(),
}) {
  const flags = [];
  let score = 0;
  const a = dnsAnswers(dns.A);
  const aaaa = dnsAnswers(dns.AAAA);
  const cname = dnsAnswers(dns.CNAME);
  const mx = dnsAnswers(dns.MX);
  const dnskey = dnsAnswers(dns.DNSKEY);
  const resolves = a.length > 0 || aaaa.length > 0 || cname.length > 0;
  if (!resolves) {
    flags.push({
      code: "DOMAIN_DOES_NOT_RESOLVE",
      severity: "high",
      detail: "No A, AAAA, or CNAME answer was returned.",
    });
    score += 60;
  }
  const dnssecAuthenticated = [dns.A, dns.AAAA, dns.CNAME, dns.DNSKEY].some(
    payload => payload?.AD === true,
  );
  if (!dnssecAuthenticated && dnskey.length === 0) {
    flags.push({
      code: "DNSSEC_NOT_OBSERVED",
      severity: "info",
      detail: "The DNS responses were not authenticated and no DNSKEY answer was observed.",
    });
    score += 5;
  }
  if (cname.length && cnameTargetDns) {
    const targetResolves =
      dnsAnswers(cnameTargetDns.A).length > 0 ||
      dnsAnswers(cnameTargetDns.AAAA).length > 0 ||
      dnsAnswers(cnameTargetDns.CNAME).length > 0;
    if (!targetResolves) {
      flags.push({
        code: "DANGLING_CNAME_CANDIDATE",
        severity: "high",
        detail: "The CNAME target did not return A, AAAA, or another CNAME answer.",
      });
      score += 55;
    }
  }
  const createdAt =
    rdapEventDate(rdap, "registration") ?? rdapEventDate(rdap, "registered");
  const expiresAt =
    rdapEventDate(rdap, "expiration") ?? rdapEventDate(rdap, "expiry");
  const ageDays = createdAt
    ? Math.max(0, Math.floor((Date.now() - Date.parse(createdAt)) / 86_400_000))
    : null;
  const daysToExpiry = expiresAt
    ? Math.floor((Date.parse(expiresAt) - Date.now()) / 86_400_000)
    : null;
  if (ageDays !== null && ageDays < 30) {
    flags.push({
      code: "NEWLY_REGISTERED_DOMAIN",
      severity: "high",
      detail: `The domain was registered approximately ${ageDays} day(s) ago.`,
    });
    score += 45;
  } else if (ageDays !== null && ageDays < 180) {
    flags.push({
      code: "YOUNG_DOMAIN",
      severity: "medium",
      detail: `The domain was registered approximately ${ageDays} day(s) ago.`,
    });
    score += 20;
  }
  if (daysToExpiry !== null && daysToExpiry < 0) {
    flags.push({
      code: "RDAP_EXPIRATION_PASSED",
      severity: "high",
      detail: "The published RDAP expiration date is in the past.",
    });
    score += 55;
  } else if (daysToExpiry !== null && daysToExpiry < 30) {
    flags.push({
      code: "DOMAIN_EXPIRING_SOON",
      severity: "medium",
      detail: `The published RDAP expiration date is approximately ${daysToExpiry} day(s) away.`,
    });
    score += 25;
  }
  if (!rdap) {
    flags.push({
      code: "RDAP_UNAVAILABLE",
      severity: "info",
      detail: "Public registration metadata was not available from the RDAP bootstrap service.",
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "domain-trust-preflight",
    schema_version: "1.0",
    domain,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        score >= 70
          ? "Do not send credentials or payment until domain ownership and resolution are independently verified."
          : score >= 20
            ? "Apply tighter trust limits and verify the operator through another channel."
            : "No major DNS or registration warning was observed; this is not proof of ownership.",
    },
    dns: {
      resolves,
      dnssec_authenticated: dnssecAuthenticated,
      a,
      aaaa,
      cname,
      mx,
      dnskey_count: dnskey.length,
    },
    registration: rdap
      ? {
          handle: rdap.handle ?? null,
          status: rdap.status ?? [],
          created_at: createdAt,
          expires_at: expiresAt,
          age_days: ageDays,
          days_to_expiry: daysToExpiry,
          nameservers: (rdap.nameservers ?? []).map(item => item.ldhName).filter(Boolean),
          secure_dns: rdap.secureDNS ?? null,
        }
      : null,
    provenance: {
      dns_provider: "Cloudflare DNS over HTTPS",
      rdap_provider: "RDAP bootstrap service",
    },
    limitations: [
      "Domain age, DNSSEC, and mail configuration do not prove that a service is legitimate.",
      "A dangling CNAME warning is a candidate signal and does not prove takeover is possible.",
      "RDAP fields vary by registry and can be redacted or stale.",
    ],
  };
}

export async function domainTrustPreflight(domain, fetchImpl = fetch) {
  const normalized = domain.toLowerCase().replace(/\.$/, "");
  const [a, aaaa, cname, mx, dnskey, rdapResult] = await Promise.all([
    dnsQuery(normalized, "A", fetchImpl),
    dnsQuery(normalized, "AAAA", fetchImpl),
    dnsQuery(normalized, "CNAME", fetchImpl),
    dnsQuery(normalized, "MX", fetchImpl),
    dnsQuery(normalized, "DNSKEY", fetchImpl),
    fetchJson(`https://rdap.org/domain/${encodeURIComponent(normalized)}`, fetchImpl).catch(
      () => null,
    ),
  ]);
  const cnameTarget = dnsAnswers(cname)[0]?.data?.replace(/\.$/, "") ?? null;
  const cnameTargetDns = cnameTarget
    ? {
        A: await dnsQuery(cnameTarget, "A", fetchImpl),
        AAAA: await dnsQuery(cnameTarget, "AAAA", fetchImpl),
        CNAME: await dnsQuery(cnameTarget, "CNAME", fetchImpl),
      }
    : null;
  return buildDomainTrustPreflight({
    domain: normalized,
    dns: { A: a, AAAA: aaaa, CNAME: cname, MX: mx, DNSKEY: dnskey },
    rdap: rdapResult,
    cnameTargetDns,
  });
}

function bundleCheckStatus(result) {
  const riskLevel = result?.assessment?.risk_level ?? result?.decision_support;
  if (riskLevel === "high" || riskLevel === "DENY") return "fail";
  if (riskLevel === "medium" || riskLevel === "REQUIRE_APPROVAL") return "warn";
  return "pass";
}

function bundleReasonCodes(result, fallback) {
  const flags = Array.isArray(result?.assessment?.flags)
    ? result.assessment.flags
    : [];
  const codes = flags.map(flag => flag.code).filter(Boolean);
  return codes.length ? codes : [fallback];
}

function summarizeBundleEvidence(result) {
  return {
    product: result?.product ?? null,
    risk_level: result?.assessment?.risk_level ?? null,
    risk_score: result?.assessment?.risk_score ?? null,
    fingerprint_sha256: result?.fingerprint_sha256 ?? null,
    resolved_version: result?.resolved_version ?? null,
    repository: result?.repository
      ? {
          full_name: result.repository.full_name ?? null,
          archived: result.repository.archived ?? null,
          pushed_at: result.repository.pushed_at ?? null,
        }
      : null,
    domain: result?.domain ?? null,
    agent: result?.agent
      ? {
          name: result.agent.name ?? null,
          url: result.agent.url ?? null,
          skill_count: result.agent.skill_count ?? null,
        }
      : null,
    x402: result?.x402
      ? {
          version: result.x402.version ?? null,
          accepts: (result.x402.accepts ?? []).map(accept => ({
            scheme: accept.scheme ?? null,
            network: accept.network ?? null,
            amount_usdc: accept.amount_usdc ?? null,
          })),
        }
      : null,
  };
}

function bundleUnavailable(check, reasonCode, evidence = {}) {
  return {
    check,
    status: "unavailable",
    reason_codes: [reasonCode],
    evidence,
  };
}

export function buildAgentCapabilitySecurityPreflight({
  target,
  checks,
  generatedAt = new Date().toISOString(),
}) {
  const normalizedChecks = checks.map(check => ({
    check: check.check,
    status: check.status,
    reason_codes: check.reason_codes ?? [],
    evidence: check.evidence ?? {},
  }));
  const summary = normalizedChecks.reduce(
    (acc, check) => {
      if (check.status === "pass") acc.passed += 1;
      if (check.status === "warn") acc.warned += 1;
      if (check.status === "fail") acc.failed += 1;
      if (check.status === "unavailable") acc.unavailable += 1;
      return acc;
    },
    { passed: 0, warned: 0, failed: 0, unavailable: 0 },
  );
  const reasonCodes = [
    ...new Set(normalizedChecks.flatMap(check => check.reason_codes)),
  ];
  const decision =
    summary.failed > 0
      ? "DENY"
      : summary.warned > 0 || summary.unavailable > 0
        ? "REVIEW"
        : "ALLOW";
  return {
    decision,
    decision_id: `cap_${generatedAt.replace(/[^0-9]/g, "").slice(0, 14)}_${Math.abs(
      JSON.stringify({ target, reasonCodes }).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0),
    ).toString(36)}`,
    policy_version: "agent-capability-security-v1",
    pricing_version: PRICING_VERSION,
    target,
    checks: normalizedChecks,
    summary,
    reason_codes: reasonCodes.length ? reasonCodes : ["CAPABILITY_SECURITY_CLEAR"],
    generated_at: generatedAt,
  };
}

async function capabilityCheck(check, runner) {
  try {
    const result = await runner();
    const status = bundleCheckStatus(result);
    return {
      check,
      status,
      reason_codes: bundleReasonCodes(result, `${check.toUpperCase()}_${status.toUpperCase()}`),
      evidence: summarizeBundleEvidence(result),
    };
  } catch (error) {
    return bundleUnavailable(check, `${check.toUpperCase()}_UNAVAILABLE`, {
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

async function agentCapabilitySecurityPreflight(input, fetchImpl = fetch) {
  const checks = [];
  if (input.agent_card_url) {
    checks.push(
      await capabilityCheck("agent_card", () =>
        a2aAgentCardPreflight(input.agent_card_url, fetchImpl),
      ),
    );
  } else {
    checks.push(bundleUnavailable("agent_card", "AGENT_CARD_URL_MISSING"));
  }
  if (input.github_owner && input.github_repo) {
    checks.push(
      await capabilityCheck("github_repository_health", () =>
        githubRepositoryHealth(input.github_owner, input.github_repo, undefined, fetchImpl),
      ),
    );
  } else {
    checks.push(
      bundleUnavailable("github_repository_health", "GITHUB_REPOSITORY_INPUT_MISSING"),
    );
  }
  if (input.npm_package) {
    checks.push(
      await capabilityCheck("npm_package_preflight", () =>
        npmPackagePreflight(input.npm_package, input.npm_version || "latest", fetchImpl),
      ),
    );
  } else {
    checks.push(bundleUnavailable("npm_package_preflight", "NPM_PACKAGE_INPUT_MISSING"));
  }
  if (input.domain) {
    checks.push(
      await capabilityCheck("domain_trust", () =>
        domainTrustPreflight(input.domain, fetchImpl),
      ),
    );
  } else {
    checks.push(bundleUnavailable("domain_trust", "DOMAIN_INPUT_MISSING"));
  }
  if (input.openapi_url) {
    checks.push(
      await capabilityCheck("openapi_spec", () =>
        openApiSpecPreflight(input.openapi_url, fetchImpl),
      ),
    );
  } else {
    checks.push(bundleUnavailable("openapi_spec", "OPENAPI_URL_MISSING"));
  }
  if (input.x402_url) {
    checks.push(
      await capabilityCheck("x402_endpoint", () =>
        x402EndpointPreflight(input.x402_url, fetchImpl),
      ),
    );
  } else {
    checks.push(bundleUnavailable("x402_endpoint", "X402_URL_MISSING"));
  }
  return buildAgentCapabilitySecurityPreflight({
    target: {
      type: input.target_type,
      identifier: input.identifier,
    },
    checks,
  });
}

export function buildPypiPackagePreflight({
  packageName,
  requestedVersion,
  payload,
  osv,
  fetchedAt = new Date().toISOString(),
}) {
  const info = payload.info ?? {};
  const resolvedVersion = info.version ?? requestedVersion;
  const files = payload.urls ?? [];
  const releaseTimes = files
    .map(file => file.upload_time_iso_8601 ?? file.upload_time)
    .filter(Boolean)
    .map(value => Date.parse(value))
    .filter(Number.isFinite);
  const lastPublishedAt = releaseTimes.length
    ? new Date(Math.max(...releaseTimes)).toISOString()
    : null;
  const staleDays = lastPublishedAt
    ? Math.max(0, Math.floor((Date.now() - Date.parse(lastPublishedAt)) / 86_400_000))
    : null;
  const vulnerabilities = (osv?.vulns ?? []).map(vulnerability => ({
    id: vulnerability.id ?? null,
    summary: vulnerability.summary ?? null,
    aliases: vulnerability.aliases ?? [],
    modified: vulnerability.modified ?? null,
    references: vulnerability.references?.slice(0, 5) ?? [],
  }));
  const flags = [];
  let score = 0;
  if (files.length > 0 && files.every(file => file.yanked)) {
    flags.push({
      code: "YANKED_RELEASE",
      severity: "high",
      detail: "All published files for the resolved release are marked as yanked.",
    });
    score += 55;
  } else if (files.some(file => file.yanked)) {
    flags.push({
      code: "PARTIALLY_YANKED_RELEASE",
      severity: "medium",
      detail: "One or more files for the resolved release are marked as yanked.",
    });
    score += 20;
  }
  if (vulnerabilities.length) {
    flags.push({
      code: "KNOWN_OSV_VULNERABILITIES",
      severity: "high",
      detail: `${vulnerabilities.length} OSV vulnerability record(s) affect this package version.`,
    });
    score += Math.min(75, 35 + vulnerabilities.length * 10);
  }
  if (staleDays !== null && staleDays > 1095) {
    flags.push({
      code: "STALE_RELEASE",
      severity: "medium",
      detail: `The resolved release is approximately ${staleDays} days old.`,
    });
    score += 20;
  }
  if (!info.license && !info.license_expression) {
    flags.push({
      code: "LICENSE_NOT_DECLARED",
      severity: "medium",
      detail: "The package metadata does not declare a license.",
    });
    score += 15;
  }
  if (!info.requires_python) {
    flags.push({
      code: "PYTHON_REQUIREMENT_NOT_DECLARED",
      severity: "info",
      detail: "The package metadata does not declare requires_python.",
    });
    score += 5;
  }
  score = Math.min(score, 100);
  return {
    product: "pypi-package-preflight",
    schema_version: "1.0",
    package: packageName,
    requested_version: requestedVersion,
    resolved_version: resolvedVersion,
    fetched_at: fetchedAt,
    assessment: {
      risk_level: score >= 70 ? "high" : score >= 20 ? "medium" : "low",
      risk_score: score,
      flags,
      decision_hint:
        score >= 70
          ? "Do not install until vulnerability and yanked-release findings are reviewed."
          : score >= 20
            ? "Review package metadata, release age, and vulnerability findings before installation."
            : "No major public package warning was found; pin hashes and review provenance before installation.",
    },
    metadata: {
      name: info.name ?? packageName,
      summary: info.summary ?? null,
      author: info.author ?? null,
      project_url: info.project_url ?? null,
      package_url: info.package_url ?? null,
      license: info.license_expression ?? info.license ?? null,
      requires_python: info.requires_python ?? null,
      dependency_count: Array.isArray(info.requires_dist) ? info.requires_dist.length : 0,
      dependencies: (info.requires_dist ?? []).slice(0, 100),
      file_count: files.length,
      all_files_yanked: files.length > 0 && files.every(file => file.yanked),
      last_published_at: lastPublishedAt,
      stale_days: staleDays,
    },
    vulnerabilities,
    provenance: {
      provider: "PyPI JSON API and Google OSV",
      pypi_url: `https://pypi.org/project/${encodeURIComponent(packageName)}/${encodeURIComponent(resolvedVersion)}/`,
    },
    limitations: [
      "Package metadata is publisher-controlled and does not prove the uploaded artifacts are safe.",
      "OSV coverage is not exhaustive and newly disclosed issues may not appear immediately.",
      "This check does not inspect wheel or source-distribution contents.",
    ],
  };
}

export async function pypiPackagePreflight(
  packageName,
  requestedVersion = "latest",
  fetchImpl = fetch,
) {
  const encodedPackage = encodeURIComponent(packageName);
  const metadataUrl =
    requestedVersion === "latest"
      ? `https://pypi.org/pypi/${encodedPackage}/json`
      : `https://pypi.org/pypi/${encodedPackage}/${encodeURIComponent(requestedVersion)}/json`;
  const payload = await fetchJson(metadataUrl, fetchImpl);
  const resolvedVersion = payload.info?.version ?? requestedVersion;
  const response = await fetchImpl("https://api.osv.dev/v1/query", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "AgentCommerceSafety/0.6",
    },
    body: JSON.stringify({
      package: { ecosystem: "PyPI", name: packageName },
      version: resolvedVersion,
    }),
  });
  if (!response.ok) throw new Error(`osv_http_${response.status}`);
  const osv = await response.json();
  return buildPypiPackagePreflight({
    packageName,
    requestedVersion,
    payload,
    osv,
  });
}

function parseAddressList(value) {
  if (!value) return [];
  return [...new Set(
    value
      .split(",")
      .map(item => item.trim().toLowerCase())
      .filter(item => ADDRESS_PATTERN.test(item)),
  )];
}

function parseStringList(value, maxItems = 50) {
  if (!value) return [];
  const input = Array.isArray(value) ? value : String(value).split(",");
  return [...new Set(
    input
      .map(item => String(item).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, maxItems),
  )];
}

function guardReason(code, severity, detail, source = "policy") {
  return { code, severity, detail, source };
}

function safeAtomicNumber(value) {
  try {
    const parsed = BigInt(value ?? 0);
    return parsed >= 0n && parsed <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(parsed)
      : null;
  } catch {
    return null;
  }
}

function parseRiskSignals(input = {}) {
  const labels = parseStringList(input.labels ?? input.risk_labels ?? [], 25);
  const score = Math.max(
    0,
    Math.min(
      100,
      Number(input.score ?? input.risk_score ?? input.address_risk_score ?? 0),
    ),
  );
  return {
    score: Number.isFinite(score) ? score : 0,
    level: String(input.level ?? input.risk_level ?? "unknown").toLowerCase(),
    labels,
    sanctioned: Boolean(input.sanctioned ?? input.is_sanctioned),
    phishing: Boolean(input.phishing ?? input.is_phishing),
    drainer: Boolean(input.drainer ?? input.is_drainer),
    source: input.source ? String(input.source).slice(0, 120) : "caller_supplied",
  };
}

export function buildVerifiableIntent({
  input = {},
  evaluatedAt = new Date().toISOString(),
} = {}) {
  const reasons = [];
  const requestId = String(input.request_id ?? "").trim();
  const agentId = String(input.agent_id ?? "").trim();
  const sessionId = String(input.session_id ?? "").trim();
  const payTo = String(input.pay_to ?? input.recipient ?? "").toLowerCase();
  const chain = String(input.chain ?? input.network ?? BASE_MAINNET);
  const token = String(input.token ?? input.asset ?? USDC).toLowerCase();
  const purpose = String(input.purpose ?? "").trim().toLowerCase();
  const nonce = String(input.nonce ?? "").trim();
  const expiresAt = String(
    input.expires_at ??
      new Date(Date.parse(evaluatedAt) + 5 * 60_000).toISOString(),
  );
  const amountAtomic =
    input.amount_atomic !== undefined
      ? safeAtomicNumber(input.amount_atomic)
      : safeAtomicNumber(usdcToAtomic(String(input.amount_usdc ?? "")));

  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(requestId)) {
    reasons.push(
      guardReason(
        "INVALID_REQUEST_ID",
        "critical",
        "request_id is required and must be stable for this payment attempt.",
        "intent",
      ),
    );
  }
  if (!/^[A-Za-z0-9._:-]{1,96}$/.test(agentId)) {
    reasons.push(
      guardReason(
        "INVALID_AGENT_ID",
        "critical",
        "agent_id is required so policy can bind the intent to a caller.",
        "intent",
      ),
    );
  }
  if (sessionId && !/^[A-Za-z0-9._:-]{1,96}$/.test(sessionId)) {
    reasons.push(
      guardReason(
        "INVALID_SESSION_ID",
        "critical",
        "session_id contains unsupported characters.",
        "intent",
      ),
    );
  }
  if (!ADDRESS_PATTERN.test(payTo)) {
    reasons.push(
      guardReason(
        "INVALID_RECIPIENT",
        "critical",
        "pay_to must be an EVM address for this MVP.",
        "intent",
      ),
    );
  }
  if (chain !== BASE_MAINNET) {
    reasons.push(
      guardReason(
        "UNSUPPORTED_CHAIN",
        "critical",
        "Only Base mainnet is enabled for signing-gate authorization in this MVP.",
        "intent",
      ),
    );
  }
  if (token !== USDC.toLowerCase()) {
    reasons.push(
      guardReason(
        "UNSUPPORTED_TOKEN",
        "critical",
        "Only canonical Base USDC is enabled for stablecoin authorization in this MVP.",
        "intent",
      ),
    );
  }
  if (amountAtomic === null || amountAtomic <= 0) {
    reasons.push(
      guardReason(
        "INVALID_AMOUNT",
        "critical",
        "amount_usdc or amount_atomic must be a positive USDC amount.",
        "intent",
      ),
    );
  }
  if (!purpose || purpose.length > 80) {
    reasons.push(
      guardReason(
        "INVALID_PURPOSE",
        "critical",
        "purpose is required and must be short enough for audit logs.",
        "intent",
      ),
    );
  }
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(nonce)) {
    reasons.push(
      guardReason(
        "INVALID_NONCE",
        "critical",
        "nonce is required to make the payment intent non-replayable.",
        "intent",
      ),
    );
  }
  if (!Number.isFinite(Date.parse(expiresAt))) {
    reasons.push(
      guardReason(
        "INVALID_EXPIRY",
        "critical",
        "expires_at must be an ISO-8601 timestamp.",
        "intent",
      ),
    );
  } else if (Date.parse(expiresAt) <= Date.parse(evaluatedAt)) {
    reasons.push(
      guardReason(
        "INTENT_EXPIRED",
        "critical",
        "The payment intent has already expired.",
        "intent",
      ),
    );
  }

  const invoiceHash = input.invoice_hash
    ? String(input.invoice_hash).toLowerCase()
    : null;
  const invoiceId = input.invoice_id ? String(input.invoice_id).slice(0, 160) : null;
  if (
    !invoiceId &&
    (!invoiceHash || !/^0x[a-fA-F0-9]{64}$/.test(invoiceHash))
  ) {
    reasons.push(
      guardReason(
        "MISSING_COMMERCIAL_CONTEXT",
        "high",
        "invoice_id or invoice_hash is required to bind payment to an external obligation.",
        "intent",
      ),
    );
  }

  const valid = !reasons.some(reason => reason.severity === "critical");
  const normalizedIntent = {
    request_id: requestId || null,
    session_id: sessionId || null,
    agent_id: agentId || null,
    user_id: input.user_id ? String(input.user_id).slice(0, 120) : null,
    purpose: purpose || null,
    pay_to: ADDRESS_PATTERN.test(payTo) ? payTo : null,
    chain,
    token,
    amount_atomic: amountAtomic,
    amount_usdc:
      amountAtomic === null ? null : formatUnits(BigInt(amountAtomic), 6),
    invoice_id: invoiceId,
    invoice_hash: invoiceHash,
    merchant_id: input.merchant_id ? String(input.merchant_id).slice(0, 120) : null,
    nonce: nonce || null,
    expires_at: Number.isFinite(Date.parse(expiresAt)) ? expiresAt : null,
  };
  return {
    product: "agent-payment-risk-gateway",
    schema_version: "0.1",
    evaluated_at: evaluatedAt,
    valid,
    normalized_intent: normalizedIntent,
    reasons,
    limitations: [
      "This verifies intent structure and policy fit; it does not guarantee merchant delivery.",
      "The service is a signing gate and must not expose private keys to agents.",
    ],
  };
}

export async function buildAgentPaymentAuthorization({
  input = {},
  signingSecret = null,
  evaluatedAt = new Date().toISOString(),
} = {}) {
  const intent = buildVerifiableIntent({ input, evaluatedAt });
  let policy;
  try {
    policy = paymentGuardPolicyFromInput(input.policy ?? input);
  } catch {
    policy = paymentGuardPolicyFromInput({});
  }
  const risk = parseRiskSignals(input.risk ?? input.address_risk ?? {});
  const reasons = [...intent.reasons];
  let hardBlock = !intent.valid;
  let needsReview = false;
  let riskScore = risk.score;
  const payTo = intent.normalized_intent.pay_to;
  const amountAtomic = intent.normalized_intent.amount_atomic;

  if (payTo && policy.blockPayTo.includes(payTo)) {
    reasons.push(
      guardReason(
        "RECIPIENT_BLOCKED",
        "critical",
        "The recipient is on the policy blocklist.",
      ),
    );
    hardBlock = true;
  }
  if (payTo && policy.allowPayTo.length && !policy.allowPayTo.includes(payTo)) {
    reasons.push(
      guardReason(
        "RECIPIENT_NOT_ALLOWLISTED",
        "critical",
        "The recipient is not on the policy allowlist.",
      ),
    );
    hardBlock = true;
  }
  if (amountAtomic !== null && amountAtomic > policy.maxSingleAtomic) {
    reasons.push(
      guardReason(
        "SINGLE_PAYMENT_LIMIT_EXCEEDED",
        "critical",
        `The requested ${formatUnits(BigInt(amountAtomic), 6)} USDC exceeds the ${formatUnits(BigInt(policy.maxSingleAtomic), 6)} USDC single-payment limit.`,
      ),
    );
    hardBlock = true;
  }
  if (
    amountAtomic !== null &&
    Number.isFinite(policy.humanReviewAtomic) &&
    amountAtomic >= policy.humanReviewAtomic
  ) {
    reasons.push(
      guardReason(
        "HUMAN_APPROVAL_REQUIRED",
        "medium",
        "The payment meets the policy threshold for explicit human review.",
      ),
    );
    needsReview = true;
  }
  if (risk.sanctioned) {
    reasons.push(
      guardReason(
        "SANCTIONED_COUNTERPARTY",
        "critical",
        "Caller-supplied risk evidence marks the recipient as sanctioned.",
        "risk",
      ),
    );
    hardBlock = true;
    riskScore = 100;
  }
  if (risk.phishing || risk.drainer) {
    reasons.push(
      guardReason(
        "KNOWN_ABUSE_INFRASTRUCTURE",
        "critical",
        "Caller-supplied risk evidence marks the recipient as phishing or drainer infrastructure.",
        "risk",
      ),
    );
    hardBlock = true;
    riskScore = Math.max(riskScore, 95);
  }
  if (riskScore >= 80) {
    reasons.push(
      guardReason(
        "HIGH_COUNTERPARTY_RISK",
        "critical",
        "Recipient risk score is above the automatic denial threshold.",
        "risk",
      ),
    );
    hardBlock = true;
  } else if (riskScore >= 35 || risk.level === "medium" || risk.level === "high") {
    reasons.push(
      guardReason(
        "COUNTERPARTY_REVIEW_REQUIRED",
        "medium",
        "Recipient risk requires human or higher-trust policy review before signing.",
        "risk",
      ),
    );
    needsReview = true;
  }

  const decision = hardBlock ? "deny" : needsReview ? "review" : "allow";
  const signingDirective =
    decision === "allow"
      ? "sign_with_policy_controlled_key"
      : decision === "review"
        ? "hold_for_human_review"
        : "do_not_sign";
  const expiresAt = intent.normalized_intent.expires_at;
  let authorizationToken = null;
  if (decision === "allow" && signingSecret) {
    authorizationToken = await signPaymentGuardDecision(
      {
        type: "agent_payment_authorization",
        request_id: intent.normalized_intent.request_id,
        agent_id: intent.normalized_intent.agent_id,
        pay_to: intent.normalized_intent.pay_to,
        amount_atomic: intent.normalized_intent.amount_atomic,
        chain: intent.normalized_intent.chain,
        token: intent.normalized_intent.token,
        nonce: intent.normalized_intent.nonce,
        issued_at: evaluatedAt,
        expires_at: expiresAt,
      },
      signingSecret,
    );
  }

  return {
    product: "agent-payment-risk-gateway",
    schema_version: "0.1",
    evaluated_at: evaluatedAt,
    decision,
    signing_directive: signingDirective,
    authorization_token: authorizationToken,
    max_allowed_amount_usdc: formatUnits(BigInt(policy.maxSingleAtomic), 6),
    intent: intent.normalized_intent,
    policy: {
      max_single_usdc: formatUnits(BigInt(policy.maxSingleAtomic), 6),
      session_budget_usdc: formatUnits(BigInt(policy.sessionBudgetAtomic), 6),
      daily_budget_usdc: formatUnits(BigInt(policy.dailyBudgetAtomic), 6),
      human_review_above_usdc: formatUnits(
        BigInt(policy.humanReviewAtomic),
        6,
      ),
      allow_pay_to: policy.allowPayTo,
      block_pay_to: policy.blockPayTo,
    },
    risk: {
      score: riskScore,
      level:
        riskScore >= 80
          ? "high"
          : riskScore >= 35
            ? "medium"
            : risk.level === "unknown"
              ? "low"
              : risk.level,
      labels: risk.labels,
      source: risk.source,
    },
    reasons,
    next_action:
      decision === "allow"
        ? "Send this authorization to a policy-controlled signer; never disclose private keys to the agent."
        : decision === "review"
          ? "Pause signing and request owner or higher-trust policy approval."
          : "Reject the payment intent and do not sign or submit a transaction.",
  };
}

function randomToken(prefix) {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const encoded = [...bytes]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${encoded}`;
}

function base64UrlEncode(value) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function hmacSha256(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
  );
}

async function aesKeyFromSecret(secret) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptSecret(value, masterSecret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKeyFromSecret(masterSecret);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(value),
    ),
  );
  return `${base64UrlEncode(iv)}.${base64UrlEncode(encrypted)}`;
}

async function decryptSecret(value, masterSecret) {
  const [encodedIv, encodedCiphertext] = String(value).split(".");
  const key = await aesKeyFromSecret(masterSecret);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlDecode(encodedIv) },
    key,
    base64UrlDecode(encodedCiphertext),
  );
  return new TextDecoder().decode(decrypted);
}

export async function signPaymentGuardDecision(payload, secret) {
  if (!secret) throw new Error("payment_guard_signing_secret_missing");
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(await hmacSha256(encodedPayload, secret));
  return `${encodedPayload}.${signature}`;
}

export async function verifyPaymentGuardDecision(
  token,
  secret,
  { allowExpired = false } = {},
) {
  if (!secret || !token?.includes(".")) {
    throw new Error("invalid_decision_token");
  }
  const [encodedPayload, encodedSignature] = token.split(".");
  const expected = await hmacSha256(encodedPayload, secret);
  const supplied = base64UrlDecode(encodedSignature);
  if (
    expected.length !== supplied.length ||
    !expected.every((byte, index) => byte === supplied[index])
  ) {
    throw new Error("invalid_decision_token_signature");
  }
  const payload = JSON.parse(
    new TextDecoder().decode(base64UrlDecode(encodedPayload)),
  );
  if (
    !payload.expires_at ||
    (!allowExpired && Date.parse(payload.expires_at) <= Date.now())
  ) {
    throw new Error("decision_token_expired");
  }
  return payload;
}

function paymentGuardPolicyFromInput(input) {
  const maxSingleAtomic = usdcToAtomic(input.max_single_usdc ?? "0.10");
  const sessionBudgetAtomic = usdcToAtomic(
    input.session_budget_usdc ?? "1.00",
  );
  const dailyBudgetAtomic = usdcToAtomic(input.daily_budget_usdc ?? "5.00");
  const reservationTtlSeconds = Number(
    input.reservation_ttl_seconds ?? 300,
  );
  const retentionDays = Number(input.retention_days ?? 30);
  const activeFromHourUtc = Number(input.active_from_hour_utc ?? 0);
  const activeUntilHourUtc = Number(input.active_until_hour_utc ?? 24);
  const humanReviewAtomic = usdcToAtomic(
    input.human_review_above_usdc ?? input.max_single_usdc ?? "0.10",
  );
  if (
    maxSingleAtomic === null ||
    sessionBudgetAtomic === null ||
    dailyBudgetAtomic === null ||
    maxSingleAtomic > 1_000_000_000_000n ||
    sessionBudgetAtomic > 1_000_000_000_000n ||
    dailyBudgetAtomic > 1_000_000_000_000n ||
    humanReviewAtomic === null ||
    humanReviewAtomic > 1_000_000_000_000n ||
    !Number.isInteger(reservationTtlSeconds) ||
    reservationTtlSeconds < 30 ||
    reservationTtlSeconds > 3600 ||
    !Number.isInteger(retentionDays) ||
    retentionDays < 1 ||
    retentionDays > 365
    || !Number.isInteger(activeFromHourUtc)
    || !Number.isInteger(activeUntilHourUtc)
    || activeFromHourUtc < 0
    || activeFromHourUtc > 23
    || activeUntilHourUtc < 1
    || activeUntilHourUtc > 24
    || activeFromHourUtc >= activeUntilHourUtc
  ) {
    throw new Error("invalid_payment_guard_policy");
  }
  return {
    maxSingleAtomic: Number(maxSingleAtomic),
    sessionBudgetAtomic: Number(sessionBudgetAtomic),
    dailyBudgetAtomic: Number(dailyBudgetAtomic),
    allowPayTo: parseAddressList(input.allow_pay_to ?? ""),
    blockPayTo: parseAddressList(input.block_pay_to ?? ""),
    reservationTtlSeconds,
    retentionDays,
    humanReviewAtomic: Number(humanReviewAtomic),
    failClosed:
      input.fail_closed === undefined
        ? true
        : !["false", "0", "no"].includes(
            String(input.fail_closed).toLowerCase(),
          ),
    allowedDomains: parseStringList(input.allowed_domains),
    allowedTools: parseStringList(input.allowed_tools),
    allowedPurposes: parseStringList(input.allowed_purposes),
    activeFromHourUtc,
    activeUntilHourUtc,
  };
}

async function createPaymentGuardProfile(db, input) {
  if (!db) throw new Error("payment_guard_database_unavailable");
  const policy = paymentGuardPolicyFromInput(input);
  const profileId = `pgp_${crypto.randomUUID()}`;
  const ownerToken = randomToken("pgo");
  const agentToken = randomToken("pga");
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO payment_guard_profiles
       (profile_id, name, owner_token_hash, agent_token_hash, policy_json,
        policy_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .bind(
      profileId,
      String(input.name ?? "Payment policy").slice(0, 120),
      await sha256Hex(ownerToken),
      await sha256Hex(agentToken),
      JSON.stringify(policy),
      now,
      now,
    )
    .run();
  return {
    profile_id: profileId,
    name: String(input.name ?? "Payment policy").slice(0, 120),
    policy_version: 1,
    policy: {
      max_single_usdc: formatUnits(BigInt(policy.maxSingleAtomic), 6),
      session_budget_usdc: formatUnits(
        BigInt(policy.sessionBudgetAtomic),
        6,
      ),
      daily_budget_usdc: formatUnits(BigInt(policy.dailyBudgetAtomic), 6),
      reservation_ttl_seconds: policy.reservationTtlSeconds,
      retention_days: policy.retentionDays,
      human_review_above_usdc: formatUnits(
        BigInt(policy.humanReviewAtomic),
        6,
      ),
      fail_closed: policy.failClosed,
      allowed_domains: policy.allowedDomains,
      allowed_tools: policy.allowedTools,
      allowed_purposes: policy.allowedPurposes,
      active_hours_utc: [
        policy.activeFromHourUtc,
        policy.activeUntilHourUtc,
      ],
      allow_pay_to: policy.allowPayTo,
      block_pay_to: policy.blockPayTo,
    },
    owner_token: ownerToken,
    agent_token: agentToken,
    warning:
      "Store both tokens securely. They are returned once and cannot be recovered.",
  };
}

async function loadPaymentGuardProfile(db, profileId, token, role = "agent") {
  if (!db || !profileId || !token) throw new Error("policy_auth_required");
  const profile = await db
    .prepare(
      `SELECT profile_id, name, owner_token_hash, agent_token_hash, policy_json,
              policy_version, active, revoked_at, created_at, updated_at
       FROM payment_guard_profiles WHERE profile_id = ? LIMIT 1`,
    )
    .bind(profileId)
    .first();
  if (!profile) throw new Error("policy_not_found");
  if (!Number(profile.active)) throw new Error("policy_revoked");
  const tokenHash = await sha256Hex(token);
  const expected =
    role === "owner" ? profile.owner_token_hash : profile.agent_token_hash;
  if (tokenHash !== expected) throw new Error("policy_auth_failed");
  return {
    ...profile,
    policy: JSON.parse(profile.policy_json),
  };
}

async function managePaymentGuardProfile(db, input) {
  const profile = await loadPaymentGuardProfile(
    db,
    String(input.profile_id ?? ""),
    String(input.owner_token ?? ""),
    "owner",
  );
  const action = String(input.action ?? "");
  const now = new Date().toISOString();
  if (action === "update_policy") {
    const policy = paymentGuardPolicyFromInput(input);
    await db
      .prepare(
        `UPDATE payment_guard_profiles
         SET policy_json = ?, policy_version = policy_version + 1,
             updated_at = ?
         WHERE profile_id = ? AND active = 1`,
      )
      .bind(JSON.stringify(policy), now, profile.profile_id)
      .run();
    await enqueuePaymentGuardEvent(db, profile.profile_id, "policy.updated", {
      profile_id: profile.profile_id,
      policy_version: Number(profile.policy_version) + 1,
    });
    return {
      profile_id: profile.profile_id,
      action,
      policy_version: Number(profile.policy_version) + 1,
      updated_at: now,
    };
  }
  if (action === "rotate_agent_token") {
    const agentToken = randomToken("pga");
    await db
      .prepare(
        `UPDATE payment_guard_profiles
         SET agent_token_hash = ?, updated_at = ?
         WHERE profile_id = ? AND active = 1`,
      )
      .bind(await sha256Hex(agentToken), now, profile.profile_id)
      .run();
    return {
      profile_id: profile.profile_id,
      action,
      agent_token: agentToken,
      warning: "The previous agent token is invalid immediately.",
    };
  }
  if (action === "rotate_owner_token") {
    const ownerToken = randomToken("pgo");
    await db
      .prepare(
        `UPDATE payment_guard_profiles
         SET owner_token_hash = ?, updated_at = ?
         WHERE profile_id = ? AND active = 1`,
      )
      .bind(await sha256Hex(ownerToken), now, profile.profile_id)
      .run();
    return {
      profile_id: profile.profile_id,
      action,
      owner_token: ownerToken,
      warning: "The previous owner token is invalid immediately.",
    };
  }
  if (action === "revoke") {
    await db
      .prepare(
        `UPDATE payment_guard_profiles
         SET active = 0, revoked_at = ?, updated_at = ?
         WHERE profile_id = ?`,
      )
      .bind(now, now, profile.profile_id)
      .run();
    await enqueuePaymentGuardEvent(db, profile.profile_id, "policy.revoked", {
      profile_id: profile.profile_id,
      revoked_at: now,
    });
    return {
      profile_id: profile.profile_id,
      action,
      revoked_at: now,
    };
  }
  throw new Error("invalid_policy_management_action");
}

const PAYMENT_GUARD_WEBHOOK_EVENTS = new Set([
  "decision.allow",
  "decision.review",
  "decision.block",
  "approval.approved",
  "approval.denied",
  "payment.committed",
  "reservation.released",
  "delivery.success",
  "delivery.failure",
  "policy.updated",
  "policy.revoked",
]);

async function managePaymentGuardWebhook(db, input, signingSecret) {
  const profile = await loadPaymentGuardProfile(
    db,
    String(input.profile_id ?? ""),
    String(input.owner_token ?? ""),
    "owner",
  );
  const action = String(input.action ?? "create");
  if (action === "delete") {
    await db
      .prepare(
        `UPDATE payment_guard_webhooks SET active = 0, updated_at = ?
         WHERE webhook_id = ? AND profile_id = ?`,
      )
      .bind(
        new Date().toISOString(),
        String(input.webhook_id ?? ""),
        profile.profile_id,
      )
      .run();
    return { webhook_id: input.webhook_id, active: false };
  }
  if (action !== "create") throw new Error("invalid_webhook_action");
  const parsedUrl = validatePublicUrl(String(input.url ?? ""));
  const eventTypes = parseStringList(input.event_types).filter(event =>
    PAYMENT_GUARD_WEBHOOK_EVENTS.has(event),
  );
  if (!eventTypes.length) throw new Error("invalid_webhook_event_types");
  const webhookId = `pgw_${crypto.randomUUID()}`;
  const webhookSecret = randomToken("pgwh");
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO payment_guard_webhooks
       (webhook_id, profile_id, url, encrypted_secret, event_types,
        active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .bind(
      webhookId,
      profile.profile_id,
      parsedUrl.toString(),
      await encryptSecret(webhookSecret, signingSecret),
      JSON.stringify(eventTypes),
      now,
      now,
    )
    .run();
  return {
    webhook_id: webhookId,
    url: parsedUrl.toString(),
    event_types: eventTypes,
    webhook_secret: webhookSecret,
    warning: "The webhook signing secret is returned once.",
  };
}

async function enqueuePaymentGuardEvent(db, profileId, eventType, payload) {
  if (!db || !profileId || !PAYMENT_GUARD_WEBHOOK_EVENTS.has(eventType)) return;
  const hooks = await db
    .prepare(
      `SELECT webhook_id, event_types FROM payment_guard_webhooks
       WHERE profile_id = ? AND active = 1`,
    )
    .bind(profileId)
    .all();
  const now = new Date().toISOString();
  for (const hook of hooks.results ?? []) {
    const eventTypes = JSON.parse(hook.event_types ?? "[]");
    if (!eventTypes.includes(eventType)) continue;
    await db
      .prepare(
        `INSERT INTO payment_guard_webhook_outbox
         (webhook_id, event_type, payload_json, status, attempts,
          next_attempt_at, created_at)
         VALUES (?, ?, ?, 'pending', 0, ?, ?)`,
      )
      .bind(
        hook.webhook_id,
        eventType,
        JSON.stringify({
          event_id: crypto.randomUUID(),
          type: eventType,
          created_at: now,
          data: payload,
        }),
        now,
        now,
      )
      .run();
  }
}

async function processPaymentGuardWebhookOutbox(
  db,
  signingSecret,
  fetchImpl = fetch,
) {
  if (!db || !signingSecret) return;
  const now = new Date().toISOString();
  const due = await db
    .prepare(
      `SELECT o.id, o.webhook_id, o.event_type, o.payload_json, o.attempts,
              w.url, w.encrypted_secret
       FROM payment_guard_webhook_outbox o
       JOIN payment_guard_webhooks w ON w.webhook_id = o.webhook_id
       WHERE o.status = 'pending' AND o.next_attempt_at <= ?
         AND w.active = 1
       ORDER BY o.id LIMIT 25`,
    )
    .bind(now)
    .all();
  for (const item of due.results ?? []) {
    try {
      validatePublicUrl(item.url);
      const secret = await decryptSecret(item.encrypted_secret, signingSecret);
      const signature = base64UrlEncode(
        await hmacSha256(item.payload_json, secret),
      );
      const response = await fetchImpl(item.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-payment-guard-event": item.event_type,
          "x-payment-guard-signature": `v1=${signature}`,
        },
        body: item.payload_json,
        redirect: "error",
      });
      if (!response.ok) throw new Error(`webhook_http_${response.status}`);
      await db
        .prepare(
          `UPDATE payment_guard_webhook_outbox
           SET status = 'delivered', attempts = attempts + 1,
               delivered_at = ?, last_error = NULL WHERE id = ?`,
        )
        .bind(new Date().toISOString(), item.id)
        .run();
    } catch (error) {
      const attempts = Number(item.attempts ?? 0) + 1;
      const terminal = attempts >= 8;
      const nextAttempt = new Date(
        Date.now() + Math.min(3600, 2 ** attempts * 15) * 1000,
      ).toISOString();
      await db
        .prepare(
          `UPDATE payment_guard_webhook_outbox
           SET status = ?, attempts = ?, next_attempt_at = ?, last_error = ?
           WHERE id = ?`,
        )
        .bind(
          terminal ? "failed" : "pending",
          attempts,
          nextAttempt,
          (error instanceof Error ? error.message : String(error)).slice(0, 500),
          item.id,
        )
        .run();
    }
  }
}

export async function buildPaymentGuardDecision({
  targetUrl,
  sessionId,
  requestId,
  endpoint,
  merchant = null,
  domain = null,
  intent = null,
  simulation = null,
  history = {},
  policy,
  profile = null,
  transactionExpected = false,
  toolId = null,
  purpose = null,
  evaluatedAt = new Date().toISOString(),
}) {
  const methods = endpoint?.x402?.accepts ?? [];
  const payment =
    methods.find(
      method =>
        method.network === BASE_MAINNET &&
        String(method.asset ?? "").toLowerCase() === USDC.toLowerCase() &&
        ADDRESS_PATTERN.test(method.pay_to ?? "") &&
        /^\d+$/.test(String(method.amount_atomic ?? "")),
    ) ?? null;
  const reasons = [];
  let riskScore = Math.min(100, Number(endpoint?.assessment?.risk_score ?? 100));
  let hardBlock = false;
  let needsReview = false;
  const failClosed = policy.failClosed ?? true;

  if (!payment) {
    reasons.push(
      guardReason(
        "NO_SUPPORTED_PAYMENT_METHOD",
        "critical",
        "No valid Base exact-payment method using canonical USDC was found.",
        "x402",
      ),
    );
    hardBlock = true;
  }
  const targetDomain = new URL(endpoint?.url ?? targetUrl).hostname.toLowerCase();
  if (
    policy.allowedDomains?.length &&
    !policy.allowedDomains.some(
      domain =>
        targetDomain === domain || targetDomain.endsWith(`.${domain}`),
    )
  ) {
    reasons.push(
      guardReason(
        "MANDATE_DOMAIN_VIOLATION",
        "critical",
        "The target domain is outside the policy mandate.",
        "mandate",
      ),
    );
    hardBlock = true;
  }
  if (
    policy.allowedTools?.length &&
    (!toolId || !policy.allowedTools.includes(String(toolId).toLowerCase()))
  ) {
    reasons.push(
      guardReason(
        "MANDATE_TOOL_VIOLATION",
        "critical",
        "The calling tool is missing or outside the policy mandate.",
        "mandate",
      ),
    );
    hardBlock = true;
  }
  if (
    policy.allowedPurposes?.length &&
    (!purpose ||
      !policy.allowedPurposes.includes(String(purpose).toLowerCase()))
  ) {
    reasons.push(
      guardReason(
        "MANDATE_PURPOSE_VIOLATION",
        "critical",
        "The declared payment purpose is missing or outside the policy mandate.",
        "mandate",
      ),
    );
    hardBlock = true;
  }
  const currentHour = new Date(evaluatedAt).getUTCHours();
  if (
    Number.isInteger(policy.activeFromHourUtc) &&
    Number.isInteger(policy.activeUntilHourUtc) &&
    (currentHour < policy.activeFromHourUtc ||
      currentHour >= policy.activeUntilHourUtc)
  ) {
    reasons.push(
      guardReason(
        "MANDATE_TIME_WINDOW_VIOLATION",
        "critical",
        "The payment is outside the policy's permitted UTC time window.",
        "mandate",
      ),
    );
    hardBlock = true;
  }

  const amountAtomic = safeAtomicNumber(payment?.amount_atomic);
  const payTo = payment?.pay_to?.toLowerCase() ?? null;
  if (payment && amountAtomic === null) {
    reasons.push(
      guardReason(
        "UNSAFE_PAYMENT_AMOUNT",
        "critical",
        "The payment amount is invalid or exceeds the safe accounting range.",
        "x402",
      ),
    );
    hardBlock = true;
  }

  if (payTo && policy.blockPayTo.includes(payTo)) {
    reasons.push(
      guardReason(
        "RECIPIENT_BLOCKED",
        "critical",
        "The payment recipient is on the caller's blocklist.",
      ),
    );
    hardBlock = true;
  }
  if (payTo && policy.allowPayTo.length && !policy.allowPayTo.includes(payTo)) {
    reasons.push(
      guardReason(
        "RECIPIENT_NOT_ALLOWLISTED",
        "critical",
        "The payment recipient is not on the caller's allowlist.",
      ),
    );
    hardBlock = true;
  }
  if (amountAtomic !== null && amountAtomic > policy.maxSingleAtomic) {
    reasons.push(
      guardReason(
        "SINGLE_PAYMENT_LIMIT_EXCEEDED",
        "critical",
        `The requested ${formatUnits(BigInt(amountAtomic), 6)} USDC exceeds the ${formatUnits(BigInt(policy.maxSingleAtomic), 6)} USDC single-payment limit.`,
      ),
    );
    hardBlock = true;
  }
  if (
    amountAtomic !== null &&
    Number.isFinite(policy.humanReviewAtomic) &&
    amountAtomic >= policy.humanReviewAtomic
  ) {
    reasons.push(
      guardReason(
        "HUMAN_APPROVAL_REQUIRED",
        "medium",
        "The payment meets the policy threshold for explicit human review.",
      ),
    );
    needsReview = true;
  }

  const projectedSession =
    Number(history.sessionReservedAtomic ?? 0) + Number(amountAtomic ?? 0);
  const projectedDaily =
    Number(history.dailyReservedAtomic ?? 0) + Number(amountAtomic ?? 0);
  if (projectedSession > policy.sessionBudgetAtomic) {
    reasons.push(
      guardReason(
        "SESSION_BUDGET_EXCEEDED",
        "critical",
        "This payment would exceed the configured session budget.",
      ),
    );
    hardBlock = true;
  }
  if (projectedDaily > policy.dailyBudgetAtomic) {
    reasons.push(
      guardReason(
        "DAILY_BUDGET_EXCEEDED",
        "critical",
        "This payment would exceed the configured UTC-day budget.",
      ),
    );
    hardBlock = true;
  }
  if (history.duplicateFingerprint) {
    reasons.push(
      guardReason(
        "POSSIBLE_REPLAY",
        "critical",
        "An equivalent payment was evaluated for this session within the replay window.",
      ),
    );
    hardBlock = true;
  }
  if (Number(history.evaluationsLastMinute ?? 0) >= 20) {
    reasons.push(
      guardReason(
        "HIGH_PAYMENT_VELOCITY",
        "high",
        "At least 20 payment evaluations occurred in this policy scope during the last minute.",
        "behavior",
      ),
    );
    needsReview = true;
    riskScore += 25;
  }
  if (Number(history.recipientEvaluationsTenMinutes ?? 0) >= 10) {
    reasons.push(
      guardReason(
        "RECIPIENT_VELOCITY_SPIKE",
        "medium",
        "This recipient has been evaluated at least 10 times in the last ten minutes.",
        "behavior",
      ),
    );
    needsReview = true;
    riskScore += 15;
  }
  if (
    amountAtomic !== null &&
    Number(history.previousAmountAtomic ?? 0) > 0 &&
    amountAtomic > Number(history.previousAmountAtomic) * 3
  ) {
    reasons.push(
      guardReason(
        "PRICE_SPIKE",
        "high",
        "The requested amount is more than three times the last observed amount for this resource.",
        "behavior",
      ),
    );
    needsReview = true;
    riskScore += 25;
  }
  const missingEvidence = [];
  if (payment?.pay_to && !merchant) missingEvidence.push("merchant");
  if (!domain) missingEvidence.push("domain");
  if (transactionExpected && !intent) missingEvidence.push("transaction intent");
  if (transactionExpected && !simulation) missingEvidence.push("transaction simulation");
  if (missingEvidence.length) {
    reasons.push(
      guardReason(
        "REQUIRED_EVIDENCE_UNAVAILABLE",
        failClosed ? "critical" : "high",
        `Required evidence was unavailable: ${missingEvidence.join(", ")}.`,
        "evidence",
      ),
    );
    if (failClosed) hardBlock = true;
    else needsReview = true;
    riskScore += failClosed ? 50 : 25;
  }

  const componentAssessments = [
    ["x402", endpoint?.assessment],
    ["merchant", merchant?.assessment],
    ["domain", domain?.assessment],
    ["transaction", intent?.assessment],
  ];
  for (const [source, assessment] of componentAssessments) {
    for (const flag of assessment?.flags ?? []) {
      reasons.push(
        guardReason(
          flag.code,
          flag.severity ?? "info",
          flag.detail,
          source,
        ),
      );
    }
  }

  if (merchant) riskScore += Math.round(Number(merchant.assessment?.risk_score ?? 0) * 0.35);
  if (domain) riskScore += Math.round(Number(domain.assessment?.risk_score ?? 0) * 0.25);
  if (intent) riskScore += Math.round(Number(intent.assessment?.risk_score ?? 0) * 0.6);
  if (transactionExpected && simulation && !simulation.success) {
    reasons.push(
      guardReason(
        "TRANSACTION_SIMULATION_REVERTED",
        "critical",
        simulation.revert_reason ?? "The proposed transaction reverted during simulation.",
        "simulation",
      ),
    );
    hardBlock = true;
    riskScore += 70;
  }
  riskScore = Math.min(100, riskScore);
  if (intent?.assessment?.risk_level === "high") hardBlock = true;

  const decision = hardBlock
    ? "BLOCK"
    : needsReview || riskScore >= 30
      ? "REVIEW"
      : "ALLOW";
  const fingerprint = await sha256Hex(
    JSON.stringify({
      session_id: sessionId,
      target_url: endpoint?.url ?? targetUrl,
      pay_to: payTo,
      amount_atomic: amountAtomic,
      asset: payment?.asset ?? null,
      network: payment?.network ?? null,
      to: intent?.transaction?.to ?? null,
      selector: intent?.transaction?.selector ?? null,
    }),
  );
  const reservedAtomic = decision === "ALLOW" ? Number(amountAtomic ?? 0) : 0;

  return {
    product: "agent-payment-guard",
    schema_version: "1.0",
    evaluated_at: evaluatedAt,
    decision,
    risk_score: riskScore,
    request_id: requestId,
    session_id: sessionId,
    profile: profile
      ? {
          profile_id: profile.profile_id,
          name: profile.name,
          policy_version: Number(profile.policy_version),
        }
      : null,
    fingerprint,
    payment: {
      target_url: endpoint?.url ?? targetUrl,
      network: payment?.network ?? null,
      scheme: payment?.scheme ?? null,
      asset: payment?.asset ?? null,
      pay_to: payTo,
      amount_atomic: amountAtomic,
      amount_usdc:
        amountAtomic === null ? null : formatUnits(BigInt(amountAtomic), 6),
    },
    policy: {
      max_single_usdc: formatUnits(BigInt(policy.maxSingleAtomic), 6),
      session_budget_usdc: formatUnits(BigInt(policy.sessionBudgetAtomic), 6),
      daily_budget_usdc: formatUnits(BigInt(policy.dailyBudgetAtomic), 6),
      allow_pay_to: policy.allowPayTo,
      block_pay_to: policy.blockPayTo,
      reservation_ttl_seconds: policy.reservationTtlSeconds ?? 300,
      retention_days: policy.retentionDays ?? 30,
      human_review_above_usdc: Number.isFinite(policy.humanReviewAtomic)
        ? formatUnits(BigInt(policy.humanReviewAtomic), 6)
        : null,
      fail_closed: failClosed,
      mandate: {
        allowed_domains: policy.allowedDomains ?? [],
        allowed_tools: policy.allowedTools ?? [],
        allowed_purposes: policy.allowedPurposes ?? [],
        active_hours_utc: [
          policy.activeFromHourUtc ?? 0,
          policy.activeUntilHourUtc ?? 24,
        ],
        supplied_tool_id: toolId,
        supplied_purpose: purpose,
      },
    },
    budget: {
      storage_mode: history.storageMode ?? "stateless",
      prior_session_reserved_usdc: formatUnits(
        BigInt(history.sessionReservedAtomic ?? 0),
        6,
      ),
      prior_daily_reserved_usdc: formatUnits(
        BigInt(history.dailyReservedAtomic ?? 0),
        6,
      ),
      reserved_by_this_decision_usdc: formatUnits(BigInt(reservedAtomic), 6),
      remaining_session_usdc: formatUnits(
        BigInt(Math.max(0, policy.sessionBudgetAtomic - projectedSession)),
        6,
      ),
      remaining_daily_usdc: formatUnits(
        BigInt(Math.max(0, policy.dailyBudgetAtomic - projectedDaily)),
        6,
      ),
    },
    reasons,
    evidence: {
      x402: endpoint,
      merchant,
      domain,
      transaction_intent: intent,
      transaction_simulation: simulation,
    },
    limitations: [
      "ALLOW is a policy decision based on public data, not a guarantee of merchant honesty or successful delivery.",
      "An ALLOW decision reserves budget for replay protection; callers should use a new request_id for a distinct purchase.",
      "This service never holds keys, signs transactions, or submits payments.",
    ],
  };
}

async function loadPaymentGuardHistory(
  db,
  sessionId,
  requestId,
  fingerprintSeed,
  profileId = null,
  payTo = null,
  targetResource = null,
  now = new Date(),
) {
  if (!db) {
    return {
      storageMode: "stateless",
      duplicateFingerprint: false,
      sessionReservedAtomic: 0,
      dailyReservedAtomic: 0,
      evaluationsLastMinute: 0,
      recipientEvaluationsTenMinutes: 0,
      previousAmountAtomic: 0,
      existingRequest: null,
    };
  }
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const replayStart = new Date(now.getTime() - 10 * 60 * 1000);
  const minuteStart = new Date(now.getTime() - 60 * 1000);
  const scopeColumn = profileId ? "profile_id" : "session_id";
  const scopeValue = profileId ?? sessionId;
  const [sessionBudget, dailyBudget, duplicate, existing, behavior] =
    await db.batch([
    db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE
            WHEN reservation_status = 'committed'
              OR (reservation_status = 'reserved' AND expires_at > ?)
            THEN amount_atomic ELSE 0 END), 0) AS reserved
         FROM payment_guard_evaluations
         WHERE session_id = ? AND (? IS NULL OR profile_id = ?)`,
      )
      .bind(
        now.toISOString(),
        sessionId,
        profileId,
        profileId,
      ),
    db
      .prepare(
        `SELECT COALESCE(SUM(CASE
          WHEN reservation_status = 'committed'
            OR (reservation_status = 'reserved' AND expires_at > ?)
          THEN amount_atomic ELSE 0 END), 0) AS reserved
         FROM payment_guard_evaluations
         WHERE created_at >= ? AND ${scopeColumn} = ?`,
      )
      .bind(now.toISOString(), dayStart.toISOString(), scopeValue),
    db
      .prepare(
        `SELECT request_id FROM payment_guard_evaluations
         WHERE session_id = ? AND fingerprint = ? AND created_at >= ?
           AND reservation_status IN ('reserved', 'committed')
           AND (reservation_status = 'committed' OR expires_at > ?)
         LIMIT 1`,
      )
      .bind(
        sessionId,
        fingerprintSeed,
        replayStart.toISOString(),
        now.toISOString(),
      ),
    db
      .prepare(
        `SELECT request_id, decision, risk_score, reasons_json, created_at,
                reservation_status, expires_at, tx_hash, decision_token
         FROM payment_guard_evaluations WHERE request_id = ? LIMIT 1`,
      )
      .bind(requestId),
    db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0)
            AS evaluations_last_minute,
          COALESCE(SUM(CASE WHEN created_at >= ? AND pay_to = ?
            THEN 1 ELSE 0 END), 0) AS recipient_evaluations_ten_minutes,
          COALESCE((
            SELECT amount_atomic FROM payment_guard_evaluations
            WHERE ${scopeColumn} = ? AND target_url = ?
            ORDER BY id DESC LIMIT 1
          ), 0) AS previous_amount
         FROM payment_guard_evaluations WHERE ${scopeColumn} = ?`,
      )
      .bind(
        minuteStart.toISOString(),
        replayStart.toISOString(),
        payTo,
        scopeValue,
        targetResource,
        scopeValue,
      ),
  ]);
  return {
    storageMode: "d1",
    duplicateFingerprint: Boolean(duplicate.results?.[0]),
    sessionReservedAtomic: Number(
      sessionBudget.results?.[0]?.reserved ?? 0,
    ),
    dailyReservedAtomic: Number(dailyBudget.results?.[0]?.reserved ?? 0),
    evaluationsLastMinute: Number(
      behavior.results?.[0]?.evaluations_last_minute ?? 0,
    ),
    recipientEvaluationsTenMinutes: Number(
      behavior.results?.[0]?.recipient_evaluations_ten_minutes ?? 0,
    ),
    previousAmountAtomic: Number(
      behavior.results?.[0]?.previous_amount ?? 0,
    ),
    existingRequest: existing.results?.[0] ?? null,
  };
}

async function savePaymentGuardEvaluation(db, result) {
  if (!db) return;
  const auditUrl = new URL(result.payment.target_url);
  auditUrl.search = "";
  auditUrl.hash = "";
  const retentionCutoff = new Date(
    Date.parse(result.evaluated_at) -
      Number(result.policy.retention_days ?? 30) * 86_400_000,
  ).toISOString();
  if (result.profile?.profile_id) {
    await db
      .prepare(
        `DELETE FROM payment_guard_evaluations
         WHERE profile_id = ? AND created_at < ?`,
      )
      .bind(result.profile.profile_id, retentionCutoff)
      .run();
  } else {
    await db
      .prepare(
        `DELETE FROM payment_guard_evaluations
         WHERE profile_id IS NULL AND session_id = ? AND created_at < ?`,
      )
      .bind(result.session_id, retentionCutoff)
      .run();
  }
  await db
    .prepare(
      `INSERT INTO payment_guard_evaluations
       (request_id, session_id, fingerprint, target_url, pay_to, amount_atomic,
        decision, risk_score, reasons_json, created_at, profile_id,
        reservation_status, expires_at, decision_token, approval_status,
        mandate_json, simulation_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      result.request_id,
      result.session_id,
      result.fingerprint,
      auditUrl.toString(),
      result.payment.pay_to,
      result.payment.amount_atomic ?? 0,
      result.decision,
      result.risk_score,
      JSON.stringify(result.reasons),
      result.evaluated_at,
      result.profile?.profile_id ?? null,
      result.decision === "ALLOW" ? "reserved" : "none",
      result.reservation?.expires_at ?? null,
      result.decision_token ?? null,
      result.decision === "REVIEW" && result.profile?.profile_id
        ? "pending"
        : "not_required",
      JSON.stringify(result.policy.mandate ?? null),
      JSON.stringify(result.evidence.transaction_simulation ?? null),
    )
    .run();
  const origin = new URL(result.payment.target_url).origin;
  const merchantKey = await sha256Hex(
    `${origin}|${result.payment.pay_to ?? ""}`,
  );
  await db
    .prepare(
      `INSERT INTO payment_guard_merchant_stats
       (merchant_key, origin, pay_to, evaluation_count, allow_count,
        review_count, block_count, last_amount_atomic, last_seen_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(merchant_key) DO UPDATE SET
         evaluation_count = evaluation_count + 1,
         allow_count = allow_count + excluded.allow_count,
         review_count = review_count + excluded.review_count,
         block_count = block_count + excluded.block_count,
         last_amount_atomic = excluded.last_amount_atomic,
         last_seen_at = excluded.last_seen_at,
         updated_at = excluded.updated_at`,
    )
    .bind(
      merchantKey,
      origin,
      result.payment.pay_to,
      result.decision === "ALLOW" ? 1 : 0,
      result.decision === "REVIEW" ? 1 : 0,
      result.decision === "BLOCK" ? 1 : 0,
      result.payment.amount_atomic ?? 0,
      result.evaluated_at,
      result.evaluated_at,
    )
    .run();
}

export async function paymentGuardEvaluate({
  targetUrl,
  sessionId,
  requestId,
  policy,
  to = null,
  data = null,
  value = "0",
  db = null,
  profile = null,
  signingSecret = null,
  toolId = null,
  purpose = null,
  fetchImpl = fetch,
}) {
  const endpoint = await x402EndpointPreflight(targetUrl, fetchImpl);
  const method =
    endpoint.x402.accepts.find(
      item =>
        item.network === BASE_MAINNET &&
        String(item.asset ?? "").toLowerCase() === USDC.toLowerCase(),
    ) ?? endpoint.x402.accepts[0] ?? null;
  const domainName = new URL(endpoint.url).hostname;
  const fingerprintSeed = await sha256Hex(
    JSON.stringify({
      target_url: endpoint.url,
      pay_to: method?.pay_to?.toLowerCase() ?? null,
      amount_atomic: method?.amount_atomic ?? null,
      to: to?.toLowerCase() ?? null,
      data: data?.toLowerCase() ?? null,
      value,
    }),
  );
  const history = await loadPaymentGuardHistory(
    db,
    sessionId,
    requestId,
    fingerprintSeed,
    profile?.profile_id ?? null,
    method?.pay_to?.toLowerCase() ?? null,
    new URL(endpoint.url).origin + new URL(endpoint.url).pathname,
  );
  if (history.existingRequest) {
    return {
      product: "agent-payment-guard",
      schema_version: "1.0",
      decision: history.existingRequest.decision,
      risk_score: Number(history.existingRequest.risk_score),
      request_id: requestId,
      session_id: sessionId,
      idempotent_replay: true,
      original_evaluated_at: history.existingRequest.created_at,
      reservation_status: history.existingRequest.reservation_status,
      expires_at: history.existingRequest.expires_at,
      tx_hash: history.existingRequest.tx_hash,
      decision_token: history.existingRequest.decision_token,
      reasons: JSON.parse(history.existingRequest.reasons_json),
    };
  }
  const [merchant, domain, intent, simulation] = await Promise.all([
    method?.pay_to && ADDRESS_PATTERN.test(method.pay_to)
      ? merchantTrust(method.pay_to, fetchImpl).catch(() => null)
      : Promise.resolve(null),
    domainTrustPreflight(domainName, fetchImpl).catch(() => null),
    to && data
      ? transactionIntent(to, data, value, fetchImpl).catch(() => null)
      : Promise.resolve(null),
    to && data
      ? simulateBaseTransaction(to, data, value, null, fetchImpl).catch(
          () => null,
        )
      : Promise.resolve(null),
  ]);
  const result = await buildPaymentGuardDecision({
    targetUrl,
    sessionId,
    requestId,
    endpoint,
    merchant,
    domain,
    intent,
    simulation,
    history: {
      ...history,
      duplicateFingerprint:
        history.duplicateFingerprint || Boolean(history.fingerprintSeed),
    },
    policy,
    profile,
    transactionExpected: Boolean(to && data),
    toolId,
    purpose,
  });
  result.fingerprint = fingerprintSeed;
  if (result.decision === "ALLOW") {
    const expiresAt = new Date(
      Date.now() + Number(policy.reservationTtlSeconds ?? 300) * 1000,
    ).toISOString();
    result.reservation = {
      status: "reserved",
      expires_at: expiresAt,
      commit_url: PAYMENT_GUARD_LIFECYCLE_PATH,
    };
    result.decision_token = await signPaymentGuardDecision(
      {
        request_id: result.request_id,
        session_id: result.session_id,
        profile_id: result.profile?.profile_id ?? null,
        policy_version: result.profile?.policy_version
          ? Number(result.profile.policy_version)
          : null,
        fingerprint: result.fingerprint,
        target_url: result.payment.target_url,
        pay_to: result.payment.pay_to,
        amount_atomic: result.payment.amount_atomic,
        issued_at: result.evaluated_at,
        expires_at: expiresAt,
      },
      signingSecret,
    );
  }
  await savePaymentGuardEvaluation(db, result);
  await enqueuePaymentGuardEvent(
    db,
    result.profile?.profile_id ?? null,
    `decision.${result.decision.toLowerCase()}`,
    {
      request_id: result.request_id,
      session_id: result.session_id,
      decision: result.decision,
      risk_score: result.risk_score,
      payment: result.payment,
      reasons: result.reasons,
    },
  );
  return result;
}

async function updatePaymentGuardReservation({
  db,
  action,
  decisionToken,
  txHash = null,
  signingSecret,
  fetchImpl = fetch,
}) {
  if (!db) throw new Error("payment_guard_database_unavailable");
  const token = await verifyPaymentGuardDecision(
    decisionToken,
    signingSecret,
  );
  const record = await db
    .prepare(
      `SELECT e.request_id, e.reservation_status, e.expires_at, e.tx_hash,
              e.profile_id, e.target_url, e.pay_to, e.amount_atomic,
              p.policy_version, p.active
       FROM payment_guard_evaluations e
       LEFT JOIN payment_guard_profiles p ON p.profile_id = e.profile_id
       WHERE e.request_id = ? LIMIT 1`,
    )
    .bind(token.request_id)
    .first();
  if (!record) throw new Error("reservation_not_found");
  if (
    record.profile_id &&
    (!Number(record.active) ||
      Number(record.policy_version) !== Number(token.policy_version))
  ) {
    throw new Error("reservation_policy_invalidated");
  }
  if (record.reservation_status === "committed") {
    return {
      request_id: token.request_id,
      status: "committed",
      tx_hash: record.tx_hash,
      idempotent: true,
    };
  }
  if (action === "release") {
    await db
      .prepare(
        `UPDATE payment_guard_evaluations
         SET reservation_status = 'released'
         WHERE request_id = ? AND reservation_status = 'reserved'`,
      )
      .bind(token.request_id)
      .run();
    await enqueuePaymentGuardEvent(
      db,
      record.profile_id,
      "reservation.released",
      { request_id: token.request_id },
    );
    return {
      request_id: token.request_id,
      status: "released",
      released_at: new Date().toISOString(),
    };
  }
  if (action !== "commit" || !TX_PATTERN.test(txHash ?? "")) {
    throw new Error("invalid_reservation_action");
  }
  const amountUsdc = formatUnits(BigInt(token.amount_atomic ?? 0), 6);
  const proof = await paymentProof(
    txHash,
    token.pay_to,
    amountUsdc,
    fetchImpl,
  );
  if (!proof.verified) throw new Error("payment_proof_not_verified");
  await db
    .prepare(
      `UPDATE payment_guard_evaluations
       SET reservation_status = 'committed', tx_hash = ?
       WHERE request_id = ? AND reservation_status = 'reserved'`,
    )
    .bind(txHash, token.request_id)
    .run();
  await enqueuePaymentGuardEvent(db, record.profile_id, "payment.committed", {
    request_id: token.request_id,
    tx_hash: txHash,
    amount_atomic: Number(record.amount_atomic ?? 0),
  });
  await db
    .prepare(
      `UPDATE payment_guard_merchant_stats
       SET committed_count = committed_count + 1,
           total_committed_atomic = total_committed_atomic + ?,
           updated_at = ?
       WHERE origin = ? AND pay_to = ?`,
    )
    .bind(
      Number(record.amount_atomic ?? 0),
      new Date().toISOString(),
      new URL(record.target_url).origin,
      record.pay_to,
    )
    .run();
  return {
    request_id: token.request_id,
    status: "committed",
    committed_at: new Date().toISOString(),
    tx_hash: txHash,
    payment_proof: proof,
  };
}

async function decidePaymentGuardApproval({
  db,
  profileId,
  ownerToken,
  requestId,
  action,
  note = null,
  signingSecret,
}) {
  const profile = await loadPaymentGuardProfile(
    db,
    profileId,
    ownerToken,
    "owner",
  );
  const record = await db
    .prepare(
      `SELECT request_id, session_id, fingerprint, target_url, pay_to,
              amount_atomic, approval_status, created_at
       FROM payment_guard_evaluations
       WHERE request_id = ? AND profile_id = ? LIMIT 1`,
    )
    .bind(requestId, profileId)
    .first();
  if (!record) throw new Error("approval_request_not_found");
  if (record.approval_status !== "pending") {
    return {
      request_id: requestId,
      approval_status: record.approval_status,
      idempotent: true,
    };
  }
  const now = new Date();
  if (action === "deny") {
    await db
      .prepare(
        `UPDATE payment_guard_evaluations
         SET approval_status = 'denied', denied_at = ?, approval_note = ?,
             decision = 'BLOCK', reservation_status = 'none'
         WHERE request_id = ? AND approval_status = 'pending'`,
      )
      .bind(now.toISOString(), String(note ?? "").slice(0, 500), requestId)
      .run();
    await enqueuePaymentGuardEvent(db, profileId, "approval.denied", {
      request_id: requestId,
      note: String(note ?? "").slice(0, 500),
    });
    return {
      request_id: requestId,
      approval_status: "denied",
      decision: "BLOCK",
      denied_at: now.toISOString(),
    };
  }
  if (action !== "approve") throw new Error("invalid_approval_action");
  const policy = profile.policy;
  const history = await loadPaymentGuardHistory(
    db,
    record.session_id,
    `approval-check:${requestId}`,
    `approval-check:${record.fingerprint}`,
    profileId,
    record.pay_to,
    record.target_url,
    now,
  );
  const amountAtomic = Number(record.amount_atomic ?? 0);
  if (
    amountAtomic > Number(policy.maxSingleAtomic) ||
    Number(history.sessionReservedAtomic) + amountAtomic >
      Number(policy.sessionBudgetAtomic) ||
    Number(history.dailyReservedAtomic) + amountAtomic >
      Number(policy.dailyBudgetAtomic)
  ) {
    throw new Error("approval_budget_exceeded");
  }
  const expiresAt = new Date(
    now.getTime() + Number(policy.reservationTtlSeconds ?? 300) * 1000,
  ).toISOString();
  const decisionToken = await signPaymentGuardDecision(
    {
      request_id: record.request_id,
      session_id: record.session_id,
      profile_id: profileId,
      policy_version: Number(profile.policy_version),
      fingerprint: record.fingerprint,
      target_url: record.target_url,
      pay_to: record.pay_to,
      amount_atomic: amountAtomic,
      issued_at: now.toISOString(),
      expires_at: expiresAt,
      human_approved: true,
    },
    signingSecret,
  );
  await db
    .prepare(
      `UPDATE payment_guard_evaluations
       SET approval_status = 'approved', approved_at = ?, approval_note = ?,
           decision = 'ALLOW', reservation_status = 'reserved',
           expires_at = ?, decision_token = ?
       WHERE request_id = ? AND approval_status = 'pending'`,
    )
    .bind(
      now.toISOString(),
      String(note ?? "").slice(0, 500),
      expiresAt,
      decisionToken,
      requestId,
    )
    .run();
  await enqueuePaymentGuardEvent(db, profileId, "approval.approved", {
    request_id: requestId,
    expires_at: expiresAt,
  });
  return {
    request_id: requestId,
    approval_status: "approved",
    decision: "ALLOW",
    approved_at: now.toISOString(),
    reservation: { status: "reserved", expires_at: expiresAt },
    decision_token: decisionToken,
  };
}

async function reportPaymentGuardDelivery({
  db,
  decisionToken,
  status,
  httpStatus = null,
  contentType = null,
  latencyMs = null,
  contentHash = null,
  signingSecret,
}) {
  if (!["success", "failure"].includes(status)) {
    throw new Error("invalid_delivery_status");
  }
  const token = await verifyPaymentGuardDecision(decisionToken, signingSecret, {
    allowExpired: true,
  });
  const record = await db
    .prepare(
      `SELECT request_id, target_url, pay_to, reservation_status,
              delivery_status
       FROM payment_guard_evaluations WHERE request_id = ? LIMIT 1`,
    )
    .bind(token.request_id)
    .first();
  if (!record) throw new Error("delivery_request_not_found");
  if (record.reservation_status !== "committed") {
    throw new Error("delivery_requires_committed_payment");
  }
  const normalizedHttpStatus =
    httpStatus === null ? null : Number(httpStatus);
  const normalizedLatency = latencyMs === null ? null : Number(latencyMs);
  if (
    (normalizedHttpStatus !== null &&
      (!Number.isInteger(normalizedHttpStatus) ||
        normalizedHttpStatus < 100 ||
        normalizedHttpStatus > 599)) ||
    (normalizedLatency !== null &&
      (!Number.isInteger(normalizedLatency) ||
        normalizedLatency < 0 ||
        normalizedLatency > 300_000)) ||
    (contentHash &&
      !/^[a-fA-F0-9]{64}$/.test(String(contentHash)))
  ) {
    throw new Error("invalid_delivery_evidence");
  }
  const deliveredAt = new Date().toISOString();
  await db
    .prepare(
      `UPDATE payment_guard_evaluations
       SET delivery_status = ?, delivery_http_status = ?,
           delivery_content_type = ?, delivery_latency_ms = ?,
           delivery_hash = ?, delivered_at = ?
       WHERE request_id = ?`,
    )
    .bind(
      status,
      normalizedHttpStatus,
      String(contentType ?? "").slice(0, 200) || null,
      normalizedLatency,
      contentHash ? String(contentHash).toLowerCase() : null,
      deliveredAt,
      token.request_id,
    )
    .run();
  const profileRecord = await db
    .prepare(
      `SELECT profile_id FROM payment_guard_evaluations
       WHERE request_id = ? LIMIT 1`,
    )
    .bind(token.request_id)
    .first();
  await enqueuePaymentGuardEvent(
    db,
    profileRecord?.profile_id ?? null,
    `delivery.${status}`,
    {
      request_id: token.request_id,
      status,
      http_status: normalizedHttpStatus,
      latency_ms: normalizedLatency,
    },
  );
  await db
    .prepare(
      `UPDATE payment_guard_merchant_stats
       SET delivery_success_count = delivery_success_count + ?,
           delivery_failure_count = delivery_failure_count + ?,
           updated_at = ?
       WHERE origin = ? AND pay_to = ?`,
    )
    .bind(
      status === "success" ? 1 : 0,
      status === "failure" ? 1 : 0,
      deliveredAt,
      new URL(record.target_url).origin,
      record.pay_to,
    )
    .run();
  return {
    request_id: token.request_id,
    delivery_status: status,
    delivered_at: deliveredAt,
    evidence: {
      attestation: "client_reported",
      http_status: normalizedHttpStatus,
      content_type: contentType ?? null,
      latency_ms: normalizedLatency,
      content_sha256: contentHash?.toLowerCase() ?? null,
    },
  };
}

async function paymentGuardStatus(db, profileId, ownerToken) {
  const profile = await loadPaymentGuardProfile(
    db,
    profileId,
    ownerToken,
    "owner",
  );
  const now = new Date().toISOString();
  const summary = await db
    .prepare(
      `SELECT
        COUNT(*) AS evaluation_count,
        COALESCE(SUM(CASE WHEN reservation_status = 'committed'
          THEN amount_atomic ELSE 0 END), 0) AS committed_atomic,
        COALESCE(SUM(CASE WHEN reservation_status = 'reserved' AND expires_at > ?
          THEN amount_atomic ELSE 0 END), 0) AS reserved_atomic,
        COALESCE(SUM(CASE WHEN decision = 'BLOCK' THEN 1 ELSE 0 END), 0) AS blocked_count
       FROM payment_guard_evaluations WHERE profile_id = ?`,
    )
    .bind(now, profileId)
    .first();
  const recent = await db
    .prepare(
      `SELECT request_id, session_id, target_url, pay_to, amount_atomic,
              decision, risk_score, reservation_status, expires_at, tx_hash,
              approval_status, approved_at, denied_at, delivery_status,
              delivery_http_status, delivery_latency_ms, delivered_at,
              created_at
       FROM payment_guard_evaluations
       WHERE profile_id = ? ORDER BY id DESC LIMIT 25`,
    )
    .bind(profileId)
    .all();
  const merchants = await db
    .prepare(
      `SELECT origin, pay_to, evaluation_count, allow_count, review_count,
              block_count, committed_count, delivery_success_count,
              delivery_failure_count, total_committed_atomic,
              last_amount_atomic, last_seen_at
       FROM payment_guard_merchant_stats
       WHERE pay_to IN (
         SELECT DISTINCT pay_to FROM payment_guard_evaluations
         WHERE profile_id = ? AND pay_to IS NOT NULL
       )
       ORDER BY last_seen_at DESC LIMIT 25`,
    )
    .bind(profileId)
    .all();
  return {
    profile: {
      profile_id: profile.profile_id,
      name: profile.name,
      policy_version: Number(profile.policy_version),
      policy: profile.policy,
    },
    summary: {
      evaluation_count: Number(summary?.evaluation_count ?? 0),
      blocked_count: Number(summary?.blocked_count ?? 0),
      reserved_usdc: formatUnits(
        BigInt(summary?.reserved_atomic ?? 0),
        6,
      ),
      committed_usdc: formatUnits(
        BigInt(summary?.committed_atomic ?? 0),
        6,
      ),
    },
    recent: (recent.results ?? []).map(item => ({
      ...item,
      amount_usdc: formatUnits(BigInt(item.amount_atomic ?? 0), 6),
    })),
    merchants: (merchants.results ?? []).map(item => ({
      ...item,
      total_committed_usdc: formatUnits(
        BigInt(item.total_committed_atomic ?? 0),
        6,
      ),
      last_amount_usdc: formatUnits(
        BigInt(item.last_amount_atomic ?? 0),
        6,
      ),
      delivery_success_rate:
        Number(item.delivery_success_count ?? 0) +
          Number(item.delivery_failure_count ?? 0) >
        0
          ? Number(item.delivery_success_count ?? 0) /
            (Number(item.delivery_success_count ?? 0) +
              Number(item.delivery_failure_count ?? 0))
          : null,
    })),
  };
}

function discovery(product) {
  if (product.id === "base-alpha-risk-context") {
    return declareDiscoveryExtension({
      method: "GET",
      input: product.input,
      inputSchema: product.inputSchema,
      output: {
        example: {
          product: "base-alpha-risk-context",
          network: BASE_MAINNET,
          detected_kind: "token",
          assessment: {
            risk_level: "low",
            risk_score: 12,
            alpha_score: 74,
            trade_bias: "watch",
            next_action: "Add to a short-lived watchlist and recheck before execution.",
            flags: [],
          },
          token: {
            symbol: "USDC",
            liquidity_usd: 1000000,
            volume_24h_usd: 250000,
          },
          machine_tags: ["kind:token", "risk:low", "bias:watch"],
        },
        schema: {
          properties: {
            product: { type: "string" },
            detected_kind: { type: "string", enum: ["wallet", "token"] },
            assessment: { type: "object" },
            token: { type: "object" },
            wallet: { type: "object" },
            machine_tags: { type: "array" },
          },
          required: ["product", "detected_kind", "assessment"],
        },
      },
    });
  }
  if (product.id === "agent-payment-guard") {
    return declareDiscoveryExtension({
      method: "GET",
      input: product.input,
      inputSchema: product.inputSchema,
      output: PAYMENT_GUARD_OUTPUT,
    });
  }
  if (product.id.startsWith("bcs-")) {
    return declareDiscoveryExtension({
      method: "GET",
      input: product.input,
      inputSchema: product.inputSchema,
      output: {
        example: {
          product: product.id,
          upstream_service: "blockchainsecurity-atlantis",
          upstream_headers: {
            request_id: "example-request-id",
            credit_cost: null,
            credit_remaining: null,
          },
          upstream_response: {
            data: {},
            meta: { request_id: "example-request-id" },
          },
        },
        schema: {
          properties: {
            product: { type: "string" },
            upstream_service: { type: "string" },
            request: { type: "object" },
            upstream_headers: { type: "object" },
            upstream_response: { type: "object" },
            provenance: { type: "object" },
          },
          required: ["product", "upstream_service", "upstream_response"],
        },
      },
    });
  }
  if (product.id.startsWith("public-wallet-risk-")) {
    return declareDiscoveryExtension({
      method: "GET",
      input: product.input,
      inputSchema: product.inputSchema,
      output: {
        example:
          product.id === "public-wallet-risk-lookup"
            ? {
                product: "public-wallet-risk-lookup",
                chain: "ETH",
                address: PAY_TO.toLowerCase(),
                hit: false,
                risk_score: 0,
                risk_level: "none",
                labels: [],
                provenance: {
                  source_count: 0,
                  source_keys: [],
                  manifest_sha256: "sha256:example",
                  batch_key: ADDRESS_RISK_DEFAULT_BATCH,
                },
              }
            : product.id === "public-wallet-risk-sample"
            ? {
                product: "public-wallet-risk-sample",
                sample_size: 2,
                records: [
                  {
                    chain: "ETH",
                    address: "0x0000000000000000000000000000000000000000",
                    risk_type: "sanction",
                    label: "example schema record",
                    confidence: "high",
                    source_key: "example-source",
                    evidence_url: "https://example.com/source",
                  },
                ],
                dataset: {
                  active_labels: 25357,
                  source_count: 28,
                  batch_key: ADDRESS_RISK_DEFAULT_BATCH,
                },
              }
            : {
                product: product.id,
                content_type: "application/x-ndjson",
                format: "jsonl",
                includes:
                  "chain, address, label, risk_type, confidence, source_key, evidence_url, batch metadata",
              },
        schema: {
          properties: {
            product: { type: "string" },
            chain: { type: "string" },
            address: { type: "string" },
            hit: { type: "boolean" },
            risk_score: { type: "number" },
            risk_level: { type: "string" },
            labels: { type: "array" },
            provenance: { type: "object" },
            dataset: { type: "object" },
          },
        },
      },
    });
  }
  return declareDiscoveryExtension({
    method: "GET",
    input: product.input,
    inputSchema: product.inputSchema,
    output: {
      example: {
        product: product.id,
        network: BASE_MAINNET,
        assessment: { risk_level: "low", risk_score: 0, flags: [] },
      },
      schema: {
        properties: {
          product: { type: "string" },
          network: { type: "string" },
          assessment: { type: "object" },
          identity: { type: "object" },
          activity: { type: "object" },
          provenance: { type: "object" },
        },
      },
    },
  });
}

function openApi(origin) {
  const document = {
    openapi: "3.1.0",
      info: {
        title: PUBLIC_LISTING_NAME,
        version: "2.0.0",
        description: PUBLIC_LISTING_DESCRIPTION,
        contact: { email: "hello@signgate.dev" },
        "x-guidance":
          "Use /v1/agentic-commerce/preflight for the unified decision contract. Treat x402, wallet-risk, RPC, chain-data, and buyer-identity endpoints as supported evidence providers and commerce surfaces, not as the whole SignGate product identity.",
    },
    servers: [{ url: origin }],
    paths: {},
  };
  for (const product of PRODUCTS) {
    document.paths[product.path] = {
      get: {
        operationId: `buy${product.id
          .split("-")
          .map(part => part[0].toUpperCase() + part.slice(1))
          .join("")}`,
        summary: product.description,
        parameters: Object.entries(product.inputSchema.properties).map(
          ([name, schema]) => ({
            name,
            in: "query",
            required: product.inputSchema.required?.includes(name) ?? false,
            schema,
          }),
        ),
        security: [],
        "x-payment-protocol": "x402",
        "x-pricing-version": PRICING_VERSION,
        "x-price-usdc": product.price,
        "x-payment-info": {
          pricing_version: PRICING_VERSION,
          price: {
            mode: "fixed",
            currency: "USD",
            amount: product.price.replace("$", ""),
          },
          protocols: [{ x402: {} }],
        },
        responses: {
          200: { description: "Paid safety intelligence response" },
          400: { description: "Invalid input" },
          402: { description: "x402 payment required" },
          502: { description: "Public-chain data provider unavailable" },
        },
      },
    };
  }
  document.paths[PRODUCTS[25].path].post = {
    operationId: "evaluateAgentPaymentGuardJson",
    summary:
      "Evaluate a payment using a JSON body and an optional owner-controlled policy profile.",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: PAYMENT_GUARD_EVALUATE_BODY_SCHEMA,
        },
      },
    },
    "x-payment-protocol": "x402",
    "x-pricing-version": PRICING_VERSION,
    "x-price-usdc": PRODUCTS[25].price,
    "x-payment-info": {
      pricing_version: PRICING_VERSION,
      price: {
        mode: "fixed",
        currency: "USD",
        amount: PRODUCTS[25].price.replace("$", ""),
      },
      protocols: [{ x402: {} }],
    },
    security: [],
    responses: {
      200: { description: "Signed Payment Guard decision" },
      400: { description: "Invalid request" },
      402: { description: "x402 payment required" },
      403: { description: "Policy authentication failed" },
    },
  };
  const intentProperties = {
    request_id: { type: "string" },
    session_id: { type: "string" },
    agent_id: { type: "string" },
    user_id: { type: "string" },
    purpose: { type: "string" },
    pay_to: { type: "string" },
    chain: { type: "string", default: BASE_MAINNET },
    token: { type: "string", default: USDC },
    amount_usdc: { type: "string" },
    amount_atomic: { type: "integer" },
    invoice_id: { type: "string" },
    invoice_hash: { type: "string" },
    merchant_id: { type: "string" },
    nonce: { type: "string" },
    expires_at: { type: "string", format: "date-time" },
    policy: { type: "object" },
    risk: { type: "object" },
  };
  document.paths[INTENT_VERIFY_PATH] = {
    post: {
      operationId: "verifyAgentPaymentIntent",
      summary:
        "Normalize and validate a verifiable stablecoin payment intent before any signer sees it.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: intentProperties,
              required: [
                "request_id",
                "agent_id",
                "purpose",
                "pay_to",
                "amount_usdc",
                "nonce",
              ],
            },
          },
        },
      },
      responses: {
        200: { description: "Normalized intent and validation reasons" },
        400: { description: "Invalid JSON body" },
      },
    },
  };
  document.paths[PAYMENT_PREFLIGHT_PATH] = {
    post: {
      operationId: "preflightAgentStablecoinPayment",
      summary:
        "Run verifiable intent, dynamic limit, and caller-supplied risk checks without producing a signer authorization.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: intentProperties },
          },
        },
      },
      responses: {
        200: { description: "Allow, review, or deny preflight decision" },
        400: { description: "Invalid JSON body" },
      },
    },
  };
  document.paths[PAYMENT_AUTHORIZE_PATH] = {
    post: {
      operationId: "authorizeAgentStablecoinPayment",
      summary:
        "Return a signing directive for a policy-controlled signer; never exposes private keys to the AI agent.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: intentProperties },
          },
        },
      },
      responses: {
        200: { description: "Signing directive and optional authorization token" },
        400: { description: "Invalid JSON body" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_POLICY_PATH] = {
    post: {
      operationId: "createPaymentGuardPolicy",
      summary:
        "Create an owner-controlled policy profile and one-time owner and agent tokens.",
      requestBody: {
        required: true,
        content: {
        "application/json": {
            schema: PAYMENT_GUARD_POLICY_BODY_SCHEMA,
          },
        },
      },
      "x-payment-protocol": "x402",
      "x-pricing-version": PRICING_VERSION,
      "x-price-usdc": PRODUCTS[25].price,
      "x-payment-info": {
        pricing_version: PRICING_VERSION,
        price: {
          mode: "fixed",
          currency: "USD",
          amount: PRODUCTS[25].price.replace("$", ""),
        },
        protocols: [{ x402: {} }],
      },
      security: [],
      responses: {
        200: { description: "Policy profile and one-time tokens" },
        402: { description: "x402 payment required" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_LIFECYCLE_PATH] = {
    post: {
      operationId: "updatePaymentGuardReservation",
      summary:
        "Commit a reservation with a verified Base USDC transaction or release it.",
      responses: {
        200: { description: "Updated reservation state" },
        400: { description: "Invalid or expired decision token" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_POLICY_MANAGE_PATH] = {
    post: {
      operationId: "managePaymentGuardPolicy",
      summary:
        "Update or revoke a policy profile and rotate owner or agent credentials.",
      responses: {
        200: { description: "Updated policy or credentials" },
        403: { description: "Owner authentication failed" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_STATUS_PATH] = {
    post: {
      operationId: "getPaymentGuardStatus",
      summary:
        "Read authenticated policy budget, reservation, and recent audit status.",
      responses: {
        200: { description: "Authenticated policy status" },
        403: { description: "Owner authentication failed" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_APPROVAL_PATH] = {
    post: {
      operationId: "decidePaymentGuardApproval",
      summary: "Approve or deny a REVIEW decision using the policy owner token.",
      responses: {
        200: { description: "Approval decision and optional signed reservation" },
        400: { description: "Approval failed" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_DELIVERY_PATH] = {
    post: {
      operationId: "reportPaymentGuardDelivery",
      summary:
        "Attach client-reported post-payment delivery evidence to a committed payment.",
      responses: {
        200: { description: "Delivery evidence recorded" },
        400: { description: "Invalid delivery evidence" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_WEBHOOK_PATH] = {
    post: {
      operationId: "managePaymentGuardWebhook",
      summary: "Create or disable a signed policy webhook.",
      responses: {
        200: { description: "Webhook configuration" },
        400: { description: "Webhook configuration failed" },
      },
    },
  };
  document.paths[PAYMENT_GUARD_MCP_PATH] = {
    post: {
      operationId: "signGateMcp",
      summary: "MCP JSON-RPC endpoint exposing the real SignGate evaluate_payment decision tool.",
      responses: {
        200: { description: "MCP JSON-RPC response" },
      },
    },
  };
  const agenticCommercePreflightSchema = {
    type: "object",
    properties: {
      buyer_id: { type: "string" },
      agent_id: { type: "string" },
      agent_role: { type: "string" },
      action: { type: "string", default: "payment_execution" },
      product_category: { type: "string", default: "payment_execution" },
      amount_usdc: { type: "string" },
      asset: { type: "string", default: "USDC" },
      chain: { type: "string", default: "base" },
      merchant_domain: { type: "string" },
      merchant_wallet: { type: "string" },
      mandate: { type: "object" },
      merchant: { type: "object" },
    },
    required: ["agent_role", "product_category", "amount_usdc"],
  };
  document.paths["/v1/agentic-commerce/preflight/sample"] = {
    get: {
      operationId: "getAgenticCommercePreflightSample",
      summary:
        "Return a sample request and deterministic response for Agentic Commerce Preflight.",
      security: [],
      responses: {
        200: {
          description:
            "Sample request and response for mandate, merchant, and signer-directive evaluation.",
        },
      },
    },
  };
  document.paths["/v1/agentic-commerce/preflight"] = {
    post: {
      operationId: "evaluateAgenticCommercePreflight",
      summary:
        "Evaluate whether an autonomous agent action is authorized before payment or signer execution.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: agenticCommercePreflightSchema,
            example: sampleAgenticCommercePreflightInput(),
          },
        },
      },
      security: [],
      responses: {
        200: {
          description:
            "ALLOW, REQUIRE_APPROVAL, or DENY decision with reason codes, evidence, and signer directive.",
        },
        400: { description: "Invalid JSON body" },
      },
    },
  };
  for (const path of MARKETPLACE_HIDDEN_OPENAPI_PATHS) {
    delete document.paths[path];
  }
  return document;
}

function agentCard(origin) {
  const orderedProducts = [
    PRODUCTS[26],
    PRODUCTS[27],
    PRODUCTS[28],
    PRODUCTS[29],
    PRODUCTS[25],
    ...PRODUCTS.filter(
      product =>
        product !== PRODUCTS[25] &&
        product !== PRODUCTS[26] &&
        product !== PRODUCTS[27] &&
        product !== PRODUCTS[28] &&
        product !== PRODUCTS[29],
    ),
  ];
  return {
    name: PUBLIC_LISTING_NAME,
    description: PUBLIC_LISTING_DESCRIPTION,
    url: origin,
    version: "2.0.0",
    documentationUrl: `${origin}/openapi.json`,
    defaultInputModes: ["application/json", "text/plain"],
    defaultOutputModes: ["application/json"],
    skills: orderedProducts.map(product => ({
      id: product.id,
      name: product.id
        .split("-")
        .map(part => part[0].toUpperCase() + part.slice(1))
        .join(" "),
      description: product.description,
      tags:
        [
          "base-alpha-risk-context",
          "base-token-alpha-snapshot",
          "base-wallet-copytrade-risk",
          "base-new-pool-risk",
        ].includes(product.id)
          ? ["x402", "Base", "trading bot", "wallet risk", "token alpha"]
          : product.id === "agent-payment-guard"
          ? ["x402", "AI agent", "payment firewall", "risk", "budget"]
          : product.id === "agent-buyer-identity-preflight"
          ? ["x402", "agent identity", "purchase governance", "Agent IAM", "approval"]
          : product.id === "agent-payment-risk-gateway"
          ? ["SignGate", "AI agent", "pre-signing", "stablecoin", "risk"]
          : product.id.startsWith("public-wallet-risk-")
          ? ["x402", "wallet risk", "KYT", "sanctions", "dataset"]
          : product.id.startsWith("bcs-")
          ? ["x402", "BlockchainSecurity", "KYT", "wallet intelligence"]
          : ["Base", "x402", "agent-commerce", "payment-safety"],
      examples: [product.description],
    })),
    provider: {
      organization: "Bytoken Labs",
      url: origin,
    },
  };
}

function serviceManifest(origin) {
  const orderedProducts = [
    PRODUCTS[26],
    PRODUCTS[27],
    PRODUCTS[28],
    PRODUCTS[29],
    PRODUCTS[25],
    ...PRODUCTS.filter(
      product =>
        product !== PRODUCTS[25] &&
        product !== PRODUCTS[26] &&
        product !== PRODUCTS[27] &&
        product !== PRODUCTS[28] &&
        product !== PRODUCTS[29],
    ),
  ];
  return {
    schema_version: "1.0",
    name: PUBLIC_LISTING_NAME,
    description: PUBLIC_LISTING_DESCRIPTION,
    base_url: origin,
    openapi_url: `${origin}/openapi.json`,
    agentic_commerce_preflight_url: `${origin}/agentic-commerce-preflight`,
    agentic_commerce_preflight_sample_url: `${origin}/v1/agentic-commerce/preflight/sample`,
    wallet_risk_url: `${origin}/wallet-risk`,
    agent_card_url: `${origin}/.well-known/agent-card.json`,
    mcp_url: `${origin}${PAYMENT_GUARD_MCP_PATH}`,
    ai_buyer_catalog_url: `${origin}/catalog.json`,
    authentication: { type: "x402", network: BASE_MAINNET },
    facilitator: FACILITATOR,
    payment_recipient: PAY_TO,
    pricing_version: PRICING_VERSION,
    main_product: {
      id: PRODUCTS_BY_ID["agent-payment-risk-gateway"].id,
      path: PRODUCTS_BY_ID["agent-payment-risk-gateway"].path,
      price_usdc: PRODUCTS_BY_ID["agent-payment-risk-gateway"].price,
      capabilities: [
        "verifiable payment intent",
        "dynamic amount limits",
        "recipient allowlist and blocklist",
        "recipient risk screening",
        "allow/review/deny decision",
        "policy-controlled signer directive",
        "agent never receives private keys",
      ],
    },
    agent_buyer_identity_product: {
      id: PRODUCTS_BY_ID["agent-buyer-identity-preflight"].id,
      path: PRODUCTS_BY_ID["agent-buyer-identity-preflight"].path,
      price_usdc: PRODUCTS_BY_ID["agent-buyer-identity-preflight"].price,
      positioning:
        "Use before an AI agent buys any x402 API, dataset, or tool to verify role, purpose, product category, price, and approval fit.",
      starter_roles: [
        "research_agent",
        "writer_agent",
        "accounting_agent",
        "finance_agent",
        "operator_agent",
      ],
    },
    agentic_commerce_decision_layer: {
      page: `${origin}/agentic-commerce-preflight`,
      sample: `${origin}/v1/agentic-commerce/preflight/sample`,
      post: `${origin}/v1/agentic-commerce/preflight`,
      positioning:
        "Hosted API = try it; Policy Kit = embed it; Signer Adapter = enforce it; Audit Pack = prove it.",
      decisions: ["ALLOW", "REQUIRE_APPROVAL", "DENY"],
      signer_directive:
        "Payment execution requires an isolated out-of-agent signer. Agents may initiate execution, but may not directly hold or use unrestricted signing authority.",
    },
    payment_guard_capabilities: {
      id: PRODUCTS[25].id,
      path: PRODUCTS[25].path,
      price_usdc: PRODUCTS[25].price,
      capabilities: [
        "owner-controlled policy profiles",
        "POST JSON evaluation",
        "signed decision tokens",
        "reservation commit and release",
        "TTL and replay protection",
        "authenticated audit status",
        "fail-closed evidence policy",
        "profile-wide daily budgets",
        "velocity and price-spike detection",
        "policy update, credential rotation, and revocation",
        "query-redacted audit storage and retention controls",
        "human approval queue",
        "post-payment delivery evidence",
        "merchant delivery and payment history",
        "Base transaction simulation",
        "signed webhook outbox with retries",
        "tool, purpose, domain, and time-window mandates",
        "JavaScript and Python SDKs",
        "MCP discovery and status tools",
      ],
    },
    promoted_product: {
      id: PRODUCTS[26].id,
      path: PRODUCTS[26].path,
      price_usdc: PRODUCTS[26].price,
      positioning:
        "High-frequency paid signal for bots that need wallet or token risk, liquidity, activity, and a machine-readable trade bias in one call.",
    },
    wallet_risk_product: {
      id: PRODUCTS_BY_ID["public-wallet-risk-lookup"].id,
      path: PRODUCTS_BY_ID["public-wallet-risk-lookup"].path,
      price_usdc: PRODUCTS_BY_ID["public-wallet-risk-lookup"].price,
      page_url: `${origin}/wallet-risk`,
      capabilities: [
        "single wallet lookup",
        "low-cost paid dataset sample",
        "full source-attributed JSONL snapshot",
        "batch delta JSONL",
        "sanctions, scam, ransomware, malicious contract, and stablecoin blacklist labels",
        "confidence, provenance, evidence URL, and manifest hash fields",
      ],
    },
    products: orderedProducts.map(product => ({
        id: product.id,
        method: "GET",
        path: product.path,
        price_usdc: product.price,
        pricing_version: PRICING_VERSION,
        description: product.description,
      })),
  };
}

function productExampleUrl(origin, product) {
  const query = new URLSearchParams(product.input);
  return `${origin}${product.path}?${query.toString()}`;
}

function productTitle(product) {
  return product.id
    .split("-")
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function buyerCatalogProduct(origin, product) {
  const metadata = CATALOG_METADATA[product.id] ?? {
    group: "agent-api-supply-chain",
    when_to_buy: product.description,
    returns: "Machine-readable JSON response with public evidence and limitations.",
    price_reason: "Priced for repeat autonomous-agent preflight checks.",
  };
  const required = product.inputSchema.required ?? [];
  return {
    id: product.id,
    title: productTitle(product),
    group: metadata.group,
    method: "GET",
    path: product.path,
    price_usdc: product.price,
    pricing_version: PRICING_VERSION,
    ai_should_buy_when: metadata.when_to_buy,
    returns: metadata.returns,
    price_reason: metadata.price_reason,
    description: product.description,
    required_inputs: required,
    optional_inputs: Object.keys(product.inputSchema.properties).filter(
      name => !required.includes(name),
    ),
    example_url: productExampleUrl(origin, product),
    payment: {
      protocol: "x402",
      network: BASE_MAINNET,
      pay_to: PAY_TO,
    },
    limitations:
      product.id.startsWith("bcs-")
        ? [
            "Upstream BlockchainSecurity availability and license terms still apply.",
            "The hosted Worker keeps the upstream API key server-side; agents receive only the paid response.",
          ]
        : [
            "Uses public data and deterministic heuristics; it is not a guarantee of safety.",
            "High-risk or high-value actions should still use human review or a stricter policy.",
          ],
  };
}

function buyerCatalog(origin) {
  const products = PRODUCTS.map(product => buyerCatalogProduct(origin, product));
  const workflows = recommendedWorkflows();
  return {
    schema_version: "1.0",
    name: "SignGate Agent Policy & Execution Control Catalog",
    description:
      "Machine-readable guide for SignGate economic policy decisions and the x402 evidence providers that support them. Paid endpoints are application-specific signals; the core abstraction is ALLOW, REQUIRE_APPROVAL, or DENY before an agent spends or triggers a signer.",
    origin,
    x402scan_server:
      "https://www.x402scan.com/server/b0ce6f4e-73e9-431d-b23c-814ac89cc77b",
    openapi_url: `${origin}/openapi.json`,
    agent_card_url: `${origin}/.well-known/agent-card.json`,
    service_manifest_url: `${origin}/.well-known/service.json`,
    product_families: PRODUCTS.length,
    paid_operations_observed_on_x402scan: PRODUCTS.length + 2,
    pricing_version: PRICING_VERSION,
    paid_operations_note:
      "x402scan counts paid OpenAPI operations. Product families count GET products; the extra paid operations are Payment Guard JSON evaluation and policy creation.",
    groups: CATALOG_GROUPS.map(group => ({
      ...group,
      products: products
        .filter(product => product.group === group.id)
        .map(product => product.id),
    })),
    recommended_workflows: workflows,
    products,
  };
}

function recommendedWorkflows() {
  return [
      {
        id: "agent-buyer-identity-before-x402-purchase",
        goal: "Verify that the buyer agent role fits the x402 API, dataset, or tool before payment.",
        sequence: [
          "agent-buyer-identity-preflight",
          "x402-endpoint-preflight",
          "agent-payment-guard",
        ],
        escalation:
          "Require approval when the agent role and product category do not clearly match, data sensitivity is high, payment execution is involved, or price exceeds the role limit.",
      },
      {
        id: "ai-buyer-before-paying-x402-api",
        goal: "Let an autonomous agent decide whether to pay an unknown x402 API.",
        sequence: [
          "x402-origin-due-diligence",
          "x402-resource-compare",
          "x402-endpoint-preflight",
          "x402-server-trust",
          "agent-payment-guard",
        ],
        escalation:
          "Use human review when endpoint metadata is malformed, seller activity is concentrated, or Payment Guard returns REVIEW/BLOCK.",
      },
      {
        id: "wallet-or-token-kyt-preflight",
        goal: "Screen an address or token before payment, onboarding, copytrading, or contract interaction.",
        sequence: [
          "public-wallet-risk-lookup",
          "base-address-preflight",
          "bcs-address-labels",
          "base-wallet-counterparty",
          "evm-transaction-intent",
        ],
        escalation:
          "Buy the label/counterparty steps only when the first preflight returns medium/high risk or the value at risk is material.",
      },
      {
        id: "x402-transaction-preflight-before-agent-pay",
        goal: "Buy one explainable transaction preflight before an agent pays an x402 merchant or signs a Base transfer.",
        sequence: [
          "x402-transaction-preflight",
          "agent-payment-guard",
        ],
        escalation:
          "Use separate component checks only when the transaction preflight returns REQUIRE_REVIEW or DENY and the agent needs deeper evidence.",
      },
      {
        id: "kyt-or-aml-local-dataset-import",
        goal: "Import source-attributed wallet risk intelligence into a KYT, AML, VASP, wallet-security, or payment-risk system.",
        sequence: [
          "public-wallet-risk-sample",
          "public-wallet-risk-snapshot",
          "public-wallet-risk-delta",
          "public-wallet-risk-lookup",
          "bcs-address-risk-score",
          "bcs-fund-trace",
        ],
        escalation:
          "Use BCS risk score or fund trace only for addresses that hit the public feed, handle high-value flows, or require investigation evidence.",
      },
      {
        id: "stablecoin-payout-screening",
        goal: "Check whether a payout or recipient wallet appears in sanctions, scam, ransomware, or stablecoin issuer blacklist intelligence.",
        sequence: [
          "public-wallet-risk-sample",
          "public-wallet-risk-lookup",
          "bcs-wallet-overview",
          "bcs-address-classify",
          "bcs-address-risk-score",
        ],
        escalation:
          "Block or require manual review when sanctions, stablecoin blacklist, ransomware, or high-confidence scam evidence is present.",
      },
      {
        id: "trading-bot-fast-filter",
        goal: "Keep bot checks cheap while preserving a path to deeper review.",
        sequence: [
          "base-alpha-risk-context",
          "base-token-exit-risk",
          "base-token-alpha-snapshot",
          "base-new-pool-risk",
          "base-dex-market-monitor",
        ],
        escalation:
          "Stop at the 0.003 USDC filter for low-value candidates; continue only for high-alpha or suspicious tokens.",
      },
      {
        id: "agent-tool-supply-chain",
        goal: "Preflight a tool, API, dependency, or agent before an AI runtime imports or delegates to it.",
        sequence: [
          "domain-trust-preflight",
          "openapi-spec-preflight",
          "a2a-agent-card-preflight",
          "npm-package-preflight",
          "pypi-package-preflight",
          "github-repository-health",
        ],
        escalation:
          "Block or require review when package vulnerabilities, stale repos, unsafe domains, or mismatched agent endpoints appear.",
      },
    ];
}

function paidDiscoveryOperations(origin) {
  const productOperations = PRODUCTS.map(product => {
    const metadata = CATALOG_METADATA[product.id] ?? {
      group: "agent-api-supply-chain",
    };
    return {
      id: product.id,
      method: "GET",
      path: product.path,
      url: `${origin}${product.path}`,
      price_usdc: product.price,
      pricing_version: PRICING_VERSION,
      group: metadata.group,
      description: product.description,
      required_inputs: product.inputSchema.required ?? [],
      example_url: productExampleUrl(origin, product),
      input_schema: product.inputSchema,
    };
  });
  const guardProduct = PRODUCTS_BY_ID["agent-payment-guard"];
  return [
    ...productOperations,
    {
      id: "agent-payment-guard-json-evaluate",
      method: "POST",
      path: guardProduct.path,
      url: `${origin}${guardProduct.path}`,
      price_usdc: guardProduct.price,
      pricing_version: PRICING_VERSION,
      group: "x402-payment-safety",
      description:
        "Evaluate an agent payment with a JSON request body and return an auditable ALLOW/REVIEW/BLOCK decision.",
      required_inputs: PAYMENT_GUARD_EVALUATE_BODY_SCHEMA.required ?? [],
      input_schema: PAYMENT_GUARD_EVALUATE_BODY_SCHEMA,
    },
    {
      id: "agent-payment-guard-policy-create",
      method: "POST",
      path: PAYMENT_GUARD_POLICY_PATH,
      url: `${origin}${PAYMENT_GUARD_POLICY_PATH}`,
      price_usdc: guardProduct.price,
      pricing_version: PRICING_VERSION,
      group: "x402-payment-safety",
      description:
        "Create an owner-controlled Payment Guard policy profile for budget, approval, and signer controls.",
      required_inputs: PAYMENT_GUARD_POLICY_BODY_SCHEMA.required ?? [],
      input_schema: PAYMENT_GUARD_POLICY_BODY_SCHEMA,
    },
  ];
}

function workflowCatalog(origin) {
  const catalog = buyerCatalog(origin);
  const productsById = Object.fromEntries(
    catalog.products.map(product => [product.id, product]),
  );
  return {
    schema_version: "1.0",
    name: "SignGate Agent Policy & Execution Control Workflows",
    description:
      "Workflow-first bundles that tell AI agents which x402 risk utilities to buy before payment, signing, routing, or chain-data access.",
    origin,
    openapi_url: `${origin}/openapi.json`,
    registry_url: `${origin}/registry.json`,
    endpoints_txt_url: `${origin}/endpoints.txt`,
    workflows: catalog.recommended_workflows.map(workflow => ({
      ...workflow,
      estimated_max_price_usdc: workflow.sequence
        .map(id => productsById[id]?.price_usdc ?? "$0")
        .map(price => Number(String(price).replace("$", "")) || 0)
        .reduce((sum, price) => sum + price, 0)
        .toFixed(3),
      operations: workflow.sequence
        .map(id => productsById[id])
        .filter(Boolean)
        .map(product => ({
          id: product.id,
          method: product.method,
          path: product.path,
          price_usdc: product.price_usdc,
          buy_when: product.ai_should_buy_when,
          returns: product.returns,
          example_url: product.example_url,
        })),
    })),
  };
}

function registry(origin) {
  const operations = paidDiscoveryOperations(origin);
  return {
    schema_version: "1.0",
    name: PUBLIC_LISTING_NAME,
    description: PUBLIC_LISTING_DESCRIPTION,
    positioning:
      "Use SignGate to decide whether an autonomous agent is authorized to buy, pay, call infrastructure, or trigger a signer; use individual x402 endpoints as evidence signals.",
    origin,
    x402_network: BASE_MAINNET,
    facilitator: FACILITATOR,
    payment_recipient: PAY_TO,
    pricing_version: PRICING_VERSION,
    counts: {
      product_families: PRODUCTS.length,
      paid_operations: operations.length,
      workflow_bundles: recommendedWorkflows().length,
    },
    discovery: {
      openapi: `${origin}/openapi.json`,
      x402: `${origin}/.well-known/x402`,
      agent_card: `${origin}/.well-known/agent-card.json`,
      service_manifest: `${origin}/.well-known/service.json`,
      ai_buyer_catalog: `${origin}/catalog.json`,
      workflows: `${origin}/workflows.json`,
      endpoints_txt: `${origin}/endpoints.txt`,
      llms_txt: `${origin}/llms.txt`,
      mcp: `${origin}/.well-known/mcp.json`,
    },
    clusters: CATALOG_GROUPS.map(group => ({
      ...group,
      operations: operations
        .filter(operation => operation.group === group.id)
        .map(operation => operation.id),
    })),
    operations,
  };
}

function endpointsTxt(origin) {
  const lines = [
    `# ${PUBLIC_LISTING_NAME}`,
    `origin: ${origin}`,
    `openapi: ${origin}/openapi.json`,
    `x402: ${origin}/.well-known/x402`,
    `registry: ${origin}/registry.json`,
    `workflows: ${origin}/workflows.json`,
    "",
    "# paid evidence operations",
  ];
  for (const operation of paidDiscoveryOperations(origin)) {
    lines.push(
      `${operation.method} ${operation.url} | ${operation.price_usdc} USDC | ${operation.group} | ${operation.description}`,
    );
  }
  lines.push("", "# recommended workflows");
  for (const workflow of recommendedWorkflows()) {
    lines.push(`${workflow.id}: ${workflow.sequence.join(" -> ")}`);
  }
  return `${lines.join("\n")}\n`;
}

function x402WellKnown(origin) {
  const operations = paidDiscoveryOperations(origin);
  return {
    version: 1,
    name: PUBLIC_LISTING_NAME,
    description: PUBLIC_LISTING_DESCRIPTION,
    brand: {
      organization: "Nomos Labs",
      product: PUBLIC_BRAND_NAME,
      product_position: PUBLIC_PRODUCT_POSITION,
    },
    supported_protocols: ["x402"],
    operation_count: operations.length,
    resources: PRODUCTS.map(product => `${origin}${product.path}`),
    paid_operations: operations.map(operation => ({
      id: operation.id,
      method: operation.method,
      resource: operation.url,
      price_usdc: operation.price_usdc,
      pricing_version: operation.pricing_version,
      group: operation.group,
    })),
    openapi: `${origin}/openapi.json`,
    catalog: `${origin}/catalog.json`,
    agent_card: `${origin}/.well-known/agent-card.json`,
    registry: `${origin}/registry.json`,
    endpoints_txt: `${origin}/endpoints.txt`,
    workflows: `${origin}/workflows.json`,
  };
}

async function verificationData(origin) {
  let bazaarMatches = [];
  let bazaarError = null;
  try {
    const responses = await Promise.all(
      [0, 100, 200].map(offset =>
        fetch(
          `${FACILITATOR}/discovery/resources?type=http&limit=100&offset=${offset}`,
          { headers: { accept: "application/json" } },
        ),
      ),
    );
    const failed = responses.find(response => !response.ok);
    if (failed) throw new Error(`PayAI returned HTTP ${failed.status}`);
    const payloads = await Promise.all(responses.map(response => response.json()));
    bazaarMatches = payloads
      .flatMap(payload => payload.items ?? [])
      .filter(item => item.resource?.startsWith(origin))
      .map(item => ({
        resource: item.resource,
        method: item.method,
        amount_atomic: item.accepts?.[0]?.amount ?? null,
        network: item.accepts?.[0]?.network ?? null,
        pay_to: item.accepts?.[0]?.payTo ?? null,
        last_updated: item.lastUpdated ?? null,
      }));
  } catch (error) {
    bazaarError = error instanceof Error ? error.message : String(error);
  }

  return {
    service: PUBLIC_LISTING_NAME,
    listing_name: PUBLIC_LISTING_NAME,
    deployment_url: origin,
    checked_at: new Date().toISOString(),
    openapi_url: `${origin}/openapi.json`,
    ai_buyer_catalog_url: `${origin}/catalog.json`,
    agent_card_url: `${origin}/.well-known/agent-card.json`,
    service_manifest_url: `${origin}/.well-known/service.json`,
    expected_product_count: PRODUCTS.length,
    bazaar_indexed_count: bazaarMatches.length,
    all_products_indexed: bazaarMatches.length === PRODUCTS.length,
    products: PRODUCTS.map(product => {
      const indexed = bazaarMatches.find(
        item => item.resource === `${origin}${product.path}`,
      );
      return {
        id: product.id,
        path: product.path,
        price_usdc: product.price,
        example_url: productExampleUrl(origin, product),
        bazaar_indexed: Boolean(indexed),
        bazaar_record: indexed ?? null,
      };
    }),
    payai_discovery_url: `${FACILITATOR}/discovery/resources?type=http&limit=100&offset=0`,
    bazaar_error: bazaarError,
  };
}

function verificationHtml(origin) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${PUBLIC_LISTING_NAME} — Deployment Verification</title>
  <style>
    body{font:16px/1.5 system-ui,sans-serif;max-width:920px;margin:40px auto;padding:0 18px;background:#0b1020;color:#edf2ff}
    h1{font-size:28px}.ok{color:#62e6a7}.bad{color:#ff8b8b}
    .card{background:#151d33;border:1px solid #2a3658;border-radius:12px;padding:16px;margin:12px 0}
    a{color:#8fc7ff;overflow-wrap:anywhere}code{color:#ffd580}small{color:#aeb9d5}
  </style>
</head>
<body>
  <h1>${PUBLIC_LISTING_NAME}</h1>
  <p id="summary">Checking deployment and PayAI Bazaar…</p>
  <div id="products"></div>
  <p><a href="/openapi.json">OpenAPI</a> · <a href="/catalog.json">AI Buyer Catalog</a> · <a href="/.well-known/agent-card.json">Agent Card</a> · <a href="/.well-known/service.json">Service Manifest</a> · <a href="/verification.json">Raw verification JSON</a></p>
  <script>
    fetch('/verification.json').then(r=>r.json()).then(data=>{
      const good=data.all_products_indexed;
      document.getElementById('summary').innerHTML =
        '<strong class="'+(good?'ok':'bad')+'">'+data.bazaar_indexed_count+'/'+data.expected_product_count+
        ' products indexed in PayAI Bazaar</strong><br><small>Checked '+data.checked_at+'</small>';
      document.getElementById('products').innerHTML=data.products.map(p =>
        '<div class="card"><strong>'+p.id+'</strong> — <code>'+p.price_usdc+' USDC</code><br>'+
        '<span class="'+(p.bazaar_indexed?'ok':'bad')+'">Bazaar: '+(p.bazaar_indexed?'indexed':'not indexed')+'</span><br>'+
        '<a href="'+p.example_url+'">'+p.example_url+'</a></div>'
      ).join('');
    }).catch(error=>{
      document.getElementById('summary').textContent='Verification failed: '+error;
    });
  </script>
</body>
</html>`;
}

function landingHtml(origin, locale = "en", formspreeEndpoint = "") {
  const signGateProduct = PRODUCTS_BY_ID["agent-payment-risk-gateway"];
  const signGateExample = productExampleUrl(origin, signGateProduct);
  const zh = locale === "zh";
  const contactEndpoint = String(formspreeEndpoint || "").trim();
  const contactAction = contactEndpoint || "#contact";
  const contactEnabled = Boolean(contactEndpoint);
  const copy = {
    zh: {
      lang: "zh-Hant",
      title: "SignGate - AI Agent Payment 風控基礎設施",
      meta:
        "SignGate 是 AI Agent 動用穩定幣之前的 Policy、風險與 Signer 控制層，在任何私鑰簽署發生之前回傳可執行的 allow、review 或 deny 決策。",
      product: "產品",
      apiDocs: "API 文件",
      useCases: "Use Cases",
      security: "安全與合規",
      docsCta: "查看 API 文件",
      paymentCta: "測試 Payment Preflight",
      previewNote:
        "Developer Preview：以 x402 付費試打放在頁面後段，避免首屏看起來像低價玩具 API。",
      language: "繁體中文 / EN",
      eyebrow: "AI AGENT 支付風控基礎設施",
      h1: "讓 AI Agent 可以付款，但不能亂付款。",
      subtitle:
        "SignGate 是 AI Agent 動用穩定幣之前的 Policy、風險與 Signer 控制層。在任何私鑰簽署發生之前，先驗證付款意圖、套用企業規則、評估收款方與合約風險，回傳可執行的決策，而不只是一個分數。",
      flowTitle: "Pre-signing flow",
      flowSubtitle: "Agent 請求付款，Signer 只照政策簽名。",
      step1: "付款請求",
      step2: "Intent 驗證",
      step3: "Policy + Risk",
      step4: "Allow / Review / Deny",
      step5: "Signer directive",
      problemTitle:
        "AI Agent 一旦能自主付款，風險就不再只是「錯誤」，而是「規模化的錯誤」",
      problemBody:
        "當 AI Agent 開始自己購買 API、訂閱資料、支付服務費、呼叫 x402 商家，甚至在鏈上結算，會出現一批過去不存在的風險：金額錯誤、重複付款、收款方遭竄改、惡意商家、prompt injection，以及沒有審核軌跡。這些不是 AI 模型會不會犯錯的問題，而是企業有沒有在簽署之前放一層控制的問題。SignGate 就是那一層。",
      howTitle: "付款前，先經過五道關卡",
      howBody:
        "AI Agent 發起付款請求，SignGate 先驗證付款意圖，套用企業 policy，檢查收款方、商家與合約風險，回傳 allow、review 或 deny，最後產生 signer directive。SignGate 不會取代你原本的 KMS、MPC、smart account 或 custody signer，它只負責在簽署之前做出能不能簽的判斷。",
      decisionTitle: "不是回傳一個分數，而是回傳一個可以執行的決定",
      decisionBody:
        "企業不需要自己猜為什麼被擋。每個決策都會附上 reason code，讓工程、風控、財務與合規團隊能追溯同一筆付款。",
      policyTitle: "把風控規則，變成機器能執行的簽署指令",
      policyBody:
        "SignGate 的 policy engine 支援單筆限額、每日限額、Agent 層級預算、商家與地址 allowlist、blocklist、新收款方強制審核、高風險收款方拒絕、manual review threshold、policy versioning 與 policy simulation。",
      riskTitle: "這不是傳統 AML，是 AI Agent 付款前的風險預檢",
      riskBody:
        "SignGate 檢查錢包地址、商家、網域、智慧合約、發票完整性、recipient mismatch、鏈與代幣一致性、異常金額、新往來對象、已知惡意基礎設施與封鎖名單來源。目的不是只回答地址是否髒，而是回答這筆由 AI Agent 自主發起的付款，現在能不能被信任地執行。",
      signerTitle: "Agent 永遠碰不到私鑰",
      signerBody:
        "Agent 可以請求付款。SignGate 負責判斷。Signer 只在政策允許時簽名。私鑰永遠留在受控環境中：KMS、MPC、Smart Account 模組或企業級 custody signer。SignGate 只做 preflight 決策與 signer directive，不持有、不保管任何資產。",
      useCasesTitle: "誰在用 SignGate",
      useCaseItems: [
        ["AI Agent SaaS", "控制 Agent 何時可以代客戶付款，超出授權範圍一律轉人工審核。"],
        ["x402 API Marketplace", "在每一次 paid API call 扣款前，先做一次 payment preflight。"],
        ["Stablecoin Payment Company", "在 USDC / USDT 付款前加入 policy 與收款方風險檢查。"],
        ["Wallet / Smart Account", "在簽名前加入 AI 付款意圖驗證，不需要重寫 signer 邏輯。"],
        ["Custody Provider", "把既有 signer 變成一個可被政策驅動的企業簽署系統。"],
        ["銀行 / 企業創新單位", "用最小成本驗證 AI Agent payment、穩定幣結算、policy-controlled signer 在自家場景是否可行。"],
      ],
      trustTitle: "給法遵與風控看的頁面，不只是給工程師看的頁面",
      trustItems: [
        "不持有私鑰，不直接保管資產",
        "Policy 版本管理，每次規則變更都有紀錄",
        "不可竄改的稽核軌跡（immutable audit trail）",
        "每個決策都附 reason code，可回溯、可解釋",
        "nonce + expiry + invoice hash，防止重放與竄改",
        "Signer directive 與既有 KMS / MPC / custody signer 整合，不需要更換你現有的簽署基礎設施",
        "人工審核佇列（review queue），高風險案件不會被自動放行",
      ],
      apiTitle: "一個請求，決定這筆錢能不能付",
      scoreNote:
        "risk_score 為 0-100，分數越高代表風險越高：0-30 低風險，31-70 中風險，71-100 高風險。完整文件請見 /docs 或 /openapi。",
      decision: "Decision",
      directive: "Signer Directive",
      reasons: "Reason Code",
      decisionAllow: "allow：符合政策，可以繼續",
      decisionReview: "review：需要人工或二次確認",
      decisionDeny: "deny：直接拒絕",
      directiveSign: "sign：允許簽署",
      directiveReview: "require_approval：需要額外核准才能簽署",
      directiveReject: "reject：拒絕簽署",
      developer: "開發者",
      company: "公司",
      about: "關於",
      contact: "聯絡我們",
      contactTitle: "想試 SignGate？直接留給我",
      contactBody:
        `表單會透過 Formspree 寄到 ${CONTACT_EMAIL}，不需要先建後台。`,
      contactName: "姓名",
      contactEmail: "Email",
      contactCompany: "公司 / 團隊",
      contactMessage: "想驗證的場景",
      contactSubmit: "送出",
      contactPending: "送出中...",
      contactSuccess: "已送出，我會從信箱收到。",
      contactMissing:
        "Formspree endpoint 尚未設定；建立表單後把 endpoint 填到 FORMSPREE_ENDPOINT 即可啟用。",
      contactError: "送出失敗，請稍後再試或直接寄信。",
      productFooter: "產品",
      copyright:
        "© 2026 SignGate. 私鑰不經手，不保管資產，僅提供 preflight 決策服務。",
      footerText:
        "SignGate — AI Agent 付款前的 Policy、風險與 Signer 控制層。",
    },
    en: {
      lang: "en",
      title: "Agent Buyer Identity Preflight | x402 Purchase Governance",
      meta:
        "Before an AI agent buys an x402 API, dataset, or tool, SignGate verifies whether the buyer role fits the product category, price, sensitivity, and approval policy.",
      product: "Product",
      apiDocs: "API Docs",
      useCases: "Use Cases",
      security: "Trust & Compliance",
      docsCta: "View API Docs",
      paymentCta: "Run Payment Preflight Test",
      previewNote:
        "Developer Preview: Test with x402 — keep this below the fold, not in the hero, so the product doesn't read like a toy API.",
      language: "繁體中文 / EN",
      eyebrow: "AGENT BUYER IDENTITY FOR X402",
      h1: "Check who is buying before your agent pays.",
      subtitle:
        "SignGate is the buyer identity and purchase governance layer for x402 agents. It checks the agent role, purpose, product category, data sensitivity, price, and approval evidence before payment, then returns an enforceable allow, review, or deny decision.",
      flowTitle: "Pre-signing flow",
      flowSubtitle: "The agent requests payment. The signer only signs under policy.",
      step1: "Payment request",
      step2: "Intent verification",
      step3: "Policy + Risk",
      step4: "Allow / Review / Deny",
      step5: "Signer directive",
      problemTitle:
        "Once agents can pay on their own, mistakes don't stay small — they scale.",
      problemBody:
        "As AI agents start buying API access, paying subscriptions, settling invoices, and calling x402 merchants, a new class of payment risk shows up — one that didn't exist when a human clicked confirm: misread intent leading to overpayment, duplicate or replayed payment requests, recipient addresses tampered with in transit, malicious merchants that look legitimate to an agent, prompt injection triggering an unauthorized payment call, and no audit trail when someone finally asks who approved this, and why. This isn't a question of whether the model will make a mistake. It's a question of whether there's a control layer in front of the signature. SignGate is that layer.",
      howTitle: "Five checkpoints before any key signs",
      howBody:
        "Agent request, intent verification, policy check, recipient and merchant risk, decision, signer directive, then a controlled signer executes — or doesn't. SignGate doesn't replace your signer, whether that is KMS, MPC, a smart account, or custody. It decides whether that signer is allowed to sign.",
      decisionTitle: "Not another risk score. An enforceable decision.",
      decisionBody:
        "Teams should not guess why a payment was blocked. Every decision includes reason codes so engineering, risk, finance, and compliance teams can trace the same payment.",
      policyTitle: "Turn risk rules into machine-executable signing instructions",
      policyBody:
        "SignGate supports per-transaction and daily spending limits, agent-level budgets, merchant and address allowlists, blocklists, mandatory review for new recipients, automatic denial for high-risk recipients, manual approval thresholds, policy versioning, and policy simulation against historical traffic before you ship a change.",
      riskTitle: "This isn't generic AML. It's preflight risk for agent-initiated payments.",
      riskBody:
        "SignGate checks wallet address risk, merchant risk, domain reputation and verification status, smart contract risk, invoice integrity, recipient-to-intent mismatch, chain and token mismatch, unusual amount detection, new counterparty flagging, known malicious infrastructure matching, and blocklist or sanctions sources where available. The question SignGate answers isn't whether this address is risky in general. It is whether this specific agent-initiated payment should be trusted right now.",
      signerTitle: "Agents never touch private keys",
      signerBody:
        "Agent can request. SignGate decides. Signer executes only when policy allows. SignGate doesn't replace your signer. It sits between the agent and the signer, issuing a signer directive. The key stays exactly where it already is: KMS, MPC, smart account modules, or enterprise custody signers. SignGate holds no assets and takes no custody. It only issues the preflight decision and the signer directive.",
      useCasesTitle: "Who runs this in front of their signer",
      useCaseItems: [
        ["AI Agent SaaS", "Control exactly when an agent is allowed to pay on a customer's behalf."],
        ["x402 API Marketplaces", "Preflight every paid API call before the charge goes through."],
        ["Stablecoin Payment Companies", "Add policy and recipient risk checks in front of USDC/USDT settlement."],
        ["Wallets / Smart Accounts", "Add agent payment-intent verification before signing — no signer rewrite required."],
        ["Custody Providers", "Turn an existing signer into a policy-driven enterprise signing system."],
        ["Bank Innovation Teams", "Pilot AI agent payments, stablecoin settlement, and policy-controlled signing with minimal integration risk."],
      ],
      trustTitle: "Built for the security lead's questions, not just the API docs.",
      trustItems: [
        "No private key custody, ever",
        "Policy versioning — every rule change is recorded",
        "Immutable audit trail",
        "Every decision ships with a reason code",
        "Nonce + expiry + invoice hash prevent replay and tampering",
        "Signer directives integrate with your existing KMS / MPC / custody signer",
        "Review queue — high-risk cases don't get auto-approved",
      ],
      apiTitle: "One request decides whether this payment can move",
      scoreNote:
        "risk_score is 0-100. Higher means riskier: 0-30 low risk, 31-70 medium risk, 71-100 high risk. Full docs are available at /docs or /openapi.",
      decision: "Decision",
      directive: "Signer Directive",
      reasons: "Reason Code",
      decisionAllow: "allow: policy-compliant, continue",
      decisionReview: "review: human or secondary confirmation required",
      decisionDeny: "deny: reject immediately",
      directiveSign: "sign: signing allowed",
      directiveReview: "require_approval: approval required before signing",
      directiveReject: "reject: signing rejected",
      developer: "Developers",
      company: "Company",
      about: "About",
      contact: "Contact",
      contactTitle: "Try SignGate",
      contactBody:
        `This form sends inquiries through Formspree to ${CONTACT_EMAIL}. No backend required.`,
      contactName: "Name",
      contactEmail: "Email",
      contactCompany: "Company / team",
      contactMessage: "What do you want to evaluate?",
      contactSubmit: "Send",
      contactPending: "Sending...",
      contactSuccess: "Sent. The inquiry will arrive by email.",
      contactMissing:
        "Formspree endpoint is not configured yet. Create the form, then set FORMSPREE_ENDPOINT to enable submissions.",
      contactError: "Could not send. Please try again later or email directly.",
      productFooter: "Product",
      copyright:
        "© 2026 SignGate. No custody. No private key access. Preflight decisions only.",
      footerText:
        "SignGate — The policy, risk, and signer control layer before AI agents pay.",
    },
  };
  const t = zh ? copy.zh : copy.en;
  const requestJson = `{
  "agent_id": "agent_ap_research_01",
  "intent_id": "intent_2026_001",
  "merchant": {
    "name": "Data API Vendor",
    "domain": "api.vendor.com"
  },
  "payment": {
    "chain": "base",
    "token": "USDC",
    "amount": "12.50",
    "recipient": "0x742d..."
  },
  "invoice": {
    "invoice_id": "inv_8842",
    "invoice_hash": "0x91ab..."
  },
  "controls": {
    "nonce": "n_7fd9",
    "expires_at": "2026-07-03T08:30:00Z"
  }
}`;
  const responseJson = `{
  "decision": "review",
  "risk_score": 72,
  "risk_level": "high",
  "signer_directive": "require_approval",
  "reason_codes": [
    "NEW_RECIPIENT_REVIEW_REQUIRED",
    "RECIPIENT_RISK_HIGH"
  ],
  "policy_id": "policy_enterprise_stablecoin_v1",
  "policy_version": "2026-07-01",
  "audit_id": "audit_9x28f"
}`;

  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.title}</title>
<meta name="description" content="${t.meta}">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>
:root{color-scheme:dark;--bg:#080D18;--bg2:#0D1424;--panel:#111B2E;--panel2:#0D1728;--line:#243149;--text:#F2F5FA;--muted:#96A5BF;--soft:#C4CEE0;--blue:#7C9CFA;--blue2:#4F6FE8;--green:#6EE7B7;--amber:#F2C94C;--red:#F2777A;--mono:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;--sans:Inter,"PingFang TC","Noto Sans TC",ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 80% 0%,rgba(79,111,232,.18),transparent 34rem),linear-gradient(180deg,var(--bg),#090E19 45rem);color:var(--text);font-family:var(--sans);line-height:1.62}a{color:inherit;text-decoration:none}button,input,textarea{font:inherit}.nav{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:2rem;padding:1rem 7vw;border-bottom:1px solid rgba(36,49,73,.78);background:rgba(8,13,24,.86);backdrop-filter:blur(18px)}.brand{font-size:1.35rem;font-weight:800}.links{display:flex;align-items:center;gap:1.25rem;margin-left:auto;color:var(--soft);font-size:.95rem}.links a:hover{color:var(--text)}.nav-cta{padding:.55rem .85rem;border:1px solid var(--blue2);border-radius:.5rem;background:rgba(124,156,250,.11);color:var(--text);font-weight:700}.lang-toggle{border:0;background:transparent;color:var(--muted);font-weight:700;cursor:pointer}.wrap{max-width:1180px;margin:0 auto;padding:0 1.5rem}.hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(22rem,.95fr);gap:3.5rem;align-items:center;min-height:42rem;padding:5.5rem 0 4rem}.eyebrow{color:var(--green);font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:1rem}h1{max-width:11ch;margin:0 0 1.4rem;font-size:4.7rem;line-height:1.04;letter-spacing:0}h2{margin:0 0 1rem;font-size:2.15rem;line-height:1.18;letter-spacing:0}h3{margin:0 0 .65rem;font-size:1.1rem}.subtitle{max-width:48rem;color:#CBD5E7;font-size:1.18rem;margin:0}.cta-row{display:flex;gap:.85rem;flex-wrap:wrap;margin-top:2rem}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:2.9rem;border-radius:.5rem;padding:.72rem 1rem;border:1px solid var(--blue2);background:var(--blue);color:#07101E;font-weight:800;cursor:pointer}.btn.secondary{background:rgba(124,156,250,.08);color:var(--text)}.flow-card,.panel,.api-card,.contact-form{border:1px solid var(--line);border-radius:.65rem;background:rgba(17,27,46,.82);box-shadow:0 1.5rem 5rem rgba(0,0,0,.24)}.flow-card{padding:1.25rem}.flow-card p{margin:.2rem 0 1.1rem;color:var(--muted)}.flow-step{display:grid;grid-template-columns:2rem 1fr;gap:.85rem;align-items:start;padding:.85rem 0;border-top:1px solid var(--line)}.flow-step:first-of-type{border-top:0}.num{display:flex;align-items:center;justify-content:center;width:2rem;height:2rem;border-radius:999px;background:rgba(124,156,250,.14);border:1px solid rgba(124,156,250,.38);font-family:var(--mono);font-size:.78rem;color:var(--green)}.decision-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:.55rem;margin-top:1rem}.chip{border:1px solid var(--line);border-radius:.45rem;padding:.58rem .7rem;text-align:center;font-family:var(--mono);font-size:.8rem}.chip.allow{color:var(--green);border-color:rgba(110,231,183,.45)}.chip.review{color:var(--amber);border-color:rgba(242,201,76,.45)}.chip.deny{color:var(--red);border-color:rgba(242,119,122,.45)}.section{padding:4.2rem 0;border-top:1px solid rgba(36,49,73,.82)}.section.noline{border-top:0}.text-block{max-width:56rem}.text-block p{margin:0;color:var(--soft);font-size:1.05rem}.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}.panel{padding:1.25rem}.panel p{margin:0;color:var(--muted)}.panel ul{margin:.85rem 0 0;padding:0;list-style:none;color:var(--soft)}.panel li{padding:.38rem 0;border-top:1px solid rgba(36,49,73,.6)}.panel li:first-child{border-top:0}.code{font-family:var(--mono);font-size:.85rem;color:#DCE8FA;white-space:pre;overflow:auto;margin:0;padding:1rem;background:#08101D;border:1px solid var(--line);border-radius:.5rem}.api-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.api-card{padding:1rem}.api-card h3{font-family:var(--mono);font-size:.82rem;color:var(--green);text-transform:uppercase}.contact-form{display:grid;gap:.85rem;padding:1.25rem}.contact-form label{display:grid;gap:.35rem;color:var(--soft);font-size:.9rem;font-weight:700}.contact-form input,.contact-form textarea{width:100%;border:1px solid var(--line);border-radius:.5rem;background:#08101D;color:var(--text);padding:.72rem .8rem}.contact-form textarea{min-height:8.5rem;resize:vertical}.contact-status{min-height:1.5rem;margin:0;color:var(--muted)}.contact-status.success{color:var(--green)}.contact-status.error{color:var(--red)}.note{margin:1rem 0 0;color:var(--muted)}.footer{border-top:1px solid var(--line);padding:2rem 0 3rem;color:var(--muted)}.footer-grid{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:2rem}.footer a{display:block;margin:.35rem 0;color:var(--soft)}code.inline{color:#FFD27D;font-family:var(--mono)}
@media (max-width:900px){.nav{position:static;align-items:flex-start;flex-direction:column;padding:1rem 1.25rem}.links{margin-left:0;flex-wrap:wrap}.hero,.grid-2,.api-grid,.footer-grid{grid-template-columns:1fr}.hero{min-height:0;padding:3.5rem 0}.grid-3{grid-template-columns:1fr}h1{font-size:3.4rem}.wrap{padding:0 1.25rem}}
@media (max-width:560px){.links{gap:.8rem}.nav-cta{order:4}.decision-strip{grid-template-columns:1fr}h1{font-size:2.65rem}h2{font-size:1.65rem}.subtitle{font-size:1.03rem}.section{padding:3rem 0}.code{font-size:.76rem}}
</style>
</head>
<body>
<nav class="nav">
  <a class="brand" href="/">SignGate</a>
  <div class="links">
    <a href="#product">${t.product}</a>
    <a href="/openapi.json">${t.apiDocs}</a>
    <a href="#use-cases">${t.useCases}</a>
    <a href="#security">${t.security}</a>
    <a class="nav-cta" href="/openapi.json">${t.docsCta}</a>
    <button id="lang-toggle" class="lang-toggle">${t.language}</button>
  </div>
</nav>
<main class="wrap" data-locale="${zh ? "zh" : "en"}">
  <section class="hero" id="product">
    <div>
      <div class="eyebrow">${t.eyebrow}</div>
      <h1>${t.h1}</h1>
      <p class="subtitle">${t.subtitle}</p>
      <div class="cta-row">
        <a class="btn" href="/openapi.json">${t.docsCta}</a>
        <a class="btn secondary" href="#api-preview">${t.paymentCta}</a>
      </div>
    </div>
    <aside class="flow-card" aria-label="SignGate payment flow">
      <h3>${t.flowTitle}</h3>
      <p>${t.flowSubtitle}</p>
      <div class="flow-step"><span class="num">01</span><strong>${t.step1}</strong></div>
      <div class="flow-step"><span class="num">02</span><strong>${t.step2}</strong></div>
      <div class="flow-step"><span class="num">03</span><strong>${t.step3}</strong></div>
      <div class="flow-step"><span class="num">04</span><strong>${t.step4}</strong></div>
      <div class="flow-step"><span class="num">05</span><strong>${t.step5}</strong></div>
      <div class="decision-strip"><span class="chip allow">allow</span><span class="chip review">review</span><span class="chip deny">deny</span></div>
    </aside>
  </section>

  <section class="section noline">
    <div class="text-block">
      <h2>${t.problemTitle}</h2>
      <p>${t.problemBody}</p>
    </div>
  </section>

  <section class="section">
    <div class="grid-2">
      <div class="text-block">
        <h2>${t.howTitle}</h2>
        <p>${t.howBody}</p>
      </div>
      <div class="panel">
        <ul>
          <li>Agent payment request</li>
          <li>Verifiable intent</li>
          <li>Enterprise policy</li>
          <li>Recipient and contract risk</li>
          <li>Signer directive</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="text-block">
      <h2>${t.decisionTitle}</h2>
      <p>${t.decisionBody}</p>
    </div>
    <div class="grid-3" style="margin-top:1.25rem">
      <div class="panel"><h3>${t.decision}</h3><ul><li>${t.decisionAllow}</li><li>${t.decisionReview}</li><li>${t.decisionDeny}</li></ul></div>
      <div class="panel"><h3>${t.directive}</h3><ul><li>${t.directiveSign}</li><li>${t.directiveReview}</li><li>${t.directiveReject}</li></ul></div>
      <div class="panel"><h3>${t.reasons}</h3><ul><li>POLICY_LIMIT_EXCEEDED</li><li>NEW_RECIPIENT_REVIEW_REQUIRED</li><li>RECIPIENT_RISK_HIGH</li><li>INVOICE_HASH_MISMATCH</li><li>EXPIRED_INTENT</li><li>NONCE_REPLAY_DETECTED</li><li>BLOCKLISTED_MERCHANT</li><li>DOMAIN_NOT_VERIFIED</li></ul></div>
    </div>
  </section>

  <section class="section" id="policy-engine">
    <div class="grid-2">
      <div class="panel"><h2>${t.policyTitle}</h2><p>${t.policyBody}</p></div>
      <div class="panel" id="risk-checks"><h2>${t.riskTitle}</h2><p>${t.riskBody}</p></div>
    </div>
  </section>

  <section class="section" id="signer-isolation">
    <div class="text-block">
      <h2>${t.signerTitle}</h2>
      <p>${t.signerBody}</p>
    </div>
  </section>

  <section class="section" id="api-preview">
    <div class="text-block">
      <h2>${t.apiTitle}</h2>
      <p><code class="inline">POST /v1/payments/preflight</code></p>
    </div>
    <div class="api-grid" style="margin-top:1.25rem">
      <div class="api-card"><h3>Request</h3><pre class="code">${requestJson}</pre></div>
      <div class="api-card"><h3>Response</h3><pre class="code">${responseJson}</pre></div>
    </div>
    <p class="note">${t.scoreNote}</p>
    <p class="note">x402 wrapper: <a href="${signGateExample}"><code class="inline">GET ${signGateProduct.path}</code></a> · ${signGateProduct.price}</p>
  </section>

  <section class="section" id="use-cases">
    <div class="text-block">
      <h2>${t.useCasesTitle}</h2>
    </div>
    <div class="grid-3" style="margin-top:1.25rem">
      ${t.useCaseItems
        .map(
          ([title, body]) =>
            `<div class="panel"><h3>${title}</h3><p>${body}</p></div>`,
        )
        .join("")}
    </div>
  </section>

  <section class="section" id="security">
    <div class="grid-2">
      <div class="text-block">
        <h2>${t.trustTitle}</h2>
        <p>${t.footerText}</p>
      </div>
      <div class="panel">
        <ul>${t.trustItems.map(item => `<li>${item}</li>`).join("")}</ul>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="panel">
      <h2>${t.apiTitle}</h2>
      <div class="cta-row">
        <a class="btn" href="/openapi.json">${t.docsCta}</a>
        <a class="btn secondary" href="#api-preview">${t.paymentCta}</a>
      </div>
      <p class="note">${t.previewNote}</p>
    </div>
  </section>

  <section class="section" id="contact">
    <div class="grid-2">
      <div class="text-block">
        <h2>${t.contactTitle}</h2>
        <p>${t.contactBody}</p>
      </div>
      <form class="contact-form" id="contact-form" action="${escapeHtml(contactAction)}" method="POST" data-enabled="${contactEnabled ? "true" : "false"}">
        <input type="hidden" name="_subject" value="New SignGate inquiry">
        <input type="hidden" name="source" value="${escapeHtml(origin)}/signgate">
        <label>${t.contactName}<input name="name" autocomplete="name" required></label>
        <label>${t.contactEmail}<input name="email" type="email" autocomplete="email" required></label>
        <label>${t.contactCompany}<input name="company" autocomplete="organization"></label>
        <label>${t.contactMessage}<textarea name="message" required></textarea></label>
        <button class="btn" type="submit">${t.contactSubmit}</button>
        <p class="contact-status" id="contact-status">${contactEnabled ? "" : t.contactMissing}</p>
      </form>
    </div>
  </section>
</main>
<footer class="footer">
  <div class="wrap footer-grid">
    <div><strong>SignGate</strong><p>${t.footerText}</p></div>
    <div><strong>${t.productFooter}</strong><a href="#policy-engine">Policy Engine</a><a href="#risk-checks">Risk Checks</a><a href="#signer-isolation">Signer Isolation</a><a href="#use-cases">Use Cases</a></div>
    <div><strong>${t.developer}</strong><a href="/openapi.json">${t.apiDocs}</a><a href="/openapi.json">OpenAPI</a><a href="/catalog.json">Catalog</a><a href="/.well-known/agent-card.json">Agent Card</a><a href="/verify">Verify</a></div>
    <div><strong>${t.company}</strong><a href="/">${t.about}</a><a href="#security">${t.security}</a><a href="#contact">${t.contact}</a></div>
  </div>
  <div class="wrap"><p class="note">${t.copyright}</p></div>
</footer>
<script>
document.getElementById("lang-toggle").addEventListener("click", event => {
  event.preventDefault();
  const current = document.querySelector("main").dataset.locale;
  window.location.href = current === "zh" ? "/en/signgate" : "/zh/signgate";
});
const contactForm = document.getElementById("contact-form");
const contactStatus = document.getElementById("contact-status");
contactForm.addEventListener("submit", async event => {
  if (contactForm.dataset.enabled !== "true") {
    event.preventDefault();
    contactStatus.className = "contact-status error";
    contactStatus.textContent = "${escapeHtml(t.contactMissing)}";
    return;
  }
  event.preventDefault();
  const button = contactForm.querySelector("button[type='submit']");
  const defaultText = button.textContent;
  button.disabled = true;
  button.textContent = "${escapeHtml(t.contactPending)}";
  contactStatus.className = "contact-status";
  contactStatus.textContent = "";
  try {
    const response = await fetch(contactForm.action, {
      method: "POST",
      body: new FormData(contactForm),
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Formspree request failed");
    contactForm.reset();
    contactStatus.className = "contact-status success";
    contactStatus.textContent = "${escapeHtml(t.contactSuccess)}";
  } catch (error) {
    contactStatus.className = "contact-status error";
    contactStatus.textContent = "${escapeHtml(t.contactError)}";
  } finally {
    button.disabled = false;
    button.textContent = defaultText;
  }
});
</script>
</body>
</html>`;
}

function createPaidApp() {
  const facilitatorClient = new ResilientFacilitatorClient(
    new HTTPFacilitatorClient({ url: FACILITATOR }),
  );
  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    BASE_MAINNET,
    new ExactEvmScheme(),
  );
  const app = new Hono();
  const routes = {};
  for (const product of PRODUCTS) {
    routes[`GET ${product.path}`] = {
      accepts: [
        {
          scheme: "exact",
          price: product.price,
          network: BASE_MAINNET,
          payTo: PAY_TO,
        },
      ],
      description: product.description,
      mimeType: product.id === "public-wallet-risk-snapshot" || product.id === "public-wallet-risk-delta"
        ? "application/x-ndjson"
        : "application/json",
        serviceName:
        product.id === "base-alpha-risk-context"
          ? "Base Alpha Risk Context"
          : product.id === "base-token-alpha-snapshot"
          ? "Base Token Alpha Snapshot"
          : product.id === "base-wallet-copytrade-risk"
          ? "Base Wallet Copytrade Risk"
          : product.id === "base-new-pool-risk"
          ? "Base New Pool Risk"
          : product.id === "agent-payment-guard"
          ? "Agent Payment Guard"
          : product.id.startsWith("public-wallet-risk-")
          ? "SignGate Wallet Risk Intelligence"
          : product.id.startsWith("bcs-")
          ? "BlockchainSecurity Atlantis"
          : PUBLIC_LISTING_NAME,
      tags:
        [
          "base-alpha-risk-context",
          "base-token-alpha-snapshot",
          "base-wallet-copytrade-risk",
          "base-new-pool-risk",
        ].includes(product.id)
          ? ["x402", "Base", "trading bots", "wallet risk", "token alpha"]
          : product.id === "agent-payment-guard"
          ? ["x402", "AI agents", "payment firewall", "risk", "budget"]
          : product.id.startsWith("bcs-")
          ? ["x402", "BlockchainSecurity", "labels", "asset registry", "KYT"]
          : product.id.startsWith("public-wallet-risk-")
          ? ["x402", "wallet risk", "KYT", "sanctions", "ransomware"]
          : ["x402", "Base", "agent safety"],
      iconUrl: SERVICE_ICON,
      extensions: discovery(product),
    };
  }
  const guardProduct = PRODUCTS[25];
  routes[`POST ${guardProduct.path}`] = {
    accepts: [
      {
        scheme: "exact",
        price: guardProduct.price,
        network: BASE_MAINNET,
        payTo: PAY_TO,
      },
    ],
    description: `${guardProduct.description} Accepts a JSON request body.`,
    mimeType: "application/json",
    serviceName: "SignGate Payment Guard",
    tags: ["x402", "AI agents", "payment firewall", "risk", "budget"],
    iconUrl: SERVICE_ICON,
    extensions: declareDiscoveryExtension({
      method: "POST",
      bodyType: "json",
      input: PAYMENT_GUARD_EVALUATE_BODY_EXAMPLE,
      inputSchema: PAYMENT_GUARD_EVALUATE_BODY_SCHEMA,
      output: PAYMENT_GUARD_OUTPUT,
    }),
  };
  routes[`POST ${PAYMENT_GUARD_POLICY_PATH}`] = {
    accepts: [
      {
        scheme: "exact",
        price: guardProduct.price,
        network: BASE_MAINNET,
        payTo: PAY_TO,
      },
    ],
    description:
      "Create an owner-controlled Payment Guard policy profile and receive one-time owner and agent tokens.",
    mimeType: "application/json",
    serviceName: "SignGate Payment Guard",
    tags: ["x402", "AI agents", "payment policy", "budget", "security"],
    iconUrl: SERVICE_ICON,
    extensions: declareDiscoveryExtension({
      method: "POST",
      bodyType: "json",
      input: PAYMENT_GUARD_POLICY_BODY_EXAMPLE,
      inputSchema: PAYMENT_GUARD_POLICY_BODY_SCHEMA,
      output: {
        example: {
          product: "agent-payment-guard-policy",
          profile_id: "policy_demo",
          owner_token: "owner_token_example",
          agent_token: "agent_token_example",
          policy: {
            max_single_usdc: "0.10",
            session_budget_usdc: "1.00",
            daily_budget_usdc: "5.00",
          },
        },
        schema: {
          properties: {
            product: { type: "string" },
            profile_id: { type: "string" },
            owner_token: { type: "string" },
            agent_token: { type: "string" },
            policy: { type: "object" },
          },
          required: ["product", "profile_id", "owner_token", "agent_token"],
        },
      },
    }),
  };
  const httpServer = new x402HTTPResourceServer(resourceServer, routes);
  app.use("*", paymentMiddlewareFromHTTPServer(httpServer));
  app.use("*", async (c, next) => {
    await next();
    if (c.res?.status && c.res.status < 400) {
      try {
        await recordX402PurchaseEvent(c.env?.GUARD_DB, c);
      } catch (error) {
        console.warn(
          `purchase event log failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  });

  app.get(PRODUCTS[0].path, async c => {
  const address = c.req.query("address") ?? "";
  if (!ADDRESS_PATTERN.test(address)) {
    return c.json({ error: "invalid_base_address" }, 400);
  }
  try {
    return c.json(await addressPreflight(address));
  } catch (error) {
    return c.json(
      {
        error: "upstream_unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
  });

  app.get(PRODUCTS[1].path, async c => {
  const token = c.req.query("token") ?? "";
  if (!ADDRESS_PATTERN.test(token)) {
    return c.json({ error: "invalid_base_token_contract" }, 400);
  }
  try {
    return c.json(await tokenPreflight(token));
  } catch (error) {
    return c.json(
      {
        error: "upstream_unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
  });

  app.get(PRODUCTS[2].path, async c => {
  const address = c.req.query("address") ?? "";
  if (!ADDRESS_PATTERN.test(address)) {
    return c.json({ error: "invalid_base_merchant_address" }, 400);
  }
  try {
    return c.json(await merchantTrust(address));
  } catch (error) {
    return c.json(
      {
        error: "upstream_unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
  });

  app.get(PRODUCTS[3].path, async c => {
  const tx = c.req.query("tx") ?? "";
  const recipient = c.req.query("recipient") ?? "";
  const amount = c.req.query("amount") ?? "";
  if (
    !TX_PATTERN.test(tx) ||
    !ADDRESS_PATTERN.test(recipient) ||
    usdcToAtomic(amount) === null
  ) {
    return c.json({ error: "invalid_payment_proof_input" }, 400);
  }
  try {
    return c.json(await paymentProof(tx, recipient, amount));
  } catch (error) {
    return c.json(
      {
        error: "upstream_unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
  });

  app.get(PRODUCTS[4].path, async c => {
  const address = c.req.query("address") ?? "";
  const since = c.req.query("since") ?? "";
  if (!ADDRESS_PATTERN.test(address) || !Number.isFinite(Date.parse(since))) {
    return c.json({ error: "invalid_wallet_activity_input" }, 400);
  }
  try {
    return c.json(await walletActivityDelta(address, since));
  } catch (error) {
    return c.json(
      {
        error: "upstream_unavailable",
        message: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
  });

  app.get(PRODUCTS[5].path, async c => {
    const token = c.req.query("token") ?? "";
    const owner = c.req.query("owner") ?? "";
    const spender = c.req.query("spender") ?? "";
    if (
      !ADDRESS_PATTERN.test(token) ||
      !ADDRESS_PATTERN.test(owner) ||
      !ADDRESS_PATTERN.test(spender)
    ) {
      return c.json({ error: "invalid_approval_risk_input" }, 400);
    }
    try {
      return c.json(await approvalRisk(token, owner, spender));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[6].path, async c => {
    const address = c.req.query("address") ?? "";
    if (!ADDRESS_PATTERN.test(address)) {
      return c.json({ error: "invalid_contract_address" }, 400);
    }
    try {
      return c.json(await contractVerification(address));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[7].path, async c => {
    const tx = c.req.query("tx") ?? "";
    if (!TX_PATTERN.test(tx)) {
      return c.json({ error: "invalid_usdc_receipt_input" }, 400);
    }
    try {
      return c.json(await usdcReceipt(tx));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[8].path, async c => {
    const address = c.req.query("address") ?? "";
    if (!ADDRESS_PATTERN.test(address)) {
      return c.json({ error: "invalid_counterparty_address" }, 400);
    }
    try {
      return c.json(await walletCounterparty(address));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[9].path, async c => {
    const address = c.req.query("address") ?? "";
    const fromBlock = c.req.query("from_block") ?? "";
    if (
      !ADDRESS_PATTERN.test(address) ||
      !/^[0-9]+$/.test(fromBlock) ||
      !Number.isSafeInteger(Number(fromBlock))
    ) {
      return c.json({ error: "invalid_event_monitor_input" }, 400);
    }
    try {
      return c.json(await eventLogMonitor(address, fromBlock));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[10].path, async c => {
    const gasLimit = c.req.query("gas_limit") ?? "";
    const parsed = Number(gasLimit);
    if (
      !/^[0-9]+$/.test(gasLimit) ||
      !Number.isSafeInteger(parsed) ||
      parsed < 21_000 ||
      parsed > 30_000_000
    ) {
      return c.json({ error: "invalid_gas_limit" }, 400);
    }
    try {
      return c.json(await gasFeeQuote(gasLimit));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[11].path, async c => {
    const address = c.req.query("address") ?? "";
    if (!ADDRESS_PATTERN.test(address)) {
      return c.json({ error: "invalid_nonce_address" }, 400);
    }
    try {
      return c.json(await nonceReadiness(address));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[12].path, async c => {
    const address = c.req.query("address") ?? "";
    if (!ADDRESS_PATTERN.test(address)) {
      return c.json({ error: "invalid_stablecoin_address" }, 400);
    }
    try {
      return c.json(await stablecoinBalance(address));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  for (const productId of [
    "x402-transaction-preflight-lite",
    "x402-transaction-preflight",
    "x402-transaction-preflight-plus",
  ]) {
    app.get(PRODUCTS_BY_ID[productId].path, async c => {
      const input = Object.fromEntries(new URL(c.req.url).searchParams.entries());
      const merchantAddress = String(input.merchant_address ?? "");
      if (!ADDRESS_PATTERN.test(merchantAddress)) {
        return c.json({ error: "invalid_transaction_preflight_merchant_address" }, 400);
      }
      try {
        const result = await x402TransactionPreflight(input, productId);
        c.header("x-signgate-decision", result.decision);
        c.header("x-signgate-outcome", result.decision);
        return c.json(result);
      } catch (error) {
        return c.json(
          {
            error: "x402_transaction_preflight_failed",
            message: error instanceof Error ? error.message : String(error),
          },
          502,
        );
      }
    });
  }

  app.get(PRODUCTS[13].path, async c => {
    const token = c.req.query("token") ?? "";
    if (!ADDRESS_PATTERN.test(token)) {
      return c.json({ error: "invalid_dex_token" }, 400);
    }
    try {
      return c.json(await dexMarketMonitor(token));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[14].path, async c => {
    const ticker = c.req.query("ticker") ?? "";
    if (!/^[A-Za-z0-9._-]{3,160}$/.test(ticker)) {
      return c.json({ error: "invalid_prediction_market_ticker" }, 400);
    }
    try {
      return c.json(await predictionMarketSnapshot(ticker));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[15].path, async c => {
    const target = c.req.query("url") ?? "";
    try {
      validatePublicUrl(target);
    } catch (error) {
      return c.json(
        {
          error: "invalid_public_x402_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    try {
      return c.json(await x402EndpointPreflight(target));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[16].path, async c => {
    const packageName = c.req.query("package") ?? "";
    const version = c.req.query("version") ?? "latest";
    if (
      !NPM_PACKAGE_PATTERN.test(packageName) ||
      !/^(?:latest|[0-9A-Za-z][0-9A-Za-z.+_-]{0,79})$/.test(version)
    ) {
      return c.json({ error: "invalid_npm_package_input" }, 400);
    }
    try {
      return c.json(await npmPackagePreflight(packageName, version));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[17].path, async c => {
    const owner = c.req.query("owner") ?? "";
    const repo = c.req.query("repo") ?? "";
    if (
      !GITHUB_OWNER_PATTERN.test(owner) ||
      !GITHUB_REPO_PATTERN.test(repo)
    ) {
      return c.json({ error: "invalid_github_repository_input" }, 400);
    }
    try {
      return c.json(
        await githubRepositoryHealth(owner, repo, c.env?.GITHUB_TOKEN),
      );
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[18].path, async c => {
    const target = c.req.query("url") ?? "";
    try {
      validatePublicUrl(target);
    } catch (error) {
      return c.json(
        {
          error: "invalid_public_document_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    try {
      return c.json(await urlChangeFingerprint(target));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[19].path, async c => {
    const target = c.req.query("url") ?? "";
    try {
      validatePublicUrl(target);
    } catch (error) {
      return c.json(
        {
          error: "invalid_public_feed_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    try {
      return c.json(await feedSnapshot(target));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[20].path, async c => {
    const to = c.req.query("to") ?? "";
    const data = c.req.query("data") ?? "";
    const value = c.req.query("value") ?? "0";
    if (
      !ADDRESS_PATTERN.test(to) ||
      !/^0x(?:[a-fA-F0-9]{2})*$/.test(data) ||
      data.length > 8194 ||
      !/^[0-9]+$/.test(value)
    ) {
      return c.json({ error: "invalid_transaction_intent_input" }, 400);
    }
    try {
      return c.json(await transactionIntent(to, data, value));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[21].path, async c => {
    const target = c.req.query("url") ?? "";
    let parsedTarget;
    try {
      parsedTarget = validatePublicUrl(target);
    } catch (error) {
      return c.json(
        {
          error: "invalid_public_agent_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    try {
      const requestOrigin = new URL(c.req.url).origin;
      if (parsedTarget.origin === requestOrigin) {
        return c.json(
          buildA2aAgentCardPreflight({
            requestedUrl: target,
            cardUrl: `${requestOrigin}/.well-known/agent-card.json`,
            card: agentCard(requestOrigin),
          }),
        );
      }
      return c.json(await a2aAgentCardPreflight(target));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[22].path, async c => {
    const target = c.req.query("url") ?? "";
    let parsedTarget;
    try {
      parsedTarget = validatePublicUrl(target);
    } catch (error) {
      return c.json(
        {
          error: "invalid_public_openapi_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    try {
      const requestOrigin = new URL(c.req.url).origin;
      if (
        parsedTarget.origin === requestOrigin &&
        parsedTarget.pathname === "/openapi.json"
      ) {
        const document = openApi(requestOrigin);
        return c.json(
          await buildOpenApiSpecPreflight({
            requestedUrl: target,
            finalUrl: `${requestOrigin}/openapi.json`,
            document,
            raw: JSON.stringify(document),
          }),
        );
      }
      return c.json(await openApiSpecPreflight(target));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[23].path, async c => {
    const domain = (c.req.query("domain") ?? "").toLowerCase().replace(/\.$/, "");
    if (!DOMAIN_PATTERN.test(domain)) {
      return c.json({ error: "invalid_public_domain" }, 400);
    }
    try {
      return c.json(await domainTrustPreflight(domain));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[24].path, async c => {
    const packageName = c.req.query("package") ?? "";
    const version = c.req.query("version") ?? "latest";
    if (
      !PYPI_PACKAGE_PATTERN.test(packageName) ||
      !/^(?:latest|[A-Za-z0-9][A-Za-z0-9._+!-]{0,99})$/.test(version)
    ) {
      return c.json({ error: "invalid_pypi_package_input" }, 400);
    }
    try {
      return c.json(await pypiPackagePreflight(packageName, version));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["agent-capability-security-preflight"].path, async c => {
    const input = {
      target_type: c.req.query("target_type") ?? "capability",
      identifier: c.req.query("identifier") ?? "",
      agent_card_url: c.req.query("agent_card_url") ?? c.req.query("agent_url") ?? "",
      github_owner: c.req.query("github_owner") ?? "",
      github_repo: c.req.query("github_repo") ?? "",
      npm_package: c.req.query("npm_package") ?? "",
      npm_version: c.req.query("npm_version") ?? "latest",
      domain: (c.req.query("domain") ?? "").toLowerCase().replace(/\.$/, ""),
      openapi_url: c.req.query("openapi_url") ?? "",
      x402_url: c.req.query("x402_url") ?? "",
    };
    if (
      !["agent", "package", "repository", "api", "capability"].includes(
        input.target_type,
      ) ||
      !input.identifier ||
      input.identifier.length > 512
    ) {
      return c.json({ error: "invalid_agent_capability_security_input" }, 400);
    }
    for (const urlValue of [
      input.agent_card_url,
      input.openapi_url,
      input.x402_url,
    ].filter(Boolean)) {
      try {
        validatePublicUrl(urlValue);
      } catch (error) {
        return c.json(
          {
            error: "invalid_agent_capability_security_url",
            message: error instanceof Error ? error.message : String(error),
          },
          400,
        );
      }
    }
    if (
      (input.github_owner && !GITHUB_OWNER_PATTERN.test(input.github_owner)) ||
      (input.github_repo && !GITHUB_REPO_PATTERN.test(input.github_repo)) ||
      (input.npm_package && !NPM_PACKAGE_PATTERN.test(input.npm_package)) ||
      (input.domain && !DOMAIN_PATTERN.test(input.domain))
    ) {
      return c.json({ error: "invalid_agent_capability_security_target" }, 400);
    }
    return c.json(await agentCapabilitySecurityPreflight(input));
  });

  app.get(PRODUCTS[25].path, async c => {
    const targetUrl = c.req.query("url") ?? "";
    const sessionId = c.req.query("session_id") ?? "";
    const requestId = c.req.query("request_id") ?? "";
    const maxSingle = c.req.query("max_single_usdc") ?? "0.10";
    const sessionBudget = c.req.query("session_budget_usdc") ?? "1.00";
    const dailyBudget = c.req.query("daily_budget_usdc") ?? "5.00";
    const to = c.req.query("to") || null;
    const data = c.req.query("data") || null;
    const value = c.req.query("value") ?? "0";
    try {
      validatePublicUrl(targetUrl);
    } catch (error) {
      return c.json(
        {
          error: "invalid_payment_guard_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    if (
      !/^[A-Za-z0-9._:-]{1,96}$/.test(sessionId) ||
      !/^[A-Za-z0-9._:-]{1,128}$/.test(requestId)
    ) {
      return c.json({ error: "invalid_payment_guard_identity" }, 400);
    }
    const maxSingleAtomic = usdcToAtomic(maxSingle);
    const sessionBudgetAtomic = usdcToAtomic(sessionBudget);
    const dailyBudgetAtomic = usdcToAtomic(dailyBudget);
    if (
      maxSingleAtomic === null ||
      sessionBudgetAtomic === null ||
      dailyBudgetAtomic === null ||
      maxSingleAtomic > 1_000_000_000_000n ||
      sessionBudgetAtomic > 1_000_000_000_000n ||
      dailyBudgetAtomic > 1_000_000_000_000n
    ) {
      return c.json({ error: "invalid_payment_guard_budget" }, 400);
    }
    if (
      (to !== null && !ADDRESS_PATTERN.test(to)) ||
      (data !== null &&
        (!/^0x(?:[a-fA-F0-9]{2})*$/.test(data) || data.length > 8194)) ||
      ((to === null) !== (data === null)) ||
      !/^[0-9]+$/.test(value)
    ) {
      return c.json({ error: "invalid_payment_guard_transaction" }, 400);
    }
    try {
      return c.json(
        await paymentGuardEvaluate({
          targetUrl,
          sessionId,
          requestId,
          policy: {
            maxSingleAtomic: Number(maxSingleAtomic),
            sessionBudgetAtomic: Number(sessionBudgetAtomic),
            dailyBudgetAtomic: Number(dailyBudgetAtomic),
            allowPayTo: parseAddressList(c.req.query("allow_pay_to") ?? ""),
            blockPayTo: parseAddressList(c.req.query("block_pay_to") ?? ""),
            reservationTtlSeconds: 300,
            retentionDays: 30,
            humanReviewAtomic: Number(maxSingleAtomic),
            failClosed: true,
            allowedDomains: [],
            allowedTools: [],
            allowedPurposes: [],
            activeFromHourUtc: 0,
            activeUntilHourUtc: 24,
          },
          to,
          data,
          value,
          db: c.env?.GUARD_DB ?? null,
          signingSecret: c.env?.GUARD_SIGNING_SECRET ?? null,
          toolId: c.req.query("tool_id") ?? null,
          purpose: c.req.query("purpose") ?? null,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("UNIQUE constraint failed")) {
        return c.json({ error: "request_id_conflict" }, 409);
      }
      return c.json({ error: "payment_guard_failed", message }, 502);
    }
  });

  app.get(PRODUCTS[26].path, async c => {
    const subject = c.req.query("subject") ?? "";
    const kind = c.req.query("kind") ?? "auto";
    if (
      !ADDRESS_PATTERN.test(subject) ||
      !["auto", "wallet", "token"].includes(kind)
    ) {
      return c.json({ error: "invalid_alpha_risk_input" }, 400);
    }
    try {
      return c.json(await alphaRiskContext(subject, kind));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[27].path, async c => {
    const token = c.req.query("token") ?? "";
    if (!ADDRESS_PATTERN.test(token)) {
      return c.json({ error: "invalid_token_alpha_input" }, 400);
    }
    try {
      return c.json(await tokenAlphaSnapshot(token));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[28].path, async c => {
    const address = c.req.query("address") ?? "";
    if (!ADDRESS_PATTERN.test(address)) {
      return c.json({ error: "invalid_copytrade_wallet_input" }, 400);
    }
    try {
      return c.json(await walletCopytradeRisk(address));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS[29].path, async c => {
    const token = c.req.query("token") ?? "";
    if (!ADDRESS_PATTERN.test(token)) {
      return c.json({ error: "invalid_new_pool_input" }, 400);
    }
    try {
      return c.json(await newPoolRisk(token));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.post(PAYMENT_GUARD_POLICY_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(await createPaymentGuardProfile(c.env?.GUARD_DB, input));
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_policy_creation_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.get(PRODUCTS[30].path, async c => {
    const serverUrl = c.req.query("server_url") ?? "";
    const seller = c.req.query("seller") || null;
    let parsedTarget;
    try {
      parsedTarget = validatePublicUrl(serverUrl);
    } catch (error) {
      return c.json(
        {
          error: "invalid_x402_server_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    if (seller !== null && !ADDRESS_PATTERN.test(seller)) {
      return c.json({ error: "invalid_x402_seller_address" }, 400);
    }
    const volumeUsdc = c.req.query("volume_usdc") ?? null;
    const txns = c.req.query("txns") ?? null;
    const buyers = c.req.query("buyers") ?? null;
    const latestSeenHours = c.req.query("latest_seen_hours") ?? null;
    const chains = c.req.query("chains") ?? "";
    if (
      (volumeUsdc !== null && parseNonNegativeNumber(volumeUsdc) === null) ||
      (txns !== null && parseNonNegativeInteger(txns) === null) ||
      (buyers !== null && parseNonNegativeInteger(buyers) === null) ||
      (latestSeenHours !== null &&
        parseNonNegativeNumber(latestSeenHours) === null)
    ) {
      return c.json({ error: "invalid_x402_server_stats" }, 400);
    }
    try {
      if (parsedTarget.origin === new URL(c.req.url).origin && !seller) {
        return c.json(
          buildX402ServerTrust({
            serverUrl,
            seller: PAY_TO,
            volumeUsdc,
            txns,
            buyers,
            latestSeenHours,
            chains,
          }),
        );
      }
      return c.json(
        await x402ServerTrust({
          serverUrl,
          seller,
          volumeUsdc,
          txns,
          buyers,
          latestSeenHours,
          chains,
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["x402-origin-due-diligence"].path, async c => {
    const serverUrl = c.req.query("server_url") ?? "";
    const seller = c.req.query("seller") || null;
    const resources = c.req.query("resources") || null;
    const txns = c.req.query("txns") || null;
    const buyers = c.req.query("buyers") || null;
    try {
      validatePublicUrl(serverUrl);
    } catch (error) {
      return c.json(
        {
          error: "invalid_x402_origin_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    if (
      (seller !== null && !ADDRESS_PATTERN.test(seller)) ||
      (resources !== null && parseNonNegativeInteger(resources) === null) ||
      (txns !== null && parseNonNegativeInteger(txns) === null) ||
      (buyers !== null && parseNonNegativeInteger(buyers) === null)
    ) {
      return c.json({ error: "invalid_x402_origin_due_diligence_input" }, 400);
    }
    try {
      const requestOrigin = new URL(c.req.url).origin;
      if (
        new URL(serverUrl).origin === requestOrigin ||
        serverUrl.startsWith(SERVICE_ORIGIN)
      ) {
        const document = openApi(requestOrigin);
        const openapi = await buildOpenApiSpecPreflight({
          requestedUrl: `${requestOrigin}/openapi.json`,
          finalUrl: `${requestOrigin}/openapi.json`,
          document,
          raw: JSON.stringify(document),
        });
        return c.json(
          buildX402OriginDueDiligence({
            serverUrl,
            origin: requestOrigin,
            title: "Agent Payment Guard API",
            seller: seller ?? PAY_TO,
            resources: resources ?? String(PRODUCTS.length + 2),
            resourceUrls: PRODUCTS.map(product => `${requestOrigin}${product.path}`),
            payToAddresses: [seller ?? PAY_TO],
            txns,
            buyers,
            openapi,
            serverTrust: buildX402ServerTrust({
              serverUrl: requestOrigin,
              seller: seller ?? PAY_TO,
              txns,
              buyers,
              chains: "base",
            }),
          }),
        );
      }
      return c.json(
        await x402OriginDueDiligence({
          serverUrl,
          seller,
          resources,
          txns,
          buyers,
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "x402_origin_due_diligence_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["x402-resource-compare"].path, async c => {
    const resources = c.req.query("resources") ?? "";
    const budgetUsdc = c.req.query("budget_usdc") || null;
    const urls = parseResourceList(resources);
    if (
      urls.length < 2 ||
      urls.length > 5 ||
      (budgetUsdc !== null && parseNonNegativeNumber(budgetUsdc) === null)
    ) {
      return c.json({ error: "invalid_x402_resource_compare_input" }, 400);
    }
    try {
      return c.json(
        await x402ResourceCompare({
          resources,
          budgetUsdc,
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "x402_resource_compare_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["agent-spend-route-plan"].path, async c => {
    const task = c.req.query("task") ?? "";
    const budgetUsdc = c.req.query("budget_usdc") ?? "0.02";
    const riskTolerance = c.req.query("risk_tolerance") ?? "medium";
    if (
      task.length < 3 ||
      task.length > 500 ||
      parseNonNegativeNumber(budgetUsdc) === null ||
      !["low", "medium", "high"].includes(riskTolerance)
    ) {
      return c.json({ error: "invalid_agent_spend_route_plan_input" }, 400);
    }
    return c.json(
      buildAgentSpendRoutePlan({
        task,
        budgetUsdc,
        riskTolerance,
      }),
    );
  });

  app.get(PRODUCTS_BY_ID["agent-buyer-identity-preflight"].path, async c => {
    const agentRole = c.req.query("agent_role") ?? "";
    const productCategory = c.req.query("product_category") ?? "";
    const purpose = c.req.query("purpose") ?? "";
    const priceUsdc = c.req.query("price_usdc") ?? "0";
    const dataSensitivity = c.req.query("data_sensitivity") ?? "medium";
    const agentStatus = c.req.query("agent_status") ?? "active";
    const approvalRef = c.req.query("approval_ref") ?? "";
    if (
      !/^[A-Za-z0-9_ -]{2,80}$/.test(agentRole) ||
      !/^[A-Za-z0-9_ -]{2,80}$/.test(productCategory) ||
      (purpose && !/^[A-Za-z0-9_ -]{2,80}$/.test(purpose)) ||
      parseNonNegativeNumber(priceUsdc) === null ||
      !["low", "medium", "high", "restricted"].includes(dataSensitivity) ||
      !["active", "paused", "disabled"].includes(agentStatus)
    ) {
      return c.json({ error: "invalid_agent_buyer_identity_preflight_input" }, 400);
    }
    return c.json(
      buildAgentBuyerIdentityPreflight({
        agentRole,
        productCategory,
        purpose,
        priceUsdc,
        dataSensitivity,
        agentStatus,
        approvalRef,
      }),
    );
  });

  app.get(PRODUCTS_BY_ID["agent-buyer-policy-kit"].path, async c => {
    const format = c.req.query("format") ?? "manifest";
    const buyerType = c.req.query("buyer_type") ?? "developer";
    if (
      !["manifest", "policy", "quickstart"].includes(format) ||
      !["developer", "startup", "enterprise"].includes(buyerType)
    ) {
      return c.json({ error: "invalid_agent_buyer_policy_kit_input" }, 400);
    }
    return c.json(buildAgentBuyerPolicyKitDelivery({ format, buyerType }));
  });

  app.get(PRODUCTS_BY_ID["agent-payment-risk-gateway"].path, async c => {
    const input = {
      request_id: c.req.query("request_id") ?? "",
      agent_id: c.req.query("agent_id") ?? "",
      session_id: c.req.query("session_id") ?? "",
      purpose: c.req.query("purpose") ?? "",
      pay_to: c.req.query("pay_to") ?? "",
      amount_usdc: c.req.query("amount_usdc") ?? "",
      invoice_id: c.req.query("invoice_id") ?? "",
      invoice_hash: c.req.query("invoice_hash") ?? "",
      nonce: c.req.query("nonce") ?? "",
      expires_at:
        c.req.query("expires_at") ??
        new Date(Date.now() + 5 * 60_000).toISOString(),
      max_single_usdc: c.req.query("max_single_usdc") ?? "0.10",
      human_review_above_usdc:
        c.req.query("human_review_above_usdc") ?? "0.09",
      allow_pay_to: c.req.query("allow_pay_to") ?? "",
      block_pay_to: c.req.query("block_pay_to") ?? "",
      risk: {
        score: c.req.query("risk_score") ?? "0",
        labels: c.req.query("risk_labels") ?? "",
        source: "query",
      },
    };
    const result = await buildAgentPaymentAuthorization({ input });
    return c.json({
      ...result,
      authorization_token: null,
      limitations: [
        "This x402 wrapper is for discoverable paid preflight; use POST /v1/payments/authorize with an authenticated signer policy before production signing.",
        "Private keys must remain in KMS, MPC, smart-account modules, or another owner-controlled signer.",
      ],
    });
  });

  app.get(PRODUCTS_BY_ID["agent-rpc-preflight"].path, async c => {
    const endpointUrl = c.req.query("endpoint_url") ?? "";
    const chain = c.req.query("chain") ?? "";
    const method = c.req.query("method") ?? "";
    const maxPriceUsdc = c.req.query("max_price_usdc") || null;
    const sessionBudgetUsdc = c.req.query("session_budget_usdc") || null;
    if (
      endpointUrl.length > 2048 ||
      !chain ||
      !/^[A-Za-z0-9:_ -]{2,80}$/.test(chain) ||
      !/^[A-Za-z0-9_.:-]{2,80}$/.test(method) ||
      (maxPriceUsdc !== null && parseNonNegativeNumber(maxPriceUsdc) === null) ||
      (sessionBudgetUsdc !== null && parseNonNegativeNumber(sessionBudgetUsdc) === null)
    ) {
      return c.json({ error: "invalid_agent_rpc_preflight_input" }, 400);
    }
    try {
      return c.json(
        buildAgentRpcPreflight({
          endpointUrl,
          chain,
          method,
          maxPriceUsdc,
          sessionBudgetUsdc,
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "agent_rpc_preflight_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["rpc-capability-probe"].path, async c => {
    const chain = c.req.query("chain") ?? "";
    const methods = c.req.query("methods") ?? "";
    const historicalBlock = c.req.query("historical_block") || null;
    const requiresTrace = c.req.query("requires_trace") ?? "false";
    const requiresWebsocket = c.req.query("requires_websocket") ?? "false";
    if (
      !/^[A-Za-z0-9:_ -]{2,80}$/.test(chain) ||
      !/^[A-Za-z0-9_.,:-]{2,400}$/.test(methods) ||
      (historicalBlock !== null && parseNonNegativeInteger(historicalBlock) === null) ||
      !/^(?:true|false)$/.test(requiresTrace) ||
      !/^(?:true|false)$/.test(requiresWebsocket)
    ) {
      return c.json({ error: "invalid_rpc_capability_probe_input" }, 400);
    }
    return c.json(
      buildRpcCapabilityProbe({
        chain,
        methods,
        historicalBlock,
        requiresTrace: parseBooleanString(requiresTrace),
        requiresWebsocket: parseBooleanString(requiresWebsocket),
      }),
    );
  });

  app.get(PRODUCTS_BY_ID["agent-chain-data-route-plan"].path, async c => {
    const task = c.req.query("task") ?? "";
    const chain = c.req.query("chain") ?? "";
    const dataNeed = c.req.query("data_need") ?? "mixed";
    const budgetUsdc = c.req.query("budget_usdc") ?? "0.02";
    const riskTolerance = c.req.query("risk_tolerance") ?? "medium";
    if (
      task.length < 3 ||
      task.length > 500 ||
      !/^[A-Za-z0-9:_ -]{2,80}$/.test(chain) ||
      !["rpc", "logs", "storage", "trace", "indexed", "sql", "fork", "mixed"].includes(dataNeed) ||
      parseNonNegativeNumber(budgetUsdc) === null ||
      !["low", "medium", "high"].includes(riskTolerance)
    ) {
      return c.json({ error: "invalid_agent_chain_data_route_plan_input" }, 400);
    }
    return c.json(
      buildAgentChainDataRoutePlan({
        task,
        chain,
        dataNeed,
        budgetUsdc,
        riskTolerance,
      }),
    );
  });

  app.get(PRODUCTS_BY_ID["indexed-chain-query-preflight"].path, async c => {
    const chain = c.req.query("chain") ?? "";
    const queryType = c.req.query("query_type") ?? "";
    const estimatedRows = c.req.query("estimated_rows") || null;
    const maxPriceUsdc = c.req.query("max_price_usdc") || null;
    if (
      !/^[A-Za-z0-9:_ -]{2,80}$/.test(chain) ||
      !["schema", "event_logs", "transfers", "balances", "transactions", "sql", "protocol_timeline"].includes(queryType) ||
      (estimatedRows !== null && parseNonNegativeInteger(estimatedRows) === null) ||
      (maxPriceUsdc !== null && parseNonNegativeNumber(maxPriceUsdc) === null)
    ) {
      return c.json({ error: "invalid_indexed_chain_query_preflight_input" }, 400);
    }
    return c.json(
      buildIndexedChainQueryPreflight({
        chain,
        queryType,
        estimatedRows,
        maxPriceUsdc,
      }),
    );
  });

  app.get(PRODUCTS_BY_ID["x402-rpc-payment-guard"].path, async c => {
    const requestId = c.req.query("request_id") ?? "";
    const endpointUrl = c.req.query("endpoint_url") ?? "";
    const chain = c.req.query("chain") ?? "";
    const method = c.req.query("method") ?? "";
    const payTo = c.req.query("pay_to") || null;
    const amountUsdc = c.req.query("amount_usdc") ?? "";
    const maxSingleUsdc = c.req.query("max_single_usdc") ?? "0.01";
    const sessionBudgetUsdc = c.req.query("session_budget_usdc") ?? "1.00";
    if (
      !/^[A-Za-z0-9._:-]{1,128}$/.test(requestId) ||
      endpointUrl.length > 2048 ||
      !/^[A-Za-z0-9:_ -]{2,80}$/.test(chain) ||
      !/^[A-Za-z0-9_.:-]{2,80}$/.test(method) ||
      (payTo !== null && !ADDRESS_PATTERN.test(payTo)) ||
      parseNonNegativeNumber(amountUsdc) === null ||
      parseNonNegativeNumber(maxSingleUsdc) === null ||
      parseNonNegativeNumber(sessionBudgetUsdc) === null
    ) {
      return c.json({ error: "invalid_x402_rpc_payment_guard_input" }, 400);
    }
    try {
      return c.json(
        buildX402RpcPaymentGuard({
          requestId,
          endpointUrl,
          chain,
          method,
          payTo,
          amountUsdc,
          maxSingleUsdc,
          sessionBudgetUsdc,
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "x402_rpc_payment_guard_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  for (const productId of [
    "address-risk",
    "token-risk",
    "transaction-decode-risk",
    "wallet-dossier",
    "safe-transaction-review",
    "swap-preflight",
    "stablecoin-health",
    "policy-decide",
  ]) {
    app.get(PRODUCTS_BY_ID[productId].path, c => {
      const product = PRODUCTS_BY_ID[productId];
      const input = {};
      for (const name of Object.keys(product.inputSchema.properties)) {
        input[name] = c.req.query(name) ?? product.input[name] ?? "";
      }
      for (const required of product.inputSchema.required ?? []) {
        if (!input[required]) {
          return c.json(
            { error: `missing_${productId.replaceAll("-", "_")}_${required}` },
            400,
          );
        }
      }
      return c.json(buildAgentRiskUtility({ productId, input }));
    });
  }

  for (const productId of SUMSUB_EVIDENCE_PRODUCT_IDS) {
    app.get(PRODUCTS_BY_ID[productId].path, c => {
      const product = PRODUCTS_BY_ID[productId];
      const input = {};
      for (const name of Object.keys(product.inputSchema.properties)) {
        input[name] = c.req.query(name) ?? product.input[name] ?? "";
      }
      return c.json(buildSumsubEvidenceServiceResponse({ productId, input }));
    });
  }

  app.get(PRODUCTS_BY_ID["base-token-exit-risk"].path, async c => {
    const token = c.req.query("token") ?? "";
    if (!ADDRESS_PATTERN.test(token)) {
      return c.json({ error: "invalid_token_exit_risk_input" }, 400);
    }
    try {
      return c.json(await tokenExitRisk(token));
    } catch (error) {
      return c.json(
        {
          error: "upstream_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["bcs-address-labels"].path, async c => {
    const chain = (c.req.query("chain") ?? "").toLowerCase();
    const address = c.req.query("address") ?? "";
    const sources = c.req.query("sources") || null;
    const refresh = c.req.query("refresh") || null;
    if (
      !validateBcsChain(chain) ||
      !validateBcsAddress(address) ||
      (sources !== null && !/^[A-Za-z0-9,_-]{1,80}$/.test(sources)) ||
      (refresh !== null && !/^(?:true|false)$/.test(refresh))
    ) {
      return c.json({ error: "invalid_bcs_labels_input" }, 400);
    }
    try {
      return c.json(
        await bcsGatewayRequest({
          product: "bcs-address-labels",
          apiKey: c.env?.BCS_API_KEY,
          upstreamPath: "/v1/labels",
          query: { chain, address, sources, refresh },
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "bcs_labels_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["bcs-assets"].path, async c => {
    const chain = (c.req.query("chain") ?? "").toLowerCase();
    if (!validateBcsChain(chain)) {
      return c.json({ error: "invalid_bcs_assets_chain" }, 400);
    }
    try {
      return c.json(
        await bcsGatewayRequest({
          product: "bcs-assets",
          apiKey: c.env?.BCS_API_KEY,
          upstreamPath: "/v1/assets",
          query: { chain },
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "bcs_assets_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["bcs-chains"].path, async c => {
    try {
      return c.json(
        await bcsGatewayRequest({
          product: "bcs-chains",
          apiKey: c.env?.BCS_API_KEY,
          upstreamPath: "/v1/chains",
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "bcs_chains_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["bcs-token-registry"].path, async c => {
    try {
      return c.json(
        await bcsGatewayRequest({
          product: "bcs-token-registry",
          apiKey: c.env?.BCS_API_KEY,
          upstreamPath: "/v1/registry",
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "bcs_registry_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["bcs-asset-resolve"].path, async c => {
    const blockchain = (c.req.query("blockchain") ?? "").toLowerCase();
    const symbols = parseCsvList(
      c.req.query("symbols") ?? "",
      /^[A-Za-z0-9._-]{1,40}$/,
    );
    const contracts = parseCsvList(
      c.req.query("contracts") ?? "",
      /^[A-Za-z0-9:._-]{3,128}$/,
    );
    if (
      !validateBcsChain(blockchain) ||
      (symbols.length === 0 && contracts.length === 0)
    ) {
      return c.json({ error: "invalid_bcs_resolve_input" }, 400);
    }
    try {
      return c.json(
        await bcsGatewayRequest({
          product: "bcs-asset-resolve",
          apiKey: c.env?.BCS_API_KEY,
          method: "POST",
          upstreamPath: "/v1/resolve",
          body: {
            blockchain,
            ...(symbols.length ? { symbols } : {}),
            ...(contracts.length ? { contracts } : {}),
          },
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "bcs_resolve_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["bcs-address-risk-score"].path, async c => {
    const blockchain = (c.req.query("blockchain") ?? "").toLowerCase();
    const address = c.req.query("address") ?? "";
    const symbols = parseCsvList(
      c.req.query("symbols") ?? "",
      /^[A-Za-z0-9._-]{1,40}$/,
    );
    const contracts = parseCsvList(
      c.req.query("contracts") ?? "",
      /^[A-Za-z0-9:._-]{3,128}$/,
    );
    if (!["ethereum", "tron"].includes(blockchain) || !validateBcsAddress(address)) {
      return c.json({ error: "invalid_bcs_address_risk_input" }, 400);
    }
    try {
      return c.json(
        await bcsGatewayRequest({
          product: "bcs-address-risk-score",
          apiKey: c.env?.BCS_API_KEY,
          method: "POST",
          upstreamPath: "/v1/address-risk",
          body: {
            blockchain,
            address,
            ...(symbols.length ? { symbols } : {}),
            ...(contracts.length ? { contracts } : {}),
          },
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "bcs_address_risk_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["bcs-address-classify"].path, async c => {
    const blockchain = (c.req.query("blockchain") ?? "tron").toLowerCase();
    const addresses = parseCsvList(
      c.req.query("addresses") ?? "",
      /^[A-Za-z0-9:._-]{3,128}$/,
    );
    if (
      !["ethereum", "tron", "bitcoin"].includes(blockchain) ||
      addresses.length < 1 ||
      addresses.length > 100
    ) {
      return c.json({ error: "invalid_bcs_address_classify_input" }, 400);
    }
    try {
      return c.json(
        await bcsGatewayRequest({
          product: "bcs-address-classify",
          apiKey: c.env?.BCS_API_KEY,
          method: "POST",
          upstreamPath: "/v1/address-classify",
          body: { blockchain, addresses },
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "bcs_address_classify_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["bcs-wallet-overview"].path, async c => {
    const blockchain = (c.req.query("blockchain") ?? "").toLowerCase();
    const address = c.req.query("address") ?? "";
    const symbols = parseCsvList(
      c.req.query("symbols") ?? "",
      /^[A-Za-z0-9._-]{1,40}$/,
    );
    const contracts = parseCsvList(
      c.req.query("contracts") ?? "",
      /^[A-Za-z0-9:._-]{3,128}$/,
    );
    const outputAsset = c.req.query("output_asset") || null;
    if (
      !validateBcsChain(blockchain) ||
      !validateBcsAddress(address) ||
      (outputAsset !== null && !/^[A-Za-z0-9._-]{1,40}$/.test(outputAsset))
    ) {
      return c.json({ error: "invalid_bcs_wallet_overview_input" }, 400);
    }
    try {
      return c.json(
        await bcsGatewayRequest({
          product: "bcs-wallet-overview",
          apiKey: c.env?.BCS_API_KEY,
          method: "POST",
          upstreamPath: "/v1/wallet-overview",
          body: {
            blockchain,
            address,
            ...(symbols.length ? { symbols } : {}),
            ...(contracts.length ? { contracts } : {}),
            ...(outputAsset ? { output_asset: outputAsset } : {}),
          },
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "bcs_wallet_overview_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["bcs-fund-trace"].path, async c => {
    const blockchain = (c.req.query("blockchain") ?? "").toLowerCase();
    const address = c.req.query("address") ?? "";
    const direction = c.req.query("direction") ?? "out";
    const depth = Number(c.req.query("depth") ?? "2");
    const limit = Number(c.req.query("limit") ?? "50");
    const symbols = parseCsvList(
      c.req.query("symbols") ?? "",
      /^[A-Za-z0-9._-]{1,40}$/,
    );
    const minValue = c.req.query("min_value") || null;
    if (
      !["ethereum", "tron", "bitcoin"].includes(blockchain) ||
      !validateBcsAddress(address) ||
      !["in", "out", "both"].includes(direction) ||
      !Number.isInteger(depth) ||
      depth < 1 ||
      depth > 5 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 500 ||
      (minValue !== null && !/^[0-9]+(?:\.[0-9]+)?$/.test(minValue))
    ) {
      return c.json({ error: "invalid_bcs_trace_input" }, 400);
    }
    const filterCriterias =
      symbols.length || minValue
        ? [
            {
              ...(symbols.length ? { symbols } : {}),
              ...(minValue ? { min_value: minValue } : {}),
            },
          ]
        : undefined;
    try {
      return c.json(
        await bcsGatewayRequest({
          product: "bcs-fund-trace",
          apiKey: c.env?.BCS_API_KEY,
          method: "POST",
          upstreamPath: "/v1/trace",
          body: {
            blockchain,
            address,
            track_setting: { direction, depth, limit },
            ...(filterCriterias ? { filter_criterias: filterCriterias } : {}),
          },
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "bcs_trace_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["bcs-cross-chain-track"].path, async c => {
    const txhash = c.req.query("txhash") ?? "";
    const label = (c.req.query("label") ?? "").toLowerCase();
    if (
      !/^[A-Za-z0-9:_-]{16,160}$/.test(txhash) ||
      !/^[A-Za-z0-9_-]{2,40}$/.test(label)
    ) {
      return c.json({ error: "invalid_bcs_cross_chain_input" }, 400);
    }
    try {
      return c.json(
        await bcsGatewayRequest({
          product: "bcs-cross-chain-track",
          apiKey: c.env?.BCS_API_KEY,
          upstreamPath: "/v1/cross-chain",
          query: { txhash, label },
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "bcs_cross_chain_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.post(PRODUCTS[25].path, async c => {
    let input;
    try {
      input = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json_body" }, 400);
    }
    const targetUrl = String(input.url ?? "");
    const sessionId = String(input.session_id ?? "");
    const requestId = String(input.request_id ?? "");
    try {
      validatePublicUrl(targetUrl);
    } catch (error) {
      return c.json(
        {
          error: "invalid_payment_guard_url",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
    if (
      !/^[A-Za-z0-9._:-]{1,96}$/.test(sessionId) ||
      !/^[A-Za-z0-9._:-]{1,128}$/.test(requestId)
    ) {
      return c.json({ error: "invalid_payment_guard_identity" }, 400);
    }
    const to = input.to ? String(input.to) : null;
    const data = input.data ? String(input.data) : null;
    const value = String(input.value ?? "0");
    if (
      (to !== null && !ADDRESS_PATTERN.test(to)) ||
      (data !== null &&
        (!/^0x(?:[a-fA-F0-9]{2})*$/.test(data) || data.length > 8194)) ||
      ((to === null) !== (data === null)) ||
      !/^[0-9]+$/.test(value)
    ) {
      return c.json({ error: "invalid_payment_guard_transaction" }, 400);
    }
    try {
      let profile = null;
      let policy;
      if (input.profile_id || input.agent_token) {
        profile = await loadPaymentGuardProfile(
          c.env?.GUARD_DB,
          String(input.profile_id ?? ""),
          String(input.agent_token ?? ""),
          "agent",
        );
        policy = profile.policy;
      } else {
        policy = paymentGuardPolicyFromInput(input);
      }
      return c.json(
        await paymentGuardEvaluate({
          targetUrl,
          sessionId,
          requestId,
          policy,
          profile,
          to,
          data,
          value,
          db: c.env?.GUARD_DB ?? null,
          signingSecret: c.env?.GUARD_SIGNING_SECRET ?? null,
          toolId: input.tool_id ? String(input.tool_id) : null,
          purpose: input.purpose ? String(input.purpose) : null,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return c.json(
        {
          error: message.startsWith("policy_")
            ? "payment_guard_policy_auth_failed"
            : "payment_guard_failed",
          message,
        },
        message.startsWith("policy_") ? 403 : 502,
      );
    }
  });

  app.post(INTENT_VERIFY_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(buildVerifiableIntent({ input }));
    } catch {
      return c.json({ error: "invalid_json_body" }, 400);
    }
  });

  app.post(PAYMENT_PREFLIGHT_PATH, async c => {
    try {
      const input = await c.req.json();
      const result = await buildAgentPaymentAuthorization({ input });
      return c.json({ ...result, authorization_token: null });
    } catch (error) {
      return c.json(
        {
          error: "payment_preflight_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.post(PAYMENT_AUTHORIZE_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await buildAgentPaymentAuthorization({
          input,
          signingSecret: c.env?.GUARD_SIGNING_SECRET ?? null,
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_authorize_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.post(PAYMENT_GUARD_LIFECYCLE_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await updatePaymentGuardReservation({
          db: c.env?.GUARD_DB,
          action: String(input.action ?? ""),
          decisionToken: String(input.decision_token ?? ""),
          txHash: input.tx_hash ? String(input.tx_hash) : null,
          signingSecret: c.env?.GUARD_SIGNING_SECRET,
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_lifecycle_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.post(PAYMENT_GUARD_POLICY_MANAGE_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await managePaymentGuardProfile(c.env?.GUARD_DB, input),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_policy_management_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        403,
      );
    }
  });

  app.post(PAYMENT_GUARD_STATUS_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await paymentGuardStatus(
          c.env?.GUARD_DB,
          String(input.profile_id ?? ""),
          String(input.owner_token ?? ""),
        ),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_status_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        403,
      );
    }
  });

  app.post(PAYMENT_GUARD_APPROVAL_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await decidePaymentGuardApproval({
          db: c.env?.GUARD_DB,
          profileId: String(input.profile_id ?? ""),
          ownerToken: String(input.owner_token ?? ""),
          requestId: String(input.request_id ?? ""),
          action: String(input.action ?? ""),
          note: input.note ?? null,
          signingSecret: c.env?.GUARD_SIGNING_SECRET,
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_approval_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.post(PAYMENT_GUARD_DELIVERY_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await reportPaymentGuardDelivery({
          db: c.env?.GUARD_DB,
          decisionToken: String(input.decision_token ?? ""),
          status: String(input.status ?? ""),
          httpStatus: input.http_status ?? null,
          contentType: input.content_type ?? null,
          latencyMs: input.latency_ms ?? null,
          contentHash: input.content_sha256 ?? null,
          signingSecret: c.env?.GUARD_SIGNING_SECRET,
        }),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_delivery_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.post(PAYMENT_GUARD_WEBHOOK_PATH, async c => {
    try {
      const input = await c.req.json();
      return c.json(
        await managePaymentGuardWebhook(
          c.env?.GUARD_DB,
          input,
          c.env?.GUARD_SIGNING_SECRET,
        ),
      );
    } catch (error) {
      return c.json(
        {
          error: "payment_guard_webhook_failed",
          message: error instanceof Error ? error.message : String(error),
        },
        400,
      );
    }
  });

  app.post(PAYMENT_GUARD_MCP_PATH, async c => {
    let request;
    try {
      request = await c.req.json();
    } catch {
      return c.json(
        { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
        400,
      );
    }
    if (request.method === "initialize") {
      return c.json({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "signgate-mcp", version: "2.0.0" },
        },
      });
    }
    if (request.method === "tools/list") {
      return c.json({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: [
            {
              name: "evaluate_payment",
              description:
                "Evaluate whether an autonomous agent may pay, call a signer, or buy an x402 resource. This tool returns a SignGate decision and never signs or moves funds.",
              inputSchema: {
                type: "object",
                properties: {
                  agent: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      role: { type: "string" },
                    },
                    required: ["id", "role"],
                  },
                  buyer: {
                    type: "object",
                    properties: { id: { type: "string" } },
                    required: ["id"],
                  },
                  mandate: { type: ["object", "null"] },
                  merchant: { type: "object" },
                  resource: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      url: { type: "string" },
                      category: { type: "string" },
                    },
                    required: ["category"],
                  },
                  requested_amount: { type: ["string", "number"] },
                  asset: { type: "string" },
                  network: { type: "string" },
                  payment_scheme: { type: "string" },
                  evidence_refs: { type: "array" },
                },
                required: [
                  "agent",
                  "buyer",
                  "mandate",
                  "merchant",
                  "resource",
                  "requested_amount",
                ],
              },
            },
          ],
        },
      });
    }
    if (request.method === "tools/call") {
      const name = request.params?.name;
      const args = request.params?.arguments ?? {};
      if (name === "evaluate_payment") {
        try {
          const result = buildAgenticCommercePreflight({
            buyer_id: args.buyer?.id,
            agent_id: args.agent?.id,
            agent_role: args.agent?.role,
            action: args.resource?.category ?? "payment_execution",
            product_category: args.resource?.category,
            amount_usdc: args.requested_amount,
            asset: args.asset ?? args.resource?.asset,
            chain: args.network ?? args.resource?.network,
            payment_scheme: args.payment_scheme ?? args.resource?.payment_scheme ?? "x402",
            payment: {
              action: args.resource?.category ?? "payment_execution",
              product_category: args.resource?.category,
              amount_usdc: args.requested_amount,
              asset: args.asset ?? args.resource?.asset,
              chain: args.network ?? args.resource?.network,
              scheme: args.payment_scheme ?? args.resource?.payment_scheme ?? "x402",
              resource_url: args.resource?.url,
            },
            mandate: args.mandate,
            merchant: args.merchant,
            evidence_refs: args.evidence_refs ?? [],
          });
          return c.json({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              content: [{ type: "text", text: JSON.stringify(result) }],
            },
          });
        } catch (error) {
          return c.json({
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32001,
              message: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }
      return c.json({
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32602, message: "Unknown tool" },
      });
    }
    return c.json({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32601, message: "Method not found" },
    });
  });

  app.get(PRODUCTS_BY_ID["public-wallet-risk-lookup"].path, async c => {
    const chain = c.req.query("chain") ?? "ETH";
    const address = c.req.query("address") ?? "";
    if (chain.toUpperCase() !== "ETH" || !ADDRESS_PATTERN.test(address)) {
      return c.json({ error: "invalid_address_risk_lookup_input" }, 400);
    }
    try {
      const result = await addressRiskLookup(c.env, chain, address);
      if (result.error) return c.json(result, 400);
      return c.json(result);
    } catch (error) {
      return c.json(
        {
          error: "address_risk_lookup_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["public-wallet-risk-snapshot"].path, async c => {
    try {
      return await addressRiskFileResponse(
        c.env,
        ADDRESS_RISK_SNAPSHOT_KEY,
        "address_labels_snapshot.jsonl",
      );
    } catch (error) {
      return c.json(
        {
          error: "address_risk_snapshot_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["public-wallet-risk-sample"].path, async c => {
    const limit = c.req.query("limit") ?? "5";
    if (!/^[1-9]$|^10$/.test(limit)) {
      return c.json({ error: "invalid_address_risk_sample_limit" }, 400);
    }
    try {
      return c.json(await addressRiskSample(c.env, new URL(c.req.url).origin, limit));
    } catch (error) {
      return c.json(
        {
          error: "address_risk_sample_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  app.get(PRODUCTS_BY_ID["public-wallet-risk-delta"].path, async c => {
    const batchKey = c.req.query("batch_key") ?? ADDRESS_RISK_DEFAULT_BATCH;
    if (!/^20[0-9]{2}-W[0-9]{2}$/.test(batchKey)) {
      return c.json({ error: "invalid_address_risk_batch_key" }, 400);
    }
    try {
      return await addressRiskFileResponse(
        c.env,
        `${ADDRESS_RISK_DELTA_PREFIX}${batchKey}`,
        `address_labels_delta_${batchKey}.jsonl`,
      );
    } catch (error) {
      return c.json(
        {
          error: "address_risk_delta_unavailable",
          message: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }
  });

  return app;
}

const ADMIN_SESSION_COOKIE = "__Host-signgate_admin";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

function cookieValue(request, name) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return parts.join("=");
  }
  return "";
}

async function signAdminSession(secret, now = new Date()) {
  const payload = {
    aud: "signgate-admin",
    iat: now.toISOString(),
    exp: new Date(now.getTime() + ADMIN_SESSION_TTL_SECONDS * 1000).toISOString(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(await hmacSha256(encodedPayload, secret));
  return `${encodedPayload}.${signature}`;
}

async function verifyAdminSession(value, secret) {
  if (!secret || !value?.includes(".")) return false;
  const [encodedPayload, encodedSignature] = value.split(".");
  const expected = await hmacSha256(encodedPayload, secret);
  const supplied = base64UrlDecode(encodedSignature);
  if (
    expected.length !== supplied.length ||
    !expected.every((byte, index) => byte === supplied[index])
  ) {
    return false;
  }
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(encodedPayload)),
    );
    return (
      payload.aud === "signgate-admin" &&
      Date.parse(payload.exp) > Date.now()
    );
  } catch {
    return false;
  }
}

async function adminAuthorized(request, env) {
  const token = env?.ADMIN_DASHBOARD_TOKEN_V2;
  if (!token) return false;
  const url = new URL(request.url);
  const bearer = request.headers.get("authorization") ?? "";
  const supplied = bearer.toLowerCase().startsWith("bearer ")
    ? bearer.slice(7)
    : url.searchParams.get("token") ?? "";
  if (supplied === token) return true;
  return verifyAdminSession(cookieValue(request, ADMIN_SESSION_COOKIE), token);
}

function adminSecurityHeaders(extra = {}) {
  return {
    "cache-control": "no-store",
    "content-security-policy":
      "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    "x-robots-tag": "noindex, nofollow",
    "referrer-policy": "no-referrer",
    ...extra,
  };
}

function adminLoginHtml(error = "") {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SignGate Admin Login</title>
<style>
body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f7f7f5;color:#171717}
main{max-width:420px;margin:12vh auto;padding:0 20px}
form{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px}
label{display:block;font-size:13px;font-weight:650;margin-bottom:8px}
input{width:100%;box-sizing:border-box;border:1px solid #bbb;border-radius:6px;padding:10px;font:inherit}
button{margin-top:14px;border:0;border-radius:6px;background:#171717;color:#fff;padding:10px 14px;font:inherit;cursor:pointer}
.error{color:#a40000;font-size:13px;margin:0 0 12px}
.muted{color:#666;font-size:13px}
</style>
</head>
<body><main>
<form method="post" action="/admin/login" autocomplete="off">
<h1>SignGate Admin</h1>
${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
<label for="token">Admin token</label>
<input id="token" name="token" type="password" required autofocus>
<button type="submit">Sign in</button>
<p class="muted">Token is submitted in the request body and exchanged for a short-lived HttpOnly session cookie.</p>
</form>
</main></body></html>`;
}

async function adminLoginResponse(request, env) {
  const token = env?.ADMIN_DASHBOARD_TOKEN_V2;
  if (!token) {
    return json({ error: "admin_token_not_configured" }, 503, adminSecurityHeaders());
  }
  let supplied = "";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      supplied = String((await request.json()).token ?? "");
    } catch {
      supplied = "";
    }
  } else {
    const form = await request.formData();
    supplied = String(form.get("token") ?? "");
  }
  if (supplied !== token) {
    return new Response(adminLoginHtml("Invalid admin token."), {
      status: 403,
      headers: adminSecurityHeaders({ "content-type": "text/html; charset=utf-8" }),
    });
  }
  const session = await signAdminSession(token);
  return new Response(null, {
    status: 303,
    headers: adminSecurityHeaders({
      location: "/admin/purchases",
      "set-cookie": `${ADMIN_SESSION_COOKIE}=${session}; Max-Age=${ADMIN_SESSION_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`,
    }),
  });
}

function purchaseDashboardFilters(searchParams = new URLSearchParams()) {
  return {
    from: searchParams.get("from") || null,
    to: searchParams.get("to") || null,
    operation: searchParams.get("operation") || null,
    pricing_version: searchParams.get("pricing_version") || null,
    buyer: searchParams.get("buyer") || null,
    payment_status: searchParams.get("payment_status") || null,
    decision: searchParams.get("decision") || null,
    internal_only: searchParams.get("internal_only") === "true",
    external_only: searchParams.get("external_only") === "true",
  };
}

function purchaseWhereClause(filters, baseClause) {
  const clauses = [baseClause];
  const binds = [];
  if (filters.from) {
    clauses.push("COALESCE(purchased_at, created_at) >= ?");
    binds.push(filters.from);
  }
  if (filters.to) {
    clauses.push("COALESCE(purchased_at, created_at) <= ?");
    binds.push(filters.to);
  }
  if (filters.operation) {
    clauses.push("COALESCE(operation_id, product_id) = ?");
    binds.push(filters.operation);
  }
  if (filters.pricing_version) {
    clauses.push("pricing_version = ?");
    binds.push(filters.pricing_version);
  }
  if (filters.buyer) {
    clauses.push("(buyer_id_hash = ? OR payer_address = ?)");
    binds.push(filters.buyer, filters.buyer);
  }
  if (filters.payment_status) {
    clauses.push("status = ?");
    binds.push(Number(filters.payment_status));
  }
  if (filters.decision) {
    clauses.push("decision = ?");
    binds.push(filters.decision);
  }
  if (filters.internal_only) {
    clauses.push("internal_test IS NOT NULL AND internal_test != 'unknown'");
  }
  if (filters.external_only) {
    clauses.push("(internal_test IS NULL OR internal_test = 'unknown')");
  }
  return { where: clauses.join(" AND "), binds };
}

function bindAll(statement, values) {
  return values.length ? statement.bind(...values) : statement;
}

async function purchaseDashboardData(db, searchParams = new URLSearchParams()) {
  if (!db) throw new Error("purchase_db_unavailable");
  const filters = purchaseDashboardFilters(searchParams);
  const payablePurchaseWhere =
    "payment_header_hash IS NOT NULL AND method NOT IN ('HEAD', 'OPTIONS')";
  const probeWhere =
    "payment_header_hash IS NULL OR method IN ('HEAD', 'OPTIONS')";
  const payable = purchaseWhereClause(filters, payablePurchaseWhere);
  const probes = purchaseWhereClause(filters, probeWhere);
  const [
    totals,
    routeProbes,
    mostPurchased,
    highestRevenue,
    byPricingVersion,
    workflows,
    buyerAttribution,
    buyerCohorts,
    transactionConversion,
    recent,
    recentProbes,
    legacyAggregates,
  ] = await Promise.all([
    bindAll(
      db.prepare(
        `SELECT
           COUNT(*) AS purchase_count,
           SUM(CASE WHEN internal_test IS NULL OR internal_test = 'unknown' THEN 1 ELSE 0 END) AS external_purchase_count,
           SUM(CASE WHEN internal_test IS NOT NULL AND internal_test != 'unknown' THEN 1 ELSE 0 END) AS internal_purchase_count,
           COUNT(DISTINCT buyer_id_hash) AS unique_buyers,
           COALESCE(SUM(CAST(COALESCE(paid_amount, price_usdc) AS REAL)), 0) AS gross_usd,
           COALESCE(AVG(CAST(COALESCE(paid_amount, price_usdc) AS REAL)), 0) AS avg_purchase_usd,
           MAX(COALESCE(purchased_at, created_at)) AS last_seen_at
         FROM x402_purchase_events
         WHERE ${payable.where}`,
      ),
      payable.binds,
    ).first(),
    bindAll(
      db.prepare(
        `SELECT
           COUNT(*) AS probe_count,
           COALESCE(SUM(price_usdc), 0) AS nominal_price_usd,
           MAX(COALESCE(purchased_at, created_at)) AS last_seen_at
         FROM x402_purchase_events
         WHERE ${probes.where}`,
      ),
      probes.binds,
    ).first(),
    bindAll(
      db.prepare(
        `SELECT
           COALESCE(operation_id, product_id) AS operation,
           path,
           COUNT(*) AS purchase_count,
           COUNT(DISTINCT buyer_id_hash) AS unique_buyers,
           COALESCE(SUM(CAST(COALESCE(paid_amount, price_usdc) AS REAL)), 0) AS revenue,
           COALESCE(AVG(CAST(COALESCE(paid_amount, price_usdc) AS REAL)), 0) AS average_paid_amount,
           MAX(COALESCE(purchased_at, created_at)) AS latest_purchase,
           SUM(CASE WHEN internal_test IS NOT NULL AND internal_test != 'unknown' THEN 1 ELSE 0 END) AS internal_test_count
         FROM x402_purchase_events
         WHERE ${payable.where}
         GROUP BY COALESCE(operation_id, product_id), path
         ORDER BY purchase_count DESC, revenue DESC, latest_purchase DESC
         LIMIT 100`,
      ),
      payable.binds,
    ).all(),
    bindAll(
      db.prepare(
        `SELECT
           COALESCE(operation_id, product_id) AS operation,
           COUNT(*) AS purchase_count,
           COUNT(DISTINCT buyer_id_hash) AS unique_buyers,
           COALESCE(SUM(CAST(COALESCE(paid_amount, price_usdc) AS REAL)), 0) AS revenue,
           COALESCE(AVG(CAST(COALESCE(paid_amount, price_usdc) AS REAL)), 0) AS average_paid_amount,
           MAX(COALESCE(purchased_at, created_at)) AS latest_purchase,
           SUM(CASE WHEN internal_test IS NOT NULL AND internal_test != 'unknown' THEN 1 ELSE 0 END) AS internal_test_count
         FROM x402_purchase_events
         WHERE ${payable.where}
         GROUP BY COALESCE(operation_id, product_id)
         ORDER BY revenue DESC, purchase_count DESC, latest_purchase DESC
         LIMIT 50`,
      ),
      payable.binds,
    ).all(),
    bindAll(
      db.prepare(
        `SELECT
           COALESCE(pricing_version, 'legacy') AS pricing_version,
           COUNT(*) AS purchase_count,
           COALESCE(SUM(CAST(COALESCE(paid_amount, price_usdc) AS REAL)), 0) AS revenue
         FROM x402_purchase_events
         WHERE ${payable.where}
         GROUP BY COALESCE(pricing_version, 'legacy')
         ORDER BY purchase_count DESC, revenue DESC`,
      ),
      payable.binds,
    ).all(),
    bindAll(
      db.prepare(
        `SELECT
           sequence_id,
           GROUP_CONCAT(COALESCE(operation_id, product_id), ' -> ') AS sequence,
           COUNT(*) AS purchase_count,
           COUNT(DISTINCT buyer_id_hash) AS unique_buyers,
           COALESCE(SUM(CAST(COALESCE(paid_amount, price_usdc) AS REAL)), 0) AS separate_purchase_total,
           SUM(CASE WHEN COALESCE(operation_id, product_id) = 'agent-capability-security-preflight' THEN 1 ELSE 0 END) AS bundle_purchase_count
         FROM x402_purchase_events
         WHERE ${payable.where} AND sequence_id IS NOT NULL
         GROUP BY sequence_id
         HAVING COUNT(*) > 1
         ORDER BY purchase_count DESC, separate_purchase_total DESC
         LIMIT 50`,
      ),
      payable.binds,
    ).all(),
    bindAll(
      db.prepare(
        `SELECT
           COALESCE(payer_address, 'unknown') AS payer_address,
           CASE WHEN payer_address IS NULL THEN NULL ELSE substr(payer_address, 1, 6) || '...' || substr(payer_address, -4) END AS payer_address_short,
           buyer_id_hash,
           user_agent_hash,
           country,
           COUNT(*) AS purchase_count,
           COALESCE(SUM(CAST(COALESCE(paid_amount, price_usdc) AS REAL)), 0) AS revenue,
           MIN(COALESCE(purchased_at, created_at)) AS first_seen_at,
           MAX(COALESCE(purchased_at, created_at)) AS last_seen_at,
           GROUP_CONCAT(DISTINCT COALESCE(operation_id, product_id)) AS operations,
           GROUP_CONCAT(DISTINCT sequence_id) AS sequence_ids
         FROM x402_purchase_events
         WHERE ${payable.where}
         GROUP BY COALESCE(payer_address, buyer_id_hash, user_agent_hash, 'unknown'), buyer_id_hash, user_agent_hash, country
         ORDER BY revenue DESC, purchase_count DESC, last_seen_at DESC
         LIMIT 50`,
      ),
      payable.binds,
    ).all(),
    bindAll(
      db.prepare(
        `WITH buyer_firsts AS (
           SELECT
             COALESCE(buyer_id_hash, payer_address, user_agent_hash, 'unknown') AS buyer_key,
             MIN(COALESCE(purchased_at, created_at)) AS first_seen_at,
             MAX(COALESCE(purchased_at, created_at)) AS last_seen_at,
             COUNT(*) AS purchase_count,
             COALESCE(SUM(CAST(COALESCE(paid_amount, price_usdc) AS REAL)), 0) AS revenue
           FROM x402_purchase_events
           WHERE ${payable.where}
           GROUP BY COALESCE(buyer_id_hash, payer_address, user_agent_hash, 'unknown')
         )
         SELECT
           substr(first_seen_at, 1, 10) AS cohort_date,
           COUNT(*) AS buyer_count,
           SUM(CASE WHEN purchase_count > 1 THEN 1 ELSE 0 END) AS repeat_buyers,
           SUM(purchase_count) AS purchase_count,
           COALESCE(SUM(revenue), 0) AS revenue,
           MAX(last_seen_at) AS latest_purchase
         FROM buyer_firsts
         GROUP BY substr(first_seen_at, 1, 10)
         ORDER BY cohort_date DESC
         LIMIT 30`,
      ),
      payable.binds,
    ).all(),
    bindAll(
      db.prepare(
        `SELECT
           sequence_id,
           COUNT(*) AS purchase_count,
           MIN(COALESCE(purchased_at, created_at)) AS first_seen_at,
           MAX(COALESCE(purchased_at, created_at)) AS last_seen_at,
           SUM(CASE WHEN COALESCE(operation_id, product_id) IN ('x402-transaction-preflight-lite','x402-transaction-preflight','x402-transaction-preflight-plus') THEN 1 ELSE 0 END) AS preflight_count,
           SUM(CASE WHEN COALESCE(operation_id, product_id) IN ('base-payment-proof','base-usdc-receipt') THEN 1 ELSE 0 END) AS followup_payment_evidence_count,
           GROUP_CONCAT(COALESCE(operation_id, product_id), ' -> ') AS sequence
         FROM x402_purchase_events
         WHERE ${payable.where} AND sequence_id IS NOT NULL
         GROUP BY sequence_id
         HAVING preflight_count > 0 OR followup_payment_evidence_count > 0
         ORDER BY last_seen_at DESC
         LIMIT 50`,
      ),
      payable.binds,
    ).all(),
    bindAll(
      db.prepare(
        `SELECT
           COALESCE(purchased_at, created_at) AS purchased_at,
           purchase_id,
           COALESCE(operation_id, product_id) AS operation_id,
           service_name,
           method,
           path,
           COALESCE(quoted_price, price_usdc) AS quoted_price,
           COALESCE(paid_amount, price_usdc) AS paid_amount,
           pricing_version,
           currency,
           network,
           payment_hash,
           payer_address,
           CASE WHEN payer_address IS NULL THEN NULL ELSE substr(payer_address, 1, 6) || '...' || substr(payer_address, -4) END AS payer_address_short,
           buyer_id_hash,
           request_id,
           sequence_id,
           response_status,
           decision,
           internal_test,
           country,
           campaign,
           referrer,
           user_agent_hash
       FROM x402_purchase_events
       WHERE ${payable.where}
       ORDER BY COALESCE(purchased_at, created_at) DESC
       LIMIT 100`,
      ),
      payable.binds,
    ).all(),
    bindAll(
      db.prepare(
        `SELECT
           COALESCE(purchased_at, created_at) AS created_at,
           COALESCE(operation_id, product_id) AS product_id,
           method,
           path,
           price_usdc,
           status,
           country,
           campaign,
           payment_header_hash
       FROM x402_purchase_events
       WHERE ${probes.where}
       ORDER BY COALESCE(purchased_at, created_at) DESC
       LIMIT 100`,
      ),
      probes.binds,
    ).all(),
    db
      .prepare(
        `SELECT
           source,
           source_url,
           origin_id,
           pay_to,
           timeframe_days,
           total_transactions,
           total_amount_usdc,
           unique_buyers,
           unique_sellers,
           latest_block_timestamp,
           observed_at
         FROM x402_legacy_aggregates
         ORDER BY timeframe_days DESC, observed_at DESC`,
      )
      .all(),
  ]);
  return {
    schema_version: "2.0",
    pricing_version: PRICING_VERSION,
    generated_at: new Date().toISOString(),
    filters,
    totals,
    route_probes: routeProbes,
    most_purchased_services: mostPurchased.results ?? [],
    highest_revenue_services: highestRevenue.results ?? [],
    revenue_by_service: highestRevenue.results ?? [],
    purchases_by_service: mostPurchased.results ?? [],
    purchases_by_pricing_version: byPricingVersion.results ?? [],
    repeated_workflows: (workflows.results ?? []).map(row => {
      const sequence = String(row.sequence ?? "");
      const capabilityBundleMatch =
        sequence.includes("a2a-agent-card-preflight") &&
        sequence.includes("github-repository-health") &&
        sequence.includes("npm-package-preflight");
      const baseDueDiligenceMatches = [
        "x402-merchant-trust",
        "base-payment-proof",
        "base-wallet-activity-delta",
        "base-approval-risk",
        "base-contract-verification",
        "base-usdc-receipt",
        "base-wallet-counterparty",
        "base-event-log-monitor",
        "base-gas-fee-quote",
        "base-nonce-readiness",
        "base-stablecoin-balance",
      ].filter(operation => sequence.includes(operation)).length;
      return {
        ...row,
        bundle_replacement_count:
          capabilityBundleMatch || baseDueDiligenceMatches >= 3
            ? Number(row.unique_buyers ?? 0)
            : 0,
        bundle_price:
          baseDueDiligenceMatches >= 2
            ? PRODUCTS_BY_ID["x402-transaction-preflight"].price
            : PRODUCTS_BY_ID["agent-capability-security-preflight"].price,
      };
    }),
    bundle_conversion_rate: null,
    buyer_attribution: buyerAttribution.results ?? [],
    buyer_cohorts: buyerCohorts.results ?? [],
    transaction_conversion: (transactionConversion.results ?? []).map(row => ({
      ...row,
      payment_after_check:
        Number(row.preflight_count ?? 0) > 0 &&
        Number(row.followup_payment_evidence_count ?? 0) > 0,
    })),
    recent: recent.results ?? [],
    recent_probes: recentProbes.results ?? [],
    legacy_aggregates: legacyAggregates.results ?? [],
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function purchaseDashboardHtml(data) {
  const totalCount = Number(data.totals?.purchase_count ?? 0);
  const gross = Number(data.totals?.gross_usd ?? 0).toFixed(3);
  const externalCount = Number(data.totals?.external_purchase_count ?? 0);
  const internalCount = Number(data.totals?.internal_purchase_count ?? 0);
  const uniqueBuyers = Number(data.totals?.unique_buyers ?? 0);
  const avgRevenue = Number(data.totals?.avg_purchase_usd ?? 0).toFixed(3);
  const probeCount = Number(data.route_probes?.probe_count ?? 0);
  const probeNominal = Number(data.route_probes?.nominal_price_usd ?? 0).toFixed(3);
  const legacy30 =
    data.legacy_aggregates.find(row => Number(row.timeframe_days) === 30) ??
    null;
  const legacyAll =
    data.legacy_aggregates.find(row => Number(row.timeframe_days) === 0) ??
    null;
  const chainTransactions = Number(
    legacy30?.total_transactions ?? legacyAll?.total_transactions ?? 0,
  );
  const chainVolume = Number(
    legacy30?.total_amount_usdc ?? legacyAll?.total_amount_usdc ?? 0,
  ).toFixed(6);
  const latestChainPayment =
    legacy30?.latest_block_timestamp ??
    legacyAll?.latest_block_timestamp ??
    "none";
  const rows = data.most_purchased_services
    .map(
      row => `<tr><td>${escapeHtml(row.operation)}</td><td>${row.purchase_count}</td><td>${row.unique_buyers}</td><td>$${Number(row.revenue ?? 0).toFixed(3)}</td><td>$${Number(row.average_paid_amount ?? 0).toFixed(3)}</td><td>${escapeHtml(row.latest_purchase)}</td><td>${row.internal_test_count}</td></tr>`,
    )
    .join("");
  const revenueRows = data.highest_revenue_services
    .map(
      row => `<tr><td>${escapeHtml(row.operation)}</td><td>$${Number(row.revenue ?? 0).toFixed(3)}</td><td>${row.purchase_count}</td><td>${row.unique_buyers}</td><td>$${Number(row.average_paid_amount ?? 0).toFixed(3)}</td><td>${escapeHtml(row.latest_purchase)}</td></tr>`,
    )
    .join("");
  const pricingRows = data.purchases_by_pricing_version
    .map(
      row => `<tr><td>${escapeHtml(row.pricing_version)}</td><td>${row.purchase_count}</td><td>$${Number(row.revenue ?? 0).toFixed(3)}</td></tr>`,
    )
    .join("");
  const workflowRows = data.repeated_workflows
    .map(
      row => `<tr><td><code>${escapeHtml(row.sequence)}</code></td><td>${row.purchase_count}</td><td>${row.unique_buyers}</td><td>${row.bundle_replacement_count}</td><td>$${Number(row.separate_purchase_total ?? 0).toFixed(3)}</td><td>${escapeHtml(row.bundle_price)}</td></tr>`,
    )
    .join("");
  const buyerRows = data.buyer_attribution
    .map(
      row => `<tr><td><code>${escapeHtml(row.payer_address === "unknown" ? "" : row.payer_address)}</code></td><td><code>${escapeHtml(String(row.buyer_id_hash ?? "").slice(0, 24))}</code></td><td>${escapeHtml(row.country ?? "")}</td><td>${row.purchase_count}</td><td>$${Number(row.revenue ?? 0).toFixed(3)}</td><td>${escapeHtml(row.first_seen_at)}</td><td>${escapeHtml(row.last_seen_at)}</td><td><code>${escapeHtml(row.operations ?? "")}</code></td><td><code>${escapeHtml(String(row.sequence_ids ?? "").slice(0, 80))}</code></td></tr>`,
    )
    .join("");
  const cohortRows = data.buyer_cohorts
    .map(
      row => `<tr><td>${escapeHtml(row.cohort_date)}</td><td>${row.buyer_count}</td><td>${row.repeat_buyers}</td><td>${row.purchase_count}</td><td>$${Number(row.revenue ?? 0).toFixed(3)}</td><td>${escapeHtml(row.latest_purchase)}</td></tr>`,
    )
    .join("");
  const conversionRows = data.transaction_conversion
    .map(
      row => `<tr><td><code>${escapeHtml(row.sequence_id ?? "")}</code></td><td>${row.purchase_count}</td><td>${row.preflight_count}</td><td>${row.followup_payment_evidence_count}</td><td>${row.payment_after_check ? "YES" : "NO"}</td><td>${escapeHtml(row.first_seen_at)}</td><td>${escapeHtml(row.last_seen_at)}</td><td><code>${escapeHtml(row.sequence ?? "")}</code></td></tr>`,
    )
    .join("");
  const recentRows = data.recent
    .map(
      row => `<tr><td>${escapeHtml(row.purchased_at)}</td><td>${escapeHtml(row.operation_id)}</td><td><code>${escapeHtml(row.path)}</code></td><td>$${Number(row.paid_amount ?? 0).toFixed(3)}</td><td>${escapeHtml(row.pricing_version ?? "legacy")}</td><td><code>${escapeHtml(row.payer_address ?? row.payer_address_short ?? "")}</code></td><td><code>${escapeHtml(String(row.buyer_id_hash ?? "").slice(0, 16))}</code></td><td><code>${escapeHtml(row.sequence_id ?? "")}</code></td><td>${escapeHtml(row.internal_test ?? "unknown")}</td></tr>`,
    )
    .join("");
  const probeRows = data.recent_probes
    .map(
      row => `<tr><td>${escapeHtml(row.created_at)}</td><td>${escapeHtml(row.product_id)}</td><td>${escapeHtml(row.method)}</td><td><code>${escapeHtml(row.path)}</code></td><td>$${Number(row.price_usdc ?? 0).toFixed(3)}</td><td>${escapeHtml(row.country)}</td><td>${escapeHtml(row.status)}</td></tr>`,
    )
    .join("");
  const legacyRows = data.legacy_aggregates
    .map(
      row => `<tr><td>${row.timeframe_days === 0 ? "All time" : `${row.timeframe_days} days`}</td><td>${row.total_transactions}</td><td>$${Number(row.total_amount_usdc ?? 0).toFixed(6)}</td><td>${row.unique_buyers}</td><td>${escapeHtml(row.latest_block_timestamp)}</td><td><code>${escapeHtml(row.pay_to)}</code></td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>x402 Purchases</title>
<style>
body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f7f7f5;color:#171717}
main{max-width:1180px;margin:0 auto;padding:32px 20px}
h1{font-size:28px;margin:0 0 6px}
h2{font-size:18px;margin:28px 0 10px}
.muted{color:#666;margin:0 0 20px}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0}
.stat{background:#fff;border:1px solid #ddd;border-radius:8px;padding:16px}
.label{font-size:12px;color:#666;text-transform:uppercase}
.value{font-size:28px;font-weight:700;margin-top:6px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #ddd;border-radius:8px;overflow:hidden}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;vertical-align:top}
th{background:#efefeb;color:#333;font-size:12px;text-transform:uppercase}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
@media(max-width:760px){.stats{grid-template-columns:1fr}main{padding:20px 12px}table{display:block;overflow-x:auto}}
</style>
</head>
<body><main>
<h1>x402 Purchases</h1>
<p class="muted">Generated ${escapeHtml(data.generated_at)}. Attributed paid calls require a successful non-HEAD request with a payment header. x402scan chain aggregates are shown separately because they do not include per-route attribution.</p>
<section class="stats">
<div class="stat"><div class="label">Attributed Paid Calls</div><div class="value">${totalCount}</div></div>
<div class="stat"><div class="label">Attributed Gross USD</div><div class="value">$${gross}</div></div>
<div class="stat"><div class="label">External Purchases</div><div class="value">${externalCount}</div></div>
<div class="stat"><div class="label">Internal/Test Purchases</div><div class="value">${internalCount}</div></div>
<div class="stat"><div class="label">Unique Buyers</div><div class="value">${uniqueBuyers}</div></div>
<div class="stat"><div class="label">Average Revenue</div><div class="value">$${avgRevenue}</div></div>
<div class="stat"><div class="label">Route Probes</div><div class="value">${probeCount}</div><div class="muted">Nominal list price: $${probeNominal}</div></div>
<div class="stat"><div class="label">x402scan 30d Txns</div><div class="value">${chainTransactions}</div></div>
<div class="stat"><div class="label">x402scan 30d Volume</div><div class="value">$${chainVolume}</div></div>
<div class="stat"><div class="label">Latest Chain Payment</div><div class="value" style="font-size:16px">${escapeHtml(latestChainPayment)}</div></div>
</section>
<h2>Most Purchased Services</h2>
<table><thead><tr><th>Operation</th><th>Purchases</th><th>Unique Buyers</th><th>Revenue</th><th>Average Paid</th><th>Latest Purchase</th><th>Internal/Test</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No purchases recorded yet.</td></tr>'}</tbody></table>
<h2>Highest Revenue Services</h2>
<table><thead><tr><th>Operation</th><th>Revenue</th><th>Purchases</th><th>Unique Buyers</th><th>Average Paid</th><th>Latest Purchase</th></tr></thead><tbody>${revenueRows || '<tr><td colspan="6">No purchases recorded yet.</td></tr>'}</tbody></table>
<h2>Purchases by Pricing Version</h2>
<table><thead><tr><th>Pricing Version</th><th>Purchases</th><th>Revenue</th></tr></thead><tbody>${pricingRows || '<tr><td colspan="3">No purchases recorded yet.</td></tr>'}</tbody></table>
<h2>Repeated Workflows</h2>
<table><thead><tr><th>Sequence</th><th>Sequence Count</th><th>Unique Buyers</th><th>Bundle Replaceable</th><th>Separate Total</th><th>Bundle Price</th></tr></thead><tbody>${workflowRows || '<tr><td colspan="6">No repeated workflows recorded yet.</td></tr>'}</tbody></table>
<h2>Buyer Attribution</h2>
<table><thead><tr><th>Payer Address</th><th>Buyer Hash</th><th>Country</th><th>Purchases</th><th>Revenue</th><th>First Seen</th><th>Last Seen</th><th>Operations</th><th>Sequences</th></tr></thead><tbody>${buyerRows || '<tr><td colspan="9">No attributed buyers recorded yet.</td></tr>'}</tbody></table>
<h2>Repeat Buyer Cohorts</h2>
<table><thead><tr><th>Cohort Date</th><th>Buyers</th><th>Repeat Buyers</th><th>Purchases</th><th>Revenue</th><th>Latest Purchase</th></tr></thead><tbody>${cohortRows || '<tr><td colspan="6">No cohorts recorded yet.</td></tr>'}</tbody></table>
<h2>Transaction Preflight Conversion</h2>
<p class="muted">Admin-only inference by sequence id. A payment is counted after a check when the same sequence later includes payment-proof or USDC receipt evidence.</p>
<table><thead><tr><th>Sequence</th><th>Purchases</th><th>Preflights</th><th>Payment Evidence</th><th>Payment After Check</th><th>First Seen</th><th>Last Seen</th><th>Endpoint Sequence</th></tr></thead><tbody>${conversionRows || '<tr><td colspan="8">No transaction preflight conversion yet.</td></tr>'}</tbody></table>
<h2>Recent Attributed Paid Calls</h2>
<table><thead><tr><th>Time</th><th>Operation</th><th>Path</th><th>Paid</th><th>Pricing Version</th><th>Payer</th><th>Buyer Hash</th><th>Sequence</th><th>Internal/Test</th></tr></thead><tbody>${recentRows || '<tr><td colspan="9">No purchases recorded yet.</td></tr>'}</tbody></table>
<h2>Recent Route Probes / Discovery Calls</h2>
<p class="muted">These are successful HEAD/OPTIONS/discovery executions or calls without payment evidence. They are useful for x402scan registration and route interest, but they are not revenue.</p>
<table><thead><tr><th>Time</th><th>Product</th><th>Method</th><th>Path</th><th>List Price</th><th>Country</th><th>Status</th></tr></thead><tbody>${probeRows || '<tr><td colspan="7">No route probes recorded yet.</td></tr>'}</tbody></table>
<h2>Legacy x402scan Aggregate</h2>
<p class="muted">Public x402scan aggregate by payment recipient. This is historical aggregate activity, not per-route purchase detail.</p>
<table><thead><tr><th>Timeframe</th><th>Transactions</th><th>Volume</th><th>Buyers</th><th>Latest Payment</th><th>Pay To</th></tr></thead><tbody>${legacyRows || '<tr><td colspan="6">No legacy aggregate imported.</td></tr>'}</tbody></table>
</main></body></html>`;
}

function walletRiskHtml(origin, manifest = null) {
  const lookup = PRODUCTS_BY_ID["public-wallet-risk-lookup"];
  const sample = PRODUCTS_BY_ID["public-wallet-risk-sample"];
  const snapshot = PRODUCTS_BY_ID["public-wallet-risk-snapshot"];
  const delta = PRODUCTS_BY_ID["public-wallet-risk-delta"];
  const bcsRisk = PRODUCTS_BY_ID["bcs-address-risk-score"];
  const bcsTrace = PRODUCTS_BY_ID["bcs-fund-trace"];
  const activeLabels = manifest?.active_labels ?? "25,357+";
  const sourceCount = manifest?.source_count ?? "20+";
  const batchKey = manifest?.batch_key ?? ADDRESS_RISK_DEFAULT_BATCH;
  const lookupUrl = productExampleUrl(origin, lookup);
  const sampleUrl = `${origin}${sample.path}?limit=5&campaign=wallet-risk-page`;
  const snapshotUrl = `${origin}${snapshot.path}?campaign=wallet-risk-page`;
  const deltaUrl = `${origin}${delta.path}?batch_key=${encodeURIComponent(batchKey)}&campaign=wallet-risk-page`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Public Wallet Risk Intelligence</title>
<meta name="description" content="Source-attributed wallet risk lookup, full snapshot, and batch delta for KYT and AML screening through x402 payments.">
<style>
body{margin:0;background:#f6f7f4;color:#171717;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5}
a{color:#174ea6;text-decoration:none}a:hover{text-decoration:underline}
header,main,footer{max-width:1120px;margin:0 auto;padding:28px 20px}
nav{display:flex;justify-content:space-between;gap:16px;align-items:center;font-size:14px}
.brand{font-weight:700;color:#111}.navlinks{display:flex;gap:16px;flex-wrap:wrap}
.hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:28px;align-items:center;padding:42px 20px 26px}
h1{font-size:44px;line-height:1.05;margin:0 0 18px;letter-spacing:0}
.lead{font-size:18px;color:#3f3f46;max-width:740px;margin:0 0 24px}
.actions{display:flex;flex-wrap:wrap;gap:10px}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border-radius:7px;border:1px solid #111;background:#111;color:#fff;font-weight:650}.btn.secondary{background:#fff;color:#111;border-color:#d4d4d8}
.panel{background:#fff;border:1px solid #d9ddd2;border-radius:8px;padding:18px}
.visual{min-height:280px;display:grid;place-items:center;background:#eef2ea;border:1px solid #d9ddd2;border-radius:8px;overflow:hidden}
.visual svg{width:100%;height:100%;min-height:280px}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:20px 0}
.stat{background:#fff;border:1px solid #d9ddd2;border-radius:8px;padding:16px}.stat b{font-size:26px;display:block}.stat span{color:#5b5f55;font-size:13px}
h2{font-size:24px;margin:36px 0 12px}.muted{color:#5b5f55}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #d9ddd2;border-radius:8px;overflow:hidden}th,td{text-align:left;padding:12px;border-bottom:1px solid #ecefe8;font-size:14px;vertical-align:top}th{background:#eef2ea;font-size:12px;text-transform:uppercase;color:#3f4638}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{background:#fff;border:1px solid #d9ddd2;border-radius:8px;padding:16px}.card h3{margin:0 0 8px;font-size:17px}.card p{margin:0;color:#4f5349}
footer{color:#666;font-size:13px}
@media(max-width:820px){.hero{grid-template-columns:1fr;padding-top:20px}h1{font-size:34px}.grid,.cards{grid-template-columns:1fr}table{display:block;overflow-x:auto}}
</style>
</head>
<body>
<header>
<nav>
<a class="brand" href="/">SignGate</a>
<div class="navlinks">
<a href="/wallet-risk">Wallet Risk</a>
<a href="/catalog.json">Catalog</a>
<a href="/openapi.json">OpenAPI</a>
<a href="/admin/purchases">Purchases</a>
</div>
</nav>
</header>
<main>
<section class="hero">
<div>
<h1>Public Wallet Risk Intelligence</h1>
<p class="lead">Source-attributed wallet screening and importable JSONL datasets for sanctions, scam, ransomware, malicious contract, and stablecoin blacklist workflows. Available as x402 paid lookup, snapshot, and batch delta resources.</p>
<div class="actions">
<a class="btn" href="${escapeHtml(sampleUrl)}">Buy sample</a>
<a class="btn" href="${escapeHtml(lookupUrl)}">Open lookup endpoint</a>
<a class="btn secondary" href="/catalog.json">AI buyer catalog</a>
<a class="btn secondary" href="/openapi.json">OpenAPI</a>
</div>
</div>
<div class="visual" aria-label="Wallet risk intelligence coverage map">
<svg viewBox="0 0 640 360" role="img" aria-labelledby="riskTitle">
<title id="riskTitle">Wallet risk intelligence coverage</title>
<rect width="640" height="360" fill="#eef2ea"/>
<g fill="none" stroke="#94a684" stroke-width="2" opacity=".65">
<path d="M92 168 C168 84 257 86 334 166 S505 257 572 142"/>
<path d="M76 248 C158 196 238 221 302 270 S454 318 548 242"/>
<path d="M126 92 C210 142 254 118 330 82 S474 64 540 112"/>
</g>
<g>
<circle cx="120" cy="170" r="34" fill="#fff" stroke="#31572c" stroke-width="3"/><text x="120" y="176" text-anchor="middle" font-size="12" fill="#31572c">OFAC</text>
<circle cx="260" cy="92" r="28" fill="#fff" stroke="#8a1c1c" stroke-width="3"/><text x="260" y="98" text-anchor="middle" font-size="11" fill="#8a1c1c">Scam</text>
<circle cx="354" cy="180" r="42" fill="#111" stroke="#111" stroke-width="3"/><text x="354" y="176" text-anchor="middle" font-size="13" fill="#fff">Risk</text><text x="354" y="193" text-anchor="middle" font-size="13" fill="#fff">Feed</text>
<circle cx="508" cy="126" r="33" fill="#fff" stroke="#174ea6" stroke-width="3"/><text x="508" y="132" text-anchor="middle" font-size="11" fill="#174ea6">USDT</text>
<circle cx="492" cy="258" r="30" fill="#fff" stroke="#6b3f16" stroke-width="3"/><text x="492" y="264" text-anchor="middle" font-size="10" fill="#6b3f16">Ransom</text>
</g>
<g fill="#111">
<rect x="78" y="294" width="484" height="18" rx="4" opacity=".12"/>
<rect x="116" y="300" width="408" height="6" rx="3"/>
</g>
</svg>
</div>
</section>
<section class="grid">
<div class="stat"><b>${escapeHtml(activeLabels)}</b><span>active labels in hosted snapshot</span></div>
<div class="stat"><b>${escapeHtml(sourceCount)}</b><span>public sources with provenance</span></div>
<div class="stat"><b>${escapeHtml(batchKey)}</b><span>current batch key</span></div>
</section>
<section>
<h2>Paid Resources</h2>
<table>
<thead><tr><th>Resource</th><th>Price</th><th>Use Case</th><th>Endpoint</th></tr></thead>
<tbody>
<tr><td>Single address lookup</td><td>${escapeHtml(lookup.price)}</td><td>Screen one wallet before payout, onboarding, API payment, or agent interaction.</td><td><code>${escapeHtml(lookup.path)}</code></td></tr>
<tr><td>Dataset sample</td><td>${escapeHtml(sample.price)}</td><td>Inspect sample records, provenance fields, evidence URLs, and schema before buying the full dataset.</td><td><code>${escapeHtml(sample.path)}</code></td></tr>
<tr><td>Full snapshot</td><td>${escapeHtml(snapshot.price)}</td><td>Download the complete source-attributed JSONL dataset for local KYT/AML import.</td><td><code>${escapeHtml(snapshot.path)}</code></td></tr>
<tr><td>Batch delta</td><td>${escapeHtml(delta.price)}</td><td>Download the latest changed labels and issuer blacklist events for an existing local copy.</td><td><code>${escapeHtml(delta.path)}</code></td></tr>
<tr><td>BCS risk score</td><td>${escapeHtml(bcsRisk.price)}</td><td>Run BlockchainSecurity behavior-based address scoring when static labels are not enough.</td><td><code>${escapeHtml(bcsRisk.path)}</code></td></tr>
<tr><td>BCS fund trace</td><td>${escapeHtml(bcsTrace.price)}</td><td>Buy a heavier multi-hop trace only when a wallet hit needs investigation.</td><td><code>${escapeHtml(bcsTrace.path)}</code></td></tr>
</tbody>
</table>
</section>
<section class="cards">
<div class="card"><h3>What the feed includes</h3><p>Sanctions, scams, phishing, ransomware, malicious contracts, and stablecoin issuer blacklist labels with confidence and evidence URLs.</p></div>
<div class="card"><h3>What it is not</h3><p>It is not a guarantee of safety and not a substitute for licensed compliance advice. High-value actions should still escalate to review.</p></div>
<div class="card"><h3>How agents buy it</h3><p>x402 clients call the endpoint, receive a 402 payment requirement, pay Base USDC, then receive JSON or JSONL from the Worker.</p></div>
<div class="card"><h3>Campaign tracking</h3><p>Add <code>?campaign=twitter-thread</code> or <code>?utm_campaign=x402scan-demo</code> to paid links; successful purchases show in the admin dashboard.</p></div>
</section>
<section>
<h2>Direct Links</h2>
<p class="muted"><a href="${escapeHtml(sampleUrl)}">Sample paid endpoint</a> · <a href="${escapeHtml(snapshotUrl)}">Snapshot paid endpoint</a> · <a href="${escapeHtml(deltaUrl)}">Delta paid endpoint</a> · <a href="${escapeHtml(origin)}/wallet-risk/manifest.json">Free manifest</a> · <a href="${escapeHtml(origin)}/.well-known/ai-buyer-catalog.json">Machine-readable catalog</a></p>
</section>
</main>
<footer>Public-source intelligence with source attribution. Hosted by the existing SignGate x402 Worker.</footer>
</body>
</html>`;
}

function agentBuyerIdentityHtml(origin) {
  const endpoint = `${origin}${PRODUCTS_BY_ID["agent-buyer-identity-preflight"].path}`;
  const catalogUrl = `${origin}/catalog.json`;
  const kitPath = "packages/agent-buyer-policy-kit";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agent Buyer Identity Preflight for x402 | SignGate</title>
<meta name="description" content="Before an AI agent buys an x402 API, dataset, or tool, verify whether that buyer agent role is allowed to buy this product category.">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>
:root{color-scheme:dark;--bg:#08101d;--panel:#101a2e;--line:#27344f;--text:#f3f7ff;--muted:#9eacc5;--green:#67e8b9;--blue:#8aa7ff;--amber:#f3c969;--red:#ff8585;--mono:SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace;--sans:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#08101d,#0b1020 38rem);color:var(--text);font-family:var(--sans);line-height:1.58}.wrap{max-width:1080px;margin:0 auto;padding:0 1.25rem}.nav{display:flex;gap:1rem;align-items:center;padding:1rem 0;border-bottom:1px solid var(--line)}.brand{font-weight:800;font-size:1.2rem}.nav a{color:var(--muted);text-decoration:none}.nav a:first-child{color:var(--text)}.hero{padding:5rem 0 3.5rem;max-width:820px}.eyebrow{color:var(--green);font:800 .78rem/1 var(--mono);text-transform:uppercase;letter-spacing:.08em}h1{font-size:4rem;line-height:1.03;letter-spacing:0;margin:1rem 0 1.2rem;max-width:12ch}h2{font-size:2rem;line-height:1.18;margin:0 0 1rem}p{color:var(--muted);font-size:1.06rem}.cta{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1.6rem}.btn{display:inline-flex;align-items:center;justify-content:center;border:1px solid #4f6fe8;border-radius:.5rem;min-height:2.8rem;padding:.7rem 1rem;text-decoration:none;color:#07101e;background:var(--blue);font-weight:800}.btn.secondary{background:transparent;color:var(--text)}.section{padding:3.5rem 0;border-top:1px solid var(--line)}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}.card{background:var(--panel);border:1px solid var(--line);border-radius:.65rem;padding:1.1rem}.card p{margin:.3rem 0 0}.decision{font-family:var(--mono);font-weight:800}.allow{color:var(--green)}.approval{color:var(--amber)}.deny{color:var(--red)}pre{white-space:pre;overflow:auto;background:#060b14;border:1px solid var(--line);border-radius:.55rem;padding:1rem;color:#dbe7ff;font-family:var(--mono);font-size:.86rem}code{font-family:var(--mono);color:#ffd98a}.matrix{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:.65rem}.row{display:contents}.cell{border:1px solid var(--line);background:rgba(16,26,46,.72);padding:.75rem;border-radius:.45rem}.footer{padding:2rem 0;color:var(--muted);border-top:1px solid var(--line)}
@media(max-width:820px){h1{font-size:2.75rem}.grid{grid-template-columns:1fr}.matrix{grid-template-columns:1fr}.row{display:block}.cell{margin:.45rem 0}}
</style>
</head>
<body>
<div class="wrap">
<nav class="nav">
  <a class="brand" href="/">SignGate</a>
  <a href="/catalog.json">Catalog</a>
  <a href="/openapi.json">OpenAPI</a>
  <a href="/.well-known/x402">x402</a>
  <a href="/signgate">Payment Guard</a>
</nav>
<main>
  <section class="hero">
    <div class="eyebrow">Agent Buyer Identity Preflight for x402</div>
    <h1>Check who is buying before your agent pays.</h1>
    <p>SignGate verifies whether the buyer agent role, purpose, product category, data sensitivity, price, and approval evidence fit before an AI agent buys an x402 API, dataset, or tool.</p>
    <div class="cta">
      <a class="btn" href="${endpoint}?agent_role=research_agent&product_category=wallet_risk&purpose=security_research&price_usdc=0.005&data_sensitivity=medium">Try the x402 endpoint</a>
      <a class="btn secondary" href="${catalogUrl}">View AI buyer catalog</a>
    </div>
  </section>

  <section class="section">
    <h2>The problem</h2>
    <p>Payment checks only ask whether an agent can pay. Enterprise buyers need a stricter question: should this kind of agent be allowed to buy this kind of data or tool?</p>
    <div class="grid">
      <div class="card"><strong>Writer agent</strong><p>Should not silently buy wallet-risk data just to write a draft.</p></div>
      <div class="card"><strong>Accounting agent</strong><p>Should buy invoice verification, not unrelated market intelligence.</p></div>
      <div class="card"><strong>Finance agent</strong><p>May handle settlement context, but payment execution still needs approval.</p></div>
    </div>
  </section>

  <section class="section">
    <h2>Starter role decisions</h2>
    <div class="matrix">
      <div class="cell"><strong>Buyer role + product</strong></div><div class="cell"><strong>Decision</strong></div><div class="cell"><strong>Reason</strong></div>
      <div class="row"><div class="cell">research_agent + wallet_risk</div><div class="cell decision allow">ALLOW</div><div class="cell">Security research role fits risk data.</div></div>
      <div class="row"><div class="cell">writer_agent + wallet_risk</div><div class="cell decision approval">APPROVAL_REQUIRED</div><div class="cell">Writing role does not normally need wallet risk data.</div></div>
      <div class="row"><div class="cell">accounting_agent + market_intelligence</div><div class="cell decision deny">DENY</div><div class="cell">Accounting role does not fit market intelligence.</div></div>
      <div class="row"><div class="cell">accounting_agent + invoice_verification</div><div class="cell decision allow">ALLOW</div><div class="cell">Invoice verification fits accounting.</div></div>
      <div class="row"><div class="cell">finance_agent + payment_execution</div><div class="cell decision approval">APPROVAL_REQUIRED</div><div class="cell">Payment execution is always approval-gated.</div></div>
      <div class="row"><div class="cell">operator_agent + api_security</div><div class="cell decision allow">ALLOW</div><div class="cell">API security checks fit operator role.</div></div>
    </div>
  </section>

  <section class="section">
    <h2>API</h2>
    <p>Hosted x402 endpoint: <code>GET /v1/x402/agent/buyer-identity-preflight</code> at <code>$0.005</code> per decision.</p>
    <pre>curl "${endpoint}?agent_role=research_agent&product_category=wallet_risk&purpose=security_research&price_usdc=0.005&data_sensitivity=medium"</pre>
    <p>Unpaid calls return <code>402 Payment Required</code>. Paid responses return <code>ALLOW</code>, <code>DENY</code>, or <code>APPROVAL_REQUIRED</code> with reason codes and audit guidance.</p>
  </section>

  <section class="section">
    <h2>Developer Kit</h2>
    <p>Teams that want to customize the policy locally can use the starter kit at <code>${kitPath}</code>: JSON policies, role x product matrix, JavaScript evaluator, Python evaluator, and tests.</p>
    <p>Paid x402 kit endpoint: <code>GET /v1/x402/agent/buyer-policy-kit</code> at <code>$49.00</code>. Hosted preflight API remains <code>$0.005</code> per decision.</p>
  </section>
</main>
<footer class="footer">SignGate — Agent-aware x402 purchase governance. No custody. No private keys. Preflight decisions only.</footer>
</div>
</body>
</html>`;
}

function agenticCommercePreflightHtml(origin) {
  const sampleUrl = `${origin}/v1/agentic-commerce/preflight/sample`;
  const apiUrl = `${origin}/v1/agentic-commerce/preflight`;
  const kitUrl = `${origin}${PRODUCTS_BY_ID["agent-buyer-policy-kit"].path}?format=manifest&buyer_type=developer`;
  const sampleResult = buildAgenticCommercePreflight(sampleAgenticCommercePreflightInput());
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SignGate - Agent Policy & Execution Control</title>
<meta name="description" content="Policy decision layer between autonomous agents and the systems that move money.">
<style>
body{margin:0;background:#f7f8fb;color:#111827;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}
a{color:#1457d9;text-decoration:none}a:hover{text-decoration:underline}
header,main,footer{max-width:1120px;margin:0 auto;padding:28px 20px}
nav{display:flex;justify-content:space-between;align-items:center;gap:16px;font-size:14px}
.brand{font-weight:800;color:#111827}.navlinks{display:flex;gap:16px;flex-wrap:wrap}
.hero{padding:54px 20px 36px;display:grid;grid-template-columns:minmax(0,1.12fr) minmax(320px,.88fr);gap:28px;align-items:center}
h1{font-size:46px;line-height:1.05;margin:0 0 18px;letter-spacing:0;max-width:13ch}
.lead{font-size:19px;color:#374151;max-width:760px;margin:0 0 24px}.eyebrow{color:#0f766e;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px}
.actions{display:flex;flex-wrap:wrap;gap:10px}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 14px;border-radius:7px;border:1px solid #111827;background:#111827;color:#fff;font-weight:700}.btn.secondary{background:#fff;color:#111827;border-color:#cbd5e1}
.panel,.card{background:#fff;border:1px solid #dbe2ee;border-radius:8px;padding:18px}.panel h2,.card h3{margin-top:0}
.decision{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;margin-top:18px}.node{border:1px solid #cbd5e1;border-radius:8px;padding:12px;text-align:center;background:#f8fafc;font-weight:700}.arrow{color:#64748b;font-weight:900}
.chips{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.chip{border:1px solid #cbd5e1;border-radius:7px;padding:9px;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.allow{color:#047857}.review{color:#b45309}.deny{color:#b91c1c}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:18px 0}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}
pre{white-space:pre;overflow:auto;background:#0b1020;color:#e5edff;border-radius:8px;padding:14px;font-size:12px;line-height:1.45}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.muted{color:#64748b}footer{color:#64748b;font-size:13px}
@media(max-width:860px){.hero,.grid,.cards{grid-template-columns:1fr}h1{font-size:35px}.decision{grid-template-columns:1fr}.arrow{display:none}.chips{grid-template-columns:1fr}}
</style>
</head>
<body>
<header>
<nav>
<a class="brand" href="/">SignGate</a>
<div class="navlinks"><a href="/openapi.json">OpenAPI</a><a href="/catalog.json">Catalog</a><a href="/registry.json">Registry</a><a href="/wallet-risk">Wallet Risk</a></div>
</nav>
</header>
<main>
<section class="hero">
<div>
<div class="eyebrow">Economic Policy Decision</div>
<h1>Policy decisions between agents and money movement.</h1>
<p class="lead">Before an AI agent pays, buys an API, triggers a signer, or commits to an economically consequential action, SignGate checks whether the action is authorized, the merchant is acceptable, and an external signer is required.</p>
<div class="actions"><a class="btn" href="${escapeHtml(sampleUrl)}">View sample decision</a><a class="btn secondary" href="/openapi.json">OpenAPI</a></div>
</div>
<div class="panel">
<h2>Decision flow</h2>
<div class="decision"><div class="node">Agent action</div><div class="arrow">→</div><div class="node">SignGate Decision</div><div class="node">Mandate + evidence</div><div class="arrow">→</div><div class="node">Signer / wallet / custody</div></div>
<div class="chips"><div class="chip allow">ALLOW</div><div class="chip review">REQUIRE_APPROVAL</div><div class="chip deny">DENY</div></div>
</div>
</section>
<section>
<div class="grid">
<div class="card"><h3>Inputs / Evidence</h3><p class="muted">Mandate, agent identity, buyer identity, merchant domain, wallet, amount, chain, KYT, transaction intent, RPC metadata, and other decision signals.</p></div>
<div class="card"><h3>Policy Decision Engine</h3><p class="muted">A deterministic evaluator returns a decision, reason codes, policy version, evidence summary, and signer directive.</p></div>
</div>
<div class="cards">
<div class="card"><h3>Hosted API</h3><p class="muted">Try decisions through the public demo endpoint.</p></div>
<div class="card"><h3>Policy Kit</h3><p class="muted">Embed the same policy model in JS or Python.</p></div>
<div class="card"><h3>Signer Adapter</h3><p class="muted">Next: verifiers that reject signing without a valid decision artifact.</p></div>
<div class="card"><h3>Audit Pack</h3><p class="muted">Next: prove which mandate, policy, evidence, and signer allowed an action.</p></div>
</div>
</section>
<section class="grid">
<div>
<h2>Readonly API</h2>
<p>Sample endpoint: <code>GET /v1/agentic-commerce/preflight/sample</code></p>
<p>Demo endpoint: <code>POST /v1/agentic-commerce/preflight</code></p>
<pre>curl -X POST "${escapeHtml(apiUrl)}" \\
  -H "content-type: application/json" \\
  --data @sample-agentic-commerce.json</pre>
<p class="muted">This demo does not custody funds, sign transactions, approve tokens, or move money.</p>
</div>
<div>
<h2>Sample decision</h2>
<pre>${escapeHtml(JSON.stringify({
  decision: sampleResult.decision,
  decision_id: sampleResult.decision_id,
  reason_codes: sampleResult.reason_codes,
  signer_directive: sampleResult.signer_directive,
}, null, 2))}</pre>
</div>
</section>
<section class="panel">
<h2>Product ladder</h2>
<p><strong>Hosted API = try it.</strong> <strong>Policy Kit = embed it.</strong> <strong>Signer Adapter = enforce it.</strong> <strong>Audit Pack = prove it.</strong></p>
<p>Current paid kit manifest: <a href="${escapeHtml(kitUrl)}"><code>/v1/x402/agent/buyer-policy-kit</code></a>. The policy kit is not published to npm or PyPI yet.</p>
<p class="muted">The demo API returns a Decision Response, not a cryptographically verifiable Decision Artifact. Signer enforcement, request digests, policy digests, mandate digests, evidence digests, nonce, issuer, and signature binding belong to the next Verifier SDK milestone.</p>
</section>
</main>
<footer>SignGate is a policy decision layer, not a wallet, custodian, HSM, TEE, or payment processor.</footer>
</body>
</html>`;
}

const paidApp = createPaidApp();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (PAID_PATHS.has(url.pathname) || PAYMENT_GUARD_PATHS.has(url.pathname)) {
      return paidApp.fetch(request, env, ctx);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,HEAD,POST,OPTIONS",
          "access-control-allow-headers": "content-type,payment-signature",
        },
      });
    }
    if (
      request.method === "POST" &&
      url.pathname === "/v1/agentic-commerce/preflight"
    ) {
      try {
        const input = await request.json();
        return json(buildAgenticCommercePreflight(input), 200, {
          "cache-control": "no-store",
        });
      } catch (error) {
        return json(
          {
            error: "invalid_agentic_commerce_preflight_input",
            message: error instanceof Error ? error.message : String(error),
          },
          400,
        );
      }
    }
    if (url.pathname === "/admin/login") {
      if (request.method === "GET" || request.method === "HEAD") {
        const login = new Response(adminLoginHtml(), {
          headers: adminSecurityHeaders({
            "content-type": "text/html; charset=utf-8",
          }),
        });
        return request.method === "HEAD"
          ? new Response(null, { status: login.status, headers: login.headers })
          : login;
      }
      if (request.method === "POST") return adminLoginResponse(request, env);
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      return json({ error: "method_not_allowed" }, 405, {
        allow: "GET, HEAD, POST",
      });
    }

    const origin = url.origin;
    let response;
    if (
      url.pathname === "/admin/purchases" ||
      url.pathname === "/admin/purchases.json"
    ) {
      if (!(await adminAuthorized(request, env))) {
        if (
          url.pathname === "/admin/purchases" &&
          !request.headers.get("authorization") &&
          !url.searchParams.has("token")
        ) {
          response = new Response(null, {
            status: 303,
            headers: adminSecurityHeaders({ location: "/admin/login" }),
          });
        } else {
          response = json(
            { error: "admin_unauthorized" },
            request.headers.get("authorization") ? 403 : 401,
            adminSecurityHeaders({ "www-authenticate": "Bearer" }),
          );
        }
      } else {
        try {
          const data = await purchaseDashboardData(env.GUARD_DB, url.searchParams);
          response =
            url.pathname.endsWith(".json")
              ? json(data, 200, adminSecurityHeaders())
              : new Response(purchaseDashboardHtml(data), {
                  headers: adminSecurityHeaders({
                    "content-type": "text/html; charset=utf-8",
                  }),
                });
        } catch (error) {
          response = json(
            {
              error: "purchase_dashboard_failed",
              message: error instanceof Error ? error.message : String(error),
            },
            500,
            adminSecurityHeaders(),
          );
        }
      }
    } else if (url.pathname === "/health") {
      response = json({
        ok: true,
        service: "agent-payment-guard",
        network: BASE_MAINNET,
        products: PRODUCTS.length,
      });
    } else if (url.pathname === "/openapi.json") {
      response = json(openApi(origin));
    } else if (
      url.pathname === "/catalog.json" ||
      url.pathname === "/.well-known/ai-buyer-catalog.json"
    ) {
      response = json(buyerCatalog(origin));
    } else if (
      url.pathname === "/registry.json" ||
      url.pathname === "/.well-known/registry.json"
    ) {
      response = json(registry(origin), 200, {
        "cache-control": "no-store",
      });
    } else if (
      url.pathname === "/workflows.json" ||
      url.pathname === "/.well-known/workflows.json"
    ) {
      response = json(workflowCatalog(origin), 200, {
        "cache-control": "no-store",
      });
    } else if (
      url.pathname === "/endpoints.txt" ||
      url.pathname === "/.well-known/endpoints.txt"
    ) {
      response = new Response(endpointsTxt(origin), {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } else if (url.pathname === "/.well-known/agent-card.json") {
      response = json(agentCard(origin));
    } else if (url.pathname === "/.well-known/service.json") {
      response = json(serviceManifest(origin));
    } else if (url.pathname === "/.well-known/x402") {
      response = json(x402WellKnown(origin), 200, {
        "cache-control": "no-store",
      });
    } else if (url.pathname === "/.well-known/mcp.json") {
      response = json({
        name: "signgate-mcp",
        version: "2.0.0",
        transport: {
          type: "streamable-http",
          url: `${origin}${PAYMENT_GUARD_MCP_PATH}`,
        },
        tools: ["evaluate_payment"],
      });
    } else if (url.pathname === "/verification.json") {
      response = json(await verificationData(origin), 200, {
        "cache-control": "no-store",
      });
    } else if (url.pathname === "/verify") {
      response = new Response(verificationHtml(origin), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } else if (
      url.pathname === "/agent-buyer-identity" ||
      url.pathname === "/agent-identity" ||
      url.pathname === "/x402-agent-buyer"
    ) {
      response = new Response(agentBuyerIdentityHtml(origin), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=120",
        },
      });
    } else if (url.pathname === "/agentic-commerce-preflight") {
      response = new Response(agenticCommercePreflightHtml(origin), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=120",
        },
      });
    } else if (url.pathname === "/v1/agentic-commerce/preflight/sample") {
      response = json(
        {
          sample_request: sampleAgenticCommercePreflightInput(),
          sample_response: buildAgenticCommercePreflight(
            sampleAgenticCommercePreflightInput(),
          ),
          post_url: `${origin}/v1/agentic-commerce/preflight`,
        },
        200,
        { "cache-control": "no-store" },
      );
    } else if (
      url.pathname === "/wallet-risk" ||
      url.pathname === "/risk" ||
      url.pathname === "/address-risk"
    ) {
      let manifest = null;
      try {
        manifest = await addressRiskManifest(env);
      } catch {
        manifest = null;
      }
      response = new Response(walletRiskHtml(origin, manifest), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=120",
        },
      });
    } else if (url.pathname === "/wallet-risk/manifest.json") {
      try {
        response = json(await publicWalletRiskManifest(env, origin), 200, {
          "cache-control": "public, max-age=300",
        });
      } catch (error) {
        response = json(
          {
            error: "wallet_risk_manifest_unavailable",
            message: error instanceof Error ? error.message : String(error),
          },
          502,
        );
      }
    } else if (url.pathname === "/icon.svg") {
      response = new Response(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="SignGate logo"><rect width="128" height="128" fill="#f7f7f4"/><path d="M36 22h30v10H46v36H36V22Zm26 0h30v46H82V32H62V22ZM36 60h10v36h20v10H36V60Zm46 0h10v46H62V96h20V60Z" fill="#050505"/><path d="M60 49v30H48V38l23 23H60Zm20 30V49h-12v41L45 67h11l12 12h12Z" fill="#050505"/><rect x="60" y="60" width="8" height="8" fill="#9be80f"/></svg>`,
        {
          headers: {
            "content-type": "image/svg+xml",
            "cache-control": "public, max-age=86400",
          },
        },
      );
    } else if (url.pathname === "/robots.txt") {
      response = new Response(
        `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
        { headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    } else if (url.pathname === "/sitemap.xml") {
      response = new Response(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url><url><loc>${origin}/agentic-commerce-preflight</loc></url><url><loc>${origin}/v1/agentic-commerce/preflight/sample</loc></url><url><loc>${origin}/agent-buyer-identity</loc></url><url><loc>${origin}/signgate</loc></url><url><loc>${origin}/wallet-risk</loc></url><url><loc>${origin}/wallet-risk/manifest.json</loc></url><url><loc>${origin}/en/signgate</loc></url><url><loc>${origin}/zh/signgate</loc></url><url><loc>${origin}/verify</loc></url><url><loc>${origin}/openapi.json</loc></url><url><loc>${origin}/catalog.json</loc></url><url><loc>${origin}/registry.json</loc></url><url><loc>${origin}/workflows.json</loc></url><url><loc>${origin}/endpoints.txt</loc></url><url><loc>${origin}/.well-known/x402</loc></url><url><loc>${origin}/.well-known/agent-card.json</loc></url><url><loc>${origin}/.well-known/mcp.json</loc></url><url><loc>${origin}${PRODUCTS_BY_ID["sumsub-kyt-evidence"].path}</loc></url><url><loc>${origin}${PRODUCTS_BY_ID["sumsub-watchlist-aml-evidence"].path}</loc></url></urlset>`,
        { headers: { "content-type": "application/xml; charset=utf-8" } },
      );
    } else if (url.pathname === "/llms.txt") {
      response = new Response(
        `# SignGate API

SignGate is the policy decision layer between autonomous agents and systems that move money. It verifies authority, mandate, merchant evidence, risk signals, policy, and signer requirements before an AI agent pays, buys an API, or triggers a signer.

Agent Buyer Identity, wallet risk, RPC safety, chain data, and KYT endpoints are evidence providers and x402 products. The core abstraction is ALLOW, REQUIRE_APPROVAL, or DENY.

- OpenAPI: ${origin}/openapi.json
- Agentic Commerce Preflight page: ${origin}/agentic-commerce-preflight
- Agentic Commerce Preflight sample: ${origin}/v1/agentic-commerce/preflight/sample
- Agent Buyer Identity page: ${origin}/agent-buyer-identity
- SignGate landing page: ${origin}/signgate
- Wallet Risk Intelligence page: ${origin}/wallet-risk
- SignGate English page: ${origin}/en/signgate
- SignGate Traditional Chinese page: ${origin}/zh/signgate
- AI buyer catalog: ${origin}/catalog.json
- Agent utility registry: ${origin}/registry.json
- Plain endpoints list: ${origin}/endpoints.txt
- Workflow catalog: ${origin}/workflows.json
- x402 discovery: ${origin}/.well-known/x402
- Agent card: ${origin}/.well-known/agent-card.json
- Product catalog: ${origin}/.well-known/service.json
- Wallet risk manifest: ${origin}/wallet-risk/manifest.json
- SignGate x402 wrapper: ${productExampleUrl(origin, PRODUCTS_BY_ID["agent-payment-risk-gateway"])}
- Sumsub KYT evidence: ${productExampleUrl(origin, PRODUCTS_BY_ID["sumsub-kyt-evidence"])}
- Sumsub AML/watchlist evidence: ${productExampleUrl(origin, PRODUCTS_BY_ID["sumsub-watchlist-aml-evidence"])}
- Sumsub Travel Rule evidence: ${productExampleUrl(origin, PRODUCTS_BY_ID["sumsub-travel-rule-evidence"])}
- Agentic Commerce POST demo: ${origin}/v1/agentic-commerce/preflight
- Featured Alpha Risk: ${productExampleUrl(origin, PRODUCTS[26])}
- Token alpha snapshot: ${productExampleUrl(origin, PRODUCTS[27])}
- Wallet copytrade risk: ${productExampleUrl(origin, PRODUCTS[28])}
- New pool risk: ${productExampleUrl(origin, PRODUCTS[29])}
- Main Payment Guard: ${productExampleUrl(origin, PRODUCTS[25])}
- Address preflight: ${origin}${PRODUCTS[0].path}?address=${PAY_TO}
- Token preflight: ${origin}${PRODUCTS[1].path}?token=${USDC}
- Merchant trust: ${origin}${PRODUCTS[2].path}?address=${PAY_TO}
- Payment proof: ${origin}${PRODUCTS[3].path}?tx=0x...&recipient=${PAY_TO}&amount=0.02
- Wallet activity delta: ${origin}${PRODUCTS[4].path}?address=${PAY_TO}&since=2026-06-21T00:00:00Z
- Approval risk: ${productExampleUrl(origin, PRODUCTS[5])}
- Contract verification: ${productExampleUrl(origin, PRODUCTS[6])}
- USDC receipt: ${productExampleUrl(origin, PRODUCTS[7])}
- Wallet counterparty: ${productExampleUrl(origin, PRODUCTS[8])}
- Event log monitor: ${productExampleUrl(origin, PRODUCTS[9])}
- Gas and fee quote: ${productExampleUrl(origin, PRODUCTS[10])}
- Nonce readiness: ${productExampleUrl(origin, PRODUCTS[11])}
- Stablecoin balance: ${productExampleUrl(origin, PRODUCTS[12])}
- DEX market monitor: ${productExampleUrl(origin, PRODUCTS[13])}
- Prediction market snapshot: ${productExampleUrl(origin, PRODUCTS[14])}
- x402 endpoint preflight: ${productExampleUrl(origin, PRODUCTS[15])}
- npm package preflight: ${productExampleUrl(origin, PRODUCTS[16])}
- GitHub repository health: ${productExampleUrl(origin, PRODUCTS[17])}
- URL change fingerprint: ${productExampleUrl(origin, PRODUCTS[18])}
- RSS or Atom feed snapshot: ${productExampleUrl(origin, PRODUCTS[19])}
- EVM transaction intent: ${productExampleUrl(origin, PRODUCTS[20])}
- A2A Agent Card preflight: ${productExampleUrl(origin, PRODUCTS[21])}
- OpenAPI specification preflight: ${productExampleUrl(origin, PRODUCTS[22])}
- Domain trust preflight: ${productExampleUrl(origin, PRODUCTS[23])}
- PyPI package preflight: ${productExampleUrl(origin, PRODUCTS[24])}
- Wallet risk lookup: ${productExampleUrl(origin, PRODUCTS_BY_ID["public-wallet-risk-lookup"])}
- Wallet risk sample: ${origin}${PRODUCTS_BY_ID["public-wallet-risk-sample"].path}?limit=5&campaign=llms
- Wallet risk snapshot: ${origin}${PRODUCTS_BY_ID["public-wallet-risk-snapshot"].path}?campaign=llms
- Wallet risk delta: ${origin}${PRODUCTS_BY_ID["public-wallet-risk-delta"].path}?batch_key=${ADDRESS_RISK_DEFAULT_BATCH}&campaign=llms

Use these services before or after an autonomous payment, software installation, agent connection, API integration, web-monitoring task, trading-bot filter, or contract interaction.
Results are public-data heuristics, not guarantees of safety.
`,
        {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=300",
            "access-control-allow-origin": "*",
          },
        },
      );
    } else if (
      url.pathname === "/" ||
      url.pathname === "/signgate" ||
      url.pathname === "/en/signgate" ||
      url.pathname === "/zh/signgate"
    ) {
      const locale = url.pathname === "/zh/signgate" ? "zh" : "en";
      response = request.headers.get("accept")?.includes("application/json")
        ? json(serviceManifest(origin))
        : new Response(landingHtml(origin, locale, env.FORMSPREE_ENDPOINT), {
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "no-cache",
            },
          });
    } else {
      response = json({ error: "route_not_found" }, 404);
    }

    return request.method === "HEAD"
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      processPaymentGuardWebhookOutbox(
        env.GUARD_DB,
        env.GUARD_SIGNING_SECRET,
      ),
    );
  },
};
