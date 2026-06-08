/**
 * SystemContext — مزيج بين بيانات حقيقية من جهاز Android وبيانات محاكاة واقعية
 * الحقيقي: Battery, Network state, Device info, Screen brightness
 * المحاكاة: CPU/RAM/Processes (Android لا يسمح بقراءتها مباشرة من JS بدون root shell)
 */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Alert, Platform, Vibration } from "react-native";
import * as Battery from "expo-battery";
import * as Network from "expo-network";
import * as Device from "expo-device";
import * as Brightness from "expo-brightness";
import * as ScreenOrientation from "expo-screen-orientation";
import Constants from "expo-constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SystemStats {
  cpuPercent: number;
  cpuCores: number;
  ramUsed: number;
  ramTotal: number;
  ramPercent: number;
  batteryLevel: number;
  batteryCharging: boolean;
  batteryState: Battery.BatteryState;
  temperature: number;
  networkUp: number;
  networkDown: number;
  uptime: number;
  screenBrightness: number;
  // Real device info
  deviceName: string;
  osVersion: string;
  androidApiLevel: number | null;
  manufacturer: string;
  modelName: string;
  isRooted: boolean | null;
  isEmulator: boolean;
  networkType: string;
  isConnected: boolean;
  isAirplaneMode: boolean;
  ipAddress: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  pid: number;
  cpu: number;
  ram: number;
  status: "running" | "stopped" | "zombie" | "sleeping";
  type: "system" | "user" | "foreground" | "background";
  packageName: string;
  duration: number;
  suspicious: boolean;
}

export interface ConnectionItem {
  id: string;
  localAddr: string;
  localPort: number;
  remoteAddr: string;
  remotePort: number;
  state: "ESTABLISHED" | "LISTEN" | "TIME_WAIT" | "CLOSE_WAIT" | "SYN_SENT";
  appName: string;
  protocol: "TCP" | "UDP";
  sent: number;
  received: number;
  country: string;
  countryFlag: string;
  hostname: string;
  suspicious: boolean;
}

export interface ProcessItem {
  id: string;
  name: string;
  pid: number;
  ppid: number;
  cpu: number;
  rss: number;
  state: "R" | "S" | "Z" | "D" | "T";
  user: "root" | "system" | "app" | "shell";
  children: ProcessItem[];
}

export interface PermissionItem {
  id: string;
  appName: string;
  permission: "Camera" | "Microphone" | "Location" | "Storage" | "Phone";
  lastUsed: number;
  active: boolean;
  icon: string;
}

export interface NetworkAppItem {
  id: string;
  appName: string;
  uploadSpeed: number;
  downloadSpeed: number;
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  blocked: boolean;
}

export interface SecurityItem {
  id: string;
  type: "root_access" | "device_admin" | "accessibility" | "battery_exempt" | "autostart";
  appName: string;
  packageName: string;
  dangerous: boolean;
  description: string;
}

export interface ThermalZone {
  id: string;
  label: string;
  value: number;
  max: number;
  color: string;
}

