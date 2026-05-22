import React, { useState } from 'react';

export default function ClaimSubstantiationPage() {
  const [payload, setPayload] = useState(JSON.stringify({ copy: 'The fastest, most trusted platform for every enterprise team.', evidence: ['customer survey trust score'] }, null, 2));
  const [result, setResult] = useState(null);
  const run = async () => {
    const res = await fetch('/api/claim-substantiation/check', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, body: JSON.stringify(JSON.parse(payload)) });
    setResult(await res.json());
  };
  return (
    <div>
      <h1>Claim Substantiation</h1>
      <p style={{ color: '#94a3b8' }}>Check brand claims against available evidence before approval.</p>
      <textarea style={{ width: '100%', minHeight: 220 }} value={payload} onChange={(event) => setPayload(event.target.value)} />
      <button onClick={run}>Check Claims</button>
      {result && <section style={{ marginTop: 20 }}><h2>{result.status}</h2><p>{result.action}</p><p>Uncovered: {result.uncovered.join(', ') || 'none'}</p></section>}
    </div>
  );
}
