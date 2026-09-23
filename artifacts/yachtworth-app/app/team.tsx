import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@workspace/api-client-react";
import { useTheme } from "../hooks/useColors";
import {
  acceptTeamInvitation,
  createTeamInvitation,
  createTeamWorkspace,
  getTeamWorkspace,
  revokeTeamInvitation,
  type TeamSnapshot,
} from "../lib/team";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export default function TeamScreen() {
  const router = useRouter();
  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, isAcid } = useTheme();
  const [snapshot, setSnapshot] = useState<TeamSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("My Yacht Team");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [lastInviteCode, setLastInviteCode] = useState<string | null>(null);

  async function getTeamAuth() {
    if (!authLoaded) throw new Error("Sign-in is still loading. Try again in a moment.");
    if (!isSignedIn) throw new Error("Sign in to create or manage a Team workspace.");
    const token = await getToken();
    if (!token) throw new Error("Could not get your sign-in token. Please sign out and sign back in.");
    return { token };
  }

  async function load({ showAlert = false }: { showAlert?: boolean } = {}) {
    if (!authLoaded) return;
    if (!isSignedIn) {
      setSnapshot(null);
      setErrorText("Sign in to create or manage a Team workspace.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorText(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Could not get your sign-in token. Please sign out and sign back in.");
      setSnapshot(await getTeamWorkspace({ token }));
    } catch (err) {
      const message = errorMessage(err);
      setErrorText(message);
      if (showAlert) Alert.alert("Team", message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoaded) return;
    void load({ showAlert: false });
    // Run only when Clerk auth state changes. `getToken` can be unstable across
    // renders in Expo/Clerk, so depending on `load` or `getToken` here can loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded, isSignedIn]);

  const seatsUsed = useMemo(() => {
    if (!snapshot?.workspace) return 0;
    return snapshot.members.length + snapshot.invitations.length;
  }, [snapshot]);

  async function run(action: () => Promise<void>, pendingMessage = "Working…") {
    if (busy) return;
    setBusy(true);
    setErrorText(null);
    setStatusMessage(pendingMessage);
    try {
      await action();
      setStatusMessage("Done.");
    } catch (err) {
      const message = errorMessage(err);
      setErrorText(message);
      setStatusMessage(null);
      Alert.alert("Team", message);
    } finally {
      setBusy(false);
    }
  }

  const workspace = snapshot?.workspace ?? null;
  const isOwner = Boolean(
    workspace && snapshot?.memberships.some(
      (membership) => membership.organization_id === workspace.id && membership.role === "owner",
    ),
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}> 
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={26} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }, isAcid && styles.acidText]}>Team</Text>
        <Pressable onPress={() => load({ showAlert: true })} hitSlop={12} disabled={loading || busy}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>Loading team workspace…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.kicker, { color: colors.primary }]}>YACHTWORTH TEAM</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Small-company workspace</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}> 
            Team plan keeps one login per person and shares the yacht workspace between up to five people. This avoids shared passwords and keeps ownership traceable.
          </Text>

          {errorText ? (
            <View style={[styles.messageBox, { borderColor: colors.destructive, backgroundColor: "rgba(232,123,123,0.12)" }]}> 
              <Feather name="alert-circle" size={18} color={colors.destructive} />
              <Text selectable style={[styles.messageText, { color: colors.foreground }]}>{errorText}</Text>
            </View>
          ) : statusMessage ? (
            <View style={[styles.messageBox, { borderColor: colors.border, backgroundColor: colors.card }]}> 
              {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="check-circle" size={18} color={colors.primary} />}
              <Text style={[styles.messageText, { color: colors.foreground }]}>{statusMessage}</Text>
            </View>
          ) : null}

          {!workspace ? (
            <View style={[styles.card, { backgroundColor: colors.secondary, borderColor: colors.border }]}> 
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Create Team workspace</Text>
              <Text style={[styles.cardText, { color: colors.mutedForeground }]}> 
                Your existing yacht profiles will stay yours and become visible to invited team members.
              </Text>
              <TextInput
                value={workspaceName}
                onChangeText={setWorkspaceName}
                placeholder="Company or team name"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              />
              <Pressable
                onPress={() => run(async () => setSnapshot(await createTeamWorkspace(workspaceName, await getTeamAuth())), "Creating Team workspace…")}
                disabled={busy}
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed || busy ? 0.75 : 1 }]}
              >
                <Text style={[styles.primaryButtonText, { color: colors.background }]}>Create Team plan</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.secondary, borderColor: colors.border }]}> 
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{workspace.name}</Text>
              <Text style={[styles.cardText, { color: colors.mutedForeground }]}> 
                Seats used: {seatsUsed}/{workspace.seat_limit}. Active members: {snapshot?.members.length ?? 0}. Pending invites: {snapshot?.invitations.length ?? 0}.
              </Text>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: colors.secondary, borderColor: colors.border }]}> 
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Accept invite</Text>
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Paste the invite code from the workspace owner. Each person must use their own Yachtworth login.</Text>
            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
              placeholder="Invite code"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            />
            <Pressable
              onPress={() => run(async () => setSnapshot(await acceptTeamInvitation(inviteCode.trim(), await getTeamAuth())), "Accepting invite…")}
              disabled={busy || !inviteCode.trim()}
              style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.primary, opacity: pressed || busy || !inviteCode.trim() ? 0.65 : 1 }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Accept invite</Text>
            </Pressable>
          </View>

          {workspace ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Members</Text>
              <View style={[styles.cardGroup, { backgroundColor: colors.secondary, borderColor: colors.border }]}> 
                {(snapshot?.members ?? []).map((member, index, list) => (
                  <View key={member.id} style={[styles.row, index === list.length - 1 && styles.rowLast, { borderBottomColor: colors.border }]}> 
                    <Feather name={member.role === "owner" ? "star" : "user"} size={18} color={colors.primary} style={{ width: 26 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: colors.foreground }]}>{member.email || member.display_name || member.clerk_user_id}</Text>
                      <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{member.role}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {isOwner ? (
                <View style={[styles.card, { backgroundColor: colors.secondary, borderColor: colors.border }]}> 
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Invite member</Text>
                  <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Team plan includes up to five seats, including pending invites. Yachtworth creates an invite code now; automatic email delivery will be connected later.</Text>
                  <TextInput
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="email@example.com"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  />
                  <Pressable
                    onPress={() => run(async () => {
                      const invite = await createTeamInvitation(inviteEmail, await getTeamAuth());
                      setInviteEmail("");
                      setLastInviteCode(invite.id);
                      await load({ showAlert: true });
                      Alert.alert("Invite code created", `Email is not sent automatically yet. Send this code to ${invite.email}:\n\n${invite.id}`);
                    }, "Creating invite code…")}
                    disabled={busy || !inviteEmail.trim()}
                    style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed || busy || !inviteEmail.trim() ? 0.65 : 1 }]}
                  >
                    <Text style={[styles.primaryButtonText, { color: colors.background }]}>Create invite code</Text>
                  </Pressable>
                  {lastInviteCode ? (
                    <View style={[styles.inviteCodeBox, { borderColor: colors.border, backgroundColor: colors.card }]}> 
                      <Text style={[styles.inviteCodeLabel, { color: colors.mutedForeground }]}>Last invite code</Text>
                      <Text selectable style={[styles.inviteCode, { color: colors.foreground }]}>{lastInviteCode}</Text>
                      <Pressable
                        onPress={async () => {
                          await Clipboard.setStringAsync(lastInviteCode);
                          setStatusMessage("Invite code copied.");
                        }}
                        style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}
                      >
                        <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Copy code</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {(snapshot?.invitations.length ?? 0) > 0 ? (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>Pending invites</Text>
                  <View style={[styles.cardGroup, { backgroundColor: colors.secondary, borderColor: colors.border }]}> 
                    {(snapshot?.invitations ?? []).map((invite, index, list) => (
                      <View key={invite.id} style={[styles.row, index === list.length - 1 && styles.rowLast, { borderBottomColor: colors.border }]}> 
                        <Feather name="mail" size={18} color={colors.primary} style={{ width: 26 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.rowTitle, { color: colors.foreground }]}>{invite.email}</Text>
                          <Text selectable style={[styles.rowSub, { color: colors.mutedForeground }]}>Code: {invite.id}</Text>
                        </View>
                        {isOwner ? (
                          <Pressable onPress={() => run(async () => { await revokeTeamInvitation(invite.id, await getTeamAuth()); await load({ showAlert: true }); }, "Revoking invite…")} hitSlop={10}>
                            <Feather name="x" size={18} color={colors.destructive} />
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontFamily: "Gilroy-ExtraBold", fontSize: 18 },
  acidText: { letterSpacing: 1, textTransform: "uppercase" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  title: { fontFamily: "Gilroy-ExtraBold", fontSize: 28, marginTop: 10 },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 18 },
  muted: { fontFamily: "Inter_400Regular", fontSize: 13 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 14 },
  messageBox: { borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  messageText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  cardGroup: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginTop: 10 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  cardText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14, fontFamily: "Inter_400Regular", fontSize: 14 },
  inviteCodeBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  inviteCodeLabel: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2 },
  inviteCode: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18, marginTop: 6 },
  primaryButton: { borderRadius: 12, alignItems: "center", paddingVertical: 13, marginTop: 12 },
  primaryButtonText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  secondaryButton: { borderRadius: 12, borderWidth: 1, alignItems: "center", paddingVertical: 13, marginTop: 12 },
  secondaryButtonText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  sectionTitle: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginTop: 24, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLast: { borderBottomWidth: 0 },
  rowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
});







