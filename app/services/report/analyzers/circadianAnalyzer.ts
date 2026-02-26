/**
 * サーカディアンリズム分析モジュール
 * 食事リズム、活動リズム、夜間パターン、暁現象を総合的に分析
 */

import { HealthKitData, MealEvent, CircadianAnalysisResult, ActivitySummary } from '../types';

/** 標準偏差を計算 */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
}

/** 分をラベルに変換 */
function classifyRhythm(stdMinutes: number): 'stable' | 'slightly_irregular' | 'irregular' {
  if (stdMinutes <= 30) return 'stable';
  if (stdMinutes <= 60) return 'slightly_irregular';
  return 'irregular';
}

/** 食事リズムスコア */
function analyzeMealRhythm(
  mealEvents: MealEvent[],
  dailyTIR: { date: string; tir: number }[]
): CircadianAnalysisResult['mealRhythm'] {
  const byType = {
    breakfast: [] as number[],
    lunch: [] as number[],
    dinner: [] as number[],
  };
  
  for (const m of mealEvents) {
    if (m.mealType === 'breakfast' || m.mealType === 'lunch' || m.mealType === 'dinner') {
      const d = new Date(m.mealTime);
      byType[m.mealType].push(d.getHours() * 60 + d.getMinutes());
    }
  }
  
  const breakfastStdMinutes = Math.round(stdDev(byType.breakfast));
  const lunchStdMinutes = Math.round(stdDev(byType.lunch));
  const dinnerStdMinutes = Math.round(stdDev(byType.dinner));
  
  const avgStd = (breakfastStdMinutes + lunchStdMinutes + dinnerStdMinutes) / 3;
  const overallLabel = classifyRhythm(avgStd);
  
  // リズム安定日 vs 不安定日のTIR比較
  const mealsByDate = new Map<string, number[]>();
  for (const m of mealEvents) {
    const dateKey = new Date(m.mealTime).toISOString().split('T')[0];
    if (!mealsByDate.has(dateKey)) mealsByDate.set(dateKey, []);
    const d = new Date(m.mealTime);
    mealsByDate.get(dateKey)!.push(d.getHours() * 60 + d.getMinutes());
  }
  
  const tirMap = new Map(dailyTIR.map(d => [d.date, d.tir]));
  let stableDaysTIRs: number[] = [];
  let unstableDaysTIRs: number[] = [];
  
  // 各食事タイプの基準時刻を算出
  const avgTimes = {
    breakfast: byType.breakfast.length > 0 ? byType.breakfast.reduce((s, v) => s + v, 0) / byType.breakfast.length : 0,
    lunch: byType.lunch.length > 0 ? byType.lunch.reduce((s, v) => s + v, 0) / byType.lunch.length : 0,
    dinner: byType.dinner.length > 0 ? byType.dinner.reduce((s, v) => s + v, 0) / byType.dinner.length : 0,
  };
  
  for (const [date, times] of mealsByDate.entries()) {
    const tir = tirMap.get(date);
    if (tir === undefined) continue;
    
    // 平均からの乖離が30分以内ならstable
    const maxDeviation = Math.max(...times.map(t => {
      const diffs = Object.values(avgTimes).map(avg => Math.abs(t - avg));
      return Math.min(...diffs);
    }));
    
    if (maxDeviation <= 30) {
      stableDaysTIRs.push(tir);
    } else {
      unstableDaysTIRs.push(tir);
    }
  }
  
  return {
    breakfastStdMinutes,
    lunchStdMinutes,
    dinnerStdMinutes,
    overallLabel,
    stableDaysTIR: stableDaysTIRs.length > 0
      ? Math.round(stableDaysTIRs.reduce((s, v) => s + v, 0) / stableDaysTIRs.length * 10) / 10
      : 0,
    unstableDaysTIR: unstableDaysTIRs.length > 0
      ? Math.round(unstableDaysTIRs.reduce((s, v) => s + v, 0) / unstableDaysTIRs.length * 10) / 10
      : 0,
  };
}

