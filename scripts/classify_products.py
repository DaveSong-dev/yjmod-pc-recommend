"""
classify_products.py - 제품 분류 엔진 v2
fps_reference.json + GPU 스펙으로 game_tags, best_for_tags를 재생성합니다.

게임 태그 전략:
  - QHD를 기준 해상도로 사용 (전 등급 공통)
  - 게임별 차별화된 FPS 임계값으로 실제 추천 가능한 게임만 태깅
  - 결과: 가성비 PC는 가벼운 게임만, 고사양 PC는 무거운 게임까지

best_for_tags 전략:
  - 4K 게이밍: 하이엔드 티어 + 모든 게임 4K 60fps 이상
  - QHD 게이밍: 퍼포먼스 티어 + 모든 게임 QHD 60fps 이상
  - AI 공부용: AI/딥러닝 용도 + 가격 350만 이하
  - 로컬 LLM 입문: VRAM 24GB+ 또는 AI 용도 고사양
  - 화이트 감성: 화이트 케이스
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
FPS_REF_PATH = ROOT / "data" / "fps_reference.json"
PC_DATA_PATH = ROOT / "data" / "pc_data.json"

# ─── GPU 키 정규화 테이블 ───────────────────────────────────────────
# data의 gpu_key → fps_reference.json 키로 매핑
GPU_KEY_NORMALIZE = {
    "RTX 5070 TI":          "RTX 5070 Ti",
    "RTX 5060 TI":          "RTX 5060 Ti",
    "RTX 4080 SUPER":       "RTX 4080 Super",
    "RTX 4070 TI SUPER":    "RTX 4070 Ti Super",
    "RTX 4070 TI":          "RTX 4070 Ti Super",   # 근사값 사용
    "RTX 4070 SUPER":       "RTX 4070 Super",
    "RTX 4060 TI":          "RTX 4060 Ti",
    "RTX 3060 TI":          "RTX 3060 Ti",
    "RTX5060":              "RTX 5060",
    "RTX5070":              "RTX 5070",
    "RX 9070XT":            "RX 9070 XT",
    "RX9070XT":             "RX 9070 XT",
    "RX 7900 XTX":          "RX 7900 XT",          # XTX → XT 근사
}

# ─── fps_reference에 없는 GPU → 유사 GPU fallback ──────────────────
GPU_FALLBACK = {
    "RTX 5050":           "RTX 5060",          # 5060 조금 아래
    "RTX 3060 Ti":        "RTX 4060 Ti",       # 비슷한 성능대
    "RTX 3060":           "RTX 4060",
    "RTX 3050":           "RX 7600",           # 보수적 근사
    "GTX 1660 SUPER":     "RX 7600",
    "GTX 1660":           "RX 7600",
    "RX 9060 XT":         "RX 7700 XT",        # 9060 XT ≈ 7700 XT 급
    "RX 9060":            "RX 7600",
    "RX 9070":            "RX 7800 XT",        # 9070 ≈ 7800 XT~9070 XT 사이
    "RTX 6000":           "RTX 4080",          # RTX 6000 Ada ≈ 4080 급
    # 내장 그래픽 / 전문가 카드 → None (게임 태그 없음)
    "내장 그래픽":        None,
    "AMD 라데온 AI PRO":  None,
    "RTX A100":           None,
}

# ─── GPU별 VRAM (GB) ────────────────────────────────────────────────
GPU_VRAM = {
    "RTX 5090":             32,
    "RTX 5080":             16,
    "RTX 5070 Ti":          16,
    "RTX 5070":             12,
    "RTX 5060 Ti":          16,
    "RTX 5060":              8,
    "RTX 5050":              8,
    "RTX 4090":             24,
    "RTX 4080 Super":       16,
    "RTX 4080":             16,
    "RTX 4070 Ti Super":    16,
    "RTX 4070 Super":       12,
    "RTX 4070":             12,
    "RTX 4070 Ti":          12,
    "RTX 4060 Ti":           8,
    "RTX 4060":              8,
    "RTX 3060 Ti":           8,
    "RTX 3060":             12,
    "RTX 3050":              8,
    "GTX 1660 SUPER":        6,
    "GTX 1660":              6,
    "RX 9070 XT":           16,
    "RX 9070":              16,
    "RX 9060 XT":           16,
    "RX 9060":               8,
    "RX 7900 XTX":          24,
    "RX 7900 XT":           20,
    "RX 7800 XT":           16,
    "RX 7700 XT":           12,
    "RX 7600":               8,
    "RTX 6000":             48,
    "RTX A100":             80,
    "AMD 라데온 AI PRO":    32,
}

# ─── 게임 태그 임계값 (QHD 기준 FPS) ────────────────────────────────
# 가벼운 경쟁 게임: 100fps → 거의 모든 GPU
# 무거운 게임: 130fps → 퍼포먼스급 이상
# AAA: 100fps → 퍼포먼스 상위 이상
GAME_QHD_THRESHOLD = {
    "리그오브레전드":    100,   # 가벼운 esports → 모든 GPU 해당
    "발로란트":         100,   # 가벼운 esports → 모든 GPU 해당
    "오버워치2":        100,   # 중간 FPS → 대부분 해당
    "배틀그라운드":     130,   # 무거운 FPS → 퍼포먼스급 이상
    "로스트아크":        60,   # MMORPG → 60fps로 충분, 대부분 해당
    "스팀 AAA급 게임":  100,   # 고사양 → 퍼포먼스 상위 이상
}

# best_for_tags 임계값
FPS_4K_MIN     = 60    # 4K 게이밍: 모든 게임 4K 60fps 이상
FPS_QHD_MIN    = 60    # QHD 게이밍: 모든 게임 QHD 60fps 이상

# AI/LLM 분류
AI_STUDY_MAX_PRICE  = 3_500_000    # AI 공부용 최대 가격
LOCAL_LLM_MIN_VRAM  = 24           # 로컬 LLM: VRAM 24GB 이상 (7B~70B quantized)


def normalize_gpu_key(raw_key: str) -> str:
    """data의 gpu_key를 fps_reference.json 키 형식으로 정규화"""
    if not raw_key:
        return ""
    return GPU_KEY_NORMALIZE.get(raw_key, raw_key)


def resolve_fps_key(gpu_key: str, fps_data: dict) -> str | None:
    """
    fps_reference.json에서 사용할 GPU 키를 반환.
    없으면 fallback 적용, fallback도 없으면 None.
    """
    normalized = normalize_gpu_key(gpu_key)

    if normalized in fps_data:
        return normalized

    # 명시적 fallback 매핑
    if normalized in GPU_FALLBACK:
        fallback = GPU_FALLBACK[normalized]
        if fallback is None:
            return None
        if fallback in fps_data:
            return fallback

    return None


def get_vram(gpu_key: str) -> int:
    """GPU 키로 VRAM GB 반환 (알 수 없으면 0)"""
    normalized = normalize_gpu_key(gpu_key)
    return GPU_VRAM.get(normalized, GPU_VRAM.get(gpu_key, 0))


def classify_game_tags(product: dict, fps_data: dict) -> list[str]:
    """
    QHD 기준 FPS 임계값으로 추천 게임 목록 도출.
    - 게이밍 용도가 아닌 제품: 빈 배열 반환
    - FPS 참조 없는 GPU (내장, 전문가 카드): 빈 배열 반환
    - 게임마다 다른 QHD 임계값 적용 → 자연스러운 등급 분화
    """
    usage = product.get("categories", {}).get("usage", [])
    if "게이밍" not in usage:
        return []

    gpu_key = product.get("specs", {}).get("gpu_key", "")
    fps_key = resolve_fps_key(gpu_key, fps_data)
    if fps_key is None:
        return []

    gpu_fps = fps_data[fps_key]
    tags = []
    for game, threshold in GAME_QHD_THRESHOLD.items():
        fps_val = gpu_fps.get(game, {}).get("QHD", 0)
        if fps_val >= threshold:
            tags.append(game)

    return sorted(tags)


def classify_best_for_tags(product: dict, fps_data: dict) -> list[str]:
    """
    GPU 티어 + VRAM + 용도 + 케이스 색상으로 best_for_tags 생성.
    """
    tags = []
    gpu_key  = product.get("specs", {}).get("gpu_key", "")
    price    = product.get("price", 0)
    usage    = product.get("categories", {}).get("usage", [])
    tier     = product.get("categories", {}).get("tier", "")
    case_col = (product.get("case_color") or "").strip()
    fps_key  = resolve_fps_key(gpu_key, fps_data)
    vram     = get_vram(gpu_key)

    is_gaming = "게이밍" in usage

    # ── 4K 게이밍: 하이엔드 티어 + 모든 게임 4K 60fps+ ──────────
    if is_gaming and tier == "하이엔드(4K)" and fps_key:
        gpu_fps = fps_data[fps_key]
        if all(fps_dict.get("4K", 0) >= FPS_4K_MIN for fps_dict in gpu_fps.values()):
            tags.append("4K 게이밍")

    # ── QHD 게이밍: 퍼포먼스 티어 + 모든 게임 QHD 60fps+ ────────
    if is_gaming and tier == "퍼포먼스(QHD)" and fps_key and "4K 게이밍" not in tags:
        gpu_fps = fps_data[fps_key]
        if all(fps_dict.get("QHD", 0) >= FPS_QHD_MIN for fps_dict in gpu_fps.values()):
            tags.append("QHD 게이밍")

    # ── AI 공부용: AI 용도 + 350만 이하 ──────────────────────────
    if "AI/딥러닝" in usage and price <= AI_STUDY_MAX_PRICE:
        tags.append("AI 공부용")

    # ── 로컬 LLM 입문: VRAM 24GB 이상 (AI/게이밍 무관) ──────────
    # OR AI 범주이고 고가 (전문가급 AI 워크스테이션)
    if vram >= LOCAL_LLM_MIN_VRAM or ("AI/딥러닝" in usage and price > AI_STUDY_MAX_PRICE):
        tags.append("로컬 LLM 입문")

    # ── 화이트 감성: 케이스 색상 화이트 ──────────────────────────
    if case_col in ("화이트", "White", "WHITE"):
        tags.append("화이트 감성")

    return sorted(set(tags))


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


def main():
    print("=" * 55)
    print("  제품 분류 엔진 v2 시작")
    print("=" * 55)

    fps_ref  = json.loads(FPS_REF_PATH.read_text(encoding="utf-8"))
    fps_data = fps_ref["gpus"]
    print(f"[OK] fps_reference.json 로드 ({len(fps_data)}개 GPU 모델)")

    raw = PC_DATA_PATH.read_bytes().rstrip(b"\x00")
    pc_data  = json.loads(raw.decode("utf-8"))
    products = pc_data["products"]
    print(f"[OK] pc_data.json 로드 ({len(products)}개 상품)")

    game_tag_counts = {}
    best_for_counts = {}
    no_fps_ref_gpus = set()
    changed = 0

    for p in products:
        gpu_key = p.get("specs", {}).get("gpu_key", "")
        fps_key = resolve_fps_key(gpu_key, fps_data)

        # FPS 참조 없고 게이밍 제품이면 경고 수집
        skip_gpus = {"내장 그래픽", "", None,
                     "AMD 라데온 AI PRO", "RTX A100",
                     "GIGABYTE 지포스 GT", "MSI 지포스 GT1030",
                     "ASUS 지포스 GT730", "액슬 라데온 RX 580 2",
                     "그래픽카드가 없는 반본체 입"}
        if fps_key is None and gpu_key not in skip_gpus:
            usage = p.get("categories", {}).get("usage", [])
            if "게이밍" in usage:
                no_fps_ref_gpus.add(gpu_key)

        new_games = classify_game_tags(p, fps_data)
        new_bf    = classify_best_for_tags(p, fps_data)

        old_games = p.get("categories", {}).get("games", [])
        old_bf    = p.get("best_for_tags", [])

        if sorted(new_games) != sorted(old_games) or sorted(new_bf) != sorted(old_bf):
            changed += 1

        p.setdefault("categories", {})["games"] = new_games
        p["best_for_tags"] = new_bf

        for g in new_games:
            game_tag_counts[g] = game_tag_counts.get(g, 0) + 1
        for t in new_bf:
            best_for_counts[t] = best_for_counts.get(t, 0) + 1

    # ── 결과 출력 ──────────────────────────────────────────────────
    print(f"\n[결과] {changed}개 상품 태그 변경됨\n")

    print("── 게임 태그 분포 ─────────────────────────────")
    for game, cnt in sorted(game_tag_counts.items(), key=lambda x: -x[1]):
        print(f"  {game:<22}: {cnt:>3}개")

    print("\n── best_for_tags 분포 ─────────────────────────")
    for tag, cnt in sorted(best_for_counts.items(), key=lambda x: -x[1]):
        print(f"  {tag:<22}: {cnt:>3}개")

    if no_fps_ref_gpus:
        print("\n[경고] 게이밍 제품 중 fps_reference 없는 GPU:")
        for g in sorted(no_fps_ref_gpus):
            print(f"  - {g!r}")

    # ── 저장 ──────────────────────────────────────────────────────
    atomic_save(PC_DATA_PATH, pc_data)
    print("\n[완료] 분류 엔진 v2 실행 성공 ✅")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n[FATAL] {e}", file=sys.stderr)
        sys.exit(1)
