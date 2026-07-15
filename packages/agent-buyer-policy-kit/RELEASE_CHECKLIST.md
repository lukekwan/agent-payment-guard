# Agentic Commerce Policy Kit Release Checklist

Status: DRAFT - not yet publicly released

## Completed

- JavaScript evaluator.
- JavaScript Agentic Commerce evaluator.
- JSON starter policy.
- Product category taxonomy.
- Role x product category matrix.
- Package README.
- Package tests.
- Python evaluator.
- Python Agentic Commerce evaluator.
- Python tests.
- Deterministic test vectors for:
  - missing mandate
  - mandate role mismatch
  - merchant wallet mismatch
  - payment execution signer directive
- `npm pack --dry-run` verification.
- Private npm tarball:
  `signgate-agent-buyer-policy-kit-0.1.0.tgz`
- Private Python source archive:
  `dist/signgate-agent-buyer-policy-kit-python-0.1.0.tar.gz`
- Hosted x402 preflight API is live separately.

## Not Yet Completed

These are intentionally gated because they are public or commercial actions:

- Publish npm package.
- Publish Python package.
- Create public download page.
- Add paid x402 developer-kit delivery endpoint.
- Define final public price.
- Define license and support terms.

## Release Gate

Do not perform the following without explicit Founder approval:

- `npm publish`
- publishing to PyPI
- creating a public downloadable artifact
- selling the developer kit through x402
- making repository source public

## Suggested Next Release

Release `v0.1.0-private` as a private/customer-delivered kit:

1. Add an x402 paid delivery endpoint only after Founder approves price.
2. Provide buyer with hashes, install instructions, and policy customization
   guide.
