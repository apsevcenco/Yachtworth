import { Feather } from "@expo/vector-icons";
import {
  getGetYachtQueryKey,
  getListYachtEquipmentQueryKey,
  useGetYacht,
  useListYachtEquipment,
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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  ProposalLanguage,
  ProposalSettings,
  ProposalTemplate,
  ProposalType,
  ProposalYachtSnapshot,
} from "../../lib/proposalPdf";
import TemplatePickerSheet from "../../components/TemplatePickerSheet";

const TEMPLATE_LABELS: Record<ProposalTemplate, string> = {
  minimal: "Minimal · White & Gold",
  dark: "Dark Luxury · Obsidian & Gold",
  classic: "Classic Blue · Split cover",
};

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const FAINT = "rgba(247,243,236,0.4)";
const DIVIDER = "rgba(247,243,236,0.08)";

const TYPES: { key: ProposalType; label: string }[] = [
  { key: "sale", label: "Sale" },
  { key: "charter", label: "Charter" },
  { key: "both", label: "Both" },
];

const LANGS: { key: ProposalLanguage; label: string }[] = [
  { key: "english", label: "EN" },
  { key: "french", label: "FR" },
  { key: "italian", label: "IT" },
  { key: "spanish", label: "ES" },
  { key: "german", label: "DE" },
  { key: "russian", label: "RU" },
];

