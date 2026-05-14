import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { aiToolsConfig } from '../featureConfig';
import { ArrowLeft, Sparkles, Copy, Loader2 } from 'lucide-react';

function transformValue(value, transform) {
  if (value == null || value === '') return value;
  switch (transform) {
    case 'lines':
      return String(value).split('\n').map(s => s.trim()).filter(Boolean);
    case 'csv':
      return String(value).split(',').map(s => s.trim()).filter(Boolean);
    case 'json':
      try { return JSON.parse(value); } catch (_) { return value; }
    default:
      return value;
  }
}

export default function AIToolPage() {
  const { toolKey } = useParams();
  const navigate = useNavigate();
  const tool = aiToolsConfig.find((t) => t.key === toolKey);

  const [form, setForm] = useState({});
  const [brandProfiles, setBrandProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [rawText, setRawText] = useState('');

  useEffect(() => {
    // Load brand profiles for any select fields
    if (tool?.fields?.some((f) => f.optionsFrom === 'brand-profiles')) {
      axios.get('/api/brand-profiles')
        .then((res) => {
          const items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          setBrandProfiles(items);
        })
        .catch(() => setBrandProfiles([]));
    }
  }, [tool]);

  if (!tool) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ color: '#f1f5f9' }}>AI tool not found: {toolKey}</h2>
        <button onClick={() => navigate('/')} style={btnStyle}>Back to Dashboard</button>
      </div>
    );
  }

  const handleChange = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setRawText('');
    try {
      const payload = {};
      for (const f of tool.fields) {
        const raw = form[f.name];
        if (raw == null || raw === '') continue;
        payload[f.name] = transformValue(raw, f.transform);
      }
      const res = await axios.post(tool.apiPath, payload);
      setResult(res.data?.result || res.data);
      setRawText(res.data?.raw || JSON.stringify(res.data, null, 2));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyRaw = () => {
    navigator.clipboard.writeText(rawText || JSON.stringify(result, null, 2));
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate('/')} style={iconBtn}><ArrowLeft size={18} /></button>
        <Sparkles size={22} color="#fbbf24" />
        <h1 style={{ color: '#f1f5f9', fontSize: 24, margin: 0 }}>{tool.title}</h1>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 24, maxWidth: 720 }}>{tool.description}</p>

      <div style={{ display: 'grid', gridTemplateColumns: result || loading ? '1fr 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
        <div style={cardStyle}>
          <h3 style={{ color: '#f1f5f9', marginBottom: 16 }}>Input</h3>
          <form onSubmit={handleSubmit}>
            {tool.fields.map((f) => (
              <div key={f.name} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{f.label}{f.required && <span style={{ color: '#ef4444' }}> *</span>}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    rows={5}
                    value={form[f.name] || ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    placeholder={f.placeholder || ''}
                    style={inputStyle}
                    required={f.required}
                  />
                ) : f.type === 'select' && f.optionsFrom === 'brand-profiles' ? (
                  <select
                    value={form[f.name] || ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">-- Select Brand Profile --</option>
                    {brandProfiles.map((bp) => (
                      <option key={bp.id} value={bp.id}>{bp.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={form[f.name] || ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    placeholder={f.placeholder || ''}
                    style={inputStyle}
                    required={f.required}
                  />
                )}
              </div>
            ))}
            {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <button type="submit" disabled={loading} style={primaryBtn}>
              {loading ? <><Loader2 className="spin" size={16} /> Generating...</> : <>Generate <Sparkles size={16} style={{ verticalAlign: 'middle', marginLeft: 6 }} /></>}
            </button>
          </form>
        </div>

        {(result || loading) && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: '#f1f5f9', margin: 0 }}>AI Result</h3>
              {!loading && (
                <button onClick={copyRaw} style={iconBtn}><Copy size={16} /></button>
              )}
            </div>
            {loading ? (
              <div style={{ color: '#94a3b8' }}>Calling Claude…</div>
            ) : (
              <pre style={{
                background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 8,
                maxHeight: 540, overflow: 'auto', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word'
              }}>
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            )}
            {rawText && !loading && typeof result !== 'string' && (
              <details style={{ marginTop: 12 }}>
                <summary style={{ color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Show raw text</summary>
                <pre style={{ background: '#0f172a', color: '#94a3b8', padding: 12, borderRadius: 6, fontSize: 11, marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  {rawText}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = {
  background: 'rgba(30, 41, 59, 0.6)',
  border: '1px solid rgba(71, 85, 105, 0.3)',
  borderRadius: 14,
  padding: 20,
};
const labelStyle = { display: 'block', color: '#cbd5e1', fontSize: 13, marginBottom: 6 };
const inputStyle = {
  width: '100%', background: '#0f172a', color: '#f1f5f9',
  border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: 8, padding: '8px 10px', fontSize: 14,
};
const primaryBtn = {
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
  border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer',
  fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
};
const iconBtn = {
  background: 'rgba(71, 85, 105, 0.3)', color: '#cbd5e1',
  border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: 8, padding: 6, cursor: 'pointer',
};
const btnStyle = {
  background: '#6366f1', color: 'white', border: 'none', borderRadius: 8,
  padding: '8px 16px', cursor: 'pointer', marginTop: 12,
};
