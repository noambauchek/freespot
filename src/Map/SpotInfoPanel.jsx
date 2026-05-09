// src/components/Map/SpotInfoPanel.jsx
// Bottom panel shown when user taps a parking spot on the map
// Includes navigation options + Pango/Cellopark for paid spots

import React, { useState } from 'react';
import { SPOT_TYPE } from '../../services/firestore';

export default function SpotInfoPanel({ spot, onClose, onNavigateGoogle, onNavigateWaze, onMarkTaken }) {
  const [showPayment, setShowPayment] = useState(false);

  const isPaid = spot?.type === SPOT_TYPE.BLUE_WHITE;
  const isGroupOnly = spot?.isGroupOnly;

  function handleNavigate(provider) {
    // Show payment options after choosing navigation for paid spots
    if (isPaid) setShowPayment(true);
    if (provider === 'google') onNavigateGoogle();
    else onNavigateWaze();
  }

  function openPango() {
    // Deep link to Pango app, falls back to website
    window.open('https://www.pango.co.il', '_blank');
  }

  function openCellopark() {
    window.open('https://www.cellopark.co.il', '_blank');
  }

  return (
    <div style={S.panel}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.spotTitle}>🅿 חניה פנויה</div>
          <div style={S.spotMeta}>
            {isPaid ? '🔵 כחול-לבן · בתשלום' : '🟢 חינם'}
            {isGroupOnly && ' · 🔒 קבוצתי'}
          </div>
        </div>
        <button onClick={onClose} style={S.closeBtn}>✕</button>
      </div>

      {/* Navigation buttons */}
      {!showPayment && (
        <>
          <p style={S.navLabel}>בחר אפליקציית ניווט:</p>
          <div style={S.navRow}>
            <button onClick={() => handleNavigate('google')} style={S.navBtn}>
              <span style={S.navIcon}>🗺</span>
              <span>Google Maps</span>
            </button>
            <button onClick={() => handleNavigate('waze')} style={S.navBtn}>
              <span style={S.navIcon}>📍</span>
              <span>Waze</span>
            </button>
          </div>

          <button onClick={onMarkTaken} style={S.takenBtn}>
            ✋ סמן כתפוסה
          </button>
        </>
      )}

      {/* Payment options – shown after navigation chosen for paid spots */}
      {showPayment && isPaid && (
        <div style={S.paymentBox}>
          <p style={S.paymentTitle}>💳 חניה בתשלום – פתח אפליקציית תשלום:</p>
          <div style={S.paymentRow}>
            <button onClick={openPango} style={S.pangoBtn}>
              <span style={S.payIcon}>🅿</span>
              <div>
                <div style={S.payName}>Pango</div>
                <div style={S.paySub}>פנגו – תשלום חניה</div>
              </div>
            </button>
            <button onClick={openCellopark} style={S.celloparkBtn}>
              <span style={S.payIcon}>🅿</span>
              <div>
                <div style={S.payName}>Cellopark</div>
                <div style={S.paySub}>סלופארק</div>
              </div>
            </button>
          </div>
          <button onClick={() => setShowPayment(false)} style={S.skipBtn}>
            דלג על תשלום
          </button>
        </div>
      )}
    </div>
  );
}

const S = {
  panel: {
    position: 'absolute', bottom: 90, left: 16, right: 16,
    background: 'rgba(15,23,42,0.97)',
    borderRadius: 20, padding: 20,
    direction: 'rtl', fontFamily: "'Assistant', sans-serif",
    color: '#fff',
    boxShadow: '0 -4px 30px rgba(0,0,0,0.6)',
    zIndex: 50,
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  spotTitle: { fontSize: 18, fontWeight: 800, color: '#fff' },
  spotMeta: { fontSize: 13, color: '#94a3b8', marginTop: 3 },
  closeBtn: {
    background: 'none', border: 'none',
    color: '#64748b', cursor: 'pointer', fontSize: 20,
  },
  navLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 10 },
  navRow: { display: 'flex', gap: 10, marginBottom: 12 },
  navBtn: {
    flex: 1, padding: '12px 8px',
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 12, color: '#fff',
    cursor: 'pointer', fontFamily: "'Assistant', sans-serif",
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 6,
    fontSize: 13, fontWeight: 600,
  },
  navIcon: { fontSize: 24 },
  takenBtn: {
    width: '100%', padding: '11px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 10, color: '#f87171',
    cursor: 'pointer', fontFamily: "'Assistant', sans-serif",
    fontSize: 14, fontWeight: 600,
  },
  paymentBox: {
    background: 'rgba(30,41,59,0.8)',
    borderRadius: 14, padding: 14,
    border: '1px solid rgba(99,102,241,0.2)',
  },
  paymentTitle: {
    color: '#e2e8f0', fontSize: 14,
    fontWeight: 700, marginBottom: 12,
  },
  paymentRow: { display: 'flex', gap: 10, marginBottom: 10 },
  pangoBtn: {
    flex: 1, padding: '12px',
    background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
    border: 'none', borderRadius: 12,
    color: '#fff', cursor: 'pointer',
    fontFamily: "'Assistant', sans-serif",
    display: 'flex', alignItems: 'center', gap: 10,
  },
  celloparkBtn: {
    flex: 1, padding: '12px',
    background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
    border: 'none', borderRadius: 12,
    color: '#fff', cursor: 'pointer',
    fontFamily: "'Assistant', sans-serif",
    display: 'flex', alignItems: 'center', gap: 10,
  },
  payIcon: { fontSize: 24 },
  payName: { fontSize: 15, fontWeight: 800, textAlign: 'right' },
  paySub: { fontSize: 11, opacity: 0.8, textAlign: 'right' },
  skipBtn: {
    width: '100%', padding: '9px',
    background: 'transparent',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 8, color: '#64748b',
    cursor: 'pointer', fontFamily: "'Assistant', sans-serif",
    fontSize: 13,
  },
};