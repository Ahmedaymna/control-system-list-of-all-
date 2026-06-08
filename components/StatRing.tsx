import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface StatRingProps {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  color: string;
  size?: number;
}

export function StatRing({ value, max = 100, label, unit = "%", color, size = 80 }: StatRingProps) {
  const colors = useColors();
  const animVal = useRef(new Animated.Value(0)).current;
  const strokeWidth = 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const percent = Math.min(1, value / max);

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: percent,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  // strokeDashoffset is calculated directly from percent (SVG doesn't support Animated values)
  const strokeDashoffset = circumference * (1 - percent);

  const displayValue = max === 100 ? Math.round(value) : value >= 1024 ? `${(value / 1024).toFixed(1)}G` : `${Math.round(value)}M`;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`grad-${label.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={color} stopOpacity="1" />
              <Stop offset="100%" stopColor={color + "80"} stopOpacity="0.5" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={cx} cy={cy} r={radius}
            stroke={color + "20"}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </Svg>
        <Animated.View style={StyleSheet.absoluteFill}>
          <Svg width={size} height={size}>
            <Circle
              cx={cx} cy={cy} r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={circumference * (1 - percent)}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          </Svg>
        </Animated.View>
        <View style={[styles.center, { width: size, height: size }]}>
          <Text style={[styles.value, { color }]}>{displayValue}</Text>
          {unit && <Text style={[styles.unit, { color: colors.mutedForeground }]}>{unit}</Text>}
        </View>
      </View>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 6 },
  center: { position: "absolute", alignItems: "center", justifyContent: "center" },
  value: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  unit: { fontSize: 9, fontFamily: "Inter_400Regular" },
  label: { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 0.8, textTransform: "uppercase" },
});
