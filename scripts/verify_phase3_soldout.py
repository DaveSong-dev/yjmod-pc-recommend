"""Phase 3 품절 관리 검증용 (로컬 실행)."""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def check_soldout_log():
    p = ROOT / "data" / "soldout_log.json"
    if not p.exists():
        print("soldout_log.json 없음 FAIL")
        return 1
    data = json.loads(p.read_text(encoding="utf-8"))
    print("soldout_log.json 존재 OK")
    sold = data.get("soldout") or []
    print(f"품절 상품: {len(sold)}개")
    for item in sold[:3]:
        name = (item.get("name") or "")[:30]
        print(f"  - {item.get('id')}: {name}")
    return 0


def simulate_revive_ready():
    p = ROOT / "data" / "soldout_log.json"
    log = json.loads(p.read_text(encoding="utf-8"))
    sold = log.get("soldout") or []
    if not sold:
        print("soldout 배열 비어 있음 (in_stock=False 크롤 시 항목 추가됨)")
        return 0
    test_id = sold[0]["id"]
    print(f"테스트 상품 ID: {test_id}")
    product = next((x for x in sold if x["id"] == test_id), None)
    if product:
        print(f"상품명: {product.get('name', '')}")
        print("복원 API 테스트 준비 완료 OK")
    return 0


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "log"
    sys.exit(check_soldout_log() if cmd == "log" else simulate_revive_ready())
