import { Feather } from "@expo/vector-icons";
import {
  getGetSurveyReportQueryKey,
  useGetSurveyReport,
  useUpdateSurveyReport,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SignatureScreen, {
  type SignatureViewRef,
} from "react-native-signature-canvas";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const NAVY_DEEP = "#081633";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.08)";

// White canvas, navy ink. Hide the built-in controls — we render our own.
const SIG_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: 1px solid #d6cdb8; border-radius: 12px; }
  .m-signature-pad--footer { display: none; margin: 0; }
  body, html { background-color: #f7f3ec; height: 100%; margin: 0; padding: 0; }
`;

export default function SignaturePadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reportId = String(id ?? "");

  const detailQ = useGetSurveyReport(reportId, {
    query: {
      queryKey: getGetSurveyReportQueryKey(reportId),
      enabled: !!reportId,
    },
  });
  const updateM = useUpdateSurveyReport();

  const sigRef = useRef<SignatureViewRef>(null);
  const [saving, setSaving] = useState(false);

  const existing = detailQ.data?.report?.surveyor_signature_url ?? null;
  const surveyorName = detailQ.data?.report?.surveyor_name ?? "";

  const onClear = () => sigRef.current?.clearSignature();

  // Triggered when SignatureScreen finishes flushing the canvas to base64.
  const onOK = async (dataUri: string) => {
    setSaving(true);
    try {
      await updateM.mutateAsync({
        id: reportId,
        data: { surveyor_signature_url: dataUri },
      });
      await qc.invalidateQueries({
        queryKey: getGetSurveyReportQueryKey(reportId),
      });
      router.back();
    } catch {
      Alert.alert("Save failed", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const onEmpty = () => {
    Alert.alert("Empty signature", "Please draw your signature before saving.");
    setSaving(false);
  };

  const onSave = () => {
    setSaving(true);
    // `readSignature` triggers either onOK (with data URI) or onEmpty.
    sigRef.current?.readSignature();
  };

  const onRemoveExisting = async () => {
    Alert.alert("Remove signature?", "This will clear your saved signature.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await updateM.mutateAsync({
              id: reportId,
              data: { surveyor_signature_url: null },
            });
            await qc.invalidateQueries({
              queryKey: getGetSurveyReportQueryKey(reportId),
            });
          } catch {
            Alert.alert("Update failed", "Please try again.");
          }
        },
      },
    ]);
  };

  // react-native-signature-canvas relies on WebView, which is not bundled in
  // the Expo Go web target. On web, render a graceful read-only fallback.
  const webFallback = Platform.OS === "web";

  if (detailQ.isLoading || !detailQ.data) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top + 80 }]}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 22 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={20} color={IVORY} />
        </Pressable>
        <Text style={styles.kicker}>SECTION 25 · DECLARATION</Text>
        <Text style={styles.title}>Surveyor signature</Text>
        <Text style={styles.subtitle}>
          {surveyorName
            ? `Signed by ${surveyorName}.`
            : "Set your name in the Surveyor profile to print under the signature."}
        </Text>
      </View>

      <View style={styles.canvasWrap}>
        {webFallback ? (
          <View style={[styles.padBox, styles.center]}>
            <Feather name="edit-3" size={28} color={MUTED} />
            <Text style={styles.webText}>
              Signature capture is available on iOS and Android.
            </Text>
            <Text style={styles.webSubtext}>
              Open the app on your phone to draw your signature.
            </Text>
          </View>
        ) : (
          <View style={styles.padBox}>
            <SignatureScreen
              ref={sigRef}
              onOK={onOK}
              onEmpty={onEmpty}
              webStyle={SIG_STYLE}
              backgroundColor="#f7f3ec"
              penColor="#0B1E3F"
              autoClear={false}
              imageType="image/png"
              descriptionText=""
            />
          </View>
        )}
      </View>

      {existing && (
        <Pressable onPress={onRemoveExisting} style={styles.removeBtn}>
          <Feather name="trash-2" size={14} color="#E27D7D" />
          <Text style={styles.removeText}>Remove saved signature</Text>
        </Pressable>
      )}

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={onClear}
          disabled={webFallback || saving}
          style={({ pressed }) => [
            styles.clearBtn,
            { opacity: pressed || webFallback || saving ? 0.6 : 1 },
          ]}
        >
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={webFallback || saving}
          style={({ pressed }) => [
            styles.saveBtn,
            { opacity: pressed || webFallback || saving ? 0.85 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={NAVY} />
          ) : (
            <Text style={styles.saveText}>Save signature</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  center: { alignItems: "center", justifyContent: "center" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NAVY_ELEV,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  kicker: {
    color: GOLD,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: IVORY,
    fontFamily: "Gilroy-ExtraBold",
    fontSize: 26,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 6,
    marginBottom: 18,
  },
  canvasWrap: { flex: 1, paddingHorizontal: 22, paddingBottom: 12 },
  padBox: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#f7f3ec",
  },
  webText: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  webSubtext: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginHorizontal: 22,
    marginBottom: 4,
  },
  removeText: {
    color: "#E27D7D",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  bar: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: NAVY_DEEP,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: NAVY_ELEV,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  clearText: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: GOLD,
  },
  saveText: {
    color: NAVY,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
