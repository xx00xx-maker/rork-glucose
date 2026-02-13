
import { AggregatedReportRequest, GeneratedReport } from './types';
import { supabase } from '../../utils/supabaseClient'; 
import { saveReport } from './localdb';

export async function generateReport(request: AggregatedReportRequest): Promise<GeneratedReport> {
  // If Supabase is not configured, return a mock report for demo purposes
  if (!supabase) {
    console.warn('[API] Supabase not configured. Returning mock report.');
    const mockReport: GeneratedReport = {
      reportId: `mock-${Date.now()}`,
      userId: request.userId,
      generatedAt: new Date().toISOString(),
      period: request.period,
      analysis: {
        glucoseControl: {
          score: 78,
          grade: 'Good',
          mainIssues: ['朝食後の血糖値の急上昇', '夕食前の低血糖傾向'],
          timeInRange: request.glucoseSummary.timeInRange,
          timeBelowRange: request.glucoseSummary.timeBelowRange,
          timeAboveRange: request.glucoseSummary.timeAboveRange,
        },
        exerciseEffect: {
          hasSignificantEffect: true,
          averageDropMgDl: 15,
          optimalTiming: '食後30分',
        },
      },
      insights: {
        mainInsight: {
          emoji: '🎯',
          title: 'モックレポート',
          description: 'Supabase環境変数を設定すると、実際のAI分析が有効になります。',
        },
        exerciseInsight: {
          icon: 'fitness',
          title: '運動アドバイス',
          description: '運動後の血糖値低下傾向が見られます。食後30分の軽いウォーキングを続けてください。',
        },
        mealInsight: {
          icon: 'restaurant',
          title: '食事アドバイス',
          description: '朝食後の血糖値の急上昇が目立ちます。炭水化物を減らすか、食物繊維を先に摂ることを検討してください。',
        },
        weeklyTip: '全体的に良好な血糖コントロールです。このペースを維持しましょう。',
      },
      suggestedChallenges: [],
      actionItems: ['運動習慣を維持する', '食後の血糖値の急上昇に注意'],
    };
    return mockReport;
  }

  const { data, error } = await supabase.functions.invoke('generate-report', {
    body: request
  });

  if (error) {
    console.error("Function invoke error:", error);
    throw error;
  }

  const report = data as GeneratedReport;
  
  // Cache the report locally
  try {
      await saveReport(report);
  } catch (e) {
      console.warn("Failed to save report locally:", e);
      // Don't fail the whole request just because caching failed
  }

  return report;
}
