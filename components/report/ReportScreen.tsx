
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { fetchHealthKitData } from '@/app/services/report/healthkit';
import { prepareDataForUpload } from '@/app/services/report/aggregator';
import { generateReport } from '@/app/services/report/api';
import { GeneratedReport } from '@/app/services/report/types';
import * as Crypto from 'expo-crypto';

type PeriodType = '1day' | '7days' | '30days' | 'custom';

const PERIOD_CONFIG = {
    '1day': { label: '1日', days: 1, type: 'daily' as const },
    '7days': { label: '1週間', days: 7, type: 'weekly' as const },
    '30days': { label: '1ヶ月', days: 30, type: 'monthly' as const },
    'custom': { label: '指定', days: 0, type: 'custom' as const },
};

export default function ReportScreen() {
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

            const request = prepareDataForUpload(
                Crypto.randomUUID(),
                {
                    type: period === 'custom' ? 'custom' : PERIOD_CONFIG[period].type,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                },
                rawData
            );

            const generatedReport = await generateReport(request);

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

                            <Text style={styles.dateSeparator}>〜</Text>

                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowEndDatePicker(true)}
                            >
                                <Text style={styles.dateButtonLabel}>終了日</Text>
                                <Text style={styles.dateButtonValue}>{formatDate(customEndDate)}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Date Pickers */}
                        {showStartDatePicker && (
                            <DateTimePicker
                                value={customStartDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onStartDateChange}
                                maximumDate={customEndDate}
                                locale="ja"
                            />
                        )}

                        {showEndDatePicker && (
                            <DateTimePicker
                                value={customEndDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onEndDateChange}
                                minimumDate={customStartDate}
                                maximumDate={new Date()}
                                locale="ja"
                            />
                        )}

                        {Platform.OS === 'ios' && (showStartDatePicker || showEndDatePicker) && (
                            <TouchableOpacity
                                style={styles.dateConfirmButton}
                                onPress={() => {
                                    setShowStartDatePicker(false);
                                    setShowEndDatePicker(false);
                                }}
                            >
                                <Text style={styles.dateConfirmText}>確定</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

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

                        {/* AI Advice Section - No emojis, use icons */}
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
                            {currentReport.insights.mealInsight && (
                                <View style={styles.adviceItem}>
                                    <Ionicons name="restaurant-outline" size={18} color="#2196F3" style={styles.adviceIcon} />
                                    <Text style={styles.adviceText}>{currentReport.insights.mealInsight.description}</Text>
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
    },
    dateConfirmText: {
        color: '#fff',
        fontSize: 16,
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
});
