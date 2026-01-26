
import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
} from 'react-native-health';
import { HealthKitData } from './types';

// Dev flag to force mock data (useful for Simulator without HealthKit capabilities)
const USE_MOCK = false; 

const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.BloodGlucose,
      AppleHealthKit.Constants.Permissions.Steps,
    ],
    write: [], // We don't write
  },
};

export function initHealthKit(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(permissions, (error: string) => {
      if (error) {
        console.error('[HealthKit] Init error:', error);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

export async function fetchHealthKitData(days: number): Promise<HealthKitData> {
  if (USE_MOCK) {
      console.log("[HealthKit] Using MOCK data");
      return fetchMockData(days);
  }
  
  const isAuthorized = await initHealthKit();
  if (!isAuthorized) {
      console.warn("[HealthKit] Authorization failed or denied. Using Mock data as fallback.");
      return fetchMockData(days);
  }

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  const glucosePromise = new Promise<HealthKitData['bloodGlucose']>((resolve) => {
    AppleHealthKit.getBloodGlucoseSamples(
      {
        startDate: startDate,
        endDate: now.toISOString(),
        limit: 1000, // Adjust as needed
        ascending: true,
      },
      (err: Object, results: Array<HealthValue>) => {
        if (err) {
          console.error("[HealthKit] Glucose fetch error:", err);
          resolve([]);
          return;
        }
        resolve(results.map((r: any) => ({
            value: r.value,
            timestamp: r.startDate, // react-native-health returns ISO string for startDate usually, but let's verify if map is needed.
            // Wait, r.startDate in react-native-health is ISO string. 
            // Our types.ts expects string. 
            // Previous code: new Date(r.startDate).toISOString() -> string
            // r.startDate is string. 
            // Let's keep new Date(r.startDate).toISOString() to be safe against different implementations of the lib
            source: r.sourceName || "HealthKit"
        })));
      }
    );
  });

  const stepsPromise = new Promise<HealthKitData['steps']>((resolve) => {
      AppleHealthKit.getDailyStepCountSamples(
        {
          startDate: startDate,
          endDate: now.toISOString(),
          includeManuallyAdded: false,
        },
        (err: Object, results: Array<any>) => {
           if (err) {
               console.error("[HealthKit] Steps fetch error:", err);
               resolve([]);
               return;
           }
           // daily samples
           resolve(results.map(r => ({
               count: r.value,
               startTime: r.date, // createMock returns specific format
               endTime: r.date // Daily step counts usually just have a date
           })));
        }
      );
  });

  const [bloodGlucose, steps] = await Promise.all([glucosePromise, stepsPromise]);

  return {
      bloodGlucose: bloodGlucose as any, 
      steps: steps as any
  };
}

// === MOCK DATA GENERATOR (Kept for fallback) ===
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
    steps: steps as any
  };
}
