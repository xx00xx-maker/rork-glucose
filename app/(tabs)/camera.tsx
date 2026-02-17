import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Alert, FlatList, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera as CameraIcon, X, Check, Clock, Image as ImageIcon } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function getMealTypeFromHour(hour: number): MealType {
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 21) return 'dinner';
  return 'snack';
}

function getMealLabel(type: MealType): string {
  const labels: Record<MealType, string> = {
    breakfast: '朝食',
    lunch: '昼食',
    dinner: '夕食',
    snack: '間食',
  };
  return labels[type];
}

// FlatList-based scroll picker - reliable and smooth
function WheelPicker({
  data,
  selectedIndex,
  onSelect,
  formatItem,
}: {
  data: number[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  formatItem: (item: number) => string;
}) {
  const flatListRef = useRef<FlatList>(null);
  const isScrollingProgrammatically = useRef(false);
  const hasInitialized = useRef(false);

  // Scroll to initial position once
  useEffect(() => {
    if (!hasInitialized.current && flatListRef.current) {
      hasInitialized.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 150);
    }
  }, []);

  const handleMomentumScrollEnd = useCallback((event: any) => {
    if (isScrollingProgrammatically.current) {
      isScrollingProgrammatically.current = false;
      return;
    }
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, data.length - 1));
    if (clamped !== selectedIndex) {
      onSelect(clamped);
    }
  }, [selectedIndex, onSelect, data.length]);

  const paddingItems = Math.floor(VISIBLE_ITEMS / 2);

  const renderItem = useCallback(({ item, index }: { item: number; index: number }) => {
    const isSelected = index === selectedIndex;
    return (
      <View style={wheelStyles.item}>
        <Text style={[wheelStyles.itemText, isSelected && wheelStyles.itemTextSelected]}>
          {formatItem(item)}
        </Text>
      </View>
    );
  }, [selectedIndex, formatItem]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  return (
    <View style={wheelStyles.container}>
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={(_, i) => i.toString()}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{
          paddingTop: paddingItems * ITEM_HEIGHT,
          paddingBottom: paddingItems * ITEM_HEIGHT,
        }}
        initialScrollIndex={selectedIndex}
        windowSize={7}
      />
      {/* Selection highlight overlay */}
      <View style={wheelStyles.highlight} pointerEvents="none" />
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  container: {
    height: PICKER_HEIGHT,
    width: 75,
    overflow: 'hidden',
    position: 'relative',
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 20,
    fontWeight: '400' as const,
    color: Colors.textMuted,
  },
  itemTextSelected: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.green,
    backgroundColor: `${Colors.green}08`,
    borderRadius: 4,
  },
});

// Pre-generate data arrays
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => i * 5);

