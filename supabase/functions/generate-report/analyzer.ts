
import { 
  AdvancedAnalysisRequest, 
  AggregatedReportRequest,
  AnalysisResults, 
  GlucoseSummary, 
  ActivitySummary, 
  MealGlucoseCorrelation,
  HeartRateSummary,
  MealType,
} from './types.ts';

/**
 * 新しい分析フロー: クライアント側で計算済みの分析結果をAnalysisResults形式に変換
 */
export function analyzeAdvancedData(request: AdvancedAnalysisRequest): AnalysisResults {
  const { glucoseSummary, spikeAnalysis, walkingEffect, circadianAnalysis, 
          stressAnalysis, baselineComparison, growthTracker, 
          detectedPatterns, dataMaturity, tirAnalysis } = request;
  
  const glucoseControl = evaluateGlucoseControl(glucoseSummary);
  
  return {
    glucoseControl: {
      ...glucoseControl,
      timeInRange: tirAnalysis.tir,
      timeBelowRange: tirAnalysis.timeBelowRange,
      timeAboveRange: tirAnalysis.timeAboveRange,
    },
    exerciseEffect: {
      hasSignificantEffect: walkingEffect.isSignificant,
      averageGlucoseReduction: walkingEffect.reductionMgDl,
      bestTimeToExercise: '食後15分以内',
      optimalStepCount: 500,
      confidenceLevel: walkingEffect.sampleSizeWithWalk >= 10 ? 'high' : 
                        walkingEffect.sampleSizeWithWalk >= 5 ? 'medium' : 'low',
    },
    mealPatterns: {
      highestSpikeMeal: spikeAnalysis.worstMeal,
      averageSpikeByMeal: {
        breakfast: spikeAnalysis.breakfastSpikes.mean,
        lunch: spikeAnalysis.lunchSpikes.mean,
        dinner: spikeAnalysis.dinnerSpikes.mean,
      },
      postMealWalkEffectiveness: walkingEffect.reductionMgDl,
    },
    stressAnalysis: stressAnalysis,
    circadianAnalysis: circadianAnalysis,
    baselineComparison: baselineComparison,
    growthTracker: growthTracker,
    trends: {
      weekOverWeek: { glucoseChange: 0, tirChange: 0, stepsChange: 0 },
    },
    anomalies: {
      unexplainedSpikes: stressAnalysis.unexplainedSpikes?.length ?? 0,
      lowGlucoseEvents: 0,
      patternBreaks: [],
    },
    detectedPatterns: detectedPatterns,
    dataMaturity: dataMaturity,
    isInTransitionPeriod: request.isInTransitionPeriod,
  };
}

/**
 * レガシー互換: 既存のAggregatedReportRequestから分析
 */
export function analyzeData(request: AggregatedReportRequest): AnalysisResults {
  const { glucoseSummary, activitySummary, mealGlucoseCorrelation, heartRateSummary } = request;
  
  const glucoseControl = evaluateGlucoseControl(glucoseSummary);
  const exerciseEffect = analyzeExerciseEffect(glucoseSummary, activitySummary, mealGlucoseCorrelation);
  const mealPatterns = analyzeMealPatterns(mealGlucoseCorrelation);

  return {
    glucoseControl: {
      ...glucoseControl,
      timeInRange: glucoseSummary.timeInRange,
      timeBelowRange: glucoseSummary.timeBelowRange,
      timeAboveRange: glucoseSummary.timeAboveRange,
    },
    exerciseEffect,
    mealPatterns,
    trends: { weekOverWeek: { glucoseChange: 0, tirChange: 0, stepsChange: 0 } },
    anomalies: { unexplainedSpikes: 0, lowGlucoseEvents: 0, patternBreaks: [] },
    detectedPatterns: [],
    dataMaturity: { level: 'learning', dataAgeDays: 0, featuresAvailable: [], featuresLocked: [] },
    isInTransitionPeriod: false,
  };
}

function evaluateGlucoseControl(summary: GlucoseSummary) {
  const tir = summary.timeInRange;
  const stdDev = summary.stdDev;
  let score = 0;
  
  if (tir >= 80) score += 60;
  else if (tir >= 70) score += 50;
  else if (tir >= 60) score += 40;
  else if (tir >= 50) score += 30;
  else score += 20;
  
  if (stdDev <= 25) score += 20;
  else if (stdDev <= 35) score += 15;
  else if (stdDev <= 45) score += 10;
  else score += 5;
  
  if (summary.timeBelowRange <= 1) score += 20;
  else if (summary.timeBelowRange <= 4) score += 15;
  else if (summary.timeBelowRange <= 7) score += 10;
  else score += 5;
  
  let grade: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  if (score >= 85) grade = 'excellent';
  else if (score >= 70) grade = 'good';
  else if (score >= 55) grade = 'fair';
  else grade = 'needs_improvement';
  
  const mainIssues: string[] = [];
  if (tir < 70) mainIssues.push('血糖値が安定している時間を増やそう');
  if (stdDev > 40) mainIssues.push('血糖値の上下が大きめ');
  if (summary.timeBelowRange > 4) mainIssues.push('血糖値が低くなることがある');
  if (summary.timeAboveRange > 25) mainIssues.push('血糖値が高めの時間が多い');
  
  return { grade, score, tirTrend: 'stable' as const, mainIssues };
}

function analyzeExerciseEffect(glucose: GlucoseSummary, activity: ActivitySummary, meals: MealGlucoseCorrelation) {
  const mealsWithWalk = meals.mealEvents.filter(m => m.postMealSteps >= 500);
  const mealsWithoutWalk = meals.mealEvents.filter(m => m.postMealSteps < 200);
  
  if (mealsWithWalk.length < 3 || mealsWithoutWalk.length < 3) {
    return {
      hasSignificantEffect: false,
      averageGlucoseReduction: 0,
      bestTimeToExercise: '食後15分以内',
      optimalStepCount: 500,
      confidenceLevel: 'low' as const
    };
  }
  
  const avgSpikeWithWalk = mealsWithWalk.reduce((sum, m) => sum + (m.peakGlucose - m.preGlucose), 0) / mealsWithWalk.length;
  const avgSpikeWithoutWalk = mealsWithoutWalk.reduce((sum, m) => sum + (m.peakGlucose - m.preGlucose), 0) / mealsWithoutWalk.length;
  const reduction = avgSpikeWithoutWalk - avgSpikeWithWalk;
  
  return {
    hasSignificantEffect: reduction >= 15,
    averageGlucoseReduction: Math.round(reduction),
    bestTimeToExercise: '食後15分以内',
    optimalStepCount: 500,
    confidenceLevel: mealsWithWalk.length >= 10 ? 'high' as const : 'medium' as const
  };
}

function analyzeMealPatterns(meals: MealGlucoseCorrelation) {
  const byType: Record<string, number[]> = { breakfast: [], lunch: [], dinner: [] };
  for (const m of meals.mealEvents) {
    if (m.mealType in byType) {
      byType[m.mealType].push(m.peakGlucose - m.preGlucose);
    }
  }
  
  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
  
  const breakfast = avg(byType.breakfast);
  const lunch = avg(byType.lunch);
  const dinner = avg(byType.dinner);
  
  const highest = Math.max(breakfast, lunch, dinner);
  const highestMeal: MealType = highest === breakfast ? 'breakfast' : highest === lunch ? 'lunch' : 'dinner';
  
  return {
    highestSpikeMeal: highestMeal,
    averageSpikeByMeal: { breakfast, lunch, dinner },
    postMealWalkEffectiveness: 20
  };
}
