
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { AnalysisResults, AdvancedAnalysisRequest, AggregatedReportRequest, InsightCollection } from "./types.ts";

/**
 * 日次/週次でモデルとプロンプトを使い分けてインサイトを生成
 */
export async function generateInsights(
  analysis: AnalysisResults,
  request: AdvancedAnalysisRequest | AggregatedReportRequest
): Promise<InsightCollection> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const isDaily = request.period.type === 'daily';
  const isWeekly = request.period.type === 'weekly';
  
  // 日次: Gemini 2.5 Flash Lite / 週次: Gemini 2.5 Pro
  const modelName = isWeekly ? "gemini-2.5-pro" : "gemini-2.5-flash-lite";
  const model = genAI.getGenerativeModel({ model: modelName });
  
  // Advanced requestかどうかを判定
  const isAdvanced = 'spikeAnalysis' in request;
  
  let prompt: string;
  if (isAdvanced) {
    const advReq = request as AdvancedAnalysisRequest;
    prompt = isWeekly
      ? buildWeeklyPrompt(analysis, advReq)
      : buildDailyPrompt(analysis, advReq);
  } else {
    prompt = buildLegacyPrompt(analysis, request as AggregatedReportRequest);
  }
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
  
  try {
    const insights = JSON.parse(cleanedText);
    return insights;
  } catch (e) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Failed to parse AI insights");
  }
}

