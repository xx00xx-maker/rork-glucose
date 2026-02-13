
import React, { useState, useEffect } from 'react';
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
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchHealthKitData } from '../../services/report/healthkit';
import { prepareDataForUpload } from '../../services/report/aggregator';
import { generateReport } from '../../services/report/api';
import { GeneratedReport } from '../../services/report/types';
import { getDB } from '../../services/report/localdb';

const { width, height } = Dimensions.get('window');

type PeriodType = '1day' | '7days' | '30days' | 'custom';

const PERIOD_CONFIG: Record<PeriodType, { label: string; days: number; type: 'daily' | 'weekly' | 'monthly' | 'custom' }> = {
    '1day': { label: '1日', days: 1, type: 'daily' },
    '7days': { label: '1週間', days: 7, type: 'weekly' },
    '30days': { label: '1ヶ月', days: 30, type: 'monthly' },
    'custom': { label: '指定', days: 0, type: 'custom' }
};

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
    const handlePeriodChange = async (period: PeriodType) => {
        setSelectedPeriod(period);

        if (period === 'custom') {
            setShowDatePicker(true);
            setDatePickerMode('start');
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

            const requestPayload = prepareDataForUpload(userId, periodObj, healthData);
            const newReport = await generateReport(requestPayload);

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
        setShowDatePicker(false);
        generateReportForPeriod('custom', customStartDate, customEndDate);
    };

    const handleDateChange = (event: any, date?: Date) => {
        if (date) {
            if (datePickerMode === 'start') {
                setCustomStartDate(date);
                if (Platform.OS === 'android') {
                    setDatePickerMode('end');
                }
            } else {
                setCustomEndDate(date);
                if (Platform.OS === 'android') {
                    handleCustomDateConfirm();
                }
            }
        }
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
        return `${date.getMonth() + 1}/${date.getDate()}`;
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
                            {selectedPeriod === 'custom' ? 'カスタム期間を選択' : `${PERIOD_CONFIG[selectedPeriod].label}のレポートがありません`}
                        </Text>
                        <Text style={styles.emptyDesc}>
                            血糖値データからレポートを作成しましょう。
                        </Text>
                        <TouchableOpacity
                            style={styles.generateButton}
                            onPress={() => selectedPeriod === 'custom' ? setShowDatePicker(true) : handleGenerate()}
                        >
                            <Text style={styles.generateButtonText}>
                                {selectedPeriod === 'custom' ? '期間を選択' : 'レポートを作成'}
                            </Text>
                        </TouchableOpacity>
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
                            <Text style={styles.insightEmoji}>{report.insights.mainInsight.emoji}</Text>
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

                        {/* Weekly Tip */}
                        <View style={styles.tipBox}>
                            <Ionicons name="bulb-outline" size={24} color="#FB8C00" />
                            <Text style={styles.tipText}>{report.insights.weeklyTip}</Text>
                        </View>

                        {/* Encouragement */}
                        <View style={styles.encouragementBox}>
                            <Text style={styles.encouragementText}>🎉 {report.insights.encouragement}</Text>
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

            {/* Custom Date Picker Modal */}
            <Modal visible={showDatePicker} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.datePickerModal}>
                        <Text style={styles.datePickerTitle}>
                            {datePickerMode === 'start' ? '開始日を選択' : '終了日を選択'}
                        </Text>
                        <DateTimePicker
                            value={datePickerMode === 'start' ? customStartDate : customEndDate}
                            mode="date"
                            display="spinner"
                            onChange={handleDateChange}
                            maximumDate={new Date()}
                        />
                        <View style={styles.datePickerButtons}>
                            <TouchableOpacity
                                style={styles.datePickerCancel}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={styles.datePickerCancelText}>キャンセル</Text>
                            </TouchableOpacity>
                            {datePickerMode === 'start' ? (
                                <TouchableOpacity
                                    style={styles.datePickerConfirm}
                                    onPress={() => setDatePickerMode('end')}
                                >
                                    <Text style={styles.datePickerConfirmText}>次へ</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.datePickerConfirm}
                                    onPress={handleCustomDateConfirm}
                                >
                                    <Text style={styles.datePickerConfirmText}>確定</Text>
                                </TouchableOpacity>
                            )}
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
    insightEmoji: {
        fontSize: 32,
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerModal: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: width - 48,
        alignItems: 'center',
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    datePickerButtons: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    datePickerCancel: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: '#E0E0E0',
    },
    datePickerCancelText: {
        color: '#666',
        fontWeight: '600',
    },
    datePickerConfirm: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: '#007AFF',
    },
    datePickerConfirmText: {
        color: '#fff',
        fontWeight: '600',
    },
});
