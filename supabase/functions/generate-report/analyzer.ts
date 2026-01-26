
import { 
  AggregatedReportRequest, 
  AnalysisResults, 
  GlucoseSummary, 
  ActivitySummary, 
  MealGlucoseCorrelation,
  HeartRateSummary
} from './types.ts';

export function analyzeData(request: AggregatedReportRequest): AnalysisResults {
  const { glucoseSummary, activitySummary, mealGlucoseCorrelation, heartRateSummary } = request;
  
  const glucoseControl = evaluateGlucoseControl(glucoseSummary);
  const exerciseEffect = analyzeExerciseEffect(glucoseSummary, activitySummary, mealGlucoseCorrelation);
  const mealPatterns = analyzeMealPatterns(mealGlucoseCorrelation);
  const stressAnalysis = heartRateSummary ? analyzeStressCorrelation(heartRateSummary, glucoseSummary) : undefined;
  const trends = analyzeTrends(glucoseSummary); // You'll need to implement or mock this as it wasn't fully detailed in the snippet
  const anomalies = detectAnomalies(glucoseSummary, mealGlucoseCorrelation);

  return {
    glucoseControl,
    exerciseEffect,
    mealPatterns,
    stressAnalysis,
    trends,
    anomalies
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
  if (tir < 70) mainIssues.push('目標範囲内時間の改善');
  if (stdDev > 40) mainIssues.push('血糖値の変動幅が大きい');
  if (summary.timeBelowRange > 4) mainIssues.push('低血糖への注意');
  if (summary.timeAboveRange > 25) mainIssues.push('高血糖の頻度が高い');
  
  return { grade, score, tirTrend: 'stable' as const, mainIssues };
}

function analyzeExerciseEffect(glucose: GlucoseSummary, activity: ActivitySummary, meals: MealGlucoseCorrelation) {
  const mealsWithWalk = meals.mealEvents.filter(m => m.postMealSteps >= 500);
  const mealsWithoutWalk = meals.mealEvents.filter(m => m.postMealSteps < 200);
  
  if (mealsWithWalk.length < 3 || mealsWithoutWalk.length < 3) {
    return {
      hasSignificantEffect: false,
      averageGlucoseReduction: 0,
      bestTimeToExercise: '食後30分以内',
      optimalStepCount: 1000,
      confidenceLevel: 'low' as const
    };
  }
  
  const avgSpikeWithWalk = mealsWithWalk.reduce((sum, m) => sum + (m.peakGlucose - m.preGlucose), 0) / mealsWithWalk.length;
  const avgSpikeWithoutWalk = mealsWithoutWalk.reduce((sum, m) => sum + (m.peakGlucose - m.preGlucose), 0) / mealsWithoutWalk.length;
  const reduction = avgSpikeWithoutWalk - avgSpikeWithWalk;
  
  // Simple heuristic for optimal steps
  let optimalSteps = 1000;
  // This logic could be more complex, finding the step count where spike reduction plateaus
  
  return {
    hasSignificantEffect: reduction >= 15,
    averageGlucoseReduction: Math.round(reduction),
    bestTimeToExercise: '食後30分以内',
    optimalStepCount: optimalSteps,
    confidenceLevel: mealsWithWalk.length >= 10 ? 'high' as const : 'medium' as const
  };
}

function analyzeMealPatterns(meals: MealGlucoseCorrelation) {
  // Placeholder logic needs real implementation based on meal types if available
  // The interface doesn't strictly have meal types yet, so we'll infer or return defaults
  return {
    highestSpikeMeal: 'dinner' as const, // Placeholder
    averageSpikeByMeal: {
      breakfast: 30, // Placeholder
      lunch: 40,
      dinner: 50
    },
    postMealWalkEffectiveness: 20 // percent
  };
}

function analyzeStressCorrelation(heartRate: HeartRateSummary, glucose: GlucoseSummary) {
   const stressEvents = heartRate.stressEvents;
   if (stressEvents.length < 5) {
     return {
       hasCorrelation: false,
       correlationStrength: 0,
       highStressPeriods: [],
       stressGlucoseImpact: 0
     };
   }
   const stressGlucoseAvg = stressEvents.reduce((sum, e) => sum + e.glucoseCorrelation, 0) / stressEvents.length;
   const impact = stressGlucoseAvg - glucose.mean;
   
   return {
     hasCorrelation: impact >= 20,
     correlationStrength: Math.min(1, Math.abs(impact) / 50),
     highStressPeriods: [], // Need implementation to group by time
     stressGlucoseImpact: Math.round(impact)
   };
}

function analyzeTrends(glucose: GlucoseSummary) {
    return {
        weekOverWeek: {
            glucoseChange: 0,
            tirChange: 0,
            stepsChange: 0
        }
    };
}

function detectAnomalies(glucose: GlucoseSummary, meals: MealGlucoseCorrelation) {
    return {
        unexplainedSpikes: 0,
        lowGlucoseEvents: 0,
        patternBreaks: []
    };
}
