export interface HealthKitData {
  bloodGlucose: {
    value: number;
    timestamp: string;
    source: string;
  }[];
  steps: {
    count: number;
    startTime: string;
    endTime: string;
  }[];
  heartRate: {
    bpm: number;
    timestamp: string;
  }[];
}

export interface AggregatedReportRequest {
  userId: string;
  period: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    startDate: string;
    endDate: string;
  };
  glucoseSummary: GlucoseSummary;
  activitySummary: ActivitySummary;
  mealGlucoseCorrelation: MealGlucoseCorrelation;
  heartRateSummary?: HeartRateSummary;
}

export interface GlucoseSummary {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  timeInRange: number;
  timeBelowRange: number;
  timeAboveRange: number;
  hourlyAverages: {
    hour: number;
    average: number;
    dataPoints: number;
  }[];
  dailySummaries: {
    date: string;
    mean: number;
    tir: number;
    spikesCount: number;
  }[];
}

export interface ActivitySummary {
  dailySteps: {
    date: string;
    totalSteps: number;
    flightsClimbed: number;
    activeMinutes: number;
  }[];
  hourlyStepPattern: {
    hour: number;
    averageSteps: number;
  }[];
}

export interface MealGlucoseCorrelation {
  mealEvents: {
    mealTime: string;
    preGlucose: number;
    peakGlucose: number;
    peakTime: number; // minutes
    returnToBaseline: number; // minutes
    postMealSteps: number;
    spikeReduction: number;
  }[];
}

export interface HeartRateSummary {
  restingAverage: number;
  activeAverage: number;
  hrvAverage: number;
  stressEvents: {
    timestamp: string;
    duration: number;
    glucoseCorrelation: number;
  }[];
  exerciseIntensityEffect: {
    lightExercise: { avgGlucoseDrop: number; sampleSize: number };
    moderateExercise: { avgGlucoseDrop: number; sampleSize: number };
    vigorousExercise: { avgGlucoseDrop: number; sampleSize: number };
  };
}

export interface GeneratedReport {
  reportId: string;
  userId: string;
  generatedAt: string;
  period: any; // Simplified
  analysis: any;
  insights: any;
  suggestedChallenges: any[];
  actionItems: any[];
}
