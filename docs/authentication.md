# Authentication policy and release gates

This is a research record checked against official bunq documentation on
2026-10-26. Authentication is not implemented here. No banking credentials,
devices, OAuth registrations or live extension configuration were changed.
The [proposed authentication ADR](adr/0001-authentication.md) records the design
and open decisions; it does not authorise production provisioning.

## What the documentation establishes

### Public versus personal applications

Official evidence: [Authentication][auth] says OAuth is obligatory for public
projects; API keys are allowed when only the owner has access to the
application.

Project implication: A distributed Raycast application cannot assume a
bring-your-own-key exception. Classification of published code versus a
privately operated instance still needs bunq confirmation.

### Personal API keys

Official evidence: [API keys][keys] describes broad account authority, app
revocation, device registration and session creation.

Project implication: Treat a key as a banking credential, including when local
policy exposes reads only.

### OAuth authority

Official evidence: [OAuth][oauth] lists broad default capabilities, including
account changes and some payments, with separate PSD2 roles.

Project implication: OAuth does not establish a bank-enforced read-only
credential or arbitrary selectable scopes. Application policy remains
essential.

### Client credentials

Official evidence: [Registration][register] returns a client ID and client
secret, and describes one OAuth client per bunq user.

Project implication: The distributed extension cannot keep a confidential
application secret. Avoid automatic registration that could conflict with an
existing client.

### Authorization

Official evidence: [Authorization redirect][authorize] describes code flow,
registered redirect URI and recommended state.

Project implication: Require state locally; verify the callback against the
initiating application session and environment.

### Code exchange

Official evidence: [Code handling][exchange] requires a client secret and
matching redirect URI in a POST exchange.

Project implication: A secretless native flow is unverified. Do not infer
PKCE, device authorization or a refresh-token grant.

### Session use

Official evidence: [OAuth session][oauth-session] exchanges the access token
for a session; [session documentation][sessions] describes recreating expired
sessions.

Project implication: Store the long-lived credential separately from the
session token. Session renewal must not silently create another
installation/device.

### Environments

Official evidence: [Environments][environments] gives separate API,
authorization and token endpoints.

Project implication: Bind credentials, callback state and registrations to an
explicit environment; never fall back from sandbox to production.

### Production

Official evidence: [Moving to production][production] warns that access to
other users' information or payments may require a PSD2 permit.

Project implication: Maintainers must establish provider/product eligibility
before public onboarding; this record makes no exemption claim.

These are documentation observations, not captured API contracts or support
answers. OAuth overview language about fine-grained permissions does not
specify a verified least-privilege scope set for this product. A successful
sandbox request is also insufficient evidence of production signature checks:
[environments][environments] says most sandbox calls do not validate signing.

## Candidate operating modes

### Public npm library

Trust and credential owner: The caller supplies adapters and owns its
deployment; the package contains no application or user secrets.

Lifecycle and release status: Publication is separate from authorising an
authenticated consumer. Package/release gates still apply; publication grants
no banking access.

### Sole-owner personal automation

Trust and credential owner: A human operator owns its API key, installation
key, device, IP policy and session store. A separately owned service mediates
agent access.

Lifecycle and release status: Documented personal-key mechanism;
classification of a published self-hosted project and agent use is pending
bunq. Operator approval and sandbox proofs precede provisioning.

### Public Raycast application

Trust and credential owner: Users consent through bunq; a proposed
maintainer-operated confidential backend holds the application secret and, in
the custodial design, user OAuth tokens.

Lifecycle and release status: Proposed only. Broker ownership, operations,
eligibility and provider answers are unresolved. No Store authentication
migration is enabled.

### Public native/headless OAuth without a backend

Trust and credential owner: A desktop/CLI cannot protect a shared embedded
secret.

Lifecycle and release status: Blocked until bunq confirms a supported
secretless flow and its redirect/security requirements. PKCE support is
unknown, not presumed absent or available.

The MCP service and Raycast consumer need independent profiles and registrations
per machine and environment. A shared library is not a credential boundary.
Hermes and its model provider must never receive keys, tokens, OAuth codes or
the service's credential-store access. Isolation/policy implementation belongs
to #15, #16, #25 and #45, with provider/history decisions in #46.

## Proposed public OAuth custody

The candidate broker would be operated by an accountable LGTM HQ maintainer,
outside
the extension and agent process. It owns the application secret, callback
handler and, if adopted, the user token/session store and signed bunq requests.
The extension receives a separate, bounded application session, never the
broker's client secret. This creates an additional sensitive service; it is
not approved merely because the client library can be published.

The proposed callback requirements are project recommendations, not claims
about bunq's implementation:

1. Generate unpredictable opaque state, bind it to the initiating authenticated
   application session, account-link attempt and environment, and expire it.
2. Register an exact HTTPS callback. Validate the expected origin/path and
   environment; reject unexpected redirect destinations and return URLs.
   Native custom-scheme or loopback callbacks require explicit provider evidence.
3. Reject missing, mismatched, expired or reused state before code exchange.
   Consume the pending attempt once; do not put credentials or personal data in
   state. Bind the resulting account to the initiator, never a callback user ID.
