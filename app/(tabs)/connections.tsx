import React, { useState } from "react";
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
import { useSystem, ConnectionItem } from "@/context/SystemContext";
import { GlowCard } from "@/components/GlowCard";
import { NeonBadge } from "@/components/NeonBadge";
import { NetworkGlobe } from "@/components/NetworkGlobe";

const STATE_COLORS: Record<string, string> = {
  ESTABLISHED: "#00FF88",
  LISTEN: "#00D4FF",
  TIME_WAIT: "#FFB800",
  CLOSE_WAIT: "#FF2D55",
  SYN_SENT: "#7B2FFF",
};

function ConnectionCard({ item, onBlock }: { item: ConnectionItem; onBlock: () => void }) {
  const colors = useColors();
  const stateColor = STATE_COLORS[item.state] || colors.secondaryText;

  return (
    <GlowCard
      glowColor={item.suspicious ? colors.neonRed : stateColor}
      intensity={item.suspicious ? "high" : "low"}
      style={{ marginHorizontal: 16, marginBottom: 8 }}
    >
      <View style={styles.connHeader}>
        <View style={styles.connLeft}>
          <View style={styles.appRow}>
            <Text style={[styles.appName, { color: colors.foreground }]}>{item.appName}</Text>
            {item.suspicious && <Ionicons name="warning" size={12} color={colors.neonRed} />}
            <Text style={[styles.flagText]}>{item.countryFlag}</Text>
          </View>
          <Text style={[styles.hostname, { color: colors.neonCyan }]} numberOfLines={1}>{item.hostname}</Text>
        </View>
        <View style={styles.connRight}>
          <NeonBadge label={item.state} color={stateColor} size="sm" />
          <NeonBadge label={item.protocol} color={colors.electricPurple} size="sm" />
        </View>
      </View>

      <View style={styles.addrRow}>
        <Text style={[styles.addr, { color: colors.secondaryText }]}>
          {item.localAddr}:{item.localPort}
        </Text>
        <Ionicons name="arrow-forward" size={12} color={colors.secondaryText} />
        <Text style={[styles.addr, { color: item.suspicious ? colors.neonRed : colors.foreground }]} numberOfLines={1}>
          {item.remoteAddr}:{item.remotePort}
        </Text>
      </View>

      <View style={styles.trafficRow}>
        <View style={styles.trafficItem}>
          <Ionicons name="arrow-up" size={10} color={colors.neonGreen} />
          <Text style={[styles.trafficVal, { color: colors.neonGreen }]}>{item.sent} B</Text>
        </View>
        <View style={styles.trafficItem}>
          <Ionicons name="arrow-down" size={10} color={colors.neonCyan} />
          <Text style={[styles.trafficVal, { color: colors.neonCyan }]}>{item.received} B</Text>
        </View>
        <TouchableOpacity
          style={[styles.blockBtn, { borderColor: colors.neonRed + "60", backgroundColor: colors.neonRed + "15" }]}
          onPress={() => { SoundManager.danger(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onBlock(); }}
        >
          <Ionicons name="shield" size={12} color={colors.neonRed} />
          <Text style={[styles.blockBtnTxt, { color: colors.neonRed }]}>Block</Text>
        </TouchableOpacity>
      </View>
    </GlowCard>
  );
}

export default function ConnectionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { connections, blockConnection } = useSystem();
  const [showGlobe, setShowGlobe] = useState(false);

  const suspicious = connections.filter(c => c.suspicious);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.bgDark }]}>
      <FlatList
        data={connections}
        keyExtractor={c => c.id}
        renderItem={({ item }) => <ConnectionCard item={item} onBlock={() => blockConnection(item.id)} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 100 }}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { paddingTop: topPad + 8 }]}>
              <Text style={[styles.title, { color: colors.neonCyan }]}>CONNECTIONS</Text>
              <TouchableOpacity
                onPress={() => { SoundManager.swipe(); setShowGlobe(!showGlobe); }}
                style={[styles.globeToggle, { borderColor: colors.neonCyan + "40", backgroundColor: showGlobe ? colors.neonCyan + "20" : "transparent" }]}
              >
                <Ionicons name="globe" size={16} color={colors.neonCyan} />
              </TouchableOpacity>
            </View>

            {suspicious.length > 0 && (
              <View style={[styles.alertBanner, { backgroundColor: colors.neonRed + "15", borderColor: colors.neonRed + "40", marginHorizontal: 16, marginBottom: 10 }]}>
                <Ionicons name="warning" size={16} color={colors.neonRed} />
                <Text style={[styles.alertText, { color: colors.neonRed }]}>
                  {suspicious.length} suspicious connection{suspicious.length > 1 ? "s" : ""} detected
                </Text>
              </View>
            )}

            {showGlobe && (
              <View style={styles.globeContainer}>
                <NetworkGlobe size={220} />
              </View>
            )}

            <View style={styles.statsRow}>
              {[
                { label: "Total", val: connections.length, color: colors.neonCyan },
                { label: "TCP", val: connections.filter(c => c.protocol === "TCP").length, color: colors.neonGreen },
                { label: "UDP", val: connections.filter(c => c.protocol === "UDP").length, color: colors.electricPurple },
                { label: "Suspect", val: suspicious.length, color: colors.neonRed },
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
  globeToggle: { padding: 8, borderRadius: 8, borderWidth: 1 },
  alertBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  alertText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  globeContainer: { alignItems: "center", paddingVertical: 12 },
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  statItem: { flex: 1, alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1 },
  statVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  connHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  connLeft: { flex: 1, gap: 2 },
  appRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  appName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  flagText: { fontSize: 14 },
  hostname: { fontSize: 11, fontFamily: "Inter_400Regular" },
  connRight: { gap: 4, alignItems: "flex-end" },
  addrRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  addr: { fontSize: 10, fontFamily: "Inter_400Regular", flex: 1 },
  trafficRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  trafficItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  trafficVal: { fontSize: 11, fontFamily: "Inter_500Medium" },
  blockBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  blockBtnTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
