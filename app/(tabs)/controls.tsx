import React, { useState, useRef, useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Animated,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Brightness from "expo-brightness";

import { useColors } from "@/hooks/useColors";
import { useSystem } from "@/context/SystemContext";
import { GlowCard } from "@/components/GlowCard";
import { NeonBadge } from "@/components/NeonBadge";
import { SoundManager } from "@/utils/SoundManager";
import { MiniChart } from "@/components/MiniChart";

const GOVERNORS = ["performance", "ondemand", "conservative", "powersave", "schedutil"];

function BrightnessSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const colors = useColors();
  const steps = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
      <Ionicons name="sunny-outline" size={14} color={colors.secondaryText} />
      <View style={{ flex: 1, flexDirection: "row", gap: 3 }}>
        {steps.map(step => (
          <TouchableOpacity
            key={step}
            onPress={() => { onChange(step); SoundManager.click(); Haptics.selectionAsync(); }}
            style={{
              flex: 1,
              height: 24,
              borderRadius: 4,
              backgroundColor: value >= step ? colors.amber : colors.card,
              borderWidth: 1,
              borderColor: value >= step ? colors.amber + "80" : colors.border,
            }}
          />
        ))}
      </View>
      <Ionicons name="sunny" size={18} color={colors.amber} />
      <Text style={{ color: colors.amber, fontSize: 11, fontFamily: "Inter_700Bold", minWidth: 32 }}>
        {Math.round(value * 100)}%
      </Text>
    </View>
  );
}

function ToggleRow({
  label, desc, icon, color, value, onToggle, badge,
}: {
  label: string; desc: string; icon: keyof typeof Ionicons.glyphMap;
  color: string; value: boolean; onToggle: () => void; badge?: string;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.toggleRow, {
        backgroundColor: value ? color + "12" : "transparent",
        borderColor: value ? color + "50" : colors.border,
      }]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIcon, { backgroundColor: color + "15", borderColor: color + "30" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.actionLabel, { color: colors.foreground }]}>{label}</Text>
          {badge && <NeonBadge label={badge} color={colors.amber} size="sm" />}
        </View>
        <Text style={[styles.actionDesc, { color: colors.secondaryText }]}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: color + "60" }}
        thumbColor={value ? color : colors.secondaryText}
      />
    </TouchableOpacity>
  );
}

