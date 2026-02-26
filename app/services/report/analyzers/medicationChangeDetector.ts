/**
 * 投薬変更検出モジュール
 * 7日間移動平均の血糖値/分散を監視し、構造変化を検出
 */

import { HealthKitData, MedicationChangeDetection, ActivitySummary } from '../types';

/**
 * 7日間移動平均を計算
 */
function calculateMovingAverage(
  values: { date: string; mean: number; variance: number }[],
  windowDays: number = 7
): { date: string; movingMean: number; movingVariance: number }[] {
  const result: { date: string; movingMean: number; movingVariance: number }[] = [];
  
  for (let i = windowDays - 1; i < values.length; i++) {
    const window = values.slice(i - windowDays + 1, i + 1);
    const movingMean = Math.round(
      window.reduce((s, v) => s + v.mean, 0) / window.length
    );
    const movingVariance = Math.round(
      window.reduce((s, v) => s + v.variance, 0) / window.length * 10
    ) / 10;
    result.push({ date: values[i].date, movingMean, movingVariance });
  }
  
  return result;
}

/**
 * 歩数/食事パターンに大きな変化がないか確認
 */
function hasLifestyleChange(
  activitySummary: ActivitySummary,
  recentDays: number = 7
): boolean {
  const steps = activitySummary.dailySteps;
  if (steps.length < recentDays * 2) return false;
  
  const recent = steps.slice(-recentDays);
  const previous = steps.slice(-recentDays * 2, -recentDays);
  
  const recentAvg = recent.reduce((s, d) => s + d.totalSteps, 0) / recent.length;
  const prevAvg = previous.reduce((s, d) => s + d.totalSteps, 0) / previous.length;
  
  // 歩数が30%以上変化した場合は生活変化ありとみなす
  const changePercent = Math.abs(recentAvg - prevAvg) / prevAvg;
  return changePercent >= 0.3;
}

/**
 * 投薬変更を検出
 */
export function detectMedicationChange(
  glucoseData: HealthKitData['bloodGlucose'],
  activitySummary: ActivitySummary
): MedicationChangeDetection {
  // 日別の平均と分散を計算
  const dailyMap = new Map<string, number[]>();
  for (const g of glucoseData) {
    const dateKey = new Date(g.timestamp).toISOString().split('T')[0];
    if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, []);
    dailyMap.get(dateKey)!.push(g.value);
  }
  
  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, values]) => {
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
      return { date, mean: Math.round(mean), variance: Math.round(variance) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  
  if (dailyStats.length < 14) {
    return {
      structuralChangeDetected: false,
      glucoseMeanBefore: 0,
      glucoseMeanAfter: 0,
      varianceBefore: 0,
      varianceAfter: 0,
      daysOfChange: 0,
      userConfirmationNeeded: false,
    };
  }
  
  // 移動平均を計算
  const movingAvg = calculateMovingAverage(dailyStats);
  
  if (movingAvg.length < 7) {
    return {
      structuralChangeDetected: false,
      glucoseMeanBefore: 0,
      glucoseMeanAfter: 0,
      varianceBefore: 0,
      varianceAfter: 0,
      daysOfChange: 0,
      userConfirmationNeeded: false,
    };
  }
  
  // 直近7日 vs その前の7日の移動平均を比較
  const recent = movingAvg.slice(-3);
  const previous = movingAvg.slice(-10, -3);
  
  if (previous.length === 0) {
    return {
      structuralChangeDetected: false,
      glucoseMeanBefore: 0,
      glucoseMeanAfter: 0,
      varianceBefore: 0,
      varianceAfter: 0,
      daysOfChange: 0,
      userConfirmationNeeded: false,
    };
  }
  
  const recentMean = recent.reduce((s, v) => s + v.movingMean, 0) / recent.length;
  const prevMean = previous.reduce((s, v) => s + v.movingMean, 0) / previous.length;
  const recentVar = recent.reduce((s, v) => s + v.movingVariance, 0) / recent.length;
  const prevVar = previous.reduce((s, v) => s + v.movingVariance, 0) / previous.length;
  
  const meanChange = Math.abs(recentMean - prevMean);
  const varChange = prevVar > 0 ? Math.abs(recentVar - prevVar) / prevVar : 0;
  
  // 有意な変化の判定: 平均15mg/dL以上の変化 OR 分散が50%以上変化
  const hasSignificantChange = meanChange >= 15 || varChange >= 0.5;
  
  // 生活パターンに大きな変化がないか
  const lifestyleChanged = hasLifestyleChange(activitySummary);
  
  // 生活パターン変化なしで血糖が有意に変化 → 投薬変更の可能性
  const structuralChangeDetected = hasSignificantChange && !lifestyleChanged;
  
  // 3日以上継続しているか
  let daysOfChange = 0;
  if (structuralChangeDetected) {
    for (let i = movingAvg.length - 1; i >= 0; i--) {
      if (Math.abs(movingAvg[i].movingMean - prevMean) >= 10) {
        daysOfChange++;
      } else {
        break;
      }
    }
  }
  
  return {
    structuralChangeDetected: structuralChangeDetected && daysOfChange >= 3,
    changeStartDate: structuralChangeDetected && daysOfChange >= 3
      ? movingAvg[movingAvg.length - daysOfChange]?.date
      : undefined,
    glucoseMeanBefore: Math.round(prevMean),
    glucoseMeanAfter: Math.round(recentMean),
    varianceBefore: Math.round(prevVar),
    varianceAfter: Math.round(recentVar),
    daysOfChange,
    userConfirmationNeeded: structuralChangeDetected && daysOfChange >= 3,
  };
}
