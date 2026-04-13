"""
patch_feed_missing.py — feed.json 보완 + 품절 상품 정리

두 가지 작업을 순서대로 수행한다:

  1. [정리] soldout_log.json에 등록된 품절 상품을 feed.json에서 제거
     → 파일이 무한정 커지는 것을 방지
     → revived=true 항목은 보존

  2. [추가] pc_data.json에 있지만 feed.json에 없는 상품에 기본 v2 항목 생성
     → 이미 feed에 있는 ID는 건너뜀(중복 방지)
     → GPU 스펙 + fps_reference.json 기반 추정값

실행:  python scripts/patch_feed_missing.py [--dry-run]
"""

import json, re, sys, shutil
from pathlib import Path

ROOT      = Path(__file__).parent.parent
PC_DATA   = ROOT / "data" / "pc_data.json"
FEED_FILE = ROOT / "data" / "reco" / "v2.0.0" / "feed.json"
FPS_REF   = ROOT / "data" / "fps_reference.json"
SOLDOUT   = ROOT / "data" / "soldout_log.json"
DRY_RUN   = "--dry-run" in sys.argv

# ────────────────────────────────────────────────────────────
# 유틸
# ────────────────────────────────────────────────────────────

def load_pc_data():
    content = PC_DATA.read_text(encoding="utf-8")
    decoder = json.JSONDecoder()
    data, _ = decoder.raw_decode(content)
    return data["products"]

def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))

def _gpu_text(p):
    specs = p.get("specs", {})
    return " ".join(filter(None, [
        str(specs.get("gpu_short", "") or ""),
        str(specs.get("gpu", "") or ""),
    ])).strip()

def _cpu_text(p):
    specs = p.get("specs", {})
    return str(specs.get("cpu_short", "") or specs.get("cpu", "") or "")

def _vram_gb(p):
    gpu = _gpu_text(p)
    m = re.search(r"(\d+)\s*GB", gpu, re.I)
    return int(m.group(1)) if m else 0

def _ram_gb(p):
    specs = p.get("specs", {})
    ram_str = str(specs.get("ram", "") or "")
    m = re.search(r"(\d+)\s*GB", ram_str, re.I)
    return int(m.group(1)) if m else 0

def _ssd_gb(p):
    specs = p.get("specs", {})
    ssd_str = str(specs.get("ssd", "") or "")
    total = 0
    for m in re.finditer(r"(\d+)\s*(TB|GB)", ssd_str, re.I):
        val = int(m.group(1))
        total += val * 1024 if m.group(2).upper() == "TB" else val
    return total or 0

# ────────────────────────────────────────────────────────────
# GPU 분류
# ────────────────────────────────────────────────────────────

GPU_TIER_MAP = [
    (r"5090|4090|9090",                  "flagship",    "nvidia_ultra"),
    (r"5080|4080\s*Super|4080",          "high",        "nvidia_high"),
    (r"5070\s*Ti|4070\s*Ti\s*Super|4070\s*Ti", "upper", "nvidia_high"),
    (r"5070(?!\s*Ti)|4070\s*Super|9070\s*XT",  "mid_high", "nvidia_mid"),
    (r"5060\s*Ti|4070(?!\s*Super|\s*Ti)|9070(?!\s*XT)", "mid", "nvidia_mid"),
    (r"5060(?!\s*Ti)|4060\s*Ti|9060\s*XT",     "entry_mid","nvidia_entry"),
    (r"4060(?!\s*Ti)|RX\s*7600|7500",           "entry",    "nvidia_entry"),
    (r"RX\s*6[5-9]\d{2}|RX\s*7[5-9]\d{2}",     "mid",      "amd_mid"),
    (r"Arc\s*B\d{3}",                           "entry_mid","intel_entry"),
    (r"UHD|Vega|内\s*蔵|integrated",           "igpu",     "igpu"),
]

def _gpu_tier_info(gpu_text):
    for pattern, tier, tensor in GPU_TIER_MAP:
        if re.search(pattern, gpu_text, re.I):
            return tier, tensor
    return "entry", "nvidia_entry"

