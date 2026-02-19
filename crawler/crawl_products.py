"""
crawl_products.py - 영재컴퓨터 조립PC 제품 크롤러
Selenium + BeautifulSoup4를 사용해 제품 목록과 스펙을 수집합니다.

실행 방법:
    cd crawler
    python crawl_products.py

환경변수:
    없음 (제품 크롤링은 로그인 불필요)
"""

import json
import math
import re
import time
import traceback
from datetime import datetime, timezone, timedelta
from pathlib import Path

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
    print("[WARNING] Selenium을 불러올 수 없습니다. requests 기반으로 대체합니다.")

from config import (
    SHOP_URL, BASE_URL, CATEGORY_TARGETS,
    GAME_KEYWORD_MAP, GPU_TIER_MAP, PRICE_RANGES,
    CASE_WHITE_KEYWORDS, CASE_BLACK_KEYWORDS,
    EXCLUDE_KEYWORDS, MAX_PRODUCTS_PER_CATEGORY,
    OUTPUT_PRODUCTS, REQUEST_DELAY, ITEM_DELAY
)


# ─── 드라이버 초기화 ─────────────────────────────────────────
def create_driver():
    """헤드리스 Chrome 드라이버 생성"""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    )

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"}
    )
    return driver


# ─── requests 폴백 세션 ──────────────────────────────────────
def create_session():
    """requests 세션 생성 (Selenium 폴백용)"""
    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/121.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "ko-KR,ko;q=0.9",
    })
    return session


# ─── 가격 파싱 ───────────────────────────────────────────────
def parse_price(text):
    """
    가격 텍스트를 정수 원화로 변환
    "2,159,000원" -> 2159000
    "215만원" -> 2150000
    """
    if not text:
        return 0
    text = str(text).replace(",", "").replace(" ", "").strip()
    # 만원 단위 처리
    man_match = re.search(r"(\d+(?:\.\d+)?)만원?", text)
    if man_match:
        return int(float(man_match.group(1)) * 10_000)
    # 원 단위
    won_match = re.search(r"(\d+)원?", text)
    if won_match:
        return int(won_match.group(1))
    return 0


def format_price_display(price_won):
    """원화를 '1만원 단위 절삭' 표시 문자열로 변환 (예: 2159000 -> "215만 원")"""
    if price_won <= 0:
        return "가격 문의"
    man = math.floor(price_won / 10_000)
    if man >= 100:
        eok = man // 100
        remain = man % 100
        if remain == 0:
            return f"{eok}억 원"
        return f"{eok}억 {remain}만 원"
    return f"{man}만 원"


# ─── 스펙 파싱 ───────────────────────────────────────────────
def parse_spec_table(soup):
    """
    상품 페이지의 스펙 테이블 파싱
    영재컴퓨터 구조: <table>의 <th>부품명</th><td>제품명</td>
    """
    specs = {}
    component_map = {
        "CPU": "cpu",
        "메인보드": "mainboard",
        "RAM": "ram",
        "메모리": "ram",
        "VGA": "gpu",
        "그래픽카드": "gpu",
        "SSD": "ssd",
        "HDD": "hdd",
        "케이스": "case",
        "파워": "power",
        "쿨러": "cooler",
        "쿨러/튜닝": "cooler",
        "S/W": "os",
    }

    # 옵션 선택 테이블 파싱
    tables = soup.select("table.tbl_spec, table.goods_spec, .item_spec table")
    if not tables:
        tables = soup.find_all("table")

    for table in tables:
        rows = table.find_all("tr")
        for row in rows:
            th = row.find("th")
            td = row.find("td")
            if not th or not td:
                continue
            key = th.get_text(strip=True)
            for k, v in component_map.items():
                if k in key:
                    # 첫 번째 옵션 (기본 사양) 추출
                    value_text = td.get_text(separator=" ", strip=True)
                    # "기본사양" 레이블 제거
                    value_text = re.sub(r"-기본사양-|-기본-", "", value_text).strip()
                    # 첫 줄만 사용
                    value_text = value_text.split("\n")[0].split("  ")[0].strip()
                    if value_text and v not in specs:
                        specs[v] = value_text
                    break

    # 섹션 기반 파싱 (대안)
    if not specs.get("cpu"):
        for section in soup.select(".item_option_wrap, .goods_option"):
            label_el = section.select_one(".item_option_title, .option_name")
            value_el = section.select_one(".item_option_input, .option_value")
            if label_el and value_el:
                label = label_el.get_text(strip=True)
                value = value_el.get_text(strip=True)
                for k, v in component_map.items():
                    if k in label and v not in specs:
                        specs[v] = value.split("\n")[0].strip()
                        break

    return specs


