---
"@jabworks/condux": patch
---

Publish with npm provenance attestations.

`publishConfig.provenance` is now `true`, so releases carry a signed provenance
attestation linking the tarball to the workflow run and commit that produced it.
The release workflow already had everything this needs — `id-token: write`, npm
≥11.5.1, and OIDC trusted publishing with no `NPM_TOKEN` — but the opt-in was
missing, and 0.1.0 (published by hand before that workflow existed) has no
attestation at all.
