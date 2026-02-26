
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchHealthKitData } from '../../services/report/healthkit';
import { prepareAdvancedReport } from '../../services/report/aggregator';
import { generateAdvancedReport } from '../../services/report/api';
import { GeneratedReport } from '../../services/report/types';
import { getDB } from '../../services/report/localdb';
import { getSavedBaseline, getSetupMetadata } from '../../services/report/initialSetup';
import { MealType } from '../../services/report/types';

const { width, height } = Dimensions.get('window');

type PeriodType = '1day' | '7days' | '30days' | 'custom';

const PERIOD_CONFIG: Record<PeriodType, { label: string; days: number; type: 'daily' | 'weekly' | 'monthly' | 'custom' }> = {
    '1day': { label: '1日', days: 1, type: 'daily' },
    '7days': { label: '1週間', days: 7, type: 'weekly' },
    '30days': { label: '1ヶ月', days: 30, type: 'monthly' },
    'custom': { label: '指定', days: 0, type: 'custom' }
};

// Custom wheel picker constants
const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;

function WheelColumn({ data, selectedIndex, onSelect, formatItem, columnWidth }: {
    data: number[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    formatItem: (item: number) => string;
    columnWidth: number;
}) {
    const flatListRef = useRef<FlatList>(null);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (!hasInitialized.current && flatListRef.current) {
            hasInitialized.current = true;
            setTimeout(() => {
                flatListRef.current?.scrollToOffset({
                    offset: selectedIndex * WHEEL_ITEM_HEIGHT,
                    animated: false,
                });
            }, 100);
        }
    }, []);

    const handleMomentumScrollEnd = useCallback((event: any) => {
        const y = event.nativeEvent.contentOffset.y;
        const index = Math.round(y / WHEEL_ITEM_HEIGHT);
        const clamped = Math.max(0, Math.min(index, data.length - 1));
        if (clamped !== selectedIndex) {
            onSelect(clamped);
        }
    }, [selectedIndex, onSelect, data.length]);

    const paddingItems = Math.floor(WHEEL_VISIBLE_ITEMS / 2);

    const renderItem = useCallback(({ item, index }: { item: number; index: number }) => {
        const isSelected = index === selectedIndex;
        return (
            <View style={{ height: WHEEL_ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{
                    fontSize: isSelected ? 20 : 16,
                    fontWeight: isSelected ? '700' : '400',
                    color: isSelected ? '#007AFF' : '#999',
                }}>
                    {formatItem(item)}
                </Text>
            </View>
        );
    }, [selectedIndex, formatItem]);

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: WHEEL_ITEM_HEIGHT,
        offset: WHEEL_ITEM_HEIGHT * index,
        index,
    }), []);

    return (
        <View style={{ height: WHEEL_HEIGHT, width: columnWidth, overflow: 'hidden', position: 'relative' }}>
            <FlatList
                ref={flatListRef}
                data={data}
                renderItem={renderItem}
                keyExtractor={(_, i) => i.toString()}
                getItemLayout={getItemLayout}
                showsVerticalScrollIndicator={false}
                snapToInterval={WHEEL_ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleMomentumScrollEnd}
                contentContainerStyle={{
                    paddingTop: paddingItems * WHEEL_ITEM_HEIGHT,
                    paddingBottom: paddingItems * WHEEL_ITEM_HEIGHT,
                }}
                initialScrollIndex={selectedIndex}
                windowSize={7}
            />
            <View style={{
                position: 'absolute',
                top: WHEEL_ITEM_HEIGHT * Math.floor(WHEEL_VISIBLE_ITEMS / 2),
                left: 0,
                right: 0,
                height: WHEEL_ITEM_HEIGHT,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: '#007AFF',
                backgroundColor: 'rgba(0,122,255,0.06)',
            }} pointerEvents="none" />
        </View>
    );
}

// Generate year/month/day arrays
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 4 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

