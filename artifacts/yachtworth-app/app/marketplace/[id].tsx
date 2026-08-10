import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { archiveNetworkListing, getNetworkListing, type YachtNetworkListing } from "@/lib/yachtNetwork";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const PANEL = "#112A56";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.68)";
const LINE = "rgba(247,243,236,0.1)";
const RED = "#F08A8A";

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

export default function MarketplaceDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const [removing, setRemoving] = useState(false);

  const listingQ = useQuery({
    queryKey: ["marketplace-listing", id],
    queryFn: () => getNetworkListing(id),
    enabled: !!id,
  });

  const item = listingQ.data ?? null;

  const removeFromListing = () => {
    if (!item || removing) return;
    Alert.alert("Remove from listing", "This yacht will be removed from the marketplace board. The listing data will be archived, not deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            setRemoving(true);
            await archiveNetworkListing(item.id);
            await qc.invalidateQueries({ queryKey: ["marketplace-listings"] });
            await qc.invalidateQueries({ queryKey: ["network-listings"] });
            router.replace("/marketplace" as never);
          } catch (err) {
            Alert.alert("Remove failed", err instanceof Error ? err.message : "Could not remove listing");
          } finally {
            setRemoving(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 70 }]}>
      <View style={styles.topbar}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={IVORY} />
        </Pressable>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>YACHTWORTH</Text>
          <Text style={styles.scope}>MARKETPLACE LISTING</Text>
        </View>
        <Pressable style={styles.marketButton} onPress={() => router.replace("/marketplace" as never)}>
          <Feather name="grid" size={17} color={NAVY} />
          <Text style={styles.marketText}>All listings</Text>
        </Pressable>
      </View>

      {listingQ.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={GOLD} />
          <Text style={styles.muted}>Loading listing...</Text>
        </View>
      ) : item ? (
        <ListingDetail item={item} removing={removing} onRemove={removeFromListing} />
      ) : (
        <View style={styles.emptyBox}>
          <Feather name="alert-circle" size={28} color={GOLD} />
          <Text style={styles.emptyTitle}>Listing not found</Text>
          <Text style={styles.muted}>This listing may be archived or unavailable to your account.</Text>
        </View>
      )}
    </View>
  );
}

