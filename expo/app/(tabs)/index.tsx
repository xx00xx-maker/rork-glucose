import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Footprints, Target, Camera } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import UserStatusHeader from '@/components/UserStatusHeader';
import CurrentGlucoseCard from '@/components/CurrentGlucoseCard';
import GlucoseChart from '@/components/GlucoseChart';
import DailyChallengeCard from '@/components/DailyChallengeCard';
import LevelUpModal from '@/components/LevelUpModal';
import MissionCompleteToast from '@/components/MissionCompleteToast';

export default function HomeScreen() {
  const {
    user,
    hasCompletedOnboarding,
    isLoading,
    currentStatus,
    hourlyData,
    challenges,
    streaks,
    showLevelUp,
    setShowLevelUp,
    showMissionComplete,
    setShowMissionComplete,
  } = useApp();

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

  const stepsRemaining = user.targetSteps - currentStatus.todaySteps;

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
            hasAppleWatch={user.hasAppleWatch}
          />

          <View style={styles.section}>
            <DailyChallengeCard
              challenges={challenges}
              onPress={() => router.push('/challenge-detail')}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>今日の血糖値と運動</Text>
              <GlucoseChart
                data={hourlyData}
                showHeartRate={user.hasAppleWatch}
                height={220}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>今日のサマリー</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Footprints size={20} color={Colors.green} />
                  <Text style={styles.summaryValue}>{currentStatus.todaySteps.toLocaleString()}</Text>
                  <Text style={styles.summaryLabel}>歩</Text>
                  {stepsRemaining > 0 && (
                    <Text style={styles.summaryHint}>あと{stepsRemaining.toLocaleString()}歩</Text>
                  )}
                </View>
                <View style={styles.summaryItem}>
                  <Target size={20} color={Colors.blue} />
                  <Text style={styles.summaryValue}>{currentStatus.todayTIR}</Text>
                  <Text style={styles.summaryLabel}>% TIR</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Camera size={20} color={Colors.orange} />
                  <Text style={styles.summaryValue}>{currentStatus.mealsRecorded}</Text>
                  <Text style={styles.summaryLabel}>食記録</Text>
                </View>
              </View>
            </View>
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
    marginHorizontal: 16,
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
    marginHorizontal: 16,
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
});
