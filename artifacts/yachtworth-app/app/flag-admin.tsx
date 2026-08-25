import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  getFlagFeeRules,
  getFlagImportHistory,
  getFlagRegistries,
  getFlagSources,
  type FlagFeeRule,
  type FlagImportRun,
  type FlagRegistry,
  type FlagSource,
} from "../lib/flagIntelligence";
import { RegistryFlag } from "../components/RegistryFlag";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.62)";
const DIVIDER = "rgba(247,243,236,0.1)";
const GREEN = "#7BD389";
const RED = "#E77777";

type Tab = "registries" | "fees" | "sources" | "quality" | "imports";

const TABS: Array<{ key: Tab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }> = [
  { key: "registries", label: "Flag Registries", icon: "flag" },
  { key: "fees", label: "Fee Rules", icon: "dollar-sign" },
  { key: "sources", label: "Official Sources", icon: "link" },
  { key: "quality", label: "Data Quality", icon: "shield" },
  { key: "imports", label: "Import History", icon: "upload-cloud" },
];

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "-";
}

function statusText(value: unknown): string {
  return text(value).replace(/_/g, " ");
}

function qualityTone(value: unknown): "green" | "gold" | "red" {
  const v = String(value ?? "").toLowerCase();
  if (v === "production_ready") return "green";
  if (v === "usable_with_warnings") return "gold";
  return "red";
}

function money(rule: FlagFeeRule): string {
  if (rule.amount == null || !rule.currency) return "Formula / quote";
  return `${rule.currency} ${Number(rule.amount).toLocaleString("en-GB")}`;
}

