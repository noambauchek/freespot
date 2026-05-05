// src/services/notificationsService.js
// Firebase Cloud Messaging – request permission, get token, handle incoming messages

import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import { updateUserFcmToken, createAlert, ALERT_TYPE, NOTIFICATION_CHANNEL } from './firestore';

// ─── VAPID Key (Web Push) ────────────────────────────────────────────────────
// Replace with your actual VAPID key from Firebase Console →
// Project Settings → Cloud Messaging → Web configuration
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';

// ─── Request Permission & Get Token ─────────────────────────────────────────

export async function initPushNotifications(userId) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Permission denied');
      return null;
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token && userId) {
      await updateUserFcmToken(userId, token);
    }
    return token;
  } catch (err) {
    console.error('[FCM] Error getting token:', err);
    return null;
  }
}

// ─── Foreground Message Listener ─────────────────────────────────────────────

/**
 * Listen to FCM messages while the app is in the foreground.
 * @param {function} onReceive  - callback({title, body, data})
 */
export function listenToForegroundMessages(onReceive) {
  return onMessage(messaging, (payload) => {
    const { notification, data } = payload;
    if (onReceive) {
      onReceive({
        title: notification?.title || 'FreeSpot',
        body: notification?.body || '',
        data: data || {},
      });
    }
  });
}

// ─── Service Worker Registration ─────────────────────────────────────────────
// The firebase-messaging-sw.js file must be placed in the /public directory.
// See the generated public/firebase-messaging-sw.js file.

// ─── Store Alert in Firestore when received ──────────────────────────────────

export async function storeIncomingAlert(userId, spotId, alertType) {
  await createAlert(userId, spotId, alertType, NOTIFICATION_CHANNEL.PUSH);
}

// ─── Local Notification (in-app toast helper) ────────────────────────────────

const listeners = [];

export function subscribeToLocalNotifications(callback) {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export function emitLocalNotification(title, body, data = {}) {
  listeners.forEach(cb => cb({ title, body, data }));
}
