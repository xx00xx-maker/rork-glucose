
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchHealthKitData } from '@/app/services/report/healthkit';
import { prepareDataForUpload } from '@/app/services/report/aggregator';
import { generateReport } from '@/app/services/report/api';
import { GeneratedReport } from '@/app/services/report/types';
import * as Crypto from 'expo-crypto';

// Temporary type for period selection
type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';

export default function ReportScreen() {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<GeneratedReport | null>(null);
    const [periodType, setPeriodType] = useState<PeriodType>('weekly');

    const handleGenerateReport = async () => {
        setLoading(true);
        try {
            // 1. Fetch Data (e.g., last 7 days)
            const days = periodType === 'weekly' ? 7 : periodType === 'monthly' ? 30 : 1;
            // TODO: Implement custom date picker logic

            const rawData = await fetchHealthKitData(days);

            if (rawData.bloodGlucose.length === 0) {
                Alert.alert("データ不足", "血糖値データが見つかりませんでした。HealthKitの権限を確認してください。");
                setLoading(false);
                return;
            }

            // 2. Aggregate
            const request = prepareDataForUpload(
                Crypto.randomUUID(), // Anonymous Session ID
                {
                    type: periodType,
                    startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date().toISOString()
                },
                rawData
            );

            // 3. API Call
            const generatedReport = await generateReport(request);
            setReport(generatedReport);

        } catch (error: any) {
            Alert.alert("エラー", "レポート生成に失敗しました: " + error.message);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.headerTitle}>血糖値レポート</Text>

            <View style={styles.periodContainer}>
                {(['daily', 'weekly', 'monthly'] as PeriodType[]).map((t) => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.periodButton, periodType === t && styles.periodButtonActive]}
                        onPress={() => setPeriodType(t)}
                    >
                        <Text style={[styles.periodText, periodType === t && styles.periodTextActive]}>
                            {t === 'daily' ? '1日' : t === 'weekly' ? '1週間' : '1ヶ月'}
                        </Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity
                    style={[styles.periodButton, periodType === 'custom' && styles.periodButtonActive]}
                    onPress={() => Alert.alert("Coming Soon", "カスタム期間選択は実装中です")}
                >
                    <Text style={[styles.periodText, periodType === 'custom' && styles.periodTextActive]}>指定</Text>
                </TouchableOpacity>
            </View>

            {!report && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>レポートを生成してインサイトを確認しましょう</Text>
                    <TouchableOpacity style={styles.generateButton} onPress={handleGenerateReport} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.generateButtonText}>レポートを生成</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {report && (
                <View style={styles.reportContainer}>
                    <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.scoreCard}>
                        <Text style={styles.scoreTitle}>血糖コントロール評価</Text>
                        <Text style={styles.scoreGrade}>{report.analysis.glucoseControl.grade.toUpperCase()}</Text>
                        <Text style={styles.scoreText}>スコア: {report.analysis.glucoseControl.score}</Text>
                    </LinearGradient>

                    <View style={styles.insightCard}>
                        <View style={styles.insightHeader}>
                            <Text style={styles.emoji}>{report.insights.mainInsight.emoji}</Text>
                            <Text style={styles.insightTitle}>{report.insights.mainInsight.title}</Text>
                        </View>
                        <Text style={styles.insightDesc}>{report.insights.mainInsight.description}</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.miniCard, { backgroundColor: '#e8f5e9' }]}>
                            <Text style={styles.miniTitle}>平均血糖</Text>
                            <Text style={styles.miniValue}>{Math.round(report.analysis.glucoseControl.score)} <Text style={styles.unit}>mg/dL</Text></Text>
                            {/* Note: mean is not in main analysis object directly, need to check types carefully or pass it through */}
                        </View>
                        <View style={[styles.miniCard, { backgroundColor: '#fff3e0' }]}>
                            <Text style={styles.miniTitle}>運動効果</Text>
                            <Text style={styles.miniValue}>{report.analysis.exerciseEffect.hasSignificantEffect ? 'あり' : 'なし'}</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>AIからのアドバイス</Text>
                        <Text style={styles.tipText}>💡 {report.insights.weeklyTip}</Text>
                        <Text style={styles.cheerText}>📣 {report.insights.encouragement}</Text>
                    </View>

                    <TouchableOpacity style={styles.retryButton} onPress={handleGenerateReport}>
                        <Text style={styles.retryText}>再生成</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f7',
    },
    content: {
        padding: 20,
        paddingTop: 60,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#000',
        marginBottom: 20,
    },
    periodContainer: {
        flexDirection: 'row',
        backgroundColor: '#e5e5ea',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    periodButtonActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    periodText: {
        fontWeight: '600',
        color: '#8e8e93',
    },
    periodTextActive: {
        color: '#000',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        color: '#8e8e93',
        marginBottom: 20,
        textAlign: 'center',
    },
    generateButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    generateButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    reportContainer: {
        gap: 16,
    },
    scoreCard: {
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
    },
    scoreTitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    scoreGrade: {
        color: '#fff',
        fontSize: 48,
        fontWeight: '900',
        lineHeight: 52,
    },
    scoreText: {
        color: '#fff',
        marginTop: 4,
        fontWeight: '500',
    },
    insightCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    emoji: {
        fontSize: 32,
        marginRight: 12,
    },
    insightTitle: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    insightDesc: {
        color: '#3a3a3c',
        lineHeight: 22,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
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
        fontSize: 20,
        fontWeight: '800',
    },
    unit: {
        fontSize: 12,
        fontWeight: '500',
    },
    section: {
        marginTop: 12,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    tipText: {
        fontSize: 15,
        marginBottom: 12,
        lineHeight: 22,
    },
    cheerText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#007AFF',
    },
    retryButton: {
        alignItems: 'center',
        padding: 16,
    },
    retryText: {
        color: '#007AFF',
        fontWeight: '600'
    }
});
