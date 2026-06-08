import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

interface HealthOrbProps {
  value: number;
  size?: number;
}

function getHealthColor(value: number) {
  if (value >= 70) return "#00FF88";
  if (value >= 40) return "#FFB800";
  return "#FF2D55";
}

function getHealthLabel(value: number) {
  if (value >= 70) return "OPTIMAL";
  if (value >= 40) return "WARNING";
  return "CRITICAL";
}

export function HealthOrb({ value, size = 120 }: HealthOrbProps) {
  const color = getHealthColor(value);
  const label = getHealthLabel(value);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.orbWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="orbGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color} stopOpacity="0.6" />
              <Stop offset="60%" stopColor={color} stopOpacity="0.15" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="url(#orbGrad)" />
          <Circle
            cx={size / 2} cy={size / 2} r={size / 2 - 4}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeDasharray="8 4"
            opacity={0.7}
          />
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - 12} stroke={color + "40"} strokeWidth={1} fill="none" />
        </Svg>
      </Animated.View>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.value, { color }]}>{Math.round(value)}</Text>
        <Text style={[styles.unit, { color }]}>%</Text>
        <Text style={[styles.label, { color: color + "CC" }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  orbWrapper: { position: "absolute", width: "100%", height: "100%" },
  center: { position: "absolute", alignItems: "center", justifyContent: "center" },
  value: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  unit: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: -4 },
  label: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 },
});
