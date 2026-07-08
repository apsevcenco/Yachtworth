import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Browser as PuppeteerBrowser,
  BrowserTag,
  computeExecutablePath,
  detectBrowserPlatform,
  install,
  resolveBuildId,
} from "@puppeteer/browsers";

export function defaultChromeCacheDir() {
  return path.resolve(process.cwd(), ".cache", "yachtworth-chrome");
}

export async function ensureChromeInstalled() {
  const cacheDir =
    process.env.PUPPETEER_CACHE_DIR?.trim() || defaultChromeCacheDir();
  const platform = detectBrowserPlatform();
  if (!platform) {
    throw new Error("Could not detect browser platform for Chromium download.");
  }
  const buildId = await resolveBuildId(
    PuppeteerBrowser.CHROME,
    platform,
    BrowserTag.STABLE,
  );
  const executablePath = computeExecutablePath({
    cacheDir,
    browser: PuppeteerBrowser.CHROME,
    platform,
    buildId,
  });
  if (existsSync(executablePath)) {
    console.log(`Chrome for Testing already installed: ${executablePath}`);
    return executablePath;
  }

  console.log(`Installing Chrome for Testing ${buildId} into ${cacheDir}`);
  const installed = await install({
    cacheDir,
    browser: PuppeteerBrowser.CHROME,
    platform,
    buildId,
    unpack: true,
  });
  console.log(`Chrome for Testing installed: ${installed.executablePath}`);
  return installed.executablePath;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  ensureChromeInstalled().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
