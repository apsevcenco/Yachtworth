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
  ProposalEquipmentItem,
  ProposalLanguage,
  ProposalSettings,
  ProposalTemplate,
  ProposalType,
  ProposalYachtSnapshot,
} from "../../lib/proposalTypes";
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

const M_PER_FT = 0.3048;

type Option = { value: string; label: string };

// Mirrors the enum values used by My Yacht (edit.tsx) so the backend builder
// humanizes/labels them identically. Values must stay lowercase snake_case.
const YACHT_TYPE_OPTIONS: Option[] = [
  { value: "motor_yacht", label: "Motor" },
  { value: "sailing_yacht", label: "Sailing" },
  { value: "catamaran", label: "Catamaran" },
  { value: "superyacht", label: "Superyacht" },
];

// Hull material/type have no My Yacht counterpart — stored as plain display
// strings (the builder prints them verbatim).
const HULL_MATERIAL_OPTIONS: Option[] = [
  { value: "GRP / Fibreglass", label: "GRP" },
  { value: "Steel", label: "Steel" },
  { value: "Aluminium", label: "Aluminium" },
  { value: "Wood", label: "Wood" },
  { value: "Carbon composite", label: "Composite" },
];

const HULL_TYPE_OPTIONS: Option[] = [
  { value: "Planing", label: "Planing" },
  { value: "Semi-displacement", label: "Semi-disp." },
  { value: "Displacement", label: "Displacement" },
  { value: "Multihull", label: "Multihull" },
];

// Same enum values My Yacht uses; the builder maps these to human VAT labels.
const VAT_OPTIONS: Option[] = [
  { value: "tax_paid_eu", label: "VAT paid" },
  { value: "tax_not_paid", label: "VAT not paid" },
  { value: "unknown", label: "Unknown" },
];

// Lowercase category keys so the backend's category-priority ranking matches
// (power/navigation/safety/comfort/water/deck/toys/tenders, else Other).
const EQUIP_CATEGORIES: Option[] = [
  { value: "power", label: "Power" },
  { value: "navigation", label: "Navigation" },
  { value: "safety", label: "Safety" },
  { value: "comfort", label: "Comfort" },
  { value: "water", label: "Water" },
  { value: "deck", label: "Deck" },
  { value: "toys", label: "Toys" },
  { value: "tenders", label: "Tenders" },
  { value: "other", label: "Other" },
];

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

type ManualEquip = {
  id: string;
  category: string;
  equipment_type: string;
  brand: string;
  model: string;
  quantity: string;
  power_kw: string;
  power_hp: string;
  total_watts: string;
  capacity_liters: string;
  capacity_persons: string;
  hours: string;
  year_installed: string;
  notes: string;
};