# ────────────────────────────────────────────────────────────
# 등급 계산
# ────────────────────────────────────────────────────────────

TIER_TO_GAMING_FHD = {
    "flagship": "excellent", "high": "excellent", "upper": "strong",
    "mid_high": "strong",    "mid": "good",       "entry_mid": "good",
    "entry": "standard",     "igpu": "poor",
}
TIER_TO_GAMING_QHD = {
    "flagship": "excellent", "high": "strong", "upper": "strong",
    "mid_high": "good",      "mid": "good",    "entry_mid": "standard",
    "entry": "poor",         "igpu": "poor",
}
TIER_TO_GAMING_4K = {
    "flagship": "strong",    "high": "good",   "upper": "good",
    "mid_high": "standard",  "mid": "poor",    "entry_mid": "poor",
    "entry": "poor",         "igpu": "poor",
}

def _ai_grade(vram, tensor):
    if tensor == "igpu": return 0
    if vram >= 24: return 4
    if vram >= 16: return 3
    if vram >= 12: return 2
    if vram >= 8:  return 1
    return 0

def _imggen_grade(vram, tensor):
    if tensor == "igpu": return 0
    if vram >= 24: return 4
    if vram >= 16: return 3
    if vram >= 12: return 2
    if vram >= 8:  return 1
    return 0

def _local_ai_grade(vram, tensor):
    if tensor == "igpu": return 0
    if vram >= 24: return 4
    if vram >= 16: return 3
    if vram >= 12: return 2
    if vram >= 8:  return 1
    return 0

# ────────────────────────────────────────────────────────────
# FPS 데이터
# ────────────────────────────────────────────────────────────

GAME_KEY_MAP = {
    "lol": ["리그오브레전드", "LOL"],
    "pubg": ["배틀그라운드", "PUBG"],
    "lostark": ["로스트아크"],
    "valorant": ["발로란트"],
    "overwatch2": ["오버워치2", "오버워치"],
    "aion2": ["아이온2"],
    "diablo4": ["디아블로4"],
}

def _gpu_norm_from_text(gpu_text):
    # fps_reference.json 키와 매핑
    patterns = [
        (r"RTX\s*5090", "RTX 5090"),
        (r"RTX\s*5080", "RTX 5080"),
        (r"RTX\s*5070\s*Ti", "RTX 5070 Ti"),
        (r"RTX\s*5070(?!\s*Ti)", "RTX 5070"),
        (r"RTX\s*5060\s*Ti", "RTX 5060 Ti"),
        (r"RTX\s*5060(?!\s*Ti)", "RTX 5060"),
        (r"RTX\s*4090", "RTX 4090"),
        (r"RTX\s*4080\s*Super", "RTX 4080 Super"),
        (r"RTX\s*4080(?!\s*Super)", "RTX 4080"),
        (r"RTX\s*4070\s*Ti\s*Super", "RTX 4070 Ti Super"),
        (r"RTX\s*4070\s*Ti(?!\s*Super)", "RTX 4070 Ti"),
        (r"RTX\s*4070\s*Super", "RTX 4070 Super"),
        (r"RTX\s*4070(?!\s*(Ti|Super))", "RTX 4070"),
        (r"RTX\s*4060\s*Ti", "RTX 4060 Ti"),
        (r"RTX\s*4060(?!\s*Ti)", "RTX 4060"),
        (r"RX\s*9070\s*XT", "RX 9070 XT"),
        (r"RX\s*9070(?!\s*XT)", "RX 9070"),
        (r"RX\s*7900\s*XT", "RX 7900 XT"),
        (r"RX\s*7800\s*XT", "RX 7800 XT"),
        (r"RX\s*7700\s*XT", "RX 7700 XT"),
        (r"RX\s*7600\s*XT", "RX 7600 XT"),
        (r"RX\s*7600(?!\s*XT)", "RX 7600"),
        (r"Arc\s*B580", "Arc B580"),
    ]
    for pat, norm in patterns:
        if re.search(pat, gpu_text, re.I):
            return norm
    return None

