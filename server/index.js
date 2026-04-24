const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/brand-profiles', require('./routes/brandProfiles'));
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
