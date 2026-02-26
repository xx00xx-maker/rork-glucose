
// ============================================================
// HealthKit Raw Data Types (Server-side mirror)
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
  spikeMagnitude: number;
  spikeCategory: SpikeCategory;
  peakTime: number;
  returnToBaseline: number;
  postMealSteps: number;
  isEstimated: boolean;
  confidence: MealConfidence;
}

// ============================================================
// Core Summaries
// ============================================================

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
  mealEvents: MealEvent[];
  mealRecordingRate: number;
  mealRecordingLevel: 'sufficient' | 'partial' | 'insufficient';
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

// ============================================================
// Analysis Result Types (received from client)
// ============================================================

export type TimeZone = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
export type BaselineComparison = 'normal' | 'better' | 'worse' | 'personal_best';
export type DataMaturityLevel = 'learning' | 'basic' | 'advanced';

export interface SpikeAnalysisResult {
  breakfastSpikes: { mean: number; count: number; category: SpikeCategory };
  lunchSpikes: { mean: number; count: number; category: SpikeCategory };
  dinnerSpikes: { mean: number; count: number; category: SpikeCategory };
  averagePeakTime: number;
  averageRecoveryTime: number;
  worstMeal: MealType;
}

export interface WalkingEffectResult {
  withWalkSpike: number;
  withoutWalkSpike: number;
  reductionPercent: number;
  reductionMgDl: number;
  peakTimeReduction: number;
  sampleSizeWithWalk: number;
  sampleSizeWithoutWalk: number;
  isSignificant: boolean;
}

export interface MealIntervalResult {
  averageInterval: number;
  longIntervalCount: number;
  longIntervalExtraSpike: number;
  isSignificant: boolean;
}

export interface TimeZonePatternResult {
  zones: {
    zone: TimeZone;
    label: string;
    hourRange: [number, number];
    averageGlucose: number;
    riskLevel: 'low' | 'moderate' | 'high';
  }[];
  highestRiskZone: TimeZone;
}

export interface StepsGlucoseCorrelationResult {
  correlationCoefficient: number;
  highStepDayFastingAvg: number;
  lowStepDayFastingAvg: number;
  difference: number;
  dataPointCount: number;
  isSignificant: boolean;
}

export interface TIRAnalysisResult {
  tir: number;
  timeBelowRange: number;
  timeAboveRange: number;
  tirHoursPerDay: number;
  unstableTimeZones: TimeZone[];
  dailyTIR: { date: string; tir: number }[];
}

export interface CircadianAnalysisResult {
  mealRhythm: {
    breakfastStdMinutes: number;
    lunchStdMinutes: number;
    dinnerStdMinutes: number;
    overallLabel: 'stable' | 'slightly_irregular' | 'irregular';
    stableDaysTIR: number;
    unstableDaysTIR: number;
  };
  dinnerTimeSensitivity: {
    early: { timeRange: string; avgSpike: number; count: number };
    mid: { timeRange: string; avgSpike: number; count: number };
    late: { timeRange: string; avgSpike: number; count: number };
    veryLate: { timeRange: string; avgSpike: number; count: number };
  };
  activityRhythm: {
    estimatedActivityStart: number;
    estimatedActivityEnd: number;
    weekdayStart: number;
    weekendStart: number;
    socialJetLag: boolean;
    socialJetLagImpact?: number;
  };
  nightPattern: {
    estimatedSleepOnset: number;
    estimatedWakeTime: number;
    isEstimate: true;
  };
  dawnPhenomenon: {
    averageRise: number;
    averageStartHour: number;
    averagePeakValue: number;
    correlationWithDinnerTime: number;
    correlationWithSteps: number;
    correlationWithSleepOnset: number;
    dailyDawn: { date: string; rise: number; startHour: number }[];
  };
  overallRhythmScore: number;
  scoreBreakdown: {
    mealRhythm: number;
    activityRhythm: number;
    sleepOnsetStability: number;
    dawnConsistency: number;
  };
}

export interface StressAnalysisResult {
  mode: 'heart_rate' | 'glucose_only';
  hasHeartRateData: boolean;
  heartRateStressEvents?: {
    timestamp: string;
    bpmIncrease: number;
    duration: number;
    glucoseImpact: number;
  }[];
  unexplainedSpikes?: {
    timestamp: string;
    magnitude: number;
    confidence: MealConfidence;
  }[];
  nighttimeElevation?: {
    averageNightGlucose: number;
    isElevated: boolean;
  };
  abnormalDawnPhenomenon?: {
    isAbnormal: boolean;
    excessRise: number;
  };
  overallStressIndicator: 'none_detected' | 'possible' | 'likely';
  confidenceLevel: MealConfidence;
}

export interface BaselineComparisonResult {
  overallComparison: BaselineComparison;
  fastingComparison: BaselineComparison;
  spikeComparison: { [key: string]: BaselineComparison };
  walkingEffectComparison: BaselineComparison;
  deviationSigma: number;
}