/** 夕食時間帯別インスリン感受性 */
function analyzeDinnerTimeSensitivity(
  mealEvents: MealEvent[]
): CircadianAnalysisResult['dinnerTimeSensitivity'] {
  const dinners = mealEvents.filter(m => m.mealType === 'dinner');
  const buckets = {
    early: { spikes: [] as number[], range: '18:00-19:00' },
    mid: { spikes: [] as number[], range: '19:00-20:00' },
    late: { spikes: [] as number[], range: '20:00-21:00' },
    veryLate: { spikes: [] as number[], range: '21:00以降' },
  };
  
  for (const d of dinners) {
    const hour = new Date(d.mealTime).getHours();
    if (hour >= 18 && hour < 19) buckets.early.spikes.push(d.spikeMagnitude);
    else if (hour >= 19 && hour < 20) buckets.mid.spikes.push(d.spikeMagnitude);
    else if (hour >= 20 && hour < 21) buckets.late.spikes.push(d.spikeMagnitude);
    else if (hour >= 21) buckets.veryLate.spikes.push(d.spikeMagnitude);
  }
  
  const calc = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
  
  return {
    early: { timeRange: buckets.early.range, avgSpike: calc(buckets.early.spikes), count: buckets.early.spikes.length },
    mid: { timeRange: buckets.mid.range, avgSpike: calc(buckets.mid.spikes), count: buckets.mid.spikes.length },
    late: { timeRange: buckets.late.range, avgSpike: calc(buckets.late.spikes), count: buckets.late.spikes.length },
    veryLate: { timeRange: buckets.veryLate.range, avgSpike: calc(buckets.veryLate.spikes), count: buckets.veryLate.spikes.length },
  };
}

/** 歩数パターンから活動リズムを推定 */
function analyzeActivityRhythm(
  activitySummary: ActivitySummary
): CircadianAnalysisResult['activityRhythm'] {
  const hourlySteps = activitySummary.hourlyStepPattern;
  
  // 活動開始: 最初に有意な歩数（平均の20%以上）がある時間
  const maxSteps = Math.max(...hourlySteps.map(h => h.averageSteps), 1);
  const threshold = maxSteps * 0.2;
  
  let activityStart = 7;
  let activityEnd = 22;
  
  for (let i = 4; i < 14; i++) {
    const h = hourlySteps.find(hp => hp.hour === i);
    if (h && h.averageSteps >= threshold) {
      activityStart = i;
      break;
    }
  }
  
  for (let i = 23; i > 14; i--) {
    const h = hourlySteps.find(hp => hp.hour === i);
    if (h && h.averageSteps >= threshold) {
      activityEnd = i;
      break;
    }
  }
  
  // 平日vs週末の活動開始の差はdailyStepsからは推定困難なので簡易推定
  // TODO: dailyStepsにday-of-weekを追加すればより正確に
  return {
    estimatedActivityStart: activityStart,
    estimatedActivityEnd: activityEnd,
    weekdayStart: activityStart,
    weekendStart: activityStart + 1, // 仮の推定
    socialJetLag: false,
    socialJetLagImpact: undefined,
  };
}

