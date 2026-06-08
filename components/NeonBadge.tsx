import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface NeonBadgeProps {
  label: string;
  color: string;
  size?: "sm" | "md";
}

export function NeonBadge({ label, color, size = "md" }: NeonBadgeProps) {
  const fontSize = size === "sm" ? 9 : 11;
  const paddingH = size === "sm" ? 6 : 8;
  const paddingV = size === "sm" ? 2 : 3;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color + "20",
          borderColor: color + "60",
          shadowColor: color,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
        },
      ]}
    >
      <Text style={[styles.label, { color, fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    alignSelf: "flex-start",
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
