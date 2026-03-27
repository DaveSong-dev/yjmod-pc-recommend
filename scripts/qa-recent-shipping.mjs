/**
 * 최근 출고 사진 섹션 스모크 (Chromium)
 * node scripts/qa-recent-shipping.mjs
 */
import { chromium } from "playwright";

const URL = process.env.YJMOD_QA_URL || "https://ai.youngjaecomputer.com/";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("#recent-shipping-section:not(.hidden)", { timeout: 60000 });
  await page.waitForSelector("#recent-shipping-grid a.recent-shipping-card", {
    timeout: 60000,
  });

  const count = await page.locator("#recent-shipping-grid a.recent-shipping-card").count();
  if (count !== 6) throw new Error(`카드 개수 기대 6, 실제 ${count}`);

  const galleryBtn = page.locator("#recent-shipping-gallery-btn");
  const gh = await galleryBtn.getAttribute("href");
  if (!gh || !gh.includes("cafe.naver.com") || !gh.includes("/cafes/31248285/menus/1")) {
    throw new Error("전체 보기 링크 비정상: " + gh);
  }

  await page.locator("#recent-shipping-section").scrollIntoViewIfNeeded();

  const firstCard = page.locator("#recent-shipping-grid a.recent-shipping-card").first();
  const href = await firstCard.getAttribute("href");
  if (!href || !href.includes("cafe.naver.com")) {
    throw new Error("첫 카드 링크 비정상: " + href);
  }

  await firstCard.scrollIntoViewIfNeeded();

  const hit = await firstCard.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return top && el.contains(top);
  });
  if (!hit) throw new Error("첫 카드 중심 hit 테스트 실패");

  const img = firstCard.locator("img");
  const lazy = await img.getAttribute("loading");
  if (lazy !== "lazy") throw new Error('img loading="lazy" 기대');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#recent-shipping-section").scrollIntoViewIfNeeded();
  const countM = await page.locator("#recent-shipping-grid a.recent-shipping-card").count();
  if (countM !== 6) throw new Error(`모바일 카드 수 기대 6, 실제 ${countM}`);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator("#recent-shipping-section").scrollIntoViewIfNeeded();

  const popG = page.waitForEvent("popup", { timeout: 15000 });
  await galleryBtn.click();
  const winG = await popG;
  const uG = winG.url();
  if (!uG.includes("naver.com") || !uG.includes("31248285")) {
    await winG.close().catch(() => {});
    throw new Error("전체 보기 팝업 URL 비정상: " + uG);
  }
  await winG.close().catch(() => {});

  const firstAgain = page.locator("#recent-shipping-grid a.recent-shipping-card").first();
  await firstAgain.scrollIntoViewIfNeeded();
  const popC = page.waitForEvent("popup", { timeout: 15000 });
  await firstAgain.click();
  const winC = await popC;
  const uC = winC.url();
  if (!uC.includes("cafe.naver.com")) {
    await winC.close().catch(() => {});
    throw new Error("첫 카드 팝업 URL 비정상: " + uC);
  }
  await winC.close().catch(() => {});

  await browser.close();
  console.log("OK: 최근 출고 사진 6카드·갤러리·카드 팝업·lazy·모바일 뷰 검증 통과");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