export interface DetectedPattern {
  description: string;
  confidence: number;
  sampleSize: number;
  occurrences: number;
  category: 'meal_timing' | 'exercise' | 'weekday' | 'meal_interval' | 'other';
}

export interface GrowthTrackerResult {
  weeklyTrends: {
    week: string;
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
    isNew: boolean;
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

export interface DataMaturityInfo {
  level: DataMaturityLevel;
  dataAgeDays: number;
  featuresAvailable: string[];
  featuresLocked: { name: string; daysUntilAvailable: number }[];
}

export interface MedicationRegime {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
}

// ============================================================
// Advanced Analysis Request (received from client)
// ============================================================

export interface AdvancedAnalysisRequest {
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
  spikeAnalysis: SpikeAnalysisResult;
  walkingEffect: WalkingEffectResult;
  mealIntervalAnalysis: MealIntervalResult;
  timeZonePattern: TimeZonePatternResult;
  stepsGlucoseCorrelation: StepsGlucoseCorrelationResult;
  tirAnalysis: TIRAnalysisResult;
  circadianAnalysis: CircadianAnalysisResult;
  stressAnalysis: StressAnalysisResult;
  baselineComparison?: BaselineComparisonResult;
  detectedPatterns: DetectedPattern[];
  growthTracker?: GrowthTrackerResult;
  dataMaturity: DataMaturityInfo;
  currentRegime?: MedicationRegime;
  isInTransitionPeriod: boolean;
}

// ============================================================
// Legacy compat
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
// Analysis Results (for analyzer.ts output)
// ============================================================

export interface AnalysisResults {
  glucoseControl: {
    grade: 'excellent' | 'good' | 'fair' | 'needs_improvement';
    score: number;
    tirTrend: 'improving' | 'stable' | 'declining';
    mainIssues: string[];
    timeInRange: number;
    timeBelowRange: number;
    timeAboveRange: number;
  };
  exerciseEffect: {
    hasSignificantEffect: boolean;
    averageGlucoseReduction: number;
    bestTimeToExercise: string;
    optimalStepCount: number;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
  mealPatterns: {
    highestSpikeMeal: MealType;
    averageSpikeByMeal: {
      breakfast: number;
      lunch: number;
      dinner: number;
    };
    postMealWalkEffectiveness: number;
  };
  stressAnalysis?: StressAnalysisResult;
  circadianAnalysis?: CircadianAnalysisResult;
  baselineComparison?: BaselineComparisonResult;
  growthTracker?: GrowthTrackerResult;
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
  detectedPatterns: DetectedPattern[];
  dataMaturity: DataMaturityInfo;
  isInTransitionPeriod: boolean;
}

// ============================================================
// Daily Insight Collection
// ============================================================

export interface DailyInsightCollection {
  overallComment: string;             // 総合評価（一言コメント）
  mealSpikeSummary: {
    breakfast: string;
    lunch: string;
    dinner: string;
    comparison: string;               // 過去との比較
  };
  walkingEffectComment: string;       // 食後歩行の効果
  cautionTimeZones: string;           // 注意すべき時間帯
  actionItems: string[];              // 1-2個の具体的アクション
  encouragement: string;
}

// ============================================================
// Weekly Insight Collection
// ============================================================

export interface WeeklyInsightCollection {
  weekSummary: string;                // 1週間の総合評価
  mealAnalysis: {
    spikeTrends: string;
    timeZoneImpact: string;
  };
  exerciseAnalysis: {
    walkingEffect: string;
    stepsTrend: string;
  };
  rhythmAnalysis: {
    rhythmScore: number;
    circadianFindings: string;
  };
  glucoseStability: string;           // 血糖安定性分析
  stressComment?: string;             // ストレスの可能性（該当時のみ）
  discoveredPatterns?: string[];      // 発見された個人パターン
  growthProgress: string;             // 成長トラッカー進捗
  newMilestones?: string[];           // マイルストーン
  weeklyGoals: string[];              // 来週の目標3つ（数値付き）
  encouragement: string;              // 励ましメッセージ
  medicalAlert?: string;              // 医師相談推奨警告
}

// ============================================================
// Unified Insight Collection (backward compat)
// ============================================================

export interface InsightCollection {
  mainInsight: {
    title: string;
    description: string;
    emoji?: string;
  };
  exerciseInsight: {
    title: string;
    description: string;
    recommendation?: string;
  };
  mealInsight: {
    title: string;
    description: string;
    recommendation?: string;
  };
  stressInsight?: {
    title: string;
    description: string;
    recommendation: string;
  };
  weeklyTip: string;
  encouragement: string;

  // Extended: daily/weekly specific
  daily?: DailyInsightCollection;
  weekly?: WeeklyInsightCollection;
}

// ============================================================
// Generated Report
// ============================================================

export interface GeneratedReport {
  reportId: string;
  userId: string;
  generatedAt: string;
  period: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    startDate: string;
    endDate: string;
  };
  analysis: AnalysisResults;
  insights: InsightCollection;
  suggestedChallenges: any[];
  actionItems: any[];
}
