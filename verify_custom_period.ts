
const SUPABASE_URL = "https://mujwclluwwosvyvhwlrv.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11andjbGx1d3dvc3Z5dmh3bHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTc3OTIsImV4cCI6MjA4NDk5Mzc5Mn0.g_6-G9Qd4SmmeMo9sH2o_qzHJZo0N5eWSApRht_GRlE";

const mockRequest = {
  userId: "verify-user-custom",
  period: {
    type: "custom", // Testing custom period
    startDate: "2025-01-01T00:00:00.000Z",
    endDate: "2025-01-10T23:59:59.999Z"
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
    dailySteps: [],
    hourlyStepPattern: []
  },
  mealGlucoseCorrelation: {
    mealEvents: []
  }
};

console.log("Invoking 'generate-report' with CUSTOM period...");

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

console.log("Success! Custom Period Report:");
console.log(JSON.stringify(data.period, null, 2));

if (data.period.type === 'custom') {
    console.log("\n✅ Custom period type verified.");
} else {
    console.error("\n❌ Report type mismatch:", data.period.type);
}
