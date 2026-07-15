import { Platform } from "react-native";

export async function appendPhotoToFormData(
  form: FormData,
  fieldName: string,
  uri: string,
  fileName: string,
) {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error(`Could not read selected photo (HTTP ${res.status}).`);
    }
    const blob = await res.blob();
    form.append(fieldName, blob, fileName);
    return;
  }

  form.append(
    fieldName,
    {
      uri,
      name: fileName,
      type: "image/jpeg",
    } as unknown as Blob,
  );
}
