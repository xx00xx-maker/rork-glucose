import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Coins, Sprout, Leaf, TreeDeciduous, Star, Gem, Crown } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { getLevelInfo, LevelIconType } from '@/constants/mockData';

interface UserStatusHeaderProps {
  level: number;
  coins: number;
  streak: number;
}

const LevelIcon = ({ type, size = 22 }: { type: LevelIconType; size?: number }) => {
  const color = Colors.gold;
  switch (type) {
    case 'seedling':
      return <Sprout size={size} color={color} strokeWidth={2} />;
    case 'leaf':
      return <Leaf size={size} color={color} strokeWidth={2} />;
    case 'tree':
      return <TreeDeciduous size={size} color={color} strokeWidth={2} />;
    case 'star':
      return <Star size={size} color={color} strokeWidth={2} />;
    case 'gem':
      return <Gem size={size} color={color} strokeWidth={2} />;
    case 'crown':
      return <Crown size={size} color={color} strokeWidth={2} />;
    default:
      return <Star size={size} color={color} strokeWidth={2} />;
  }
};

export default function UserStatusHeader({ level, coins, streak }: UserStatusHeaderProps) {
  const levelInfo = getLevelInfo(level);

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={styles.avatarContainer}>
          <LevelIcon type={levelInfo.iconType} />
        </View>
        <View style={styles.levelInfo}>
          <Text style={styles.levelText}>Lv.{level}</Text>
          <Text style={styles.titleText}>{levelInfo.title}</Text>
        </View>
      </View>
      <View style={styles.rightSection}>
        <View style={styles.statItem}>
          <Coins size={16} color={Colors.gold} strokeWidth={2} />
          <Text style={styles.statValue}>{coins.toLocaleString()}</Text>
        </View>
        <View style={styles.statItem}>
          <Flame size={16} color={Colors.orange} fill={Colors.orange} />
          <Text style={styles.streakValue}>{streak}日</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  levelInfo: {
    gap: 2,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  titleText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  streakValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.orange,
  },
});
