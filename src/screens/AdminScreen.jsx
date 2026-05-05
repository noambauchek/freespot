import React, { useState, useEffect } from 'react';
import { adminGetAllReports, adminRemoveSpot } from '../services/firestore';
import BottomNav from '../components/BottomNav';
export default function AdminScreen() {
  const [reports, setReports] = useState([]);
  useEffect(() => { adminGetAllReports().then(setReports); }, []);
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: "'Heebo', sans-serif", direction: 'rtl', paddingBottom: 80 }}>
      <h1 style={{ padding: '40px 20px 20px', fontSize: 22, fontWeight: 800 }}>🛡 ניהול מערכת</h1>
      {reports.map(r => (
        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(99,102,241,0.1)', fontSize: 13, color: '#94a3b8' }}>
          <span>דיווח {r.reportType} · {r.validity ? '✅' : '❌'} · {r.userId?.slice(0,8)}</span>
          {r.spotId && (
            <button onClick={() => adminRemoveSpot(r.spotId, 'admin review')} style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: "'Heebo', sans-serif" }}>
              הסר
            </button>
          )}
        </div>
      ))}
      <BottomNav active="admin" />
    </div>
  );
}