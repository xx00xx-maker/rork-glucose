/**
 * 時間帯別パターン分析モジュール
 * 朝(6-10), 昼(10-14), 午後(14-18), 夜(18-22), 深夜(22-6)の5区分で血糖パターンを分析
 */

import { HealthKitData, TimeZone, TimeZonePatternResult } from '../types';

const ZONE_CONFIG: { zone: TimeZone; label: string; hourRange: [number, number] }[] = [
  { zone: 'morning', label: '朝 (6-10時)', hourRange: [6, 10] },
  { zone: 'midday', label: '昼 (10-14時)', hourRange: [10, 14] },
  { zone: 'afternoon', label: '午後 (14-18時)', hourRange: [14, 18] },
  { zone: 'evening', label: '夜 (18-22時)', hourRange: [18, 22] },
  { zone: 'night', label: '深夜 (22-6時)', hourRange: [22, 6] },
];

function getZoneForHour(hour: number): TimeZone {
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night'; // 22-6
}

function getRiskLevel(avgGlucose: number): 'low' | 'moderate' | 'high' {
  if (avgGlucose <= 130) return 'low';
  if (avgGlucose <= 160) return 'moderate';
  return 'high';
}

export function analyzeTimeZonePatterns(
  glucoseData: HealthKitData['bloodGlucose']
): TimeZonePatternResult {
  // ゾーン別にデータを集計
  const zoneData = new Map<TimeZone, number[]>();
  for (const zone of ['morning', 'midday', 'afternoon', 'evening', 'night'] as TimeZone[]) {
    zoneData.set(zone, []);
  }
  
  for (const g of glucoseData) {
    const hour = new Date(g.timestamp).getHours();
    const zone = getZoneForHour(hour);
    zoneData.get(zone)!.push(g.value);
  }
  
  const zones = ZONE_CONFIG.map(config => {
    const values = zoneData.get(config.zone) || [];
    const averageGlucose = values.length > 0
      ? Math.round(values.reduce((s, v) => s + v, 0) / values.length)
      : 0;
    return {
      zone: config.zone,
      label: config.label,
      hourRange: config.hourRange,
      averageGlucose,
      riskLevel: getRiskLevel(averageGlucose),
    };
  });
  
  // 最もリスクの高い時間帯
  const highestRiskZone = zones
    .filter(z => z.averageGlucose > 0)
    .sort((a, b) => b.averageGlucose - a.averageGlucose)[0]?.zone || 'morning';
  
  return {
    zones,
    highestRiskZone,
  };
}
