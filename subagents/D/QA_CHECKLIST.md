# SubAgent D - QA/회귀검증 체크리스트

## 로컬 검증 환경
1. 정적 서버 실행 (`python -m http.server 8080` 또는 프로젝트 권장 서버)
2. 브라우저 캐시 비활성/강력 새로고침
3. 필요 시 `?v=<timestamp>`로 캐시 회피
4. 디버그 모드: `?debug=1`

## 검증 시나리오
- [x] Flow: 위자드 오픈 -> 단계 전환 정상
- [x] 게이밍 선택 시 게임 단계 진입
- [x] 비게이밍 선택 시 게임 단계 생략
- [x] 예산 필수 동작
- [x] 장기 무이자(24/36) 선택 동작 및 0건 fallback 문구
- [x] 디자인 선택 동작

## Filter Accuracy
- [x] 화이트 선택 시 블랙 전용 상품 제외
- [x] 몬헌 alias 선택 시 와일즈 계열 매칭
- [x] 36개월 선택 시 longNoInterest=36만 유지(없으면 fallback)
- [x] 예산 필터 정확 적용

## Debug
- [x] `?debug=1`에서 결과 카드에 매칭 근거(`matchReasons`) 노출

## 판정
- PASS (핵심 테스트 5종 통과)
