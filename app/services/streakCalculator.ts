import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_STORAGE_KEY = 'streak_data';
const MEAL_COUNT_KEY = 'daily_meal_counts';
const CUMULATIVE_MEALS_KEY = 'cumulative_total_meals';

interface StreakData {
  steps: number;
  stability: number;
  recording: number;
  longestEver: number;
  lastCalculated: string; // YYYY-MM-DD
}

interface DailyMealCounts {
  [date: string]: number; // YYYY-MM-DD -> count
}

/**
 * Get local date string YYYY-MM-DD
 */
function getLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Calculate streaks from HealthKit data and meal records.
 * 
 * - steps: consecutive days meeting targetSteps
 * - stability: consecutive days with TIR >= 70% (only days with glucose data)
 * - recording: consecutive days with at least 1 meal recorded
 */
export async function calculateStreaks(
  dailySteps: { date: string; steps: number }[],
  dailyTIR: { date: string; tir: number; hasData: boolean }[],
  targetSteps: number,
): Promise<StreakData> {
  const today = getLocalDateStr(new Date());

  // Load meal counts from storage
  const mealCounts = await loadMealCounts();

  // Build lookup maps
  const stepsMap = new Map(dailySteps.map(d => [d.date, d.steps]));
  const tirMap = new Map(dailyTIR.filter(d => d.hasData).map(d => [d.date, d.tir]));

  // Calculate each streak going backwards from today
  let stepsStreak = 0;
  let stabilityStreak = 0;
  let recordingStreak = 0;

  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateStr(d);

    // Steps streak
    if (i === stepsStreak) {
      const daySteps = stepsMap.get(dateStr) || 0;
      if (daySteps >= targetSteps) {
        stepsStreak++;
      }
    }

    // Stability streak (days with glucose data and TIR >= 70%)
    if (i === stabilityStreak) {
      const dayTIR = tirMap.get(dateStr);
      if (dayTIR !== undefined && dayTIR >= 70) {
        stabilityStreak++;
      }
      // No data or TIR too low -> streak breaks
    }

    // Recording streak
    if (i === recordingStreak) {
      const dayMeals = mealCounts[dateStr] || 0;
      if (dayMeals >= 1) {
        recordingStreak++;
      }
    }
  }

  // Load previous longest
  const prev = await loadStreakData();
  const longestEver = Math.max(prev.longestEver, stepsStreak, stabilityStreak, recordingStreak);

  const result: StreakData = {
    steps: stepsStreak,
    stability: stabilityStreak,
    recording: recordingStreak,
    longestEver,
    lastCalculated: today,
  };

  // Save
  await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(result));
  return result;
}

/**
 * Load stored streak data
 */
export async function loadStreakData(): Promise<StreakData> {
  try {
    const stored = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn('[Streaks] Failed to load:', e);
  }
  return { steps: 0, stability: 0, recording: 0, longestEver: 0, lastCalculated: '' };
}

/**
 * Increment meal count for today
 */
export async function incrementMealCount(dateStr?: string): Promise<number> {
  const targetDate = dateStr || getLocalDateStr(new Date());
  const counts = await loadMealCounts();
  counts[targetDate] = (counts[targetDate] || 0) + 1;

  // Keep only last 90 days to prevent unlimited growth (for streak calculation)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = getLocalDateStr(cutoff);
  const cleaned: DailyMealCounts = {};
  for (const [date, count] of Object.entries(counts)) {
    if (date >= cutoffStr) {
      cleaned[date] = count;
    }
  }

  await AsyncStorage.setItem(MEAL_COUNT_KEY, JSON.stringify(cleaned));

  // Increment persistent cumulative counter (never cleaned up)
  const cumTotal = await loadCumulativeMeals();
  await AsyncStorage.setItem(CUMULATIVE_MEALS_KEY, String(cumTotal + 1));

  return cleaned[targetDate] || 0;
}

/**
 * Decrement meal count for a specific date (minimum 0)
 * Returns the new total meal count across all dates
 */
