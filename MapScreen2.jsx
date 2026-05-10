// src/screens/MapScreen.jsx
// Main map screen – shows live parking spots on Google Maps,
// big "Report Spot" CTA, navigation actions, and bottom nav.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParking } from '../store/ParkingContext';
import { useAuth } from '../store/AuthContext';
import { useReportSpot } from '../hooks/useReportSpot';
import { markSpotTaken } from '../services/firestore';
import { updateLiveSpotStatus } from '../services/realtimeDB';
import { navigateWithGoogleMaps, navigateWithWaze } from '../services/locationService';
import { SPOT_STATUS, SPOT_TYPE } from '../services/firestore';
import SpotInfoPanel from '../components/Map/SpotInfoPanel';
import BottomNav from '../components/BottomNav';
import AlertBadge from '../components/AlertBadge';
import ReportModal from '../components/ReportModal';

// ─── Google Maps API Key (web platform) ──────────────────────────────────────
// Place your key in .env as REACT_APP_GOOGLE_MAPS_KEY=...
const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

const SPOT_COLOR = {
  [SPOT_STATUS.AVAILABLE]: '#22c55e', // green
  [SPOT_STATUS.OCCUPIED]:  '#ef4444', // red
  [SPOT_STATUS.EXPIRED]:   '#94a3b8', // grey
};

