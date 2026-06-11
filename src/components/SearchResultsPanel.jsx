// src/components/SearchResultsPanel.jsx
// Shows parking spots near the searched address with details and time estimate

import React from 'react';

function estimateParkingTime(spotsCount, distanceKm) {
  const hour = new Date().getHours();
  let baseMins = 5;
  if      (hour >= 7  && hour <= 9)  baseMins = 12;
  else if (hour >= 17 && hour <= 20) baseMins = 10;
  else if (hour >= 10 && hour <= 16) baseMins = 6;

  if (spotsCount === 0) return { mins: baseMins + 10, label: 'אין חניות זמינות' };
  if (spotsCount >= 5)  return { mins: 2, label: 'חניה זמינה בקרבת מקום' };
  if (spotsCount >= 2)  return { mins: 4, label: 'מעט חניות פנויות' };
  return { mins: 6, label: 'חניה אחת פנויה' };
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const TYPE_LABELS = {
  blue_white: '🔵 כחול-לבן',
  free:       '🟢 חינם',
  lot:        '🏢 חניון',
  private:    '🔒 פרטי',
};

export default function SearchResultsPanel({ searchLocation, spots, loading, onSelectSpot, onClose }) {
  if (!searchLocation) return null;

  // Filter spots within 1km of searched location
  const nearbySpots = spots.slice(0, 10);

  const timeEst = estimateParkingTime(nearbySpots.length, 0);

  return (
    <div style={S.panel}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.headerTitle}>תוצאות חיפוש</div>
          <div style={S.headerSub}>
            {searchLocation.address
              ? searchLocation.address.slice(0, 40) + (searchLocation.address.length > 40 ? '...' : '')
              : ''}
          </div>
        </div>
        <button onClick={onClose} style={S.closeBtn}>✕</button>
      </div>

      {/* Time estimate */}
      <div style={S.timeBox}>
        <div style={S.timeIcon}>⏱</div>
        <div>
          <div style={S.timeLabel}>זמן משוער למציאת חניה</div>
          <div style={S.timeValue}>~{timeEst.mins} דקות · {timeEst.label}</div>
        </div>
      </div>

      {/* Spots list */}
      <div style={S.list}>
        {loading ? (
  <div style={S.empty}>
    <p>מחשב חניות מומלצות...</p>
  </div>
) : nearbySpots.length === 0 ? (
          <div style={S.empty}>
            <p style={{ fontSize: 32 }}>🅿</p>
            <p>לא נמצאו חניות פנויות באזור זה</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              נסה לחפש כתובת אחרת או רדיוס רחב יותר
            </p>
          </div>
        ) : (
          nearbySpots.map(spot => {
            console.log('DEBUG SPOT:', spot);

console.log('DEBUG TIME:', {
  id: spot.id,
  reportedAt: spot.reportedAt,
  lastReportTime: spot.lastReportTime,
  expiresAt: spot.expiresAt,
  reportedAtMillis: spot.reportedAtMillis,
  ageMinutes: spot.ageMinutes,
  now: Date.now(),
});
const getTimeMillis = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (value.toMillis) return value.toMillis();
  if (value._seconds) return value._seconds * 1000;
  if (value.seconds) return value.seconds * 1000;
  return null;
};

const expiresAtMillis = getTimeMillis(spot.expiresAt);

const reportedAt =
  getTimeMillis(spot.reportedAt) ||
  getTimeMillis(spot.lastReportTime) ||
  (expiresAtMillis ? expiresAtMillis - 15 * 60 * 1000 : null) ||
  Date.now();

const minsAgo = Math.max(0, Math.floor((Date.now() - reportedAt) / 60000));

            return (
              <div key={spot.id} style={S.spotCard} onClick={() => onSelectSpot(spot)}>
                <div style={S.spotLeft}>
                  <div style={S.spotType}>{TYPE_LABELS[spot.type] || '🅿 חניה'}</div>
                  {spot.address && (
                    <div style={S.spotAddress}>{spot.address}</div>
                  )}
                <div style={S.spotMeta}>
  דווח לפני {minsAgo} דק׳ · {
    (() => {
      const distance = Number(spot.distanceKm ?? spot.distance ?? 0);

      return distance < 0.1
        ? `${Math.round(distance * 1000)} מטר`
        : `${distance.toFixed(2)} ק״מ`;
    })()
  }
</div>
                  {spot.score !== undefined && (
  <div style={S.spotDetail}>
    🧠 ציון התאמה: {spot.score}
    <br />
    🚶 זמן הליכה משוער: {spot.estimatedWalkingMinutes} דקות
  </div>
)}
                  {spot.isPaid !== undefined && (
                    <div style={S.spotDetail}>
                      {spot.isPaid ? '💳 בתשלום' : '✅ חינם'}
                      {spot.isHandicap ? ' · ♿ נכים' : ''}
                    </div>
                  )}
                </div>
                <button style={S.navBtn}>נווט ›</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const S = {
  panel: {
    position: 'absolute', top: 80, right: 16, left: 16,
    background: 'rgba(15,23,42,0.97)',
    borderRadius: 16, zIndex: 60,
    maxHeight: '70vh', display: 'flex', flexDirection: 'column',
    fontFamily: "'Assistant', sans-serif", direction: 'rtl',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', borderBottom: '1px solid rgba(99,102,241,0.2)',
    flexShrink: 0,
  },
  headerTitle: { color: '#fff', fontWeight: 800, fontSize: 16 },
  headerSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  closeBtn: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 },
  timeBox: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px',
    background: 'rgba(99,102,241,0.12)',
    borderBottom: '1px solid rgba(99,102,241,0.15)',
    flexShrink: 0,
  },
  timeIcon: { fontSize: 28 },
  timeLabel: { color: '#94a3b8', fontSize: 12 },
  timeValue: { color: '#fff', fontWeight: 700, fontSize: 14, marginTop: 2 },
  list: { overflowY: 'auto', padding: '8px 12px 16px' },
  empty: { textAlign: 'center', padding: '32px 20px', color: '#e2e8f0' },
  spotCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px', marginBottom: 8,
    background: 'rgba(30,41,59,0.8)',
    borderRadius: 12, cursor: 'pointer',
    border: '1px solid rgba(99,102,241,0.15)',
  },
  spotLeft: { flex: 1 },
  spotType: { color: '#fff', fontWeight: 700, fontSize: 14 },
  spotAddress: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  spotMeta: { color: '#64748b', fontSize: 11, marginTop: 3 },
  spotDetail: { color: '#6366f1', fontSize: 11, marginTop: 2 },
  navBtn: {
    background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)',
    color: '#a5b4fc', borderRadius: 8, padding: '6px 12px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: "'Assistant', sans-serif", whiteSpace: 'nowrap',
  },
};
