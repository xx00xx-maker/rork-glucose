import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import {
  userData as defaultUserData,
  streaksData as defaultStreaks,
  dailyChallenges as defaultChallenges,
  badges as defaultBadges,
  currentStatus as defaultStatus,
  hourlyData,
  weeklyReport,
  timelineData,
  cumulativeStats,
  getLevelInfo,
} from '@/constants/mockData';

interface UserData {
  name: string;
  plan: 'free' | 'premium';
  level: number;
  title: string;
  xp: number;
  xpToNextLevel: number;
  totalXpForNextLevel: number;
  coins: number;
  targetGlucoseRange: { min: number; max: number };
  targetSteps: number;
  hasAppleWatch: boolean;
}

interface Challenge {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  xp: number;
  iconType: string;
  progress?: number;
  target?: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  iconType: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showBadgeUnlock, setShowBadgeUnlock] = useState<Badge | null>(null);
  const [showMissionComplete, setShowMissionComplete] = useState<Challenge | null>(null);

  const onboardingQuery = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('hasCompletedOnboarding');
      return stored === 'true';
    },
  });

  const userQuery = useQuery({
    queryKey: ['userData'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        return JSON.parse(stored) as UserData;
      }
      return defaultUserData;
    },
  });

  const challengesQuery = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      return defaultChallenges;
    },
  });

  const badgesQuery = useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      return defaultBadges;
    },
  });

  useEffect(() => {
    if (onboardingQuery.data !== undefined) {
      setHasCompletedOnboarding(onboardingQuery.data);
    }
  }, [onboardingQuery.data]);

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      return true;
    },
    onSuccess: () => {
      setHasCompletedOnboarding(true);
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (updates: Partial<UserData>) => {
      const current = userQuery.data || defaultUserData;
      const updated = { ...current, ...updates };
      await AsyncStorage.setItem('userData', JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userData'], data);
    },
  });

  const addXpMutation = useMutation({
    mutationFn: async (amount: number) => {
      const current = userQuery.data || defaultUserData;
      let newXp = current.xp + amount;
      let newLevel = current.level;
      let newXpToNext = current.xpToNextLevel - amount;
      
      if (newXpToNext <= 0) {
        newLevel += 1;
        newXpToNext = 300 + (newLevel * 50);
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
      }
      
      const updated = {
        ...current,
        xp: newXp,
        level: newLevel,
        xpToNextLevel: newXpToNext,
        title: getLevelInfo(newLevel).title,
      };
      
      await AsyncStorage.setItem('userData', JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userData'], data);
    },
  });

  const { mutate: addXpMutate } = addXpMutation;

  const completeChallenge = useCallback((challengeId: number) => {
    const challenge = challengesQuery.data?.find(c => c.id === challengeId);
    if (challenge && !challenge.completed) {
      setShowMissionComplete(challenge);
      setTimeout(() => setShowMissionComplete(null), 2500);
      addXpMutate(challenge.xp);
    }
  }, [challengesQuery.data, addXpMutate]);

  return {
    user: userQuery.data || defaultUserData,
    isLoading: userQuery.isLoading || onboardingQuery.isLoading,
    hasCompletedOnboarding,
    completeOnboarding: () => completeOnboardingMutation.mutate(),
    updateUser: (updates: Partial<UserData>) => updateUserMutation.mutate(updates),
    addXp: (amount: number) => addXpMutation.mutate(amount),
    
    challenges: challengesQuery.data || defaultChallenges,
    completeChallenge,
    
    badges: badgesQuery.data || defaultBadges,
    unlockedBadges: (badgesQuery.data || defaultBadges).filter(b => b.unlocked),
    
    streaks: defaultStreaks,
    currentStatus: defaultStatus,
    hourlyData,
    weeklyReport,
    timelineData,
    cumulativeStats,
    
    showLevelUp,
    setShowLevelUp,
    showBadgeUnlock,
    setShowBadgeUnlock,
    showMissionComplete,
    setShowMissionComplete,
  };
});
