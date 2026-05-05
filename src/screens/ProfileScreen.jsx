// src/screens/ProfileScreen.jsx
// User profile – points, rank, report history, rewards, payment methods

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { logout } from '../services/authService';
import {
  getUserRewardsHistory,
  getUserPaymentMethods,
  addPaymentMethod,
  getUserVehicles,
  addVehicle,
  USER_RANK,
  RANK_THRESHOLDS,
} from '../services/firestore';
import { openPango, openCellopark } from '../services/locationService';
import BottomNav from '../components/BottomNav';

const RANK_LABELS = {
  [USER_RANK.CASUAL]:   { label: 'משתמש ארעי',  color: '#94a3b8', icon: '🔰' },
  [USER_RANK.REGULAR]:  { label: 'משתמש קבוע',  color: '#22c55e', icon: '⭐' },
  [USER_RANK.EXPERT]:   { label: 'משתמש מומחה', color: '#f59e0b', icon: '🏆' },
  [USER_RANK.SUPER]:    { label: 'משתמש-על',    color: '#a855f7', icon: '👑' },
  [USER_RANK.INACTIVE]: { label: 'לא פעיל',     color: '#ef4444', icon: '💤' },
};

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { userProfile, uid } = useAuth();

  const [rewards, setRewards]   = useState([]);
  const [payments, setPayments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [tab, setTab]           = useState('stats'); // 'stats' | 'history' | 'rewards'

  useEffect(() => {
    if (!uid) return;
    getUserRewardsHistory(uid).then(setRewards);
    getUserPaymentMethods(uid).then(setPayments);
    getUserVehicles(uid).then(setVehicles);
  }, [uid]);

  const rank = userProfile?.rank || USER_RANK.CASUAL;
  const rankInfo = RANK_LABELS[rank] || RANK_LABELS[USER_RANK.CASUAL];
  const points = userProfile?.points || 0;

  // Progress to next rank
  const ranks = [USER_RANK.CASUAL, USER_RANK.REGULAR, USER_RANK.EXPERT, USER_RANK.SUPER];
  const currentIdx = ranks.indexOf(rank);
  const nextRank = ranks[Math.min(currentIdx + 1, ranks.length - 1)];
  const nextThreshold = RANK_THRESHOLDS[nextRank] || 500;
  const currentThreshold = RANK_THRESHOLDS[rank] || 0;
  const progress = Math.min(((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100, 100);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.avatar}>
          {(userProfile?.fullName || 'U')[0].toUpperCase()}
        </div>
        <h2 style={styles.name}>{userProfile?.fullName || 'משתמש'}</h2>
        <div style={{ ...styles.rankBadge, background: rankInfo.color + '22', color: rankInfo.color }}>
          {rankInfo.icon} {rankInfo.label}
        </div>

        {/* Points display */}
        <div style={styles.pointsBox}>
          <span style={styles.pointsNum}>{points}</span>
          <span style={styles.pointsLabel}>נקודות</span>
        </div>

        {/* Rank progress bar */}
        {rank !== USER_RANK.SUPER && (
          <div style={styles.progressWrap}>
            <div style={{ ...styles.progressBar, width: `${progress}%` }} />
            <span style={styles.progressLabel}>
              {points}/{nextThreshold} לדרגה הבאה
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={styles.tabs}>
        {['stats', 'history', 'rewards'].map(t => (
          <button
            key={t}
            style={{ ...styles.tabBtn, ...(tab === t ? styles.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {{ stats: '📊 סטטיסטיקות', history: '📋 היסטוריה', rewards: '🎁 תגמולים' }[t]}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {/* Stats */}
        {tab === 'stats' && (
          <div style={styles.statGrid}>
            <StatCard label="סה״כ דיווחים" value={userProfile?.totalReports || 0} icon="🅿" />
            <StatCard label="רצף פעילות" value={`${userProfile?.consecutiveDays || 0} ימים`} icon="🔥" />
            <StatCard label="נקודות" value={points} icon="⭐" />
            <StatCard label="דרגה" value={rankInfo.label} icon={rankInfo.icon} />
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div>
            {rewards.length === 0
              ? <p style={styles.empty}>אין היסטוריה עדיין. התחל לדווח!</p>
              : rewards.map(r => (
                <div key={r.id} style={styles.historyItem}>
                  <span>{r.rewardReason === 'P1' ? '🅿 דיווח תקין' : '🎯 בונוס'}</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>+{r.pointsAmount}</span>
                </div>
              ))
            }
          </div>
        )}

        {/* Rewards – payment integrations */}
        {tab === 'rewards' && (
          <div>
            <p style={styles.rewardInfo}>
              ניתן להמיר נקודות להנחות בפנגו וסלופארק. לחץ כדי לפתוח:
            </p>
            <button style={styles.rewardBtn} onClick={openPango}>
              🅿 פנגו – תשלום חניה
            </button>
            <button style={styles.rewardBtn} onClick={openCellopark}>
              🅿 סלופארק
            </button>
            {payments.map(p => (
              <div key={p.id} style={styles.historyItem}>
                <span>{p.provider === 'pango' ? '🅿 פנגו' : '🅿 סלופארק'}</span>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>
                  {p.isDefault ? '✓ ברירת מחדל' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button style={styles.logoutBtn} onClick={handleLogout}>
        🚪 התנתק
      </button>

      <BottomNav active="profile" />
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div style={statStyles.card}>
      <span style={statStyles.icon}>{icon}</span>
      <span style={statStyles.value}>{value}</span>
      <span style={statStyles.label}>{label}</span>
    </div>
  );
}

const statStyles = {
  card: {
    background: 'rgba(30,41,59,0.8)',
    borderRadius: 14, padding: '16px 12px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    border: '1px solid rgba(99,102,241,0.15)',
  },
  icon: { fontSize: 24 },
  value: { color: '#fff', fontWeight: 800, fontSize: 22 },
  label: { color: '#94a3b8', fontSize: 12, textAlign: 'center' },
};

const styles = {
  page: {
    minHeight: '100vh', background: '#0f172a',
    fontFamily: "'Heebo', sans-serif", direction: 'rtl',
    color: '#fff', paddingBottom: 80,
  },
  header: {
    padding: '40px 24px 24px',
    background: 'linear-gradient(180deg, #1e1b4b, #0f172a)',
    textAlign: 'center',
  },
  avatar: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 36, fontWeight: 900, margin: '0 auto 12px',
  },
  name: { color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 8px' },
  rankBadge: {
    display: 'inline-block', padding: '4px 14px',
    borderRadius: 20, fontSize: 14, fontWeight: 600,
  },
  pointsBox: {
    marginTop: 16, display: 'flex', alignItems: 'baseline',
    justifyContent: 'center', gap: 6,
  },
  pointsNum: { color: '#6366f1', fontSize: 40, fontWeight: 900 },
  pointsLabel: { color: '#94a3b8', fontSize: 16 },
  progressWrap: {
    margin: '12px auto 0', maxWidth: 280,
    background: '#1e293b', borderRadius: 20, height: 8,
    position: 'relative', overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute', left: 0, top: 0, height: '100%',
    background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
    borderRadius: 20, transition: 'width 0.5s',
  },
  progressLabel: {
    display: 'block', textAlign: 'center',
    color: '#64748b', fontSize: 11, marginTop: 6,
  },
  tabs: {
    display: 'flex', borderBottom: '1px solid rgba(99,102,241,0.2)',
  },
  tabBtn: {
    flex: 1, padding: '12px 4px', background: 'none',
    border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer',
    fontFamily: "'Heebo', sans-serif",
  },
  tabActive: { color: '#6366f1', borderBottom: '2px solid #6366f1' },
  content: { padding: 20 },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  historyItem: {
    display: 'flex', justifyContent: 'space-between',
    padding: '12px 0', borderBottom: '1px solid rgba(99,102,241,0.1)',
    fontSize: 14, color: '#e2e8f0',
  },
  empty: { color: '#64748b', textAlign: 'center', padding: 20 },
  rewardInfo: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
  rewardBtn: {
    width: '100%', padding: '14px', marginBottom: 12,
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 12, color: '#fff', fontSize: 15,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: "'Heebo', sans-serif",
  },
  logoutBtn: {
    display: 'block', margin: '0 auto 100px',
    padding: '12px 32px', background: 'transparent',
    border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: 10, color: '#ef4444',
    fontSize: 14, cursor: 'pointer',
    fontFamily: "'Heebo', sans-serif",
  },
};
