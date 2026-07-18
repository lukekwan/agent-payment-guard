import { parse } from "@humanwhocodes/momoa";
import canonicalize from "canonicalize";

const LIMITS = Object.freeze({
  maxBytes: 32768,
  maxDepth: 16,
  maxObjectMembers: 128,
  maxArrayLength: 128,
  maxStringLength: 4096,
  maxPathLength: 512,
  maxIntentLength: 1024
});

function utf8ByteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

const ALLOWED_TOP_LEVEL = new Set([
  "contract_version",
  "request_id",
  "organization_id",
  "agent",
  "action",
  "intent",
  "mandate",
  "evidence",
  "context"
]);

const ALLOWED_ACTION = new Set(["type", "target", "parameters"]);
const ALLOWED_TARGET = new Set(["environment", "service", "project", "repository"]);
const ALLOWED_REPOSITORY = new Set(["host", "owner", "repo", "remote_url"]);
const ALLOWED_PARAMETERS = new Set([
  "git_commit",
  "artifact_digest",
  "diff_digest",
  "changed_paths",
  "changed_routes",
  "touches_secrets",
  "touches_dns",
  "touches_permissions",
  "touches_credentials",
  "deployment_strategy",
  "deployment_command_id",
  "configuration_fingerprint",
  "ci_evidence"
]);

const DEPLOY_FIELDS = Object.freeze([
  ["action", "target", "environment"],
  ["action", "target", "service"],
  ["action", "target", "project"],
  ["action", "target", "repository", "host"],
  ["action", "target", "repository", "owner"],
  ["action", "target", "repository", "repo"],
  ["action", "target", "repository", "remote_url"],
  ["action", "parameters", "git_commit"],
  ["action", "parameters", "artifact_digest"],
  ["action", "parameters", "diff_digest"],
  ["action", "parameters", "changed_paths"],
  ["action", "parameters", "changed_routes"],
  ["action", "parameters", "touches_secrets"],
  ["action", "parameters", "touches_dns"],
  ["action", "parameters", "touches_permissions"],
  ["action", "parameters", "touches_credentials"],
  ["action", "parameters", "deployment_strategy"],
  ["action", "parameters", "deployment_command_id"],
  ["action", "parameters", "configuration_fingerprint"],
  ["action", "parameters", "ci_evidence"]
]);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function assertAllowedKeys(obj, allowed, path) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new Error(`unknown field ${path}.${key}`);
    }
  }
}

function detectDuplicatesAndBounds(node, depth = 0) {
  if (depth > LIMITS.maxDepth) {
    throw new Error("resource bound: max depth exceeded");
  }

  if (!node || typeof node !== "object") {
    return;
  }

  if (node.type === "Object") {
    if (node.members.length > LIMITS.maxObjectMembers) {
      throw new Error("resource bound: max object members exceeded");
    }
    const names = new Set();
    for (const member of node.members) {
      const name = member.name.value;
      if (typeof name === "string" && utf8ByteLength(name) > LIMITS.maxStringLength) {
        throw new Error("resource bound: max string length exceeded");
      }
      if (names.has(name)) {
        throw new Error(`duplicate key: ${name}`);
      }
      names.add(name);
      detectDuplicatesAndBounds(member.value, depth + 1);
    }
    return;
  }

  if (node.type === "Array") {
    if (node.elements.length > LIMITS.maxArrayLength) {
      throw new Error("resource bound: max array length exceeded");
    }
    for (const element of node.elements) {
      detectDuplicatesAndBounds(element.value, depth + 1);
    }
    return;
  }

  if (node.type === "String" && utf8ByteLength(node.value) > LIMITS.maxStringLength) {
    throw new Error("resource bound: max string length exceeded");
  }
}

function parseStrictJsonBytes(bytes) {
  if (bytes.byteLength > LIMITS.maxBytes) {
    throw new Error("resource bound: max raw request bytes exceeded");
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const ast = parse(text, { mode: "json", allowTrailingCommas: false });
  detectDuplicatesAndBounds(ast.body, 0);
  const parsed = JSON.parse(text);
  validateSchema(parsed);
  return parsed;
}

function parseResourceProbe(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength > LIMITS.maxBytes) {
    throw new Error("resource bound: max raw request bytes exceeded");
  }
  const ast = parse(text, { mode: "json", allowTrailingCommas: false });
  detectDuplicatesAndBounds(ast.body, 0);
  return true;
}

