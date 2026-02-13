import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Settings,
  ChevronRight,
  Flame,
  Footprints,
  Camera,
  Target,
  Lock,
  BarChart3,
  Trophy,
  Coins,
  Star,
  Sunrise,
  Gem,
  Crown,
  Activity,
  Shield,
  Heart,
  Smile,
  Sprout,
  Leaf,
  TreeDeciduous,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { getLevelInfo, BadgeIconType, LevelIconType } from '@/constants/mockData';

const STAT_TOOLTIPS: Record<string, string> = {
  steps: 'アプリ開始からの累計歩数',
  meals: '写真で記録した食事の合計数',
  spikes: '食後ウォークで血糖値の急上昇を抑えた回数',
  streak: '目標を連続で達成した最長日数',
};

const BadgeIcon = ({ type, size = 24, color }: { type: BadgeIconType; size?: number; color: string }) => {
  switch (type) {
    case 'footprints':
      return <Footprints size={size} color={color} strokeWidth={1.5} />;
    case 'flame':
      return <Flame size={size} color={color} strokeWidth={1.5} />;
    case 'star':
      return <Star size={size} color={color} strokeWidth={1.5} />;
    case 'target':
      return <Target size={size} color={color} strokeWidth={1.5} />;
    case 'camera':
      return <Camera size={size} color={color} strokeWidth={1.5} />;
    case 'sunrise':
      return <Sunrise size={size} color={color} strokeWidth={1.5} />;
    case 'gem':
      return <Gem size={size} color={color} strokeWidth={1.5} />;
    case 'crown':
      return <Crown size={size} color={color} strokeWidth={1.5} />;
    case 'activity':
      return <Activity size={size} color={color} strokeWidth={1.5} />;
    case 'shield':
      return <Shield size={size} color={color} strokeWidth={1.5} />;
    case 'heart':
      return <Heart size={size} color={color} strokeWidth={1.5} />;
    case 'smile':
      return <Smile size={size} color={color} strokeWidth={1.5} />;
    default:
      return <Star size={size} color={color} strokeWidth={1.5} />;
  }
};

const LevelIcon = ({ type, size = 40 }: { type: LevelIconType; size?: number }) => {
  const color = Colors.gold;
  switch (type) {
    case 'seedling':
      return <Sprout size={size} color={color} strokeWidth={1.5} />;
    case 'leaf':
      return <Leaf size={size} color={color} strokeWidth={1.5} />;
    case 'tree':
      return <TreeDeciduous size={size} color={color} strokeWidth={1.5} />;
    case 'star':
      return <Star size={size} color={color} strokeWidth={1.5} />;
    case 'gem':
      return <Gem size={size} color={color} strokeWidth={1.5} />;
    case 'crown':
      return <Crown size={size} color={color} strokeWidth={1.5} />;
    default:
      return <Star size={size} color={color} strokeWidth={1.5} />;
  }
};

