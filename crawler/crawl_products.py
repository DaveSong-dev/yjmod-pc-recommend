"""
crawl_products.py - 영재컴퓨터 조립PC 제품 크롤러 (v2)

전략:
  1. Selenium + 네트워크 로그로 카테고리 페이지 로딩 시 요청되는
     admin.youngjaecomputer.com/data/item/{it_id}_m URL에서 제품 ID 추출
  2. requests + BeautifulSoup으로 각 제품 상세 페이지 파싱
  3. 스펙 테이블에서 CPU/GPU/RAM/SSD/케이스/파워/쿨러 추출
  4. 0건 수집 시 기존 데이터 보존

실행:
    cd crawler
    python crawl_products.py
"""

import json
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
    from webdriver_manager.chrome import ChromeDriverManager
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("[WARNING] Selenium 없음. requests 대체 모드로 실행.")

from config import (
    BASE_URL, OUTPUT_PRODUCTS, REQUEST_DELAY,
    GPU_TIER_MAP, PRICE_RANGES, GAME_KEYWORD_MAP,
    CASE_WHITE_KEYWORDS, CASE_BLACK_KEYWORDS, EXCLUDE_KEYWORDS,
    MAX_PRODUCTS_PER_CATEGORY,
)

# ─── 카테고리 정의 (실제 사이트 URL 기반, 2026-02 검증) ─────────
CATEGORIES = [
    {"name": "영상편집",        "vi": "201", "idx": "4",  "games": [], "usage": ["영상편집"]},
    {"name": "사무디자인",      "vi": "263", "idx": "12", "games": [], "usage": ["사무/디자인"]},
    {"name": "AI딥러닝",        "vi": "339", "idx": "9",  "games": [], "usage": ["AI/딥러닝"]},
    {"name": "배틀그라운드",    "vi": "367", "idx": "13", "games": ["배틀그라운드"], "usage": ["게이밍"]},
    {"name": "로스트아크",      "vi": "368", "idx": "13", "games": ["로스트아크"], "usage": ["게이밍"]},
    {"name": "오버워치2",       "vi": "369", "idx": "11", "games": ["오버워치2"], "usage": ["게이밍"]},
    {"name": "발로란트",        "vi": "372", "idx": "3",  "games": ["발로란트"], "usage": ["게이밍"]},
]

# ─── Installment 페이지 (GET 요청, 할부 상품) ─────────────────
INSTALLMENT_CODES = [
    "XWSGRHSB", "RXEQEFVT", "ZFHRVLQE", "ZQLRBYYG", "RVFAGNRG",
    "TSBWBCPA", "DQGENQXF", "XUWRWZWI", "MOKDMTDE", "GBEXFFLS",
    "YWTRTBNR", "WSXJKDYL", "DEGBNTDM", "SZRFHRLH", "ACQCNPCI",
    "MEEIRBEI", "ZASXQQPC", "KPRNMEXN", "EVBIIAEY", "NZXSOMST",
    "FSNLAFFF", "CEOACDEV",
]

# ─── Recommend 페이지 (POST 요청, stock=0 필수) ───────────────
RECOMMEND_PAGES = [
    {"name": "ASUS",          "vi": "376", "idx": "5", "usage": ["게이밍"], "games": []},
    {"name": "MSI",           "vi": "377", "idx": "5", "usage": ["게이밍"], "games": []},
    {"name": "CORSAIR",       "vi": "378", "idx": "5", "usage": ["게이밍"], "games": []},
    {"name": "LIAN LI",       "vi": "379", "idx": "5", "usage": ["게이밍"], "games": []},
    {"name": "COOLER MASTER", "vi": "380", "idx": "5", "usage": ["게이밍"], "games": []},
    {"name": "기타 브랜드",    "vi": "381", "idx": "5", "usage": ["게이밍"], "games": []},
    {"name": "방송·스트리밍",  "vi": "372", "idx": "3", "usage": ["방송/스트리밍"], "games": []},
]

SHOP_BASE = f"{BASE_URL}/shop"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
}


def safe_print(msg):
    """Windows cp949 콘솔에서도 깨지지 않도록 안전 출력"""
    try:
        print(msg)
    except UnicodeEncodeError:
        sanitized = msg.encode("cp949", errors="replace").decode("cp949", errors="replace")
        print(sanitized)


def parse_list_targets_from_html(html):
    """HTML 내부 list.php 링크에서 카테고리 타겟 후보 추출"""
    targets = {}

    # h0 + vi/index 형태
    for vi, idx in re.findall(r"list\.php\?ca_id=h0&ca_id_vi=(\d+)&ca_id_index=(\d+)", html):
        key = f"vi:{vi}:{idx}"
        if key not in targets:
            targets[key] = {
                "name": f"AUTO_{vi}_{idx}",
                "vi": vi,
                "idx": idx,
                "games": [],
                "usage": [],
            }

    return targets