4. Exchange the code server-side using the documented POST body and exact
   registered redirect URI. Redact codes/secrets/tokens from logs, telemetry,
   exception messages and URLs. Never put them in extension assets or argv.
5. Verify account identity through captured contracts before committing a link.
   Denied consent and uncertain exchanges leave no authenticated local profile.

Selecting this custodial backend versus a provider-approved native flow is a
maintainer decision after bunq answers the questions below. There is no
fallback that embeds the secret or asks public users to bypass OAuth with keys.

## Lifecycle tabletop

### Session expires

Sole-owner key profile: Recreate the session using the existing approved
registration and credential; serialize renewal under #28.

Proposed public OAuth profile: Recreate the session from the existing OAuth
token only if its continued validity is established by provider guidance and
contract evidence. Otherwise fail closed and require a fresh authorised
consent flow. Do not invent a refresh grant or silently repeat consent.

### Long-lived credential revoked/invalid

Sole-owner key profile: Fail closed, clear unusable session state and ask the
operator to repair/revoke the profile. No automatic replacement key or device.

Proposed public OAuth profile: Fail closed, invalidate the linked application
session and require a fresh authorised consent flow. Exact provider revocation
semantics remain unverified.

### Consent denied or callback invalid

Sole-owner key profile: No OAuth callback applies; key provisioning stays an
explicit operator action.

Proposed public OAuth profile: End the pending link, consume state, retain no
usable token and present a retry that starts a new attempt.

### Device lost or machine compromised

Sole-owner key profile: Human revokes affected credentials/device in bunq,
rotates local material and provisions an independent replacement.

Proposed public OAuth profile: Revoke the broker/consumer application session
and affected token/device as applicable; confirm provider operations before
claiming revocation completed.

### IP changes

Sole-owner key profile: Fail with remediation; the operator authorises a new
IP/device policy. Do not silently enable wildcard access.

Proposed public OAuth profile: Broker egress and registrations are
operator-owned; do not use the desktop's IP as the broker's authority.

### Request outcome uncertain

Sole-owner key profile: Session recovery does not permit replaying a payment.
Reconcile through #48.

Proposed public OAuth profile: Same constraint: reauthentication never
authorises replay or a new write.

Public revocation, token expiry, account unlinking and lost-device procedures
need sandbox evidence under #18, #24, #28 and #60. The [IP guide][ips] has
ambiguous wildcard wording; exact semantics and API behaviour remain a #24
provider/contract gate. This research changes no IP policy.

## Provider questions and owners

No bunq support reply has been obtained or implied. The maintainer owns sending
the following questions through an authorised support channel and recording a
dated, redacted answer. Keep #12 open until the answers are dispositioned.

Does a public SDK with no hosted service differ from a public application? Is
a sole owner's privately operated automation instance using that SDK permitted
to use a personal API key, including an isolated agent consumer?

Gate and owner: #12 classification; maintainer obtains written guidance.

What supported OAuth flow should a distributed Raycast desktop extension and a
headless personal service use? Is S256 PKCE supported without a client secret,
and are loopback/custom-scheme redirects permitted? Is any device
authorization flow supported?

Gate and owner: #12 public/native auth design; maintainer and auth
implementer.

If a confidential backend is required, what application approval and PSD2
eligibility apply to this read-first product and later app-approved drafts?
May it operate the proposed token/session custody?

Gate and owner: #12/#65 public rollout; maintainer names the accountable
operator.

Which exact scopes can be requested and enforced for reads and drafts? What is
the effective authority when no scope is supplied?

Gate and owner: #12/#25 capability policy; obtain evidence rather than assume
a narrow scope.

What are code/access-token expiry, revocation/unlink APIs, consent-denial
responses and credential/device ownership rules for OAuth versus personal
keys? Is a refresh grant supported?

Gate and owner: #18/#24/#28/#60 lifecycle contracts; auth implementer captures
sandbox proofs.

How should separate machines and explicit IP changes be managed without
wildcard access or duplicate device registration?

Gate and owner: #24/#28 provisioning policy; operator approves actual changes.

[auth]: https://doc.bunq.com/basics/authentication
[keys]: https://doc.bunq.com/basics/authentication/api-keys
[oauth]: https://doc.bunq.com/basics/authentication/oauth
[register]: https://doc.bunq.com/basics/authentication/oauth/register-oauth-client
[authorize]: https://doc.bunq.com/basics/authentication/oauth/redirect-users-to-authorize-your-app
[exchange]: https://doc.bunq.com/basics/authentication/oauth/handle-the-authorization-code
[oauth-session]: https://doc.bunq.com/basics/authentication/oauth/use-the-access-token-to-get-a-user-session
[sessions]: https://doc.bunq.com/tutorials/your-first-payment/creating-the-api-context/start-a-session
[environments]: https://doc.bunq.com/basics/environments
[production]: https://doc.bunq.com/basics/moving-to-production
[ips]: https://doc.bunq.com/basics/whitelisting-and-updating-ip-addresses
