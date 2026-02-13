import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Footprints, Target, Camera } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { DailyData } from '@/contexts/AppContext';
import UserStatusHeader from '@/components/UserStatusHeader';
import CurrentGlucoseCard from '@/components/CurrentGlucoseCard';
import GlucoseChart from '@/components/GlucoseChart';
import DailyChallengeCard from '@/components/DailyChallengeCard';
import LevelUpModal from '@/components/LevelUpModal';
import MissionCompleteToast from '@/components/MissionCompleteToast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px margin on each side

export default function HomeScreen() {
  const {
    user,
    hasCompletedOnboarding,
    isLoading,
    currentStatus,
    hourlyData,
    dailyData,
    challenges,
    streaks,
    showLevelUp,
    setShowLevelUp,
    showMissionComplete,
    setShowMissionComplete,
  } = useApp();

  const [activePage, setActivePage] = useState(0);
  const flatListRef = useRef<FlatList<DailyData>>(null);

  const scrollToPage = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActivePage(index);
  }, []);

  useEffect(() => {
    if (!isLoading && hasCompletedOnboarding === false) {
      router.replace('/onboarding');
    }
  }, [isLoading, hasCompletedOnboarding]);

  if (isLoading || hasCompletedOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // Use dailyData if available, otherwise create a single-day entry from currentStatus
  const displayData: DailyData[] = dailyData.length > 0 ? dailyData : [
    {
      date: new Date().toISOString().split('T')[0],
      label: '今日',
      hourlyData: hourlyData,
      steps: currentStatus.todaySteps,
      tir: currentStatus.todayTIR,
      mealsRecorded: currentStatus.mealsRecorded,
      latestGlucose: currentStatus.bloodGlucose.value > 0 ? {
        value: currentStatus.bloodGlucose.value,
        trend: currentStatus.bloodGlucose.trend,
        updatedAt: currentStatus.bloodGlucose.updatedAt,
      } : null,
    }
  ];

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
    setActivePage(page);
  };

  const stepsRemaining = user.targetSteps - currentStatus.todaySteps;

  const renderDayCard = ({ item, index }: { item: DailyData; index: number }) => {
    const dayStepsRemaining = user.targetSteps - item.steps;

    return (
      <View style={{ width: CARD_WIDTH }}>
        {/* Chart Card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{item.label}の血糖値と運動</Text>
          <GlucoseChart
            data={item.hourlyData}
            showHeartRate={currentStatus.heartRate > 0}
            height={220}
          />
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{item.label}のサマリー</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Footprints size={20} color={Colors.green} />
              <Text style={styles.summaryValue}>{item.steps.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>歩</Text>
              {index === 0 && dayStepsRemaining > 0 && (
                <Text style={styles.summaryHint}>あと{dayStepsRemaining.toLocaleString()}歩</Text>
              )}
            </View>
            <View style={styles.summaryItem}>
              <Target size={20} color={Colors.blue} />
              <Text style={styles.summaryValue}>{item.tir}</Text>
              <Text style={styles.summaryLabel}>% TIR</Text>
            </View>
            <View style={styles.summaryItem}>
              <Camera size={20} color={Colors.orange} />
              <Text style={styles.summaryValue}>{item.mealsRecorded}</Text>
              <Text style={styles.summaryLabel}>食記録</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <UserStatusHeader
            level={user.level}
            coins={user.coins}
            streak={streaks.steps}
          />

          <CurrentGlucoseCard
            value={currentStatus.bloodGlucose.value}
            trend={currentStatus.bloodGlucose.trend}
            updatedAt={currentStatus.bloodGlucose.updatedAt}
            heartRate={currentStatus.heartRate}
          />

          <View style={styles.section}>
            <DailyChallengeCard
              challenges={challenges}
              onPress={() => router.push('/challenge-detail')}
            />
          </View>

          {/* Swipeable 3-day view */}
          <View style={styles.section}>
            {/* Page indicator with date labels */}
            <View style={styles.pageIndicatorContainer}>
              {displayData.map((day, i) => (
                <TouchableOpacity
                  key={day.date}
                  style={[
                    styles.pageTab,
                    activePage === i && styles.pageTabActive,
                  ]}
                  onPress={() => scrollToPage(i)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pageTabText,
                    activePage === i && styles.pageTabTextActive,
                  ]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              ref={flatListRef}
              data={displayData}
              renderItem={renderDayCard}
              keyExtractor={(item) => item.date}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              snapToInterval={CARD_WIDTH}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 16 }}
              ItemSeparatorComponent={() => <View style={{ width: 0 }} />}
            />

            {/* Dot indicators */}
            {displayData.length > 1 && (
              <View style={styles.dotContainer}>
                {displayData.map((day, i) => (
                  <View
                    key={day.date}
                    style={[
                      styles.dot,
                      activePage === i && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <LevelUpModal
        visible={showLevelUp}
        level={user.level}
        onDismiss={() => setShowLevelUp(false)}
      />

      <MissionCompleteToast
        visible={!!showMissionComplete}
        mission={showMissionComplete}
        onDismiss={() => setShowMissionComplete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginTop: 16,
  },
  chartCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  summaryHint: {
    fontSize: 11,
    color: Colors.green,
    marginTop: 2,
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  pageTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.cardBackground,
  },
  pageTabActive: {
    backgroundColor: Colors.green,
  },
  pageTabText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
  pageTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.green,
    width: 18,
  },
});