/** CGM夜間パターンから入眠/覚醒を推定 */
function analyzeNightPattern(
  glucoseData: HealthKitData['bloodGlucose']
): CircadianAnalysisResult['nightPattern'] {
  // 20-24時の血糖下降トレンド開始を入眠推定
  // 5-8時の上昇転換を覚醒推定
  const eveningData = glucoseData.filter(g => {
    const h = new Date(g.timestamp).getHours();
    return h >= 20 || h < 3;
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  let sleepOnset = 23;
  // 持続的な下降開始を検出
  for (let i = 1; i < eveningData.length - 2; i++) {
    if (eveningData[i].value < eveningData[i - 1].value &&
        eveningData[i + 1].value < eveningData[i].value) {
      const h = new Date(eveningData[i].timestamp).getHours();
      const m = new Date(eveningData[i].timestamp).getMinutes();
      if (h >= 20 || h < 3) {
        sleepOnset = h + m / 60;
        break;
      }
    }
  }
  
  // 早朝の上昇開始を覚醒推定
  const morningData = glucoseData.filter(g => {
    const h = new Date(g.timestamp).getHours();
    return h >= 4 && h <= 8;
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  let wakeTime = 7;
  for (let i = 1; i < morningData.length - 1; i++) {
    if (morningData[i].value > morningData[i - 1].value &&
        morningData[i + 1].value > morningData[i].value) {
      const h = new Date(morningData[i].timestamp).getHours();
      const m = new Date(morningData[i].timestamp).getMinutes();
      wakeTime = h + m / 60;
      break;
    }
  }
  
  return {
    estimatedSleepOnset: Math.round(sleepOnset * 10) / 10,
    estimatedWakeTime: Math.round(wakeTime * 10) / 10,
    isEstimate: true,
  };
}

/** 暁現象分析 (3-6時の血糖上昇) */
function analyzeDawnPhenomenon(
  glucoseData: HealthKitData['bloodGlucose'],
  mealEvents: MealEvent[],
  activitySummary: ActivitySummary,
  nightPattern: CircadianAnalysisResult['nightPattern']
): CircadianAnalysisResult['dawnPhenomenon'] {
  // 日別に3-6時の上昇を計測
  const byDate = new Map<string, { value: number; hour: number }[]>();
  
  for (const g of glucoseData) {
    const d = new Date(g.timestamp);
    const h = d.getHours();
    if (h >= 3 && h < 6) {
      const dateKey = d.toISOString().split('T')[0];
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push({ value: g.value, hour: h + d.getMinutes() / 60 });
    }
  }
  
  const dailyDawn: { date: string; rise: number; startHour: number }[] = [];
  
  for (const [date, points] of byDate.entries()) {
    if (points.length < 2) continue;
    const sorted = points.sort((a, b) => a.hour - b.hour);
    const minVal = Math.min(...sorted.map(p => p.value));
    const maxVal = Math.max(...sorted.map(p => p.value));
    const rise = maxVal - minVal;
    const startPoint = sorted.find(p => p.value === minVal) || sorted[0];
    dailyDawn.push({ date, rise: Math.round(rise), startHour: Math.round(startPoint.hour * 10) / 10 });
  }
  
  const avgRise = dailyDawn.length > 0
    ? Math.round(dailyDawn.reduce((s, d) => s + d.rise, 0) / dailyDawn.length)
    : 0;
  const avgStartHour = dailyDawn.length > 0
    ? Math.round(dailyDawn.reduce((s, d) => s + d.startHour, 0) / dailyDawn.length * 10) / 10
    : 4;
  const avgPeakValue = dailyDawn.length > 0
    ? Math.round(dailyDawn.reduce((s, d) => s + d.rise, 0) / dailyDawn.length + 100) // 暫定
    : 0;
  
  return {
    averageRise: avgRise,
    averageStartHour: avgStartHour,
    averagePeakValue: avgPeakValue,
    correlationWithDinnerTime: 0, // TODO: 夕食時間との相関
    correlationWithSteps: 0,
    correlationWithSleepOnset: 0,
    dailyDawn,
  };
}

/** 総合生活リズムスコア (0-100) */
function calculateRhythmScore(
  mealRhythm: CircadianAnalysisResult['mealRhythm'],
  activityRhythm: CircadianAnalysisResult['activityRhythm'],
  nightPattern: CircadianAnalysisResult['nightPattern'],
  dawnPhenomenon: CircadianAnalysisResult['dawnPhenomenon']
): { score: number; breakdown: CircadianAnalysisResult['scoreBreakdown'] } {
  // 食事リズム (30%)
  const avgStd = (mealRhythm.breakfastStdMinutes + mealRhythm.lunchStdMinutes + mealRhythm.dinnerStdMinutes) / 3;
  const mealScore = Math.max(0, Math.min(100, 100 - avgStd * 1.5));
  
  // 活動リズム (25%)
  const activitySpan = activityRhythm.estimatedActivityEnd - activityRhythm.estimatedActivityStart;
  const activityScore = activitySpan >= 12 && activitySpan <= 16 ? 80 : 60;
  
  // 入眠安定度 (25%)
  const sleepScore = nightPattern.estimatedSleepOnset >= 21 && nightPattern.estimatedSleepOnset <= 24 ? 80 : 60;
  
  // 暁現象の一貫性 (20%)
  const dawnStd = stdDev(dawnPhenomenon.dailyDawn.map(d => d.rise));
  const dawnScore = Math.max(0, Math.min(100, 100 - dawnStd * 2));
  
  const score = Math.round(
    mealScore * 0.3 +
    activityScore * 0.25 +
    sleepScore * 0.25 +
    dawnScore * 0.2
  );
  
  return {
    score,
    breakdown: {
      mealRhythm: Math.round(mealScore),
      activityRhythm: Math.round(activityScore),
      sleepOnsetStability: Math.round(sleepScore),
      dawnConsistency: Math.round(dawnScore),
    },
  };
}

export function analyzeCircadianRhythm(
  glucoseData: HealthKitData['bloodGlucose'],
  mealEvents: MealEvent[],
  activitySummary: ActivitySummary,
  dailyTIR: { date: string; tir: number }[]
): CircadianAnalysisResult {
  const mealRhythm = analyzeMealRhythm(mealEvents, dailyTIR);
  const dinnerTimeSensitivity = analyzeDinnerTimeSensitivity(mealEvents);
  const activityRhythm = analyzeActivityRhythm(activitySummary);
  const nightPattern = analyzeNightPattern(glucoseData);
  const dawnPhenomenon = analyzeDawnPhenomenon(glucoseData, mealEvents, activitySummary, nightPattern);
  const { score, breakdown } = calculateRhythmScore(mealRhythm, activityRhythm, nightPattern, dawnPhenomenon);
  
  return {
    mealRhythm,
    dinnerTimeSensitivity,
    activityRhythm,
    nightPattern,
    dawnPhenomenon,
    overallRhythmScore: score,
    scoreBreakdown: breakdown,
  };
}
