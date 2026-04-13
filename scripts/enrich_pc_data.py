"""
enrich_pc_data.py
-----------------
pc_data.json의 428개 상품에 대해:
  1. categories.usage  — GPU/가격/이름 기반으로 누락 태그 보강
  2. best_for_tags     — 상품 루트 레벨에 세부 필터 태그 추가

실행 방법:
  python scripts/enrich_pc_data.py
  python scripts/enrich_pc_data.py --dry-run   (저장 안 하고 통계만 출력)
"""

from __future__ import annotations
import argparse
import copy
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "pc_data.json"
BACKUP_FILE = ROOT / "data" / "pc_data_backup.json"


# ─────────────────────────────────────────────────────────────────────────────
# GPU 티어 판별 정규식 (gpu_short / gpu_key 기준)
# ─────────────────────────────────────────────────────────────────────────────

def _gpu_text(p: dict) -> str:
    specs = p.get("specs", {})
    parts = [
        specs.get("gpu_short", ""),
        specs.get("gpu_key", ""),
        specs.get("gpu", ""),
        p.get("name", ""),
        p.get("subtitle", ""),
    ]
    return " ".join(str(x) for x in parts if x).upper()


def _is_integrated(gpu: str) -> bool:
    return bool(re.search(r"내장|UHD\s*\d+|VEGA\s+\d+|RADEON\s+GRAPHICS|IRIS|HD\s+GRAPHICS|INTEGRATED", gpu))


def _has_rtx(gpu: str) -> bool:
    return "RTX" in gpu


def _has_rx(gpu: str) -> bool:
    return bool(re.search(r"\bRX\s*\d{3,4}", gpu))


def _rtx_series(gpu: str) -> int | None:
    """RTX 시리즈 첫 두 자리 반환. 예: RTX 4070 → 40, RTX 5060 → 50"""
    m = re.search(r"RTX\s*(\d)(\d)\d{2}", gpu)
    if m:
        return int(m.group(1) + m.group(2))
    return None


def _rtx_model(gpu: str) -> int | None:
    """RTX 모델 번호 반환. 예: RTX 4070 → 4070, RTX 3060 Ti → 3060"""
    m = re.search(r"RTX\s*(\d{4})", gpu)
    return int(m.group(1)) if m else None


def _vram_gb_from_specs(p: dict) -> int:
    """specs.gpu 필드에서만 VRAM GB 추출 (이름/RAM 용량 오검출 방지). 못 찾으면 0"""
    gpu_spec = p.get("specs", {}).get("gpu", "")
    m = re.search(r"(\d+)\s*GB", gpu_spec.upper())
    return int(m.group(1)) if m else 0


def _vram_gb(gpu: str) -> int:
    """GPU 문자열에서 VRAM GB 추출. 못 찾으면 0 (레거시 인터페이스 유지)"""
    m = re.search(r"(\d+)\s*GB", gpu)
    return int(m.group(1)) if m else 0


# ─────────────────────────────────────────────────────────────────────────────
# 1. usage 보강
# ─────────────────────────────────────────────────────────────────────────────

def enrich_usage(p: dict) -> list[str]:
    existing = set(p.get("categories", {}).get("usage", []))
    gpu = _gpu_text(p)
    price = p.get("price", 0) or 0
    name_upper = (p.get("name", "") + " " + p.get("subtitle", "")).upper()

    result = set(existing)

    # ── 사무/디자인 ──────────────────────────────────────────
    if _is_integrated(gpu) or price < 800_000:
        result.add("사무/디자인")
    if re.search(r"사무|오피스|업무|문서|인터넷", name_upper):
        result.add("사무/디자인")

    # ── 영상편집 ────────────────────────────────────────────
    is_edit_gpu = bool(re.search(
        r"RTX\s*(20[6-9]\d|[3-9]\d{3}|[1-9]\d{4})|RX\s*[6-9][5-9]\d{2}|RX\s*[7-9]\d{3}|RX\s*9\d{3}",
        gpu
    ))
    if is_edit_gpu and price >= 1_000_000:
        result.add("영상편집")
    if re.search(r"영상\s*편집|프리미어|에펙|애프터이펙|PREMIERE|AFTER\s*EFFECT", name_upper):
        result.add("영상편집")

    # ── 3D 모델링 ────────────────────────────────────────────
    is_3d_gpu = bool(re.search(
        r"RTX\s*(30[6-9]\d|[4-9]\d{3}|[1-9]\d{4})|RX\s*[6-9][6-9]\d{2}|RX\s*[7-9]\d{3}|RX\s*9\d{3}",
        gpu
    ))
    if is_3d_gpu and price >= 1_500_000:
        result.add("3D 모델링")
    if re.search(r"3D|모델링|블렌더|CAD|렌더링|MAYA|CINEMA|BLENDER|SKETCHUP", name_upper):
        result.add("3D 모델링")

    # ── AI/딥러닝 ────────────────────────────────────────────
    vram = _vram_gb_from_specs(p)
    if vram >= 16:
        result.add("AI/딥러닝")
    series = _rtx_series(gpu)
    if series in (40, 50) and price >= 2_000_000:
        result.add("AI/딥러닝")
    if re.search(r"딥러닝|머신러닝|CUDA|딥 러닝|AI\s*전문|DEEP\s*LEARN", name_upper):
        result.add("AI/딥러닝")

    # ── 방송/스트리밍 ────────────────────────────────────────
    if _has_rtx(gpu) and price >= 1_500_000:
        result.add("방송/스트리밍")
    if re.search(r"방송|스트리밍|OBS|인코딩|송출|STREAM", name_upper):
        result.add("방송/스트리밍")

    return sorted(result)


