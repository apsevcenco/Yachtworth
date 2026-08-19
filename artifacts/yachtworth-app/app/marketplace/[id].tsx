import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { archiveNetworkListing, getNetworkListing, startNetworkConversation, type YachtNetworkListing } from "@/lib/yachtNetwork";

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

function snapshotBool(item: YachtNetworkListing, key: string): boolean | null {
  const value = item.yacht_snapshot?.[key];
  return typeof value === "boolean" ? value : null;
}

function snapshotList(item: YachtNetworkListing, key: string): string[] {
  const value = item.yacht_snapshot?.[key];
  return Array.isArray(value) ? value.filter((url): url is string => typeof url === "string" && url.trim().length > 0) : [];
}

function yesNo(value: boolean | null): string | null {
  return value == null ? null : value ? "Yes" : "No";
}

function photos(item: YachtNetworkListing): string[] {
  const gallery = Array.isArray(item.photo_urls) ? item.photo_urls.filter((url): url is string => typeof url === "string") : [];
  return [
    item.cover_photo_url,
    ...gallery,
    snapshotValue(item, "cover_photo_url"),
    snapshotValue(item, "photo_url"),
    ...snapshotList(item, "photo_urls"),
  ].filter((url, index, arr): url is string => typeof url === "string" && url.trim().length > 0 && arr.indexOf(url) === index);
}

type FactPair = [string, string | number | null | undefined];

function cleanFacts(items: FactPair[]): [string, string | number][] {
  return items.filter((item): item is [string, string | number] => item[1] != null && item[1] !== "");
}

