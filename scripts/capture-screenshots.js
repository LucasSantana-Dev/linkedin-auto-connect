#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Captures README screenshots for the extension popup and installation steps.
 * Usage: node scripts/capture-screenshots.js
 * Output: docs/media/
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname, '../extension');
const OUT_DIR = path.resolve(__dirname, '../docs/media');
const PROFILE_DIR = '/tmp/linkedin-engage-capture';

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.rmSync(PROFILE_DIR, { recursive: true, force: true });

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getExtensionId(context) {
  let sw = context.serviceWorkers()[0];
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 20000 });
  return sw.url().split('/')[2];
}

async function capturePopup(context, extensionId, filename, setup) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 400, height: 700 });
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`, { waitUntil: 'networkidle' });
  await wait(800);
  if (setup) await setup(page);
  await wait(400);
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
  console.log(`  ✓ ${filename}`);
  await page.close();
}

async function captureFullPage(context, url, filename, setup) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await wait(1200);
  if (setup) await setup(page);
  await wait(400);
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
  console.log(`  ✓ ${filename}`);
  await page.close();
}

(async () => {
  console.log('Launching Brave with extension…');
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-brave-update',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  // Give Brave time to fully register the extension service worker
  await wait(3000);

  console.log('Waiting for extension service worker…');
  const extensionId = await getExtensionId(context);
  console.log(`Extension ID: ${extensionId}`);

  console.log('\nCapturing popup screenshots…');

  // Connect mode (default)
  await capturePopup(context, extensionId, 'popup-connect.png', null);

  // Companies tab
  await capturePopup(context, extensionId, 'popup-companies.png', async (page) => {
    await page.click('button:has-text("Companies")').catch(() => {});
    await wait(300);
  });

  // Feed tab
  await capturePopup(context, extensionId, 'popup-feed.png', async (page) => {
    await page.click('button:has-text("Feed")').catch(() => {});
    await wait(300);
  });

  // Dashboard (options page)
  console.log('\nCapturing dashboard…');
  await captureFullPage(
    context,
    `chrome-extension://${extensionId}/options.html`,
    'dashboard.png',
    null
  );

  // chrome://extensions — installation step reference
  console.log('\nCapturing chrome://extensions page…');
  await captureFullPage(context, 'chrome://extensions', 'install-extensions-page.png', null);

  // Developer mode toggle visible
  await captureFullPage(context, 'chrome://extensions', 'install-developer-mode.png', async (page) => {
    // The extensions page is a WebUI — interact with its shadow DOM via evaluate
    await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      if (!manager) return;
      const toolbar = manager.shadowRoot?.querySelector('extensions-toolbar');
      if (!toolbar) return;
      // Scroll to show the developer mode toggle
      toolbar.scrollIntoView({ block: 'start' });
    }).catch(() => {});
    await wait(600);
  });

  await context.close();
  console.log(`\nAll screenshots saved to ${OUT_DIR}`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
