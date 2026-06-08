import React from "react";
import {
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
import { useSystem, SecurityItem } from "@/context/SystemContext";
import { GlowCard } from "@/components/GlowCard";
import { NeonBadge } from "@/components/NeonBadge";

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  root_access: "key",
  device_admin: "shield",
  accessibility: "eye",
  battery_exempt: "battery-charging",
  autostart: "play-circle",
};

const TYPE_LABELS: Record<string, string> = {
  root_access: "ROOT ACCESS",
  device_admin: "DEVICE ADMIN",
  accessibility: "ACCESSIBILITY",
  battery_exempt: "BATTERY EXEMPT",
  autostart: "AUTOSTART",
};

function SecurityCard({ item }: { item: SecurityItem }) {
  const colors = useColors();
  const typeColor = item.dangerous ? colors.neonRed : colors.neonGreen;
  const icon = TYPE_ICONS[item.type] || "shield";

  return (
    <GlowCard
      glowColor={item.dangerous ? colors.neonRed : colors.border}
      intensity={item.dangerous ? "medium" : "low"}
      style={{ marginHorizontal: 16, marginBottom: 8 }}
    >
      <View style={styles.secRow}>
        <View style={[styles.iconBox, { backgroundColor: typeColor + "15", borderColor: typeColor + "40" }]}>
          <Ionicons name={icon} size={20} color={typeColor} />
        </View>
        <View style={styles.secInfo}>
          <View style={styles.secHeader}>
            <Text style={[styles.appName, { color: colors.foreground }]} numberOfLines={1}>{item.appName}</Text>
            {item.dangerous && <Ionicons name="warning" size={14} color={colors.neonRed} />}
          </View>
          <Text style={[styles.pkgName, { color: colors.secondaryText }]} numberOfLines={1}>{item.packageName}</Text>
          <NeonBadge label={TYPE_LABELS[item.type] || item.type} color={typeColor} size="sm" />
        </View>
      </View>

      <View style={[styles.descBox, { backgroundColor: (item.dangerous ? colors.neonRed : colors.neonGreen) + "08", borderColor: typeColor + "20" }]}>
        <Text style={[styles.descText, { color: item.dangerous ? colors.neonRed + "CC" : colors.secondaryText }]}>
          {item.description}
        </Text>
      </View>

      {item.dangerous && (
        <TouchableOpacity
          style={[styles.revokeBtn, { borderColor: colors.neonRed + "60", backgroundColor: colors.neonRed + "10" }]}
          onPress={() => { SoundManager.danger(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); revokeSecurityItem(item.id); }}
        >
          <Ionicons name="ban" size={14} color={colors.neonRed} />
          <Text style={[styles.revokeBtnText, { color: colors.neonRed }]}>Revoke Access</Text>
        </TouchableOpacity>
      )}
    </GlowCard>
  );
}

export default function SecurityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { securityItems, revokeSecurityItem } = useSystem();

  const dangerous = securityItems.filter(s => s.dangerous);
  const safe = securityItems.filter(s => !s.dangerous);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const securityScore = Math.max(0, 100 - dangerous.length * 20);
  const scoreColor = securityScore >= 80 ? colors.neonGreen : securityScore >= 50 ? colors.amber : colors.neonRed;

  return (
    <View style={[styles.root, { backgroundColor: colors.bgDark }]}>
      <FlatList
        data={securityItems}
        keyExtractor={s => s.id}
        renderItem={({ item }) => <SecurityCard item={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 100 }}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { paddingTop: topPad + 8 }]}>
              <Text style={[styles.title, { color: colors.neonCyan }]}>SECURITY</Text>
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor + "20", borderColor: scoreColor + "50" }]}>
                <Text style={[styles.scoreText, { color: scoreColor }]}>{securityScore}%</Text>
              </View>
            </View>

            {dangerous.length > 0 && (
              <View style={[styles.alertBanner, { backgroundColor: colors.neonRed + "12", borderColor: colors.neonRed + "40", marginHorizontal: 16, marginBottom: 12 }]}>
                <Ionicons name="warning" size={18} color={colors.neonRed} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: colors.neonRed }]}>
                    {dangerous.length} Security Threat{dangerous.length > 1 ? "s" : ""} Detected
                  </Text>
                  <Text style={[styles.alertSub, { color: colors.neonRed + "99" }]}>
                    Review and revoke suspicious access immediately
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.statsRow}>
              {[
                { label: "Threats", val: dangerous.length, color: colors.neonRed },
                { label: "Safe", val: safe.length, color: colors.neonGreen },
                { label: "Total", val: securityItems.length, color: colors.neonCyan },
              ].map(s => (
                <View key={s.label} style={[styles.statItem, { backgroundColor: colors.card, borderColor: s.color + "30" }]}>
                  <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                  <Text style={[styles.statLbl, { color: colors.secondaryText }]}>{s.label}</Text>
                </View>
              ))}
            </View>
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
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  scoreText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  alertBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  alertTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  alertSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  statItem: { flex: 1, alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1 },
  statVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 0.5, textTransform: "uppercase" },
  secRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  secInfo: { flex: 1, gap: 4 },
  secHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  appName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  pkgName: { fontSize: 10, fontFamily: "Inter_400Regular" },
  descBox: { padding: 8, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  descText: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  revokeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 8, borderRadius: 8, borderWidth: 1 },
  revokeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
