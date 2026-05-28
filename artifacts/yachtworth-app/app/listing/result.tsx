import { Feather } from "@expo/vector-icons";
import {
  getListListingsQueryKey,
  useGenerateListing,
  useSaveListing,
} from "@workspace/api-client-react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { exportListingPdf } from "../../lib/listingPdf";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const FAINT = "rgba(247,243,236,0.4)";
const DIVIDER = "rgba(247,243,236,0.08)";

type Params = {
  text?: string;
  yacht_name?: string;
  listing_type?: string;
  style?: string;
  language?: string;
  word_length?: string;
  ai_used?: string;
  yacht_id?: string;
  yacht_payload?: string;
  settings_payload?: string;
  warning?: string;
  listing_id?: string;
};

export default function ListingResultScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const queryClient = useQueryClient();
  const generateM = useGenerateListing();
  const saveM = useSaveListing();

  const yachtPayload = useMemo(() => {
    try {
      return params.yacht_payload ? JSON.parse(params.yacht_payload) : null;
    } catch {
      return null;
    }
  }, [params.yacht_payload]);
  const settingsPayload = useMemo(() => {
    try {
      return params.settings_payload
        ? JSON.parse(params.settings_payload)
        : null;
    } catch {
      return null;
    }
  }, [params.settings_payload]);

  const [text, setText] = useState<string>(params.text ?? "");
  const [editing, setEditing] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(
    params.listing_id ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const yachtName = params.yacht_name ?? yachtPayload?.name ?? "Yacht";
  const aiUsed = params.ai_used === "1";

  const meta: string[] = [
    params.listing_type === "sale"
      ? "For Sale"
      : params.listing_type === "charter"
        ? "For Charter"
        : params.listing_type === "both"
          ? "Sale + Charter"
          : "",
    params.style ?? "",
    params.language ?? "",
    params.word_length === "short"
      ? "~150 words"
      : params.word_length === "medium"
        ? "~300 words"
        : params.word_length === "full"
          ? "~500 words"
          : "",
  ].filter(Boolean);

  const onCopy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTimeout(() => setCopied(false), 1800);
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `${yachtName} — Yachtworth listing\n\n${text}`,
        title: `${yachtName} — listing`,
      });
    } catch {
      // user cancelled
    }
  };

  const onRegenerate = async () => {
    if (!yachtPayload || !settingsPayload) {
      Alert.alert("Cannot regenerate", "Yacht data is missing.");
      return;
    }
    try {
      const seed = Date.now() % 100000;
      const result = await generateM.mutateAsync({
        data: {
          yacht_id: params.yacht_id || null,
          yacht: yachtPayload,
          settings: settingsPayload,
          seed,
        },
      });
      setText(result.generated_text);
      setSavedId(null);
      if (result.warning) {
        Alert.alert("Note", result.warning);
      }
    } catch {
      Alert.alert(
        "Regenerate failed",
        "Could not produce a new variation. Please try again.",
      );
    }
  };

  const onSave = async () => {
    if (!text.trim() || !params.listing_type || !params.style) return;
    try {
      const saved = await saveM.mutateAsync({
        data: {
          yacht_id: params.yacht_id || null,
          yacht_name: yachtName,
          listing_type: params.listing_type as "sale" | "charter" | "both",
          style: params.style as
            | "professional"
            | "luxury"
            | "technical"
            | "concise",
          language: (params.language ?? "english") as
            | "english"
            | "french"
            | "italian"
            | "spanish"
            | "german"
            | "russian",
          word_length: (params.word_length ?? "medium") as
            | "short"
            | "medium"
            | "full",
          generated_text: text,
          yacht_snapshot: yachtPayload,
          settings_snapshot: settingsPayload,
          ai_used: aiUsed,
        },
      });
      setSavedId(saved.id);
      await queryClient.invalidateQueries({
        queryKey: getListListingsQueryKey(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    } catch {
      Alert.alert("Save failed", "Could not save listing. Please try again.");
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      await exportListingPdf({
        yachtName,
        builder: yachtPayload?.builder ?? null,
        model: yachtPayload?.model ?? null,
        yearBuilt: yachtPayload?.year_built ?? null,
        lengthMeters: yachtPayload?.length_meters ?? null,
        yachtType: yachtPayload?.type ?? null,
        photoUrl: yachtPayload?.photo_url ?? null,
        generatedText: text,
        askingPriceEur: yachtPayload?.asking_price_eur ?? null,
        charterRateEurWeek: yachtPayload?.charter_rate_eur_week ?? null,
        brokerageName: settingsPayload?.brokerage_name ?? null,
        contactEmail: settingsPayload?.contact_email ?? null,
      });
    } catch {
      Alert.alert("Export failed", "Could not generate PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: NAVY }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={{
          paddingTop: (isWeb ? 67 : insets.top) + 56,
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 110,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={20} color={IVORY} />
          </Pressable>
          <Pressable
            onPress={() => setEditing((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={editing ? "Done editing" : "Edit"}
            style={styles.backBtn}
          >
            <Feather
              name={editing ? "check" : "edit-2"}
              size={18}
              color={editing ? GOLD : IVORY}
            />
          </Pressable>
        </View>

        <Text style={styles.kicker}>LISTING</Text>
        <Text style={styles.title}>{yachtName}</Text>
        {meta.length > 0 && (
          <Text style={styles.meta}>{meta.join(" · ")}</Text>
        )}
        {!aiUsed && (
          <View style={styles.warnChip}>
            <Feather name="alert-triangle" size={12} color={GOLD} />
            <Text style={styles.warnChipText}>
              Used deterministic template (AI unavailable)
            </Text>
          </View>
        )}

        {editing ? (
          <TextInput
            style={styles.bodyEdit}
            value={text}
            onChangeText={(v) => {
              setText(v);
              if (savedId) setSavedId(null);
            }}
            multiline
            textAlignVertical="top"
            placeholderTextColor={FAINT}
          />
        ) : (
          <View style={styles.bodyView}>
            <Pressable onPress={() => setEditing(true)} accessibilityRole="button">
              <RenderMarkdown text={text} />
            </Pressable>
          </View>
        )}

        {savedId ? (
          <View style={styles.savedChip}>
            <Feather name="check-circle" size={14} color={GOLD} />
            <Text style={styles.savedChipText}>Saved to My Listings</Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        <View style={styles.actionRow}>
          <ActionBtn
            icon={copied ? "check" : "copy"}
            label={copied ? "Copied" : "Copy"}
            onPress={onCopy}
          />
          <ActionBtn
            icon="refresh-cw"
            label="Regenerate"
            onPress={onRegenerate}
            busy={generateM.isPending}
          />
          <ActionBtn
            icon="save"
            label={savedId ? "Saved" : "Save"}
            onPress={onSave}
            busy={saveM.isPending}
            disabled={!!savedId}
          />
        </View>
        <View style={styles.actionRow}>
          <ActionBtn
            icon="download"
            label="Export PDF"
            onPress={onExport}
            busy={exporting}
            primary
          />
          <ActionBtn icon="share-2" label="Share" onPress={onShare} primary />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
  busy,
  disabled,
  primary,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionBtn,
        primary && styles.actionBtnPrimary,
        (disabled || busy) && styles.actionBtnDim,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? NAVY : GOLD} size="small" />
      ) : (
        <>
          <Feather name={icon} size={15} color={primary ? NAVY : GOLD} />
          <Text
            style={[
              styles.actionBtnText,
              primary && styles.actionBtnTextPrimary,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// Renders a small subset of markdown (## headings, **bold**, - bullets, paragraphs).
function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let bulletBuf: string[] = [];
  let paraBuf: string[] = [];

  const flushBullets = (key: string) => {
    if (bulletBuf.length) {
      blocks.push(
        <View key={`b-${key}`} style={{ marginVertical: 6 }}>
          {bulletBuf.map((b, i) => (
            <View key={i} style={mdStyles.bulletRow}>
              <Text style={mdStyles.bulletDot}>•</Text>
              <Text style={mdStyles.body}>
                <FormatInline text={b} />
              </Text>
            </View>
          ))}
        </View>,
      );
      bulletBuf = [];
    }
  };
  const flushPara = (key: string) => {
    if (paraBuf.length) {
      blocks.push(
        <Text key={`p-${key}`} style={mdStyles.body}>
          <FormatInline text={paraBuf.join(" ")} />
        </Text>,
      );
      paraBuf = [];
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara(String(idx));
      flushBullets(String(idx));
      return;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      flushPara(String(idx));
      flushBullets(String(idx));
      blocks.push(
        <Text key={`h-${idx}`} style={mdStyles.h2}>
          {h2[1]}
        </Text>,
      );
      return;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      flushPara(String(idx));
      flushBullets(String(idx));
      blocks.push(
        <Text key={`h3-${idx}`} style={mdStyles.h3}>
          {h3[1]}
        </Text>,
      );
      return;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushPara(String(idx));
      bulletBuf.push(bullet[1]!);
      return;
    }
    flushBullets(String(idx));
    paraBuf.push(line);
  });
  flushPara("end");
  flushBullets("end");
  return <View>{blocks}</View>;
}

function FormatInline({ text }: { text: string }) {
  // Split on **...**; only bold supported.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\*\*([^*]+)\*\*$/);
        if (m) {
          return (
            <Text key={i} style={mdStyles.bold}>
              {m[1]}
            </Text>
          );
        }
        return <Text key={i}>{p}</Text>;
      })}
    </>
  );
}

const mdStyles = StyleSheet.create({
  h2: {
    color: GOLD,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 6,
  },
  h3: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 15,
    marginTop: 10,
    marginBottom: 4,
  },
  body: {
    color: IVORY,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  bold: { fontFamily: "Inter_700Bold", color: IVORY },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  bulletDot: { color: GOLD, fontSize: 14, marginTop: 1 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NAVY_ELEV,
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
    fontSize: 28,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  meta: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 12,
  },
  warnChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "rgba(201,169,97,0.10)",
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.3)",
    marginBottom: 14,
  },
  warnChipText: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  bodyView: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: DIVIDER,
    marginTop: 4,
  },
  bodyEdit: {
    backgroundColor: NAVY_DEEP,
    borderRadius: 14,
    padding: 18,
    minHeight: 360,
    color: IVORY,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: GOLD,
    marginTop: 4,
  },
  savedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: "rgba(201,169,97,0.12)",
    borderWidth: 1,
    borderColor: GOLD,
  },
  savedChipText: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: NAVY_DEEP,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    gap: 8,
  },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: NAVY_ELEV,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  actionBtnPrimary: { backgroundColor: GOLD, borderColor: GOLD },
  actionBtnDim: { opacity: 0.6 },
  actionBtnText: {
    color: GOLD,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  actionBtnTextPrimary: { color: NAVY, fontFamily: "Inter_700Bold" },
});
