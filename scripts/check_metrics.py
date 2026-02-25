"""pc_data.json 품질 메트릭을 JSON으로 출력 (파이프라인 게이트용)"""
import json
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
pc_data_path = root / "data" / "pc_data.json"

if not pc_data_path.exists():
    print(json.dumps({"count": 0, "sold": 0, "missing": 0}))
    sys.exit(0)

data = json.loads(pc_data_path.read_text(encoding="utf-8"))
products = data.get("products", [])

soldout_keywords = ["품절", "일시품절", "재고없음", "재고 없음", "sold out", "out of stock"]
sold = sum(
    1
    for p in products
    if any(k.lower() in str(p.get("name", "")).lower() for k in soldout_keywords)
)
missing = sum(
    1
    for p in products
    if not (
        str(p.get("specs", {}).get("cpu", "")).strip()
        and str(p.get("specs", {}).get("gpu", "")).strip()
    )
)

print(json.dumps({"count": len(products), "sold": sold, "missing": missing}))
