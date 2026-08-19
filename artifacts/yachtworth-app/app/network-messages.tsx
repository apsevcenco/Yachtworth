import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listNetworkConversations, type NetworkConversation } from "@/lib/yachtNetwork";
import { useTheme } from "../hooks/useColors";

function fmtDate(v?: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function NetworkMessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isAcid } = useTheme();

  const conversationsQ = useQuery({
    queryKey: ["network-conversations"],
    queryFn: listNetworkConversations,
    refetchInterval: 5000,
  });

  const items = conversationsQ.data ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top + 56 }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 70 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Pressable style={[styles.iconButton, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={23} color={colors.foreground} />
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={[styles.kicker, { color: colors.primary }, isAcid && styles.acidText]}>YACHTWORTH NETWORK</Text>
            <Text style={[styles.title, { color: colors.foreground }, isAcid && styles.acidTitle]}>Messages</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Conversations connected to marketplace listings.</Text>
          </View>
        </View>

        {conversationsQ.isLoading ? (
          <View style={[styles.center, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>Loading messages...</Text>
          </View>
        ) : items.length ? (
          <View style={styles.list}>
            {items.map((item) => (
              <ConversationCard
                key={item.id}
                item={item}
                onOpen={() => router.push(`/network-chat/${item.id}` as never)}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.center, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="message-circle" size={30} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No conversations yet</Text>
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>Open a marketplace listing and start a conversation with a Yachtworth participant.</Text>
            <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push("/marketplace" as never)}>
              <Text style={[styles.primaryText, { color: colors.background }]}>Open marketplace</Text>
              <Feather name="arrow-up-right" size={16} color={colors.background} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ConversationCard({ item, onOpen }: { item: NetworkConversation; onOpen: () => void }) {
  const { colors, isAcid } = useTheme();
  const listing = item.listing;
  const role = item.is_listing_owner ? "Incoming inquiry" : "Your inquiry";
  const title = listing?.title ?? "Marketplace conversation";
  const meta = [listing?.location, listing?.listing_type, role].filter(Boolean).join(" - ");
  const unread = Math.max(0, Number(item.unread_count ?? 0));

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
        isAcid && styles.acidGlow,
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: colors.glow ?? colors.secondary }]}>
        <Feather name="message-square" size={18} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>{fmtDate(item.last_message_at ?? item.updated_at)}</Text>
        </View>
        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]} numberOfLines={1}>{meta}</Text>
        <Text style={[styles.lastMessage, { color: colors.foreground }]} numberOfLines={2}>
          {item.last_message_text || "No messages yet. Open the conversation to send the first message."}
        </Text>
      </View>
      {unread > 0 ? (
        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.unreadText, { color: colors.background }]}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      ) : (
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },
  topbar: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  iconButton: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleBlock: { flex: 1, minWidth: 0 },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 2.4, textTransform: "uppercase" },
  title: { fontFamily: "Gilroy-ExtraBold", fontSize: 34, lineHeight: 40, marginTop: 5 },
  acidTitle: { letterSpacing: 0.6, textTransform: "uppercase" },
  acidText: { letterSpacing: 3 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 5 },
  list: { gap: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 8, padding: 14 },
  acidGlow: { shadowColor: "#FF4FD8", shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  cardIcon: { width: 42, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 15 },
  cardDate: { fontFamily: "Inter_500Medium", fontSize: 11 },
  cardMeta: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  lastMessage: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, marginTop: 7 },
  unreadBadge: { minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 7, alignItems: "center", justifyContent: "center" },
  unreadText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  center: { alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 8, padding: 24 },
  muted: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  primaryButton: { minHeight: 46, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, marginTop: 4 },
  primaryText: { fontFamily: "Inter_700Bold", fontSize: 14 },
});
