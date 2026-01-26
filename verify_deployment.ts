
const SUPABASE_URL = "https://mujwclluwwosvyvhwlrv.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11andjbGx1d3dvc3Z5dmh3bHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTc3OTIsImV4cCI6MjA4NDk5Mzc5Mn0.g_6-G9Qd4SmmeMo9sH2o_qzHJZo0N5eWSApRht_GRlE";

const mockRequest = {
  userId: "verify-user-001",
  period: {
    type: "weekly",
    startDate: new Date(Date.now() - 7*24*60*60*1000).toISOString(),
    endDate: new Date().toISOString()
  },
  glucoseSummary: {
    mean: 110,
    median: 105,
    stdDev: 20,
    min: 80,
    max: 150,
    timeInRange: 85,
    timeBelowRange: 1,
    timeAboveRange: 14,
    hourlyAverages: [],
    dailySummaries: []
  },
  activitySummary: {
    dailySteps: [
        { date: "2025-01-20", totalSteps: 8000, flightsClimbed: 5, activeMinutes: 60 }
    ],
    hourlyStepPattern: []
  },
  mealGlucoseCorrelation: {
    mealEvents: [
        { mealTime: new Date().toISOString(), preGlucose: 90, peakGlucose: 130, peakTime: 60, returnToBaseline: 120, postMealSteps: 1500, spikeReduction: 10 }
    ]
  }
};

console.log("Invoking 'generate-report' via Fetch...");

const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-report`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify(mockRequest)
});

if (!response.ok) {
    console.error(`Error invoking function: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.error("Response body:", text);
    Deno.exit(1);
}

const data = await response.json();

console.log("Success! Response:");
console.log(JSON.stringify(data, null, 2));

if (data.analysis && data.insights) {
    console.log("\n✅ Analysis and Insights present.");
} else {
    console.error("\n❌ Missing analysis or insights.");
    Deno.exit(1);
}