def extract_short_name(full_name, component_type):
    """긴 부품명에서 핵심 모델명 추출"""
    if not full_name:
        return full_name

    if component_type == "cpu":
        patterns = [
            r"((?:AMD|인텔)\s+(?:라이젠[0-9X-]+|코어i[0-9]-[0-9]+[A-Z]*|Ryzen\s+[0-9X]+\s+[0-9]+X?(?:3D)?))",
            r"((?:i[0-9]-[0-9]+[A-Z]*|R[0-9]\s+[0-9]+[A-Z]*))"
        ]
        for p in patterns:
            m = re.search(p, full_name)
            if m:
                return m.group(1).strip()

    elif component_type == "gpu":
        patterns = [
            r"(RTX\s+[0-9]+(?:\s+Ti)?(?:\s+Super)?(?:\s+SUPER)?)",
            r"(RX\s+[0-9]+\s*(?:XT|XTX)?)",
            r"(GTX\s+[0-9]+(?:\s+Ti)?(?:\s+Super)?)",
        ]
        for p in patterns:
            m = re.search(p, full_name, re.IGNORECASE)
            if m:
                return m.group(1).strip()

    return full_name


def extract_gpu_key(gpu_name):
    """GPU 이름에서 FPS 참조 키 추출"""
    if not gpu_name:
        return None
    patterns = [
        r"(RTX\s+[0-9]+\s*(?:Ti\s+Super|Ti|Super|SUPER)?)",
        r"(RX\s+[0-9]+\s*(?:XTX|XT)?)",
    ]
    for p in patterns:
        m = re.search(p, gpu_name, re.IGNORECASE)
        if m:
            key = re.sub(r"\s+", " ", m.group(1)).strip()
            # 대소문자 정규화
            key = re.sub(r"super", "Super", key, flags=re.IGNORECASE)
            key = re.sub(r"\bTI\b", "Ti", key)
            return key
    return None


# ─── 카테고리 분류 ───────────────────────────────────────────
def detect_games(name, cat_games):
    """상품명에서 게임 태그 감지"""
    detected = set(cat_games)  # 카테고리에서 기본 게임 태그
    name_upper = name.upper()

    for game, keywords in GAME_KEYWORD_MAP.items():
        for kw in keywords:
            if kw.upper() in name_upper:
                detected.add(game)
                break

    return sorted(detected)


def detect_tier(gpu_name):
    """GPU 이름으로 사양 티어 판단"""
    if not gpu_name:
        return "가성비(FHD)"

    for tier, gpu_list in GPU_TIER_MAP.items():
        for gpu_pattern in gpu_list:
            if gpu_pattern.upper() in gpu_name.upper():
                return tier

    return "가성비(FHD)"


def detect_price_range(price):
    """가격으로 가격대 판단"""
    for label, (min_p, max_p) in PRICE_RANGES.items():
        if min_p <= price < max_p:
            return label
    return "300만 원 이상"


def detect_case_color(case_name):
    """케이스명으로 색상 판단"""
    if not case_name:
        return "블랙"
    for kw in CASE_WHITE_KEYWORDS:
        if kw in case_name:
            return "화이트"
    return "블랙"


def detect_usage(cat_usage, specs):
    """카테고리 + GPU 스펙으로 용도 감지"""
    usage = set(cat_usage)
    gpu = specs.get("gpu", "")
    ram = specs.get("ram", "")

    # RAM 용량으로 영상편집/AI 감지
    ram_match = re.search(r"(\d+)\s*GB", ram, re.IGNORECASE)
    if ram_match:
        ram_gb = int(ram_match.group(1))
        if ram_gb >= 64:
            usage.add("영상편집")
        if ram_gb >= 128:
            usage.add("AI/딥러닝")

    # 고티어 GPU
    tier = detect_tier(gpu)
    if tier == "하이엔드(4K)":
        usage.add("영상편집")

    # 기본 게이밍 추가
    if not usage or usage == {"영상편집"}:
        usage.add("게이밍")

    return sorted(usage)


