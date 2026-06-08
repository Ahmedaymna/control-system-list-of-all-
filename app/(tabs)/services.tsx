import React, { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SoundManager } from "@/utils/SoundManager";

import { useColors } from "@/hooks/useColors";
import { useSystem, ServiceItem } from "@/context/SystemContext";
import { GlowCard } from "@/components/GlowCard";
import { NeonBadge } from "@/components/NeonBadge";

const FILTERS = ["All", "System", "User", "Foreground", "Background", "Zombie"] as const;
type Filter = (typeof FILTERS)[number];

function ServiceCard({ item, onKill }: { item: ServiceItem; onKill: () => void }) {
  const colors = useColors();
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(1)).current;
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const statusColor = item.suspicious ? colors.neonRed : item.status === "running" ? colors.neonGreen : item.status === "zombie" ? colors.amber : colors.secondaryText;
  const cpuColor = item.cpu > 10 ? colors.neonRed : item.cpu > 5 ? colors.amber : colors.neonGreen;

  const handleFlip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(flipAnim, {
      toValue: flipped ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const handleKill = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(onKill);
    });
  };

  const formatDuration = (s: number) => {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  };

  return (
    <Animated.View style={{
      transform: [{ translateX: shakeAnim }, { translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-400, 0] }) }],
      opacity: slideAnim,
      marginHorizontal: 16, marginBottom: 8,
    }}>
      <TouchableOpacity onPress={handleFlip} activeOpacity={0.9}>
        <GlowCard glowColor={item.suspicious ? colors.neonRed : statusColor} intensity={item.suspicious ? "medium" : "low"}>
          {!flipped ? (
            <View style={styles.cardFront}>
              <View style={styles.cardMain}>
                <View style={styles.nameRow}>
                  <Text style={[styles.serviceName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                  {item.suspicious && <Ionicons name="warning" size={14} color={colors.neonRed} />}
                </View>
                <Text style={[styles.pkgName, { color: colors.secondaryText }]} numberOfLines={1}>{item.packageName}</Text>
                <View style={styles.badges}>
                  <NeonBadge label={item.status.toUpperCase()} color={statusColor} size="sm" />
                  <NeonBadge label={item.type.toUpperCase()} color={colors.electricPurple} size="sm" />
                </View>
              </View>
              <View style={styles.cardStats}>
                <View style={styles.statCol}>
                  <Text style={[styles.statVal, { color: cpuColor }]}>{item.cpu.toFixed(1)}%</Text>
                  <Text style={[styles.statLbl, { color: colors.secondaryText }]}>CPU</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statVal, { color: colors.electricPurple }]}>{item.ram}MB</Text>
                  <Text style={[styles.statLbl, { color: colors.secondaryText }]}>RAM</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statVal, { color: colors.secondaryText }]}>{item.pid}</Text>
                  <Text style={[styles.statLbl, { color: colors.secondaryText }]}>PID</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.cardBack}>
              <Text style={[styles.detailTitle, { color: colors.neonCyan }]}>SERVICE CONTROLS</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>Running for</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{formatDuration(item.duration)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>PID</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.pid}</Text>
              </View>
              <View style={styles.controlBtns}>
                <TouchableOpacity style={[styles.ctrlBtn, { borderColor: colors.neonRed + "60", backgroundColor: colors.neonRed + "15" }]} onPress={handleKill}>
                  <Ionicons name="stop-circle" size={14} color={colors.neonRed} />
                  <Text style={[styles.ctrlBtnTxt, { color: colors.neonRed }]}>Force Stop</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.ctrlBtn, { borderColor: colors.neonGreen + "60", backgroundColor: colors.neonGreen + "15" }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFlipped(false); }}>
                  <Ionicons name="refresh" size={14} color={colors.neonGreen} />
                  <Text style={[styles.ctrlBtnTxt, { color: colors.neonGreen }]}>Restart</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.ctrlBtn, { borderColor: colors.amber + "60", backgroundColor: colors.amber + "15" }]} onPress={() => setFlipped(false)}>
                  <Ionicons name="ban" size={14} color={colors.amber} />
                  <Text style={[styles.ctrlBtnTxt, { color: colors.amber }]}>Disable</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </GlowCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ServicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { services, killService } = useSystem();
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const filtered = activeFilter === "All" ? services : services.filter(s =>
    activeFilter === "Zombie" ? s.status === "zombie" : s.type === activeFilter.toLowerCase()
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.bgDark }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.title, { color: colors.neonCyan }]}>SERVICES</Text>
        <Text style={[styles.count, { color: colors.secondaryText }]}>{filtered.length} / {services.length}</Text>
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={FILTERS}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          keyExtractor={f => f}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              onPress={() => { setActiveFilter(f); Haptics.selectionAsync(); }}
              style={[styles.chip, {
                backgroundColor: activeFilter === f ? colors.neonCyan + "20" : colors.card,
                borderColor: activeFilter === f ? colors.neonCyan : colors.border,
              }]}
            >
              <Text style={[styles.chipText, { color: activeFilter === f ? colors.neonCyan : colors.secondaryText }]}>{f}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        renderItem={({ item }) => <ServiceCard item={item} onKill={() => killService(item.id)} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: Platform.OS === "web" ? 100 : 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="apps-outline" size={40} color={colors.secondaryText} />
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No services found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  count: { fontSize: 12, fontFamily: "Inter_500Medium" },
  filterRow: { marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  cardFront: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardMain: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  serviceName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  pkgName: { fontSize: 10, fontFamily: "Inter_400Regular" },
  badges: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  cardStats: { gap: 8, alignItems: "flex-end" },
  statCol: { alignItems: "center" },
  statVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 9, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  cardBack: { gap: 10 },
  detailTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textTransform: "uppercase" },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  detailValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  controlBtns: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  ctrlBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  ctrlBtnTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
