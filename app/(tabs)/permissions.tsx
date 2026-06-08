import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SoundManager } from "@/utils/SoundManager";

import { useColors } from "@/hooks/useColors";
import { useSystem, PermissionItem } from "@/context/SystemContext";
import { GlowCard } from "@/components/GlowCard";
import { NeonBadge } from "@/components/NeonBadge";

const PERM_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Camera: "camera",
  Microphone: "mic",
  Location: "location",
  Storage: "folder",
  Phone: "call",
};

const PERM_COLORS: Record<string, string> = {
  Camera: "#00D4FF",
  Microphone: "#FF2D55",
  Location: "#00FF88",
  Storage: "#FFB800",
  Phone: "#7B2FFF",
};

function formatTimeAgo(ts: number) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

function PermissionCard({ item }: { item: PermissionItem }) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const permColor = PERM_COLORS[item.permission] || colors.neonCyan;
  const icon = PERM_ICONS[item.permission] || "shield";

  useEffect(() => {
    if (item.active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [item.active]);

  return (
    <GlowCard
      glowColor={item.active ? permColor : colors.border}
      intensity={item.active ? "medium" : "low"}
      style={{ marginHorizontal: 16, marginBottom: 8 }}
    >
      <View style={styles.permRow}>
        <Animated.View
          style={[
            styles.iconBox,
            {
              backgroundColor: permColor + "20",
              borderColor: permColor + "50",
              transform: [{ scale: item.active ? pulseAnim : new Animated.Value(1) }],
            },
          ]}
        >
          <Ionicons name={icon} size={20} color={permColor} />
        </Animated.View>

        <View style={styles.permInfo}>
          <View style={styles.permHeader}>
            <Text style={[styles.appName, { color: colors.foreground }]}>{item.appName}</Text>
            {item.active && (
              <View style={[styles.liveIndicator, { backgroundColor: permColor }]} />
            )}
          </View>
          <Text style={[styles.permName, { color: permColor }]}>{item.permission}</Text>
          <Text style={[styles.lastUsed, { color: colors.secondaryText }]}>
            Last used: {formatTimeAgo(item.lastUsed)}
          </Text>
        </View>

        <View style={styles.permActions}>
          {item.active && <NeonBadge label="ACTIVE" color={permColor} size="sm" />}
          <TouchableOpacity
            style={[styles.revokeBtn, { borderColor: colors.neonRed + "50" }]}
            onPress={() => { SoundManager.swipe(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); if (selectedPerm) revokePermission(selectedPerm.id); setSelectedPerm(null); }}
          >
            <Ionicons name="shield-outline" size={14} color={colors.neonRed} />
          </TouchableOpacity>
        </View>
      </View>
    </GlowCard>
  );
}

export default function PermissionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissions, revokePermission } = useSystem();
  const [selectedPerm, setSelectedPerm] = useState<string | null>(null);

  const filtered = selectedPerm ? permissions.filter(p => p.permission === selectedPerm) : permissions;
  const activeCount = permissions.filter(p => p.active).length;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const permTypes = ["Camera", "Microphone", "Location", "Storage", "Phone"];

  return (
    <View style={[styles.root, { backgroundColor: colors.bgDark }]}>
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        renderItem={({ item }) => <PermissionCard item={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 100 }}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { paddingTop: topPad + 8 }]}>
              <Text style={[styles.title, { color: colors.neonCyan }]}>PERMISSIONS</Text>
              {activeCount > 0 && (
                <View style={[styles.activeBadge, { backgroundColor: colors.neonRed + "20", borderColor: colors.neonRed + "50" }]}>
                  <View style={[styles.liveDot, { backgroundColor: colors.neonRed }]} />
                  <Text style={[styles.activeText, { color: colors.neonRed }]}>{activeCount} in use</Text>
                </View>
              )}
            </View>

            <View style={styles.permFilterRow}>
              <TouchableOpacity
                onPress={() => { SoundManager.swipe(); setSelectedPerm(null); Haptics.selectionAsync(); }}
                style={[styles.permChip, {
                  backgroundColor: !selectedPerm ? colors.neonCyan + "20" : colors.card,
                  borderColor: !selectedPerm ? colors.neonCyan : colors.border,
                }]}
              >
                <Text style={[styles.permChipText, { color: !selectedPerm ? colors.neonCyan : colors.secondaryText }]}>All</Text>
              </TouchableOpacity>
              {permTypes.map(pt => {
                const color = PERM_COLORS[pt] || colors.neonCyan;
                const isActive = selectedPerm === pt;
                return (
                  <TouchableOpacity
                    key={pt}
                    onPress={() => { SoundManager.click(); setSelectedPerm(isActive ? null : pt); Haptics.selectionAsync(); }}
                    style={[styles.permChip, {
                      backgroundColor: isActive ? color + "20" : colors.card,
                      borderColor: isActive ? color : colors.border,
                    }]}
                  >
                    <Ionicons name={PERM_ICONS[pt]} size={12} color={isActive ? color : colors.secondaryText} />
                    <Text style={[styles.permChipText, { color: isActive ? color : colors.secondaryText }]}>{pt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {activeCount > 0 && (
              <View style={[styles.alertBanner, { backgroundColor: colors.neonRed + "10", borderColor: colors.neonRed + "30", marginHorizontal: 16, marginBottom: 10 }]}>
                <Ionicons name="alert-circle" size={16} color={colors.neonRed} />
                <Text style={[styles.alertText, { color: colors.neonRed }]}>
                  {activeCount} permission{activeCount > 1 ? "s" : ""} actively being used right now
                </Text>
              </View>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  permFilterRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 6, marginBottom: 10 },
  permChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  permChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  alertBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  alertText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  permRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  permInfo: { flex: 1, gap: 2 },
  permHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  appName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  liveIndicator: { width: 8, height: 8, borderRadius: 4 },
  permName: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  lastUsed: { fontSize: 10, fontFamily: "Inter_400Regular" },
  permActions: { gap: 6, alignItems: "flex-end" },
  revokeBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1 },
});