export default function ReportScreen() {
    const router = useRouter();
    const [reports, setReports] = useState<Record<string, GeneratedReport>>({});
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('7days');
    const [loading, setLoading] = useState(false);

    // Custom date picker state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');

    // Wheel picker state for year/month/day
    const [pickerYear, setPickerYear] = useState(customStartDate.getFullYear());
    const [pickerMonth, setPickerMonth] = useState(customStartDate.getMonth() + 1);
    const [pickerDay, setPickerDay] = useState(customStartDate.getDate());
    const [pickerDays, setPickerDays] = useState<number[]>(
        Array.from({ length: getDaysInMonth(customStartDate.getFullYear(), customStartDate.getMonth() + 1) }, (_, i) => i + 1)
    );

    // Update days array when year/month changes
    useEffect(() => {
        const maxDay = getDaysInMonth(pickerYear, pickerMonth);
        const newDays = Array.from({ length: maxDay }, (_, i) => i + 1);
        setPickerDays(newDays);
        if (pickerDay > maxDay) {
            setPickerDay(maxDay);
        }
    }, [pickerYear, pickerMonth]);

    const currentReport = reports[selectedPeriod] || null;

    useEffect(() => {
        loadLastReport();
    }, []);

    const loadLastReport = async () => {
        try {
            const db = await getDB();
            const result = await db.getAllAsync(
                'SELECT report_json, period_type FROM local_reports ORDER BY generated_at DESC LIMIT 5'
            );
            if (result.length > 0) {
                const loadedReports: Record<string, GeneratedReport> = {};
                for (const row of result as any[]) {
                    const report = JSON.parse(row.report_json);
                    const periodKey = mapPeriodTypeToKey(report.period.type);
                    if (periodKey && !loadedReports[periodKey]) {
                        loadedReports[periodKey] = report;
                    }
                }
                setReports(loadedReports);
            }
        } catch (e) {
            console.log('No previous report or error loading:', e);
        }
    };

    const mapPeriodTypeToKey = (type: string): PeriodType | null => {
        if (type === 'daily') return '1day';
        if (type === 'weekly') return '7days';
        if (type === 'monthly') return '30days';
        if (type === 'custom') return 'custom';
        return null;
    };

    // FIX: Always generate report when switching period tabs
    const openDatePicker = (mode: 'start' | 'end') => {
        setDatePickerMode(mode);
        const date = mode === 'start' ? customStartDate : customEndDate;
        setPickerYear(date.getFullYear());
        setPickerMonth(date.getMonth() + 1);
        setPickerDay(date.getDate());
        setShowDatePicker(true);
    };

    const handlePickerConfirm = () => {
        const selectedDate = new Date(pickerYear, pickerMonth - 1, pickerDay);
        if (datePickerMode === 'start') {
            setCustomStartDate(selectedDate);
            setShowDatePicker(false);
            // 自動的に終了日ピッカーを開く
            setTimeout(() => openDatePicker('end'), 300);
        } else {
            setCustomEndDate(selectedDate);
            setShowDatePicker(false);
        }
    };

    const handlePeriodChange = async (period: PeriodType) => {
        setSelectedPeriod(period);

        if (period === 'custom') {
            // カスタム選択時はまだレポート生成しない（期間選択UIを表示するだけ）
            return;
        }

        // ALWAYS generate a new report for this period
        await generateReportForPeriod(period);
    };

    const generateReportForPeriod = async (period: PeriodType, customStart?: Date, customEnd?: Date) => {
        setLoading(true);
        try {
            const config = PERIOD_CONFIG[period];
            const now = customEnd || new Date();
            const startDate = customStart || new Date(now.getTime() - config.days * 24 * 60 * 60 * 1000);

            const days = period === 'custom'
                ? Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
                : config.days;

            const healthData = await fetchHealthKitData(days);

            const userId = "user_001";
            const periodObj = {
                type: config.type,
                startDate: startDate.toISOString(),
                endDate: now.toISOString()
            };

            // 食事記録をAsyncStorageから取得
            let manualMealRecords: { timestamp: string; mealType: MealType }[] = [];
            try {
                const timelineJson = await AsyncStorage.getItem('timeline_data');
                if (timelineJson) {
                    const timeline = JSON.parse(timelineJson) as any[];
                    manualMealRecords = timeline
                        .filter((t: any) => t.date && t.time && t.mealType)
                        .map((t: any) => ({
                            timestamp: new Date(`${t.date}T${t.time}:00`).toISOString(),
                            mealType: t.mealType,
                        }));
                }
            } catch (e) {
                console.warn('Failed to load timeline:', e);
            }

            // メタデータ・ベースライン取得
            const { firstDataDate, hasInitialImport } = await getSetupMetadata();
            const existingBaseline = await getSavedBaseline();

            // Advanced形式でリクエスト構築
            const requestPayload = prepareAdvancedReport(userId, periodObj, healthData, {
                manualMealRecords,
                existingBaseline,
                firstDataDate,
                hasInitialImport,
            });
            const newReport = await generateAdvancedReport(requestPayload);

            setReports(prev => ({
                ...prev,
                [period]: newReport
            }));

        } catch (e: any) {
            console.error(e);
            Alert.alert("エラー", "レポート生成に失敗しました: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCustomDateConfirm = () => {
        generateReportForPeriod('custom', customStartDate, customEndDate);
    };

    const handleGenerate = async () => {
        await generateReportForPeriod(selectedPeriod,
            selectedPeriod === 'custom' ? customStartDate : undefined,
            selectedPeriod === 'custom' ? customEndDate : undefined
        );
    };

    const handleGoBack = () => {
        router.push('/');
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return ['#4CAF50', '#81C784'] as const;
        if (score >= 60) return ['#FF9800', '#FFB74D'] as const;
        return ['#F44336', '#E57373'] as const;
    };

    const getGradeLabel = (grade: string) => {
        switch (grade) {
            case 'excellent': return '優良';
            case 'good': return '良好';
            case 'fair': return '普通';
            default: return '要改善';
        }
    };

    const formatDate = (date: Date) => {
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    };

    const report = currentReport;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>血糖値レポート</Text>
                        {report && (
                            <Text style={styles.headerSubtitle}>
                                {new Date(report.period.startDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} 〜 {new Date(report.period.endDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity onPress={handleGenerate} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#007AFF" />
                        ) : (
                            <Text style={styles.refreshText}>更新</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Period Tabs */}
                <View style={styles.periodTabs}>
                    {(Object.keys(PERIOD_CONFIG) as PeriodType[]).map((period) => (
                        <TouchableOpacity
                            key={period}
                            style={[
                                styles.periodTab,
                                selectedPeriod === period && styles.periodTabActive
                            ]}
                            onPress={() => handlePeriodChange(period)}
                            disabled={loading}
                        >
                            <Text style={[
                                styles.periodTabText,
                                selectedPeriod === period && styles.periodTabTextActive
                            ]}>
                                {PERIOD_CONFIG[period].label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Custom Period Selector - always shown when 'custom' is selected */}
                {selectedPeriod === 'custom' && (
                    <View style={styles.customPeriodContainer}>
                        <Text style={styles.customPeriodLabel}>期間を選択</Text>
                        <View style={styles.customPeriodRow}>
                            <TouchableOpacity style={styles.customDateButton} onPress={() => openDatePicker('start')}>
                                <Text style={styles.customDateHint}>開始日</Text>
                                <Text style={styles.customDateValue}>{formatDate(customStartDate)}</Text>
                            </TouchableOpacity>
                            <Text style={styles.customDateTilde}>〜</Text>
                            <TouchableOpacity style={styles.customDateButton} onPress={() => openDatePicker('end')}>
                                <Text style={styles.customDateHint}>終了日</Text>
                                <Text style={styles.customDateValue}>{formatDate(customEndDate)}</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.customGenerateBtn}
                            onPress={handleCustomDateConfirm}
                            disabled={loading}
                        >
                            <Text style={styles.customGenerateBtnText}>この期間でレポート作成</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Loading State */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>レポートを生成中...</Text>
                    </View>
                )}

                {/* Empty State */}
                {!report && !loading && (
                    <View style={styles.emptyState}>
                        <Ionicons name="analytics-outline" size={64} color="#CCC" />
                        <Text style={styles.emptyTitle}>
                            {selectedPeriod === 'custom' ? '上の期間を選択してレポートを作成' : `${PERIOD_CONFIG[selectedPeriod].label}のレポートがありません`}
                        </Text>
                        <Text style={styles.emptyDesc}>
                            血糖値データからレポートを作成しましょう。
                        </Text>
                        {selectedPeriod !== 'custom' && (
                            <TouchableOpacity
                                style={styles.generateButton}
                                onPress={handleGenerate}
                            >
                                <Text style={styles.generateButtonText}>レポートを作成</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Report Content */}
                {report && !loading && (
                    <>
                        {/* Score Card */}
                        <View style={styles.scoreCard}>
                            <LinearGradient
                                colors={getScoreColor(report.analysis.glucoseControl.score)}
                                style={styles.scoreGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View>
                                    <Text style={styles.scoreLabel}>血糖コントロール評価</Text>
                                    <Text style={styles.gradeText}>{getGradeLabel(report.analysis.glucoseControl.grade)}</Text>
                                </View>
                                <View style={styles.scoreContainer}>
                                    <Text style={styles.scoreValue}>{report.analysis.glucoseControl.score}</Text>
                                    <Text style={styles.scoreUnit}>点</Text>
                                </View>
                            </LinearGradient>
                            {report.analysis.glucoseControl.mainIssues.length > 0 && (
                                <View style={styles.scoreIssues}>
                                    {report.analysis.glucoseControl.mainIssues.map((issue: string, idx: number) => (
                                        <View key={idx} style={styles.issueTag}>
                                            <Ionicons name="alert-circle-outline" size={14} color="#666" />
                                            <Text style={styles.issueText}>{issue}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Main Insight */}
                        <View style={styles.insightBox}>
                            <View style={styles.insightContent}>
                                <Text style={styles.insightTitle}>{report.insights.mainInsight.title}</Text>
                                <Text style={styles.insightDesc}>{report.insights.mainInsight.description}</Text>
                            </View>
                        </View>

                        {/* Period Info */}
                        <View style={styles.periodInfo}>
                            <Ionicons name="calendar-outline" size={16} color="#666" />
                            <Text style={styles.periodInfoText}>
                                {PERIOD_CONFIG[selectedPeriod].label}間のデータ（{new Date(report.period.startDate).toLocaleDateString('ja-JP')} 〜 {new Date(report.period.endDate).toLocaleDateString('ja-JP')}）
                            </Text>
                        </View>

                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>安定時間</Text>
                                <Text style={styles.statValue}>{Math.round((report.analysis.glucoseControl.timeInRange || 70) * 24 / 100)}</Text>
                                <Text style={styles.statUnit}>時間/日</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>運動効果</Text>
                                <Text style={styles.statValue}>
                                    {report.analysis.exerciseEffect.hasSignificantEffect ? 'あり' : 'なし'}
                                </Text>
                                <Text style={styles.statUnit}></Text>
                            </View>
                        </View>

                        {/* AI Advice Section */}
                        <Text style={styles.sectionTitle}>AIからのアドバイス</Text>

                        <InsightCard
                            data={report.insights.exerciseInsight}
                            icon="walk"
                            color="#4CAF50"
                        />
                        <InsightCard
                            data={report.insights.mealInsight}
                            icon="restaurant"
                            color="#FF9800"
                        />
                        {report.insights.stressInsight && (
                            <InsightCard
                                data={report.insights.stressInsight}
                                icon="pulse"
                                color="#9C27B0"
                            />
                        )}

                        {/* Weekly Detail Sections */}
                        {report.insights.weekly && (
                            <>
                                <Text style={styles.sectionTitle}>週間サマリー</Text>
                                <View style={styles.weeklySummaryBox}>
                                    <Text style={styles.weeklySummaryText}>{report.insights.weekly.weekSummary}</Text>
                                </View>

                                {/* Meal Analysis */}
                                <View style={[styles.card, { borderLeftColor: '#FF9800', borderLeftWidth: 4 }]}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="restaurant" size={20} color="#FF9800" />
                                        <Text style={[styles.cardTitle, { color: '#FF9800' }]}>食事の傾向分析</Text>
                                    </View>
                                    <Text style={styles.cardDesc}>{report.insights.weekly.mealAnalysis.spikeTrends}</Text>
                                    <View style={styles.recBox}>
                                        <Text style={styles.recText}>{report.insights.weekly.mealAnalysis.timeZoneImpact}</Text>
                                    </View>
                                </View>

                                {/* Exercise Analysis */}
                                <View style={[styles.card, { borderLeftColor: '#4CAF50', borderLeftWidth: 4 }]}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="walk" size={20} color="#4CAF50" />
                                        <Text style={[styles.cardTitle, { color: '#4CAF50' }]}>運動効果の分析</Text>
                                    </View>
                                    <Text style={styles.cardDesc}>{report.insights.weekly.exerciseAnalysis.walkingEffect}</Text>
                                    <View style={styles.recBox}>
                                        <Text style={styles.recText}>{report.insights.weekly.exerciseAnalysis.stepsTrend}</Text>
                                    </View>
                                </View>

                                {/* Rhythm Analysis */}
                                <View style={[styles.card, { borderLeftColor: '#3F51B5', borderLeftWidth: 4 }]}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="time" size={20} color="#3F51B5" />
                                        <Text style={[styles.cardTitle, { color: '#3F51B5' }]}>生活リズム分析</Text>
                                    </View>
                                    <View style={styles.rhythmScoreRow}>
                                        <Text style={styles.rhythmScoreLabel}>リズムスコア</Text>
                                        <Text style={styles.rhythmScoreValue}>{report.insights.weekly.rhythmAnalysis.rhythmScore}</Text>
                                        <Text style={styles.rhythmScoreUnit}>/100</Text>
                                    </View>
                                    <Text style={styles.cardDesc}>{report.insights.weekly.rhythmAnalysis.circadianFindings}</Text>
                                </View>

                                {/* Glucose Stability */}
                                <View style={[styles.card, { borderLeftColor: '#00BCD4', borderLeftWidth: 4 }]}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="analytics" size={20} color="#00BCD4" />
                                        <Text style={[styles.cardTitle, { color: '#00BCD4' }]}>血糖安定性</Text>
                                    </View>
                                    <Text style={styles.cardDesc}>{report.insights.weekly.glucoseStability}</Text>
                                </View>

                                {/* Stress Comment */}
                                {report.insights.weekly.stressComment && (
                                    <View style={[styles.card, { borderLeftColor: '#9C27B0', borderLeftWidth: 4 }]}>
                                        <View style={styles.cardHeader}>
                                            <Ionicons name="pulse" size={20} color="#9C27B0" />
                                            <Text style={[styles.cardTitle, { color: '#9C27B0' }]}>ストレスの影響</Text>
                                        </View>
                                        <Text style={styles.cardDesc}>{report.insights.weekly.stressComment}</Text>
                                    </View>
                                )}

                                {/* Discovered Patterns */}
                                {report.insights.weekly.discoveredPatterns && report.insights.weekly.discoveredPatterns.length > 0 && (
                                    <View style={styles.patternBox}>
                                        <Text style={styles.patternTitle}>発見されたパターン</Text>
                                        {report.insights.weekly.discoveredPatterns.map((p: string, idx: number) => (
                                            <View key={idx} style={styles.patternItem}>
                                                <Ionicons name="flash" size={14} color="#FF9800" />
                                                <Text style={styles.patternText}>{p}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Growth Progress */}
                                <View style={styles.growthBox}>
                                    <Text style={styles.growthTitle}>成長の記録</Text>
                                    <Text style={styles.growthText}>{report.insights.weekly.growthProgress}</Text>
                                    {report.insights.weekly.newMilestones && report.insights.weekly.newMilestones.length > 0 && (
                                        <View style={styles.milestoneList}>
                                            {report.insights.weekly.newMilestones.map((m: string, idx: number) => (
                                                <View key={idx} style={styles.milestoneItem}>
                                                    <Ionicons name="trophy" size={16} color="#FF9800" />
                                                    <Text style={styles.milestoneText}>{m}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Weekly Goals */}
                                <View style={styles.goalsBox}>
                                    <Text style={styles.goalsTitle}>来週の目標</Text>
                                    {report.insights.weekly.weeklyGoals.map((goal: string, idx: number) => (
                                        <View key={idx} style={styles.goalItem}>
                                            <View style={styles.goalNumber}>
                                                <Text style={styles.goalNumberText}>{idx + 1}</Text>
                                            </View>
                                            <Text style={styles.goalText}>{goal}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Medical Alert */}
                                {report.insights.weekly.medicalAlert && (
                                    <View style={styles.alertBox}>
                                        <Ionicons name="warning" size={20} color="#D32F2F" />
                                        <Text style={styles.alertText}>{report.insights.weekly.medicalAlert}</Text>
                                    </View>
                                )}
                            </>
                        )}

                        {/* Weekly Tip */}
                        <View style={styles.tipBox}>
                            <Ionicons name="bulb-outline" size={24} color="#FB8C00" />
                            <Text style={styles.tipText}>{report.insights.weeklyTip}</Text>
                        </View>

                        {/* Encouragement */}
                        <View style={styles.encouragementBox}>
                            <Text style={styles.encouragementText}>{report.insights.encouragement}</Text>
                        </View>

                        {/* Back Button */}
                        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                            <Ionicons name="home-outline" size={20} color="#fff" />
                            <Text style={styles.backButtonText}>ホームに戻る</Text>
                        </TouchableOpacity>

                        {/* Bottom Spacer */}
                        <View style={{ height: 60 }} />
                    </>
                )}
            </ScrollView>

            {/* Custom Date Wheel Picker Modal */}
            <Modal visible={showDatePicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.datePickerModal}>
                        <Text style={styles.datePickerTitle}>
                            {datePickerMode === 'start' ? '開始日を選択' : '終了日を選択'}
                        </Text>
                        <View style={styles.wheelRow}>
                            <WheelColumn
                                data={YEARS}
                                selectedIndex={YEARS.indexOf(pickerYear)}
                                onSelect={(i) => setPickerYear(YEARS[i])}
                                formatItem={(v) => `${v}年`}
                                columnWidth={100}
                            />
                            <WheelColumn
                                data={MONTHS}
                                selectedIndex={pickerMonth - 1}
                                onSelect={(i) => setPickerMonth(MONTHS[i])}
                                formatItem={(v) => `${v}月`}
                                columnWidth={80}
                            />
                            <WheelColumn
                                data={pickerDays}
                                selectedIndex={Math.min(pickerDay - 1, pickerDays.length - 1)}
                                onSelect={(i) => setPickerDay(pickerDays[i])}
                                formatItem={(v) => `${v}日`}
                                columnWidth={80}
                            />
                        </View>
                        <View style={styles.datePickerButtons}>
                            <TouchableOpacity
                                style={styles.datePickerCancel}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={styles.datePickerCancelText}>キャンセル</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.datePickerConfirm}
                                onPress={handlePickerConfirm}
                            >
                                <Text style={styles.datePickerConfirmText}>確定</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const InsightCard = ({ data, icon, color }: { data: any; icon: string; color: string }) => (
    <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
        <View style={styles.cardHeader}>
            <Ionicons name={icon as any} size={20} color={color} />
            <Text style={[styles.cardTitle, { color }]}>{data.title}</Text>
        </View>
        <Text style={styles.cardDesc}>{data.description}</Text>
        <View style={styles.recBox}>
            <Text style={styles.recText}>💡 {data.recommendation}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F7',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    refreshText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    periodInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F4FF',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginBottom: 16,
        gap: 8,
    },
    periodInfoText: {
        fontSize: 13,
        color: '#4A4A4A',
        flex: 1,
    },
    periodTabs: {
        flexDirection: 'row',
        backgroundColor: '#E8E8E8',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    periodTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    periodTabActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    periodTabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    periodTabTextActive: {
        color: '#000',
        fontWeight: '600',
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    emptyState: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDesc: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 24,
    },
    generateButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    generateButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    scoreCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    scoreGradient: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scoreLabel: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        marginBottom: 4,
    },
    gradeText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    scoreValue: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
    },
    scoreUnit: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 18,
        marginLeft: 4,
    },
    scoreIssues: {
        padding: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    issueTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F7',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    issueText: {
        fontSize: 12,
        color: '#555',
    },
    insightBox: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        alignItems: 'center',
        gap: 12,
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    insightDesc: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    statUnit: {
        fontSize: 12,
        color: '#666',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    cardDesc: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginBottom: 12,
    },
    recBox: {
        backgroundColor: '#F9F9F9',
        padding: 10,
        borderRadius: 8,
    },
    recText: {
        fontSize: 13,
        color: '#333',
    },
    tipBox: {
        flexDirection: 'row',
        backgroundColor: '#FFF3E0',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        color: '#E65100',
        fontWeight: '500',
    },
    encouragementBox: {
        backgroundColor: '#E8F5E9',
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
    },
    encouragementText: {
        fontSize: 14,
        color: '#2E7D32',
        textAlign: 'center',
        fontWeight: '500',
    },
    backButton: {
        flexDirection: 'row',
        backgroundColor: '#333',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        gap: 8,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    datePickerModal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    wheelRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    datePickerButtons: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
        width: '100%',
    },
    datePickerCancel: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
    },
    datePickerCancelText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 16,
    },
    datePickerConfirm: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#007AFF',
        alignItems: 'center',
    },
    datePickerConfirmText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    customPeriodContainer: {
        backgroundColor: '#F0F4FF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    customPeriodLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 12,
    },
    customPeriodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 16,
    },
    customDateButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#007AFF',
    },
    customDateHint: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    customDateValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#007AFF',
    },
    customDateTilde: {
        fontSize: 18,
        color: '#999',
        fontWeight: '600',
    },
    customGenerateBtn: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    customGenerateBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // Weekly Detail Styles
    weeklySummaryBox: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    weeklySummaryText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 24,
    },
    rhythmScoreRow: {
        flexDirection: 'row' as const,
        alignItems: 'baseline' as const,
        marginBottom: 8,
    },
    rhythmScoreLabel: {
        fontSize: 13,
        color: '#666',
        marginRight: 8,
    },
    rhythmScoreValue: {
        fontSize: 32,
        fontWeight: 'bold' as const,
        color: '#3F51B5',
    },
    rhythmScoreUnit: {
        fontSize: 14,
        color: '#999',
        marginLeft: 2,
    },
    patternBox: {
        backgroundColor: '#FFF8E1',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    patternTitle: {
        fontSize: 15,
        fontWeight: 'bold' as const,
        color: '#E65100',
        marginBottom: 8,
    },
    patternItem: {
        flexDirection: 'row' as const,
        alignItems: 'flex-start' as const,
        gap: 8,
        marginBottom: 6,
    },
    patternText: {
        flex: 1,
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    growthBox: {
        backgroundColor: '#E8F5E9',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    growthTitle: {
        fontSize: 15,
        fontWeight: 'bold' as const,
        color: '#2E7D32',
        marginBottom: 8,
    },
    growthText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 22,
    },
    milestoneList: {
        marginTop: 12,
        gap: 8,
    },
    milestoneItem: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    milestoneText: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: '#2E7D32',
    },
    goalsBox: {
        backgroundColor: '#E3F2FD',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    goalsTitle: {
        fontSize: 15,
        fontWeight: 'bold' as const,
        color: '#1565C0',
        marginBottom: 12,
    },
    goalItem: {
        flexDirection: 'row' as const,
        alignItems: 'flex-start' as const,
        gap: 10,
        marginBottom: 10,
    },
    goalNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1565C0',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
    },
    goalNumberText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold' as const,
    },
    goalText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    alertBox: {
        flexDirection: 'row' as const,
        backgroundColor: '#FFEBEE',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center' as const,
        gap: 12,
        marginBottom: 12,
    },
    alertText: {
        flex: 1,
        fontSize: 14,
        color: '#D32F2F',
        lineHeight: 20,
    },
});
