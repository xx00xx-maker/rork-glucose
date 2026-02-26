/**
 * 食事間隔分析モジュール
 * 食事と食事の間隔を計算し、6時間以上空いた場合の次食スパイク増加を定量化
 */

import { MealEvent, MealIntervalResult } from '../types';

export function analyzeMealIntervals(mealEvents: MealEvent[]): MealIntervalResult {
  if (mealEvents.length < 3) {
    return {
      averageInterval: 0,
      longIntervalCount: 0,
      longIntervalExtraSpike: 0,
      isSignificant: false,
    };
  }
  
  // 時刻順にソート
  const sorted = [...mealEvents].sort(
    (a, b) => new Date(a.mealTime).getTime() - new Date(b.mealTime).getTime()
  );
  
  const intervals: { intervalHours: number; nextSpike: number }[] = [];
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const intervalMs = new Date(curr.mealTime).getTime() - new Date(prev.mealTime).getTime();
    const intervalHours = intervalMs / (60 * 60 * 1000);
    
    // 同日内の食事間隔のみ（24時間を超える間隔は除外）
    if (intervalHours > 0 && intervalHours < 24) {
      intervals.push({
        intervalHours,
        nextSpike: curr.spikeMagnitude,
      });
    }
  }
  
  if (intervals.length === 0) {
    return {
      averageInterval: 0,
      longIntervalCount: 0,
      longIntervalExtraSpike: 0,
      isSignificant: false,
    };
  }
  
  const averageInterval = Math.round(
    (intervals.reduce((s, i) => s + i.intervalHours, 0) / intervals.length) * 10
  ) / 10;
  
  // 6時間以上空いた場合とそうでない場合の比較
  const longIntervals = intervals.filter(i => i.intervalHours >= 6);
  const normalIntervals = intervals.filter(i => i.intervalHours < 6 && i.intervalHours >= 2);
  
  const longIntervalCount = longIntervals.length;
  
  let longIntervalExtraSpike = 0;
  if (longIntervals.length >= 2 && normalIntervals.length >= 2) {
    const avgLongSpike = longIntervals.reduce((s, i) => s + i.nextSpike, 0) / longIntervals.length;
    const avgNormalSpike = normalIntervals.reduce((s, i) => s + i.nextSpike, 0) / normalIntervals.length;
    longIntervalExtraSpike = Math.round(avgLongSpike - avgNormalSpike);
  }
  
  return {
    averageInterval,
    longIntervalCount,
    longIntervalExtraSpike: Math.max(0, longIntervalExtraSpike),
    isSignificant: longIntervals.length >= 2 && normalIntervals.length >= 2,
  };
}
