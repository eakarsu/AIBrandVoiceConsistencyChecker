import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { featureConfig, aiToolsConfig } from '../featureConfig';
import axios from 'axios';
import {
  Fingerprint, FileSearch, AudioWaveform, BookOpen, Radio, BarChart3,
  Library, Swords, LayoutTemplate, ClipboardCheck, Users, History,
  Sparkles, Heart, Globe, TrendingUp, ArrowRight,
  Activity, Shuffle, CheckCircle, Clock, GitMerge
} from 'lucide-react';

const iconMap = {
  Fingerprint, FileSearch, AudioWaveform, BookOpen, Radio, BarChart3,
  Library, Swords, LayoutTemplate, ClipboardCheck, Users, History,
  Sparkles, Heart, Globe,
  Activity, Shuffle, CheckCircle, Clock, GitMerge,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [aiHistory, setAiHistory] = useState([]);
  const [aiHistoryPage, setAiHistoryPage] = useState(1);
  const [aiHistoryPagination, setAiHistoryPagination] = useState(null);
  const [aiHistoryFeature, setAiHistoryFeature] = useState('');
  const [aiHistoryLoading, setAiHistoryLoading] = useState(false);
  const [showAiHistory, setShowAiHistory] = useState(false);

  const loadAiHistory = async (pg = 1, feature = '') => {
    setAiHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 10 });
      if (feature) params.set('feature', feature);
      const res = await axios.get(`/api/ai/results?${params}`);
      setAiHistory(res.data?.data || []);
      setAiHistoryPagination(res.data?.pagination || null);
      setAiHistoryPage(pg);
    } catch (_) {
      setAiHistory([]);
    } finally {
      setAiHistoryLoading(false);
    }
  };

  const toggleAiHistory = () => {
    if (!showAiHistory) loadAiHistory(1, aiHistoryFeature);
    setShowAiHistory(s => !s);
  };

  useEffect(() => {
    featureConfig.forEach(async (f) => {
      try {
        const res = await axios.get(`${f.apiPath}?page=1&limit=1`);
        // Support both legacy array shape and new {data, pagination} shape
        const total = Array.isArray(res.data)
          ? res.data.length
          : (res.data?.pagination?.total ?? (res.data?.data?.length ?? 0));
        setCounts(prev => ({ ...prev, [f.key]: total }));
      } catch (e) {
        setCounts(prev => ({ ...prev, [f.key]: 0 }));
      }
    });
  }, []);

  return (
    <div>
      <div style={styles.hero}>
        <div>
          <h1 style={styles.heroTitle}>AI Brand Voice Consistency Checker</h1>
          <p style={styles.heroSubtitle}>Enterprise-grade brand voice management powered by AI. Ensure consistency across all channels and languages.</p>
        </div>
        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <TrendingUp size={20} color="#6366f1" />
            <div>
              <div style={styles.statNumber}>{Object.values(counts).reduce((a, b) => a + b, 0)}</div>
              <div style={styles.statLabel}>Total Items</div>
            </div>
          </div>
          <div style={styles.statBox}>
            <Sparkles size={20} color="#f59e0b" />
            <div>
              <div style={styles.statNumber}>{featureConfig.filter(f => f.hasAI).length}</div>
              <div style={styles.statLabel}>AI Features</div>
            </div>
          </div>
          <div style={styles.statBox}>
            <Globe size={20} color="#0ea5e9" />
            <div>
              <div style={styles.statNumber}>15</div>
              <div style={styles.statLabel}>Features</div>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        {featureConfig.map((feature) => {
          const Icon = iconMap[feature.icon] || Fingerprint;
          const isHovered = hoveredCard === feature.key;
          return (
            <div
              key={feature.key}
              style={{
                ...styles.card,
                ...(isHovered ? styles.cardHover : {}),
                borderColor: isHovered ? feature.color + '60' : 'rgba(71, 85, 105, 0.3)',
              }}
              onClick={() => navigate(`/feature/${feature.key}`)}
              onMouseEnter={() => setHoveredCard(feature.key)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={styles.cardTop}>
                <div style={{ ...styles.iconBox, background: feature.gradient }}>
                  <Icon size={22} color="white" />
                </div>
                {feature.hasAI && (
                  <span style={styles.aiBadge}>AI Powered</span>
                )}
              </div>
              <h3 style={styles.cardTitle}>{feature.title}</h3>
              <p style={styles.cardDesc}>{feature.description}</p>
              <div style={styles.cardFooter}>
                <span style={styles.countBadge}>
                  {counts[feature.key] !== undefined ? counts[feature.key] : '...'} items
                </span>
                <ArrowRight size={16} color={isHovered ? feature.color : '#475569'} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 40 }}>
        <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          <Sparkles size={20} color="#fbbf24" style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Advanced AI Tools
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
          Specialized AI tools that produce structured outputs (rate-limited 20/hour).
        </p>
        <div style={styles.grid}>
          {aiToolsConfig.map((tool) => {
            const Icon = iconMap[tool.icon] || Sparkles;
            const isHovered = hoveredCard === `ai-${tool.key}`;
            return (
              <div
                key={tool.key}
                style={{
                  ...styles.card,
                  ...(isHovered ? styles.cardHover : {}),
                  borderColor: isHovered ? tool.color + '60' : 'rgba(71, 85, 105, 0.3)',
                }}
                onClick={() => navigate(`/ai/${tool.key}`)}
                onMouseEnter={() => setHoveredCard(`ai-${tool.key}`)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={styles.cardTop}>
                  <div style={{ ...styles.iconBox, background: `linear-gradient(135deg, ${tool.color}, ${tool.color}dd)` }}>
                    <Icon size={22} color="white" />
                  </div>
                  <span style={styles.aiBadge}>AI Tool</span>
                </div>
                <h3 style={styles.cardTitle}>{tool.title}</h3>
                <p style={styles.cardDesc}>{tool.description}</p>
                <div style={styles.cardFooter}>
                  <span style={styles.countBadge}>POST {tool.apiPath}</span>
                  <ArrowRight size={16} color={isHovered ? tool.color : '#475569'} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI History Panel */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>
            <History size={20} color="#6366f1" style={{ verticalAlign: 'middle', marginRight: 8 }} />
            AI Result History
          </h2>
          <button
            onClick={toggleAiHistory}
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: '8px 16px', color: '#818cf8', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {showAiHistory ? 'Hide' : 'Show History'}
          </button>
        </div>
        {showAiHistory && (
          <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(71,85,105,0.3)', borderRadius: 16, padding: 20 }}>
            {/* Feature filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['', 'content-analysis', 'tone-detection', 'sentiment-analysis', 'content-scoring', 'audit-report', 'voice-drift', 'audience-persona', 'variation-generator', 'competitor-analysis', 'ai-suggestions', 'multi-language', 'readability-score', 'tone-rewriter'].map(f => (
                <button
                  key={f || 'all'}
                  onClick={() => { setAiHistoryFeature(f); loadAiHistory(1, f); }}
                  style={{
                    background: aiHistoryFeature === f ? 'rgba(99,102,241,0.25)' : 'rgba(30,41,59,0.8)',
                    border: `1px solid ${aiHistoryFeature === f ? 'rgba(99,102,241,0.5)' : 'rgba(71,85,105,0.3)'}`,
                    borderRadius: 8, padding: '5px 12px', color: aiHistoryFeature === f ? '#818cf8' : '#94a3b8',
                    fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >{f || 'All Features'}</button>
              ))}
            </div>
            {aiHistoryLoading ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: 24 }}>Loading…</div>
            ) : aiHistory.length === 0 ? (
              <div style={{ color: '#475569', textAlign: 'center', padding: 24 }}>No AI history yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {aiHistory.map(item => (
                  <div key={item.id} style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(71,85,105,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, border: '1px solid rgba(99,102,241,0.3)' }}>
                        {item.feature}
                      </span>
                      <span style={{ color: '#475569', fontSize: 11 }}>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    {item.output && (
                      <pre style={{ background: '#0f172a', color: '#cbd5e1', padding: 10, borderRadius: 8, fontSize: 11, maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                        {typeof item.output === 'string' ? item.output : JSON.stringify(item.output, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Pagination */}
            {aiHistoryPagination && aiHistoryPagination.totalPages > 1 && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
                <button disabled={aiHistoryPage <= 1} onClick={() => loadAiHistory(aiHistoryPage - 1, aiHistoryFeature)}
                  style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 8, padding: '5px 10px', color: '#94a3b8', fontSize: 13, cursor: 'pointer', opacity: aiHistoryPage <= 1 ? 0.4 : 1 }}>
                  Prev
                </button>
                <span style={{ color: '#64748b', fontSize: 13, padding: '5px 12px' }}>
                  {aiHistoryPage} / {aiHistoryPagination.totalPages}
                </span>
                <button disabled={aiHistoryPage >= aiHistoryPagination.totalPages} onClick={() => loadAiHistory(aiHistoryPage + 1, aiHistoryFeature)}
                  style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 8, padding: '5px 10px', color: '#94a3b8', fontSize: 13, cursor: 'pointer', opacity: aiHistoryPage >= aiHistoryPagination.totalPages ? 0.4 : 1 }}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  hero: {
    background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))',
    border: '1px solid rgba(99,102,241,0.15)',
    borderRadius: '20px',
    padding: '36px',
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '24px',
  },
  heroTitle: {
    fontSize: '28px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #e2e8f0, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  heroSubtitle: {
    fontSize: '15px',
    color: '#94a3b8',
    maxWidth: '500px',
    lineHeight: '1.5',
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  statBox: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(71, 85, 105, 0.3)',
    borderRadius: '14px',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: '140px',
  },
  statNumber: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(71, 85, 105, 0.3)',
    borderRadius: '16px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
    background: 'rgba(30, 41, 59, 0.9)',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  cardTitle: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#f1f5f9',
  },
  cardDesc: {
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: '1.5',
    flex: 1,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(71, 85, 105, 0.2)',
  },
  countBadge: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
};
