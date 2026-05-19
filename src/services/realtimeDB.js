// src/services/realtimeDB.js
// Firebase Realtime Database – used for sub-second parking spot updates
// and broadcasting alerts to nearby users (WebSocket-style push).

import {
  ref, set, get, update, remove,
  onValue, off, push, serverTimestamp,
  query as rtdbQuery, orderByChild, equalTo, limitToLast
} from 'firebase/database';
import { rtdb } from './firebase';
import { SPOT_STATUS, SPOT_TTL_MS } from './firestore';

// ═══════════════════════════════════════════════════════════════════════════════
// PATH HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const paths = {
  liveSpot:        (spotId)   => `liveSpots/${spotId}`,
  userPresence:    (userId)   => `presence/${userId}`,
  nearbyAlert:     (geohash4) => `nearbyAlerts/${geohash4}`,
  groupFeed:       (groupId)  => `groupFeeds/${groupId}`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIMPLE GEOHASH (4-char precision ≈ 40km × 20km, good for city-level matching)
// In production, use the `geofire-common` npm package for full geohash support.
// ═══════════════════════════════════════════════════════════════════════════════
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(lat, lng, precision = 4) {
  let idx = 0, bit = 0, evenBit = true, hash = '';
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) { idx = (idx << 1) + 1; lngMin = mid; }
      else            { idx = (idx << 1);     lngMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { idx = (idx << 1) + 1; latMin = mid; }
      else            { idx = (idx << 1);     latMax = mid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { hash += BASE32[idx]; bit = 0; idx = 0; }
  }
  return hash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE SPOT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Write/update a live spot entry. This fires instantly to all listeners.
 * spotId should match the Firestore document ID so both DBs stay in sync.
 */
export async function setLiveSpot(spotId, { lat, lng, status, reportedBy, type, isGroupOnly, groupId, ...extraDetails }) {
  const geohash = encodeGeohash(lat, lng, 4);
  await set(ref(rtdb, paths.liveSpot(spotId)), {
    lat, lng, status,
    reportedBy,
    type,
    isGroupOnly: isGroupOnly || false,
    groupId: groupId || null,
    geohash4: geohash,
    reportedAt: Date.now(),
    expiresAt: Date.now() + SPOT_TTL_MS,
    ...extraDetails,
  });
}

export async function updateLiveSpotStatus(spotId, status) {
  await update(ref(rtdb, paths.liveSpot(spotId)), { status });
}

export async function removeLiveSpot(spotId) {
  await remove(ref(rtdb, paths.liveSpot(spotId)));
}

/**
 * Subscribe to ALL live spot changes within a geohash prefix.
 * callback receives an array of live spot objects.
 */
export function listenToLiveSpots(lat, lng, callback) {
  const geohash = encodeGeohash(lat, lng, 3); // 3-char = ~200km, narrows by listener filter
  const spotsRef = rtdbQuery(
    ref(rtdb, 'liveSpots'),
    orderByChild('geohash4'),
    // Firebase RTDB range query on string prefix
    // We listen to geohash3 prefix and filter client-side for geohash4 match
  );

  const handler = (snap) => {
    const now = Date.now();
    const spots = [];
    snap.forEach(child => {
      const s = child.val();
      // Filter: not expired, geohash prefix matches, still AVAILABLE
      if (s.expiresAt > now && s.status === SPOT_STATUS.AVAILABLE) {
        // Only include spots in roughly the right area (geohash3 prefix)
        if (s.geohash4 && s.geohash4.startsWith(geohash.substring(0, 2))) {
          spots.push({ id: child.key, ...s });
        }
      }
    });
    callback(spots);
  };

  onValue(spotsRef, handler);
  return () => off(spotsRef, 'value', handler);
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEARBY ALERTS BROADCAST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Broadcast a new spot available alert to a geohash tile.
 * All users listening on that tile will receive the push.
 */
export async function broadcastNearbyAlert(lat, lng, spotId, type, isGroupOnly, groupId) {
  const geohash = encodeGeohash(lat, lng, 4);
  const alertRef = push(ref(rtdb, paths.nearbyAlert(geohash)));
  await set(alertRef, {
    spotId,
    type,
    lat,
    lng,
    isGroupOnly: isGroupOnly || false,
    groupId: groupId || null,
    timestamp: Date.now(),
  });
}

/**
 * Listen for nearby alerts on the user's current tile.
 */
export function listenToNearbyAlerts(lat, lng, callback) {
  const geohash = encodeGeohash(lat, lng, 4);
  const alertsRef = rtdbQuery(
    ref(rtdb, paths.nearbyAlert(geohash)),
    orderByChild('timestamp'),
    limitToLast(10)
  );

  const handler = (snap) => {
    const now = Date.now();
    const alerts = [];
    snap.forEach(child => {
      const a = child.val();
      if (now - a.timestamp < 60 * 1000) { // Only last 60s
        alerts.push({ id: child.key, ...a });
      }
    });
    callback(alerts);
  };

  onValue(alertsRef, handler);
  return () => off(alertsRef, 'value', handler);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP FEED
// ═══════════════════════════════════════════════════════════════════════════════

export async function pushGroupFeedItem(groupId, item) {
  const feedRef = push(ref(rtdb, paths.groupFeed(groupId)));
  await set(feedRef, { ...item, timestamp: Date.now() });
}

export function listenToGroupFeed(groupId, callback) {
  const feedRef = rtdbQuery(
    ref(rtdb, paths.groupFeed(groupId)),
    limitToLast(50)
  );
  const handler = (snap) => {
    const items = [];
    snap.forEach(c => items.push({ id: c.key, ...c.val() }));
    callback(items.reverse()); // newest first
  };
  onValue(feedRef, handler);
  return () => off(feedRef, 'value', handler);
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER PRESENCE (online/offline)
// ═══════════════════════════════════════════════════════════════════════════════

export async function setUserPresence(userId, lat, lng) {
  await update(ref(rtdb, paths.userPresence(userId)), {
    lat,
    lng,
    geohash: encodeGeohash(lat, lng, 5),
    lastSeen: Date.now(),
    online: true,
  });
}

export async function clearUserPresence(userId) {
  await update(ref(rtdb, paths.userPresence(userId)), {
    online: false,
    lastSeen: Date.now(),
  });
}
