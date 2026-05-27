// src/components/Map/SpotInfoPanel.jsx
// Shows all details of a reported parking spot including photo, type, address, etc.

import React, { useState, useEffect } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const TYPE_LABELS = {
  blue_white: '🔵 כחול-לבן',
  free:       '🟢 חינם',
  lot:        '🏢 חניון',
  private:    '🔒 פרטי',
};

export default function SpotInfoPanel({ spot, onClose, onNavigateGoogle, onNavigateWaze, onMarkTaken }) {
  const [showPayment, setShowPayment] = useState(false);
  const [details, setDetails]         = useState(null);

  // Load full spot details from Firestore (the spot on the map may have limited data)
  useEffect(() => {
    if (!spot?.id) return;
    setDetails(null);
    setShowPayment(false);

    // Try both collections
    async function loadDetails() {
      try {
        let snap = await getDoc(doc(db, 'parkingSpots', spot.id));
        if (!snap.exists()) {
          snap = await getDoc(doc(db, 'parking_spots', spot.id));
        }
        if (snap.exists()) {
          setDetails({ id: snap.id, ...snap.data() });
        } else {
          setDetails(spot); // fallback to what we have
        }
      } catch (e) {
        setDetails(spot);
      }
    }
    loadDetails();
  }, [spot?.id]);

  function handleNavigate(provider) {
    setShowPayment(true);
    if (provider === 'google') onNavigateGoogle();
    else onNavigateWaze();
  }

  function openPango()     { window.open('https://www.pango.co.il', '_blank'); }
  function openCellopark() { window.open('https://www.cellopark.co.il', '_blank'); }

  const data = details || spot;

  // Format reported time
  const reportedAt = data?.reportedAt?.toMillis
    ? data.reportedAt.toMillis()
    : data?.reportedAt instanceof Date
      ? data.reportedAt.getTime()
      : null;
  const minsAgo = reportedAt ? Math.floor((Date.now() - reportedAt) / 60000) : null;

  const occupancyLabels = { low: 'פנוי', medium: 'מעט עמוס', high: 'עמוס מאוד' };

  return (
    <div style={S.panel}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.title}>🅿 חניה פנויה</div>
          {minsAgo !== null && (
            <div style={S.subtitle}>דווח לפני {minsAgo} דקות</div>
          )}
        </div>
        <button onClick={onClose} style={S.closeBtn}>✕</button>
      </div>

      {/* Photo */}
      {data?.photoURL && (
        <div style={S.photoWrap}>
          <img src={data.photoURL} alt="תמונת חניה" style={S.photo} />
        </div>
      )}

      {/* Details grid */}
      <div style={S.detailsGrid}>
        {data?.type && (
          <DetailRow icon="🚗" label="סוג חניה" value={TYPE_LABELS[data.type] || data.type} />
        )}
        {data?.address && (
          <DetailRow icon="📍" label="כתובת" value={data.address} />
        )}
        {data?.isPaid !== null && data?.isPaid !== undefined && (
          <DetailRow icon="💳" label="תשלום" value={data.isPaid ? 'בתשלום' : 'חינם'} />
        )}
        {data?.isHandicap !== null && data?.isHandicap !== undefined && (
          <DetailRow icon="♿" label="נכים" value={data.isHandicap ? 'כן' : 'לא'} />
        )}
        {data?.searchTime && (
          <DetailRow icon="⏱" label="זמן חיפוש" value={`${data.searchTime} דקות`} />
        )}
        {data?.occupancy && (
          <DetailRow icon="📊" label="עומס" value={occupancyLabels[data.occupancy] || data.occupancy} />
        )}
        {data?.isGroupOnly && (
          <DetailRow icon="🔒" label="שיתוף" value="קבוצה פרטית בלבד" />
        )}
      </div>

      {/* Navigation */}
      {!showPayment && (
        <>
          <p style={S.navLabel}>בחר אפליקציית ניווט:</p>
          <div style={S.navRow}>
            <button onClick={() => handleNavigate('google')} style={S.navBtn}>
              <span style={{ fontSize: 20 }}>🗺</span>
              <span>Google Maps</span>
            </button>
            <button onClick={() => handleNavigate('waze')} style={S.navBtn}>
              <span style={{ fontSize: 20 }}>📍</span>
              <span>Waze</span>
            </button>
          </div>
          <button onClick={onMarkTaken} style={S.takenBtn}>
            ✋ סמן כתפוסה
          </button>
        </>
      )}

      {/* Payment */}
      {showPayment && (
        <div style={S.paymentBox}>
          <p style={S.paymentTitle}>💳 פתח אפליקציית תשלום חניה:</p>
          <div style={S.paymentRow}>
            <button onClick={openPango} style={S.pangoBtn}>
              🅿 Pango<br /><span style={{ fontSize: 11, fontWeight: 400 }}>פנגו</span>
            </button>
            <button onClick={openCellopark} style={S.celloparkBtn}>
              🅿 Cellopark<br /><span style={{ fontSize: 11, fontWeight: 400 }}>סלופארק</span>
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

function DetailRow({ icon, label, value }) {
  return (
    <div style={S.detailRow}>
      <span style={S.detailIcon}>{icon}</span>
      <span style={S.detailLabel}>{label}</span>
      <span style={S.detailValue}>{value}</span>
    </div>
  );
}

const S = {
  panel: {
    position: 'absolute', bottom: 90, left: 16, right: 16,
    background: 'rgba(15,23,42,0.97)',
    borderRadius: 20, zIndex: 50,
    maxHeight: '70vh', overflowY: 'auto',
    fontFamily: "'Assistant', sans-serif",
    direction: 'rtl', color: '#fff',
    boxShadow: '0 -4px 30px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '16px 16px 8px',
  },
  title: { fontSize: 18, fontWeight: 800 },
  subtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  closeBtn: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 },
  photoWrap: { padding: '0 16px 12px' },
  photo: { width: '100%', borderRadius: 12, maxHeight: 160, objectFit: 'cover' },
  detailsGrid: {
    padding: '0 16px 12px',
    display: 'flex', flexDirection: 'column', gap: 6,
    borderBottom: '1px solid rgba(99,102,241,0.15)',
    marginBottom: 12,
  },
  detailRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px',
    background: 'rgba(30,41,59,0.6)',
    borderRadius: 8,
  },
  detailIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  detailLabel: { color: '#94a3b8', fontSize: 12, flex: '0 0 80px' },
  detailValue: { color: '#e2e8f0', fontSize: 13, fontWeight: 600, flex: 1 },
  navLabel: { color: '#94a3b8', fontSize: 13, padding: '0 16px 8px', margin: 0 },
  navRow: { display: 'flex', gap: 10, padding: '0 16px 10px' },
  navBtn: {
    flex: 1, padding: '12px 8px',
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 12, color: '#fff',
    cursor: 'pointer', fontFamily: "'Assistant', sans-serif",
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    fontSize: 13, fontWeight: 600,
  },
  takenBtn: {
    width: 'calc(100% - 32px)', margin: '0 16px 14px',
    padding: '11px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 10, color: '#f87171',
    cursor: 'pointer', fontFamily: "'Assistant', sans-serif",
    fontSize: 14, fontWeight: 600,
  },
  paymentBox: {
    margin: '0 16px 16px',
    background: 'rgba(30,41,59,0.8)',
    borderRadius: 14, padding: 14,
    border: '1px solid rgba(99,102,241,0.2)',
  },
  paymentTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: 700, marginBottom: 12 },
  paymentRow: { display: 'flex', gap: 10, marginBottom: 10 },
  pangoBtn: {
    flex: 1, padding: '14px',
    background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
    border: 'none', borderRadius: 12,
    color: '#fff', cursor: 'pointer',
    fontFamily: "'Assistant', sans-serif", fontWeight: 700, fontSize: 15,
  },
  celloparkBtn: {
    flex: 1, padding: '14px',
    background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
    border: 'none', borderRadius: 12,
    color: '#fff', cursor: 'pointer',
    fontFamily: "'Assistant', sans-serif", fontWeight: 700, fontSize: 15,
  },
  skipBtn: {
    width: '100%', padding: '9px',
    background: 'transparent',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 8, color: '#64748b',
    cursor: 'pointer', fontFamily: "'Assistant', sans-serif", fontSize: 13,
  },
};