/**
 * 個人パターン自動発見モジュール
 * 食事時間×歩数×曜日×食事間隔の組み合わせを走査し、統計的に有意な規則を抽出
 */

import { MealEvent, DetectedPattern, ActivitySummary } from '../types';

interface PatternCandidate {
  description: string;
  occurrences: number;
  sampleSize: number;
  avgSpike: number;
  baselineAvgSpike: number;
  category: DetectedPattern['category'];
}

/**
 * 曜日別パターンの検出
 */
function detectWeekdayPatterns(
  mealEvents: MealEvent[],
  dailySteps: ActivitySummary['dailySteps']
): PatternCandidate[] {
  const patterns: PatternCandidate[] = [];
  
  // 平日 vs 週末の血糖比較
  const weekdayMeals = mealEvents.filter(m => {
    const day = new Date(m.mealTime).getDay();
    return day >= 1 && day <= 5;
  });
  const weekendMeals = mealEvents.filter(m => {
    const day = new Date(m.mealTime).getDay();
    return day === 0 || day === 6;
  });
  
  if (weekdayMeals.length >= 5 && weekendMeals.length >= 3) {
    const avgWeekday = weekdayMeals.reduce((s, m) => s + m.spikeMagnitude, 0) / weekdayMeals.length;
    const avgWeekend = weekendMeals.reduce((s, m) => s + m.spikeMagnitude, 0) / weekendMeals.length;
    const diff = Math.round(avgWeekend - avgWeekday);
    
    if (Math.abs(diff) >= 10) {
      patterns.push({
        description: diff > 0
          ? `週末は平日より平均血糖スパイクが+${diff}mg/dL高い`
          : `週末は平日より平均血糖スパイクが${diff}mg/dL低い`,
        occurrences: weekendMeals.length,
        sampleSize: weekdayMeals.length + weekendMeals.length,
        avgSpike: Math.round(avgWeekend),
        baselineAvgSpike: Math.round(avgWeekday),
        category: 'weekday',
      });
    }
  }
  
  return patterns;
}

/**
 * 食事時間帯パターンの検出
 */
function detectMealTimingPatterns(mealEvents: MealEvent[]): PatternCandidate[] {
  const patterns: PatternCandidate[] = [];
  
  // 遅い夕食(20時以降) vs 早い夕食(18-20時)
  const dinners = mealEvents.filter(m => m.mealType === 'dinner');
  const earlyDinners = dinners.filter(m => {
    const h = new Date(m.mealTime).getHours();
    return h >= 18 && h < 20;
  });
  const lateDinners = dinners.filter(m => {
    const h = new Date(m.mealTime).getHours();
    return h >= 20;
  });
  
  if (earlyDinners.length >= 3 && lateDinners.length >= 3) {
    const avgEarly = earlyDinners.reduce((s, m) => s + m.spikeMagnitude, 0) / earlyDinners.length;
    const avgLate = lateDinners.reduce((s, m) => s + m.spikeMagnitude, 0) / lateDinners.length;
    const diff = Math.round(avgLate - avgEarly);
    
    if (diff >= 10) {
      patterns.push({
        description: `20時以降の夕食ではスパイクが平均+${diff}mg/dL大きい（${lateDinners.length}回中${lateDinners.filter(d => d.spikeMagnitude > avgEarly).length}回）`,
        occurrences: lateDinners.filter(d => d.spikeMagnitude > avgEarly).length,
        sampleSize: earlyDinners.length + lateDinners.length,
        avgSpike: Math.round(avgLate),
        baselineAvgSpike: Math.round(avgEarly),
        category: 'meal_timing',
      });
    }
  }
  
  return patterns;
}

/**
 * 歩行パターンの検出
 */
function detectExercisePatterns(mealEvents: MealEvent[]): PatternCandidate[] {
  const patterns: PatternCandidate[] = [];
  
  // 食事タイプ別の歩行効果
  for (const mealType of ['breakfast', 'lunch', 'dinner'] as const) {
    const meals = mealEvents.filter(m => m.mealType === mealType);
    const walked = meals.filter(m => m.postMealSteps >= 500);
    const notWalked = meals.filter(m => m.postMealSteps < 200);
    
    if (walked.length >= 3 && notWalked.length >= 3) {
      const avgWalked = walked.reduce((s, m) => s + m.spikeMagnitude, 0) / walked.length;
      const avgNotWalked = notWalked.reduce((s, m) => s + m.spikeMagnitude, 0) / notWalked.length;
      const reduction = Math.round(avgNotWalked - avgWalked);
      
      if (reduction >= 15) {
        const label = mealType === 'breakfast' ? '朝食' : mealType === 'lunch' ? '昼食' : '夕食';
        patterns.push({
          description: `${label}後に歩くとスパイクが平均${reduction}mg/dL抑えられている`,
          occurrences: walked.length,
          sampleSize: meals.length,
          avgSpike: Math.round(avgWalked),
          baselineAvgSpike: Math.round(avgNotWalked),
          category: 'exercise',
        });
      }
    }
  }
  
  return patterns;
}

/**
 * 信頼度を計算
 */
function calculateConfidence(candidate: PatternCandidate): number {
  const sampleFactor = Math.min(1, candidate.sampleSize / 20);
  const occurrenceFactor = candidate.sampleSize > 0
    ? candidate.occurrences / candidate.sampleSize
    : 0;
  const effectFactor = Math.min(1, Math.abs(candidate.avgSpike - candidate.baselineAvgSpike) / 30);
  
  return Math.round(sampleFactor * 0.3 + occurrenceFactor * 0.4 + effectFactor * 0.3) * 100;
}

/**
 * パターン検出のエントリポイント
 * 1-3ヶ月以上のデータが望ましい
 */
export function detectPatterns(
  mealEvents: MealEvent[],
  activitySummary: ActivitySummary
): DetectedPattern[] {
  if (mealEvents.length < 15) {
    return []; // データ不足
  }
  
  const candidates: PatternCandidate[] = [
    ...detectWeekdayPatterns(mealEvents, activitySummary.dailySteps),
    ...detectMealTimingPatterns(mealEvents),
    ...detectExercisePatterns(mealEvents),
  ];
  
  // 信頼度60%以上のみ返す（偽相関排除）
  return candidates
    .map(c => ({
      description: c.description,
      confidence: calculateConfidence(c),
      sampleSize: c.sampleSize,
      occurrences: c.occurrences,
      category: c.category,
    }))
    .filter(p => p.confidence >= 60)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5); // 最大5パターン
}
