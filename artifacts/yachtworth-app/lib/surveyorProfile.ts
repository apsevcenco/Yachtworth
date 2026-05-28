import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "yachtworth.surveyor_profile";

export type SurveyorProfile = {
  name: string;
  qualification: string;
  company: string;
  phone: string;
  email: string;
};

export const EMPTY_PROFILE: SurveyorProfile = {
  name: "",
  qualification: "",
  company: "",
  phone: "",
  email: "",
};

export async function loadSurveyorProfile(): Promise<SurveyorProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as Partial<SurveyorProfile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      qualification:
        typeof parsed.qualification === "string" ? parsed.qualification : "",
      company: typeof parsed.company === "string" ? parsed.company : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

export async function saveSurveyorProfile(p: SurveyorProfile): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}