export interface SystemContextValue {
  stats: SystemStats;
  services: ServiceItem[];
  connections: ConnectionItem[];
  processes: ProcessItem[];
  permissions: PermissionItem[];
  networkApps: NetworkAppItem[];
  securityItems: SecurityItem[];
  thermalZones: ThermalZone[];
  suspiciousCount: number;
  killService: (id: string) => void;
  blockConnection: (id: string) => void;
  killProcess: (id: string) => void;
  toggleNetworkBlock: (id: string) => void;
  revokeSecurityItem: (id: string) => void;
  revokePermission: (id: string) => void;
  setBrightness: (level: number) => void;
  killAllBackground: () => void;
  clearRamCache: () => void;
  forceDoze: (enable: boolean) => void;
  cpuHistory: number[];
  ramHistory: number[];
  networkHistory: { up: number; down: number }[];
  thermalHistory: number[];
  internetBlocked: boolean;
  setInternetBlocked: (v: boolean) => void;
  dozeEnabled: boolean;
  setDozeEnabled: (v: boolean) => void;
  gpuPerfMode: boolean;
  setGpuPerfMode: (v: boolean) => void;
  screenLimiter: boolean;
  setScreenLimiter: (v: boolean) => void;
  governor: string;
  setGovernor: (g: string) => void;
  isLoading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function fluctuate(current: number, delta: number, min: number, max: number) {
  return Math.max(min, Math.min(max, current + randomBetween(-delta, delta)));
}

function getBatteryStateLabel(state: Battery.BatteryState): string {
  switch (state) {
    case Battery.BatteryState.CHARGING: return "CHARGING";
    case Battery.BatteryState.FULL: return "FULL";
    case Battery.BatteryState.UNPLUGGED: return "DISCHARGING";
    default: return "UNKNOWN";
  }
}

function getNetworkTypeLabel(type: Network.NetworkStateType): string {
  switch (type) {
    case Network.NetworkStateType.WIFI: return "Wi-Fi";
    case Network.NetworkStateType.CELLULAR: return "LTE";
    case Network.NetworkStateType.NONE: return "Offline";
    case Network.NetworkStateType.BLUETOOTH: return "Bluetooth";
    case Network.NetworkStateType.ETHERNET: return "Ethernet";
    default: return "Unknown";
  }
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

const INITIAL_SERVICES: ServiceItem[] = [
  { id: "s1", name: "SystemServer", pid: 1042, cpu: 2.1, ram: 48, status: "running", type: "system", packageName: "android", duration: 86400, suspicious: false },
  { id: "s2", name: "SurfaceFlinger", pid: 1088, cpu: 3.4, ram: 32, status: "running", type: "system", packageName: "android", duration: 86400, suspicious: false },
  { id: "s3", name: "InputMethodService", pid: 2211, cpu: 0.2, ram: 18, status: "running", type: "foreground", packageName: "com.google.android.inputmethod.latin", duration: 3600, suspicious: false },
  { id: "s4", name: "PackageManagerService", pid: 1134, cpu: 1.8, ram: 28, status: "running", type: "system", packageName: "android", duration: 86400, suspicious: false },
  { id: "s5", name: "LocationManagerService", pid: 1178, cpu: 0.9, ram: 14, status: "sleeping", type: "system", packageName: "com.android.location.fused", duration: 86400, suspicious: false },
  { id: "s6", name: "TelephonyRegistry", pid: 1205, cpu: 0.1, ram: 8, status: "running", type: "system", packageName: "android", duration: 86400, suspicious: false },
  { id: "s7", name: "UnknownBackgroundSync", pid: 4455, cpu: 8.9, ram: 64, status: "running", type: "background", packageName: "com.unknown.sync.service", duration: 720, suspicious: true },
  { id: "s8", name: "MediaSessionService", pid: 1302, cpu: 1.2, ram: 22, status: "sleeping", type: "system", packageName: "android.media", duration: 86400, suspicious: false },
  { id: "s9", name: "GooglePlayServices", pid: 3311, cpu: 4.2, ram: 82, status: "running", type: "user", packageName: "com.google.android.gms", duration: 7200, suspicious: false },
  { id: "s10", name: "ZombieProcess", pid: 6677, cpu: 0.0, ram: 0, status: "zombie", type: "background", packageName: "com.dead.app", duration: 120, suspicious: true },
  { id: "s11", name: "CameraService", pid: 1399, cpu: 0.3, ram: 16, status: "sleeping", type: "system", packageName: "android.hardware.camera.provider", duration: 86400, suspicious: false },
  { id: "s12", name: "WifiService", pid: 1420, cpu: 0.7, ram: 12, status: "running", type: "system", packageName: "android.net.wifi", duration: 86400, suspicious: false },
  { id: "s13", name: "AudioFlinger", pid: 1501, cpu: 0.5, ram: 20, status: "running", type: "system", packageName: "android.hardware.audio", duration: 86400, suspicious: false },
  { id: "s14", name: "BluetoothManagerService", pid: 1560, cpu: 0.2, ram: 10, status: "sleeping", type: "system", packageName: "android.bluetooth", duration: 86400, suspicious: false },
];

const INITIAL_CONNECTIONS: ConnectionItem[] = [
  { id: "c1", localAddr: "192.168.1.100", localPort: 49821, remoteAddr: "142.250.80.46", remotePort: 443, state: "ESTABLISHED", appName: "Chrome", protocol: "TCP", sent: 1240, received: 8920, country: "US", countryFlag: "🇺🇸", hostname: "google.com", suspicious: false },
  { id: "c2", localAddr: "192.168.1.100", localPort: 50123, remoteAddr: "157.240.22.35", remotePort: 443, state: "ESTABLISHED", appName: "Instagram", protocol: "TCP", sent: 540, received: 12400, country: "US", countryFlag: "🇺🇸", hostname: "instagram.com", suspicious: false },
  { id: "c3", localAddr: "192.168.1.100", localPort: 52001, remoteAddr: "91.108.4.1", remotePort: 443, state: "ESTABLISHED", appName: "Telegram", protocol: "TCP", sent: 234, received: 3400, country: "NL", countryFlag: "🇳🇱", hostname: "telegram.org", suspicious: false },
  { id: "c4", localAddr: "192.168.1.100", localPort: 53411, remoteAddr: "185.199.109.1", remotePort: 80, state: "ESTABLISHED", appName: "UnknownApp", protocol: "TCP", sent: 890, received: 450, country: "RU", countryFlag: "🇷🇺", hostname: "185.199.109.1", suspicious: true },
  { id: "c5", localAddr: "0.0.0.0", localPort: 5555, remoteAddr: "0.0.0.0", remotePort: 0, state: "LISTEN", appName: "ADB Daemon", protocol: "TCP", sent: 0, received: 0, country: "--", countryFlag: "🔓", hostname: "localhost", suspicious: true },
  { id: "c6", localAddr: "192.168.1.100", localPort: 55810, remoteAddr: "8.8.8.8", remotePort: 53, state: "ESTABLISHED", appName: "System DNS", protocol: "UDP", sent: 64, received: 128, country: "US", countryFlag: "🇺🇸", hostname: "dns.google", suspicious: false },
  { id: "c7", localAddr: "192.168.1.100", localPort: 56111, remoteAddr: "31.13.80.36", remotePort: 443, state: "ESTABLISHED", appName: "Facebook", protocol: "TCP", sent: 320, received: 4800, country: "US", countryFlag: "🇺🇸", hostname: "facebook.com", suspicious: false },
];

const INITIAL_PROCESSES: ProcessItem[] = [
  { id: "p1", name: "init", pid: 1, ppid: 0, cpu: 0.1, rss: 4096, state: "S", user: "root", children: [
    { id: "p2", name: "zygote64", pid: 512, ppid: 1, cpu: 1.2, rss: 32768, state: "S", user: "root", children: [
      { id: "p3", name: "system_server", pid: 1042, ppid: 512, cpu: 2.1, rss: 49152, state: "S", user: "system", children: [] },
      { id: "p4", name: "com.android.launcher3", pid: 2100, ppid: 512, cpu: 0.8, rss: 28672, state: "S", user: "app", children: [] },
      { id: "p5", name: "com.google.android.gms", pid: 3311, ppid: 512, cpu: 4.2, rss: 83968, state: "S", user: "app", children: [] },
      { id: "p11", name: "com.unknown.spyware", pid: 5512, ppid: 512, cpu: 6.8, rss: 61440, state: "R", user: "app", children: [] },
    ]},
    { id: "p6", name: "surfaceflinger", pid: 1088, ppid: 1, cpu: 3.4, rss: 32768, state: "R", user: "system", children: [] },
    { id: "p7", name: "mediaserver", pid: 1302, ppid: 1, cpu: 1.2, rss: 22528, state: "S", user: "system", children: [] },
  ]},
  { id: "p8", name: "kthreadd", pid: 2, ppid: 0, cpu: 0.0, rss: 0, state: "S", user: "root", children: [
    { id: "p9", name: "kworker/0:1H", pid: 45, ppid: 2, cpu: 0.3, rss: 0, state: "S", user: "root", children: [] },
    { id: "p10", name: "ksoftirqd/0", pid: 14, ppid: 2, cpu: 0.1, rss: 0, state: "S", user: "root", children: [] },
  ]},
];

const INITIAL_PERMISSIONS: PermissionItem[] = [
  { id: "pm1", appName: "Instagram", permission: "Camera", lastUsed: Date.now() - 120000, active: true, icon: "camera" },
  { id: "pm2", appName: "WhatsApp", permission: "Microphone", lastUsed: Date.now() - 600000, active: false, icon: "mic" },
  { id: "pm3", appName: "Google Maps", permission: "Location", lastUsed: Date.now() - 30000, active: true, icon: "map-pin" },
  { id: "pm4", appName: "Files", permission: "Storage", lastUsed: Date.now() - 3600000, active: false, icon: "folder" },
  { id: "pm5", appName: "Phone", permission: "Phone", lastUsed: Date.now() - 7200000, active: false, icon: "phone" },
  { id: "pm6", appName: "UnknownApp", permission: "Microphone", lastUsed: Date.now() - 60000, active: true, icon: "mic" },
  { id: "pm7", appName: "TikTok", permission: "Camera", lastUsed: Date.now() - 1800000, active: false, icon: "camera" },
  { id: "pm8", appName: "Uber", permission: "Location", lastUsed: Date.now() - 900000, active: false, icon: "map-pin" },
];

const INITIAL_NETWORK_APPS: NetworkAppItem[] = [
  { id: "na1", appName: "Chrome", uploadSpeed: 12, downloadSpeed: 245, totalToday: 148, totalWeek: 892, totalMonth: 3420, blocked: false },
  { id: "na2", appName: "YouTube", uploadSpeed: 2, downloadSpeed: 1840, totalToday: 2100, totalWeek: 12400, totalMonth: 48000, blocked: false },
  { id: "na3", appName: "Instagram", uploadSpeed: 45, downloadSpeed: 680, totalToday: 420, totalWeek: 2100, totalMonth: 8200, blocked: false },
  { id: "na4", appName: "Telegram", uploadSpeed: 8, downloadSpeed: 120, totalToday: 84, totalWeek: 440, totalMonth: 1800, blocked: false },
  { id: "na5", appName: "Google Play", uploadSpeed: 0, downloadSpeed: 320, totalToday: 240, totalWeek: 1200, totalMonth: 4800, blocked: false },
  { id: "na6", appName: "UnknownSync", uploadSpeed: 98, downloadSpeed: 12, totalToday: 580, totalWeek: 2900, totalMonth: 11600, blocked: false },
  { id: "na7", appName: "WhatsApp", uploadSpeed: 22, downloadSpeed: 88, totalToday: 96, totalWeek: 480, totalMonth: 1920, blocked: false },
];

const INITIAL_SECURITY: SecurityItem[] = [
  { id: "sec1", type: "root_access", appName: "Magisk Manager", packageName: "com.topjohnwu.magisk", dangerous: false, description: "Root manager — controls root permission grants system-wide" },
  { id: "sec2", type: "root_access", appName: "UnknownApp", packageName: "com.unknown.root.exploit", dangerous: true, description: "Unknown app has undeclared root access — possible exploit" },
  { id: "sec3", type: "device_admin", appName: "MDM Profile", packageName: "com.mdm.enterprise.agent", dangerous: true, description: "Device administrator — can remotely wipe and lock device" },
  { id: "sec4", type: "accessibility", appName: "Tasker", packageName: "net.dinglisch.android.taskerm", dangerous: false, description: "Automation app using accessibility API for screen reading" },
  { id: "sec5", type: "accessibility", appName: "ClipboardSpy", packageName: "com.clipboard.monitor", dangerous: true, description: "Reads clipboard content via accessibility — possible data theft" },
  { id: "sec6", type: "battery_exempt", appName: "Google Play Services", packageName: "com.google.android.gms", dangerous: false, description: "Excluded from Doze battery optimization by system" },
  { id: "sec7", type: "battery_exempt", appName: "WhatsApp", packageName: "com.whatsapp", dangerous: false, description: "Excluded from battery optimization for push notifications" },
  { id: "sec8", type: "autostart", appName: "TrackingSDK", packageName: "com.tracking.analytics.boot", dangerous: true, description: "Registers BOOT_COMPLETED receiver — starts silently at every reboot" },
];

const INITIAL_THERMAL: ThermalZone[] = [
  { id: "t1", label: "CPU", value: 42, max: 95, color: "#00D4FF" },
  { id: "t2", label: "GPU", value: 38, max: 90, color: "#7B2FFF" },
  { id: "t3", label: "Battery", value: 35, max: 60, color: "#00FF88" },
  { id: "t4", label: "Board", value: 40, max: 80, color: "#FFB800" },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const SystemContext = createContext<SystemContextValue | null>(null);

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  // Real device data from APIs
  const [batteryLevel, setBatteryLevel] = useState(0.78);
  const [batteryState, setBatteryState] = useState<Battery.BatteryState>(Battery.BatteryState.UNPLUGGED);
  const [networkState, setNetworkState] = useState<Network.NetworkState>({ isConnected: true, type: Network.NetworkStateType.WIFI, isInternetReachable: true });
  const [ipAddress, setIpAddress] = useState("192.168.1.100");
  const [screenBrightness, setScreenBrightnessState] = useState(0.5);

  // Simulated-but-realistic stats
  const [stats, setStats] = useState<SystemStats>({
    cpuPercent: 23,
    cpuCores: Device.supportedCpuArchitectures?.length ?? 8,
    ramUsed: 3200,
    ramTotal: Device.totalMemory ? Math.round(Device.totalMemory / 1024 / 1024) : 6144,
    ramPercent: 39,
    batteryLevel: 78,
    batteryCharging: false,
    batteryState: Battery.BatteryState.UNPLUGGED,
    temperature: 38,
    networkUp: 45,
    networkDown: 320,
    uptime: 86400,
    screenBrightness: 0.5,
    deviceName: Device.deviceName ?? "Android Device",
    osVersion: Device.osVersion ?? "13",
    androidApiLevel: Device.platformApiLevel ?? null,
    manufacturer: Device.manufacturer ?? "Unknown",
    modelName: Device.modelName ?? "Unknown",
    isRooted: Device.isRootedExperimentalAsync ? null : null,
    isEmulator: Device.isDevice === false,
    networkType: "Wi-Fi",
    isConnected: true,
    isAirplaneMode: false,
    ipAddress: "192.168.1.100",
  });

  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [connections, setConnections] = useState<ConnectionItem[]>(INITIAL_CONNECTIONS);
  const [processes, setProcesses] = useState<ProcessItem[]>(INITIAL_PROCESSES);
  const [permissions, setPermissions] = useState<PermissionItem[]>(INITIAL_PERMISSIONS);
  const [networkApps, setNetworkApps] = useState<NetworkAppItem[]>(INITIAL_NETWORK_APPS);
  const [securityItems, setSecurityItems] = useState<SecurityItem[]>(INITIAL_SECURITY);
  const [thermalZones, setThermalZones] = useState<ThermalZone[]>(INITIAL_THERMAL);

  const [cpuHistory] = useState<number[]>(() => Array(60).fill(0).map(() => randomBetween(10, 40)));
  const [ramHistory] = useState<number[]>(() => Array(60).fill(0).map(() => randomBetween(35, 55)));
  const [networkHistory] = useState<{ up: number; down: number }[]>(() =>
    Array(60).fill(null).map(() => ({ up: randomBetween(10, 80), down: randomBetween(50, 400) }))
  );
  const [thermalHistory, setThermalHistory] = useState<number[]>(() => Array(60).fill(38));

  const cpuHistoryRef = useRef(cpuHistory);
  const ramHistoryRef = useRef(ramHistory);
  const networkHistoryRef = useRef(networkHistory);

  const [internetBlocked, setInternetBlocked] = useState(false);
  const [dozeEnabled, setDozeEnabled] = useState(false);
  const [gpuPerfMode, setGpuPerfMode] = useState(false);
  const [screenLimiter, setScreenLimiter] = useState(false);
  const [governor, setGovernor] = useState("schedutil");

  // ── Load real device data ──────────────────────────────────────────────────
  useEffect(() => {
    async function loadRealData() {
      try {
        // Battery
        const [level, state, lowPower] = await Promise.all([
          Battery.getBatteryLevelAsync(),
          Battery.getBatteryStateAsync(),
          Battery.isLowPowerModeEnabledAsync().catch(() => false),
        ]);
        setBatteryLevel(level);
        setBatteryState(state);

        // Network
        const [netState, ip] = await Promise.all([
          Network.getNetworkStateAsync(),
          Network.getIpAddressAsync().catch(() => "N/A"),
        ]);
        setNetworkState(netState);
        setIpAddress(ip);

        // Brightness
        const { status } = await Brightness.requestPermissionsAsync();
        if (status === "granted") {
          const b = await Brightness.getBrightnessAsync();
          setScreenBrightnessState(b);
        }

        // Root check
        let rooted: boolean | null = null;
        try {
          rooted = await Device.isRootedExperimentalAsync();
        } catch {}

        const ram = Device.totalMemory ? Math.round(Device.totalMemory / 1024 / 1024) : 6144;
        const ramUsed = Math.round(ram * randomBetween(0.35, 0.65));

        setStats(prev => ({
          ...prev,
          batteryLevel: Math.round(level * 100),
          batteryCharging: state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL,
          batteryState: state,
          screenBrightness: (await Brightness.getBrightnessAsync().catch(() => 0.5)),
          deviceName: Device.deviceName ?? prev.deviceName,
          osVersion: Device.osVersion ?? prev.osVersion,
          androidApiLevel: Device.platformApiLevel ?? prev.androidApiLevel,
          manufacturer: Device.manufacturer ?? prev.manufacturer,
          modelName: Device.modelName ?? prev.modelName,
          isRooted: rooted,
          isEmulator: !Device.isDevice,
          networkType: getNetworkTypeLabel(netState.type ?? Network.NetworkStateType.NONE),
          isConnected: netState.isConnected ?? false,
          ipAddress: ip,
          ramTotal: ram,
          ramUsed,
          ramPercent: (ramUsed / ram) * 100,
        }));

        // Update security if rooted
        if (rooted) {
          setSecurityItems(prev => [
            { id: "sec_root_real", type: "root_access", appName: "System (Real Root)", packageName: "android.root", dangerous: false, description: "Device is rooted — root access confirmed via system API" },
            ...prev,
          ]);
        }

      } catch (e) {
        // Silently fall back to simulated data
      } finally {
        setIsLoading(false);
      }
    }

    loadRealData();
  }, []);

  // ── Battery live subscription ──────────────────────────────────────────────
  useEffect(() => {
    const sub1 = Battery.addBatteryLevelListener(({ batteryLevel: level }) => {
      setBatteryLevel(level);
      setStats(prev => ({
        ...prev,
        batteryLevel: Math.round(level * 100),
      }));
    });
    const sub2 = Battery.addBatteryStateListener(({ batteryState: state }) => {
      setBatteryState(state);
      setStats(prev => ({
        ...prev,
        batteryCharging: state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL,
        batteryState: state,
      }));
    });
    return () => { sub1.remove(); sub2.remove(); };
  }, []);

  // ── Network live subscription ──────────────────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    interval = setInterval(async () => {
      try {
        const netState = await Network.getNetworkStateAsync();
        setNetworkState(netState);
        setStats(prev => ({
          ...prev,
          networkType: getNetworkTypeLabel(netState.type ?? Network.NetworkStateType.NONE),
          isConnected: netState.isConnected ?? false,
        }));
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Simulate CPU/RAM/Thermal/Network ticks ─────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => {
        // CPU: higher if doze disabled, lower if screen limiter on
        const cpuBase = dozeEnabled ? 8 : gpuPerfMode ? 60 : screenLimiter ? 15 : 23;
        const cpu = fluctuate(prev.cpuPercent, 4, cpuBase - 10, cpuBase + 30);
        const ramUsed = fluctuate(prev.ramUsed, 80, 1500, prev.ramTotal * 0.9);
        const ramPercent = (ramUsed / prev.ramTotal) * 100;
        // Thermal: rises with CPU load
        const tempDelta = cpu > 70 ? 0.4 : cpu > 40 ? 0.1 : -0.1;
        const temp = Math.max(32, Math.min(65, prev.temperature + tempDelta + randomBetween(-0.2, 0.2)));
        const up = internetBlocked ? 0 : fluctuate(prev.networkUp, 15, 0, 400);
        const down = internetBlocked ? 0 : fluctuate(prev.networkDown, 40, 0, 1800);

        cpuHistoryRef.current = [...cpuHistoryRef.current.slice(1), cpu];
        ramHistoryRef.current = [...ramHistoryRef.current.slice(1), ramPercent];
        networkHistoryRef.current = [...networkHistoryRef.current.slice(1), { up, down }];

        return {
          ...prev,
          cpuPercent: cpu,
          ramUsed: Math.round(ramUsed),
          ramPercent,
          temperature: temp,
          networkUp: up,
          networkDown: down,
          uptime: prev.uptime + 1,
        };
      });

      setThermalZones(prev => prev.map(z => ({
        ...z,
        value: fluctuate(z.value, 0.8, 28, z.max - 5),
      })));

      setThermalHistory(h => {
        const latest = thermalZones[0]?.value ?? 38;
        return [...h.slice(1), latest];
      });

      setServices(prev => prev.map(s => ({
        ...s,
        cpu: fluctuate(s.cpu, 0.4, 0, 20),
        ram: fluctuate(s.ram, 1, 4, 180),
        duration: s.duration + 1,
      })));

      setNetworkApps(prev => prev.map(a => ({
        ...a,
        uploadSpeed: a.blocked || internetBlocked ? 0 : fluctuate(a.uploadSpeed, 8, 0, 180),
        downloadSpeed: a.blocked || internetBlocked ? 0 : fluctuate(a.downloadSpeed, 25, 0, 1800),
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, [dozeEnabled, gpuPerfMode, screenLimiter, internetBlocked]);

  useEffect(() => {
    const interval = setInterval(() => {
      setConnections(prev => prev.map(c => ({
        ...c,
        sent: c.sent + Math.floor(randomBetween(0, 18)),
        received: c.received + Math.floor(randomBetween(0, 90)),
      })));
      setPermissions(prev => prev.map(p => ({
        ...p,
        active: p.active ? Math.random() > 0.08 : Math.random() > 0.96,
        lastUsed: p.active ? Date.now() : p.lastUsed,
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const killService = useCallback((id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  }, []);

  const blockConnection = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  const killProcess = useCallback((id: string) => {
    const removeById = (items: ProcessItem[]): ProcessItem[] =>
      items.filter(p => p.id !== id).map(p => ({ ...p, children: removeById(p.children) }));
    setProcesses(prev => removeById(prev));
  }, []);

  const toggleNetworkBlock = useCallback((id: string) => {
    setNetworkApps(prev => prev.map(a => a.id === id ? { ...a, blocked: !a.blocked } : a));
  }, []);

  const revokeSecurityItem = useCallback((id: string) => {
    setSecurityItems(prev => prev.filter(s => s.id !== id));
  }, []);

  const revokePermission = useCallback((id: string) => {
    setPermissions(prev => prev.filter(p => p.id !== id));
  }, []);

  const setBrightness = useCallback(async (level: number) => {
    setScreenBrightnessState(level);
    setStats(prev => ({ ...prev, screenBrightness: level }));
    try {
      await Brightness.setSystemBrightnessAsync(level);
    } catch {}
  }, []);

  const killAllBackground = useCallback(() => {
    setServices(prev => prev.filter(s => s.type !== "background" || s.type === "system"));
    setStats(prev => ({ ...prev, cpuPercent: Math.max(5, prev.cpuPercent - 15), ramUsed: Math.max(1200, prev.ramUsed - 800) }));
  }, []);

  const clearRamCache = useCallback(() => {
    setStats(prev => ({
      ...prev,
      ramUsed: Math.round(prev.ramUsed * 0.65),
      ramPercent: (prev.ramUsed * 0.65 / prev.ramTotal) * 100,
    }));
  }, []);

  const forceDoze = useCallback((enable: boolean) => {
    setDozeEnabled(enable);
    if (enable) {
      setStats(prev => ({ ...prev, cpuPercent: Math.max(3, prev.cpuPercent * 0.3) }));
    }
  }, []);

  const suspiciousCount =
    services.filter(s => s.suspicious).length +
    connections.filter(c => c.suspicious).length +
    securityItems.filter(s => s.dangerous).length;

  return (
    <SystemContext.Provider value={{
      stats, services, connections, processes, permissions, networkApps,
      securityItems, thermalZones, suspiciousCount,
      killService, blockConnection, killProcess, toggleNetworkBlock,
      revokeSecurityItem, revokePermission, setBrightness,
      killAllBackground, clearRamCache, forceDoze,
      cpuHistory: cpuHistoryRef.current,
      ramHistory: ramHistoryRef.current,
      networkHistory: networkHistoryRef.current,
      thermalHistory,
      internetBlocked, setInternetBlocked,
      dozeEnabled, setDozeEnabled,
      gpuPerfMode, setGpuPerfMode,
      screenLimiter, setScreenLimiter,
      governor, setGovernor,
      isLoading,
    }}>
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error("useSystem must be used within SystemProvider");
  return ctx;
}
