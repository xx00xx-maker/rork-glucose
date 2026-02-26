/**
 * 分析モジュール統合エントリポイント
 * 全アナライザを呼び出し、AdvancedAnalysisRequestを構築する
 */

import {
  HealthKitData,
  AdvancedAnalysisRequest,
  ActivitySummary,
  GlucoseSummary,
  PersonalBaseline,
  MealType,
  MedicationRegime,
} from '../types';

import { estimateMeals } from './mealEstimator';
import { analyzeSpikesByMeal } from './spikeAnalyzer';
import { analyzeWalkingEffect } from './walkingEffectAnalyzer';
import { analyzeMealIntervals } from './mealIntervalAnalyzer';
import { analyzeTimeZonePatterns } from './timeZoneAnalyzer';
import { analyzeStepsGlucoseCorrelation } from './stepsGlucoseCorrelation';
import { analyzeTIR } from './tirAnalyzer';
import { analyzeCircadianRhythm } from './circadianAnalyzer';
import { analyzeStress } from './stressAnalyzer';
import { buildBaseline, compareWithBaseline } from './baselineManager';
import { detectPatterns } from './patternDetector';
import { trackGrowth } from './growthTracker';
import { detectMedicationChange } from './medicationChangeDetector';
import { assessDataMaturity } from './dataMaturity';

export interface RunAllAnalysesInput {
  userId: string;
  period: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    startDate: string;
    endDate: string;
  };
  rawData: HealthKitData;
  glucoseSummary: GlucoseSummary;
  activitySummary: ActivitySummary;
  manualMealRecords?: { timestamp: string; mealType: MealType }[];
  existingBaseline?: PersonalBaseline | null;
  currentRegime?: MedicationRegime;
  previousMilestones?: string[];
  firstDataDate?: string | null;
  hasInitialImport?: boolean;
}

export function runAllAnalyses(input: RunAllAnalysesInput): AdvancedAnalysisRequest {
  const {
    userId,
    period,
    rawData,
    glucoseSummary,
    activitySummary,
    manualMealRecords,
    existingBaseline,
    currentRegime,
    previousMilestones,
    firstDataDate,
    hasInitialImport,
  } = input;

  // 1. 食事推定
  const mealResult = estimateMeals(rawData.bloodGlucose, rawData.steps, manualMealRecords);
  
  // 2. スパイク分析
  const spikeAnalysis = analyzeSpikesByMeal(mealResult.mealEvents);
  
  // 3. ウォーキング効果
  const walkingEffect = analyzeWalkingEffect(mealResult.mealEvents);
  
  // 4. 食事間隔分析
  const mealIntervalAnalysis = analyzeMealIntervals(mealResult.mealEvents);
  
  // 5. 時間帯別パターン
  const timeZonePattern = analyzeTimeZonePatterns(rawData.bloodGlucose);
  
  // 6. 歩数-血糖相関
  const stepsGlucoseCorrelation = analyzeStepsGlucoseCorrelation(
    rawData.bloodGlucose,
    activitySummary
  );
  
  // 7. TIR分析
  const tirAnalysis = analyzeTIR(rawData.bloodGlucose);
  
  // 8. サーカディアンリズム分析
  const circadianAnalysis = analyzeCircadianRhythm(
    rawData.bloodGlucose,
    mealResult.mealEvents,
    activitySummary,
    tirAnalysis.dailyTIR
  );
  
  // 9. ストレス分析
  const stressAnalysis = analyzeStress(
    rawData.bloodGlucose,
    rawData.heartRate,
    mealResult.mealEvents
  );
  
  // 10. ベースライン比較
  let baselineComparison = undefined;
  if (existingBaseline) {
    const todayFasting = glucoseSummary.mean; // 簡易代用
    const todaySpikes: { breakfast?: number; lunch?: number; dinner?: number } = {};
    if (spikeAnalysis.breakfastSpikes.count > 0) todaySpikes.breakfast = spikeAnalysis.breakfastSpikes.mean;
    if (spikeAnalysis.lunchSpikes.count > 0) todaySpikes.lunch = spikeAnalysis.lunchSpikes.mean;
    if (spikeAnalysis.dinnerSpikes.count > 0) todaySpikes.dinner = spikeAnalysis.dinnerSpikes.mean;
    
    baselineComparison = compareWithBaseline(
      todayFasting,
      todaySpikes,
      walkingEffect.reductionMgDl,
      existingBaseline
    );
  }
  
  // 11. パターン検出
  const detectedPatterns = detectPatterns(mealResult.mealEvents, activitySummary);
  
  // 12. 成長トラッカー
  const growthTracker = trackGrowth(
    mealResult.mealEvents,
    activitySummary,
    tirAnalysis.dailyTIR,
    circadianAnalysis.overallRhythmScore,
    previousMilestones
  );
  
  // 13. データ成熟度
  const dataMaturity = assessDataMaturity(firstDataDate || null, hasInitialImport || false);
  
  // 14. 投薬変更検出
  const medicationChange = detectMedicationChange(rawData.bloodGlucose, activitySummary);
  
  // 投薬移行期間判定（直近2週間以内にregimeが変更された場合）
  let isInTransitionPeriod = false;
  if (currentRegime) {
    const regimeStart = new Date(currentRegime.startDate).getTime();
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    isInTransitionPeriod = regimeStart > twoWeeksAgo;
  }
  
  // HeartRateSummary（既存形式との互換性）
  const heartRateSummary = rawData.heartRate.length > 0 ? {
    restingAverage: 0,
    activeAverage: 0,
    hrvAverage: 0,
    stressEvents: [],
    exerciseIntensityEffect: {
      lightExercise: { avgGlucoseDrop: 0, sampleSize: 0 },
      moderateExercise: { avgGlucoseDrop: 0, sampleSize: 0 },
      vigorousExercise: { avgGlucoseDrop: 0, sampleSize: 0 },
    },
  } : undefined;

  return {
    userId,
    period,
    glucoseSummary,
    activitySummary,
    mealGlucoseCorrelation: {
      mealEvents: mealResult.mealEvents,
      mealRecordingRate: mealResult.mealRecordingRate,
      mealRecordingLevel: mealResult.mealRecordingLevel,
    },
    heartRateSummary,
    spikeAnalysis,
    walkingEffect,
    mealIntervalAnalysis,
    timeZonePattern,
    stepsGlucoseCorrelation,
    tirAnalysis,
    circadianAnalysis,
    stressAnalysis,
    baselineComparison,
    detectedPatterns,
    growthTracker,
    dataMaturity,
    currentRegime,
    isInTransitionPeriod,
  };
}

// Re-export key functions for individual use
export { buildBaseline } from './baselineManager';
export { assessDataMaturity } from './dataMaturity';
export { detectMedicationChange } from './medicationChangeDetector';
