import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

/**
 * Auto-compress a photo before upload so the user never has to think
 * about file size. Two-pass strategy:
 *   1. Resize to max 1920px on the longest side, 75% JPEG quality.
 *   2. If still > 800 KB, re-encode at 55% quality.
 *
 * Always emits JPEG so the backend never has to handle HEIC.
 */
const MAX_DIMENSION = 1920;
const TARGET_BYTES = 800 * 1024;

async function fileSizeBytes(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof (info as { size?: number }).size === "number") {
      return (info as { size: number }).size;
    }
    return null;
  } catch {
    return null;
  }
}

export type CompressedPhoto = {
  uri: string;
  width: number;
  height: number;
  bytes: number | null;
};

export async function compressPhoto(uri: string): Promise<CompressedPhoto> {
  if (Platform.OS === "web") {
    return { uri, width: 0, height: 0, bytes: null };
  }

  // First pass: read dimensions (no transform).
  const original = await ImageManipulator.manipulateAsync(uri, [], {
    base64: false,
  });

  let width = original.width;
  let height = original.height;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      height = Math.round((height / width) * MAX_DIMENSION);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width / height) * MAX_DIMENSION);
      height = MAX_DIMENSION;
    }
  }

  // Second pass: resize + 75% JPEG.
  const first = await ImageManipulator.manipulateAsync(
    uri,
    width !== original.width || height !== original.height
      ? [{ resize: { width, height } }]
      : [],
    {
      compress: 0.75,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    },
  );

  let outUri = first.uri;
  let bytes = await fileSizeBytes(outUri);
  if (bytes != null && bytes > TARGET_BYTES) {
    const second = await ImageManipulator.manipulateAsync(outUri, [], {
      compress: 0.55,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    });
    outUri = second.uri;
    bytes = await fileSizeBytes(outUri);
  }

  return { uri: outUri, width: first.width, height: first.height, bytes };
}
