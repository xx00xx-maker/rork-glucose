import { fetchTodaySteps } from './report/healthkit';

/**
 * 食事記録のインサイト生成サービス
 * HealthKitの実データを使い、動的なインサイトと傾向分析を行う
 */

// HealthKit APIモジュール（遅延ロード）
let AppleHealthKit: any = null;
function getAppleHealthKit() {
  if (AppleHealthKit) return AppleHealthKit;
  try {
    const mod = require('react-native-health');
    if (mod && typeof mod.initHealthKit === 'function') {
      AppleHealthKit = mod;
    } else if (mod?.default && typeof mod.default.initHealthKit === 'function') {
      AppleHealthKit = mod.default;
    }
  } catch (e) {
    console.warn('[MealInsight] react-native-health not available');
  }
  return AppleHealthKit;
}

/**
 * 直近の血糖値をHealthKitから取得（食前血糖値として使用）
 * 過去1時間以内のデータを探す
 */
export async function getPreMealGlucose(): Promise<number | null> {
  const hk = getAppleHealthKit();
  if (!hk || typeof hk.getBloodGlucoseSamples !== 'function') return null;

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  return new Promise<number | null>((resolve) => {
    hk.getBloodGlucoseSamples(
      {
        startDate: oneHourAgo.toISOString(),
        endDate: now.toISOString(),
        ascending: false,
        limit: 1,
      },
      (err: any, results: any[]) => {
        if (err || !results || results.length === 0) {
          console.log('[MealInsight] No recent glucose data found');
          resolve(null);
          return;
        }
        const latestValue = Math.round(results[0].value);
        console.log(`[MealInsight] Pre-meal glucose: ${latestValue} mg/dL`);
        resolve(latestValue);
      }
    );
  });
}

/**
 * 指定時刻以降の血糖値を取得（食後血糖値として使用）
 * mealTimeから2時間以内のピーク値を返す
 */
export async function fetchPostMealGlucose(mealTime: Date): Promise<number | null> {
  const hk = getAppleHealthKit();
  if (!hk || typeof hk.getBloodGlucoseSamples !== 'function') return null;

  const twoHoursLater = new Date(mealTime.getTime() + 2 * 60 * 60 * 1000);

  return new Promise<number | null>((resolve) => {
    hk.getBloodGlucoseSamples(
      {
        startDate: mealTime.toISOString(),
        endDate: twoHoursLater.toISOString(),
        ascending: true,
        limit: 100,
      },
      (err: any, results: any[]) => {
        if (err || !results || results.length === 0) {
          resolve(null);
          return;
        }
        // 食後のピーク値を返す
        const peakValue = Math.max(...results.map((r: any) => r.value));
        console.log(`[MealInsight] Post-meal peak glucose: ${Math.round(peakValue)} mg/dL from ${results.length} samples`);
        resolve(Math.round(peakValue));
      }
    );
  });
}

/**
 * 指定時刻から30分〜1時間の間の歩数をHealthKitから取得
 */
export async function fetchPostMealSteps(mealTime: Date): Promise<number> {
  const hk = getAppleHealthKit();
  if (!hk || typeof hk.getStepCount !== 'function') return 0;

  return new Promise<number>((resolve) => {
    hk.getStepCount(
      {
        date: mealTime.toISOString(),
        includeManuallyAdded: true,
      },
      (err: any, result: any) => {
        if (err) {
          console.warn('[MealInsight] Failed to get post-meal steps:', err);
          resolve(0);
          return;
        }
        // getStepCountは開始時刻から現在までの歩数を返す
        const steps = Math.round(result?.value || 0);
        console.log(`[MealInsight] Post-meal steps since ${mealTime.toISOString()}: ${steps}`);
        resolve(steps);
      }
    );
  });
}

export interface TimelineEntry {
  id: string;
  date: string;
  time: string;
  photo: string;
  mealType: string;
  glucoseBefore: number;
  glucoseAfter: number;
  stepsAfter: number;
  spikeReduction: number;
  xpEarned: number;
  insight: string;
}

/** ランダムに1つ選ぶユーティリティ */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 動的インサイトを生成
 * 血糖値の変化量と歩数に基づいて、バリエーション豊かなメッセージを生成する
 */
