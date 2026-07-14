# Agent Buyer Policy Kit Release Checklist

Status: DRAFT - not yet publicly released

## Completed

- JavaScript evaluator.
- JSON starter policy.
- Product category taxonomy.
- Role x product category matrix.
- Package README.
- Package tests.
- Python evaluator.
- Python tests.
- `npm pack --dry-run` verification.
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

1. Generate npm tarball.
2. Generate Python source archive.
3. Hash both artifacts.
4. Add an x402 paid delivery endpoint only after Founder approves price.
5. Provide buyer with hashes, install instructions, and policy customization
   guide.
