import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera as CameraIcon, X, Check, Sun, Coffee, Moon, Image as ImageIcon } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_CONFIG = {
  breakfast: { label: '朝食', icon: Coffee, color: '#FF9500' },
  lunch: { label: '昼食', icon: Sun, color: '#007AFF' },
  dinner: { label: '夕食', icon: Moon, color: '#5856D6' },
  snack: { label: '間食', icon: Coffee, color: '#34C759' },
};

export default function CameraScreen() {
  const { addXp, completeChallenge, addTimelineEntry } = useApp();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');
  const successAnim = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;

  // Determine default meal type based on current time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) {
      setSelectedMeal('breakfast');
    } else if (hour >= 10 && hour < 15) {
      setSelectedMeal('lunch');
    } else if (hour >= 15 && hour < 21) {
      setSelectedMeal('dinner');
    } else {
      setSelectedMeal('snack');
    }
  }, []);

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  // Take photo with camera
  const takePhoto = async () => {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'カメラの許可が必要です',
        '設定からカメラへのアクセスを許可してください',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
    }
  };

  // Pick from library
  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
    }
  };

  const confirmPhoto = () => {
    // Save photo to timeline with meal type
    if (capturedImage) {
      addTimelineEntry({
        photo: capturedImage,
        mealType: selectedMeal,
      });
    }

    setShowSuccess(true);

    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(200),
      Animated.timing(xpAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      addXp(10);
      setCapturedImage(null);
      setShowSuccess(false);
      successAnim.setValue(0);
      xpAnim.setValue(0);
    }, 2000);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  if (showSuccess) {
    return (
      <View style={styles.successContainer}>
        <Animated.View
          style={[
            styles.successContent,
            {
              transform: [
                {
                  scale: successAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.5, 1.1, 1],
                  }),
                },
              ],
              opacity: successAnim,
            },
          ]}
        >
          <View style={styles.successIcon}>
            <Check size={48} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text style={styles.successTitle}>記録完了</Text>
          <Text style={styles.successSubtitle}>{MEAL_CONFIG[selectedMeal].label}を記録しました</Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.xpBadge,
            {
              transform: [
                {
                  translateY: xpAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
              opacity: xpAnim,
            },
          ]}
        >
          <Text style={styles.xpText}>+10 XP</Text>
        </Animated.View>
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.previewSafeArea} edges={['top']}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={retakePhoto} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>確認</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} contentFit="cover" />
        </View>

        {/* Meal Type Selector */}
        <View style={styles.mealSelectorContainer}>
          <Text style={styles.mealSelectorTitle}>食事の種類を選択</Text>
          <View style={styles.mealOptions}>
            {(Object.keys(MEAL_CONFIG) as MealType[]).map((meal) => {
              const config = MEAL_CONFIG[meal];
              const IconComponent = config.icon;
              const isSelected = selectedMeal === meal;
              return (
                <TouchableOpacity
                  key={meal}
                  style={[
                    styles.mealOption,
                    isSelected && { backgroundColor: config.color, borderColor: config.color }
                  ]}
                  onPress={() => setSelectedMeal(meal)}
                >
                  <IconComponent
                    size={18}
                    color={isSelected ? '#fff' : config.color}
                  />
                  <Text style={[
                    styles.mealOptionText,
                    isSelected && { color: '#fff' }
                  ]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <SafeAreaView style={styles.previewActions} edges={['bottom']}>
          <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
            <Text style={styles.retakeButtonText}>撮り直す</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={confirmPhoto}>
            <Check size={24} color="#FFFFFF" />
            <Text style={styles.confirmButtonText}>記録する</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.time}>{getCurrentTime()}</Text>
          <Text style={styles.headerTitle}>食事を記録</Text>
        </View>
      </SafeAreaView>

      <View style={styles.cameraPlaceholder}>
        <View style={styles.placeholderContent}>
          <CameraIcon size={64} color={Colors.textMuted} />
          <Text style={styles.placeholderText}>食事の写真を撮影</Text>
          <Text style={styles.placeholderHint}>
            記録すると血糖値との関連を分析できます
          </Text>
        </View>
      </View>

      <SafeAreaView style={styles.controls} edges={['bottom']}>
        <View style={styles.controlsInner}>
          {/* Two buttons side by side */}
          <View style={styles.buttonRow}>
            {/* Take Photo Button */}
            <TouchableOpacity style={styles.shutterButton} onPress={takePhoto}>
              <View style={styles.shutterInner}>
                <CameraIcon size={28} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Pick from Library Button */}
            <TouchableOpacity style={styles.libraryButton} onPress={pickFromLibrary}>
              <View style={styles.libraryInner}>
                <ImageIcon size={28} color={Colors.green} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonLabels}>
            <Text style={styles.buttonLabel}>カメラで撮影</Text>
            <Text style={styles.buttonLabel}>ライブラリから</Text>
          </View>
        </View>
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  time: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    margin: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContent: {
    alignItems: 'center',
    gap: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  placeholderHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  controls: {
    backgroundColor: Colors.background,
    paddingBottom: 20,
  },
  controlsInner: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 10,
  },
  buttonLabels: {
    flexDirection: 'row',
    gap: 20,
  },
  buttonLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    width: 80,
    textAlign: 'center',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  libraryButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.green,
  },
  libraryInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSafeArea: {
    backgroundColor: Colors.background,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  previewContainer: {
    flex: 1,
    margin: 16,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  mealSelectorContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  mealSelectorTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  mealOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  mealOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  mealOptionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  previewActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: Colors.green,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  successContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  xpBadge: {
    position: 'absolute',
    bottom: 200,
    backgroundColor: `${Colors.gold}20`,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  xpText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
});