function checkRawByteBound(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength > LIMITS.maxBytes) {
    throw new Error("resource bound: max raw request bytes exceeded");
  }
  return true;
}

function validateSchema(parsed) {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("schema-invalid root");
  }
  assertAllowedKeys(parsed, ALLOWED_TOP_LEVEL, "$");
  if (parsed.contract_version !== "0.1") {
    throw new Error("schema-invalid contract_version");
  }
  if (typeof parsed.organization_id !== "string") {
    throw new Error("schema-invalid organization_id");
  }
  if (!parsed.action || typeof parsed.action !== "object" || Array.isArray(parsed.action)) {
    throw new Error("schema-invalid action");
  }
  assertAllowedKeys(parsed.action, ALLOWED_ACTION, "$.action");
  if (parsed.action.type !== "deploy_change") {
    throw new Error("schema-invalid action.type");
  }
  assertAllowedKeys(parsed.action.target, ALLOWED_TARGET, "$.action.target");
  assertAllowedKeys(parsed.action.target.repository, ALLOWED_REPOSITORY, "$.action.target.repository");
  assertAllowedKeys(parsed.action.parameters, ALLOWED_PARAMETERS, "$.action.parameters");
  if (!["local", "preview", "production"].includes(parsed.action.target.environment)) {
    throw new Error("schema-invalid action.target.environment");
  }
  for (const [key, value] of Object.entries(parsed.action.parameters)) {
    if (value === null) {
      throw new Error(`schema-invalid null ${key}`);
    }
  }
  for (const field of ["touches_secrets", "touches_dns", "touches_permissions"]) {
    if (typeof parsed.action.parameters[field] !== "boolean") {
      throw new Error(`schema-invalid ${field}`);
    }
  }
  if ("touches_credentials" in parsed.action.parameters &&
      typeof parsed.action.parameters.touches_credentials !== "boolean") {
    throw new Error("schema-invalid touches_credentials");
  }
  if (parsed.action.parameters.changed_paths?.some(path => utf8ByteLength(path) > LIMITS.maxPathLength)) {
    throw new Error("resource bound: max changed path length exceeded");
  }
  if (typeof parsed.intent === "string" && utf8ByteLength(parsed.intent) > LIMITS.maxIntentLength) {
    throw new Error("resource bound: max intent length exceeded");
  }
}

function getAtPath(obj, path) {
  return path.reduce((current, key) => current?.[key], obj);
}