def discover_dynamic_categories(session):
    """메뉴/카테고리 페이지에서 동적 카테고리를 폭넓게 자동 추출"""
    seeds = [
        f"{BASE_URL}/",
        f"{SHOP_BASE}/",
        f"{SHOP_BASE}/list.php?ca_id=h0",
        f"{SHOP_BASE}/list.php?ca_id=h0&ca_id_vi=339&ca_id_index=9",
        f"{SHOP_BASE}/list.php?ca_id=h0&ca_id_vi=367&ca_id_index=13",
        f"{SHOP_BASE}/list.php?ca_id=h0&ca_id_vi=201&ca_id_index=4",
    ]
    all_targets = {}

    for seed in seeds:
        try:
            resp = session.get(seed, timeout=15)
            resp.encoding = "utf-8"
            html = resp.text
        except Exception:
            continue
        all_targets.update(parse_list_targets_from_html(html))

    # 2차 확장: 1차에서 찾은 카테고리 페이지를 다시 읽어 링크 확장
    first_pass = list(all_targets.values())
    for cat in first_pass:
        if cat.get("ca_id"):
            url = f"{SHOP_BASE}/list.php?ca_id={cat['ca_id']}"
        else:
            url = f"{SHOP_BASE}/list.php?ca_id=h0&ca_id_vi={cat['vi']}&ca_id_index={cat['idx']}"
        try:
            resp = session.get(url, timeout=15)
            resp.encoding = "utf-8"
            all_targets.update(parse_list_targets_from_html(resp.text))
        except Exception:
            continue

    return list(all_targets.values())


def collect_main_page_item_ids(session):
    """메인/샵 메인에 노출된 상품 ID 수집"""
    item_ids = set()
    pages = [
        f"{BASE_URL}/",
        f"{SHOP_BASE}/",
        f"{SHOP_BASE}/list.php?ca_id=h0",
    ]
    for url in pages:
        try:
            resp = session.get(url, timeout=15)
            resp.encoding = "utf-8"
            html = resp.text
        except Exception:
            continue
        item_ids.update(re.findall(r"item\.php\?it_id=(\d+)", html))
        item_ids.update(re.findall(r"/data/item/(\d+)_", html))
        item_ids.update(re.findall(r"go_item\(['\"](\d+)['\"]\)", html))
    return list(item_ids)


def collect_installment_item_ids(session):
    """Installment 페이지(GET)에서 상품 ID 수집 (할부 상품)"""
    item_ids = set()
    safe_print(f"\n[Installment] {len(INSTALLMENT_CODES)}개 페이지 수집 시작")
    for code in INSTALLMENT_CODES:
        url = f"{SHOP_BASE}/Installment.php?ImCode={code}"
        try:
            resp = session.get(url, timeout=15)
            resp.encoding = "utf-8"
            html = resp.text
            ids = set(re.findall(r"go_item\(['\"](\d+)['\"]\)", html))
            ids.update(re.findall(r"item\.php\?it_id=(\d+)", html))
            ids.update(re.findall(r"/data/item/(\d+)_", html))
            item_ids.update(ids)
            if ids:
                safe_print(f"  {code}: {len(ids)}개")
        except Exception as e:
            safe_print(f"  [ERROR] {code}: {e}")
        time.sleep(1.0)
    safe_print(f"[Installment] 총 {len(item_ids)}개 고유 ID 수집")
    return item_ids


def collect_recommend_item_ids(session):
    """Recommend 페이지(POST, stock=0)에서 상품 ID + 카테고리 수집"""
    results = {}
    safe_print(f"\n[Recommend] {len(RECOMMEND_PAGES)}개 페이지 수집 시작")
    for page in RECOMMEND_PAGES:
        url = (
            f"{SHOP_BASE}/recommendPC.php"
            f"?ca_id=h0&ca_id_vi={page['vi']}&ca_id_index={page['idx']}"
        )
        try:
            resp = session.post(
                url,
                data={"ca_id": "h0", "stock": "0", "s_order": "best"},
                timeout=15,
            )
            resp.encoding = "utf-8"
            html = resp.text
            ids = set(re.findall(r"go_item\(['\"](\d+)['\"]\)", html))
            ids.update(re.findall(r"item\.php\?it_id=(\d+)", html))
            ids.update(re.findall(r"/data/item/(\d+)_", html))
            for item_id in ids:
                if item_id not in results:
                    results[item_id] = {
                        "name": page["name"],
                        "games": page.get("games", []),
                        "usage": page.get("usage", []),
                    }
            safe_print(f"  {page['name']}: {len(ids)}개")
        except Exception as e:
            safe_print(f"  [ERROR] {page['name']}: {e}")
        time.sleep(1.0)
    safe_print(f"[Recommend] 총 {len(results)}개 고유 ID 수집")
    return results


