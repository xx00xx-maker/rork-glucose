import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Heart,
  Target,
  Footprints,
  Bell,
  Crown,
  FileText,
  Shield,
  Mail,
  Info,
  ChevronRight,
  Trash2,
  RotateCcw
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { getOfferings, purchasePackage, restorePurchases, checkSubscriptionStatus } from '@/app/utils/revenueCat';

export default function SettingsScreen() {
  const { user, updateUser } = useApp();
  const [foodReminder, setFoodReminder] = useState(true);
  const [challengeNotif, setChallengeNotif] = useState(true);
  const [streakWarning, setStreakWarning] = useState(true);

  const [showGlucoseModal, setShowGlucoseModal] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [tempGlucoseMin, setTempGlucoseMin] = useState(user.targetGlucoseRange.min);
  const [tempGlucoseMax, setTempGlucoseMax] = useState(user.targetGlucoseRange.max);
  const [tempSteps, setTempSteps] = useState(user.targetSteps);

  const handleSaveGlucose = () => {
    updateUser({
      targetGlucoseRange: { min: tempGlucoseMin, max: tempGlucoseMax }
    });
    setShowGlucoseModal(false);
  };

  const handleSaveSteps = () => {
    updateUser({ targetSteps: tempSteps });
    setShowStepsModal(false);
  };

  const handleUpgrade = async () => {
    try {
      const offerings = await getOfferings();
      if (!offerings) {
        Alert.alert('エラー', 'サブスクリプション情報を取得できません。\n\n.envにEXPO_PUBLIC_REVENUECAT_API_KEY_IOSが設定されているか確認してください。設定後はサーバーの再起動が必要です。');
        return;
      }
      const pack = (offerings as any).monthly || (offerings as any).annual;
      if (!pack) {
        Alert.alert('エラー', '利用可能なプランがありません。RevenueCatダッシュボードでOfferingsを設定してください。');
        return;
      }
      await purchasePackage(pack);
      updateUser({ plan: 'premium' });
      Alert.alert('アップグレード完了', 'プレミアムプランにアップグレードしました！');
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('エラー', '購入に失敗しました: ' + (e.message || ''));
      }
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>設定</Text>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>データ連携</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.red}20` }]}>
                  <Heart size={18} color={Colors.red} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Apple Health連携</Text>
                  <Text style={styles.settingValue}>接続済み</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>目標設定</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingItem} onPress={() => {
              setTempGlucoseMin(user.targetGlucoseRange.min);
              setTempGlucoseMax(user.targetGlucoseRange.max);
              setShowGlucoseModal(true);
            }}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.orange}20` }]}>
                  <Target size={18} color={Colors.orange} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>血糖値の目標範囲</Text>
                  <Text style={styles.settingValue}>
                    {user.targetGlucoseRange.min} - {user.targetGlucoseRange.max} mg/dL
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingItem} onPress={() => {
              setTempSteps(user.targetSteps);
              setShowStepsModal(true);
            }}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.green}20` }]}>
                  <Footprints size={18} color={Colors.green} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>1日の目標歩数</Text>
                  <Text style={styles.settingValue}>{user.targetSteps.toLocaleString()} 歩</Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.blue}20` }]}>
                  <Bell size={18} color={Colors.blue} />
                </View>
                <Text style={styles.settingLabel}>食後リマインダー</Text>
              </View>
              <Switch
                value={foodReminder}
                onValueChange={setFoodReminder}
                trackColor={{ false: Colors.border, true: Colors.green }}
                thumbColor={Colors.text}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.gold}20` }]}>
                  <Target size={18} color={Colors.gold} />
                </View>
                <Text style={styles.settingLabel}>デイリーチャレンジ通知</Text>
              </View>
              <Switch
                value={challengeNotif}
                onValueChange={setChallengeNotif}
                trackColor={{ false: Colors.border, true: Colors.green }}
                thumbColor={Colors.text}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.orange}20` }]}>
                  <Bell size={18} color={Colors.orange} />
                </View>
                <Text style={styles.settingLabel}>習慣キープの通知</Text>
              </View>
              <Switch
                value={streakWarning}
                onValueChange={setStreakWarning}
                trackColor={{ false: Colors.border, true: Colors.green }}
                thumbColor={Colors.text}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アカウント</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.gold}20` }]}>
                  <Crown size={18} color={Colors.gold} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>プラン状況</Text>
                  <Text style={[styles.settingValue, { color: Colors.gold }]}>
                    {user.plan === 'premium' ? 'プレミアム' : '無料プラン'}
                  </Text>
                </View>
              </View>
            </View>
            {user.plan !== 'premium' && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
                  <Text style={styles.upgradeButtonText}>プレミアムにアップグレード</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>その他</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.cardBackgroundLight }]}>
                  <FileText size={18} color={Colors.textSecondary} />
                </View>
                <Text style={styles.settingLabel}>免責事項・利用規約</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.cardBackgroundLight }]}>
                  <Shield size={18} color={Colors.textSecondary} />
                </View>
                <Text style={styles.settingLabel}>プライバシーポリシー</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.cardBackgroundLight }]}>
                  <Mail size={18} color={Colors.textSecondary} />
                </View>
                <Text style={styles.settingLabel}>お問い合わせ</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.cardBackgroundLight }]}>
                  <Info size={18} color={Colors.textSecondary} />
                </View>
                <Text style={styles.settingLabel}>バージョン</Text>
              </View>
              <Text style={styles.versionText}>1.0.0</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>開発・テスト</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                Alert.alert(
                  'オンボーディングリセット',
                  'ペイウォール/オンボーディング画面を再度表示します。アプリが再起動されます。',
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    {
                      text: 'リセット', style: 'destructive', onPress: async () => {
                        await AsyncStorage.removeItem('hasCompletedOnboarding');
                        await AsyncStorage.removeItem('userData');
                        // Force reload through Expo Updates or manual restart
                        Alert.alert('完了', 'アプリを完全に終了して再起動してください。');
                      }
                    },
                  ]
                );
              }}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.orange}20` }]}>
                  <RotateCcw size={18} color={Colors.orange} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>ペイウォールテスト</Text>
                  <Text style={styles.settingValue}>オンボーディングをリセット</Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                Alert.alert(
                  'キャッシュクリア',
                  '全てのローカルデータを削除します。',
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    {
                      text: '削除', style: 'destructive', onPress: async () => {
                        await AsyncStorage.clear();
                        Alert.alert('完了', 'キャッシュをクリアしました。アプリを完全に終了して再起動してください。');
                      }
                    },
                  ]
                );
              }}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.red}20` }]}>
                  <Trash2 size={18} color={Colors.red} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>キャッシュクリア</Text>
                  <Text style={styles.settingValue}>全ローカルデータを削除</Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            本アプリは医療機器ではありません。{'\n'}
            診断・治療には医師にご相談ください。
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showGlucoseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGlucoseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>血糖値の目標範囲</Text>
            <Text style={styles.modalSubtitle}>目標範囲内時間（TIR）の計算に使用されます</Text>

            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>下限値</Text>
              <Text style={styles.sliderValue}>{tempGlucoseMin} mg/dL</Text>
              <Slider
                style={styles.slider}
                minimumValue={50}
                maximumValue={100}
                step={5}
                value={tempGlucoseMin}
                onValueChange={setTempGlucoseMin}
                minimumTrackTintColor={Colors.green}
                maximumTrackTintColor={Colors.border}
                thumbTintColor={Colors.green}
              />
            </View>

            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>上限値</Text>
              <Text style={styles.sliderValue}>{tempGlucoseMax} mg/dL</Text>
              <Slider
                style={styles.slider}
                minimumValue={120}
                maximumValue={200}
                step={5}
                value={tempGlucoseMax}
                onValueChange={setTempGlucoseMax}
                minimumTrackTintColor={Colors.orange}
                maximumTrackTintColor={Colors.border}
                thumbTintColor={Colors.orange}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowGlucoseModal(false)}
              >
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveGlucose}
              >
                <Text style={styles.modalSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showStepsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStepsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>1日の目標歩数</Text>
            <Text style={styles.modalSubtitle}>デイリーチャレンジの達成基準に使用されます</Text>

            <View style={styles.stepsDisplayContainer}>
              <Text style={styles.stepsDisplayValue}>{tempSteps.toLocaleString()}</Text>
              <Text style={styles.stepsDisplayUnit}>歩</Text>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={1000}
              maximumValue={20000}
              step={500}
              value={tempSteps}
              onValueChange={setTempSteps}
              minimumTrackTintColor={Colors.green}
              maximumTrackTintColor={Colors.border}
              thumbTintColor={Colors.green}
            />

            <View style={styles.stepsPresets}>
              {[4000, 6000, 8000, 10000].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetButton,
                    tempSteps === preset && styles.presetButtonActive
                  ]}
                  onPress={() => setTempSteps(preset)}
                >
                  <Text style={[
                    styles.presetButtonText,
                    tempSteps === preset && styles.presetButtonTextActive
                  ]}>{(preset / 1000).toFixed(0)}K</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowStepsModal(false)}
              >
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveSteps}
              >
                <Text style={styles.modalSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  backButton: {
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    gap: 2,
  },
  settingLabel: {
    fontSize: 15,
    color: Colors.text,
  },
  settingValue: {
    fontSize: 13,
    color: Colors.green,
  },
  settingValueMuted: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  settingHint: {
    fontSize: 12,
    color: Colors.textMuted,
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: -8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 64,
  },
  upgradeButton: {
    margin: 16,
    marginTop: 8,
    backgroundColor: Colors.gold,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  versionText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  disclaimer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  stepsDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepsDisplayValue: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.green,
  },
  stepsDisplayUnit: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  stepsPresets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 24,
  },
  presetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.cardBackgroundLight,
  },
  presetButtonActive: {
    backgroundColor: Colors.green,
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  presetButtonTextActive: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.cardBackgroundLight,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.green,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
