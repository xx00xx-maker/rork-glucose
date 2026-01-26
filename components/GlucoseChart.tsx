import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import Colors from '@/constants/colors';

interface DataPoint {
  hour: string;
  glucose: number;
  steps: number;
  heartRate?: number;
}

interface GlucoseChartProps {
  data: DataPoint[];
  showHeartRate?: boolean;
  height?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GlucoseChart({ data, showHeartRate = false, height = 200 }: GlucoseChartProps) {
  const chartWidth = SCREEN_WIDTH - 64;
  const chartHeight = height - 40;
  const padding = { top: 20, right: 10, bottom: 30, left: 35 };
  
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const { glucosePath, stepsPath, heartRatePath, points } = useMemo(() => {
    if (data.length === 0) return { glucosePath: '', stepsPath: '', heartRatePath: '', points: [] };

    const glucoseMin = 60;
    const glucoseMax = 200;
    const stepsMax = Math.max(...data.map(d => d.steps), 1500);
    const heartRateMin = 50;
    const heartRateMax = 150;

    const xScale = (index: number) => padding.left + (index / (data.length - 1)) * innerWidth;
    const yScaleGlucose = (value: number) => {
      const normalized = (value - glucoseMin) / (glucoseMax - glucoseMin);
      return padding.top + innerHeight - normalized * innerHeight;
    };
    const yScaleSteps = (value: number) => {
      const normalized = value / stepsMax;
      return padding.top + innerHeight - normalized * innerHeight * 0.3;
    };
    const yScaleHeartRate = (value: number) => {
      const normalized = (value - heartRateMin) / (heartRateMax - heartRateMin);
      return padding.top + innerHeight - normalized * innerHeight;
    };

    const glucosePoints = data.map((d, i) => ({ x: xScale(i), y: yScaleGlucose(d.glucose), value: d.glucose }));
    const stepsPoints = data.map((d, i) => ({ x: xScale(i), y: yScaleSteps(d.steps), value: d.steps }));
    const heartRatePoints = data.map((d, i) => ({ 
      x: xScale(i), 
      y: yScaleHeartRate(d.heartRate || 70), 
      value: d.heartRate || 70 
    }));

    const createSmoothPath = (points: { x: number; y: number }[]) => {
      if (points.length < 2) return '';
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        path += ` Q ${prev.x + (curr.x - prev.x) * 0.5} ${prev.y}, ${cpx} ${(prev.y + curr.y) / 2}`;
        path += ` Q ${cpx + (curr.x - cpx) * 0.5} ${curr.y}, ${curr.x} ${curr.y}`;
      }
      return path;
    };

    const createAreaPath = (points: { x: number; y: number }[]) => {
      if (points.length < 2) return '';
      const linePath = createSmoothPath(points);
      const bottomY = padding.top + innerHeight;
      return `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
    };

    return {
      glucosePath: createSmoothPath(glucosePoints),
      stepsPath: createAreaPath(stepsPoints),
      heartRatePath: showHeartRate ? createSmoothPath(heartRatePoints) : '',
      points: glucosePoints,
    };
  }, [data, innerWidth, innerHeight, padding, showHeartRate]);

  const yLabels = [200, 140, 70];

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="stepsGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.green} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={Colors.green} stopOpacity="0.05" />
          </LinearGradient>
          <LinearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.orange} stopOpacity="1" />
            <Stop offset="100%" stopColor={Colors.orange} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>

        {yLabels.map((label, i) => {
          const y = padding.top + (i / (yLabels.length - 1)) * innerHeight;
          return (
            <React.Fragment key={label}>
              <Line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke={Colors.border}
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity={0.5}
              />
              <SvgText
                x={padding.left - 8}
                y={y + 4}
                fontSize="10"
                fill={Colors.textMuted}
                textAnchor="end"
              >
                {label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {stepsPath && (
          <Path d={stepsPath} fill="url(#stepsGradient)" />
        )}

        {glucosePath && (
          <Path
            d={glucosePath}
            stroke={Colors.orange}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {showHeartRate && heartRatePath && (
          <Path
            d={heartRatePath}
            stroke={Colors.purple}
            strokeWidth="2"
            fill="none"
            strokeDasharray="5,3"
            strokeLinecap="round"
            opacity={0.7}
          />
        )}

        {points.map((point, i) => (
          <Circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={Colors.orange}
            stroke={Colors.cardBackground}
            strokeWidth="2"
          />
        ))}

        {data.filter((_, i) => i % 2 === 0).map((d, i) => (
          <SvgText
            key={d.hour}
            x={padding.left + ((i * 2) / (data.length - 1)) * innerWidth}
            y={chartHeight - 8}
            fontSize="10"
            fill={Colors.textMuted}
            textAnchor="middle"
          >
            {d.hour.split(':')[0]}時
          </SvgText>
        ))}
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.orange }]} />
          <Text style={styles.legendText}>血糖値</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.green, opacity: 0.6 }]} />
          <Text style={styles.legendText}>歩数</Text>
        </View>
        {showHeartRate && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.purple }]} />
            <Text style={styles.legendText}>心拍</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
