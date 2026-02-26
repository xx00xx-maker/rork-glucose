/**
 * 食後ウォーキング効果分析モジュール
 * 食後1時間以内の500歩以上の歩行がスパイクに与える影響を定量化
 */

import { MealEvent, WalkingEffectResult } from '../types';

export function analyzeWalkingEffect(mealEvents: MealEvent[]): WalkingEffectResult {
  const withWalk = mealEvents.filter(m => m.postMealSteps >= 500);
  const withoutWalk = mealEvents.filter(m => m.postMealSteps < 200);
  
  if (withWalk.length < 2 || withoutWalk.length < 2) {
    return {
      withWalkSpike: 0,
      withoutWalkSpike: 0,
      reductionPercent: 0,
      reductionMgDl: 0,
      peakTimeReduction: 0,
      sampleSizeWithWalk: withWalk.length,
      sampleSizeWithoutWalk: withoutWalk.length,
      isSignificant: false,
    };
  }
  
  const avgWithWalk = Math.round(
    withWalk.reduce((s, m) => s + m.spikeMagnitude, 0) / withWalk.length
  );
  const avgWithoutWalk = Math.round(
    withoutWalk.reduce((s, m) => s + m.spikeMagnitude, 0) / withoutWalk.length
  );
  
  const reductionMgDl = Math.max(0, avgWithoutWalk - avgWithWalk);
  const reductionPercent = avgWithoutWalk > 0
    ? Math.round((reductionMgDl / avgWithoutWalk) * 100)
    : 0;
  
  // ピーク到達時間の比較
  const avgPeakWithWalk = withWalk.reduce((s, m) => s + m.peakTime, 0) / withWalk.length;
  const avgPeakWithoutWalk = withoutWalk.reduce((s, m) => s + m.peakTime, 0) / withoutWalk.length;
  const peakTimeReduction = Math.round(avgPeakWithoutWalk - avgPeakWithWalk);
  
  return {
    withWalkSpike: avgWithWalk,
    withoutWalkSpike: avgWithoutWalk,
    reductionPercent,
    reductionMgDl,
    peakTimeReduction,
    sampleSizeWithWalk: withWalk.length,
    sampleSizeWithoutWalk: withoutWalk.length,
    isSignificant: withWalk.length >= 3 && withoutWalk.length >= 3 && reductionMgDl >= 10,
  };
}
