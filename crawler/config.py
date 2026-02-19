"""
config.py - 크롤러 설정 파일
영재컴퓨터 카테고리 매핑 및 분류 규칙
"""

import os

# ─── 기본 설정 ───────────────────────────────────────────────
BASE_URL = "https://www.youngjaecomputer.com"
SHOP_URL = f"{BASE_URL}/shop"
CAFE_URL = "https://cafe.naver.com/no1yjmod"
CAFE_CLUB_ID = "31248285"

# 출력 파일 경로 (크롤러를 실행하는 위치 기준)
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
OUTPUT_PRODUCTS = os.path.join(DATA_DIR, "pc_data.json")
OUTPUT_CAFE = os.path.join(DATA_DIR, "cafe_posts.json")

# ─── 네이버 API 설정 (GitHub Secrets에서 주입) ───────────────
NAVER_CLIENT_ID = os.environ.get("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.environ.get("NAVER_CLIENT_SECRET", "")

# ─── Selenium 설정 ───────────────────────────────────────────
SELENIUM_OPTIONS = {
    "headless": True,
    "no_sandbox": True,
    "disable_dev_shm": True,
    "window_size": "1920,1080",
    "user_agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    ),
}

# 요청 딜레이 (초) - 서버 과부하 방지
REQUEST_DELAY = 1.5   # 페이지 간
ITEM_DELAY = 0.8      # 상품 상세 간

# ─── 크롤링 대상 카테고리 ─────────────────────────────────────
# 영재컴퓨터 메가메뉴 분석 결과 (추천PC 카테고리)
# URL: /shop/list.php?ca_id=h0&ca_id_vi={vi}&ca_id_index={idx}
CATEGORY_TARGETS = [
    # 게임용PC
    {
        "name": "FPS게임용",
        "url": f"{SHOP_URL}/list.php?ca_id=h0&ca_id_vi=100&ca_id_index=1",
        "games": ["배틀그라운드", "발로란트", "리그오브레전드"],
        "usage": ["게이밍"],
        "search_keywords": ["FPS", "배그", "발로", "배틀그라운드", "발로란트"]
    },
    {
        "name": "RPG게임용",
        "url": f"{SHOP_URL}/list.php?ca_id=h0&ca_id_vi=101&ca_id_index=1",
        "games": ["로스트아크", "리그오브레전드"],
        "usage": ["게이밍"],
        "search_keywords": ["RPG", "로스트아크", "로아", "MMORPG"]
    },
    {
        "name": "최신AAA게임",
        "url": f"{SHOP_URL}/list.php?ca_id=h0&ca_id_vi=102&ca_id_index=1",
        "games": ["스팀 AAA급 게임"],
        "usage": ["게이밍"],
        "search_keywords": ["AAA", "고사양", "스팀", "사이버펑크", "와일즈"]
    },
    # 작업용PC
    {
        "name": "영상편집",
        "url": f"{SHOP_URL}/list.php?ca_id=h0&ca_id_vi=200&ca_id_index=2",
        "games": [],
        "usage": ["영상편집"],
        "search_keywords": ["영상편집", "4K편집", "프리미어", "다빈치"]
    },
    {
        "name": "사무디자인",
        "url": f"{SHOP_URL}/list.php?ca_id=h0&ca_id_vi=201&ca_id_index=2",
        "games": [],
        "usage": ["사무/디자인"],
        "search_keywords": ["사무", "디자인", "포토샵", "일러스트"]
    },
    {
        "name": "3D모델링",
        "url": f"{SHOP_URL}/list.php?ca_id=h0&ca_id_vi=202&ca_id_index=2",
        "games": [],
        "usage": ["3D/모델링"],
        "search_keywords": ["3D", "모델링", "블렌더", "Cinema4D", "Maya"]
    },
    # AI/전문가용
    {
        "name": "AI딥러닝",
        "url": f"{SHOP_URL}/list.php?ca_id=h0&ca_id_vi=300&ca_id_index=3",
        "games": [],
        "usage": ["AI/딥러닝"],
        "search_keywords": ["AI", "딥러닝", "머신러닝", "GPU서버", "워크스테이션"]
    },
    # 게임별PC
    {
        "name": "리그오브레전드",
        "url": f"{SHOP_URL}/list.php?ca_id=h0&ca_id_vi=400&ca_id_index=4",
        "games": ["리그오브레전드"],
        "usage": ["게이밍"],
        "search_keywords": ["롤", "리그오브레전드", "LOL"]
    },
    {
        "name": "배틀그라운드",
        "url": f"{SHOP_URL}/list.php?ca_id=h0&ca_id_vi=401&ca_id_index=4",
        "games": ["배틀그라운드"],
        "usage": ["게이밍"],
        "search_keywords": ["배그", "배틀그라운드", "PUBG"]
    },
    {
        "name": "로스트아크",
        "url": f"{SHOP_URL}/list.php?ca_id=h0&ca_id_vi=402&ca_id_index=4",
        "games": ["로스트아크"],
        "usage": ["게이밍"],
        "search_keywords": ["로아", "로스트아크"]
    },
]

# ─── 상품명 -> 게임 태그 키워드 매핑 ────────────────────────
GAME_KEYWORD_MAP = {
    "리그오브레전드": ["롤", "리그오브레전드", "LOL", "로아"], 
    "배틀그라운드": ["배그", "배틀그라운드", "PUBG"],
    "로스트아크": ["로아", "로스트아크"],
    "스팀 AAA급 게임": ["AAA", "고사양", "스팀", "사이버펑크", "와일즈", "몬스터헌터"],
    "발로란트": ["발로란트", "발로"],
    "오버워치2": ["오버워치", "오버워치2"],
}

# ─── GPU 모델명 -> 사양 티어 분류 ────────────────────────────
# GPU 모델을 파싱해 tier를 자동 설정
GPU_TIER_MAP = {
    "가성비(FHD)": [
        "RTX 4060", "RTX 4060 Ti", "RTX 5060",
        "RX 7600", "RX 7700 XT",
        "GTX 1660", "GTX 1650",
        "RX 6600", "RX 6700 XT",
    ],
    "퍼포먼스(QHD)": [
        "RTX 4070", "RTX 4070 Super", "RTX 5060 Ti", "RTX 5070",
        "RX 7800 XT", "RX 9070", "RX 9070 XT",
    ],
    "하이엔드(4K)": [
        "RTX 4070 Ti", "RTX 4070 Ti Super", "RTX 4080", "RTX 4080 Super",
        "RTX 4090", "RTX 5070 Ti", "RTX 5080", "RTX 5090",
        "RX 7900 XT", "RX 7900 XTX",
    ],
}

# ─── 가격대 분류 기준 ─────────────────────────────────────────
PRICE_RANGES = {
    "100만 원 이하":  (0, 1_000_000),
    "100~200만 원":   (1_000_000, 2_000_000),
    "200~300만 원":   (2_000_000, 3_000_000),
    "300만 원 이상":  (3_000_000, float("inf")),
}

# ─── 케이스 색상 감지 키워드 ─────────────────────────────────
CASE_WHITE_KEYWORDS = ["화이트", "WHITE", "White", "WH", "W"]
CASE_BLACK_KEYWORDS = ["블랙", "BLACK", "Black", "BK", "B"]

# ─── 크롤링 제외 조건 ─────────────────────────────────────────
EXCLUDE_KEYWORDS = ["중고", "리퍼", "렌탈", "전시"]

# ─── 최대 상품 수 제한 ────────────────────────────────────────
MAX_PRODUCTS_PER_CATEGORY = 10
MAX_CAFE_POSTS = 20
