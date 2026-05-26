const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const COLLECTIONS = {
  PARKING_SPOTS: 'parkingSpots',
};

const SPOT_STATUS = {
  AVAILABLE: 'S1',
  OCCUPIED: 'S2',
  EXPIRED: 'S3',
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function timestampToMillis(value) {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value._seconds) return value._seconds * 1000;
  return Date.now();
}

function calculateScore({ distanceKm, reportedAtMillis, type }) {
  const now = Date.now();
  const ageMinutes = Math.max(0, (now - reportedAtMillis) / (1000 * 60));

  // The closer the spot, the better. 1.5 km or more becomes close to 0.
  const distanceScore = Math.max(0, 100 - distanceKm * 66);

  // Fresh reports are more reliable. After about 30 minutes the score is very low.
  const freshnessScore = Math.max(0, 100 - ageMinutes * 3.3);

  // Small preference for street parking types. Keep this simple for the academic project.
  const typeScore = type === 'free' ? 100 : type === 'blue_white' ? 90 : type === 'lot' ? 80 : 70;

  return Math.round(distanceScore * 0.55 + freshnessScore * 0.35 + typeScore * 0.10);
}

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, service: 'freespot-parking-algorithm' });
});

app.post('/rank-parking', async (req, res) => {
  try {
    const userLat = toNumber(req.body.userLat);
    const userLng = toNumber(req.body.userLng);
    const maxRadius = toNumber(req.body.maxRadius) || 1.5;

    if (userLat === null || userLng === null) {
      return res.status(400).json({
        success: false,
        error: 'userLat and userLng are required numbers',
      });
    }

    const snapshot = await db
      .collection(COLLECTIONS.PARKING_SPOTS)
      .where('status', '==', SPOT_STATUS.AVAILABLE)
      .get();

    const rankedSpots = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const spotLat = toNumber(data.latitude);
      const spotLng = toNumber(data.longitude);

      if (spotLat === null || spotLng === null) return;

      const distanceKm = getDistanceKm(userLat, userLng, spotLat, spotLng);
      if (distanceKm > maxRadius) return;

      const reportedAtMillis = timestampToMillis(data.reportedAt || data.lastReportTime);
      const score = calculateScore({
        distanceKm,
        reportedAtMillis,
        type: data.type,
      });

      rankedSpots.push({
        id: doc.id,
        ...data,
        latitude: spotLat,
        longitude: spotLng,
        distanceKm: Number(distanceKm.toFixed(2)),
        score,
        estimatedWalkingMinutes: Math.max(1, Math.round((distanceKm / 4.5) * 60)),
      });
    });

    rankedSpots.sort((a, b) => b.score - a.score);

    res.status(200).json({
      success: true,
      count: rankedSpots.length,
      bestSpot: rankedSpots[0] || null,
      data: rankedSpots,
    });
  } catch (error) {
    console.error('Algorithm error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rank parking spots',
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`FreeSpot parking algorithm listening on port ${PORT}`);
});