export function generateInsight(
  glucoseBefore: number,
  glucoseAfter: number,
  stepsAfter: number,
  mealLabel: string,
  trendData?: { avgRise: number; count: number },
): string {
  const rise = glucoseAfter - glucoseBefore;
  const reduction = Math.max(0, 50 - rise);
  const stepsStr = stepsAfter.toLocaleString();

  // データが揃っていない場合
  if (glucoseBefore <= 0 || glucoseAfter <= 0) {
    return pick([
      `${mealLabel}を記録しました。データが集まるとアドバイスが表示されます`,
      `${mealLabel}を記録！血糖値データが揃うと詳しい分析ができます`,
      `${mealLabel}を記録しました📝 続けると傾向が見えてきます`,
      `${mealLabel}の記録完了！データが増えるほどアドバイスが正確になります`,
    ]);
  }

  const insights: string[] = [];

  // === メインインサイト（歩数 × 血糖値の4象限） ===

  if (stepsAfter >= 500 && rise <= 30) {
    // 🎉 歩いた + 血糖安定 = 最高
    insights.push(pick([
      `食後${stepsStr}歩で、急上昇を-${reduction}mg/dL抑制！素晴らしい`,
      `${stepsStr}歩の食後ウォークが効果的！血糖上昇は+${rise}mg/dLに抑えられました`,
      `食後の散歩が大成功🎉 ${stepsStr}歩歩いて+${rise}mg/dLと安定`,
      `${stepsStr}歩の効果が出ています！血糖値の急上昇を防げました`,
      `ナイスウォーク！${stepsStr}歩で血糖値を+${rise}mg/dLに抑制👏`,
    ]));
  } else if (stepsAfter >= 500 && rise > 30) {
    // 🚶 歩いたけど上昇 = まずまず
    insights.push(pick([
      `${stepsStr}歩歩きましたが+${rise}mg/dL上昇。食事内容も意識してみましょう`,
      `歩行は頑張りました！血糖は+${rise}mg/dL。糖質量を少し減らすと効果的かも`,
      `${stepsStr}歩歩いて+${rise}mg/dL。歩かなければもっと上がっていたはず💪`,
      `食後ウォーク完了！+${rise}mg/dLの上昇。食べ順（野菜→肉→ご飯）も試してみて`,
    ]));
  } else if (stepsAfter < 500 && rise > 50) {
    // ⚠️ 歩かない + 急上昇 = 要改善
    insights.push(pick([
      `食後+${rise}mg/dL上昇。次回は食後に少し歩いてみましょう`,
      `血糖値が+${rise}mg/dL上がりました。食後15分の散歩で変わるかも🚶`,
      `+${rise}mg/dLの急上昇。食後にちょっと歩くだけで抑えられます`,
      `今回は+${rise}mg/dLの上昇。次は食後すぐに5分でも歩いてみましょう`,
      `血糖スパイク+${rise}mg/dL。食後ウォークで次回は抑えてみませんか？`,
    ]));
  } else if (stepsAfter < 500 && rise <= 30) {
    // ✅ 歩かなくても安定 = 良い
    insights.push(pick([
      `血糖値は安定しています（+${rise}mg/dL）`,
      `+${rise}mg/dLと穏やかな変動。この食事は血糖に優しいですね`,
      `血糖値が安定！+${rise}mg/dLの上昇で問題なし👍`,
      `食後も+${rise}mg/dLで安定。食事内容が良かったようです`,
      `+${rise}mg/dLの変動。血糖コントロール上手です✨`,
    ]));
  } else {
    // 中間ゾーン（30 < rise <= 50, 歩数 < 500）
    insights.push(pick([
      `食後の血糖変動: +${rise}mg/dL。もう少し抑えたい場合は食後に歩いてみて`,
      `+${rise}mg/dLの上昇。食後の軽い運動で改善の余地ありです`,
      `血糖値+${rise}mg/dL。食事の内容や食べる順番を工夫すると変わるかも`,
    ]));
  }

  // === 傾向分析コメント（過去の同じ食事タイプとの比較） ===
  if (trendData && trendData.count >= 2) {
    const diff = Math.round(trendData.avgRise - rise);
    if (diff > 5) {
      insights.push(pick([
        `前回の${mealLabel}より血糖上昇が${diff}mg/dL少ないです！`,
        `${mealLabel}の平均と比べて${diff}mg/dL改善🎉`,
        `過去の${mealLabel}より${diff}mg/dL低い上昇。良い傾向です！`,
        `いつもの${mealLabel}より${diff}mg/dL抑えられています👏`,
      ]));
    } else if (diff < -5) {
      insights.push(pick([
        `前回の${mealLabel}より${Math.abs(diff)}mg/dL多く上昇しました`,
        `いつもの${mealLabel}より${Math.abs(diff)}mg/dL高め。食事内容を振り返ってみて`,
        `${mealLabel}の平均より${Math.abs(diff)}mg/dL多い上昇。次回の参考にしましょう`,
      ]));
    }
  }

  return insights.join('。');
}

/**
 * 同じ食事タイプの過去データから平均上昇値を計算
 */
export function analyzeMealTrend(
  timeline: TimelineEntry[],
  currentMealType: string,
  excludeId?: string,
): { avgRise: number; count: number } | undefined {
  const sameMealEntries = timeline.filter(
    (t) => t.mealType === currentMealType
      && t.id !== excludeId
      && t.glucoseBefore > 0
      && t.glucoseAfter > 0
  );

  if (sameMealEntries.length < 1) return undefined;

  const totalRise = sameMealEntries.reduce(
    (sum, t) => sum + (t.glucoseAfter - t.glucoseBefore),
    0
  );
  const avgRise = Math.round(totalRise / sameMealEntries.length);

  return { avgRise, count: sameMealEntries.length };
}

/**
 * 血糖値のスパイク抑制量を計算
 * 歩行なしの場合の予想上昇 vs 実際の上昇
 */
export function calculateSpikeReduction(
  glucoseBefore: number,
  glucoseAfter: number,
  stepsAfter: number,
): number {
  if (stepsAfter < 500 || glucoseBefore <= 0 || glucoseAfter <= 0) return 0;
  const actualRise = glucoseAfter - glucoseBefore;
  // 歩かなかった場合の予想上昇を50mg/dLと仮定
  const expectedRise = 50;
  const reduction = Math.max(0, expectedRise - actualRise);
  return reduction;
}
