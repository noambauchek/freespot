// src/hooks/useReportSpot.js
// Hook: handles the full report-a-spot flow including points, RTDB broadcast, Firestore write

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

export function useReportSpot() {
  const { uid, userProfile } = useAuth();
  const { userLocation, activeGroupId } = useParking();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reportSpot = useCallback(async ({
    spotType = SPOT_TYPE.BLUE_WHITE,
    isGroupOnly = false,
    groupId = activeGroupId,
  } = {}) => {
    if (!uid || !userLocation) {
      setError('Location or authentication unavailable');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { lat, lng } = userLocation;

      const extraDetails = {
        reliabilityScore: userProfile?.rank ? 80 : 60,
        reporterRank: userProfile?.rank || null,
      };

      // 1. Write to Firestore (persistent record)
      const spotId = await reportSpotAvailable(
        uid,
        lat,
        lng,
        spotType,
        isGroupOnly,
        groupId,
        extraDetails
      );

      // 2. Mirror to Realtime DB (instant broadcast)
      await setLiveSpot(spotId, {
        lat,
        lng,
        status: 'S1',
        reportedBy: uid,
        type: spotType,
        isGroupOnly,
        groupId,
        ...extraDetails,
      });

      // 3. Broadcast nearby alert
      await broadcastNearbyAlert(lat, lng, spotId, 'N1', isGroupOnly, groupId);

      // 4. Award points
      await grantPoints(uid, POINTS.VALID_REPORT, REWARD_REASON.VALID_REPORT);

      emitLocalNotification('✅ דיווח נשלח!', `קיבלת ${POINTS.VALID_REPORT} נקודות`);
      return spotId;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [uid, userLocation, activeGroupId]);

  return { reportSpot, loading, error };
}


// ────────────────────────────────────────────────────────────────────────────
