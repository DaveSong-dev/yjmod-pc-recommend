import { chromium, devices } from 'playwright';

const BASE_URL = process.env.YJMOD_QA_URL || 'http://127.0.0.1:4173/index.html';
const URL = `${BASE_URL}${BASE_URL.includes('?') ? '&' : '?'}analytics=1`;
const HEADER_OFFSET = 96;

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
    if (response.status() >= 400 && !response.url().includes('/api/track-event')) {
      sink.push({
        type: 'response',
        status: response.status(),
        url: response.url()
      });
    }
  });
}

async function attachAnalyticsCapture(page, sink) {
  await page.route('**/api/track-event', async (route) => {
    const body = route.request().postDataJSON?.() ?? JSON.parse(route.request().postData() || '{}');
    sink.push(body);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, stored: false, mode: 'qa' })
    });
  });
}

async function waitForProducts(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.product-card', { timeout: 60000 });
}

async function expectSectionNearTop(page, selector, maxTop = HEADER_OFFSET) {
  await page.waitForFunction(({ sel, top }) => {
    const element = document.querySelector(sel);
    if (!element) return false;
    return element.getBoundingClientRect().top <= top;
  }, { sel: selector, top: maxTop });
}

async function openWizard(page) {
  await page.locator('button[data-source-section="hero_primary"]').click();
  await page.waitForFunction(() => {
    return document.getElementById('wizard-modal')?.classList.contains('flex');
  });
}

async function clickOption(page, value) {
  await page.locator(`.wizard-option[data-value="${value}"]`).first().click();
  await page.waitForTimeout(650);
}

async function waitForWizardResults(page) {
  await page.waitForFunction(() => {
    const section = document.getElementById('wizard-result-section');
    return !!section && !section.classList.contains('hidden') && document.querySelectorAll('.wizard-result-card').length > 0;
  }, undefined, { timeout: 8000 });
}

async function getWizardResultIds(page) {
  await waitForWizardResults(page);
  return page.locator('#wizard-result-container .wizard-result-card').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-id')).filter(Boolean)
  );
}

async function runWizardFlow(page, flow) {
  await openWizard(page);

  if (flow === 'office') {
    await clickOption(page, 'office');
    await clickOption(page, 'budget_100_200');
    await clickOption(page, 'black');
  } else if (flow === 'gaming') {
    await clickOption(page, 'gaming');
    await clickOption(page, '배틀그라운드');
    await clickOption(page, 'budget_100_200');
    await clickOption(page, 'black');
  } else if (flow === 'ai') {
    await clickOption(page, 'ai');
    await clickOption(page, 'budget_200_300');
    await clickOption(page, 'rgb');
  } else {
    throw new Error(`Unknown wizard flow: ${flow}`);
  }

  await waitForWizardResults(page);
  await expectSectionNearTop(page, '#wizard-result-section', 40);
  return getWizardResultIds(page);
}

async function captureFilterIds(page, usageValue, priceRangeValue) {
  await page.evaluate(() => window.resetAllFilters?.());
  await page.click('[data-target="filter-usage"]');
  await page.click(`.filter-btn[data-filter-key="usage"][data-filter-value="${usageValue}"]`);
  await page.click('[data-target="filter-price"]');
  await page.click(`.filter-btn[data-filter-key="priceRange"][data-filter-value="${priceRangeValue}"]`);
  await page.waitForTimeout(800);
  return page.locator('#product-grid .product-card').evaluateAll((cards) =>
    cards.slice(0, 6).map((card) => card.getAttribute('data-id')).filter(Boolean)
  );
}

async function verifyPopupLink(page, selector, expectedPattern) {
  const beforeUrl = page.url();
  const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
  const navigationPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => null);

  await page.locator(selector).first().click();

  const popup = await popupPromise;
  if (popup) {
    await popup.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    const url = popup.url();
    if (!expectedPattern.test(url)) {
      throw new Error(`Popup URL mismatch for ${selector}: ${url}`);
    }
    await popup.close().catch(() => {});
    return;
  }

  await navigationPromise;
  const url = page.url();
  if (!expectedPattern.test(url)) {
    throw new Error(`Navigation URL mismatch for ${selector}: ${url}`);
  }

  if (url !== beforeUrl) {
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  }
}

function assertEvent(events, name, predicate, message) {
  const matched = events.find((event) => event.event === name && (!predicate || predicate(event)));
  if (!matched) {
    throw new Error(message || `Missing analytics event: ${name}`);
  }
}

