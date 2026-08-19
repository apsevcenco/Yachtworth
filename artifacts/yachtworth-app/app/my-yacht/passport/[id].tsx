import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import QRCode from "qrcode";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { useTheme } from "@/hooks/useColors";
import { getDigitalPassport, type DigitalPassport } from "@/lib/digitalPassport";
import { exportDigitalPassportDocument } from "@/lib/documentExport";

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

function moduleDate(row: Record<string, unknown>): string {
  return fmtDate(row.updated_at ?? row.created_at ?? row.completed_at ?? row.survey_date ?? row.published_at);
}

function buildTimeline(data: DigitalPassport): { key: string; icon: React.ComponentProps<typeof Feather>["name"]; title: string; meta: string; date: string }[] {
  const out: { key: string; icon: React.ComponentProps<typeof Feather>["name"]; title: string; meta: string; date: string }[] = [];
  for (const row of data.modules.valuations) {
    out.push({ key: `valuation-${row.id}`, icon: "trending-up", title: "Valuation report", meta: money(row.estimated_price_eur, row.currency), date: moduleDate(row) });
  }
  for (const row of data.modules.roi) {
    out.push({ key: `roi-${row.id}`, icon: "percent", title: "Charter ROI", meta: `${text(row.region)} · ROI ${text(row.roi_pct)}%`, date: moduleDate(row) });
  }
  for (const row of data.modules.costs) {
    out.push({ key: `cost-${row.id}`, icon: "bar-chart-2", title: "Yearly expenses", meta: money(row.total_annual_eur, row.currency), date: moduleDate(row) });
  }
  for (const row of data.modules.surveys) {
    out.push({ key: `survey-${row.id}`, icon: "clipboard", title: "Survey report", meta: `${text(row.report_type)} · ${text(row.status)}`, date: moduleDate(row) });
  }
  for (const row of data.modules.service_events) {
    out.push({ key: `service-${row.id}`, icon: "tool", title: text(row.title), meta: `Service event ${text(row.service_event_number)}`, date: moduleDate(row) });
  }
  for (const row of data.modules.network_listings) {
    out.push({ key: `network-${row.id}`, icon: "share-2", title: "Network listing", meta: `${text(row.listing_type)} · ${text(row.status)}`, date: moduleDate(row) });
  }
  out.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return out.slice(0, 12);
}

export default function DigitalPassportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const insets = useSafeAreaInsets();
  const { colors, isAcid } = useTheme();
  const [exporting, setExporting] = useState(false);

  const passportQ = useQuery({
    queryKey: ["digital-passport", id],
    queryFn: () => getDigitalPassport(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });

  const data = passportQ.data;
  const timeline = useMemo(() => (data ? buildTimeline(data) : []), [data]);
  const yacht = data?.yacht;
  const cover = yacht?.cover_photo_url ?? yacht?.photo_url;

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

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 56 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={[styles.backButton, { backgroundColor: colors.secondary }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.primary }]}>DIGITAL YACHT PASSPORT</Text>
            <Text style={[styles.title, { color: colors.foreground }, isAcid && styles.acidTitle]}>Passport</Text>
          </View>
        </View>

        {passportQ.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>Loading passport...</Text>
          </View>
        ) : passportQ.isError || !data || !yacht ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="alert-circle" size={28} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Passport unavailable</Text>
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>{passportQ.error instanceof Error ? passportQ.error.message : "Could not load passport."}</Text>
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
                  <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={copyLink}>
                    <Feather name="copy" size={16} color={colors.background} />
                    <Text style={[styles.primaryText, { color: colors.background }]}>Copy passport link</Text>
                  </Pressable>
                  <Pressable style={[styles.secondaryButton, { borderColor: colors.primary }]} onPress={shareLink}>
                    <Feather name="share-2" size={16} color={colors.primary} />
                    <Text style={[styles.secondaryText, { color: colors.primary }]}>Share passport</Text>
                  </Pressable>
                  <Pressable style={[styles.secondaryButton, { borderColor: colors.primary }]} onPress={() => router.push({ pathname: "/my-yacht/[id]", params: { id } })}>
                    <Feather name="database" size={16} color={colors.primary} />
                    <Text style={[styles.secondaryText, { color: colors.primary }]}>Open yacht profile</Text>
                  </Pressable>
                  <Pressable style={[styles.secondaryButton, { borderColor: colors.primary }]} onPress={exportPassport} disabled={exporting}>
                    {exporting ? <ActivityIndicator color={colors.primary} /> : <Feather name="file-text" size={16} color={colors.primary} />}
                    <Text style={[styles.secondaryText, { color: colors.primary }]}>Export PDF</Text>
                  </Pressable>
                </View>
              </View>
              <QrPreview code={data.passport.yachtworth_id} url={data.passport.access_url} onPress={exportPassport} />
            </View>

            <Section title="Access">
              <View style={styles.accessRow}>
                <View style={[styles.accessIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="lock" size={18} color={colors.primary} />
                </View>
                <View style={styles.accessText}>
                  <Text style={[styles.timelineTitle, { color: colors.foreground }]}>Protected Yachtworth passport</Text>
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>The QR opens the yacht passport route. Yacht data remains behind the Yachtworth authenticated workspace until public passport access is enabled for a vessel.</Text>
                </View>
              </View>
              <Pressable style={[styles.linkBox, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={copyLink}>
                <Text style={[styles.linkText, { color: colors.foreground }]} numberOfLines={1}>{data.passport.access_url}</Text>
                <Feather name="copy" size={16} color={colors.primary} />
              </Pressable>
            </Section>

            <Section title="Identity">
              <FactGrid
                items={[
                  ["Builder", yacht.brand],
                  ["Model", yacht.model],
                  ["Year", yacht.year_built],
                  ["Type", yacht.yacht_type],
                  ["HIN / Hull ID", yacht.hull_id],
                  ["IMO", yacht.imo_number],
                ]}
              />
            </Section>

            <Section title="Registration & Flag">
              <FactGrid
                items={[
                  ["Flag", yacht.flag],
                  ["Home port", yacht.home_port],
                  ["Registration No.", yacht.registration_number],
                  ["VAT status", yacht.vat_status],
                ]}
              />
            </Section>

            <Section title="Technical Profile">
              <FactGrid
                items={[
                  ["LOA", yacht.length_meters ? `${yacht.length_meters} m` : null],
                  ["Beam", yacht.beam_meters ? `${yacht.beam_meters} m` : null],
                  ["Draft", yacht.draft_meters ? `${yacht.draft_meters} m` : null],
                  ["Engines", yacht.engine_count],
                  ["Engine maker", yacht.engine_maker],
                  ["Engine model", yacht.engine_model],
                  ["Total HP", yacht.total_hp],
                  ["Engine hours", yacht.engine_hours],
                ]}
              />
            </Section>

            <Section title="Connected Modules">
              <View style={styles.moduleGrid}>
                <ModuleTile icon="trending-up" label="Valuations" value={data.counts.valuations} />
                <ModuleTile icon="percent" label="ROI" value={data.counts.roi} />
                <ModuleTile icon="bar-chart-2" label="Costs" value={data.counts.costs} />
                <ModuleTile icon="clipboard" label="Surveys" value={data.counts.surveys} />
                <ModuleTile icon="tool" label="Service events" value={data.counts.service_events} />
                <ModuleTile icon="file-text" label="Documents" value={data.counts.documents} />
                <ModuleTile icon="cpu" label="Assets" value={data.counts.maintenance_assets} />
                <ModuleTile icon="share-2" label="Network" value={data.counts.network_listings} />
              </View>
            </Section>

            <Section title="Timeline">
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
                <Text style={[styles.muted, { color: colors.mutedForeground }]}>No connected activity yet. Valuations, ROI, surveys, maintenance and marketplace records will appear here.</Text>
              )}
            </Section>
          </View>
        )}
      </ScrollView>
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
  return (
    <View style={styles.factGrid}>
      {items.map(([label, value]) => (
        <View key={label} style={[styles.fact, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.factLabel, { color: colors.primary }]}>{label}</Text>
          <Text style={[styles.factValue, { color: colors.foreground }]}>{text(value)}</Text>
        </View>
      ))}
    </View>
  );
}

