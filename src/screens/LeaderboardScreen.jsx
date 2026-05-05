import React from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import BottomNav from '../components/BottomNav';
export default function LeaderboardScreen() {
  const { leaders, loading } = useLeaderboard();
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: "'Heebo', sans-serif", direction: 'rtl', paddingBottom: 80 }}>
      <h1 style={{ padding: '40px 20px 20px', fontSize: 22, fontWeight: 800 }}>🏆 לוח תוצאות</h1>
      {loading
        ? <p style={{ padding: 20, color: '#94a3b8' }}>טוען...</p>
        : leaders.map((u, i) => (
          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
            <span style={{ color: '#e2e8f0' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}  {u.fullName || 'אנונימי'}</span>
            <span style={{ color: '#6366f1', fontWeight: 700 }}>{u.points} נק׳</span>
          </div>
        ))
      }
      <BottomNav active="leaderboard" />
    </div>
  );
}