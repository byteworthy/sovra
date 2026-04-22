# Support

Sovra is MIT-licensed open source with community-first support.

## Community support

- **GitHub Discussions**: questions, architecture ideas, and implementation guidance.
  <https://github.com/ByteWorthyLLC/sovra/discussions>
- **GitHub Issues**: reproducible bugs and actionable feature requests.
- **Documentation**: see `README.md` and `docs/` for deployment/ops references.

Community support is best-effort.

## Priority support (commercial)

[ByteWorthy](https://byteworthy.io) offers optional paid support for teams running Sovra in production:

- Priority incident response
- Architecture and security reviews
- Custom integrations and implementation assistance
- Migration planning and release hardening

Contact: **support@byteworthy.io**.

## Incident priority matrix

Use these labels in your support request subject line:

| Priority | Typical impact | Example |
|---|---|---|
| `P1` | Production outage, security incident, or cross-tenant risk | Service unavailable, isolation failure |
| `P2` | Major degradation with business impact | Realtime/MCP unavailable for many tenants |
| `P3` | Functional bug with workaround | Feature regression in one workflow |
| `P4` | Low-impact issue or guidance request | Documentation clarity, non-blocking enhancement |

## What to include in support requests

- Sovra version/commit SHA
- Deployment target (`Docker`, `Railway`, `Cloud Run`, etc.)
- Reproduction steps
- Affected routes/endpoints
- Relevant logs and timestamps (with timezone)
- For incidents, current mitigation status

## Security issues

Do not use issues/discussions for vulnerabilities.
Use `security@byteworthy.io` and follow `SECURITY.md`.
