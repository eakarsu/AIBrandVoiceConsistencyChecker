import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { featureConfig } from '../featureConfig';
import axios from 'axios';
import {
  Fingerprint, FileSearch, AudioWaveform, BookOpen, Radio, BarChart3,
  Library, Swords, LayoutTemplate, ClipboardCheck, Users, History,
  Sparkles, Heart, Globe, TrendingUp, ArrowRight
} from 'lucide-react';

const iconMap = {
  Fingerprint, FileSearch, AudioWaveform, BookOpen, Radio, BarChart3,
  Library, Swords, LayoutTemplate, ClipboardCheck, Users, History,
  Sparkles, Heart, Globe,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    featureConfig.forEach(async (f) => {
      try {
        const res = await axios.get(f.apiPath);
        setCounts(prev => ({ ...prev, [f.key]: res.data.length }));
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
