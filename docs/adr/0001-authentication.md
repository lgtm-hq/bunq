# ADR 0001: separate library publication from consumer authentication

Status: proposed; independent reviews and provider answers pending.
Date: 2026-10-26. Owner: LGTM HQ maintainers. Delivery gate: #12.

## Context

The public client library will serve a distributed Raycast extension and an
isolated service used by Hermes. Publishing code neither grants banking
authority nor establishes the permitted authentication model for each consumer.

Official bunq documentation requires OAuth for public projects and permits
personal keys when only the owner has access to the application. The documented
OAuth exchange requires a client secret. A distributed extension cannot keep
that shared secret confidential. Public/native PKCE support and the
classification of a publicly available but privately operated service have not
been confirmed. [The evidence and questions](../authentication.md) record the
official sources inspected and their limitations.

## Proposed decision

Publish no credentials or application secret in either npm package or the
Raycast extension. Separate three gates: package publication, explicitly
approved personal-profile provisioning, and public consumer onboarding.

Support the documented personal-key mechanism only within the sole-owner
boundary, subject to bunq's classification answer and explicit operator
authorisation. Provision each machine/environment independently. The isolated
credential service owns its keys and sessions; agent tools receive bounded
capabilities. This proposal does not establish that isolation yet.

For a public application, require OAuth. Keep public onboarding disabled until
bunq confirms the flow, eligibility, scopes and lifecycle. The candidate
confidential backend would require a named maintainer operator and retain
application
secrets and, in the custodial option, user tokens/session state server-side.
It must validate state/redirects and bind each account link to its initiator as
specified in the authentication guide. Adoption requires an explicit custody
and operations decision; no such backend has been deployed or approved here.

If bunq confirms a supported native flow, review it as an alternative rather
than introducing a backend unnecessarily. Do not assume PKCE or a device grant,
and do not compensate for an unsupported public flow with embedded secrets or
API-key collection. Keep direct execution disabled under the existing delivery
contract regardless of credential authority.

## Alternatives

### Embed a shared secret in desktop/CLI packages

Reject: distribution exposes it to recipients and agent-readable files.

### Personal API keys for all public users

Reject as a public-flow fallback: contradicts the documented public-project
rule absent provider approval.

### Assume secretless OAuth/PKCE

Defer: no inspected official page establishes support.

### Operate a confidential broker

Candidate only: supports documented secret custody but adds sensitive
infrastructure, operational ownership and product eligibility gates.

### Publish the credential-free library first

Separate release milestone; still requires package verification and honest
capability documentation. It does not unblock public authenticated onboarding.

## Consequences and validation

Authentication research and portable interfaces can progress while public
onboarding stays blocked. #12 remains open for provider replies; #16 owns the
complete trust model, #18 captured contracts, #24/#28 provisioning/session
proofs and #60 rotation/revocation. #51/#65 own consumer compatibility and
rollout, not permission to bypass authentication requirements.

The guide's lifecycle walkthrough covers expired/revoked credentials, denied
consent, invalid
callbacks, lost devices, changed IPs and uncertain writes. These are design
walkthroughs; passing mocks cannot prove bunq's expiry, revocation, scope or
draft-approval semantics. Revisit this ADR after dated provider answers and
sandbox observations. No banking requests, registrations or credential changes
were performed for this record.
