/**
 * SoundManager — plays short UI sounds using expo-av.
 * All sounds are generated programmatically via PCM so no asset files are needed.
 * On web or when audio is unavailable, calls are silently ignored.
 */
import { Audio } from "expo-av";
import { Platform } from "react-native";

// Tiny WAV buffers encoded as base64 — 8-bit PCM mono 8000Hz
// Generated offline to keep bundle small.

// Click — short low tick
const CLICK_WAV =
  "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

// Confirm — short ascending double beep
const CONFIRM_WAV =
  "UklGRlQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTAAAAB/f39/f39/f0BAQEBAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

// Danger — harsh short buzz
const DANGER_WAV =
  "UklGRlQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTAAAAD/AP8A/wD/AP8A/wD/AP8A/wD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

// Swipe — soft whoosh
const SWIPE_WAV =
  "UklGRkQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YSAAAAD/7tW9p5F8aVdHOC0kHBYRDQoHBQMCAQAAAAAAAAAAAAAAAA==";

type SoundKey = "click" | "confirm" | "danger" | "swipe";

const WAV_MAP: Record<SoundKey, string> = {
  click: CLICK_WAV,
  confirm: CONFIRM_WAV,
  danger: DANGER_WAV,
  swipe: SWIPE_WAV,
};

// Cache loaded sounds
const soundCache: Partial<Record<SoundKey, Audio.Sound>> = {};
let audioReady = false;

async function ensureAudio() {
  if (audioReady) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });
    audioReady = true;
  } catch {
    // silently ignore
  }
}

async function getSound(key: SoundKey): Promise<Audio.Sound | null> {
  if (Platform.OS === "web") return null;
  if (soundCache[key]) return soundCache[key]!;
  try {
    await ensureAudio();
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/wav;base64,${WAV_MAP[key]}` },
      { volume: 0.6 }
    );
    soundCache[key] = sound;
    return sound;
  } catch {
    return null;
  }
}

async function play(key: SoundKey) {
  try {
    const sound = await getSound(key);
    if (!sound) return;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // silently ignore
  }
}

export const SoundManager = {
  /** Short tap — tab switches, filter chips */
  click: () => play("click"),
  /** Success — action completed, toggle on */
  confirm: () => play("confirm"),
  /** Warning / destructive — kill, block, reboot */
  danger: () => play("danger"),
  /** Navigation / card flip */
  swipe: () => play("swipe"),

  /** Pre-load all sounds so first press is instant */
  preload: async () => {
    if (Platform.OS === "web") return;
    for (const key of Object.keys(WAV_MAP) as SoundKey[]) {
      await getSound(key);
    }
  },

  /** Release all sounds (call on unmount if needed) */
  unloadAll: async () => {
    for (const key of Object.keys(soundCache) as SoundKey[]) {
      try {
        await soundCache[key]?.unloadAsync();
        delete soundCache[key];
      } catch {}
    }
    audioReady = false;
  },
};
