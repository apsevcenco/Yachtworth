import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getYachts, type YachtOption } from "@/lib/maintenance";
import {
  archiveNetworkListing,
  listNetworkListings,
  publishNetworkListing,
  type NetworkListingType,
  type NetworkVisibility,
  type YachtNetworkListing,
} from "@/lib/yachtNetwork";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const PANEL = "#112A56";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.68)";
const LINE = "rgba(247,243,236,0.1)";
const RED = "#F08A8A";
const GREEN = "#7BD389";

const PUBLISH_TYPES: { id: NetworkListingType; label: string }[] = [
  { id: "sale", label: "For sale" },
  { id: "charter", label: "For charter" },
  { id: "both", label: "Sale + charter" },
];

const VISIBILITY: { id: NetworkVisibility; label: string }[] = [
  { id: "internal", label: "Internal" },
  { id: "broker_network", label: "Broker network" },
  { id: "private_link", label: "Private link" },
];

type YachtRecord = YachtOption & Record<string, unknown>;

function yachtField(yacht: YachtOption | null | undefined, key: string): string | null {
  const value = (yacht as YachtRecord | null | undefined)?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function yachtArrayField(yacht: YachtOption | null | undefined, key: string): string[] {
  const value = (yacht as YachtRecord | null | undefined)?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function yachtTitle(yacht?: YachtOption | null): string {
  if (!yacht) return "Select yacht";
  return yacht.name ?? ([yacht.manufacturer, yacht.model].filter(Boolean).join(" ") || "Unnamed yacht");
}

function coverForYacht(yacht?: YachtOption | null): string | null {
  return yachtField(yacht, "cover_photo_url") ?? yachtField(yacht, "photo_url") ?? yachtArrayField(yacht, "photo_urls")[0] ?? null;
}

function money(value?: number | null, currency = "EUR"): string | null {
  return value == null ? null : `${currency} ${Number(value).toLocaleString("en-US")}`;
}

function snapshotValue(item: YachtNetworkListing, key: string): string | number | null {
  const value = item.yacht_snapshot?.[key];
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(247,243,236,0.35)"
        multiline={multiline}
        style={[styles.input, multiline && styles.inputTall]}
      />
    </View>
  );
}

function ChipSelect<T extends string>({
  items,
  selected,
  onSelect,
}: {
  items: { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map((item) => (
        <Pressable key={item.id} onPress={() => onSelect(item.id)} style={[styles.chip, selected === item.id && styles.chipActive]}>
          <Text style={[styles.chipText, selected === item.id && styles.chipTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export default function YachtNetworkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [selectedYachtId, setSelectedYachtId] = useState<string | null>(null);
  const [publishType, setPublishType] = useState<NetworkListingType>("sale");
  const [visibility, setVisibility] = useState<NetworkVisibility>("internal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [weeklyRate, setWeeklyRate] = useState("");
  const [location, setLocation] = useState("");
  const [availability, setAvailability] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [brokerCompany, setBrokerCompany] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const yachtsQ = useQuery({ queryKey: ["network-yachts"], queryFn: getYachts });
  const yachts = (yachtsQ.data ?? []).filter((yacht) => (yacht as YachtRecord).is_archived !== true);
  const selectedYacht = yachts.find((item) => item.id === selectedYachtId) ?? yachts[0] ?? null;

  const networkQ = useQuery({
    queryKey: ["network-listings", "mine"],
    queryFn: () => listNetworkListings({ mine: true }),
  });

  const listings = networkQ.data ?? [];
  const selectedYachtLabel = yachtTitle(selectedYacht);
  const defaultTitle = selectedYacht
    ? [yachtField(selectedYacht, "brand") ?? selectedYacht.manufacturer, selectedYacht.model, selectedYacht.name].filter(Boolean).join(" ")
    : "";
  const canPublish = !!selectedYacht?.id;

  const resetPublish = () => {
    setTitle("");
    setDescription("");
    setAskingPrice("");
    setWeeklyRate("");
    setLocation("");
    setAvailability("");
  };

  const publish = async () => {
    if (!selectedYacht?.id) return;
    try {
      setBusy(true);
      await publishNetworkListing({
        yacht_id: selectedYacht.id,
        listing_type: publishType,
        visibility,
        status: "active",
        title: title.trim() || defaultTitle || selectedYachtLabel,
        description: description.trim() || null,
        asking_price_eur: askingPrice ? Number(askingPrice) : null,
        charter_rate_eur_week: weeklyRate ? Number(weeklyRate) : null,
        currency: "EUR",
        location: location.trim() || yachtField(selectedYacht, "marina_location") || yachtField(selectedYacht, "home_port") || null,
        availability: availability.trim() || null,
        broker_name: brokerName.trim() || null,
        broker_company: brokerCompany.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        cover_photo_url: coverForYacht(selectedYacht),
        photo_urls: yachtArrayField(selectedYacht, "photo_urls"),
      });
      resetPublish();
      await qc.invalidateQueries({ queryKey: ["network-listings"] });
      Alert.alert("Yachtworth Network", "Yacht published to the internal network.");
    } catch (err) {
      Alert.alert("Publish failed", err instanceof Error ? err.message : "Could not publish yacht");
    } finally {
      setBusy(false);
    }
  };

  const archive = async (id: string) => {
    Alert.alert("Remove from listing", "This yacht will be removed from the marketplace board. The listing data will be archived, not deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await archiveNetworkListing(id);
            await qc.invalidateQueries({ queryKey: ["network-listings"] });
            await qc.invalidateQueries({ queryKey: ["marketplace-listings"] });
          } catch (err) {
            Alert.alert("Remove failed", err instanceof Error ? err.message : "Could not remove listing");
          }
        },
      },
    ]);
  };

  const stats = useMemo(() => {
    const active = listings.filter((item) => item.status === "active").length;
    const charter = listings.filter((item) => item.listing_type === "charter" || item.listing_type === "both").length;
    const sale = listings.filter((item) => item.listing_type === "sale" || item.listing_type === "both").length;
    return { active, charter, sale };
  }, [listings]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.replace("/(tabs)/tools")}>
          <Feather name="arrow-left" size={24} color={IVORY} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Yachtworth</Text>
          <Text style={styles.title}>Yachtworth Network</Text>
          <Text style={styles.subtitle}>Publish and manage your yachts in the closed Yachtworth marketplace.</Text>
        </View>
        <Pressable style={styles.marketButton} onPress={() => router.push("/marketplace" as never)}>
          <Feather name="external-link" size={17} color={NAVY} />
          <Text style={styles.marketButtonText}>Go to Marketplace</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.metrics}>
          <Metric label="Active" value={stats.active} />
          <Metric label="For sale" value={stats.sale} />
          <Metric label="Charter" value={stats.charter} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Publish from My Yachts</Text>
          <Text style={styles.muted}>Select an existing yacht, choose sale/charter visibility, add commercial terms, and publish to the closed Yachtworth network.</Text>
          {yachtsQ.isLoading ? <ActivityIndicator color={GOLD} /> : null}
          {yachts.length ? (
            <ChipSelect
              items={yachts.map((yacht) => ({ id: yacht.id, label: yachtTitle(yacht) }))}
              selected={selectedYacht?.id ?? yachts[0]?.id}
              onSelect={setSelectedYachtId}
            />
          ) : (
            <Text style={styles.empty}>No yachts in My Yachts yet.</Text>
          )}
          <View style={styles.publishGrid}>
            {coverForYacht(selectedYacht) ? (
              <Image source={{ uri: coverForYacht(selectedYacht)! }} style={styles.publishImage} />
            ) : (
              <View style={styles.publishImageFallback}>
                <Feather name="anchor" size={32} color={GOLD} />
              </View>
            )}
            <View style={styles.publishFields}>
              <Text style={styles.label}>Listing type</Text>
              <ChipSelect items={PUBLISH_TYPES} selected={publishType} onSelect={setPublishType} />
              <Text style={styles.label}>Visibility</Text>
              <ChipSelect items={VISIBILITY} selected={visibility} onSelect={setVisibility} />
              <Field label="Title" value={title} onChangeText={setTitle} placeholder={defaultTitle || "Listing title"} />
              <Field label="Description" value={description} onChangeText={setDescription} multiline />
              <View style={styles.twoCol}>
                <Field label="Asking price EUR" value={askingPrice} onChangeText={setAskingPrice} />
                <Field label="Charter rate EUR/week" value={weeklyRate} onChangeText={setWeeklyRate} />
              </View>
              <Field label="Location" value={location} onChangeText={setLocation} placeholder={yachtField(selectedYacht, "marina_location") ?? yachtField(selectedYacht, "home_port") ?? "Monaco / Cannes / Palma"} />
              <Field label="Availability" value={availability} onChangeText={setAvailability} placeholder="Summer 2026 / immediate / by appointment" />
              <View style={styles.twoCol}>
                <Field label="Broker name" value={brokerName} onChangeText={setBrokerName} />
                <Field label="Broker company" value={brokerCompany} onChangeText={setBrokerCompany} />
              </View>
              <View style={styles.twoCol}>
                <Field label="Contact email" value={contactEmail} onChangeText={setContactEmail} />
                <Field label="Contact phone" value={contactPhone} onChangeText={setContactPhone} />
              </View>
              <Pressable style={[styles.primaryButton, (!canPublish || busy) && styles.disabled]} disabled={!canPublish || busy} onPress={publish}>
                <Feather name="upload-cloud" size={18} color={NAVY} />
                <Text style={styles.primaryButtonText}>{busy ? "Publishing..." : "Publish to Network"}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>My published listings</Text>
              <Text style={styles.muted}>These are your active, paused and draft marketplace listings.</Text>
            </View>
            <Pressable style={styles.secondaryButton} onPress={() => router.push("/marketplace" as never)}>
              <Feather name="grid" size={16} color={GOLD} />
              <Text style={styles.secondaryButtonText}>Open board</Text>
            </Pressable>
          </View>
        </View>

        {networkQ.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={GOLD} />
            <Text style={styles.muted}>Loading network listings...</Text>
          </View>
        ) : listings.length ? (
          <View style={styles.catalogGrid}>
            {listings.map((item) => (
              <ListingCard key={item.id} item={item} onOpen={() => router.push(`/marketplace/${item.id}` as never)} onArchive={() => archive(item.id)} />
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>You have not published any marketplace listings yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ListingCard({ item, onOpen, onArchive }: { item: YachtNetworkListing; onOpen: () => void; onArchive: () => void }) {
  const length = snapshotValue(item, "length_meters");
  const year = snapshotValue(item, "year_built");
  const builder = snapshotValue(item, "brand");
  const model = snapshotValue(item, "model");
  const cabins = snapshotValue(item, "cabins");
  const guests = snapshotValue(item, "guests");
  return (
    <Pressable style={styles.listingCard} onPress={onOpen}>
      {item.cover_photo_url ? (
        <Image source={{ uri: item.cover_photo_url }} style={styles.listingImage} />
      ) : (
        <View style={styles.listingImageFallback}>
          <Feather name="anchor" size={28} color={GOLD} />
        </View>
      )}
      <View style={styles.listingBody}>
        <View style={styles.listingTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listingTitle}>{item.title}</Text>
            <Text style={styles.listingMeta}>{[builder, model, year, length ? `${length}m` : null].filter(Boolean).join(" - ")}</Text>
          </View>
          <View style={[styles.statusPill, item.status === "active" ? styles.statusActive : styles.statusMuted]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.listingMeta}>{[item.location, cabins ? `${cabins} cabins` : null, guests ? `${guests} guests` : null].filter(Boolean).join(" - ")}</Text>
        <Text style={styles.priceLine}>
          {[money(item.asking_price_eur, item.currency ?? "EUR"), item.charter_rate_eur_week ? `${money(item.charter_rate_eur_week, item.currency ?? "EUR")} / week` : null].filter(Boolean).join("   ")}
        </Text>
        {item.description ? <Text style={styles.description} numberOfLines={4}>{item.description}</Text> : null}
        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>{item.broker_company || item.broker_name || "Yachtworth member"}</Text>
          <Text style={styles.contactText}>{[item.contact_email, item.contact_phone].filter(Boolean).join(" - ") || "Contact details visible inside Yachtworth."}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.visibility}>{item.listing_type} - {item.visibility}</Text>
          {item.is_owner ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onArchive();
              }}
              style={styles.archiveButton}
            >
              <Feather name="trash-2" size={14} color={RED} />
              <Text style={styles.archiveText}>Remove from listing</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  header: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: LINE },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,243,236,0.08)" },
  headerText: { flex: 1 },
  marketButton: { minHeight: 44, borderRadius: 8, backgroundColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  marketButtonText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 13 },
  eyebrow: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 3, textTransform: "uppercase" },
  title: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 32, marginTop: 6 },
  subtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 4 },
  scroll: { padding: 22, paddingBottom: 56 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  metric: { minWidth: 120, flexGrow: 1, borderRadius: 8, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, padding: 14 },
  metricValue: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 28 },
  metricLabel: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  panel: { borderWidth: 1, borderColor: LINE, backgroundColor: NAVY_DEEP, borderRadius: 8, padding: 16, marginBottom: 18 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 10 },
  muted: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, marginBottom: 10 },
  field: { marginBottom: 12, flex: 1 },
  label: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 7 },
  input: { borderWidth: 1, borderColor: "rgba(247,243,236,0.14)", borderRadius: 8, backgroundColor: PANEL, color: IVORY, fontFamily: "Inter_500Medium", fontSize: 15, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10 },
  inputTall: { minHeight: 94, textAlignVertical: "top" },
  chips: { gap: 8, paddingBottom: 4, marginBottom: 8 },
  chip: { borderRadius: 8, borderWidth: 1, borderColor: LINE, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: PANEL },
  chipActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.12)" },
  chipText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  chipTextActive: { color: IVORY },
  publishGrid: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 16, alignItems: "flex-start" },
  publishImage: { width: Platform.OS === "web" ? 280 : "100%", height: 190, borderRadius: 8, backgroundColor: PANEL },
  publishImageFallback: { width: Platform.OS === "web" ? 280 : "100%", height: 190, borderRadius: 8, backgroundColor: PANEL, borderWidth: 1, borderColor: LINE, alignItems: "center", justifyContent: "center" },
  publishFields: { flex: 1, width: "100%" },
  twoCol: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 10 },
  threeCol: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 10 },
  primaryButton: { minHeight: 52, borderRadius: 8, backgroundColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 16, marginTop: 4 },
  primaryButtonText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 15 },
  secondaryButton: { minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 },
  secondaryButtonText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 13 },
  disabled: { opacity: 0.45 },
  switchRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  switchButton: { flex: 1, minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: LINE, alignItems: "center", justifyContent: "center", backgroundColor: PANEL },
  switchActive: { borderColor: GOLD, backgroundColor: GOLD },
  switchText: { color: MUTED, fontFamily: "Inter_700Bold", fontSize: 13 },
  switchTextActive: { color: NAVY },
  loading: { alignItems: "center", justifyContent: "center", gap: 12, padding: 28 },
  empty: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 14 },
  catalogGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  listingCard: { flexBasis: Platform.OS === "web" ? "48%" : "100%", flexGrow: 1, minWidth: Platform.OS === "web" ? 360 : undefined, borderWidth: 1, borderColor: LINE, borderRadius: 8, backgroundColor: NAVY_DEEP, overflow: "hidden" },
  listingImage: { width: "100%", height: 210, backgroundColor: PANEL },
  listingImageFallback: { width: "100%", height: 210, backgroundColor: PANEL, alignItems: "center", justifyContent: "center" },
  listingBody: { padding: 14 },
  listingTop: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  listingTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 24 },
  listingMeta: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18, marginTop: 3 },
  statusPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusActive: { borderColor: GREEN },
  statusMuted: { borderColor: GOLD },
  statusText: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 10, textTransform: "uppercase" },
  priceLine: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 10 },
  description: { color: IVORY, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, marginTop: 10 },
  contactBox: { borderTopWidth: 1, borderTopColor: LINE, marginTop: 12, paddingTop: 12 },
  contactTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 13 },
  contactText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, marginTop: 3 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 12 },
  visibility: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 11, textTransform: "uppercase" },
  archiveButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8 },
  archiveText: { color: RED, fontFamily: "Inter_700Bold", fontSize: 12 },
});
