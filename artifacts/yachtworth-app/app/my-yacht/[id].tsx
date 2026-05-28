import { Feather } from "@expo/vector-icons";
import {
  getGetYachtQueryKey,
  getListChartersQueryKey,
  getListCostEstimatesQueryKey,
  getListEstimatesQueryKey,
  getListYachtEquipmentQueryKey,
  getListYachtsQueryKey,
  useDeleteYacht,
  useGetYacht,
  useListCharters,
  useListCostEstimates,
  useListEstimates,
  useListYachtEquipment,
  useUpdateYacht,
  type Charter,
  type CostEstimateListItem,
  type EquipmentItem,
  type EstimateListItem,
  type Yacht,
} from "@workspace/api-client-react";
import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_DEF_BY_KEY,
  summarizeEquipment,
} from "../../lib/equipmentConfig";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompletenessBar } from "../../components/CompletenessBar";
import { TYPE_LABELS, yachtTitle } from "../../components/YachtCard";
import { useUnits } from "../../hooks/useUnits";
import {
  calcCompleteness,
  missingFields,
} from "../../lib/yachtCompleteness";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.08)";

type TabKey = "overview" | "history" | "documents";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  broker: "Broker",
  manager: "Manager",
};

const VAT_LABELS: Record<string, string> = {
  tax_paid_eu: "Tax Paid (EU)",
  tax_not_paid: "Not Paid / Offshore",
  unknown: "Unknown",
};

function formatLength(m: number | null | undefined, units: "metric" | "imperial"): string {
  if (m == null) return "—";
  return units === "metric"
    ? `${m.toFixed(1)} m`
    : `${(m * 3.28084).toFixed(1)} ft`;
}

