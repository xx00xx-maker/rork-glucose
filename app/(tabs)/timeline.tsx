import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Flame, TrendingDown, Footprints, Lightbulb, Trophy, Calendar } from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

const filters = ['今日', '今週', '今月'];

export default function TimelineScreen() {
  const { timelineData, streaks } = useApp();
  const [selectedFilter, setSelectedFilter] = useState('今日');

  const renderMiniChart = (before: number, after: number, steps: number) => {
    const width = 120;
    const height = 50;
    const padding = 5;

    const points = [
      { x: padding, y: height - padding - ((before - 70) / 130) * (height - 2 * padding) },
      { x: width / 2, y: height - padding - ((after - 70) / 130) * (height - 2 * padding) },
      { x: width - padding, y: height - padding - ((after - 20 - 70) / 130) * (height - 2 * padding) },
    ];

    const pathD = `M ${points[0].x} ${points[0].y} Q ${(points[0].x + points[1].x) / 2} ${points[0].y}, ${points[1].x} ${points[1].y} Q ${(points[1].x + points[2].x) / 2} ${points[2].y}, ${points[2].x} ${points[2].y}`;
    const areaD = `${pathD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

    return (
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="miniGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.green} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={Colors.green} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <Path d={areaD} fill="url(#miniGradient)" />
        <Path d={pathD} stroke={Colors.orange} strokeWidth="2" fill="none" strokeLinecap="round" />
      </Svg>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>タイムライン</Text>
          <View style={styles.streakBadge}>
            <Flame size={16} color={Colors.orange} fill={Colors.orange} />
            <Text style={styles.streakText}>{streaks.steps}日連続</Text>
          </View>
        </View>

        <View style={styles.filterContainer}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {timelineData.map((item) => {
          const mealLabels: Record<string, { label: string; color: string }> = {
            breakfast: { label: '朝食', color: '#FF9500' },
            lunch: { label: '昼食', color: '#007AFF' },
            dinner: { label: '夕食', color: '#5856D6' },
            snack: { label: '間食', color: '#34C759' },
          };
          const itemAny = item as any;
          const mealInfo = itemAny.mealType ? mealLabels[itemAny.mealType] : null;

          return (
            <View key={item.id} style={styles.card}>
              <Image source={{ uri: item.photo }} style={styles.cardImage} contentFit="cover" />

              {/* Meal Type Badge */}
              {mealInfo && (
                <View style={[styles.mealBadge, { backgroundColor: mealInfo.color }]}>
                  <Text style={styles.mealBadgeText}>{mealInfo.label}</Text>
                </View>
              )}

              <View style={styles.cardContent}>
                <View style={styles.cardDateRow}>
                  <Calendar size={14} color={Colors.textSecondary} strokeWidth={1.5} />
                  <Text style={styles.cardDate}>{item.date} {item.time}</Text>
                </View>

                <View style={styles.chartContainer}>
                  {renderMiniChart(item.glucoseBefore, item.glucoseAfter, item.stepsAfter)}
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>食前</Text>
                    <Text style={styles.statValue}>{item.glucoseBefore}</Text>
                  </View>
                  <View style={styles.statArrow}>
                    <TrendingDown size={16} color={Colors.green} />
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>食後</Text>
                    <Text style={[styles.statValue, { color: Colors.orange }]}>{item.glucoseAfter}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Footprints size={14} color={Colors.green} />
                    <Text style={[styles.statValue, { color: Colors.green }]}>{item.stepsAfter.toLocaleString()}</Text>
                  </View>
                </View>

                {item.spikeReduction > 0 && (
                  <View style={styles.insightBox}>
                    <Lightbulb size={14} color={Colors.green} strokeWidth={2} />
                    <Text style={styles.insightText}>{item.insight}</Text>
                  </View>
                )}

                <View style={styles.xpBadge}>
                  <Trophy size={14} color={Colors.gold} strokeWidth={2} />
                  <Text style={styles.xpText}>+{item.xpEarned} XP</Text>
                </View>
              </View>
            </View>
          );
        })}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.orange}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.orange,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
  },
  filterButtonActive: {
    backgroundColor: Colors.green,
  },
  filterText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  filterTextActive: {
    color: '#FFFFFF',
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
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  cardContent: {
    padding: 16,
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  cardDate: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  statArrow: {
    paddingHorizontal: 8,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  insightBox: {
    flexDirection: 'row',
    backgroundColor: `${Colors.green}15`,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
  },
  xpText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  mealBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
  },
});
