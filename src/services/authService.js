// src/services/authService.js
// Firebase Authentication service – wraps phone OTP + Google sign-in

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail,
  RecaptchaVerifier,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile, getUserProfile } from './firestore';

// ─── Google Provider ──────────────────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ─── Auth State Listener ──────────────────────────────────────────────────────
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

// ─── Email / Password ─────────────────────────────────────────────────────────

/**
 * Register a new user with email, password, and full name.
 */
export async function registerWithEmail(email, password, fullName, phone) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  await updateProfile(user, { displayName: fullName });
  await createUserProfile(user.uid, { fullName, phone, email });

  return user;
}

/**
 * Sign in with email & password.
 */
export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Sign in with Google.
 * Creates a Firestore profile if it doesn't exist yet.
 */
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  const existing = await getUserProfile(user.uid);
  if (!existing) {
    await createUserProfile(user.uid, {
      fullName: user.displayName || '',
      phone: user.phoneNumber || '',
      email: user.email || '',
    });
  }
  return user;
}

/**
 * Send OTP to phone number.
 * @param {string} phoneNumber  - E.164 format, e.g. "+972501234567"
 * @param {string} containerId  - DOM id for the invisible reCAPTCHA element
 */
export async function sendPhoneOtp(phoneNumber, containerId = 'recaptcha-container') {
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
  });
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  return confirmationResult; // call confirmationResult.confirm(otp) next
}

export async function confirmPhoneOtp(confirmationResult, otp) {
  const credential = await confirmationResult.confirm(otp);
  const user = credential.user;

  const existing = await getUserProfile(user.uid);
  if (!existing) {
    await createUserProfile(user.uid, {
      fullName: '',
      phone: user.phoneNumber || '',
      email: '',
    });
  }
  return user;
}

export async function logout() {
  await signOut(auth);
}

export async function requestPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function deleteAccount() {
  const user = auth.currentUser;
  if (user) await deleteUser(user);
}
