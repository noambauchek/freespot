// src/services/firestore.js
// Firestore collection helpers, data model constants, and CRUD operations

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, increment, GeoPoint,
  writeBatch, Timestamp, startAfter
} from 'firebase/firestore';
import { db } from './firebase';

// ═══════════════════════════════════════════════════════════════════════════════
// COLLECTION NAMES
// ═══════════════════════════════════════════════════════════════════════════════
export const COLLECTIONS = {
  USERS:         'users',
  PARKING_SPOTS: 'parkingSpots',
  REPORTS:       'reports',
  ALERTS:        'alerts',
  REWARDS:       'rewards',
  GROUPS:        'groups',
  GROUP_MEMBERS: 'groupMembers',
  VEHICLES:      'vehicles',
  PAYMENT_METHODS: 'paymentMethods',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CODE TABLES  (match the spec's tables from section 2.7)
// ═══════════════════════════════════════════════════════════════════════════════

// Parking spot status
export const SPOT_STATUS = {
  AVAILABLE:  'S1', // Available – recently reported, still valid
  OCCUPIED:   'S2', // Marked as taken by another user
  EXPIRED:    'S3', // Report TTL exceeded (~15 min)
};

// Alert types
export const ALERT_TYPE = {
  NEARBY_SPOT: 'N1',  // A spot opened near the user
  RIGHTS_CHANGE: 'N2', // User rank/rights updated
  SYSTEM: 'N3',        // App-wide notification (upgrade, outage)
};

// Reward reasons
export const REWARD_REASON = {
  VALID_REPORT:    'P1',  // Accurate spot report
  FIRST_IN_AREA:  'P2',  // First report in an area during a session
  RANK_BONUS:     'P3',  // Based on user rank multiplier
  STREAK_BONUS:   'P4',  // Consecutive daily usage streak
};

// Report types
export const REPORT_TYPE = {
  SPOT_AVAILABLE:  'R1',
  SPOT_TAKEN:      'R2',
  SPOT_FEEDBACK:   'R3',
  GROUP_CREATED:   'R4',
};

// User ranks
export const USER_RANK = {
  CASUAL:    'U1', // 0–49 points
  REGULAR:   'U2', // 50–199 points
  EXPERT:    'U3', // 200–499 points
  SUPER:     'U4', // 500+ points
  INACTIVE:  'U5', // No activity for 30+ days
};

// Notification channels
export const NOTIFICATION_CHANNEL = {
  IN_APP: 'C1',
  PUSH:   'C2',
  SMS:    'C3',
  WHATSAPP: 'C4',
  EMAIL:  'C5',
};

// Parking spot types
export const SPOT_TYPE = {
  BLUE_WHITE: 'blue_white', // כחול-לבן (paid municipal)
  FREE:       'free',       // חינם
  PRIVATE:    'private',    // פרטי
  PARKING_LOT: 'lot',       // חניון
};

// ═══════════════════════════════════════════════════════════════════════════════
// POINTS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
export const POINTS = {
  VALID_REPORT:   10,
  FIRST_IN_AREA:  25,
  STREAK_3_DAYS:  15,
  STREAK_7_DAYS:  40,
};

export const RANK_THRESHOLDS = {
  [USER_RANK.CASUAL]:   0,
  [USER_RANK.REGULAR]:  50,
  [USER_RANK.EXPERT]:   200,
  [USER_RANK.SUPER]:    500,
};

// How long (ms) a spot report stays "valid" before auto-expiry
export const SPOT_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER – resolve user rank from total points
// ═══════════════════════════════════════════════════════════════════════════════
export function resolveRank(points) {
  if (points >= RANK_THRESHOLDS[USER_RANK.SUPER])   return USER_RANK.SUPER;
  if (points >= RANK_THRESHOLDS[USER_RANK.EXPERT])  return USER_RANK.EXPERT;
  if (points >= RANK_THRESHOLDS[USER_RANK.REGULAR]) return USER_RANK.REGULAR;
  return USER_RANK.CASUAL;
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new user profile in Firestore after Firebase Auth sign-up.
 * @param {string} uid  - Firebase Auth UID
 * @param {object} data - { fullName, phone, email }
 */
export async function createUserProfile(uid, { fullName, phone, email }) {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    fullName,
    phone,
    email,
    joinDate: serverTimestamp(),
    rank: USER_RANK.CASUAL,
    points: 0,
    totalReports: 0,
    consecutiveDays: 0,
    lastActiveDate: serverTimestamp(),
    isBanned: false,
    fcmToken: null,
    notificationPrefs: {
      inApp: true,
      push: true,
    },
  }).catch(async () => {
    // Doc doesn't exist yet – use setDoc-style via addDoc on sub-path won't work,
    // so we create it via set (import set separately)
    const { setDoc } = await import('firebase/firestore');
    await setDoc(userRef, {
      fullName, phone, email,
      joinDate: serverTimestamp(),
      rank: USER_RANK.CASUAL,
      points: 0,
      totalReports: 0,
      consecutiveDays: 0,
      lastActiveDate: serverTimestamp(),
      isBanned: false,
      fcmToken: null,
      notificationPrefs: { inApp: true, push: true },
    });
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function listenToUserProfile(uid, callback) {
  return onSnapshot(doc(db, COLLECTIONS.USERS, uid), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

export async function updateUserFcmToken(uid, token) {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), { fcmToken: token });
}

export async function updateUserProfile(uid, updates) {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), updates);
}

export async function banUser(uid) {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), { isBanned: true });
}

