import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../api';
import Header from '../components/Header';
import styles from './Page.module.css';

type LoginForm = { username: string; password: string };

export default function VorstandLogin() {
  const { register, handleSubmit } = useForm<LoginForm>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', data);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('member', JSON.stringify(res.data.member));
      navigate('/vorstand/dashboard');
    } catch {
      setError('Ungültige Anmeldedaten');
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.container}>
      <Header subtitle="Vorstand-Login" />
      <main className={styles.card} style={{ maxWidth: 420, margin: '2.5rem auto' }}>
        <h2>Anmelden</h2>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} style={{ marginTop: '1.5rem' }}>
          <div className={styles.field}>
            <label>Benutzername</label>
            <input {...register('username', { required: true })} autoComplete="username" />
          </div>
          <div className={styles.field}>
            <label>Passwort</label>
            <input type="password" {...register('password', { required: true })} autoComplete="current-password" />
          </div>
          {error && <div className={styles.errorBox}>{error}</div>}
          <button type="submit" disabled={loading} className={styles.btn}>
            {loading ? 'Anmelden …' : 'Anmelden'}
          </button>
        </form>
      </main>
      <footer className={styles.footer}><a href="/">← Zurück zum Antragsformular</a></footer>
    </div>
  );
}
