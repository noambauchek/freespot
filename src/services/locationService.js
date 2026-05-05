// src/services/locationService.js
// Wrapper around the browser Geolocation API + Google Maps integration

// ─── Get Current Position (Promise) ──────────────────────────────────────────
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000, ...options }
    );
  });
}

// ─── Watch Position (continuous updates) ─────────────────────────────────────
export function watchPosition(callback, errorCallback, options = {}) {
  if (!navigator.geolocation) {
    errorCallback(new Error('Geolocation not supported'));
    return null;
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    errorCallback,
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000, ...options }
  );
  return id; // pass to clearWatch() to stop
}

export function clearWatch(watchId) {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
}

// ─── Haversine Distance (km) ──────────────────────────────────────────────────
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Open navigation in Google Maps / Waze ───────────────────────────────────

/**
 * Open Google Maps navigation to a coordinate.
 */
export function navigateWithGoogleMaps(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
}

/**
 * Open Waze navigation to a coordinate.
 */
export function navigateWithWaze(lat, lng) {
  window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
}

/**
 * Open Pango app (deep link) for parking payment.
 */
export function openPango() {
  window.open('https://www.pango.co.il', '_blank');
}

/**
 * Open Cellopark app for parking payment.
 */
export function openCellopark() {
  window.open('https://www.cellopark.co.il', '_blank');
}

// ─── Reverse Geocode (display address from lat/lng) ──────────────────────────
// Requires the Google Maps Geocoding API to be enabled in your GCP project.
export async function reverseGeocode(lat, lng, apiKey) {
  if (!apiKey) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=iw`
    );
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
  } catch (e) {
    console.error('Geocode error', e);
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
