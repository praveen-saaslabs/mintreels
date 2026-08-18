# Security Policy

## Reporting a vulnerability

**Do not** open a public GitHub issue for security bugs, leaked credentials, or anything that includes secrets.

Report privately via:

1. [GitHub Security Advisories](https://github.com/praveen-saaslabs/mintreels/security/advisories/new) (preferred)
2. Email [praveen.bisht@saaslabs.co](mailto:praveen.bisht@saaslabs.co)

Include enough detail to reproduce (affected version or commit, impact, and steps). We will acknowledge the report and follow up with a fix or next steps.

Please do not disclose the issue publicly until it is resolved, unless we agree otherwise.

## What is not a production credential

The demo login in the README (`demo@mintreels.io`) exists only for the local seed snapshot. It is not a production account. Do not reuse that password anywhere else.

Never commit `.env`, API keys, JWT secrets, SMTP passwords, or Filestack app secrets. Ship empty placeholders in `.env.example` only.
