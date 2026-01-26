import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Rect } from 'react-native-svg';
import { 
  Check, 
  Heart, 
  Activity, 
  Target, 
  Trophy, 
  Flame, 
  TrendingDown,
  Footprints,
  ArrowRight,
  Star,
  Shield,
  Zap,
  BarChart3,
  Clock,
  Award,
  Quote,
  Utensils,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOTAL_STEPS = 8;

const LightColors = {
  background: '#FFFFFF',
  cardBackground: '#F8FAFC',
  cardBackgroundAlt: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  
  primary: '#10B981',
  primaryLight: '#ECFDF5',
  primaryDark: '#059669',
  accent: '#10B981',
  accentLight: '#ECFDF5',
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  gold: '#EAB308',
  goldLight: '#FEFCE8',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
};

const concerns = [
  { id: 1, text: '食後の血糖値スパイクが気になる' },
  { id: 2, text: '運動が血糖値に効いているか分からない' },
  { id: 3, text: '運動を習慣化したいが続かない' },
  { id: 4, text: '薬以外の方法で血糖を安定させたい' },
];

const goals = [
  { id: 1, text: '合併症への不安が減る', icon: Shield },
  { id: 2, text: '好きなものを少し食べられる', icon: Heart },
  { id: 3, text: '薬の量を減らせるかも', icon: TrendingDown },
  { id: 4, text: '家族を安心させられる', icon: Award },
];

const reviews = [
  {
    id: 1,
    text: 'ストリークを途切れさせたくなくて、毎日自然と歩くように。HbA1cが0.5下がった',
    author: 'K.T',
    age: '48歳',
    rating: 5,
  },
  {
    id: 2,
    text: '食後に歩くと血糖値が下がるのが目に見えてわかる。モチベーションが全然違う',
    author: 'M.S',
    age: '52歳',
    rating: 5,
  },
  {
    id: 3,
    text: 'ゲーム感覚で続けられるのが良い。バッジを集めるのが楽しい',
    author: 'Y.N',
    age: '45歳',
    rating: 5,
  },
];

const WelcomeChart = () => {
  const width = SCREEN_WIDTH - 80;
  const height = 140;
  
  return (
    <View style={welcomeChartStyles.container}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={LightColors.primary} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={LightColors.primary} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        
        <Rect
          x={width * 0.5}
          y={20}
          width={width * 0.45}
          height={height - 40}
          fill="url(#greenGradient)"
          rx={8}
        />
        
        <Path
          d={`M 20 ${height - 50} Q ${width * 0.25} ${height - 50}, ${width * 0.35} ${height - 90} Q ${width * 0.45} ${height - 130}, ${width * 0.5} ${height - 80} Q ${width * 0.6} ${height - 30}, ${width * 0.75} ${height - 55} L ${width - 20} ${height - 55}`}
          stroke={LightColors.orange}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        
        <Circle cx={width * 0.35} cy={height - 90} r="6" fill={LightColors.orange} />
        <Circle cx={width * 0.75} cy={height - 55} r="6" fill={LightColors.primary} />
      </Svg>
    </View>
  );
};

const welcomeChartStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 24,
  },
});

