# QQBot External Plugin Migration

## Decision

Keep QQBot outside this fork's core tree on v2026.8.1. Install the official
`@tencent-connect/openclaw-qqbot` package through OpenClaw's plugin manager and
carry any QQ-specific fixes in a small fork of that package, not by restoring
the deleted bundled `extensions/qqbot` directory.

This follows the v2026.8.1 ownership boundary: the official external-channel
catalog, onboarding flow, compatibility bridge, and QQBot documentation all
target the downloadable Tencent package. The catalog intentionally pins a
package version and integrity value; do not replace that pin with the npm latest
version without running the channel acceptance checks below.

## Fork Patch Mapping

The old fork carried three QQBot-specific changes:

| Old behavior                           | v2026.8.1 treatment                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| UTF-8 byte-aware Chinese text chunking | Still requires acceptance testing in the external plugin. If it regresses, patch the plugin fork and propose the fix upstream. |
| Proxy support for token requests       | Do not port. Gateway startup installs the process-wide Undici environment-proxy dispatcher before plugin requests.             |
| Proxy support for QQ API requests      | Do not port. The external plugin uses global `fetch`, so it inherits the Gateway dispatcher.                                   |

The old source patches are not mechanically portable because the current
Tencent plugin has a different package and runtime structure.

## Proxy Boundary

Set standard `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` variables on the
Gateway process. Do not add QQ-only proxy configuration. Node's environment
proxy support and OpenClaw's Gateway dispatcher are process-wide, so token and
normal API requests share the same policy.

QQ media uploads may use provider-issued COS endpoints. If a proxy cannot carry
their chunked upload traffic, add only the observed COS hosts to `NO_PROXY` and
retest media delivery. Do not bypass QQ API hosts broadly.

## Upgrade Acceptance

Before switching the live Gateway:

1. Back up the active OpenClaw config and plugin install metadata.
2. Install the catalog-pinned QQBot package through `openclaw plugins install`.
3. Run `openclaw doctor --fix`, then inspect the resulting QQBot account and
   plugin entries without printing the AppSecret.
4. Verify token acquisition and one short Chinese direct message through the
   configured proxy.
5. Verify a Chinese reply longer than the QQ text byte limit contains every
   character exactly once and arrives in order.
6. Verify one image or file upload with the production proxy and `NO_PROXY`
   policy.
7. Restart the Gateway once and verify inbound resume and outbound delivery.

If step 5 fails, patch only the external plugin's chunker to split by UTF-8 byte
length without cutting a Unicode code point. If step 6 fails, first isolate the
specific COS host and proxy behavior; do not assume the text/API path is broken.
