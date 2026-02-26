/**
 * 初回セットアップサービス
 * 初回起動時に過去90日のデータを一括取得し、ベースラインを構築する
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchHealthKitDataBulk, checkCGMAvailability } from './healthkit';
import { buildBaseline } from './analyzers/baselineManager';
import { assessDataMaturity } from './analyzers/dataMaturity';
import { estimateMeals } from './analyzers/mealEstimator';
import { analyzeWalkingEffect } from './analyzers/walkingEffectAnalyzer';
import { PersonalBaseline, DataMaturityInfo } from './types';

const SETUP_COMPLETE_KEY = 'initial_setup_complete';
const BASELINE_KEY = 'personal_baseline';
const FIRST_DATA_DATE_KEY = 'first_data_date';
const HAS_INITIAL_IMPORT_KEY = 'has_initial_import';

export interface InitialSetupResult {
  success: boolean;
  hasCGM: boolean;
  cgmMessage: string;
  dataMaturity: DataMaturityInfo;
  baseline: PersonalBaseline | null;
  dataPointCount: number;
  daysOfData: number;
}

/**
 * セットアップ完了済みかチェック
 */
export async function isSetupComplete(): Promise<boolean> {
  const val = await AsyncStorage.getItem(SETUP_COMPLETE_KEY);
  return val === 'true';
}

/**
 * 初回セットアップを実行
 */
export async function runInitialSetup(
  onProgress?: (stage: string, percent: number) => void
): Promise<InitialSetupResult> {
  try {
    // 1. CGMチェック
    onProgress?.('データの存在を確認中...', 5);
    const cgmCheck = await checkCGMAvailability();
    
    if (!cgmCheck.hasCGM) {
      // CGMなしでも続行（手動測定データでも利用可能）
      console.log('[Setup] CGM not detected, continuing with available data');
    }

    // 2. 90日間一括取得
    const bulkData = await fetchHealthKitDataBulk(90, onProgress);
    
    if (bulkData.bloodGlucose.length === 0) {
      return {
        success: true,
        hasCGM: false,
        cgmMessage: cgmCheck.message,
        dataMaturity: assessDataMaturity(null, false),
        baseline: null,
        dataPointCount: 0,
        daysOfData: 0,
      };
    }

    // 3. データ成熟度判定
    const firstDataDate = bulkData.dataStartDate;
    const dataMaturity = assessDataMaturity(firstDataDate, true);
    
    // 4. 食事推定
    onProgress?.('食事パターンを分析中...', 92);
    const mealResult = estimateMeals(bulkData.bloodGlucose, bulkData.steps);
    
    // 5. ウォーキング効果
    const walkingEffect = analyzeWalkingEffect(mealResult.mealEvents);
    
    // 6. ベースライン構築
    onProgress?.('パーソナルベースラインを構築中...', 95);
    let baseline: PersonalBaseline | null = null;
    
    if (dataMaturity.level !== 'learning') {
      baseline = buildBaseline(
        bulkData.bloodGlucose,
        mealResult.mealEvents,
        walkingEffect,
        'initial'
      );
      
      // ベースラインを保存
      await AsyncStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
    }
    
    // 7. メタデータ保存
    if (firstDataDate) {
      await AsyncStorage.setItem(FIRST_DATA_DATE_KEY, firstDataDate);
    }
    await AsyncStorage.setItem(HAS_INITIAL_IMPORT_KEY, 'true');
    await AsyncStorage.setItem(SETUP_COMPLETE_KEY, 'true');
    
    // データ日数の計算
    const daysOfData = firstDataDate
      ? Math.ceil((Date.now() - new Date(firstDataDate).getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    onProgress?.('セットアップ完了！', 100);

    return {
      success: true,
      hasCGM: bulkData.hasCGM,
      cgmMessage: cgmCheck.message,
      dataMaturity,
      baseline,
      dataPointCount: bulkData.bloodGlucose.length,
      daysOfData,
    };
  } catch (error) {
    console.error('[Setup] Initial setup failed:', error);
    return {
      success: false,
      hasCGM: false,
      cgmMessage: 'セットアップ中にエラーが発生しました',
      dataMaturity: assessDataMaturity(null, false),
      baseline: null,
      dataPointCount: 0,
      daysOfData: 0,
    };
  }
}

/**
 * 保存済みベースラインを取得
 */
export async function getSavedBaseline(): Promise<PersonalBaseline | null> {
  try {
    const json = await AsyncStorage.getItem(BASELINE_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/**
 * 保存済みのメタデータを取得
 */
export async function getSetupMetadata(): Promise<{
  firstDataDate: string | null;
  hasInitialImport: boolean;
}> {
  const firstDataDate = await AsyncStorage.getItem(FIRST_DATA_DATE_KEY);
  const hasInitialImport = (await AsyncStorage.getItem(HAS_INITIAL_IMPORT_KEY)) === 'true';
  return { firstDataDate, hasInitialImport };
}