function ListingDetail({ item, removing, onRemove }: { item: YachtNetworkListing; removing: boolean; onRemove: () => void }) {
  const gallery = photos(item);
  const facts = [
    ["Builder", snapshotValue(item, "brand") ?? snapshotValue(item, "builder")],
    ["Model", snapshotValue(item, "model")],
    ["Year", snapshotValue(item, "year_built")],
    ["Length", snapshotValue(item, "length_meters") ? `${snapshotValue(item, "length_meters")} m` : null],
    ["Beam", snapshotValue(item, "beam_meters") ? `${snapshotValue(item, "beam_meters")} m` : null],
    ["Draft", snapshotValue(item, "draft_meters") ? `${snapshotValue(item, "draft_meters")} m` : null],
    ["Cabins", snapshotValue(item, "cabins")],
    ["Guests", snapshotValue(item, "guests")],
    ["Crew", snapshotValue(item, "crew")],
    ["Flag", snapshotValue(item, "flag")],
    ["Location", item.location],
    ["Availability", item.availability],
  ].filter(([, value]) => value != null && value !== "");

  const price = money(item.asking_price_eur, item.currency ?? "EUR");
  const rate = item.charter_rate_eur_week ? `${money(item.charter_rate_eur_week, item.currency ?? "EUR")} / week` : null;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.hero}>
        <View style={styles.galleryBlock}>
          {gallery[0] ? (
            <Image source={{ uri: gallery[0] }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroFallback}>
              <Feather name="anchor" size={42} color={GOLD} />
            </View>
          )}
          {gallery.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
              {gallery.slice(1).map((url) => (
                <Image key={url} source={{ uri: url }} style={styles.thumb} />
              ))}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.summary}>
          <Text style={styles.eyebrow}>{item.listing_type} listing</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>{[snapshotValue(item, "year_built"), snapshotValue(item, "length_meters") ? `${snapshotValue(item, "length_meters")} m` : null, item.location].filter(Boolean).join(" - ")}</Text>
          <Text style={styles.priceLine}>{[price, rate].filter(Boolean).join("   ") || "Commercial terms on request"}</Text>
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          {item.is_owner ? (
            <Pressable style={[styles.removeButton, removing && styles.disabled]} disabled={removing} onPress={onRemove}>
              <Feather name="trash-2" size={18} color={RED} />
              <Text style={styles.removeText}>{removing ? "Removing..." : "Remove from listing"}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Yacht particulars</Text>
        <View style={styles.detailGrid}>
          {facts.map(([label, value]) => (
            <View key={label} style={styles.fact}>
              <Text style={styles.factLabel}>{label}</Text>
              <Text style={styles.factValue}>{String(value)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Participant contact</Text>
        <Text style={styles.contactText}>{item.broker_company || item.broker_name || "Yachtworth member"}</Text>
        <Text style={styles.contactText}>{[item.contact_email, item.contact_phone].filter(Boolean).join(" - ") || "Contact details are available inside Yachtworth."}</Text>
        <View style={styles.contactActions}>
          {item.contact_email ? (
            <Pressable style={styles.actionButton} onPress={() => Linking.openURL(`mailto:${item.contact_email}`)}>
              <Feather name="mail" size={18} color={NAVY} />
              <Text style={styles.actionText}>Email</Text>
            </Pressable>
          ) : null}
          {item.contact_phone ? (
            <Pressable style={styles.secondaryButton} onPress={() => Linking.openURL(`tel:${item.contact_phone}`)}>
              <Feather name="phone" size={18} color={GOLD} />
              <Text style={styles.secondaryText}>Call</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  topbar: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: NAVY_DEEP },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,243,236,0.08)" },
  brandBlock: { flex: 1 },
  brand: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: 6 },
  scope: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 2.2, marginTop: 5 },
  marketButton: { minHeight: 44, borderRadius: 8, backgroundColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  marketText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 13 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  emptyBox: { margin: 24, alignItems: "center", gap: 8, borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 28, backgroundColor: NAVY_DEEP },
  emptyTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 18 },
  scroll: { padding: 24, paddingBottom: 58 },
  hero: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 22, alignItems: "stretch" },
  galleryBlock: { flex: 1.1, gap: 10 },
  heroImage: { width: "100%", height: Platform.OS === "web" ? 520 : 320, borderRadius: 8, backgroundColor: PANEL },
  heroFallback: { width: "100%", height: Platform.OS === "web" ? 520 : 320, borderRadius: 8, backgroundColor: PANEL, alignItems: "center", justifyContent: "center" },
  thumbRow: { gap: 10 },
  thumb: { width: 140, height: 95, borderRadius: 8, backgroundColor: PANEL },
  summary: { flex: 0.9, borderWidth: 1, borderColor: LINE, borderRadius: 8, backgroundColor: NAVY_DEEP, padding: 18, alignSelf: "flex-start", width: Platform.OS === "web" ? undefined : "100%" },
  eyebrow: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 3, textTransform: "uppercase" },
  title: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: Platform.OS === "web" ? 42 : 32, lineHeight: Platform.OS === "web" ? 50 : 38, marginTop: 10 },
  meta: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 15, lineHeight: 22, marginTop: 8 },
  priceLine: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 26, marginTop: 14 },
  description: { color: IVORY, fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 23, marginTop: 14 },
  section: { borderWidth: 1, borderColor: LINE, borderRadius: 8, backgroundColor: NAVY_DEEP, padding: 16, marginTop: 18 },
  sectionTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 21, marginBottom: 14 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fact: { flexBasis: Platform.OS === "web" ? "23%" : "47%", flexGrow: 1, borderWidth: 1, borderColor: LINE, borderRadius: 8, backgroundColor: PANEL, padding: 12 },
  factLabel: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },
  factValue: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 5 },
  contactText: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 15, lineHeight: 22, marginTop: 4 },
  contactActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  actionButton: { minHeight: 46, borderRadius: 8, backgroundColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 },
  actionText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 14 },
  secondaryButton: { minHeight: 46, borderRadius: 8, borderWidth: 1, borderColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 },
  secondaryText: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 14 },
  removeButton: { minHeight: 46, borderRadius: 8, borderWidth: 1, borderColor: RED, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, marginTop: 18 },
  removeText: { color: RED, fontFamily: "Inter_700Bold", fontSize: 14 },
  disabled: { opacity: 0.5 },
});
