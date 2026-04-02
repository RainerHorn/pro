import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Header from '../components/Header';
import styles from './Page.module.css';

type FormData = {
  name: string;
  email: string;
  type: string;
  scope: string;
  budget?: number;
  dateRange?: string;
  classGroup?: string;
  file?: FileList;
};

export default function AntragFormular() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('email', data.email);
      formData.append('type', data.type);
      formData.append('scope', data.scope);
      if (data.budget) formData.append('budget', String(data.budget));
      if (data.dateRange) formData.append('dateRange', data.dateRange);
      if (data.classGroup) formData.append('classGroup', data.classGroup);
      if (data.file?.[0]) formData.append('file', data.file[0]);

      const res = await api.post('/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/antrag-eingereicht/${res.data.applicationId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Einreichen des Antrags');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Header subtitle="Antragsportal für Förderleistungen" />

      <main className={styles.card}>
        <h2>Förderantrag stellen</h2>
        <p className={styles.subtitle}>
          Füllen Sie das Formular aus, um Unterstützung vom <strong>Pro MMBbS Förderverein e.V.</strong> zu beantragen.
          Der Vorstand wird über Ihren Antrag informiert und eine Entscheidung treffen.
          Sie erhalten eine E-Mail-Benachrichtigung über das Ergebnis.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Name *</label>
              <input {...register('name', { required: 'Bitte Namen angeben' })} placeholder="Ihr vollständiger Name" />
              {errors.name && <span className={styles.error}>{errors.name.message}</span>}
            </div>
            <div className={styles.field}>
              <label>E-Mail-Adresse *</label>
              <input type="email" {...register('email', {
                required: 'E-Mail erforderlich',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Ungültige E-Mail' }
              })} placeholder="ihre@email.de" />
              {errors.email && <span className={styles.error}>{errors.email.message}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label>Art der Unterstützung *</label>
            <input {...register('type', { required: 'Bitte Art der Unterstützung angeben' })}
              placeholder="z. B. Klassenfahrt, Lernmaterial, Veranstaltung …" />
            {errors.type && <span className={styles.error}>{errors.type.message}</span>}
          </div>

          <div className={styles.field}>
            <label>Umfang der Unterstützung *</label>
            <textarea {...register('scope', { required: 'Bitte Umfang beschreiben' })} rows={4}
              placeholder="Beschreiben Sie detailliert, welche Unterstützung benötigt wird …" />
            {errors.scope && <span className={styles.error}>{errors.scope.message}</span>}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Beantragter Betrag (€)</label>
              <input type="number" step="0.01" min="0" {...register('budget')} placeholder="0,00" />
            </div>
            <div className={styles.field}>
              <label>Zeitraum / Datum</label>
              <input {...register('dateRange')} placeholder="z. B. 15.–18. Oktober 2024" />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Klasse / Gruppe</label>
              <input {...register('classGroup')} placeholder="z. B. BK2A, FIAE23" />
            </div>
            <div className={styles.field}>
              <label>Anhang (PDF, optional)</label>
              <input type="file" accept=".pdf" {...register('file')} />
              <small>Kostenvoranschlag, Flyer o. ä. (max. 10 MB)</small>
            </div>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <button type="submit" disabled={submitting} className={styles.btn}>
            {submitting ? 'Wird eingereicht …' : 'Antrag einreichen'}
          </button>
        </form>
      </main>

      <footer className={styles.footer}>
        <a href="/status">Antragsstatus prüfen</a>
        {' · '}
        <a href="/vorstand/login">Vorstand-Login</a>
        {' · '}
        <a href="https://www.mmbbs.de/foerderverein-prommbbs-e-v/" target="_blank" rel="noreferrer">
          Pro MMBbS e.V.
        </a>
      </footer>
    </div>
  );
}
