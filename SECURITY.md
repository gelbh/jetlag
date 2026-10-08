# Security Policy

## Supported versions

Only the latest release on [`main`](https://github.com/gelbh/jetlag) is supported with security updates.

## Reporting a vulnerability

Please use GitHub **[Report a vulnerability](https://github.com/gelbh/jetlag/security/advisories/new)** (private vulnerability reporting).

Do **not** open a public Issue or Discussion with exploit details, secrets, or proof-of-concept payloads.

Include when you can:

- A short summary and impact
- Affected surface (web app, Firebase Functions, Cloudflare Worker, or repo tooling)
- Steps to reproduce, or a minimal private PoC
- Whether you have already rotated any exposed credentials

You should get an acknowledgment within **7 days**. Fix timing is best-effort (solo maintainer). There is **no bug bounty**.

## Out of scope

- Social engineering of players or support spam
- Reports that only restate an open [Dependabot alert](https://github.com/gelbh/jetlag/security/dependabot) (track those on the Security tab instead)
- Issues in third-party services outside this repository’s deploy surface

## Secrets

If you find a live secret, rotate or revoke it first when you control it, then describe the class of leak in the private advisory. Do not paste production secret values into GitHub.