def is_out_of_stock(soup):
    """품절 여부 감지"""
    text = soup.get_text()
    oos_keywords = ["품절", "일시품절", "재고없음", "out of stock", "sold out"]
    return any(kw in text.lower() for kw in oos_keywords)


# ─── 상품 목록 크롤링 ────────────────────────────────────────
def crawl_product_list(driver_or_session, url, use_selenium=True):
    """카테고리 페이지에서 상품 링크 목록 수집"""
    items = []

    try:
        if use_selenium:
            driver_or_session.get(url)
            time.sleep(REQUEST_DELAY)
            html = driver_or_session.page_source
        else:
            resp = driver_or_session.get(url, timeout=15)
            resp.encoding = "utf-8"
            html = resp.text

        soup = BeautifulSoup(html, "html.parser")

        # 상품 링크 찾기 (영재컴퓨터 구조)
        # /shop/item.php?it_id=XXXXXXXX 패턴
        for a_tag in soup.select("a[href*='/shop/item.php?it_id=']"):
            href = a_tag.get("href", "")
            if "/shop/item.php?it_id=" not in href:
                continue

            # 중복 제거
            if href.startswith("http"):
                full_url = href
            else:
                full_url = BASE_URL + href

            it_id_match = re.search(r"it_id=(\d+)", full_url)
            if not it_id_match:
                continue

            it_id = it_id_match.group(1)
            if not any(item["id"] == it_id for item in items):
                # 간단한 이름 추출
                name = a_tag.get_text(strip=True) or ""
                # 배제 키워드 필터링
                if any(kw in name for kw in EXCLUDE_KEYWORDS):
                    continue
                if len(name) < 3:
                    continue

                items.append({"id": it_id, "url": full_url, "name": name})

        print(f"  [목록] {url} -> {len(items)}개 상품 발견")

    except Exception as e:
        print(f"  [ERROR] 목록 크롤링 실패 ({url}): {e}")

    return items[:MAX_PRODUCTS_PER_CATEGORY]


# ─── 상품 상세 크롤링 ────────────────────────────────────────
def crawl_product_detail(driver_or_session, product_info, category, use_selenium=True):
    """
    개별 상품 페이지에서 스펙, 가격, 재고 정보 수집
    """
    url = product_info["url"]
    it_id = product_info["id"]

    try:
        if use_selenium:
            driver_or_session.get(url)
            time.sleep(ITEM_DELAY)
            html = driver_or_session.page_source
        else:
            resp = driver_or_session.get(url, timeout=15)
            resp.encoding = "utf-8"
            html = resp.text
            time.sleep(ITEM_DELAY)

        soup = BeautifulSoup(html, "html.parser")

        # 품절 확인
        if is_out_of_stock(soup):
            print(f"    [SKIP] 품절: {product_info['name'][:40]}")
            return None

        # 상품명 추출
        name_el = soup.select_one("h2.goods_name, h1.goods_name, .it_name, #goods_name")
        name = name_el.get_text(strip=True) if name_el else product_info["name"]
        if not name:
            name = product_info["name"]

        # 배제 키워드
        if any(kw in name for kw in EXCLUDE_KEYWORDS):
            return None

        # 가격 추출
        price = 0
        price_selectors = [
            "strong.goods_price", ".it_price", "#goods_price",
            ".price_wrap strong", "span.sell_price", ".price"
        ]
        for sel in price_selectors:
            el = soup.select_one(sel)
            if el:
                price_text = el.get_text(strip=True)
                price = parse_price(price_text)
                if price > 0:
                    break

        if price <= 0:
            # 페이지 텍스트에서 가격 패턴 검색
            price_match = re.search(r"판매가[^\d]*([0-9,]+)원", soup.get_text())
            if price_match:
                price = parse_price(price_match.group(1))

        # 썸네일 추출
        thumbnail = ""
        img_selectors = [
            "div.it_img_wrap img", ".goods_img img", "#goods_thumb img",
            ".main_image img", "img.it_thumb"
        ]
        for sel in img_selectors:
            el = soup.select_one(sel)
            if el:
                src = el.get("src", "") or el.get("data-src", "")
                if src and not src.startswith("data:"):
                    thumbnail = src if src.startswith("http") else BASE_URL + src
                    break

        # 스펙 테이블 파싱
        specs = parse_spec_table(soup)

        # GPU 정보로 각종 분류 수행
        gpu_full = specs.get("gpu", "")
        gpu_short = extract_short_name(gpu_full, "gpu")
        gpu_key = extract_gpu_key(gpu_full)

        cpu_full = specs.get("cpu", "")
        cpu_short = extract_short_name(cpu_full, "cpu")

        tier = detect_tier(gpu_full)
        price_range = detect_price_range(price)
        games = detect_games(name, category.get("games", []))
        usage = detect_usage(category.get("usage", ["게이밍"]), specs)
        case_color = detect_case_color(specs.get("case", ""))

        # 스펙 딕셔너리 완성
        specs_clean = {
            "cpu": cpu_full,
            "cpu_short": cpu_short,
            "gpu": gpu_full,
            "gpu_short": gpu_short,
            "gpu_key": gpu_key,
            "ram": specs.get("ram", ""),
            "ssd": specs.get("ssd", ""),
            "mainboard": specs.get("mainboard", ""),
            "power": specs.get("power", ""),
            "case": specs.get("case", ""),
            "cooler": specs.get("cooler", ""),
        }

        product = {
            "id": it_id,
            "name": name,
            "subtitle": f"{tier} · {', '.join(games[:2]) if games else '범용'}",
            "url": url,
            "thumbnail": thumbnail,
            "price": price,
            "price_display": format_price_display(price),
            "in_stock": True,
            "specs": specs_clean,
            "categories": {
                "games": games,
                "tier": tier,
                "price_range": price_range,
                "usage": usage,
            },
            "case_color": case_color,
            "badge": None,
            "badge_color": "blue",
        }

        # 자동 배지 부여
        if "AI/딥러닝" in usage:
            product["badge"] = "AI 전문가용"
            product["badge_color"] = "cyan"
        elif tier == "하이엔드(4K)" and price >= 3_000_000:
            product["badge"] = "하이엔드"
            product["badge_color"] = "gold"
        elif tier == "가성비(FHD)" and price <= 1_000_000:
            product["badge"] = "가성비"
            product["badge_color"] = "green"
        elif case_color == "화이트":
            product["badge"] = "화이트 감성"
            product["badge_color"] = "white"

        print(f"    [OK] {name[:50]} - {format_price_display(price)} ({tier})")
        return product

    except Exception as e:
        print(f"    [ERROR] 상품 상세 실패 ({url}): {e}")
        traceback.print_exc()
        return None


