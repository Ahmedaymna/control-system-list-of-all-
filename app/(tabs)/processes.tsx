import React, { useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
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
import { useSystem, ProcessItem } from "@/context/SystemContext";
import { GlowCard } from "@/components/GlowCard";
import { NeonBadge } from "@/components/NeonBadge";

type SortKey = "cpu" | "rss" | "name" | "pid" | "user";

const USER_COLORS: Record<string, string> = {
  root: "#FF2D55",
  system: "#FFB800",
  app: "#00D4FF",
  shell: "#7A8FA6",
};

const STATE_LABELS: Record<string, string> = {
  R: "RUNNING",
  S: "SLEEPING",
  Z: "ZOMBIE",
  D: "DISK WAIT",
  T: "STOPPED",
};

function flattenProcesses(procs: ProcessItem[], depth = 0): { item: ProcessItem; depth: number }[] {
  return procs.flatMap(p => [{ item: p, depth }, ...flattenProcesses(p.children, depth + 1)]);
}

function ProcessRow({ item, depth, onKill }: { item: ProcessItem; depth: number; onKill: () => void }) {
  const colors = useColors();
  const userColor = USER_COLORS[item.user] || colors.secondaryText;
  const stateColor = item.state === "Z" ? colors.neonRed : item.state === "R" ? colors.neonGreen : colors.secondaryText;

  return (
    <View style={[styles.processRow, { paddingLeft: 16 + depth * 16, borderBottomColor: colors.border }]}>
      <View style={styles.procMain}>
        {depth > 0 && <View style={[styles.treeLine, { borderColor: colors.border }]} />}
        <View style={[styles.userDot, { backgroundColor: userColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.procName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.procPid, { color: colors.secondaryText }]}>PID {item.pid} · PPID {item.ppid}</Text>
        </View>
        <View style={styles.procStats}>
          <Text style={[styles.procCpu, { color: item.cpu > 10 ? colors.neonRed : item.cpu > 3 ? colors.amber : colors.neonGreen }]}>
            {item.cpu.toFixed(1)}%
          </Text>
          <Text style={[styles.procMem, { color: colors.electricPurple }]}>
            {item.rss > 0 ? `${Math.round(item.rss / 1024)}MB` : "--"}
          </Text>
          <Text style={[styles.procState, { color: stateColor }]}>{item.state}</Text>
        </View>
        <TouchableOpacity
          onPress={() => { SoundManager.danger(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onKill(); }}
          style={[styles.killBtn, { borderColor: colors.neonRed + "50" }]}
        >
          <Ionicons name="close" size={12} color={colors.neonRed} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProcessesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { processes, killProcess } = useSystem();
  const [sortBy, setSortBy] = useState<SortKey>("cpu");

  const flat = flattenProcesses(processes);

  const sorted = [...flat].sort((a, b) => {
    if (sortBy === "cpu") return b.item.cpu - a.item.cpu;
    if (sortBy === "rss") return b.item.rss - a.item.rss;
    if (sortBy === "pid") return a.item.pid - b.item.pid;
    if (sortBy === "name") return a.item.name.localeCompare(b.item.name);
    if (sortBy === "user") return a.item.user.localeCompare(b.item.user);
    return 0;
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const SORTS: { key: SortKey; label: string }[] = [
    { key: "cpu", label: "CPU" },
    { key: "rss", label: "RAM" },
    { key: "name", label: "Name" },
    { key: "pid", label: "PID" },
    { key: "user", label: "User" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.bgDark }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.title, { color: colors.neonCyan }]}>PROCESSES</Text>
        <Text style={[styles.count, { color: colors.secondaryText }]}>{flat.length} total</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}>
        {SORTS.map(s => (
          <TouchableOpacity
            key={s.key}
            onPress={() => { SoundManager.click(); setSortBy(s.key); Haptics.selectionAsync(); }}
            style={[styles.sortChip, {
              backgroundColor: sortBy === s.key ? colors.neonCyan + "20" : colors.card,
              borderColor: sortBy === s.key ? colors.neonCyan : colors.border,
            }]}
          >
            <Text style={[styles.sortChipText, { color: sortBy === s.key ? colors.neonCyan : colors.secondaryText }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.thName, { color: colors.secondaryText }]}>Process</Text>
        <Text style={[styles.thCpu, { color: colors.secondaryText }]}>CPU</Text>
        <Text style={[styles.thMem, { color: colors.secondaryText }]}>MEM</Text>
        <Text style={[styles.thState, { color: colors.secondaryText }]}>ST</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={({ item }) => item.id}
        renderItem={({ item: { item, depth } }) => (
          <ProcessRow item={item} depth={0} onKill={() => killProcess(item.id)} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 100 }}
      />

      <View style={[styles.legend, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {Object.entries(USER_COLORS).map(([user, color]) => (
          <View key={user} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={[styles.legendText, { color: colors.secondaryText }]}>{user}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  count: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  sortChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tableHeader: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  thName: { flex: 1, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  thCpu: { width: 44, textAlign: "right", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  thMem: { width: 48, textAlign: "right", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  thState: { width: 30, textAlign: "right", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  processRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8, paddingRight: 16 },
  procMain: { flexDirection: "row", alignItems: "center", gap: 8 },
  treeLine: { width: 1, height: 16, borderLeftWidth: 1, position: "absolute", left: -8, top: -8 },
  userDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  procName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  procPid: { fontSize: 10, fontFamily: "Inter_400Regular" },
  procStats: { flexDirection: "row", gap: 8, alignItems: "center" },
  procCpu: { width: 44, textAlign: "right", fontSize: 12, fontFamily: "Inter_700Bold" },
  procMem: { width: 48, textAlign: "right", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  procState: { width: 20, textAlign: "right", fontSize: 12, fontFamily: "Inter_700Bold" },
  killBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 6, borderWidth: 1 },
  legend: { flexDirection: "row", justifyContent: "space-around", padding: 10, borderTopWidth: 1 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
