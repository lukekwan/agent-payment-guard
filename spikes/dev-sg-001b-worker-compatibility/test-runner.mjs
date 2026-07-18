import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Miniflare } from "miniflare";

const execFileAsync = promisify(execFile);
const compatibilityDate = "2026-07-18";

async function bundleWorker() {
  await mkdir("dist", { recursive: true });
  await execFileAsync("npx", [
    "esbuild",
    "worker.mjs",
    "--bundle",
    "--format=esm",
    "--platform=browser",
    "--target=es2022",
    "--outfile=dist/worker.bundle.mjs",
    "--log-level=info"
  ]);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertDeepPass(value, path) {
  if (typeof value === "string") {
    assert(value.startsWith("PASS"), `${path} must pass, got ${value}`);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "canonical_bytes" || key === "sha256") {
        continue;
      }
      assertDeepPass(child, `${path}.${key}`);
    }
    return;
  }
  throw new Error(`${path} has unsupported result ${value}`);
}

async function main() {
  await bundleWorker();

  const mf = new Miniflare({
    modules: true,
    scriptPath: "dist/worker.bundle.mjs",
    compatibilityDate
  });

  const response = await mf.dispatchFetch("http://compat.test/self-test");
  const results = await response.json();
  await mf.dispose();

  assert(response.status === 200, "self-test response must be 200");
  assert(results.package_execution === "PASS", "packages must execute in Worker runtime");
  assert(results.rejections.comments.startsWith("PASS"), "comments must reject");
  assert(results.rejections.trailing_commas.startsWith("PASS"), "trailing commas must reject");
  assert(results.rejections.ordinary_duplicate.startsWith("PASS"), "ordinary duplicate keys must reject");
  assert(results.rejections.escaped_equivalent_duplicate.startsWith("PASS"), "escaped duplicate keys must reject");
  assert(results.rejections.nested_duplicate.startsWith("PASS"), "nested duplicate keys must reject");
  assert(results.rejections.array_object_duplicate.startsWith("PASS"), "array object duplicate keys must reject");
  assert(results.rejections.malformed_escape.startsWith("PASS"), "malformed escapes must reject");
  assert(results.rejections.unsupported_number.startsWith("PASS"), "unsupported numeric forms must reject");
  assert(results.rejections.resource_bounds.startsWith("PASS"), "resource bounds must reject");
  assert(results.rejections.unknown_field.startsWith("PASS"), "unknown fields must reject");
  assertDeepPass(results.resource_bound_results, "resource_bound_results");
  assertDeepPass(results.rfc8785_vector_results, "rfc8785_vector_results");
  assert(
    results.complete_envelope_literal_golden.complete_envelope_literal_canonical_bytes === "PASS",
    "complete envelope literal canonical bytes must match committed fixture"
  );
  assert(
    results.complete_envelope_literal_golden.complete_envelope_literal_sha256 === "PASS",
    "complete envelope literal SHA-256 must match committed fixture"
  );
  assert(results.set_normalization_results.CHANGED_PATHS_DEDUP === "PASS", "changed_paths dedup must pass");
  assert(
    results.set_normalization_results.CHANGED_PATHS_PERMUTATION_EQUIVALENCE === "PASS",
    "changed_paths permutation equivalence must pass"
  );
  assert(results.set_normalization_results.CHANGED_ROUTES_DEDUP === "PASS", "changed_routes dedup must pass");
  assert(
    results.set_normalization_results.CHANGED_ROUTES_PERMUTATION_EQUIVALENCE === "PASS",
    "changed_routes permutation equivalence must pass"
  );
  assert(
    results.set_normalization_results.SET_NORMALIZATION_IDEMPOTENCE === "PASS",
    "set normalization idempotence must pass"
  );
  assert(
    results.set_normalization_results.SET_NORMALIZATION_NO_INPUT_MUTATION === "PASS",
    "set normalization must not mutate input"
  );
  assert(
    results.set_normalization_results.SET_UNIQUE_VALUE_MUTATION_CHANGES_FINGERPRINT === "PASS",
    "new unique path/route values must change fingerprint"
  );
  assert(results.webcrypto_sha256 === "PASS", "Web Crypto SHA-256 must match golden digest");
  assertDeepPass(results.fingerprint_semantic_results, "fingerprint_semantic_results");
  assert(results.unicode_arrays_omission_null_case_vectors === "PASS", "unicode/array/omission/case vectors must pass");

  for (const [field, status] of Object.entries(results.fingerprint_participation)) {
    assert(status === "PASS", `${field} must participate in fingerprint`);
  }

  const report = {
    harness: "DEV-SG-001B Worker Compatibility",
    status: "PASS",
    compatibility_date: compatibilityDate,
    results
  };

  await mkdir("evidence", { recursive: true });
  await writeFile("evidence/worker-compatibility-results.json", JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
