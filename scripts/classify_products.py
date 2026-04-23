"""
classify_products.py - 제품 분류 엔진 v4
분류 전략: 타이틀 키워드 우선 → GPU 티어 폴백

categories.games (게임 필터):
  - 타이틀에 게임명이 직접 언급된 제품만 해당 게임 태깅 (판매자가 직접 테스트·확인한 성능)
  - 스팀 AAA급 게임: 타이틀 언급 OR 퍼포먼스/하이엔드 GPU + 게이밍 (일반 고사양 능력 표현)

best_for_tags (용도 필터):
  - 화이트 감성:  case_color == 화이트 (크롤러 수집값 100% 신뢰)
  - 4K 게이밍:   타이틀에 "4K" OR (하이엔드 GPU + 게이밍 primary)
  - QHD 게이밍:  타이틀에 "QHD" OR (퍼포먼스 GPU + 게이밍 primary)  ← 4K 이미 해당 시 제외
  - AI 공부용:   타이틀에 AI 키워드 OR (AI usage primary + 가격 ≤ 350만)
  - 로컬 LLM 입문: 타이틀에 LLM 키워드 OR (AI usage 포함 + VRAM ≥ 24GB)
                   ← 게이밍 전용(no AI usage) 고VRAM PC는 제외
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
PC_DATA_PATH = ROOT / "data" / "pc_data.json"

# ─── GPU 키 정규화 테이블 ─────────────────────────────────────────────
GPU_KEY_NORMALIZE = {
    "RTX 5070 TI":       "RTX 5070 Ti",
    "RTX 5060 TI":       "RTX 5060 Ti",
    "RTX 4080 SUPER":    "RTX 4080 Super",
    "RTX 4070 TI SUPER": "RTX 4070 Ti Super",
    "RTX 4070 TI":       "RTX 4070 Ti Super",
    "RTX 4070 SUPER":    "RTX 4070 Super",
    "RTX 4060 TI":       "RTX 4060 Ti",
    "RTX 3060 TI":       "RTX 3060 Ti",
    "RTX5060":           "RTX 5060",
    "RTX5070":           "RTX 5070",
    "RTX 3090 TI":       "RTX 3090 Ti",
    "RTX 2060 SUPER":    "RTX 2060 Super",
    "RX 9070XT":         "RX 9070 XT",
    "RX9070XT":          "RX 9070 XT",
    "RX 7900 XTX":       "RX 7900 XTX",
}

# ─── GPU 티어 맵 ──────────────────────────────────────────────────────
GPU_TIER_MAP = {
    "가성비(FHD)": {
        "RTX 4060", "RTX 4060 Ti", "RTX 5060", "RTX 5050",
        "RX 7600", "RX 7700 XT", "GTX 1660", "GTX 1660 SUPER",
        "RX 6600", "RX 6700 XT", "RTX 3050", "RTX 2060 Super",
        "RTX 3060", "RTX 3060 Ti",
    },
    "퍼포먼스(QHD)": {
        "RTX 4070", "RTX 4070 Super", "RTX 5060 Ti", "RTX 5070",
        "RX 7800 XT", "RX 9070", "RX 9070 XT",
    },
    "하이엔드(4K)": {
        "RTX 4070 Ti", "RTX 4070 Ti Super",
        "RTX 4080", "RTX 4080 Super", "RTX 4090",
        "RTX 5070 Ti", "RTX 5080", "RTX 5090",
        "RX 7900 XT", "RX 7900 XTX",
        "RTX 6000", "RTX 3090 Ti",
    },
}

# ─── GPU VRAM (GB) ────────────────────────────────────────────────────
GPU_VRAM = {
    "RTX 5090": 32, "RTX 5080": 16, "RTX 5070 Ti": 16, "RTX 5070": 12,
    "RTX 5060 Ti": 16, "RTX 5060": 8, "RTX 5050": 8,
    "RTX 4090": 24, "RTX 4080 Super": 16, "RTX 4080": 16,
    "RTX 4070 Ti Super": 16, "RTX 4070 Super": 12, "RTX 4070": 12,
    "RTX 4070 Ti": 12, "RTX 4060 Ti": 8, "RTX 4060": 8,
    "RTX 3060 Ti": 8, "RTX 3060": 12, "RTX 3050": 8,
    "GTX 1660 SUPER": 6, "GTX 1660": 6,
    "RX 9070 XT": 16, "RX 9070": 16, "RX 9060 XT": 16, "RX 9060": 8,
    "RX 7900 XTX": 24, "RX 7900 XT": 20, "RX 7800 XT": 16,
    "RX 7700 XT": 12, "RX 7600": 8,
    "RTX 6000": 48, "RTX A100": 80, "AMD 라데온 AI PRO": 32,
}

# ─── 게임별 타이틀 키워드 ─────────────────────────────────────────────
# 판매자가 직접 게임명을 언급한 경우만 해당 게임으로 분류
GAME_TITLE_KEYWORDS = {
    "발로란트":       ["발로란트", "valorant", "발로"],
    "배틀그라운드":   ["배틀그라운드", "배그", "pubg", "battleground"],
    "로스트아크":     ["로스트아크", "lostark", "로아"],
    "오버워치2":      ["오버워치", "overwatch"],
    "아이온2":        ["아이온", "aion"],
    "리그오브레전드": ["리그오브레전드", "league of legends"],
    # "롤"은 별도 처리 (공백 체크 필요)
}

# 스팀 AAA급 게임 - 특정 AAA 타이틀 직접 언급
AAA_TITLE_KEYWORDS = [
    "붉은사막", "사이버펑크", "cyberpunk",
    "엘든링", "elden ring",
    "위쳐", "witcher",
    "어쌔신", "assassin",
    "갓오브워", "god of war",
    "스파이더맨", "spider-man",
    "fc25", "fc 25", "ea fc",
    "스팀 aaa", "aaa 게임",
]

# AI 공부용 타이틀 키워드
AI_STUDY_TITLE_KEYWORDS = [
    "AI 학습", "AI학습", "AI 공부", "AI공부",
    "AI 입문", "AI입문", "딥러닝", "머신러닝",
    "AI 이미지", "AI이미지", "AI 작업용", "AI작업용",
    "nvidia ai", "엔비디아 ai", "AI YJ", "ai yj",
    "AI 생성", "AI생성",
]

# 로컬 LLM 타이틀 키워드
LLM_TITLE_KEYWORDS = [
    "LLM", "llm",
    "로컬 LLM", "로컬LLM",
    "로컬 AI", "로컬AI",
    "로컬 ai",
]

# 상수
AI_STUDY_MAX_PRICE  = 3_500_000   # AI 공부용 최대 가격 350만원
LOCAL_LLM_MIN_VRAM  = 16          # 로컬 LLM 최소 VRAM 16GB (13B~30B 모델 실행 가능)


def normalize_gpu(raw: str) -> str:
    if not raw:
        return ""
    return GPU_KEY_NORMALIZE.get(raw.strip(), raw.strip())


def get_gpu_tier(gpu_key: str) -> str | None:
    n = normalize_gpu(gpu_key)
    for tier, gpus in GPU_TIER_MAP.items():
        if n in gpus:
            return tier
    return None


def get_vram(gpu_key: str) -> int:
    n = normalize_gpu(gpu_key)
    return GPU_VRAM.get(n, GPU_VRAM.get(gpu_key, 0))


def title_has(name: str, keywords: list) -> bool:
    """타이틀에 키워드 중 하나라도 포함되면 True (대소문자 무시)"""
    name_lower = name.lower()
    return any(kw.lower() in name_lower for kw in keywords)


def title_has_rol(name: str) -> bool:
    """'롤' 키워드 - 오탐지 방지를 위해 공백/구두점 문맥 확인"""
    # "롤 XXX프레임", "XXX프레임, 롤", " 롤 ", "롤," 등
    import re
    return bool(re.search(r'(^|[\s,])\s*롤\s*($|[\s,\d])', name))


# ─── 게임 태그 분류 ───────────────────────────────────────────────────
def classify_game_tags(product: dict) -> list:
    """
    타이틀 기반 게임 태그 분류.
    - 타이틀에 게임명이 직접 언급된 경우만 해당 게임 태깅
    - 스팀 AAA급: 타이틀 언급 OR 퍼포먼스/하이엔드 GPU + 게이밍 primary
    """
    name    = product.get("name", "")
    usage   = product.get("categories", {}).get("usage", [])
    gpu_key = product.get("specs", {}).get("gpu_key", "")
    tier    = get_gpu_tier(gpu_key)
    is_gaming_primary = (
        "게이밍" in usage and
        # 게이밍이 primary (AI/딥러닝 등 우선순위 높은 용도 없을 때)
        not any(u in usage for u in ["영상편집", "3D 모델링", "방송/스트리밍", "AI/딥러닝"])
    )

    tags = []

    # 특정 게임 - 타이틀 키워드 매칭
    for game, keywords in GAME_TITLE_KEYWORDS.items():
        if title_has(name, keywords):
            tags.append(game)

    # 리그오브레전드 - "롤" 키워드 추가 확인
    if "리그오브레전드" not in tags and title_has_rol(name):
        tags.append("리그오브레전드")

    # 스팀 AAA급 게임
    # - 타이틀에 특정 AAA 게임 언급
    # - OR 퍼포먼스/하이엔드 GPU + 게이밍 primary (이 사양이면 AAA 게임 실행 가능)
    if title_has(name, AAA_TITLE_KEYWORDS):
        tags.append("스팀 AAA급 게임")
    elif is_gaming_primary and tier in ("퍼포먼스(QHD)", "하이엔드(4K)"):
        tags.append("스팀 AAA급 게임")

    return sorted(set(tags))


# ─── best_for_tags 분류 ───────────────────────────────────────────────
def classify_best_for_tags(product: dict) -> list:
    """
    타이틀 키워드 우선 + GPU 티어 폴백으로 best_for_tags 생성.
    """
    name      = product.get("name", "")
    price     = product.get("price", 0)
    usage     = product.get("categories", {}).get("usage", [])
    case_col  = (product.get("case_color") or "").strip()
    gpu_key   = product.get("specs", {}).get("gpu_key", "")
    tier      = get_gpu_tier(gpu_key)
    vram      = get_vram(gpu_key)

    # primaryUsage: 영상편집 > 3D > 방송 > AI > 사무 > 게이밍
    PRIORITY = {
        "영상편집": 1, "3D 모델링": 2, "방송/스트리밍": 3,
        "AI/딥러닝": 4, "사무/디자인": 5, "게이밍": 6,
    }
    primary = min(usage, key=lambda u: PRIORITY.get(u, 99), default="")
    is_primary_gaming = (primary == "게이밍")
    is_ai_usage       = "AI/딥러닝" in usage

    tags = []

    # ── 화이트 감성 ────────────────────────────────────────────────
    # case_color 필드 기반 (크롤러가 정확히 수집, 타이틀보다 신뢰도 높음)
    if case_col in ("화이트", "White", "WHITE"):
        tags.append("화이트 감성")

    # ── 4K 게이밍 ─────────────────────────────────────────────────
    # 타이틀에 "4K" 명시 → 판매자가 직접 4K 용도로 제작한 제품
    # 폴백: 하이엔드 GPU + 게이밍 primary (브랜드 완성품 커버)
    is_4k = (
        title_has(name, ["4K", "4k", "4케이"]) or
        (is_primary_gaming and tier == "하이엔드(4K)")
    )
    if is_4k:
        tags.append("4K 게이밍")

    # ── QHD 게이밍 ────────────────────────────────────────────────
    # 4K에 해당되면 QHD 중복 부여 안 함 (상위 등급으로 충분)
    # 타이틀에 "QHD" 명시 OR 퍼포먼스 GPU + 게이밍 primary
    if "4K 게이밍" not in tags:
        is_qhd = (
            title_has(name, ["QHD", "qhd", "2K", "wqhd", "WQHD"]) or
            (is_primary_gaming and tier == "퍼포먼스(QHD)")
        )
        if is_qhd:
            tags.append("QHD 게이밍")

    # ── AI 공부용 ─────────────────────────────────────────────────
    # (타이틀 AI 키워드 OR AI usage primary) + 가격 350만 이하
    # 350만 초과 AI PC는 "공부용"이 아닌 전문 워크스테이션 영역
    is_ai_by_title   = title_has(name, AI_STUDY_TITLE_KEYWORDS)
    is_ai_by_primary = (primary == "AI/딥러닝")
    if (is_ai_by_title or is_ai_by_primary) and price <= AI_STUDY_MAX_PRICE:
        tags.append("AI 공부용")

    # ── 로컬 LLM 입문 ─────────────────────────────────────────────
    # 타이틀에 LLM 키워드 OR (AI 용도 포함 + VRAM 24GB 이상)
    # 핵심: 게이밍 전용 고VRAM PC(RTX 5090 게이밍)는 is_ai_usage=False → 제외
    is_llm_by_title = title_has(name, LLM_TITLE_KEYWORDS)
    is_llm_by_spec  = (is_ai_usage and vram >= LOCAL_LLM_MIN_VRAM)
    if is_llm_by_title or is_llm_by_spec:
        tags.append("로컬 LLM 입문")

    return sorted(set(tags))


# ─── 저장 ────────────────────────────────────────────────────────────
def atomic_save(path: Path, data: dict) -> None:
    """임시 파일 저장 → JSON 검증 → 교체 (원자적 쓰기)"""
    tmp = path.with_suffix(".tmp")
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        with open(tmp, "r", encoding="utf-8") as f:
            json.load(f)
        tmp.replace(path)
        print(f"[OK] {path.name} 저장 완료")
    except Exception as e:
        if tmp.exists():
            tmp.unlink()
        raise RuntimeError(f"[ERROR] {path.name} 저장 실패: {e}") from e


# ─── 메인 ────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  제품 분류 엔진 v4 시작 (타이틀 우선 + GPU 폴백)")
    print("=" * 60)

    raw      = PC_DATA_PATH.read_bytes().rstrip(b"\x00")
    pc_data  = json.loads(raw.decode("utf-8"))
    products = pc_data["products"]
    print(f"[OK] pc_data.json 로드 ({len(products)}개 상품)")

    game_counts     = {}
    best_for_counts = {}
    changed         = 0

    for p in products:
        new_games = classify_game_tags(p)
        new_bf    = classify_best_for_tags(p)

        old_games = sorted(p.get("categories", {}).get("games", []))
        old_bf    = sorted(p.get("best_for_tags", []))

        if new_games != old_games or new_bf != old_bf:
            changed += 1

        p.setdefault("categories", {})["games"] = new_games
        p["best_for_tags"] = new_bf

        for g in new_games:
            game_counts[g] = game_counts.get(g, 0) + 1
        for t in new_bf:
            best_for_counts[t] = best_for_counts.get(t, 0) + 1

    # ── 결과 출력 ─────────────────────────────────────────────────
    print(f"\n[결과] {changed}개 상품 태그 변경됨\n")

    print("── 게임 태그 분포 ──────────────────────────────────")
    for game, cnt in sorted(game_counts.items(), key=lambda x: -x[1]):
        print(f"  {game:<22}: {cnt:>3}개")

    print("\n── best_for_tags 분포 ──────────────────────────────")
    for tag, cnt in sorted(best_for_counts.items(), key=lambda x: -x[1]):
        print(f"  {tag:<22}: {cnt:>3}개")

    # ── 검증: best_for_tags 없는 제품 ────────────────────────────
    no_tag = [p for p in products if not p.get("best_for_tags")]
    if no_tag:
        print(f"\n[주의] best_for_tags 비어있는 제품: {len(no_tag)}개")
        for p in no_tag[:5]:
            print(f"  - {p.get('name','')[:55]}  (GPU: {p.get('specs',{}).get('gpu_key','')})")
    else:
        print(f"\n[OK] 전체 {len(products)}개 best_for_tags 설정 완료")

    atomic_save(PC_DATA_PATH, pc_data)
    print("\n[완료] 분류 엔진 v4 실행 성공 ✅")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n[FATAL] {e}", file=sys.stderr)
        sys.exit(1)
