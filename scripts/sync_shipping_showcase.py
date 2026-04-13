"""
sync_shipping_showcase.py — cafe_posts.json → recent_shipping.json 자동 동기화

매 6시간 자동 업데이트 파이프라인(run-auto-update.ps1)에서 crawl_cafe 직후 실행된다.

동작:
  1. cafe_posts.json에서 "출고건" 게시글만 필터링
  2. 썸네일이 있는 것 우선, 없어도 최신 순으로 최대 MAX_ITEMS개 선정
  3. 제목에서 출고 유형(조립컴퓨터 / 워크스테이션 / 서버 / 임무수행)을 추출해
     title·summary·specs를 자동 생성
  4. 기존 recent_shipping.json에서 cafeUrl이 겹치는 항목은 보존(덮어쓰지 않음)
  5. 새 항목을 앞에 추가해 최대 MAX_ITEMS개만 유지

실행:  python scripts/sync_shipping_showcase.py [--dry-run]
"""

import json, re, sys, shutil
from pathlib import Path
from datetime import datetime

ROOT         = Path(__file__).parent.parent
CAFE_POSTS   = ROOT / "data" / "cafe_posts.json"
SHIPPING_OUT = ROOT / "data" / "recent_shipping.json"
DRY_RUN      = "--dry-run" in sys.argv
MAX_ITEMS    = 6

GALLERY_URL = "https://cafe.naver.com/f-e/cafes/31248285/menus/1?viewType=I&page=1&size=20"

# ────────────────────────────────────────────────────────────
# 출고 유형 분류
# ────────────────────────────────────────────────────────────

TYPE_META = {
    "조립컴퓨터": {
        "title":   "조립 PC 출고 완료",
        "summary": "케이스 내부 배선·완성 컷",
        "specs":   "맞춤 조립 PC",
    },
    "워크스테이션": {
        "title":   "워크스테이션 출고 완료",
        "summary": "고성능 워크스테이션 완성 컷",
        "specs":   "워크스테이션",
    },
    "서버": {
        "title":   "서버 납품 완료",
        "summary": "서버 랙마운트 설치 컷",
        "specs":   "서버 구성",
    },
    "임무수행": {
        "title":   "현장 납품 및 설치 완료",
        "summary": "직접 납품·설치 현장 컷",
        "specs":   "현장 설치 PC",
    },
    "노트북": {
        "title":   "노트북 출고 완료",
        "summary": "포장·출고 완성 컷",
        "specs":   "노트북",
    },
}
DEFAULT_META = {
    "title":   "PC 출고 완료",
    "summary": "완성 컷",
    "specs":   "조립 PC",
}


def detect_type(title: str) -> dict:
    """제목 앞 대괄호에서 유형 추출"""
    m = re.match(r"\[([^\]]+)\]", title)
    if not m:
        return DEFAULT_META
    bracket = m.group(1).strip()
    # 공백·특수문자 무시하고 키워드 매칭
    for key, meta in TYPE_META.items():
        if key in bracket.replace(" ", "").replace("_", ""):
            return meta
    return DEFAULT_META


def is_shipping_post(post: dict) -> bool:
    """출고 게시글인지 판별"""
    title = post.get("title", "")
    url   = post.get("url", "")
    # 반드시 articles URL이어야 함 (게시판 목록 링크 제외)
    if "/articles/" not in url:
        return False
    # 공지·안내 게시글 제외
    skip_keywords = ["공지", "안내", "배송 관련", "작동이 잘 안", "배송 받은", "프리미엄 배송"]
    if any(kw in title for kw in skip_keywords):
        return False
    # 출고·납품·설치 키워드 포함
    ship_keywords = ["출고건", "납품", "설치", "[조립컴퓨터]", "[워크스테이션]", "[서버]",
                     "[임무 수행]", "[노트북]", "출고"]
    return any(kw in title for kw in ship_keywords)


def article_id_from_url(url: str) -> int:
    """articles/7103 → 7103, 정렬·중복 제거에 사용"""
    m = re.search(r"/articles/(\d+)", url)
    return int(m.group(1)) if m else 0


