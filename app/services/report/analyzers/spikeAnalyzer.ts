/**
 * 食後血糖スパイク分析モジュール
 * 食事別（朝昼夕）のスパイク統計と分類を行う
 */

import {
  MealEvent,
  SpikeAnalysisResult,
  SpikeCategory,
  MealType,
} from '../types';

function classifySpike(mean: number): SpikeCategory {
  if (mean <= 30) return 'good';
  if (mean <= 50) return 'slightly_high';
  if (mean <= 70) return 'high';
  return 'caution';
}

function calcMealStats(meals: MealEvent[]): { mean: number; count: number; category: SpikeCategory } {
  if (meals.length === 0) return { mean: 0, count: 0, category: 'good' };
  const mean = Math.round(meals.reduce((s, m) => s + m.spikeMagnitude, 0) / meals.length);
  return { mean, count: meals.length, category: classifySpike(mean) };
}

export function analyzeSpikesByMeal(mealEvents: MealEvent[]): SpikeAnalysisResult {
  const breakfast = mealEvents.filter(m => m.mealType === 'breakfast');
  const lunch = mealEvents.filter(m => m.mealType === 'lunch');
  const dinner = mealEvents.filter(m => m.mealType === 'dinner');
  
  const breakfastSpikes = calcMealStats(breakfast);
  const lunchSpikes = calcMealStats(lunch);
  const dinnerSpikes = calcMealStats(dinner);
  
  // 全食事の平均ピーク到達時間と回復時間
  const allMeals = mealEvents.filter(m => m.peakTime > 0);
  const averagePeakTime = allMeals.length > 0
    ? Math.round(allMeals.reduce((s, m) => s + m.peakTime, 0) / allMeals.length)
    : 0;
  const averageRecoveryTime = allMeals.length > 0
    ? Math.round(allMeals.reduce((s, m) => s + m.returnToBaseline, 0) / allMeals.length)
    : 0;
  
  // 最もスパイクが大きい食事
  const mealMeans: { type: MealType; mean: number }[] = [
    { type: 'breakfast', mean: breakfastSpikes.mean },
    { type: 'lunch', mean: lunchSpikes.mean },
    { type: 'dinner', mean: dinnerSpikes.mean },
  ];
  const worstMeal = mealMeans.sort((a, b) => b.mean - a.mean)[0].type;
  
  return {
    breakfastSpikes,
    lunchSpikes,
    dinnerSpikes,
    averagePeakTime,
    averageRecoveryTime,
    worstMeal,
  };
}
