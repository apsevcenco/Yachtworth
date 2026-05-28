import { Feather } from "@expo/vector-icons";
import {
  getGetYachtQueryKey,
  useGenerateListing,
  useGetYacht,
  type Yacht,
} from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const FAINT = "rgba(247,243,236,0.4)";
const DIVIDER = "rgba(247,243,236,0.08)";
const ERROR = "#FF8A8A";

type YachtType = "motor_yacht" | "sailing_yacht" | "catamaran" | "superyacht";
type ListingType = "sale" | "charter" | "both";
type Style = "professional" | "luxury" | "technical" | "concise";
type Lang = "english" | "french" | "italian" | "spanish" | "german" | "russian";
type WordLen = "short" | "medium" | "full";
type Tone = "neutral" | "exclusive" | "friendly";

const TYPE_OPTIONS: { v: YachtType; label: string }[] = [
  { v: "motor_yacht", label: "Motor" },
  { v: "sailing_yacht", label: "Sailing" },
  { v: "catamaran", label: "Catamaran" },
  { v: "superyacht", label: "Superyacht" },
];

const HIGHLIGHTS: string[] = [
  "Recently refitted",
  "Flybridge",
  "Beach club / swim platform",
  "Jacuzzi / hot tub",
  "Stabilizers at anchor",
  "Air conditioning throughout",
  "Watermaker",
  "Starlink / high-speed WiFi",
  "Water toys package",
  "Large tender",
  "Jet ski(s)",
  "Professional crew",
  "Excellent condition",
  "Price recently reduced",
  "VAT paid (EU)",
  "Available for charter",
  "Immediate delivery",
  "Survey available",
];

const OPERATING_AREAS: string[] = [
  "Mediterranean",
  "Caribbean",
  "Northern Europe",
  "Asia-Pacific",
  "Middle East",
  "Worldwide",
];

const STYLE_OPTIONS: { v: Style; label: string; sub: string }[] = [
  { v: "professional", label: "Professional", sub: "Formal & precise" },
  { v: "luxury", label: "Luxury", sub: "Aspirational" },
  { v: "technical", label: "Technical", sub: "Detail-rich" },
  { v: "concise", label: "Concise", sub: "Short & sharp" },
];

const LANG_OPTIONS: { v: Lang; label: string }[] = [
  { v: "english", label: "English" },
  { v: "french", label: "French" },
  { v: "italian", label: "Italian" },
  { v: "spanish", label: "Spanish" },
  { v: "german", label: "German" },
  { v: "russian", label: "Russian" },
];

const LEN_OPTIONS: { v: WordLen; label: string; sub: string }[] = [
  { v: "short", label: "Short", sub: "~150 words" },
  { v: "medium", label: "Medium", sub: "~300 words" },
  { v: "full", label: "Full", sub: "~500 words" },
];

const TONE_OPTIONS: { v: Tone; label: string }[] = [
  { v: "neutral", label: "Neutral" },
  { v: "exclusive", label: "Exclusive" },
  { v: "friendly", label: "Friendly" },
];

const SECTION_OPTIONS: { key: string; label: string; defaultOn: boolean }[] = [
  { key: "overview", label: "Overview / introduction", defaultOn: true },
  { key: "features", label: "Key features & highlights", defaultOn: true },
  { key: "accommodation", label: "Accommodation & interior", defaultOn: true },
  { key: "performance", label: "Performance & technical", defaultOn: true },
  { key: "equipment", label: "Equipment & systems", defaultOn: true },
  { key: "charter_info", label: "Charter / price info", defaultOn: true },
  {
    key: "call_to_action",
    label: "Call to action (contact broker)",
    defaultOn: false,
  },
];