export default function FlagAdminScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [tab, setTab] = useState<Tab>("registries");
  const [registries, setRegistries] = useState<FlagRegistry[]>([]);
  const [fees, setFees] = useState<FlagFeeRule[]>([]);
  const [sources, setSources] = useState<FlagSource[]>([]);
  const [imports, setImports] = useState<FlagImportRun[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [registryRes, feeRes, sourceRes, importRes] = await Promise.all([
        getFlagRegistries(),
        getFlagFeeRules(),
        getFlagSources(),
        getFlagImportHistory(),
      ]);
      setRegistries(registryRes.registries);
      setFees(feeRes.items);
      setSources(sourceRes.items);
      setImports(importRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const filteredRegistries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registries;
    return registries.filter((item) =>
      [
        item.flag_name,
        item.country,
        item.registry_type,
        item.advisor?.official_registry_name,
        item.advisor?.coverage_status,
        item.advisor?.confidence_level,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [registries, search]);

  const qualityCounts = useMemo(() => {
    return registries.reduce<Record<string, number>>((acc, flag) => {
      const key = flag.advisor?.data_quality_status ?? "research_required";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [registries]);

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 62 : insets.top) + 64 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, isWeb && styles.webScroll, { paddingBottom: insets.bottom + 44 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Feather name="arrow-left" size={22} color={IVORY} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>YACHTWORTH ADMIN</Text>
            <Text style={styles.title}>Flag Intelligence</Text>
            <Text style={styles.subtitle}>Read-only data administration for registries, fees, sources and import quality.</Text>
          </View>
        </View>

        <View style={styles.tabList}>
          {TABS.map((item) => (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tabRow, tab === item.key && styles.tabRowActive]}>
              <Feather name={item.icon} size={17} color={tab === item.key ? GOLD : MUTED} />
              <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.centerPanel}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : error ? (
          <View style={styles.centerPanel}>
            <Feather name="alert-circle" size={28} color={RED} />
            <Text style={styles.emptyTitle}>Could not load Flag Admin</Text>
            <Text style={styles.emptyCopy}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <Summary label="Registries" value={registries.length} />
              <Summary label="Fee rules" value={fees.length} />
              <Summary label="Sources" value={sources.length} />
              <Summary label="Imports" value={imports.length} />
            </View>

            {tab === "registries" || tab === "quality" ? (
              <View style={styles.searchBox}>
                <Feather name="search" size={17} color={MUTED} />
                <TextInput value={search} onChangeText={setSearch} placeholder="Search flags, registry, confidence, coverage" placeholderTextColor="rgba(247,243,236,0.34)" style={styles.searchInput} />
              </View>
            ) : null}

            {tab === "registries" ? <Registries items={filteredRegistries} /> : null}
            {tab === "fees" ? <Fees items={fees} /> : null}
            {tab === "sources" ? <Sources items={sources} /> : null}
            {tab === "quality" ? <Quality items={filteredRegistries} counts={qualityCounts} /> : null}
            {tab === "imports" ? <Imports items={imports} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Badge({ label, tone = "gold" }: { label: string; tone?: "green" | "gold" | "red" }) {
  const color = tone === "green" ? GREEN : tone === "red" ? RED : GOLD;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function Registries({ items }: { items: FlagRegistry[] }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Flag Registries</Text>
      {items.map((flag) => (
        <View key={flag.code} style={styles.rowCard}>
          <RegistryFlag registry={flag} size="sm" />
          <View style={{ flex: 1 }}>
            <View style={styles.nameLine}>
              <Text style={styles.rowTitle}>{flag.flag_name}</Text>
              {flag.registry_badge ? <Badge label={flag.registry_badge} /> : null}
            </View>
            <Text style={styles.rowMeta}>{text(flag.advisor?.official_registry_name)} / {text(flag.advisor?.registry_family ?? flag.registry_type)}</Text>
            <Text style={styles.rowMeta}>Flag code: {text(flag.flag_code)} / Asset: {text(flag.flag_asset_path)}</Text>
            <Text style={styles.rowMeta}>Source: {text(flag.flag_asset_source)} / Licence: {text(flag.flag_asset_license)}</Text>
            {flag.flag_note ? <Text style={styles.noteText}>{flag.flag_note}</Text> : null}
            <View style={styles.badgeRow}>
              <Badge label={flag.advisor?.is_eu_flag ? "EU" : "Non-EU"} tone={flag.advisor?.is_eu_flag ? "green" : "gold"} />
              <Badge label={`Private ${statusText(flag.advisor?.private_registration_status)}`} />
              <Badge label={`Commercial ${statusText(flag.advisor?.commercial_registration_status)}`} />
              <Badge label={statusText(flag.advisor?.confidence_level)} />
              <Badge label={statusText(flag.advisor?.coverage_status)} tone={qualityTone(flag.advisor?.data_quality_status)} />
            </View>
          </View>
          <Text style={styles.dateText}>{text(flag.advisor?.last_verified_at)}</Text>
        </View>
      ))}
    </View>
  );
}

function Fees({ items }: { items: FlagFeeRule[] }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Fee Rules</Text>
      {items.map((rule) => (
        <View key={rule.id} style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{text(rule.flag_registries?.flag_name)} / {rule.fee_component}</Text>
            <Text style={styles.rowMeta}>{text(rule.registration_type)} / {money(rule)}</Text>
            <Text style={styles.bodyText}>{text(rule.formula_text ?? rule.notes)}</Text>
          </View>
          <Text style={styles.dateText}>{text(rule.last_verified_at)}</Text>
        </View>
      ))}
    </View>
  );
}

function Sources({ items }: { items: FlagSource[] }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Official Sources</Text>
      {items.map((source) => (
        <View key={source.id} style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{text(source.flag_registries?.flag_name)} / {source.topic}</Text>
            <Text style={styles.rowMeta}>{text(source.source_type)} / {source.is_official ? "Official" : "Supporting"}</Text>
            <Text style={styles.linkText}>{source.official_url}</Text>
          </View>
          <Text style={styles.dateText}>{text(source.checked_at)}</Text>
        </View>
      ))}
    </View>
  );
}

function Quality({ items, counts }: { items: FlagRegistry[]; counts: Record<string, number> }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Data Quality</Text>
      <View style={styles.summaryRow}>
        <Summary label="Production ready" value={counts.production_ready ?? 0} />
        <Summary label="Usable warnings" value={counts.usable_with_warnings ?? 0} />
        <Summary label="Research required" value={counts.research_required ?? 0} />
      </View>
      {items.map((flag) => (
        <View key={flag.code} style={styles.rowCard}>
          <RegistryFlag registry={flag} size="sm" />
          <View style={{ flex: 1 }}>
            <View style={styles.nameLine}>
              <Text style={styles.rowTitle}>{flag.flag_name}</Text>
              {flag.registry_badge ? <Badge label={flag.registry_badge} /> : null}
            </View>
            <Text style={styles.rowMeta}>Score {flag.advisor?.data_quality_score ?? "-"} / {statusText(flag.advisor?.data_quality_status)}</Text>
            <Text style={styles.rowMeta}>Flag asset: {text(flag.flag_code)} / {text(flag.flag_asset_path)}</Text>
            <Text style={styles.bodyText}>{text(flag.advisor?.missing_verification_notes)}</Text>
          </View>
          <Badge label={statusText(flag.advisor?.data_quality_status)} tone={qualityTone(flag.advisor?.data_quality_status)} />
        </View>
      ))}
    </View>
  );
}

function Imports({ items }: { items: FlagImportRun[] }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Import History</Text>
      {items.length ? (
        items.map((run) => (
          <View key={run.id} style={styles.rowCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{run.filename}</Text>
              <Text style={styles.rowMeta}>{run.source_version} / {run.status}</Text>
              <Text style={styles.bodyText}>Rows: {run.imported_rows} imported, {run.updated_rows} updated, {run.failed_rows} failed</Text>
            </View>
            <Text style={styles.dateText}>{text(run.completed_at ?? run.started_at)}</Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyTitle}>No import runs yet</Text>
          <Text style={styles.emptyCopy}>After applying the generated SQL import, runs will appear here.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  scroll: { paddingHorizontal: 22 },
  webScroll: { maxWidth: 1240, width: "100%", alignSelf: "center" },
  topbar: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  iconButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: NAVY_DEEP, alignItems: "center", justifyContent: "center" },
  kicker: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 2.2 },
  title: { color: IVORY, fontFamily: "Gilroy-ExtraBold", fontSize: 34, marginTop: 4 },
  subtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 4 },
  tabList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  tabRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY_DEEP, paddingHorizontal: 12 },
  tabRowActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.14)" },
  tabText: { color: MUTED, fontFamily: "Inter_700Bold", fontSize: 12 },
  tabTextActive: { color: GOLD },
  centerPanel: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: NAVY_DEEP, borderRadius: 16, borderWidth: 1, borderColor: DIVIDER, padding: 24 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  summaryCard: { flexGrow: 1, flexBasis: Platform.OS === "web" ? 180 : "47%", backgroundColor: NAVY_DEEP, borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, padding: 14 },
  summaryValue: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 27 },
  summaryLabel: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  searchBox: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY_DEEP, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  searchInput: { flex: 1, color: IVORY, fontFamily: "Inter_500Medium", fontSize: 14, minHeight: 46 },
  panel: { backgroundColor: NAVY_DEEP, borderWidth: 1, borderColor: DIVIDER, borderRadius: 16, padding: 16 },
  panelTitle: { color: IVORY, fontFamily: "Gilroy-Bold", fontSize: 18, marginBottom: 12 , fontWeight: "700"},
  rowCard: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: NAVY, borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, padding: 12, marginBottom: 10 },
  rowTitle: { color: IVORY, fontFamily: "Gilroy-Bold", fontSize: 15, lineHeight: 20 , fontWeight: "700"},
  nameLine: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rowMeta: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17, marginTop: 3 },
  noteText: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 18, marginTop: 5 },
  bodyText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, marginTop: 6 },
  linkText: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 18, marginTop: 6 },
  dateText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 11, lineHeight: 16, textAlign: "right", maxWidth: 92 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 },
  badge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: NAVY_DEEP },
  badgeText: { fontFamily: "Inter_800ExtraBold", fontSize: 10, textTransform: "capitalize" },
  emptyBlock: { paddingVertical: 20, gap: 5 },
  emptyTitle: { color: IVORY, fontFamily: "Gilroy-Bold", fontSize: 16, textAlign: "center" , fontWeight: "700"},
  emptyCopy: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 19 },
});
