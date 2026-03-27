import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus, Heart } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface CurrentGlucoseCardProps {
  value: number;
  trend: 'rising' | 'falling' | 'stable';
  updatedAt: string;
  heartRate?: number;
  hasAppleWatch?: boolean;
}

export default function CurrentGlucoseCard({ 
  value, 
  trend, 
  updatedAt, 
  heartRate,
  hasAppleWatch 
}: CurrentGlucoseCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'rising':
        return <TrendingUp size={28} color={Colors.orange} />;
      case 'falling':
        return <TrendingDown size={28} color={Colors.blue} />;
      default:
        return <Minus size={28} color={Colors.green} />;
    }
  };

  const getStatusColor = () => {
    if (value < 70) return Colors.blue;
    if (value > 180) return Colors.orange;
    return Colors.green;
  };

  const getStatusText = () => {
    if (value < 70) return '低め';
    if (value > 180) return '高め';
    if (value > 140) return 'やや高め';
    return '良好';
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <View style={styles.glucoseSection}>
          <View style={styles.valueRow}>
            <Text style={[styles.glucoseValue, { color: getStatusColor() }]}>
              {value}
            </Text>
            <View style={styles.trendContainer}>
              {getTrendIcon()}
            </View>
          </View>
          <Text style={styles.unit}>mg/dL</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        <View style={styles.metaSection}>
          <Text style={styles.updatedText}>最終更新 {updatedAt}</Text>
          {hasAppleWatch && heartRate && (
            <View style={styles.heartRateRow}>
              <Heart size={14} color={Colors.purple} fill={Colors.purple} />
              <Text style={styles.heartRateText}>{heartRate} bpm</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
  },
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  glucoseSection: {
    gap: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  glucoseValue: {
    fontSize: 64,
    fontWeight: '700' as const,
    lineHeight: 70,
  },
  trendContainer: {
    marginBottom: 12,
  },
  unit: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: -4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  metaSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  updatedText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  heartRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.purple}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heartRateText: {
    fontSize: 12,
    color: Colors.purple,
    fontWeight: '500' as const,
  },
});
