# SubAgent A - 데이터/정규화/필터 정확도

## 변경 요약
- `js/filter.js`에 `normalizeProduct()` 레이어를 도입해 tags 기반 필터링으로 정규화했습니다.
- 게임 매칭은 `GAME_ALIASES` 정규화를 우선하고, 제목 기반 매칭은 안전 alias에 한해 최후 fallback으로 제한했습니다.
- 디자인 필터는 `case_color + specs.case` 교차 검증으로 화이트/블랙 오검출을 줄였습니다.
- 장기 무이자(24/36) 조건을 태그화(`longNoInterest24/36`)하여 필터/스코어링에 연결했습니다.
- `?debug=1`에서 카드별 매칭 근거를 표시할 수 있도록 `matchReasons`를 반환하도록 구성했습니다.

## 수정 파일 목록
- `js/filter.js`

## 로컬 테스트 방법/결과
- [x] 화이트 선택 시 블랙 전용 상품 제외 확인
- [x] 몬헌 alias(`몬헌`, `몬스터헌터`, `Wilds`) 매칭 확인
- [x] 36개월 선택 시 `installment_months === 36` 필터 확인
- [x] 예산 필터 구간(`PRICE_RANGES`) 적용 확인
- [x] `?debug=1`에서 `matchReasons` 생성 확인

## TODO / PASS
- PASS