# ─── 메인 크롤러 ─────────────────────────────────────────────
def main():
    print("=" * 60)
    print("영재컴퓨터 제품 크롤러 시작")
    print(f"시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    all_products = {}  # id -> product (중복 방지)
    use_selenium = SELENIUM_AVAILABLE

    driver = None
    session = None

    try:
        if use_selenium:
            print("[INFO] Selenium 드라이버 초기화 중...")
            driver = create_driver()
            crawler = driver
        else:
            print("[INFO] requests 세션 초기화 중...")
            session = create_session()
            crawler = session

        for i, category in enumerate(CATEGORY_TARGETS, 1):
            print(f"\n[{i}/{len(CATEGORY_TARGETS)}] 카테고리: {category['name']}")

            # 상품 목록 수집
            items = crawl_product_list(crawler, category["url"], use_selenium)

            # 각 상품 상세 수집
            for item in items:
                if item["id"] in all_products:
                    print(f"    [DUP] 이미 수집된 상품: {item['id']}")
                    continue

                product = crawl_product_detail(crawler, item, category, use_selenium)
                if product:
                    all_products[product["id"]] = product

            print(f"  -> 현재까지 총 {len(all_products)}개 수집")
            time.sleep(REQUEST_DELAY)

    except KeyboardInterrupt:
        print("\n[INFO] 사용자 중단")
    except Exception as e:
        print(f"\n[ERROR] 크롤링 오류: {e}")
        traceback.print_exc()
    finally:
        if driver:
            driver.quit()

    # ─── 결과 저장 ──────────────────────────────────────────
    products_list = list(all_products.values())
    print(f"\n[INFO] 총 {len(products_list)}개 제품 수집 완료")

    kst = timezone(timedelta(hours=9))
    now_kst = datetime.now(kst).isoformat()

    output = {
        "last_updated": now_kst,
        "_note": "이 파일은 crawl_products.py에 의해 자동 생성됩니다.",
        "products": products_list
    }

    # 출력 디렉토리 생성
    Path(OUTPUT_PRODUCTS).parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_PRODUCTS, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[OK] 저장 완료: {OUTPUT_PRODUCTS}")
    print(f"[INFO] 완료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