function ModuleTile({ icon, label, value }: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.moduleTile, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Feather name={icon} size={19} color={colors.primary} />
      <Text style={[styles.moduleValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.moduleLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
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
      width: 116,
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
      {svg ? (
        <SvgXml xml={svg} width={116} height={116} />
      ) : (
        <View style={styles.qrGrid}>
          {Array.from({ length: 25 }).map((_, i) => (
            <View key={i} style={[styles.qrCell, { backgroundColor: i % 2 === 0 || i % 7 === 0 ? colors.primary : "transparent" }]} />
          ))}
        </View>
      )}
      <Text style={[styles.qrText, { color: colors.foreground }]}>{code}</Text>
      {hovered && Platform.OS === "web" ? (
        <View style={[styles.qrHint, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.qrHintTitle, { color: colors.foreground }]}>Passport PDF</Text>
          <Text style={[styles.qrHintText, { color: colors.mutedForeground }]}>Click to export specifications, reports and service history.</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  backButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 2.6 },
  title: { fontFamily: "Gilroy-ExtraBold", fontSize: 38, lineHeight: 44, marginTop: 5 },
  acidTitle: { textShadowColor: "rgba(255,79,216,0.65)", textShadowRadius: 14 },
  center: { minHeight: 320, alignItems: "center", justifyContent: "center", gap: 12 },
  content: { gap: 16 },
  hero: { borderWidth: 1, borderRadius: 12, overflow: "hidden", flexDirection: Platform.OS === "web" ? "row" : "column" },
  heroImage: { width: Platform.OS === "web" ? 360 : "100%", height: Platform.OS === "web" ? 300 : 220 },
  heroFallback: { alignItems: "center", justifyContent: "center" },
  heroBody: { flex: 1, padding: 18, justifyContent: "center" },
  passportId: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 2.2 },
  heroTitle: { fontFamily: "Gilroy-ExtraBold", fontSize: 30, lineHeight: 36, marginTop: 8 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  primaryButton: { minHeight: 44, borderRadius: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  secondaryButton: { minHeight: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  accessRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  accessIcon: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  accessText: { flex: 1, minWidth: 0 },
  linkBox: { minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  linkText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 12 },
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
  qrBox: { width: Platform.OS === "web" ? 170 : "100%", padding: 14, borderLeftWidth: Platform.OS === "web" ? 1 : 0, borderTopWidth: Platform.OS === "web" ? 0 : 1, alignItems: "center", justifyContent: "center", gap: 10, position: "relative" },
  qrGrid: { width: 116, height: 116, flexDirection: "row", flexWrap: "wrap" },
  qrCell: { width: 23.2, height: 23.2 },
  qrText: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.2 },
  qrHint: { position: "absolute", right: 10, bottom: 10, width: 190, borderWidth: 1, borderRadius: 8, padding: 10 },
  qrHintTitle: { fontFamily: "Inter_700Bold", fontSize: 12 },
  qrHintText: { fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15, marginTop: 4 },
});
