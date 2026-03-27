from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "pc_data.json"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
}

FPS_RESOLUTION_PATTERN = re.compile(r"(FHD|QHD|4K)", re.I)
GAME_FPS_ALIAS_MAP = {
    "리그오브레전드": ["리그오브레전드", "LOL", "롤"],
    "배틀그라운드": ["배틀그라운드", "배그", "PUBG"],
    "로스트아크": ["로스트아크", "로아"],
    "발로란트": ["발로란트", "발로"],
    "오버워치2": ["오버워치2", "오버워치"],
    "아이온2": ["아이온2", "아이온 2"],
    "디아블로4": ["디아블로4", "디아4"],
    "디아블로2": ["디아블로2", "디아2"],
    "붉은사막": ["붉은사막"],
    "몬스터헌터 와일드": ["몬스터헌터 와일드", "몬스터헌터", "몬헌", "와일즈"],
    "플심": ["플심", "플라이트 시뮬레이터", "MSFS"],
    "아크레이더스": ["아크레이더스"],
    "연운": ["연운"],
}
GAME_ALIAS_LOOKUP = {
    alias.lower(): game
    for game, aliases in GAME_FPS_ALIAS_MAP.items()
    for alias in aliases
}
GAME_ALIAS_PATTERN = "|".join(
    re.escape(alias)
    for alias in sorted(GAME_ALIAS_LOOKUP.keys(), key=len, reverse=True)
)
GAME_FPS_FORWARD_PATTERN = re.compile(
    rf"(?:(FHD|QHD|4K)\s*)?({GAME_ALIAS_PATTERN})[^0-9]{{0,18}}(\d{{2,4}})\s*(?:FPS|프레임)",
    re.I,
)
def normalize_text_compact(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def build_game_fps_highlight(game: str, fps: int, resolution: str | None = None) -> str:
    fps_label = f"{int(fps)} FPS"
    if resolution:
        return f"{resolution} {game} {fps_label}"
    return f"{game} {fps_label}"


def should_replace_game_fps(existing: dict | None, candidate: dict) -> bool:
    if not existing:
        return True
    if not existing.get("resolution") and candidate.get("resolution"):
        return True
    if existing.get("source") != "detail" and candidate.get("source") == "detail":
        return True
    return False


def extract_game_fps_map(name: str, page_text: str) -> dict[str, dict]:
    extracted: dict[str, dict] = {}

    for source_name, raw_text in (("name", name), ("detail", page_text)):
        text = normalize_text_compact(raw_text)
        if len(text) < 5:
            continue

        for match in GAME_FPS_FORWARD_PATTERN.finditer(text):
            resolution_raw, alias_raw, fps_raw = match.groups()

            try:
                fps = int(fps_raw)
            except (TypeError, ValueError):
                continue

            if fps < 20 or fps > 1000:
                continue

            alias_key = str(alias_raw or "").lower().strip()
            game = GAME_ALIAS_LOOKUP.get(alias_key)
            if not game:
                continue

            resolution = resolution_raw.upper() if resolution_raw else None
            if not resolution:
                window = text[max(0, match.start() - 16): min(len(text), match.end() + 16)]
                nearby_resolution = FPS_RESOLUTION_PATTERN.search(window)
                resolution = nearby_resolution.group(1).upper() if nearby_resolution else None

            candidate = {
                "fps": fps,
                "resolution": resolution,
                "label": game,
                "highlight": build_game_fps_highlight(game, fps, resolution),
                "source": source_name,
            }

            if should_replace_game_fps(extracted.get(game), candidate):
                extracted[game] = candidate

    return extracted


def fetch_page_text(session: requests.Session, url: str) -> str:
    if not url:
        return ""
    try:
        resp = session.get(url, timeout=20)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "lxml")
        return soup.get_text(" ", strip=True)
    except Exception:
        return ""


def enrich_one(product: dict) -> dict:
    session = requests.Session()
    session.headers.update(HEADERS)
    page_text = fetch_page_text(session, product.get("url", ""))
    fps_map = extract_game_fps_map(product.get("name", ""), page_text)

    product["game_fps"] = {
        game: {
            "fps": info["fps"],
            "resolution": info["resolution"],
            "label": info["label"],
        }
        for game, info in fps_map.items()
    }
    product["game_fps_highlights"] = [info["highlight"] for info in fps_map.values()]
    return product


def main() -> None:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    products = payload.get("products", [])
    total = len(products)
    print(f"[INFO] enriching game fps for {total} products")

    updated = [None] * total
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_map = {
            executor.submit(enrich_one, product): idx
            for idx, product in enumerate(products)
        }
        for done_count, future in enumerate(as_completed(future_map), start=1):
            idx = future_map[future]
            updated[idx] = future.result()
            if done_count % 25 == 0 or done_count == total:
                print(f"[INFO] progress {done_count}/{total}")

    payload["products"] = updated
    DATA_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] updated {DATA_PATH}")


if __name__ == "__main__":
    main()