export async function unbanUser(uid) {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), { isBanned: false });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARKING SPOT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Report a parking spot as available.
 * @param {string}  userId
 * @param {number}  lat
 * @param {number}  lng
 * @param {string}  spotType  - one of SPOT_TYPE values
 * @param {boolean} isGroupOnly - share only with a private group?
 * @param {string?} groupId
 */
export async function reportSpotAvailable(userId, lat, lng, spotType, isGroupOnly = false, groupId = null, extraDetails = {}) {
  const now = serverTimestamp();
  const spotRef = await addDoc(collection(db, COLLECTIONS.PARKING_SPOTS), {
    location: new GeoPoint(lat, lng),
    latitude: lat,
    longitude: lng,
    status: SPOT_STATUS.AVAILABLE,
    type: spotType,
    reportedBy: userId,
    reportedAt: now,
    lastReportTime: now,
    expiresAt: Timestamp.fromMillis(Date.now() + SPOT_TTL_MS),
    isGroupOnly,
    groupId,
    viewCount: 0,
    navigatedCount: 0,
    algorithmVersion: 'v1',
    ...extraDetails,
  });

  // Create the linked Report document
  await addDoc(collection(db, COLLECTIONS.REPORTS), {
    spotId: spotRef.id,
    userId,
    timestamp: now,
    reportType: REPORT_TYPE.SPOT_AVAILABLE,
    latitude: lat,
    longitude: lng,
    spotType,
    validity: true,
    isGroupOnly,
    groupId,
    ...extraDetails,
  });

  return spotRef.id;
}

/**
 * Mark a spot as taken (occupied by the claiming user).
 */
export async function markSpotTaken(spotId, userId) {
  await updateDoc(doc(db, COLLECTIONS.PARKING_SPOTS, spotId), {
    status: SPOT_STATUS.OCCUPIED,
    takenBy: userId,
    takenAt: serverTimestamp(),
  });

  await addDoc(collection(db, COLLECTIONS.REPORTS), {
    spotId,
    userId,
    timestamp: serverTimestamp(),
    reportType: REPORT_TYPE.SPOT_TAKEN,
    validity: true,
  });
}

/**
 * Fetch available spots within a bounding box.
 * NOTE: For production use Firestore's GeoPoint + a geohash library (e.g. geofire-common)
 * or a Cloud Function with PostGIS. This version uses a lat/lng bounding box query.
 */
