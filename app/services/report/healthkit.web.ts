
import { HealthKitData } from './types';

// Web mock always uses mock data
export function initHealthKit(): Promise<boolean> {
  return Promise.resolve(true);
}

export async function fetchHealthKitData(days: number): Promise<HealthKitData> {
  console.log("[HealthKit] Web Mock: Generating data...");
  return fetchMockData(days);
}

export async function fetchTodaySteps(): Promise<number> {
  return Math.floor(Math.random() * 5000) + 2000;
}

// === MOCK DATA GENERATOR ===
async function fetchMockData(days: number): Promise<HealthKitData> {
  const width = days * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const start = now - width;
  
  const bloodGlucose = [];
  const steps = [];
  
  for (let t = start; t <= now; t += 15 * 60 * 1000) {
    const hour = new Date(t).getHours();
    let base = 100;
    if (hour >= 8 && hour <= 10) base = 140;
    if (hour >= 12 && hour <= 14) base = 150;
    if (hour >= 19 && hour <= 21) base = 160;
    const value = Math.max(60, Math.min(250, base + (Math.random() - 0.5) * 40));
    
    bloodGlucose.push({
      value,
      timestamp: new Date(t).toISOString(),
      source: "mock_libre"
    });
  }
  
  for (let t = start; t <= now; t += 24 * 60 * 60 * 1000) {
      const count = Math.floor(Math.random() * 5000) + 2000;
      steps.push({
          count,
          startTime: new Date(t).toISOString(),
          endTime: new Date(t + 24 * 60 * 60 * 1000).toISOString()
      });
  }
  
  return {
    bloodGlucose: bloodGlucose as any,
    steps: steps as any,
    heartRate: [] as any,
  };
}
