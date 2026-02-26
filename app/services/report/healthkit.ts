
import { Alert } from 'react-native';
import { HealthKitData } from './types';

// Use require to avoid ESM/CJS interop issues with Hermes
let AppleHealthKit: any;
try {
  const mod = require('react-native-health');
  if (mod && typeof mod.initHealthKit === 'function') {
    AppleHealthKit = mod;
  } else if (mod?.default && typeof mod.default.initHealthKit === 'function') {
    AppleHealthKit = mod.default;
  } else {
    const { NativeModules } = require('react-native');
    AppleHealthKit = NativeModules.AppleHealthKit;
    if (AppleHealthKit && mod?.Constants) {
      AppleHealthKit.Constants = mod.Constants;
    }
    console.warn('[HealthKit] Loaded from NativeModules directly. Keys:', AppleHealthKit ? Object.keys(AppleHealthKit) : 'null');
  }
} catch (e) {
  console.warn('[HealthKit] react-native-health module not found:', e);
}

const USE_MOCK = false; 

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
    if (!AppleHealthKit) {
        Alert.alert("Critical Error", "react-native-healthモジュールが見つかりません。Nativeコードがリンクされていない可能性があります。");
        resolve(false);
        return;
    }

    if (typeof AppleHealthKit.initHealthKit !== 'function') {
        console.error('[HealthKit] initHealthKit is not a function. Module keys:', Object.keys(AppleHealthKit));
        Alert.alert("Critical Error", "HealthKit初期化関数が見つかりません。モジュールのバージョンを確認してください。");
        resolve(false);
        return;
    }

    const permissions = getPermissions();
    if (!permissions) {
        Alert.alert("Critical Error", "HealthKit Permissions Constantsが見つかりません。");
        resolve(false);
        return;
    }

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
 * Fetch today's total step count
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

/**
 * 通常のデータ取得（1-7日間）
 */
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

  const [bloodGlucose, steps, heartRate] = await Promise.all([
    fetchGlucose(startDate, now.toISOString(), 1000),
    fetchSteps(startDate, now.toISOString()),
    fetchHeartRate(startDate, now.toISOString(), 500),
  ]);

  return {
      bloodGlucose: bloodGlucose as any,
      steps: steps as any,
      heartRate: heartRate as any,
  };
}

/**
 * 90日間一括取得（初回セットアップ用）
 * 大量データのため上限数を引き上げ、進捗コールバックあり
 */
export async function fetchHealthKitDataBulk(
  days: number = 90,
  onProgress?: (stage: string, percent: number) => void
): Promise<HealthKitData & { hasCGM: boolean; dataStartDate: string | null }> {
  if (USE_MOCK) {
    return { ...(await fetchMockData(days)), hasCGM: true, dataStartDate: new Date(Date.now() - days * 86400000).toISOString() };
  }

  const isAuthorized = await initHealthKit();
  if (!isAuthorized) {
    return { bloodGlucose: [], steps: [], heartRate: [], hasCGM: false, dataStartDate: null };
  }

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  onProgress?.('血糖値データを取得中...', 10);
  const bloodGlucose = await fetchGlucose(startDate, now.toISOString(), 50000);
  
  onProgress?.('歩数データを取得中...', 40);
  const steps = await fetchSteps(startDate, now.toISOString());
  
  onProgress?.('心拍データを取得中...', 70);
  const heartRate = await fetchHeartRateDetailed(startDate, now.toISOString(), 10000);
  
  onProgress?.('データ分析中...', 90);

  // CGMデータ存在判定: 1日あたり20個以上のデータポイントがあればCGM
  const totalDays = Math.max(1, days);
  const pointsPerDay = bloodGlucose.length / totalDays;
  const hasCGM = pointsPerDay >= 20;

  // 最古のデータの日付
  const dataStartDate = bloodGlucose.length > 0 
    ? bloodGlucose[0].timestamp
    : null;

  if (!hasCGM && bloodGlucose.length > 0) {
    console.log(`[HealthKit] CGM not detected. Points/day: ${pointsPerDay.toFixed(1)}. Manual readings likely.`);
  }

  onProgress?.('完了', 100);

  return {
    bloodGlucose: bloodGlucose as any,
    steps: steps as any,
    heartRate: heartRate as any,
    hasCGM,
    dataStartDate,
  };
}

/**
 * CGMデータの存在チェック（軽量版 — 最近7日のデータ密度で判定）
 */
export async function checkCGMAvailability(): Promise<{
  hasCGM: boolean;
  dataPointsPerDay: number;
  message: string;
}> {
  if (!AppleHealthKit) {
    return { hasCGM: false, dataPointsPerDay: 0, message: 'HealthKitが利用できません' };
  }

  const isAuthorized = await initHealthKit();
  if (!isAuthorized) {
    return { hasCGM: false, dataPointsPerDay: 0, message: 'HealthKitの許可が必要です' };
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const data = await fetchGlucose(weekAgo, now.toISOString(), 5000);

  const pointsPerDay = data.length / 7;
  const hasCGM = pointsPerDay >= 20;

  let message = '';
  if (data.length === 0) {
    message = '血糖値データが見つかりません。CGMセンサーを接続し、HealthKitとの同期を確認してください。';
  } else if (!hasCGM) {
    message = `血糖値データは見つかりましたが、CGMによる連続記録ではなさそうです（1日あたり${Math.round(pointsPerDay)}件）。CGMセンサーの接続をご確認ください。`;
  } else {
    message = `CGMデータが正常に取得できています（1日あたり${Math.round(pointsPerDay)}件）。`;
  }

  return { hasCGM, dataPointsPerDay: Math.round(pointsPerDay), message };
}

// ============================================================
// 内部ユーティリティ関数
// ============================================================

function fetchGlucose(
  startDate: string,
  endDate: string,
  limit: number
): Promise<HealthKitData['bloodGlucose']> {
  return new Promise((resolve) => {
    AppleHealthKit.getBloodGlucoseSamples(
      { startDate, endDate, limit, ascending: true },
      (err: Object, results: Array<any>) => {
        if (err) {
          console.error("[HealthKit] Glucose fetch error:", err);
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
}

function fetchSteps(
  startDate: string,
  endDate: string
): Promise<HealthKitData['steps']> {
  return new Promise((resolve) => {
    AppleHealthKit.getDailyStepCountSamples(
      { startDate, endDate, includeManuallyAdded: false },
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
}

function fetchHeartRate(
  startDate: string,
  endDate: string,
  limit: number
): Promise<HealthKitData['heartRate']> {
  return new Promise((resolve) => {
    if (typeof AppleHealthKit.getHeartRateSamples !== 'function') {
      console.warn('[HealthKit] getHeartRateSamples not available');
      resolve([]);
      return;
    }
    AppleHealthKit.getHeartRateSamples(
      { startDate, endDate, ascending: true, limit },
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
}

/**
 * 詳細心拍データ取得（ストレス分析用）
 * 通常よりlimitを大きくし、安静時心拍も含む
 */
function fetchHeartRateDetailed(
  startDate: string,
  endDate: string,
  limit: number
): Promise<HealthKitData['heartRate']> {
  return new Promise((resolve) => {
    if (typeof AppleHealthKit.getHeartRateSamples !== 'function') {
      resolve([]);
      return;
    }
    AppleHealthKit.getHeartRateSamples(
      { startDate, endDate, ascending: true, limit },
      (err: Object, results: Array<any>) => {
        if (err) {
          console.error('[HealthKit] Detailed HeartRate fetch error:', err);
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
}

// ============================================================
// MOCK DATA GENERATOR
// ============================================================
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
