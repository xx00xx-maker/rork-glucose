
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { fetchHealthKitData } from '@/app/services/report/healthkit';
import { prepareAdvancedReport } from '@/app/services/report/aggregator';
import { generateAdvancedReport } from '@/app/services/report/api';
import { getSavedBaseline, getSetupMetadata } from '@/app/services/report/initialSetup';
import { GeneratedReport } from '@/app/services/report/types';
import { assessDataMaturity } from '@/app/services/report/analyzers/dataMaturity';
import { detectMedicationChange } from '@/app/services/report/analyzers/medicationChangeDetector';
import { useApp } from '@/contexts/AppContext';
import * as Crypto from 'expo-crypto';

type PeriodType = '1day' | '7days' | '30days' | 'custom';

const PERIOD_CONFIG = {
    '1day': { label: '1日', days: 1, type: 'daily' as const },
    '7days': { label: '1週間', days: 7, type: 'weekly' as const },
    '30days': { label: '1ヶ月', days: 30, type: 'monthly' as const },
    'custom': { label: '指定', days: 0, type: 'custom' as const },
};

export default function ReportScreen() {
    const { timelineData } = useApp();
    const [loading, setLoading] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('7days');

    // Cache reports for each period
    const [reports, setReports] = useState<Record<PeriodType, GeneratedReport | null>>({
        '1day': null,
        '7days': null,
        '30days': null,
        'custom': null,
    });

    // Custom period date picker
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [dataMaturityInfo, setDataMaturityInfo] = useState<{ level: string; featuresLocked: { name: string; daysUntilAvailable: number }[] } | null>(null);
    const [medicationAlert, setMedicationAlert] = useState<{ before: number; after: number; days: number } | null>(null);

    const currentReport = reports[selectedPeriod];

    // When period tab changes - just switch view, don't auto-generate
    const handlePeriodChange = (period: PeriodType) => {
        setSelectedPeriod(period);
    };

    // Generate report only when user clicks the button
    const handleGenerateReport = async () => {
        if (selectedPeriod === 'custom') {
            if (customStartDate >= customEndDate) {
                Alert.alert('エラー', '開始日は終了日より前に設定してください');
                return;
            }
        }

        await generateReportForPeriod(selectedPeriod);
    };

    const generateReportForPeriod = async (period: PeriodType) => {
        setLoading(true);
        try {
            let startDate: Date;
            let endDate: Date;
            let days: number;

            if (period === 'custom') {
                startDate = customStartDate;
                endDate = customEndDate;
                days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
            } else {
                const config = PERIOD_CONFIG[period];
                days = config.days;
                endDate = new Date();
                startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
            }

            console.log(`[Report] Generating report for ${period}: ${startDate.toISOString()} to ${endDate.toISOString()}`);

            const rawData = await fetchHealthKitData(days);

            if (rawData.bloodGlucose.length === 0) {
                Alert.alert('データ不足', '血糖値データが見つかりませんでした。');
                setLoading(false);
                return;
            }

            // ベースラインとメタデータを取得
            const existingBaseline = await getSavedBaseline();
            const { firstDataDate, hasInitialImport } = await getSetupMetadata();

            // 食事記録から時間と種類を取り出す
            const manualMealRecords = timelineData
                .filter((t: any) => t.date && t.time && t.mealType)
                .map((t: any) => ({
                    timestamp: new Date(`${t.date}T${t.time}:00`).toISOString(),
                    mealType: t.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
                }));

            const request = prepareAdvancedReport(
                Crypto.randomUUID(),
                {
                    type: period === 'custom' ? 'custom' : PERIOD_CONFIG[period].type,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                },
                rawData,
                {
                    manualMealRecords,
                    existingBaseline,
                    firstDataDate,
                    hasInitialImport,
                }
            );

            const generatedReport = await generateAdvancedReport(request);

            // データ成熟度チェック
            const maturity = assessDataMaturity(firstDataDate, hasInitialImport);
            setDataMaturityInfo({
                level: maturity.level,
                featuresLocked: maturity.featuresLocked,
            });

            // 投薬変更検出（30日レポートまたは週次レポートでのみ）
            if (days >= 7 && rawData.bloodGlucose.length >= 50) {
                try {
                    // 活動サマリーを構築
                    const dailyStepsMap = new Map<string, number>();
                    rawData.steps.forEach((s: any) => {
                        const d = (s.startTime || s.date || '').substring(0, 10);
                        if (d) dailyStepsMap.set(d, (dailyStepsMap.get(d) || 0) + (s.count || s.value || 0));
                    });
                    const dailySteps = Array.from(dailyStepsMap.entries())
                        .map(([date, totalSteps]) => ({ date, totalSteps }))
                        .sort((a, b) => a.date.localeCompare(b.date));

                    const medResult = detectMedicationChange(rawData.bloodGlucose, { dailySteps } as any);
                    if (medResult.userConfirmationNeeded) {
                        setMedicationAlert({
                            before: medResult.glucoseMeanBefore,
                            after: medResult.glucoseMeanAfter,
                            days: medResult.daysOfChange,
                        });
                    }
                } catch (e) {
                    console.warn('[Report] Medication detection failed:', e);
                }
            }

            // Cache the report
            setReports(prev => ({
                ...prev,
                [period]: generatedReport
            }));

        } catch (error: any) {
            Alert.alert('エラー', 'レポート生成に失敗しました: ' + error.message);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReport = () => {
        Alert.alert(
            'レポートを削除',
            `${PERIOD_CONFIG[selectedPeriod].label}のレポートを削除しますか？`,
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '削除',
                    style: 'destructive',
                    onPress: () => {
                        setReports(prev => ({
                            ...prev,
                            [selectedPeriod]: null
                        }));
                    }
                }
            ]
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
        switch (grade?.toLowerCase()) {
            case 'excellent': return '優良';
            case 'good': return '良好';
            case 'fair': return '普通';
            default: return '要改善';
        }
    };

    const formatDate = (date: Date) => {
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    };

    const onStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowStartDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setCustomStartDate(selectedDate);
        }
    };

    const onEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowEndDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setCustomEndDate(selectedDate);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>血糖値レポート</Text>
                </View>

                {/* Period Tabs */}
                <View style={styles.periodTabs}>
                    {(Object.keys(PERIOD_CONFIG) as PeriodType[]).map((period) => (
                        <TouchableOpacity
                            key={period}
                            style={[styles.periodTab, selectedPeriod === period && styles.periodTabActive]}
                            onPress={() => handlePeriodChange(period)}
                            disabled={loading}
                        >
                            <Text style={[styles.periodTabText, selectedPeriod === period && styles.periodTabTextActive]}>
                                {PERIOD_CONFIG[period].label}
                            </Text>
                            {reports[period] && (
                                <View style={styles.reportBadge}>
                                    <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Custom Period Date Selectors */}
                {selectedPeriod === 'custom' && (
                    <View style={styles.customDateContainer}>
                        <Text style={styles.customDateLabel}>期間を選択</Text>

                        <View style={styles.dateRow}>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowStartDatePicker(true)}
                            >
                                <Text style={styles.dateButtonLabel}>開始日</Text>
                                <Text style={styles.dateButtonValue}>{formatDate(customStartDate)}</Text>
                            </TouchableOpacity>

                            <Text style={styles.dateSeparator}>～</Text>

                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowEndDatePicker(true)}
                            >
                                <Text style={styles.dateButtonLabel}>終了日</Text>
                                <Text style={styles.dateButtonValue}>{formatDate(customEndDate)}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Start Date Picker Modal */}
                <Modal
                    visible={showStartDatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowStartDatePicker(false)}
                >
                    <View style={styles.dateModalOverlay}>
                        <View style={styles.dateModalContent}>
                            <Text style={styles.dateModalTitle}>開始日を選択</Text>
                            <DateTimePicker
                                value={customStartDate}
                                mode="date"
                                display="spinner"
                                onChange={onStartDateChange}
                                maximumDate={customEndDate}
                                locale="ja"
                                themeVariant="light"
                                textColor="#000000"
                                style={{ width: '100%', height: 200 }}
                            />
                            <TouchableOpacity
                                style={styles.dateConfirmButton}
                                onPress={() => setShowStartDatePicker(false)}
                            >
                                <Text style={styles.dateConfirmText}>確定</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* End Date Picker Modal */}
                <Modal
                    visible={showEndDatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowEndDatePicker(false)}
                >
                    <View style={styles.dateModalOverlay}>
                        <View style={styles.dateModalContent}>
                            <Text style={styles.dateModalTitle}>終了日を選択</Text>
                            <DateTimePicker
                                value={customEndDate}
                                mode="date"
                                display="spinner"
                                onChange={onEndDateChange}
                                minimumDate={customStartDate}
                                maximumDate={new Date()}
                                locale="ja"
                                themeVariant="light"
                                textColor="#000000"
                                style={{ width: '100%', height: 200 }}
                            />
                            <TouchableOpacity
                                style={styles.dateConfirmButton}
                                onPress={() => setShowEndDatePicker(false)}
                            >
                                <Text style={styles.dateConfirmText}>確定</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Loading State */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>
                            {selectedPeriod === 'custom'
                                ? 'カスタム期間のレポートを生成中...'
                                : `${PERIOD_CONFIG[selectedPeriod].label}のレポートを生成中...`
                            }
                        </Text>
                    </View>
                )}

                {/* Data Maturity Banner */}
                {dataMaturityInfo && dataMaturityInfo.featuresLocked.length > 0 && !loading && (
                    <View style={styles.maturityBanner}>
                        <Ionicons name="time-outline" size={18} color="#FF9800" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.maturityBannerTitle}>
                                {dataMaturityInfo.level === 'learning' ? 'データ収集中...' : 'さらに精度が上がります'}
                            </Text>
                            {dataMaturityInfo.featuresLocked.slice(0, 2).map((f, i) => (
                                <Text key={i} style={styles.maturityBannerText}>
                                    あと{f.daysUntilAvailable}日で「{f.name}」が使えます
                                </Text>
                            ))}
                        </View>
                    </View>
                )}

                {/* Medication Change Alert */}
                {medicationAlert && (
                    <View style={styles.medicationBanner}>
                        <Ionicons name="medical-outline" size={18} color="#F44336" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.medicationBannerTitle}>血糖値の変化を検出しました</Text>
                            <Text style={styles.medicationBannerText}>
                                過去{medicationAlert.days}日間で平均血糖値が {medicationAlert.before} → {medicationAlert.after} mg/dL に変化しています。
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                <TouchableOpacity
                                    style={styles.medicationBtn}
                                    onPress={() => {
                                        Alert.alert('お薬の変更', '新しいお薬でのベースラインを再構築します。数週間のデータがたまったら、新しい基準で分析します。');
                                        setMedicationAlert(null);
                                    }}
                                >
                                    <Text style={styles.medicationBtnText}>はい、薬が変わりました</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.medicationBtn, { backgroundColor: '#f5f5f5' }]}
                                    onPress={() => setMedicationAlert(null)}
                                >
                                    <Text style={[styles.medicationBtnText, { color: '#666' }]}>いいえ</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {/* Empty State - Show Generate Button */}
                {!currentReport && !loading && (
                    <View style={styles.emptyState}>
                        <Ionicons name="analytics-outline" size={64} color="#CCC" />
                        <Text style={styles.emptyTitle}>
                            {selectedPeriod === 'custom'
                                ? `${formatDate(customStartDate)} 〜 ${formatDate(customEndDate)}`
                                : `${PERIOD_CONFIG[selectedPeriod].label}のレポート`
                            }
                        </Text>
                        <Text style={styles.emptyDesc}>
                            ボタンを押してレポートを生成してください
                        </Text>
                        <TouchableOpacity style={styles.generateButton} onPress={handleGenerateReport}>
                            <Ionicons name="sparkles" size={20} color="#fff" />
                            <Text style={styles.generateButtonText}>レポートを生成</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Report Content - NO EMOJIS */}
                {currentReport && !loading && (
                    <>
                        {/* Period Info */}
                        <View style={styles.periodInfo}>
                            <Ionicons name="calendar-outline" size={16} color="#666" />
                            <Text style={styles.periodInfoText}>
                                {new Date(currentReport.period.startDate).toLocaleDateString('ja-JP')} 〜 {new Date(currentReport.period.endDate).toLocaleDateString('ja-JP')}
                            </Text>
                        </View>

                        {/* Score Card */}
                        <LinearGradient
                            colors={getScoreColor(currentReport.analysis.glucoseControl.score)}
                            style={styles.scoreCard}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.scoreTitle}>血糖コントロール評価</Text>
                            <Text style={styles.scoreGrade}>{getGradeLabel(currentReport.analysis.glucoseControl.grade)}</Text>
                            <Text style={styles.scoreText}>スコア: {currentReport.analysis.glucoseControl.score}点</Text>
                        </LinearGradient>

                        {/* Main Insight - No emoji */}
                        <View style={styles.insightCard}>
                            <Text style={styles.insightTitle}>{currentReport.insights.mainInsight.title}</Text>
                            <Text style={styles.insightDesc}>{currentReport.insights.mainInsight.description}</Text>
                        </View>

                        {/* Stats Row */}
                        <View style={styles.statsRow}>
                            <View style={[styles.miniCard, { backgroundColor: '#e8f5e9' }]}>
                                <Text style={styles.miniTitle}>安定時間</Text>
                                <Text style={styles.miniValue}>{Math.round((currentReport.analysis.glucoseControl.timeInRange || 70) * 24 / 100)} 時間/日</Text>
                            </View>
                            <View style={[styles.miniCard, { backgroundColor: '#fff3e0' }]}>
                                <Text style={styles.miniTitle}>運動効果</Text>
                                <Text style={styles.miniValue}>{currentReport.analysis.exerciseEffect.hasSignificantEffect ? 'あり' : 'なし'}</Text>
                            </View>
                        </View>

                        {/* 日次詳細セクション */}
                        {currentReport.insights.daily && (
                            <View style={styles.adviceSection}>
                                <Text style={styles.sectionTitle}>本日の詳細</Text>

                                {currentReport.insights.daily.overallComment && (
                                    <Text style={styles.dailyOverallComment}>{currentReport.insights.daily.overallComment}</Text>
                                )}

                                {/* 食事別スパイク */}
                                {currentReport.insights.daily.mealSpikeSummary && (
                                    <View style={styles.mealSpikeSection}>
                                        <Text style={styles.subSectionTitle}>食事別の結果</Text>
                                        <View style={styles.adviceItem}>
                                            <Ionicons name="sunny-outline" size={16} color="#FF9800" style={styles.adviceIcon} />
                                            <Text style={styles.adviceText}>朝食: {currentReport.insights.daily.mealSpikeSummary.breakfast}</Text>
                                        </View>
                                        <View style={styles.adviceItem}>
                                            <Ionicons name="partly-sunny-outline" size={16} color="#2196F3" style={styles.adviceIcon} />
                                            <Text style={styles.adviceText}>昼食: {currentReport.insights.daily.mealSpikeSummary.lunch}</Text>
                                        </View>
                                        <View style={styles.adviceItem}>
                                            <Ionicons name="moon-outline" size={16} color="#9C27B0" style={styles.adviceIcon} />
                                            <Text style={styles.adviceText}>夕食: {currentReport.insights.daily.mealSpikeSummary.dinner}</Text>
                                        </View>
                                    </View>
                                )}

                                {/* 歩行効果 */}
                                {currentReport.insights.daily.walkingEffectComment && (
                                    <View style={styles.adviceItem}>
                                        <Ionicons name="walk-outline" size={18} color="#4CAF50" style={styles.adviceIcon} />
                                        <Text style={styles.adviceText}>{currentReport.insights.daily.walkingEffectComment}</Text>
                                    </View>
                                )}

                                {/* アクションアイテム */}
                                {currentReport.insights.daily.actionItems && currentReport.insights.daily.actionItems.length > 0 && (
                                    <View style={styles.actionItemsContainer}>
                                        <Text style={styles.subSectionTitle}>明日のアクション</Text>
                                        {currentReport.insights.daily.actionItems.map((item: string, idx: number) => (
                                            <View key={idx} style={styles.actionItem}>
                                                <View style={styles.actionBullet} />
                                                <Text style={styles.actionItemText}>{item}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* 励まし */}
                                {currentReport.insights.daily.encouragement && (
                                    <View style={[styles.adviceItem, { marginTop: 8 }]}>
                                        <Ionicons name="heart-outline" size={18} color="#E91E63" style={styles.adviceIcon} />
                                        <Text style={styles.adviceText}>{currentReport.insights.daily.encouragement}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* 週次詳細セクション */}
                        {currentReport.insights.weekly && (
                            <>
                                {/* 週サマリー */}
                                <View style={styles.adviceSection}>
                                    <Text style={styles.sectionTitle}>今週のまとめ</Text>
                                    <Text style={styles.weeklySummaryText}>{currentReport.insights.weekly.weekSummary}</Text>
                                </View>

                                {/* リズムスコア */}
                                {currentReport.insights.weekly.rhythmAnalysis && (
                                    <View style={styles.rhythmScoreCard}>
                                        <Text style={styles.rhythmScoreLabel}>生活リズムスコア</Text>
                                        <Text style={styles.rhythmScoreValue}>{currentReport.insights.weekly.rhythmAnalysis.rhythmScore}</Text>
                                        <Text style={styles.rhythmScoreMax}>/100</Text>
                                        <Text style={styles.rhythmFindingsText}>{currentReport.insights.weekly.rhythmAnalysis.circadianFindings}</Text>
                                    </View>
                                )}

                                {/* 詳細分析 */}
                                <View style={styles.adviceSection}>
                                    <Text style={styles.sectionTitle}>詳細分析</Text>

                                    {currentReport.insights.weekly.mealAnalysis && (
                                        <View style={styles.weeklyAnalysisItem}>
                                            <Ionicons name="restaurant-outline" size={18} color="#2196F3" style={styles.adviceIcon} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.weeklyAnalysisTitle}>食事の傾向</Text>
                                                <Text style={styles.adviceText}>{currentReport.insights.weekly.mealAnalysis.spikeTrends}</Text>
                                            </View>
                                        </View>
                                    )}

                                    {currentReport.insights.weekly.exerciseAnalysis && (
                                        <View style={styles.weeklyAnalysisItem}>
                                            <Ionicons name="fitness-outline" size={18} color="#4CAF50" style={styles.adviceIcon} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.weeklyAnalysisTitle}>運動の効果</Text>
                                                <Text style={styles.adviceText}>{currentReport.insights.weekly.exerciseAnalysis.walkingEffect}</Text>
                                            </View>
                                        </View>
                                    )}

                                    {currentReport.insights.weekly.glucoseStability && (
                                        <View style={styles.weeklyAnalysisItem}>
                                            <Ionicons name="pulse-outline" size={18} color="#FF9800" style={styles.adviceIcon} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.weeklyAnalysisTitle}>血糖安定性</Text>
                                                <Text style={styles.adviceText}>{currentReport.insights.weekly.glucoseStability}</Text>
                                            </View>
                                        </View>
                                    )}

                                    {currentReport.insights.weekly.stressComment && (
                                        <View style={styles.weeklyAnalysisItem}>
                                            <Ionicons name="cloud-outline" size={18} color="#9C27B0" style={styles.adviceIcon} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.weeklyAnalysisTitle}>ストレスの可能性</Text>
                                                <Text style={styles.adviceText}>{currentReport.insights.weekly.stressComment}</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* マイルストーン */}
                                {currentReport.insights.weekly.newMilestones && currentReport.insights.weekly.newMilestones.length > 0 && (
                                    <View style={styles.milestoneCard}>
                                        <Text style={styles.milestoneTitle}>新しいマイルストーン達成!</Text>
                                        {currentReport.insights.weekly.newMilestones.map((m: string, i: number) => (
                                            <Text key={i} style={styles.milestoneText}>{m}</Text>
                                        ))}
                                    </View>
                                )}

                                {/* 来週の目標 */}
                                {currentReport.insights.weekly.weeklyGoals && currentReport.insights.weekly.weeklyGoals.length > 0 && (
                                    <View style={styles.adviceSection}>
                                        <Text style={styles.sectionTitle}>来週の目標</Text>
                                        {currentReport.insights.weekly.weeklyGoals.map((goal: string, i: number) => (
                                            <View key={i} style={styles.actionItem}>
                                                <View style={styles.goalBullet}>
                                                    <Text style={styles.goalBulletText}>{i + 1}</Text>
                                                </View>
                                                <Text style={styles.actionItemText}>{goal}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* 医師相談推奨 */}
                                {currentReport.insights.weekly.medicalAlert && (
                                    <View style={styles.medicalAlertCard}>
                                        <Ionicons name="medical-outline" size={20} color="#F44336" />
                                        <Text style={styles.medicalAlertText}>{currentReport.insights.weekly.medicalAlert}</Text>
                                    </View>
                                )}
                            </>
                        )}

                        {/* AI Advice Section（日次/週次共通） */}
                        <View style={styles.adviceSection}>
                            <Text style={styles.sectionTitle}>AIからのアドバイス</Text>

                            {currentReport.insights.weeklyTip && (
                                <View style={styles.adviceItem}>
                                    <Ionicons name="bulb-outline" size={18} color="#FF9800" style={styles.adviceIcon} />
                                    <Text style={styles.adviceText}>{currentReport.insights.weeklyTip}</Text>
                                </View>
                            )}
                            {currentReport.insights.exerciseInsight && (
                                <View style={styles.adviceItem}>
                                    <Ionicons name="fitness-outline" size={18} color="#4CAF50" style={styles.adviceIcon} />
                                    <Text style={styles.adviceText}>{currentReport.insights.exerciseInsight.description}</Text>
                                </View>
                            )}
                            {currentReport.insights.exerciseInsight?.recommendation && (
                                <View style={[styles.adviceItem, { marginLeft: 30 }]}>
                                    <Ionicons name="arrow-forward-outline" size={14} color="#4CAF50" style={styles.adviceIcon} />
                                    <Text style={[styles.adviceText, { fontWeight: '600' }]}>{currentReport.insights.exerciseInsight.recommendation}</Text>
                                </View>
                            )}
                            {currentReport.insights.mealInsight && (
                                <View style={styles.adviceItem}>
                                    <Ionicons name="restaurant-outline" size={18} color="#2196F3" style={styles.adviceIcon} />
                                    <Text style={styles.adviceText}>{currentReport.insights.mealInsight.description}</Text>
                                </View>
                            )}
                            {currentReport.insights.mealInsight?.recommendation && (
                                <View style={[styles.adviceItem, { marginLeft: 30 }]}>
                                    <Ionicons name="arrow-forward-outline" size={14} color="#2196F3" style={styles.adviceIcon} />
                                    <Text style={[styles.adviceText, { fontWeight: '600' }]}>{currentReport.insights.mealInsight.recommendation}</Text>
                                </View>
                            )}
                            {currentReport.insights.encouragement && (
                                <View style={styles.adviceItem}>
                                    <Ionicons name="heart-outline" size={18} color="#E91E63" style={styles.adviceIcon} />
                                    <Text style={styles.adviceText}>{currentReport.insights.encouragement}</Text>
                                </View>
                            )}
                        </View>

                        {/* Back Button */}
                        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                            <Ionicons name="home-outline" size={20} color="#007AFF" />
                            <Text style={styles.backButtonText}>ホームに戻る</Text>
                        </TouchableOpacity>

                        {/* Delete Button */}
                        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteReport}>
                            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                            <Text style={styles.deleteButtonText}>このレポートを削除</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* Spacer for scroll */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F7',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000',
    },
    periodTabs: {
        flexDirection: 'row',
        backgroundColor: '#E8E8E8',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    periodTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
        position: 'relative',
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
    reportBadge: {
        position: 'absolute',
        top: 2,
        right: 4,
    },
    customDateContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    customDateLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 12,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateButton: {
        flex: 1,
        backgroundColor: '#F0F4FF',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    dateButtonLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    dateButtonValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
    },
    dateSeparator: {
        fontSize: 16,
        color: '#666',
        marginHorizontal: 12,
    },
    dateConfirmButton: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        paddingVertical: 12,
        marginTop: 16,
        alignItems: 'center',
        marginHorizontal: 16,
    },
    dateConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    dateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    dateModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 32,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    dateModalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
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
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        textAlign: 'center',
    },
    emptyDesc: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
        textAlign: 'center',
    },
    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 25,
        marginTop: 24,
        gap: 8,
    },
    generateButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
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
        fontSize: 14,
        color: '#4A4A4A',
    },
    scoreCard: {
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    scoreTitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    scoreGrade: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '900',
    },
    scoreText: {
        color: '#fff',
        marginTop: 8,
        fontWeight: '500',
    },
    insightCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
    },
    insightTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 10,
        color: '#333',
    },
    insightDesc: {
        color: '#3a3a3c',
        lineHeight: 22,
        fontSize: 15,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    miniCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
    },
    miniTitle: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
        marginBottom: 4,
    },
    miniValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    adviceSection: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
        color: '#333',
    },
    adviceItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    adviceIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    adviceText: {
        flex: 1,
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F4FF',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
        marginBottom: 12,
    },
    backButtonText: {
        color: '#007AFF',
        fontWeight: '600',
        fontSize: 16,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
    },
    deleteButtonText: {
        color: '#FF3B30',
        fontWeight: '500',
        fontSize: 14,
    },
    // ==== 新規追加スタイル ====
    dailyOverallComment: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
        lineHeight: 24,
    },
    mealSpikeSection: {
        marginBottom: 12,
    },
    subSectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#555',
        marginBottom: 10,
    },
    actionItemsContainer: {
        marginTop: 12,
        backgroundColor: '#F0F8FF',
        borderRadius: 12,
        padding: 14,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionBullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
        marginRight: 10,
    },
    actionItemText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    weeklySummaryText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 24,
    },
    rhythmScoreCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
    },
    rhythmScoreLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    rhythmScoreValue: {
        fontSize: 48,
        fontWeight: '900',
        color: '#4CAF50',
    },
    rhythmScoreMax: {
        fontSize: 16,
        color: '#999',
        marginTop: -4,
    },
    rhythmFindingsText: {
        fontSize: 14,
        color: '#555',
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 20,
    },
    weeklyAnalysisItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E0E0E0',
    },
    weeklyAnalysisTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    milestoneCard: {
        backgroundColor: '#FFF8E1',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FFD54F',
    },
    milestoneTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F57F17',
        marginBottom: 12,
    },
    milestoneText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 6,
        lineHeight: 20,
    },
    goalBullet: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    goalBulletText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    medicalAlertCard: {
        backgroundColor: '#FFF5F5',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#FFCDD2',
        gap: 12,
    },
    medicalAlertText: {
        flex: 1,
        fontSize: 14,
        color: '#C62828',
        lineHeight: 20,
    },
    maturityBanner: {
        flexDirection: 'row',
        backgroundColor: '#FFF8E1',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFE082',
        alignItems: 'flex-start',
    },
    maturityBannerTitle: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: '#F57F17',
        marginBottom: 4,
    },
    maturityBannerText: {
        fontSize: 13,
        color: '#795548',
        lineHeight: 18,
    },
    medicationBanner: {
        flexDirection: 'row',
        backgroundColor: '#FFF3F0',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFCDD2',
        alignItems: 'flex-start',
    },
    medicationBannerTitle: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: '#C62828',
        marginBottom: 4,
    },
    medicationBannerText: {
        fontSize: 13,
        color: '#5D4037',
        lineHeight: 18,
    },
    medicationBtn: {
        backgroundColor: '#F44336',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    medicationBtnText: {
        fontSize: 13,
        fontWeight: '600' as const,
        color: '#fff',
    },
});
