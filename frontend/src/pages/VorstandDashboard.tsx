import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import Header from '../components/Header';
import styles from './Page.module.css';

type Application = {
  id: string; name: string; email: string; type: string;
  status: 'pending' | 'approved' | 'rejected';
  yes_votes: number; no_votes: number; total_votes: number;
  created_at: string;
};

const statusColors = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };
const statusLabels = { pending: 'Offen', approved: 'Bewilligt', rejected: 'Abgelehnt' };

export default function VorstandDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const member = JSON.parse(localStorage.getItem('member') || '{}');

  useEffect(() => {
    api.get('/applications', { params: filter ? { status: filter } : {} })
      .then(r => setApplications(r.data))
      .catch(() => navigate('/vorstand/login'))
      .finally(() => setLoading(false));
  }, [filter]); // navigate ist stabil und muss nicht als Dependency aufgeführt werden

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('member');
    navigate('/vorstand/login');
  };

  return (
    <div className={styles.container}>
      <Header
        subtitle="Vorstand-Dashboard"
        right={
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
              Angemeldet als <strong>{member.name}</strong>
              {member.role === 'chairman' && (
                <span style={{
                  marginLeft: '0.5rem', background: '#F2C674', color: '#145189',
                  fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.5rem',
                  borderRadius: 10, fontFamily: 'Signika, sans-serif', verticalAlign: 'middle',
                }}>
                  1. Vorsitzender
                </span>
              )}
            </span>
            <button onClick={logout} className={styles.btnSecondary}
              style={{ padding: '0.4rem 1rem', fontSize: '0.88rem' }}>
              Abmelden
            </button>
          </div>
        }
      />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {['', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={filter === f ? styles.btn : styles.btnSecondary}
              style={{ padding: '0.4rem 1.1rem', fontSize: '0.88rem' }}>
              {f === '' ? 'Alle' : statusLabels[f as keyof typeof statusLabels]}
            </button>
          ))}
        </div>

        {loading ? <p>Lade Anträge …</p> : applications.length === 0 ? (
          <div className={styles.card} style={{ textAlign: 'center', color: '#666' }}>
            Keine Anträge vorhanden.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {applications.map(app => (
              <Link key={app.id} to={`/vorstand/antrag/${app.id}`} style={{ textDecoration: 'none' }}>
              <div className={styles.card} style={{
                  borderLeft: `4px solid ${statusColors[app.status]}`,
                  borderTop: 'none',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.1s',
                  margin: 0,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>{app.type}</strong>
                      <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        {app.name} · {app.email}
                      </div>
                    </div>
                    <span style={{
                      background: statusColors[app.status], color: '#fff',
                      padding: '0.2rem 0.75rem', borderRadius: 20, fontSize: '0.85rem'
                    }}>
                      {statusLabels[app.status]}
                    </span>
                  </div>
                  {app.status === 'pending' && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                      Stimmen: ✅ {app.yes_votes} · ❌ {app.no_votes} · 
                      {' '}{4 - app.total_votes} noch ausstehend
                      {app.yes_votes === 2 && app.no_votes === 2 && (
                        <span style={{ marginLeft: '0.5rem', color: '#145189', fontWeight: 600 }}>
                          ⚖️ Stichentscheid möglich
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.5rem' }}>
                    Eingereicht: {new Date(app.created_at).toLocaleDateString('de-DE')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
