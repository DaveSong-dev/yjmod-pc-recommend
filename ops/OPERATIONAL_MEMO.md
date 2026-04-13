# Operational Memo

## 프론트엔드 배포와 데이터 갱신 경로

- `scripts/deploy_vercel.ps1`
  - 프론트엔드 빌드
  - 루트 프로젝트를 Vercel 프로덕션으로 배포
  - 운영 위자드/전환 QA 검증
  - 데이터 파일을 갱신하지 않음

- `scripts/run-auto-update.ps1`
  - 상품/카페 크롤링
  - `data/pc_data.json` 갱신
  - `enrich_game_fps.py` 실행
  - 프론트엔드 빌드 + 프로덕션 배포
  - `verify_live_fps.py` 실행

## 캐시 불일치 방지

- 루트 `index.html`은 `app.js?v=<build-id>` 형식으로 모듈을 로드합니다.
- build id는 하드코딩하지 않고 문서의 `lastModified` 기반으로 계산합니다.
- 운영 HTML은 반드시 재검증하고, 새 세션에서 열어 HTML/JS 조합이 최신인지 확인합니다.

## 오프라인 실행

- 루트 `index.html`은 HTTP/HTTPS 전용입니다.
- `file://` 오프라인 데모는 `build/yjmod-single.html`만 사용합니다.

## 디버그 로그 기준

- 기본 상태에서는 콘솔을 조용하게 유지합니다.
- `?debug=1` 또는 `localStorage.yjmodDebug=1`에서만 위자드 상세 추적 로그를 사용합니다.
- 프로덕션 장애 대응 시 필요한 최소 포인트:
  - `[BUILD]`
  - `[CATALOG READY]`
  - 위자드 event / step / render / result 로그
