const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/analytics/compliance-scores
// Returns avg score this month vs last month, score distribution, most common violations
router.get('/compliance-scores', auth, async (req, res) => {
  try {
    // Average score this month vs last month
    const avgScoresResult = await pool.query(`
      SELECT
        AVG(CASE WHEN date_trunc('month', created_at) = date_trunc('month', NOW()) THEN consistency_score END) AS this_month_avg,
        AVG(CASE WHEN date_trunc('month', created_at) = date_trunc('month', NOW() - INTERVAL '1 month') THEN consistency_score END) AS last_month_avg
      FROM content_analyses
      WHERE created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
    `);

    const thisMonthAvg = avgScoresResult.rows[0].this_month_avg
      ? parseFloat(parseFloat(avgScoresResult.rows[0].this_month_avg).toFixed(1))
      : null;
    const lastMonthAvg = avgScoresResult.rows[0].last_month_avg
      ? parseFloat(parseFloat(avgScoresResult.rows[0].last_month_avg).toFixed(1))
      : null;

    // Score distribution from content_analyses (this month)
    const distributionResult = await pool.query(`
      SELECT
        COUNT(CASE WHEN consistency_score >= 90 THEN 1 END) AS excellent,
        COUNT(CASE WHEN consistency_score >= 70 AND consistency_score < 90 THEN 1 END) AS good,
        COUNT(CASE WHEN consistency_score >= 50 AND consistency_score < 70 THEN 1 END) AS fair,
        COUNT(CASE WHEN consistency_score < 50 THEN 1 END) AS poor,
        COUNT(*) AS total
      FROM content_analyses
      WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
    `);

    const dist = distributionResult.rows[0];

    // Also pull from content_scores if available
    const scoringDistResult = await pool.query(`
      SELECT
        COUNT(CASE WHEN overall_score >= 90 THEN 1 END) AS excellent,
        COUNT(CASE WHEN overall_score >= 70 AND overall_score < 90 THEN 1 END) AS good,
        COUNT(CASE WHEN overall_score >= 50 AND overall_score < 70 THEN 1 END) AS fair,
        COUNT(CASE WHEN overall_score < 50 THEN 1 END) AS poor,
        COUNT(*) AS total
      FROM content_scores
      WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
    `).catch(() => ({ rows: [{ excellent: 0, good: 0, fair: 0, poor: 0, total: 0 }] }));

    const sd = scoringDistResult.rows[0];

    const scoreDistribution = {
      '90-100': parseInt(dist.excellent) + parseInt(sd.excellent),
      '70-89': parseInt(dist.good) + parseInt(sd.good),
      '50-69': parseInt(dist.fair) + parseInt(sd.fair),
      'below-50': parseInt(dist.poor) + parseInt(sd.poor),
      total: parseInt(dist.total) + parseInt(sd.total),
    };

    // Most common violations — scan ai_analysis text for ISSUES/VIOLATIONS sections
    const issuesResult = await pool.query(`
      SELECT ai_analysis FROM content_analyses
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND ai_analysis IS NOT NULL
      LIMIT 50
    `);

    const violationCounts = {};
    const violationPatterns = [
      { label: 'Tone mismatch', regex: /tone\s*(mismatch|inconsist|wrong|off|issue)/gi },
      { label: 'Vocabulary issues', regex: /vocabular(y|ies)\s*(issue|problem|mismatch|error)/gi },
      { label: 'Off-brand language', regex: /off[- ]?brand/gi },
      { label: 'Forbidden words', regex: /forbidden\s*word/gi },
      { label: 'Style deviation', regex: /style\s*(deviation|issue|error|problem)/gi },
      { label: 'Readability problems', regex: /readabilit(y|ies)\s*(issue|problem|low|poor)/gi },
      { label: 'Grammar errors', regex: /grammar\s*(error|issue|mistake)/gi },
    ];

    for (const row of issuesResult.rows) {
      if (!row.ai_analysis) continue;
      const text = typeof row.ai_analysis === 'object' ? JSON.stringify(row.ai_analysis) : row.ai_analysis;
      for (const pat of violationPatterns) {
        const matches = (text.match(pat.regex) || []).length;
        if (matches > 0) {
          violationCounts[pat.label] = (violationCounts[pat.label] || 0) + matches;
        }
      }
    }

    const mostCommonViolations = Object.entries(violationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([violation, count]) => ({ violation, count }));

    const monthOverMonthChange = thisMonthAvg !== null && lastMonthAvg !== null
      ? parseFloat((thisMonthAvg - lastMonthAvg).toFixed(1))
      : null;

    res.json({
      average_scores: {
        this_month: thisMonthAvg,
        last_month: lastMonthAvg,
        change: monthOverMonthChange,
        trend: monthOverMonthChange !== null ? (monthOverMonthChange >= 0 ? 'improving' : 'declining') : 'insufficient_data',
      },
      score_distribution: scoreDistribution,
      most_common_violations: mostCommonViolations,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/trend — daily compliance score trend (last 30 days)
router.get('/trend', auth, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(req.query.days) || 30));
    const result = await pool.query(`
      SELECT
        date_trunc('day', created_at)::date AS day,
        ROUND(AVG(consistency_score)::numeric, 1) AS avg_score,
        COUNT(*) AS count
      FROM content_analyses
      WHERE created_at >= NOW() - INTERVAL '${days} days'
        AND consistency_score IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    `);

    const scoringResult = await pool.query(`
      SELECT
        date_trunc('day', created_at)::date AS day,
        ROUND(AVG(overall_score)::numeric, 1) AS avg_score,
        COUNT(*) AS count
      FROM content_scores
      WHERE created_at >= NOW() - INTERVAL '${days} days'
        AND overall_score IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    `).catch(() => ({ rows: [] }));

    // Merge analysis + scoring by day
    const byDay = {};
    for (const row of result.rows) {
      const d = String(row.day);
      byDay[d] = { day: d, total_count: parseInt(row.count), avg_score: parseFloat(row.avg_score) };
    }
    for (const row of scoringResult.rows) {
      const d = String(row.day);
      if (byDay[d]) {
        const n1 = byDay[d].total_count;
        const n2 = parseInt(row.count);
        byDay[d].avg_score = parseFloat(((byDay[d].avg_score * n1 + parseFloat(row.avg_score) * n2) / (n1 + n2)).toFixed(1));
        byDay[d].total_count = n1 + n2;
      } else {
        byDay[d] = { day: d, total_count: parseInt(row.count), avg_score: parseFloat(row.avg_score) };
      }
    }

    const trend = Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day));

    res.json({ data: trend, days, generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/ai-usage — AI feature usage statistics
router.get('/ai-usage', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        feature,
        COUNT(*) AS total_calls,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS calls_last_7d,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS calls_last_30d,
        MIN(created_at) AS first_used,
        MAX(created_at) AS last_used
      FROM ai_results
      GROUP BY feature
      ORDER BY total_calls DESC
    `).catch(() => ({ rows: [] }));

    const totalResult = await pool.query(`
      SELECT COUNT(*) AS total, COUNT(DISTINCT user_id) AS unique_users
      FROM ai_results
    `).catch(() => ({ rows: [{ total: 0, unique_users: 0 }] }));

    res.json({
      by_feature: result.rows,
      totals: {
        total_calls: parseInt(totalResult.rows[0].total),
        unique_users: parseInt(totalResult.rows[0].unique_users),
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
