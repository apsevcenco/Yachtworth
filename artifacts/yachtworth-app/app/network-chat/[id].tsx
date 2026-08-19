import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  getNetworkConversationMessages,
  sendNetworkMessage,
  type NetworkMessage,
} from "@/lib/yachtNetwork";
import { useTheme } from "../../hooks/useColors";

function fmtDateTime(v?: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function NetworkChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const qc = useQueryClient();
  const { colors, isAcid } = useTheme();
  const [draft, setDraft] = useState("");

  const chatQ = useQuery({
    queryKey: ["network-conversation", id],
    queryFn: () => getNetworkConversationMessages(id),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const detail = chatQ.data ?? null;
  const conversation = detail?.conversation ?? null;
  const listing = conversation?.listing ?? null;
  const title = listing?.title ?? "Network conversation";
  const messages = detail?.items ?? [];

  const sendM = useMutation({
    mutationFn: (body: string) => sendNetworkMessage(id, body),
    onSuccess: async () => {
      setDraft("");
      await qc.invalidateQueries({ queryKey: ["network-conversation", id] });
      await qc.invalidateQueries({ queryKey: ["network-conversations"] });
    },
    onError: (err) => {
      Alert.alert("Message not sent", err instanceof Error ? err.message : "Please try again.");
    },
  });

  const canSend = draft.trim().length > 0 && !sendM.isPending;
  const participantLabel = useMemo(() => {
    if (!conversation) return "";
    return conversation.is_listing_owner ? "Conversation with interested participant" : "Conversation with listing owner";
  }, [conversation]);

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    sendM.mutate(body);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.inner, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 56 }]}>
        <View style={styles.topbar}>
          <Pressable style={[styles.iconButton, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={23} color={colors.foreground} />
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={[styles.kicker, { color: colors.primary }, isAcid && styles.acidText]}>NETWORK CHAT</Text>
            <Text style={[styles.title, { color: colors.foreground }, isAcid && styles.acidTitle]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>{participantLabel}</Text>
          </View>
        </View>

        {chatQ.isLoading ? (
          <View style={[styles.center, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>Loading conversation...</Text>
          </View>
        ) : conversation ? (
          <>
            <ScrollView
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length ? (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    mine={message.sender_user_id !== conversation.other_participant_user_id}
                  />
                ))
              ) : (
                <View style={[styles.center, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="message-circle" size={28} color={colors.primary} />
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>No messages yet. Send the first note about this listing.</Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Write a message..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border }]}
              />
              <Pressable
                disabled={!canSend}
                onPress={submit}
                style={[styles.sendButton, { backgroundColor: colors.primary }, !canSend && styles.disabled]}
              >
                {sendM.isPending ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Feather name="send" size={18} color={colors.background} />
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <View style={[styles.center, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="alert-circle" size={28} color={colors.primary} />
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>Conversation not found or unavailable.</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message, mine }: { message: NetworkMessage; mine: boolean }) {
  const { colors, isAcid } = useTheme();
  return (
    <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: mine ? colors.primary : colors.card,
            borderColor: mine ? colors.primary : colors.border,
          },
          isAcid && mine && styles.acidMine,
        ]}
      >
        <Text style={[styles.bubbleText, { color: mine ? colors.background : colors.foreground }]}>{message.body}</Text>
        <Text style={[styles.bubbleDate, { color: mine ? colors.background : colors.mutedForeground }]}>{fmtDateTime(message.created_at)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 18 },
  topbar: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  iconButton: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleBlock: { flex: 1, minWidth: 0 },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 2.2, textTransform: "uppercase" },
  title: { fontFamily: "Gilroy-ExtraBold", fontSize: 24, lineHeight: 30, marginTop: 4 },
  acidTitle: { letterSpacing: 0.5, textTransform: "uppercase" },
  acidText: { letterSpacing: 3 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 3 },
  messages: { flex: 1 },
  messagesContent: { gap: 10, paddingVertical: 10 },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: Platform.OS === "web" ? "62%" : "82%", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  acidMine: { shadowColor: "#C8FF00", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  bubbleText: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  bubbleDate: { fontFamily: "Inter_500Medium", fontSize: 10, marginTop: 6, opacity: 0.72 },
  composer: { borderTopWidth: 1, flexDirection: "row", gap: 10, paddingTop: 12 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "Inter_500Medium", fontSize: 14 },
  sendButton: { width: 48, height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.45 },
  center: { alignItems: "center", justifyContent: "center", gap: 12, borderWidth: 1, borderRadius: 8, padding: 24 },
  muted: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center" },
});
