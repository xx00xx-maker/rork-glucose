/**
 * 食事推定モジュール
 * CGM波形から食事イベントを推定し、信頼度付きで返す
 */

import {
  MealEvent,
  MealType,
  MealConfidence,
  SpikeCategory,
  HealthKitData,
} from '../types';

/** スパイク分類基準 */
function classifySpike(magnitude: number): SpikeCategory {
  if (magnitude <= 30) return 'good';
  if (magnitude <= 50) return 'slightly_high';
  if (magnitude <= 70) return 'high';
  return 'caution';
}

/** 時間帯から食事タイプを推定 */
function estimateMealType(hour: number): MealType {
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

/** 時間帯ヒューリスティクスによる信頼度 */
function getTimeConfidence(hour: number): MealConfidence {
  // 一般的な食事時間帯(7±1, 12±1, 19±1)に近いほど高信頼
  const mealHours = [7, 12, 19];
  const minDist = Math.min(...mealHours.map(h => Math.abs(hour - h)));
  if (minDist <= 1) return 'high';
  if (minDist <= 2) return 'medium';
  return 'low';
}

/** 食事カーブの形状判定（急上昇→ピーク→緩やかな下降） */
function hasMealCurveShape(
  glucoseData: { value: number; timestamp: string }[],
  startIdx: number,
  peakIdx: number
): boolean {
  if (peakIdx <= startIdx) return false;
  
  // ピーク後に下降トレンドがあるか確認
  let descendingCount = 0;
  let totalAfterPeak = 0;
  const peakValue = glucoseData[peakIdx].value;
  
  for (let k = peakIdx + 1; k < Math.min(peakIdx + 12, glucoseData.length); k++) {
    totalAfterPeak++;
    if (glucoseData[k].value < peakValue) {
      descendingCount++;
    }
  }
  
  // ピーク後の60%以上が下降していれば食事カーブと判定
  return totalAfterPeak > 0 && (descendingCount / totalAfterPeak) >= 0.5;
}

export interface MealEstimationResult {
  mealEvents: MealEvent[];
  mealRecordingRate: number;
  mealRecordingLevel: 'sufficient' | 'partial' | 'insufficient';
  estimatedCount: number;
  manualCount: number;
}

/**
 * CGM波形から食事イベントを推定する
 * 設計書の基準: 30mg/dL以上の急上昇 + 食事カーブ形状 + 時間帯ヒューリスティクス
 */
export function estimateMeals(
  glucoseData: HealthKitData['bloodGlucose'],
  stepsData: HealthKitData['steps'],
  manualMealRecords?: { timestamp: string; mealType: MealType }[]
): MealEstimationResult {
  const sortedGlucose = [...glucoseData].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  if (sortedGlucose.length === 0) {
    return {
      mealEvents: [],
      mealRecordingRate: 0,
      mealRecordingLevel: 'insufficient',
      estimatedCount: 0,
      manualCount: 0,
    };
  }

  const SPIKE_THRESHOLD = 30; // mg/dL
  const estimatedMeals: MealEvent[] = [];
  
  let i = 0;
  while (i < sortedGlucose.length - 1) {
    const start = sortedGlucose[i];
    let peak = start;
    let peakIdx = i;
    
    // 90分以内でピークを探す
    let j = i + 1;
    while (j < sortedGlucose.length) {
      const current = sortedGlucose[j];
      const timeDiff = (new Date(current.timestamp).getTime() - new Date(start.timestamp).getTime()) / 60000;
      if (timeDiff > 90) break;
      if (current.value > peak.value) {
        peak = current;
        peakIdx = j;
      }
      j++;
    }
    
    const spikeMagnitude = peak.value - start.value;
    
    if (spikeMagnitude >= SPIKE_THRESHOLD) {
      const riseTime = (new Date(peak.timestamp).getTime() - new Date(start.timestamp).getTime()) / 60000;
      
      if (riseTime > 10 && riseTime < 90) {
        const mealTime = new Date(start.timestamp);
        const hour = mealTime.getHours();
        
        // 食事カーブ形状チェック
        const hasCurve = hasMealCurveShape(sortedGlucose, i, peakIdx);
        
        // 信頼度の総合判定
        const timeConf = getTimeConfidence(hour);
        let confidence: MealConfidence;
        if (hasCurve && timeConf === 'high') {
          confidence = 'high';
        } else if (hasCurve || timeConf !== 'low') {
          confidence = 'medium';
        } else {
          confidence = 'low';
        }
        
        // ベースライン回復時間の計算
        let returnToBaseline = 120;
        for (let k = peakIdx + 1; k < sortedGlucose.length; k++) {
          const tDiff = (new Date(sortedGlucose[k].timestamp).getTime() - mealTime.getTime()) / 60000;
          if (tDiff > 180) break;
          if (sortedGlucose[k].value <= start.value + 10) {
            returnToBaseline = Math.round(tDiff);
            break;
          }
        }
        
        // 食後60分以内の歩数
        const postMealSteps = stepsData
          .filter(s => {
            const st = new Date(s.startTime).getTime();
            return st >= mealTime.getTime() && st <= mealTime.getTime() + 60 * 60000;
          })
          .reduce((sum, s) => sum + s.count, 0);
        
        estimatedMeals.push({
          mealTime: mealTime.toISOString(),
          mealType: estimateMealType(hour),
          preGlucose: start.value,
          peakGlucose: peak.value,
          spikeMagnitude: Math.round(spikeMagnitude),
          spikeCategory: classifySpike(spikeMagnitude),
          peakTime: Math.round(riseTime),
          returnToBaseline,
          postMealSteps,
          isEstimated: true,
          confidence,
        });
        
        // 同じスパイクを複数回検出しないようスキップ
        i = peakIdx;
      }
    }
    i++;
  }
  
  // 手動記録がある場合はマージ（手動記録を優先）
  const manualCount = manualMealRecords?.length ?? 0;
  let finalMeals = [...estimatedMeals];
  
  if (manualMealRecords && manualMealRecords.length > 0) {
    finalMeals = estimatedMeals.map(em => {
      const matchingManual = manualMealRecords.find(mr => {
        const diff = Math.abs(new Date(mr.timestamp).getTime() - new Date(em.mealTime).getTime());
        return diff < 30 * 60000; // 30分以内なら同一食事
      });
      if (matchingManual) {
        return {
          ...em,
          isEstimated: false,
          confidence: 'high' as MealConfidence,
          mealType: matchingManual.mealType,
        };
      }
      return em;
    });
  }
  
  // 食事記録率の計算
  // 期間内の想定食事数（日数×3）と記録数の比率
  const totalDays = sortedGlucose.length > 0
    ? Math.ceil(
        (new Date(sortedGlucose[sortedGlucose.length - 1].timestamp).getTime() -
          new Date(sortedGlucose[0].timestamp).getTime()) / (24 * 60 * 60 * 1000)
      ) || 1
    : 1;
  const expectedMeals = totalDays * 3;
  const mealRecordingRate = Math.min(100, Math.round((manualCount / expectedMeals) * 100));
  
  let mealRecordingLevel: 'sufficient' | 'partial' | 'insufficient';
  if (mealRecordingRate >= 70) {
    mealRecordingLevel = 'sufficient';
  } else if (mealRecordingRate >= 30) {
    mealRecordingLevel = 'partial';
  } else {
    mealRecordingLevel = 'insufficient';
  }
  
  return {
    mealEvents: finalMeals,
    mealRecordingRate,
    mealRecordingLevel,
    estimatedCount: finalMeals.filter(m => m.isEstimated).length,
    manualCount,
  };
}
