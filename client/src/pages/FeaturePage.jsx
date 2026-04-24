import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { featureConfig } from '../featureConfig';
import {
  Plus, ArrowLeft, X, Edit3, Trash2, ChevronDown, Sparkles, CheckCircle,
  AlertTriangle, BarChart3, Clock, Loader2
} from 'lucide-react';

export default function FeaturePage() {
  const { featureKey } = useParams();
  const navigate = useNavigate();
  const config = featureConfig.find(f => f.key === featureKey);

  const [items, setItems] = useState([]);
  const [brandProfiles, setBrandProfiles] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(config.apiPath);
      setItems(res.data);
    } catch (err) {
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [config.apiPath]);

  useEffect(() => {
    fetchItems();
    axios.get('/api/brand-profiles').then(res => setBrandProfiles(res.data)).catch(() => {});
  }, [fetchItems]);

  if (!config) return <div>Feature not found</div>;

  const openCreate = () => {
    setEditItem(null);
    setFormData({});
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    const data = {};
    config.fields.forEach(f => {
      if (f.type === 'tags') {
        try {
          data[f.name] = Array.isArray(item[f.name]) ? item[f.name].join(', ') : (JSON.parse(item[f.name] || '[]')).join(', ');
        } catch {
          data[f.name] = item[f.name] || '';
        }
      } else {
        data[f.name] = item[f.name] || '';
      }
    });
    setFormData(data);
    setShowForm(true);
    setSelectedItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const submitData = { ...formData };
      config.fields.forEach(f => {
        if (f.type === 'tags' && typeof submitData[f.name] === 'string') {
          submitData[f.name] = submitData[f.name].split(',').map(s => s.trim()).filter(Boolean);
        }
        if (f.type === 'select' && f.optionsFrom === 'brand-profiles' && submitData[f.name]) {
          submitData[f.name] = parseInt(submitData[f.name]);
        }
      });

      if (editItem) {
        await axios.put(`${config.apiPath}/${editItem.id}`, submitData);
      } else {
        await axios.post(config.apiPath, submitData);
      }
      setShowForm(false);
      setFormData({});
      setEditItem(null);
      await fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await axios.delete(`${config.apiPath}/${id}`);
      setSelectedItem(null);
      await fetchItems();
    } catch (err) {
      setError('Delete failed');
    }
  };

  const getStatusColor = (status) => {
    if (status === 'completed') return '#10b981';
    if (status === 'active') return '#3b82f6';
    if (status === 'pending') return '#f59e0b';
    if (status === 'banned') return '#ef4444';
    if (status === 'approved') return '#10b981';
    if (status === 'restricted') return '#f59e0b';
    return '#64748b';
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const renderFieldValue = (item, col) => {
    const val = item[col];
    if (col.includes('score') && val !== null && val !== undefined) {
      const numVal = parseFloat(val);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '40px',
            height: '4px',
            background: 'rgba(71,85,105,0.3)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(Math.abs(numVal) * (col === 'sentiment_score' ? 50 : 1), 100)}%`,
              height: '100%',
              background: getScoreColor(Math.abs(numVal) * (col === 'sentiment_score' ? 100 : 1)),
              borderRadius: '2px',
            }} />
          </div>
          <span style={{ color: getScoreColor(Math.abs(numVal) * (col === 'sentiment_score' ? 100 : 1)), fontWeight: '600', fontSize: '13px' }}>
            {val}
          </span>
        </div>
      );
    }
    if (col === 'status' || col === 'severity') {
      return (
        <span style={{
          background: `${getStatusColor(val)}15`,
          color: getStatusColor(val),
          padding: '3px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '500',
          border: `1px solid ${getStatusColor(val)}30`,
        }}>
          {val}
        </span>
      );
    }
    return <span style={{ color: '#cbd5e1', fontSize: '13px' }}>{val || '—'}</span>;
  };

  const renderAIOutput = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div style={styles.aiOutput}>
        <div style={styles.aiHeader}>
          <Sparkles size={18} color="#fbbf24" />
          <span style={styles.aiHeaderText}>AI Analysis</span>
        </div>
        <div style={styles.aiBody}>
          {lines.map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={i} style={{ height: '8px' }} />;

            // Section headers (KEY: value pattern)
            const headerMatch = trimmed.match(/^([A-Z_]+(?:\s[A-Z_]+)*):\s*(.*)$/);
            if (headerMatch) {
              const label = headerMatch[1].replace(/_/g, ' ');
              const value = headerMatch[2];

              // Score values
              const scoreMatch = value.match(/^\[?(\d+)\]?$/);
              if (scoreMatch) {
                const score = parseInt(scoreMatch[1]);
                return (
                  <div key={i} style={styles.aiMetric}>
                    <span style={styles.aiMetricLabel}>{label}</span>
                    <div style={styles.aiScoreBar}>
                      <div style={{ ...styles.aiScoreFill, width: `${score}%`, background: getScoreColor(score) }} />
                    </div>
                    <span style={{ ...styles.aiMetricValue, color: getScoreColor(score) }}>{score}%</span>
                  </div>
                );
              }

              // Percentage values
              const pctMatch = value.match(/^\[?(\d+)%?\]?$/);
              if (pctMatch) {
                const pct = parseInt(pctMatch[1]);
                return (
                  <div key={i} style={styles.aiMetric}>
                    <span style={styles.aiMetricLabel}>{label}</span>
                    <div style={styles.aiScoreBar}>
                      <div style={{ ...styles.aiScoreFill, width: `${pct}%`, background: getScoreColor(pct) }} />
                    </div>
                    <span style={{ ...styles.aiMetricValue, color: getScoreColor(pct) }}>{pct}%</span>
                  </div>
                );
              }

              return (
                <div key={i} style={styles.aiSection}>
                  <div style={styles.aiSectionLabel}>{label}</div>
                  <div style={styles.aiSectionValue}>{value || ''}</div>
                </div>
              );
            }

            // Bullet points
            if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
              return (
                <div key={i} style={styles.aiBullet}>
                  <div style={styles.aiBulletDot} />
                  <span>{trimmed.substring(2)}</span>
                </div>
              );
            }

            // Numbered items
            const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
            if (numMatch) {
              return (
                <div key={i} style={styles.aiNumbered}>
                  <span style={styles.aiNumber}>{numMatch[1]}</span>
                  <span>{numMatch[2]}</span>
                </div>
              );
            }

            return <p key={i} style={styles.aiParagraph}>{trimmed}</p>;
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div style={styles.pageHeaderLeft}>
          <button onClick={() => navigate('/')} style={styles.backBtn}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ ...styles.pageTitle, color: config.color }}>{config.title}</h1>
            <p style={styles.pageDesc}>{config.description}</p>
          </div>
        </div>
        <button onClick={openCreate} style={{ ...styles.addBtn, background: config.gradient }}>
          <Plus size={18} />
          New {config.title.replace(/s$/, '').replace(/ies$/, 'y')}
        </button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError('')} style={styles.errorClose}><X size={14} /></button>
        </div>
      )}

      {/* List Table */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loadingBox}><Loader2 size={24} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Loading...</div>
        ) : items.length === 0 ? (
          <div style={styles.emptyBox}>
            <p>No items yet. Click "New" to create one.</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  {config.columns.map(col => (
                    <th key={col} style={styles.th}>{col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>
                  ))}
                  <th style={styles.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      ...styles.tr,
                      background: selectedItem?.id === item.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                    }}
                  >
                    <td style={styles.td}>
                      <span style={styles.rowNum}>{idx + 1}</span>
                    </td>
                    {config.columns.map(col => (
                      <td key={col} style={styles.td}>{renderFieldValue(item, col)}</td>
                    ))}
                    <td style={styles.td}>
                      <span style={{ color: '#64748b', fontSize: '12px' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <div style={styles.detailPanel}>
          <div style={styles.detailHeader}>
            <h2 style={styles.detailTitle}>
              {selectedItem[config.columns[0]] || selectedItem.title || selectedItem.name || `Item #${selectedItem.id}`}
            </h2>
            <div style={styles.detailActions}>
              <button onClick={() => openEdit(selectedItem)} style={styles.editBtn}>
                <Edit3 size={15} /> Edit
              </button>
              <button onClick={() => handleDelete(selectedItem.id)} style={styles.deleteBtn}>
                <Trash2 size={15} /> Delete
              </button>
              <button onClick={() => setSelectedItem(null)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div style={styles.detailGrid}>
            {config.fields.map(field => {
              let value = selectedItem[field.name];
              if (field.type === 'tags') {
                try {
                  value = Array.isArray(value) ? value : JSON.parse(value || '[]');
                } catch { value = [value]; }
                return (
                  <div key={field.name} style={styles.detailField}>
                    <label style={styles.detailLabel}>{field.label}</label>
                    <div style={styles.tagList}>
                      {(Array.isArray(value) ? value : []).map((tag, i) => (
                        <span key={i} style={{ ...styles.tag, borderColor: config.color + '40', color: config.color }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }
              if (field.type === 'select' && field.optionsFrom === 'brand-profiles') {
                const bp = brandProfiles.find(b => b.id === parseInt(value));
                value = bp ? bp.name : value;
              }
              return (
                <div key={field.name} style={styles.detailField}>
                  <label style={styles.detailLabel}>{field.label}</label>
                  <div style={styles.detailValue}>
                    {field.type === 'textarea' ? (
                      <div style={styles.detailTextarea}>{value || '—'}</div>
                    ) : (
                      renderFieldValue(selectedItem, field.name)
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Analysis Output */}
          {config.hasAI && selectedItem[config.aiField] && renderAIOutput(selectedItem[config.aiField])}

          {/* Score display */}
          {config.scoreField && selectedItem[config.scoreField] !== null && selectedItem[config.scoreField] !== undefined && (
            <div style={styles.scoreCard}>
              <div style={styles.scoreLabel}>
                {config.scoreField === 'sentiment_score' ? 'Sentiment Score' : 'Overall Score'}
              </div>
              <div style={{
                ...styles.scoreValue,
                color: getScoreColor(
                  config.scoreField === 'sentiment_score'
                    ? Math.abs(parseFloat(selectedItem[config.scoreField])) * 100
                    : selectedItem[config.scoreField]
                ),
              }}>
                {selectedItem[config.scoreField]}
                {config.scoreField !== 'sentiment_score' && '%'}
              </div>
              <div style={styles.scoreBigBar}>
                <div style={{
                  ...styles.scoreBigFill,
                  width: `${config.scoreField === 'sentiment_score'
                    ? Math.abs(parseFloat(selectedItem[config.scoreField])) * 50 + 50
                    : selectedItem[config.scoreField]}%`,
                  background: getScoreColor(
                    config.scoreField === 'sentiment_score'
                      ? Math.abs(parseFloat(selectedItem[config.scoreField])) * 100
                      : selectedItem[config.scoreField]
                  ),
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editItem ? 'Edit' : 'New'} {config.title.replace(/s$/, '').replace(/ies$/, 'y')}
              </h2>
              <button onClick={() => setShowForm(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={styles.modalForm}>
              {config.fields.map(field => (
                <div key={field.name} style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    {field.label}
                    {field.required && <span style={{ color: '#f43f5e' }}> *</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.name] || ''}
                      onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                      style={styles.formTextarea}
                      rows={4}
                      required={field.required}
                      placeholder={field.placeholder || ''}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.name] || ''}
                      onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                      style={styles.formSelect}
                    >
                      <option value="">Select {field.label}</option>
                      {field.optionsFrom === 'brand-profiles'
                        ? brandProfiles.map(bp => (
                            <option key={bp.id} value={bp.id}>{bp.name}</option>
                          ))
                        : field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                          ))
                      }
                    </select>
                  ) : field.type === 'tags' ? (
                    <input
                      type="text"
                      value={formData[field.name] || ''}
                      onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                      style={styles.formInput}
                      placeholder={field.placeholder || 'Comma-separated values'}
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[field.name] || ''}
                      onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                      style={styles.formInput}
                      required={field.required}
                      placeholder={field.placeholder || ''}
                    />
                  )}
                </div>
              ))}

              {config.hasAI && !editItem && (
                <div style={styles.aiNotice}>
                  <Sparkles size={16} color="#fbbf24" />
                  <span>AI analysis will be generated automatically upon creation</span>
                </div>
              )}

              <div style={styles.formActions}>
                <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} style={{ ...styles.submitFormBtn, background: config.gradient }}>
                  {submitting ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      {config.hasAI && !editItem ? 'Analyzing with AI...' : 'Saving...'}
                    </>
                  ) : (
                    editItem ? 'Update' : config.hasAI ? 'Create & Analyze' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        tr:hover { background: rgba(99,102,241,0.04) !important; }
      `}</style>
    </div>
  );
}

const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  pageHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(71, 85, 105, 0.3)',
    borderRadius: '10px',
    padding: '10px',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '700',
  },
  pageDesc: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '2px',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#fca5a5',
    fontSize: '14px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  errorClose: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: '#fca5a5',
    cursor: 'pointer',
  },
  tableCard: {
    background: 'rgba(30, 41, 59, 0.4)',
    border: '1px solid rgba(71, 85, 105, 0.3)',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  loadingBox: {
    padding: '60px',
    textAlign: 'center',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  emptyBox: {
    padding: '60px',
    textAlign: 'center',
    color: '#475569',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(71, 85, 105, 0.3)',
    background: 'rgba(15, 23, 42, 0.4)',
    whiteSpace: 'nowrap',
  },
  tr: {
    cursor: 'pointer',
    transition: 'background 0.15s',
    borderBottom: '1px solid rgba(71, 85, 105, 0.15)',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  rowNum: {
    color: '#475569',
    fontSize: '12px',
    fontWeight: '500',
  },
  detailPanel: {
    marginTop: '24px',
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(71, 85, 105, 0.3)',
    borderRadius: '16px',
    padding: '28px',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  detailTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  detailActions: {
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '10px',
    color: '#818cf8',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    color: '#f87171',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  closeBtn: {
    background: 'rgba(71, 85, 105, 0.2)',
    border: '1px solid rgba(71, 85, 105, 0.3)',
    borderRadius: '10px',
    padding: '8px',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  detailField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  detailLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#cbd5e1',
  },
  detailTextarea: {
    background: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(71, 85, 105, 0.2)',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#cbd5e1',
    whiteSpace: 'pre-wrap',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  tag: {
    background: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid',
    borderRadius: '20px',
    padding: '3px 12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  // AI Output Styles
  aiOutput: {
    marginTop: '24px',
    border: '1px solid rgba(251, 191, 36, 0.2)',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  aiHeader: {
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.05))',
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid rgba(251, 191, 36, 0.15)',
  },
  aiHeaderText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#fbbf24',
  },
  aiBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  aiMetric: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    background: 'rgba(15, 23, 42, 0.4)',
    borderRadius: '10px',
  },
  aiMetricLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'capitalize',
    minWidth: '160px',
  },
  aiScoreBar: {
    flex: 1,
    height: '6px',
    background: 'rgba(71, 85, 105, 0.3)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  aiScoreFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  aiMetricValue: {
    fontSize: '14px',
    fontWeight: '700',
    minWidth: '50px',
    textAlign: 'right',
  },
  aiSection: {
    padding: '10px 14px',
    background: 'rgba(15, 23, 42, 0.3)',
    borderRadius: '10px',
    borderLeft: '3px solid rgba(251, 191, 36, 0.3)',
  },
  aiSectionLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#fbbf24',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  aiSectionValue: {
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: '1.6',
  },
  aiBullet: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    paddingLeft: '16px',
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.5',
  },
  aiBulletDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: '#818cf8',
    marginTop: '7px',
    flexShrink: 0,
  },
  aiNumbered: {
    display: 'flex',
    gap: '10px',
    paddingLeft: '16px',
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.5',
  },
  aiNumber: {
    color: '#818cf8',
    fontWeight: '700',
    fontSize: '12px',
  },
  aiParagraph: {
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: '1.6',
    padding: '4px 0',
  },
  // Score card
  scoreCard: {
    marginTop: '20px',
    background: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(71, 85, 105, 0.3)',
    borderRadius: '14px',
    padding: '20px',
    textAlign: 'center',
  },
  scoreLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  scoreValue: {
    fontSize: '42px',
    fontWeight: '800',
  },
  scoreBigBar: {
    height: '8px',
    background: 'rgba(71, 85, 105, 0.3)',
    borderRadius: '4px',
    marginTop: '12px',
    overflow: 'hidden',
  },
  scoreBigFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.8s ease',
  },
  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#1e293b',
    border: '1px solid rgba(71, 85, 105, 0.5)',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 28px',
    borderBottom: '1px solid rgba(71, 85, 105, 0.3)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  modalForm: {
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#94a3b8',
  },
  formInput: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(71, 85, 105, 0.5)',
    borderRadius: '10px',
    padding: '11px 14px',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
  },
  formTextarea: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(71, 85, 105, 0.5)',
    borderRadius: '10px',
    padding: '11px 14px',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    width: '100%',
  },
  formSelect: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(71, 85, 105, 0.5)',
    borderRadius: '10px',
    padding: '11px 14px',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
  },
  aiNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: 'rgba(251, 191, 36, 0.08)',
    border: '1px solid rgba(251, 191, 36, 0.2)',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#fbbf24',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '8px',
  },
  cancelBtn: {
    padding: '10px 20px',
    background: 'rgba(71, 85, 105, 0.2)',
    border: '1px solid rgba(71, 85, 105, 0.3)',
    borderRadius: '10px',
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  submitFormBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 24px',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