export default function ControlsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    stats, internetBlocked, setInternetBlocked,
    dozeEnabled, forceDoze,
    gpuPerfMode, setGpuPerfMode,
    screenLimiter, setScreenLimiter,
    governor, setGovernor,
    killAllBackground, clearRamCache, setBrightness,
    thermalHistory,
  } = useSystem();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<"auto" | "portrait" | "landscape">("auto");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const spinAnim = useRef(new Animated.Value(0)).current;

  function startSpin() {
    spinAnim.setValue(0);
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
    ).start();
  }
  function stopSpin() {
    spinAnim.stopAnimation();
  }

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  function simulateAction(id: string, cb?: () => void) {
    setLoadingId(id);
    SoundManager.click();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    startSpin();
    setTimeout(() => {
      setLoadingId(null);
      stopSpin();
      SoundManager.confirm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cb?.();
    }, 900);
  }

  async function handleOrientation(mode: "auto" | "portrait" | "landscape") {
    setOrientation(mode);
    SoundManager.click();
    Haptics.selectionAsync();
    try {
      if (mode === "portrait") {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      } else if (mode === "landscape") {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } else {
        await ScreenOrientation.unlockAsync();
      }
    } catch {}
  }

  const ramUsedPercent = stats.ramPercent;
  const cpuNow = stats.cpuPercent;

  return (
    <View style={[styles.root, { backgroundColor: colors.bgDark }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.neonCyan }]}>CONTROLS</Text>
          {stats.isRooted && <NeonBadge label="ROOTED" color={colors.neonGreen} size="sm" />}
          {stats.isEmulator && <NeonBadge label="EMULATOR" color={colors.amber} size="sm" />}
        </View>

        {/* Device info bar */}
        <GlowCard glowColor={colors.neonCyan} style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.neonCyan }]}>DEVICE INFO</Text>
          <View style={{ gap: 6 }}>
            {[
              { label: "Model", value: `${stats.manufacturer} ${stats.modelName}` },
              { label: "Android", value: `${stats.osVersion} (API ${stats.androidApiLevel ?? "?"})` },
              { label: "RAM", value: `${Math.round(stats.ramUsed / 1024 * 10) / 10} / ${Math.round(stats.ramTotal / 1024 * 10) / 10} GB` },
              { label: "Network", value: `${stats.networkType} · ${stats.ipAddress}` },
              { label: "Battery", value: `${stats.batteryLevel}% · ${stats.batteryCharging ? "Charging" : "Discharging"}` },
            ].map(row => (
              <View key={row.label} style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>{row.label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>{row.value}</Text>
              </View>
            ))}
          </View>
        </GlowCard>

        {/* Screen Brightness — real API */}
        <GlowCard glowColor={colors.amber} style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.amber }]}>SCREEN BRIGHTNESS</Text>
          <Text style={[styles.actionDesc, { color: colors.secondaryText, marginBottom: 4 }]}>
            Controls actual system brightness via Android API
          </Text>
          <BrightnessSlider
            value={stats.screenBrightness}
            onChange={setBrightness}
          />
        </GlowCard>

        {/* System toggles */}
        <GlowCard glowColor={colors.electricPurple} style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.electricPurple }]}>SYSTEM TOGGLES</Text>
          <View style={{ gap: 8 }}>
            <ToggleRow
              label="Block All Internet"
              desc="Simulates VPN killswitch — stops all app traffic"
              icon="wifi-outline"
              color={colors.neonCyan}
              value={internetBlocked}
              onToggle={() => { SoundManager.danger(); setInternetBlocked(!internetBlocked); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
            />
            <ToggleRow
              label="Force Doze Mode"
              desc="Restricts CPU to ~30% — extends battery life"
              icon="moon"
              color={colors.electricPurple}
              value={dozeEnabled}
              onToggle={() => { SoundManager.confirm(); forceDoze(!dozeEnabled); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            />
            <ToggleRow
              label="GPU Performance Mode"
              desc="Pushes CPU/GPU load simulation to max"
              icon="speedometer"
              color={colors.neonGreen}
              value={gpuPerfMode}
              badge="ROOT"
              onToggle={() => { SoundManager.confirm(); setGpuPerfMode(!gpuPerfMode); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            />
            <ToggleRow
              label="Screen-off CPU Limit"
              desc="Keeps CPU at ~15% when screen is off"
              icon="phone-portrait-outline"
              color={colors.amber}
              value={screenLimiter}
              badge="ROOT"
              onToggle={() => { SoundManager.confirm(); setScreenLimiter(!screenLimiter); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            />
          </View>
        </GlowCard>

        {/* One-shot actions */}
        <GlowCard glowColor={colors.neonRed} style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.neonRed }]}>ACTIONS</Text>
          <View style={{ gap: 8 }}>
            {[
              { id: "kill_bg", label: "Kill Background Apps", desc: `Removes background services (saves ~RAM)`, icon: "close-circle" as const, color: colors.neonRed, cb: killAllBackground },
              { id: "clear_cache", label: "Clear RAM Cache", desc: `Currently ${Math.round(stats.ramUsed / 1024 * 10) / 10} GB used — clears page cache`, icon: "trash" as const, color: colors.amber, cb: clearRamCache },
            ].map(action => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionRow, {
                  backgroundColor: loadingId === action.id ? action.color + "18" : "transparent",
                  borderColor: loadingId === action.id ? action.color + "60" : colors.border,
                }]}
                onPress={() => simulateAction(action.id, action.cb)}
                activeOpacity={0.8}
                disabled={!!loadingId}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + "15", borderColor: action.color + "30" }]}>
                  <Animated.View style={{ transform: loadingId === action.id ? [{ rotate: spin }] : [] }}>
                    <Ionicons name={loadingId === action.id ? "refresh" : action.icon} size={20} color={action.color} />
                  </Animated.View>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.actionLabel, { color: colors.foreground }]}>{action.label}</Text>
                  <Text style={[styles.actionDesc, { color: colors.secondaryText }]}>{action.desc}</Text>
                </View>
                <Ionicons name="play" size={14} color={loadingId === action.id ? action.color : colors.secondaryText} />
              </TouchableOpacity>
            ))}
          </View>
        </GlowCard>

        {/* CPU Governor */}
        <GlowCard glowColor={colors.electricPurple} style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.electricPurple }]}>CPU GOVERNOR</Text>
          <View style={styles.govCpuRow}>
            <Text style={[styles.govCurrent, { color: colors.secondaryText }]}>
              Active: <Text style={{ color: colors.neonCyan }}>{governor}</Text>
            </Text>
            <Text style={[styles.govCurrent, { color: colors.secondaryText }]}>
              CPU: <Text style={{ color: cpuNow > 70 ? colors.neonRed : colors.neonGreen }}>{Math.round(cpuNow)}%</Text>
            </Text>
          </View>
          <View style={styles.govGrid}>
            {GOVERNORS.map(g => (
              <TouchableOpacity
                key={g}
                onPress={() => { SoundManager.click(); setGovernor(g); Haptics.selectionAsync(); }}
                style={[styles.govChip, {
                  backgroundColor: governor === g ? colors.electricPurple + "20" : colors.card,
                  borderColor: governor === g ? colors.electricPurple : colors.border,
                }]}
              >
                <Text style={[styles.govChipText, { color: governor === g ? colors.electricPurple : colors.secondaryText }]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <NeonBadge label="REQUIRES ROOT" color={colors.amber} size="sm" />
        </GlowCard>

        {/* Screen Orientation — real API */}
        <GlowCard glowColor={colors.neonGreen} style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.neonGreen }]}>SCREEN ORIENTATION</Text>
          <Text style={[styles.actionDesc, { color: colors.secondaryText, marginBottom: 10 }]}>
            Locks device rotation via expo-screen-orientation
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["auto", "portrait", "landscape"] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[styles.govChip, { flex: 1, justifyContent: "center", alignItems: "center",
                  backgroundColor: orientation === mode ? colors.neonGreen + "20" : colors.card,
                  borderColor: orientation === mode ? colors.neonGreen : colors.border,
                }]}
                onPress={() => handleOrientation(mode)}
              >
                <Ionicons
                  name={mode === "auto" ? "phone-portrait-outline" : mode === "portrait" ? "phone-portrait" : "phone-landscape"}
                  size={16}
                  color={orientation === mode ? colors.neonGreen : colors.secondaryText}
                />
                <Text style={[styles.govChipText, { color: orientation === mode ? colors.neonGreen : colors.secondaryText, marginTop: 4 }]}>
                  {mode.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlowCard>

        {/* Thermal history chart */}
        <GlowCard glowColor={colors.neonRed} style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.neonRed }]}>CPU THERMAL HISTORY</Text>
          <Text style={[styles.actionDesc, { color: colors.secondaryText, marginBottom: 6 }]}>
            Current: <Text style={{ color: stats.temperature > 50 ? colors.neonRed : colors.amber }}>{Math.round(stats.temperature)}°C</Text>
          </Text>
          <MiniChart data={thermalHistory} color={colors.neonRed} width={300} height={52} filled />
        </GlowCard>

        {/* Reboot */}
        <GlowCard glowColor={colors.neonRed} style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.neonRed }]}>REBOOT OPTIONS</Text>
          <Text style={[styles.actionDesc, { color: colors.secondaryText, marginBottom: 12 }]}>
            Requires root access. These actions are irreversible.
          </Text>
          <View style={styles.rebootRow}>
            {[
              { label: "System", icon: "refresh-circle" as const, color: colors.neonCyan },
              { label: "Recovery", icon: "construct" as const, color: colors.amber },
              { label: "Bootloader", icon: "code-slash" as const, color: colors.electricPurple },
            ].map(opt => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.rebootBtn, { borderColor: opt.color + "50", backgroundColor: opt.color + "10" }]}
                onPress={() => {
                  SoundManager.danger();
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  Alert.alert(`Reboot to ${opt.label}`, "Requires root access. Device will restart.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Reboot", style: "destructive", onPress: () => { SoundManager.confirm(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
                  ]);
                }}
              >
                <Ionicons name={opt.icon} size={22} color={opt.color} />
                <Text style={[styles.rebootLabel, { color: opt.color }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlowCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2, flex: 1 },
  sectionTitle: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#1A2332" },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 11, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  actionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  actionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actionDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  govCpuRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  govCurrent: { fontSize: 12, fontFamily: "Inter_400Regular" },
  govGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  govChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  govChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  rebootRow: { flexDirection: "row", gap: 10 },
  rebootBtn: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 10, borderWidth: 1 },
  rebootLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
