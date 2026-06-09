import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";

export interface SystemStats {
  cpuPercent: number; cpuCores: number; ramUsed: number; ramTotal: number;
  ramPercent: number; batteryLevel: number; batteryCharging: boolean;
  batteryState: string; temperature: number; networkUp: number; networkDown: number;
  uptime: number; screenBrightness: number; deviceName: string; osVersion: string;
  androidApiLevel: number | null; manufacturer: string; modelName: string;
  isRooted: boolean | null; isEmulator: boolean; networkType: string;
  isConnected: boolean; isAirplaneMode: boolean; ipAddress: string;
}
export interface ServiceItem { id: string; name: string; pid: number; cpu: number; ram: number; status: "running"|"stopped"|"zombie"|"sleeping"; type: "system"|"user"|"foreground"|"background"; packageName: string; duration: number; suspicious: boolean; }
export interface ConnectionItem { id: string; localAddr: string; localPort: number; remoteAddr: string; remotePort: number; state: "ESTABLISHED"|"LISTEN"|"TIME_WAIT"|"CLOSE_WAIT"|"SYN_SENT"; appName: string; protocol: "TCP"|"UDP"; sent: number; received: number; country: string; countryFlag: string; hostname: string; suspicious: boolean; }
export interface ProcessItem { id: string; name: string; pid: number; ppid: number; cpu: number; rss: number; state: "R"|"S"|"Z"|"D"|"T"; user: "root"|"system"|"app"|"shell"; children: ProcessItem[]; }
export interface PermissionItem { id: string; appName: string; permission: "Camera"|"Microphone"|"Location"|"Storage"|"Phone"; lastUsed: number; active: boolean; icon: string; }
export interface NetworkAppItem { id: string; appName: string; uploadSpeed: number; downloadSpeed: number; totalToday: number; totalWeek: number; totalMonth: number; blocked: boolean; }
export interface SecurityItem { id: string; type: "root_access"|"device_admin"|"accessibility"|"battery_exempt"|"autostart"; appName: string; packageName: string; dangerous: boolean; description: string; }
export interface ThermalZone { id: string; label: string; value: number; max: number; color: string; }
export interface SystemContextValue {
  stats: SystemStats; services: ServiceItem[]; connections: ConnectionItem[];
  processes: ProcessItem[]; permissions: PermissionItem[]; networkApps: NetworkAppItem[];
  securityItems: SecurityItem[]; thermalZones: ThermalZone[]; suspiciousCount: number;
  killService: (id: string) => void; blockConnection: (id: string) => void;
  killProcess: (id: string) => void; toggleNetworkBlock: (id: string) => void;
  revokeSecurityItem: (id: string) => void; revokePermission: (id: string) => void;
  setBrightness: (level: number) => void; killAllBackground: () => void;
  clearRamCache: () => void; forceDoze: (enable: boolean) => void;
  cpuHistory: number[]; ramHistory: number[]; networkHistory: { up: number; down: number }[];
  thermalHistory: number[]; internetBlocked: boolean; setInternetBlocked: (v: boolean) => void;
  dozeEnabled: boolean; setDozeEnabled: (v: boolean) => void;
  gpuPerfMode: boolean; setGpuPerfMode: (v: boolean) => void;
  screenLimiter: boolean; setScreenLimiter: (v: boolean) => void;
  governor: string; setGovernor: (g: string) => void; isLoading: boolean;
}
function r(min: number, max: number) { return Math.random() * (max - min) + min; }
function fl(cur: number, d: number, min: number, max: number) { return Math.max(min, Math.min(max, cur + r(-d, d))); }
const SS: ServiceItem[] = [
  { id:"s1", name:"SystemServer", pid:1042, cpu:2.1, ram:48, status:"running", type:"system", packageName:"android", duration:86400, suspicious:false },
  { id:"s2", name:"SurfaceFlinger", pid:1088, cpu:3.4, ram:32, status:"running", type:"system", packageName:"android", duration:86400, suspicious:false },
  { id:"s7", name:"UnknownBackgroundSync", pid:4455, cpu:8.9, ram:64, status:"running", type:"background", packageName:"com.unknown.sync", duration:720, suspicious:true },
  { id:"s9", name:"GooglePlayServices", pid:3311, cpu:4.2, ram:82, status:"running", type:"user", packageName:"com.google.android.gms", duration:7200, suspicious:false },
];
const SC: ConnectionItem[] = [
  { id:"c1", localAddr:"192.168.1.100", localPort:49821, remoteAddr:"142.250.80.46", remotePort:443, state:"ESTABLISHED", appName:"Chrome", protocol:"TCP", sent:1240, received:8920, country:"US", countryFlag:"🇺🇸", hostname:"google.com", suspicious:false },
  { id:"c4", localAddr:"192.168.1.100", localPort:53411, remoteAddr:"185.199.109.1", remotePort:80, state:"ESTABLISHED", appName:"UnknownApp", protocol:"TCP", sent:890, received:450, country:"RU", countryFlag:"🇷🇺", hostname:"185.199.109.1", suspicious:true },
];
const SP: ProcessItem[] = [
  { id:"p1", name:"init", pid:1, ppid:0, cpu:0.1, rss:4096, state:"S", user:"root", children:[
    { id:"p2", name:"system_server", pid:1042, ppid:1, cpu:2.1, rss:49152, state:"S", user:"system", children:[] }
  ]}
];
const SPerm: PermissionItem[] = [
  { id:"pm1", appName:"Instagram", permission:"Camera", lastUsed:Date.now()-120000, active:true, icon:"camera" },
  { id:"pm2", appName:"WhatsApp", permission:"Microphone", lastUsed:Date.now()-600000, active:false, icon:"mic" },
];
const SNA: NetworkAppItem[] = [
  { id:"na1", appName:"Chrome", uploadSpeed:12, downloadSpeed:245, totalToday:148, totalWeek:892, totalMonth:3420, blocked:false },
  { id:"na2", appName:"YouTube", uploadSpeed:2, downloadSpeed:1840, totalToday:2100, totalWeek:12400, totalMonth:48000, blocked:false },
];
const SSec: SecurityItem[] = [
  { id:"sec2", type:"root_access", appName:"UnknownApp", packageName:"com.unknown.root", dangerous:true, description:"Unknown root access" },
  { id:"sec3", type:"device_admin", appName:"MDM Profile", packageName:"com.mdm.agent", dangerous:true, description:"Device admin" },
];
const ST: ThermalZone[] = [
  { id:"t1", label:"CPU", value:42, max:95, color:"#00D4FF" },
  { id:"t2", label:"GPU", value:38, max:90, color:"#7B2FFF" },
  { id:"t3", label:"Battery", value:35, max:60, color:"#00FF88" },
  { id:"t4", label:"Board", value:40, max:80, color:"#FFB800" },
];
const SystemContext = createContext<SystemContextValue | null>(null);
export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [isLoading] = useState(false);
  const [stats, setStats] = useState<SystemStats>({
    cpuPercent:23, cpuCores:8, ramUsed:3200, ramTotal:6144, ramPercent:39,
    batteryLevel:78, batteryCharging:false, batteryState:"UNPLUGGED",
    temperature:38, networkUp:45, networkDown:320, uptime:86400, screenBrightness:0.5,
    deviceName:"Android Device", osVersion:"13", androidApiLevel:33,
    manufacturer:"Unknown", modelName:"Unknown", isRooted:null, isEmulator:false,
    networkType:"Wi-Fi", isConnected:true, isAirplaneMode:false, ipAddress:"192.168.1.100",
  });
  const [services, setServices] = useState<ServiceItem[]>(SS);
  const [connections, setConnections] = useState<ConnectionItem[]>(SC);
  const [processes, setProcesses] = useState<ProcessItem[]>(SP);
  const [permissions, setPermissions] = useState<PermissionItem[]>(SPerm);
  const [networkApps, setNetworkApps] = useState<NetworkAppItem[]>(SNA);
  const [securityItems, setSecurityItems] = useState<SecurityItem[]>(SSec);
  const [thermalZones, setThermalZones] = useState<ThermalZone[]>(ST);
  const [cpuHistory] = useState<number[]>(() => Array(60).fill(0).map(() => r(10,40)));
  const [ramHistory] = useState<number[]>(() => Array(60).fill(0).map(() => r(35,55)));
  const [networkHistory] = useState<{up:number;down:number}[]>(() => Array(60).fill(null).map(() => ({up:r(10,80),down:r(50,400)})));
  const [thermalHistory, setThermalHistory] = useState<number[]>(() => Array(60).fill(38));
  const cpuHistoryRef = useRef(cpuHistory);
  const ramHistoryRef = useRef(ramHistory);
  const networkHistoryRef = useRef(networkHistory);
  const [internetBlocked, setInternetBlocked] = useState(false);
  const [dozeEnabled, setDozeEnabled] = useState(false);
  const [gpuPerfMode, setGpuPerfMode] = useState(false);
  const [screenLimiter, setScreenLimiter] = useState(false);
  const [governor, setGovernor] = useState("schedutil");
  useEffect(() => {
    const iv = setInterval(() => {
      setStats(prev => {
        const cpuBase = dozeEnabled ? 8 : gpuPerfMode ? 60 : screenLimiter ? 15 : 23;
        const cpu = fl(prev.cpuPercent, 4, cpuBase-10, cpuBase+30);
        const ramUsed = fl(prev.ramUsed, 80, 1500, prev.ramTotal*0.9);
        const ramPercent = (ramUsed/prev.ramTotal)*100;
        const temp = Math.max(32, Math.min(65, prev.temperature + (cpu>70?0.4:cpu>40?0.1:-0.1) + r(-0.2,0.2)));
        const up = internetBlocked ? 0 : fl(prev.networkUp, 15, 0, 400);
        const down = internetBlocked ? 0 : fl(prev.networkDown, 40, 0, 1800);
        cpuHistoryRef.current = [...cpuHistoryRef.current.slice(1), cpu];
        ramHistoryRef.current = [...ramHistoryRef.current.slice(1), ramPercent];
        networkHistoryRef.current = [...networkHistoryRef.current.slice(1), {up, down}];
        return {...prev, cpuPercent:cpu, ramUsed:Math.round(ramUsed), ramPercent, temperature:temp, networkUp:up, networkDown:down, uptime:prev.uptime+1};
      });
      setThermalZones(prev => prev.map(z => ({...z, value:fl(z.value,0.8,28,z.max-5)})));
      setThermalHistory(h => [...h.slice(1), 38]);
      setServices(prev => prev.map(s => ({...s, cpu:fl(s.cpu,0.4,0,20), ram:fl(s.ram,1,4,180), duration:s.duration+1})));
      setNetworkApps(prev => prev.map(a => ({...a, uploadSpeed:a.blocked||internetBlocked?0:fl(a.uploadSpeed,8,0,180), downloadSpeed:a.blocked||internetBlocked?0:fl(a.downloadSpeed,25,0,1800)})));
    }, 1000);
    return () => clearInterval(iv);
  }, [dozeEnabled, gpuPerfMode, screenLimiter, internetBlocked]);
  useEffect(() => {
    const iv = setInterval(() => {
      setConnections(prev => prev.map(c => ({...c, sent:c.sent+Math.floor(r(0,18)), received:c.received+Math.floor(r(0,90))})));
    }, 2000);
    return () => clearInterval(iv);
  }, []);
  const killService = useCallback((id: string) => { setServices(prev => prev.filter(s => s.id !== id)); }, []);
  const blockConnection = useCallback((id: string) => { setConnections(prev => prev.filter(c => c.id !== id)); }, []);
  const killProcess = useCallback((id: string) => {
    const rem = (items: ProcessItem[]): ProcessItem[] => items.filter(p => p.id !== id).map(p => ({...p, children:rem(p.children)}));
    setProcesses(prev => rem(prev));
  }, []);
  const toggleNetworkBlock = useCallback((id: string) => { setNetworkApps(prev => prev.map(a => a.id===id ? {...a, blocked:!a.blocked} : a)); }, []);
  const revokeSecurityItem = useCallback((id: string) => { setSecurityItems(prev => prev.filter(s => s.id !== id)); }, []);
  const revokePermission = useCallback((id: string) => { setPermissions(prev => prev.filter(p => p.id !== id)); }, []);
  const setBrightness = useCallback((level: number) => { setStats(prev => ({...prev, screenBrightness:level})); }, []);
  const killAllBackground = useCallback(() => { setServices(prev => prev.filter(s => s.type !== "background")); }, []);
  const clearRamCache = useCallback(() => { setStats(prev => ({...prev, ramUsed:Math.round(prev.ramUsed*0.65), ramPercent:(prev.ramUsed*0.65/prev.ramTotal)*100})); }, []);
  const forceDoze = useCallback((enable: boolean) => { setDozeEnabled(enable); }, []);
  const suspiciousCount = services.filter(s=>s.suspicious).length + connections.filter(c=>c.suspicious).length + securityItems.filter(s=>s.dangerous).length;
  return (
    <SystemContext.Provider value={{
      stats, services, connections, processes, permissions, networkApps,
      securityItems, thermalZones, suspiciousCount,
      killService, blockConnection, killProcess, toggleNetworkBlock,
      revokeSecurityItem, revokePermission, setBrightness,
      killAllBackground, clearRamCache, forceDoze,
      cpuHistory:cpuHistoryRef.current, ramHistory:ramHistoryRef.current,
      networkHistory:networkHistoryRef.current, thermalHistory,
      internetBlocked, setInternetBlocked, dozeEnabled, setDozeEnabled,
      gpuPerfMode, setGpuPerfMode, screenLimiter, setScreenLimiter,
      governor, setGovernor, isLoading,
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
