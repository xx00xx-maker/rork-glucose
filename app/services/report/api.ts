
import { AggregatedReportRequest, AdvancedAnalysisRequest, GeneratedReport } from './types';
import { supabase } from '../../utils/supabaseClient'; 
import { saveReport } from './localdb';

/**
 * Advanced版レポート生成（新しい分析パイプライン用）
 */
export async function generateAdvancedReport(request: AdvancedAnalysisRequest): Promise<GeneratedReport> {
  if (!supabase) {
    console.warn('[API] Supabase not configured. Returning fallback report.');
    return buildFallbackReport(request);
  }

  const { data, error } = await supabase.functions.invoke('generate-report', {
    body: request
  });

  if (error) {
    console.error("Function invoke error:", error);
    throw error;
  }

  const report = data as GeneratedReport;
  
  try {
    await saveReport(report);
  } catch (e) {
    console.warn("Failed to save report locally:", e);
  }

  return report;
}

/**
 * レガシー版レポート生成（既存の呼び出し元との互換性を維持）
 */
export async function generateReport(request: AggregatedReportRequest): Promise<GeneratedReport> {
  if (!supabase) {
    console.warn('[API] Supabase not configured. Returning mock report.');
    return buildLegacyFallbackReport(request);
  }

  const { data, error } = await supabase.functions.invoke('generate-report', {
    body: request
  });

  if (error) {
    console.error("Function invoke error:", error);
    throw error;
  }

  const report = data as GeneratedReport;
  
  try {
      await saveReport(report);
  } catch (e) {
      console.warn("Failed to save report locally:", e);
  }

  return report;
}

/**
 * Advanced版フォールバックレポート
 */
function buildFallbackReport(request: AdvancedAnalysisRequest): GeneratedReport {
  return {
    reportId: `fallback-${Date.now()}`,
    userId: request.userId,
    generatedAt: new Date().toISOString(),
    period: request.period,
    analysis: {
      glucoseControl: {
        score: 70,
        grade: 'fair',
        tirTrend: 'stable',
        mainIssues: [],
        timeInRange: request.glucoseSummary.timeInRange,
        timeBelowRange: request.glucoseSummary.timeBelowRange,
        timeAboveRange: request.glucoseSummary.timeAboveRange,
      },
      exerciseEffect: {
        hasSignificantEffect: request.walkingEffect.isSignificant,
        averageGlucoseReduction: request.walkingEffect.reductionMgDl,
        bestTimeToExercise: '食後15分以内',
        optimalStepCount: 500,
        confidenceLevel: 'medium',
      },
      mealPatterns: {
        highestSpikeMeal: request.spikeAnalysis.worstMeal,
        averageSpikeByMeal: {
          breakfast: request.spikeAnalysis.breakfastSpikes.mean,
          lunch: request.spikeAnalysis.lunchSpikes.mean,
          dinner: request.spikeAnalysis.dinnerSpikes.mean,
        },
        postMealWalkEffectiveness: request.walkingEffect.reductionMgDl,
      },
      trends: { weekOverWeek: { glucoseChange: 0, tirChange: 0, stepsChange: 0 } },
      anomalies: { unexplainedSpikes: 0, lowGlucoseEvents: 0, patternBreaks: [] },
      detectedPatterns: request.detectedPatterns || [],
      dataMaturity: request.dataMaturity,
      isInTransitionPeriod: request.isInTransitionPeriod,
    },
    insights: {
      mainInsight: {
        title: '血糖値レポート',
        description: `平均血糖値は${request.glucoseSummary.mean}mg/dLでした。Supabase環境変数を設定すると、より詳細なAI分析が利用できます。`,
      },
      exerciseInsight: {
        title: '運動のヒント',
        description: request.walkingEffect.isSignificant 
          ? `食後の歩行でスパイクを${request.walkingEffect.reductionPercent}%抑えられています。` 
          : '食後の軽い運動は血糖値の安定に役立ちます。',
        recommendation: '食後15分以内に10分歩くことを目標にしましょう。',
      },
      mealInsight: {
        title: '食事について',
        description: `${request.spikeAnalysis.worstMeal === 'breakfast' ? '朝食' : request.spikeAnalysis.worstMeal === 'lunch' ? '昼食' : '夕食'}後のスパイクが最も大きいです。`,
        recommendation: '野菜から先に食べる習慣を試してみましょう。',
      },
      weeklyTip: '毎食後に少し歩くことで血糖値の上がり方が穏やかになります。',
      encouragement: '記録を続けていること自体が素晴らしいです！',
    },
    suggestedChallenges: [],
    actionItems: [],
  };
}

/**
 * レガシー版フォールバックレポート
 */
function buildLegacyFallbackReport(request: AggregatedReportRequest): GeneratedReport {
  return {
    reportId: `mock-${Date.now()}`,
    userId: request.userId,
    generatedAt: new Date().toISOString(),
    period: request.period,
    analysis: {
      glucoseControl: {
        score: 78,
        grade: 'good',
        tirTrend: 'stable',
        mainIssues: ['朝食後の血糖値の急上昇'],
        timeInRange: request.glucoseSummary.timeInRange,
        timeBelowRange: request.glucoseSummary.timeBelowRange,
        timeAboveRange: request.glucoseSummary.timeAboveRange,
      },
      exerciseEffect: {
        hasSignificantEffect: true,
        averageGlucoseReduction: 15,
        bestTimeToExercise: '食後30分',
        optimalStepCount: 500,
        confidenceLevel: 'medium',
      },
      mealPatterns: {
        highestSpikeMeal: 'breakfast',
        averageSpikeByMeal: { breakfast: 45, lunch: 35, dinner: 40 },
        postMealWalkEffectiveness: 20,
      },
      trends: { weekOverWeek: { glucoseChange: 0, tirChange: 0, stepsChange: 0 } },
      anomalies: { unexplainedSpikes: 0, lowGlucoseEvents: 0, patternBreaks: [] },
      detectedPatterns: [],
      dataMaturity: { level: 'learning', dataAgeDays: 0, featuresAvailable: [], featuresLocked: [] },
      isInTransitionPeriod: false,
    },
    insights: {
      mainInsight: {
        title: 'モックレポート',
        description: 'Supabase環境変数を設定すると、実際のAI分析が有効になります。',
      },
      exerciseInsight: {
        title: '運動アドバイス',
        description: '運動後の血糖値低下傾向が見られます。食後30分の軽いウォーキングを続けてください。',
      },
      mealInsight: {
        title: '食事アドバイス',
        description: '朝食後の血糖値の急上昇が目立ちます。炭水化物を減らすか、食物繊維を先に摂ることを検討してください。',
      },
      weeklyTip: '全体的に良好な血糖コントロールです。このペースを維持しましょう。',
      encouragement: '記録を続けていること自体が素晴らしいです！',
    },
    suggestedChallenges: [],
    actionItems: ['運動習慣を維持する', '食後の血糖値の急上昇に注意'],
  };
}
