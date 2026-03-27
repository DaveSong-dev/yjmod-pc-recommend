# 운영 메모 (유지 항목)

배포·검증 담당자가 변경 시 반드시 함께 점검할 사항입니다.

## 1. `getExpectedFps` 추정 문구 ↔ `verify_live_fps.py` 정합성

- 필터로 선택한 게임이 상품 `game_fps`에 없을 때, 프론트는 `js/utils.js`의 `getExpectedFps`로 **참조 데이터 기반 추정**을 노출합니다. 이때 문구에 **`약`** 이 포함되는 패턴이 사용됩니다.
- `scripts/verify_live_fps.py`는 상세 페이지에 해당 게임 FPS가 없을 때, 카드의 동일 게임 줄이 **추정치인지(`약` 포함)** 로 구분해 검증합니다.
- **프론트에서 추정 문구 형식을 바꿀 경우**(예: `약` 제거, 영문화), 검증 규칙을 **같은 PR/배포 주기**에서 맞추지 않으면 `deploy_vercel.ps1` 5단계가 실패할 수 있습니다.

관련 코드:

- `js/utils.js` — `getExpectedFps`
- `scripts/verify_live_fps.py` — `compare_card_and_detail` 내 배틀그라운드 분기

## 2. `enrich_game_fps.py`와 `pc_data.json` 갱신 정책

- `scripts/deploy_vercel.ps1` **1단계**에서 `enrich_game_fps.py`가 실행되며, 상품 상세 URL을 크롤링해 `game_fps` / `game_fps_highlights`를 채운 뒤 **`data/pc_data.json`을 덮어씁니다.**
- 이는 **의도된 동작**입니다(배포 직전 카드 FPS와 쇼핑몰 본문 정합).
- 팀 기준으로 다음을 명확히 관리하는 것을 권장합니다.
  - 배포 전 `pc_data.json` diff 검토·커밋 여부
  - 크롤 실패/부분 실패 시 롤백·재실행 절차
  - 로컬만 수정한 JSON과 enrich 결과 충돌 시 우선순위

관련 스크립트:

- `scripts/enrich_game_fps.py`
- `scripts/deploy_vercel.ps1` (1단계 주석)

## 3. 데스크톱 필터 바 · 카드 CTA 클릭 간섭 (대응함)

- **원인**: `.filter-bar`가 `sticky` + `z-index: 50`으로 카드 위에 쌓여, 스크롤 시 겹치는 좌표에서 필터 박스가 클릭을 선점함.
- **조치**: `css/style.css`에서 **768px 이상**만 `.filter-bar { pointer-events: none; }`, `.filter-bar button { pointer-events: auto; }` 로 실제 버튼만 hit target 유지.

## 4. 배포 파이프라인 전체 green

- `scripts/deploy_vercel.ps1` 전 단계(특히 `enrich_game_fps`·`verify_live_fps`) 완료 여부는 **개별 기능 마감과 분리**해, 배포·운영 담당자의 **별도 주기 점검 항목**으로 관리하는 것을 권장합니다.