function blankEquip(): ManualEquip {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    category: "other",
    equipment_type: "",
    brand: "",
    model: "",
    quantity: "",
    power_kw: "",
    power_hp: "",
    total_watts: "",
    capacity_liters: "",
    capacity_persons: "",
    hours: "",
    year_installed: "",
    notes: "",
  };
}

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

  // ── Manual yacht fields (used only when yachtId is null) ──
  const [name, setName] = useState("");
  const [builder, setBuilder] = useState("");
  const [model, setModel] = useState("");
  const [yachtType, setYachtType] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [dimUnit, setDimUnit] = useState<"metric" | "imperial">("metric");
  const [lengthInput, setLengthInput] = useState("");
  const [beamInput, setBeamInput] = useState("");
  const [draftInput, setDraftInput] = useState("");
  const [flag, setFlag] = useState("");
  const [homePort, setHomePort] = useState("");
  const [cabins, setCabins] = useState("");
  const [guests, setGuests] = useState("");
  const [berths, setBerths] = useState("");
  const [heads, setHeads] = useState("");
  const [crew, setCrew] = useState("");
  const [crewCabins, setCrewCabins] = useState("");
  const [engineMaker, setEngineMaker] = useState("");
  const [engineModel, setEngineModel] = useState("");
  const [engineCount, setEngineCount] = useState("");
  const [totalHp, setTotalHp] = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [maxSpeed, setMaxSpeed] = useState("");
  const [cruiseSpeed, setCruiseSpeed] = useState("");
  const [rangeNm, setRangeNm] = useState("");
  const [fuelCapacity, setFuelCapacity] = useState("");
  const [waterCapacity, setWaterCapacity] = useState("");
  const [hullMaterial, setHullMaterial] = useState("");
  const [hullType, setHullType] = useState("");
  const [vatStatus, setVatStatus] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [imoNumber, setImoNumber] = useState("");
  const [hullId, setHullId] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState("");

  // Manual equipment (available in both modes; appended to any pulled items)
  const [manualEquip, setManualEquip] = useState<ManualEquip[]>([]);

  // ── Settings ──
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

  const switchUnit = (next: "metric" | "imperial") => {
    if (next === dimUnit) return;
    const conv = (s: string): string => {
      const n = toNum(s);
      if (n == null) return s;
      return next === "imperial"
        ? (n / M_PER_FT).toFixed(1)
        : (n * M_PER_FT).toFixed(2);
    };
    setLengthInput((v) => conv(v));
    setBeamInput((v) => conv(v));
    setDraftInput((v) => conv(v));
    setDimUnit(next);
  };

  const addEquip = () => setManualEquip((p) => [...p, blankEquip()]);
  const updateEquip = (id: string, patch: Partial<ManualEquip>) =>
    setManualEquip((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEquip = (id: string) =>
    setManualEquip((p) => p.filter((e) => e.id !== id));

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
    const toMeters = (s: string): number | null => {
      const n = toNum(s);
      if (n == null) return null;
      const m = dimUnit === "imperial" ? n * M_PER_FT : n;
      return Number(m.toFixed(2));
    };
    const gallery = galleryUrls
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const cover = coverPhotoUrl.trim() || null;
    return {
      name: name.trim() || "Untitled yacht",
      builder: builder.trim() || null,
      model: model.trim() || null,
      yacht_type: yachtType.trim() || null,
      year_built: toNum(yearBuilt),
      length_meters: toMeters(lengthInput),
      beam_meters: toMeters(beamInput),
      draft_meters: toMeters(draftInput),
      flag: flag.trim() || null,
      home_port: homePort.trim() || null,
      cabins: toNum(cabins),
      guests: toNum(guests),
      crew: toNum(crew),
      berths: toNum(berths),
      heads: toNum(heads),
      crew_cabins: toNum(crewCabins),
      engine_maker: engineMaker.trim() || null,
      engine_model: engineModel.trim() || null,
      engine_count: toNum(engineCount),
      total_hp: toNum(totalHp),
      engine_hours: toNum(engineHours),
      max_speed_knots: toNum(maxSpeed),
      cruising_speed_knots: toNum(cruiseSpeed),
      range_nm: toNum(rangeNm),
      fuel_capacity_l: toNum(fuelCapacity),
      water_capacity_l: toNum(waterCapacity),
      hull_material: hullMaterial.trim() || null,
      hull_type: hullType.trim() || null,
      vat_status: vatStatus.trim() || null,
      registration_number: registrationNumber.trim() || null,
      imo_number: imoNumber.trim() || null,
      hull_id: hullId.trim() || null,
      cover_photo_url: cover,
      photo_url: cover,
      photo_urls: gallery.length ? gallery : null,
    };
  }, [
    y,
    name,
    builder,
    model,
    yachtType,
    yearBuilt,
    dimUnit,
    lengthInput,
    beamInput,
    draftInput,
    flag,
    homePort,
    cabins,
    guests,
    crew,
    berths,
    heads,
    crewCabins,
    engineMaker,
    engineModel,
    engineCount,
    totalHp,
    engineHours,
    maxSpeed,
    cruiseSpeed,
    rangeNm,
    fuelCapacity,
    waterCapacity,
    hullMaterial,
    hullType,
    vatStatus,
    registrationNumber,
    imoNumber,
    hullId,
    coverPhotoUrl,
    galleryUrls,
  ]);

  const onPreview = () => {
    if (yachtId && (loadingYacht || !y)) {
      Alert.alert("Still loading", "Please wait for the yacht details to load.");
      return;
    }
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

    // Equipment pulled from My Yacht (linked mode) …
    const linkedEquip: ProposalEquipmentItem[] = (equipQ.data?.items ?? []).map(
      (e) => ({
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
        hours: e.hours ?? null,
        notes: e.notes ?? null,
      }),
    );

    // … plus any equipment entered manually on this screen.
    const manualEquipItems: ProposalEquipmentItem[] = manualEquip
      .filter((e) => e.equipment_type.trim())
      .map((e) => ({
        category: e.category.trim() || "other",
        equipment_type: e.equipment_type.trim(),
        brand: e.brand.trim() || null,
        model: e.model.trim() || null,
        quantity: toNum(e.quantity),
        power_kw: toNum(e.power_kw),
        power_hp: toNum(e.power_hp),
        capacity_liters: toNum(e.capacity_liters),
        capacity_persons: toNum(e.capacity_persons),
        total_watts: toNum(e.total_watts),
        year_installed: toNum(e.year_installed),
        hours: toNum(e.hours),
        notes: e.notes.trim() || null,
      }));

    const equipmentItems = [...linkedEquip, ...manualEquipItems];

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
  const dimSuffix = dimUnit === "metric" ? "m" : "ft";

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 67 : insets.top) + 56 }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Yacht basics</Text>
              <Field label="Yacht name *" value={name} onChange={setName} />
              <Row2>
                <Field label="Builder" value={builder} onChange={setBuilder} half />
                <Field label="Model" value={model} onChange={setModel} half />
              </Row2>
              <PillSelect
                label="Type"
                options={YACHT_TYPE_OPTIONS}
                value={yachtType}
                onChange={setYachtType}
              />
              <Field
                label="Year built"
                value={yearBuilt}
                onChange={setYearBuilt}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Dimensions</Text>
                <View style={styles.unitToggle}>
                  {(["metric", "imperial"] as const).map((u) => {
                    const active = dimUnit === u;
                    return (
                      <Pressable
                        key={u}
                        onPress={() => switchUnit(u)}
                        style={[styles.unitBtn, active && styles.segActive]}
                      >
                        <Text
                          style={[styles.unitText, active && styles.segTextActive]}
                        >
                          {u === "metric" ? "m" : "ft"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <Row2>
                <Field
                  label={`Length (${dimSuffix})`}
                  value={lengthInput}
                  onChange={setLengthInput}
                  keyboardType="decimal-pad"
                  half
                />
                <Field
                  label={`Beam (${dimSuffix})`}
                  value={beamInput}
                  onChange={setBeamInput}
                  keyboardType="decimal-pad"
                  half
                />
              </Row2>
              <Field
                label={`Draft (${dimSuffix})`}
                value={draftInput}
                onChange={setDraftInput}
                keyboardType="decimal-pad"
              />
              <PillSelect
                label="Hull material"
                options={HULL_MATERIAL_OPTIONS}
                value={hullMaterial}
                onChange={setHullMaterial}
              />
              <PillSelect
                label="Hull type"
                options={HULL_TYPE_OPTIONS}
                value={hullType}
                onChange={setHullType}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accommodation</Text>
              <Row2>
                <Field
                  label="Guest cabins"
                  value={cabins}
                  onChange={setCabins}
                  keyboardType="number-pad"
                  half
                />
                <Field
                  label="Guests sleeping"
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
                  label="Heads"
                  value={heads}
                  onChange={setHeads}
                  keyboardType="number-pad"
                  half
                />
              </Row2>
              <Row2>
                <Field
                  label="Crew"
                  value={crew}
                  onChange={setCrew}
                  keyboardType="number-pad"
                  half
                />
                <Field
                  label="Crew cabins"
                  value={crewCabins}
                  onChange={setCrewCabins}
                  keyboardType="number-pad"
                  half
                />
              </Row2>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Engines & performance</Text>
              <Row2>
                <Field
                  label="Engine maker"
                  value={engineMaker}
                  onChange={setEngineMaker}
                  half
                />
                <Field
                  label="Engine model"
                  value={engineModel}
                  onChange={setEngineModel}
                  half
                />
              </Row2>
              <Row2>
                <Field
                  label="Engines"
                  value={engineCount}
                  onChange={setEngineCount}
                  keyboardType="number-pad"
                  half
                />
                <Field
                  label="Total HP"
                  value={totalHp}
                  onChange={setTotalHp}
                  keyboardType="number-pad"
                  half
                />
              </Row2>
              <Row2>
                <Field
                  label="Engine hours"
                  value={engineHours}
                  onChange={setEngineHours}
                  keyboardType="number-pad"
                  half
                />
                <Field
                  label="Range (nm)"
                  value={rangeNm}
                  onChange={setRangeNm}
                  keyboardType="number-pad"
                  half
                />
              </Row2>
              <Row2>
                <Field
                  label="Max speed (kn)"
                  value={maxSpeed}
                  onChange={setMaxSpeed}
                  keyboardType="decimal-pad"
                  half
                />
                <Field
                  label="Cruise speed (kn)"
                  value={cruiseSpeed}
                  onChange={setCruiseSpeed}
                  keyboardType="decimal-pad"
                  half
                />
              </Row2>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Capacities</Text>
              <Row2>
                <Field
                  label="Fuel capacity (L)"
                  value={fuelCapacity}
                  onChange={setFuelCapacity}
                  keyboardType="number-pad"
                  half
                />
                <Field
                  label="Water capacity (L)"
                  value={waterCapacity}
                  onChange={setWaterCapacity}
                  keyboardType="number-pad"
                  half
                />
              </Row2>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Registration & legal</Text>
              <Row2>
                <Field label="Flag" value={flag} onChange={setFlag} half />
                <Field
                  label="Home port"
                  value={homePort}
                  onChange={setHomePort}
                  half
                />
              </Row2>
              <PillSelect
                label="VAT status"
                options={VAT_OPTIONS}
                value={vatStatus}
                onChange={setVatStatus}
              />
              <Field
                label="Registration no."
                value={registrationNumber}
                onChange={setRegistrationNumber}
                autoCapitalize="characters"
              />
              <Row2>
                <Field
                  label="IMO number"
                  value={imoNumber}
                  onChange={setImoNumber}
                  keyboardType="number-pad"
                  half
                />
                <Field
                  label="Hull ID (HIN)"
                  value={hullId}
                  onChange={setHullId}
                  autoCapitalize="characters"
                  half
                />
              </Row2>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <Field
                label="Cover photo URL (https)"
                value={coverPhotoUrl}
                onChange={setCoverPhotoUrl}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://…"
              />
              <Field
                label="Gallery photo URLs — one per line"
                value={galleryUrls}
                onChange={setGalleryUrls}
                autoCapitalize="none"
                keyboardType="url"
                placeholder={"https://…\nhttps://…"}
                multiline
              />
              <Text style={styles.helpText}>
                Only public https image links appear in the PDF.
              </Text>
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Equipment{yachtId ? " (added to this proposal)" : ""}
          </Text>
          {manualEquip.length === 0 ? (
            <Text style={styles.helpText}>
              {yachtId
                ? "Add extra items on top of those pulled from My Yacht."
                : "Add equipment to feature in the proposal."}
            </Text>
          ) : null}
          {manualEquip.map((e, idx) => (
            <View key={e.id} style={styles.equipCard}>
              <View style={styles.equipCardHead}>
                <Text style={styles.equipCardTitle}>Item {idx + 1}</Text>
                <Pressable
                  onPress={() => removeEquip(e.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove item ${idx + 1}`}
                >
                  <Feather name="x" size={18} color={MUTED} />
                </Pressable>
              </View>
              <PillSelect
                label="Category"
                options={EQUIP_CATEGORIES}
                value={e.category}
                onChange={(v) => updateEquip(e.id, { category: v || "other" })}
              />
              <Field
                label="Item name *"
                value={e.equipment_type}
                onChange={(v) => updateEquip(e.id, { equipment_type: v })}
                placeholder="e.g. Bow thruster"
              />
              <Row2>
                <Field
                  label="Brand"
                  value={e.brand}
                  onChange={(v) => updateEquip(e.id, { brand: v })}
                  half
                />
                <Field
                  label="Model"
                  value={e.model}
                  onChange={(v) => updateEquip(e.id, { model: v })}
                  half
                />
              </Row2>
              <Row2>
                <Field
                  label="Quantity"
                  value={e.quantity}
                  onChange={(v) => updateEquip(e.id, { quantity: v })}
                  keyboardType="number-pad"
                  half
                />
                <Field
                  label="Year installed"
                  value={e.year_installed}
                  onChange={(v) => updateEquip(e.id, { year_installed: v })}
                  keyboardType="number-pad"
                  half
                />
              </Row2>
              <Row2>
                <Field
                  label="Power (kW)"
                  value={e.power_kw}
                  onChange={(v) => updateEquip(e.id, { power_kw: v })}
                  keyboardType="decimal-pad"
                  half
                />
                <Field
                  label="Power (HP)"
                  value={e.power_hp}
                  onChange={(v) => updateEquip(e.id, { power_hp: v })}
                  keyboardType="decimal-pad"
                  half
                />
              </Row2>
              <Row2>
                <Field
                  label="Total watts"
                  value={e.total_watts}
                  onChange={(v) => updateEquip(e.id, { total_watts: v })}
                  keyboardType="number-pad"
                  half
                />
                <Field
                  label="Hours"
                  value={e.hours}
                  onChange={(v) => updateEquip(e.id, { hours: v })}
                  keyboardType="number-pad"
                  half
                />
              </Row2>
              <Row2>
                <Field
                  label="Capacity (L)"
                  value={e.capacity_liters}
                  onChange={(v) => updateEquip(e.id, { capacity_liters: v })}
                  keyboardType="number-pad"
                  half
                />
                <Field
                  label="Capacity (pax)"
                  value={e.capacity_persons}
                  onChange={(v) => updateEquip(e.id, { capacity_persons: v })}
                  keyboardType="number-pad"
                  half
                />
              </Row2>
              <Field
                label="Notes"
                value={e.notes}
                onChange={(v) => updateEquip(e.id, { notes: v })}
                multiline
              />
            </View>
          ))}
          <Pressable
            onPress={addEquip}
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="plus" size={16} color={GOLD} />
            <Text style={styles.addBtnText}>Add equipment item</Text>
          </Pressable>
        </View>

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
          disabled={!!loadingYacht}
          style={({ pressed }) => [
            styles.primaryBtn,
            { opacity: loadingYacht ? 0.5 : pressed ? 0.85 : 1 },
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
  multiline,
  placeholder,
  hidden,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  half?: boolean;
  multiline?: boolean;
  placeholder?: string;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <View style={[styles.field, half && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor={FAINT}
        multiline={multiline}
        style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
      />
    </View>
  );
}

function PillSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.segRow}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(active ? "" : o.value)}
              style={[styles.segSmall, active && styles.segActive]}
            >
              <Text style={[styles.segText, active && styles.segTextActive]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  helpText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
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
  fieldInputMulti: { minHeight: 70, textAlignVertical: "top" },
  unitToggle: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  unitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: NAVY_ELEV,
    minWidth: 42,
    alignItems: "center",
  },
  unitText: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  equipCard: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginBottom: 12,
  },
  equipCardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  equipCardTitle: {
    color: IVORY,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(201,169,97,0.5)",
    backgroundColor: "rgba(201,169,97,0.06)",
    marginTop: 2,
  },
  addBtnText: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 13 },
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