function formatEur(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1] ?? m} ${parseInt(d, 10)}, ${y}`;
}

export default function YachtDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { units } = useUnits();

  const [tab, setTab] = useState<TabKey>("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  const yachtQ = useGetYacht(id, {
    query: { queryKey: getGetYachtQueryKey(id), enabled: Boolean(id), staleTime: 30_000 },
  });
  const yacht = yachtQ.data;

  const equipmentQ = useListYachtEquipment(id, {
    query: {
      queryKey: getListYachtEquipmentQueryKey(id),
      enabled: Boolean(id),
      staleTime: 30_000,
    },
  });
  const equipment = equipmentQ.data?.items ?? [];

  const updateM = useUpdateYacht();
  const deleteM = useDeleteYacht();

  const onEdit = () => router.push({ pathname: "/my-yacht/edit", params: { id } });

  const onArchive = () => {
    if (!yacht) return;
    const next = !yacht.is_archived;
    Alert.alert(
      next ? "Archive yacht?" : "Unarchive yacht?",
      next
        ? "Archived yachts are hidden from the fleet list. You can restore later."
        : "This yacht will reappear in your fleet.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: next ? "Archive" : "Unarchive",
          style: next ? "destructive" : "default",
          onPress: async () => {
            try {
              await updateM.mutateAsync({ id, data: { is_archived: next } });
              // Invalidate all variants of the yachts list (with/without
              // include_archived param) by matching on the URL prefix.
              await qc.invalidateQueries({ queryKey: ["/api/yachts"] });
              await qc.invalidateQueries({ queryKey: getGetYachtQueryKey(id) });
              if (next) router.back();
            } catch (e) {
              Alert.alert(
                "Couldn't update yacht",
                e instanceof Error ? e.message : "Try again.",
              );
            }
          },
        },
      ],
    );
  };

  const onDelete = () => {
    Alert.alert(
      "Delete yacht?",
      "This permanently removes the yacht profile. Linked history rows will remain unless you delete them separately.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteM.mutateAsync({ id });
              await qc.invalidateQueries({ queryKey: ["/api/yachts"] });
              router.back();
            } catch (e) {
              Alert.alert(
                "Couldn't delete yacht",
                e instanceof Error ? e.message : "Try again.",
              );
            }
          },
        },
      ],
    );
  };

  if (yachtQ.isLoading) {
    return (
      <View style={styles.root}>
        <Header insets={insets} title="…" onBack={() => router.back()} onMenu={() => setMenuOpen(true)} />
        <View style={styles.center}><ActivityIndicator color={GOLD} /></View>
      </View>
    );
  }
  if (yachtQ.isError || !yacht) {
    return (
      <View style={styles.root}>
        <Header insets={insets} title="Not found" onBack={() => router.back()} onMenu={() => setMenuOpen(true)} />
        <View style={styles.center}>
          <Text style={styles.errText}>
            {yachtQ.error instanceof Error ? yachtQ.error.message : "Yacht not found."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header
        insets={insets}
        title={yachtTitle(yacht)}
        onBack={() => router.back()}
        onMenu={() => setMenuOpen(true)}
      />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(["overview", "history", "documents"] as TabKey[]).map((t) => {
          const sel = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={t}
              style={({ pressed }) => [
                styles.tab,
                sel && styles.tabSel,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.tabText, sel && styles.tabTextSel]}>
                {t === "overview" ? "Overview" : t === "history" ? "History" : "Documents"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
          paddingTop: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {tab === "overview" ? (
          <OverviewTab
            yacht={yacht}
            equipment={equipment}
            units={units}
            onEdit={onEdit}
          />
        ) : tab === "history" ? (
          <HistoryTab yachtId={id} />
        ) : (
          <DocumentsTab />
        )}
      </ScrollView>

      {/* Overflow menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menu, { top: insets.top + 50 }]}>
            <MenuItem icon="edit-2" label="Edit" onPress={() => { setMenuOpen(false); onEdit(); }} />
            <MenuItem
              icon="archive"
              label={yacht.is_archived ? "Unarchive" : "Archive"}
              onPress={() => { setMenuOpen(false); onArchive(); }}
            />
            <MenuItem
              icon="trash-2"
              label="Delete"
              destructive
              onPress={() => { setMenuOpen(false); onDelete(); }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ─── Header ─────────────────────────────────────────────────────── */

function Header({
  insets,
  title,
  onBack,
  onMenu,
}: {
  insets: { top: number };
  title: string;
  onBack: () => void;
  onMenu: () => void;
}) {
  return (
    <View style={[styles.header, { paddingTop: insets.top + 56 }]}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Feather name="chevron-left" size={22} color={IVORY} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <Pressable
        onPress={onMenu}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Yacht actions menu"
        style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Feather name="more-vertical" size={20} color={IVORY} />
      </Pressable>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Feather name={icon} size={16} color={destructive ? "#E07B7B" : IVORY} />
      <Text style={[styles.menuItemText, destructive && { color: "#E07B7B" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ─── Overview ───────────────────────────────────────────────────── */

function OverviewTab({
  yacht,
  equipment,
  units,
  onEdit,
}: {
  yacht: Yacht;
  equipment: EquipmentItem[];
  units: "metric" | "imperial";
  onEdit: () => void;
}) {
  const pct = calcCompleteness(yacht, equipment);
  const missing = missingFields(yacht).slice(0, 5);

  return (
    <View style={{ gap: 14 }}>
      {/* Photo */}
      {yacht.cover_photo_url || yacht.photo_url ? (
        <Image
          source={{ uri: (yacht.cover_photo_url ?? yacht.photo_url)! }}
          style={styles.heroPhoto}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={styles.heroFallback}>
          <Feather name="anchor" size={48} color={GOLD} />
        </View>
      )}

      {/* Completeness card */}
      <View style={styles.section}>
        <CompletenessBar pct={pct} hint={null} compact />
        {missing.length > 0 ? (
          <View style={{ marginTop: 12, gap: 6 }}>
            <Text style={styles.subLabel}>Missing for a complete profile:</Text>
            {missing.map((m) => (
              <Text key={m.key} style={styles.missingItem}>
                • {m.label}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={[styles.subLabel, { marginTop: 12, color: GOLD }]}>
            Profile complete ✓
          </Text>
        )}
      </View>

      <ReadSection title="Basics" onEdit={onEdit}>
        <Row label="Name" value={yacht.name || "—"} />
        <Row
          label="Type"
          value={yacht.yacht_type ? (TYPE_LABELS[yacht.yacht_type] ?? yacht.yacht_type) : "—"}
        />
        <Row label="Builder" value={yacht.brand || "—"} />
        <Row label="Model" value={yacht.model || "—"} />
        <Row label="Year built" value={yacht.year_built != null ? String(yacht.year_built) : "—"} />
        <Row label="Your role" value={ROLE_LABELS[yacht.owner_role ?? "owner"] ?? "—"} />
      </ReadSection>

      <ReadSection title="Dimensions" onEdit={onEdit}>
        <Row label="Length (LOA)" value={formatLength(yacht.length_meters, units)} />
        <Row label="Beam" value={formatLength(yacht.beam_meters, units)} />
        <Row label="Draft" value={formatLength(yacht.draft_meters, units)} />
      </ReadSection>

      <ReadSection title="Registration" onEdit={onEdit}>
        <Row label="Flag" value={yacht.flag || "—"} />
        <Row label="Home port" value={yacht.home_port || "—"} />
        <Row label="Registration #" value={yacht.registration_number || "—"} />
        <Row label="IMO" value={yacht.imo_number || "—"} />
        <Row label="Hull ID" value={yacht.hull_id || "—"} />
        <Row label="VAT status" value={yacht.vat_status ? (VAT_LABELS[yacht.vat_status] ?? yacht.vat_status) : "—"} />
      </ReadSection>

      <ReadSection title="Engine" onEdit={onEdit}>
        <Row label="Maker" value={yacht.engine_maker || "—"} />
        <Row label="Model" value={yacht.engine_model || "—"} />
        <Row label="Engines" value={yacht.engine_count != null ? String(yacht.engine_count) : "—"} />
        <Row label="Total HP" value={yacht.total_hp != null ? `${yacht.total_hp} HP` : "—"} />
        <Row label="Engine hours" value={yacht.engine_hours != null ? `${yacht.engine_hours} h` : "—"} />
      </ReadSection>

      <ReadSection title="Accommodation" onEdit={onEdit}>
        <Row label="Guest cabins" value={yacht.cabins != null ? String(yacht.cabins) : "—"} />
        <Row label="Crew cabins" value={yacht.crew_cabins != null ? String(yacht.crew_cabins) : "—"} />
        <Row label="Berths" value={yacht.berths != null ? String(yacht.berths) : "—"} />
        <Row label="Heads / WC" value={yacht.heads != null ? String(yacht.heads) : "—"} />
      </ReadSection>

      {equipment.length > 0 ? (
        <ReadSection title="Equipment & Systems" onEdit={onEdit}>
          <EquipmentOverview equipment={equipment} />
        </ReadSection>
      ) : null}

      {yacht.notes ? (
        <ReadSection title="Notes" onEdit={onEdit}>
          <Text style={styles.notesText}>{yacht.notes}</Text>
        </ReadSection>
      ) : null}
    </View>
  );
}

/* ─── Equipment overview (read-only) ─────────────────────────────── */

function EquipmentOverview({ equipment }: { equipment: EquipmentItem[] }) {
  // Group items by equipment_type so multi-unit types (generators, tenders,
  // jet skis) render as a single line with a unit count + per-unit summary.
  const grouped = new Map<string, EquipmentItem[]>();
  for (const it of equipment) {
    const arr = grouped.get(it.equipment_type) ?? [];
    arr.push(it);
    grouped.set(it.equipment_type, arr);
  }
  // Render in catalog order to keep grouping predictable.
  const lines: { key: string; label: string; right: string }[] = [];
  for (const group of EQUIPMENT_CATALOG) {
    for (const def of group.items) {
      const list = grouped.get(def.key);
      if (!list || list.length === 0) continue;
      const isMulti = def.kind === "multi";
      let right: string;
      if (isMulti) {
        const summaries = list
          .map((it) => summarizeEquipment(it))
          .filter(Boolean);
        right =
          `${list.length} unit${list.length === 1 ? "" : "s"}` +
          (summaries.length > 0 ? `  ·  ${summaries.join(" / ")}` : "");
      } else {
        right = summarizeEquipment(list[0]!) || "✓";
      }
      lines.push({ key: def.key, label: def.label, right });
    }
  }
  if (lines.length === 0) {
    // Defensive — items might reference unknown equipment_type keys after
    // a catalog rename. Show generic line so they're still visible.
    return (
      <View style={{ gap: 6 }}>
        {equipment.map((it) => (
          <Row
            key={`eq-${it.id ?? it.equipment_type}`}
            label={EQUIPMENT_DEF_BY_KEY[it.equipment_type]?.label ?? it.equipment_type}
            value={summarizeEquipment(it) || "✓"}
          />
        ))}
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      {lines.map((l) => (
        <Row key={l.key} label={l.label} value={l.right} />
      ))}
    </View>
  );
}

function ReadSection({
  title,
  children,
  onEdit,
}: {
  title: string;
  children: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable
          onPress={onEdit}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={styles.editLink}>Edit</Text>
        </Pressable>
      </View>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

/* ─── History ────────────────────────────────────────────────────── */

type HistoryEntry =
  | { kind: "charter"; ts: number; data: Charter }
  | { kind: "estimate"; ts: number; data: EstimateListItem }
  | { kind: "cost"; ts: number; data: CostEstimateListItem };

function HistoryTab({ yachtId }: { yachtId: string }) {
  const enabled = Boolean(yachtId);

  const charterQ = useListCharters(
    { yacht_id: yachtId },
    {
      query: {
        queryKey: getListChartersQueryKey({ yacht_id: yachtId }),
        enabled,
        staleTime: 30_000,
      },
    },
  );
  const estimateQ = useListEstimates(
    { yacht_id: yachtId },
    {
      query: {
        queryKey: getListEstimatesQueryKey({ yacht_id: yachtId }),
        enabled,
        staleTime: 30_000,
      },
    },
  );
  const costQ = useListCostEstimates(
    { yacht_id: yachtId },
    {
      query: {
        queryKey: getListCostEstimatesQueryKey({ yacht_id: yachtId }),
        enabled,
        staleTime: 30_000,
      },
    },
  );

  const entries: HistoryEntry[] = useMemo(() => {
    const out: HistoryEntry[] = [];
    for (const c of charterQ.data?.items ?? []) {
      const ts = Date.parse(c.start_date ?? c.created_at ?? "") || 0;
      out.push({ kind: "charter", ts, data: c });
    }
    for (const e of estimateQ.data?.items ?? []) {
      const ts = Date.parse(e.created_at) || 0;
      out.push({ kind: "estimate", ts, data: e });
    }
    for (const c of costQ.data?.items ?? []) {
      const ts = Date.parse(c.created_at) || 0;
      out.push({ kind: "cost", ts, data: c });
    }
    out.sort((a, b) => b.ts - a.ts);
    return out;
  }, [charterQ.data, estimateQ.data, costQ.data]);

  const loading = charterQ.isLoading || estimateQ.isLoading || costQ.isLoading;
  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={GOLD} /></View>;
  }

  if (entries.length === 0) {
    return (
      <View style={styles.emptyMini}>
        <Feather name="clock" size={28} color={MUTED} />
        <Text style={styles.emptyMiniTitle}>No history yet</Text>
        <Text style={styles.emptyMiniText}>
          Estimates, cost calculations and charters linked to this yacht will
          appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {entries.map((entry) => {
        if (entry.kind === "charter") {
          return <CharterRow key={`c-${entry.data.id}`} charter={entry.data} />;
        }
        if (entry.kind === "estimate") {
          return <EstimateRow key={`e-${entry.data.id}`} item={entry.data} />;
        }
        return <CostRow key={`x-${entry.data.id}`} item={entry.data} />;
      })}
    </View>
  );
}

function CharterRow({ charter }: { charter: Charter }) {
  const range = `${formatDate(charter.start_date)} – ${formatDate(charter.end_date)}`;
  const total = charter.charter_rate;
  const client = charter.client_name || charter.contact_name || "—";
  const status = charter.status || "—";
  return (
    <View style={styles.histRow}>
      <View style={styles.histIcon}>
        <Feather name="calendar" size={14} color={GOLD} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.histKind}>Charter</Text>
        <Text style={styles.histTitle} numberOfLines={1}>{client}</Text>
        <Text style={styles.histSub} numberOfLines={1}>{range}</Text>
        <Text style={styles.histStatus} numberOfLines={1}>{status}</Text>
      </View>
      <Text style={styles.histAmount}>{formatEur(total)}</Text>
    </View>
  );
}

function EstimateRow({ item }: { item: EstimateListItem }) {
  const label = item.yacht_label || "Estimate";
  return (
    <View style={styles.histRow}>
      <View style={styles.histIcon}>
        <Feather name="trending-up" size={14} color={GOLD} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.histKind}>Valuation</Text>
        <Text style={styles.histTitle} numberOfLines={1}>{label}</Text>
        <Text style={styles.histSub} numberOfLines={1}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={styles.histAmount}>{formatEur(item.estimated_price_eur)}</Text>
    </View>
  );
}

function CostRow({ item }: { item: CostEstimateListItem }) {
  const label = item.name || item.yacht_name || "Annual cost";
  return (
    <View style={styles.histRow}>
      <View style={styles.histIcon}>
        <Feather name="bar-chart-2" size={14} color={GOLD} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.histKind}>Annual cost</Text>
        <Text style={styles.histTitle} numberOfLines={1}>{label}</Text>
        <Text style={styles.histSub} numberOfLines={1}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={styles.histAmount}>{formatEur(item.total_annual_eur)}/yr</Text>
    </View>
  );
}

/* ─── Documents (coming soon) ─────────────────────────────────── */

function DocumentsTab() {
  return (
    <View style={styles.emptyBig}>
      <View style={styles.emptyIcon}>
        <Feather name="folder" size={36} color={GOLD} />
      </View>
      <Text style={styles.emptyTitle}>Documents</Text>
      <Text style={styles.emptyText}>
        Upload registration papers, survey reports and more.{"\n"}Coming soon.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: NAVY,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    gap: 12,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(247,243,236,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    flex: 1, color: IVORY,
    fontFamily: "Gilroy-ExtraBold", fontSize: 18, letterSpacing: -0.2,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 6,
    backgroundColor: NAVY,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabSel: { borderBottomColor: GOLD },
  tabText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  tabTextSel: { color: GOLD },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 50 },
  errText: {
    color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13,
    paddingHorizontal: 30, textAlign: "center",
  },
  heroPhoto: { width: "100%", height: 200, borderRadius: 14, backgroundColor: NAVY_ELEV },
  heroFallback: {
    width: "100%", height: 140, borderRadius: 14,
    backgroundColor: NAVY_ELEV, alignItems: "center", justifyContent: "center",
  },
  section: {
    backgroundColor: NAVY_DEEP, borderRadius: 14,
    borderColor: DIVIDER, borderWidth: 1, padding: 16, gap: 6,
  },
  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 8,
  },
  sectionTitle: {
    color: IVORY, fontFamily: "Gilroy-ExtraBold",
    fontSize: 14, letterSpacing: -0.1, textTransform: "uppercase",
  },
  editLink: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  row: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4, gap: 10,
  },
  rowLabel: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12 },
  rowValue: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 13, maxWidth: "60%", textAlign: "right" },
  subLabel: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.5 },
  missingItem: { color: IVORY, fontFamily: "Inter_400Regular", fontSize: 12 },
  notesText: { color: IVORY, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  infoCard: {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: "rgba(201,169,97,0.08)",
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,169,97,0.30)",
  },
  infoText: { flex: 1, color: IVORY, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  histRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: NAVY_DEEP, borderRadius: 12,
    borderColor: DIVIDER, borderWidth: 1, padding: 14,
  },
  histIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(201,169,97,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  histKind: {
    color: GOLD, fontFamily: "Inter_500Medium",
    fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2,
  },
  histTitle: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  histSub: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  histStatus: {
    color: GOLD, fontFamily: "Inter_500Medium",
    fontSize: 10, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.6,
  },
  histAmount: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 13 },
  emptyMini: { alignItems: "center", paddingVertical: 28, gap: 6 },
  emptyMiniTitle: { color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 6 },
  emptyMiniText: {
    color: MUTED, fontFamily: "Inter_400Regular",
    fontSize: 12, textAlign: "center", paddingHorizontal: 32,
  },
  emptyBig: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: NAVY_ELEV, alignItems: "center", justifyContent: "center",
    marginBottom: 16, borderWidth: 1, borderColor: "rgba(201,169,97,0.15)",
  },
  emptyTitle: { color: IVORY, fontFamily: "Gilroy-ExtraBold", fontSize: 18, marginBottom: 8 },
  emptyText: {
    color: MUTED, fontFamily: "Inter_400Regular",
    fontSize: 13, textAlign: "center", lineHeight: 19, paddingHorizontal: 20,
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  menu: {
    position: "absolute", right: 16,
    backgroundColor: NAVY_DEEP, borderRadius: 12,
    borderColor: DIVIDER, borderWidth: 1,
    paddingVertical: 6, minWidth: 160,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 12,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  menuItemText: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 14 },
});
