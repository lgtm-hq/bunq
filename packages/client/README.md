# bunq client

Workspace foundation for the portable client. No banking endpoints or
credentials are implemented yet. The package is private until release onboarding.

The ESM entry point exports `assertSupportedNodeRuntime()`. It rejects unsupported
Node releases at import time. Node support and package versions are generated
from the root workspace manifest. No Raycast, React or MCP dependency is included.

See the repository README for build, packaging and compatibility validation.
