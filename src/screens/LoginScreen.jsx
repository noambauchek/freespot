// src/screens/LoginScreen.jsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginWithEmail, loginWithGoogle } from '../services/authService';
import logoImg from '../assets/logo.png';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await loginWithEmail(email, password);
      navigate('/');
    } catch (err) {
      setError(hebrewAuthError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true); setError('');
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError(hebrewAuthError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
       <img src={logoImg} alt="FreeSpot" style={{ height: 250, objectFit: 'contain', display: 'block', margin: '0 auto 0px' }} />
        <p style={styles.tagline}>מצא חניה. עזור לאחרים. צבור נקודות.</p>

        <form onSubmit={handleEmailLogin} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="אימייל"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'מתחבר...' : 'התחבר'}
          </button>
        </form>

        <div style={styles.divider}><span>או</span></div>

        <button style={styles.btnGoogle} onClick={handleGoogleLogin} disabled={loading}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            style={{ width: 20, marginLeft: 8 }}
          />
          התחבר עם Google
        </button>

        <p style={styles.switchText}>
          אין לך חשבון?{' '}
          <Link to="/register" style={styles.link}>הירשם</Link>
        </p>
      </div>
      <div id="recaptcha-container" />
    </div>
  );
}

function hebrewAuthError(code) {
  const map = {
    'auth/user-not-found':    'משתמש לא נמצא',
    'auth/wrong-password':    'סיסמה שגויה',
    'auth/invalid-email':     'כתובת אימייל לא תקינה',
    'auth/too-many-requests': 'יותר מדי ניסיונות. נסה שוב מאוחר יותר',
    'auth/network-request-failed': 'בעיית רשת – בדוק את החיבור לאינטרנט',
  };
  return map[code] || 'שגיאה בהתחברות';
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    fontFamily: "'Heebo', sans-serif", direction: 'rtl',
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
  btnGoogle: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#fff', color: '#1e293b',
    border: 'none', borderRadius: 10, padding: '12px',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  divider: {
    textAlign: 'center', color: '#64748b', margin: '16px 0',
    position: 'relative',
  },
  error: { color: '#f87171', fontSize: 13, margin: 0 },
  switchText: { color: '#94a3b8', textAlign: 'center', marginTop: 20, fontSize: 14 },
  link: { color: '#6366f1', textDecoration: 'none', fontWeight: 600 },
};
