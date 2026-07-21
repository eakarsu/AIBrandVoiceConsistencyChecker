'use strict';
const crypto = require('crypto');

class PublishingError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function reviewDraft(input) {
  if (!input || typeof input !== 'object') throw new PublishingError('INVALID_INPUT', 'draft is required');
  for (const field of ['briefId', 'draftId', 'channel', 'brandProfileId', 'brandRulesVersion', 'content']) {
    if (typeof input[field] !== 'string' || !input[field].trim()) throw new PublishingError('INVALID_INPUT', `${field} is required`);
  }
  const blockers = [];
  const warnings = [];
  const normalized = input.content.toLowerCase();
  for (const forbidden of input.rules?.forbiddenTerms || []) if (normalized.includes(String(forbidden).toLowerCase())) blockers.push({ code: 'FORBIDDEN_TERM', term: forbidden });
  for (const required of input.rules?.requiredDisclosures || []) if (!normalized.includes(String(required).toLowerCase())) blockers.push({ code: 'DISCLOSURE_MISSING', disclosure: required });
  for (const claim of input.claims || []) {
    if (!claim.text || !claim.evidenceRef || claim.status !== 'substantiated') blockers.push({ code: 'UNSUBSTANTIATED_CLAIM', claimId: claim.id || null });
  }
  for (const asset of input.assets || []) if (!asset.rightsRef || !asset.licenseScope?.includes(input.channel)) blockers.push({ code: 'RIGHTS_NOT_CLEARED', assetId: asset.id || null });
  if (/(ignore|override).{0,20}(instruction|system prompt)/i.test(input.content)) blockers.push({ code: 'PROMPT_INJECTION_PATTERN' });
  if (input.aiGenerated && !input.aiProvenance) blockers.push({ code: 'AI_PROVENANCE_REQUIRED' });
  if ((input.content.split(/\s+/).length || 0) < 3) warnings.push({ code: 'CONTENT_TOO_SHORT_FOR_MEANINGFUL_SCORING' });
  const canonical = { briefId: input.briefId, draftId: input.draftId, channel: input.channel, brandProfileId: input.brandProfileId, brandRulesVersion: input.brandRulesVersion, content: input.content, claims: input.claims || [], assets: input.assets || [] };
  return { ...canonical, contentHash: crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex'), blockers, warnings, status: blockers.length ? 'changes_required' : 'awaiting_human_approval' };
}

function approveForPublishing(review, actor) {
  if (!review || review.status !== 'awaiting_human_approval') throw new PublishingError('INVALID_TRANSITION', 'draft has unresolved blockers');
  if (!actor || !['publisher', 'brand_manager', 'admin'].includes(actor.role)) throw new PublishingError('FORBIDDEN', 'publishing approval role required');
  return { ...review, status: 'approved_for_publish', approvedBy: actor.id, approvedAt: new Date().toISOString() };
}

module.exports = { PublishingError, reviewDraft, approveForPublishing };
