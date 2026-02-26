/**
 * ストレス分析モジュール
 * 心拍データあり/なしの2モード対応
 */

import { HealthKitData, StressAnalysisResult, MealConfidence, MealEvent } from '../types';

/**
 * 心拍データありモード: 安静時+20bpm以上の持続を検出
 */
function analyzeWithHeartRate(
  heartRateData: HealthKitData['heartRate'],
  glucoseData: HealthKitData['bloodGlucose']
): StressAnalysisResult {
  // 安静時心拍を推定（下位25%の中央値）
  const sortedBpm = [...heartRateData.map(h => h.bpm)].sort((a, b) => a - b);
  const q25Idx = Math.floor(sortedBpm.length * 0.25);
  const restingBpm = sortedBpm[q25Idx] || 70;
  
  const stressThreshold = restingBpm + 20;
  
  // 連続的な心拍上昇を検出
  const sortedHR = [...heartRateData].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const stressEvents: StressAnalysisResult['heartRateStressEvents'] = [];
  let i = 0;
  
  while (i < sortedHR.length) {
    if (sortedHR[i].bpm >= stressThreshold) {
      const startTime = new Date(sortedHR[i].timestamp).getTime();
      let j = i + 1;
      while (j < sortedHR.length && sortedHR[j].bpm >= stressThreshold) {
        j++;
      }
      const endTime = new Date(sortedHR[j - 1].timestamp).getTime();
      const duration = (endTime - startTime) / 60000;
      
      if (duration >= 5) { // 5分以上の持続のみ
        // 前後30分の血糖変動を調べる
        const nearbyGlucose = glucoseData.filter(g => {
          const gt = new Date(g.timestamp).getTime();
          return gt >= startTime - 30 * 60000 && gt <= endTime + 30 * 60000;
        });
        
        let glucoseImpact = 0;
        if (nearbyGlucose.length >= 2) {
          const before = nearbyGlucose[0].value;
          const after = nearbyGlucose[nearbyGlucose.length - 1].value;
          glucoseImpact = Math.round(after - before);
        }
        
        stressEvents.push({
          timestamp: sortedHR[i].timestamp,
          bpmIncrease: sortedHR[i].bpm - restingBpm,
          duration: Math.round(duration),
          glucoseImpact,
        });
      }
      i = j;
    } else {
      i++;
    }
  }
  
  let indicator: StressAnalysisResult['overallStressIndicator'] = 'none_detected';
  if (stressEvents.length >= 3) indicator = 'likely';
  else if (stressEvents.length >= 1) indicator = 'possible';
  
  return {
    mode: 'heart_rate',
    hasHeartRateData: true,
    heartRateStressEvents: stressEvents,
    overallStressIndicator: indicator,
    confidenceLevel: stressEvents.length >= 3 ? 'medium' : 'low',
  };
}

/**
 * 心拍データなしモード: 血糖値パターンのみから推測
 */
function analyzeWithoutHeartRate(
  glucoseData: HealthKitData['bloodGlucose'],
  mealEvents: MealEvent[]
): StressAnalysisResult {
  const sortedGlucose = [...glucoseData].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // 1. 食後2h以降の説明のつかない急上昇(30mg/dL以上)
  const unexplainedSpikes: StressAnalysisResult['unexplainedSpikes'] = [];
  const mealTimes = mealEvents.map(m => new Date(m.mealTime).getTime());
  
  for (let i = 1; i < sortedGlucose.length; i++) {
    const prev = sortedGlucose[i - 1];
    const curr = sortedGlucose[i];
    const rise = curr.value - prev.value;
    const timeDiff = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 60000;
    
    if (rise >= 30 && timeDiff <= 30) {
      const currTime = new Date(curr.timestamp).getTime();
      // 食後2h以内ならスキップ
      const isPostMeal = mealTimes.some(
        mt => currTime >= mt && currTime <= mt + 2 * 60 * 60000
      );
      if (!isPostMeal) {
        unexplainedSpikes.push({
          timestamp: curr.timestamp,
          magnitude: Math.round(rise),
          confidence: 'low' as MealConfidence,
        });
      }
    }
  }
  
  // 2. 深夜帯(23-3時)の平均130mg/dL以上
  const nightData = glucoseData.filter(g => {
    const h = new Date(g.timestamp).getHours();
    return h >= 23 || h < 3;
  });
  const avgNightGlucose = nightData.length > 0
    ? Math.round(nightData.reduce((s, g) => s + g.value, 0) / nightData.length)
    : 0;
  const nighttimeElevation = {
    averageNightGlucose: avgNightGlucose,
    isElevated: avgNightGlucose >= 130,
  };
  
  // 3. 暁現象の異常増大（基準は暫定的に25mg/dL以上）
  const dawnData = glucoseData.filter(g => {
    const h = new Date(g.timestamp).getHours();
    return h >= 3 && h < 6;
  });
  let dawnRise = 0;
  if (dawnData.length > 0) {
    const values = dawnData.map(d => d.value);
    dawnRise = Math.max(...values) - Math.min(...values);
  }
  const abnormalDawnPhenomenon = {
    isAbnormal: dawnRise > 25,
    excessRise: Math.max(0, Math.round(dawnRise - 15)), // 15mg/dLを正常基準として
  };
  
  // 総合判定
  let indicator: StressAnalysisResult['overallStressIndicator'] = 'none_detected';
  const signals = [
    unexplainedSpikes.length >= 2,
    nighttimeElevation.isElevated,
    abnormalDawnPhenomenon.isAbnormal,
  ].filter(Boolean).length;
  
  if (signals >= 2) indicator = 'possible';
  else if (signals >= 1 && unexplainedSpikes.length >= 3) indicator = 'possible';
  
  return {
    mode: 'glucose_only',
    hasHeartRateData: false,
    unexplainedSpikes,
    nighttimeElevation,
    abnormalDawnPhenomenon,
    overallStressIndicator: indicator,
    confidenceLevel: 'low',
  };
}

export function analyzeStress(
  glucoseData: HealthKitData['bloodGlucose'],
  heartRateData: HealthKitData['heartRate'],
  mealEvents: MealEvent[]
): StressAnalysisResult {
  if (heartRateData.length >= 10) {
    return analyzeWithHeartRate(heartRateData, glucoseData);
  }
  return analyzeWithoutHeartRate(glucoseData, mealEvents);
}
