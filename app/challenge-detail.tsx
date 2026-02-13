import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X, Check, Flame, Gift, Lightbulb, PartyPopper, Camera, Footprints, Target, Coins } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { ChallengeIconType } from '@/constants/mockData';

const ChallengeIcon = ({ type, size = 16, color }: { type: ChallengeIconType; size?: number; color: string }) => {
  switch (type) {
    case 'camera':
      return <Camera size={size} color={color} strokeWidth={2} />;
    case 'footprints':
      return <Footprints size={size} color={color} strokeWidth={2} />;
    case 'target':
      return <Target size={size} color={color} strokeWidth={2} />;
    default:
      return <Target size={size} color={color} strokeWidth={2} />;
  }
};

export default function ChallengeDetailScreen() {
  const { challenges, completeChallenge, streaks } = useApp();
  const completedCount = challenges.filter(c => c.completed).length;
  const allCompleted = completedCount === challenges.length;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>今日のミッション</Text>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressSection}>
          <View style={styles.progressRing}>
            <Text style={styles.progressText}>{completedCount}/{challenges.length}</Text>
          </View>
          <View style={styles.progressLabelRow}>
            {allCompleted && <PartyPopper size={18} color={Colors.gold} strokeWidth={2} />}
            <Text style={styles.progressLabel}>
              {allCompleted ? 'パーフェクト！' : 'ミッション達成'}
            </Text>
          </View>
        </View>

        <View style={styles.streakBanner}>
          <Flame size={20} color={Colors.orange} fill={Colors.orange} />
          <Text style={styles.streakText}>{streaks.steps}日連続達成中！</Text>
          <Text style={styles.streakRecord}>最長記録: {streaks.longestEver}日</Text>
        </View>

        <View style={styles.challengeList}>
          {challenges.map((challenge) => (
            <TouchableOpacity
              key={challenge.id}
              style={[
                styles.challengeCard,
                challenge.completed && styles.challengeCardCompleted,
              ]}
              onPress={() => !challenge.completed && completeChallenge(challenge.id)}
              disabled={challenge.completed}
            >
              <View style={styles.challengeLeft}>
                <View style={[
                  styles.checkbox,
                  challenge.completed && styles.checkboxCompleted
                ]}>
                  {challenge.completed ? (
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <ChallengeIcon type={challenge.iconType} color={Colors.textSecondary} />
                  )}
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={[
                    styles.challengeTitle,
                    challenge.completed && styles.challengeTitleCompleted
                  ]}>
                    {challenge.title}
                  </Text>
                  <Text style={styles.challengeDescription}>
                    {challenge.description}
                  </Text>
                  {!challenge.completed && challenge.progress !== undefined && (
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${(challenge.progress / (challenge.target || 1)) * 100}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.progressNumbers}>
                        {challenge.progress.toLocaleString()} / {challenge.target?.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.xpBadge}>
                <Text style={[
                  styles.xpText,
                  challenge.completed && styles.xpTextCompleted
                ]}>
                  +{challenge.xp} XP
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {allCompleted && (
          <View style={styles.bonusCard}>
            <Gift size={24} color={Colors.gold} />
            <View style={styles.bonusInfo}>
              <Text style={styles.bonusTitle}>パーフェクトデイ ボーナス！</Text>
              <Text style={styles.bonusDescription}>全ミッション達成おめでとう！</Text>
            </View>
            <View style={styles.bonusXpRow}>
              <Text style={styles.bonusXp}>+50</Text>
              <Coins size={16} color={Colors.gold} strokeWidth={2} />
            </View>
          </View>
        )}

        <View style={styles.tipsCard}>
          <View style={styles.tipsTitleRow}>
            <Lightbulb size={16} color={Colors.blue} strokeWidth={2} />
            <Text style={styles.tipsTitle}>ヒント</Text>
          </View>
          <Text style={styles.tipsText}>
            食後30分以内に歩くと、血糖値の急激な上昇を効果的に抑えられます。
            まずは5分の散歩から始めてみましょう！
          </Text>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.cardBackground,
    borderWidth: 4,
    borderColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.orange}15`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.orange,
  },
  streakRecord: {
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  challengeList: {
    gap: 12,
    marginBottom: 24,
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  challengeCardCompleted: {
    borderColor: Colors.green,
    backgroundColor: `${Colors.green}10`,
  },
  challengeLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackgroundLight,
  },
  checkboxCompleted: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  challengeInfo: {
    flex: 1,
    gap: 4,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  challengeTitleCompleted: {
    color: Colors.textMuted,
  },
  challengeDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  progressBarContainer: {
    marginTop: 8,
    gap: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.green,
    borderRadius: 3,
  },
  progressNumbers: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  xpBadge: {
    backgroundColor: `${Colors.gold}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  xpText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  xpTextCompleted: {
    color: Colors.textMuted,
  },
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.gold}15`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  bonusInfo: {
    flex: 1,
  },
  bonusTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  bonusDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  bonusXpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bonusXp: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  tipsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
  },
  tipsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  tipsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
