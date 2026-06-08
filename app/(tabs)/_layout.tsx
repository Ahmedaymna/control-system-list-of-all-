import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSystem } from "@/context/SystemContext";
import { SoundManager } from "@/utils/SoundManager";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = true;
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();
  const { suspiciousCount } = useSystem();

  React.useEffect(() => { SoundManager.preload(); }, []);

  return (
    <Tabs
      screenListeners={{ tabPress: () => SoundManager.click() }}
      screenOptions={{
        tabBarActiveTintColor: colors.neonCyan,
        tabBarInactiveTintColor: colors.secondaryText,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.card },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 9,
          fontFamily: "Inter_600SemiBold",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Ionicons name="grid" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: "Services",
          tabBarIcon: ({ color }) => <Ionicons name="apps" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: "Network",
          tabBarIcon: ({ color }) => (
            <View>
              <Ionicons name="globe" size={20} color={color} />
              {suspiciousCount > 0 && (
                <View style={{
                  position: "absolute",
                  top: -2,
                  right: -4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.neonRed,
                }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="processes"
        options={{
          title: "Processes",
          tabBarIcon: ({ color }) => <Ionicons name="list" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="permissions"
        options={{
          title: "Perms",
          tabBarIcon: ({ color }) => <Ionicons name="eye" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: "Data",
          tabBarIcon: ({ color }) => <Ionicons name="cellular" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="security"
        options={{
          title: "Security",
          tabBarIcon: ({ color }) => <Ionicons name="shield" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="controls"
        options={{
          title: "Controls",
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
