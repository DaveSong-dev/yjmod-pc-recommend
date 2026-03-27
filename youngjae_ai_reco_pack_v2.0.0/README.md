# 영재컴퓨터 AI 추천 PC 리빌드 패키지 v2.0.0

이 패키지는 `youngjae_pc` 원본 SQL을 기준으로 `ai.youngjaecomputer.com` 추천 페이지에 바로 붙이기 쉬운 형태로 다시 정리한 추천 전용 데이터셋입니다.

## 포함 파일
- `datasets/v2.0.0/youngjae_ai_reco_dataset_v2.0.0.csv`
- `datasets/v2.0.0/youngjae_ai_reco_dataset_v2.0.0.json`
- `frontend/v2.0.0/youngjae_ai_reco_frontend_feed_v2.0.0.json`
- `frontend/v2.0.0/youngjae_ai_reco_frontend_feed_v2.0.0.min.json`
- `frontend/v2.0.0/youngjae_ai_reco_frontend_feed_v2.0.0.ndjson`
- `sql/001_create_youngjae_pc_reco_table.sql`
- `sql/002_create_quality_tables_and_views.sql`
- `sql/003_import_notes_and_contract.sql`
- `versions/manifest_v2.0.0.json`
- `versions/CHANGELOG.md`

## 핵심 원칙
1. 원본 전체는 보존하고 추천용은 별도 파생한다.
2. `recommendable`은 상품 적합성 기준이다.
3. `raw_soldout`은 원본 재고 플래그를 그대로 보존한다.
4. 현재 업로드된 원본 SQL은 `is_soldout=true`가 전건 감지되어 라이브 필터에 그대로 쓰면 결과가 0개가 된다.
5. 따라서 라이브 적용 시점에는 `recommendable == true`를 우선 노출 조건으로 쓰고, 재고 크롤러가 정상화된 뒤 `recommendable && !raw_soldout`로 전환한다.

## 권장 연동 방식
### 1) 프런트
가장 먼저 `frontend/v2.0.0/youngjae_ai_reco_frontend_feed_v2.0.0.json`을 붙이십시오.

권장 노출 필드
- `name`
- `price_effective`
- `price_is_estimated`
- `image_url`
- `detail_url`
- `display_badges`
- `summary_reason`
- `selling_points`
- `frontend_game_tags`
- `frontend_usage_tags`
- `frontend_spec_band`
- `frontend_price_band`
- `frontend_rank_score`

### 2) 필터
- 게임 필터: `frontend_game_tags`
- 용도 필터: `frontend_usage_tags`
- 사양 필터: `frontend_spec_band`
- 금액 필터: `frontend_price_band`
- 감성 필터: `case_color`
- AI 필터: `ai_ready`, `llm_entry_ready`, `local_ai_grade`

### 3) 상담 유도
아래 조건은 카드 하단에 상담 CTA를 강하게 거는 것이 좋습니다.
- `consult_required = true`
- `price_is_estimated = true`
- `recommend_group != 'consumer_general'`

## 버전 정책
- dataset: 데이터 구조가 바뀌면 Minor 이상 증가
- parser: CPU/GPU 파싱 룰이 바뀌면 증가
- rules: 추천/제외 규칙이 바뀌면 증가
- tag: 설명 태그 문구 규칙이 바뀌면 증가

예:
- dataset v2.0.0
- parser v2.1.0
- rules v2.0.0
- tag v2.0.0

## 이번 빌드 요약
- 전체 원본 행 수: 872
- 추천 가능 코어 행 수: 768
- 일반 프런트 노출용 행 수: 768
- raw_soldout을 그대로 쓰면 남는 행 수: 0
- 가격 원본 누락 후 추정 보완 행 수: 452
- 리빌드 후 unknown CPU: 8
- 리빌드 후 unknown GPU: 7

## 다음 업데이트 권장 순서
1. 실시간 재고 크롤러 수정
2. 가격 원본 누락 보완
3. Ultra / Arc / Radeon Pro 계열 parser 추가 정교화
4. 실제 클릭률/상담률 로그 기반 rank 점수 재학습
5. 추천 위자드별 A/B 테스트
