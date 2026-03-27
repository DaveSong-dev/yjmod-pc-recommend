"""
라이브 카드 FPS 표기 vs 상품 상세 본문 일치 검증.

상세에 선택 게임(배틀그라운드) FPS가 없을 때 카드에 나오는 줄은
프론트 getExpectedFps(js/utils.js) 참조 추정이며 '약' 접두가 붙는다.
그 문구 형식을 바꿀 때는 본 스크립트 compare_card_and_detail 규칙과 함께 수정할 것.
운영 메모: ops/OPERATIONAL_MEMO.md
"""
from __future__ import annotations

import json
import os
import sys
import time

import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

from enrich_game_fps import extract_game_fps_map


LIVE_URL = "https://ai.youngjaecomputer.com"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
}
TARGET_FILTERS = {
    "usage": "🎮 게이밍",
    "game": "🔫 배틀그라운드",
    "price": "💎 200~300만 원",
}
MIN_SAMPLE_COUNT = 3
VERIFY_RETRIES = int(os.environ.get("YJMOD_VERIFY_RETRIES", "3"))
VERIFY_RETRY_DELAY_SECONDS = int(os.environ.get("YJMOD_VERIFY_RETRY_DELAY", "8"))


def create_driver() -> webdriver.Chrome:
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1600,2200")
    options.add_argument(f"--user-agent={HEADERS['User-Agent']}")
    return webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options,
    )


def wait_for_cards(driver: webdriver.Chrome) -> None:
    WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "#product-grid .product-card"))
    )
    time.sleep(1.5)


def click_button_by_text(driver: webdriver.Chrome, selector: str, text: str) -> None:
    buttons = driver.find_elements(By.CSS_SELECTOR, selector)
    for button in buttons:
        label = button.text.strip()
        if label == text:
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", button)
            driver.execute_script("arguments[0].click();", button)
            time.sleep(0.8)
            return
    raise RuntimeError(f"button not found: {text}")


def apply_filters(driver: webdriver.Chrome) -> None:
    driver.get(LIVE_URL)
    wait = WebDriverWait(driver, 30)
    wait.until(EC.presence_of_element_located((By.ID, "product-grid")))
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".filter-tab")))

    click_button_by_text(driver, ".filter-tab", "용도별")
    click_button_by_text(driver, "#filter-usage .filter-btn", TARGET_FILTERS["usage"])

    click_button_by_text(driver, ".filter-tab", "게임별")
    click_button_by_text(driver, "#filter-game .filter-btn", TARGET_FILTERS["game"])

    click_button_by_text(driver, ".filter-tab", "금액별")
    click_button_by_text(driver, "#filter-price .filter-btn", TARGET_FILTERS["price"])

    wait_for_cards(driver)


def fetch_detail_fps_map(url: str) -> dict:
    response = requests.get(url, timeout=20, headers=HEADERS)
    response.encoding = "utf-8"
    soup = BeautifulSoup(response.text, "lxml")
    text = soup.get_text(" ", strip=True)
    title = soup.title.get_text(strip=True) if soup.title else ""
    return extract_game_fps_map(title, text)


def extract_card_data(card) -> dict:
    title = card.find_element(By.CSS_SELECTOR, "h3").text.strip()
    all_lines = [line.strip() for line in card.text.splitlines() if line.strip()]
    fps_lines = [line for line in all_lines if "FPS" in line]
    chips = []
    for chip in card.find_elements(By.XPATH, ".//span[contains(., 'FPS')]"):
        text = chip.text.strip()
        if text and text not in chips:
            chips.append(text)

    summary = None
    for line in fps_lines:
        if "배틀그라운드" in line:
            summary = line
            break

    link = card.find_element(By.XPATH, ".//a[contains(., '구매하기') or contains(., '견적 확인')]").get_attribute("href")
    return {
        "title": title,
        "fps_lines": fps_lines,
        "chips": chips,
        "selected_game_line": summary,
        "url": link,
    }


def compare_card_and_detail(card_data: dict) -> dict:
    detail_map = fetch_detail_fps_map(card_data["url"])
    detail_highlights = [
        info["highlight"]
        for info in detail_map.values()
    ]
    battleground = detail_map.get("배틀그라운드")
    if battleground:
        battleground_text = battleground["highlight"]
        battleground_match = any(
            str(battleground["fps"]) in line and "배틀그라운드" in line
            for line in card_data["fps_lines"]
        )
    else:
        # 상세 HTML에 배틀그라운드 FPS가 없어도, 필터 선택 시 카드는 fps_reference+티어로
        # "약 N FPS" 추정치를 보여줄 수 있음(getExpectedFps). 이 경우 상세와 '충돌'이 아니므로 통과.
        # 상세에 없는데 카드에 확정 문구(약 없음)만 나오면 데이터/표시 불일치로 실패.
        battleground_text = None
        bg_lines = [ln for ln in card_data["fps_lines"] if "배틀그라운드" in ln]
        battleground_match = len(bg_lines) == 0 or all("약" in ln for ln in bg_lines)

    detail_chip_matches = [
        chip for chip in card_data["fps_lines"]
        if any(token in chip for token in detail_highlights)
    ]
    missing_highlights = [
        token for token in detail_highlights
        if not any(token in chip for chip in card_data["fps_lines"])
    ]

    return {
        "상품명": card_data["title"],
        "카드에서 보인 FPS": card_data["fps_lines"],
        "상세 페이지 원문 FPS": detail_highlights,
        "배틀그라운드 요약 일치": battleground_match,
        "일치한 하이라이트": detail_chip_matches,
        "누락된 하이라이트": missing_highlights,
        "검증 통과": battleground_match and len(missing_highlights) == 0,
        "상세 링크": card_data["url"],
    }


def run_once() -> dict:
    driver = create_driver()
    try:
        apply_filters(driver)
        cards = driver.find_elements(By.CSS_SELECTOR, "#product-grid .product-card")
        samples = [extract_card_data(card) for card in cards[:MIN_SAMPLE_COUNT]]
        comparisons = [compare_card_and_detail(sample) for sample in samples]

        result = {
            "url": LIVE_URL,
            "filters": TARGET_FILTERS,
            "sampleCount": len(comparisons),
            "comparisons": comparisons,
        }
        result["success"] = (
            result["sampleCount"] >= MIN_SAMPLE_COUNT
            and all(item["검증 통과"] for item in comparisons)
        )
        return result
    finally:
        driver.quit()


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    last_result = None
    for attempt in range(1, VERIFY_RETRIES + 1):
        last_result = run_once()
        last_result["attempt"] = attempt
        print(json.dumps(last_result, ensure_ascii=False, indent=2))
        if last_result.get("success"):
            return
        if attempt < VERIFY_RETRIES:
            time.sleep(VERIFY_RETRY_DELAY_SECONDS)

    raise SystemExit(1)


if __name__ == "__main__":
    main()