export async function decrementMealCount(dateStr: string): Promise<{ dateCount: number; totalCount: number }> {
  const counts = await loadMealCounts();
  const current = counts[dateStr] || 0;
  counts[dateStr] = Math.max(0, current - 1);

  await AsyncStorage.setItem(MEAL_COUNT_KEY, JSON.stringify(counts));

  // Decrement persistent cumulative counter
  const cumTotal = await loadCumulativeMeals();
  const newCumTotal = Math.max(0, cumTotal - 1);
  await AsyncStorage.setItem(CUMULATIVE_MEALS_KEY, String(newCumTotal));

  return { dateCount: counts[dateStr], totalCount: newCumTotal };
}

/**
 * Get meal count for a specific date
 */
export async function getMealCountForDate(dateStr: string): Promise<number> {
  const counts = await loadMealCounts();
  return counts[dateStr] || 0;
}

/**
 * Load all meal counts
 */
export async function loadMealCounts(): Promise<DailyMealCounts> {
  try {
    const stored = await AsyncStorage.getItem(MEAL_COUNT_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn('[MealCounts] Failed to load:', e);
  }
  return {};
}

/**
 * Load persistent cumulative meal count (all-time, never cleaned up)
 */
export async function loadCumulativeMeals(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(CUMULATIVE_MEALS_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

const CUMULATIVE_STEPS_KEY = 'cumulative_total_steps';
const LAST_STEPS_DATE_KEY = 'last_steps_date';

/**
 * Update cumulative total steps.
 * Only adds today's steps once per day to avoid double-counting.
 */
export async function updateCumulativeSteps(todaySteps: number): Promise<number> {
  try {
    const today = getLocalDateStr(new Date());
    const lastDate = await AsyncStorage.getItem(LAST_STEPS_DATE_KEY);
    const storedTotal = await AsyncStorage.getItem(CUMULATIVE_STEPS_KEY);
    let total = storedTotal ? parseInt(storedTotal, 10) : 0;

    if (lastDate === today) {
      // Already counted today - replace today's contribution
      const lastTodaySteps = await AsyncStorage.getItem('last_today_steps');
      const prevToday = lastTodaySteps ? parseInt(lastTodaySteps, 10) : 0;
      total = total - prevToday + todaySteps;
    } else {
      // New day - add today's steps
      total += todaySteps;
      await AsyncStorage.setItem(LAST_STEPS_DATE_KEY, today);
    }

    await AsyncStorage.setItem(CUMULATIVE_STEPS_KEY, String(total));
    await AsyncStorage.setItem('last_today_steps', String(todaySteps));
    return total;
  } catch (e) {
    console.warn('[CumulativeSteps] Failed:', e);
    return todaySteps;
  }
}

/**
 * Load cumulative total steps
 */
export async function loadCumulativeSteps(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(CUMULATIVE_STEPS_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

const SPIKE_REDUCED_KEY = 'spike_reduced_count';

/**
 * Increment spike reduction count.
 * Called when a post-meal walk (>= 500 steps) helped reduce a glucose spike.
 * Condition: stepsAfter >= 500 AND glucoseAfter <= glucoseBefore + 30
 * (walking kept the post-meal rise minimal)
 */
export async function incrementSpikeReduced(
  stepsAfter: number,
  glucoseBefore: number,
  glucoseAfter: number,
): Promise<number> {
  // Only count if user walked >= 500 steps after eating
  // AND the glucose didn't spike too much (stayed within +30 mg/dL)
  if (stepsAfter < 500) return await loadSpikeReduced();
  if (glucoseAfter > glucoseBefore + 30) return await loadSpikeReduced();

  try {
    const stored = await AsyncStorage.getItem(SPIKE_REDUCED_KEY);
    const current = stored ? parseInt(stored, 10) : 0;
    const newCount = current + 1;
    await AsyncStorage.setItem(SPIKE_REDUCED_KEY, String(newCount));
    return newCount;
  } catch {
    return 0;
  }
}

/**
 * Load spike reduction count
 */
export async function loadSpikeReduced(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(SPIKE_REDUCED_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}
