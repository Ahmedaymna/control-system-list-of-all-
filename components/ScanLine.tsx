import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, Dimensions } from "react-native";

const { height } = Dimensions.get("window");

export function ScanLine() {
  const translateY = useRef(new Animated.Value(-2)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateY, {
        toValue: height,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.line,
          { transform: [{ translateY }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#00D4FF08",
    shadowColor: "#00D4FF",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
