import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Trash2, Send } from 'lucide-react';

const ALLOWED_EVENTS = [
  'content.analyzed',
  'content.flagged_off_brand',
  'content.approved',
  'voice.drift_detected',
  'competitor.update_detected',
  'audit.report_generated',
  'guideline.updated',
];

export default function Webhooks() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ url: '', secret: '', events: ['content.analyzed'] });
  const [testResult, setTestResult] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const r = await axios.get('/api/webhooks');
      setItems(Array.isArray(r.data) ? r.data : (r.data?.data || []));
    } catch (e) { setError(e.response?.data?.error || 'Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleEvent = (ev) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.url) { setError('URL is required'); return; }
    if (form.events.length === 0) { setError('Select at least one event'); return; }
    setCreating(true); setError(null);
    try {
      await axios.post('/api/webhooks', { url: form.url, events: form.events, secret: form.secret || null });
      setForm({ url: '', secret: '', events: ['content.analyzed'] });
      load();
    } catch (e) { setError(e.response?.data?.error || 'Failed to create'); }
    setCreating(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this webhook?')) return;
    try {
      await axios.delete(`/api/webhooks/${id}`);
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch (e) { setError(e.response?.data?.error || 'Failed'); }
  };

  const test = async (id) => {
    setTestResult(null); setError(null);
    try {
      const r = await axios.post(`/api/webhooks/${id}/test`);
      setTestResult(r.data);
    } catch (e) { setError(e.response?.data?.error || 'Test failed'); }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Bell size={22} color="#fbbf24" />
        <h1 style={{ color: '#f1f5f9', fontSize: 24, margin: 0 }}>Webhook Subscriptions</h1>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 24, maxWidth: 720 }}>
        Subscribe external systems to brand-voice events
      </p>

      {error && <div style={{ ...cardStyle, marginBottom: 16, color: '#fca5a5', borderColor: '#7f1d1d' }}>{error}</div>}

      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ color: '#f1f5f9', marginBottom: 16 }}>New Subscription</h3>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Endpoint URL <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="url" placeholder="https://example.com/hooks/brandvoice" value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })} required style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Signing Secret (optional)</label>
            <input type="text" placeholder="hex/base64" value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Events</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ALLOWED_EVENTS.map((ev) => (
                <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#cbd5e1', fontSize: 13 }}>
                  <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                  <span>{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" style={primaryBtn} disabled={creating}>
            {creating ? 'Creating...' : 'Create Subscription'}
          </button>
        </form>
      </div>

      <div style={cardStyle}>
        <h3 style={{ color: '#f1f5f9', marginBottom: 16 }}>Active Webhooks</h3>
        {loading && <p style={{ color: '#94a3b8' }}>Loading...</p>}
        {!loading && items.length === 0 && <p style={{ color: '#94a3b8' }}>No webhooks subscribed.</p>}
        {!loading && items.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1', fontSize: 13 }}>
            <thead>
              <tr><th style={th}>ID</th><th style={th}>URL</th><th style={th}>Events</th><th style={th}>Active</th><th style={th}>Created</th><th style={th}>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id}>
                  <td style={td}>{w.id}</td>
                  <td style={{ ...td, wordBreak: 'break-all', maxWidth: 280 }}>{w.url}</td>
                  <td style={td}>{(w.events || []).join(', ')}</td>
                  <td style={td}>{w.active ? 'Yes' : 'No'}</td>
                  <td style={td}>{w.created_at ? new Date(w.created_at).toLocaleString() : ''}</td>
                  <td style={td}>
                    <button style={iconBtn} onClick={() => test(w.id)} title="Test"><Send size={14} /></button>
                    <button style={{ ...iconBtn, marginLeft: 6 }} onClick={() => remove(w.id)} title="Remove"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {testResult && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ color: '#f1f5f9', marginBottom: 8 }}>Test Payload</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, overflow: 'auto', color: '#cbd5e1', fontSize: 12 }}>
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

const cardStyle = { background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(71, 85, 105, 0.3)', borderRadius: 14, padding: 20 };
const labelStyle = { display: 'block', color: '#cbd5e1', fontSize: 13, marginBottom: 6 };
const inputStyle = { width: '100%', background: '#0f172a', color: '#f1f5f9', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' };
const primaryBtn = { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const iconBtn = { background: 'rgba(71, 85, 105, 0.3)', color: '#cbd5e1', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: 8, padding: 6, cursor: 'pointer' };
const th = { textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid rgba(71, 85, 105, 0.4)', fontSize: 12 };
const td = { padding: '8px 6px', borderBottom: '1px solid rgba(71, 85, 105, 0.2)' };
