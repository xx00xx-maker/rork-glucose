/**
 * 前日歩数と翌朝空腹時血糖の相関分析モジュール
 */

import {
  HealthKitData,
  StepsGlucoseCorrelationResult,
  ActivitySummary,
  GlucoseSummary,
} from '../types';

/**
 * 翌朝の空腹時血糖値を推定（6-8時の最低値）
 */
function getFastingGlucose(
  glucoseData: HealthKitData['bloodGlucose'],
  dateStr: string
): number | null {
  const targetDate = new Date(dateStr);
  const morningStart = new Date(targetDate);
  morningStart.setHours(6, 0, 0, 0);
  const morningEnd = new Date(targetDate);
  morningEnd.setHours(8, 0, 0, 0);
  
  const morningData = glucoseData.filter(g => {
    const t = new Date(g.timestamp).getTime();
    return t >= morningStart.getTime() && t <= morningEnd.getTime();
  });
  
  if (morningData.length === 0) return null;
  return Math.min(...morningData.map(g => g.value));
}

/**
 * ピアソン相関係数の計算
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  
  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return 0;
  return numerator / denom;
}

export function analyzeStepsGlucoseCorrelation(
  glucoseData: HealthKitData['bloodGlucose'],
  activitySummary: ActivitySummary
): StepsGlucoseCorrelationResult {
  const stepsByDate = new Map<string, number>();
  for (const day of activitySummary.dailySteps) {
    stepsByDate.set(day.date, day.totalSteps);
  }
  
  // 日別ペアを作成: 前日歩数 → 翌朝空腹時血糖
  const pairs: { steps: number; fastingGlucose: number }[] = [];
  const dates = Array.from(stepsByDate.keys()).sort();
  
  for (let i = 0; i < dates.length - 1; i++) {
    const prevDate = dates[i];
    const nextDate = dates[i + 1];
    
    // 翌日であることを確認
    const d1 = new Date(prevDate);
    const d2 = new Date(nextDate);
    if ((d2.getTime() - d1.getTime()) > 2 * 24 * 60 * 60 * 1000) continue;
    
    const steps = stepsByDate.get(prevDate) ?? 0;
    const fasting = getFastingGlucose(glucoseData, nextDate);
    
    if (fasting !== null && steps > 0) {
      pairs.push({ steps, fastingGlucose: fasting });
    }
  }
  
  if (pairs.length < 5) {
    return {
      correlationCoefficient: 0,
      highStepDayFastingAvg: 0,
      lowStepDayFastingAvg: 0,
      difference: 0,
      dataPointCount: pairs.length,
      isSignificant: false,
    };
  }
  
  // 相関係数
  const stepsArr = pairs.map(p => p.steps);
  const glucoseArr = pairs.map(p => p.fastingGlucose);
  const correlationCoefficient = Math.round(pearsonCorrelation(stepsArr, glucoseArr) * 100) / 100;
  
  // 高歩数日 vs 低歩数日
  const medianSteps = [...stepsArr].sort((a, b) => a - b)[Math.floor(stepsArr.length / 2)];
  const highStepPairs = pairs.filter(p => p.steps >= medianSteps);
  const lowStepPairs = pairs.filter(p => p.steps < medianSteps);
  
  const highStepDayFastingAvg = highStepPairs.length > 0
    ? Math.round(highStepPairs.reduce((s, p) => s + p.fastingGlucose, 0) / highStepPairs.length)
    : 0;
  const lowStepDayFastingAvg = lowStepPairs.length > 0
    ? Math.round(lowStepPairs.reduce((s, p) => s + p.fastingGlucose, 0) / lowStepPairs.length)
    : 0;
  
  return {
    correlationCoefficient,
    highStepDayFastingAvg,
    lowStepDayFastingAvg,
    difference: lowStepDayFastingAvg - highStepDayFastingAvg,
    dataPointCount: pairs.length,
    isSignificant: pairs.length >= 7 && Math.abs(correlationCoefficient) >= 0.2,
  };
}