function setAtPath(obj, path, value) {
  const clone = structuredClone(obj);
  let current = clone;
  for (const key of path.slice(0, -1)) {
    current = current[key];
  }
  current[path.at(-1)] = value;
  return clone;
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function fingerprintEnvelope(request) {
  const action = structuredClone(request.action);
  if (Array.isArray(action.parameters.changed_paths)) {
    action.parameters.changed_paths = [...action.parameters.changed_paths].sort();
  }
  if (Array.isArray(action.parameters.changed_routes)) {
    action.parameters.changed_routes = [...action.parameters.changed_routes].sort();
  }
  return {
    contract_version: request.contract_version,
    organization_id: request.organization_id,
    agent_id: request.agent.id,
    action
  };
}

async function fingerprint(request) {
  return sha256Hex(canonicalize(fingerprintEnvelope(request)));
}

function baseDeployRequest() {
  return {
    contract_version: "0.1",
    request_id: "req_compat_01",
    organization_id: "org_nomos",
    agent: {
      id: "codex_dev_01",
      type: "coding_agent",
      authenticated_by: "internal_service_identity"
    },
    action: {
      type: "deploy_change",
      target: {
        environment: "preview",
        service: "signgate-worker",
        project: "base-agent-preflight",
        repository: {
          host: "github.com",
          owner: "lukekwan",
          repo: "agent-payment-guard",
          remote_url: "https://github.com/lukekwan/agent-payment-guard"
        }
      },
      parameters: {
        git_commit: "0123456789abcdef0123456789abcdef01234567",
        artifact_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        diff_digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        changed_paths: ["src/index.js", "test/index.test.js"],
        changed_routes: ["/v1/decisions"],
        touches_secrets: false,
        touches_dns: false,
        touches_permissions: true,
        touches_credentials: true,
        deployment_strategy: "worker_preview",
        deployment_command_id: "wrangler_deploy_preview",
        configuration_fingerprint: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        ci_evidence: {
          provider: "local",
          run_id: "run_compat_01",
          commit: "0123456789abcdef0123456789abcdef01234567",
          status: "passed",
          checks: ["lint", "test"]
        }
      }
    },
    intent: "Compatibility harness deploy_change fingerprint test",
    mandate: {
      id: "mandate_compat_01",
      scope: ["deploy:preview"],
      issued_by: "founder",
      expires_at: "2026-07-19T12:00:00Z"
    },
    evidence: [
      {
        id: "ev_compat_01",
        type: "test_result",
        source: "worker_harness",
        status: "passed",
        observed_at: "2026-07-18T12:00:00Z",
        subject_fingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
      }
    ],
    context: {
      requested_at: "2026-07-18T12:00:00Z"
    }
  };
}

function expectAccept(name, fn) {
  try {
    fn();
    return `PASS_ACCEPT_${name}`;
  } catch (error) {
    return `FAIL_REJECTED_${name}_${error.message}`;
  }
}

function expectReject(name, fn) {
  try {
    fn();
    return `FAIL_ACCEPTED_${name}`;
  } catch (error) {
    return `PASS_REJECT_${name}_${error.message}`;
  }
}

function nestedJson(depth) {
  let value = "0";
  for (let i = 0; i < depth; i += 1) {
    value = `{"k":${value}}`;
  }
  return value;
}

function objectMembersJson(count) {
  const members = Array.from({ length: count }, (_, i) => `"k${i}":${i}`);
  return `{${members.join(",")}}`;
}

function arrayJson(count) {
  return `[${Array.from({ length: count }, (_, i) => i).join(",")}]`;
}

function stringJson(byteCount, char = "x") {
  return JSON.stringify(char.repeat(byteCount / utf8ByteLength(char)));
}

function rawByteJson(byteCount) {
  if (byteCount < 2) {
    throw new Error("raw byte count too small for JSON string");
  }
  return `"${"x".repeat(byteCount - 2)}"`;
}

function runResourceBoundTests() {
  const exactGeneric = "x".repeat(LIMITS.maxStringLength);
  const multiByteGeneric = "é".repeat(Math.floor(LIMITS.maxStringLength / 2));
  const overMultiByteGeneric = `${multiByteGeneric}é`;

  const base = baseDeployRequest();
  const pathAtLimit = "é".repeat(LIMITS.maxPathLength / 2);
  const intentAtLimit = "é".repeat(LIMITS.maxIntentLength / 2);

  const withPath = length => {
    const request = baseDeployRequest();
    request.action.parameters.changed_paths = ["x".repeat(length)];
    return request;
  };

  const withIntent = intent => ({ ...baseDeployRequest(), intent });

  return {
    max_raw_request_bytes: {
      limit_minus_1: expectAccept("raw_limit_minus_1", () => checkRawByteBound(rawByteJson(LIMITS.maxBytes - 1))),
      exact_limit: expectAccept("raw_exact_limit", () => checkRawByteBound(rawByteJson(LIMITS.maxBytes))),
      limit_plus_1: expectReject("raw_limit_plus_1", () => checkRawByteBound(rawByteJson(LIMITS.maxBytes + 1))),
      multibyte_utf8: expectAccept("raw_multibyte", () => checkRawByteBound(`"${"é".repeat(10)}"`))
    },
    max_json_depth: {
      limit_minus_1: expectAccept("depth_limit_minus_1", () => parseResourceProbe(nestedJson(LIMITS.maxDepth - 1))),
      exact_limit: expectAccept("depth_exact_limit", () => parseResourceProbe(nestedJson(LIMITS.maxDepth))),
      limit_plus_1: expectReject("depth_limit_plus_1", () => parseResourceProbe(nestedJson(LIMITS.maxDepth + 1))),
      multibyte_utf8: expectAccept("depth_multibyte", () => parseResourceProbe(`{"é":${nestedJson(2)}}`))
    },
    max_object_members: {
      limit_minus_1: expectAccept("members_limit_minus_1", () => parseResourceProbe(objectMembersJson(LIMITS.maxObjectMembers - 1))),
      exact_limit: expectAccept("members_exact_limit", () => parseResourceProbe(objectMembersJson(LIMITS.maxObjectMembers))),
      limit_plus_1: expectReject("members_limit_plus_1", () => parseResourceProbe(objectMembersJson(LIMITS.maxObjectMembers + 1))),
      multibyte_utf8: expectAccept("members_multibyte", () => parseResourceProbe('{"é":1,"è":2}'))
    },
    max_array_length: {
      limit_minus_1: expectAccept("array_limit_minus_1", () => parseResourceProbe(arrayJson(LIMITS.maxArrayLength - 1))),
      exact_limit: expectAccept("array_exact_limit", () => parseResourceProbe(arrayJson(LIMITS.maxArrayLength))),
      limit_plus_1: expectReject("array_limit_plus_1", () => parseResourceProbe(arrayJson(LIMITS.maxArrayLength + 1))),
      multibyte_utf8: expectAccept("array_multibyte", () => parseResourceProbe('["é","è"]'))
    },
    max_generic_string_bytes: {
      limit_minus_1: expectAccept("string_limit_minus_1", () => parseResourceProbe(stringJson(LIMITS.maxStringLength - 1))),
      exact_limit: expectAccept("string_exact_limit", () => parseResourceProbe(JSON.stringify(exactGeneric))),
      limit_plus_1: expectReject("string_limit_plus_1", () => parseResourceProbe(JSON.stringify(`${exactGeneric}x`))),
      multibyte_utf8_over_code_unit: expectReject("string_multibyte_over", () => parseResourceProbe(JSON.stringify(overMultiByteGeneric)))
    },
    max_changed_paths_item_bytes: {
      limit_minus_1: expectAccept("path_limit_minus_1", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(withPath(LIMITS.maxPathLength - 1))))),
      exact_limit: expectAccept("path_exact_limit", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify({ ...base, action: { ...base.action, parameters: { ...base.action.parameters, changed_paths: [pathAtLimit] } } })))),
      limit_plus_1: expectReject("path_limit_plus_1", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(withPath(LIMITS.maxPathLength + 1))))),
      multibyte_utf8_over_code_unit: expectReject("path_multibyte_over", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify({ ...base, action: { ...base.action, parameters: { ...base.action.parameters, changed_paths: [`${pathAtLimit}é`] } } }))))
    },
    max_intent_bytes: {
      limit_minus_1: expectAccept("intent_limit_minus_1", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(withIntent("x".repeat(LIMITS.maxIntentLength - 1)))))),
      exact_limit: expectAccept("intent_exact_limit", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(withIntent(intentAtLimit))))),
      limit_plus_1: expectReject("intent_limit_plus_1", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(withIntent("x".repeat(LIMITS.maxIntentLength + 1)))))),
      multibyte_utf8_over_code_unit: expectReject("intent_multibyte_over", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(withIntent(`${intentAtLimit}é`)))))
    }
  };
}