# ─── Selenium 드라이버 ──────────────────────────────────────────
def create_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument(f"--user-agent={HEADERS['User-Agent']}")
    options.set_capability("goog:loggingPrefs", {"performance": "ALL"})
    return webdriver.Chrome(
        service=Service(ChromeDriverManager().install()), options=options
    )


# ─── 카테고리 페이지에서 제품 ID 추출 ──────────────────────────
def get_item_ids_from_category(driver, category):
    """카테고리 목록 페이지를 순회하며 제품 ID를 최대치까지 수집"""
    if category.get("ca_id"):
        base = f"{SHOP_BASE}/list.php?ca_id={category['ca_id']}"
    else:
        base = (
            f"{SHOP_BASE}/list.php"
            f"?ca_id=h0&ca_id_vi={category['vi']}&ca_id_index={category['idx']}"
        )
    print(f"  카테고리 로딩: {base}")

    item_ids = set()
    max_pages = 20
    no_new_streak = 0

    for page in range(1, max_pages + 1):
        page_url = f"{base}&page={page}"
        driver.get(page_url)
        time.sleep(2.2)

        before = len(item_ids)

        # 1) 네트워크 로그에서 item ID 추출
        try:
            logs = driver.get_log("performance")
            for log in logs:
                try:
                    msg = json.loads(log["message"])["message"]
                    if msg.get("method") == "Network.requestWillBeSent":
                        req_url = msg["params"]["request"]["url"]
                        m = re.search(r"admin\.youngjaecomputer\.com/data/item/(\d+)_", req_url)
                        if m:
                            item_ids.add(m.group(1))
                except Exception:
                    pass
        except Exception:
            pass

        # 2) DOM에서 item.php?it_id= 패턴 추출(신뢰도 높음)
        try:
            src = driver.page_source
            dom_ids = re.findall(r"item\.php\?it_id=(\d+)", src)
            item_ids.update(dom_ids)
        except Exception:
            pass

        added = len(item_ids) - before
        print(f"    - page={page}: +{added} (누적 {len(item_ids)})")

        if len(item_ids) >= MAX_PRODUCTS_PER_CATEGORY:
            break

        if added == 0:
            no_new_streak += 1
        else:
            no_new_streak = 0

        # 연속 2페이지 동안 신규 ID가 없으면 종료
        if no_new_streak >= 2:
            break

    return list(item_ids)[:MAX_PRODUCTS_PER_CATEGORY]


# ─── 가격 파싱 ─────────────────────────────────────────────────
def parse_price(text):
    nums = re.findall(r"[\d,]+", text.replace(" ", ""))
    for n in nums:
        val = int(n.replace(",", ""))
        if val >= 100_000:
            return val
    return 0


def format_price_display(won):
    man = won // 10_000
    if man >= 10_000:  # 1억 = 10,000만
        eok = man // 10_000
        rem = man % 10_000
        return f"{eok}억 {rem}만 원" if rem else f"{eok}억 원"
    return f"{man}만 원"


# ─── GPU 티어 분류 ─────────────────────────────────────────────
def classify_tier(gpu_text):
    gpu_upper = gpu_text.upper()
    for tier, keywords in GPU_TIER_MAP.items():
        for kw in keywords:
            if kw.upper() in gpu_upper:
                return tier
    return "가성비(FHD)"


# ─── 가격대 분류 ───────────────────────────────────────────────
def classify_price_range(price):
    for label, (lo, hi) in PRICE_RANGES.items():
        if lo <= price < hi:
            return label
    return "300만 원 이상"


# ─── 케이스 색상 ───────────────────────────────────────────────
def detect_case_color(text):
    t = text.upper()
    for kw in CASE_WHITE_KEYWORDS:
        if kw.upper() in t:
            return "화이트"
    for kw in CASE_BLACK_KEYWORDS:
        if kw.upper() in t:
            return "블랙"
    return "블랙"


# ─── 상세페이지에서 FPS/프레임 문맥으로 게임 추가 (필터 중복 노출용) ─
# "게임명 + 숫자 + FPS" 또는 "숫자 FPS + 게임명" 이 있으면 해당 게임으로도 필터에 노출
_FPS_NUMBER_PATTERN = re.compile(r"\d{2,4}\s*(?:FPS|프레임|fps)", re.I)
_WINDOW = 80  # 게임 키워드 전후 몇 글자 안에 FPS 숫자가 있으면 동일 문맥으로 봄


