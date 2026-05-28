import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  EMPTY_PROFILE,
  loadSurveyorProfile,
  saveSurveyorProfile,
  type SurveyorProfile,
} from "../lib/surveyorProfile";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.08)";

export default function SurveyorProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profile, setProfile] = useState<SurveyorProfile>(EMPTY_PROFILE);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSurveyorProfile().then((p) => {
      setProfile(p);
      setLoaded(true);
    });
  }, []);

  const set = <K extends keyof SurveyorProfile>(k: K, v: SurveyorProfile[K]) =>
    setProfile((prev) => ({ ...prev, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    try {
      await saveSurveyorProfile(profile);
      Alert.alert("Saved", "Your surveyor details will pre-fill new surveys.");
      router.back();
    } catch {
      Alert.alert("Save failed", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 70,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 22,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={IVORY} />
        </Pressable>

        <Text style={styles.kicker}>SURVEY DEFAULTS</Text>
        <Text style={styles.title}>Surveyor profile</Text>
        <Text style={styles.subtitle}>
          These details pre-fill every new survey report.
        </Text>

        <Field label="Full name" value={profile.name} onChange={(v) => set("name", v)} />
        <Field
          label="Qualification (YDSA / IIMS / etc.)"
          value={profile.qualification}
          onChange={(v) => set("qualification", v)}
        />
        <Field
          label="Company"
          value={profile.company}
          onChange={(v) => set("company", v)}
        />
        <Field
          label="Phone"
          value={profile.phone}
          onChange={(v) => set("phone", v)}
          keyboardType="phone-pad"
        />
        <Field
          label="Email"
          value={profile.email}
          onChange={(v) => set("email", v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={onSave}
          disabled={!loaded || saving}
          style={({ pressed }) => [
            styles.saveBtn,
            { opacity: pressed || saving || !loaded ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save profile"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={styles.input}
        placeholderTextColor={MUTED}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 28,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 6,
    marginBottom: 22,
  },
  field: { marginBottom: 14 },
  label: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: NAVY_DEEP,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  saveBtn: {
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: NAVY,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
