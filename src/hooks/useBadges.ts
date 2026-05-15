import { useCallback, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import type { BadgeAward, HabitWithProgress } from '../types/habit';
import { computeEligibleBadgeIds } from '../utils/badgeEligibility';

const formatEarnedAt = (value: unknown) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  }

  return String(value);
};

export function useBadges(habits: HabitWithProgress[]) {
  const { user } = useAuth();
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'badges'),
      (snapshot) => {
        setAwards(
          snapshot.docs
            .map((awardDoc) => {
              const data = awardDoc.data();
              return {
                id: awardDoc.id,
                badgeId: String(data.badgeId ?? awardDoc.id),
                earnedAt: formatEarnedAt(data.earnedAt),
              };
            })
            .sort((left, right) => right.earnedAt.localeCompare(left.earnedAt)),
        );
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  const syncEligibleBadges = useCallback(async () => {
    if (!user) {
      return;
    }

    const earnedIds = new Set(awards.map((award) => award.badgeId));
    const eligibleIds = computeEligibleBadgeIds(habits);

    await Promise.all(
      Array.from(eligibleIds)
        .filter((badgeId) => !earnedIds.has(badgeId))
        .map((badgeId) =>
          setDoc(
            doc(db, 'users', user.uid, 'badges', badgeId),
            {
              badgeId,
              userId: user.uid,
              earnedAt: serverTimestamp(),
            },
            { merge: true },
          ),
        ),
    );
  }, [awards, habits, user]);

  useEffect(() => {
    if (!user || loading) {
      return;
    }

    void syncEligibleBadges();
  }, [habits, loading, syncEligibleBadges, user]);

  const earnedBadgeIds = new Set(awards.map((award) => award.badgeId));

  return {
    awards,
    earnedBadgeIds,
    error,
    loading: user ? loading : false,
  };
}
