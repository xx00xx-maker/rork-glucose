
import { 
  HealthKitData, 
  AggregatedReportRequest, 
  AdvancedAnalysisRequest,
  GlucoseSummary,
  ActivitySummary,
  MealType,
  PersonalBaseline,
  MedicationRegime,
} from './types';
import { runAllAnalyses, RunAllAnalysesInput } from './analyzers';

/**
 * 新しい分析パイプライン: AdvancedAnalysisRequest を構築
 * 全分析モジュールを統合し、Edge Functionに送信する
 */
export function prepareAdvancedReport(
  userId: string, 
  period: { type: 'daily' | 'weekly' | 'monthly' | 'custom', startDate: string, endDate: string },
  rawData: HealthKitData,
  options?: {
    manualMealRecords?: { timestamp: string; mealType: MealType }[];
    existingBaseline?: PersonalBaseline | null;
    currentRegime?: MedicationRegime;
    previousMilestones?: string[];
    firstDataDate?: string | null;
    hasInitialImport?: boolean;
  }
): AdvancedAnalysisRequest {
  const glucoseSummary = calculateGlucoseSummary(rawData.bloodGlucose);
  const activitySummary = calculateActivitySummary(rawData.steps);
  
  const input: RunAllAnalysesInput = {
    userId,
    period,
    rawData,
    glucoseSummary,
    activitySummary,
    manualMealRecords: options?.manualMealRecords,
    existingBaseline: options?.existingBaseline,
    currentRegime: options?.currentRegime,
    previousMilestones: options?.previousMilestones,
    firstDataDate: options?.firstDataDate,
    hasInitialImport: options?.hasInitialImport,
  };
  
  return runAllAnalyses(input);
}

/**
 * レガシー互換: 既存の AggregatedReportRequest を構築
 * (段階的移行中に使用)
 */
export function prepareDataForUpload(
  userId: string, 
  period: { type: 'daily' | 'weekly' | 'monthly' | 'custom', startDate: string, endDate: string },
  rawData: HealthKitData
): AggregatedReportRequest {
  const glucoseSummary = calculateGlucoseSummary(rawData.bloodGlucose);
  const activitySummary = calculateActivitySummary(rawData.steps);
  
  // 食事推定（新ロジック使用）
  const { estimateMeals } = require('./analyzers/mealEstimator');
  const mealResult = estimateMeals(rawData.bloodGlucose, rawData.steps);
  
  return {
    userId,
    period,
    glucoseSummary,
    activitySummary,
    mealGlucoseCorrelation: {
      mealEvents: mealResult.mealEvents,
      mealRecordingRate: mealResult.mealRecordingRate,
      mealRecordingLevel: mealResult.mealRecordingLevel,
    }
  };
}

function calculateGlucoseSummary(glucoseData: HealthKitData['bloodGlucose']): GlucoseSummary {
  if (glucoseData.length === 0) {
      return emptyGlucoseSummary();
  }
  
  const values = glucoseData.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  // Median
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  // StdDev
  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
  
  // TIR (70-180) — 設計書に基づき70-180に変更
  const inRange = values.filter(v => v >= 70 && v <= 180).length;
  const belowRange = values.filter(v => v < 70).length;
  const aboveRange = values.filter(v => v > 180).length;
  
  // Hourly Averages
  const hourlyMap = new Map<number, { sum: number; count: number }>();
  for (let i = 0; i < 24; i++) hourlyMap.set(i, { sum: 0, count: 0 });
  
  glucoseData.forEach(d => {
    const hour = new Date(d.timestamp).getHours();
    const current = hourlyMap.get(hour)!;
    current.sum += d.value;
    current.count += 1;
  });

  const hourlyAverages = Array.from(hourlyMap.entries())
    .map(([hour, { sum, count }]) => ({
      hour,
      average: count > 0 ? Math.round(sum / count) : 0,
      dataPoints: count
    }))
    .sort((a, b) => a.hour - b.hour);

  // Daily Summaries
  const dailyMap = new Map<string, number[]>();
  glucoseData.forEach(d => {
    // YYYY-MM-DD
    const dateKey = new Date(d.timestamp).toISOString().split('T')[0];
    if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, []);
    dailyMap.get(dateKey)!.push(d.value);
  });

  const dailySummaries = Array.from(dailyMap.entries()).map(([date, vals]) => {
    const dayMean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const dayTir = vals.filter(v => v >= 70 && v <= 180).length / vals.length * 100;
    const spikesCount = vals.filter(v => v > 180).length; 
    
    return {
      date,
      mean: Math.round(dayMean),
      tir: Math.round(dayTir * 10) / 10,
      spikesCount
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    mean: Math.round(mean),
    median: Math.round(median),
    stdDev: Math.round(stdDev * 10) / 10,
    min: Math.min(...values),
    max: Math.max(...values),
    timeInRange: Math.round((inRange / values.length) * 100 * 10) / 10,
    timeBelowRange: Math.round((belowRange / values.length) * 100 * 10) / 10,
    timeAboveRange: Math.round((aboveRange / values.length) * 100 * 10) / 10,
    hourlyAverages,
    dailySummaries
  };
}

function calculateActivitySummary(steps: HealthKitData['steps']): ActivitySummary {
    const dailyMap = new Map<string, { steps: number }>();
    const hourlyMap = new Map<number, { sum: number; count: number }>();
    for (let i = 0; i < 24; i++) hourlyMap.set(i, { sum: 0, count: 0 });

    steps.forEach(s => {
        const date = new Date(s.startTime);
        const dateKey = date.toISOString().split('T')[0];
        const hour = date.getHours();

        // Daily
        if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { steps: 0 });
        dailyMap.get(dateKey)!.steps += s.count;

        // Hourly
        const current = hourlyMap.get(hour)!;
        current.sum += s.count;
        current.count += 1;
    });

    const dailySteps = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        totalSteps: data.steps,
        flightsClimbed: 0,
        activeMinutes: Math.round(data.steps / 100)
    })).sort((a, b) => a.date.localeCompare(b.date));

    const uniqueDays = new Set(steps.map(s => new Date(s.startTime).toISOString().split('T')[0])).size || 1;
    
    const hourlyStepPattern = Array.from(hourlyMap.entries()).map(([hour, { sum }]) => ({
        hour,
        averageSteps: Math.round(sum / uniqueDays)
    })).sort((a, b) => a.hour - b.hour);

    return {
        dailySteps,
        hourlyStepPattern
    };
}

function emptyGlucoseSummary(): GlucoseSummary {
    return {
        mean: 0, median: 0, stdDev: 0, min: 0, max: 0,
        timeInRange: 0, timeBelowRange: 0, timeAboveRange: 0,
        hourlyAverages: [], dailySummaries: []
    };
}
