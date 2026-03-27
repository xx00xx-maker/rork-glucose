import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Colors from '@/constants/colors';

interface ConfettiEffectProps {
  visible: boolean;
  onComplete?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 30;
const COLORS = [Colors.gold, Colors.green, Colors.orange, Colors.purple, Colors.blue];

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  color: string;
  startX: number;
}

export default function ConfettiEffect({ visible, onComplete }: ConfettiEffectProps) {
  const confettiPieces = useRef<ConfettiPiece[]>([]);
  const animationsStarted = useRef(false);

  useEffect(() => {
    if (visible && !animationsStarted.current) {
      animationsStarted.current = true;
      
      confettiPieces.current = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        rotation: new Animated.Value(0),
        scale: new Animated.Value(1),
        color: COLORS[i % COLORS.length],
        startX: Math.random() * SCREEN_WIDTH,
      }));

      const animations = confettiPieces.current.map((piece, i) => {
        const duration = 2000 + Math.random() * 1000;
        const delay = Math.random() * 300;

        return Animated.parallel([
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(piece.y, {
              toValue: SCREEN_HEIGHT + 50,
              duration,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(piece.x, {
              toValue: (Math.random() - 0.5) * 200,
              duration,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(piece.rotation, {
              toValue: 360 * (Math.random() > 0.5 ? 1 : -1) * 3,
              duration,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay + duration * 0.7),
            Animated.timing(piece.scale, {
              toValue: 0,
              duration: duration * 0.3,
              useNativeDriver: true,
            }),
          ]),
        ]);
      });

      Animated.parallel(animations).start(() => {
        animationsStarted.current = false;
        onComplete?.();
      });
    }

    if (!visible) {
      animationsStarted.current = false;
      confettiPieces.current = [];
    }
  }, [visible, onComplete]);

  if (!visible || confettiPieces.current.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {confettiPieces.current.map((piece, i) => (
        <Animated.View
          key={i}
          style={[
            styles.confetti,
            {
              backgroundColor: piece.color,
              left: piece.startX,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                {
                  rotate: piece.rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
                { scale: piece.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  confetti: {
    position: 'absolute',
    top: -20,
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
