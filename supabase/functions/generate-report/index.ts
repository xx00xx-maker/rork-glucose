
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { analyzeData } from "./analyzer.ts";
import { generateInsights } from "./insights.ts";
import { AggregatedReportRequest, GeneratedReport, InsightCollection } from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // Use service role to write to DB for any user

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse Request
    const requestData: AggregatedReportRequest = await req.json();
    
    // 1. Run Analysis
    const analysisResults = analyzeData(requestData);
    
    // 2. Generate AI Insights
    let insights: InsightCollection;
    try {
        insights = await generateInsights(analysisResults, requestData);
    } catch (e) {
        console.error("AI Insight generation failed, using fallback", e);
        // Fallback or rethrow? Let's use basic fallback to ensuring reporting continues
        insights = {
            mainInsight: { title: "分析完了", description: "データ分析が完了しました。", emoji: "✅" },
            exerciseInsight: { title: "運動データ", description: "データを確認しています。", recommendation: "継続しましょう" },
            mealInsight: { title: "食事データ", description: "データを確認しています。", recommendation: "バランスよく食べましょう" },
            weeklyTip: "記録を続けましょう",
            encouragement: "その調子です！"
        };
    }
    
    // 3. Construct Report
    const reportId = crypto.randomUUID();
    const report: GeneratedReport = {
      reportId: reportId,
      userId: requestData.userId,
      generatedAt: new Date().toISOString(),
      period: requestData.period,
      analysis: analysisResults,
      insights: insights,
      suggestedChallenges: [], // Implement specific logic if needed
      actionItems: [] // Implement specific logic if needed
    };
    
    // 4. Return Report directly (No DB saving on server side for privacy)
    console.log(`Generated report for user ${requestData.userId}`);

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
