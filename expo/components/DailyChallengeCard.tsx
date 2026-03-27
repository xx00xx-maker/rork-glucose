import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Check, Camera, Footprints, Target } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { ChallengeIconType } from '@/constants/mockData';

interface Challenge {
  id: number;
  title: string;
  completed: boolean;
  xp: number;
  iconType: ChallengeIconType;
  progress?: number;
  target?: number;
}

interface DailyChallengeCardProps {
  challenges: Challenge[];
  onPress?: () => void;
}

const ChallengeIcon = ({ type, color }: { type: ChallengeIconType; color: string }) => {
  const size = 16;
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

export default function DailyChallengeCard({ challenges, onPress }: DailyChallengeCardProps) {
  const completedCount = challenges.filter(c => c.completed).length;
  const totalCount = challenges.length;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Target size={18} color={Colors.green} strokeWidth={2} />
          </View>
          <Text style={styles.headerTitle}>今日のミッション</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.progressText}>{completedCount}/{totalCount}達成</Text>
          <ChevronRight size={18} color={Colors.textMuted} />
        </View>
      </View>

      <View style={styles.challengeList}>
        {challenges.map((challenge) => (
          <View key={challenge.id} style={styles.challengeItem}>
            <View style={[
              styles.checkbox,
              challenge.completed && styles.checkboxCompleted
            ]}>
              {challenge.completed ? (
                <Check size={12} color="#FFFFFF" strokeWidth={3} />
              ) : null}
            </View>
            <View style={styles.challengeContent}>
              <View style={styles.challengeTitleRow}>
                <ChallengeIcon 
                  type={challenge.iconType} 
                  color={challenge.completed ? Colors.textMuted : Colors.textSecondary} 
                />
                <Text style={[
                  styles.challengeTitle,
                  challenge.completed && styles.challengeTitleCompleted
                ]}>
                  {challenge.title}
                </Text>
              </View>
              {!challenge.completed && challenge.progress !== undefined && (
                <Text style={styles.challengeProgress}>
                  あと{(challenge.target || 0) - challenge.progress}歩
                </Text>
              )}
            </View>
            <Text style={[
              styles.xpText,
              challenge.completed && styles.xpTextCompleted
            ]}>
              +{challenge.xp} XP
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${Colors.green}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    fontSize: 13,
    color: Colors.green,
    fontWeight: '500' as const,
  },
  challengeList: {
    gap: 12,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  challengeTitle: {
    fontSize: 14,
    color: Colors.text,
  },
  challengeTitleCompleted: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  challengeProgress: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    marginLeft: 24,
  },
  xpText: {
    fontSize: 12,
    color: Colors.gold,
    fontWeight: '600' as const,
  },
  xpTextCompleted: {
    color: Colors.textMuted,
  },
});