// ============================================================
// 日次プロンプト (Gemini 2.5 Flash Lite)
// ============================================================
function buildDailyPrompt(
  analysis: AnalysisResults,
  request: AdvancedAnalysisRequest
): string {
  const { spikeAnalysis, walkingEffect, timeZonePattern, mealGlucoseCorrelation,
          tirAnalysis, baselineComparison, circadianAnalysis, isInTransitionPeriod } = request;
  
  const mealCount = mealGlucoseCorrelation.mealEvents.length;
  const avgSteps = request.activitySummary.dailySteps.length > 0
    ? Math.round(request.activitySummary.dailySteps.reduce((s, d) => s + d.totalSteps, 0) / request.activitySummary.dailySteps.length)
    : 0;

  // スパイク分類のラベル
  const spikeLabel = (cat: string) => {
    switch (cat) {
      case 'good': return '良好';
      case 'slightly_high': return 'やや高め';
      case 'high': return '高め';
      case 'caution': return '要注意';
      default: return '';
    }
  };

  let baselineSection = '';
  if (baselineComparison) {
    const labels: Record<string, string> = {
      normal: 'いつも通り', better: 'いつもより良い',
      worse: 'いつもより悪い', personal_best: '自己ベスト付近'
    };
    baselineSection = `
## パーソナルベースラインとの比較
- 総合: ${labels[baselineComparison.overallComparison]}
- 空腹時血糖: ${labels[baselineComparison.fastingComparison]}
（偏差: ${baselineComparison.deviationSigma}σ）`;
  }

  let transitionNote = '';
  if (isInTransitionPeriod) {
    transitionNote = `
> 注意: 現在、お薬の変更後の移行期間中です。新しい傾向を学習中のため、改善・悪化の断定は避け、ニュートラルなトーンで伝えてください。`;
  }

  return `
あなたは血糖値管理をサポートする親しみやすいAIアシスタントです。
医学的な専門用語は一切使わず、誰でも理解できるやさしい言葉で説明してください。
${transitionNote}

# 重要なルール
- 「TIR」「変動係数」「CV」「ADA」などの専門用語は絶対に使わない
- 数値は「○時間中△時間」「○回中△回」のように具体的に
- ポジティブで励ましのあるトーン
- 必ず数値的根拠を添える
- アドバイスは「夕食後15分以内に10分歩く」のように行動レベルまで落とし込む

# 本日の血糖値データ

## 食事別スパイク
- 朝食: 平均+${spikeAnalysis.breakfastSpikes.mean}mg/dL（${spikeLabel(spikeAnalysis.breakfastSpikes.category)}、${spikeAnalysis.breakfastSpikes.count}回）
- 昼食: 平均+${spikeAnalysis.lunchSpikes.mean}mg/dL（${spikeLabel(spikeAnalysis.lunchSpikes.category)}、${spikeAnalysis.lunchSpikes.count}回）
- 夕食: 平均+${spikeAnalysis.dinnerSpikes.mean}mg/dL（${spikeLabel(spikeAnalysis.dinnerSpikes.category)}、${spikeAnalysis.dinnerSpikes.count}回）
- ピーク到達時間: 平均${spikeAnalysis.averagePeakTime}分

## 食後ウォーキング効果
- 歩いた時のスパイク: +${walkingEffect.withWalkSpike}mg/dL（${walkingEffect.sampleSizeWithWalk}回）
- 歩かなかった時のスパイク: +${walkingEffect.withoutWalkSpike}mg/dL（${walkingEffect.sampleSizeWithoutWalk}回）
- 抑制効果: ${walkingEffect.reductionPercent}%（${walkingEffect.reductionMgDl}mg/dL）

## 血糖安定性
- 安定範囲内の時間: ${tirAnalysis.tirHoursPerDay}時間/日（${tirAnalysis.tir}%）
- 注意が必要な時間帯: ${timeZonePattern.zones.filter(z => z.riskLevel !== 'low').map(z => z.label).join('、') || 'なし'}
${baselineSection}

## 運動データ
- 1日の平均歩数: ${avgSteps}歩
- 食事回数: ${mealCount}回

# 生成するJSON
以下のJSON形式で日次レポートを生成してください。

{
  "mainInsight": {
    "title": "本日のまとめ（15文字以内）",
    "description": "一番伝えたいこと。スパイクの数値を使って具体的に（80文字以内）"
  },
  "exerciseInsight": {
    "title": "運動について（15文字以内）",
    "description": "歩行効果の数値を使って具体的に（80文字以内）",
    "recommendation": "明日の具体的な行動目標（50文字以内）"
  },
  "mealInsight": {
    "title": "食事について（15文字以内）",
    "description": "どの食事でスパイクが大きいか、数値で（80文字以内）",
    "recommendation": "具体的な食べ方の工夫（50文字以内）"
  },
  "weeklyTip": "明日の具体的な目標1つ（数値付き、60文字以内）",
  "encouragement": "頑張っていることを具体的に褒める（50文字以内）",
  "daily": {
    "overallComment": "本日の総合評価（一言、30文字以内）",
    "mealSpikeSummary": {
      "breakfast": "朝食の結果コメント（40文字以内）",
      "lunch": "昼食の結果コメント（40文字以内）",
      "dinner": "夕食の結果コメント（40文字以内）",
      "comparison": "過去との比較コメント（40文字以内）"
    },
    "walkingEffectComment": "歩行効果のコメント（60文字以内）",
    "cautionTimeZones": "注意すべき時間帯のコメント（60文字以内）",
    "actionItems": ["具体的アクション1（数値付き）", "具体的アクション2（数値付き）"],
    "encouragement": "励ましの言葉（50文字以内）"
  }
}

# 絶対に守ること
- 専門用語を使わない
- 数値的根拠を必ず添える
- 「運動しましょう」ではなく「夕食後15分以内に10分歩く」のように具体的に
- 絵文字は一切使用しない
`;
}

