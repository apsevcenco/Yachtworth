import { existsSync } from "node:fs";
import {
  Browser as PuppeteerBrowser,
  BrowserTag,
  computeExecutablePath,
  detectBrowserPlatform,
  install,
  resolveBuildId,
} from "@puppeteer/browsers";
import puppeteer, { type Browser } from "puppeteer-core";
import { logger } from "../../lib/logger";

/**
 * Resolve a Chromium/Chrome executable.
 *
 * Order:
 *   1. PUPPETEER_EXECUTABLE_PATH        (explicit override — set this on Render)
 *   2. CHROME_BIN / GOOGLE_CHROME_BIN   (common on PaaS images)
 *   3. Standard Linux Chrome/Chromium locations used by many Render images
 *   4. Downloaded Chrome for Testing cache in /tmp (Render-safe fallback)
 */
let downloadedExecutablePath: Promise<string> | null = null;

async function resolveDownloadedExecutablePath(): Promise<string> {
  const cacheDir =
    process.env["PUPPETEER_CACHE_DIR"]?.trim() || "/tmp/yachtworth-chrome";
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
  if (existsSync(executablePath)) return executablePath;

  logger.warn(
    { cacheDir, platform, buildId },
    "No system Chromium found; downloading Chrome for Testing",
  );
  const installed = await install({
    cacheDir,
    browser: PuppeteerBrowser.CHROME,
    platform,
    buildId,
    unpack: true,
  });
  return installed.executablePath;
}

async function resolveExecutablePath(): Promise<string> {
  const envCandidates = [
    process.env["PUPPETEER_EXECUTABLE_PATH"],
    process.env["CHROME_BIN"],
    process.env["GOOGLE_CHROME_BIN"],
  ];
  for (const c of envCandidates) {
    if (c && c.trim()) return c.trim();
  }
  const pathCandidates = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const c of pathCandidates) {
    if (existsSync(c)) return c;
  }
  downloadedExecutablePath ??= resolveDownloadedExecutablePath();
  return downloadedExecutablePath;
}

/** Render an HTML string to an A4 PDF Buffer via headless Chromium. */
export async function renderPdf(html: string): Promise<Buffer> {
  const executablePath = await resolveExecutablePath();
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 20000 });
    // Wait for embedded base64 @font-face fonts to finish loading before
    // printing. Without this, Chromium can print mid font-swap and the PDF
    // flattens BOTH the fallback paint and the embedded paint → doubled glyphs
    // ("YY AA CC"). Bounded so a font failure never hangs the render.
    // Evaluated as a string so it runs in the browser realm without pulling the
    // DOM lib into the api-server tsconfig (which is node-only).
    await page
      .evaluate(
        `new Promise((resolve) => {
          var f = (self.document && self.document.fonts) || null;
          var done = (f && f.ready) ? f.ready : Promise.resolve();
          var guard = setTimeout(resolve, 5000);
          Promise.resolve(done).then(function () { clearTimeout(guard); resolve(); });
        })`,
      )
      .catch(() => undefined);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "PDF render failed",
    );
    throw err;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}
