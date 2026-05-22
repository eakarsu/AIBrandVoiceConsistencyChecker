const express = require('express');
const router = express.Router();

router.post('/check', (req, res) => {
  const copy = String(req.body?.copy || 'The fastest, most trusted platform for every enterprise team.');
  const evidence = Array.isArray(req.body?.evidence) ? req.body.evidence : ['customer survey trust score'];
  const claims = [
    /fastest|#1|best|most trusted/i.test(copy) && 'superlative_claim',
    /every|always|never|guaranteed/i.test(copy) && 'absolute_claim',
    /\d+%|\d+x/i.test(copy) && 'quantified_claim',
  ].filter(Boolean);
  const uncovered = claims.filter((claim) => !evidence.some((item) => String(item).toLowerCase().includes(claim.split('_')[0])));
  res.json({ claims, uncovered, status: uncovered.length ? 'needs_substantiation' : 'substantiated', action: uncovered.length ? 'Attach source evidence or rewrite claims before approval.' : 'Ready for approval routing.' });
});

module.exports = router;
