/**
 * 成長トラッカーモジュール
 * 週単位の改善追跡とマイルストーン検出
 */

import { MealEvent, GrowthTrackerResult, SpikeAnalysisResult, ActivitySummary } from '../types';

/** 週番号を取得 (YYYY-Wxx) */
function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const weekNum = Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/** マイルストーン定義 */
const MILESTONE_DEFINITIONS = [
  {
    type: 'first_low_spike',
    check: (meals: MealEvent[]) => meals.some(m => m.spikeMagnitude <= 30),
    description: '初めて食後スパイクを30mg/dL以下に抑えました！',
  },
  {
    type: 'three_day_walking',
    check: (meals: MealEvent[]) => {
      const dates = new Set(
        meals.filter(m => m.postMealSteps >= 500)
          .map(m => new Date(m.mealTime).toISOString().split('T')[0])
      );
      return dates.size >= 3;
    },
    description: '3日連続で食後ウォーキングを達成！',
  },
  {
    type: 'consistent_breakfast',
    check: (meals: MealEvent[]) => {
      const breakfasts = meals.filter(m => m.mealType === 'breakfast');
      return breakfasts.length >= 5 && breakfasts.every(m => m.spikeMagnitude <= 50);
    },
    description: '朝食後のスパイクが5回連続で安定しています！',
  },
  {
    type: 'walking_master',
    check: (meals: MealEvent[]) => {
      const walked = meals.filter(m => m.postMealSteps >= 500);
      return walked.length >= 10;
    },
    description: '食後ウォーキング10回達成！素晴らしい習慣です！',
  },
];

export function trackGrowth(
  mealEvents: MealEvent[],
  activitySummary: ActivitySummary,
  dailyTIR: { date: string; tir: number }[],
  rhythmScore: number,
  previousMilestones: string[] = []
): GrowthTrackerResult {
  // 週別トレンド
  const weeklyMap = new Map<string, {
    fastingGlucose: number[];
    spikes: number[];
    steps: number[];
    tirs: number[];
  }>();
  
  // 食事データから週別集計
  for (const m of mealEvents) {
    const week = getWeekKey(m.mealTime);
    if (!weeklyMap.has(week)) {
      weeklyMap.set(week, { fastingGlucose: [], spikes: [], steps: [], tirs: [] });
    }
    weeklyMap.get(week)!.spikes.push(m.spikeMagnitude);
  }
  
  // 歩数データから週別集計
  for (const d of activitySummary.dailySteps) {
    const week = getWeekKey(d.date);
    if (!weeklyMap.has(week)) {
      weeklyMap.set(week, { fastingGlucose: [], spikes: [], steps: [], tirs: [] });
    }
    weeklyMap.get(week)!.steps.push(d.totalSteps);
  }
  
  // TIRデータから週別集計
  for (const d of dailyTIR) {
    const week = getWeekKey(d.date);
    if (!weeklyMap.has(week)) {
      weeklyMap.set(week, { fastingGlucose: [], spikes: [], steps: [], tirs: [] });
    }
    weeklyMap.get(week)!.tirs.push(d.tir);
  }
  
  const weeklyTrends = Array.from(weeklyMap.entries())
    .map(([week, data]) => ({
      week,
      avgFastingGlucose: data.fastingGlucose.length > 0
        ? Math.round(data.fastingGlucose.reduce((s, v) => s + v, 0) / data.fastingGlucose.length)
        : 0,
      avgSpike: data.spikes.length > 0
        ? Math.round(data.spikes.reduce((s, v) => s + v, 0) / data.spikes.length)
        : 0,
      avgSteps: data.steps.length > 0
        ? Math.round(data.steps.reduce((s, v) => s + v, 0) / data.steps.length)
        : 0,
      rhythmScore,
      tir: data.tirs.length > 0
        ? Math.round(data.tirs.reduce((s, v) => s + v, 0) / data.tirs.length * 10) / 10
        : 0,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));
  
  // マイルストーン検出
  const milestones: GrowthTrackerResult['milestones'] = [];
  const now = new Date().toISOString();
  
  for (const def of MILESTONE_DEFINITIONS) {
    if (!previousMilestones.includes(def.type) && def.check(mealEvents)) {
      milestones.push({
        type: def.type,
        achievedAt: now,
        description: def.description,
        isNew: true,
      });
    }
  }
  
  // リズムスコアのマイルストーン
  if (!previousMilestones.includes('rhythm_80') && rhythmScore >= 80) {
    milestones.push({
      type: 'rhythm_80',
      achievedAt: now,
      description: '生活リズムスコアが80を超えました！安定した生活リズムです！',
      isNew: true,
    });
  }
  
  // 改善エリアの分析
  const improvementAreas: GrowthTrackerResult['improvementAreas'] = [];
  
  if (weeklyTrends.length >= 2) {
    const latest = weeklyTrends[weeklyTrends.length - 1];
    const previous = weeklyTrends[weeklyTrends.length - 2];
    
    if (latest.avgSpike > 0 && previous.avgSpike > 0) {
      const change = latest.avgSpike - previous.avgSpike;
      const changePercent = Math.round((change / previous.avgSpike) * 100);
      improvementAreas.push({
        area: '食後スパイク',
        currentValue: latest.avgSpike,
        previousValue: previous.avgSpike,
        changePercent,
        trend: change < -5 ? 'improving' : change > 5 ? 'declining' : 'stable',
      });
    }
    
    if (latest.avgSteps > 0 && previous.avgSteps > 0) {
      const change = latest.avgSteps - previous.avgSteps;
      const changePercent = Math.round((change / previous.avgSteps) * 100);
      improvementAreas.push({
        area: '日平均歩数',
        currentValue: latest.avgSteps,
        previousValue: previous.avgSteps,
        changePercent,
        trend: change > 500 ? 'improving' : change < -500 ? 'declining' : 'stable',
      });
    }
    
    if (latest.tir > 0 && previous.tir > 0) {
      const change = latest.tir - previous.tir;
      const changePercent = Math.round(change * 10) / 10;
      improvementAreas.push({
        area: 'TIR (安定時間)',
        currentValue: latest.tir,
        previousValue: previous.tir,
        changePercent,
        trend: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable',
      });
    }
  }
  
  // 停滞分析
  let stagnationAnalysis: GrowthTrackerResult['stagnationAnalysis'] | undefined;
  const decliningAreas = improvementAreas.filter(a => a.trend === 'declining');
  if (decliningAreas.length > 0) {
    stagnationAnalysis = {
      area: decliningAreas[0].area,
      possibleCauses: [
        '食事パターンの変化',
        '運動量の減少',
        '生活リズムの乱れ',
        'ストレスの増加',
      ],
    };
  }
  
  return {
    weeklyTrends,
    milestones,
    improvementAreas,
    stagnationAnalysis,
  };
}