def build_shipping_item(post: dict, index: int) -> dict:
    """cafe_posts 항목 하나 → recent_shipping 형식 변환"""
    meta  = detect_type(post.get("title", ""))
    date  = post.get("date", datetime.today().strftime("%Y-%m-%d"))
    image = post.get("thumbnail", "")
    url   = post.get("url", "")
    art_id = article_id_from_url(url)

    return {
        "id":      f"ship-auto-{art_id or index:04d}",
        "title":   meta["title"],
        "image":   image,
        "summary": meta["summary"],
        "date":    date,
        "specs":   meta["specs"],
        "cafeUrl": url,
    }


# ────────────────────────────────────────────────────────────
# 기존 shipping 데이터 로드
# ────────────────────────────────────────────────────────────

def load_existing() -> dict:
    if not SHIPPING_OUT.exists():
        return {"galleryMenuUrl": GALLERY_URL, "items": []}
    try:
        raw = SHIPPING_OUT.read_text(encoding="utf-8")
        decoder = json.JSONDecoder()
        data, _ = decoder.raw_decode(raw)
        return data
    except Exception:
        return {"galleryMenuUrl": GALLERY_URL, "items": []}


# ────────────────────────────────────────────────────────────
# 메인
# ────────────────────────────────────────────────────────────

def main():
    if not CAFE_POSTS.exists():
        print("[sync_shipping] cafe_posts.json 없음 — 건너뜀")
        return

    raw = CAFE_POSTS.read_text(encoding="utf-8")
    decoder = json.JSONDecoder()
    cafe_data, _ = decoder.raw_decode(raw)
    all_posts = cafe_data.get("posts", cafe_data if isinstance(cafe_data, list) else [])

    # 출고 게시글만, 최신(article ID 높은 순)으로 정렬
    shipping_posts = [p for p in all_posts if is_shipping_post(p)]
    shipping_posts.sort(key=lambda p: article_id_from_url(p.get("url", "")), reverse=True)

    print(f"[sync_shipping] 전체 게시글 {len(all_posts)}개 중 출고 게시글 {len(shipping_posts)}개 발견")

    # 썸네일 있는 것 우선 정렬 (없어도 포함, 단 뒤로)
    with_thumb    = [p for p in shipping_posts if p.get("thumbnail", "").startswith("http")]
    without_thumb = [p for p in shipping_posts if not p.get("thumbnail", "").startswith("http")]
    ordered = with_thumb + without_thumb

    # 기존 항목 URL 집합 (중복 방지)
    existing = load_existing()
    existing_urls = {item.get("cafeUrl", "") for item in existing.get("items", [])}

    new_items = []
    for i, post in enumerate(ordered):
        if len(new_items) >= MAX_ITEMS:
            break
        url = post.get("url", "")
        if url in existing_urls:
            continue  # 이미 있는 항목은 건너뜀
        item = build_shipping_item(post, i)
        new_items.append(item)

    print(f"[sync_shipping] 신규 항목 {len(new_items)}개 생성")

    if not new_items:
        print("[sync_shipping] 변경 없음 — recent_shipping.json 유지")
        return

    # 기존 항목과 합쳐 최대 MAX_ITEMS 유지 (새것이 앞)
    merged_items = new_items + existing.get("items", [])
    merged_items = merged_items[:MAX_ITEMS]

    result = {
        "_maintainer_note": (
            "자동 생성 (sync_shipping_showcase.py). "
            "title·summary·specs는 수동으로 덮어쓸 수 있습니다."
        ),
        "galleryMenuUrl": existing.get("galleryMenuUrl", GALLERY_URL),
        "items": merged_items,
    }

    if DRY_RUN:
        print("[dry-run] 저장 건너뜀. 결과 미리보기:")
        for item in result["items"]:
            thumb_flag = "📷" if item.get("image") else "  "
            print(f"  {thumb_flag} [{item['date']}] {item['title']} | {item['specs']}")
            print(f"       {item['cafeUrl'][:70]}")
        return

    # 백업 후 저장
    if SHIPPING_OUT.exists():
        shutil.copy2(SHIPPING_OUT, SHIPPING_OUT.with_suffix(".json.bak"))

    SHIPPING_OUT.write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    print(f"[sync_shipping] 완료. recent_shipping.json → {len(merged_items)}개 항목")


if __name__ == "__main__":
    main()
