# Governed publishing workflow

`POST /api/publishing-workflows` accepts a brief, channel, versioned brand profile, content, claims, assets, rights, disclosures, and AI provenance. It deterministically blocks forbidden terms, missing disclosures, unsubstantiated claims, out-of-scope asset rights, prompt-injection patterns, and missing AI provenance. `POST /:id/approve` requires a publisher, brand manager, or administrator and records an audit event. Approval never claims CMS delivery.

Copy `.env.example`, run `scripts/bootstrap.sh`, provision the existing base schema, then run `scripts/migrate.sh`. Normal startup is non-destructive. The legacy seed is destructive and requires `CONFIRM_DESTRUCTIVE_DEMO_SEED=yes`.

CMS, DAM, advertising, analytics, Slack/Teams, browser-extension, and notification adapters are intentionally not represented as working until real provider credentials, signed callbacks, reconciliation, retry/dead-letter handling, and sandbox integration tests are supplied. Campaign factuality and outcome evaluation require representative owner-approved datasets.
