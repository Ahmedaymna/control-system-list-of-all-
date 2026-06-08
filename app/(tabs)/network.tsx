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
import { useSystem, NetworkAppItem } from "@/context/SystemContext";
import { GlowCard } from "@/components/GlowCard";
import { MiniChart } from "@/components/MiniChart";
import { NeonBadge } from "@/components/NeonBadge";

function formatSize(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function NetworkAppCard({ item, onToggle }: { item: NetworkAppItem; onToggle: () => void }) {
  const colors = useColors();
  const isHeavy = item.uploadSpeed > 50 || item.downloadSpeed > 500;

  return (
    <GlowCard
      glowColor={item.blocked ? colors.neonRed : isHeavy ? colors.amber : colors.neonCyan}
      intensity={item.blocked ? "medium" : isHeavy ? "medium" : "low"}
      style={{ marginHorizontal: 16, marginBottom: 8 }}
    >
      <View style={styles.appRow}>
        <View style={[styles.appIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="apps" size={18} color={colors.neonCyan} />
        </View>
        <View style={styles.appInfo}>
          <View style={styles.appHeaderRow}>
            <Text style={[styles.appName, { color: colors.foreground }]}>{item.appName}</Text>
            {isHeavy && <NeonBadge label="HIGH" color={colors.amber} size="sm" />}
            {item.blocked && <NeonBadge label="BLOCKED" color={colors.neonRed} size="sm" />}
          </View>
          <View style={styles.speedRow}>
            <View style={styles.speedItem}>
              <Ionicons name="arrow-up" size={10} color={colors.neonGreen} />
              <Text style={[styles.speedVal, { color: colors.neonGreen }]}>{Math.round(item.uploadSpeed)} KB/s</Text>
            </View>
            <View style={styles.speedItem}>
              <Ionicons name="arrow-down" size={10} color={colors.neonCyan} />
              <Text style={[styles.speedVal, { color: colors.neonCyan }]}>{Math.round(item.downloadSpeed)} KB/s</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => { SoundManager.danger(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onToggle(); }}
          style={[
            styles.blockToggle,
            {
              backgroundColor: item.blocked ? colors.neonRed + "20" : colors.card,
              borderColor: item.blocked ? colors.neonRed : colors.border,
            },
          ]}
        >
          <Ionicons
            name={item.blocked ? "wifi-outline" : "wifi"}
            size={16}
            color={item.blocked ? colors.neonRed : colors.neonCyan}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.usageRow}>
        {[
          { label: "Today", val: formatSize(item.totalToday) },
          { label: "Week", val: formatSize(item.totalWeek) },
          { label: "Month", val: formatSize(item.totalMonth) },
        ].map(u => (
          <View key={u.label} style={styles.usageItem}>
            <Text style={[styles.usageVal, { color: colors.foreground }]}>{u.val}</Text>
            <Text style={[styles.usageLbl, { color: colors.secondaryText }]}>{u.label}</Text>
          </View>
        ))}
      </View>
    </GlowCard>
  );
}

export default function NetworkScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { networkApps, toggleNetworkBlock, networkHistory, stats } = useSystem();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const blocked = networkApps.filter(a => a.blocked).length;
  const totalUp = networkApps.reduce((s, a) => s + a.uploadSpeed, 0);
  const totalDown = networkApps.reduce((s, a) => s + a.downloadSpeed, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.bgDark }]}>
      <FlatList
        data={networkApps}
        keyExtractor={a => a.id}
        renderItem={({ item }) => <NetworkAppCard item={item} onToggle={() => toggleNetworkBlock(item.id)} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 100 }}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { paddingTop: topPad + 8 }]}>
              <Text style={[styles.title, { color: colors.neonCyan }]}>NETWORK</Text>
              {blocked > 0 && (
                <View style={[styles.blockedBadge, { backgroundColor: colors.neonRed + "15", borderColor: colors.neonRed + "40" }]}>
                  <Ionicons name="ban" size={12} color={colors.neonRed} />
                  <Text style={[styles.blockedText, { color: colors.neonRed }]}>{blocked} blocked</Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              {[
                { label: "Upload", val: `${Math.round(totalUp)} KB/s`, color: colors.neonGreen, icon: "arrow-up" as const },
                { label: "Download", val: `${Math.round(totalDown)} KB/s`, color: colors.neonCyan, icon: "arrow-down" as const },
              ].map(s => (
                <View key={s.label} style={[styles.speedCard, { backgroundColor: colors.card, borderColor: s.color + "30" }]}>
                  <Ionicons name={s.icon} size={16} color={s.color} />
                  <Text style={[styles.speedBig, { color: s.color }]}>{s.val}</Text>
                  <Text style={[styles.speedLbl, { color: colors.secondaryText }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            <GlowCard glowColor={colors.neonCyan} style={{ marginHorizontal: 16, marginBottom: 12 }}>
              <Text style={[styles.chartTitle, { color: colors.neonCyan }]}>NETWORK SPEED (60s)</Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chartLabel, { color: colors.neonGreen }]}>Upload</Text>
                  <MiniChart data={networkHistory.map(n => n.up)} color={colors.neonGreen} width={140} height={44} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chartLabel, { color: colors.neonCyan }]}>Download</Text>
                  <MiniChart data={networkHistory.map(n => n.down)} color={colors.neonCyan} width={140} height={44} />
                </View>
              </View>
            </GlowCard>
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
  blockedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  blockedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  speedCard: { flex: 1, alignItems: "center", gap: 4, padding: 12, borderRadius: 12, borderWidth: 1 },
  speedBig: { fontSize: 15, fontFamily: "Inter_700Bold" },
  speedLbl: { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 0.5, textTransform: "uppercase" },
  chartTitle: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 },
  chartLabel: { fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginBottom: 2 },
  appRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  appIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  appInfo: { flex: 1, gap: 4 },
  appHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  appName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  speedRow: { flexDirection: "row", gap: 12 },
  speedItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  speedVal: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  blockToggle: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  usageRow: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#1A2332", paddingTop: 8 },
  usageItem: { alignItems: "center" },
  usageVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  usageLbl: { fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 0.5, textTransform: "uppercase" },
});
