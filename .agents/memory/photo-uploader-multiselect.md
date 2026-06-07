---
name: Photo uploader multi-select stale-prop pitfall
description: Why sequential multi-photo uploads in a React Native uploader must accumulate locally, not append from the prop each iteration.
---

# Multi-select photo upload must accumulate locally

When a photo-uploader component uploads several picked assets in a `for` loop and
each iteration calls `onChange([...photos, url], ...)` reading the `photos` prop,
only the **last** upload survives: the prop is captured stale at render time and
does not update mid-loop. The parent's `setState` is async, so every iteration
appends to the same stale base array.

**The rule:** upload the whole batch into a local accumulator array, then call
`onChange` **once** at the end with `[...photos, ...added]`. Same applies to the
cover: pick `coverUrl ?? added[0]`.

**Why:** caught by architect review on the Yacht Proposal photo uploader; the
My Yachts uploader avoids it because it persists each upload to the server (DB
row) rather than holding a local prop-derived list. Pure local-state uploaders
(no DB row, e.g. proposal snapshots) are the ones exposed to this bug.

**How to apply:** any RN uploader that holds photos in parent state and supports
`allowsMultipleSelection` — accumulate then single `onChange`. Don't loop
`onChange`.
