// src/hooks/useReportSpot.js

import { useState, useCallback } from 'react';
import { useAuth } from '../store/AuthContext';
import { useParking } from '../store/ParkingContext';
import {
  reportSpotAvailable,
  grantPoints,
  REWARD_REASON,
  POINTS,
  SPOT_TYPE,
} from '../services/firestore';
import { setLiveSpot, broadcastNearbyAlert } from '../services/realtimeDB';
import { emitLocalNotification } from '../services/notificationsService';


async function uploadPhoto(image, spotId) {
  if (!image) return null;
  try {
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('../services/firebase');
    const storageRef = ref(storage, `parking-photos/${spotId}/${Date.now()}`);
    await uploadBytes(storageRef, image);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (e) {
    console.warn('Photo upload failed:', e.message);
    return null;
  }
}

async function getAddressFromCoords(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=he`
    );
    const data = await res.json();
    if (!data || !data.address) return '';
    const a = data.address;
    const street = a.road || a.pedestrian || a.footway || '';
    const number = a.house_number || '';
    const city   = a.city || a.town || a.village || a.suburb || '';
    let address  = '';
    if (street && number) address = `${street} ${number}`;
    else if (street)      address = street;
    if (city) address = address ? `${address}, ${city}` : city;
    return address || data.display_name || '';
  } catch (e) {
    return '';
  }
}

export function useReportSpot() {
  const { uid } = useAuth();
  const { userLocation, activeGroupId } = useParking();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const reportSpot = useCallback(async ({
    spotType      = SPOT_TYPE.BLUE_WHITE,
    isGroupOnly   = false,
    groupId       = activeGroupId,
    manualAddress = '',
    isPaid        = null,
    isHandicap    = null,
    searchTime    = null,
    occupancy     = null,
    image         = null,
  } = {}) => {
    if (!uid || !userLocation) {
      setError('Location or authentication unavailable');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { lat, lng } = userLocation;

      // Get address
      let autoAddress = manualAddress.trim();
      if (!autoAddress || autoAddress === 'מאתר מיקום...') {
        autoAddress = await getAddressFromCoords(lat, lng);
      }

      // 1. Write to Firestore
      const spotId = await reportSpotAvailable(
  uid, lat, lng, spotType, isGroupOnly, groupId, autoAddress,
  { isPaid, isHandicap, searchTime, occupancy }
);

// Upload photo and update the spot with the URL
if (image && spotId) {
  const photoURL = await uploadPhoto(image, spotId);
  if (photoURL) {
    const { updateDoc, doc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');
    await updateDoc(doc(db, 'parkingSpots', spotId), { photoURL });
  }
}

      // 2. Mirror to Realtime DB
      try {
        await setLiveSpot(spotId, { lat, lng, status: 'S1', reportedBy: uid, type: spotType, isGroupOnly, groupId });
        await broadcastNearbyAlert(lat, lng, spotId, 'N1', isGroupOnly, groupId);
      } catch (rtdbError) {
        console.warn('Realtime DB not available:', rtdbError.message);
      }

      // 3. Award points
      await grantPoints(uid, POINTS.VALID_REPORT, REWARD_REASON.VALID_REPORT);

      emitLocalNotification('✅ דיווח נשלח!', `קיבלת ${POINTS.VALID_REPORT} נקודות`);
      return spotId;

    } catch (e) {
      console.error('reportSpot error:', e);
      setError(e.message);
      emitLocalNotification('❌ שגיאה', e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [uid, userLocation, activeGroupId]);

  return { reportSpot, loading, error };
}