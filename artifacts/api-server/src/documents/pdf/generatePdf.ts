import puppeteer, { type Browser } from "puppeteer-core";
import { logger } from "../../lib/logger";

/**
 * Resolve a Chromium/Chrome executable.
 *
 * Order:
 *   1. PUPPETEER_EXECUTABLE_PATH        (explicit override — set this on Render)
 *   2. REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE (provided in the Replit dev env)
 *   3. CHROME_BIN / GOOGLE_CHROME_BIN   (common on PaaS images)
 */
function resolveExecutablePath(): string {
  const candidates = [
    process.env["PUPPETEER_EXECUTABLE_PATH"],
    process.env["REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE"],
    process.env["CHROME_BIN"],
    process.env["GOOGLE_CHROME_BIN"],
  ];
  for (const c of candidates) {
    if (c && c.trim()) return c.trim();
  }
  throw new Error(
    "No Chromium executable found. Set PUPPETEER_EXECUTABLE_PATH to a Chrome/Chromium binary.",
  );
}

/** Render an HTML string to an A4 PDF Buffer via headless Chromium. */
export async function renderPdf(html: string): Promise<Buffer> {
  const executablePath = resolveExecutablePath();
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