export default function CameraScreen() {
  const { addXp, completeChallenge, addTimelineEntry } = useApp();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedHourIndex, setSelectedHourIndex] = useState(0);
  const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(0);
  const successAnim = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const now = new Date();
    setSelectedHourIndex(now.getHours());
    const closestMin = Math.round(now.getMinutes() / 5) % 12;
    setSelectedMinuteIndex(closestMin);
  }, []);

  const selectedHour = HOURS[selectedHourIndex];
  const selectedMinute = MINUTES_5[selectedMinuteIndex];
  const mealType = getMealTypeFromHour(selectedHour);
  const mealLabel = getMealLabel(mealType);
  const timeString = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('カメラの許可が必要です', '設定からカメラへのアクセスを許可してください', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setCapturedImage(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setCapturedImage(result.assets[0].uri);
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      addTimelineEntry({ photo: capturedImage, mealType });
    }
    setShowSuccess(true);
    Animated.sequence([
      Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(200),
      Animated.timing(xpAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      addXp(10);
      setCapturedImage(null);
      setShowSuccess(false);
      successAnim.setValue(0);
      xpAnim.setValue(0);
    }, 2000);
  };

  const retakePhoto = () => setCapturedImage(null);

  if (showSuccess) {
    return (
      <View style={styles.successContainer}>
        <Animated.View
          style={[styles.successContent, {
            transform: [{ scale: successAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.1, 1] }) }],
            opacity: successAnim,
          }]}
        >
          <View style={styles.successIcon}>
            <Check size={48} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text style={styles.successTitle}>記録完了</Text>
          <Text style={styles.successSubtitle}>{timeString} の{mealLabel}を記録しました</Text>
        </Animated.View>
        <Animated.View
          style={[styles.xpBadge, {
            transform: [{ translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            opacity: xpAnim,
          }]}
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

        {/* Time Picker */}
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerHeader}>
            <Clock size={16} color={Colors.green} strokeWidth={2} />
            <Text style={styles.timePickerTitle}>食事の時刻を選択</Text>
          </View>

          <View style={styles.timePickerRow}>
            <WheelPicker
              data={HOURS}
              selectedIndex={selectedHourIndex}
              onSelect={setSelectedHourIndex}
              formatItem={(v) => v.toString().padStart(2, '0')}
            />
            <Text style={styles.timeSeparator}>:</Text>
            <WheelPicker
              data={MINUTES_5}
              selectedIndex={selectedMinuteIndex}
              onSelect={setSelectedMinuteIndex}
              formatItem={(v) => v.toString().padStart(2, '0')}
            />
          </View>

          <View style={styles.mealTypeBadge}>
            <Text style={styles.mealTypeBadgeText}>{mealLabel}（{timeString}）</Text>
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
          <Text style={styles.placeholderHint}>記録すると血糖値との関連を分析できます</Text>
        </View>
      </View>

      <SafeAreaView style={styles.controls} edges={['bottom']}>
        <View style={styles.controlsInner}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.shutterButton} onPress={takePhoto}>
              <View style={styles.shutterInner}>
                <CameraIcon size={28} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  time: { fontSize: 14, color: Colors.textMuted, marginBottom: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  cameraPlaceholder: {
    flex: 1, backgroundColor: Colors.cardBackground, margin: 16,
    borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },
  placeholderContent: { alignItems: 'center', gap: 16 },
  placeholderText: { fontSize: 16, color: Colors.textSecondary, marginTop: 8 },
  placeholderHint: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  controls: { backgroundColor: Colors.background, paddingBottom: 20 },
  controlsInner: { alignItems: 'center', paddingVertical: 16 },
  buttonRow: { flexDirection: 'row', gap: 40, marginBottom: 10 },
  buttonLabels: { flexDirection: 'row', gap: 20 },
  buttonLabel: { fontSize: 12, color: Colors.textMuted, width: 80, textAlign: 'center' },
  shutterButton: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.green,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  shutterInner: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.green,
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
  },
  libraryButton: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.cardBackground,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.green,
  },
  libraryInner: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.cardBackground,
    justifyContent: 'center', alignItems: 'center',
  },
  previewSafeArea: { backgroundColor: Colors.background },
  previewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  closeButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.cardBackground,
    justifyContent: 'center', alignItems: 'center',
  },
  previewTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  previewContainer: { flex: 1, margin: 16, marginBottom: 8, borderRadius: 20, overflow: 'hidden' },
  previewImage: { flex: 1, width: '100%' },
  // Time Picker
  timePickerContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  timePickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8,
  },
  timePickerTitle: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  timePickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.cardBackground, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 16,
  },
  timeSeparator: { fontSize: 28, fontWeight: '700' as const, color: Colors.text, marginHorizontal: 4 },
  mealTypeBadge: {
    alignSelf: 'center', marginTop: 8, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16, backgroundColor: `${Colors.green}15`,
  },
  mealTypeBadgeText: { fontSize: 13, fontWeight: '600' as const, color: Colors.green },
  previewActions: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  retakeButton: {
    flex: 1, backgroundColor: Colors.cardBackground, paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  retakeButtonText: { fontSize: 16, color: Colors.text, fontWeight: '500' as const },
  confirmButton: {
    flex: 2, backgroundColor: Colors.green, paddingVertical: 16, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  confirmButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' as const },
  successContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  successContent: { alignItems: 'center' },
  successIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.green,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  successTitle: { fontSize: 28, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  successSubtitle: { fontSize: 16, color: Colors.textSecondary },
  xpBadge: {
    position: 'absolute', bottom: 200, backgroundColor: `${Colors.gold}20`,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.gold,
  },
  xpText: { fontSize: 18, fontWeight: '700' as const, color: Colors.gold },
});