def extract_games_from_fps_section(page_text):
    """상세 페이지 본문에서 '게임 키워드 + FPS/프레임' 문맥이 있는 게임명을 수집."""
    if not page_text or len(page_text) < 20:
        return set()
    found = set()
    text_lower = page_text.lower()
    for game, keywords in GAME_KEYWORD_MAP.items():
        for kw in keywords:
            start = 0
            while True:
                pos = text_lower.find(kw.lower(), start)
                if pos < 0:
                    break
                # 키워드 전후 WINDOW 글자 안에 FPS 숫자 패턴이 있는지
                window_start = max(0, pos - _WINDOW)
                window_end = min(len(page_text), pos + len(kw) + _WINDOW)
                window = page_text[window_start:window_end]
                if _FPS_NUMBER_PATTERN.search(window):
                    found.add(game)
                    break
                start = pos + 1
    return found


# ─── 게임 태그 추출 ────────────────────────────────────────────
def extract_game_tags(name, detail_text, category_games, full_page_text=None):
    tags = set(category_games)
    combined = (name + " " + detail_text).upper()
    for game, keywords in GAME_KEYWORD_MAP.items():
        for kw in keywords:
            if kw.upper() in combined:
                tags.add(game)
    # 상세페이지 전체에서 FPS/프레임 문맥이 있는 게임 추가 (필터에서 중복 노출)
    fps_text = full_page_text if full_page_text is not None else detail_text
    tags |= extract_games_from_fps_section(fps_text)
    # 게이밍 PC면 기본 게임 목록 부여
    if not tags and any(
        kw in combined
        for kw in ["게임", "GAMING", "GAME", "RTX", "RX 7", "RX 9"]
    ):
        tags = {"리그오브레전드", "배틀그라운드", "로스트아크", "발로란트", "오버워치2"}
    return sorted(tags)


# ─── 용도 분류 ─────────────────────────────────────────────────
def classify_usage(name, category_usage, tier):
    usage = set(category_usage)
    name_up = name.upper()
    if "영상편집" in name or "편집" in name:
        usage.add("영상편집")
    if "AI" in name_up or "딥러닝" in name or "머신러닝" in name:
        usage.add("AI/딥러닝")
    if "사무" in name or "디자인" in name or "오피스" in name:
        usage.add("사무/디자인")
    if not usage or tier in ("퍼포먼스(QHD)", "하이엔드(4K)"):
        usage.add("게이밍")
    return sorted(usage)


# ─── 상품명에서 짧은 CPU/GPU 이름 추출 ────────────────────────
def short_cpu(cpu_full):
    """AMD/인텔 CPU 전체 이름 → 짧은 모델명
    예) AMD 라이젠5-6세대 9600X (그래나이트) → R5 9600X
        코어 아이i5-14세대 14400F (이스트록) → i5-14400F
    """
    cpu = cpu_full.upper()

    # AMD 라이젠
    if "라이젠" in cpu_full or "RYZEN" in cpu:
        # "라이젠7-6세대 9800X3D" → 세대 숫자를 건너뛰고 모델 번호 추출
        m = re.search(r"라이젠\s*(\d+).*?(\d{4,5}(?:X3D|X|G|GE|GT)?)", cpu_full, re.I)
        if m:
            return f"R{m.group(1)} {m.group(2)}"

    # 인텔 코어 (한국어 표기: "코어 아이i5-14세대 14400F")
    if "코어" in cpu_full or "CORE" in cpu or "INTEL" in cpu:
        # 한국어: "코어 아이i5-14세대 14400F" 형식
        m = re.search(r"i(\d)-\d+세대\s*(\d{4,5}[A-Za-z]{0,3})", cpu_full, re.I)
        if m:
            return f"i{m.group(1)}-{m.group(2)}"
        # 영문: "Core i7-14700KF" 형식
        m = re.search(r"(i\d-\d{4,5}[A-Za-z]{0,3})", cpu_full, re.I)
        if m:
            return m.group(1)
        # 숫자 모델만 있는 경우 (14400, 13400F 등)
        m = re.search(r"\b(\d{4,5}[A-Za-z]{0,3})\b", cpu_full)
        if m and len(m.group(1)) >= 4:
            return f"i-{m.group(1)}"

    # 제온 (서버/워크스테이션)
    if "제온" in cpu_full or "XEON" in cpu:
        m = re.search(r"[Ww]\d[-\s]\d{4,5}[A-Za-z]*", cpu_full)
        if m:
            return f"Xeon {m.group(0)}"

    # AMD 스레드리퍼
    if "스레드리퍼" in cpu_full or "THREADRIPPER" in cpu:
        m = re.search(r"(\d{4,5}[A-Za-z]*)", cpu_full)
        if m:
            return f"TR {m.group(1)}"

    return cpu_full[:12].strip()


