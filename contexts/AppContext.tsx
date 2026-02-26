import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  userData as defaultUserData,
  badges as defaultBadges,
  currentStatus as defaultStatus,
  hourlyData as defaultHourlyData,
  timelineData,
  cumulativeStats as defaultCumulativeStats,
  getLevelInfo,
} from '@/constants/mockData';
import { initHealthKit, fetchHealthKitData, fetchTodaySteps } from '@/app/services/report/healthkit';
import { checkSubscriptionStatus } from '@/app/utils/revenueCat';
import { calculateStreaks, incrementMealCount, decrementMealCount, getMealCountForDate, loadMealCounts, loadStreakData, updateCumulativeSteps, incrementSpikeReduced, loadSpikeReduced, loadCumulativeMeals } from '@/app/services/streakCalculator';
import { getPreMealGlucose, fetchPostMealGlucose, fetchPostMealSteps, generateInsight, analyzeMealTrend, calculateSpikeReduction } from '@/app/services/mealInsightService';
import { scheduleExerciseReminder } from '@/app/services/notificationService';

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

export interface DailyData {
  date: string; // YYYY-MM-DD
  label: string; // 今日/昨日/一昨日
  hourlyData: Array<{ hour: string; glucose: number; steps: number; heartRate?: number }>;
  steps: number;
  tir: number;
  mealsRecorded: number;
  latestGlucose: { value: number; trend: string; updatedAt: string } | null;
}

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showBadgeUnlock, setShowBadgeUnlock] = useState<Badge | null>(null);
  const [showMissionComplete, setShowMissionComplete] = useState<Challenge | null>(null);
  const [timeline, setTimeline] = useState<any[]>([
    {
      id: 'sample_1',
      date: new Date().toISOString().split('T')[0],
      time: '12:30',
      photo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
      mealType: 'lunch',
      glucoseBefore: 98,
      glucoseAfter: 135,
      stepsAfter: 650,
      spikeReduction: 15,
      xpEarned: 30,
      insight: '食後20分のウォーキングで血糖値上昇が緩やかになりました。ナイスアクション！',
    }
  ]);

  // timeline変更時にAsyncStorageへ保存（バックグラウンドタスクでも読めるように）
  useEffect(() => {
    AsyncStorage.setItem('timeline_data', JSON.stringify(timeline)).catch(e =>
      console.warn('[AppContext] Failed to save timeline:', e)
    );
  }, [timeline]);

  // Challenges and streaks - start with initial values, update from real data
  const [challenges, setChallenges] = useState<Challenge[]>([
    { id: 1, title: "朝の記録", description: "朝食を記録する", completed: false, xp: 10, iconType: "camera" as const },
    { id: 2, title: "昼食後ウォーク", description: "昼食後30分以内に500歩", completed: false, xp: 30, iconType: "footprints" as const },
    { id: 3, title: "6,000歩達成", description: "今日の目標歩数を達成", completed: false, xp: 20, iconType: "target" as const, progress: 0, target: 6000 },
  ]);
  const [streaks, setStreaks] = useState({
    steps: 0,
    stability: 0,
    recording: 0,
    longestEver: 0,
  });



  // Real HealthKit data state - start with zeros, not mock data
  const [currentStatus, setCurrentStatus] = useState({
    bloodGlucose: { value: 0, trend: 'stable' as const, updatedAt: '--:--' },
    heartRate: 0,
    todaySteps: 0,
    todayTIR: 0,
    mealsRecorded: 0,
  });
  const [hourlyData, setHourlyData] = useState<typeof defaultHourlyData>([]);
  const [cumulativeStats, setCumulativeStats] = useState(defaultCumulativeStats);
  const [healthKitInitialized, setHealthKitInitialized] = useState(false);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [weeklyReportData, setWeeklyReportData] = useState({
    activeDayAvgGlucose: 0,
    inactiveDayAvgGlucose: 0,
    stressHighAvgGlucose: 0,
    stressLowAvgGlucose: 0,
    optimalHeartRateRange: "--",
    missionsCompleted: 0,
    totalMissions: 0,
    xpEarned: 0,
    coinsEarned: 0,
    newBadges: 0,
    tir: 0,
    tirChange: 0,
    postMealWalks: 0,
    totalMeals: 0,
    walkingSpike: 0,
    noWalkSpike: 0,
  });

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
        const parsed = JSON.parse(stored) as UserData;
        // マイグレーション: 旧モックデータ（level:12, coins:1250）が保存されていたらリセット
        // ユーザーのtargetGlucoseRange/targetSteps設定は保持する
        const hasMockData = parsed.level === 12 && parsed.coins === 1250;
        if (hasMockData) {
          const migrated: UserData = {
            ...defaultUserData,
            plan: parsed.plan, // 購入情報は保持
            targetGlucoseRange: parsed.targetGlucoseRange || defaultUserData.targetGlucoseRange,
            targetSteps: parsed.targetSteps || defaultUserData.targetSteps,
          };
          await AsyncStorage.setItem('userData', JSON.stringify(migrated));
          // バッジのモックデータもリセット
          await AsyncStorage.removeItem('badge_unlocks');
          console.log('[AppContext] Migration: reset mock userData & badges to real defaults');
          return migrated;
        }
        return parsed;
      }
      return defaultUserData;
    },
  });


  const badgesQuery = useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem('badge_unlocks');
        const unlockedIds: string[] = stored ? JSON.parse(stored) : [];
        return defaultBadges.map(b => ({
          ...b,
          unlocked: unlockedIds.includes(b.id),
          unlockedAt: unlockedIds.includes(b.id) ? ((b as any).unlockedAt || new Date().toISOString().split('T')[0]) : undefined,
        }));
      } catch {
        return defaultBadges;
      }
    },
  });

  useEffect(() => {
    if (onboardingQuery.data !== undefined) {
      setHasCompletedOnboarding(onboardingQuery.data);
    }
  }, [onboardingQuery.data]);

  // Check subscription status on launch
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const isPremium = await checkSubscriptionStatus();
        const current = userQuery.data || defaultUserData;
        if (isPremium && current.plan !== 'premium') {
          updateUserMutation.mutate({ plan: 'premium' });
        } else if (!isPremium && current.plan === 'premium') {
          // User is not premium according to RevenueCat, downgrade
          updateUserMutation.mutate({ plan: 'free' });
        }
      } catch (e) {
        // RevenueCat not available (no API key or module missing)
        // Force downgrade to free since we can't verify subscription
        const current = userQuery.data || defaultUserData;
        if (current.plan === 'premium') {
          console.log('[AppContext] RevenueCat unavailable, resetting plan to free');
          updateUserMutation.mutate({ plan: 'free' });
        }
      }
    };
    checkSubscription();
  }, [userQuery.data]);

  // Initialize HealthKit and load real health data
  useEffect(() => {
    const loadHealthKitData = async () => {
      try {
        const initialized = await initHealthKit();
        setHealthKitInitialized(initialized);

        if (!initialized) {
          console.log('[AppContext] HealthKit not initialized, using default data');
          return;
        }

        console.log('[AppContext] HealthKit initialized, fetching data...');

        const healthData = await fetchHealthKitData(7); // Last 7 days

        console.log(`[AppContext] HealthKit data: ${healthData.bloodGlucose.length} glucose, ${healthData.steps.length} steps, ${healthData.heartRate.length} heartRate`);

        // Get latest heart rate
        const latestHR = healthData.heartRate.length > 0
          ? healthData.heartRate[healthData.heartRate.length - 1].bpm
          : 0;

        // Get today's steps directly using getStepCount (more reliable than filtering getDailyStepCountSamples)
        const todaySteps = await fetchTodaySteps();
        console.log(`[AppContext] Today steps from getStepCount: ${todaySteps}`);

        // Get latest blood glucose reading
        const latestGlucose = healthData.bloodGlucose.length > 0
          ? healthData.bloodGlucose[healthData.bloodGlucose.length - 1]
          : null;

        // Build hourlyData from today's glucose readings
        const todayStr = new Date().toISOString().split('T')[0];
        const todayGlucoseReadings = healthData.bloodGlucose.filter(
          (g: any) => g.timestamp?.startsWith(todayStr)
        );
        if (todayGlucoseReadings.length > 0) {
          const targetMin = (userQuery.data || defaultUserData).targetGlucoseRange?.min || 70;
          const targetMax = (userQuery.data || defaultUserData).targetGlucoseRange?.max || 140;

          // Group by hour
          const hourlyMap: Record<string, { values: number[] }> = {};
          todayGlucoseReadings.forEach((g: any) => {
            const hour = new Date(g.timestamp).getHours();
            const key = `${hour}:00`;
            if (!hourlyMap[key]) hourlyMap[key] = { values: [] };
            hourlyMap[key].values.push(g.value);
          });

          const newHourlyData = Object.entries(hourlyMap)
            .map(([time, data]) => ({
              hour: time,
              glucose: Math.round(data.values.reduce((a, b) => a + b, 0) / data.values.length),
              steps: 0,
              heartRate: 0,
            }))
            .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

          if (newHourlyData.length > 0) {
            setHourlyData(newHourlyData);
          }

          // Calculate TIR (Time in Range) from today's readings
          const inRangeCount = todayGlucoseReadings.filter(
            (g: any) => g.value >= targetMin && g.value <= targetMax
          ).length;
          const todayTIR = Math.round((inRangeCount / todayGlucoseReadings.length) * 100);

          setCurrentStatus(prev => ({
            ...prev,
            todaySteps: todaySteps,
            todayTIR: todayTIR,
            heartRate: latestHR,
            bloodGlucose: latestGlucose
              ? {
                value: Math.round(latestGlucose.value),
                trend: prev.bloodGlucose.trend,
                updatedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
              }
              : prev.bloodGlucose,
          }));
        } else {
          // No glucose data today - clear hourly chart and update steps
          setHourlyData([]);
          setCurrentStatus(prev => ({
            ...prev,
            todaySteps: todaySteps,
            heartRate: latestHR,
            bloodGlucose: latestGlucose
              ? {
                value: Math.round(latestGlucose.value),
                trend: prev.bloodGlucose.trend,
                updatedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
              }
              : prev.bloodGlucose,
          }));
        }

        // Update cumulative steps using persistent tracker
        const cumulativeTotal = await updateCumulativeSteps(todaySteps);
        // Load real spike reduction count from storage
        const spikeReducedCount = await loadSpikeReduced();
        setCumulativeStats(prev => ({
          ...prev,
          totalSteps: cumulativeTotal,
          spikesReduced: spikeReducedCount,
        }));

        // Update challenges with real step data
        const userTarget = (userQuery.data || defaultUserData).targetSteps || 6000;
        setChallenges(prev => prev.map(c => {
          if (c.id === 3) {
            // Update step challenge progress
            return {
              ...c,
              progress: todaySteps,
              target: userTarget,
              completed: todaySteps >= userTarget,
              title: `${userTarget.toLocaleString()}歩達成`,
              description: `今日の目標歩数を達成`,
            };
          }
          return c;
        }));

        console.log('[AppContext] HealthKit data loaded:', { todaySteps, cumulativeTotal, latestGlucose });

        // Build 3-day daily data for swipeable view
        const targetMin = (userQuery.data || defaultUserData).targetGlucoseRange?.min || 70;
        const targetMax = (userQuery.data || defaultUserData).targetGlucoseRange?.max || 140;
        const labels = ['今日', '昨日', '一昨日'];
        const threeDayData: DailyData[] = [];

        // Debug: log step data structure
        if (healthData.steps.length > 0) {
          console.log('[AppContext] Step data sample:', JSON.stringify(healthData.steps.slice(0, 2)));
        }

        for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
          const d = new Date();
          d.setDate(d.getDate() - dayOffset);
          // Use local timezone (not UTC from toISOString) for correct matching with HealthKit dates
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

          // Filter glucose readings for this day
          const dayGlucose = healthData.bloodGlucose.filter(
            (g: any) => g.timestamp?.startsWith(dateStr)
          );

          // Build hourly chart data
          const hourlyMap: Record<string, { values: number[] }> = {};
          dayGlucose.forEach((g: any) => {
            const hour = new Date(g.timestamp).getHours();
            const key = `${hour}:00`;
            if (!hourlyMap[key]) hourlyMap[key] = { values: [] };
            hourlyMap[key].values.push(g.value);
          });
          const dayHourly = Object.entries(hourlyMap)
            .map(([time, data]) => ({
              hour: time,
              glucose: Math.round(data.values.reduce((a, b) => a + b, 0) / data.values.length),
              steps: 0,
              heartRate: 0,
            }))
            .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

          // Filter step data for this day using string matching (avoid Date parsing RangeError)
          const dayStepData = healthData.steps.filter((s: any) => {
            const raw = s.startTime || s.date || s.startDate || '';
            // raw can be ISO string like "2026-02-12T00:00:00.000+0900" or "2026-02-12"
            return typeof raw === 'string' && raw.includes(dateStr);
          });
          const daySteps = dayOffset === 0 ? todaySteps : dayStepData.reduce((sum: number, s: any) => sum + (s.count || s.value || 0), 0);
          console.log(`[AppContext] Day ${labels[dayOffset]} (${dateStr}): ${dayStepData.length} step records, total=${daySteps}`);

          // TIR
          const inRange = dayGlucose.filter((g: any) => g.value >= targetMin && g.value <= targetMax).length;
          const dayTIR = dayGlucose.length > 0 ? Math.round((inRange / dayGlucose.length) * 100) : 0;

          // Latest glucose for this day
          const dayLatest = dayGlucose.length > 0 ? dayGlucose[dayGlucose.length - 1] : null;

          threeDayData.push({
            date: dateStr,
            label: labels[dayOffset],
            hourlyData: dayHourly,
            steps: daySteps,
            tir: dayTIR,
            mealsRecorded: 0, // Will be updated below
            latestGlucose: dayLatest
              ? { value: Math.round(dayLatest.value), trend: 'stable', updatedAt: new Date(dayLatest.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) }
              : null,
          });
        }

        // Load meal counts and update dailyData + currentStatus
        const mealCounts = await loadMealCounts();
        const todayDateStr = threeDayData[0]?.date || '';
        const todayMeals = mealCounts[todayDateStr] || 0;
        for (const dayData of threeDayData) {
          dayData.mealsRecorded = mealCounts[dayData.date] || 0;
        }
        setCurrentStatus(prev => ({ ...prev, mealsRecorded: todayMeals }));
        setDailyData(threeDayData);

        // Calculate streaks
        const dailyStepsForStreak: { date: string; steps: number }[] = [];
        const dailyTIRForStreak: { date: string; tir: number; hasData: boolean }[] = [];
        for (let i = 0; i < 7; i++) {
          const sd = new Date();
          sd.setDate(sd.getDate() - i);
          const sDateStr = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`;
          const sStepData = healthData.steps.filter((s: any) => {
            const raw = s.startTime || s.date || s.startDate || '';
            return typeof raw === 'string' && raw.includes(sDateStr);
          });
          const sDaySteps = i === 0 ? todaySteps : sStepData.reduce((sum: number, s: any) => sum + (s.count || s.value || 0), 0);
          dailyStepsForStreak.push({ date: sDateStr, steps: sDaySteps });

          const sGlucose = healthData.bloodGlucose.filter((g: any) => g.timestamp?.startsWith(sDateStr));
          const sInRange = sGlucose.filter((g: any) => g.value >= targetMin && g.value <= targetMax).length;
          const sTIR = sGlucose.length > 0 ? Math.round((sInRange / sGlucose.length) * 100) : 0;
          dailyTIRForStreak.push({ date: sDateStr, tir: sTIR, hasData: sGlucose.length > 0 });
        }

        try {
          const streakResult = await calculateStreaks(dailyStepsForStreak, dailyTIRForStreak, userTarget);
          setStreaks(streakResult);
          setCumulativeStats(prev => ({
            ...prev,
            longestStreak: Math.max(streakResult.steps, streakResult.stability, streakResult.recording),
          }));
          // Load persistent cumulative meal count (not affected by 90-day cleanup)
          const cumulativeMealTotal = await loadCumulativeMeals();
          // If cumulative counter is 0 but daily counts exist, migrate
          const dailyTotal = Object.values(mealCounts).reduce((sum, c) => sum + c, 0);
          if (cumulativeMealTotal === 0 && dailyTotal > 0) {
            await AsyncStorage.setItem('cumulative_total_meals', String(dailyTotal));
            setCumulativeStats(prev => ({ ...prev, totalMeals: dailyTotal }));
          } else {
            setCumulativeStats(prev => ({ ...prev, totalMeals: cumulativeMealTotal }));
          }
          console.log('[AppContext] Streaks calculated:', streakResult);
        } catch (e) {
          console.warn('[AppContext] Streak calculation failed:', e);
        }

        // Evaluate badges
        try {
          const storedBadges = await AsyncStorage.getItem('badge_unlocks');
          const unlockedIds: Set<string> = new Set(storedBadges ? JSON.parse(storedBadges) : []);

          // Badge conditions based on real data
          const totalMealCount = Object.values(mealCounts).reduce((sum, c) => sum + c, 0);
          const streakResult = await loadStreakData();

          // first_walk: any timeline entry with stepsAfter >= 500
          if (timeline.some((t: any) => (t.stepsAfter || 0) >= 500)) unlockedIds.add('first_walk');
          // streak_7, streak_30, streak_100
          if (streakResult.longestEver >= 7) unlockedIds.add('streak_7');
          if (streakResult.longestEver >= 30) unlockedIds.add('streak_30');
          if (streakResult.longestEver >= 100) unlockedIds.add('streak_100');
          // stable_star: any day with TIR >= 80%
          if (dailyTIRForStreak.some(d => d.hasData && d.tir >= 80)) unlockedIds.add('stable_star');
          // recording_mania: 100+ meals
          if (totalMealCount >= 100) unlockedIds.add('recording_mania');
          // ten_thousand: any day with 10000+ steps
          if (dailyStepsForStreak.some(d => d.steps >= 10000)) unlockedIds.add('ten_thousand');

          await AsyncStorage.setItem('badge_unlocks', JSON.stringify([...unlockedIds]));
          queryClient.invalidateQueries({ queryKey: ['badges'] });
          console.log('[AppContext] Badges unlocked:', [...unlockedIds]);
        } catch (e) {
          console.warn('[AppContext] Badge evaluation failed:', e);
        }

        // Generate weekly report from real data
        const weekGlucose = healthData.bloodGlucose;
        const weekSteps = dailyStepsForStreak;
        const avgGlucose = weekGlucose.length > 0
          ? Math.round(weekGlucose.reduce((sum: number, g: any) => sum + g.value, 0) / weekGlucose.length)
          : 0;
        const weekInRange = weekGlucose.filter((g: any) => g.value >= targetMin && g.value <= targetMax).length;
        const weekTIR = weekGlucose.length > 0 ? Math.round((weekInRange / weekGlucose.length) * 100) : 0;
        const activeDays = weekSteps.filter(d => d.steps >= userTarget);
        const inactiveDays = weekSteps.filter(d => d.steps < userTarget);
        const activeDayAvg = activeDays.length > 0
          ? Math.round(weekGlucose.filter((g: any) => activeDays.some(ad => g.timestamp?.startsWith(ad.date))).reduce((sum: number, g: any) => sum + g.value, 0) / Math.max(1, weekGlucose.filter((g: any) => activeDays.some(ad => g.timestamp?.startsWith(ad.date))).length))
          : 0;
        const inactiveDayAvg = inactiveDays.length > 0
          ? Math.round(weekGlucose.filter((g: any) => inactiveDays.some(id => g.timestamp?.startsWith(id.date))).reduce((sum: number, g: any) => sum + g.value, 0) / Math.max(1, weekGlucose.filter((g: any) => inactiveDays.some(id => g.timestamp?.startsWith(id.date))).length))
          : 0;
        const totalMealCountForWeek = Object.entries(mealCounts)
          .filter(([date]) => weekSteps.some(s => s.date === date))
          .reduce((sum, [, c]) => sum + c, 0);

        // Calculate walkingSpike / noWalkSpike from timeline data
        // walkingSpike: walked 500+ steps AND glucose rise stayed within +30 mg/dL (spike suppressed)
        // noWalkSpike: walked < 500 steps AND glucose rose more than +30 mg/dL (spike not suppressed)
        const walkedEntries = timeline.filter((t: any) => (t.stepsAfter || 0) >= 500 && t.glucoseBefore && t.glucoseAfter);
        const noWalkEntries = timeline.filter((t: any) => (t.stepsAfter || 0) < 500 && t.glucoseBefore && t.glucoseAfter);
        const walkingSpikeAvg = walkedEntries.length > 0
          ? Math.round(walkedEntries.reduce((sum: number, t: any) => sum + Math.max(0, t.glucoseAfter - t.glucoseBefore), 0) / walkedEntries.length)
          : 0;
        const noWalkSpikeAvg = noWalkEntries.length > 0
          ? Math.round(noWalkEntries.reduce((sum: number, t: any) => sum + Math.max(0, t.glucoseAfter - t.glucoseBefore), 0) / noWalkEntries.length)
          : 0;

        setWeeklyReportData({
          activeDayAvgGlucose: activeDayAvg,
          inactiveDayAvgGlucose: inactiveDayAvg,
          stressHighAvgGlucose: 0,
          stressLowAvgGlucose: 0,
          optimalHeartRateRange: healthData.heartRate.length > 0 ? `${Math.min(...healthData.heartRate.map(h => h.bpm))}-${Math.max(...healthData.heartRate.map(h => h.bpm))}` : '--',
          missionsCompleted: challenges.filter(c => c.completed).length,
          totalMissions: challenges.length * 7,
          xpEarned: 0,
          coinsEarned: 0,
          newBadges: 0,
          tir: weekTIR,
          tirChange: 0,
          postMealWalks: timeline.filter((t: any) => (t.stepsAfter || 0) >= 500).length,
          totalMeals: totalMealCountForWeek,
          walkingSpike: walkingSpikeAvg,
          noWalkSpike: noWalkSpikeAvg,
        });

        console.log('[AppContext] Weekly report generated with TIR:', weekTIR, 'avgGlucose:', avgGlucose);
      } catch (error) {
        console.error('[AppContext] Error loading HealthKit data:', error);
      }
    };

    loadHealthKitData();
  }, []);

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
    const challenge = challenges.find(c => c.id === challengeId);
    if (challenge && !challenge.completed) {
      setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, completed: true } : c));
      setShowMissionComplete(challenge);
      setTimeout(() => setShowMissionComplete(null), 2500);
      addXpMutate(challenge.xp);
    }
  }, [challenges, addXpMutate]);

  // タイムラインエントリを更新する関数
  const updateTimelineEntry = useCallback((entryId: string, updates: Partial<{
    glucoseAfter: number;
    stepsAfter: number;
    spikeReduction: number;
    insight: string;
  }>) => {
    setTimeline(prev => prev.map(entry =>
      entry.id === entryId ? { ...entry, ...updates } : entry
    ));
  }, []);

  // 食後の遅延データ取得をスケジュール
  const schedulePostMealUpdates = useCallback((entryId: string, mealTime: Date, mealType: string, glucoseBefore: number) => {
    const mealLabels: Record<string, string> = {
      breakfast: '朝食',
      lunch: '昼食',
      dinner: '夕食',
      snack: '間食',
    };
    const mealLabel = mealLabels[mealType] || '食事';

    // 30分後: 食後歩数を取得
    const THIRTY_MINUTES = 30 * 60 * 1000;
    setTimeout(async () => {
      try {
        const steps = await fetchPostMealSteps(mealTime);
        console.log(`[PostMeal] 30min update - steps: ${steps}`);

        // 暫定インサイトを歩数ベースで更新
        let insight = `${mealLabel}を記録しました`;
        if (steps >= 500) {
          insight = `食後${steps.toLocaleString()}歩！血糖値データを待っています...`;
        } else if (steps > 0) {
          insight = `食後${steps}歩。もう少し歩くと効果的です`;
        }

        setTimeline(prev => prev.map(entry =>
          entry.id === entryId ? { ...entry, stepsAfter: steps, insight } : entry
        ));
      } catch (e) {
        console.warn('[PostMeal] 30min update failed:', e);
      }
    }, THIRTY_MINUTES);

    // 2時間後: 食後血糖値を取得 + 最終インサイト生成
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    setTimeout(async () => {
      try {
        const [glucoseAfter, steps] = await Promise.all([
          fetchPostMealGlucose(mealTime),
          fetchPostMealSteps(mealTime),
        ]);

        const ga = glucoseAfter || 0;
        const sa = steps || 0;

        // 傾向分析
        setTimeline(prev => {
          const trendData = analyzeMealTrend(prev as any, mealType, entryId);
          const insight = generateInsight(glucoseBefore, ga, sa, mealLabel, trendData);
          const spikeReduction = calculateSpikeReduction(glucoseBefore, ga, sa);

          // XP計算: ベース10 + 歩行ボーナス
          let xpEarned = 10;
          if (sa >= 500 && ga > 0 && glucoseBefore > 0 && (ga - glucoseBefore) <= 30) {
            xpEarned = 30; // スパイク抑制成功ボーナス
          } else if (sa >= 500) {
            xpEarned = 20; // 歩行ボーナス
          }

          // スパイク抑制カウントを更新
          if (ga > 0) {
            incrementSpikeReduced(sa, glucoseBefore, ga).then(count => {
              setCumulativeStats(p => ({ ...p, spikesReduced: count }));
            });
          }

          return prev.map(entry =>
            entry.id === entryId
              ? { ...entry, glucoseAfter: ga || entry.glucoseAfter, stepsAfter: sa, spikeReduction, insight, xpEarned }
              : entry
          );
        });

        console.log(`[PostMeal] 2hr update - glucose: ${ga}, steps: ${sa}`);
      } catch (e) {
        console.warn('[PostMeal] 2hr update failed:', e);
      }
    }, TWO_HOURS);
  }, []);

  const addTimelineEntry = useCallback(async (entry: {
    photo: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    date?: string;
    time?: string;
    glucoseBefore?: number;
    glucoseAfter?: number;
    stepsAfter?: number;
  }) => {
    const now = new Date();
    const mealLabels: Record<string, string> = {
      breakfast: '朝食',
      lunch: '昼食',
      dinner: '夕食',
      snack: '間食',
    };
    const mealType = entry.mealType || 'lunch';
    const mealLabel = mealLabels[mealType] || '食事';

    // HealthKitから食前血糖値を取得（取れなければcurrentStatusの値を使用）
    let glucoseBefore = entry.glucoseBefore || 0;
    if (!glucoseBefore) {
      const hkGlucose = await getPreMealGlucose();
      if (hkGlucose) {
        glucoseBefore = hkGlucose;
      } else if (currentStatus.bloodGlucose.value > 0) {
        glucoseBefore = currentStatus.bloodGlucose.value;
      }
    }

    const entryId = `user_${Date.now()}`;
    const initialInsight = glucoseBefore > 0
      ? `${mealLabel}を記録（食前: ${glucoseBefore}mg/dL）。食後データを自動取得します`
      : `${mealLabel}を記録しました。データが集まるとアドバイスが表示されます`;

    const newEntry = {
      id: entryId,
      date: entry.date || now.toISOString().split('T')[0],
      time: entry.time || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      photo: entry.photo,
      mealType: mealType,
      glucoseBefore: glucoseBefore,
      glucoseAfter: entry.glucoseAfter || 0,
      stepsAfter: entry.stepsAfter || 0,
      spikeReduction: 0,
      xpEarned: 10,
      insight: initialInsight,
    };
    setTimeline(prev => [newEntry, ...prev]);

    // 食後データの遅延取得をスケジュール（血糖値データがある場合のみ）
    if (glucoseBefore > 0 && !entry.glucoseAfter) {
      schedulePostMealUpdates(entryId, now, mealType, glucoseBefore);
    }

    // Increment meal count and update status
    // エントリの日付を YYYY-MM-DD 形式に正規化して渡す
    const entryDateNormalized = newEntry.date.replace(/\//g, '-');
    incrementMealCount(entryDateNormalized).then(count => {
      setCurrentStatus(prev => ({ ...prev, mealsRecorded: count }));
      setDailyData(prev => prev.map((d, i) => i === 0 ? { ...d, mealsRecorded: count } : d));
    });

    // 食後運動リマインダーをスケジュール
    scheduleExerciseReminder().catch(e =>
      console.warn('[AppContext] Exercise reminder scheduling failed:', e)
    );

    // Check breakfast challenge (id: 1)
    if (mealType === 'breakfast') {
      const hour = now.getHours();
      if (hour >= 5 && hour < 10) {
        setChallenges(prev => prev.map(c => c.id === 1 ? { ...c, completed: true } : c));
      }
    }
  }, [currentStatus.bloodGlucose.value, schedulePostMealUpdates]);

  // Sync daily challenge with user target steps
  useEffect(() => {
    const userTarget = (userQuery.data || defaultUserData).targetSteps || 6000;
    const currentSteps = currentStatus.todaySteps;

    setChallenges(prev => prev.map(c => {
      if (c.id === 3) {
        return {
          ...c,
          title: `${userTarget.toLocaleString()}歩達成`,
          description: `今日の目標歩数を達成`,
          target: userTarget,
          progress: currentSteps,
          completed: currentSteps >= userTarget
        };
      }
      return c;
    }));
  }, [userQuery.data?.targetSteps, currentStatus.todaySteps]);

  return {
    user: userQuery.data || defaultUserData,
    isLoading: userQuery.isLoading || onboardingQuery.isLoading,
    hasCompletedOnboarding,
    completeOnboarding: () => completeOnboardingMutation.mutateAsync(),
    updateUser: (updates: Partial<UserData>) => updateUserMutation.mutate(updates),
    addXp: (amount: number) => addXpMutation.mutate(amount),

    challenges,
    completeChallenge,

    badges: badgesQuery.data || defaultBadges,
    unlockedBadges: (badgesQuery.data || defaultBadges).filter(b => b.unlocked),

    streaks,
    currentStatus,
    hourlyData,
    dailyData,
    weeklyReport: weeklyReportData,
    timelineData: [...timeline].sort((a, b) => {
      // Normalize date format: YYYY/MM/DD → YYYY-MM-DD for proper Date parsing
      const dateA = (a.date || '').replace(/\//g, '-');
      const dateB = (b.date || '').replace(/\//g, '-');
      const timeA = new Date(`${dateA}T${a.time || '00:00'}:00`).getTime();
      const timeB = new Date(`${dateB}T${b.time || '00:00'}:00`).getTime();
      return timeB - timeA; // newest first
    }),
    deleteTimelineEntry: useCallback(async (id: string) => {
      // 削除対象エントリの日付を取得
      setTimeline(prev => {
        const entry = prev.find(item => item.id === id);
        // 日付を YYYY-MM-DD 形式に正規化（YYYY/MM/DD → YYYY-MM-DD）
        const rawDate: string = entry?.date || new Date().toISOString().split('T')[0];
        const entryDate = rawDate.replace(/\//g, '-');

        // AsyncStorageのmeal countをデクリメントし、関連stateを更新
        decrementMealCount(entryDate).then(({ dateCount, totalCount }) => {
          setCurrentStatus(s => {
            const todayStr = new Date().toISOString().split('T')[0];
            if (entryDate === todayStr) {
              return { ...s, mealsRecorded: dateCount };
            }
            return s;
          });
          setDailyData(days => days.map(d =>
            d.date === entryDate ? { ...d, mealsRecorded: dateCount } : d
          ));
          setCumulativeStats(s => ({ ...s, totalMeals: totalCount }));
        });

        return prev.filter(item => item.id !== id);
      });
    }, []),
    addTimelineEntry,
    updateTimelineEntry,
    cumulativeStats,

    showLevelUp,
    setShowLevelUp,
    showBadgeUnlock,
    setShowBadgeUnlock,
    showMissionComplete,
    setShowMissionComplete,
  };
});
