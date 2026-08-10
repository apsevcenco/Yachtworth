import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
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
  listNetworkListings,
  type NetworkListingType,
  type YachtNetworkListing,
} from "@/lib/yachtNetwork";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const PANEL = "#112A56";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.68)";
const LINE = "rgba(247,243,236,0.1)";
const GREEN = "#7BD389";

const LISTING_TYPES: { id: NetworkListingType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sale", label: "For sale" },
  { id: "charter", label: "Charter" },
  { id: "both", label: "Both" },
];

function money(value?: number | null, currency = "EUR"): string | null {
  return value == null ? null : `${currency} ${Number(value).toLocaleString("en-US")}`;
}

function snapshotValue(item: YachtNetworkListing, key: string): string | number | null {
  const value = item.yacht_snapshot?.[key];
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function photos(item: YachtNetworkListing): string[] {
  const gallery = Array.isArray(item.photo_urls) ? item.photo_urls.filter((url): url is string => typeof url === "string") : [];
  return [item.cover_photo_url, ...gallery].filter((url, index, arr): url is string => typeof url === "string" && arr.indexOf(url) === index);
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(247,243,236,0.35)"
        style={styles.input}
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

export default function MarketplaceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [queryText, setQueryText] = useState("");
  const [listingType, setListingType] = useState<NetworkListingType | "all">("all");
  const [minLength, setMinLength] = useState("");
  const [maxLength, setMaxLength] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selected, setSelected] = useState<YachtNetworkListing | null>(null);

  const listingsQ = useQuery({
    queryKey: ["marketplace-listings", queryText, listingType, minLength, maxLength, maxPrice],
    queryFn: () =>
      listNetworkListings({
        q: queryText,
        listing_type: listingType,
        min_length_m: minLength,
        max_length_m: maxLength,
        max_price_eur: maxPrice,
      }),
  });

  const listings = listingsQ.data ?? [];
  const stats = useMemo(() => {
    const sale = listings.filter((item) => item.listing_type === "sale" || item.listing_type === "both").length;
    const charter = listings.filter((item) => item.listing_type === "charter" || item.listing_type === "both").length;
    return { total: listings.length, sale, charter };
  }, [listings]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.replace("/(tabs)/tools")}>
          <Feather name="arrow-left" size={24} color={IVORY} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Members only</Text>
          <Text style={styles.title}>Marketplace</Text>
          <Text style={styles.subtitle}>Closed Yachtworth board for yachts published by app participants.</Text>
        </View>
        <Pressable style={styles.publishButton} onPress={() => router.push("/yacht-network" as never)}>
          <Feather name="upload-cloud" size={17} color={NAVY} />
          <Text style={styles.publishText}>Publish</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.metrics}>
          <Metric label="Listings" value={stats.total} />
          <Metric label="For sale" value={stats.sale} />
          <Metric label="Charter" value={stats.charter} />
        </View>

        <View style={styles.filters}>
          <Field label="Search" value={queryText} onChangeText={setQueryText} placeholder="Yacht, location, broker..." />
          <Text style={styles.label}>Type</Text>
          <ChipSelect items={LISTING_TYPES} selected={listingType} onSelect={setListingType} />
          <View style={styles.filterGrid}>
            <Field label="Min length" value={minLength} onChangeText={setMinLength} />
            <Field label="Max length" value={maxLength} onChangeText={setMaxLength} />
            <Field label="Max price" value={maxPrice} onChangeText={setMaxPrice} />
          </View>
        </View>

        {listingsQ.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={GOLD} />
            <Text style={styles.muted}>Loading member listings...</Text>
          </View>
        ) : listings.length ? (
          <View style={styles.catalogGrid}>
            {listings.map((item) => (
              <MarketplaceCard key={item.id} item={item} onOpen={() => setSelected(item)} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Feather name="search" size={28} color={GOLD} />
            <Text style={styles.emptyTitle}>No listings found</Text>
            <Text style={styles.muted}>Published internal and broker-network listings will appear here.</Text>
          </View>
        )}
      </ScrollView>

      <ListingModal item={selected} onClose={() => setSelected(null)} />
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

function MarketplaceCard({ item, onOpen }: { item: YachtNetworkListing; onOpen: () => void }) {
  const length = snapshotValue(item, "length_meters");
  const year = snapshotValue(item, "year_built");
  const builder = snapshotValue(item, "brand") ?? snapshotValue(item, "builder");
  const model = snapshotValue(item, "model");
  const cabins = snapshotValue(item, "cabins");
  const guests = snapshotValue(item, "guests");
  const price = money(item.asking_price_eur, item.currency ?? "EUR");
  const rate = item.charter_rate_eur_week ? `${money(item.charter_rate_eur_week, item.currency ?? "EUR")} / week` : null;

  return (
    <Pressable onPress={onOpen} style={styles.card}>
      {item.cover_photo_url ? (
        <Image source={{ uri: item.cover_photo_url }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardImageFallback}>
          <Feather name="anchor" size={30} color={GOLD} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>{[builder, model, year, length ? `${length}m` : null].filter(Boolean).join(" - ")}</Text>
          </View>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{item.listing_type}</Text>
          </View>
        </View>
        <Text style={styles.cardMeta}>{[item.location, cabins ? `${cabins} cabins` : null, guests ? `${guests} guests` : null].filter(Boolean).join(" - ")}</Text>
        <Text style={styles.priceLine}>{[price, rate].filter(Boolean).join("   ") || "Commercial terms on request"}</Text>
        {item.description ? <Text style={styles.description} numberOfLines={3}>{item.description}</Text> : null}
        <View style={styles.cardFooter}>
          <Text style={styles.memberText}>{item.broker_company || item.broker_name || "Yachtworth member"}</Text>
          <Feather name="chevron-right" size={18} color={GOLD} />
        </View>
      </View>
    </Pressable>
  );
}

function ListingModal({ item, onClose }: { item: YachtNetworkListing | null; onClose: () => void }) {
  const gallery = item ? photos(item) : [];
  if (!item) return null;

  const facts = [
    ["Builder", snapshotValue(item, "brand") ?? snapshotValue(item, "builder")],
    ["Model", snapshotValue(item, "model")],
    ["Year", snapshotValue(item, "year_built")],
    ["Length", snapshotValue(item, "length_meters") ? `${snapshotValue(item, "length_meters")} m` : null],
    ["Cabins", snapshotValue(item, "cabins")],
    ["Guests", snapshotValue(item, "guests")],
    ["Flag", snapshotValue(item, "flag")],
    ["Location", item.location],
    ["Availability", item.availability],
  ].filter(([, value]) => value != null && value !== "");

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Marketplace listing</Text>
              <Text style={styles.modalTitle}>{item.title}</Text>
            </View>
            <Pressable style={styles.iconButton} onPress={onClose}>
              <Feather name="x" size={22} color={IVORY} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {gallery.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
                {gallery.map((url) => (
                  <Image key={url} source={{ uri: url }} style={styles.galleryImage} />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.modalFallback}>
                <Feather name="anchor" size={40} color={GOLD} />
              </View>
            )}
            <View style={styles.detailGrid}>
              {facts.map(([label, value]) => (
                <View key={label} style={styles.fact}>
                  <Text style={styles.factLabel}>{label}</Text>
                  <Text style={styles.factValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.detailBlock}>
              <Text style={styles.detailTitle}>Commercial terms</Text>
              <Text style={styles.priceLine}>
                {[money(item.asking_price_eur, item.currency ?? "EUR"), item.charter_rate_eur_week ? `${money(item.charter_rate_eur_week, item.currency ?? "EUR")} / week` : null].filter(Boolean).join("   ") || "On request"}
              </Text>
            </View>
            {item.description ? (
              <View style={styles.detailBlock}>
                <Text style={styles.detailTitle}>Description</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            ) : null}
            <View style={styles.detailBlock}>
              <Text style={styles.detailTitle}>Participant contact</Text>
              <Text style={styles.contactText}>{item.broker_company || item.broker_name || "Yachtworth member"}</Text>
              <Text style={styles.contactText}>{[item.contact_email, item.contact_phone].filter(Boolean).join(" - ") || "Contact details are available inside Yachtworth."}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: LINE },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,243,236,0.08)" },
  headerText: { flex: 1 },
  eyebrow: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 3, textTransform: "uppercase" },
  title: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 34, marginTop: 6 },
  subtitle: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, marginTop: 4 },
  publishButton: { minHeight: 44, borderRadius: 8, backgroundColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  publishText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 13 },
  scroll: { padding: 22, paddingBottom: 56 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  metric: { minWidth: 120, flexGrow: 1, borderRadius: 8, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, padding: 14 },
  metricValue: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 28 },
  metricLabel: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  filters: { borderWidth: 1, borderColor: LINE, backgroundColor: NAVY_DEEP, borderRadius: 8, padding: 16, marginBottom: 18 },
  field: { marginBottom: 12, flex: 1 },
  label: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 7 },
  input: { borderWidth: 1, borderColor: "rgba(247,243,236,0.14)", borderRadius: 8, backgroundColor: PANEL, color: IVORY, fontFamily: "Inter_500Medium", fontSize: 15, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10 },
  chips: { gap: 8, paddingBottom: 4, marginBottom: 8 },
  chip: { borderRadius: 8, borderWidth: 1, borderColor: LINE, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: PANEL },
  chipActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.12)" },
  chipText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  chipTextActive: { color: IVORY },
  filterGrid: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 10 },
  loading: { alignItems: "center", justifyContent: "center", gap: 12, padding: 28 },
  muted: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  emptyBox: { alignItems: "center", gap: 8, borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 28, backgroundColor: NAVY_DEEP },
  emptyTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 18 },
  catalogGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  card: { flexBasis: Platform.OS === "web" ? "31%" : "100%", flexGrow: 1, minWidth: Platform.OS === "web" ? 320 : undefined, borderWidth: 1, borderColor: LINE, borderRadius: 8, backgroundColor: NAVY_DEEP, overflow: "hidden" },
  cardImage: { width: "100%", height: 220, backgroundColor: PANEL },
  cardImageFallback: { width: "100%", height: 220, backgroundColor: PANEL, alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  cardTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 24 },
  cardMeta: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18, marginTop: 3 },
  typePill: { borderWidth: 1, borderColor: GREEN, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  typePillText: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 10, textTransform: "uppercase" },
  priceLine: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 15, lineHeight: 22, marginTop: 10 },
  description: { color: IVORY, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, marginTop: 8 },
  cardFooter: { borderTopWidth: 1, borderTopColor: LINE, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12, paddingTop: 12 },
  memberText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", alignItems: "center", justifyContent: "center", padding: 18 },
  modalCard: { width: "100%", maxWidth: 980, maxHeight: "92%", borderRadius: 8, borderWidth: 1, borderColor: LINE, backgroundColor: NAVY_DEEP, overflow: "hidden" },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: LINE },
  modalTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 26, marginTop: 4 },
  modalScroll: { padding: 16, paddingBottom: 26 },
  gallery: { gap: 10, paddingBottom: 14 },
  galleryImage: { width: Platform.OS === "web" ? 310 : 260, height: 210, borderRadius: 8, backgroundColor: PANEL },
  modalFallback: { height: 210, borderRadius: 8, backgroundColor: PANEL, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fact: { flexBasis: Platform.OS === "web" ? "23%" : "47%", flexGrow: 1, borderWidth: 1, borderColor: LINE, borderRadius: 8, backgroundColor: PANEL, padding: 12 },
  factLabel: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },
  factValue: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 5 },
  detailBlock: { borderTopWidth: 1, borderTopColor: LINE, marginTop: 16, paddingTop: 14 },
  detailTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 17 },
  contactText: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20, marginTop: 5 },
});