def short_gpu(gpu_full):
    """GPU 전체 이름 → 짧은 모델명
    예) INNO3D 지포스 RTX 5070 OC D7 → RTX 5070
        SAPPHIRE 라데온 RX 7600 PULSE → RX 7600
    """
    # NVIDIA GeForce (RTX/GTX)
    m = re.search(r"(RTX\s*\d{4}(?:\s*(?:Ti\s*Super|Ti|Super|SUPER))?)", gpu_full, re.I)
    if m:
        return re.sub(r"\s+", " ", m.group(1)).strip().upper()
    m = re.search(r"(GTX\s*\d{4}(?:\s*(?:Ti|Super|SUPER))?)", gpu_full, re.I)
    if m:
        return re.sub(r"\s+", " ", m.group(1)).strip().upper()
    # AMD Radeon (RX)
    m = re.search(r"(RX\s*\d{4}(?:\s*(?:XT|XTX))?)", gpu_full, re.I)
    if m:
        return re.sub(r"\s+", " ", m.group(1)).strip().upper()
    # NVIDIA 전문가용 (RTX A-series, RTX 6000)
    m = re.search(r"(RTX\s*(?:A\d{3,4}|6000)[^,\s]*)", gpu_full, re.I)
    if m:
        return re.sub(r"\s+", " ", m.group(1)).strip()
    # 내장 그래픽 (iGPU)
    if "내장" in gpu_full or "iGPU" in gpu_full.upper():
        return "내장 그래픽"
    return gpu_full[:15]


def gpu_key(gpu_short):
    """RTX 5060 Ti → RTX 5060 Ti (정규화)"""
    return re.sub(r"\s+", " ", gpu_short).strip()


