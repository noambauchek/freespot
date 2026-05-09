import React, { useState } from 'react';

export default function SpotInfoPanel({ spot, onClose, onNavigateGoogle, onNavigateWaze, onMarkTaken }) {
  const [showPayment, setShowPayment] = useState(false);

  function handleNavigate(provider) {
    setShowPayment(true);
    if (provider === 'google') onNavigateGoogle();
    else onNavigateWaze();
  }

  function openPango() {
    window.open('https://www.pango.co.il', '_blank');
  }

  function openCellopark() {
    window.open('https://www.cellopark.co.il', '_blank');
  }

  return (
    <div style={{ position: 'absolute', bottom: 90, left: 16, right: 16, background: 'rgba(15,23,42,0.97)', borderRadius: 20, padding: 20, direction: 'rtl', fontFamily: "'Assistant', sans-serif", color: '#fff', boxShadow: '0 -4px 30px rgba(0,0,0,0.6)', zIndex: 50 }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <strong style={{ fontSize: 18 }}>🅿 חניה פנויה</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>✕</button>
      </div>

      {!showPayment && (
        <>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>בחר אפליקציית ניווט:</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button onClick={() => handleNavigate('google')} style={{ flex: 1, padding: 12, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 10, color: '#60a5fa', cursor: 'pointer', fontFamily: "'Assistant', sans-serif", fontWeight: 600 }}>🗺 Google Maps</button>
            <button onClick={() => handleNavigate('waze')} style={{ flex: 1, padding: 12, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, color: '#4ade80', cursor: 'pointer', fontFamily: "'Assistant', sans-serif", fontWeight: 600 }}>📍 Waze</button>
          </div>
          <button onClick={onMarkTaken} style={{ width: '100%', padding: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', cursor: 'pointer', fontFamily: "'Assistant', sans-serif", fontWeight: 600 }}>✋ סמן כתפוסה</button>
        </>
      )}

      {showPayment && (
        <div style={{ background: 'rgba(30,41,59,0.8)', borderRadius: 14, padding: 14, border: '1px solid rgba(99,102,241,0.2)' }}>
          <p style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>💳 פתח אפליקציית תשלום חניה:</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <button onClick={openPango} style={{ flex: 1, padding: 14, background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: "'Assistant', sans-serif", fontWeight: 700, fontSize: 15 }}>
              🅿 Pango<br/><span style={{ fontSize: 11, fontWeight: 400 }}>פנגו</span>
            </button>
            <button onClick={openCellopark} style={{ flex: 1, padding: 14, background: 'linear-gradient(135deg, #0f766e, #14b8a6)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: "'Assistant', sans-serif", fontWeight: 700, fontSize: 15 }}>
              🅿 Cellopark<br/><span style={{ fontSize: 11, fontWeight: 400 }}>סלופארק</span>
            </button>
          </div>
          <button onClick={() => setShowPayment(false)} style={{ width: '100%', padding: 9, background: 'transparent', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#64748b', cursor: 'pointer', fontFamily: "'Assistant', sans-serif", fontSize: 13 }}>
            דלג על תשלום
          </button>
        </div>
      )}
    </div>
  );
}