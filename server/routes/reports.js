const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const router = express.Router();

// GET /api/reports/brand-compliance/pdf — Monthly brand compliance PDF report
router.get('/brand-compliance/pdf', auth, async (req, res) => {
  try {
    // Fetch this month's analytics data
    const avgResult = await pool.query(`
      SELECT
        AVG(CASE WHEN date_trunc('month', created_at) = date_trunc('month', NOW()) THEN consistency_score END) AS this_month_avg,
        AVG(CASE WHEN date_trunc('month', created_at) = date_trunc('month', NOW() - INTERVAL '1 month') THEN consistency_score END) AS last_month_avg,
        COUNT(CASE WHEN date_trunc('month', created_at) = date_trunc('month', NOW()) THEN 1 END) AS this_month_count
      FROM content_analyses
      WHERE created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
    `);

    const thisMonthAvg = avgResult.rows[0].this_month_avg
      ? parseFloat(parseFloat(avgResult.rows[0].this_month_avg).toFixed(1))
      : 0;
    const lastMonthAvg = avgResult.rows[0].last_month_avg
      ? parseFloat(parseFloat(avgResult.rows[0].last_month_avg).toFixed(1))
      : 0;
    const thisMonthCount = parseInt(avgResult.rows[0].this_month_count) || 0;

    // Score distribution this month
    const distResult = await pool.query(`
      SELECT
        COUNT(CASE WHEN consistency_score >= 90 THEN 1 END) AS excellent,
        COUNT(CASE WHEN consistency_score >= 70 AND consistency_score < 90 THEN 1 END) AS good,
        COUNT(CASE WHEN consistency_score >= 50 AND consistency_score < 70 THEN 1 END) AS fair,
        COUNT(CASE WHEN consistency_score < 50 THEN 1 END) AS poor
      FROM content_analyses
      WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
    `);
    const dist = distResult.rows[0];

    // Recent content analyses for the report
    const recentResult = await pool.query(`
      SELECT id, title, channel, consistency_score, status, created_at
      FROM content_analyses
      WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
      ORDER BY created_at DESC
      LIMIT 15
    `);

    // Most common issues from AI analysis
    const issuesResult = await pool.query(`
      SELECT ai_analysis FROM content_analyses
      WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
        AND ai_analysis IS NOT NULL
      LIMIT 30
    `);

    const violationCounts = {};
    const violationPatterns = [
      'tone mismatch', 'vocabulary issue', 'off-brand', 'style deviation',
      'grammar', 'readability', 'brand alignment',
    ];
    for (const row of issuesResult.rows) {
      if (!row.ai_analysis) continue;
      for (const pat of violationPatterns) {
        if (row.ai_analysis.toLowerCase().includes(pat)) {
          violationCounts[pat] = (violationCounts[pat] || 0) + 1;
        }
      }
    }
    const topViolations = Object.entries(violationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Brand profile info
    const brandResult = await pool.query('SELECT * FROM brand_profiles ORDER BY created_at DESC LIMIT 1');
    const brand = brandResult.rows[0];

    const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const trend = thisMonthAvg >= lastMonthAvg ? 'Improving' : 'Declining';
    const change = (thisMonthAvg - lastMonthAvg).toFixed(1);

    // Build PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="brand-compliance-${monthName.replace(' ', '-')}.pdf"`);

    const doc = new PDFDocument({ margin: 60, size: 'LETTER' });
    doc.pipe(res);

    // Cover
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e')
      .text('Brand Compliance Report', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(15).font('Helvetica').fillColor('#444444').text(monthName, { align: 'center' });
    if (brand) {
      doc.moveDown(0.3);
      doc.fontSize(12).text(`Brand: ${brand.name}`, { align: 'center' });
    }
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#888888').text(`Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
    doc.fillColor('#000000');

    doc.moveDown(1.5);

    // Section helper
    const section = (title) => {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e').text(title);
      doc.moveDown(0.2);
      doc.moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke('#cccccc');
      doc.moveDown(0.4);
      doc.font('Helvetica').fillColor('#000000').fontSize(11);
    };

    // Overall Score
    section('Overall Brand Voice Score');
    const scoreLabel = thisMonthAvg >= 90 ? 'Excellent' : thisMonthAvg >= 70 ? 'Good' : thisMonthAvg >= 50 ? 'Fair' : 'Needs Improvement';
    doc.text(`Overall Score: ${thisMonthAvg}/100 (${scoreLabel})`);
    doc.text(`Previous Month: ${lastMonthAvg}/100`);
    doc.text(`Month-over-Month Change: ${change > 0 ? '+' : ''}${change} points (${trend})`);
    doc.text(`Total Content Analyzed: ${thisMonthCount} items`);
    doc.moveDown(1);

    // Score Distribution
    section('Score Distribution');
    doc.text(`Excellent (90-100):  ${dist.excellent || 0} items`);
    doc.text(`Good (70-89):        ${dist.good || 0} items`);
    doc.text(`Fair (50-69):        ${dist.fair || 0} items`);
    doc.text(`Poor (below 50):     ${dist.poor || 0} items`);
    doc.moveDown(1);

    // Violation Categories
    section('Top Violation Categories');
    if (topViolations.length === 0) {
      doc.text('No violations detected this month.');
    } else {
      topViolations.forEach(([violation, count], i) => {
        doc.text(`${i + 1}. ${violation.charAt(0).toUpperCase() + violation.slice(1)} — ${count} occurrence${count !== 1 ? 's' : ''}`);
      });
    }
    doc.moveDown(1);

    // Recent Content
    section('Recent Content Analyzed');
    if (recentResult.rows.length === 0) {
      doc.text('No content analyzed this month.');
    } else {
      recentResult.rows.forEach((item) => {
        const scoreStr = item.consistency_score !== null ? `${item.consistency_score}/100` : 'N/A';
        doc.text(`• ${item.title || 'Untitled'} — Score: ${scoreStr} — ${item.channel || 'N/A'} — ${new Date(item.created_at).toLocaleDateString()}`);
      });
    }
    doc.moveDown(1);

    // Recommendations
    section('Recommendations');
    const recommendations = [];
    if (thisMonthAvg < 70) {
      recommendations.push('Conduct a full brand voice audit across all channels immediately.');
      recommendations.push('Schedule brand voice training sessions for content creators.');
    }
    if (parseInt(dist.poor || 0) > 0) {
      recommendations.push(`Review and revise the ${dist.poor} low-scoring content pieces before publishing.`);
    }
    if (topViolations.length > 0) {
      recommendations.push(`Focus on reducing "${topViolations[0][0]}" violations — the most frequent issue this month.`);
    }
    recommendations.push('Run weekly batch analyses to catch brand voice drift early.');
    recommendations.push('Update brand guidelines if product positioning has shifted.');

    recommendations.forEach((r, i) => {
      doc.text(`${i + 1}. ${r}`);
    });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/brand-compliance/csv — Monthly brand compliance CSV export
router.get('/brand-compliance/csv', auth, async (req, res) => {
  try {
    const recentResult = await pool.query(`
      SELECT id, title, channel, consistency_score, status, created_at
      FROM content_analyses
      WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
      ORDER BY created_at DESC
      LIMIT 500
    `);

    const scoringResult = await pool.query(`
      SELECT id, title, NULL AS channel, overall_score AS consistency_score, status, created_at
      FROM content_scores
      WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
      ORDER BY created_at DESC
      LIMIT 500
    `).catch(() => ({ rows: [] }));

    const rows = [...recentResult.rows, ...scoringResult.rows];

    const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const escape = (v) => {
      if (v == null) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = 'ID,Title,Channel,Consistency Score,Status,Created At';
    const csvRows = rows.map(r =>
      [r.id, r.title, r.channel, r.consistency_score, r.status, r.created_at].map(escape).join(',')
    );
    const csv = [header, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="brand-compliance-${monthName.replace(' ', '-')}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
