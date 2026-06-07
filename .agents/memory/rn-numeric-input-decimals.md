---
name: RN controlled numeric input decimals
description: Why a controlled number field can't accept decimals, and the fix
---

# Controlled numeric TextInput can't type decimals

**Symptom:** a React Native `TextInput` whose `value` is derived from a parsed
number (`value={String(numberState)}`) makes it impossible to type fractional
numbers — typing `"3."` parses to `3`, re-renders as `"3"`, and the decimal
point/separator vanishes before the user can finish. Same for trailing zeros
and European comma decimals.

**Fix:** give the field its own local `text` state (the raw in-progress string).
Render `value={text}`; on change, `setText(raw)` AND commit a parsed number to
the parent via `onChange`. Add a `useEffect([value])` that re-syncs the visible
text from the parent ONLY when the parent value diverges from what the current
text parses to (server load / reset) — so a mid-edit `"3."` is left untouched
and there's no render loop. Keep one comma/dot in the sanitizer
(`replace(/[^0-9.,\-]/g, "")`) and parse with `Number(cleaned.replace(",", "."))`.

**Why:** storing only the parsed number loses the user's in-progress keystrokes;
the strip happens on every render, not just on blur.

**How to apply:** any RN numeric field that must accept decimals (lengths, power,
prices). Integer-only fields can stay digit-stripped + `number-pad`. Each
rendered field instance gets isolated state automatically, so this works inside
repeated rows (e.g. add/remove tender entries).
