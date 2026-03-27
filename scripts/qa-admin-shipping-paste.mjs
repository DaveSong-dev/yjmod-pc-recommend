/**
 * 관리자 출고 페이지: 클립보드 이미지 붙여넣기 → 미리보기 src 존재 확인 (Chromium)
 * node scripts/qa-admin-shipping-paste.mjs
 */
import { chromium } from "playwright";

const URL = process.env.YJMOD_ADMIN_URL || "https://ai.youngjaecomputer.com/admin/shipping.html";

async function pasteFromClipboard(page, focusSelector) {
  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 40;
    c.height = 30;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#10b981";
    ctx.fillRect(0, 0, 40, 30);
    const blob = await new Promise((res) => c.toBlob(res, "image/png"));
    if (!blob) throw new Error("toBlob failed");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  });

  await page.locator(focusSelector).click();
  await page.keyboard.press("Control+v");

  await page.waitForFunction(
    () => {
      const img = document.querySelector("#imagePreview");
      return img && img.src && img.src.startsWith("blob:");
    },
    { timeout: 10000 }
  );

  const wrapVisible = await page.locator("#imagePreviewWrap").evaluate((el) =>
    el.classList.contains("show")
  );
  if (!wrapVisible) throw new Error("imagePreviewWrap.show 없음");

  const traceHasPaste = await page.locator("#clipboardTrace").evaluate((el) =>
    /붙여넣기 이벤트 수신/.test(el.textContent || "")
  );
  if (!traceHasPaste) throw new Error("clipboardTrace에 붙여넣기 진단 로그 없음");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 900, height: 800 },
    permissions: ["clipboard-read", "clipboard-write"],
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  await pasteFromClipboard(page, "#imageDropZone");
  console.log("OK: 포커스 imageDropZone → Ctrl+V → blob 미리보기");

  await page.locator("#btnClearImage").click();
  await pasteFromClipboard(page, "#line");
  console.log("OK: 포커스 한 줄 textarea → Ctrl+V → blob 미리보기");

  await browser.close();
  console.log("OK: 붙여넣기 시나리오 전체 통과");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