function num(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function int(v: string | null | undefined): number | null {
  const n = num(v);
  return n == null ? null : Math.round(n);
}

export default function ListingFormScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const params = useLocalSearchParams<{ yacht_id?: string }>();
  const yachtId = params.yacht_id;
  const getQ = useGetYacht(yachtId ?? "", {
    query: {
      queryKey: yachtId ? getGetYachtQueryKey(yachtId) : ["listing-yacht-disabled"],
      enabled: !!yachtId,
      staleTime: 60_000,
    },
  });
  const loadedYacht: Yacht | undefined = getQ.data as Yacht | undefined;
  const generateM = useGenerateListing();

  // Yacht form fields
  const [name, setName] = useState("");
  const [type, setType] = useState<YachtType>("motor_yacht");
  const [builder, setBuilder] = useState("");
  const [model, setModel] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [lengthM, setLengthM] = useState("");
  const [beamM, setBeamM] = useState("");
  const [guests, setGuests] = useState("");
  const [cabins, setCabins] = useState("");
  const [crew, setCrew] = useState("");
  const [flag, setFlag] = useState("");
  const [homeBase, setHomeBase] = useState("");
  const [opArea, setOpArea] = useState<string>("Mediterranean");
  const [maxSpeed, setMaxSpeed] = useState("");
  const [cruiseSpeed, setCruiseSpeed] = useState("");
  const [rangeNm, setRangeNm] = useState("");
  const [engines, setEngines] = useState("");
  const [highlights, setHighlights] = useState<Set<string>>(new Set());
  const [equipTags, setEquipTags] = useState<Set<string>>(new Set());
  const [customHighlight, setCustomHighlight] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [charterRate, setCharterRate] = useState("");

  // Settings
  const [listingType, setListingType] = useState<ListingType>("sale");
  const [style, setStyle] = useState<Style>("professional");
  const [language, setLanguage] = useState<Lang>("english");
  const [wordLen, setWordLen] = useState<WordLen>("medium");
  const [tone, setTone] = useState<Tone>("neutral");
  const [sectionsOn, setSectionsOn] = useState<Set<string>>(
    new Set(SECTION_OPTIONS.filter((s) => s.defaultOn).map((s) => s.key)),
  );
  const [brokerage, setBrokerage] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [showErrors, setShowErrors] = useState(false);
  const prefilled = !!loadedYacht;

  // Prefill from yacht profile
  useEffect(() => {
    if (!loadedYacht) return;
    const y = loadedYacht;
    setName(y.name ?? "");
    if (
      y.yacht_type === "motor_yacht" ||
      y.yacht_type === "sailing_yacht" ||
      y.yacht_type === "catamaran" ||
      y.yacht_type === "superyacht"
    ) {
      setType(y.yacht_type);
    }
    setBuilder(y.brand ?? "");
    setModel(y.model ?? "");
    setYearBuilt(y.year_built != null ? String(y.year_built) : "");
    setLengthM(y.length_meters != null ? String(y.length_meters) : "");
    setBeamM(y.beam_meters != null ? String(y.beam_meters) : "");
    setCabins(y.cabins != null ? String(y.cabins) : "");
    if (y.cabins != null && y.cabins > 0) {
      setGuests(String(y.cabins * 2));
    }
    setFlag(y.registration_number ?? "");
    setHomeBase(y.home_port ?? "");
    const engineParts = [
      y.engine_count && y.engine_count > 0
        ? `${y.engine_count} ×`
        : null,
      y.engine_maker,
      y.engine_model,
      y.total_hp ? `${y.total_hp} HP` : null,
    ].filter(Boolean);
    if (engineParts.length) setEngines(engineParts.join(" "));
  }, [loadedYacht]);

  const nameErr = showErrors && !name.trim();
  const yearErr =
    showErrors && (!yearBuilt || !Number.isFinite(int(yearBuilt) ?? NaN));
  const lengthErr = showErrors && !((num(lengthM) ?? 0) > 0);

  const canSubmit = useMemo(
    () =>
      !!name.trim() &&
      !!Number.isFinite(int(yearBuilt) ?? NaN) &&
      (num(lengthM) ?? 0) > 0 &&
      sectionsOn.size > 0,
    [name, yearBuilt, lengthM, sectionsOn],
  );

  const toggleSet = (s: Set<string>, k: string): Set<string> => {
    const n = new Set(s);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
  };

  const submit = async () => {
    if (!canSubmit) {
      setShowErrors(true);
      return;
    }
    const yachtPayload = {
      name: name.trim(),
      type,
      builder: builder.trim() || null,
      model: model.trim() || null,
      year_built: int(yearBuilt)!,
      length_meters: num(lengthM)!,
      beam_meters: num(beamM),
      guests: int(guests),
      cabins: int(cabins),
      crew: int(crew),
      flag: flag.trim() || null,
      home_base: homeBase.trim() || null,
      operating_area: opArea,
      max_speed_knots: num(maxSpeed),
      cruising_speed_knots: num(cruiseSpeed),
      range_nm: num(rangeNm),
      engines: engines.trim() || null,
      highlights: Array.from(highlights),
      equipment_highlights: Array.from(equipTags),
      custom_highlight: customHighlight.trim() || null,
      asking_price_eur: num(askingPrice),
      charter_rate_eur_week: num(charterRate),
      photo_url: loadedYacht?.cover_photo_url ?? loadedYacht?.photo_url ?? null,
    };
    const settingsPayload = {
      listing_type: listingType,
      style,
      language,
      word_length: wordLen,
      tone,
      sections: Array.from(sectionsOn),
      brokerage_name: brokerage.trim() || null,
      contact_email: contactEmail.trim() || null,
    };
    try {
      const result = await generateM.mutateAsync({
        data: {
          yacht_id: yachtId ?? null,
          yacht: yachtPayload,
          settings: settingsPayload,
        },
      });
      router.push({
        pathname: "/listing/result",
        params: {
          text: result.generated_text,
          yacht_name: yachtPayload.name,
          listing_type: listingType,
          style,
          language,
          word_length: wordLen,
          ai_used: result.ai_used ? "1" : "0",
          yacht_id: yachtId ?? "",
          yacht_payload: JSON.stringify(yachtPayload),
          settings_payload: JSON.stringify(settingsPayload),
          warning: result.warning ?? "",
        },
      });
    } catch {
      // mutation surfaces error via generateM.error
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: NAVY }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={{
          paddingTop: (isWeb ? 67 : insets.top) + 56,
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 100,
        }}
        keyboardShouldPersistTaps="handled"
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

        <Text style={styles.kicker}>LISTING GENERATOR</Text>
        <Text style={styles.title}>Yacht details</Text>

        {prefilled && (
          <View style={styles.banner}>
            <Feather name="check" size={14} color={GOLD} />
            <Text style={styles.bannerText}>
              Data loaded from {loadedYacht?.name ?? "yacht"} · edit if needed
            </Text>
          </View>
        )}

        <Section title="Basics">
          <Field label="Yacht name *" error={nameErr ? "Required" : null}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Aurelia"
              placeholderTextColor={FAINT}
            />
          </Field>
          <Pills
            label="Type *"
            value={type}
            options={TYPE_OPTIONS}
            onChange={setType}
          />
          <Field label="Builder / yard">
            <TextInput
              style={styles.input}
              value={builder}
              onChangeText={setBuilder}
              placeholder="e.g. Azimut"
              placeholderTextColor={FAINT}
            />
          </Field>
          <Field label="Model">
            <TextInput
              style={styles.input}
              value={model}
              onChangeText={setModel}
              placeholder="e.g. Grande 24M"
              placeholderTextColor={FAINT}
            />
          </Field>
          <Row2>
            <Field label="Year built *" error={yearErr ? "Required" : null}>
              <TextInput
                style={styles.input}
                value={yearBuilt}
                onChangeText={setYearBuilt}
                keyboardType="number-pad"
                placeholder="2019"
                placeholderTextColor={FAINT}
              />
            </Field>
            <Field label="Length (LOA) *" error={lengthErr ? "Required" : null}>
              <TextInput
                style={styles.input}
                value={lengthM}
                onChangeText={setLengthM}
                keyboardType="decimal-pad"
                placeholder="24"
                placeholderTextColor={FAINT}
              />
            </Field>
          </Row2>
          <Row2>
            <Field label="Beam (m)">
              <TextInput
                style={styles.input}
                value={beamM}
                onChangeText={setBeamM}
                keyboardType="decimal-pad"
                placeholderTextColor={FAINT}
              />
            </Field>
            <Field label="Guests">
              <TextInput
                style={styles.input}
                value={guests}
                onChangeText={setGuests}
                keyboardType="number-pad"
                placeholderTextColor={FAINT}
              />
            </Field>
          </Row2>
          <Row2>
            <Field label="Cabins">
              <TextInput
                style={styles.input}
                value={cabins}
                onChangeText={setCabins}
                keyboardType="number-pad"
                placeholderTextColor={FAINT}
              />
            </Field>
            <Field label="Crew">
              <TextInput
                style={styles.input}
                value={crew}
                onChangeText={setCrew}
                keyboardType="number-pad"
                placeholderTextColor={FAINT}
              />
            </Field>
          </Row2>
        </Section>

        <Section title="Flag & base">
          <Field label="Flag / registration">
            <TextInput
              style={styles.input}
              value={flag}
              onChangeText={setFlag}
              placeholder="e.g. Malta"
              placeholderTextColor={FAINT}
            />
          </Field>
          <Field label="Home base / location">
            <TextInput
              style={styles.input}
              value={homeBase}
              onChangeText={setHomeBase}
              placeholder="e.g. Monaco"
              placeholderTextColor={FAINT}
            />
          </Field>
          <Pills
            label="Operating area"
            value={opArea}
            options={OPERATING_AREAS.map((v) => ({ v, label: v }))}
            onChange={setOpArea}
          />
        </Section>

        <Section title="Performance (optional)">
          <Row2>
            <Field label="Max speed (kn)">
              <TextInput
                style={styles.input}
                value={maxSpeed}
                onChangeText={setMaxSpeed}
                keyboardType="decimal-pad"
                placeholderTextColor={FAINT}
              />
            </Field>
            <Field label="Cruising speed (kn)">
              <TextInput
                style={styles.input}
                value={cruiseSpeed}
                onChangeText={setCruiseSpeed}
                keyboardType="decimal-pad"
                placeholderTextColor={FAINT}
              />
            </Field>
          </Row2>
          <Field label="Range (nm)">
            <TextInput
              style={styles.input}
              value={rangeNm}
              onChangeText={setRangeNm}
              keyboardType="decimal-pad"
              placeholderTextColor={FAINT}
            />
          </Field>
          <Field label="Engines">
            <TextInput
              style={styles.input}
              value={engines}
              onChangeText={setEngines}
              placeholder="e.g. 2 × MAN V12 1800HP"
              placeholderTextColor={FAINT}
            />
          </Field>
        </Section>

        <Section title="Key selling points">
          <Text style={styles.helper}>
            Select all that apply — these shape what the AI emphasises.
          </Text>
          <View style={styles.checkGrid}>
            {HIGHLIGHTS.map((h) => {
              const on = highlights.has(h);
              return (
                <Pressable
                  key={h}
                  onPress={() => setHighlights((s) => toggleSet(s, h))}
                  style={({ pressed }) => [
                    styles.checkChip,
                    on && styles.checkChipOn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather
                    name={on ? "check-square" : "square"}
                    size={14}
                    color={on ? GOLD : FAINT}
                  />
                  <Text
                    style={[styles.checkChipText, on && styles.checkChipTextOn]}
                  >
                    {h}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Field label="Custom highlight">
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              value={customHighlight}
              onChangeText={setCustomHighlight}
              placeholder="Free text, optional"
              placeholderTextColor={FAINT}
              multiline
            />
          </Field>
        </Section>

        <Section title="Equipment tags (optional)">
          <Text style={styles.helper}>
            Add short tag chips highlighting notable equipment.
          </Text>
          <EquipTagsEditor value={equipTags} onChange={setEquipTags} />
        </Section>

        <Section title="Pricing (optional)">
          <Field label="Asking price (€)">
            <TextInput
              style={styles.input}
              value={askingPrice}
              onChangeText={setAskingPrice}
              keyboardType="decimal-pad"
              placeholder="e.g. 4500000"
              placeholderTextColor={FAINT}
            />
          </Field>
          <Field label="Charter rate (€/week)">
            <TextInput
              style={styles.input}
              value={charterRate}
              onChangeText={setCharterRate}
              keyboardType="decimal-pad"
              placeholder="e.g. 85000"
              placeholderTextColor={FAINT}
            />
          </Field>
        </Section>

        <Text style={styles.bigKicker}>LISTING SETTINGS</Text>

        <Section title="Listing & style">
          <Pills
            label="Listing type *"
            value={listingType}
            options={[
              { v: "sale", label: "For Sale" },
              { v: "charter", label: "For Charter" },
              { v: "both", label: "Both" },
            ]}
            onChange={setListingType}
          />
          <PillsCard
            label="Style *"
            value={style}
            options={STYLE_OPTIONS}
            onChange={setStyle}
          />
          <Pills
            label="Language *"
            value={language}
            options={LANG_OPTIONS}
            onChange={setLanguage}
          />
          <PillsCard
            label="Length *"
            value={wordLen}
            options={LEN_OPTIONS}
            onChange={setWordLen}
          />
          <Pills
            label="Tone"
            value={tone}
            options={TONE_OPTIONS}
            onChange={setTone}
          />
        </Section>

        <Section title="Sections to include">
          <View>
            {SECTION_OPTIONS.map((s) => {
              const on = sectionsOn.has(s.key);
              return (
                <Pressable
                  key={s.key}
                  onPress={() => setSectionsOn((x) => toggleSet(x, s.key))}
                  style={({ pressed }) => [
                    styles.checkRow,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather
                    name={on ? "check-square" : "square"}
                    size={16}
                    color={on ? GOLD : FAINT}
                  />
                  <Text style={styles.checkRowText}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Brokerage (optional)">
          <Field label="Your brokerage name">
            <TextInput
              style={styles.input}
              value={brokerage}
              onChangeText={setBrokerage}
              placeholderTextColor={FAINT}
            />
          </Field>
          <Field label="Contact email">
            <TextInput
              style={styles.input}
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={FAINT}
            />
          </Field>
        </Section>

        {generateM.error ? (
          <Text style={styles.errorText}>
            Could not generate listing. Please try again.
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        <Pressable
          onPress={submit}
          disabled={generateM.isPending}
          style={({ pressed }) => [
            styles.submitBtn,
            !canSubmit && styles.submitBtnDim,
            { opacity: pressed || generateM.isPending ? 0.8 : 1 },
          ]}
        >
          {generateM.isPending ? (
            <ActivityIndicator color={NAVY} />
          ) : (
            <>
              <Feather name="zap" size={16} color={NAVY} />
              <Text style={styles.submitBtnText}>Generate listing</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldErr}>{error}</Text> : null}
    </View>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <View style={styles.row2}>{children}</View>;
}

function Pills<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.pillsRow}>
        {options.map((o) => {
          const on = o.v === value;
          return (
            <Pressable
              key={o.v}
              onPress={() => onChange(o.v)}
              style={({ pressed }) => [
                styles.pill,
                on && styles.pillOn,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.pillText, on && styles.pillTextOn]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PillsCard<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { v: T; label: string; sub: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.cardsRow}>
        {options.map((o) => {
          const on = o.v === value;
          return (
            <Pressable
              key={o.v}
              onPress={() => onChange(o.v)}
              style={({ pressed }) => [
                styles.cardOpt,
                on && styles.cardOptOn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.cardOptLabel, on && styles.cardOptLabelOn]}>
                {o.label}
              </Text>
              <Text style={[styles.cardOptSub, on && styles.cardOptSubOn]}>
                {o.sub}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function EquipTagsEditor({
  value,
  onChange,
}: {
  value: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  const [draft, setDraft] = useState("");
  const tags = Array.from(value);
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    const n = new Set(value);
    n.add(t.slice(0, 60));
    onChange(n);
    setDraft("");
  };
  return (
    <View>
      {tags.length > 0 && (
        <View style={styles.tagWrap}>
          {tags.map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                const n = new Set(value);
                n.delete(t);
                onChange(n);
              }}
              style={styles.tag}
            >
              <Text style={styles.tagText}>{t}</Text>
              <Feather name="x" size={12} color={GOLD} />
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.tagAddRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={draft}
          onChangeText={setDraft}
          placeholder="e.g. Gyro stabilizers"
          placeholderTextColor={FAINT}
          onSubmitEditing={add}
        />
        <Pressable
          onPress={add}
          style={({ pressed }) => [
            styles.tagAddBtn,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="plus" size={18} color={GOLD} />
        </Pressable>
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
    marginBottom: 16,
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 6,
  },
  bigKicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: 4,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 28,
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(201,169,97,0.10)",
    borderColor: "rgba(201,169,97,0.3)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  bannerText: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  section: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  sectionTitle: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 15,
    letterSpacing: 0.2,
    marginBottom: 14,
  },
  helper: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 17,
  },
  fieldLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  fieldErr: {
    color: ERROR,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 4,
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
  row2: { flexDirection: "row", gap: 10 },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: NAVY_ELEV,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  pillOn: {
    backgroundColor: "rgba(201,169,97,0.14)",
    borderColor: GOLD,
  },
  pillText: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 13 },
  pillTextOn: { color: GOLD },
  cardsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cardOpt: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: NAVY_ELEV,
    borderWidth: 1,
    borderColor: DIVIDER,
    minWidth: 110,
  },
  cardOptOn: {
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.10)",
  },
  cardOptLabel: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  cardOptLabelOn: { color: GOLD },
  cardOptSub: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  cardOptSubOn: { color: "rgba(201,169,97,0.75)" },
  checkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  checkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: NAVY_ELEV,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  checkChipOn: {
    backgroundColor: "rgba(201,169,97,0.10)",
    borderColor: GOLD,
  },
  checkChipText: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12 },
  checkChipTextOn: { color: GOLD },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  checkRowText: {
    color: IVORY,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "rgba(201,169,97,0.12)",
    borderWidth: 1,
    borderColor: GOLD,
  },
  tagText: { color: GOLD, fontFamily: "Inter_500Medium", fontSize: 12 },
  tagAddRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  tagAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(201,169,97,0.10)",
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: ERROR,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    backgroundColor: NAVY_DEEP,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 16,
  },
  submitBtnDim: { backgroundColor: "rgba(201,169,97,0.4)" },
  submitBtnText: {
    color: NAVY,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