async function runDesktopScenario() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const analyticsEvents = [];
  const failures = [];

  try {
    attachFailureCapture(page, failures);
    await attachAnalyticsCapture(page, analyticsEvents);
    await waitForProducts(page);

    await page.locator('a[data-source-section="hero_secondary"]').click();
    await expectSectionNearTop(page, '#products-section');

    const officeIds = await runWizardFlow(page, 'office');
    const retryButton = page.locator('#btn-wizard-retry');
    await retryButton.click();
    await page.waitForFunction(() => document.getElementById('wizard-modal')?.classList.contains('flex'));
    await page.locator('[data-close-wizard]').click();
    await page.waitForTimeout(250);

    const gamingIds = await runWizardFlow(page, 'gaming');
    const aiIds = await runWizardFlow(page, 'ai');

    const uniqueSets = new Set([officeIds.join(','), gamingIds.join(','), aiIds.join(',')]);
    if (uniqueSets.size < 3) {
      throw new Error(`Wizard recommendation sets are not differentiated enough: ${JSON.stringify({ officeIds, gamingIds, aiIds })}`);
    }

    const officeFilterIds = await captureFilterIds(page, '사무/디자인', '100~200만 원');
    const aiFilterIds = await captureFilterIds(page, 'AI/딥러닝', '200~300만 원');
    if (officeFilterIds.join(',') === aiFilterIds.join(',')) {
      throw new Error(`Filter combinations returned the same products: ${JSON.stringify({ officeFilterIds, aiFilterIds })}`);
    }

    await verifyPopupLink(page, '#product-grid .product-card a[data-track-click="product"]', /^https?:\/\//i);
    await verifyPopupLink(page, '#floating-kakao-consult', /kakao\.com/i);

    assertEvent(analyticsEvents, 'wizard_open', (event) => !!event.source_section, 'wizard_open event missing source_section');
    assertEvent(analyticsEvents, 'wizard_complete', (event) => Array.isArray(event.result_product_ids) && event.result_product_ids.length > 0, 'wizard_complete event missing result products');
    assertEvent(analyticsEvents, 'product_click', (event) => !!event.product_id && !!event.product_name, 'product_click event missing product metadata');
    assertEvent(analyticsEvents, 'consult_click', (event) => !!event.source_section, 'consult_click event missing source_section');
    assertEvent(analyticsEvents, 'retry_click', (event) => !!event.selected_filters, 'retry_click event missing selected_filters');
    if (failures.length > 0) {
      throw new Error(`Desktop browser failures detected: ${JSON.stringify(failures.slice(0, 8))}`);
    }

    return {
      officeIds,
      gamingIds,
      aiIds,
      officeFilterIds,
      aiFilterIds,
      analyticsEvents: analyticsEvents.length
    };
  } finally {
    await browser.close();
  }
}

async function runMobileScenario() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  const analyticsEvents = [];
  const failures = [];

  try {
    attachFailureCapture(page, failures);
    await attachAnalyticsCapture(page, analyticsEvents);
    await waitForProducts(page);

    await page.locator('#mode-btn-wizard').click();
    await page.waitForFunction(() => document.getElementById('wizard-modal')?.classList.contains('flex'));
    await page.locator('[data-close-wizard]').click();
    await page.waitForFunction(() => document.getElementById('wizard-modal')?.classList.contains('hidden'));
    await page.waitForFunction(() => document.getElementById('mode-btn-filter')?.classList.contains('mobile-mode-btn--active'));

    const officeIds = await runWizardFlow(page, 'office');
    if (officeIds.length === 0) {
      throw new Error('Mobile wizard produced no products');
    }

    await verifyPopupLink(page, '#floating-kakao-consult', /kakao\.com/i);

    assertEvent(analyticsEvents, 'wizard_open', null, 'Mobile wizard_open event missing');
    assertEvent(analyticsEvents, 'wizard_complete', null, 'Mobile wizard_complete event missing');
    if (failures.length > 0) {
      throw new Error(`Mobile browser failures detected: ${JSON.stringify(failures.slice(0, 8))}`);
    }

    return {
      officeIds,
      analyticsEvents: analyticsEvents.length
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const desktop = await runDesktopScenario();
  const mobile = await runMobileScenario();

  console.log('desktop:', JSON.stringify(desktop));
  console.log('mobile:', JSON.stringify(mobile));
  console.log('OK: conversion flow, CTA routing, analytics hooks, and recommendation diversity verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
