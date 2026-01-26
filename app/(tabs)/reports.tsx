import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Heart, Activity, Target, Trophy, FileDown, BarChart3, Footprints, Sofa, Lightbulb, Frown, Coins, Award } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

const periods = ['今週', '今月', '3ヶ月'];

export default function ReportsScreen() {
  const { user, weeklyReport } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState('今週');
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    { label: '基本分析', icon: BarChart3 },
    { label: 'Watch分析', icon: Heart },
  ];

  const renderTIRChart = () => {
    const size = 120;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = weeklyReport.tir / 100;
    const strokeDashoffset = circumference * (1 - progress);

    return (
      <View style={styles.tirChartContainer}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.green}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.tirChartCenter}>
          <Text style={styles.tirValue}>{weeklyReport.tir}%</Text>
          <Text style={styles.tirLabel}>TIR</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>レポート</Text>
        </View>

        <View style={styles.levelProgress}>
          <Text style={styles.levelText}>Lv.{user.level} → Lv.{user.level + 1}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((user.totalXpForNextLevel - user.xpToNextLevel) / user.totalXpForNextLevel) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.xpText}>あと {user.xpToNextLevel} XP</Text>
        </View>

        <View style={styles.periodContainer}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive,
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {user.hasAppleWatch && (
          <View style={styles.tabContainer}>
            {tabs.map((tab, index) => {
              const IconComponent = tab.icon;
              return (
                <TouchableOpacity
                  key={tab.label}
                  style={[
                    styles.tabButton,
                    selectedTab === index && styles.tabButtonActive,
                  ]}
                  onPress={() => setSelectedTab(index)}
                >
                  <IconComponent 
                    size={16} 
                    color={selectedTab === index ? Colors.purple : Colors.textSecondary} 
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      selectedTab === index && styles.tabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 0 ? (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Activity size={20} color={Colors.green} />
                <Text style={styles.cardTitle}>運動と血糖の関係</Text>
              </View>
              <View style={styles.comparisonRow}>
                <View style={styles.comparisonItem}>
                  <View style={styles.comparisonIconContainer}>
                    <Footprints size={16} color={Colors.green} strokeWidth={2} />
                  </View>
                  <Text style={styles.comparisonLabel}>歩いた日</Text>
                  <Text style={[styles.comparisonValue, { color: Colors.green }]}>
                    {weeklyReport.activeDayAvgGlucose} mg/dL
                  </Text>
                </View>
                <View style={styles.comparisonItem}>
                  <View style={styles.comparisonIconContainer}>
                    <Sofa size={16} color={Colors.orange} strokeWidth={2} />
                  </View>
                  <Text style={styles.comparisonLabel}>動かなかった日</Text>
                  <Text style={[styles.comparisonValue, { color: Colors.orange }]}>
                    {weeklyReport.inactiveDayAvgGlucose} mg/dL
                  </Text>
                </View>
              </View>
              <View style={styles.insightBox}>
                <Lightbulb size={16} color={Colors.blue} strokeWidth={2} />
                <Text style={styles.insightText}>
                  {weeklyReport.inactiveDayAvgGlucose - weeklyReport.activeDayAvgGlucose} mg/dL の差！
                </Text>
              </View>
              <View style={styles.xpEarned}>
                <Trophy size={16} color={Colors.gold} />
                <Text style={styles.xpEarnedText}>今週の運動で獲得: +{weeklyReport.xpEarned} XP</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Target size={20} color={Colors.orange} />
                <Text style={styles.cardTitle}>食後の運動効果</Text>
              </View>
              <Text style={styles.mealWalkStat}>
                食後30分以内に歩けた: <Text style={styles.highlight}>{weeklyReport.postMealWalks}回</Text> / {weeklyReport.totalMeals}食
              </Text>
              <View style={styles.comparisonRow}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>歩いた時</Text>
                  <Text style={[styles.comparisonValue, { color: Colors.green }]}>
                    +{weeklyReport.walkingSpike} mg/dL
                  </Text>
                </View>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>歩かなかった時</Text>
                  <Text style={[styles.comparisonValue, { color: Colors.orange }]}>
                    +{weeklyReport.noWalkSpike} mg/dL
                  </Text>
                </View>
              </View>
              <View style={styles.insightBox}>
                <Lightbulb size={16} color={Colors.blue} strokeWidth={2} />
                <Text style={styles.insightText}>
                  {Math.round(((weeklyReport.noWalkSpike - weeklyReport.walkingSpike) / weeklyReport.noWalkSpike) * 100)}%のスパイク抑制効果！
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Trophy size={20} color={Colors.gold} />
                <Text style={styles.cardTitle}>今週の成果</Text>
              </View>
              <View style={styles.achievementGrid}>
                <View style={styles.achievementItem}>
                  <Text style={styles.achievementLabel}>ミッション達成</Text>
                  <Text style={styles.achievementValue}>
                    {weeklyReport.missionsCompleted} / {weeklyReport.totalMissions}
                  </Text>
                </View>
                <View style={styles.achievementItem}>
                  <Text style={styles.achievementLabel}>獲得XP</Text>
                  <Text style={[styles.achievementValue, { color: Colors.gold }]}>
                    {weeklyReport.xpEarned} XP
                  </Text>
                </View>
                <View style={styles.achievementItem}>
                  <View style={styles.achievementIconRow}>
                    <Coins size={14} color={Colors.gold} strokeWidth={2} />
                    <Text style={styles.achievementLabel}>獲得コイン</Text>
                  </View>
                  <Text style={[styles.achievementValue, { color: Colors.gold }]}>
                    {weeklyReport.coinsEarned}
                  </Text>
                </View>
                <View style={styles.achievementItem}>
                  <View style={styles.achievementIconRow}>
                    <Award size={14} color={Colors.purple} strokeWidth={2} />
                    <Text style={styles.achievementLabel}>新規バッジ</Text>
                  </View>
                  <Text style={[styles.achievementValue, { color: Colors.purple }]}>
                    {weeklyReport.newBadges}個
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Target size={20} color={Colors.green} />
                <Text style={styles.cardTitle}>目標範囲内時間（TIR）</Text>
              </View>
              <View style={styles.tirContent}>
                {renderTIRChart()}
                <View style={styles.tirStats}>
                  <Text style={styles.tirStatText}>今週: {weeklyReport.tir}%</Text>
                  <View style={styles.tirChange}>
                    <TrendingUp size={14} color={Colors.green} />
                    <Text style={styles.tirChangeText}>前週比 +{weeklyReport.tirChange}%</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Heart size={20} color={Colors.purple} fill={Colors.purple} />
                <Text style={styles.cardTitle}>心拍数と血糖値の関係</Text>
              </View>
              <View style={styles.watchPlaceholder}>
                <BarChart3 size={24} color={Colors.textMuted} strokeWidth={1.5} />
                <Text style={styles.watchPlaceholderText}>
                  心拍数と血糖値の相関グラフ
                </Text>
              </View>
              <View style={styles.insightBox}>
                <Lightbulb size={16} color={Colors.blue} strokeWidth={2} />
                <Text style={styles.insightText}>
                  心拍急上昇時に血糖も上昇する傾向が見られます（相関係数 0.67）
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Frown size={20} color={Colors.orange} strokeWidth={2} />
                <Text style={styles.cardTitle}>ストレスと血糖</Text>
              </View>
              <View style={styles.comparisonRow}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>ストレス高い時</Text>
                  <Text style={[styles.comparisonValue, { color: Colors.orange }]}>
                    {weeklyReport.stressHighAvgGlucose} mg/dL
                  </Text>
                </View>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>ストレス低い時</Text>
                  <Text style={[styles.comparisonValue, { color: Colors.green }]}>
                    {weeklyReport.stressLowAvgGlucose} mg/dL
                  </Text>
                </View>
              </View>
              <View style={styles.insightBox}>
                <Lightbulb size={16} color={Colors.blue} strokeWidth={2} />
                <Text style={styles.insightText}>
                  {weeklyReport.stressHighAvgGlucose - weeklyReport.stressLowAvgGlucose} mg/dL の差があります。リラックスする時間を意識してみましょう。
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Activity size={20} color={Colors.green} />
                <Text style={styles.cardTitle}>あなたに最適な運動強度</Text>
              </View>
              <View style={styles.intensityList}>
                <View style={styles.intensityItem}>
                  <Text style={styles.intensityLabel}>軽い運動</Text>
                  <View style={styles.intensityDots}>
                    <View style={[styles.intensityDot, styles.intensityDotActive]} />
                    <View style={styles.intensityDot} />
                    <View style={styles.intensityDot} />
                  </View>
                  <Text style={styles.intensityEffect}>効果 中</Text>
                </View>
                <View style={[styles.intensityItem, styles.intensityItemBest]}>
                  <Text style={styles.intensityLabel}>中程度</Text>
                  <View style={styles.intensityDots}>
                    <View style={[styles.intensityDot, styles.intensityDotActive]} />
                    <View style={[styles.intensityDot, styles.intensityDotActive]} />
                    <View style={[styles.intensityDot, styles.intensityDotActive]} />
                  </View>
                  <Text style={[styles.intensityEffect, { color: Colors.green }]}>ベスト</Text>
                </View>
                <View style={styles.intensityItem}>
                  <Text style={styles.intensityLabel}>激しい</Text>
                  <View style={styles.intensityDots}>
                    <View style={[styles.intensityDot, styles.intensityDotActive]} />
                    <View style={styles.intensityDot} />
                    <View style={styles.intensityDot} />
                  </View>
                  <Text style={styles.intensityEffect}>効果 小</Text>
                </View>
              </View>
              <View style={styles.insightBox}>
                <Lightbulb size={16} color={Colors.blue} strokeWidth={2} />
                <Text style={styles.insightText}>
                  心拍数{weeklyReport.optimalHeartRateRange}の「早歩き」が最も効果的です。
                </Text>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.exportButton}>
          <FileDown size={20} color={Colors.text} />
          <Text style={styles.exportButtonText}>PDFでエクスポート</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  levelProgress: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  levelText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  xpText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
  },
  periodButtonActive: {
    backgroundColor: Colors.green,
  },
  periodText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
  },
  tabButtonActive: {
    backgroundColor: `${Colors.purple}30`,
    borderWidth: 1,
    borderColor: Colors.purple,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  tabTextActive: {
    color: Colors.purple,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  comparisonItem: {
    alignItems: 'center',
    gap: 4,
  },
  comparisonIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.cardBackgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  comparisonLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  comparisonValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  insightBox: {
    flexDirection: 'row',
    backgroundColor: `${Colors.blue}15`,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  xpEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  xpEarnedText: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '500' as const,
  },
  mealWalkStat: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  highlight: {
    color: Colors.green,
    fontWeight: '600' as const,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementItem: {
    width: '47%',
    backgroundColor: Colors.cardBackgroundLight,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  achievementIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  achievementLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  achievementValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  tirContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tirChartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tirChartCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  tirValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.green,
  },
  tirLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tirStats: {
    gap: 8,
  },
  tirStatText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  tirChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tirChangeText: {
    fontSize: 14,
    color: Colors.green,
  },
  watchPlaceholder: {
    backgroundColor: Colors.cardBackgroundLight,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  watchPlaceholderText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  intensityList: {
    gap: 12,
    marginBottom: 16,
  },
  intensityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.cardBackgroundLight,
  },
  intensityItemBest: {
    backgroundColor: `${Colors.green}15`,
    borderWidth: 1,
    borderColor: `${Colors.green}30`,
  },
  intensityLabel: {
    fontSize: 14,
    color: Colors.text,
    width: 80,
  },
  intensityDots: {
    flexDirection: 'row',
    gap: 4,
  },
  intensityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  intensityDotActive: {
    backgroundColor: Colors.green,
  },
  intensityEffect: {
    fontSize: 12,
    color: Colors.textSecondary,
    width: 60,
    textAlign: 'right',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exportButtonText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
});
