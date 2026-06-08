import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");
const NUM_PARTICLES = 30;

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  size: number;
  color: string;
}

const COLORS = ["#00D4FF", "#7B2FFF", "#00FF88", "#FFB800"];

function createParticle(): Particle {
  return {
    x: new Animated.Value(Math.random() * width),
    y: new Animated.Value(Math.random() * height),
    opacity: new Animated.Value(Math.random() * 0.6 + 0.1),
    size: Math.random() * 3 + 1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

export function ParticleBackground() {
  const particles = useRef<Particle[]>(
    Array.from({ length: NUM_PARTICLES }, createParticle)
  ).current;

  useEffect(() => {
    particles.forEach((p) => {
      const animateParticle = () => {
        Animated.parallel([
          Animated.timing(p.x, {
            toValue: Math.random() * width,
            duration: 8000 + Math.random() * 12000,
            useNativeDriver: true,
          }),
          Animated.timing(p.y, {
            toValue: Math.random() * height,
            duration: 8000 + Math.random() * 12000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(p.opacity, {
              toValue: Math.random() * 0.7 + 0.1,
              duration: 3000 + Math.random() * 3000,
              useNativeDriver: true,
            }),
            Animated.timing(p.opacity, {
              toValue: Math.random() * 0.2,
              duration: 3000 + Math.random() * 3000,
              useNativeDriver: true,
            }),
          ]),
        ]).start(animateParticle);
      };
      setTimeout(animateParticle, Math.random() * 3000);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              transform: [{ translateX: p.x }, { translateY: p.y }],
              opacity: p.opacity,
              shadowColor: p.color,
              shadowOpacity: 0.8,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
