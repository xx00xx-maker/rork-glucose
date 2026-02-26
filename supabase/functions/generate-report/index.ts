
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { analyzeAdvancedData, analyzeData } from "./analyzer.ts";
import { generateInsights } from "./insights.ts";
import type { 
  AdvancedAnalysisRequest, 
  AggregatedReportRequest, 
  GeneratedReport, 
  InsightCollection,
  AnalysisResults
} from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData = await req.json();

    // Advanced requestかLegacy requestかを判定
    const isAdvanced = 'spikeAnalysis' in requestData;
    
    let analysisResults: AnalysisResults;
    if (isAdvanced) {
      const advancedRequest = requestData as AdvancedAnalysisRequest;
      analysisResults = analyzeAdvancedData(advancedRequest);
    } else {
      const legacyRequest = requestData as AggregatedReportRequest;
      analysisResults = analyzeData(legacyRequest);
    }

    // インサイト生成
    let insights: InsightCollection;
    try {
      insights = await generateInsights(analysisResults, requestData);
    } catch (e) {
      console.error("AI Insight generation failed, using fallback", e);
      insights = {
        mainInsight: {
          title: "血糖値レポート",
          description: `平均血糖値は${requestData.glucoseSummary.mean}mg/dLでした。`,
        },
        exerciseInsight: {
          title: "運動のヒント",
          description: "食後の軽い運動は血糖値の安定に役立ちます。",
          recommendation: "食後15分以内に10分歩くことを目標にしましょう。",
        },
        mealInsight: {
          title: "食事について",
          description: "バランスの良い食事が血糖値の安定につながります。",
          recommendation: "野菜から先に食べる習慣を試してみましょう。",
        },
        weeklyTip: "毎食後に少し歩くことで血糖値の上がり方が穏やかになります。",
        encouragement: "記録を続けていること自体が素晴らしいです！",
      };
    }

    const reportId = crypto.randomUUID();
    const report: GeneratedReport = {
      reportId,
      userId: requestData.userId,
      generatedAt: new Date().toISOString(),
      period: requestData.period,
      analysis: analysisResults,
      insights,
      suggestedChallenges: [],
      actionItems: insights.daily?.actionItems || insights.weekly?.weeklyGoals || [],
    };

    // レポートをSupabaseに保存
    try {
      const { error: upsertError } = await supabase
        .from('generated_reports')
        .upsert({
          id: reportId,
          user_id: requestData.userId,
          generated_at: report.generatedAt,
          period_type: requestData.period.type,
          period_start: requestData.period.startDate,
          period_end: requestData.period.endDate,
          report_json: JSON.stringify(report),
        });
      
      if (upsertError) {
        console.error("Failed to save report to Supabase:", upsertError);
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      // DB保存失敗してもレポートは返す
    }

    console.log(`Generated ${requestData.period.type} report for user ${requestData.userId} [${isAdvanced ? 'advanced' : 'legacy'}]`);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