export async function getNearbySpots(lat, lng, radiusKm = 1, groupId = null) {
  const delta = radiusKm / 111; // degrees ≈ km/111
  const minLat = lat - delta;
  const maxLat = lat + delta;

  const q = query(
    collection(db, COLLECTIONS.PARKING_SPOTS),
    where('latitude', '>=', minLat),
    where('latitude', '<=', maxLat),
    where('status', '==', SPOT_STATUS.AVAILABLE),
    orderBy('latitude'),
    orderBy('reportedAt', 'desc'),
    limit(50)
  );

  const snaps = await getDocs(q);
  return snaps.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => {
      // Manual longitude filter (Firestore can only range-filter one field)
      const lngDiff = Math.abs(s.longitude - lng);
      if (lngDiff > delta * 1.5) return false;
      // If groupId provided, include both group-only and public spots
      if (groupId) return !s.isGroupOnly || s.groupId === groupId;
      return !s.isGroupOnly;
    });
}

/**
 * Real-time listener for spots near a location.
 */
export function listenToNearbySpots(lat, lng, radiusKm = 1, callback) {
  const delta = radiusKm / 111;
  const q = query(
    collection(db, COLLECTIONS.PARKING_SPOTS),
    where('latitude', '>=', lat - delta),
    where('latitude', '<=', lat + delta),
    where('status', '==', SPOT_STATUS.AVAILABLE),
    orderBy('latitude'),
    limit(50)
  );

  return onSnapshot(q, (snap) => {
    const spots = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(s => Math.abs(s.longitude - lng) <= delta * 1.5);
    callback(spots);
  });
}

export async function adminRemoveSpot(spotId, adminNote) {
  await updateDoc(doc(db, COLLECTIONS.PARKING_SPOTS, spotId), {
    status: SPOT_STATUS.EXPIRED,
    removedByAdmin: true,
    adminNote,
    removedAt: serverTimestamp(),
  });
}

export async function adminGetAllReports(limitCount = 100) {
  const q = query(
    collection(db, COLLECTIONS.REPORTS),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// REWARDS OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function grantPoints(userId, amount, reason) {
  const batch = writeBatch(db);

  // Add a reward record
  const rewardRef = doc(collection(db, COLLECTIONS.REWARDS));
  batch.set(rewardRef, {
    userId,
    pointsAmount: amount,
    rewardReason: reason,
    date: serverTimestamp(),
  });

  // Increment user's points counter
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  batch.update(userRef, {
    points: increment(amount),
    totalReports: reason === REWARD_REASON.VALID_REPORT ? increment(1) : increment(0),
    lastActiveDate: serverTimestamp(),
  });

  await batch.commit();

  // Recalculate rank after points update
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const newPoints = userSnap.data().points;
    const newRank = resolveRank(newPoints);
    if (userSnap.data().rank !== newRank) {
      await updateDoc(userRef, { rank: newRank });
    }
  }
}

