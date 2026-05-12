// Reasonable EUR-per-meter ranges by yacht type/configuration. Used to detect
// AI hallucinations. Outside this range -> clamp to boundary, lower confidence.
// Adapted from PDYE production data.
const PRICE_PER_METER_EUR: Record<string, [number, number]> = {
  // Motor Yacht configurations
  "motor_yacht / flybridge": [12000, 80000],
  "motor_yacht / open": [10000, 70000],
  "motor_yacht / hard top": [11000, 75000],
  "motor_yacht / coupé": [12000, 90000],
  "motor_yacht / sport yacht": [15000, 120000],
  "motor_yacht / sport bridge": [14000, 100000],
  "motor_yacht / pilothouse": [9000, 60000],
  "motor_yacht / sedan": [8000, 55000],
  "motor_yacht / convertible": [10000, 90000],
  "motor_yacht / trawler": [6000, 40000],
  "motor_yacht / explorer": [25000, 400000],
  "motor_yacht / classic": [5000, 100000],

  // Sailing Yacht configurations
  "sailing_yacht / sloop": [6000, 60000],
  "sailing_yacht / ketch": [5000, 70000],
  "sailing_yacht / cutter": [6000, 50000],
  "sailing_yacht / schooner": [5000, 80000],
  "sailing_yacht / cruiser-racer": [8000, 100000],
  "sailing_yacht / performance cruiser": [10000, 120000],
  "sailing_yacht / bluewater cruiser": [8000, 90000],
  "sailing_yacht / classic": [4000, 100000],

  // Catamaran configurations
  "catamaran / sail catamaran (cruising)": [10000, 80000],
  "catamaran / sail catamaran (performance)": [12000, 120000],
  "catamaran / power catamaran": [15000, 180000],

  // Superyacht configurations (24m+)
  "superyacht / tri-deck motor": [60000, 500000],
  "superyacht / quad-deck motor": [80000, 800000],
  "superyacht / explorer": [80000, 800000],
  "superyacht / sport superyacht": [70000, 600000],
  "superyacht / classic motor superyacht": [40000, 400000],
  "superyacht / sailing superyacht": [50000, 500000],

  // Class-only fallbacks
  motor_yacht: [8000, 250000],
  sailing_yacht: [5000, 120000],
  catamaran: [8000, 180000],
  superyacht: [40000, 800000],
};

const DEFAULT_PRICE_PER_METER: [number, number] = [4000, 300000];

// Premium overrides for boats large enough to follow different per-meter
// economics than the volume market.
const PREMIUM_PRICE_PER_METER_EUR: Record<
  string,
  { minLength: number; range: [number, number] }
> = {
  "motor_yacht / flybridge": { minLength: 20, range: [60000, 250000] },
  "motor_yacht / open": { minLength: 20, range: [55000, 220000] },
  "motor_yacht / hard top": { minLength: 20, range: [60000, 230000] },
  "motor_yacht / coupé": { minLength: 20, range: [70000, 250000] },
  "motor_yacht / sport yacht": { minLength: 20, range: [70000, 280000] },
  "motor_yacht / sport bridge": { minLength: 20, range: [70000, 250000] },
  "motor_yacht / convertible": { minLength: 20, range: [60000, 250000] },
  "motor_yacht / pilothouse": { minLength: 20, range: [50000, 200000] },
  "motor_yacht / sedan": { minLength: 20, range: [45000, 180000] },
  "sailing_yacht / performance cruiser": {
    minLength: 20,
    range: [50000, 250000],
  },
  "sailing_yacht / bluewater cruiser": {
    minLength: 20,
    range: [40000, 200000],
  },
  "catamaran / power catamaran": { minLength: 18, range: [60000, 280000] },
  "catamaran / sail catamaran (performance)": {
    minLength: 18,
    range: [50000, 220000],
  },
  "catamaran / sail catamaran (cruising)": {
    minLength: 18,
    range: [40000, 180000],
  },
};

export interface SanityCheckResult {
  ok: boolean;
  clampedEur: number;
  range: [number, number];
  rangeKey: string;
  isPremiumBand: boolean;
  perMeter: number;
}

export function sanityCheckPrice(
  priceEur: number,
  lengthMeters: number,
  type: string,
  configuration?: string | null,
): SanityCheckResult {
  const t = String(type || "")
    .toLowerCase()
    .trim();
  const c = String(configuration || "")
    .toLowerCase()
    .trim();
  const fullKey = c ? `${t} / ${c}` : t;

  const premium = PREMIUM_PRICE_PER_METER_EUR[fullKey];
  let range: [number, number];
  let rangeKey: string;
  let isPremiumBand = false;

  if (premium && lengthMeters >= premium.minLength) {
    range = premium.range;
    rangeKey = `${fullKey} (≥${premium.minLength}m premium)`;
    isPremiumBand = true;
  } else if (c && PRICE_PER_METER_EUR[fullKey]) {
    range = PRICE_PER_METER_EUR[fullKey];
    rangeKey = fullKey;
  } else if (PRICE_PER_METER_EUR[t]) {
    range = PRICE_PER_METER_EUR[t];
    rangeKey = t;
  } else {
    range = DEFAULT_PRICE_PER_METER;
    rangeKey = "default";
  }

  const perMeter = priceEur / lengthMeters;
  if (perMeter < range[0]) {
    return {
      ok: false,
      clampedEur: range[0] * lengthMeters,
      range,
      rangeKey,
      isPremiumBand,
      perMeter,
    };
  }
  if (perMeter > range[1]) {
    return {
      ok: false,
      clampedEur: range[1] * lengthMeters,
      range,
      rangeKey,
      isPremiumBand,
      perMeter,
    };
  }
  return {
    ok: true,
    clampedEur: priceEur,
    range,
    rangeKey,
    isPremiumBand,
    perMeter,
  };
}

export function parsePriceEur(s: unknown): number | null {
  if (typeof s !== "string") return null;
  let v = s.replace(/[^\d.,]/g, "");
  if (!v) return null;
  if (v.includes(".") && v.includes(",")) {
    if (v.lastIndexOf(",") > v.lastIndexOf(".")) {
      v = v.replace(/\./g, "").replace(",", ".");
    } else {
      v = v.replace(/,/g, "");
    }
  } else if (v.includes(",")) {
    const parts = v.split(",");
    if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
      v = v.replace(/,/g, "");
    } else {
      v = v.replace(",", ".");
    }
  } else if (v.includes(".")) {
    const parts = v.split(".");
    if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
      v = v.replace(/\./g, "");
    }
  }
  const n = parseFloat(v);
  return isFinite(n) && n > 0 ? n : null;
}