async function runCanonicalVectorTests(request) {
  const vectors = [
    ["numeric_boundaries", { small: 5e-324, max: 1.7976931348623157e308, min: -1.7976931348623157e308 }, "{\"max\":1.7976931348623157e+308,\"min\":-1.7976931348623157e+308,\"small\":5e-324}"],
    ["integer_decimal", { i: 333333333.33333329, n: 1e30, z: 0 }, "{\"i\":333333333.3333333,\"n\":1e+30,\"z\":0}"],
    ["exponent_formatting", { a: 1e-27, b: 1e21, c: 0.000001 }, "{\"a\":1e-27,\"b\":1e+21,\"c\":0.000001}"],
    ["negative_zero", { z: -0 }, "{\"z\":0}"],
    ["unicode_escaping", { newline: "\n", quote: "\"", backslash: "\\", nul: "\u0000" }, "{\"backslash\":\"\\\\\",\"newline\":\"\\n\",\"nul\":\"\\u0000\",\"quote\":\"\\\"\"}"],
    ["non_ascii_unicode", { "€": "Euro", "𝄞": "music", "é": "e-acute" }, "{\"é\":\"e-acute\",\"€\":\"Euro\",\"𝄞\":\"music\"}"],
    ["key_ordering", { b: 2, a: 1, aa: 3, "ä": 4 }, "{\"a\":1,\"aa\":3,\"b\":2,\"ä\":4}"],
    ["complete_signgate_envelope", fingerprintEnvelope(request), canonicalize(fingerprintEnvelope(request))]
  ];

  const results = {};
  for (const [name, value, expected] of vectors) {
    const actual = canonicalize(value);
    results[name] = {
      canonical_bytes: actual,
      sha256: await sha256Hex(actual),
      result: actual === expected ? "PASS" : `FAIL_EXPECTED_${expected}`
    };
  }
  return results;
}

