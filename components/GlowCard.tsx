import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface GlowCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glowColor?: string;
  intensity?: "low" | "medium" | "high";
}

export function GlowCard({ children, style, glowColor, intensity = "medium" }: GlowCardProps) {
  const colors = useColors();
  const glow = glowColor || colors.neonCyan;

  const shadowOpacity = intensity === "low" ? 0.2 : intensity === "medium" ? 0.4 : 0.7;
  const shadowRadius = intensity === "low" ? 6 : intensity === "medium" ? 12 : 20;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: glow + "40",
          shadowColor: glow,
          shadowOpacity,
          shadowRadius,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
  },
});
