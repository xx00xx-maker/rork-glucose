import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
    Home,
    List,
    User,
    BarChart3,
    ChevronRight,
    Star,
    X,
    ArrowRight,
    ArrowLeft,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOTAL_PAGES = 5;

const Colors = {
    background: '#FFFFFF',
    cardBackground: '#F8FAFC',
    border: '#E2E8F0',
    primary: '#10B981',
    primaryLight: '#ECFDF5',
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

export default function UsageGuideScreen() {
    const [currentPage, setCurrentPage] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    const animateTransition = (nextPage: number) => {
        const direction = nextPage > currentPage ? -1 : 1;
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: direction * 30,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setCurrentPage(nextPage);
            slideAnim.setValue(-direction * 30);
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
        if (currentPage < TOTAL_PAGES - 1) {
            animateTransition(currentPage + 1);
        }
    };

    const handlePrev = () => {
        if (currentPage > 0) {
            animateTransition(currentPage - 1);
        }
    };

    const renderPage = () => {
        switch (currentPage) {
            case 0:
                return (
                    <ScrollView style={styles.scrollContent} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.textSection}>
                            <Text style={styles.headline}>
                                4つの機能で{'\n'}血糖管理を習慣に
                            </Text>
                            <Text style={styles.subtext}>
                                このアプリの主要な画面と{'\n'}
                                できることをご紹介します
                            </Text>
                        </View>

                        <View style={styles.overviewList}>
                            <View style={styles.overviewItem}>
                                <View style={[styles.overviewIcon, { backgroundColor: Colors.accentLight }]}>
                                    <Home size={22} color={Colors.accent} strokeWidth={1.5} />
                                </View>
                                <View style={styles.overviewContent}>
                                    <Text style={styles.overviewTitle}>ホーム</Text>
                                    <Text style={styles.overviewDesc}>今日の血糖値・歩数・チャレンジを一目で確認</Text>
                                </View>
                                <ChevronRight size={18} color={Colors.textMuted} />
                            </View>

                            <View style={styles.overviewItem}>
                                <View style={[styles.overviewIcon, { backgroundColor: Colors.orangeLight }]}>
                                    <List size={22} color={Colors.orange} strokeWidth={1.5} />
                                </View>
                                <View style={styles.overviewContent}>
                                    <Text style={styles.overviewTitle}>タイムライン</Text>
                                    <Text style={styles.overviewDesc}>食事と血糖変化を時系列で記録・確認</Text>
                                </View>
                                <ChevronRight size={18} color={Colors.textMuted} />
                            </View>

                            <View style={styles.overviewItem}>
                                <View style={[styles.overviewIcon, { backgroundColor: Colors.purpleLight }]}>
                                    <BarChart3 size={22} color={Colors.purple} strokeWidth={1.5} />
                                </View>
                                <View style={styles.overviewContent}>
                                    <Text style={styles.overviewTitle}>レポート</Text>
                                    <Text style={styles.overviewDesc}>歩いた日と歩かなかった日の血糖比較を分析</Text>
                                </View>
                                <ChevronRight size={18} color={Colors.textMuted} />
                            </View>

                            <View style={styles.overviewItem}>
                                <View style={[styles.overviewIcon, { backgroundColor: Colors.goldLight }]}>
                                    <User size={22} color={Colors.gold} strokeWidth={1.5} />
                                </View>
                                <View style={styles.overviewContent}>
                                    <Text style={styles.overviewTitle}>プロフィール</Text>
                                    <Text style={styles.overviewDesc}>レベル・バッジ・継続記録で成長を実感</Text>
                                </View>
                                <ChevronRight size={18} color={Colors.textMuted} />
                            </View>
                        </View>
                    </ScrollView>
                );

            case 1:
                return (
                    <ScrollView style={styles.scrollContent} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.screenHeader}>
                            <View style={[styles.screenBadge, { backgroundColor: Colors.accentLight }]}>
                                <Home size={16} color={Colors.accent} strokeWidth={1.5} />
                                <Text style={[styles.screenBadgeText, { color: Colors.accent }]}>ホーム画面</Text>
                            </View>
                        </View>

                        <View style={styles.textSection}>
                            <Text style={styles.headline}>
                                毎日の状態が{'\n'}ひと目でわかる
                            </Text>
                        </View>

                        <View style={styles.pointsList}>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.accent }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>リアルタイム血糖値</Text>
                                    <Text style={styles.pointDesc}>現在の血糖値とトレンドをひと目で確認</Text>
                                </View>
                            </View>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.orange }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>デイリーチャレンジ</Text>
                                    <Text style={styles.pointDesc}>毎日3つのミッションで習慣化をサポート</Text>
                                </View>
                            </View>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.gold }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>カスタマイズ可能</Text>
                                    <Text style={styles.pointDesc}>血糖値の目標範囲・歩数目標を自由に設定</Text>
                                </View>
                            </View>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.purple }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>通知リマインド</Text>
                                    <Text style={styles.pointDesc}>食事記録や運動のタイミングをお知らせ</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                );

            case 2:
                return (
                    <ScrollView style={styles.scrollContent} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.screenHeader}>
                            <View style={[styles.screenBadge, { backgroundColor: Colors.orangeLight }]}>
                                <List size={16} color={Colors.orange} strokeWidth={1.5} />
                                <Text style={[styles.screenBadgeText, { color: Colors.orange }]}>タイムライン画面</Text>
                            </View>
                        </View>

                        <View style={styles.textSection}>
                            <Text style={styles.headline}>
                                食事と血糖の{'\n'}関係が見える
                            </Text>
                        </View>

                        <View style={styles.pointsList}>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.orange }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>食事記録</Text>
                                    <Text style={styles.pointDesc}>写真で記録 → 食前食後の血糖値を自動追跡</Text>
                                </View>
                            </View>
                            <View style={styles.highlightCard}>
                                <Star size={18} color={Colors.gold} fill={Colors.gold} />
                                <Text style={styles.highlightText}>
                                    食後に歩いたことで血糖値の急上昇を抑えられた実績が自動でわかる
                                </Text>
                            </View>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.accent }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>時系列表示</Text>
                                    <Text style={styles.pointDesc}>「何を食べたか → どう変わったか」を確認</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                );

            case 3:
                return (
                    <ScrollView style={styles.scrollContent} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.screenHeader}>
                            <View style={[styles.screenBadge, { backgroundColor: Colors.purpleLight }]}>
                                <BarChart3 size={16} color={Colors.purple} strokeWidth={1.5} />
                                <Text style={[styles.screenBadgeText, { color: Colors.purple }]}>レポート画面</Text>
                            </View>
                        </View>

                        <View style={styles.textSection}>
                            <Text style={styles.headline}>
                                週ごとの変化を{'\n'}把握
                            </Text>
                        </View>

                        <View style={styles.pointsList}>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.accent }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>歩行比較分析</Text>
                                    <Text style={styles.pointDesc}>歩いた日 vs 歩かなかった日の血糖比較</Text>
                                </View>
                            </View>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.purple }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>AIアドバイス</Text>
                                    <Text style={styles.pointDesc}>AI分析による食事・運動アドバイス</Text>
                                </View>
                            </View>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.gold }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>長期トレンド</Text>
                                    <Text style={styles.pointDesc}>長期的な改善を実感できるグラフ表示</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                );

            case 4:
                return (
                    <ScrollView style={styles.scrollContent} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.screenHeader}>
                            <View style={[styles.screenBadge, { backgroundColor: Colors.goldLight }]}>
                                <User size={16} color={Colors.gold} strokeWidth={1.5} />
                                <Text style={[styles.screenBadgeText, { color: Colors.gold }]}>プロフィール画面</Text>
                            </View>
                        </View>

                        <View style={styles.textSection}>
                            <Text style={styles.headline}>
                                成長を実感する
                            </Text>
                        </View>

                        <View style={styles.pointsList}>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.accent }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>レベルアップ</Text>
                                    <Text style={styles.pointDesc}>経験値を貯めてレベルアップ、モチベ維持</Text>
                                </View>
                            </View>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.gold }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>バッジコレクション</Text>
                                    <Text style={styles.pointDesc}>達成の証を集めてコンプリートを目指そう</Text>
                                </View>
                            </View>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.orange }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>累計データ</Text>
                                    <Text style={styles.pointDesc}>歩数・食事記録・血糖値抑制・継続日数</Text>
                                </View>
                            </View>
                            <View style={styles.pointItem}>
                                <View style={[styles.pointDot, { backgroundColor: Colors.purple }]} />
                                <View style={styles.pointContent}>
                                    <Text style={styles.pointTitle}>継続記録</Text>
                                    <Text style={styles.pointDesc}>連続達成日数で習慣化を可視化</Text>
                                </View>
                            </View>
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
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>使い方ガイド</Text>
                    <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                        <X size={22} color={Colors.text} strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarWrapper}>
                        {Array.from({ length: TOTAL_PAGES }).map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.progressDot,
                                    index <= currentPage && styles.progressDotActive,
                                    index === currentPage && styles.progressDotCurrent,
                                ]}
                            />
                        ))}
                    </View>
                    <Text style={styles.progressText}>{currentPage + 1} / {TOTAL_PAGES}</Text>
                </View>

                {/* Content */}
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {renderPage()}
                </Animated.View>

                {/* Navigation */}
                <View style={styles.navContainer}>
                    {currentPage > 0 ? (
                        <TouchableOpacity style={styles.navButtonSecondary} onPress={handlePrev}>
                            <ArrowLeft size={20} color={Colors.primary} strokeWidth={2} />
                            <Text style={styles.navButtonSecondaryText}>戻る</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ flex: 1 }} />
                    )}

                    {currentPage < TOTAL_PAGES - 1 ? (
                        <TouchableOpacity style={styles.navButtonPrimary} onPress={handleNext}>
                            <Text style={styles.navButtonPrimaryText}>次へ</Text>
                            <ArrowRight size={20} color="#FFF" strokeWidth={2} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.navButtonPrimary} onPress={() => router.back()}>
                            <Text style={styles.navButtonPrimaryText}>閉じる</Text>
                        </TouchableOpacity>
                    )}
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
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        position: 'relative',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600' as const,
        color: Colors.text,
    },
    closeButton: {
        position: 'absolute',
        right: 24,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.cardBackground,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 10,
    },
    progressBarWrapper: {
        flexDirection: 'row',
        gap: 6,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.border,
    },
    progressDotActive: {
        backgroundColor: Colors.primary,
    },
    progressDotCurrent: {
        width: 24,
        borderRadius: 4,
    },
    progressText: {
        fontSize: 13,
        color: Colors.textMuted,
        fontWeight: '500' as const,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        flex: 1,
    },
    pageContent: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    textSection: {
        marginBottom: 28,
    },
    headline: {
        fontSize: 28,
        fontWeight: '700' as const,
        color: Colors.text,
        lineHeight: 38,
        letterSpacing: -0.5,
    },
    subtext: {
        fontSize: 15,
        color: Colors.textSecondary,
        lineHeight: 24,
        marginTop: 12,
    },
    overviewList: {
        gap: 14,
    },
    overviewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        backgroundColor: Colors.cardBackground,
        borderRadius: 18,
        gap: 14,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    overviewIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overviewContent: {
        flex: 1,
    },
    overviewTitle: {
        fontSize: 16,
        fontWeight: '700' as const,
        color: Colors.text,
        marginBottom: 4,
    },
    overviewDesc: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    screenHeader: {
        marginBottom: 8,
    },
    screenBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    screenBadgeText: {
        fontSize: 13,
        fontWeight: '600' as const,
    },
    pointsList: {
        gap: 16,
    },
    pointItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    pointDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 6,
    },
    pointContent: {
        flex: 1,
    },
    pointTitle: {
        fontSize: 16,
        fontWeight: '700' as const,
        color: Colors.text,
        marginBottom: 4,
    },
    pointDesc: {
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    highlightCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.goldLight,
        borderRadius: 16,
        padding: 18,
        gap: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    highlightText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600' as const,
        color: Colors.text,
        lineHeight: 22,
    },
    navContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 12,
    },
    navButtonPrimary: {
        flex: 1,
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
    },
    navButtonPrimaryText: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: '#FFF',
    },
    navButtonSecondary: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.cardBackground,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    navButtonSecondaryText: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: Colors.primary,
    },
});
