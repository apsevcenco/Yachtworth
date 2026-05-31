import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListProposalsQueryKey,
  useSaveProposal,
} from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { exportProposalPdf } from "../../lib/proposalPdf";
import type {
  ProposalEquipmentItem,
  ProposalSettings,
  ProposalYachtSnapshot,
} from "../../lib/proposalTypes";
import { exportProposalDocument } from "../../lib/documentExport";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const FAINT = "rgba(247,243,236,0.4)";
const DIVIDER = "rgba(247,243,236,0.08)";

function parseJson<T>(s: string | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function proposalTypeLabel(t: string): string {
  if (t === "sale") return "For Sale";
  if (t === "charter") return "For Charter";
  return "Sale & Charter";
}

export default function ProposalPreviewScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const params = useLocalSearchParams<{
    yacht_id?: string;
    yacht_payload?: string;
    settings_payload?: string;
    equipment_payload?: string;
    saved_id?: string;
  }>();

  const yacht = useMemo<ProposalYachtSnapshot>(
    () =>
      parseJson(
        typeof params.yacht_payload === "string"
          ? params.yacht_payload
          : undefined,
        { name: "Untitled yacht" } as ProposalYachtSnapshot,
      ),
    [params.yacht_payload],
  );
  const settings = useMemo<ProposalSettings>(
    () =>
      parseJson(
        typeof params.settings_payload === "string"
          ? params.settings_payload
          : undefined,
        {
          template: "minimal",
          proposal_type: "sale",
          language: "english",
          sections: ["cover", "specs", "accommodation", "contact"],
        } as ProposalSettings,
      ),
    [params.settings_payload],
  );
  const equipment = useMemo<ProposalEquipmentItem[]>(
    () =>
      parseJson(
        typeof params.equipment_payload === "string"
          ? params.equipment_payload
          : undefined,
        [],
      ),
    [params.equipment_payload],
  );

  const yachtId =
    typeof params.yacht_id === "string" && params.yacht_id
      ? params.yacht_id
      : null;
  const initialSavedId =
    typeof params.saved_id === "string" && params.saved_id
      ? params.saved_id
      : null;

  const [busy, setBusy] = useState<null | "legacy" | "pro" | "docx">(null);
  const [savedId, setSavedId] = useState<string | null>(initialSavedId);
  const saveM = useSaveProposal();
  const queryClient = useQueryClient();

  const onExportLegacy = async () => {
    setBusy("legacy");
    try {
      await exportProposalPdf({ yacht, equipment, settings });
    } catch (e) {
      Alert.alert("Could not export PDF", String(e));
    } finally {
      setBusy(null);
    }
  };

  const onExportProfessional = async () => {
    setBusy("pro");
    try {
      await exportProposalDocument({ yacht, equipment, settings, format: "pdf" });
    } catch (e) {
      Alert.alert("Could not export Professional PDF", String(e));
    } finally {
      setBusy(null);
    }
  };

  const onExportWord = async () => {
    setBusy("docx");
    try {
      await exportProposalDocument({ yacht, equipment, settings, format: "docx" });
    } catch (e) {
      Alert.alert("Could not export Word", String(e));
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    if (savedId) {
      Alert.alert("Already saved", "This proposal is in My Proposals.");
      return;
    }
    try {
      const res = await saveM.mutateAsync({
        data: {
          yacht_id: yachtId,
          yacht_name: yacht.name,
          proposal_type: settings.proposal_type,
          language: settings.language,
          yacht_snapshot: yacht as unknown as { [key: string]: unknown },
          settings_snapshot: settings,
          equipment_snapshot: equipment as unknown as {
            [key: string]: unknown;
          }[],
        },
      });
      setSavedId(res.id);
      await queryClient.invalidateQueries({
        queryKey: getListProposalsQueryKey(),
      });
      Alert.alert("Saved", "Proposal added to My Proposals.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      Alert.alert("Could not save", msg);
    }
  };

  const counts = {
    specs: countSpecs(yacht),
    equipment: equipment.length,
  };

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 67 : insets.top) + 56 }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 60,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={20} color={IVORY} />
        </Pressable>

        <Text style={styles.kicker}>READY</Text>
        <Text style={styles.title}>{yacht.name}</Text>
        <View style={styles.chipsRow}>
          <Chip text={proposalTypeLabel(settings.proposal_type)} />
          <Chip text={settings.template ?? "minimal"} />
          <Chip text={settings.language} />
          {savedId ? <Chip text="Saved" gold /> : null}
        </View>

        <View style={styles.summaryCard}>
          <SummaryRow label="Specifications" value={`${counts.specs} fields`} />
          <SummaryRow label="Equipment items" value={String(counts.equipment)} />
          <SummaryRow
            label="Sale price"
            value={
              settings.sale_price_eur != null
                ? `€ ${Math.round(settings.sale_price_eur).toLocaleString("en-US")}`
                : "—"
            }
          />
          <SummaryRow
            label="Charter rate (high)"
            value={
              settings.charter_high_eur_week != null
                ? `€ ${Math.round(settings.charter_high_eur_week).toLocaleString("en-US")} / wk`
                : "—"
            }
            last
          />
        </View>

        <Pressable
          onPress={onExportProfessional}
          disabled={busy !== null}
          style={({ pressed }) => [
            styles.primaryBtn,
            { opacity: pressed || busy === "pro" ? 0.8 : 1 },
          ]}
        >
          {busy === "pro" ? (
            <ActivityIndicator color={NAVY} />
          ) : (
            <>
              <Feather name="award" size={18} color={NAVY} />
              <Text style={styles.primaryBtnText}>Export Professional PDF</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={onExportWord}
          disabled={busy !== null}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { opacity: pressed || busy === "docx" ? 0.8 : 1 },
          ]}
        >
          {busy === "docx" ? (
            <ActivityIndicator color={GOLD} />
          ) : (
            <>
              <Feather name="file-text" size={18} color={GOLD} />
              <Text style={styles.secondaryBtnText}>Export Word (DOCX)</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={onExportLegacy}
          disabled={busy !== null}
          style={({ pressed }) => [
            styles.tertiaryBtn,
            { opacity: pressed || busy === "legacy" ? 0.7 : 1 },
          ]}
        >
          {busy === "legacy" ? (
            <ActivityIndicator color={MUTED} />
          ) : (
            <>
              <Feather name="download" size={16} color={MUTED} />
              <Text style={styles.tertiaryBtnText}>Export Legacy PDF</Text>
            </>
          )}
        </Pressable>

        <View style={styles.spacer16} />

        <Pressable
          onPress={onSave}
          disabled={saveM.isPending || !!savedId}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { opacity: pressed || saveM.isPending ? 0.8 : 1 },
            !!savedId && { opacity: 0.6 },
          ]}
        >
          {saveM.isPending ? (
            <ActivityIndicator color={GOLD} />
          ) : (
            <>
              <Feather
                name={savedId ? "check" : "save"}
                size={18}
                color={GOLD}
              />
              <Text style={styles.secondaryBtnText}>
                {savedId ? "Saved" : "Save to My Proposals"}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.tertiaryBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="edit-3" size={16} color={MUTED} />
          <Text style={styles.tertiaryBtnText}>Edit settings</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Professional PDF and Word are generated on Yachtworth servers and
          returned to your device — they are not stored. Legacy PDF is generated
          fully on your device. Saving keeps your settings + yacht snapshot so
          you can re-export anytime.
        </Text>
      </ScrollView>
    </View>
  );
}

function countSpecs(y: ProposalYachtSnapshot): number {
  let n = 0;
  const keys: (keyof ProposalYachtSnapshot)[] = [
    "builder",
    "model",
    "yacht_type",
    "year_built",
    "length_meters",
    "beam_meters",
    "draft_meters",
    "flag",
    "home_port",
    "cabins",
    "guests",
    "crew",
    "berths",
    "heads",
    "crew_cabins",
    "engine_maker",
    "engine_model",
    "total_hp",
    "engine_hours",
    "max_speed_knots",
    "cruising_speed_knots",
    "range_nm",
    "registration_number",
    "imo_number",
    "vat_status",
  ];
  for (const k of keys) {
    const v = y[k];
    if (v != null && v !== "") n++;
  }
  return n;
}

function SummaryRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.sumRow, last && styles.sumRowLast]}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumValue}>{value}</Text>
    </View>
  );
}

function Chip({ text, gold }: { text: string; gold?: boolean }) {
  return (
    <View style={[styles.chip, gold && styles.chipGold]}>
      <Text style={[styles.chipText, gold && styles.chipTextGold]}>{text}</Text>
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
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 30,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 22 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: NAVY_ELEV,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  chipGold: {
    backgroundColor: "rgba(201,169,97,0.14)",
    borderColor: "rgba(201,169,97,0.3)",
  },
  chipText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textTransform: "capitalize",
  },
  chipTextGold: { color: GOLD, fontFamily: "Inter_700Bold" },
  summaryCard: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 22,
  },
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  sumRowLast: { borderBottomWidth: 0 },
  sumLabel: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 13 },
  sumValue: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: GOLD,
    paddingVertical: 17,
    borderRadius: 14,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: NAVY,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.08)",
    marginBottom: 14,
  },
  secondaryBtnText: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  tertiaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginBottom: 20,
  },
  tertiaryBtnText: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 13 },
  spacer16: { height: 16 },
  disclaimer: {
    color: FAINT,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
});
