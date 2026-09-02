# Control UI Runtime Error Localization

## Goal

When the Control UI locale is Simplified Chinese, runtime failures lead with a
concise Chinese explanation and recovery hint. The exact provider, plugin,
process, or network message remains available under `技术详情`.

## Ownership

`ui/src/components/runtime-error.ts` owns classification and presentation.
Stable machine-readable codes take precedence over narrow text rules. Unknown
errors use a generic explanation rather than inventing a cause. Raw diagnostics
are inserted with `textContent`, never HTML.

The component intentionally owns its small Simplified Chinese runtime-error
catalog. Generated Control UI translation memory is post-merge owned in
v2026.8.1, while this private-fork behavior must work before that workflow runs.
Other locales keep the caller's existing raw or contextual error text.

## Consumer Contract

- Use `<openclaw-runtime-error>` on normal error surfaces.
- Use `formatRuntimeErrorInline` only where an existing string-only contract
  cannot render markup.
- Pass a stable error code when available, such as cron `errorReason`.
- Do not localize static field validation through this component.
- Do not discard, rewrite, or mutate persisted diagnostic data.

The initial v2026.8.1 migration covers Cron list/detail and run-history failures
and plugin page failures. The component is imported by those pages rather than
the global shell so the Chinese-only guidance does not inflate the startup
bundle for every operator. Additional pages should move to the same component
as they are touched instead of adding local regex maps.
