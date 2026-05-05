export default function SpotInfoPanel({ spot, onClose, onNavigateGoogle, onNavigateWaze, onMarkTaken }) {
  return (
    <div style={{ position: 'absolute', bottom: 90, left: 16, right: 16, background: 'rgba(15,23,42,0.97)', borderRadius: 16, padding: 20, direction: 'rtl', fontFamily: "'Heebo', sans-serif", color: '#fff', boxShadow: '0 -4px 30px rgba(0,0,0,0.6)', zIndex: 50 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <strong style={{ fontSize: 16 }}>🅿 חניה פנויה</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onNavigateGoogle} style={{ flex: 1, padding: 12, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 10, color: '#60a5fa', cursor: 'pointer', fontFamily: "'Heebo', sans-serif", fontWeight: 600 }}>
          Google Maps
        </button>
        <button onClick={onNavigateWaze} style={{ flex: 1, padding: 12, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, color: '#4ade80', cursor: 'pointer', fontFamily: "'Heebo', sans-serif", fontWeight: 600 }}>
          Waze
        </button>
        <button onClick={onMarkTaken} style={{ flex: 1, padding: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', cursor: 'pointer', fontFamily: "'Heebo', sans-serif", fontWeight: 600 }}>
          תפוסה
        </button>
      </div>
    </div>
  );
}