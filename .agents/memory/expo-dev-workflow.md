---
name: Expo dev workflow won't start
description: Why the Expo workflow hangs/fails to start in a Replit non-TTY workflow and how to fix it without breaking hot reload.
---

# Expo dev server "won't start" in a Replit workflow

Symptom set seen when the user reports Expo "won't start":

1. **Interactive login prompt blocks device connections.** `expo start` repeatedly
   prints "It is recommended to log in with your Expo account before proceeding …
   ❯ Log in / Proceed anonymously" and waits on stdin. In a workflow there is no
   TTY to answer it, so Expo Go on a phone can't connect (web bundle still works,
   so the preview pane can look fine while the device hangs).
   - **Fix:** add `EXPO_OFFLINE=1` to the `dev` script env (before `expo start`).
     Offline mode skips the account/auth check so the prompt never appears, and it
     keeps Metro watch/hot-reload working.
   - **Do NOT use `CI=1`** for this. It suppresses the prompt but also prints
     "Metro is running in CI mode, reloads are disabled" — hot reload dies, which
     is worse for the user.

2. **`CommandError: "<pkg>" is added as a dependency … but it doesn't seem to be
   installed`** (e.g. `expo-updates`). In interactive mode this is a soft warning
   and Expo bundles anyway; in CI mode it becomes fatal. Real fix is to install
   the missing dep.
   - Run `pnpm install`. If it aborts with
     `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` (pnpm wants to wipe an
     out-of-sync node_modules but won't without a TTY), re-run as
     `CI=true pnpm install` to allow the non-interactive wipe + reinstall.

**Why:** `EXPO_OFFLINE=1` also prints "Skipping dependency validation in offline
mode", which hides the SDK version-mismatch warnings — convenient, but it means a
genuinely wrong dep version won't be surfaced by `expo start` anymore. Check
`expo install --fix` separately if photo/native features misbehave.

**How to apply:** the workflow runs `pnpm --filter @workspace/yachtworth-app run
dev`, which runs the `dev` script in that package's package.json. Edit the env
prefix on that `dev` script (not artifact.toml) and restart the expo workflow.
