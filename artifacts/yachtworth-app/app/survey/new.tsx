import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListSurveyReportsQueryKey,
  useCreateSurveyReport,
  useDeleteSurveyReport,
  useReplaceSurveyItems,
} from "@workspace/api-client-react";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
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

import { SECTION_TEMPLATES } from "../../lib/surveyTemplates";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const FAINT = "rgba(247,243,236,0.4)";
const DIVIDER = "rgba(247,243,236,0.08)";

type SectionKey = "vessel" | "client" | "surveyor" | "conditions";

const VESSEL_TYPES = ["Motor Yacht", "Sailing Yacht", "Catamaran", "Superyacht"];
const PURPOSES = ["Pre-purchase", "Insurance", "Annual", "Damage", "Other"];

export default function SurveyNewScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const qc = useQueryClient();
  const createM = useCreateSurveyReport();
  const replaceM = useReplaceSurveyItems();
  const deleteM = useDeleteSurveyReport();

  const [open, setOpen] = useState<SectionKey>("vessel");
  useFocusEffect(useCallback(() => setOpen("vessel"), []));

  // Vessel
  const [vesselName, setVesselName] = useState("");
  const [vesselType, setVesselType] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [flag, setFlag] = useState("");
  const [hin, setHin] = useState("");
  const [lying, setLying] = useState("");
  const [surveyDate, setSurveyDate] = useState(""); // ISO YYYY-MM-DD
  const [purpose, setPurpose] = useState("Pre-purchase");

  // Client
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Surveyor
  const [surveyorName, setSurveyorName] = useState("");
  const [qualification, setQualification] = useState("");
  const [company, setCompany] = useState("");
  const [surveyorPhone, setSurveyorPhone] = useState("");
  const [surveyorEmail, setSurveyorEmail] = useState("");

  // Conditions
  const [weather, setWeather] = useState("");
  const [seaState, setSeaState] = useState("");

  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const name = vesselName.trim();
    if (!name) {
      Alert.alert("Vessel name required", "Please enter the vessel name first.");
      setOpen("vessel");
      return;
    }
    setSaving(true);
    try {
      const yr = Number(yearBuilt);
      const created = await createM.mutateAsync({
        data: {
          vessel_name: name,
          vessel_type: vesselType || null,
          manufacturer: manufacturer.trim() || null,
          model: model.trim() || null,
          year_built: Number.isFinite(yr) && yr > 1800 ? yr : null,
          flag: flag.trim() || null,
          hin: hin.trim() || null,
          lying: lying.trim() || null,
          survey_date: surveyDate.trim() || null,
          survey_purpose: purpose,
          weather_conditions: weather.trim() || null,
          sea_state: seaState.trim() || null,
          client_name: clientName.trim() || null,
          client_email: clientEmail.trim() || null,
          client_phone: clientPhone.trim() || null,
          surveyor_name: surveyorName.trim() || null,
          surveyor_qualification: qualification.trim() || null,
          surveyor_company: company.trim() || null,
          surveyor_phone: surveyorPhone.trim() || null,
          surveyor_email: surveyorEmail.trim() || null,
        },
      });

      // Seed default items from 26-section templates
      const seedItems: Array<{
        section_number: number;
        section_name: string;
        item_number: string;
        description: string;
        sort_order: number;
        photo_urls: string[];
      }> = [];
      for (const sec of SECTION_TEMPLATES) {
        if (sec.kind !== "items" || !sec.items) continue;
        sec.items.forEach((it, idx) => {
          seedItems.push({
            section_number: sec.number,
            section_name: sec.name,
            item_number: it.number,
            description: it.description,
            sort_order: idx,
            photo_urls: [],
          });
        });
      }
      try {
        await replaceM.mutateAsync({ id: created.id, data: { items: seedItems } });
      } catch (seedErr) {
        // Roll back the empty report so user isn't left with a broken half-created row.
        try {
          await deleteM.mutateAsync({ id: created.id });
        } catch {
          /* best-effort rollback */
        }
        throw seedErr;
      }
      await qc.invalidateQueries({ queryKey: getListSurveyReportsQueryKey() });
      router.replace(`/survey/${created.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      Alert.alert("Could not create survey", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 67 : insets.top) + 56 }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingBottom: insets.bottom + 120,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Feather name="arrow-left" size={20} color={IVORY} />
          </Pressable>

          <Text style={styles.kicker}>NEW REPORT</Text>
          <Text style={styles.title}>Survey Setup</Text>
          <Text style={styles.subtitle}>
            Cover information. You can complete sections after saving.
          </Text>

          <Section
            label="Vessel"
            isOpen={open === "vessel"}
            onToggle={() => setOpen(open === "vessel" ? "client" : "vessel")}
          >
            <Field label="Vessel name *" value={vesselName} onChange={setVesselName} placeholder="Aurelia" />
            <PillRow
              label="Type"
              options={VESSEL_TYPES}
              value={vesselType}
              onChange={setVesselType}
            />
            <Field label="Manufacturer" value={manufacturer} onChange={setManufacturer} placeholder="Azimut" />
            <Field label="Model" value={model} onChange={setModel} placeholder="78 Fly" />
            <Field
              label="Year built"
              value={yearBuilt}
              onChange={setYearBuilt}
              keyboardType="number-pad"
              placeholder="2019"
            />
            <Field label="Flag / registration" value={flag} onChange={setFlag} placeholder="Malta" />
            <Field
              label="HIN (Hull ID)"
              value={hin}
              onChange={setHin}
              placeholder="IT-TRHT8509L922"
              autoCapitalize="characters"
            />
            <Field label="Lying (location)" value={lying} onChange={setLying} placeholder="Port Vauban, Antibes" />
            <Field
              label="Date of survey (YYYY-MM-DD)"
              value={surveyDate}
              onChange={setSurveyDate}
              placeholder="2026-05-28"
            />
            <PillRow label="Purpose" options={PURPOSES} value={purpose} onChange={setPurpose} />
          </Section>

          <Section
            label="Client"
            isOpen={open === "client"}
            onToggle={() => setOpen(open === "client" ? "surveyor" : "client")}
          >
            <Field label="Client name" value={clientName} onChange={setClientName} />
            <Field
              label="Client email"
              value={clientEmail}
              onChange={setClientEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="Client phone"
              value={clientPhone}
              onChange={setClientPhone}
              keyboardType="phone-pad"
            />
          </Section>

          <Section
            label="Surveyor"
            isOpen={open === "surveyor"}
            onToggle={() => setOpen(open === "surveyor" ? "conditions" : "surveyor")}
          >
            <Field label="Your name" value={surveyorName} onChange={setSurveyorName} />
            <Field
              label="Qualification"
              value={qualification}
              onChange={setQualification}
              placeholder="Dip.MS, YDSA, IIMS"
            />
            <Field label="Company" value={company} onChange={setCompany} />
            <Field
              label="Phone"
              value={surveyorPhone}
              onChange={setSurveyorPhone}
              keyboardType="phone-pad"
            />
            <Field
              label="Email"
              value={surveyorEmail}
              onChange={setSurveyorEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.note}>
              Logo + signature upload — coming in next update.
            </Text>
          </Section>

          <Section
            label="Conditions"
            isOpen={open === "conditions"}
            onToggle={() => setOpen(open === "conditions" ? "vessel" : "conditions")}
          >
            <Field
              label="Weather conditions"
              value={weather}
              onChange={setWeather}
              placeholder="Sunny and calm, wind 5kts"
            />
            <Field label="Sea state" value={seaState} onChange={setSeaState} placeholder="Calm" />
          </Section>
        </ScrollView>

        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={onSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { opacity: pressed || saving ? 0.85 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={NAVY} />
            ) : (
              <Text style={styles.saveBtnText}>Create Survey →</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Section({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Pressable onPress={onToggle} style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={MUTED} />
      </Pressable>
      {isOpen && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={FAINT}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        style={styles.input}
      />
    </View>
  );
}

function PillRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.pillRow}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={({ pressed }) => [
                styles.pill,
                active && styles.pillActive,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NAVY_ELEV,
    marginBottom: 14,
  },
  kicker: { color: GOLD, fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 2, marginBottom: 6 },
  title: { color: IVORY, fontFamily: "Gilroy-ExtraBold", fontSize: 30, letterSpacing: -0.4, marginBottom: 8 },
  subtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 18 },
  sectionCard: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 12,
    overflow: "hidden",
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  sectionLabel: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 14, letterSpacing: 0.3 },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: DIVIDER, paddingTop: 14 },
  fieldLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    color: IVORY,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    backgroundColor: NAVY_ELEV,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
  },
  pillActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.14)" },
  pillText: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12 },
  pillTextActive: { color: GOLD, fontFamily: "Inter_700Bold" },
  note: { color: FAINT, fontFamily: "Inter_400Regular", fontSize: 11, fontStyle: "italic", marginTop: 4 },
  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    backgroundColor: NAVY,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  saveBtn: {
    backgroundColor: GOLD,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 0.3 },
});
