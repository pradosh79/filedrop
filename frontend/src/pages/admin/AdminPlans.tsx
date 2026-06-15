import React, { useState, useEffect } from 'react';

const BACKEND = 'https://filedrop-production-28dd.up.railway.app/api/v1';

function bytesToGB(b: number) { return String(Math.round(b / 1_073_741_824)); }
function bytesToMB(b: number) { return String(Math.round(b / 1_048_576)); }
function gbToBytes(g: string) { return Math.round(Number(g) * 1_073_741_824); }
function mbToBytes(m: string) { return Math.round(Number(m) * 1_048_576); }

export function AdminPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState('');
  const [edits, setEdits] = useState<Record<string, any>>({});
  const adminKey = localStorage.getItem('admin_key') || '';

  const load = () => {
    setLoading(true);
    setError('');
    const url = `${BACKEND}/admin/plans?t=${Date.now()}`;
    fetch(url, { headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' } })
      .then(async r => {
        const text = await r.text();
        let d: any;
        try { d = JSON.parse(text); } catch { throw new Error(`Non-JSON response: ${text.slice(0, 200)}`); }
        if (!r.ok) throw new Error(`${r.status}: ${d.message || text}`);
        const list = Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : [];
        if (list.length === 0) throw new Error(`API returned empty array. Raw: ${text.slice(0, 300)}`);
        const e: Record<string, any> = {};
        list.forEach((p: any) => {
          e[p.id] = {
            displayName: p.displayName || '',
            monthlyPrice: String(p.monthlyPrice ?? 0),
            uploadsPerMonth: String(p.uploadsPerMonth ?? 100),
            storageGB: bytesToGB(p.storageBytes ?? 1073741824),
            maxFileSizeMB: bytesToMB(p.maxFileSizeBytes ?? 10485760),
            isActive: p.isActive !== false,
          };
        });
        setPlans(list);
        setEdits(e);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const save = async (id: string) => {
    setSaving(id);
    const e = edits[id];
    try {
      const r = await fetch(`${BACKEND}/admin/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          displayName: e.displayName,
          monthlyPrice: parseFloat(e.monthlyPrice),
          uploadsPerMonth: parseInt(e.uploadsPerMonth),
          storageBytes: gbToBytes(e.storageGB),
          maxFileSizeBytes: mbToBytes(e.maxFileSizeMB),
          isActive: e.isActive,
        }),
      });
      if (r.ok) { setToast('Saved!'); setTimeout(() => setToast(''), 3000); load(); }
      else { const d = await r.json(); setToast(`Error: ${d.message}`); }
    } catch (err: any) { setToast(`Error: ${err.message}`); }
    setSaving('');
  };

  const s = { fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' };

  if (loading) return (
    <div style={{ ...s, padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 16, color: '#637381' }}>Loading plans from database...</div>
    </div>
  );

  if (error) return (
    <div style={{ ...s, padding: 40 }}>
      <div style={{ background: '#fef3cd', border: '1px solid #ffc107', borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <strong>Error loading plans:</strong>
        <pre style={{ marginTop: 8, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{error}</pre>
      </div>
      <div style={{ background: '#e8f0fe', border: '1px solid #4285f4', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 13 }}>
        <strong>Debug info:</strong><br />
        Backend URL: {BACKEND}<br />
        Admin key set: {adminKey ? `Yes (${adminKey.length} chars)` : 'NO - not set!'}<br />
        Admin key value: {adminKey || 'EMPTY'}<br />
      </div>
      <button onClick={load} style={{ background: '#008060', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', cursor: 'pointer', fontSize: 14 }}>
        Try Again
      </button>
    </div>
  );

  return (
    <div style={{ ...s, padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Plan Management</h1>
      <p style={{ color: '#637381', marginBottom: 24 }}>Edit pricing, limits and features for each plan</p>

      {toast && (
        <div style={{ background: toast.startsWith('Error') ? '#fef3cd' : '#e3f1df', border: '1px solid', borderColor: toast.startsWith('Error') ? '#ffc107' : '#008060', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
          {toast}
        </div>
      )}

      {plans.map(plan => (
        <div key={plan.id} style={{ background: '#fff', border: '1px solid #e1e3e5', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ background: plan.name === 'free' ? '#f4f6f8' : plan.name === 'starter' ? '#e3f1df' : '#e8f0fe', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{plan.displayName} Plan</h2>
            <span style={{ background: plan.isActive ? '#008060' : '#de3618', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
              {plan.isActive ? 'Active' : 'Inactive'}
            </span>
            <span style={{ background: '#fff', border: '1px solid #ccc', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{plan.name}</span>
          </div>

          <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            {[
              { label: 'Display name', key: 'displayName', type: 'text', prefix: '', suffix: '' },
              { label: 'Monthly price (USD)', key: 'monthlyPrice', type: 'number', prefix: '$', suffix: '' },
              { label: 'Uploads per month (-1 = unlimited)', key: 'uploadsPerMonth', type: 'number', prefix: '', suffix: '' },
              { label: 'Storage limit', key: 'storageGB', type: 'number', prefix: '', suffix: 'GB' },
              { label: 'Max file size', key: 'maxFileSizeMB', type: 'number', prefix: '', suffix: 'MB' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#202223' }}>{field.label}</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #c9cccf', borderRadius: 6, overflow: 'hidden' }}>
                  {field.prefix && <span style={{ padding: '8px 10px', background: '#f6f6f7', color: '#637381', fontSize: 13 }}>{field.prefix}</span>}
                  <input
                    type={field.type}
                    value={edits[plan.id]?.[field.key] ?? ''}
                    onChange={e => setEdits(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], [field.key]: e.target.value } }))}
                    style={{ flex: 1, border: 'none', padding: '8px 10px', fontSize: 14, outline: 'none' }}
                  />
                  {field.suffix && <span style={{ padding: '8px 10px', background: '#f6f6f7', color: '#637381', fontSize: 13 }}>{field.suffix}</span>}
                </div>
              </div>
            ))}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#202223' }}>Status</label>
              <select
                value={edits[plan.id]?.isActive ? 'true' : 'false'}
                onChange={e => setEdits(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], isActive: e.target.value === 'true' } }))}
                style={{ width: '100%', border: '1px solid #c9cccf', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => save(plan.id)}
              disabled={saving === plan.id}
              style={{ background: '#008060', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
            >
              {saving === plan.id ? 'Saving...' : `Save ${plan.displayName} plan`}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