function toNum(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export default function ProposalFormScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const params = useLocalSearchParams<{ yacht_id?: string }>();
  const yachtId =
    typeof params.yacht_id === "string" && params.yacht_id ? params.yacht_id : null;

  const yachtQ = useGetYacht(yachtId ?? "", {
    query: {
      queryKey: yachtId ? getGetYachtQueryKey(yachtId) : ["yacht-disabled"],
      enabled: !!yachtId,
      refetchOnMount: "always",
      staleTime: 0,
    },
  });
  const equipQ = useListYachtEquipment(yachtId ?? "", {
    query: {
      queryKey: yachtId
        ? getListYachtEquipmentQueryKey(yachtId)
        : ["equipment-disabled"],
      enabled: !!yachtId,
      refetchOnMount: "always",
      staleTime: 0,
    },
  });

  const y = yachtQ.data;

  // Manual fields (used only when yachtId is null)
  const [name, setName] = useState("");
  const [builder, setBuilder] = useState("");
  const [model, setModel] = useState("");
  const [yachtType, setYachtType] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [lengthMeters, setLengthMeters] = useState("");
  const [beamMeters, setBeamMeters] = useState("");
  const [draftMeters, setDraftMeters] = useState("");
  const [flag, setFlag] = useState("");
  const [homePort, setHomePort] = useState("");
  const [cabins, setCabins] = useState("");
  const [guests, setGuests] = useState("");
  const [crew, setCrew] = useState("");
  const [berths, setBerths] = useState("");

  // Settings
  const [template, setTemplate] = useState<ProposalTemplate>("minimal");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [proposalType, setProposalType] = useState<ProposalType>("sale");
  const [language, setLanguage] = useState<ProposalLanguage>("english");
  const [salePrice, setSalePrice] = useState("");
  const [charterLow, setCharterLow] = useState("");
  const [charterHigh, setCharterHigh] = useState("");
  const [charterApa, setCharterApa] = useState("");
  const [charterVat, setCharterVat] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [brokerCompany, setBrokerCompany] = useState("");
  const [brokerEmail, setBrokerEmail] = useState("");
  const [brokerPhone, setBrokerPhone] = useState("");
  const [brokerWebsite, setBrokerWebsite] = useState("");
  const [watermark, setWatermark] = useState(false);

  const loadingYacht = yachtId && (yachtQ.isLoading || equipQ.isLoading);

  const snapshot: ProposalYachtSnapshot = useMemo(() => {
    if (y) {
      return {
        name: y.name || "Untitled yacht",
        builder: y.brand ?? null,
        model: y.model ?? null,
        yacht_type: y.yacht_type ?? null,
        year_built: y.year_built ?? null,
        length_meters: y.length_meters ?? null,
        beam_meters: y.beam_meters ?? null,
        draft_meters: y.draft_meters ?? null,
        flag: y.flag ?? null,
        home_port: y.home_port ?? null,
        cabins: y.cabins ?? null,
        guests: y.guests ?? null,
        crew: y.crew ?? null,
        berths: y.berths ?? null,
        heads: y.heads ?? null,
        crew_cabins: y.crew_cabins ?? null,
        engine_maker: y.engine_maker ?? null,
        engine_model: y.engine_model ?? null,
        engine_count: y.engine_count ?? null,
        total_hp: y.total_hp ?? null,
        engine_hours: y.engine_hours ?? null,
        registration_number: y.registration_number ?? null,
        imo_number: y.imo_number ?? null,
        hull_id: y.hull_id ?? null,
        vat_status: y.vat_status ?? null,
        photo_url: y.cover_photo_url ?? y.photo_url ?? null,
        cover_photo_url: y.cover_photo_url ?? null,
        photo_urls: Array.isArray(y.photo_urls) ? y.photo_urls : null,
      };
    }
    return {
      name: name.trim() || "Untitled yacht",
      builder: builder.trim() || null,
      model: model.trim() || null,
      yacht_type: yachtType.trim() || null,
      year_built: toNum(yearBuilt),
      length_meters: toNum(lengthMeters),
      beam_meters: toNum(beamMeters),
      draft_meters: toNum(draftMeters),
      flag: flag.trim() || null,
      home_port: homePort.trim() || null,
      cabins: toNum(cabins),
      guests: toNum(guests),
      crew: toNum(crew),
      berths: toNum(berths),
    };
  }, [
    y,
    name,
    builder,
    model,
    yachtType,
    yearBuilt,
    lengthMeters,
    beamMeters,
    draftMeters,
    flag,
    homePort,
    cabins,
    guests,
    crew,
    berths,
  ]);

  const onPreview = () => {
    if (!snapshot.name || snapshot.name === "Untitled yacht") {
      if (!yachtId) {
        Alert.alert("Yacht name required", "Please enter at least the yacht name.");
        return;
      }
    }
    const sections = ["cover", "specs", "accommodation", "equipment", "contact"];
    if (proposalType === "sale" || proposalType === "both") sections.push("pricing_sale");
    if (proposalType === "charter" || proposalType === "both") sections.push("pricing_charter");
    if (watermark) sections.push("watermark_confidential");

    const settings: ProposalSettings = {
      template,
      proposal_type: proposalType,
      language,
      sections,
      sale_price_eur: toNum(salePrice),
      charter_low_eur_week: toNum(charterLow),
      charter_high_eur_week: toNum(charterHigh),
      charter_apa_pct: toNum(charterApa),
      charter_vat_pct: toNum(charterVat),
      broker_name: brokerName.trim() || null,
      broker_company: brokerCompany.trim() || null,
      broker_email: brokerEmail.trim() || null,
      broker_phone: brokerPhone.trim() || null,
      broker_website: brokerWebsite.trim() || null,
    };

    const equipmentItems = (equipQ.data?.items ?? []).map((e) => ({
      category: e.category,
      equipment_type: e.equipment_type,
      brand: e.brand ?? null,
      model: e.model ?? null,
      quantity: e.quantity ?? null,
      power_kw: e.power_kw ?? null,
      power_hp: e.power_hp ?? null,
      capacity_liters: e.capacity_liters ?? null,
      capacity_persons: e.capacity_persons ?? null,
      total_watts: e.total_watts ?? null,
      year_installed: e.year_installed ?? null,
      notes: e.notes ?? null,
    }));

    router.push({
      pathname: "/yacht-proposal/preview",
      params: {
        yacht_id: yachtId ?? "",
        yacht_payload: JSON.stringify(snapshot),
        settings_payload: JSON.stringify(settings),
        equipment_payload: JSON.stringify(equipmentItems),
      },
    });
  };

  const showSalePrice = proposalType === "sale" || proposalType === "both";
  const showCharter = proposalType === "charter" || proposalType === "both";

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 67 : insets.top) + 56 }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 120,
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

        <Text style={styles.kicker}>PROPOSAL · SETTINGS</Text>
        <Text style={styles.title}>
          {yachtId ? snapshot.name : "New proposal"}
        </Text>

        {loadingYacht ? (
          <View style={{ paddingVertical: 30, alignItems: "center" }}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : null}

        {!yachtId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yacht details</Text>
            <Field label="Yacht name *" value={name} onChange={setName} />
            <Field label="Builder" value={builder} onChange={setBuilder} />
            <Field label="Model" value={model} onChange={setModel} />
            <Field
              label="Type (e.g. motor_yacht)"
              value={yachtType}
              onChange={setYachtType}
              autoCapitalize="none"
            />
            <Row2>
              <Field
                label="Year built"
                value={yearBuilt}
                onChange={setYearBuilt}
                keyboardType="number-pad"
                half
              />
              <Field
                label="Length (m)"
                value={lengthMeters}
                onChange={setLengthMeters}
                keyboardType="decimal-pad"
                half
              />
            </Row2>
            <Row2>
              <Field
                label="Beam (m)"
                value={beamMeters}
                onChange={setBeamMeters}
                keyboardType="decimal-pad"
                half
              />
              <Field
                label="Draft (m)"
                value={draftMeters}
                onChange={setDraftMeters}
                keyboardType="decimal-pad"
                half
              />
            </Row2>
            <Row2>
              <Field label="Flag" value={flag} onChange={setFlag} half />
              <Field
                label="Home port"
                value={homePort}
                onChange={setHomePort}
                half
              />
            </Row2>
            <Row2>
              <Field
                label="Guest cabins"
                value={cabins}
                onChange={setCabins}
                keyboardType="number-pad"
                half
              />
              <Field
                label="Guests"
                value={guests}
                onChange={setGuests}
                keyboardType="number-pad"
                half
              />
            </Row2>
            <Row2>
              <Field
                label="Berths"
                value={berths}
                onChange={setBerths}
                keyboardType="number-pad"
                half
              />
              <Field
                label="Crew"
                value={crew}
                onChange={setCrew}
                keyboardType="number-pad"
                half
              />
            </Row2>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Template</Text>
          <Pressable
            onPress={() => setPickerVisible(true)}
            style={({ pressed }) => [
              styles.templateRow,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.templateValue}>
                {TEMPLATE_LABELS[template]}
              </Text>
              <Text style={styles.templateHint}>Tap to change style</Text>
            </View>
            <Feather name="chevron-right" size={20} color={GOLD} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proposal type</Text>
          <View style={styles.segRow}>
            {TYPES.map((t) => {
              const active = proposalType === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setProposalType(t.key)}
                  style={[styles.seg, active && styles.segActive]}
                >
                  <Text
                    style={[styles.segText, active && styles.segTextActive]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language</Text>
          <View style={styles.segRow}>
            {LANGS.map((l) => {
              const active = language === l.key;
              return (
                <Pressable
                  key={l.key}
                  onPress={() => setLanguage(l.key)}
                  style={[styles.segSmall, active && styles.segActive]}
                >
                  <Text
                    style={[styles.segText, active && styles.segTextActive]}
                  >
                    {l.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {showSalePrice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sale pricing</Text>
            <Field
              label="Asking price (€)"
              value={salePrice}
              onChange={setSalePrice}
              keyboardType="numeric"
            />
          </View>
        )}

        {showCharter && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Charter pricing</Text>
            <Row2>
              <Field
                label="Low season (€/wk)"
                value={charterLow}
                onChange={setCharterLow}
                keyboardType="numeric"
                half
              />
              <Field
                label="High season (€/wk)"
                value={charterHigh}
                onChange={setCharterHigh}
                keyboardType="numeric"
                half
              />
            </Row2>
            <Row2>
              <Field
                label="APA %"
                value={charterApa}
                onChange={setCharterApa}
                keyboardType="numeric"
                half
              />
              <Field
                label="VAT %"
                value={charterVat}
                onChange={setCharterVat}
                keyboardType="numeric"
                half
              />
            </Row2>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact (broker)</Text>
          <Field label="Name" value={brokerName} onChange={setBrokerName} />
          <Field
            label="Company"
            value={brokerCompany}
            onChange={setBrokerCompany}
          />
          <Field
            label="Email"
            value={brokerEmail}
            onChange={setBrokerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Phone"
            value={brokerPhone}
            onChange={setBrokerPhone}
            keyboardType="phone-pad"
          />
          <Field
            label="Website"
            value={brokerWebsite}
            onChange={setBrokerWebsite}
            autoCapitalize="none"
          />
        </View>

        <Pressable
          onPress={() => setWatermark((v) => !v)}
          style={styles.toggleRow}
        >
          <View
            style={[
              styles.checkbox,
              watermark && { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.16)" },
            ]}
          >
            {watermark && <Feather name="check" size={14} color={GOLD} />}
          </View>
          <Text style={styles.toggleText}>Add "Confidential" watermark</Text>
        </Pressable>

        <Pressable
          onPress={onPreview}
          style={({ pressed }) => [
            styles.primaryBtn,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="file-text" size={18} color={NAVY} />
          <Text style={styles.primaryBtnText}>Preview proposal</Text>
        </Pressable>
      </ScrollView>

      <TemplatePickerSheet
        visible={pickerVisible}
        selected={template}
        onSelect={setTemplate}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
  autoCapitalize,
  half,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  half?: boolean;
}) {
  return (
    <View style={[styles.field, half && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={FAINT}
        style={styles.fieldInput}
      />
    </View>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <View style={styles.row2}>{children}</View>;
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
    fontSize: 26,
    letterSpacing: -0.3,
    marginBottom: 18,
  },
  section: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 14,
  },
  sectionTitle: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  row2: { flexDirection: "row", gap: 10 },
  field: { marginBottom: 10 },
  fieldLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  fieldInput: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  templateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: NAVY_ELEV,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  templateValue: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 2,
  },
  templateHint: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  segRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  seg: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
  },
  segSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
    minWidth: 50,
    alignItems: "center",
  },
  segActive: {
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.16)",
  },
  segText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  segTextActive: { color: GOLD, fontFamily: "Inter_700Bold" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: DIVIDER,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 14 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: GOLD,
    paddingVertical: 17,
    borderRadius: 14,
    marginTop: 8,
  },
  primaryBtnText: {
    color: NAVY,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});

