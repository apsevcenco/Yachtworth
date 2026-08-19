import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listNetworkListings, type NetworkListingType, type YachtNetworkListing } from "@/lib/yachtNetwork";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const PANEL = "#112A56";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.68)";
const LINE = "rgba(247,243,236,0.1)";
const GREEN = "#7BD389";

const TYPES: { id: NetworkListingType | "all"; label: string }[] = [
  { id: "all", label: "All yachts" },
  { id: "sale", label: "For sale" },
  { id: "charter", label: "For charter" },
  { id: "both", label: "Sale + charter" },
];

function money(value?: number | null, currency = "EUR"): string | null {
  return value == null ? null : `${currency} ${Number(value).toLocaleString("en-US")}`;
}

function snapshotValue(item: YachtNetworkListing, key: string): string | number | null {
  const value = item.yacht_snapshot?.[key];
  return typeof value === "string" || typeof value === "number" ? value : null;
}

export default function MarketplaceIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [listingType, setListingType] = useState<NetworkListingType | "all">("all");

  const listingsQ = useQuery({
    queryKey: ["marketplace-listings", listingType],
    queryFn: () => listNetworkListings({ listing_type: listingType }),
  });

  const listings = listingsQ.data ?? [];
  const featured = listings[0] ?? null;
  const stats = useMemo(() => {
    const sale = listings.filter((item) => item.listing_type === "sale" || item.listing_type === "both").length;
    const charter = listings.filter((item) => item.listing_type === "charter" || item.listing_type === "both").length;
    return { total: listings.length, sale, charter };
  }, [listings]);

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 56 }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topbar}>
          <View style={styles.topbarRow}>
            <Pressable style={styles.iconButton} onPress={() => router.replace("/(tabs)/tools")}>
              <Feather name="arrow-left" size={24} color={IVORY} />
            </Pressable>
            <View style={styles.brandBlock}>
              <Text style={styles.scope}>PRIVATE MARKETPLACE</Text>
              <Text style={styles.pageTitle}>Marketplace</Text>
            </View>
          </View>
          <View style={styles.topActions}>
            <Pressable style={styles.messagesButton} onPress={() => router.push("/network-messages" as never)}>
              <Feather name="message-circle" size={17} color={GOLD} />
              <Text style={styles.messagesText}>Messages</Text>
            </Pressable>
            <Pressable style={styles.publishButton} onPress={() => router.push("/yacht-network" as never)}>
              <Feather name="upload-cloud" size={17} color={NAVY} />
              <Text style={styles.publishText}>Publish yacht</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Members-only yacht board</Text>
            <Text style={styles.heroTitle}>Yachts published by Yachtworth participants</Text>
            <Text style={styles.heroText}>
              A closed internal marketplace for brokers, owners and charter operators. Listings are visible only to signed-in Yachtworth users.
            </Text>
            <View style={styles.statsRow}>
              <Metric label="Listings" value={stats.total} />
              <Metric label="For sale" value={stats.sale} />
              <Metric label="Charter" value={stats.charter} />
            </View>
          </View>
          <FeaturedCard item={featured} onOpen={() => featured && router.push(`/marketplace/${featured.id}` as never)} />
        </View>

        <View style={styles.typeRow}>
          {TYPES.map((item) => (
            <Pressable key={item.id} onPress={() => setListingType(item.id)} style={[styles.typeButton, listingType === item.id && styles.typeButtonActive]}>
              <Text style={[styles.typeButtonText, listingType === item.id && styles.typeButtonTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {listingsQ.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={GOLD} />
            <Text style={styles.muted}>Loading marketplace...</Text>
          </View>
        ) : listings.length ? (
          <View style={styles.catalogGrid}>
            {listings.map((item) => (
              <MarketplaceCard key={item.id} item={item} onOpen={() => router.push(`/marketplace/${item.id}` as never)} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Feather name="anchor" size={28} color={GOLD} />
            <Text style={styles.emptyTitle}>No yachts published yet</Text>
            <Text style={styles.muted}>Use Yachtworth Network to publish an internal sale or charter listing.</Text>
          </View>
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

function FeaturedCard({ item, onOpen }: { item: YachtNetworkListing | null; onOpen: () => void }) {
  if (!item) {
    return (
      <View style={styles.featuredEmpty}>
        <Feather name="image" size={34} color={GOLD} />
        <Text style={styles.featuredEmptyText}>Featured yacht will appear here</Text>
      </View>
    );
  }
  return (
    <Pressable style={styles.featured} onPress={onOpen}>
      {item.cover_photo_url ? <Image source={{ uri: item.cover_photo_url }} style={styles.featuredImage} /> : <View style={styles.featuredFallback} />}
      <View style={styles.featuredOverlay}>
        <Text style={styles.featuredLabel}>Featured listing</Text>
        <Text style={styles.featuredTitle}>{item.title}</Text>
        <Text style={styles.featuredMeta}>{[snapshotValue(item, "year_built"), snapshotValue(item, "length_meters") ? `${snapshotValue(item, "length_meters")}m` : null, item.location].filter(Boolean).join(" - ")}</Text>
      </View>
    </Pressable>
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
          <Feather name="arrow-up-right" size={18} color={GOLD} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  topbar: { gap: 14, marginBottom: 20 },
  topbarRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,243,236,0.08)" },
  brandBlock: { flex: 1 },
  scope: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 2.2, marginTop: 5 },
  pageTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 30, lineHeight: 36, marginTop: 6 },
  topActions: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 10, alignSelf: Platform.OS === "web" ? "flex-start" : "stretch" },
  messagesButton: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  messagesText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 13 },
  publishButton: { alignSelf: Platform.OS === "web" ? "flex-start" : "stretch", minHeight: 44, borderRadius: 8, backgroundColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  publishText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 13 },
  scroll: { padding: 24, paddingBottom: 58 },
  hero: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 18, alignItems: "stretch", marginBottom: 20 },
  heroCopy: { flex: 1.1, justifyContent: "center", paddingVertical: Platform.OS === "web" ? 28 : 0 },
  eyebrow: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 3, textTransform: "uppercase" },
  heroTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: Platform.OS === "web" ? 48 : 34, lineHeight: Platform.OS === "web" ? 56 : 40, marginTop: 10 },
  heroText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24, maxWidth: 760, marginTop: 12 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 },
  metric: { minWidth: 118, borderRadius: 8, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, padding: 14 },
  metricValue: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 28 },
  metricLabel: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  featured: { flex: 0.9, minHeight: 340, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: LINE, backgroundColor: PANEL },
  featuredImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  featuredFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: PANEL },
  featuredOverlay: { flex: 1, justifyContent: "flex-end", padding: 18, backgroundColor: "rgba(8,22,51,0.2)" },
  featuredLabel: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase" },
  featuredTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 26, marginTop: 8 },
  featuredMeta: { color: IVORY, fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 6 },
  featuredEmpty: { flex: 0.9, minHeight: 280, borderRadius: 8, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, alignItems: "center", justifyContent: "center", gap: 10 },
  featuredEmptyText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  typeButton: { borderRadius: 8, borderWidth: 1, borderColor: LINE, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: NAVY_DEEP },
  typeButtonActive: { borderColor: GOLD, backgroundColor: "rgba(201,169,97,0.14)" },
  typeButtonText: { color: MUTED, fontFamily: "Inter_700Bold", fontSize: 13 },
  typeButtonTextActive: { color: IVORY },
  loading: { alignItems: "center", justifyContent: "center", gap: 12, padding: 28 },
  muted: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  emptyBox: { alignItems: "center", gap: 8, borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 28, backgroundColor: NAVY_DEEP },
  emptyTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 18 },
  catalogGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  card: { flexBasis: Platform.OS === "web" ? "31%" : "100%", flexGrow: 1, minWidth: Platform.OS === "web" ? 320 : undefined, borderWidth: 1, borderColor: LINE, borderRadius: 8, backgroundColor: NAVY_DEEP, overflow: "hidden" },
  cardImage: { width: "100%", height: 230, backgroundColor: PANEL },
  cardImageFallback: { width: "100%", height: 230, backgroundColor: PANEL, alignItems: "center", justifyContent: "center" },
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
});
