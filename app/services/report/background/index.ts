
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { fetchHealthKitData } from '../healthkit';
import { prepareDataForUpload } from '../aggregator';
import { generateReport } from '../api';
import * as Crypto from 'expo-crypto';
import { saveReport } from '../localdb'; // Assume this exists or needs implementation

const BACKGROUND_REPORT_TASK = 'BACKGROUND_REPORT_GENERATION';

TaskManager.defineTask(BACKGROUND_REPORT_TASK, async () => {
  try {
    console.log(`[Background Fetch] Starting report generation task...`);
    
    // 1. Fetch Data (Default to e.g., 1 day or check last report)
    // For background, maybe we just want to ensure we have latest data?
    // Or generate a daily report? Let's assume Daily Report for now.
    const days = 1;
    const rawData = await fetchHealthKitData(days);
    
    if (rawData.bloodGlucose.length === 0) {
        console.log(`[Background Fetch] No glucose data found.`);
        return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 2. Aggregate
    const request = prepareDataForUpload(
        Crypto.randomUUID(), 
        {
            type: 'daily',
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
        },
        rawData
    );

    // 3. API Call
    const report = await generateReport(request);
    
    // 4. Save Locally
    await saveReport(report);
    console.log(`[Background Fetch] Report generated and saved: ${report.reportId}`);

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
            stopOnTerminate: false, // Continue even if app is closed
            startOnBoot: true, // Start on device boot
        });
        console.log(`[Background Fetch] Task registered.`);
    } else {
        console.log(`[Background Fetch] Task already registered.`);
    }
  } catch (err) {
      console.error(`[Background Fetch] Register failed:`, err);
  }
}