export default function MarketplaceDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const [removing, setRemoving] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

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

  const messageListing = async () => {
    if (!item || item.is_owner || startingChat) return;
    try {
      setStartingChat(true);
      const conversation = await startNetworkConversation(item.id);
      router.push(`/network-chat/${conversation.id}` as never);
    } catch (err) {
      Alert.alert("Message unavailable", err instanceof Error ? err.message : "Could not start conversation");
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 56 }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topbar}>
          <View style={styles.topbarRow}>
            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={24} color={IVORY} />
            </Pressable>
            <View style={styles.brandBlock}>
              <Text style={styles.scope}>MARKETPLACE LISTING</Text>
              <Text style={styles.pageTitle}>Listing details</Text>
            </View>
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
          <ListingDetail
            item={item}
            removing={removing}
            startingChat={startingChat}
            onRemove={removeFromListing}
            onMessage={messageListing}
            onOpenMessages={() => router.push("/network-messages" as never)}
          />
        ) : (
          <View style={styles.emptyBox}>
            <Feather name="alert-circle" size={28} color={GOLD} />
            <Text style={styles.emptyTitle}>Listing not found</Text>
            <Text style={styles.muted}>This listing may be archived or unavailable to your account.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ListingDetail({
  item,
  removing,
  startingChat,
  onRemove,
  onMessage,
  onOpenMessages,
}: {
  item: YachtNetworkListing;
  removing: boolean;
  startingChat: boolean;
  onRemove: () => void;
  onMessage: () => void;
  onOpenMessages: () => void;
}) {
  const gallery = photos(item);
  const [activePhoto, setActivePhoto] = useState<number | null>(null);
  const builder = snapshotValue(item, "brand") ?? snapshotValue(item, "builder");
  const length = snapshotValue(item, "length_meters");
  const beam = snapshotValue(item, "beam_meters");
  const draft = snapshotValue(item, "draft_meters");
  const purchasePrice = snapshotValue(item, "purchase_price_eur");
  const facts = {
    listing: cleanFacts([
      ["Listing type", item.listing_type],
      ["Status", item.status],
      ["Visibility", item.visibility],
      ["Location", item.location],
      ["Availability", item.availability],
      ["Asking price", money(item.asking_price_eur, item.currency ?? "EUR")],
      ["Charter rate", item.charter_rate_eur_week ? `${money(item.charter_rate_eur_week, item.currency ?? "EUR")} / week` : null],
    ]),
    identity: cleanFacts([
      ["Name", snapshotValue(item, "name")],
      ["Builder", builder],
      ["Model", snapshotValue(item, "model")],
      ["Year", snapshotValue(item, "year_built")],
      ["Type", snapshotValue(item, "yacht_type")],
      ["Configuration", snapshotValue(item, "configuration")],
    ]),
    dimensions: cleanFacts([
      ["LOA", length ? `${length} m` : null],
      ["Beam", beam ? `${beam} m` : null],
      ["Draft", draft ? `${draft} m` : null],
      ["Cabins", snapshotValue(item, "cabins")],
      ["Guest capacity", snapshotValue(item, "guests")],
      ["Berths", snapshotValue(item, "berths")],
      ["Heads", snapshotValue(item, "heads")],
      ["Crew", snapshotValue(item, "crew")],
      ["Crew cabins", snapshotValue(item, "crew_cabins")],
    ]),
    registration: cleanFacts([
      ["Flag", snapshotValue(item, "flag")],
      ["Home port", snapshotValue(item, "home_port")],
      ["Marina", snapshotValue(item, "marina_location")],
      ["VAT status", snapshotValue(item, "vat_status")],
      ["Commercial registration", yesNo(snapshotBool(item, "commercial_registration"))],
    ]),
    machinery: cleanFacts([
      ["Engine maker", snapshotValue(item, "engine_maker")],
      ["Engine model", snapshotValue(item, "engine_model")],
      ["Engine count", snapshotValue(item, "engine_count")],
      ["Total HP", snapshotValue(item, "total_hp")],
      ["Engine hours", snapshotValue(item, "engine_hours")],
    ]),
    ownership: cleanFacts([
      ["Owner role", snapshotValue(item, "owner_role")],
      ["Purchase price", typeof purchasePrice === "number" ? money(purchasePrice, item.currency ?? "EUR") : purchasePrice],
      ["Purchase year", snapshotValue(item, "purchase_year")],
      ["Financing type", snapshotValue(item, "financing_type")],
    ]),
  };

  const price = money(item.asking_price_eur, item.currency ?? "EUR");
  const rate = item.charter_rate_eur_week ? `${money(item.charter_rate_eur_week, item.currency ?? "EUR")} / week` : null;

  return (
    <View>
      <View style={styles.hero}>
        <View style={styles.galleryBlock}>
          {gallery[0] ? (
            <Pressable onPress={() => setActivePhoto(0)}>
              <Image source={{ uri: gallery[0] }} style={styles.heroImage} resizeMode="cover" />
              <View style={styles.openPhotoBadge}>
                <Feather name="maximize-2" size={15} color={NAVY} />
                <Text style={styles.openPhotoText}>Open photo</Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.heroFallback}>
              <Feather name="anchor" size={42} color={GOLD} />
            </View>
          )}
          {gallery.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
              {gallery.map((url, index) => (
                <Pressable key={url} onPress={() => setActivePhoto(index)} style={styles.thumbWrap}>
                  <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
                  <Text style={styles.thumbCount}>{index + 1}</Text>
                </Pressable>
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

      <FactSection title="Listing terms" facts={facts.listing} />
      <FactSection title="Identity" facts={facts.identity} />
      <FactSection title="Dimensions & accommodation" facts={facts.dimensions} />
      <FactSection title="Registration & location" facts={facts.registration} />
      <FactSection title="Machinery" facts={facts.machinery} />
      <FactSection title="Ownership & financial snapshot" facts={facts.ownership} />

      {snapshotValue(item, "notes") ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yacht notes</Text>
          <Text style={styles.description}>{snapshotValue(item, "notes")}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Participant contact</Text>
        <Text style={styles.contactText}>{item.broker_company || item.broker_name || "Yachtworth member"}</Text>
        <Text style={styles.contactText}>{[item.contact_email, item.contact_phone].filter(Boolean).join(" - ") || "Contact details are available inside Yachtworth."}</Text>
        <View style={styles.contactActions}>
          {item.is_owner ? (
            <Pressable style={styles.actionButton} onPress={onOpenMessages}>
              <Feather name="inbox" size={18} color={NAVY} />
              <Text style={styles.actionText}>Open listing messages</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.actionButton} disabled={startingChat} onPress={onMessage}>
              {startingChat ? <ActivityIndicator color={NAVY} /> : <Feather name="message-circle" size={18} color={NAVY} />}
              <Text style={styles.actionText}>{startingChat ? "Opening..." : "Message inside Yachtworth"}</Text>
            </Pressable>
          )}
          {item.contact_email ? (
            <Pressable style={styles.secondaryButton} onPress={() => Linking.openURL(`mailto:${item.contact_email}`)}>
              <Feather name="mail" size={18} color={GOLD} />
              <Text style={styles.secondaryText}>Email</Text>
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

      <PhotoViewer
        urls={gallery}
        index={activePhoto}
        title={item.title}
        onClose={() => setActivePhoto(null)}
        onChange={setActivePhoto}
      />
    </View>
  );
}

function FactSection({ title, facts }: { title: string; facts: [string, string | number][] }) {
  if (!facts.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.detailGrid}>
        {facts.map(([label, value]) => (
          <View key={label} style={styles.fact}>
            <Text style={styles.factLabel}>{label}</Text>
            <Text style={styles.factValue}>{String(value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PhotoViewer({
  urls,
  index,
  title,
  onClose,
  onChange,
}: {
  urls: string[];
  index: number | null;
  title: string;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const current = index == null ? null : urls[index];
  const canPrev = index != null && index > 0;
  const canNext = index != null && index < urls.length - 1;
  if (index == null || !current) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewer}>
        <View style={styles.viewerTop}>
          <View style={styles.viewerTitleBlock}>
            <Text style={styles.viewerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.viewerCounter}>{index + 1} / {urls.length}</Text>
          </View>
          <Pressable style={styles.viewerIcon} onPress={onClose}>
            <Feather name="x" size={24} color={IVORY} />
          </Pressable>
        </View>
        <View style={styles.viewerBody}>
          <Pressable style={[styles.viewerNav, !canPrev && styles.viewerNavDisabled]} disabled={!canPrev} onPress={() => onChange(index - 1)}>
            <Feather name="chevron-left" size={28} color={IVORY} />
          </Pressable>
          <Image source={{ uri: current }} style={styles.viewerImage} resizeMode="contain" />
          <Pressable style={[styles.viewerNav, !canNext && styles.viewerNavDisabled]} disabled={!canNext} onPress={() => onChange(index + 1)}>
            <Feather name="chevron-right" size={28} color={IVORY} />
          </Pressable>
        </View>
        {urls.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewerThumbs}>
            {urls.map((url, photoIndex) => (
              <Pressable key={url} onPress={() => onChange(photoIndex)} style={[styles.viewerThumbWrap, photoIndex === index && styles.viewerThumbActive]}>
                <Image source={{ uri: url }} style={styles.viewerThumb} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
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
  marketButton: { alignSelf: Platform.OS === "web" ? "flex-start" : "stretch", minHeight: 44, borderRadius: 8, backgroundColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  marketText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 13 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  emptyBox: { alignItems: "center", gap: 8, borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 28, backgroundColor: NAVY_DEEP },
  emptyTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 18 },
  scroll: { padding: 24, paddingBottom: 58 },
  hero: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 22, alignItems: "stretch" },
  galleryBlock: { flex: 1.1, gap: 10 },
  heroImage: { width: "100%", height: Platform.OS === "web" ? 520 : 320, borderRadius: 8, backgroundColor: PANEL },
  heroFallback: { width: "100%", height: Platform.OS === "web" ? 520 : 320, borderRadius: 8, backgroundColor: PANEL, alignItems: "center", justifyContent: "center" },
  openPhotoBadge: { position: "absolute", right: 12, bottom: 12, minHeight: 34, borderRadius: 8, backgroundColor: GOLD, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10 },
  openPhotoText: { color: NAVY, fontFamily: "Inter_700Bold", fontSize: 12 },
  thumbRow: { gap: 10 },
  thumbWrap: { width: 140, height: 95 },
  thumb: { width: 140, height: 95, borderRadius: 8, backgroundColor: PANEL },
  thumbCount: { position: "absolute", left: 7, top: 7, color: NAVY, backgroundColor: GOLD, overflow: "hidden", borderRadius: 999, minWidth: 22, height: 22, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 12, lineHeight: 22 },
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
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.94)", paddingHorizontal: Platform.OS === "web" ? 24 : 12, paddingVertical: Platform.OS === "web" ? 24 : 42 },
  viewerTop: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  viewerTitleBlock: { flex: 1, minWidth: 0 },
  viewerTitle: { color: IVORY, fontFamily: "Inter_700Bold", fontSize: 18 },
  viewerCounter: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 3 },
  viewerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(247,243,236,0.12)", alignItems: "center", justifyContent: "center" },
  viewerBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: Platform.OS === "web" ? 16 : 6 },
  viewerImage: { flex: 1, height: "100%" },
  viewerNav: { width: 44, height: 64, borderRadius: 8, backgroundColor: "rgba(247,243,236,0.12)", alignItems: "center", justifyContent: "center" },
  viewerNavDisabled: { opacity: 0.22 },
  viewerThumbs: { gap: 10, paddingTop: 14 },
  viewerThumbWrap: { width: 92, height: 62, borderRadius: 8, borderWidth: 1, borderColor: "transparent", overflow: "hidden" },
  viewerThumbActive: { borderColor: GOLD },
  viewerThumb: { width: "100%", height: "100%" },
});
