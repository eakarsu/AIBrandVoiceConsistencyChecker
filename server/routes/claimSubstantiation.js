const express = require('express');
const router = express.Router();

router.post('/check', (req, res) => {
  const copy=req.body?.copy,evidence=req.body?.evidence??[];
  if(typeof copy!=='string'||!copy.trim()||copy.length>12000||!Array.isArray(evidence)||evidence.length>100||evidence.some(item=>typeof item!=='string'||item.length>2000))return res.status(400).json({error:'Supply draft wording and an optional array of actual evidence descriptions. No example wording or evidence is assumed.'});
  const claims = [
    /fastest|#1|best|most trusted/i.test(copy) && 'superlative_claim',
    /every|always|never|guaranteed/i.test(copy) && 'absolute_claim',
    /\d+%|\d+x/i.test(copy) && 'quantified_claim',
  ].filter(Boolean);
  const uncovered = claims.filter((claim) => !evidence.some((item) => String(item).toLowerCase().includes(claim.split('_')[0])));
  res.json({claims,uncovered,status:'keyword_screen_complete',source_verified:false,human_approval_required:true,provider:'none',action:'This local keyword screen does not establish substantiation or approval. A human must review actual sources through the existing publishing workflow.'});
});

module.exports = router;