# ─────────────────────────────────────────────────────────────────────────────
# 2. best_for_tags 생성
# ─────────────────────────────────────────────────────────────────────────────

def generate_best_for_tags(p: dict) -> list[str]:
    tags: set[str] = set()
    gpu = _gpu_text(p)
    price = p.get("price", 0) or 0
    cats = p.get("categories", {})
    tier = cats.get("tier", "")
    badge = str(p.get("badge", "") or "")
    case_color = str(p.get("case_color", "") or "")
    installment = int(p.get("installment_months", 0) or 0)
    usage = set(enrich_usage(p))
    model = _rtx_model(gpu)
    series = _rtx_series(gpu)
    vram = _vram_gb_from_specs(p)

    # ── 게이밍 해상도 티어 ────────────────────────────────────
    if tier == "가성비(FHD)":
        tags.add("FHD 게이밍")
    if tier == "퍼포먼스(QHD)":
        tags.add("QHD 게이밍")
    if tier == "하이엔드(4K)":
        tags.add("4K 게이밍")

    # ── AI 공부용: RTX 3060~4070 or 첫 AI 입문 가격대 ──────
    is_ai_entry = (
        (model and 3060 <= model <= 4070 and price < 2_500_000)
        or (series == 50 and price < 2_000_000)
    )
    if is_ai_entry:
        tags.add("AI 공부용")

    # ── 로컬 LLM: VRAM 16GB+ or RTX 4080/4090/5080/5090 ───
    is_llm = vram >= 16 or bool(re.search(r"RTX\s*(4080|4090|5080|5090)", gpu))
    if is_llm:
        tags.add("AI 공부용")
        tags.add("로컬 LLM")

    # ── 로컬 AI 입문: RTX 3060/4060 계열 + 저가 ────────────
    is_local_ai_entry = bool(re.search(r"RTX\s*(3060|4060)\b", gpu)) and price < 2_000_000
    if is_local_ai_entry:
        tags.add("로컬 AI 입문")
        tags.add("AI 공부용")

    # ── 감성 ──────────────────────────────────────────────
    if case_color == "화이트" or "화이트 감성" in badge:
        tags.add("화이트 감성")
    if case_color == "블랙" or "블랙 감성" in badge:
        tags.add("블랙 감성")

    # ── 사무/멀티태스킹 ────────────────────────────────────
    if "사무/디자인" in usage and price < 1_500_000:
        tags.add("사무/멀티태스킹")

    # ── 영상편집 입문 / 표준 ──────────────────────────────
    if "영상편집" in usage:
        if price < 1_500_000:
            tags.add("영상편집 입문")
        else:
            tags.add("영상편집 표준")

    # ── 무이자 할부 ────────────────────────────────────────
    if installment == 24:
        tags.add("24개월 무이자")
    if installment == 36:
        tags.add("36개월 무이자")

    return sorted(tags)


# ─────────────────────────────────────────────────────────────────────────────
# 메인 실행
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="pc_data.json usage/best_for_tags 보강")
    parser.add_argument("--dry-run", action="store_true", help="저장 없이 통계만 출력")
    args = parser.parse_args()

    raw = DATA_FILE.read_text(encoding="utf-8")
    data = json.loads(raw)
    products = data["products"]
    total = len(products)

    enriched = copy.deepcopy(products)

    from collections import Counter
    usage_counter: Counter = Counter()
    tag_counter: Counter = Counter()
    usage_changed = 0
    tag_added = 0

    for p in enriched:
        # usage 보강
        old_usage = set(p.get("categories", {}).get("usage", []))
        new_usage = enrich_usage(p)
        if set(new_usage) != old_usage:
            usage_changed += 1
        if "categories" not in p:
            p["categories"] = {}
        p["categories"]["usage"] = new_usage
        for u in new_usage:
            usage_counter[u] += 1

        # best_for_tags 추가 (루트 레벨)
        bft = generate_best_for_tags(p)
        old_bft = set(p.get("best_for_tags", []) or [])
        if set(bft) != old_bft:
            tag_added += 1
        p["best_for_tags"] = bft
        for t in bft:
            tag_counter[t] += 1

    print(f"\n=== enrich_pc_data.py 결과 ({'DRY RUN' if args.dry_run else '실제 저장'}) ===")
    print(f"총 상품: {total}개")
    print(f"usage 변경된 상품: {usage_changed}개")
    print(f"best_for_tags 변경된 상품: {tag_added}개")

    print("\n─── usage 분포 ───────────────────────────────")
    for k, v in usage_counter.most_common():
        print(f"  {k}: {v}개")

    print("\n─── best_for_tags 분포 ───────────────────────")
    for k, v in tag_counter.most_common():
        print(f"  {k}: {v}개")

    if args.dry_run:
        print("\n[DRY RUN] 파일 저장 건너뜀.")
        return

    # 백업
    BACKUP_FILE.write_text(raw, encoding="utf-8")
    print(f"\n백업 저장: {BACKUP_FILE}")

    # 저장
    data["products"] = enriched
    out = json.dumps(data, ensure_ascii=False, indent=2)
    DATA_FILE.write_text(out, encoding="utf-8")
    print(f"저장 완료: {DATA_FILE}")


if __name__ == "__main__":
    main()
