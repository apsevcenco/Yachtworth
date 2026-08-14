import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { getBaseUrl } from "@workspace/api-client-react";
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

import { mdiT9Items, mdiT9Report, mdiT9SeaTrial } from "../../lib/mdiT9SurveyDemo";

const NAVY = "#07000B";
const NAVY_ELEV = "#2C003F";
const GOLD = "#C8FF00";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.68)";
const FAINT = "rgba(247,243,236,0.36)";
const RED = "#E87B7B";

async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) throw new Error("API base URL is not configured.");

  const response = await fetch(`${baseUrl}/api${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(
      `${options.method ?? "GET"} ${path} failed ${response.status}: ${JSON.stringify(body)}`,
    );
  }
  return body as T;
}

export default function ImportMdiT9Screen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [running, setRunning] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const runImport = async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      Alert.alert("Sign in required", "Please sign in first, then run the import again.");
      return;
    }

    setRunning(true);
    setCreatedId(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Could not get Clerk token for current session.");

      const created = await apiRequest<{ id: string }>("/survey-reports", token, {
        method: "POST",
        body: JSON.stringify(mdiT9Report),
      });

      await apiRequest(`/survey-reports/${created.id}/items`, token, {
        method: "PUT",
        body: JSON.stringify({ items: mdiT9Items }),
      });

      await apiRequest(`/survey-reports/${created.id}/sea-trial`, token, {
        method: "PUT",
        body: JSON.stringify(mdiT9SeaTrial),
      });

      await apiRequest(`/survey-reports/${created.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: "complete" }),
      });

      setCreatedId(created.id);
      Alert.alert(
        "Import complete",
        "The MDI T9 demo survey was created in your account.",
        [
          { text: "Stay here", style: "cancel" },
          { text: "Open report", onPress: () => router.replace(`/survey/${created.id}`) },
        ],
      );
    } catch (error) {
      Alert.alert("Import failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: (isWeb ? 67 : insets.top) + 58,
          paddingBottom: insets.bottom + 80,
          paddingHorizontal: 24,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={IVORY} />
        </Pressable>

        <Text style={styles.kicker}>HIDDEN DEMO IMPORT</Text>
        <Text style={styles.title}>MDI T9 Survey</Text>
        <Text style={styles.subtitle}>
          Creates a complete test survey through the same authenticated app API used by the
          Survey screens. This is temporary and should be removed after review.
        </Text>

        <View style={styles.card}>
          <Row label="Vessel" value={mdiT9Report.vessel_name} />
          <Row label="Builder / model" value={`${mdiT9Report.manufacturer} ${mdiT9Report.model}`} />
          <Row label="Survey date" value={mdiT9Report.survey_date ?? "-"} />
          <Row label="Items" value={String(mdiT9Items.length)} />
          <Row label="Sea trial" value="Included" />
          <Row label="Backend" value={getBaseUrl() ?? "Not configured"} />
        </View>

        <Pressable
          onPress={runImport}
          disabled={running || !isLoaded}
          style={({ pressed }) => [
            styles.importBtn,
            { opacity: pressed || running || !isLoaded ? 0.72 : 1 },
          ]}
        >
          {running ? (
            <ActivityIndicator color={NAVY} />
          ) : (
            <>
              <Feather name="upload-cloud" size={20} color={NAVY} />
              <Text style={styles.importText}>Create MDI T9 demo report</Text>
            </>
          )}
        </Pressable>

        {createdId ? (
          <Pressable
            onPress={() => router.replace(`/survey/${createdId}`)}
            style={styles.openBtn}
          >
            <Text style={styles.openText}>Open created report</Text>
            <Feather name="arrow-right" size={18} color={GOLD} />
          </Pressable>
        ) : null}

        <Text style={styles.warning}>
          This will create a new report in the current signed-in account. Run it only once unless
          you intentionally want duplicates.
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -10,
    marginBottom: 18,
  },
  kicker: {
    color: GOLD,
    fontSize: 13,
    letterSpacing: 3,
    fontWeight: "800",
    marginBottom: 14,
  },
  title: {
    color: IVORY,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 12,
  },
  subtitle: {
    color: MUTED,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 24,
  },
  card: {
    backgroundColor: NAVY_ELEV,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(201,169,97,0.28)",
    padding: 18,
    marginBottom: 22,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(247,243,236,0.1)",
  },
  rowLabel: {
    color: MUTED,
    fontSize: 14,
    flex: 0.42,
  },
  rowValue: {
    color: IVORY,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    flex: 0.58,
  },
  importBtn: {
    minHeight: 62,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  importText: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "900",
  },
  openBtn: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  openText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: "800",
  },
  warning: {
    color: FAINT,
    fontSize: 13,
    lineHeight: 19,
  },
});
