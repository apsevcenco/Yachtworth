import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { uploadProposalPhoto } from "@/lib/proposalPhotoUpload";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const MUTED = "#8F9BB3";
const DANGER = "#D26565";
const BORDER = "#1F3760";

const MAX_PHOTOS = 10;
const THUMB = 96;

type Props = {
  photos: string[];
  coverUrl: string | null;
  onChange: (photos: string[], coverUrl: string | null) => void;
};

/**
 * Proposal photo uploader. Mirrors the My Yachts PhotoSection look & feel
 * (camera + library, instant capture, cover badge, delete) but works on pure
 * local state: uploads return a public URL, and delete / set-cover only mutate
 * the local list because a manual proposal has no DB row to attach photos to.
 */
export function ProposalPhotoSection({ photos, coverUrl, onChange }: Props) {
  const [busy, setBusy] = useState<"add" | string | null>(null);

  const remaining = MAX_PHOTOS - photos.length;

  // Upload one or more local URIs sequentially, accumulating against a local
  // base array so multi-select never reads a stale `photos` prop mid-loop
  // (a single onChange at the end commits every successful upload + cover).
  const uploadUris = async (uris: string[]) => {
    if (!uris.length) return;
    setBusy("add");
    const added: string[] = [];
    let failed = 0;
    try {
      for (const uri of uris) {
        try {
          added.push(await uploadProposalPhoto(uri));
        } catch {
          failed += 1;
        }
      }
      if (added.length) {
        const nextPhotos = [...photos, ...added];
        const nextCover = coverUrl ?? added[0];
        onChange(nextPhotos, nextCover);
      }
      if (failed > 0) {
        Alert.alert(
          "Some uploads failed",
          `${failed} photo${failed > 1 ? "s" : ""} could not be uploaded.`,
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera access needed", "Enable camera in Settings.");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });
    if (r.canceled || !r.assets?.[0]) return;
    await uploadUris([r.assets[0].uri]);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo library access needed", "Enable in Settings.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: remaining > 1,
      selectionLimit: Math.min(remaining, 5),
      quality: 1,
    });
    if (r.canceled || !r.assets?.length) return;
    await uploadUris(r.assets.slice(0, remaining).map((a) => a.uri));
  };

  const openSourceSheet = () => {
    if (remaining <= 0) {
      Alert.alert("Photo limit reached", `Max ${MAX_PHOTOS} photos.`);
      return;
    }
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) void pickFromCamera();
          if (idx === 2) void pickFromLibrary();
        },
      );
    } else {
      Alert.alert("Add Photo", undefined, [
        { text: "Take Photo", onPress: () => void pickFromCamera() },
        {
          text: "Choose from Library",
          onPress: () => void pickFromLibrary(),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const onLongPress = (url: string) => {
    if (url === coverUrl) return;
    Alert.alert("Set as cover?", "This photo will appear as the cover.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Set as cover",
        onPress: () => onChange(photos, url),
      },
    ]);
  };

  const onRemove = (url: string) => {
    Alert.alert("Remove this photo?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          const nextPhotos = photos.filter((p) => p !== url);
          const nextCover =
            coverUrl === url ? (nextPhotos[0] ?? null) : coverUrl;
          onChange(nextPhotos, nextCover);
        },
      },
    ]);
  };

  return (
    <View>
      <Text style={styles.hint}>
        Up to {MAX_PHOTOS} photos. First photo is the cover — long-press any
        photo to make it the cover. Photos are auto-compressed.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {photos.map((url) => {
          const isCover = url === coverUrl;
          const isBusy = busy === url;
          return (
            <Pressable
              key={url}
              onLongPress={() => onLongPress(url)}
              delayLongPress={350}
              style={styles.thumbWrap}
            >
              <Image
                source={{ uri: url }}
                style={styles.thumb}
                contentFit="cover"
                transition={150}
              />
              {isCover && (
                <View style={styles.coverBadge}>
                  <Feather name="star" size={11} color={NAVY} />
                  <Text style={styles.coverBadgeText}>COVER</Text>
                </View>
              )}
              <Pressable
                onPress={() => onRemove(url)}
                hitSlop={8}
                style={styles.removeBtn}
                accessibilityLabel="Remove photo"
              >
                <Feather name="x" size={14} color="#fff" />
              </Pressable>
              {isBusy && (
                <View style={styles.busyOverlay}>
                  <ActivityIndicator color={GOLD} />
                </View>
              )}
            </Pressable>
          );
        })}

        {remaining > 0 && (
          <Pressable
            onPress={openSourceSheet}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityLabel="Add photo"
          >
            {busy === "add" ? (
              <ActivityIndicator color={GOLD} />
            ) : (
              <>
                <Feather name="plus" size={26} color={GOLD} />
                <Text style={styles.addBtnText}>Add</Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
    marginBottom: 10,
    lineHeight: 17,
  },
  row: { gap: 10, paddingVertical: 4, paddingRight: 12 },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: NAVY_ELEV,
    borderWidth: 1,
    borderColor: BORDER,
  },
  thumb: { width: "100%", height: "100%" },
  coverBadge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: GOLD,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coverBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: NAVY,
    letterSpacing: 0.5,
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(11,30,63,0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: DANGER,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11,30,63,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: GOLD,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  addBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: GOLD,
  },
});