export default function MapScreen() {
  const navigate = useNavigate();
  const { userLocation, liveSpots, selectedSpot, setSelectedSpot, alerts } = useParking();
  const { uid, userProfile } = useAuth();
  const { reportSpot, loading: reportLoading } = useReportSpot();

  const mapRef        = useRef(null); // <div> container
  const googleMapRef  = useRef(null); // google.maps.Map instance
  const markersRef    = useRef({});   // spotId → Marker
  const userMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [toast, setToast]       = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [prediction, setPrediction] = useState(null);

  // ── Load Google Maps SDK ────────────────────────────────────────────────────
  useEffect(() => {
    if (window.google) { setMapReady(true); return; }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&language=iw`;
    script.async = true;
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);

  // ── Initialize Map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || googleMapRef.current) return;

    const center = userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng }
      : { lat: 32.0853, lng: 34.7818 }; // Tel Aviv default

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 16,
      styles: DARK_MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    });
  }, [mapReady, userLocation]);

  // ── Update user position marker ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !googleMapRef.current || !userLocation) return;

    const pos = { lat: userLocation.lat, lng: userLocation.lng };
    if (!userMarkerRef.current) {
      userMarkerRef.current = new window.google.maps.Marker({
        position: pos,
        map: googleMapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        title: 'המיקום שלי',
        zIndex: 999,
      });
    } else {
      userMarkerRef.current.setPosition(pos);
    }
  }, [mapReady, userLocation]);

  // ── Sync live spot markers ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !googleMapRef.current) return;

    const currentIds = new Set(liveSpots.map(s => s.id));

    // Remove stale markers
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });

    // Add / update markers
    liveSpots.forEach(spot => {
      const pos = { lat: spot.lat || spot.latitude, lng: spot.lng || spot.longitude };
      if (markersRef.current[spot.id]) {
        markersRef.current[spot.id].setPosition(pos);
      } else {
        const marker = new window.google.maps.Marker({
          position: pos,
          map: googleMapRef.current,
          icon: {
            path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 7,
            fillColor: SPOT_COLOR[spot.status] || '#22c55e',
            fillOpacity: 0.95,
            strokeColor: '#fff',
            strokeWeight: 1.5,
          },
          title: 'חניה פנויה',
          animation: window.google.maps.Animation.DROP,
        });
        marker.addListener('click', () => setSelectedSpot(spot));
        markersRef.current[spot.id] = marker;
      }
    });
  }, [mapReady, liveSpots, setSelectedSpot]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleReportTap = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleModalSubmit = useCallback(async (details) => {
    try {
      const spotId = await reportSpot({ spotType: details.spotType });
      if (spotId) {
        setShowModal(false);
        showToast('✅ הדיווח נשלח! קיבלת 10 נקודות');
      } else {
        showToast('❌ שגיאה בדיווח, נסה שוב');
      }
    } catch (e) {
      showToast('❌ שגיאה: ' + e.message);
    }
  }, [reportSpot]);

  const handleNavigate = useCallback((provider) => {
    if (!selectedSpot) return;
    const lat = selectedSpot.lat || selectedSpot.latitude;
    const lng = selectedSpot.lng || selectedSpot.longitude;
    if (provider === 'waze') navigateWithWaze(lat, lng);
    else navigateWithGoogleMaps(lat, lng);
    setSelectedSpot(null);
  }, [selectedSpot, setSelectedSpot]);

  const handleMarkTaken = useCallback(async () => {
    if (!selectedSpot || !uid) return;
    await markSpotTaken(selectedSpot.id, uid);
    await updateLiveSpotStatus(selectedSpot.id, SPOT_STATUS.OCCUPIED);
    setSelectedSpot(null);
    showToast('✔ סומנה כתפוסה');
  }, [selectedSpot, uid, setSelectedSpot]);
function calculateParkingPrediction() {
  const hour = new Date().getHours();

  let estimatedTime;
  let demandLevel;

  if (hour >= 7 && hour <= 9) {
    estimatedTime = 3;
    demandLevel = 'גבוהה מאוד';
  } else if (hour >= 17 && hour <= 20) {
    estimatedTime = 4;
    demandLevel = 'גבוהה';
  } else if (hour >= 10 && hour <= 16) {
    estimatedTime = 7;
    demandLevel = 'בינונית';
  } else {
    estimatedTime = 10;
    demandLevel = 'נמוכה';
  }

  setPrediction({
    estimatedTime,
    demandLevel,
    lat: userLocation?.lat,
    lng: userLocation?.lng,
  });
}
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div style={styles.container}>
      {/* Map container */}
      <div ref={mapRef} style={styles.map} />

      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.logo}>FreeSpot 🅿️</div>
        <AlertBadge count={alerts.length} onClick={() => navigate('/profile')} />
      </div>

      {/* Spots count badge */}
      {liveSpots.length > 0 && (
        <div style={styles.spotsCount}>
          {liveSpots.length} חניות פנויות
        </div>
      <div style={styles.predictionBox}>
      <button style={styles.predictionBtn} onClick={calculateParkingPrediction}>
        חיזוי תפיסת חניה
      </button>
    
      {prediction && (
        <div style={styles.predictionText}>
          חניה באזור שלך צפויה להיתפס תוך כ-
          {prediction.estimatedTime} דקות
          <br />
          רמת ביקוש: {prediction.demandLevel}
        </div>
      )}
    </div>
    {liveSpots.length > 0 && (
  <div style={styles.spotsCount}>
    {liveSpots.length} חניות פנויות
  </div>
)}
      )}

      {/* Selected spot info panel */}
      {selectedSpot && (
        <SpotInfoPanel
          spot={selectedSpot}
          onClose={() => setSelectedSpot(null)}
          onNavigateGoogle={() => handleNavigate('google')}
          onNavigateWaze={() => handleNavigate('waze')}
          onMarkTaken={handleMarkTaken}
        />
      )}

      {/* Big REPORT button */}
      <button
        style={{ ...styles.reportBtn, opacity: reportLoading ? 0.6 : 1 }}
        onClick={handleReportTap}
        disabled={reportLoading}
      >
        {reportLoading ? '⏳ שולח...' : '🅿 פינוי חניה'}
      </button>

      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* Report Modal */}
      {showModal && (
        <ReportModal
          onSubmit={handleModalSubmit}
          onClose={() => setShowModal(false)}
          loading={reportLoading}
        />
      )}

      {/* Bottom navigation */}
      <BottomNav active="map" />
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  container: {
    position: 'relative', width: '100vw', height: '100vh',
    fontFamily: "'Heebo', sans-serif", direction: 'rtl',
    overflow: 'hidden',
  },
  map: { width: '100%', height: '100%' },
  topBar: {
    position: 'absolute', top: 16, right: 16, left: 16,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
    borderRadius: 12, padding: '10px 16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  logo: { color: '#fff', fontWeight: 700, fontSize: 18 },
  spotsCount: {
    position: 'absolute', top: 80, right: '50%', transform: 'translateX(50%)',
    background: '#22c55e', color: '#fff',
    padding: '6px 18px', borderRadius: 20,
    fontSize: 13, fontWeight: 600,
    boxShadow: '0 2px 10px rgba(34,197,94,0.5)',
  },
  reportBtn: {
    position: 'absolute', bottom: 100, right: '50%', transform: 'translateX(50%)',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    color: '#fff', border: 'none',
    padding: '18px 48px', borderRadius: 50,
    fontSize: 18, fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 6px 30px rgba(99,102,241,0.6)',
    transition: 'transform 0.15s, opacity 0.2s',
  },
  toast: {
    position: 'absolute', top: '50%', right: '50%',
    transform: 'translate(50%, -50%)',
    background: 'rgba(15,23,42,0.92)', color: '#fff',
    padding: '14px 24px', borderRadius: 12,
    fontSize: 15, fontWeight: 600,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    pointerEvents: 'none',
  },
  predictionBox: {
  position: 'absolute',
  top: 125,
  right: '50%',
  transform: 'translateX(50%)',
  background: 'rgba(15,23,42,0.92)',
  color: '#fff',
  padding: 12,
  borderRadius: 16,
  textAlign: 'center',
  width: 260,
  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  zIndex: 10,
},

predictionBtn: {
  background: '#22c55e',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '10px 16px',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
},

predictionText: {
  marginTop: 10,
  fontSize: 14,
  lineHeight: 1.5,
},
};

// ─── Google Maps dark style ───────────────────────────────────────────────────
const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f3460' }] },
];
