import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Polyline, Defs, LinearGradient, Stop, Polygon } from "react-native-svg";

interface MiniChartProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  filled?: boolean;
}

export function MiniChart({ data, color, width = 200, height = 50, filled = true }: MiniChartProps) {
  if (!data || data.length < 2) return <View style={{ width, height }} />;

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padH = 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - padH * 2) + padH;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const polyPoints = points.join(" ");
  const fillPoints = `${padH},${height} ${polyPoints} ${width - padH},${height}`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {filled && (
          <Polygon
            points={fillPoints}
            fill={`url(#fill-${color.replace('#', '')})`}
          />
        )}
        <Polyline
          points={polyPoints}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({});
