"""
crawl_cafe.py - 영재컴퓨터 네이버 카페 출고사진 크롤러
1차: 네이버 Search API (공개 게시글 검색)
2차: Selenium 폴백 (로그인 필요 시)

실행 방법:
    cd crawler
    NAVER_CLIENT_ID=xxx NAVER_CLIENT_SECRET=yyy python crawl_cafe.py

환경변수:
    NAVER_CLIENT_ID     - 네이버 개발자센터 애플리케이션 Client ID
    NAVER_CLIENT_SECRET - 네이버 개발자센터 애플리케이션 Client Secret
    NAVER_ID            - 네이버 로그인 ID (Selenium 폴백 시)
    NAVER_PW            - 네이버 로그인 PW (Selenium 폴백 시)
"""

import json
import os
import re
import time
import traceback
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from webdriver_manager.chrome import ChromeDriverManager
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False

from config import (
    CAFE_URL, CAFE_CLUB_ID,
    NAVER_CLIENT_ID, NAVER_CLIENT_SECRET,
    MAX_CAFE_POSTS, OUTPUT_CAFE,
    REQUEST_DELAY
)

# ─── 검색 쿼리 설정 ───────────────────────────────────────────
SEARCH_QUERIES = [
    "영재컴퓨터 출고",
    "YJMOD 출고사진",
    "영재컴퓨터 조립 완성",
]

# 실시간 출고 현황 게시판 URL (카페 내 직접 접근)
CAFE_BOARD_URL = f"https://cafe.naver.com/ArticleList.nhn?search.clubid={CAFE_CLUB_ID}&search.boardtype=L"


# ─── 네이버 Search API ───────────────────────────────────────
def fetch_via_naver_api(query, display=20):
    """
    네이버 카페글 검색 API 호출
    https://openapi.naver.com/v1/search/cafearticle.json
    """
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        print("[WARN] 네이버 API 키 미설정. Selenium 폴백으로 전환합니다.")
        return []

    url = "https://openapi.naver.com/v1/search/cafearticle.json"
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }
    params = {
        "query": query,
        "display": display,
        "start": 1,
        "sort": "date",  # 최신순
    }

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("items", [])
        print(f"  [API] '{query}' 검색 결과: {len(items)}개")
        return items
    except requests.exceptions.HTTPError as e:
        print(f"  [API ERROR] {e}")
        return []
    except Exception as e:
        print(f"  [API ERROR] {e}")
        return []


def process_api_items(api_items):
    """API 응답 아이템을 cafe_posts 형식으로 변환"""
    posts = []
    seen_links = set()

    for item in api_items:
        link = item.get("link", "")
        if not link or link in seen_links:
            continue
        seen_links.add(link)

        title = item.get("title", "")
        # HTML 태그 제거
        title = re.sub(r"<[^>]+>", "", title).strip()
        if not title:
            continue

        # 날짜 파싱 (pubDate: "Mon, 19 Feb 2026 12:00:00 +0900")
        pub_date = item.get("pubDate", "")
        date_str = parse_pub_date(pub_date)

        # 카페명 필터링 (영재컴퓨터 카페만)
        cafe_name = item.get("cafename", "")
        if cafe_name and "영재" not in cafe_name and "YJMOD" not in cafe_name.upper():
            continue

        post = {
            "id": str(len(posts) + 1),
            "title": title,
            "url": link,
            "thumbnail": "",  # API에서 썸네일 미제공 -> 빈 값
            "date": date_str,
            "tags": extract_tags_from_title(title),
        }
        posts.append(post)

    return posts


def parse_pub_date(pub_date_str):
    """RSS pubDate 형식을 YYYY-MM-DD로 변환"""
    try:
        # "Mon, 19 Feb 2026 12:00:00 +0900"
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(pub_date_str)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return datetime.now().strftime("%Y-%m-%d")


