import React from 'react';
import { useNavigate } from 'react-router-dom';
const tabs = [
  { key: 'map', icon: '🗺', label: 'מפה', path: '/' },
  { key: 'groups', icon: '👥', label: 'קבוצות', path: '/groups' },
  { key: 'leaderboard', icon: '🏆', label: 'דירוג', path: '/leaderboard' },
  { key: 'profile', icon: '👤', label: 'פרופיל', path: '/profile' },
];
export default function BottomNav({ active }) {
  const navigate = useNavigate();
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(10px)', display: 'flex', borderTop: '1px solid rgba(99,102,241,0.2)', zIndex: 100 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => navigate(t.path)}
          style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', color: active === t.key ? '#6366f1' : '#64748b', cursor: 'pointer', fontSize: 11, fontFamily: "'Heebo', sans-serif" }}>
          <div style={{ fontSize: 22 }}>{t.icon}</div>
          {t.label}
        </button>
      ))}
    </div>
  );
}