export type FlagAssetSize = "xs" | "sm" | "md" | "lg" | "hero";

export type FlagAssetMapping = {
  displayLabel: string;
  code: string;
  assetKey: string;
  assetPath: string;
  altText: string;
  badge?: string;
  subtitle?: string;
  note?: string;
};

export const FLAG_ASSET_SOURCE = "flag-icons@7.5.0";
export const FLAG_ASSET_LICENSE = "MIT";

export const FLAG_ASSETS = {
  bm: require("../assets/flags/4x3/bm.svg"),
  bs: require("../assets/flags/4x3/bs.svg"),
  bz: require("../assets/flags/4x3/bz.svg"),
  ck: require("../assets/flags/4x3/ck.svg"),
  cy: require("../assets/flags/4x3/cy.svg"),
  es: require("../assets/flags/4x3/es.svg"),
  fr: require("../assets/flags/4x3/fr.svg"),
  gb: require("../assets/flags/4x3/gb.svg"),
  gg: require("../assets/flags/4x3/gg.svg"),
  gi: require("../assets/flags/4x3/gi.svg"),
  im: require("../assets/flags/4x3/im.svg"),
  it: require("../assets/flags/4x3/it.svg"),
  je: require("../assets/flags/4x3/je.svg"),
  jm: require("../assets/flags/4x3/jm.svg"),
  ky: require("../assets/flags/4x3/ky.svg"),
  lu: require("../assets/flags/4x3/lu.svg"),
  mh: require("../assets/flags/4x3/mh.svg"),
  mt: require("../assets/flags/4x3/mt.svg"),
  nl: require("../assets/flags/4x3/nl.svg"),
  pa: require("../assets/flags/4x3/pa.svg"),
  pl: require("../assets/flags/4x3/pl.svg"),
  pt: require("../assets/flags/4x3/pt.svg"),
  sm: require("../assets/flags/4x3/sm.svg"),
  vg: require("../assets/flags/4x3/vg.svg"),
} as const;

export type FlagAssetCode = keyof typeof FLAG_ASSETS;

export const FLAG_ASSET_MAP: Record<string, FlagAssetMapping> = {
  "cayman-islands": flag("Cayman Islands", "ky"),
  cayman: flag("Cayman Islands", "ky"),
  malta: flag("Malta", "mt"),
  "marshall-islands": flag("Marshall Islands", "mh"),
  marshall: flag("Marshall Islands", "mh"),
  "isle-of-man": flag("Isle of Man", "im"),
  jersey: flag("Jersey", "je"),
  guernsey: flag("Guernsey", "gg"),
  gibraltar: flag("Gibraltar", "gi"),
  "united-kingdom": flag("United Kingdom", "gb"),
  france: flag("France", "fr"),
  italy: flag("Italy", "it"),
  spain: flag("Spain", "es"),
  netherlands: flag("Netherlands", "nl"),
  portugal: flag("Portugal", "pt"),
  portugal_madeira: flag("Madeira (MAR)", "pt", {
    badge: "MAR",
    subtitle: "Portuguese International Shipping Register",
    note: "Yachts registered in MAR fly the Portuguese flag.",
    altText: "Portuguese flag - Madeira International Shipping Register",
  }),
  "portugal-madeira": flag("Madeira (MAR)", "pt", {
    badge: "MAR",
    subtitle: "Portuguese International Shipping Register",
    note: "Yachts registered in MAR fly the Portuguese flag.",
    altText: "Portuguese flag - Madeira International Shipping Register",
  }),
  madeira: flag("Madeira (MAR)", "pt", {
    badge: "MAR",
    subtitle: "Portuguese International Shipping Register",
    note: "Yachts registered in MAR fly the Portuguese flag.",
    altText: "Portuguese flag - Madeira International Shipping Register",
  }),
  "madeira-mar": flag("Madeira (MAR)", "pt", {
    badge: "MAR",
    subtitle: "Portuguese International Shipping Register",
    note: "Yachts registered in MAR fly the Portuguese flag.",
    altText: "Portuguese flag - Madeira International Shipping Register",
  }),
  cyprus: flag("Cyprus", "cy"),
  panama: flag("Panama", "pa"),
  belize: flag("Belize", "bz"),
  jamaica: flag("Jamaica", "jm"),
  "cook-islands": flag("Cook Islands", "ck"),
  cook: flag("Cook Islands", "ck"),
  "san-marino": flag("San Marino", "sm"),
  luxembourg: flag("Luxembourg", "lu"),
  "british-virgin-islands": flag("British Virgin Islands", "vg"),
  bvi: flag("British Virgin Islands", "vg"),
  bahamas: flag("The Bahamas", "bs"),
  "the-bahamas": flag("The Bahamas", "bs"),
  poland: flag("Poland", "pl"),
  bermuda: flag("Bermuda", "bm"),
};

export function isFlagAssetCode(value: string | null | undefined): value is FlagAssetCode {
  return !!value && Object.prototype.hasOwnProperty.call(FLAG_ASSETS, value);
}

export function resolveFlagAsset(registry: {
  code?: string | null;
  slug?: string | null;
  flag_name?: string | null;
  flag_code?: string | null;
  flag_asset_key?: string | null;
  flag_asset_path?: string | null;
  flag_alt_text?: string | null;
  registry_badge?: string | null;
  flag_note?: string | null;
  advisor?: { slug?: string | null } | null;
}): FlagAssetMapping | null {
  const storedCode = normalizeCode(registry.flag_asset_key ?? registry.flag_code);
  if (isFlagAssetCode(storedCode)) {
    return {
      displayLabel: registry.flag_name ?? storedCode.toUpperCase(),
      code: storedCode,
      assetKey: storedCode,
      assetPath: registry.flag_asset_path ?? `/assets/flags/4x3/${storedCode}.svg`,
      altText: registry.flag_alt_text ?? `Flag of ${registry.flag_name ?? storedCode.toUpperCase()}`,
      badge: registry.registry_badge ?? undefined,
      note: registry.flag_note ?? undefined,
    };
  }

  const pathCode = normalizeCode(registry.flag_asset_path?.match(/\/([a-z]{2})\.svg$/i)?.[1]);
  if (isFlagAssetCode(pathCode)) {
    return flag(registry.flag_name ?? pathCode.toUpperCase(), pathCode, {
      badge: registry.registry_badge ?? undefined,
      note: registry.flag_note ?? undefined,
      altText: registry.flag_alt_text ?? undefined,
    });
  }

  const keys = [
    registry.code,
    registry.slug,
    registry.advisor?.slug,
    registry.flag_name,
  ]
    .map((value) => slugify(value ?? ""))
    .filter(Boolean);

  for (const key of keys) {
    const resolved = FLAG_ASSET_MAP[key];
    if (resolved) return resolved;
  }

  return null;
}

function flag(
  displayLabel: string,
  code: FlagAssetCode,
  extras: Partial<Pick<FlagAssetMapping, "badge" | "subtitle" | "note" | "altText">> = {},
): FlagAssetMapping {
  return {
    displayLabel,
    code,
    assetKey: code,
    assetPath: `/assets/flags/4x3/${code}.svg`,
    altText: extras.altText ?? `Flag of ${displayLabel}`,
    badge: extras.badge,
    subtitle: extras.subtitle,
    note: extras.note,
  };
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeCode(value: string | null | undefined): string | null {
  return value ? value.trim().toLowerCase() : null;
}
