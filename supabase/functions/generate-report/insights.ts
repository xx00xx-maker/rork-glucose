
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { AnalysisResults, AggregatedReportRequest, InsightCollection } from "./types.ts";

export async function generateInsights(
  analysis: AnalysisResults,
  request: AggregatedReportRequest
): Promise<InsightCollection> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const prompt = buildInsightPrompt(analysis, request);
  
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

function buildInsightPrompt(
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
  const maxSpike = mealSpikes.length > 0 
    ? Math.max(...mealSpikes.map(m => m.peakGlucose - m.preGlucose))
    : 0;

  const periodLabel = request.period.type === 'daily' ? '本日' 
    : request.period.type === 'weekly' ? '今週' 
    : request.period.type === 'monthly' ? '今月' : 'この期間';

  // 目標範囲内の時間を分かりやすく説明
  const inRangePercent = request.glucoseSummary.timeInRange;
  const inRangeHours = Math.round(inRangePercent * 24 / 100);

  return `
あなたは血糖値管理をサポートする親しみやすいAIアシスタントです。
医学的な専門用語は一切使わず、誰でも理解できるやさしい言葉で説明してください。

# 重要なルール
- 「TIR」「変動係数」「CV」「ADA」などの専門用語は絶対に使わない
- 「血糖値が安定している時間」「食後の血糖値の上がり方」など日常的な言葉を使う
- 数値を使う場合は「◯時間中△時間」「◯回中△回」など具体的に
- ポジティブで励ましのあるトーンで

# ${periodLabel}のあなたの血糖値データ

## 血糖値の状態
- 平均血糖値: ${request.glucoseSummary.mean} mg/dL
- 一番低い時: ${request.glucoseSummary.min} mg/dL
- 一番高い時: ${request.glucoseSummary.max} mg/dL
- 血糖値が安定している時間: 1日のうち約${inRangeHours}時間 (${inRangePercent}%)
- 血糖値が高めの時間: 全体の${request.glucoseSummary.timeAboveRange}%
- 血糖値が低めの時間: 全体の${request.glucoseSummary.timeBelowRange}%

## 時間帯別の傾向
- 血糖値が高くなりやすい時間: ${highHours.length > 0 ? highHours.map(h => h + '時').join('、') : '特になし'}
- 血糖値が低くなりやすい時間: ${lowHours.length > 0 ? lowHours.map(h => h + '時').join('、') : '特になし'}

## 食事の影響
- 記録された食事: ${totalMeals}回
- 食後の血糖値上昇: 平均 +${avgSpike} mg/dL（最大 +${maxSpike} mg/dL）
${avgSpike <= 40 ? '→ 食後の上昇は穏やかで良い傾向' : avgSpike <= 60 ? '→ 食後の上昇は普通の範囲' : '→ 食後の上昇が大きめ、食べ方の工夫が効果的かも'}

## 運動の効果
- 1日の平均歩数: ${avgSteps}歩
- 食後に歩いた割合: ${walkRate}%（${totalMeals}回中${walks}回）
- 運動の効果: ${analysis.exerciseEffect.hasSignificantEffect ? `食後に歩くと血糖値が平均${analysis.exerciseEffect.averageGlucoseReduction}mg/dL下がっています！` : '引き続き記録を続けると効果が見えてきます'}

${request.heartRateSummary ? `
## 心拍データから
- 普段の心拍: ${request.heartRateSummary.restingAverage} bpm
- ストレスを感じた回数: ${request.heartRateSummary.stressEvents.length}回
` : ''}

# 生成するアドバイス
以下のJSON形式で、やさしく分かりやすいアドバイスを生成してください。

{
  "mainInsight": {
    "title": "${periodLabel}のまとめ（15文字以内）",
    "description": "一番伝えたいこと。数値を使って具体的に説明（80文字以内）",
    "emoji": "内容に合った絵文字1つ"
  },
  "exerciseInsight": {
    "title": "運動について（15文字以内）",
    "description": "歩数や食後の運動についての発見。「◯回中△回歩いた」など具体的に（80文字以内）",
    "recommendation": "明日からできる具体的なアドバイス（50文字以内）"
  },
  "mealInsight": {
    "title": "食事について（15文字以内）",
    "description": "どの時間帯の食事で血糖値が上がりやすいかなど（80文字以内）",
    "recommendation": "食べ方の工夫など具体的なアドバイス（50文字以内）"
  },${request.heartRateSummary ? `
  "stressInsight": {
    "title": "ストレスについて（15文字以内）",
    "description": "ストレスと血糖値の関係を分かりやすく（80文字以内）",
    "recommendation": "リラックスするための具体的なアドバイス（50文字以内）"
  },` : ''}
  "weeklyTip": "来週に向けた具体的な目標。「◯日中△日は食後に歩く」など数値入り（60文字以内）",
  "encouragement": "頑張っていることを具体的に褒める（50文字以内）"
}

# 絶対に守ること
- 専門用語（TIR、CV、変動係数、ADA基準など）を使わない
- 日常的な言葉で誰でも分かるように書く
- 「〜かもしれません」ではなく「〜ですね」「〜でした」と事実を伝える
- 数値は「24時間中18時間」「7日中5日」のように分かりやすく
- 励ましと具体的なアドバイスを含める
`;
}
