/**
 * TIR (Time in Range) 分析モジュール
 * 目標範囲: 70-180 mg/dL
 */

import { HealthKitData, TIRAnalysisResult, TimeZone } from '../types';

function getZoneForHour(hour: number): TimeZone {
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

export function analyzeTIR(
  glucoseData: HealthKitData['bloodGlucose']
): TIRAnalysisResult {
  if (glucoseData.length === 0) {
    return {
      tir: 0,
      timeBelowRange: 0,
      timeAboveRange: 0,
      tirHoursPerDay: 0,
      unstableTimeZones: [],
      dailyTIR: [],
    };
  }
  
  const values = glucoseData.map(d => d.value);
  const inRange = values.filter(v => v >= 70 && v <= 180).length;
  const belowRange = values.filter(v => v < 70).length;
  const aboveRange = values.filter(v => v > 180).length;
  const total = values.length;
  
  const tir = Math.round((inRange / total) * 1000) / 10;
  const timeBelowRange = Math.round((belowRange / total) * 1000) / 10;
  const timeAboveRange = Math.round((aboveRange / total) * 1000) / 10;
  const tirHoursPerDay = Math.round(tir * 24 / 100 * 10) / 10;
  
  // 時間帯別のアウトオブレンジ率
  const zoneOutOfRange = new Map<TimeZone, { total: number; outOfRange: number }>();
  for (const zone of ['morning', 'midday', 'afternoon', 'evening', 'night'] as TimeZone[]) {
    zoneOutOfRange.set(zone, { total: 0, outOfRange: 0 });
  }
  
  for (const g of glucoseData) {
    const hour = new Date(g.timestamp).getHours();
    const zone = getZoneForHour(hour);
    const entry = zoneOutOfRange.get(zone)!;
    entry.total++;
    if (g.value < 70 || g.value > 180) {
      entry.outOfRange++;
    }
  }
  
  // アウトオブレンジ率が25%以上の時間帯
  const unstableTimeZones: TimeZone[] = [];
  for (const [zone, data] of zoneOutOfRange.entries()) {
    if (data.total > 0 && (data.outOfRange / data.total) >= 0.25) {
      unstableTimeZones.push(zone);
    }
  }
  
  // 日別TIR
  const dailyMap = new Map<string, number[]>();
  for (const g of glucoseData) {
    const dateKey = new Date(g.timestamp).toISOString().split('T')[0];
    if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, []);
    dailyMap.get(dateKey)!.push(g.value);
  }
  
  const dailyTIR = Array.from(dailyMap.entries()).map(([date, vals]) => ({
    date,
    tir: Math.round((vals.filter(v => v >= 70 && v <= 180).length / vals.length) * 1000) / 10,
  })).sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    tir,
    timeBelowRange,
    timeAboveRange,
    tirHoursPerDay,
    unstableTimeZones,
    dailyTIR,
  };
}
