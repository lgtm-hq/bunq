# bunq

A shared TypeScript client and MCP integration for the bunq public API,
maintained by LGTM HQ. This is an independent community project, unaffiliated
with bunq.

## Status

Foundation and planning only. No client, MCP server or installable package is
available yet. Repository bootstrap is not complete, and no production banking
integration is enabled. [Bootstrap status](docs/repository-setup.md) records the
initial CI gates and remaining setup. Track delivery in the
[programme epic][programme] and [bootstrap epic][bootstrap] .

## Consumers and boundaries

- **Client:** portable authentication, transport, schemas, pagination and exact
  money handling, with injected configuration, credential storage and logging.
- **MCP:** an adapter over the client for agent consumers.
  [Hermes Agent][hermes] is an agent host; it uses a local stdio bridge to a
  credential-owning service over a Unix socket, with a separate OS identity and
  protected policy/configuration. No initial network listener.
- **Raycast:** native UI and storage adapters consuming a pinned client release.
  The extension does not depend on MCP; migration follows a compatibility proof.

The first functional target is verified account/balance reads, complete bounded
transaction queries and transaction detail. Payments start with drafts approved
in the bunq app, subject to sandbox verification. Direct execution is a later,
separately gated capability. Public API coverage will be documented from
captured contracts; parity with every bunq app feature is not promised.

## Development

Start with [AGENTS.md](AGENTS.md) , the [architecture index](docs/adr/README.md)
and [provenance](docs/provenance.md) . The intended toolchain is Bun for
workspace dependencies, Node.js for published runtime compatibility, and
uv-managed lintro for quality checks. Exact pins and executable commands land in
[workspace setup][workspace] and [quality setup][quality] . Do not treat those
planned checks as passing before they exist.

Contributions follow the inherited [LGTM HQ guide][contributing] and
[code of conduct][conduct] . Pull requests use the organisation's inherited
[template][template] . The [security policy](SECURITY.md) and
[support notes](SUPPORT.md) add banking-specific guidance to the organisation
policies. See [LICENSE](LICENSE) for MIT terms and retained notices.

[programme]: https://github.com/lgtm-hq/bunq/issues/1
[bootstrap]: https://github.com/lgtm-hq/bunq/issues/2
[workspace]: https://github.com/lgtm-hq/bunq/issues/11
[quality]: https://github.com/lgtm-hq/bunq/issues/13
[contributing]: https://github.com/lgtm-hq/.github/blob/main/CONTRIBUTING.md
[conduct]: https://github.com/lgtm-hq/.github/blob/main/CODE_OF_CONDUCT.md
[template]: https://github.com/lgtm-hq/.github/blob/main/.github/PULL_REQUEST_TEMPLATE.md

[hermes]: https://github.com/NousResearch/hermes-agent
