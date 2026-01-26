import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  X, 
  Lock, 
  Trophy, 
  Footprints, 
  Flame, 
  Star, 
  Target, 
  Camera, 
  Sunrise, 
  Gem, 
  Crown, 
  Activity, 
  Shield, 
  Heart, 
  Smile 
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { BadgeIconType } from '@/constants/mockData';

const BadgeIcon = ({ type, size = 32, color }: { type: BadgeIconType; size?: number; color: string }) => {
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

export default function AllBadgesScreen() {
  const { badges } = useApp();
  const unlockedBadges = badges.filter(b => b.unlocked);
  const lockedBadges = badges.filter(b => !b.unlocked);

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
          <Text style={styles.title}>バッジコレクション</Text>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            獲得済み: <Text style={styles.statsHighlight}>{unlockedBadges.length}</Text> / {badges.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(unlockedBadges.length / badges.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {unlockedBadges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Trophy size={18} color={Colors.gold} strokeWidth={2} />
              <Text style={styles.sectionTitle}>獲得済み</Text>
            </View>
            <View style={styles.badgeGrid}>
              {unlockedBadges.map((badge) => (
                <View key={badge.id} style={styles.badgeCard}>
                  <View style={styles.badgeIconContainer}>
                    <BadgeIcon type={badge.iconType} color={Colors.gold} />
                  </View>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                  {badge.unlockedAt && (
                    <Text style={styles.badgeDate}>
                      獲得: {badge.unlockedAt}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {lockedBadges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Lock size={18} color={Colors.textMuted} strokeWidth={2} />
              <Text style={styles.sectionTitle}>未獲得</Text>
            </View>
            <View style={styles.badgeGrid}>
              {lockedBadges.map((badge) => (
                <View key={badge.id} style={[styles.badgeCard, styles.badgeCardLocked]}>
                  <View style={[styles.badgeIconContainer, styles.badgeIconLocked]}>
                    <Lock size={24} color={Colors.textMuted} />
                  </View>
                  <Text style={[styles.badgeName, styles.badgeNameLocked]}>{badge.name}</Text>
                  <Text style={[styles.badgeDescription, styles.badgeDescriptionLocked]}>
                    {badge.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
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
  statsBar: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  statsHighlight: {
    color: Colors.gold,
    fontWeight: '600' as const,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '47%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  badgeCardLocked: {
    borderColor: Colors.border,
    opacity: 0.7,
  },
  badgeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${Colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badgeIconLocked: {
    backgroundColor: Colors.cardBackgroundLight,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeNameLocked: {
    color: Colors.textMuted,
  },
  badgeDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  badgeDescriptionLocked: {
    color: Colors.textMuted,
  },
  badgeDate: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 8,
  },
});
