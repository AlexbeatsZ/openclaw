# Cron webhook private-host allowlist

Cron delivery and completion webhooks remain SSRF-protected by default. Operators that deliberately run a webhook receiver on a private or loopback address may set `cron.webhookAllowedHostnames` to exact hostnames that are permitted to resolve to those addresses.

The exception is passed into the existing guarded fetch policy. It does not disable redirect checks, URL validation, DNS pinning, or protection for any hostname not listed. Keep the list minimal and never treat it as a wildcard or general private-network switch.

The local cron notification relay uses this with only `127.0.0.1`. The relay itself requires a bearer token and listens on the server's loopback interface.
