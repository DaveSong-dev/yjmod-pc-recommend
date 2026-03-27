/**
 * 운영 URL 데스크톱(1280×800) FAB vs 카드 CTA 클릭 간섭 스모크 테스트.
 * 실행: npx playwright install chromium (최초 1회) 후
 *       node scripts/qa-desktop-fab-clicks.mjs
 */
import { chromium } from "playwright";

const URL = process.env.YJMOD_QA_URL || "https://ai.youngjaecomputer.com/";
const VIEWPORT = { width: 1280, height: 800 };

function describeTopElement(el) {
  if (!el) return null;
  const a = el.closest("a");
  if (a) {
    return {
      tag: "a",
      id: a.id || "",
      className: (a.className && String(a.className).slice(0, 120)) || "",
      href: (a.href || "").slice(0, 120),
      text: (a.textContent || "").trim().slice(0, 50),
    };
  }
  return {
    tag: el.tagName,
    className: (el.className && String(el.className).slice(0, 80)) || "",
  };
}

async function topAtCenter(page, locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error(`[${label}] boundingBox 없음`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const info = await page.evaluate((pt) => {
    const el = document.elementFromPoint(pt.x, pt.y);
    if (!el) return null;
    const a = el.closest("a");
    if (a) {
      return {
        tag: "a",
        id: a.id || "",
        className: (a.className && String(a.className).slice(0, 120)) || "",
        href: (a.href || "").slice(0, 120),
        text: (a.textContent || "").trim().slice(0, 50),
      };
    }
    return {
      tag: el.tagName,
      className: (el.className && String(el.className).slice(0, 80)) || "",
    };
  }, { x, y });
  return { x, y, box, info };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector(".product-card", { timeout: 120000 });

  const innerWidth = await page.evaluate(() => window.innerWidth);
  if (innerWidth < 768) {
    throw new Error(`뷰포트가 768 미만입니다 (innerWidth=${innerWidth}). 데스크톱 검증 불가.`);
  }

  const firstCard = page.locator(".product-card").first();
  const buyLink = firstCard.getByRole("link", { name: "구매하기", exact: true });
  const cardKakao = firstCard.getByRole("link", {
    name: "카카오톡 24시간 상담, 새 창",
  });
  const floating = page.locator("#floating-kakao-consult");

  const fabBox = await floating.boundingBox();
  console.log("[FAB] boundingBox:", fabBox);

  // 1) 구매하기
  let hit = await topAtCenter(page, buyLink, "구매하기");
  console.log("[구매하기] elementFromPoint:", JSON.stringify(hit.info, null, 0));
  if (hit.info?.id === "floating-kakao-consult") {
    throw new Error("구매하기 중심에서 플로팅 CTA가 잡힘 (간섭)");
  }
  const popup1 = page.waitForEvent("popup", { timeout: 15000 }).catch(() => null);
  await buyLink.click({ timeout: 10000 });
  const p1 = await popup1;
  if (p1) await p1.close().catch(() => {});
  console.log("[구매하기] click 완료");

  // 2) 카드 하단 카톡
  hit = await topAtCenter(page, cardKakao, "카드 카톡");
  console.log("[카드 카톡] elementFromPoint:", JSON.stringify(hit.info, null, 0));
  if (hit.info?.id === "floating-kakao-consult") {
    throw new Error("카드 카톡 중심에서 플로팅 CTA가 잡힘 (간섭)");
  }
  if (!hit.info?.href?.includes("pf.kakao.com")) {
    throw new Error("카드 카톡 링크가 아닌 요소가 중심에 있음: " + JSON.stringify(hit.info));
  }
  const popup2 = page.waitForEvent("popup", { timeout: 15000 }).catch(() => null);
  await cardKakao.click({ timeout: 10000 });
  const p2 = await popup2;
  if (p2) await p2.close().catch(() => {});
  console.log("[카드 카톡] click 완료");

  // 3) 플로팅 (뷰포트 우하단 고정 — 스크롤과 무관하게 FAB 중심은 카카오 링크여야 함)
  hit = await topAtCenter(page, floating, "플로팅");
  console.log("[플로팅] elementFromPoint:", JSON.stringify(hit.info, null, 0));
  if (hit.info?.id !== "floating-kakao-consult") {
    throw new Error("플로팅 CTA 중심에 FAB가 아닌 요소: " + JSON.stringify(hit.info));
  }
  const popup3 = page.waitForEvent("popup", { timeout: 15000 }).catch(() => null);
  await floating.click({ timeout: 10000 });
  const p3 = await popup3;
  if (p3) await p3.close().catch(() => {});
  console.log("[플로팅] click 완료");

  await browser.close();
  console.log("\nOK: 세 요소 클릭·중심 hit 검증 통과 (1280×800, Chromium).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
