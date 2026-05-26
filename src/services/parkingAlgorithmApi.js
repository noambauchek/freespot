// src/services/parkingAlgorithmApi.js
// Client wrapper for the Cloud Run parking algorithm service.

const DEFAULT_MAX_RADIUS_KM = 1.5;
const ALGORITHM_BASE_URL = process.env.REACT_APP_PARKING_ALGORITHM_URL;

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

function localRankParking(userLocation, liveSpots, maxRadiusKm = DEFAULT_MAX_RADIUS_KM) {
  const now = Date.now();

  return liveSpots
    .map((spot) => {
      const lat = spot.lat || spot.latitude;
      const lng = spot.lng || spot.longitude;
      if (!lat || !lng) return null;

      const distanceKm = getDistanceKm(userLocation.lat, userLocation.lng, lat, lng);
      const ageMinutes = Math.max(0, (now - (spot.reportedAt || now)) / (1000 * 60));
      const distanceScore = Math.max(0, 100 - distanceKm * 66);
      const freshnessScore = Math.max(0, 100 - ageMinutes * 3.3);
      const typeScore = spot.type === 'T1' ? 100 : spot.type === 'T2' ? 85 : 75;
      const score = Math.round(distanceScore * 0.55 + freshnessScore * 0.35 + typeScore * 0.10);

      return {
        ...spot,
        latitude: lat,
        longitude: lng,
        distanceKm: Number(distanceKm.toFixed(2)),
        score,
        estimatedWalkingMinutes: Math.max(1, Math.round((distanceKm / 4.5) * 60)),
      };
    })
    .filter((spot) => spot && spot.distanceKm <= maxRadiusKm)
    .sort((a, b) => b.score - a.score);
}

export async function rankParkingSpots({ userLocation, liveSpots = [], maxRadiusKm = DEFAULT_MAX_RADIUS_KM }) {
  if (!userLocation?.lat || !userLocation?.lng) {
    throw new Error('User location is missing');
  }

  if (!ALGORITHM_BASE_URL) {
    const localResults = localRankParking(userLocation, liveSpots, maxRadiusKm);
    return {
      source: 'local-fallback',
      bestSpot: localResults[0] || null,
      results: localResults,
    };
  }

  const response = await fetch(`${ALGORITHM_BASE_URL}/rank-parking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userLat: userLocation.lat,
      userLng: userLocation.lng,
      maxRadius: maxRadiusKm,
    }),
  });

  if (!response.ok) {
    throw new Error('Algorithm service failed');
  }

  const payload = await response.json();

  return {
    source: 'cloud-run',
    bestSpot: payload.bestSpot || payload.data?.[0] || null,
    results: payload.data || [],
  };
}
