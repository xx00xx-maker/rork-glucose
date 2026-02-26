
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { fetchHealthKitData } from '../healthkit';
import { prepareAdvancedReport } from '../aggregator';
import { generateAdvancedReport } from '../api';
import { getSavedBaseline, getSetupMetadata } from '../initialSetup';
import { buildBaseline } from '../analyzers/baselineManager';
import { estimateMeals } from '../analyzers/mealEstimator';
import { analyzeWalkingEffect } from '../analyzers/walkingEffectAnalyzer';
import { detectMedicationChange } from '../analyzers/medicationChangeDetector';
import * as Crypto from 'expo-crypto';
import { saveReport } from '../localdb';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_REPORT_TASK = 'BACKGROUND_REPORT_GENERATION';
const LAST_WEEKLY_REPORT_KEY = 'last_weekly_report_date';

/**
 * 週次レポートが必要かチェック（毎週月曜に生成）
 */
async function shouldGenerateWeeklyReport(): Promise<boolean> {
  const now = new Date();
  // 月曜日(1)かチェック
  if (now.getDay() !== 1) return false;
  
  const lastDate = await AsyncStorage.getItem(LAST_WEEKLY_REPORT_KEY);
  if (!lastDate) return true;
  
  const daysSince = (now.getTime() - new Date(lastDate).getTime()) / (24 * 60 * 60 * 1000);
  return daysSince >= 6; // 前回から6日以上
}

TaskManager.defineTask(BACKGROUND_REPORT_TASK, async () => {
  try {
    console.log(`[Background Fetch] Starting report generation task...`);
    
    // メタデータ取得
    const { firstDataDate, hasInitialImport } = await getSetupMetadata();
    const existingBaseline = await getSavedBaseline();
    
    // 週次レポートが必要かチェック
    const needsWeekly = await shouldGenerateWeeklyReport();
    const days = needsWeekly ? 7 : 1;
    const reportType = needsWeekly ? 'weekly' : 'daily';

    // 1. データ取得
    const rawData = await fetchHealthKitData(days);
    
    if (rawData.bloodGlucose.length === 0) {
      console.log(`[Background Fetch] No glucose data found.`);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 食事記録をAsyncStorageから取得（timelineデータ）
    let manualMealRecords: { timestamp: string; mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' }[] = [];
    try {
      const timelineJson = await AsyncStorage.getItem('timeline_data');
      if (timelineJson) {
        const timeline = JSON.parse(timelineJson) as any[];
        manualMealRecords = timeline
          .filter((t: any) => t.date && t.time && t.mealType)
          .map((t: any) => ({
            timestamp: new Date(`${t.date}T${t.time}:00`).toISOString(),
            mealType: t.mealType,
          }));
      }
    } catch (e) {
      console.warn('[Background Fetch] Failed to load timeline:', e);
    }

    // 2. 新しい分析パイプラインでリクエスト構築
    const now = new Date();
    const request = prepareAdvancedReport(
      Crypto.randomUUID(),
      {
        type: reportType,
        startDate: new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: now.toISOString()
      },
      rawData,
      {
        manualMealRecords,
        existingBaseline,
        firstDataDate,
        hasInitialImport,
      }
    );

    // 3. API Call
    const report = await generateAdvancedReport(request);
    
    // 4. Save
    await saveReport(report);
    console.log(`[Background Fetch] ${reportType} report generated: ${report.reportId}`);

    // 5. ベースライン自動更新（週次レポート時）
    if (needsWeekly) {
      try {
        const mealResult = estimateMeals(rawData.bloodGlucose, rawData.steps, manualMealRecords);
        const walkResult = analyzeWalkingEffect(mealResult.mealEvents);
        const newBaseline = buildBaseline(
          rawData.bloodGlucose,
          mealResult.mealEvents,
          walkResult,
          existingBaseline ? 'update' : 'initial'
        );
        await AsyncStorage.setItem('personal_baseline', JSON.stringify(newBaseline));
        console.log('[Background Fetch] Baseline updated');
      } catch (e) {
        console.warn('[Background Fetch] Baseline update failed:', e);
      }

      // 6. 投薬変更監視
      try {
        const dailyStepsMap = new Map<string, number>();
        rawData.steps.forEach((s: any) => {
          const d = (s.startTime || s.date || '').substring(0, 10);
          if (d) dailyStepsMap.set(d, (dailyStepsMap.get(d) || 0) + (s.count || s.value || 0));
        });
        const dailySteps = Array.from(dailyStepsMap.entries())
          .map(([date, totalSteps]) => ({ date, totalSteps }))
          .sort((a, b) => a.date.localeCompare(b.date));
        const medResult = detectMedicationChange(rawData.bloodGlucose, { dailySteps } as any);
        if (medResult.userConfirmationNeeded) {
          await AsyncStorage.setItem('pending_medication_alert', JSON.stringify({
            before: medResult.glucoseMeanBefore,
            after: medResult.glucoseMeanAfter,
            days: medResult.daysOfChange,
          }));
          console.log('[Background Fetch] Medication change detected, saved for next app open');
        }
      } catch (e) {
        console.warn('[Background Fetch] Medication detection failed:', e);
      }

      await AsyncStorage.setItem(LAST_WEEKLY_REPORT_KEY, now.toISOString());
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error(`[Background Fetch] Task failed:`, error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_REPORT_TASK);
    if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_REPORT_TASK, {
            minimumInterval: 60 * 60 * 6, // 6 hours
            stopOnTerminate: false,
            startOnBoot: true,
        });
        console.log(`[Background Fetch] Task registered.`);
    } else {
        console.log(`[Background Fetch] Task already registered.`);
    }
  } catch (err) {
      console.error(`[Background Fetch] Register failed:`, err);
  }
}
