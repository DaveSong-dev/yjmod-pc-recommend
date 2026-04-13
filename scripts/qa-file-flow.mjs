import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

function attachFailureCapture(page, sink) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      sink.push({ type: 'console', text: msg.text() });
    }
  });
  page.on('pageerror', (error) => {
    sink.push({ type: 'pageerror', text: String(error) });
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText || 'unknown';
    if (errorText.includes('ERR_ABORTED')) return;
    sink.push({
      type: 'requestfailed',
      url: request.url(),
      text: errorText
    });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      sink.push({
        type: 'response',
        status: response.status(),
        url: response.url()
      });
    }
  });
}

function extractWizardLogs(entries) {
  return entries
    .filter((entry) =>
      entry.text.includes('[EVENT FIRED] wizard_open') ||
      entry.text.includes('[RENDER CALLED] renderStep(1)') ||
      entry.text.includes('[STEP] 1')
    )
    .map((entry) => entry.text);
}

async function verifyRootIndexRedirect(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const failures = [];
  const logs = [];
  attachFailureCapture(page, failures);
  page.on('console', (msg) => {
    if (msg.type() === 'log') {
      logs.push({ type: msg.type(), text: msg.text() });
    }
  });

  const entryUrl = `${pathToFileURL(path.resolve('index.html')).href}?debug=1`;
  await page.goto(entryUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(
    () => window.location.pathname.replace(/\\/g, '/').endsWith('/build/yjmod-single.html'),
    undefined,
    { timeout: 30000 }
  );
  await page.waitForSelector('.product-card', { timeout: 60000 });
  await page.locator('button[data-source-section="hero_primary"]').click();
  await page.waitForFunction(() => document.getElementById('wizard-modal')?.classList.contains('flex'));
  await page.waitForTimeout(1200);

  const state = await page.evaluate(() => ({
    finalPath: window.location.pathname.replace(/\\/g, '/'),
    modalVisible: document.getElementById('wizard-modal')?.classList.contains('flex') || false,
    optionCount: document.querySelectorAll('.wizard-option').length,
    productCards: document.querySelectorAll('.product-card').length
  }));
  const wizardLogs = extractWizardLogs(logs);

  if (!state.finalPath.endsWith('/build/yjmod-single.html') || !state.modalVisible || state.optionCount === 0 || state.productCards === 0) {
    throw new Error(`file-root-index: redirect flow mismatch ${JSON.stringify(state)}`);
  }
  if (wizardLogs.length < 3) {
    throw new Error(`file-root-index: missing wizard debug logs ${JSON.stringify(wizardLogs)}`);
  }
  if (failures.length > 0) {
    throw new Error(`file-root-index: browser failures detected ${JSON.stringify(failures.slice(0, 8))}`);
  }

  console.log('file-root-index:', JSON.stringify({ ...state, wizardLogs }));
  await page.close();
}

async function verifySingleHtml(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const failures = [];
  const logs = [];
  attachFailureCapture(page, failures);
  page.on('console', (msg) => {
    if (msg.type() === 'log') {
      logs.push({ type: msg.type(), text: msg.text() });
    }
  });

  const entryUrl = `${pathToFileURL(path.resolve('build', 'yjmod-single.html')).href}?debug=1`;
  await page.goto(entryUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.product-card', { timeout: 60000 });
  await page.locator('button[data-source-section="hero_primary"]').click();
  await page.waitForFunction(() => document.getElementById('wizard-modal')?.classList.contains('flex'));
  await page.locator('.wizard-option[data-value="office"]').first().click();
  await page.waitForTimeout(650);
  await page.locator('.wizard-option[data-value="budget_100_200"]').first().click();
  await page.waitForTimeout(650);
  await page.locator('.wizard-option[data-value="black"]').first().click();
  await page.waitForFunction(() => document.querySelectorAll('.wizard-result-card').length > 0, undefined, { timeout: 10000 });
  await page.waitForTimeout(2200);

  const state = await page.evaluate(() => ({
    finalPath: window.location.pathname.replace(/\\/g, '/'),
    productCards: document.querySelectorAll('.product-card').length,
    resultCards: document.querySelectorAll('.wizard-result-card').length,
    sectionTop: document.getElementById('wizard-result-section')?.getBoundingClientRect().top ?? null
  }));
  const wizardLogs = extractWizardLogs(logs);

  if (state.productCards === 0 || state.resultCards === 0 || state.sectionTop == null || state.sectionTop > 24) {
    throw new Error(`file-single-html: unexpected state ${JSON.stringify(state)}`);
  }
  if (wizardLogs.length < 3) {
    throw new Error(`file-single-html: missing wizard debug logs ${JSON.stringify(wizardLogs)}`);
  }
  if (failures.length > 0) {
    throw new Error(`file-single-html: browser failures detected ${JSON.stringify(failures.slice(0, 8))}`);
  }

  console.log('file-single-html:', JSON.stringify({ ...state, wizardLogs }));
  await page.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await verifyRootIndexRedirect(browser);
    await verifySingleHtml(browser);
    console.log('OK: file:// root redirect and offline wizard flow verified.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
