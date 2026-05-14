// Backwards-compatible wrapper. New code should use ./lib/aiHelpers directly.
const { callOpenRouter, parseAIJson, parseLabeledFields, DEFAULT_MODEL } = require('./lib/aiHelpers');

module.exports = { callOpenRouter, parseAIJson, parseLabeledFields, DEFAULT_MODEL };
