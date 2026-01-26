
export interface HealthKitData {
  bloodGlucose: {
    value: number;
    timestamp: string; // ISO Date
    source: string;
  }[];
  steps: {
    count: number;
    startTime: string;
    endTime: string;
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
    peakTime: number;
    returnToBaseline: number;
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

export interface AnalysisResults {
  glucoseControl: {
    grade: 'excellent' | 'good' | 'fair' | 'needs_improvement';
    score: number;
    tirTrend: 'improving' | 'stable' | 'declining';
    mainIssues: string[];
  };
  exerciseEffect: {
    hasSignificantEffect: boolean;
    averageGlucoseReduction: number;
    bestTimeToExercise: string;
    optimalStepCount: number;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
  mealPatterns: {
    highestSpikeMeal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    averageSpikeByMeal: {
      breakfast: number;
      lunch: number;
      dinner: number;
    };
    postMealWalkEffectiveness: number;
  };
  stressAnalysis?: {
    hasCorrelation: boolean;
    correlationStrength: number;
    highStressPeriods: string[];
    stressGlucoseImpact: number;
  };
  trends: {
    weekOverWeek: {
      glucoseChange: number;
      tirChange: number;
      stepsChange: number;
    };
  };
  anomalies: {
    unexplainedSpikes: number;
    lowGlucoseEvents: number;
    patternBreaks: string[];
  };
}

export interface InsightCollection {
  mainInsight: {
    title: string;
    description: string;
    emoji: string;
  };
  exerciseInsight: {
    title: string;
    description: string;
    recommendation: string;
  };
  mealInsight: {
    title: string;
    description: string;
    recommendation: string;
  };
  stressInsight?: {
    title: string;
    description: string;
    recommendation: string;
  };
  weeklyTip: string;
  encouragement: string;
}

export interface GeneratedReport {
  reportId: string;
  userId: string;
  generatedAt: string;
  period: {
    type: 'daily' | 'weekly' | 'monthly';
    startDate: string;
    endDate: string;
  };
  analysis: AnalysisResults;
  insights: InsightCollection;
  suggestedChallenges: any[]; // refine later
  actionItems: any[]; // refine later
}
