import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import {
  getBrokerContacts,
  importCharterClientsToBrokerOs,
  type BrokerContact,
  type BrokerContactsResponse,
} from "../lib/brokerOs";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.62)";
const DIVIDER = "rgba(247,243,236,0.1)";
const GREEN = "#7BD389";
const RED = "#E77777";

function sourceLabel(source: string | null | undefined): string {
  if (!source) return "manual";
  return source.replace(/_/g, " ");
}

function value(v: string | null | undefined): string {
  return v?.trim() || "-";
}

function formatDate(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB");
}

export default function CrmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState<BrokerContactsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getBrokerContacts({ q: search, source });
      setData(result);
      setSelectedId((prev) => {
        if (prev && result.items.some((item) => item.id === prev)) return prev;
        return result.items[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      load().catch(() => {});
    }, 220);
    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, search, source]);

  const sources = useMemo(() => ["all", ...(data?.filters.sources ?? [])], [data?.filters.sources]);
  const selected = data?.items.find((item) => item.id === selectedId) ?? data?.items[0] ?? null;

  async function importClients() {
    setImporting(true);
    try {
      const result = await importCharterClientsToBrokerOs();
      Alert.alert("Imported", `${result.imported} charter client${result.imported === 1 ? "" : "s"} linked to CRM.`);
      await load();
    } catch (err) {
      Alert.alert("Import failed", err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 62 : insets.top) + 64 }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, isWeb && styles.webScroll, { paddingBottom: insets.bottom + 44 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Feather name="arrow-left" size={22} color={IVORY} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>YACHTWORTH</Text>
            <Text style={styles.title}>CRM</Text>
            <Text style={styles.subtitle}>Client list, filters and linked Broker OS cases.</Text>
          </View>
        </View>

        {!isLoaded || loading ? (
          <View style={styles.centerPanel}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : !isSignedIn ? (
          <View style={styles.centerPanel}>
            <Feather name="lock" size={28} color={GOLD} />
            <Text style={styles.emptyTitle}>Sign in required</Text>
          </View>
        ) : error ? (
          <View style={styles.centerPanel}>
            <Feather name="alert-circle" size={28} color={RED} />
            <Text style={styles.emptyTitle}>Could not load CRM</Text>
            <Text style={styles.emptyCopy}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.actions}>
              <View style={styles.searchBox}>
                <Feather name="search" size={17} color={MUTED} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search by name, email, phone, country, notes"
                  placeholderTextColor="rgba(247,243,236,0.34)"
                  style={styles.searchInput}
                />
              </View>
              <Pressable onPress={importClients} disabled={importing} style={styles.secondaryButton}>
                {importing ? <ActivityIndicator color={GOLD} /> : <Feather name="download" size={16} color={GOLD} />}
                <Text style={styles.secondaryText}>Import charter clients</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {sources.map((s) => (
                <Pressable key={s} onPress={() => setSource(s)} style={[styles.filterChip, source === s && styles.filterChipActive]}>
                  <Text style={[styles.filterText, source === s && styles.filterTextActive]}>{sourceLabel(s)}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{data?.total ?? 0}</Text>
                <Text style={styles.summaryLabel}>Visible clients</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {data?.items.reduce((sum, item) => sum + item.active_cases_count, 0) ?? 0}
                </Text>
                <Text style={styles.summaryLabel}>Active cases</Text>
              </View>
            </View>

            <View style={[styles.layout, isWeb && styles.webLayout]}>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Clients</Text>
                {data?.items.length ? (
                  data.items.map((item) => (
                    <ContactRow key={item.id} item={item} active={selected?.id === item.id} onPress={() => setSelectedId(item.id)} />
                  ))
                ) : (
                  <EmptyBlock title="No clients found" copy="Import charter clients or create contacts through Broker OS cases." />
                )}
              </View>

              <View style={[styles.panel, styles.detailPanel]}>
                <Text style={styles.panelTitle}>Client Card</Text>
                {selected ? <ContactDetail item={selected} /> : <EmptyBlock title="Select a client" copy="Client data and linked cases appear here." />}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ContactRow({ item, active, onPress }: { item: BrokerContact; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.contactRow, active && styles.contactRowActive]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.full_name || "?").slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactName}>{item.full_name}</Text>
        <Text style={styles.contactMeta}>{value(item.email)} / {value(item.phone)}</Text>
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>{sourceLabel(item.source)}</Text>
          <Text style={styles.badge}>{item.active_cases_count} active</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={MUTED} />
    </Pressable>
  );
}

function ContactDetail({ item }: { item: BrokerContact }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailName}>{item.full_name}</Text>
      <View style={styles.grid}>
        <Fact label="Email" text={value(item.email)} />
        <Fact label="Phone" text={value(item.phone)} />
        <Fact label="WhatsApp" text={value(item.whatsapp)} />
        <Fact label="LinkedIn" text={value(item.linkedin)} />
        <Fact label="Country" text={value(item.country)} />
        <Fact label="Citizenship" text={value(item.citizenship)} />
        <Fact label="Residency" text={value(item.residency)} />
        <Fact label="Languages" text={item.languages?.length ? item.languages.join(", ") : "-"} />
        <Fact label="Preferred channel" text={value(item.preferred_channel)} />
        <Fact label="Relationship type" text={value(item.relationship_type)} />
        <Fact label="Trust level" text={value(item.trust_level)} />
        <Fact label="Updated" text={formatDate(item.updated_at)} />
      </View>
      {item.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.factLabel}>Notes</Text>
          <Text style={styles.notes}>{item.notes}</Text>
        </View>
      ) : null}
      <Text style={styles.sectionTitle}>Linked Broker OS cases</Text>
      {item.cases.length ? (
        item.cases.map((c) => (
          <View key={c.id} style={styles.caseLink}>
            <Text style={styles.caseTitle}>{c.title}</Text>
            <Text style={styles.caseMeta}>{c.case_type.replace(/_/g, " ")} / {c.stage.replace(/_/g, " ")} / {c.status}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyCopy}>No Broker OS cases linked yet.</Text>
      )}
    </View>
  );
}

function Fact({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

function EmptyBlock({ title, copy }: { title: string; copy: string }) {
  return (
    <View style={styles.emptyBlock}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
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
  subtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 },
  centerPanel: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: NAVY_DEEP, borderRadius: 16, borderWidth: 1, borderColor: DIVIDER, padding: 24 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  searchBox: { flex: 1, minWidth: 260, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, backgroundColor: NAVY_DEEP, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, color: IVORY, fontFamily: "Inter_500Medium", fontSize: 14, minHeight: 46 },
  secondaryButton: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 16 },
  secondaryText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 13 },
  filterRow: { gap: 8, paddingBottom: 12 },
  filterChip: { borderRadius: 999, borderWidth: 1, borderColor: DIVIDER, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: NAVY_DEEP },
  filterChipActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.14)" },
  filterText: { color: MUTED, fontFamily: "Inter_700Bold", fontSize: 12, textTransform: "capitalize" },
  filterTextActive: { color: GOLD },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  summaryCard: { flexGrow: 1, flexBasis: Platform.OS === "web" ? 220 : "47%", backgroundColor: NAVY_DEEP, borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, padding: 14 },
  summaryValue: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 28 },
  summaryLabel: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  layout: { gap: 14 },
  webLayout: { flexDirection: "row", alignItems: "flex-start" },
  panel: { flex: 1, backgroundColor: NAVY_DEEP, borderRadius: 16, borderWidth: 1, borderColor: DIVIDER, padding: 16 },
  detailPanel: { flex: Platform.OS === "web" ? 1.15 : 1 },
  panelTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 18, marginBottom: 12 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: NAVY, borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, padding: 12, marginBottom: 10 },
  contactRowActive: { borderColor: "rgba(201,169,97,0.58)", backgroundColor: NAVY_ELEV },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(201,169,97,0.14)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: GOLD, fontFamily: "Inter_800ExtraBold", fontSize: 18 },
  contactName: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 15 },
  contactMeta: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 3 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  badge: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 11, backgroundColor: "rgba(201,169,97,0.11)", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, textTransform: "capitalize" },
  detail: { gap: 14 },
  detailName: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fact: { flexGrow: 1, flexBasis: Platform.OS === "web" ? "30%" : "45%", backgroundColor: NAVY, borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, padding: 12 },
  factLabel: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 5 },
  factText: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  notesBox: { backgroundColor: NAVY, borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, padding: 12 },
  notes: { color: IVORY, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: GOLD, fontFamily: "Inter_800ExtraBold", fontSize: 14, marginTop: 2 },
  caseLink: { backgroundColor: NAVY, borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, padding: 12 },
  caseTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 14 },
  caseMeta: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4, textTransform: "capitalize" },
  emptyBlock: { paddingVertical: 20, gap: 5 },
  emptyTitle: { color: IVORY, fontFamily: "Inter_800ExtraBold", fontSize: 16, textAlign: "center" },
  emptyCopy: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 19 },
});
