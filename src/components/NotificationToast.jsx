import { useState, useEffect } from 'react';
import { subscribeToLocalNotifications } from '../services/notificationsService';

export default function NotificationToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    return subscribeToLocalNotifications((n) => {
      setToast(n);
      setTimeout(() => setToast(null), 4000);
    });
  }, []);
  if (!toast) return null;
  return (
    <div style={{ position: 'fixed', top: 20, right: '50%', transform: 'translateX(50%)', background: 'rgba(15,23,42,0.95)', color: '#fff', padding: '14px 24px', borderRadius: 12, zIndex: 9999, fontFamily: "'Heebo', sans-serif", boxShadow: '0 4px 20px rgba(0,0,0,0.5)', direction: 'rtl', whiteSpace: 'nowrap' }}>
      <strong>{toast.title}</strong> — {toast.body}
    </div>
  );
}