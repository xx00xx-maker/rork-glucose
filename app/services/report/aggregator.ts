
import { 
  HealthKitData, 
  AggregatedReportRequest, 
  GlucoseSummary,
  ActivitySummary,
  MealGlucoseCorrelation
} from './types';

export function prepareDataForUpload(
  userId: string, 
  period: { type: 'daily' | 'weekly' | 'monthly' | 'custom', startDate: string, endDate: string },
  rawData: HealthKitData
): AggregatedReportRequest {
  
  const glucoseSummary = calculateGlucoseSummary(rawData.bloodGlucose);
  const activitySummary = calculateActivitySummary(rawData.steps);
  // Scan for potential meal events using glucose spikes as a proxy since we don't have manual meal logs yet
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
  // Median
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  // StdDev
  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
  
  // TIR (70-140)
  const inRange = values.filter(v => v >= 70 && v <= 140).length;
  const belowRange = values.filter(v => v < 70).length;
  const aboveRange = values.filter(v => v > 140).length;
  
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
    const dayTir = vals.filter(v => v >= 70 && v <= 140).length / vals.length * 100;
    // Simple spike count: values > 180
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

        // Hourly (Assumes steps are broken down, if they are daily totals this won't work well but usually HK provides hourly)
        const current = hourlyMap.get(hour)!;
        current.sum += s.count;
        current.count += 1; // Depending on granularity, this might interpret multiple samples in same hour
    });

    const dailySteps = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        totalSteps: data.steps,
        flightsClimbed: 0, // Not implemented yet
        activeMinutes: Math.round(data.steps / 100) // Rough estimation
    })).sort((a, b) => a.date.localeCompare(b.date));

    // For hourly patterns, we want average steps per hour across all days
    // If the data is hourly samples
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

function analyzeMealGlucoseCorrelation(glucose: HealthKitData['bloodGlucose'], steps: HealthKitData['steps']): MealGlucoseCorrelation {
    // Heuristic: Detect "Meals" by finding rapid glucose rises
    // A rise of > 20mg/dL over 30 mins
    
    // 1. Sort glucose by time
    const sortedG = [...glucose].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const mealEvents = [];
    const SPIKE_THRESHOLD = 20;
    
    // We iterate and look for start of spike
    let i = 0;
    while (i < sortedG.length - 1) {
        const start = sortedG[i];
        let peak = start;
        let peakIdx = i;
        
        // Look ahead 60 mins for a peak
        let j = i + 1;
        while (j < sortedG.length) {
            const current = sortedG[j];
            const timeDiff = (new Date(current.timestamp).getTime() - new Date(start.timestamp).getTime()) / 60000;
            
            if (timeDiff > 90) break; // Stop looking after 90 mins
            
            if (current.value > peak.value) {
                peak = current;
                peakIdx = j;
            }
            j++;
        }
        
        // Check if it's a significant spike
        if (peak.value - start.value >= SPIKE_THRESHOLD) {
             const riseTime = (new Date(peak.timestamp).getTime() - new Date(start.timestamp).getTime()) / 60000;
             // Ensure rise is "rapid" enough (e.g., not just drift over 2 hours)
             if (riseTime > 15 && riseTime < 90) {
                 // Found a potential meal event at 'start'
                 const mealTime = new Date(start.timestamp);
                 
                 // Find return to baseline
                 let returnTime = 120; // Default cap
                 for (let k = peakIdx + 1; k < sortedG.length; k++) {
                     const current = sortedG[k];
                     const tDiff = (new Date(current.timestamp).getTime() - mealTime.getTime()) / 60000;
                     if (tDiff > 120) break;
                     if (current.value <= start.value + 10) {
                         returnTime = tDiff;
                         break;
                     }
                 }

                 // Calculate post-meal steps (60 mins after "meal")
                 const postMealSteps = steps
                    .filter(s => {
                        const st = new Date(s.startTime).getTime();
                        return st >= mealTime.getTime() && st <= mealTime.getTime() + 60 * 60000;
                    })
                    .reduce((sum, s) => sum + s.count, 0);

                 mealEvents.push({
                     mealTime: mealTime.toISOString(),
                     preGlucose: start.value,
                     peakGlucose: peak.value,
                     peakTime: Math.round(riseTime),
                     returnToBaseline: Math.round(returnTime),
                     postMealSteps,
                     spikeReduction: 0 // Cannot Estimate without predictive model
                 });
                 
                 // Skip forward to avoid detecting same spike multiple times
                 i = peakIdx; 
             }
        }
        i++;
    }

    return {
        mealEvents
    };
}

function emptyGlucoseSummary(): GlucoseSummary {
    return {
        mean: 0, median: 0, stdDev: 0, min: 0, max: 0,
        timeInRange: 0, timeBelowRange: 0, timeAboveRange: 0,
        hourlyAverages: [], dailySummaries: []
    };
}