export default function ProfileScreen() {
  const { user, badges, streaks, cumulativeStats } = useApp();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const levelInfo = getLevelInfo(user.level);
  const progressPercent = ((user.totalXpForNextLevel - user.xpToNextLevel) / user.totalXpForNextLevel) * 100;
  const unlockedBadges = badges.filter(b => b.unlocked);
  const lockedBadges = badges.filter(b => !b.unlocked);

  const toggleTooltip = (id: string) => {
    setActiveTooltip(prev => prev === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>プロフィール</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings' as any)}
          >
            <Settings size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dismiss tooltip on background tap */}
        <Pressable onPress={() => setActiveTooltip(null)}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <LevelIcon type={levelInfo.iconType} />
            </View>
            <Text style={styles.levelTitle}>Lv.{user.level} {levelInfo.title}</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(progressPercent)}%</Text>
            </View>
            <Text style={styles.xpText}>次のレベルまで {user.xpToNextLevel} XP</Text>
            <View style={styles.coinsContainer}>
              <Coins size={18} color={Colors.gold} strokeWidth={2} />
              <Text style={styles.coinsText}>{user.coins.toLocaleString()}コイン</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.cardTitleRow}>
              <BarChart3 size={18} color={Colors.blue} strokeWidth={2} />
              <Text style={styles.cardTitle}>累計データ</Text>
            </View>
            {activeTooltip && (
              <View style={styles.tooltipContainer}>
                <View style={styles.tooltipBubble}>
                  <Text style={styles.tooltipText}>{STAT_TOOLTIPS[activeTooltip]}</Text>
                </View>
                <View style={[
                  styles.tooltipArrow,
                  { left: activeTooltip === 'steps' ? '12%' : activeTooltip === 'meals' ? '37%' : activeTooltip === 'spikes' ? '62%' : '87%' },
                ]} />
              </View>
            )}
            <View style={styles.statsGrid}>
              <TouchableOpacity style={styles.statItem} onPress={() => toggleTooltip('steps')} activeOpacity={0.7}>
                <Footprints size={18} color={Colors.green} />
                <Text style={styles.statValue}>{(cumulativeStats.totalSteps / 10000).toFixed(0)}万</Text>
                <Text style={styles.statLabel}>歩</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem} onPress={() => toggleTooltip('meals')} activeOpacity={0.7}>
                <Camera size={18} color={Colors.orange} />
                <Text style={styles.statValue}>{cumulativeStats.totalMeals}</Text>
                <Text style={styles.statLabel}>食記録</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem} onPress={() => toggleTooltip('spikes')} activeOpacity={0.7}>
                <Target size={18} color={Colors.blue} />
                <Text style={styles.statValue}>{cumulativeStats.spikesReduced}</Text>
                <Text style={styles.statLabel}>急上昇を抑制</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem} onPress={() => toggleTooltip('streak')} activeOpacity={0.7}>
                <Flame size={18} color={Colors.gold} />
                <Text style={styles.statValue}>{cumulativeStats.longestStreak}</Text>
                <Text style={styles.statLabel}>最長継続</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.badgesCard}>
            <View style={styles.badgesHeader}>
              <View style={styles.cardTitleRow}>
                <Trophy size={18} color={Colors.gold} strokeWidth={2} />
                <Text style={styles.cardTitle}>獲得バッジ（{unlockedBadges.length} / {badges.length}）</Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push('/all-badges')}
              >
                <Text style={styles.viewAllText}>すべて見る</Text>
                <ChevronRight size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.badgesGrid}>
              {unlockedBadges.slice(0, 6).map((badge) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <View style={styles.badgeIcon}>
                    <BadgeIcon type={badge.iconType} size={24} color={Colors.gold} />
                  </View>
                </View>
              ))}
              {lockedBadges.slice(0, Math.max(0, 6 - unlockedBadges.length)).map((badge) => (
                <View key={badge.id} style={[styles.badgeItem, styles.badgeItemLocked]}>
                  <View style={[styles.badgeIcon, styles.badgeIconLocked]}>
                    <Lock size={16} color={Colors.textMuted} />
                  </View>
                </View>
              ))}
            </View>

            {unlockedBadges.length > 0 && (
              <View style={styles.latestBadge}>
                <Text style={styles.latestBadgeLabel}>最新:</Text>
                <BadgeIcon type={unlockedBadges[unlockedBadges.length - 1].iconType} size={18} color={Colors.gold} />
                <Text style={styles.latestBadgeName}>「{unlockedBadges[unlockedBadges.length - 1].name}」</Text>
              </View>
            )}
          </View>

          <View style={styles.streaksCard}>
            <View style={styles.cardTitleRow}>
              <Flame size={18} color={Colors.orange} strokeWidth={2} />
              <Text style={styles.cardTitle}>継続記録</Text>
            </View>
            <View style={styles.streaksList}>
              <View style={styles.streakItem}>
                <View style={[styles.streakIcon, { backgroundColor: `${Colors.orange}20` }]}>
                  <Flame size={18} color={Colors.orange} fill={Colors.orange} />
                </View>
                <View style={styles.streakInfo}>
                  <Text style={styles.streakLabel}>歩数の継続</Text>
                  <Text style={[styles.streakValue, { color: Colors.orange }]}>{streaks.steps}日</Text>
                </View>
              </View>
              <View style={styles.streakItem}>
                <View style={[styles.streakIcon, { backgroundColor: `${Colors.green}20` }]}>
                  <Target size={18} color={Colors.green} />
                </View>
                <View style={styles.streakInfo}>
                  <Text style={styles.streakLabel}>血糖値安定の継続</Text>
                  <Text style={[styles.streakValue, { color: Colors.green }]}>{streaks.stability}日</Text>
                </View>
              </View>
              <View style={styles.streakItem}>
                <View style={[styles.streakIcon, { backgroundColor: `${Colors.blue}20` }]}>
                  <Camera size={18} color={Colors.blue} />
                </View>
                <View style={styles.streakInfo}>
                  <Text style={styles.streakLabel}>食事記録の継続</Text>
                  <Text style={[styles.streakValue, { color: Colors.blue }]}>{streaks.recording}日</Text>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
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
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  profileCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.cardBackgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.gold,
    marginBottom: 16,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.gold,
    width: 45,
    textAlign: 'right',
  },
  xpText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${Colors.gold}15`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  coinsText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  statsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
  },
  cardTitleRow: {
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  badgesCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgeItem: {
    width: 52,
    height: 52,
  },
  badgeItemLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${Colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  badgeIconLocked: {
    backgroundColor: Colors.cardBackgroundLight,
    borderColor: Colors.border,
  },
  latestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  latestBadgeLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  latestBadgeName: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '500' as const,
  },
  streaksCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
  },
  streaksList: {
    gap: 12,
  },
  streakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  tooltipContainer: {
    marginBottom: 8,
  },
  tooltipBubble: {
    backgroundColor: '#EAEAEA',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#EAEAEA',
    marginLeft: -7,
  },
  tooltipText: {
    color: '#333333',
    fontSize: 13,
    lineHeight: 18,
  },
});
