import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetProposalQueryKey,
  getListProposalsQueryKey,
  useDeleteProposal,
  useGetProposal,
  useListProposals,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const FAINT = "rgba(247,243,236,0.4)";
const DIVIDER = "rgba(247,243,236,0.08)";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function typeLabel(t: string): string {
  if (t === "sale") return "Sale";
  if (t === "charter") return "Charter";
  return "Sale + Charter";
}

export default function MyProposalsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const queryClient = useQueryClient();
  const listQ = useListProposals({
    query: {
      queryKey: getListProposalsQueryKey(),
      staleTime: 15_000,
    },
  });
  const deleteM = useDeleteProposal();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const detailQ = useGetProposal(openId ?? "", {
    query: {
      queryKey: openId
        ? getGetProposalQueryKey(openId)
        : ["proposal-detail-disabled"],
      enabled: !!openId,
    },
  });

  const items = listQ.data?.items ?? [];

  const onDelete = (id: string) => {
    Alert.alert("Delete proposal?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setPendingId(id);
          try {
            await deleteM.mutateAsync({ id });
            await queryClient.invalidateQueries({
              queryKey: getListProposalsQueryKey(),
            });
          } catch {
            Alert.alert("Delete failed", "Please try again.");
          } finally {
            setPendingId(null);
          }
        },
      },
    ]);
  };

  React.useEffect(() => {
    if (!openId) return;
    if (detailQ.isLoading) return;
    const d = detailQ.data;
    if (!d) {
      setOpenId(null);
      return;
    }
    const idCaptured = openId;
    setOpenId(null);
    router.push({
      pathname: "/yacht-proposal/preview",
      params: {
        yacht_id: d.yacht_id ?? "",
        yacht_payload: d.yacht_snapshot ? JSON.stringify(d.yacht_snapshot) : "",
        settings_payload: d.settings_snapshot
          ? JSON.stringify(d.settings_snapshot)
          : "",
        equipment_payload: d.equipment_snapshot
          ? JSON.stringify(d.equipment_snapshot)
          : "",
        saved_id: idCaptured,
      },
    });
  }, [openId, detailQ.data, detailQ.isLoading, router]);

  return (
    <View style={[styles.root, { paddingTop: (isWeb ? 67 : insets.top) + 56 }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 60,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={20} color={IVORY} />
        </Pressable>

        <Text style={styles.kicker}>SAVED</Text>
        <Text style={styles.title}>My Proposals</Text>

        {listQ.isLoading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Feather name="file-text" size={28} color={GOLD} />
            <Text style={styles.emptyTitle}>No proposals yet</Text>
            <Text style={styles.emptyText}>
              Generate a yacht proposal from the Tools tab to save it here.
            </Text>
            <Pressable
              onPress={() => router.push("/yacht-proposal")}
              style={({ pressed }) => [
                styles.emptyBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.emptyBtnText}>Open Proposal Builder</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((it, i) => (
              <View
                key={it.id}
                style={[
                  styles.itemWrap,
                  i === items.length - 1 && styles.itemWrapLast,
                ]}
              >
                <Pressable
                  onPress={() => setOpenId(it.id)}
                  disabled={!!openId}
                  style={({ pressed }) => [
                    styles.item,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.itemHead}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {it.yacht_name}
                      </Text>
                      <Text style={styles.itemDate}>
                        {formatDate(it.created_at)}
                      </Text>
                    </View>
                    <View style={styles.itemChips}>
                      <Chip text={typeLabel(it.proposal_type)} />
                      <Chip text={it.language} />
                    </View>
                  </View>
                  {openId === it.id ? (
                    <ActivityIndicator color={GOLD} size="small" />
                  ) : (
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={FAINT}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => onDelete(it.id)}
                  disabled={pendingId === it.id}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${it.yacht_name}`}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    { opacity: pressed || pendingId === it.id ? 0.6 : 1 },
                  ]}
                >
                  <Feather name="trash-2" size={15} color={MUTED} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NAVY_ELEV,
    marginBottom: 14,
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 30,
    letterSpacing: -0.4,
    marginBottom: 18,
  },
  emptyBlock: {
    alignItems: "center",
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    padding: 30,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginTop: 14,
    gap: 10,
  },
  emptyTitle: { color: IVORY, fontFamily: "Gilroy-ExtraBold", fontSize: 17 },
  emptyText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyBtn: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: GOLD,
    backgroundColor: "rgba(201,169,97,0.08)",
  },
  emptyBtnText: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  list: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DIVIDER,
    overflow: "hidden",
  },
  itemWrap: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  itemWrapLast: { borderBottomWidth: 0 },
  item: { flex: 1, flexDirection: "row", alignItems: "center", padding: 14, gap: 8 },
  itemHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { flex: 1, color: IVORY, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  itemDate: { color: FAINT, fontFamily: "Inter_400Regular", fontSize: 11, marginLeft: 8 },
  itemChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: "rgba(201,169,97,0.10)",
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.25)",
  },
  chipText: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "capitalize",
  },
  deleteBtn: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: DIVIDER,
  },
});
