
import { Alert } from 'react-native';
import { HealthKitData } from './types';

// Use require to avoid ESM/CJS interop issues with Hermes
let AppleHealthKit: any;
try {
  const mod = require('react-native-health');
  // react-native-health uses CJS module.exports, but Metro/Hermes may wrap it
  // Check which object actually has initHealthKit
  if (mod && typeof mod.initHealthKit === 'function') {
    AppleHealthKit = mod;
  } else if (mod?.default && typeof mod.default.initHealthKit === 'function') {
    AppleHealthKit = mod.default;
  } else {
    // Last resort: try to get from NativeModules directly
    const { NativeModules } = require('react-native');
    AppleHealthKit = NativeModules.AppleHealthKit;
    if (AppleHealthKit && mod?.Constants) {
      // Merge Constants from the JS module
      AppleHealthKit.Constants = mod.Constants;
    }
    console.warn('[HealthKit] Loaded from NativeModules directly. Keys:', AppleHealthKit ? Object.keys(AppleHealthKit) : 'null');
  }
} catch (e) {
  console.warn('[HealthKit] react-native-health module not found:', e);
}

// Dev flag to force mock data (useful for Simulator without HealthKit capabilities)
const USE_MOCK = false; 

// Build permissions after module is loaded
const getPermissions = () => {
  if (!AppleHealthKit?.Constants?.Permissions) return null;
  return {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.BloodGlucose,
        AppleHealthKit.Constants.Permissions.Steps,
        AppleHealthKit.Constants.Permissions.HeartRate,
      ],
      write: [],
    },
  };
};

export function initHealthKit(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // 1. Check if module is available
    if (!AppleHealthKit) {
        Alert.alert("Critical Error", "react-native-healthモジュールが見つかりません。Nativeコードがリンクされていない可能性があります。");
        resolve(false);
        return;
    }

    // 2. Check if initHealthKit function exists
    if (typeof AppleHealthKit.initHealthKit !== 'function') {
        console.error('[HealthKit] initHealthKit is not a function. Module keys:', Object.keys(AppleHealthKit));
        Alert.alert("Critical Error", "HealthKit初期化関数が見つかりません。モジュールのバージョンを確認してください。");
        resolve(false);
        return;
    }

    // 3. Build permissions
    const permissions = getPermissions();
    if (!permissions) {
        Alert.alert("Critical Error", "HealthKit Permissions Constantsが見つかりません。");
        resolve(false);
        return;
    }

    // 3. Start Init
    console.log('[HealthKit] Starting initialization...');
    
    AppleHealthKit.initHealthKit(permissions, (error: string) => {
      if (error) {
        console.error('[HealthKit] Init error:', error);
        Alert.alert("HealthKit Error", "初期化に失敗しました: " + error);
        resolve(false);
        return;
      }
      console.log('[HealthKit] Initialization success');
      resolve(true);
    });
  });
}

/**
 * Fetch today's total step count directly using getStepCount
 * This avoids the date format issues with getDailyStepCountSamples
 */
export async function fetchTodaySteps(): Promise<number> {
  if (!AppleHealthKit) return 0;

  const isAuthorized = await initHealthKit();
  if (!isAuthorized) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Promise<number>((resolve) => {
    AppleHealthKit.getStepCount(
      {
        date: today.toISOString(),
        includeManuallyAdded: true,
      },
      (err: Object, result: any) => {
        if (err) {
          console.error('[HealthKit] getStepCount error:', err);
          resolve(0);
          return;
        }
        const steps = result?.value || 0;
        console.log(`[HealthKit] Today's steps from getStepCount: ${steps}`);
        resolve(Math.round(steps));
      }
    );
  });
}

export async function fetchHealthKitData(days: number): Promise<HealthKitData> {
  if (USE_MOCK) {
      console.log("[HealthKit] Using MOCK data");
      return fetchMockData(days);
  }
  
  const isAuthorized = await initHealthKit();
  if (!isAuthorized) {
      console.warn("[HealthKit] Authorization failed or denied. Returning empty data.");
      return { bloodGlucose: [], steps: [], heartRate: [] };
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
      (err: Object, results: Array<any>) => {
        if (err) {
          console.error("[HealthKit] Glucose fetch error:", err);
          Alert.alert("Data Error", "血糖値データの取得に失敗: " + JSON.stringify(err));
          resolve([]);
          return;
        }
        resolve(results.map((r: any) => ({
            value: r.value,
            timestamp: r.startDate, 
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
           resolve(results.map(r => ({
               count: r.value,
               startTime: r.startDate,
               endTime: r.endDate
           })));
        }
      );
  });

  const heartRatePromise = new Promise<HealthKitData['heartRate']>((resolve) => {
    if (typeof AppleHealthKit.getHeartRateSamples !== 'function') {
      console.warn('[HealthKit] getHeartRateSamples not available');
      resolve([]);
      return;
    }
    AppleHealthKit.getHeartRateSamples(
      {
        startDate: startDate,
        endDate: now.toISOString(),
        ascending: true,
        limit: 500,
      },
      (err: Object, results: Array<any>) => {
        if (err) {
          console.error('[HealthKit] HeartRate fetch error:', err);
          resolve([]);
          return;
        }
        resolve(results.map((r: any) => ({
          bpm: Math.round(r.value),
          timestamp: r.startDate || r.endDate,
        })));
      }
    );
  });

  const [bloodGlucose, steps, heartRate] = await Promise.all([glucosePromise, stepsPromise, heartRatePromise]);

  return {
      bloodGlucose: bloodGlucose as any,
      steps: steps as any,
      heartRate: heartRate as any,
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
      steps: steps as any,
      heartRate: [] as any,
  };
}
