import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";

const STORAGE_KEY = "yachtworth.coming_soon_notify";

export type ComingSoonModalProps = {
  visible: boolean;
  toolKey: string;
  toolName: string;
  toolDescription?: string;
  toolIcon: React.ComponentProps<typeof Feather>["name"];
  onClose: () => void;
};

export function ComingSoonModal({
  visible,
  toolKey,
  toolName,
  toolDescription,
  toolIcon,
  onClose,
}: ComingSoonModalProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleNotify = async () => {
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(toolKey)) {
        list.push(toolKey);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1100);
    } catch {
      Alert.alert("Couldn't save", "Please try again later.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name={toolIcon} size={28} color={GOLD} />
          </View>
          <Text style={styles.kicker}>COMING SOON</Text>
          <Text style={styles.title}>{toolName}</Text>
          <Text style={styles.text}>
            {toolDescription ??
              "We're building this now. Get notified the moment it goes live."}
          </Text>
          <Pressable
            onPress={handleNotify}
            disabled={saving || saved}
            accessibilityRole="button"
            accessibilityLabel={
              saved ? "Notification saved" : `Notify me when ${toolName} is ready`
            }
            style={({ pressed }) => [
              styles.primary,
              { opacity: pressed || saving ? 0.85 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={NAVY} />
            ) : saved ? (
              <>
                <Feather name="check" size={16} color={NAVY} />
                <Text style={styles.primaryText}>We'll let you know</Text>
              </>
            ) : (
              <>
                <Feather name="bell" size={16} color={NAVY} />
                <Text style={styles.primaryText}>Notify me when ready</Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.secondaryText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "rgba(8,22,51,0.7)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: NAVY_DEEP,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.35)",
    padding: 26,
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(201,169,97,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 10,
  },
  text: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 22,
  },
  primary: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
    marginBottom: 10,
  },
  primaryText: {
    color: NAVY,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  secondary: {
    borderRadius: 12,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(247,243,236,0.18)",
  },
  secondaryText: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 13 },
});
