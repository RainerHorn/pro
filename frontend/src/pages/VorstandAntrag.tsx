import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Header from '../components/Header';
import styles from './Page.module.css';

type Vote = { vote: boolean; comment?: string; voted_at: string; board_member_name: string; board_member_role: string };
type ApplicationDetail = {
  id: string; name: string; email: string; type: string; scope: string;
  budget?: number; date_range?: string; class_group?: string; file_path?: string;
  status: 'pending' | 'approved' | 'rejected';
  yes_votes: number; no_votes: number;
  created_at: string; decided_at?: string;
  tiebreaker_applied: boolean;
  votes: Vote[];
  myVote?: { vote: boolean; comment?: string };
};

const statusColors = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };
const statusLabels = { pending: 'Offen', approved: 'Bewilligt', rejected: 'Abgelehnt' };

export default function VorstandAntrag() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    api.get(`/applications/${id}`)
      .then(r => setApp(r.data))
      .catch(() => navigate('/vorstand/login'));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const vote = async (voteValue: boolean) => {
    setSubmitting(true); setMessage('');
    try {
      await api.post(`/applications/${id}/vote`, { vote: voteValue, comment });
      setMessage('Stimme erfolgreich abgegeben!');
      load();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Fehler bei der Abstimmung');
    } finally { setSubmitting(false); }
  };

  if (!app) return <div className={styles.container}><p style={{ padding: '2rem' }}>Lade …</p></div>;

  return (
    <div className={styles.container}>
      <Header
        subtitle={app.type}
        right={
          <span style={{
            background: statusColors[app.status], color: app.status === 'pending' ? '#2B2B2B' : '#fff',
            padding: '0.3rem 1rem', borderRadius: 20, fontSize: '0.88rem', fontWeight: 700,
          }}>
            {statusLabels[app.status]}
          </span>
        }
      />
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={() => navigate('/vorstand/dashboard')} style={{
            background: 'none', border: 'none', color: '#1272AC',
            cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'Roboto, sans-serif',
            fontWeight: 600, padding: 0,
          }}>
            ← Dashboard
          </button>
        </div>
        {/* Antragsdaten */}
        <div className={styles.card}>
          <h3>Antragsdaten</h3>
          <table className={styles.detailTable}>
            <tbody>
              <tr><td>Antragsteller</td><td>{app.name}</td></tr>
              <tr><td>E-Mail</td><td><a href={`mailto:${app.email}`}>{app.email}</a></td></tr>
              <tr><td>Art der Unterstützung</td><td>{app.type}</td></tr>
              <tr><td>Umfang</td><td style={{ whiteSpace: 'pre-wrap' }}>{app.scope}</td></tr>
              {app.budget && <tr><td>Budget</td><td>{app.budget} €</td></tr>}
              {app.date_range && <tr><td>Zeitraum</td><td>{app.date_range}</td></tr>}
              {app.class_group && <tr><td>Klasse/Gruppe</td><td>{app.class_group}</td></tr>}
              <tr><td>Eingereicht</td><td>{new Date(app.created_at).toLocaleString('de-DE')}</td></tr>
              {app.file_path && (
                <tr><td>Anhang</td>
                  <td><a href={`/uploads/${app.file_path}`} target="_blank" rel="noreferrer">📄 PDF öffnen</a></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Abstimmungsstand */}
        <div className={styles.card} style={{ marginTop: '1rem' }}>
          <h3>Abstimmungsstand</h3>
          <div style={{ display: 'flex', gap: '2rem', margin: '1rem 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981' }}>{app.yes_votes}</div>
              <div style={{ color: '#666' }}>Ja</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ef4444' }}>{app.no_votes}</div>
              <div style={{ color: '#666' }}>Nein</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#94a3b8' }}>
                {4 - app.yes_votes - app.no_votes}
              </div>
              <div style={{ color: '#666' }}>Ausstehend</div>
            </div>
          </div>

          {app.votes.length > 0 && (
            <div>
              {app.votes.map((v, i) => (
                <div key={i} style={{
                  padding: '0.5rem 0.75rem', marginBottom: '0.5rem', borderRadius: 6,
                  background: v.vote ? '#d1fae5' : '#fee2e2',
                  fontSize: '0.9rem',
                }}>
                  <strong>{v.vote ? '✅' : '❌'} {v.board_member_name}</strong>
                  {v.board_member_role === 'chairman' && (
                    <span style={{
                      marginLeft: '0.5rem', background: '#145189', color: '#F2C674',
                      fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.5rem',
                      borderRadius: 10, fontFamily: 'Signika, sans-serif', verticalAlign: 'middle',
                    }}>
                      1. Vorsitzender
                    </span>
                  )}
                  {v.comment && <span style={{ color: '#555' }}> – {v.comment}</span>}
                  <span style={{ float: 'right', color: '#999' }}>
                    {new Date(v.voted_at).toLocaleString('de-DE')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tiebreaker-Hinweis */}
          {app.tiebreaker_applied && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 6,
              background: '#fef9e7', border: '1.5px solid #F2C674',
              fontSize: '0.88rem', color: '#7d6608',
            }}>
              <strong>⚖️ Stichentscheid:</strong> Die Abstimmung endete 2:2.
              Gemäß Satzung hat die Stimme des 1. Vorsitzenden doppeltes Gewicht und war entscheidend.
            </div>
          )}
        </div>

        {/* Abstimmungsformular */}
        {app.status === 'pending' && !app.myVote && (
          <div className={styles.card} style={{ marginTop: '1rem' }}>
            <h3>Ihre Stimme</h3>
            <div className={styles.field} style={{ marginTop: '1rem' }}>
              <label>Kommentar (optional)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                rows={3} placeholder="Begründung oder Anmerkungen …" />
            </div>
            {message && (
              <div className={message.includes('Fehler') ? styles.errorBox : styles.successBox}>
                {message}
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={() => vote(true)} disabled={submitting}
                className={styles.btn} style={{ background: '#10b981', flex: 1 }}>
                ✅ Ja, bewilligen
              </button>
              <button onClick={() => vote(false)} disabled={submitting}
                className={styles.btnDanger} style={{ flex: 1 }}>
                ❌ Nein, ablehnen
              </button>
            </div>
          </div>
        )}

        {app.myVote && (
          <div className={styles.infoBox} style={{ marginTop: '1rem' }}>
            Sie haben bereits mit <strong>{app.myVote.vote ? '✅ Ja' : '❌ Nein'}</strong> gestimmt.
          </div>
        )}

        {app.status !== 'pending' && (
          <div className={styles.infoBox} style={{ marginTop: '1rem', borderLeftColor: statusColors[app.status] }}>
            Dieser Antrag wurde am {app.decided_at ? new Date(app.decided_at).toLocaleDateString('de-DE') : '–'} 
            {' '}<strong>{statusLabels[app.status]}</strong>.
          </div>
        )}
      </main>
    </div>
  );
}