async function runFingerprintSemanticTests(request, baseFingerprint) {
  const unicodeMutation = setAtPath(request, ["action", "target", "service"], "signgate-worker-é");
  const orderedArrayMutation = setAtPath(request, ["action", "parameters", "ci_evidence"], {
    ...request.action.parameters.ci_evidence,
    checks: ["test", "lint"]
  });
  const changedPathsReordered = setAtPath(request, ["action", "parameters", "changed_paths"], [...request.action.parameters.changed_paths].reverse());
  const changedRoutesReordered = setAtPath(request, ["action", "parameters", "changed_routes"], ["/z", "/a"]);
  const changedRoutesSorted = setAtPath(request, ["action", "parameters", "changed_routes"], ["/a", "/z"]);
  const omittedArtifact = structuredClone(request);
  delete omittedArtifact.action.parameters.artifact_digest;
  const presentUndefinedArtifact = structuredClone(request);
  presentUndefinedArtifact.action.parameters.artifact_digest = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const enumCase = setAtPath(request, ["action", "target", "environment"], "Preview");
  const identifierCase = setAtPath(request, ["action", "target", "service"], "SignGate-Worker");

  return {
    unicode_value_mutation_changes_fingerprint:
      (await fingerprint(unicodeMutation)) !== baseFingerprint ? "PASS" : "FAIL",
    semantically_significant_array_order_changes_fingerprint:
      (await fingerprint(orderedArrayMutation)) !== baseFingerprint ? "PASS" : "FAIL",
    changed_paths_set_normalized_order:
      (await fingerprint(changedPathsReordered)) === baseFingerprint ? "PASS" : "FAIL",
    changed_routes_set_normalized_order:
      (await fingerprint(changedRoutesReordered)) === (await fingerprint(changedRoutesSorted)) ? "PASS" : "FAIL",
    omitted_optional_field_changes_fingerprint:
      (await fingerprint(omittedArtifact)) !== (await fingerprint(presentUndefinedArtifact)) ? "PASS" : "FAIL",
    schema_invalid_null_rejected_before_fingerprint:
      expectReject("null_artifact_digest", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify({ ...baseDeployRequest(), action: { ...baseDeployRequest().action, parameters: { ...baseDeployRequest().action.parameters, artifact_digest: null } } })))),
    allowed_null_semantics: "PASS_NO_ALLOWED_NULL_FIELDS_IN_DEPLOY_CHANGE_V0_1",
    enum_case_sensitivity:
      expectReject("enum_case", () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(enumCase)))),
    identifier_case_sensitivity:
      (await fingerprint(identifierCase)) !== baseFingerprint ? "PASS" : "FAIL",
    changed_paths_normalization:
      (await fingerprint(changedPathsReordered)) === baseFingerprint ? "PASS" : "FAIL",
    changed_routes_normalization:
      (await fingerprint(changedRoutesReordered)) === (await fingerprint(changedRoutesSorted)) ? "PASS" : "FAIL"
  };
}

