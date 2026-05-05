import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useLeaderboard(limitCount = 20) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('points', 'desc'),
          limit(limitCount)
        );
        const snaps = await getDocs(q);
        const data = snaps.docs.map((d, i) => ({
          id: d.id,
          position: i + 1,
          ...d.data(),
        }));
        setLeaders(data);
      } catch (e) {
        console.error('Leaderboard error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [limitCount]);

  return { leaders, loading };
}