def _get_fps_from_ref(gpu_norm, fps_ref):
    """fps_reference.json에서 gpu_norm 기준 FPS 딕셔너리 반환"""
    if not fps_ref or not gpu_norm:
        return {}, {}, {}
    gpu_data = fps_ref.get("gpus", {}).get(gpu_norm)
    if not gpu_data:
        return {}, {}, {}
    games_1080 = {}
    games_1440 = {}
    games_4k   = {}
    for game_key, resolutions in gpu_data.items():
        fps_1080 = resolutions.get("1080p") or resolutions.get("fhd")
        fps_1440 = resolutions.get("1440p") or resolutions.get("qhd")
        fps_4k   = resolutions.get("2160p") or resolutions.get("4k") or resolutions.get("uhd")
        if fps_1080: games_1080[game_key] = fps_1080
        if fps_1440: games_1440[game_key] = fps_1440
        if fps_4k:   games_4k[game_key]   = fps_4k
    return games_1080, games_1440, games_4k

# ────────────────────────────────────────────────────────────
# 태그 생성
# ────────────────────────────────────────────────────────────

def _price_band(price):
    if price >= 4000000: return "400만 원 이상"
    if price >= 3000000: return "300~400만 원"
    if price >= 2000000: return "200~300만 원"
    if price >= 1500000: return "150~200만 원"
    if price >= 1000000: return "100~150만 원"
    return "100만 원 미만"

def _spec_band(tier):
    if tier in ("flagship", "high", "upper"): return "4K 하이엔드"
    if tier in ("mid_high", "mid"):           return "QHD 퍼포먼스"
    return "FHD 가성비"

def _usage_tags(tier, vram, ram):
    tags = ["게이밍"]
    if tier not in ("igpu",):
        tags.append("사무/디자인")
    if tier in ("flagship", "high", "upper", "mid_high"):
        tags.extend(["영상편집", "방송/스트리밍"])
    if vram >= 8:
        tags.append("AI·딥러닝")
    if vram >= 12:
        tags.append("3D 모델링")
    return list(dict.fromkeys(tags))

def _best_for_tags(tier, vram, ram, ssd, price):
    tags = []
    if tier in ("flagship", "high"):
        tags.append("4K 게이밍")
    if tier in ("upper", "mid_high"):
        tags.append("QHD 게이밍")
    if tier not in ("flagship", "high", "upper", "mid_high"):
        tags.append("FHD 게이밍")
    if vram >= 16:
        tags.append("로컬 LLM 구동")
        tags.append("AI 공부용")
    elif vram >= 8:
        tags.append("AI 공부용")
    if vram >= 12:
        tags.append("3D 모델링 표준")
    if ram >= 32:
        tags.append("멀티태스킹")
    if ssd >= 2048:
        tags.append("대용량 저장")
    return tags

def _selling_points(tier, vram, ram, ssd, wifi):
    pts = []
    if ram >= 32:
        pts.append(f"{ram}GB 메모리")
    if ssd >= 2048:
        pts.append(f"{ssd//1024}TB 저장공간")
    elif ssd >= 1024:
        pts.append("1TB SSD 기본")
    if vram >= 16:
        pts.append(f"{vram}GB VRAM 탑재")
    if wifi:
        pts.append("Wi-Fi 내장")
    if tier in ("flagship", "high"):
        pts.append("최고 사양 하이엔드")
    elif tier in ("upper", "mid_high"):
        pts.append("QHD 퍼포먼스 최적화")
    return pts[:5]

def _summary_reason(gpu_norm, tier, vram, ram):
    gpu_label = gpu_norm or "내장그래픽"
    if tier == "flagship":
        return f"{gpu_label} 기반 최고 사양 제품으로 모든 작업에 최적화되어 있습니다."
    if tier in ("high", "upper"):
        return f"{gpu_label}로 QHD·4K 게이밍과 영상편집을 동시에 커버합니다."
    if tier in ("mid_high", "mid"):
        return f"{gpu_label} 탑재로 QHD 게이밍과 가성비 멀티태스킹에 추천합니다."
    if tier == "entry_mid":
        return f"{gpu_label}로 FHD 게이밍과 일반 사무용으로 적합합니다."
    return "입문형 사양으로 사무·인터넷 등 가벼운 작업에 적합합니다."

