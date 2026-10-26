# bunq MCP adapter

Workspace foundation for the agent adapter. No MCP transport or banking tools
are implemented yet. The package is private until release onboarding.

The binary supports `--help` and `--version`. Starting without a supported option
fails explicitly on stderr; it never pretends to serve MCP. It consumes the
portable client through the published ESM entry point.

See the repository README for build, packaging and compatibility validation.
