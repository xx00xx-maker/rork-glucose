export const userData = {
  name: "ユーザー",
  plan: "free" as const,
  level: 1,
  title: "ビギナー",
  xp: 0,
  xpToNextLevel: 100,
  totalXpForNextLevel: 100,
  coins: 0,
  targetGlucoseRange: { min: 70, max: 140 },
  targetSteps: 6000,

};

export const streaksData = {
  steps: 7,
  stability: 4,
  recording: 12,
  longestEver: 23,
};

export const dailyChallenges = [
  { id: 1, title: "朝の記録", description: "朝食を記録する", completed: true, xp: 10, iconType: "camera" as const },
  { id: 2, title: "昼食後ウォーク", description: "昼食後30分以内に500歩", completed: true, xp: 30, iconType: "footprints" as const },
  { id: 3, title: "6,000歩達成", description: "今日の目標歩数を達成", completed: false, xp: 20, iconType: "target" as const, progress: 4800, target: 6000 },
];

export const badges = [
  { id: "first_walk", name: "ファーストステップ", description: "初めて食後に500歩歩いた", iconType: "footprints" as const, unlocked: false },
  { id: "streak_7", name: "7日連続達成", description: "7日連続で目標達成", iconType: "flame" as const, unlocked: false },
  { id: "stable_star", name: "安定の星", description: "TIR80%以上を達成", iconType: "star" as const, unlocked: false },
  { id: "spike_hunter", name: "急上昇ハンター", description: "食後の急上昇を10回抑制", iconType: "target" as const, unlocked: false },
  { id: "recording_mania", name: "記録マニア", description: "100食分の写真を記録", iconType: "camera" as const, unlocked: false },
  { id: "early_walker", name: "早起きウォーカー", description: "柝7時前に1000歩を7日連続", iconType: "sunrise" as const, unlocked: false },
  { id: "streak_30", name: "30日連続達成", description: "30日連続で目標達成", iconType: "gem" as const, unlocked: false },
  { id: "streak_100", name: "100日連続達成", description: "100日連続で目標達成", iconType: "crown" as const, unlocked: false },
  { id: "ten_thousand", name: "1万歩チャレンジャー", description: "1日1万歩達成", iconType: "activity" as const, unlocked: false },
  { id: "iron_guardian", name: "鉄壁の守護者", description: "1週間低血糖・高血糖ゼロ", iconType: "shield" as const, unlocked: false },
  { id: "heart_master", name: "心拍マスター", description: "運動で心拍と血糖の相関を発見", iconType: "heart" as const, unlocked: false },
  { id: "stress_hunter", name: "ストレスハンター", description: "ストレス上昇時の血糖変動を5回検知", iconType: "smile" as const, unlocked: false },
];

export type BadgeIconType = 'footprints' | 'flame' | 'star' | 'target' | 'camera' | 'sunrise' | 'gem' | 'crown' | 'activity' | 'shield' | 'heart' | 'smile';
export type ChallengeIconType = 'camera' | 'footprints' | 'target';

export const currentStatus = {
  bloodGlucose: { value: 125, trend: "stable" as const, updatedAt: "14:30" },
  heartRate: 72,
  todaySteps: 4800,
  todayTIR: 78,
  mealsRecorded: 2,
};

export const hourlyData = [
  { hour: "06:00", glucose: 95, steps: 0, heartRate: 62 },
  { hour: "07:00", glucose: 110, steps: 500, heartRate: 78 },
  { hour: "08:00", glucose: 145, steps: 200, heartRate: 68 },
  { hour: "09:00", glucose: 130, steps: 1500, heartRate: 95 },
  { hour: "10:00", glucose: 105, steps: 800, heartRate: 72 },
  { hour: "11:00", glucose: 98, steps: 300, heartRate: 68 },
  { hour: "12:00", glucose: 115, steps: 200, heartRate: 65 },
  { hour: "13:00", glucose: 158, steps: 100, heartRate: 70 },
  { hour: "14:00", glucose: 142, steps: 1200, heartRate: 88 },
  { hour: "15:00", glucose: 125, steps: 500, heartRate: 72 },
];

export const weeklyReport = {
  activeDayAvgGlucose: 115,
  inactiveDayAvgGlucose: 142,
  stressHighAvgGlucose: 148,
  stressLowAvgGlucose: 112,
  optimalHeartRateRange: "100-120",
  missionsCompleted: 18,
  totalMissions: 21,
  xpEarned: 420,
  coinsEarned: 380,
  newBadges: 2,
  tir: 78,
  tirChange: 5,
  postMealWalks: 5,
  totalMeals: 14,
  walkingSpike: 45,
  noWalkSpike: 78,
};

export const timelineData = [
  {
    id: "1",
    date: "2025-01-26",
    time: "12:30",
    photo: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
    glucoseBefore: 115,
    glucoseAfter: 142,
    stepsAfter: 1200,
    spikeReduction: 30,
    xpEarned: 30,
    insight: "食後1,200歩で、急上昇を-30mg/dL抑制",
  },
];

export const levelTitles: Record<number, string> = {
  1: "ビギナー",
  5: "チャレンジャー",
  10: "プラクティショナー",
  20: "エキスパート",
  30: "マスター",
  50: "レジェンド",
};

export type LevelIconType = 'seedling' | 'leaf' | 'tree' | 'star' | 'gem' | 'crown';

export const levelIconTypes: Record<number, LevelIconType> = {
  1: "seedling",
  5: "leaf",
  10: "tree",
  20: "star",
  30: "gem",
  50: "crown",
};

export function getLevelInfo(level: number): { title: string; iconType: LevelIconType } {
  const levels = [1, 5, 10, 20, 30, 50];
  let currentLevelThreshold = 1;
  
  for (const threshold of levels) {
    if (level >= threshold) {
      currentLevelThreshold = threshold;
    }
  }
  
  return {
    title: levelTitles[currentLevelThreshold],
    iconType: levelIconTypes[currentLevelThreshold],
  };
}

export const cumulativeStats = {
  totalSteps: 0,
  totalMeals: 0,
  spikesReduced: 0,
  longestStreak: 0,
};
