import { chromium, devices } from 'playwright';

const URL = process.env.YJMOD_QA_URL || 'http://127.0.0.1:4173/index.html';
const RESULT_TOP_MAX = 24;
const RESULT_TIMEOUT_MS = 5000;

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
    sink.push({
      type: 'requestfailed',
      url: request.url(),
      text: request.failure()?.errorText || 'unknown'
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

async function waitForProducts(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.product-card', { timeout: 60000 });
}

async function openWizard(page) {
  const trigger = page.locator('button[data-source-section="hero_primary"]').first();
  await trigger.click();
  await page.waitForFunction(() => {
    return document.getElementById('wizard-modal')?.classList.contains('flex');
  });
}

async function clickCurrentOption(page, selector) {
  await page.locator(selector).first().click();
  await page.waitForTimeout(700);
}

async function assertResultsAligned(page, label) {
  await page.waitForFunction(() => {
    const section = document.getElementById('wizard-result-section');
    const cards = document.querySelectorAll('#wizard-result-container .wizard-result-card').length;
    return !!section && !section.classList.contains('hidden') && cards > 0;
  }, undefined, { timeout: RESULT_TIMEOUT_MS });

  await page.waitForFunction((topMax) => {
    const section = document.getElementById('wizard-result-section');
    if (!section || section.classList.contains('hidden')) return false;
    return section.getBoundingClientRect().top <= topMax;
  }, RESULT_TOP_MAX, { timeout: RESULT_TIMEOUT_MS });

  await page.waitForTimeout(900);

  const state = await page.evaluate(() => {
    const section = document.getElementById('wizard-result-section');
    const rect = section?.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      sectionTop: rect?.top ?? null,
      sectionBottom: rect?.bottom ?? null,
      resultCards: document.querySelectorAll('#wizard-result-container .wizard-result-card').length,
    };
  });

  if (state.sectionTop == null || state.sectionTop > RESULT_TOP_MAX) {
    throw new Error(`${label}: result section is still misaligned (${state.sectionTop}).`);
  }

  console.log(`${label}:`, JSON.stringify(state));
}

async function runScenario(label, contextOptions, flow) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const failures = [];
  attachFailureCapture(page, failures);

  try {
    await waitForProducts(page);
    await openWizard(page);

    if (flow === 'office') {
      await clickCurrentOption(page, '.wizard-option[data-value="office"]');
      await clickCurrentOption(page, '.wizard-option[data-value="budget_100_200"]');
      await clickCurrentOption(page, '.wizard-option[data-value="black"]');
    } else if (flow === 'gaming') {
      await clickCurrentOption(page, '.wizard-option[data-value="gaming"]');
      await clickCurrentOption(page, '.wizard-option[data-step="2"]');
      await clickCurrentOption(page, '.wizard-option[data-value="budget_100_200"]');
      await clickCurrentOption(page, '.wizard-option[data-value="black"]');
    } else {
      throw new Error(`Unknown flow: ${flow}`);
    }

    await assertResultsAligned(page, label);

    if (failures.length > 0) {
      throw new Error(`${label}: browser failures detected ${JSON.stringify(failures.slice(0, 8))}`);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  await runScenario('desktop-office', { viewport: { width: 1280, height: 900 } }, 'office');
  await runScenario('desktop-gaming', { viewport: { width: 1280, height: 900 } }, 'gaming');
  await runScenario('mobile-office', { ...devices['iPhone 13'] }, 'office');
  await runScenario('mobile-gaming', { ...devices['iPhone 13'] }, 'gaming');
  console.log('OK: wizard result scroll alignment verified on desktop and mobile.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
