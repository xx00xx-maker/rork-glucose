
import { 
  HealthKitData, 
  AggregatedReportRequest, 
  GlucoseSummary,
  ActivitySummary,
  MealGlucoseCorrelation
} from './types';

export function prepareDataForUpload(
  userId: string, 
  period: { type: 'daily' | 'weekly' | 'monthly', startDate: string, endDate: string },
  rawData: HealthKitData
): AggregatedReportRequest {
  
  const glucoseSummary = calculateGlucoseSummary(rawData.bloodGlucose);
  const activitySummary = calculateActivitySummary(rawData.steps);
  const mealGlucoseCorrelation = analyzeMealGlucoseCorrelation(rawData.bloodGlucose, rawData.steps);
  
  return {
    userId,
    period,
    glucoseSummary,
    activitySummary,
    mealGlucoseCorrelation
  };
}

function calculateGlucoseSummary(glucoseData: HealthKitData['bloodGlucose']): GlucoseSummary {
  if (glucoseData.length === 0) {
      return emptyGlucoseSummary();
  }
  
  const values = glucoseData.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
  
  // TIR (70-140)
  const inRange = values.filter(v => v >= 70 && v <= 140).length;
  const belowRange = values.filter(v => v < 70).length;
  const aboveRange = values.filter(v => v > 140).length;
  
  // Daily summaries (simplified for now)
  const dailySummaries = []; 
  
  return {
    mean: Math.round(mean),
    median: Math.round(median),
    stdDev: Math.round(stdDev * 10) / 10,
    min: Math.min(...values),
    max: Math.max(...values),
    timeInRange: Math.round((inRange / values.length) * 100 * 10) / 10,
    timeBelowRange: Math.round((belowRange / values.length) * 100 * 10) / 10,
    timeAboveRange: Math.round((aboveRange / values.length) * 100 * 10) / 10,
    hourlyAverages: [], // Implement if needed
    dailySummaries: [] // Implement if needed
  };
}

function calculateActivitySummary(steps: HealthKitData['steps']): ActivitySummary {
    // Simplified implementation
    return {
        dailySteps: [],
        hourlyStepPattern: []
    };
}

function analyzeMealGlucoseCorrelation(glucose: HealthKitData['bloodGlucose'], steps: HealthKitData['steps']): MealGlucoseCorrelation {
    // Simplified implementation - requires meal log data usually
    return {
        mealEvents: []
    };
}

function emptyGlucoseSummary(): GlucoseSummary {
    return {
        mean: 0, median: 0, stdDev: 0, min: 0, max: 0,
        timeInRange: 0, timeBelowRange: 0, timeAboveRange: 0,
        hourlyAverages: [], dailySummaries: []
    };
}
