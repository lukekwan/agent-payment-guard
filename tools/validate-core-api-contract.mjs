import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const fixturePath = path.join(root, "docs/reviews/core-api-contract/contract-fixtures.json");
const data = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const failures = [];
let scenarioCount = 0;
let responseCount = 0;
for (const endpoint of data.endpoints) {
  for (const key of ["minimal","complete","invalid","auth_failure","billing_failure","stale_evidence"]) {
    if (!(key in endpoint)) failures.push(endpoint.id + ": missing " + key);
    else scenarioCount++;
  }
  for (const name of ["minimal","complete"]) {
    const value = endpoint[name];
    for (const field of endpoint.request_schema.required) {
      if (!(field in value)) failures.push(endpoint.id + " " + name + ": missing " + field);
    }
    const unknown = Object.keys(value).filter(k => !endpoint.request_schema.allowed.includes(k));
    if (unknown.length) failures.push(endpoint.id + " " + name + ": unknown " + unknown.join(","));
  }
  const invalidMissing = endpoint.request_schema.required.some(k => !(k in endpoint.invalid));
  const invalidSpecial =
    (endpoint.id === "risk-source-address-risk" && endpoint.invalid.address === "bad") ||
    (endpoint.id === "approval-signer" && endpoint.invalid.decision === "YES") ||
    (endpoint.id === "merchant-trust" && endpoint.invalid.address === "bad") ||
    (endpoint.id === "endpoint-preflight" && !/^https?:/.test(endpoint.invalid.url || ""));
  if (!invalidMissing && !invalidSpecial) failures.push(endpoint.id + ": invalid fixture is not invalid");
  if (!endpoint.success?.data || !endpoint.success?.meta?.request_id || !endpoint.success?.meta?.environment) failures.push(endpoint.id + ": invalid success envelope");
  else responseCount++;
  if (!endpoint.error?.error?.code || !Array.isArray(endpoint.error?.error?.reason_codes) || !endpoint.error?.meta?.request_id) failures.push(endpoint.id + ": invalid error envelope");
  else responseCount++;
}
const docsRoot = path.join(root, "docs/reviews/core-api-contract");
const files = [];
for (const dir of fs.readdirSync(docsRoot, {withFileTypes:true}).filter(x=>x.isDirectory())) {
  const p=path.join(docsRoot,dir.name,"EXAMPLES.md");
  if (fs.existsSync(p)) files.push(p);
}
let curlCount=0, jsCount=0, pyCount=0;
for(const file of files){
 const text=fs.readFileSync(file,"utf8");
 const blocks=[...text.matchAll(/```(bash|js|python)\n([\s\S]*?)```/g)];
 for(const [,lang,code] of blocks){
   if(lang==="bash"){ execFileSync("bash",["-n"],{input:code}); curlCount++; }
   if(lang==="js"){ execFileSync(process.execPath,["--input-type=module","--check"],{input:code}); jsCount++; }
   if(lang==="python"){ execFileSync("python3",["-c","import ast,sys; ast.parse(sys.stdin.read())"],{input:code}); pyCount++; }
 }
}
const allDocs = fs.readdirSync(docsRoot,{recursive:true}).filter(x=>String(x).endsWith(".md") && String(x)!=="VALIDATION-REPORT.md").map(x=>path.join(docsRoot,String(x)));
const corpus=allDocs.map(p=>fs.readFileSync(p,"utf8")).join("\n");
for(const forbidden of ["sk_live_","ghp_","BEGIN PRIVATE KEY"]){ if(corpus.includes(forbidden)) failures.push("forbidden secret pattern: "+forbidden); }
const report={status:failures.length?"FAIL":"PASS",endpoints:data.endpoints.length,request_scenarios:scenarioCount,response_envelopes:responseCount,curl_blocks:curlCount,javascript_blocks:jsCount,python_blocks:pyCount,failures};
console.log(JSON.stringify(report,null,2));
if(failures.length) process.exit(1);
