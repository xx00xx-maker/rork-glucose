import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sprout, Leaf, TreeDeciduous, Star, Gem, Crown } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { getLevelInfo, LevelIconType } from '@/constants/mockData';

interface LevelUpModalProps {
  visible: boolean;
  level: number;
  onDismiss: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LevelUpModal({ visible, level, onDismiss }: LevelUpModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss());
      }, 2800);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const levelInfo = getLevelInfo(level);

  const renderLevelIcon = (iconType: LevelIconType) => {
    const iconProps = { size: 64, color: Colors.gold };
    switch (iconType) {
      case 'seedling': return <Sprout {...iconProps} />;
      case 'leaf': return <Leaf {...iconProps} />;
      case 'tree': return <TreeDeciduous {...iconProps} />;
      case 'star': return <Star {...iconProps} />;
      case 'gem': return <Gem {...iconProps} />;
      case 'crown': return <Crown {...iconProps} />;
      default: return <Star {...iconProps} />;
    }
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <LinearGradient
        colors={['rgba(234,179,8,0.15)', 'rgba(255,255,255,0.98)', 'rgba(255,255,255,0.98)']}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.glowCircle,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
          <View style={styles.iconContainer}>
            {renderLevelIcon(levelInfo.iconType)}
          </View>
          <Text style={styles.levelUpText}>LEVEL UP!</Text>
          <Text style={styles.levelNumber}>Lv.{level}</Text>
          <Text style={styles.title}>{levelInfo.title}</Text>
          <View style={styles.bonusContainer}>
            <Text style={styles.bonusText}>+100 コインボーナス</Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 40,
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.gold,
    top: 20,
  },
  iconContainer: {
    marginBottom: 16,
  },
  levelUpText: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.gold,
    letterSpacing: 4,
    marginBottom: 8,
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 24,
  },
  bonusContainer: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  bonusText: {
    fontSize: 16,
    color: Colors.gold,
    fontWeight: '600' as const,
  },
});
