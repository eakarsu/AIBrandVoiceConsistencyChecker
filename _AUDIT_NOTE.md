# Audit Apply Note — AIBrandVoiceConsistencyChecker

Source: `_AUDIT/reports/batch_01.md` § 8.

## Original audit recommendations
- Missing notifications system
- Missing integration API (no webhooks)
- Strategic: agentic workflows, RAG, real-time anomaly detection, white-label

## Implemented in this pass (MECHANICAL)

| # | Item | File | Endpoints |
|---|------|------|-----------|
| 1 | Webhook subscription stub | `server/routes/webhooks.js` (new) + `server/index.js` | `GET/POST/DELETE /api/webhooks`, `POST /api/webhooks/:id/test`, `GET /api/webhooks/_/events` |

Allowed events: content.analyzed, content.flagged_off_brand, content.approved, voice.drift_detected, competitor.update_detected, audit.report_generated, guideline.updated. Lazy table; payload-only test (no outbound HTTP). `node --check` passes.

## Backlog (not implemented)

| Item | Tag | Why deferred |
|------|-----|---------------|
| Email/SMS/push notifications | NEEDS-CREDS | SMTP / Twilio / FCM credentials |
| Outbound webhook delivery | TOO-RISKY | Background job infra |
| Multi-agent orchestration | NEEDS-PRODUCT-DECISION | Agent topology |
| RAG over brand documents | NEEDS-PRODUCT-DECISION | Vector store + corpus |
| White-label/reseller | NEEDS-PRODUCT-DECISION | Multi-tenant model |

## Apply pass 3 (frontend)

- **Stack:** Vite + React client / Express server.
- **Backend endpoints in scope:** `/api/webhooks*` (added in pass 2).
- **Action:** LEFT-AS-IS — FE already wired.
- **Evidence:** `client/src/pages/Webhooks.jsx` (full CRUD + test UI, allowed-events checklist) routed at `/webhooks` in `client/src/App.jsx`. Pre-existing `AIToolPage.jsx` + `featureConfig.js` cover the rest of the AI surface.
- **Files written/modified:** none.
