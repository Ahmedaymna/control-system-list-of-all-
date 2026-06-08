import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Platform, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useSystem } from "@/context/SystemContext";
import { GlowCard } from "@/components/GlowCard";
import { StatRing } from "@/components/StatRing";
import { MiniChart } from "@/components/MiniChart";
import { HealthOrb } from "@/components/HealthOrb";
import { ActionButton } from "@/components/ActionButton";
import { ParticleBackground } from "@/components/ParticleBackground";
import { ScanLine } from "@/components/ScanLine";
import { NeonBadge } from "@/components/NeonBadge";
import { SoundManager } from "@/utils/SoundManager";

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatBytes(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    stats, suspiciousCount, cpuHistory, ramHistory, networkHistory,
    internetBlocked, setInternetBlocked, services,
    thermalZones, killAllBackground, clearRamCache, isLoading,
  } = useSystem();

  const cardAnims = useRef(Array(6).fill(null).map(() => new Animated.Value(0))).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const [refreshAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    cardAnims.forEach((anim, i) => {
      Animated.timing(anim, { toValue: 1, duration: 500, delay: 200 + i * 100, useNativeDriver: true }).start();
    });
  }, []);

  const healthScore = Math.max(5, Math.min(100,
    100 - stats.cpuPercent * 0.35 - stats.ramPercent * 0.25 - (suspiciousCount * 8) - (stats.temperature > 50 ? 10 : 0)
  ));

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.bgDark }]}>
      <ParticleBackground />
      <ScanLine />
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        }]}>
          <View>
            <Text style={[styles.title, { color: colors.neonCyan }]}>CONTROL SYSTEM</Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
              {stats.manufacturer} {stats.modelName} · Android {stats.osVersion}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {suspiciousCount > 0 && (
              <View style={[styles.alertBadge, { backgroundColor: colors.neonRed + "20", borderColor: colors.neonRed + "60" }]}>
                <Ionicons name="warning" size={12} color={colors.neonRed} />
                <Text style={[styles.alertText, { color: colors.neonRed }]}>{suspiciousCount} threats</Text>
              </View>
            )}
            {stats.isRooted && <NeonBadge label="ROOTED" color={colors.neonGreen} size="sm" />}
            <Text style={[styles.uptime, { color: colors.secondaryText }]}>UP {formatUptime(stats.uptime)}</Text>
          </View>
        </Animated.View>

        {/* Orb + Rings */}
        <View style={styles.orbRow}>
          <HealthOrb value={healthScore} size={130} />
          <View style={styles.ringsCol}>
            <View style={styles.ringsRow}>
              <StatRing value={stats.cpuPercent} label="CPU" color={stats.cpuPercent > 80 ? colors.neonRed : colors.neonCyan} size={72} />
              <StatRing value={stats.ramPercent} label="RAM" color={stats.ramPercent > 80 ? colors.neonRed : colors.electricPurple} size={72} />
            </View>
            <View style={styles.ringsRow}>
              <StatRing value={stats.batteryLevel} label="BAT" color={stats.batteryLevel < 20 ? colors.neonRed : colors.neonGreen} size={72} />
              <StatRing value={stats.temperature} max={80} label="TEMP" unit="°C" color={stats.temperature > 50 ? colors.neonRed : colors.amber} size={72} />
            </View>
          </View>
        </View>

        {/* Live stats pills */}
        <View style={styles.statsRow}>
          {[
            { label: "UP", value: `${Math.round(stats.networkUp)} KB/s`, icon: "arrow-up", color: colors.neonGreen },
            { label: "DOWN", value: `${Math.round(stats.networkDown)} KB/s`, icon: "arrow-down", color: colors.neonCyan },
            { label: "RAM", value: formatBytes(stats.ramUsed), icon: "hardware-chip", color: colors.electricPurple },
            { label: "TEMP", value: `${Math.round(stats.temperature)}°C`, icon: "thermometer", color: colors.amber },
          ].map((item, i) => (
            <Animated.View key={item.label} style={[styles.statPill, {
              backgroundColor: colors.card,
              borderColor: item.color + "30",
              opacity: cardAnims[i],
              transform: [{ translateY: cardAnims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            }]}>
              <Ionicons name={item.icon as any} size={12} color={item.color} />
              <Text style={[styles.statPillVal, { color: item.color }]}>{item.value}</Text>
              <Text style={[styles.statPillLbl, { color: colors.secondaryText }]}>{item.label}</Text>
            </Animated.View>
          ))}
        </View>

        {/* CPU Chart */}
        <Animated.View style={{ opacity: cardAnims[0], transform: [{ translateY: cardAnims[0].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }], paddingHorizontal: 16, marginBottom: 10 }}>
          <GlowCard glowColor={colors.neonCyan}>
            <Text style={[styles.cardTitle, { color: colors.neonCyan }]}>CPU USAGE · {Math.round(stats.cpuPercent)}%</Text>
            <MiniChart data={cpuHistory} color={colors.neonCyan} width={300} height={56} filled />
          </GlowCard>
        </Animated.View>

        {/* RAM + Network charts */}
        <View style={{ paddingHorizontal: 16, flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <Animated.View style={{ flex: 1, opacity: cardAnims[1], transform: [{ translateY: cardAnims[1].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
            <GlowCard glowColor={colors.electricPurple} style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.electricPurple }]}>RAM · {Math.round(stats.ramPercent)}%</Text>
              <MiniChart data={ramHistory} color={colors.electricPurple} width={130} height={44} filled />
            </GlowCard>
          </Animated.View>
          <Animated.View style={{ flex: 1, opacity: cardAnims[2], transform: [{ translateY: cardAnims[2].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
            <GlowCard glowColor={colors.neonGreen} style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.neonGreen }]}>NET ↓ {Math.round(stats.networkDown)}KB/s</Text>
              <MiniChart data={networkHistory.map(n => n.down)} color={colors.neonGreen} width={130} height={44} filled />
            </GlowCard>
          </Animated.View>
        </View>

        {/* Thermal zones */}
        <Animated.View style={{ opacity: cardAnims[3], paddingHorizontal: 16, marginBottom: 10 }}>
          <GlowCard glowColor={colors.amber}>
            <Text style={[styles.cardTitle, { color: colors.amber }]}>THERMAL ZONES</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {thermalZones.map(z => (
                <View key={z.id} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                  <Text style={{ color: z.value > z.max * 0.8 ? colors.neonRed : z.color, fontSize: 14, fontFamily: "Inter_700Bold" }}>
                    {Math.round(z.value)}°
                  </Text>
                  <View style={{ width: "100%", height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: "hidden" }}>
                    <View style={{ width: `${(z.value / z.max) * 100}%`, height: "100%", backgroundColor: z.value > z.max * 0.8 ? colors.neonRed : z.color, borderRadius: 2 }} />
                  </View>
                  <Text style={{ color: colors.secondaryText, fontSize: 9, fontFamily: "Inter_500Medium" }}>{z.label}</Text>
                </View>
              ))}
            </View>
          </GlowCard>
        </Animated.View>

        {/* Quick Controls */}
        <Animated.View style={{ opacity: cardAnims[3], transform: [{ translateY: cardAnims[3].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }], paddingHorizontal: 16, marginBottom: 10 }}>
          <GlowCard glowColor={colors.electricPurple}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>QUICK CONTROLS</Text>
            <View style={styles.actionsGrid}>
              <ActionButton label="Kill BG Apps" icon="close-circle" color={colors.neonRed}
                onPress={() => { SoundManager.danger(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); killAllBackground(); }} />
              <ActionButton label="Clear RAM" icon="trash" color={colors.amber}
                onPress={() => { SoundManager.confirm(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); clearRamCache(); }} />
              <ActionButton label="Block Internet" icon="wifi-outline" color={colors.neonCyan} active={internetBlocked}
                onPress={() => { SoundManager.danger(); setInternetBlocked(!internetBlocked); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }} />
              <ActionButton label="Force Doze" icon="moon" color={colors.electricPurple}
                onPress={() => { SoundManager.confirm(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} />
            </View>
          </GlowCard>
        </Animated.View>

        {/* System Info */}
        <Animated.View style={{ opacity: cardAnims[4], paddingHorizontal: 16, marginBottom: 10 }}>
          <GlowCard>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>SYSTEM INFO</Text>
            {[
              { label: "Uptime", value: formatUptime(stats.uptime) },
              { label: "Services", value: `${services.length} running` },
              { label: "Threats", value: `${suspiciousCount} detected`, danger: suspiciousCount > 0 },
              { label: "Temperature", value: `${Math.round(stats.temperature)}°C`, danger: stats.temperature > 50 },
              { label: "Network", value: `${stats.networkType} · ${stats.isConnected ? "Online" : "Offline"}`, danger: !stats.isConnected },
              { label: "Battery", value: `${stats.batteryLevel}% · ${stats.batteryCharging ? "⚡ Charging" : "Discharging"}` },
            ].map(item => (
              <View key={item.label} style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>{item.label}</Text>
                <Text style={[styles.infoValue, { color: item.danger ? colors.neonRed : colors.foreground }]}>{item.value}</Text>
              </View>
            ))}
          </GlowCard>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, marginBottom: 14 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  subtitle: { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginTop: 2 },
  headerRight: { alignItems: "flex-end", gap: 4 },
  alertBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  alertText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  uptime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  orbRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12, marginBottom: 12 },
  ringsCol: { flex: 1, gap: 8 },
  ringsRow: { flexDirection: "row", justifyContent: "space-around" },
  statsRow: { flexDirection: "row", gap: 6, paddingHorizontal: 16, marginBottom: 10 },
  statPill: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 2 },
  statPillVal: { fontSize: 10, fontFamily: "Inter_700Bold" },
  statPillLbl: { fontSize: 8, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  cardTitle: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 },
  actionsGrid: { gap: 8 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#1A2332" },
  infoLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