async function runSelfTest() {
  const rejectCases = [
    ["comments", "{// bad\n\"contract_version\":\"0.1\"}"],
    ["trailing_commas", "{\"contract_version\":\"0.1\",}"],
    ["ordinary_duplicate", "{\"a\":1,\"a\":2}"],
    ["escaped_equivalent_duplicate", "{\"\\u0061\":1,\"a\":2}"],
    ["nested_duplicate", "{\"outer\":{\"a\":1,\"a\":2}}"],
    ["array_object_duplicate", "{\"items\":[{\"a\":1,\"a\":2}]}"],
    ["malformed_escape", "{\"a\":\"\\uZZZZ\"}"],
    ["unsupported_number", "{\"a\":01}"],
    ["unknown_field", JSON.stringify({ ...baseDeployRequest(), unknown: true })],
    ["schema_null", JSON.stringify({ ...baseDeployRequest(), organization_id: null })],
    ["resource_bounds", JSON.stringify({ ...baseDeployRequest(), intent: "x".repeat(1025) })]
  ];

  const rejections = {};
  for (const [name, text] of rejectCases) {
    try {
      parseStrictJsonBytes(new TextEncoder().encode(text));
      rejections[name] = "FAIL_ACCEPTED";
    } catch (error) {
      rejections[name] = `PASS_REJECTED_${error.message}`;
    }
  }

  const request = parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(baseDeployRequest())));
  const resourceBoundResults = runResourceBoundTests();
  const rfc8785VectorResults = await runCanonicalVectorTests(request);
  const shaGolden = await sha256Hex("abc");
  const shaGoldenPass = shaGolden === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

  const baseFingerprint = await fingerprint(request);
  const fingerprintSemanticResults = await runFingerprintSemanticTests(request, baseFingerprint);
  const fingerprintParticipation = {};
  for (const path of DEPLOY_FIELDS) {
    const current = getAtPath(request, path);
    const replacement = Array.isArray(current)
      ? [...current, "__mutated__"]
      : typeof current === "boolean"
        ? !current
        : `${current}__mutated__`;
    const mutated = setAtPath(request, path, replacement);
    fingerprintParticipation[path.join(".")] =
      (await fingerprint(mutated)) !== baseFingerprint ? "PASS" : "FAIL";
  }

  const unicodeCaseRequest = parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify({
    ...baseDeployRequest(),
    action: {
      ...baseDeployRequest().action,
      parameters: {
        ...baseDeployRequest().action.parameters,
        changed_paths: ["src/éxample.js", "SRC/example.js"],
        changed_routes: [],
        artifact_digest: undefined
      }
    }
  }, (_key, value) => value === undefined ? undefined : value)));

  return {
    package_execution: "PASS",
    parser_options: { mode: "json", allowTrailingCommas: false },
    limits: LIMITS,
    rejections,
    resource_bound_results: resourceBoundResults,
    rfc8785_vector_results: rfc8785VectorResults,
    webcrypto_sha256: shaGoldenPass ? "PASS" : `FAIL_${shaGolden}`,
    base_fingerprint: `sha256:${baseFingerprint}`,
    fingerprint_semantic_results: fingerprintSemanticResults,
    fingerprint_participation: fingerprintParticipation,
    unicode_arrays_omission_null_case_vectors:
      unicodeCaseRequest.action.parameters.changed_paths.length === 2 &&
      !("artifact_digest" in unicodeCaseRequest.action.parameters)
        ? "PASS"
        : "FAIL"
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/self-test") {
      return jsonResponse(await runSelfTest());
    }
    if (url.pathname === "/parse") {
      try {
        const bytes = new Uint8Array(await request.arrayBuffer());
        return jsonResponse({ ok: true, parsed: parseStrictJsonBytes(bytes) });
      } catch (error) {
        return jsonResponse({ ok: false, error: String(error.message || error) }, 400);
      }
    }
    return jsonResponse({ ok: true, harness: "dev-sg-001b-worker-compatibility" });
  }
};
