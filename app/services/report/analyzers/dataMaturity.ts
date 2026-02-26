/**
 * データ成熟度判定モジュール
 * 0-2週: learning, 2週-2ヶ月: basic, 2ヶ月+: advanced
 */

import { DataMaturityLevel, DataMaturityInfo } from '../types';

export function assessDataMaturity(
  firstDataDate: string | null,
  hasInitialImport: boolean
): DataMaturityInfo {
  if (!firstDataDate) {
    return {
      level: 'learning',
      dataAgeDays: 0,
      featuresAvailable: ['基本的な血糖値サマリー'],
      featuresLocked: [
        { name: 'パーソナルベースライン', daysUntilAvailable: 14 },
        { name: '個人パターン発見', daysUntilAvailable: 60 },
        { name: '生活リズムスコア', daysUntilAvailable: 60 },
        { name: '成長トラッカー', daysUntilAvailable: 14 },
      ],
    };
  }
  
  const now = Date.now();
  const firstDate = new Date(firstDataDate).getTime();
  const dataAgeDays = Math.floor((now - firstDate) / (24 * 60 * 60 * 1000));
  
  // 初回90日取り込みの場合はスキップ
  const effectiveDays = hasInitialImport ? Math.max(dataAgeDays, 90) : dataAgeDays;
  
  let level: DataMaturityLevel;
  let featuresAvailable: string[];
  let featuresLocked: { name: string; daysUntilAvailable: number }[];
  
  if (effectiveDays < 14) {
    level = 'learning';
    featuresAvailable = [
      '基本的な血糖値サマリー',
      '時間帯別パターン',
      '食後スパイク分析',
    ];
    featuresLocked = [
      { name: 'パーソナルベースライン', daysUntilAvailable: 14 - effectiveDays },
      { name: '過去の自分との比較', daysUntilAvailable: 14 - effectiveDays },
      { name: '個人パターン発見', daysUntilAvailable: 60 - effectiveDays },
      { name: '生活リズムスコア', daysUntilAvailable: 60 - effectiveDays },
    ];
  } else if (effectiveDays < 60) {
    level = 'basic';
    featuresAvailable = [
      '基本的な血糖値サマリー',
      '時間帯別パターン',
      '食後スパイク分析',
      'パーソナルベースライン',
      '過去の自分との比較',
      '食後ウォーキング効果',
      '成長トラッカー',
    ];
    featuresLocked = [
      { name: '個人パターン自動発見', daysUntilAvailable: 60 - effectiveDays },
      { name: '高精度生活リズムスコア', daysUntilAvailable: 60 - effectiveDays },
    ];
  } else {
    level = 'advanced';
    featuresAvailable = [
      '基本的な血糖値サマリー',
      '時間帯別パターン',
      '食後スパイク分析',
      'パーソナルベースライン',
      '過去の自分との比較',
      '食後ウォーキング効果',
      '成長トラッカー',
      '個人パターン自動発見',
      '高精度生活リズムスコア',
    ];
    featuresLocked = [];
  }
  
  return {
    level,
    dataAgeDays,
    featuresAvailable,
    featuresLocked,
  };
}
