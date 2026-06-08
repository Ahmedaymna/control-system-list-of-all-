import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Line, Defs, LinearGradient, Stop } from "react-native-svg";
import { useSystem } from "@/context/SystemContext";

interface NetworkGlobeProps {
  size?: number;
}

export function NetworkGlobe({ size = 200 }: NetworkGlobeProps) {
  const { connections } = useSystem();

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  const latLines = [-60, -30, 0, 30, 60];
  const lonLines = [-90, -45, 0, 45, 90];

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#00D4FF" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#7B2FFF" stopOpacity="0.1" />
          </LinearGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={r} fill="url(#globeGrad)" stroke="#00D4FF30" strokeWidth={1} />

        {latLines.map((lat, i) => {
          const ry = (Math.cos((lat * Math.PI) / 180) * r) / 3.5;
          const yPos = cy + (lat / 90) * r;
          const rx = Math.sqrt(Math.max(0, r * r - (yPos - cy) * (yPos - cy)));
          return rx > 0 ? (
            <Ellipse
              key={`lat-${i}`}
              cx={cx} cy={yPos}
              rx={rx} ry={Math.max(2, ry)}
              fill="none" stroke="#00D4FF20" strokeWidth={0.8}
            />
          ) : null;
        })}

        {lonLines.map((lon, i) => (
          <Ellipse
            key={`lon-${i}`}
            cx={cx} cy={cy}
            rx={Math.abs(Math.cos((lon * Math.PI) / 180)) * r + 2}
            ry={r}
            fill="none" stroke="#00D4FF15" strokeWidth={0.8}
          />
        ))}

        {connections.slice(0, 5).map((conn, i) => {
          const angle = (i / 5) * Math.PI * 2;
          const startX = cx + Math.cos(angle) * r * 0.3;
          const startY = cy + Math.sin(angle) * r * 0.3;
          const endX = cx + Math.cos(angle + 1.2) * r * 0.8;
          const endY = cy + Math.sin(angle + 1.2) * r * 0.8;
          const color = conn.suspicious ? "#FF2D55" : "#00D4FF";
          return (
            <React.Fragment key={conn.id}>
              <Line x1={startX} y1={startY} x2={endX} y2={endY} stroke={color} strokeWidth={1} strokeOpacity={0.6} />
              <Circle cx={endX} cy={endY} r={3} fill={color} fillOpacity={0.8} />
              <Circle cx={startX} cy={startY} r={2} fill={color} fillOpacity={0.5} />
            </React.Fragment>
          );
        })}

        <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#00D4FF" strokeWidth={1.5} strokeOpacity={0.4} />
        <Circle cx={cx} cy={cy} r={4} fill="#00D4FF" fillOpacity={0.9} />
      </Svg>

      <View style={styles.label}>
        <Text style={{ color: "#00D4FF", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" }}>
          {connections.length} ACTIVE
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: "absolute",
    bottom: 4,
    alignSelf: "center",
  },
});
