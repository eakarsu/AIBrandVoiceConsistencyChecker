const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter, parseAIJson, parseLabeledFields, saveAIResult, DEFAULT_MODEL } = require('../lib/aiHelpers');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// aiRateLimiter: 20 AI requests per user per hour (audit pattern)
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many AI requests. Limit: 20 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const aiRateLimit = aiRateLimiter;

async function logAI(req, feature, input, raw_text, output) {
  await saveAIResult(pool, {
    user_id: req.user?.id,
    feature,
    input,
    output: output ?? parseAIJson(raw_text),
    raw_text,
    model: DEFAULT_MODEL,
  });
}

// POST /api/ai/analyze-batch — bulk brand voice check (max 20 items)
router.post('/analyze-batch', auth, aiRateLimit, async (req, res) => {
  try {
    const { content_ids } = req.body;
    if (!Array.isArray(content_ids) || content_ids.length === 0) {
      return res.status(400).json({ error: 'content_ids must be a non-empty array' });
    }
    if (content_ids.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 content_ids per batch' });
    }

    const placeholders = content_ids.map((_, i) => `$${i + 1}`).join(', ');
    const itemsResult = await pool.query(
      `SELECT * FROM content_analyses WHERE id IN (${placeholders})`,
      content_ids
    );

    if (itemsResult.rows.length === 0) {
      return res.status(404).json({ error: 'No content found for the given IDs' });
    }

    const results = [];
    let totalScore = 0;

    for (const item of itemsResult.rows) {
      const aiResponse = await callOpenRouter(
        `You are a brand voice consistency analyzer. Analyze the content and return ONLY valid JSON (no markdown fences):
        {"consistency_score": 0-100, "tone_match": 0-100, "violations": ["violation1"] or [], "summary": "one sentence"}`,
        `Analyze content for brand voice consistency:\nTitle: ${item.title}\nContent: ${(item.content || '').substring(0, 500)}`
      );

      const parsed = parseAIJson(aiResponse) || {};
      const score = typeof parsed.consistency_score === 'number' ? parsed.consistency_score : 75;
      totalScore += score;

      results.push({
        content_id: item.id,
        title: item.title,
        consistency_score: score,
        tone_match: parsed.tone_match ?? null,
        violations: Array.isArray(parsed.violations) ? parsed.violations.join(', ') : (parsed.violations || 'none'),
        summary: parsed.summary || '',
        ai_analysis: parsed,
      });
    }

    const aggregateScore = Math.round(totalScore / results.length);

    await logAI(req, 'analyze-batch', { content_ids }, JSON.stringify(results), { aggregate_compliance_score: aggregateScore, results });

    res.json({
      aggregate_compliance_score: aggregateScore,
      items_analyzed: results.length,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/monitor-competitor — competitor tone monitoring
router.post('/monitor-competitor', auth, aiRateLimit, async (req, res) => {
  try {
    const { competitor_url, sample_content } = req.body;
    if (!sample_content) {
      return res.status(400).json({ error: 'sample_content is required' });
    }

    // Fetch the user's brand profile for comparison
    const profileResult = await pool.query('SELECT * FROM brand_profiles ORDER BY created_at DESC LIMIT 1');
    const userBrand = profileResult.rows[0];

    const aiResponse = await callOpenRouter(
      `You are a brand voice strategist specializing in competitive analysis and brand differentiation.
      Return ONLY valid JSON (no markdown fences):
      {
        "competitor_tone": "description",
        "voice_characteristics": ["point1"],
        "formality_level": "formal|semi-formal|casual",
        "emotional_register": "description",
        "key_vocabulary_patterns": ["pattern1"],
        "our_brand_comparison": "how our brand voice differs",
        "differentiation_opportunities": ["opp1", "opp2"],
        "positioning_recommendations": ["rec1"],
        "risk_areas": ["area1"]
      }`,
      `Competitor URL: ${competitor_url || 'Not provided'}
User's Brand Name: ${userBrand ? userBrand.name : 'Our Brand'}
User's Tone Attributes: ${userBrand ? userBrand.tone_attributes : 'professional'}
User's Brand Values: ${userBrand ? userBrand.brand_values : 'quality, trust'}

Competitor Sample Content:
${sample_content}`
    );

    const parsed = parseAIJson(aiResponse) || { raw: aiResponse };

    // Save to competitor_analyses table
    await pool.query(
      `INSERT INTO competitor_analyses (competitor_name, industry, sample_content, brand_profile_id, ai_analysis, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [competitor_url || 'Unknown Competitor', 'Unknown', sample_content, userBrand?.id || null, aiResponse, 'completed']
    ).catch(() => {}); // Non-fatal if table doesn't exist

    await logAI(req, 'monitor-competitor', { competitor_url, user_brand_id: userBrand?.id }, aiResponse, parsed);

    res.json({
      competitor_url: competitor_url || null,
      user_brand: userBrand ? { id: userBrand.id, name: userBrand.name } : null,
      result: parsed,
      raw: aiResponse,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// NEW AI FEATURES (per audit: 8 advanced AI tools)
// ============================================================================

// 1) POST /api/ai/voice-drift - Brand Voice Drift Detector
router.post('/voice-drift', auth, aiRateLimiter, async (req, res) => {
  try {
    const { brand_profile_id, baseline_samples, recent_samples, window_days } = req.body;
    if (!Array.isArray(baseline_samples) || !Array.isArray(recent_samples)) {
      return res.status(400).json({ error: 'baseline_samples and recent_samples (arrays) are required' });
    }
    const systemPrompt = `You are a brand voice drift analyst. Compare the baseline corpus against the recent corpus and flag drift in tone, vocabulary, formality. Return strict JSON: {"drift_score": 0-100, "tone_delta": "string", "vocab_delta": "string", "formality_delta": "string", "flagged": true|false, "examples": ["string"], "recommendations": ["string"]}.`;
    const userPrompt = `Brand profile id: ${brand_profile_id || 'n/a'}. Window: ${window_days || 30} days.\n\nBASELINE:\n${baseline_samples.join('\n---\n')}\n\nRECENT:\n${recent_samples.join('\n---\n')}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'voice-drift', { brand_profile_id, window_days }, raw, parsed);
    res.json({ result: parsed, raw, type: 'voice-drift' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2) POST /api/ai/audience-persona - Audience Persona Analyzer
router.post('/audience-persona', auth, aiRateLimiter, async (req, res) => {
  try {
    const { content, brand_profile_id, channel } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const systemPrompt = `You are an audience persona analyst. Identify which persona (age range, industry, role, geography) would resonate most with this content. Return JSON: {"primary_persona": {...}, "secondary_personas": [...], "demographics": {...}, "psychographics": [...], "channel_fit": {...}, "messaging_recommendations": [...]}`;
    const userPrompt = `Channel: ${channel || 'general'}. Content:\n${content}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'audience-persona', { brand_profile_id, channel }, raw, parsed);
    res.json({ result: parsed, raw, type: 'audience-persona' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3) POST /api/ai/competitor-benchmark - Cross-Brand Competitive Benchmarking
router.post('/competitor-benchmark', auth, aiRateLimiter, async (req, res) => {
  try {
    const { our_brand_samples, competitors } = req.body;
    if (!Array.isArray(competitors) || competitors.length === 0) {
      return res.status(400).json({ error: 'competitors (array of {name, samples}) is required' });
    }
    const systemPrompt = `You are a competitive brand voice analyst. Benchmark our brand against the listed competitors across tone, vocabulary, distinctiveness, emotion. Return JSON: {"our_metrics": {...}, "competitors": [{"name": "...", "metrics": {...}, "differentiation": "...", "threat_level": "low|medium|high"}], "white_space": [...], "recommendations": [...]}`;
    const userPrompt = `OUR BRAND SAMPLES:\n${(our_brand_samples || []).join('\n---\n')}\n\nCOMPETITORS:\n${competitors.map(c => `### ${c.name}\n${(c.samples || []).join('\n---\n')}`).join('\n\n')}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'competitor-benchmark', { competitor_names: competitors.map(c => c.name) }, raw, parsed);
    res.json({ result: parsed, raw, type: 'competitor-benchmark' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4) POST /api/ai/variation-generator - Content Variation Generator (5 tones)
router.post('/variation-generator', auth, aiRateLimiter, async (req, res) => {
  try {
    const { content, tones } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const wantedTones = Array.isArray(tones) && tones.length ? tones : ['formal', 'playful', 'technical', 'conversational', 'urgent'];
    const systemPrompt = `You generate tone variations of marketing content. Return JSON: {"variations": [{"tone": "...", "content": "...", "use_cases": [...], "estimated_engagement": "low|medium|high"}]}`;
    const userPrompt = `Generate one variation for each of these tones: ${wantedTones.join(', ')}.\n\nORIGINAL:\n${content}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'variation-generator', { tones: wantedTones }, raw, parsed);
    res.json({ result: parsed, raw, type: 'variation-generator' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5) POST /api/ai/vocab-compliance - Vocabulary Compliance Checker
router.post('/vocab-compliance', auth, aiRateLimiter, async (req, res) => {
  try {
    const { content, brand_profile_id } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    let approved = [], banned = [], restricted = [];
    try {
      const r = await pool.query('SELECT term, status FROM vocabulary WHERE brand_profile_id = $1 OR $1 IS NULL', [brand_profile_id || null]);
      r.rows.forEach(row => {
        if (row.status === 'approved') approved.push(row.term);
        else if (row.status === 'banned') banned.push(row.term);
        else if (row.status === 'restricted') restricted.push(row.term);
      });
    } catch (_) { /* table may not exist */ }
    const systemPrompt = `You are a vocabulary compliance checker. Flag any banned or restricted terms in content; suggest approved-list alternatives. Return JSON: {"compliance_score": 0-100, "violations": [{"term": "...", "severity": "low|medium|high", "context": "...", "suggestion": "..."}], "approved_terms_used": [...], "missing_approved_terms": [...], "verdict": "PASS|REVIEW|FAIL"}`;
    const userPrompt = `Approved: ${approved.join(', ') || 'none'}\nBanned: ${banned.join(', ') || 'none'}\nRestricted: ${restricted.join(', ') || 'none'}\n\nCONTENT:\n${content}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'vocab-compliance', { brand_profile_id }, raw, parsed);
    res.json({ result: parsed, raw, type: 'vocab-compliance' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6) POST /api/ai/channel-tone - Channel-Specific Tone Recommender
router.post('/channel-tone', auth, aiRateLimiter, async (req, res) => {
  try {
    const { content, channels } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const wanted = Array.isArray(channels) && channels.length ? channels : ['linkedin', 'twitter', 'tiktok', 'instagram', 'email'];
    const systemPrompt = `You recommend channel-optimal tone and formality. Return JSON: {"recommendations": [{"channel": "...", "tone": "...", "formality": "low|medium|high", "ideal_length": "...", "rewritten_content": "...", "rationale": "..."}]}`;
    const userPrompt = `Recommend per channel: ${wanted.join(', ')}.\n\nCONTENT:\n${content}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'channel-tone', { channels: wanted }, raw, parsed);
    res.json({ result: parsed, raw, type: 'channel-tone' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7) POST /api/ai/heritage-consistency - Brand Heritage Consistency Tracker
router.post('/heritage-consistency', auth, aiRateLimiter, async (req, res) => {
  try {
    const { historical_samples, current_samples, brand_profile_id } = req.body;
    if (!Array.isArray(historical_samples) || !Array.isArray(current_samples)) {
      return res.status(400).json({ error: 'historical_samples and current_samples (arrays) required' });
    }
    const systemPrompt = `You are a brand heritage analyst. Compare historical brand messaging (5+ years old) against current messaging. Return JSON: {"heritage_alignment_score": 0-100, "preserved_elements": [...], "drift_areas": [...], "modernization_balance": "appropriate|too_aggressive|too_conservative", "risk_assessment": "...", "recommendations": [...]}`;
    const userPrompt = `Brand profile id: ${brand_profile_id || 'n/a'}\n\nHISTORICAL:\n${historical_samples.join('\n---\n')}\n\nCURRENT:\n${current_samples.join('\n---\n')}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'heritage-consistency', { brand_profile_id }, raw, parsed);
    res.json({ result: parsed, raw, type: 'heritage-consistency' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 8) POST /api/ai/approval-workflow - Multi-Team Collaboration Workflow (consistency + routing)
router.post('/approval-workflow', auth, aiRateLimiter, async (req, res) => {
  try {
    const { content, brand_profile_id, submitter_role, channel } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const systemPrompt = `You are an approval-routing engine for brand content. Given content + submitter role, return JSON: {"consistency_score": 0-100, "auto_approve": true|false, "required_approvers": ["legal", "brand_lead", "ceo"], "blocking_issues": [...], "warnings": [...], "estimated_review_time_minutes": 0, "recommended_changes": [...]}`;
    const userPrompt = `Submitter role: ${submitter_role || 'contributor'}. Channel: ${channel || 'general'}.\n\nCONTENT:\n${content}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    // Persist a workflow record (best-effort)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS approval_workflows (
          id SERIAL PRIMARY KEY,
          submitter_id INTEGER,
          brand_profile_id INTEGER,
          channel VARCHAR(100),
          content TEXT,
          ai_verdict JSONB,
          status VARCHAR(40) DEFAULT 'pending_review',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await pool.query(
        `INSERT INTO approval_workflows (submitter_id, brand_profile_id, channel, content, ai_verdict, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user?.id || null, brand_profile_id || null, channel || null, content, JSON.stringify(parsed), parsed?.auto_approve ? 'approved' : 'pending_review']
      );
    } catch (_) { /* non-fatal */ }
    await logAI(req, 'approval-workflow', { brand_profile_id, submitter_role, channel }, raw, parsed);
    res.json({ result: parsed, raw, type: 'approval-workflow' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 9) POST /api/ai/readability-score - Readability & Grade Level Analyzer
router.post('/readability-score', auth, aiRateLimiter, async (req, res) => {
  try {
    const { content, brand_profile_id } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const systemPrompt = `You are a readability expert. Analyze the text for readability, grade level, and reading time. Return strict JSON:
    {
      "flesch_kincaid_grade": 0-18,
      "flesch_reading_ease": 0-100,
      "reading_time_minutes": 0.0,
      "grade_level_label": "Elementary|Middle School|High School|College|Graduate",
      "word_count": 0,
      "avg_sentence_length": 0.0,
      "avg_word_length": 0.0,
      "complex_words_pct": 0-100,
      "passive_voice_instances": 0,
      "readability_issues": ["issue1"],
      "improvement_suggestions": ["suggestion1"],
      "verdict": "PASS|REVIEW|FAIL",
      "score": 0-100
    }`;
    const raw = await callOpenRouter(systemPrompt, `Analyze readability:\n\n${content}`);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'readability-score', { brand_profile_id, word_count: content.split(/\s+/).length }, raw, parsed);
    res.json({ result: parsed, raw, type: 'readability-score' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 10) POST /api/ai/tone-rewriter - One-Click Tone Rewriter
router.post('/tone-rewriter', auth, aiRateLimiter, async (req, res) => {
  try {
    const { content, desired_tone, brand_profile_id } = req.body;
    if (!content || !desired_tone) return res.status(400).json({ error: 'content and desired_tone are required' });
    const systemPrompt = `You are a professional brand content rewriter. Rewrite the content to match the desired tone while preserving meaning. Return strict JSON:
    {
      "rewritten_content": "full rewritten text",
      "tone_achieved": "description of tone achieved",
      "changes_summary": ["change1", "change2"],
      "key_replacements": [{"original": "word", "replacement": "word", "reason": "why"}],
      "brand_voice_fit": "low|medium|high",
      "confidence_score": 0-100,
      "alternative_opening": "alternative first sentence"
    }`;
    const raw = await callOpenRouter(systemPrompt, `Desired tone: ${desired_tone}\n\nOriginal content:\n${content}`);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'tone-rewriter', { desired_tone, brand_profile_id }, raw, parsed);
    res.json({ result: parsed, raw, type: 'tone-rewriter' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ai/results — paginated AI history (per user)
router.get('/results', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const feature = req.query.feature;
    const params = [req.user.id];
    let where = 'user_id = $1';
    if (feature) { params.push(feature); where += ` AND feature = $${params.length}`; }
    const cnt = await pool.query(`SELECT COUNT(*) FROM ai_results WHERE ${where}`, params);
    const total = parseInt(cnt.rows[0].count);
    params.push(limit); params.push(offset);
    const r = await pool.query(
      `SELECT id, feature, input, output, model, created_at FROM ai_results WHERE ${where}
       ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
