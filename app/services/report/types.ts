// ============================================================
// HealthKit Raw Data Types
// ============================================================

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

// ============================================================
// Meal Types
// ============================================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealConfidence = 'high' | 'medium' | 'low';
export type SpikeCategory = 'good' | 'slightly_high' | 'high' | 'caution';

export interface MealEvent {
  mealTime: string;
  mealType: MealType;
  preGlucose: number;
  peakGlucose: number;
  spikeMagnitude: number;       // peakGlucose - preGlucose
  spikeCategory: SpikeCategory; // ≤30=good, ≤50=slightly_high, ≤70=high, >70=caution
  peakTime: number;             // minutes to reach peak
  returnToBaseline: number;     // minutes to return
  postMealSteps: number;
  isEstimated: boolean;         // CGM波形から推定されたか
  confidence: MealConfidence;
}

// ============================================================
// Glucose Summary
// ============================================================

export interface GlucoseSummary {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  timeInRange: number;       // 70-180 mg/dL
  timeBelowRange: number;    // <70 mg/dL
  timeAboveRange: number;    // >180 mg/dL
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

// ============================================================
// Activity Summary
// ============================================================

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

// ============================================================
// Meal Glucose Correlation (legacy compat + extended)
// ============================================================

export interface MealGlucoseCorrelation {
  mealEvents: MealEvent[];
  mealRecordingRate: number;      // 0-100%
  mealRecordingLevel: 'sufficient' | 'partial' | 'insufficient'; // ≥70% / 30-70% / <30%
}

// ============================================================
// Heart Rate Summary
// ============================================================

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

// ============================================================
// Spike Analysis
// ============================================================

export interface SpikeAnalysisResult {
  breakfastSpikes: { mean: number; count: number; category: SpikeCategory };
  lunchSpikes: { mean: number; count: number; category: SpikeCategory };
  dinnerSpikes: { mean: number; count: number; category: SpikeCategory };
  averagePeakTime: number;        // minutes
  averageRecoveryTime: number;    // minutes
  worstMeal: MealType;
}

// ============================================================
// Walking Effect Analysis
// ============================================================

export interface WalkingEffectResult {
  withWalkSpike: number;          // avg spike when walked ≥500 steps within 1h
  withoutWalkSpike: number;       // avg spike when not walked
  reductionPercent: number;       // % reduction
  reductionMgDl: number;          // absolute mg/dL reduction
  peakTimeReduction: number;      // minutes earlier peak
  sampleSizeWithWalk: number;
  sampleSizeWithoutWalk: number;
  isSignificant: boolean;         // enough data to be meaningful
}

// ============================================================
// Meal Interval Analysis
// ============================================================

export interface MealIntervalResult {
  averageInterval: number;        // hours
  longIntervalCount: number;      // intervals > 6 hours
  longIntervalExtraSpike: number; // avg extra mg/dL after long interval
  isSignificant: boolean;
}

// ============================================================
// Time Zone Pattern Analysis
// ============================================================

export type TimeZone = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export interface TimeZonePatternResult {
  zones: {
    zone: TimeZone;
    label: string;               // 朝(6-10), 昼(10-14), etc.
    hourRange: [number, number];
    averageGlucose: number;
    riskLevel: 'low' | 'moderate' | 'high';
  }[];
  highestRiskZone: TimeZone;
}

// ============================================================
// Steps-Glucose Correlation
// ============================================================

export interface StepsGlucoseCorrelationResult {
  correlationCoefficient: number; // r value
  highStepDayFastingAvg: number;  // avg fasting BG on high-step days
  lowStepDayFastingAvg: number;   // avg fasting BG on low-step days
  difference: number;             // mg/dL lower on high-step days
  dataPointCount: number;
  isSignificant: boolean;
}

// ============================================================
// TIR (Time in Range) Analysis
// ============================================================

export interface TIRAnalysisResult {
  tir: number;                    // 70-180 mg/dL, percentage
  timeBelowRange: number;         // <70
  timeAboveRange: number;         // >180
  tirHoursPerDay: number;
  unstableTimeZones: TimeZone[];  // zones with most out-of-range time
  dailyTIR: { date: string; tir: number }[];
}

// ============================================================
// Circadian Rhythm Analysis
// ============================================================

export interface CircadianAnalysisResult {
  mealRhythm: {
    breakfastStdMinutes: number;
    lunchStdMinutes: number;
    dinnerStdMinutes: number;
    overallLabel: 'stable' | 'slightly_irregular' | 'irregular';  // ≤30min / 30-60min / >60min
    stableDaysTIR: number;       // avg TIR on rhythm-stable days
    unstableDaysTIR: number;     // avg TIR on rhythm-unstable days
  };

  dinnerTimeSensitivity: {
    early: { timeRange: string; avgSpike: number; count: number };  // 18:00-19:00
    mid: { timeRange: string; avgSpike: number; count: number };    // 19:00-20:00
    late: { timeRange: string; avgSpike: number; count: number };   // 20:00-21:00
    veryLate: { timeRange: string; avgSpike: number; count: number }; // 21:00+
  };

  activityRhythm: {
    estimatedActivityStart: number;  // hour
    estimatedActivityEnd: number;    // hour
    weekdayStart: number;
    weekendStart: number;
    socialJetLag: boolean;           // >2h difference
    socialJetLagImpact?: number;     // mg/dL difference
  };

  nightPattern: {
    estimatedSleepOnset: number;     // hour (fractional)
    estimatedWakeTime: number;       // hour (fractional)
    isEstimate: true;                // always true - "推測に基づく参考値"
  };

  dawnPhenomenon: {
    averageRise: number;             // mg/dL rise 3-6am
    averageStartHour: number;
    averagePeakValue: number;
    correlationWithDinnerTime: number;
    correlationWithSteps: number;
    correlationWithSleepOnset: number;
    dailyDawn: { date: string; rise: number; startHour: number }[];
  };

