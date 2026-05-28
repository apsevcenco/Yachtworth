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

import {
  deleteYachtPhoto,
  setCoverPhoto,
  uploadYachtPhoto,
} from "@/lib/photoUpload";

const NAVY = "#0B1E3F";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const TEXT = "#F4EFE3";
const MUTED = "#8F9BB3";
const DANGER = "#D26565";
const BORDER = "#1F3760";

const MAX_PHOTOS = 6;
const THUMB = 96;

type Props = {
  yachtId: string | null; // null when the yacht hasn't been saved yet
  photos: string[];
  coverUrl: string | null;
  onChange: (photos: string[], coverUrl: string | null) => void;
};

export function PhotoSection({ yachtId, photos, coverUrl, onChange }: Props) {
  const [busy, setBusy] = useState<"add" | string | null>(null);
  // string = url being mutated (delete / set-cover); "add" = uploading new

  const remaining = MAX_PHOTOS - photos.length;

  const requireYacht = (): boolean => {
    if (yachtId) return true;
    Alert.alert(
      "Save yacht first",
      "Please save the yacht once so we can attach photos to it.",
    );
    return false;
  };

  const handleUpload = async (uri: string) => {
    if (!yachtId) return;
    setBusy("add");
    try {
      const r = await uploadYachtPhoto(yachtId, uri);
      onChange(r.photo_urls, r.cover_photo_url);
    } catch (e) {
      Alert.alert("Upload failed", (e as Error).message);
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
    await handleUpload(r.assets[0].uri);
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
    // Upload sequentially so the cover/order remain deterministic.
    for (const a of r.assets.slice(0, remaining)) {
      await handleUpload(a.uri);
    }
  };

  const openSourceSheet = () => {
    if (!requireYacht()) return;
    if (remaining <= 0) {
      Alert.alert("Photo limit reached", `Max ${MAX_PHOTOS} photos per yacht.`);
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
    if (!yachtId) return;
    if (url === coverUrl) return;
    Alert.alert("Set as cover?", "This photo will appear as the yacht cover.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Set as cover",
        onPress: async () => {
          setBusy(url);
          try {
            const r = await setCoverPhoto(yachtId, url);
            onChange(r.photo_urls, r.cover_photo_url);
          } catch (e) {
            Alert.alert("Cover update failed", (e as Error).message);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const onRemove = (url: string) => {
    if (!yachtId) return;
    Alert.alert("Remove this photo?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setBusy(url);
          try {
            const r = await deleteYachtPhoto(yachtId, url);
            onChange(r.photo_urls, r.cover_photo_url);
          } catch (e) {
            Alert.alert("Remove failed", (e as Error).message);
          } finally {
            setBusy(null);
          }
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

      {!yachtId && (
        <Text style={styles.warn}>
          Save the yacht once to start adding photos.
        </Text>
      )}
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
  warn: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: GOLD,
    marginTop: 8,
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
