// src/store/ParkingContext.jsx
// Global state for live parking spots, user location, and active alerts

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { listenToLiveSpots, listenToNearbyAlerts, setUserPresence, clearUserPresence } from '../services/realtimeDB';
import { getNearbySpots, listenToUserAlerts } from '../services/firestore';
import { getCurrentPosition, watchPosition, clearWatch, distanceKm } from '../services/locationService';
import { emitLocalNotification } from '../services/notificationsService';

const ParkingContext = createContext(null);

// Minimum distance (m) before we consider the user has moved
const LOCATION_UPDATE_THRESHOLD_M = 30;

export function ParkingProvider({ children }) {
  const { uid, userProfile } = useAuth();

  const [userLocation, setUserLocation]   = useState(null);
  const [liveSpots, setLiveSpots]         = useState([]);
  const [alerts, setAlerts]               = useState([]);
  const [selectedSpot, setSelectedSpot]   = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const watchIdRef    = useRef(null);
  const prevLocRef    = useRef(null);
  const liveUnsubRef  = useRef(null);
  const alertUnsubRef = useRef(null);

  // ── Boot: get initial location ──────────────────────────────────────────────
  useEffect(() => {
    getCurrentPosition()
      .then(loc => {
        setUserLocation(loc);
        prevLocRef.current = loc;
      })
      .catch(err => setLocationError(err.message));
  }, []);

  // ── Watch location continuously ──────────────────────────────────────────────
  useEffect(() => {
    watchIdRef.current = watchPosition(
      (loc) => {
        const prev = prevLocRef.current;
        if (!prev || distanceKm(prev.lat, prev.lng, loc.lat, loc.lng) * 1000 > LOCATION_UPDATE_THRESHOLD_M) {
          setUserLocation(loc);
          prevLocRef.current = loc;
          if (uid) setUserPresence(uid, loc.lat, loc.lng);
        }
      },
      (err) => setLocationError(err.message)
    );
    return () => {
      clearWatch(watchIdRef.current);
      if (uid) clearUserPresence(uid);
    };
  }, [uid]);

  // ── Subscribe to live spots when location changes ───────────────────────────
  useEffect(() => {
    if (!userLocation) return;
    if (liveUnsubRef.current) liveUnsubRef.current();

    liveUnsubRef.current = listenToLiveSpots(
      userLocation.lat,
      userLocation.lng,
      (spots) => setLiveSpots(spots)
    );
    return () => { if (liveUnsubRef.current) liveUnsubRef.current(); };
  }, [userLocation?.lat, userLocation?.lng]);

  // ── Subscribe to user alerts ────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    if (alertUnsubRef.current) alertUnsubRef.current();

    alertUnsubRef.current = listenToUserAlerts(uid, (newAlerts) => {
      setAlerts(newAlerts);
      if (newAlerts.length > 0) {
        emitLocalNotification(
          '🅿️ חניה פנויה!',
          'נמצאה חניה פנויה קרוב אליך',
          { spotId: newAlerts[0].spotId }
        );
      }
    });
    return () => { if (alertUnsubRef.current) alertUnsubRef.current(); };
  }, [uid]);

  // ── Nearby alerts (RTDB) ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userLocation) return;
    const unsub = listenToNearbyAlerts(userLocation.lat, userLocation.lng, (rtdbAlerts) => {
      rtdbAlerts.forEach(a => {
        emitLocalNotification('🅿️ חניה מתפנה!', 'לחץ לניווט', { spotId: a.spotId });
      });
    });
    return unsub;
  }, [userLocation?.lat, userLocation?.lng]);

  const refreshSpots = useCallback(async () => {
    if (!userLocation) return;
    const spots = await getNearbySpots(userLocation.lat, userLocation.lng, 1, activeGroupId);
    setLiveSpots(spots);
  }, [userLocation, activeGroupId]);

  const value = {
    userLocation,
    liveSpots,
    alerts,
    selectedSpot,
    setSelectedSpot,
    activeGroupId,
    setActiveGroupId,
    locationError,
    refreshSpots,
  };

  return <ParkingContext.Provider value={value}>{children}</ParkingContext.Provider>;
}

export function useParking() {
  const ctx = useContext(ParkingContext);
  if (!ctx) throw new Error('useParking must be used within <ParkingProvider>');
  return ctx;
}
