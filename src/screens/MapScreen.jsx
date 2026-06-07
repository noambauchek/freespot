// src/screens/MapScreen.jsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParking } from '../store/ParkingContext';
import { useAuth } from '../store/AuthContext';
import { useReportSpot } from '../hooks/useReportSpot';
import { markSpotTaken, SPOT_STATUS } from '../services/firestore';
import { updateLiveSpotStatus } from '../services/realtimeDB';
import { navigateWithGoogleMaps, navigateWithWaze } from '../services/locationService';
import SpotInfoPanel from '../components/Map/SpotInfoPanel';
import BottomNav from '../components/BottomNav';
import AlertBadge from '../components/AlertBadge';
import ReportModal from '../components/ReportModal';
import SearchBar from '../components/SearchBar';
import SearchResultsPanel from '../components/SearchResultsPanel';

const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || '';

const SPOT_COLOR = {
  S1: '#22c55e',
  S2: '#ef4444',
  S3: '#94a3b8',
  available: '#22c55e',
  occupied:  '#ef4444',
  expired:   '#94a3b8',
};

export default function MapScreen() {
  const navigate = useNavigate();
  const { userLocation, liveSpots, selectedSpot, setSelectedSpot, alerts } = useParking();
  const { uid } = useAuth();
  const { reportSpot, loading: reportLoading } = useReportSpot();
  const [userGroups, setUserGroups]         = useState([]);
  const mapRef        = useRef(null);
  const googleMapRef  = useRef(null);
  const markersRef    = useRef({});
  const userMarkerRef = useRef(null);
  const [mapReady, setMapReady]             = useState(false);
  const [toast, setToast]                   = useState(null);
  const [showModal, setShowModal]           = useState(false);
  const [prediction, setPrediction]         = useState(null);
  const [predLoading, setPredLoading]       = useState(false);
  const [searchLocation, setSearchLocation] = useState(null);
  // Load user groups
  useEffect(() => {
  function setAppHeight() {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
  }
  setAppHeight();
  window.addEventListener('resize', setAppHeight);
  return () => window.removeEventListener('resize', setAppHeight);
}, []);

// Prevent body scroll on map screen
useEffect(() => {
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = 'auto';
  };
}, []);

  // Load Google Maps SDK
  useEffect(() => {
    if (window.google?.maps) { setMapReady(true); return; }
    if (document.querySelector('#google-maps-script')) return;
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&language=iw`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapReady || !mapRef.current || googleMapRef.current || !userLocation) return;
    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: userLocation.lat, lng: userLocation.lng },
      zoom: 16,
      styles: DARK_MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    });
  }, [mapReady, userLocation]);

  // Re-center on location
  useEffect(() => {
    if (!googleMapRef.current || !userLocation) return;
    googleMapRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
  }, [userLocation]);

  // Blue dot marker
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

  // Sync spot markers
  useEffect(() => {
    if (!mapReady || !googleMapRef.current) return;
    const currentIds = new Set(liveSpots.map(s => s.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });
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

  // Handlers
  const handleReportTap = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleModalSubmit = useCallback(async (details) => {
    try {
      const spotId = await reportSpot({
  spotType:      details.spotType,
  isGroupOnly:   details.isGroupOnly || false,
  groupId:       details.groupId || null,
  manualAddress: details.address || '',
  isPaid:        details.isPaid,
  isHandicap:    details.isHandicap,
  searchTime:    details.searchTime,
  occupancy:     details.occupancy,
  image:         details.image,
});
      if (spotId) {
        setShowModal(false);
        const msg = details.isGroupOnly && details.groupId
          ? '🔒 הדיווח נשלח לקבוצה בלבד!'
          : '✅ הדיווח נשלח! קיבלת 10 נקודות';
        showToast(msg);
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
  }, [selectedSpot]);

  const handleMarkTaken = useCallback(async () => {
    if (!selectedSpot || !uid) return;
    await markSpotTaken(selectedSpot.id, uid);
    await updateLiveSpotStatus(selectedSpot.id, SPOT_STATUS.OCCUPIED);
    setSelectedSpot(null);
    showToast('✔ סומנה כתפוסה');
  }, [selectedSpot, uid, setSelectedSpot]);

  async function calculateParkingPrediction() {
    if (!userLocation) { showToast('❌ לא נמצא מיקום'); return; }
    setPredLoading(true);
    try {
      const hour = new Date().getHours();
      let estimatedTime, demandLevel;
      if      (hour >= 7  && hour <= 9)  { estimatedTime = 3;  demandLevel = 'גבוהה מאוד'; }
      else if (hour >= 17 && hour <= 20) { estimatedTime = 4;  demandLevel = 'גבוהה'; }
      else if (hour >= 10 && hour <= 16) { estimatedTime = 7;  demandLevel = 'בינונית'; }
      else                               { estimatedTime = 10; demandLevel = 'נמוכה'; }
      setPrediction({ estimatedTime, demandLevel });
    } catch (e) {
      showToast('❌ שגיאה בחיזוי');
    } finally {
      setPredLoading(false);
    }
  }
const topBarRef = useRef(null);
const [topBarHeight, setTopBarHeight] = useState(70);


  useEffect(() => {
  function measure() {
    if (topBarRef.current) {
      const h = topBarRef.current.getBoundingClientRect().bottom;
      setTopBarHeight(h);
    }
  }
  measure();
  setTimeout(measure, 100);
  setTimeout(measure, 500);
  setTimeout(measure, 1000);
  window.addEventListener('resize', measure);
  return () => window.removeEventListener('resize', measure);
}, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div style={S.container}>
      <div ref={mapRef} style={S.map} />

      {/* Top bar with search */}
      <div style={S.topBar} ref={topBarRef}>
        <AlertBadge count={alerts.length} onClick={() => navigate('/profile')} />
        <SearchBar
          onSearch={(loc) => setSearchLocation(loc)}
          onClear={() => setSearchLocation(null)}
          googleMapRef={googleMapRef}
        />
      </div>
      

      {/* Search results panel */}
      {searchLocation && (
        <SearchResultsPanel
          searchLocation={searchLocation}
          spots={liveSpots}
          onSelectSpot={(spot) => { setSelectedSpot(spot); setSearchLocation(null); }}
          onClose={() => setSearchLocation(null)}
        />
      )}

      {/* Spots count */}
      {liveSpots.length > 0 && (
  <div style={{ ...S.spotsCount, top: topBarHeight + 10 }}>{liveSpots.length} חניות פנויות</div>
)}
{console.log('rendering with topBarHeight:', topBarHeight)}
      {/* Prediction box */}
      <div style={{ ...S.predictionBox, top: topBarHeight + 10 }}>
        <button style={S.predictionBtn} onClick={calculateParkingPrediction} disabled={predLoading}>
          {predLoading ? 'מחשב...' : 'חיזוי תפיסת חניה'}
        </button>
        {prediction && (
          <div style={S.predictionText}>
            חניה צפויה להיתפס תוך כ-{prediction.estimatedTime} דקות<br />
            רמת ביקוש: {prediction.demandLevel}
          </div>
        )}
      </div>

      {/* Spot info panel */}
      {selectedSpot && (
        <SpotInfoPanel
          spot={selectedSpot}
          onClose={() => setSelectedSpot(null)}
          onNavigateGoogle={() => handleNavigate('google')}
          onNavigateWaze={() => handleNavigate('waze')}
          onMarkTaken={handleMarkTaken}
        />
      )}

      {/* Report button */}
      <button
        style={{ ...S.reportBtn, opacity: reportLoading ? 0.6 : 1 }}
        onClick={handleReportTap}
        disabled={reportLoading}
      >
        {reportLoading ? '⏳ שולח...' : '🅿 פינוי חניה'}
      </button>

      {toast && <div style={S.toast}>{toast}</div>}

      {showModal && (
        <ReportModal
          onSubmit={handleModalSubmit}
          onClose={() => setShowModal(false)}
          loading={reportLoading}
          userGroups={userGroups}
        />
      )}

      <BottomNav active="map" />
    </div>
  );
}

const S = {
  container: { position: 'relative', width: '100vw', height: '100vh', fontFamily: "'Assistant', sans-serif", direction: 'rtl', overflow: 'hidden' },
  map: { width: '100%', height: '100%' },
  topBar: { 
    position: 'fixed', top: 0, right: 0, left: 0,
    display: 'flex', alignItems: 'center', gap: 10, 
    background: 'rgba(15,23,42,0.95)', 
    backdropFilter: 'blur(8px)', 
    padding: '12px 12px 12px',
    paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)', 
    zIndex: 50, overflow: 'visible',
  },
  spotsCount: { 
    position: 'absolute', top: 80, right: '50%', transform: 'translateX(50%)', 
    background: '#22c55e', color: '#fff', 
    padding: '6px 18px', borderRadius: 20, 
    fontSize: 13, fontWeight: 600, 
    boxShadow: '0 2px 10px rgba(34,197,94,0.5)',
    whiteSpace: 'nowrap', zIndex: 10,
  },
  
  predictionBox: { 
  position: 'fixed',
  right: '50%', 
  transform: 'translateX(50%)',
  background: 'rgba(15,23,42,0.92)', 
  color: '#fff', 
  padding: '8px 12px', 
  borderRadius: 16, 
  textAlign: 'center',
  width: 220,
  boxShadow: '0 4px 20px rgba(0,0,0,0.4)', 
  zIndex: 10,
},
  predictionBtn: { background: '#22c55e', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Assistant', sans-serif" },
  predictionText: { marginTop: 10, fontSize: 14, lineHeight: 1.5 },
  reportBtn: { 
    position: 'fixed', bottom: 100, right: '50%', transform: 'translateX(50%)', 
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)', 
    color: '#fff', border: 'none', padding: '18px 48px', borderRadius: 50, 
    fontSize: 18, fontWeight: 700, cursor: 'pointer', 
    boxShadow: '0 6px 30px rgba(99,102,241,0.6)', 
    transition: 'transform 0.15s, opacity 0.2s',
    zIndex: 10,
  },
  toast: { position: 'absolute', top: '50%', right: '50%', transform: 'translate(50%, -50%)', background: 'rgba(15,23,42,0.92)', color: '#fff', padding: '14px 24px', borderRadius: 12, fontSize: 15, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', pointerEvents: 'none' },
};

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