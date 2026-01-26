import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Check, Camera, Footprints, Target } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { ChallengeIconType } from '@/constants/mockData';

interface MissionCompleteToastProps {
  visible: boolean;
  mission: { title: string; xp: number; iconType: string; id?: number; description?: string; completed?: boolean; progress?: number; target?: number } | null;
  onDismiss: () => void;
}

const renderChallengeIcon = (iconType: string) => {
  const iconProps = { size: 14, color: Colors.textSecondary };
  switch (iconType as ChallengeIconType) {
    case 'camera': return <Camera {...iconProps} />;
    case 'footprints': return <Footprints {...iconProps} />;
    case 'target': return <Target {...iconProps} />;
    default: return <Target {...iconProps} />;
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MissionCompleteToast({ visible, mission, onDismiss }: MissionCompleteToastProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && mission) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 60,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.sequence([
        Animated.delay(300),
        Animated.timing(xpAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss();
          xpAnim.setValue(0);
        });
      }, 2200);

      return () => clearTimeout(timer);
    }
  }, [visible, mission]);

  if (!visible || !mission) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.checkContainer}>
          <Check size={20} color="#FFFFFF" strokeWidth={3} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>ミッション達成！</Text>
          <View style={styles.missionRow}>
            {renderChallengeIcon(mission.iconType)}
            <Text style={styles.missionName}>{mission.title}</Text>
          </View>
        </View>
        <Animated.View
          style={[
            styles.xpBadge,
            {
              transform: [
                {
                  scale: xpAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.5, 1.2, 1],
                  }),
                },
              ],
              opacity: xpAnim,
            },
          ]}
        >
          <Text style={styles.xpText}>+{mission.xp} XP</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.green,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.green,
    marginBottom: 2,
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  missionName: {
    fontSize: 13,
    color: Colors.text,
  },
  xpBadge: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
});
