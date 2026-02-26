/**
 * パーソナルベースライン管理モジュール
 * 個人の基準値を算出・保存・比較する
 */

import {
  MealEvent,
  HealthKitData,
  PersonalBaseline,
  BaselineComparison,
  BaselineComparisonResult,
  WalkingEffectResult,
} from '../types';

/** 標準偏差 */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
}

/**
 * 空腹時血糖を日別に計算（6-8時の最低値）
 */
function calculateFastingGlucoseStats(
  glucoseData: HealthKitData['bloodGlucose']
): { mean: number; stdDev: number } {
  const byDate = new Map<string, number[]>();
  
  for (const g of glucoseData) {
    const d = new Date(g.timestamp);
    if (d.getHours() >= 6 && d.getHours() < 8) {
      const dateKey = d.toISOString().split('T')[0];
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(g.value);
    }
  }
  
  const dailyFasting = Array.from(byDate.values())
    .map(vals => Math.min(...vals));
  
  if (dailyFasting.length === 0) return { mean: 0, stdDev: 0 };
  
  const mean = Math.round(dailyFasting.reduce((s, v) => s + v, 0) / dailyFasting.length);
  return { mean, stdDev: Math.round(stdDev(dailyFasting) * 10) / 10 };
}

/**
 * 食事タイプ別のスパイク統計
 */
function calculateSpikeStats(
  mealEvents: MealEvent[],
  mealType: 'breakfast' | 'lunch' | 'dinner'
): { mean: number; stdDev: number } {
  const spikes = mealEvents
    .filter(m => m.mealType === mealType)
    .map(m => m.spikeMagnitude);
  
  if (spikes.length === 0) return { mean: 0, stdDev: 0 };
  
  const mean = Math.round(spikes.reduce((s, v) => s + v, 0) / spikes.length);
  return { mean, stdDev: Math.round(stdDev(spikes) * 10) / 10 };
}

/**
 * 暁現象の平均上昇幅
 */
function calculateDawnStats(
  glucoseData: HealthKitData['bloodGlucose']
): { mean: number; stdDev: number } {
  const byDate = new Map<string, number[]>();
  
  for (const g of glucoseData) {
    const d = new Date(g.timestamp);
    if (d.getHours() >= 3 && d.getHours() < 6) {
      const dateKey = d.toISOString().split('T')[0];
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(g.value);
    }
  }
  
  const dailyRises = Array.from(byDate.values())
    .filter(vals => vals.length >= 2)
    .map(vals => Math.max(...vals) - Math.min(...vals));
  
  if (dailyRises.length === 0) return { mean: 0, stdDev: 0 };
  
  const mean = Math.round(dailyRises.reduce((s, v) => s + v, 0) / dailyRises.length);
  return { mean, stdDev: Math.round(stdDev(dailyRises) * 10) / 10 };
}

/**
 * ベースラインを構築
 */
export function buildBaseline(
  glucoseData: HealthKitData['bloodGlucose'],
  mealEvents: MealEvent[],
  walkingEffect: WalkingEffectResult,
  regimeId: string
): PersonalBaseline {
  const fasting = calculateFastingGlucoseStats(glucoseData);
  const breakfast = calculateSpikeStats(mealEvents, 'breakfast');
  const lunch = calculateSpikeStats(mealEvents, 'lunch');
  const dinner = calculateSpikeStats(mealEvents, 'dinner');
  const dawn = calculateDawnStats(glucoseData);
  
  // 時間帯別基準値
  const hourlyMap = new Map<number, number[]>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, []);
  for (const g of glucoseData) {
    const hour = new Date(g.timestamp).getHours();
    hourlyMap.get(hour)!.push(g.value);
  }
  
  const hourlyBaseline = Array.from(hourlyMap.entries()).map(([hour, values]) => ({
    hour,
    mean: values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0,
    stdDev: values.length > 0 ? Math.round(stdDev(values) * 10) / 10 : 0,
  }));
  
  return {
    regimeId,
    fastingGlucose: fasting,
    spikeByMeal: { breakfast, lunch, dinner },
    walkingEffect: {
      mean: walkingEffect.reductionMgDl,
      stdDev: 0, // 単値のため
    },
    hourlyBaseline,
    dawnPhenomenon: dawn,
    dataPoints: glucoseData.length,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * σベースの比較判定
 */
function compareWithSigma(
  current: number,
  baselineMean: number,
  baselineStd: number
): BaselineComparison {
  if (baselineStd === 0) return 'normal';
  const sigma = (current - baselineMean) / baselineStd;
  
  if (sigma <= -1.5) return 'personal_best';
  if (sigma <= -0.5) return 'better';
  if (sigma >= 1.0) return 'worse';
  return 'normal';
}

/**
 * 当日の値をベースラインと比較
 */
export function compareWithBaseline(
  todayFasting: number,
  todaySpikes: { breakfast?: number; lunch?: number; dinner?: number },
  todayWalkingEffect: number,
  baseline: PersonalBaseline
): BaselineComparisonResult {
  const fastingComparison = compareWithSigma(
    todayFasting,
    baseline.fastingGlucose.mean,
    baseline.fastingGlucose.stdDev
  );
  
  const spikeComparison: { [key: string]: BaselineComparison } = {};
  if (todaySpikes.breakfast !== undefined) {
    spikeComparison.breakfast = compareWithSigma(
      todaySpikes.breakfast,
      baseline.spikeByMeal.breakfast.mean,
      baseline.spikeByMeal.breakfast.stdDev
    );
  }
  if (todaySpikes.lunch !== undefined) {
    spikeComparison.lunch = compareWithSigma(
      todaySpikes.lunch,
      baseline.spikeByMeal.lunch.mean,
      baseline.spikeByMeal.lunch.stdDev
    );
  }
  if (todaySpikes.dinner !== undefined) {
    spikeComparison.dinner = compareWithSigma(
      todaySpikes.dinner,
      baseline.spikeByMeal.dinner.mean,
      baseline.spikeByMeal.dinner.stdDev
    );
  }
  
  const walkingEffectComparison = compareWithSigma(
    todayWalkingEffect,
    baseline.walkingEffect.mean,
    baseline.walkingEffect.stdDev
  );
  
  // 全体の偏差（空腹時血糖ベース）
  const deviationSigma = baseline.fastingGlucose.stdDev > 0
    ? Math.round(((todayFasting - baseline.fastingGlucose.mean) / baseline.fastingGlucose.stdDev) * 10) / 10
    : 0;
  
  // 総合比較
  const comparisons = [fastingComparison, ...Object.values(spikeComparison)];
  let overallComparison: BaselineComparison = 'normal';
  if (comparisons.includes('personal_best')) overallComparison = 'personal_best';
  else if (comparisons.filter(c => c === 'better').length >= 2) overallComparison = 'better';
  else if (comparisons.filter(c => c === 'worse').length >= 2) overallComparison = 'worse';
  
  return {
    overallComparison,
    fastingComparison,
    spikeComparison,
    walkingEffectComparison,
    deviationSigma,
  };
}