def _display_badges(tier, vram, ram, color):
    badges = []
    if tier in ("flagship", "high"):
        badges.append("4K")
    elif tier in ("upper", "mid_high"):
        badges.append("QHD")
    else:
        badges.append("FHD")
    if ram >= 32:
        badges.append(f"{ram}GB")
    if vram >= 16:
        badges.append(f"VRAM{vram}G")
    if color and color.lower() in ("white", "화이트"):
        badges.append("화이트")
    return badges[:4]

# ────────────────────────────────────────────────────────────
# 메인 변환
# ────────────────────────────────────────────────────────────

def make_v2_entry(product, fps_ref):
    it_id  = str(product.get("id", ""))
    name   = product.get("name", "")
    price  = product.get("price", 0) or 0
    color  = product.get("case_color", "") or ""

    gpu_text = _gpu_text(product)
    cpu_text = _cpu_text(product)
    vram = _vram_gb(product)
    ram  = _ram_gb(product)
    ssd  = _ssd_gb(product)

    tier, tensor = _gpu_tier_info(gpu_text)
    gpu_norm = _gpu_norm_from_text(gpu_text)
    cpu_norm = re.search(r"(i[3579]-\d{5}[A-Z]?|Ryzen\s*[357]\s*\d{4}[A-Z]?|[\w\d]+\s*\d{3,4}[A-Z]?)", cpu_text, re.I)
    cpu_norm_str = cpu_norm.group(1) if cpu_norm else cpu_text[:20]

    fps_1080, fps_1440, fps_4k = _get_fps_from_ref(gpu_norm, fps_ref)

    ai_ready     = vram >= 8 and tensor != "igpu"
    llm_entry    = vram >= 12 and tensor != "igpu"
    local_ai     = _local_ai_grade(vram, tensor)
    imggen       = _imggen_grade(vram, tensor)

    # rank_score: 기본 점수 (GPU 등급 + 스펙 가산)
    tier_score = {"flagship": 90, "high": 80, "upper": 75, "mid_high": 70,
                  "mid": 60, "entry_mid": 50, "entry": 40, "igpu": 20}
    rank_score = tier_score.get(tier, 40)
    if ram >= 32: rank_score += 3
    if ssd >= 2048: rank_score += 2
    if ai_ready: rank_score += 2

    # 케이스 색상 정규화
    color_raw = "white" if color in ("화이트", "white") else ("black" if color in ("블랙", "black") else "other")

    entry = {
        "dataset_version": "2.0.0-patch",
        "it_id": it_id,
        "name": name,
        "detail_url": product.get("url", ""),
        "image_url": product.get("thumbnail", ""),
        "price_effective": float(price),
        "price_is_estimated": False,
        "price_source": "source_price",
        "frontend_price_band": _price_band(price),
        "recommendable": True,
        "recommend_group": "consumer_general",
        "product_type": "consumer_complete",
        "raw_soldout": False,
        "inventory_sync_warning": False,
        "cpu_norm": cpu_norm_str,
        "gpu_norm": gpu_norm or gpu_text[:30],
        "ram_gb": float(ram),
        "ssd_total_gb": float(ssd),
        "gpu_vram_gb": float(vram),
        "power_watt": None,
        "case_color": color_raw,
        "wifi_support": False,
        "gaming_grade_fhd": TIER_TO_GAMING_FHD.get(tier, "standard"),
        "gaming_grade_qhd": TIER_TO_GAMING_QHD.get(tier, "poor"),
        "gaming_grade_4k":  TIER_TO_GAMING_4K.get(tier, "poor"),
        "video_edit_grade": "good" if tier in ("flagship","high","upper") else ("standard" if tier == "mid_high" else "poor"),
        "office_grade": "good",
        "modeling_grade": "good" if vram >= 12 else ("standard" if vram >= 8 else "poor"),
        "ai_ready": ai_ready,
        "llm_entry_ready": llm_entry,
        "gpu_tensor_class": tensor,
        "vram_class": f"{vram}gb" if vram else "unknown",
        "local_ai_grade": local_ai,
        "image_gen_local_grade": imggen,
        "frontend_primary_usage": "게이밍",
        "frontend_game_tags": ["리그오브레전드", "배틀그라운드", "로스트아크"],
        "frontend_usage_tags": _usage_tags(tier, vram, ram),
        "frontend_installment_tags": [],
        "frontend_spec_band": _spec_band(tier),
        "best_for_tags": _best_for_tags(tier, vram, ram, ssd, price),
        "selling_points": _selling_points(tier, vram, ram, ssd, False),
        "display_badges": _display_badges(tier, vram, ram, color),
        "summary_reason": _summary_reason(gpu_norm, tier, vram, ram),
        "fps_1080p": fps_1080 or None,
        "fps_1440p": fps_1440 or None,
        "fps_4k_corrected": fps_4k or None,
        "frontend_rank_score": rank_score,
    }
    return entry

