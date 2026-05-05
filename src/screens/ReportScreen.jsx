import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useReportSpot } from '../hooks/useReportSpot';
import { SPOT_TYPE } from '../services/firestore';
import BottomNav from '../components/BottomNav';
const spotOptions = [
  { type: SPOT_TYPE.BLUE_WHITE, label: '🔵 כחול-לבן' },
  { type: SPOT_TYPE.FREE,       label: '🟢 חינם' },
  { type: SPOT_TYPE.PARKING_LOT, label: '🏢 חניון' },
  { type: SPOT_TYPE.PRIVATE,    label: '🔒 פרטי' },
];
export default function ReportScreen() {
  const navigate = useNavigate();
  const { reportSpot, loading } = useReportSpot();
  async function handle(type) {
    const id = await reportSpot({ spotType: type });
    if (id) navigate('/');
  }
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: "'Heebo', sans-serif", direction: 'rtl', padding: '40px 20px', paddingBottom: 80 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>🅿 דווח על חניה פנויה</h1>
      <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 28 }}>בחר את סוג החניה שמתפנה</p>
      {spotOptions.map(({ type, label }) => (
        <button key={type} disabled={loading} onClick={() => handle(type)}
          style={{ display: 'block', width: '100%', padding: 18, marginBottom: 12, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 14, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: "'Heebo', sans-serif", textAlign: 'right' }}>
          {label}
        </button>
      ))}
      {loading && <p style={{ color: '#6366f1', textAlign: 'center', marginTop: 16 }}>שולח דיווח...</p>}
      <BottomNav active="map" />
    </div>
  );
}