// ============================================================
// 週次プロンプト (Gemini 2.5 Pro)
// ============================================================
function buildWeeklyPrompt(
  analysis: AnalysisResults,
  request: AdvancedAnalysisRequest
): string {
  const { spikeAnalysis, walkingEffect, mealIntervalAnalysis, timeZonePattern,
          stepsGlucoseCorrelation, tirAnalysis, circadianAnalysis, stressAnalysis,
          baselineComparison, detectedPatterns, growthTracker, dataMaturity,
          mealGlucoseCorrelation, isInTransitionPeriod } = request;
  
  const avgSteps = request.activitySummary.dailySteps.length > 0
    ? Math.round(request.activitySummary.dailySteps.reduce((s, d) => s + d.totalSteps, 0) / request.activitySummary.dailySteps.length)
    : 0;

  const spikeLabel = (cat: string) => {
    switch (cat) { case 'good': return '良好'; case 'slightly_high': return 'やや高め'; case 'high': return '高め'; case 'caution': return '要注意'; default: return ''; }
  };

  let patternsSection = '';
  if (detectedPatterns.length > 0) {
    patternsSection = `
## 発見された個人パターン
${detectedPatterns.map(p => `- ${p.description}（信頼度${p.confidence}%）`).join('\n')}`;
  }

  let growthSection = '';
  if (growthTracker) {
    const newMilestones = growthTracker.milestones.filter(m => m.isNew);
    growthSection = `
## 成長トラッカー
${growthTracker.improvementAreas.map(a => `- ${a.area}: ${a.trend === 'improving' ? '改善中' : a.trend === 'declining' ? '要注意' : '安定'}（${a.changePercent > 0 ? '+' : ''}${a.changePercent}%）`).join('\n')}
${newMilestones.length > 0 ? `\n### 新マイルストーン！\n${newMilestones.map(m => `- 🎉 ${m.description}`).join('\n')}` : ''}`;
  }

  let stressSection = '';
  if (stressAnalysis.overallStressIndicator !== 'none_detected') {
    stressSection = `
## ストレスの可能性
- 検出モード: ${stressAnalysis.hasHeartRateData ? '心拍データあり' : '血糖パターンのみ'}
- 指標: ${stressAnalysis.overallStressIndicator === 'possible' ? 'ストレスの可能性あり' : '要確認'}
- 信頼度: ${stressAnalysis.confidenceLevel}
${stressAnalysis.unexplainedSpikes ? `- 説明のつかない急上昇: ${stressAnalysis.unexplainedSpikes.length}回` : ''}
${stressAnalysis.nighttimeElevation?.isElevated ? `- 深夜の血糖値が高め（平均${stressAnalysis.nighttimeElevation.averageNightGlucose}mg/dL）` : ''}`;
  }

  let transitionNote = '';
  if (isInTransitionPeriod) {
    transitionNote = `
> 注意: 現在、お薬の変更後の移行期間中（2週間以内）です。「新しいお薬の効果が出始めています。新しい傾向を学習中です」のニュートラルなトーンで伝え、改善・悪化の断定は避けてください。`;
  }

  return `
あなたは血糖値管理をサポートする親しみやすいAIアシスタントです。
医学的な専門用語は一切使わず、誰でも理解できるやさしい言葉で説明してください。
これは1週間分の総合レポートです。詳しく、具体的に分析してください。
${transitionNote}

# 重要なルール
- 「TIR」「変動係数」「CV」「ADA」「サーカディアン」などの専門用語は絶対に使わない
- 「生活リズム」「血糖値が安定している時間」など日常的な言葉を使う
- 数値は「7日中5日」「24時間中18時間」など分かりやすく
- アドバイスは「夕食後15分以内に10分歩く」のように行動レベルまで落とし込む
- データが不足している場合は正直にその旨を伝える
- トーンはポジティブに保つ

# 今週の血糖値データ

## 食事分析
- 朝食スパイク: 平均+${spikeAnalysis.breakfastSpikes.mean}mg/dL（${spikeLabel(spikeAnalysis.breakfastSpikes.category)}）
- 昼食スパイク: 平均+${spikeAnalysis.lunchSpikes.mean}mg/dL（${spikeLabel(spikeAnalysis.lunchSpikes.category)}）
- 夕食スパイク: 平均+${spikeAnalysis.dinnerSpikes.mean}mg/dL（${spikeLabel(spikeAnalysis.dinnerSpikes.category)}）
- 最もスパイクが大きい食事: ${spikeAnalysis.worstMeal === 'breakfast' ? '朝食' : spikeAnalysis.worstMeal === 'lunch' ? '昼食' : '夕食'}
- 食事間隔6h以上の影響: ${mealIntervalAnalysis.isSignificant ? `次の食事で+${mealIntervalAnalysis.longIntervalExtraSpike}mg/dL増加（${mealIntervalAnalysis.longIntervalCount}回）` : 'データ不足'}
- 食事記録率: ${mealGlucoseCorrelation.mealRecordingRate}%（${mealGlucoseCorrelation.mealRecordingLevel === 'sufficient' ? '十分' : mealGlucoseCorrelation.mealRecordingLevel === 'partial' ? 'やや不足' : '不足'}）

## 運動分析
- 食後ウォーキング効果: ${walkingEffect.isSignificant ? `${walkingEffect.reductionPercent}%抑制（歩行時+${walkingEffect.withWalkSpike} vs 未歩行+${walkingEffect.withoutWalkSpike}mg/dL）` : 'データ不足'}
- 平均歩数: ${avgSteps}歩/日
- 前日歩数と翌朝血糖: ${stepsGlucoseCorrelation.isSignificant ? `高歩数日は翌朝${stepsGlucoseCorrelation.difference}mg/dL低い（相関${stepsGlucoseCorrelation.correlationCoefficient}）` : 'データ不足'}

## 生活リズム分析
- リズムスコア: ${circadianAnalysis.overallRhythmScore}/100
  - 食事リズム: ${circadianAnalysis.scoreBreakdown.mealRhythm}/100（${circadianAnalysis.mealRhythm.overallLabel === 'stable' ? '安定' : circadianAnalysis.mealRhythm.overallLabel === 'slightly_irregular' ? 'やや不規則' : '不規則'}）
  - 活動リズム: ${circadianAnalysis.scoreBreakdown.activityRhythm}/100
- 夕食時間の影響: ${circadianAnalysis.dinnerTimeSensitivity.early.count > 0 ? `18時台+${circadianAnalysis.dinnerTimeSensitivity.early.avgSpike} vs 20時以降+${circadianAnalysis.dinnerTimeSensitivity.veryLate.avgSpike}mg/dL` : 'データ不足'}
- 暁現象: 平均+${circadianAnalysis.dawnPhenomenon.averageRise}mg/dL（${circadianAnalysis.dawnPhenomenon.averageStartHour}時頃開始）
- リズム安定日のTIR: ${circadianAnalysis.mealRhythm.stableDaysTIR}% vs 不安定日: ${circadianAnalysis.mealRhythm.unstableDaysTIR}%

## 血糖安定性
- 安定時間: ${tirAnalysis.tirHoursPerDay}時間/日（${tirAnalysis.tir}%）
- リスクの高い時間帯: ${timeZonePattern.zones.filter(z => z.riskLevel !== 'low').map(z => `${z.label}（平均${z.averageGlucose}mg/dL）`).join('、') || 'なし'}
${stressSection}
${patternsSection}
${growthSection}

# 生成するJSON
以下のJSON形式で週次レポートを生成してください。

{
  "mainInsight": {
    "title": "今週のまとめ（15文字以内）",
    "description": "一番伝えたいこと。数値を使って具体的に（80文字以内）"
  },
  "exerciseInsight": {
    "title": "運動について（15文字以内）",
    "description": "歩行効果・歩数トレンドを数値で（80文字以内）",
    "recommendation": "来週の具体的な目標（50文字以内）"
  },
  "mealInsight": {
    "title": "食事について（15文字以内）",
    "description": "スパイク傾向・時間帯影響を数値で（80文字以内）",
    "recommendation": "具体的な改善アドバイス（50文字以内）"
  },
  "weeklyTip": "来週に向けた具体的な目標（数値入り、60文字以内）",
  "encouragement": "頑張っていることを具体的に褒める（50文字以内）",
  "weekly": {
    "weekSummary": "1週間の総合評価（100文字以内）",
    "mealAnalysis": {
      "spikeTrends": "スパイクの傾向分析（80文字以内）",
      "timeZoneImpact": "時間帯の影響分析（80文字以内）"
    },
    "exerciseAnalysis": {
      "walkingEffect": "歩行効果の分析（80文字以内）",
      "stepsTrend": "歩数トレンドの分析（80文字以内）"
    },
    "rhythmAnalysis": {
      "rhythmScore": ${circadianAnalysis.overallRhythmScore},
      "circadianFindings": "生活リズムに関する発見（100文字以内）"
    },
    "glucoseStability": "血糖安定性の分析（80文字以内）",
    ${stressAnalysis.overallStressIndicator !== 'none_detected' ? '"stressComment": "ストレスの可能性に関するコメント（控えめな表現で、80文字以内）",' : ''}
    ${detectedPatterns.length > 0 ? `"discoveredPatterns": [${detectedPatterns.map(p => `"${p.description}"`).join(',')}],` : ''}
    "growthProgress": "成長の進捗コメント（80文字以内）",
    ${growthTracker?.milestones.filter(m => m.isNew).map(m => `"${m.description}"`).join(',') ? `"newMilestones": [${growthTracker?.milestones.filter(m => m.isNew).map(m => `"${m.description}"`).join(',')}],` : ''}
    "weeklyGoals": ["目標1（数値付き）", "目標2（数値付き）", "目標3（数値付き）"],
    "encouragement": "励ましメッセージ（50文字以内）"
    ${analysis.glucoseControl.mainIssues.some(i => i.includes('低く')) ? ',"medicalAlert": "血糖値が低くなる頻度が高い場合の医師相談推奨（80文字以内）"' : ''}
  }
}

# 絶対に守ること
- 専門用語を使わない
- すべてに数値的根拠を添える
- アドバイスは具体的な行動レベルまで落とし込む
- 「睡眠」という言葉は使わず「生活リズム」と表現する
- データが不足している場合は正直にその旨を伝える
- トーンはポジティブに保つ
- 責めるトーンにしない
- 絵文字は一切使用しない
`;
}