def extract_tags_from_title(title):
    """제목에서 태그 추출"""
    tags = []
    patterns = [
        r"RTX\s+[0-9]+(?:\s+Ti)?(?:\s+Super)?",
        r"RX\s+[0-9]+(?:\s+XT|XTX)?",
        r"i[0-9]-[0-9]+[A-Z]*",
        r"(?:라이젠|Ryzen)\s*[0-9]\s+[0-9]+(?:X3D|X)?",
        r"커스텀\s*수냉",
        r"(?:하이엔드|가성비|퍼포먼스)",
        r"(?:배틀그라운드|배그|로스트아크|로아|롤|발로란트|오버워치)",
        r"(?:화이트|블랙)",
        r"(?:게이밍|영상편집|AI|딥러닝|워크스테이션)",
    ]
    for p in patterns:
        m = re.search(p, title, re.IGNORECASE)
        if m:
            tags.append(m.group(0).strip())
        if len(tags) >= 4:
            break
    return tags


# ─── Selenium 폴백 크롤러 ────────────────────────────────────
def create_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    )
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)


def naver_login(driver):
    """네이버 계정 로그인 (환경변수 필요)"""
    nid = os.environ.get("NAVER_ID", "")
    npw = os.environ.get("NAVER_PW", "")

    if not nid or not npw:
        print("[WARN] NAVER_ID / NAVER_PW 환경변수 미설정. 비로그인 접근 시도.")
        return False

    try:
        driver.get("https://nid.naver.com/nidlogin.login")
        time.sleep(2)

        # JavaScript로 입력 (봇 탐지 우회)
        driver.execute_script(f"document.querySelector('#id').value = '{nid}'")
        driver.execute_script(f"document.querySelector('#pw').value = '{npw}'")
        time.sleep(0.5)

        login_btn = driver.find_element(By.ID, "log.login")
        login_btn.click()
        time.sleep(3)

        if "nid.naver.com" in driver.current_url:
            print("[WARN] 로그인 실패 (2차 인증 또는 비정상 로그인 차단)")
            return False

        print("[OK] 네이버 로그인 성공")
        return True

    except Exception as e:
        print(f"[ERROR] 로그인 실패: {e}")
        return False


def crawl_cafe_via_selenium(driver):
    """Selenium으로 카페 게시판 직접 크롤링"""
    posts = []

    try:
        # 카페 실시간 출고 현황 게시판 접근
        board_url = (
            f"https://cafe.naver.com/f-e/cafes/{CAFE_CLUB_ID}/menus/1"
            "?viewType=L&page=1"
        )
        driver.get(board_url)
        time.sleep(3)

        # iframe 전환 (카페는 iframe 구조)
        try:
            iframe = driver.find_element(By.ID, "cafe_main")
            driver.switch_to.frame(iframe)
            time.sleep(1)
        except Exception:
            pass  # iframe 없을 수 있음

        html = driver.page_source
        soup = BeautifulSoup(html, "html.parser")

        # 게시글 목록 파싱
        articles = soup.select(
            "li.article-board-item, .board-list li, .article-item, tr.article-view"
        )

        if not articles:
            # 대안 셀렉터
            articles = soup.select("a[href*='/articles/']")

        print(f"  [Selenium] 게시글 요소 {len(articles)}개 발견")

        for article in articles[:MAX_CAFE_POSTS]:
            try:
                # 제목
                title_el = (
                    article.select_one(".article-board-item-price-info a, .article-title, a.tit")
                    or article if article.name == "a" else article.select_one("a")
                )
                if not title_el:
                    continue

                title = title_el.get_text(strip=True)
                if not title or len(title) < 3:
                    continue

                href = title_el.get("href", "")
                if href.startswith("http"):
                    url = href
                else:
                    url = f"https://cafe.naver.com{href}" if href.startswith("/") else f"{CAFE_URL}/{href}"

                # 썸네일
                thumbnail = ""
                img = article.select_one("img")
                if img:
                    thumbnail = img.get("src") or img.get("data-src") or ""

                # 날짜
                date_el = article.select_one(".article-date, .date, time, .createdate")
                date_str = date_el.get_text(strip=True) if date_el else ""
                date_str = normalize_date(date_str)

                post = {
                    "id": str(len(posts) + 1),
                    "title": title,
                    "url": url,
                    "thumbnail": thumbnail,
                    "date": date_str,
                    "tags": extract_tags_from_title(title),
                }
                posts.append(post)

            except Exception:
                continue

        driver.switch_to.default_content()

    except Exception as e:
        print(f"  [ERROR] Selenium 카페 크롤링 실패: {e}")
        traceback.print_exc()

    return posts


