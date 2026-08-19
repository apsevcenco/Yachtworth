import { Feather } from "@expo/vector-icons";
import {
  getListYachtsQueryKey,
  useListYachts,
  type Yacht,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import QRCode from "qrcode";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { useTheme } from "@/hooks/useColors";
import { getDigitalPassport, type DigitalPassport } from "@/lib/digitalPassport";
import { exportDigitalPassportDocument } from "@/lib/documentExport";

type SectionKey = "all" | "identity" | "registration" | "technical" | "modules" | "timeline";

const SECTIONS: { key: SectionKey; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { key: "all", label: "All", icon: "layers" },
  { key: "identity", label: "Identity", icon: "credit-card" },
  { key: "registration", label: "Registration", icon: "flag" },
  { key: "technical", label: "Technical", icon: "cpu" },
  { key: "modules", label: "Modules", icon: "grid" },
  { key: "timeline", label: "Timeline", icon: "clock" },
];

function fmtDate(value?: unknown): string {
  if (typeof value !== "string" || !value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

function text(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "-";
}

function money(value: unknown, currency: unknown = "EUR"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${typeof currency === "string" ? currency : "EUR"} ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function yachtTitle(yacht: Yacht): string {
  const row = yacht as Yacht & { brand?: string | null; manufacturer?: string | null };
  return yacht.name ?? ([row.brand ?? row.manufacturer, yacht.model].filter(Boolean).join(" ") || "Unnamed yacht");
}

function moduleDate(row: Record<string, unknown>): string {
  return fmtDate(row.updated_at ?? row.created_at ?? row.completed_at ?? row.survey_date ?? row.published_at);
}

function buildTimeline(data: DigitalPassport): { key: string; icon: React.ComponentProps<typeof Feather>["name"]; title: string; meta: string; date: string }[] {
  const out: { key: string; icon: React.ComponentProps<typeof Feather>["name"]; title: string; meta: string; date: string }[] = [];
  for (const row of data.modules.valuations) out.push({ key: `valuation-${row.id}`, icon: "trending-up", title: "Valuation", meta: money(row.estimated_price_eur, row.currency), date: moduleDate(row) });
  for (const row of data.modules.roi) out.push({ key: `roi-${row.id}`, icon: "percent", title: "Charter ROI", meta: `${text(row.region)} - ROI ${text(row.roi_pct)}%`, date: moduleDate(row) });
  for (const row of data.modules.costs) out.push({ key: `cost-${row.id}`, icon: "bar-chart-2", title: "Yearly expenses", meta: money(row.total_annual_eur, row.currency), date: moduleDate(row) });
  for (const row of data.modules.surveys) out.push({ key: `survey-${row.id}`, icon: "clipboard", title: "Survey report", meta: `${text(row.report_type)} - ${text(row.status)}`, date: moduleDate(row) });
  for (const row of data.modules.service_events) out.push({ key: `service-${row.id}`, icon: "tool", title: text(row.title), meta: `Service event ${text(row.service_event_number)}`, date: moduleDate(row) });
  for (const row of data.modules.network_listings) out.push({ key: `network-${row.id}`, icon: "share-2", title: "Network listing", meta: `${text(row.listing_type)} - ${text(row.status)}`, date: moduleDate(row) });
  out.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return out.slice(0, 16);
}

export default function DigitalPassportToolScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isAcid } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<SectionKey>("all");
  const [exporting, setExporting] = useState(false);

  const yachtsQ = useListYachts({ include_archived: true }, {
    query: {
      queryKey: getListYachtsQueryKey({ include_archived: true }),
      staleTime: 30_000,
    },
  });
  const yachts = (yachtsQ.data?.items ?? []).filter((item) => !item.is_archived);
  const activeId = selectedId ?? yachts[0]?.id ?? "";

  useEffect(() => {
    if (!selectedId && yachts[0]?.id) setSelectedId(yachts[0].id);
  }, [selectedId, yachts]);

  const passportQ = useQuery({
    queryKey: ["digital-passport-tool", activeId],
    queryFn: () => getDigitalPassport(activeId),
    enabled: Boolean(activeId),
    staleTime: 30_000,
  });

  const data = passportQ.data ?? null;
  const yacht = data?.yacht;
  const timeline = useMemo(() => (data ? buildTimeline(data) : []), [data]);
  const cover = yacht?.cover_photo_url ?? yacht?.photo_url;

  const show = (key: SectionKey) => section === "all" || section === key;

  const copyLink = async () => {
    if (!data) return;
    await Clipboard.setStringAsync(data.passport.access_url);
    Alert.alert("Copied", "Digital passport link copied.");
  };

  const shareLink = async () => {
    if (!data) return;
    await Share.share({
      title: data.passport.title,
      message: `${data.passport.title}\n${data.passport.access_url}`,
      url: data.passport.access_url,
    });
  };

  const exportPassport = async () => {
    if (!data || exporting) return;
    try {
      setExporting(true);
      await exportDigitalPassportDocument(data);
    } catch (err) {
      Alert.alert("Digital Passport", err instanceof Error ? err.message : "PDF export failed.");
    } finally {
      setExporting(false);
    }
  };

  const openModule = (key: keyof DigitalPassport["counts"]) => {
    if (key === "valuations") router.push({ pathname: "/valuation/new", params: { yacht_id: activeId } } as never);
    else if (key === "roi") router.push({ pathname: "/roi/calculate", params: { yacht_id: activeId } } as never);
    else if (key === "costs") router.push({ pathname: "/cost/new", params: { yacht_id: activeId } } as never);
    else if (key === "surveys") router.push("/survey" as never);
    else if (key === "maintenance_assets" || key === "work_orders" || key === "service_events" || key === "documents") router.push("/maintenance" as never);
    else if (key === "network_listings") router.push("/yacht-network" as never);
    else router.push("/history" as never);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 56 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 70 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={[styles.backButton, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.primary }, isAcid && styles.acidKicker]}>YACHTWORTH IDENTITY</Text>
            <Text style={[styles.title, { color: colors.foreground }, isAcid && styles.acidTitle]}>Digital Passport</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>QR generator, yacht identity, connected history and module filters.</Text>
          </View>
        </View>

        {yachtsQ.isLoading ? (
          <Center icon="loader" title="Loading yachts..." />
        ) : yachts.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="anchor" size={30} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>No yacht to passport yet</Text>
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>Add a yacht profile first, then Yachtworth can generate its digital passport.</Text>
            <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push("/my-yacht/edit" as never)}>
              <Feather name="plus" size={16} color={colors.background} />
              <Text style={[styles.primaryText, { color: colors.background }]}>Add yacht</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.selectorBlock}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Select yacht</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
                {yachts.map((item) => {
                  const selected = item.id === activeId;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedId(item.id)}
                      style={[
                        styles.yachtPill,
                        { backgroundColor: colors.secondary, borderColor: colors.border },
                        selected && { borderColor: colors.primary, backgroundColor: colors.glow ?? colors.secondary },
                      ]}
                    >
                      <Text style={[styles.yachtPillText, { color: selected ? colors.primary : colors.foreground }]} numberOfLines={1}>{yachtTitle(item)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.filterBlock}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>Passport filters</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
                {SECTIONS.map((item) => {
                  const selected = item.key === section;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => setSection(item.key)}
                      style={[
                        styles.filterPill,
                        { backgroundColor: colors.secondary, borderColor: colors.border },
                        selected && { borderColor: colors.primary, backgroundColor: colors.glow ?? colors.secondary },
                      ]}
                    >
                      <Feather name={item.icon} size={14} color={selected ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.filterText, { color: selected ? colors.primary : colors.mutedForeground }]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {passportQ.isLoading ? (
              <Center icon="loader" title="Generating passport..." />
            ) : passportQ.isError || !data || !yacht ? (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="alert-circle" size={30} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Passport unavailable</Text>
                <Text style={[styles.muted, { color: colors.mutedForeground }]}>{passportQ.error instanceof Error ? passportQ.error.message : "Could not generate passport."}</Text>
              </View>
            ) : (
              <View style={styles.content}>
                <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {typeof cover === "string" && cover ? (
                    <Image source={{ uri: cover }} style={styles.heroImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.heroImage, styles.heroFallback, { backgroundColor: colors.secondary }]}>
                      <Feather name="anchor" size={42} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.heroBody}>
                    <Text style={[styles.passportId, { color: colors.primary }]}>{data.passport.yachtworth_id}</Text>
                    <Text style={[styles.heroTitle, { color: colors.foreground }]}>{data.passport.title}</Text>
                    <Text style={[styles.muted, { color: colors.mutedForeground }]}>Last activity: {fmtDate(data.passport.last_activity_at)}</Text>
                    <View style={styles.heroActions}>
                      <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push(`/my-yacht/passport/${activeId}` as never)}>
                        <Feather name="maximize-2" size={16} color={colors.background} />
                        <Text style={[styles.primaryText, { color: colors.background }]}>Open full passport</Text>
                      </Pressable>
                      <Pressable style={[styles.secondaryButton, { borderColor: colors.primary }]} onPress={copyLink}>
                        <Feather name="copy" size={16} color={colors.primary} />
                        <Text style={[styles.secondaryText, { color: colors.primary }]}>Copy link</Text>
                      </Pressable>
                      <Pressable style={[styles.secondaryButton, { borderColor: colors.primary }]} onPress={shareLink}>
                        <Feather name="share-2" size={16} color={colors.primary} />
                        <Text style={[styles.secondaryText, { color: colors.primary }]}>Share</Text>
                      </Pressable>
                      <Pressable style={[styles.secondaryButton, { borderColor: colors.primary }]} onPress={exportPassport} disabled={exporting}>
                        {exporting ? <ActivityIndicator color={colors.primary} /> : <Feather name="file-text" size={16} color={colors.primary} />}
                        <Text style={[styles.secondaryText, { color: colors.primary }]}>PDF passport</Text>
                      </Pressable>
                    </View>
                  </View>
                  <QrPreview code={data.passport.yachtworth_id} url={data.passport.access_url} onPress={exportPassport} />
                </View>

                {show("identity") ? (
                  <Section title="Identification">
                    <FactGrid items={[
                      ["Yachtworth ID", data.passport.yachtworth_id],
                      ["Name", yacht.name],
                      ["Builder", yacht.brand],
                      ["Model", yacht.model],
                      ["Year", yacht.year_built],
                      ["HIN / Hull ID", yacht.hull_id],
                      ["IMO", yacht.imo_number],
                    ]} />
                  </Section>
                ) : null}

                {show("registration") ? (
                  <Section title="Registration & Flag">
                    <FactGrid items={[
                      ["Flag", yacht.flag],
                      ["Home port", yacht.home_port],
                      ["Registration No.", yacht.registration_number],
                      ["VAT status", yacht.vat_status],
                    ]} />
                  </Section>
                ) : null}

                {show("technical") ? (
                  <Section title="Technical Profile">
                    <FactGrid items={[
                      ["LOA", yacht.length_meters ? `${yacht.length_meters} m` : null],
                      ["Beam", yacht.beam_meters ? `${yacht.beam_meters} m` : null],
                      ["Draft", yacht.draft_meters ? `${yacht.draft_meters} m` : null],
                      ["Type", yacht.yacht_type],
                      ["Engines", yacht.engine_count],
                      ["Engine maker", yacht.engine_maker],
                      ["Engine model", yacht.engine_model],
                      ["Total HP", yacht.total_hp],
                      ["Engine hours", yacht.engine_hours],
                    ]} />
                  </Section>
                ) : null}

                {show("modules") ? (
                  <Section title="Connected Modules">
                    <View style={styles.moduleGrid}>
                      <ModuleTile icon="trending-up" label="Valuations" value={data.counts.valuations} onPress={() => openModule("valuations")} />
                      <ModuleTile icon="percent" label="ROI" value={data.counts.roi} onPress={() => openModule("roi")} />
                      <ModuleTile icon="bar-chart-2" label="Costs" value={data.counts.costs} onPress={() => openModule("costs")} />
                      <ModuleTile icon="clipboard" label="Surveys" value={data.counts.surveys} onPress={() => openModule("surveys")} />
                      <ModuleTile icon="tool" label="Service events" value={data.counts.service_events} onPress={() => openModule("service_events")} />
                      <ModuleTile icon="file-text" label="Documents" value={data.counts.documents} onPress={() => openModule("documents")} />
                      <ModuleTile icon="cpu" label="Assets" value={data.counts.maintenance_assets} onPress={() => openModule("maintenance_assets")} />
                      <ModuleTile icon="share-2" label="Network" value={data.counts.network_listings} onPress={() => openModule("network_listings")} />
                    </View>
                  </Section>
                ) : null}

                {show("timeline") ? (
                  <Section title="Activity Timeline">
                    {timeline.length ? (
                      <View style={styles.timeline}>
                        {timeline.map((item) => (
                          <View key={item.key} style={styles.timelineRow}>
                            <View style={[styles.timelineIcon, { backgroundColor: colors.secondary }]}>
                              <Feather name={item.icon} size={15} color={colors.primary} />
                            </View>
                            <View style={styles.timelineText}>
                              <Text style={[styles.timelineTitle, { color: colors.foreground }]}>{item.title}</Text>
                              <Text style={[styles.muted, { color: colors.mutedForeground }]}>{item.meta}</Text>
                            </View>
                            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{item.date}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.muted, { color: colors.mutedForeground }]}>No connected activity yet.</Text>
                    )}
                  </Section>
                ) : null}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Center({ icon, title }: { icon: React.ComponentProps<typeof Feather>["name"]; title: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      {icon === "loader" ? <ActivityIndicator color={colors.primary} /> : <Feather name={icon} size={30} color={colors.primary} />}
      <Text style={[styles.muted, { color: colors.mutedForeground }]}>{title}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

function FactGrid({ items }: { items: [string, unknown][] }) {
  const { colors } = useTheme();
  const visible = items.filter(([, value]) => text(value) !== "-");
  return (
    <View style={styles.factGrid}>
      {visible.map(([label, value]) => (
        <View key={label} style={[styles.fact, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.factLabel, { color: colors.primary }]}>{label}</Text>
          <Text style={[styles.factValue, { color: colors.foreground }]}>{text(value)}</Text>
        </View>
      ))}
    </View>
  );
}

function ModuleTile({ icon, label, value, onPress }: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; value: number; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable style={[styles.moduleTile, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={onPress}>
      <Feather name={icon} size={19} color={colors.primary} />
      <Text style={[styles.moduleValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.moduleLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

function QrPreview({ code, url, onPress }: { code: string; url: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 126,
      color: { dark: colors.foreground, light: colors.background },
    })
      .then((value) => {
        if (!cancelled) setSvg(value);
      })
      .catch(() => {
        if (!cancelled) setSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [colors.background, colors.foreground, url]);

  return (
    <Pressable
      style={[styles.qrBox, { backgroundColor: colors.background, borderColor: colors.border }]}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      {svg ? <SvgXml xml={svg} width={126} height={126} /> : <ActivityIndicator color={colors.primary} />}
      <Text style={[styles.qrText, { color: colors.foreground }]}>{code}</Text>
      {hovered && Platform.OS === "web" ? (
        <View style={[styles.qrHint, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.qrHintTitle, { color: colors.foreground }]}>Passport PDF</Text>
          <Text style={[styles.qrHintText, { color: colors.mutedForeground }]}>Click to export the yacht specification, QR access, reports and service history.</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  backButton: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 2.6 },
  acidKicker: { letterSpacing: 3 },
  title: { fontFamily: "Gilroy-ExtraBold", fontSize: 38, lineHeight: 44, marginTop: 5 },
  acidTitle: { textShadowColor: "rgba(255,79,216,0.65)", textShadowRadius: 14 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 5 },
  center: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 12 },
  selectorBlock: { marginBottom: 14 },
  filterBlock: { marginBottom: 18 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 9 },
  selectorRow: { gap: 8, paddingRight: 8 },
  yachtPill: { minHeight: 42, maxWidth: 260, borderWidth: 1, borderRadius: 8, justifyContent: "center", paddingHorizontal: 14 },
  yachtPillText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  filterPill: { minHeight: 38, borderWidth: 1, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12 },
  filterText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  content: { gap: 16 },
  hero: { borderWidth: 1, borderRadius: 12, overflow: "hidden", flexDirection: Platform.OS === "web" ? "row" : "column" },
  heroImage: { width: Platform.OS === "web" ? 320 : "100%", height: Platform.OS === "web" ? 300 : 220 },
  heroFallback: { alignItems: "center", justifyContent: "center" },
  heroBody: { flex: 1, padding: 18, justifyContent: "center" },
  passportId: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 2.2 },
  heroTitle: { fontFamily: "Gilroy-ExtraBold", fontSize: 30, lineHeight: 36, marginTop: 8 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  primaryButton: { minHeight: 44, borderRadius: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  secondaryButton: { minHeight: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 14 },
  cardTitle: { fontFamily: "Gilroy-ExtraBold", fontSize: 21 },
  muted: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 20 },
  factGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fact: { flexBasis: Platform.OS === "web" ? "23%" : "47%", flexGrow: 1, borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 76 },
  factLabel: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase" },
  factValue: { fontFamily: "Inter_700Bold", fontSize: 15, lineHeight: 20, marginTop: 7 },
  moduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  moduleTile: { flexBasis: Platform.OS === "web" ? "23%" : "47%", flexGrow: 1, borderWidth: 1, borderRadius: 8, padding: 13, gap: 6 },
  moduleValue: { fontFamily: "Gilroy-ExtraBold", fontSize: 28 },
  moduleLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  timeline: { gap: 10 },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timelineIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  timelineText: { flex: 1 },
  timelineTitle: { fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 19 },
  dateText: { fontFamily: "Inter_600SemiBold", fontSize: 11, width: 82, textAlign: "right" },
  qrBox: { width: Platform.OS === "web" ? 190 : "100%", padding: 14, borderLeftWidth: Platform.OS === "web" ? 1 : 0, borderTopWidth: Platform.OS === "web" ? 0 : 1, alignItems: "center", justifyContent: "center", gap: 10, position: "relative" },
  qrText: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.2 },
  qrHint: { position: "absolute", right: 12, bottom: 12, width: 210, borderWidth: 1, borderRadius: 8, padding: 10 },
  qrHintTitle: { fontFamily: "Inter_700Bold", fontSize: 12 },
  qrHintText: { fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15, marginTop: 4 },
});
