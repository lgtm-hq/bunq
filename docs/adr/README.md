# Architecture decisions

This index is the entry point for the client and MCP design. The
[programme epic][programme] owns delivery scope; the
[ADR/threat-model issue][adr] will turn the proposed decisions below into
reviewed records. These are planned boundaries, not evidence of an implemented
or sandbox-verified system.

- Portable client with injected configuration, credential store and logging;
  per-profile session ownership, Node crypto and exact decimal money values.
- Raycast uses a pinned published client through native adapters. MCP depends on
  that same client. Consumer compatibility is proved before migration.
- The agent host launches a stdio bridge to a separate OS user's service over a
  Unix socket. Credential, service and policy ownership must resist agent shell
  access.
- Verified reads first. Native-app-approved drafts follow sandbox proof. Direct
  execution requires a later independent approval boundary.
- Durable journals and reconciliation for unknown write outcomes; duplicate
  request detection does not mean replay of a successful response.
- Captured sandbox contracts, explicit schema drift/partial-data states and a
  capability matrix for supported endpoints.
- Structured untrusted bank text plus enforced recipient/approval controls;
  provider, history and retention decisions before live data reaches an agent.

Authentication policy for personal API keys versus public applications/OAuth is
an [open gate][auth], including the distributed Raycast consumer. IP policy,
response-signature presence and draft approval behaviour require evidence; no
undocumented OAuth/PKCE support is assumed.

[ADR 0001](0001-authentication.md) proposes separate publication, personal-profile
and public OAuth gates. It remains proposed while the
[authentication evidence and provider questions](../authentication.md) are open.

Create numbered ADRs under this directory with context, decision, alternatives,
consequences, evidence and status. Link each proposed, accepted or superseded
ADR here with its status. Do not store credentials or private deployment
details in an ADR.

[programme]: https://github.com/lgtm-hq/bunq/issues/1
[adr]: https://github.com/lgtm-hq/bunq/issues/16
[auth]: https://github.com/lgtm-hq/bunq/issues/12