// ============================================================
// レガシープロンプト (既存互換)
// ============================================================
function buildLegacyPrompt(
  analysis: AnalysisResults,
  request: AggregatedReportRequest
): string {
  const avgSteps = request.activitySummary.dailySteps.length > 0
    ? Math.round(request.activitySummary.dailySteps.reduce((sum, d) => sum + d.totalSteps, 0) / request.activitySummary.dailySteps.length)
    : 0;
    
  const walks = request.mealGlucoseCorrelation.mealEvents.filter(m => m.postMealSteps > 500).length;
  const totalMeals = request.mealGlucoseCorrelation.mealEvents.length;
  const walkRate = totalMeals > 0 ? Math.round((walks / totalMeals) * 100) : 0;
  
  const hourlyData = request.glucoseSummary.hourlyAverages;
  const highHours = hourlyData.filter(h => h.average > 140).map(h => h.hour);
  const lowHours = hourlyData.filter(h => h.average < 70).map(h => h.hour);
  
  const mealSpikes = request.mealGlucoseCorrelation.mealEvents;
  const avgSpike = mealSpikes.length > 0 
    ? Math.round(mealSpikes.reduce((sum, m) => sum + (m.peakGlucose - m.preGlucose), 0) / mealSpikes.length)
    : 0;

  const periodLabel = request.period.type === 'daily' ? '本日' 
    : request.period.type === 'weekly' ? '今週' 
    : request.period.type === 'monthly' ? '今月' : 'この期間';

  const inRangePercent = request.glucoseSummary.timeInRange;
  const inRangeHours = Math.round(inRangePercent * 24 / 100);

  return `
あなたは血糖値管理をサポートする親しみやすいAIアシスタントです。
医学的な専門用語は一切使わず、誰でも理解できるやさしい言葉で説明してください。

# 重要なルール
- 「TIR」「変動係数」「CV」「ADA」などの専門用語は絶対に使わない
- 数値は「○時間中△時間」「○回中△回」のように具体的に
- ポジティブで励ましのあるトーン

# ${periodLabel}の血糖値データ
- 平均血糖値: ${request.glucoseSummary.mean} mg/dL
- 安定時間: 1日のうち約${inRangeHours}時間 (${inRangePercent}%)
- 高め時間: ${request.glucoseSummary.timeAboveRange}%
- 低め時間: ${request.glucoseSummary.timeBelowRange}%
- 高くなりやすい時間: ${highHours.length > 0 ? highHours.map(h => h + '時').join('、') : '特になし'}
- 低くなりやすい時間: ${lowHours.length > 0 ? lowHours.map(h => h + '時').join('、') : '特になし'}
- 食事回数: ${totalMeals}回、食後上昇: 平均 +${avgSpike} mg/dL
- 平均歩数: ${avgSteps}歩、食後歩行率: ${walkRate}%
- 運動効果: ${analysis.exerciseEffect.hasSignificantEffect ? `歩くと平均${analysis.exerciseEffect.averageGlucoseReduction}mg/dL低下` : '引き続き記録を'}

# 生成するJSON
{
  "mainInsight": { "title": "15文字以内", "description": "80文字以内" },
  "exerciseInsight": { "title": "15文字以内", "description": "80文字以内", "recommendation": "50文字以内" },
  "mealInsight": { "title": "15文字以内", "description": "80文字以内", "recommendation": "50文字以内" },
  "weeklyTip": "60文字以内",
  "encouragement": "50文字以内"
}
`;
}
