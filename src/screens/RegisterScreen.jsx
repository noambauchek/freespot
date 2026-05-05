// src/screens/RegisterScreen.jsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerWithEmail } from '../services/authService';

export default function RegisterScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('הסיסמאות אינן תואמות'); return; }
    if (form.password.length < 6) { setError('הסיסמה חייבת להכיל לפחות 6 תווים'); return; }

    setLoading(true); setError('');
    try {
      await registerWithEmail(form.email, form.password, form.fullName, form.phone);
      navigate('/');
    } catch (err) {
      const map = {
        'auth/email-already-in-use': 'כתובת האימייל כבר בשימוש',
        'auth/invalid-email': 'כתובת אימייל לא תקינה',
      };
      setError(map[err.code] || 'שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🅿 FreeSpot</div>
        <p style={styles.tagline}>הצטרף לקהילה שעוזרת לנהגים</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {[
            { field: 'fullName', placeholder: 'שם מלא', type: 'text' },
            { field: 'phone',    placeholder: 'מספר טלפון', type: 'tel' },
            { field: 'email',    placeholder: 'אימייל',      type: 'email' },
            { field: 'password', placeholder: 'סיסמה',       type: 'password' },
            { field: 'confirm',  placeholder: 'אימות סיסמה', type: 'password' },
          ].map(({ field, placeholder, type }) => (
            <input
              key={field}
              style={styles.input}
              type={type}
              placeholder={placeholder}
              value={form[field]}
              onChange={update(field)}
              required
            />
          ))}

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'נרשם...' : 'הירשם'}
          </button>
        </form>

        <p style={styles.switchText}>
          יש לך חשבון?{' '}
          <Link to="/login" style={styles.link}>התחבר</Link>
        </p>

        <p style={styles.terms}>
          בהרשמה אתה מסכים ל<a href="/terms" style={styles.link}>תנאי השימוש</a> ול<a href="/privacy" style={styles.link}>מדיניות הפרטיות</a>.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    fontFamily: "'Heebo', sans-serif", direction: 'rtl',
    padding: '20px 0',
  },
  card: {
    background: 'rgba(30,41,59,0.9)', backdropFilter: 'blur(16px)',
    borderRadius: 20, padding: '40px 36px',
    width: '100%', maxWidth: 400,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    border: '1px solid rgba(99,102,241,0.2)',
  },
  logo: { color: '#fff', fontSize: 32, fontWeight: 900, textAlign: 'center', marginBottom: 4 },
  tagline: { color: '#94a3b8', textAlign: 'center', marginBottom: 28, fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 10, padding: '12px 14px',
    color: '#fff', fontSize: 15, outline: 'none',
    textAlign: 'right',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    color: '#fff', border: 'none',
    borderRadius: 10, padding: '13px',
    fontSize: 16, fontWeight: 700, cursor: 'pointer',
    marginTop: 4,
  },
  error: { color: '#f87171', fontSize: 13, margin: 0 },
  switchText: { color: '#94a3b8', textAlign: 'center', marginTop: 20, fontSize: 14 },
  terms: { color: '#64748b', textAlign: 'center', marginTop: 12, fontSize: 12 },
  link: { color: '#6366f1', textDecoration: 'none', fontWeight: 600 },
};