export async function getUserRewardsHistory(userId, limitCount = 20) {
  const q = query(
    collection(db, COLLECTIONS.REWARDS),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(limitCount)
  );
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUPS OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function createGroup(adminUserId, groupName, groupType, locationHint) {
  const groupRef = await addDoc(collection(db, COLLECTIONS.GROUPS), {
    groupName,
    groupType,       // 'family' | 'friends' | 'work' | 'neighborhood'
    locationHint,    // e.g. "Dizengoff St, Tel Aviv"
    createdBy: adminUserId,
    createdAt: serverTimestamp(),
    memberCount: 1,
    isActive: true,
  });

  // Add creator as first member (admin)
  await addDoc(collection(db, COLLECTIONS.GROUP_MEMBERS), {
    groupId: groupRef.id,
    userId: adminUserId,
    role: 'admin',
    joinedAt: serverTimestamp(),
    status: 'active',
  });

  // Record the report action
  await addDoc(collection(db, COLLECTIONS.REPORTS), {
    userId: adminUserId,
    groupId: groupRef.id,
    timestamp: serverTimestamp(),
    reportType: REPORT_TYPE.GROUP_CREATED,
    validity: true,
  });

  return groupRef.id;
}

export async function requestJoinGroup(groupId, userId) {
  await addDoc(collection(db, COLLECTIONS.GROUP_MEMBERS), {
    groupId,
    userId,
    role: 'member',
    joinedAt: serverTimestamp(),
    status: 'pending', // Admin must approve
  });
}

export async function approveGroupMember(groupId, userId) {
  const q = query(
    collection(db, COLLECTIONS.GROUP_MEMBERS),
    where('groupId', '==', groupId),
    where('userId', '==', userId)
  );
  const snaps = await getDocs(q);
  if (!snaps.empty) {
    const memberRef = snaps.docs[0].ref;
    await updateDoc(memberRef, { status: 'active' });
    await updateDoc(doc(db, COLLECTIONS.GROUPS, groupId), {
      memberCount: increment(1),
    });
  }
}

export async function removeGroupMember(groupId, userId) {
  const q = query(
    collection(db, COLLECTIONS.GROUP_MEMBERS),
    where('groupId', '==', groupId),
    where('userId', '==', userId)
  );
  const snaps = await getDocs(q);
  if (!snaps.empty) {
    await deleteDoc(snaps.docs[0].ref);
    await updateDoc(doc(db, COLLECTIONS.GROUPS, groupId), {
      memberCount: increment(-1),
    });
  }
}

export async function getUserGroups(userId) {
  const q = query(
    collection(db, COLLECTIONS.GROUP_MEMBERS),
    where('userId', '==', userId),
    where('status', '==', 'active')
  );
  const snaps = await getDocs(q);
  const groupIds = snaps.docs.map(d => d.data().groupId);

  const groups = await Promise.all(
    groupIds.map(id => getDoc(doc(db, COLLECTIONS.GROUPS, id)))
  );
  return groups.filter(g => g.exists()).map(g => ({ id: g.id, ...g.data() }));
}

export async function getGroupMembers(groupId) {
  const q = query(
    collection(db, COLLECTIONS.GROUP_MEMBERS),
    where('groupId', '==', groupId),
    where('status', '==', 'active')
  );
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function createAlert(userId, spotId, alertType, channel) {
  await addDoc(collection(db, COLLECTIONS.ALERTS), {
    userId,
    spotId,
    alertType,
    channel,
    sentAt: serverTimestamp(),
    read: false,
  });
}

export function listenToUserAlerts(userId, callback) {
  const q = query(
    collection(db, COLLECTIONS.ALERTS),
    where('userId', '==', userId),
    where('read', '==', false),
    orderBy('sentAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function markAlertRead(alertId) {
  await updateDoc(doc(db, COLLECTIONS.ALERTS, alertId), { read: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCOREBOARD / ANALYTICS QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

export async function getLeaderboard(limitCount = 20) {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('isBanned', '==', false),
    orderBy('points', 'desc'),
    limit(limitCount)
  );
  const snaps = await getDocs(q);
  return snaps.docs.map((d, i) => ({ id: d.id, position: i + 1, ...d.data() }));
}

export async function getActiveSpotsByArea() {
  const q = query(
    collection(db, COLLECTIONS.PARKING_SPOTS),
    where('status', '==', SPOT_STATUS.AVAILABLE),
    orderBy('reportedAt', 'desc')
  );
  const snaps = await getDocs(q);
  // Group by rough area (0.01-degree grid ~ 1km)
  const areas = {};
  snaps.docs.forEach(d => {
    const { latitude, longitude } = d.data();
    const key = `${(latitude * 100 | 0) / 100},${(longitude * 100 | 0) / 100}`;
    areas[key] = (areas[key] || 0) + 1;
  });
  return areas;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VEHICLE & PAYMENT METHODS
// ═══════════════════════════════════════════════════════════════════════════════

export async function addVehicle(userId, vehicleType, color) {
  const ref = await addDoc(collection(db, COLLECTIONS.VEHICLES), {
    userId,
    vehicleType,
    color,
    addedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getUserVehicles(userId) {
  const q = query(collection(db, COLLECTIONS.VEHICLES), where('userId', '==', userId));
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addPaymentMethod(userId, provider, accountNumber, isDefault) {
  const ref = await addDoc(collection(db, COLLECTIONS.PAYMENT_METHODS), {
    userId,
    provider,        // 'pango' | 'cellopark'
    accountNumber,
    isDefault,
    addedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getUserPaymentMethods(userId) {
  const q = query(collection(db, COLLECTIONS.PAYMENT_METHODS), where('userId', '==', userId));
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
}