export default function OnboardingScreen() {
  const { completeOnboarding } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedConcerns, setSelectedConcerns] = useState<number[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const animateTransition = (nextStep: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      animateTransition(currentStep + 1);
    }
  };

  const handleComplete = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const toggleConcern = (id: number) => {
    setSelectedConcerns(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarWrapper}>
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index <= currentStep && styles.progressDotActive,
              index === currentStep && styles.progressDotCurrent,
            ]}
          />
        ))}
      </View>
      <Text style={styles.progressText}>{currentStep + 1} / {TOTAL_STEPS}</Text>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <View style={styles.heroSection}>
              <Animated.View style={[styles.heroIconWrapper, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.heroIconCircle}>
                  <Activity size={40} color={LightColors.primary} strokeWidth={2} />
                </View>
              </Animated.View>
            </View>
            
            <View style={styles.textSection}>
              <Text style={styles.headline}>
                歩くだけで、{'\n'}血糖値は変わる
              </Text>
              <Text style={styles.subtext}>
                あなたの体は、毎日の歩きに反応しています。{'\n'}
                このアプリは、その「見えない効果」を可視化します。
              </Text>
            </View>

            <WelcomeChart />

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Utensils size={18} color={LightColors.orange} strokeWidth={1.5} />
                </View>
                <Text style={styles.statLabel}>食後</Text>
                <Text style={[styles.statValue, { color: LightColors.primary }]}>-27</Text>
                <Text style={styles.statUnit}>mg/dL</Text>
                <Text style={styles.statDesc}>平均改善</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Footprints size={18} color={LightColors.primary} strokeWidth={1.5} />
                </View>
                <Text style={styles.statLabel}>運動後</Text>
                <Text style={[styles.statValue, { color: LightColors.primary }]}>20%</Text>
                <View style={styles.statArrowContainer}>
                  <TrendingDown size={14} color={LightColors.primary} strokeWidth={2} />
                </View>
                <Text style={styles.statDesc}>スパイク抑制</Text>
              </View>
            </View>

            <View style={styles.bottomSection}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>始める</Text>
                <ArrowRight size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={styles.textSectionTop}>
              <Text style={styles.headlineSmall}>
                こんなお悩み、{'\n'}ありませんか？
              </Text>
            </View>
            
            <View style={styles.optionsList}>
              {concerns.map((concern) => (
                <TouchableOpacity
                  key={concern.id}
                  style={[
                    styles.checkboxOption,
                    selectedConcerns.includes(concern.id) && styles.checkboxOptionSelected,
                  ]}
                  onPress={() => toggleConcern(concern.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selectedConcerns.includes(concern.id) && styles.checkboxChecked,
                    ]}
                  >
                    {selectedConcerns.includes(concern.id) && (
                      <Check size={14} color="#FFF" strokeWidth={3} />
                    )}
                  </View>
                  <Text style={[
                    styles.optionText,
                    selectedConcerns.includes(concern.id) && styles.optionTextSelected
                  ]}>{concern.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.helperText}>
              選択した内容に応じて、最適な提案をします
            </Text>
            
            <View style={styles.bottomSection}>
              <TouchableOpacity
                style={[styles.primaryButton, selectedConcerns.length === 0 && styles.buttonDisabled]}
                onPress={handleNext}
                disabled={selectedConcerns.length === 0}
              >
                <Text style={styles.primaryButtonText}>次へ</Text>
                <ArrowRight size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <View style={styles.textSectionTop}>
              <Text style={styles.headlineSmall}>
                血糖値が安定したら、{'\n'}何が変わりますか？
              </Text>
            </View>
            
            <View style={styles.goalsList}>
              {goals.map((goal) => {
                const IconComponent = goal.icon;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[
                      styles.goalOption,
                      selectedGoal === goal.id && styles.goalOptionSelected,
                    ]}
                    onPress={() => setSelectedGoal(goal.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.goalIconWrapper,
                      selectedGoal === goal.id && styles.goalIconWrapperSelected
                    ]}>
                      <IconComponent 
                        size={22} 
                        color={selectedGoal === goal.id ? LightColors.primary : LightColors.textSecondary} 
                        strokeWidth={1.5}
                      />
                    </View>
                    <Text style={[
                      styles.goalText,
                      selectedGoal === goal.id && styles.goalTextSelected
                    ]}>{goal.text}</Text>
                    <View style={[
                      styles.radioOuter,
                      selectedGoal === goal.id && styles.radioOuterSelected
                    ]}>
                      {selectedGoal === goal.id && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={styles.bottomSection}>
              <TouchableOpacity
                style={[styles.primaryButton, !selectedGoal && styles.buttonDisabled]}
                onPress={handleNext}
                disabled={!selectedGoal}
              >
                <Text style={styles.primaryButtonText}>次へ</Text>
                <ArrowRight size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={styles.textSectionTop}>
              <Text style={styles.headlineSmall}>
                ゲーム感覚で{'\n'}続けられる仕組み
              </Text>
              <Text style={styles.subtextSmall}>
                毎日の小さな達成を積み重ねて{'\n'}
                自然と習慣が身につきます
              </Text>
            </View>
            
            <View style={styles.featureCardsVertical}>
              <View style={styles.featureCardLarge}>
                <View style={[styles.featureIconBox, { backgroundColor: LightColors.accentLight }]}>
                  <Target size={28} color={LightColors.accent} strokeWidth={1.5} />
                </View>
                <View style={styles.featureCardContent}>
                  <Text style={styles.featureCardTitleLarge}>デイリーチャレンジ</Text>
                  <Text style={styles.featureCardDescLarge}>毎日3つのミッションをクリアして経験値を獲得</Text>
                </View>
              </View>
              
              <View style={styles.featureCardsRow}>
                <View style={styles.featureCardSmall}>
                  <View style={[styles.featureIconBoxSmall, { backgroundColor: LightColors.orangeLight }]}>
                    <Flame size={24} color={LightColors.orange} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.featureCardTitleSmall}>ストリーク</Text>
                  <Text style={styles.featureCardDescSmall}>連続達成でボーナス</Text>
                </View>
                
                <View style={styles.featureCardSmall}>
                  <View style={[styles.featureIconBoxSmall, { backgroundColor: LightColors.goldLight }]}>
                    <Trophy size={24} color={LightColors.gold} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.featureCardTitleSmall}>バッジ</Text>
                  <Text style={styles.featureCardDescSmall}>達成の証を収集</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.bottomSection}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>次へ</Text>
                <ArrowRight size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <View style={styles.textSectionTop}>
              <Text style={styles.headlineSmall}>
                データを{'\n'}連携しましょう
              </Text>
              <Text style={styles.subtextSmall}>
                Apple Healthから血糖値と歩数を取得します。{'\n'}
                データは端末内のみに保存されます。
              </Text>
            </View>

            <View style={styles.healthConnectCard}>
              <View style={styles.healthConnectIcon}>
                <Heart size={36} color={LightColors.primary} strokeWidth={1.5} />
              </View>
              <Text style={styles.healthConnectTitle}>Apple Health</Text>
              <Text style={styles.healthConnectDesc}>血糖値・歩数・心拍数</Text>
            </View>

            <View style={styles.watchPromoCard}>
              <View style={styles.watchPromoLeft}>
                <Zap size={20} color={LightColors.purple} strokeWidth={1.5} />
              </View>
              <View style={styles.watchPromoContent}>
                <Text style={styles.watchPromoTitle}>Apple Watch連携</Text>
                <Text style={styles.watchPromoDesc}>
                  心拍数データで、ストレスと血糖の関係も分析
                </Text>
              </View>
            </View>
            
            <View style={styles.bottomSection}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>Apple Healthに接続</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipButton} onPress={handleNext}>
                <Text style={styles.skipButtonText}>あとで設定する</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <View style={styles.textSectionTop}>
              <Text style={styles.headlineSmall}>
                あなたのデータを{'\n'}こう分析します
              </Text>
              <Text style={styles.subtextSmall}>
                歩数と血糖値の関係を可視化して{'\n'}
                最適な運動タイミングを発見します
              </Text>
            </View>
            
            <View style={styles.analysisPreviewCard}>
              <View style={styles.analysisPreviewHeader}>
                <BarChart3 size={20} color={LightColors.primary} strokeWidth={1.5} />
                <Text style={styles.analysisPreviewHeaderText}>分析例</Text>
              </View>
              
              <View style={styles.analysisPreviewCompare}>
                <View style={styles.analysisPreviewItem}>
                  <View style={[styles.analysisPreviewIcon, { backgroundColor: LightColors.accentLight }]}>
                    <Footprints size={18} color={LightColors.accent} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.analysisPreviewLabel}>歩いた日の平均</Text>
                  <Text style={[styles.analysisPreviewValue, { color: LightColors.accent }]}>115</Text>
                  <Text style={styles.analysisPreviewUnit}>mg/dL</Text>
                </View>
                <View style={styles.analysisPreviewDivider} />
                <View style={styles.analysisPreviewItem}>
                  <View style={[styles.analysisPreviewIcon, { backgroundColor: LightColors.orangeLight }]}>
                    <Clock size={18} color={LightColors.orange} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.analysisPreviewLabel}>動かなかった日</Text>
                  <Text style={[styles.analysisPreviewValue, { color: LightColors.orange }]}>142</Text>
                  <Text style={styles.analysisPreviewUnit}>mg/dL</Text>
                </View>
              </View>
              
              <View style={styles.analysisInsightBox}>
                <Text style={styles.analysisInsightText}>
                  このように、歩数と血糖値の相関を{'\n'}
                  <Text style={styles.analysisInsightHighlight}>一目で把握</Text>できるようになります
                </Text>
              </View>
            </View>

            <View style={styles.featureListCompact}>
              <View style={styles.featureListItem}>
                <Check size={16} color={LightColors.accent} strokeWidth={2.5} />
                <Text style={styles.featureListText}>食後の血糖値スパイク分析</Text>
              </View>
              <View style={styles.featureListItem}>
                <Check size={16} color={LightColors.accent} strokeWidth={2.5} />
                <Text style={styles.featureListText}>最適な運動タイミングの提案</Text>
              </View>
              <View style={styles.featureListItem}>
                <Check size={16} color={LightColors.accent} strokeWidth={2.5} />
                <Text style={styles.featureListText}>週次・月次のトレンドレポート</Text>
              </View>
            </View>
            
            <View style={styles.bottomSection}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>次へ</Text>
                <ArrowRight size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 6:
        return (
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepContentPadded}>
              <View style={styles.textSectionTop}>
                <Text style={styles.headlineSmall}>
                  多くの方が{'\n'}習慣化に成功しています
                </Text>
              </View>
              
              <View style={styles.reviewsGrid}>
                {reviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewQuoteIcon}>
                      <Quote size={16} color={LightColors.primary} strokeWidth={1.5} />
                    </View>
                    <View style={styles.reviewStars}>
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={12} color="#FBBF24" fill="#FBBF24" />
                      ))}
                    </View>
                    <Text style={styles.reviewText}>{review.text}</Text>
                    <View style={styles.reviewAuthorRow}>
                      <Text style={styles.reviewAuthor}>{review.author}</Text>
                      <Text style={styles.reviewAge}>{review.age}</Text>
                    </View>
                  </View>
                ))}
              </View>
              
              <View style={styles.statsRowCompact}>
                <View style={styles.statItemCompact}>
                  <Text style={styles.statValueLarge}>4.8</Text>
                  <View style={styles.statStars}>
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={10} color="#FBBF24" fill="#FBBF24" />
                    ))}
                  </View>
                  <Text style={styles.statLabelSmall}>平均評価</Text>
                </View>
                <View style={styles.statDividerCompact} />
                <View style={styles.statItemCompact}>
                  <Text style={styles.statValueLarge}>47</Text>
                  <Text style={styles.statSuffix}>日</Text>
                  <Text style={styles.statLabelSmall}>平均継続日数</Text>
                </View>
                <View style={styles.statDividerCompact} />
                <View style={styles.statItemCompact}>
                  <Text style={styles.statValueLarge}>89</Text>
                  <Text style={styles.statSuffix}>%</Text>
                  <Text style={styles.statLabelSmall}>継続率</Text>
                </View>
              </View>
              
              <View style={styles.bottomSectionReview}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                  <Text style={styles.primaryButtonText}>次へ</Text>
                  <ArrowRight size={20} color="#FFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        );

      case 7:
        return (
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepContentPadded}>
              <Text style={styles.paywallHeadline}>
                血糖ガーディアンに{'\n'}なりませんか？
              </Text>
              
              <View style={styles.benefitsCompact}>
                <View style={styles.benefitRow}>
                  <View style={styles.benefitIcon}>
                    <Check size={16} color={LightColors.accent} strokeWidth={3} />
                  </View>
                  <Text style={styles.benefitTextCompact}>運動と血糖の相関を自動分析</Text>
                </View>
                <View style={styles.benefitRow}>
                  <View style={styles.benefitIcon}>
                    <Check size={16} color={LightColors.accent} strokeWidth={3} />
                  </View>
                  <Text style={styles.benefitTextCompact}>デイリーチャレンジで習慣化</Text>
                </View>
                <View style={styles.benefitRow}>
                  <View style={styles.benefitIcon}>
                    <Check size={16} color={LightColors.accent} strokeWidth={3} />
                  </View>
                  <Text style={styles.benefitTextCompact}>週次レポートで長期トレンド把握</Text>
                </View>
              </View>

              <View style={styles.pricingSection}>
                <TouchableOpacity style={styles.pricingCardPrimary} onPress={handleComplete}>
                  <View style={styles.pricingBadge}>
                    <Text style={styles.pricingBadgeText}>33%お得</Text>
                  </View>
                  <Text style={styles.pricingPlanName}>年間プラン</Text>
                  <View style={styles.pricingPriceRow}>
                    <Text style={styles.pricingPrice}>¥7,800</Text>
                    <Text style={styles.pricingPeriod}>/年</Text>
                  </View>
                  <Text style={styles.pricingSubtext}>月額換算 ¥650</Text>
                  <View style={styles.pricingTrialButton}>
                    <Text style={styles.pricingTrialButtonText}>7日間無料で試す</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.pricingCardSecondary} onPress={handleComplete}>
                  <Text style={styles.pricingPlanNameSecondary}>月額プラン</Text>
                  <View style={styles.pricingPriceRowSecondary}>
                    <Text style={styles.pricingPriceSecondary}>¥980</Text>
                    <Text style={styles.pricingPeriodSecondary}>/月</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.pricingDisclaimer}>
                いつでもキャンセル可能{'\n'}
                7日以内にキャンセルすれば課金されません
              </Text>

              <TouchableOpacity style={styles.freeStartButton} onPress={handleComplete}>
                <Text style={styles.freeStartButtonText}>無料版で始める</Text>
              </TouchableOpacity>
              
              <Text style={styles.freeNote}>
                無料版: 過去3日分のデータ、チャレンジ1つ
              </Text>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {renderProgressBar()}
        <Animated.View 
          style={[
            styles.content, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {renderStep()}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightColors.background,
  },
  safeArea: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  progressBarWrapper: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LightColors.border,
  },
  progressDotActive: {
    backgroundColor: LightColors.primary,
  },
  progressDotCurrent: {
    width: 24,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: LightColors.textMuted,
    fontWeight: '500' as const,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContentPadded: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  heroIconWrapper: {
    position: 'relative',
  },
  heroIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: LightColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: LightColors.primary,
  },
  textSection: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  textSectionTop: {
    marginBottom: 28,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: LightColors.text,
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  headlineSmall: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: LightColors.text,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 15,
    color: LightColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
  },
  subtextSmall: {
    fontSize: 15,
    color: LightColors.textSecondary,
    lineHeight: 24,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LightColors.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: LightColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: LightColors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -1,
  },
  statUnit: {
    fontSize: 13,
    color: LightColors.textSecondary,
    marginTop: -2,
  },
  statArrowContainer: {
    marginTop: 2,
  },
  statDesc: {
    fontSize: 12,
    color: LightColors.textMuted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 80,
    backgroundColor: LightColors.border,
    marginHorizontal: 16,
  },
  bottomSection: {
    marginTop: 'auto',
    paddingBottom: 24,
  },
  bottomSectionReview: {
    paddingTop: 24,
    paddingBottom: 24,
  },
  primaryButton: {
    backgroundColor: LightColors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: LightColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  optionsList: {
    gap: 12,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: LightColors.cardBackground,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: LightColors.border,
  },
  checkboxOptionSelected: {
    borderColor: LightColors.primary,
    backgroundColor: LightColors.primaryLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LightColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: LightColors.primary,
    borderColor: LightColors.primary,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: LightColors.text,
    fontWeight: '500' as const,
  },
  optionTextSelected: {
    color: LightColors.primary,
  },
  helperText: {
    fontSize: 13,
    color: LightColors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  goalsList: {
    gap: 12,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: LightColors.cardBackground,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: LightColors.border,
  },
  goalOptionSelected: {
    borderColor: LightColors.primary,
    backgroundColor: LightColors.primaryLight,
  },
  goalIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: LightColors.cardBackgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconWrapperSelected: {
    backgroundColor: '#FFF',
  },
  goalText: {
    flex: 1,
    fontSize: 15,
    color: LightColors.text,
    fontWeight: '500' as const,
  },
  goalTextSelected: {
    color: LightColors.primary,
    fontWeight: '600' as const,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: LightColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: LightColors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: LightColors.primary,
  },
  featureCardsVertical: {
    gap: 16,
    flex: 1,
  },
  featureCardLarge: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: LightColors.border,
  },
  featureIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCardContent: {
    flex: 1,
  },
  featureCardTitleLarge: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: LightColors.text,
    marginBottom: 6,
  },
  featureCardDescLarge: {
    fontSize: 14,
    color: LightColors.textSecondary,
    lineHeight: 20,
  },
  featureCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCardSmall: {
    flex: 1,
    backgroundColor: LightColors.cardBackground,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LightColors.border,
  },
  featureIconBoxSmall: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  featureCardTitleSmall: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: LightColors.text,
    marginBottom: 4,
  },
  featureCardDescSmall: {
    fontSize: 13,
    color: LightColors.textSecondary,
    textAlign: 'center',
  },
  healthConnectCard: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: LightColors.border,
  },
  healthConnectIcon: {
    marginBottom: 20,
  },
  healthConnectTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: LightColors.text,
    marginBottom: 6,
  },
  healthConnectDesc: {
    fontSize: 15,
    color: LightColors.textSecondary,
  },
  watchPromoCard: {
    flexDirection: 'row',
    backgroundColor: LightColors.purpleLight,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    alignItems: 'center',
  },
  watchPromoLeft: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchPromoContent: {
    flex: 1,
  },
  watchPromoTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: LightColors.purple,
    marginBottom: 4,
  },
  watchPromoDesc: {
    fontSize: 13,
    color: LightColors.textSecondary,
    lineHeight: 18,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipButtonText: {
    fontSize: 15,
    color: LightColors.textMuted,
  },
  analysisPreviewCard: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: LightColors.border,
  },
  analysisPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  analysisPreviewHeaderText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: LightColors.text,
  },
  analysisPreviewCompare: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  analysisPreviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  analysisPreviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  analysisPreviewLabel: {
    fontSize: 12,
    color: LightColors.textSecondary,
    marginBottom: 8,
  },
  analysisPreviewValue: {
    fontSize: 40,
    fontWeight: '700' as const,
    letterSpacing: -1,
  },
  analysisPreviewUnit: {
    fontSize: 13,
    color: LightColors.textMuted,
    marginTop: 2,
  },
  analysisPreviewDivider: {
    width: 1,
    height: 80,
    backgroundColor: LightColors.border,
    marginHorizontal: 16,
  },
  analysisInsightBox: {
    backgroundColor: LightColors.primaryLight,
    borderRadius: 14,
    padding: 18,
  },
  analysisInsightText: {
    fontSize: 14,
    color: LightColors.text,
    lineHeight: 22,
    textAlign: 'center',
  },
  analysisInsightHighlight: {
    fontWeight: '700' as const,
    color: LightColors.primary,
  },
  featureListCompact: {
    gap: 14,
  },
  featureListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureListText: {
    fontSize: 15,
    color: LightColors.text,
  },
  reviewsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  reviewCard: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: LightColors.border,
  },
  reviewQuoteIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.3,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 14,
    color: LightColors.text,
    lineHeight: 22,
    marginBottom: 14,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: LightColors.text,
  },
  reviewAge: {
    fontSize: 13,
    color: LightColors.textMuted,
  },
  statsRowCompact: {
    flexDirection: 'row',
    backgroundColor: LightColors.cardBackground,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: LightColors.border,
  },
  statItemCompact: {
    flex: 1,
    alignItems: 'center',
  },
  statDividerCompact: {
    width: 1,
    backgroundColor: LightColors.border,
    marginHorizontal: 8,
  },
  statValueLarge: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: LightColors.text,
  },
  statSuffix: {
    fontSize: 14,
    color: LightColors.textSecondary,
    marginTop: -4,
  },
  statStars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  statLabelSmall: {
    fontSize: 12,
    color: LightColors.textMuted,
    marginTop: 4,
  },
  paywallHeadline: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: LightColors.text,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 28,
    marginTop: 8,
  },
  benefitsCompact: {
    gap: 14,
    marginBottom: 32,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: LightColors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextCompact: {
    fontSize: 15,
    color: LightColors.text,
  },
  pricingSection: {
    gap: 12,
    marginBottom: 20,
  },
  pricingCardPrimary: {
    backgroundColor: LightColors.primary,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  pricingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  pricingBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  pricingPlanName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  pricingPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pricingPrice: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: -1,
  },
  pricingPeriod: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  pricingSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    marginBottom: 24,
  },
  pricingTrialButton: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  pricingTrialButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: LightColors.primary,
  },
  pricingCardSecondary: {
    backgroundColor: LightColors.cardBackground,
    borderRadius: 18,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: LightColors.border,
  },
  pricingPlanNameSecondary: {
    fontSize: 15,
    color: LightColors.text,
    fontWeight: '500' as const,
  },
  pricingPriceRowSecondary: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pricingPriceSecondary: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: LightColors.text,
  },
  pricingPeriodSecondary: {
    fontSize: 14,
    color: LightColors.textSecondary,
  },
  pricingDisclaimer: {
    fontSize: 12,
    color: LightColors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  freeStartButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  freeStartButtonText: {
    fontSize: 15,
    color: LightColors.textSecondary,
    fontWeight: '500' as const,
  },
  freeNote: {
    fontSize: 12,
    color: LightColors.textMuted,
    textAlign: 'center',
  },
});
