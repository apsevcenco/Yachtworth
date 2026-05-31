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
