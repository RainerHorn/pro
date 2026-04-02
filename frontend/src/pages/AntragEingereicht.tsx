import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import styles from './Page.module.css';

export default function AntragEingereicht() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className={styles.container}>
      <Header subtitle="Antragsportal für Förderleistungen" />
      <main className={styles.card} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
        <h2>Antrag erfolgreich eingereicht!</h2>
        <p style={{ marginTop: '1rem', color: '#555' }}>
          Ihr Antrag wurde entgegengenommen. Der Vorstand wird benachrichtigt und
          über Ihre Anfrage abstimmen. Sie erhalten eine E-Mail, sobald eine Entscheidung getroffen wurde.
        </p>
        <div className={styles.infoBox} style={{ marginTop: '2rem' }}>
          <strong>Ihre Antrags-ID:</strong><br />
          <code style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>{id}</code>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
            Mit dieser ID können Sie den Status Ihres Antrags jederzeit prüfen.
          </p>
        </div>
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <a href="/" className={styles.btn}>Neuen Antrag stellen</a>
          <a href={`/status?id=${id}`} className={styles.btnSecondary}>Status prüfen</a>
        </div>
      </main>
    </div>
  );
}