# ─── 상품 상세 파싱 ────────────────────────────────────────────
def parse_product_detail(item_id, category, session):
    url = f"{SHOP_BASE}/item.php?it_id={item_id}"
    soup = None
    final_url = url
    for _ in range(2):
        try:
            resp = session.get(url, timeout=15)
            resp.encoding = "utf-8"
            final_url = resp.url
            soup = BeautifulSoup(resp.text, "lxml")
            break
        except Exception as e:
            last_error = e
            time.sleep(0.6)
    if soup is None:
        print(f"    [ERROR] 페이지 로드 실패: {last_error}")
        return None

    # 리다이렉트로 다른 상품 페이지로 이동된 경우 → 품절로 간주
    if final_url != url and f"it_id={item_id}" not in final_url:
        print(f"    [품절] 리다이렉트 감지: {item_id} → {final_url[:80]}")
        return None

    # 페이지에 요청한 item_id가 포함되어 있는지 검증 (다른 상품으로 대체되었는지)
    page_html = resp.text if resp else ""
    if item_id not in page_html:
        print(f"    [품절] 상품ID 불일치: {item_id}")
        return None

    # ── 제목: <title> 태그 우선, h2 보조 ──
    name = ""
    if soup.title:
        raw_title = soup.title.get_text(strip=True)
        # "상품명 | 영재컴퓨터" 또는 "상품명 : 영재컴퓨터" 형식 처리
        name = raw_title.split("|")[0].strip()
        # ": 영재컴퓨터" 제거
        for suffix in [" : 영재컴퓨터", " - 영재컴퓨터", " | 영재컴퓨터"]:
            if name.endswith(suffix):
                name = name[: -len(suffix)].strip()

    if not name and soup.find("h2"):
        name = soup.find("h2").get_text(strip=True)

    if not name or len(name) < 3:
        print(f"    [SKIP] 제목 없음: {url}")
        return None

    # 제외 키워드
    for kw in EXCLUDE_KEYWORDS:
        if kw in name:
            return None

    # 품절 상품이 모니터/주변기기 페이지로 대체되는 경우 감지
    # PC 상품에는 CPU/GPU/조립/게이밍 등 키워드가 있어야 함
    PC_INDICATOR_KEYWORDS = [
        "PC", "조립", "게이밍", "워크스테이션", "딥러닝",
        "RTX", "RX ", "GTX", "5060", "5070", "5080", "5090",
        "9800X", "9950X", "9600X", "7800X", "7500F", "14400",
        "무이자", "할부", "브랜드", "견적", "사양",
    ]
    page_text_for_check = soup.get_text()
    name_upper = name.upper()
    has_pc_indicator = any(kw.upper() in name_upper or kw in page_text_for_check[:3000] for kw in PC_INDICATOR_KEYWORDS)
    if not has_pc_indicator:
        # 스펙 테이블에 CPU/VGA가 있는지 최종 확인
        has_spec_table = bool(soup.find(string=re.compile(r"CPU|VGA|RAM|SSD", re.I)))
        if not has_spec_table:
            print(f"    [SKIP] PC 아님 (모니터/주변기기): {name[:40]}")
            return None

    # ── 재고 판단 ──
    page_text = soup.get_text()

    # 1) h2가 정확히 "품절"이면 품절
    h2 = soup.find("h2")
    if h2 and h2.get_text(strip=True) == "품절":
        print(f"    [품절] {name[:40]}")
        return None

    # 2) 특정 품절 클래스 존재 시
    if soup.find(class_=re.compile(r"sold.?out|it_soldout", re.I)):
        print(f"    [품절] {name[:40]}")
        return None

    # 3) "재고확인" 배너만 품절 처리 (공통 문구 "재고 확인 완료"는 제외)
    # "재고확인" 뒤에 가격/숫자가 오는 경우(예: 재고확인 28-29만원)만 재고 미확정으로 간주
    if "재고확인" in page_text and re.search(r"재고확인\s*[\d~\-만원]", page_text):
        print(f"    [품절] 재고확인: {name[:40]}")
        return None

    # 4) 품절/재고없음 키워드가 본문에 있고, 구매 버튼이 없을 때만 품절 처리
    # ("품절 알림", "재고 확인 완료" 등 다른 맥락은 구매 버튼으로 재고 상품 구분)
    soldout_keywords = ["품절", "일시품절", "재고없음", "재고 없음", "sold out", "out of stock"]
    page_text_low = page_text.lower()
    if any(kw in page_text_low for kw in [k.lower() for k in soldout_keywords]):
        buy_btn = soup.find(string=re.compile(r"구매|바로구매|장바구니", re.I))
        if not buy_btn:
            print(f"    [품절] {name[:40]}")
            return None

    # 5) 가격 없음은 아래 파싱 단계에서 SKIP 처리

    # ── 스펙 파싱 (div 기반 → table 기반 순서로 시도) ──
    specs_raw = {}
    SPEC_KEYS = {"CPU", "RAM", "VGA", "SSD", "HDD", "케이스", "파워", "쿨러", "쿨러/튜닝", "메인보드", "S/W", "조립/AS", "조립"}

    # 1차: div 구조 파싱 (영재컴퓨터 실제 HTML 구조)
    # 네비게이션 메뉴의 div와 스펙 섹션의 div를 구분하기 위해
    # 값이 "[브랜드]모델명" 형식이거나 15자 이상인 경우만 유효한 스펙으로 처리
    for div in soup.find_all("div"):
        label = div.get_text(strip=True)
        if label in SPEC_KEYS:
            key = "쿨러" if "쿨러" in label else ("조립" if "조립" in label else label)
            if key in specs_raw:
                continue
            # 다음 형제 div에서 값 추출
            nxt = div.find_next_sibling()
            if nxt:
                raw_val = nxt.get_text(strip=True)
                # "[브랜드명]모델명..." 에서 브랜드 대괄호 제거
                clean = re.sub(r'^\[[^\]]*\]', '', raw_val).strip()
                # 스펙 값은 15자 이상이어야 유효 (네비게이션 단어 제외)
                # 또는 "[" 브랜드 형식으로 시작하는 경우
                if clean and (len(clean) >= 15 or raw_val.startswith("[")):
                    specs_raw[key] = clean

    # 2차: table > tr > td 구조 파싱 (백업)
    if not specs_raw.get("CPU") or not specs_raw.get("VGA"):
        for table in soup.find_all("table"):
            for row in table.find_all("tr"):
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    label = cells[0].get_text(strip=True)
                    value = cells[1].get_text(strip=True)
                    for key in ["CPU", "RAM", "VGA", "SSD", "HDD", "케이스", "파워", "쿨러", "메인보드"]:
                        if key == label.strip() and key not in specs_raw:
                            # 중복 텍스트 제거 (텍스트가 2번 반복되는 경우)
                            if len(value) > 10:
                                half = len(value) // 2
                                if value[:half] == value[half:]:
                                    value = value[:half]
                            specs_raw[key] = value[:60]
                            break
            if specs_raw.get("CPU") and specs_raw.get("VGA"):
                break

    cpu_full = specs_raw.get("CPU", "")
    gpu_full = specs_raw.get("VGA", "")
    ram_full = specs_raw.get("RAM", "")
    ssd_full = specs_raw.get("SSD", "")
    case_full = specs_raw.get("케이스", "")
    power_full = specs_raw.get("파워", "")
    cooler_full = specs_raw.get("쿨러", "")
    board_full = specs_raw.get("메인보드", "")

    if not cpu_full or not gpu_full:
        print(f"    [SKIP] CPU/GPU 정보 없음: {name[:40]}")
        return None

    cpu_s = short_cpu(cpu_full)
    gpu_s = short_gpu(gpu_full)
    gpu_k = gpu_key(gpu_s)

    # ── 가격 ──
    # 1) 할부 상품 여부 및 개월수 파악
    installment_months = 0
    if "24개월" in name or "24개월" in page_text[:500]:
        installment_months = 24
    elif "36개월" in name or "36개월" in page_text[:500]:
        installment_months = 36

    # 2) 판매가(총액) 파싱 - 판매가를 혜택가보다 먼저 확인
    price = 0
    for label in ["판매가", "혜택가"]:
        price_match = re.search(
            label + r"\s*[\r\n\t ]*([0-9,]{6,})\s*원", page_text
        )
        if price_match:
            v = int(price_match.group(1).replace(",", ""))
            if v >= 300_000:
                price = v
                break

    # 3) 위로 못 찾으면 6자리 이상 숫자 중 가장 큰 값
    if price < 300_000:
        for m in re.finditer(r"([\d,]{6,})\s*원", page_text):
            v = int(m.group(1).replace(",", ""))
            if v >= 300_000:
                price = v
                break

    if price < 100_000:
        print(f"    [SKIP] 가격 파싱 실패: {name[:40]}")
        return None

    # 조립PC 최소 가격 기준: 50만원 미만이면 모니터 등 대체 상품 가능성 → 제외
    MIN_PC_PRICE = 500_000
    if price < MIN_PC_PRICE and installment_months == 0:
        print(f"    [SKIP] 가격 비정상({price:,}원 < {MIN_PC_PRICE:,}원): {name[:40]}")
        return None

    # 4) 할부 상품이면 월 납부금액 파싱
    price_monthly = 0
    if installment_months > 0:
        m_monthly = re.search(
            r"월\s*납부금액\s*\(\d+개월\)[^0-9]*([\d,]+)", page_text
        )
        if m_monthly:
            price_monthly = int(m_monthly.group(1).replace(",", ""))
        # 월납부금이 없으면 총액으로 역산
        if price_monthly < 10_000:
            price_monthly = price // installment_months

    # 1만 원 단위 절삭
    price = (price // 10_000) * 10_000
    if price_monthly > 0:
        price_monthly = (price_monthly // 10_000) * 10_000

    # ── 분류 ──
    tier = classify_tier(gpu_full)
    price_range = classify_price_range(price)
    games = extract_game_tags(name, page_text[:2000], category["games"], page_text)
    usage = classify_usage(name, category["usage"], tier)
    case_color = detect_case_color(case_full or name)

    # ── 썸네일 ──
    thumbnail = f"https://admin.youngjaecomputer.com/data/item/{item_id}_m"

    # ── 뱃지 ──
    badge = ""
    badge_color = "gray"
    if installment_months == 24:
        badge, badge_color = "24개월 무이자", "purple"
    elif installment_months == 36:
        badge, badge_color = "36개월 무이자", "purple"
    elif "AI/딥러닝" in usage:
        badge, badge_color = "AI 전문가용", "cyan"
    elif tier == "하이엔드(4K)" and price >= 3_000_000:
        badge, badge_color = "하이엔드", "gold"
    elif tier == "가성비(FHD)" and price <= 1_000_000:
        badge, badge_color = "가성비 베스트", "green"
    elif tier == "퍼포먼스(QHD)":
        badge, badge_color = "퍼포먼스 추천", "blue"
    elif case_color == "화이트":
        badge, badge_color = "화이트 감성", "white"

    # 표시 가격: 할부면 월 납부금, 아니면 총액
    display_price = price_monthly if installment_months > 0 and price_monthly > 0 else price
    if installment_months > 0 and price_monthly > 0:
        price_display_str = f"월 {format_price_display(display_price)}"
    else:
        price_display_str = format_price_display(display_price)

    product = {
        "id": item_id,
        "name": name[:80],
        "subtitle": f"{cpu_s} + {gpu_s}",
        "url": url,
        "thumbnail": thumbnail,
        "price": price,
        "price_monthly": price_monthly,
        "installment_months": installment_months,
        "price_display": price_display_str,
        "in_stock": True,
        "specs": {
            "cpu": cpu_full[:50],
            "cpu_short": cpu_s,
            "gpu": gpu_full[:50],
            "gpu_short": gpu_s,
            "gpu_key": gpu_k,
            "ram": ram_full[:40],
            "ssd": ssd_full[:40],
            "mainboard": board_full[:40],
            "power": power_full[:40],
            "case": case_full[:40],
            "cooler": cooler_full[:40],
        },
        "categories": {
            "games": games,
            "tier": tier,
            "price_range": price_range,
            "usage": usage,
        },
        "case_color": case_color,
        "badge": badge,
        "badge_color": badge_color,
    }

    safe_print(f"    [OK] {name[:50]} | {format_price_display(price)} | {tier}")
    return product


# ─── 메인 ──────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("영재컴퓨터 제품 크롤러 v2 시작")
    print(f"시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    all_products = {}
    driver = None

    session = requests.Session()
    session.headers.update(HEADERS)

    try:
        if SELENIUM_AVAILABLE:
            print("[INFO] Selenium 드라이버 초기화...")
            driver = create_driver()

        dynamic_categories = discover_dynamic_categories(session)
        merged_categories = []
        seen_keys = set()
        for cat in (CATEGORIES + dynamic_categories):
            if cat.get("ca_id"):
                key = f"ca:{cat['ca_id']}"
            else:
                key = f"vi:{cat['vi']}:{cat['idx']}"
            if key in seen_keys:
                continue
            seen_keys.add(key)
            merged_categories.append(cat)

        print(f"[INFO] 고정 카테고리 {len(CATEGORIES)}개 + 동적 카테고리 {len(dynamic_categories)}개")

        # ── 1단계: 메인페이지 상품 ──
        main_item_ids = collect_main_page_item_ids(session)
        safe_print(f"[INFO] 메인페이지 노출 상품 ID {len(main_item_ids)}개 발견")
        for item_id in main_item_ids:
            if item_id in all_products:
                continue
            product = parse_product_detail(
                item_id,
                {"name": "MAIN_PAGE", "games": [], "usage": []},
                session,
            )
            if product:
                all_products[item_id] = product
            time.sleep(0.5)

        # ── 2단계: Installment 페이지 (GET, 할부 상품) ──
        installment_ids = collect_installment_item_ids(session)
        safe_print(f"[INFO] Installment 상품 상세 파싱 시작 ({len(installment_ids)}개)")
        for item_id in installment_ids:
            if item_id in all_products:
                continue
            product = parse_product_detail(
                item_id,
                {"name": "INSTALLMENT", "games": [], "usage": []},
                session,
            )
            if product:
                all_products[item_id] = product
            time.sleep(0.5)
        safe_print(f"[INFO] Installment 완료 → 누적 {len(all_products)}개")

        # ── 3단계: Recommend 페이지 (POST, 브랜드/스트리밍) ──
        recommend_data = collect_recommend_item_ids(session)
        safe_print(f"[INFO] Recommend 상품 상세 파싱 시작 ({len(recommend_data)}개)")
        for item_id, cat in recommend_data.items():
            if item_id in all_products:
                continue
            product = parse_product_detail(item_id, cat, session)
            if product:
                all_products[item_id] = product
            time.sleep(0.5)
        safe_print(f"[INFO] Recommend 완료 → 누적 {len(all_products)}개")

        # ── 4단계: Selenium 카테고리 크롤링 ──
        for i, cat in enumerate(merged_categories, 1):
            print(f"\n[{i}/{len(merged_categories)}] 카테고리: {cat['name']}")

            if driver:
                item_ids = get_item_ids_from_category(driver, cat)
            else:
                item_ids = []

            print(f"  → 발견된 제품 ID: {len(item_ids)}개 {item_ids[:5]}")

            for item_id in item_ids:
                if item_id in all_products:
                    print(f"    [DUP] {item_id}")
                    continue
                product = parse_product_detail(item_id, cat, session)
                if product:
                    all_products[item_id] = product
                time.sleep(0.5)

            time.sleep(REQUEST_DELAY)

    except KeyboardInterrupt:
        print("\n[INFO] 사용자 중단")
    except Exception as e:
        print(f"\n[ERROR] 크롤링 오류: {e}")
        traceback.print_exc()
    finally:
        if driver:
            driver.quit()

    products_list = list(all_products.values())
    print(f"\n[INFO] 총 {len(products_list)}개 제품 수집 완료")

    # 0건 수집 시 기존 데이터 보존
    if len(products_list) == 0:
        print("[WARNING] 수집 0건 → 기존 데이터 보존")
        existing = Path(OUTPUT_PRODUCTS)
        if existing.exists():
            try:
                with open(existing, "r", encoding="utf-8") as f:
                    ex = json.load(f)
                if len(ex.get("products", [])) > 0:
                    print(f"[INFO] 기존 {len(ex['products'])}개 유지")
                    import sys; sys.exit(0)
            except Exception:
                pass

    kst = timezone(timedelta(hours=9))
    now_kst = datetime.now(kst).isoformat()

    output = {
        "last_updated": now_kst,
        "_note": "crawl_products.py v2에 의해 자동 생성됩니다.",
        "products": products_list,
    }

    Path(OUTPUT_PRODUCTS).parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PRODUCTS, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[OK] 저장 완료: {OUTPUT_PRODUCTS}")
    print(f"[INFO] 완료 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