  overallRhythmScore: number;       // 0-100
  scoreBreakdown: {
    mealRhythm: number;             // weight 30%
    activityRhythm: number;         // weight 25%
    sleepOnsetStability: number;    // weight 25%
    dawnConsistency: number;        // weight 20%
  };
}

// ============================================================
// Stress Analysis
// ============================================================

export interface StressAnalysisResult {
  mode: 'heart_rate' | 'glucose_only';
  hasHeartRateData: boolean;

  // Heart rate mode
  heartRateStressEvents?: {
    timestamp: string;
    bpmIncrease: number;
    duration: number;           // minutes
    glucoseImpact: number;      // mg/dL change
  }[];

  // Glucose-only mode
  unexplainedSpikes?: {
    timestamp: string;
    magnitude: number;
    confidence: MealConfidence;
  }[];
  nighttimeElevation?: {
    averageNightGlucose: number;
    isElevated: boolean;        // >130 during 23:00-3:00
  };
  abnormalDawnPhenomenon?: {
    isAbnormal: boolean;
    excessRise: number;         // mg/dL above personal average
  };

  overallStressIndicator: 'none_detected' | 'possible' | 'likely';
  confidenceLevel: MealConfidence;
}

// ============================================================
// Personal Baseline
// ============================================================

export interface PersonalBaseline {
  regimeId: string;               // current medication regime
  fastingGlucose: { mean: number; stdDev: number };
  spikeByMeal: {
    breakfast: { mean: number; stdDev: number };
    lunch: { mean: number; stdDev: number };
    dinner: { mean: number; stdDev: number };
  };
  walkingEffect: { mean: number; stdDev: number };
  hourlyBaseline: { hour: number; mean: number; stdDev: number }[];
  dawnPhenomenon: { mean: number; stdDev: number };
  dataPoints: number;
  lastUpdated: string;
}

export type BaselineComparison = 'normal' | 'better' | 'worse' | 'personal_best';

export interface BaselineComparisonResult {
  overallComparison: BaselineComparison;
  fastingComparison: BaselineComparison;
  spikeComparison: { [key in MealType]?: BaselineComparison };
  walkingEffectComparison: BaselineComparison;
  deviationSigma: number;         // how many σ from mean
}

// ============================================================
// Pattern Detection
// ============================================================

export interface DetectedPattern {
  description: string;            // human-readable
  confidence: number;             // 0-100%
  sampleSize: number;
  occurrences: number;
  category: 'meal_timing' | 'exercise' | 'weekday' | 'meal_interval' | 'other';
}

// ============================================================
// Growth Tracker
// ============================================================

export interface GrowthTrackerResult {
  weeklyTrends: {
    week: string;                 // YYYY-Wxx
    avgFastingGlucose: number;
    avgSpike: number;
    avgSteps: number;
    rhythmScore: number;
    tir: number;
  }[];
  milestones: {
    type: string;
    achievedAt: string;
    description: string;
    isNew: boolean;               // newly achieved this period
  }[];
  improvementAreas: {
    area: string;
    currentValue: number;
    previousValue: number;
    changePercent: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];
  stagnationAnalysis?: {
    area: string;
    possibleCauses: string[];
  };
}

// ============================================================
// Medication Change Detection
// ============================================================

export interface MedicationChangeDetection {
  structuralChangeDetected: boolean;
  changeStartDate?: string;
  glucoseMeanBefore: number;
  glucoseMeanAfter: number;
  varianceBefore: number;
  varianceAfter: number;
  daysOfChange: number;
  userConfirmationNeeded: boolean;
}

export interface MedicationRegime {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
}

// ============================================================
// Data Maturity
// ============================================================

export type DataMaturityLevel = 'learning' | 'basic' | 'advanced';

export interface DataMaturityInfo {
  level: DataMaturityLevel;
  dataAgeDays: number;
  featuresAvailable: string[];
  featuresLocked: { name: string; daysUntilAvailable: number }[];
}

// ============================================================
// Advanced Analysis Request (client → Edge Function)
// ============================================================

export interface AdvancedAnalysisRequest {
  userId: string;
  period: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    startDate: string;
    endDate: string;
  };

  // Core summaries (existing, enhanced)
  glucoseSummary: GlucoseSummary;
  activitySummary: ActivitySummary;
  mealGlucoseCorrelation: MealGlucoseCorrelation;
  heartRateSummary?: HeartRateSummary;

  // New analysis results (computed client-side)
  spikeAnalysis: SpikeAnalysisResult;
  walkingEffect: WalkingEffectResult;
  mealIntervalAnalysis: MealIntervalResult;
  timeZonePattern: TimeZonePatternResult;
  stepsGlucoseCorrelation: StepsGlucoseCorrelationResult;
  tirAnalysis: TIRAnalysisResult;
  circadianAnalysis: CircadianAnalysisResult;
  stressAnalysis: StressAnalysisResult;

  // Personalization
  baselineComparison?: BaselineComparisonResult;
  detectedPatterns: DetectedPattern[];
  growthTracker?: GrowthTrackerResult;
  dataMaturity: DataMaturityInfo;

  // Medication context
  currentRegime?: MedicationRegime;
  isInTransitionPeriod: boolean;    // within 2 weeks of medication change
}

// ============================================================
// Legacy compat: AggregatedReportRequest
// ============================================================

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

// ============================================================
// Generated Report (response from Edge Function)
// ============================================================

export interface GeneratedReport {
  reportId: string;
  userId: string;
  generatedAt: string;
  period: any;
  analysis: any;
  insights: any;
  suggestedChallenges: any[];
  actionItems: any[];
}
