import React, { useState } from 'react';
import api from '../api';
import Header from '../components/Header';
import styles from './Page.module.css';

type ApplicationStatus = {
  id: string; name: string; type: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string; decided_at?: string;
};

const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
  pending:  { label: 'In Bearbeitung', color: '#f59e0b', icon: '⏳' },
  approved: { label: 'Bewilligt',      color: '#10b981', icon: '✅' },
  rejected: { label: 'Abgelehnt',      color: '#ef4444', icon: '❌' },
};

export default function AntragStatus() {
  const params = new URLSearchParams(window.location.search);
  const [id, setId] = useState(params.get('id') || '');
  const [result, setResult] = useState<ApplicationStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!id.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.get(`/applications/${id.trim()}/status`);
      setResult(res.data);
    } catch {
      setError('Antrag nicht gefunden. Bitte prüfen Sie die Antrags-ID.');
    } finally { setLoading(false); }
  };

  const s = result ? statusLabels[result.status] : null;

  return (
    <div className={styles.container}>
      <Header subtitle="Antragsstatus prüfen" />
      <main className={styles.card}>
        <h2>Antragsstatus prüfen</h2>
        <div className={styles.row} style={{ marginTop: '1.5rem' }}>
          <div className={styles.field} style={{ flex: 1 }}>
            <label>Antrags-ID</label>
            <input value={id} onChange={e => setId(e.target.value)}
              placeholder="Ihre Antrags-ID eingeben" onKeyDown={e => e.key === 'Enter' && check()} />
          </div>
          <button onClick={check} disabled={loading} className={styles.btn}
            style={{ alignSelf: 'flex-end' }}>
            {loading ? 'Suche …' : 'Prüfen'}
          </button>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        {result && s && (
          <div className={styles.infoBox} style={{ marginTop: '2rem', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem' }}>{s.icon}</span>
              <div>
                <strong>{result.type}</strong>
                <div style={{ color: s.color, fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
            <table style={{ width: '100%', fontSize: '0.9rem' }}>
              <tbody>
                <tr><td><strong>Antragsteller:</strong></td><td>{result.name}</td></tr>
                <tr><td><strong>Eingereicht:</strong></td>
                    <td>{new Date(result.created_at).toLocaleDateString('de-DE')}</td></tr>
                {result.decided_at && (
                  <tr><td><strong>Entschieden:</strong></td>
                      <td>{new Date(result.decided_at).toLocaleDateString('de-DE')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <footer className={styles.footer}><a href="/">← Zurück zum Antragsformular</a></footer>
    </div>
  );
}
