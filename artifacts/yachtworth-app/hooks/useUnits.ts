import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { STORAGE_KEY, type UnitsSystem } from "../lib/units";

export function useUnits() {
  const [units, setUnitsState] = useState<UnitsSystem>("metric");
  const [loaded, setLoaded] = useState(false);
  // Once the user (or any caller) writes via setUnits, we must ignore a
  // late-arriving initial AsyncStorage read — otherwise a slow disk read
  // could clobber the user's fresh choice with the previous value.
  const userOverrode = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (cancelled) return;
        if (!userOverrode.current && (v === "metric" || v === "imperial")) {
          setUnitsState(v);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setUnits = async (next: UnitsSystem) => {
    userOverrode.current = true;
    setUnitsState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {
      // best-effort persistence — UI choice already updated
    }
  };

  return { units, setUnits, loaded };
}