def normalize_date(date_str):
    """다양한 날짜 형식을 YYYY-MM-DD로 정규화"""
    if not date_str:
        return datetime.now().strftime("%Y-%m-%d")

    # "2026.02.19" or "2026-02-19"
    m = re.search(r"(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})", date_str)
    if m:
        return f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"

    # "02.19" (연도 없음)
    m = re.search(r"(\d{1,2})[.\-](\d{1,2})", date_str)
    if m:
        year = datetime.now().year
        return f"{year}-{m.group(1).zfill(2)}-{m.group(2).zfill(2)}"

    return datetime.now().strftime("%Y-%m-%d")


# ─── 썸네일 보완 (게시글 접근) ────────────────────────────────
def enrich_thumbnail(posts, driver, max_enrich=10):
    """
    썸네일이 없는 게시글의 경우 게시글 본문에서 첫 이미지 추출
    (속도 이슈로 최대 max_enrich개만 처리)
    """
    enriched = 0
    for post in posts:
        if post.get("thumbnail") or enriched >= max_enrich:
            continue

        try:
            driver.get(post["url"])
            time.sleep(1.5)

            try:
                iframe = driver.find_element(By.ID, "cafe_main")
                driver.switch_to.frame(iframe)
            except Exception:
                pass

            html = driver.page_source
            soup = BeautifulSoup(html, "html.parser")

            img = soup.select_one(".se-image-resource, .se_mediaImage, .ContentRenderer img")
            if img:
                src = img.get("src") or img.get("data-lazy-src") or ""
                if src and not src.startswith("data:"):
                    post["thumbnail"] = src
                    enriched += 1

            driver.switch_to.default_content()

        except Exception:
            pass

    return posts


# ─── 메인 ────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("영재컴퓨터 카페 출고사진 크롤러 시작")
    print(f"시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    all_posts = []
    seen_urls = set()

    # ─── 1차: 네이버 Search API ──────────────────────────────
    print("\n[1단계] 네이버 Search API 시도...")
    if NAVER_CLIENT_ID and NAVER_CLIENT_SECRET:
        for query in SEARCH_QUERIES:
            items = fetch_via_naver_api(query, display=20)
            posts = process_api_items(items)
            for post in posts:
                if post["url"] not in seen_urls:
                    seen_urls.add(post["url"])
                    all_posts.append(post)
            time.sleep(0.5)

        print(f"  -> API로 {len(all_posts)}개 수집")
    else:
        print("  -> API 키 미설정, 스킵")

    # ─── 2차: Selenium 폴백 ──────────────────────────────────
    if len(all_posts) < 5 and SELENIUM_AVAILABLE:
        print("\n[2단계] Selenium 폴백 크롤링 시작...")
        driver = None
        try:
            driver = create_driver()
            logged_in = naver_login(driver)

            if not logged_in:
                print("  -> 비로그인 상태로 공개 게시판 접근 시도")

            selenium_posts = crawl_cafe_via_selenium(driver)
            for post in selenium_posts:
                if post["url"] not in seen_urls:
                    seen_urls.add(post["url"])
                    all_posts.append(post)

            print(f"  -> Selenium으로 추가 수집: {len(selenium_posts)}개")

            # 썸네일 보완
            if driver and all_posts:
                print("  -> 썸네일 보완 중...")
                all_posts = enrich_thumbnail(all_posts, driver)

        except Exception as e:
            print(f"  [ERROR] Selenium 폴백 실패: {e}")
        finally:
            if driver:
                driver.quit()

    # ─── ID 재부여 ───────────────────────────────────────────
    for i, post in enumerate(all_posts, 1):
        post["id"] = str(i)

    # ─── 결과 저장 ───────────────────────────────────────────
    print(f"\n[INFO] 총 {len(all_posts)}개 게시글 수집 완료")

    kst = timezone(timedelta(hours=9))
    now_kst = datetime.now(kst).isoformat()

    output = {
        "last_updated": now_kst,
        "_note": "이 파일은 crawl_cafe.py에 의해 6시간마다 자동 갱신됩니다.",
        "posts": all_posts[:MAX_CAFE_POSTS]
    }

    Path(OUTPUT_CAFE).parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_CAFE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[OK] 저장 완료: {OUTPUT_CAFE}")
    print(f"[INFO] 완료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
