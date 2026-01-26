
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
  
  // Gemini might return markdown code blocks, strip them
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
  // Safe helper for activity summary since it might be minimal
  const avgSteps = request.activitySummary.dailySteps.length > 0
    ? Math.round(request.activitySummary.dailySteps.reduce((sum, d) => sum + d.totalSteps, 0) / request.activitySummary.dailySteps.length)
    : 0;
    
  // Post meal walk rate
  const walks = request.mealGlucoseCorrelation.mealEvents.filter(m => m.postMealSteps > 500).length;
  const totalMeals = request.mealGlucoseCorrelation.mealEvents.length;
  const walkRate = totalMeals > 0 ? Math.round((walks / totalMeals) * 100) : 0;

  return `
あなたは糖尿病患者向けの血糖値管理アプリのAIアシスタントです。
以下の分析結果をもとに、ユーザーに役立つインサイトを生成してください。

# 分析結果
${JSON.stringify(analysis, null, 2)}

# ユーザーデータサマリー
- 期間: ${request.period.type}
- 平均血糖値: ${request.glucoseSummary.mean} mg/dL
- TIR: ${request.glucoseSummary.timeInRange}%
- 平均歩数: ${avgSteps}歩/日
- 食後運動実施率: ${walkRate}%
${request.heartRateSummary ? `- Apple Watch連携あり` : ''}

# 生成するインサイトの形式
以下のJSON形式で回答してください。JSON以外のテキストは含めないでください。

{
  "mainInsight": {
    "title": "今週のハイライト（20文字以内）",
    "description": "最も重要な発見（80文字以内）",
    "emoji": "適切な絵文字1つ"
  },
  "exerciseInsight": {
    "title": "運動効果について（20文字以内）",
    "description": "運動と血糖の関係についての発見（80文字以内）",
    "recommendation": "具体的な行動提案（50文字以内）"
  },
  "mealInsight": {
    "title": "食事について（20文字以内）",
    "description": "食事パターンの発見（80文字以内）",
    "recommendation": "具体的な行動提案（50文字以内）"
  },
  ${request.heartRateSummary ? `
  "stressInsight": {
    "title": "ストレスについて（20文字以内）",
    "description": "ストレスと血糖の関係（80文字以内）",
    "recommendation": "具体的な行動提案（50文字以内）"
  },
  ` : ''}
  "weeklyTip": "来週試してほしいこと（60文字以内）",
  "encouragement": "ユーザーを励ます一言（40文字以内）"
}

# 注意事項
- 医療的なアドバイスは避け、生活習慣の提案に留める
- ポジティブなトーンを維持する
- 具体的な数字を含める
- 「〜かもしれません」「〜の傾向があります」など断定を避ける
- 日本語で回答する
`;
}
