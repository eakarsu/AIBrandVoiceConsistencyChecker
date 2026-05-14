const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = (() => { try { return require('compression'); } catch (_) { return null; } })();
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const pool = require('./db');
const { ensureAIResultsTable } = require('./lib/aiHelpers');

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS from env
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:5173')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
}));

if (compression) app.use(compression());
app.use(express.json({ limit: '10mb' }));

// General rate limiter: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many requests. Limit: 100 per 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
});
app.use('/api', generalLimiter);

// AI rate limit: 20 requests per user per hour (audit pattern)
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many AI requests. Limit: 20 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.locals.aiRateLimit = aiRateLimiter;
app.locals.aiRateLimiter = aiRateLimiter;

// Initialize ai_results table
ensureAIResultsTable(pool).catch(e => console.warn('ai_results init failed:', e.message));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/brand-profiles', require('./routes/brandProfiles'));
app.use('/api/brand-guidelines', require('./routes/brandGuidelines'));
app.use('/api/content-analysis', require('./routes/contentAnalysis'));
app.use('/api/tone-detection', require('./routes/toneDetection'));
app.use('/api/style-guide', require('./routes/styleGuide'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/content-scoring', require('./routes/contentScoring'));
app.use('/api/vocabulary', require('./routes/vocabulary'));
app.use('/api/competitor-analysis', require('./routes/competitorAnalysis'));
app.use('/api/content-templates', require('./routes/contentTemplates'));
app.use('/api/audit-reports', require('./routes/auditReports'));
app.use('/api/team-members', require('./routes/teamMembers'));
app.use('/api/content-history', require('./routes/contentHistory'));
app.use('/api/ai-suggestions', require('./routes/aiSuggestions'));
app.use('/api/sentiment-analysis', require('./routes/sentimentAnalysis'));
app.use('/api/multi-language', require('./routes/multiLanguage'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/extras', require('./routes/extras'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

app.use('/api/brand-cop', require('./routes/agenticBrandCop')); // apply pass 6 — audit custom suggestion

app.use('/api/style-guide-rag', require('./routes/styleGuideRag')); // apply pass 6 — audit custom suggestion

app.use('/api/voice-drift-stream', require('./routes/voiceDriftStream')); // apply pass 6 — audit custom suggestion

app.use('/api/agency-white-label', require('./routes/agencyWhiteLabel')); // apply pass 6 — audit custom suggestion
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// === Batch 01 Gaps & Frontend Mounts ===
app.use('/api/gap-no-image-logo-style-consistency-scoring-vision', require('./routes/gap_no_image_logo_style_consistency_scoring_vision'));
app.use('/api/gap-no-ai-auto-rewrite-suggestions-inline-in-cms', require('./routes/gap_no_ai_auto_rewrite_suggestions_inline_in_cms'));
app.use('/api/gap-no-real-time-voice-scoring-on-live-drafts-streamin', require('./routes/gap_no_real_time_voice_scoring_on_live_drafts_streamin'));
app.use('/api/gap-no-ai-brand-asset-compliance-for-video-podcast-tra', require('./routes/gap_no_ai_brand_asset_compliance_for_video_podcast_tra'));
app.use('/api/gap-only-5-frontend-pages-workflow-ux-is-shallow-vs-22', require('./routes/gap_only_5_frontend_pages_workflow_ux_is_shallow_vs_22'));
app.use('/api/gap-no-cms-integrations-wordpress-contentful-webflow', require('./routes/gap_no_cms_integrations_wordpress_contentful_webflow'));
app.use('/api/gap-no-slack-teams-approval-routing', require('./routes/gap_no_slack_teams_approval_routing'));
app.use('/api/gap-no-notification-system-for-drift-alerts', require('./routes/gap_no_notification_system_for_drift_alerts'));
app.use('/api/gap-no-bulk-content-import-or-scheduled-scans', require('./routes/gap_no_bulk_content_import_or_scheduled_scans'));
app.use('/api/gap-no-browser-extension-editor-plugin', require('./routes/gap_no_browser_extension_editor_plugin'));
