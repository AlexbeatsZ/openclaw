# Control UI runtime error localization

## Goal

When the Control UI locale is Simplified Chinese, user-facing runtime failures should lead with a concise Chinese explanation and recovery hint. The original backend, provider, plugin, process, or network error must remain available as technical detail so diagnosis does not lose evidence.

This contract applies to failures produced after a user action or background request: gateway calls, provider and plugin operations, cron runs, terminal/browser panels, agent workspace operations, and similar asynchronous surfaces. Static form validation remains owned by each feature's normal i18n keys.

## Ownership boundary

`ui/src/components/runtime-error.ts` owns the shared classification and presentation policy:

1. Prefer a stable machine-readable error code when the caller has one.
2. Otherwise use narrow, ordered text patterns for common failure classes.
3. Fall back to a generic Chinese explanation; never invent a more specific cause.
4. Preserve the exact raw message, including diagnostic whitespace, under `技术详情`, rendered with `textContent`.

Callers should use `<openclaw-runtime-error>` for normal UI surfaces and `formatRuntimeErrorInline()` only where an existing plain-string contract cannot render markup. New stable error codes belong in the shared map rather than in page-local regular expressions.

## Locale behavior

- `zh-CN`: show the Chinese summary first and keep the raw message as technical detail.
- Other locales: preserve the previous raw-error behavior and any caller-supplied contextual label until that locale supplies its own policy.
- Messages whose diagnostic text is predominantly Chinese are not wrapped again; a Chinese filename or model name inside an otherwise English error does not suppress localization.
- The custom element renders synchronously so an error is not briefly exposed in English before localization.
- The custom element owns its essential host, wrapping, and technical-detail styles so it remains readable inside both light DOM and parent Shadow DOM trees.

English remains the source locale for ordinary i18n development. The matching `zh-CN` entries in this private fork are an intentional targeted generated-output update for the requested Chinese product behavior; unrelated generated locale bundles remain untouched.

## Safety and diagnostics

The formatter must not remove diagnostic data, reinterpret an unknown failure as a known one, or insert raw error text through HTML. Redaction remains the responsibility of the boundary that receives secrets; localization only changes presentation after any required redaction.

Cron run entries should pass their structured `errorReason` when available. A raw message may still be classified heuristically, but the stable code wins whenever the two disagree.

## Verification

- Unit-test stable-code precedence, representative text rules, unknown fallback, Chinese passthrough, and raw-detail preservation.
- Run the Control UI source and test TypeScript checks.
- Run the i18n baseline and verification scripts.
- Build the production Control UI and inspect a real rendered runtime-error element in `zh-CN`.