# ────────────────────────────────────────────────────────────
# 실행
# ────────────────────────────────────────────────────────────

def load_soldout_ids():
    """soldout_log.json에서 revived=false인 ID 집합 반환"""
    if not SOLDOUT.exists():
        return set()
    try:
        data = load_json(SOLDOUT)
        return {
            str(entry.get("id", ""))
            for entry in data.get("soldout", [])
            if not entry.get("revived", False)
        }
    except Exception as e:
        print(f"[patch] WARN: soldout_log 로드 실패 — {e}")
        return set()


def main():
    products = load_pc_data()
    feed     = load_json(FEED_FILE)
    fps_ref  = {}
    if FPS_REF.exists():
        fps_ref = load_json(FPS_REF)

    # ── 단계 1: soldout 정리 ──────────────────────────────────
    soldout_ids = load_soldout_ids()
    if soldout_ids:
        before = len(feed)
        feed = [item for item in feed if str(item.get("it_id", "")) not in soldout_ids]
        removed = before - len(feed)
        print(f"[patch] 품절 정리: {removed}개 제거 (soldout {len(soldout_ids)}개 기준)")
    else:
        print("[patch] 품절 정리: soldout_log 없음 또는 비어 있음 — 건너뜀")

    # ── 단계 2: 미매칭 상품 추가 ─────────────────────────────
    # 품절 ID는 재추가하지 않음 (방금 feed에서 지운 것들)
    feed_ids  = {str(item.get("it_id", "")) for item in feed}
    unmatched = [
        p for p in products
        if str(p.get("id", "")) not in feed_ids        # feed에 없고
        and str(p.get("id", "")) not in soldout_ids    # 품절도 아닌 것만
    ]

    print(f"[patch] 상품: {len(products)}, feed 현재: {len(feed)}, 미매칭: {len(unmatched)}")

    new_entries = []
    for p in unmatched:
        entry = make_v2_entry(p, fps_ref)
        new_entries.append(entry)

    if new_entries:
        print(f"[patch] 신규 항목 {len(new_entries)}개 생성")
    else:
        print("[patch] 신규 항목 없음 — 모든 상품이 feed에 있습니다")

    if DRY_RUN:
        print("[dry-run] 저장 건너뜀.")
        if new_entries:
            print("첫 샘플:")
            print(json.dumps(new_entries[0], ensure_ascii=False, indent=2)[:400])
        return

    # 변경이 없으면 파일 쓰기 생략
    if not new_entries and not soldout_ids:
        print("[patch] 변경 없음 — feed.json 유지")
        return

    # 백업
    backup = FEED_FILE.with_suffix(".json.bak")
    shutil.copy2(FEED_FILE, backup)
    print(f"[patch] 백업: {backup}")

    merged = feed + new_entries
    FEED_FILE.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[patch] 완료. feed.json 총 항목: {len(merged)}")


if __name__ == "__main__":
    main()
