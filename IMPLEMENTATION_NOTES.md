# v2.0.0 데이터셋 통합 — 구조 정상화 보고서

## 1. 문제 원인 요약

### 이전 구현의 근본적 결함

이전 작업자가 reco v2 데이터셋을 **raw crawl 상품 데이터를 대체하는 source of truth**로 사용했다.
이는 설계 의도와 정반대이다.

| 항목 | 잘못된 구현 (이전) | 올바른 구현 (수정 후) |
|------|-------------------|---------------------|
| 상품 목록 기준 | reco feed 768개 | raw crawl 353개 |
| 가격 | reco `price_effective` 우선 | raw `price` only |
| 품절 판단 | `recommendable` (reco) | `in_stock` (raw) |
| URL/이름 | reco `detail_url`/`name` 우선 | raw `url`/`name` only |
| reco-only 상품 | 566개 유령 상품 노출 | 노출 금지 |
| raw-only 상품 | 151개 누락 | 정상 노출 |
| `in_stock` | 하드코딩 `true` | raw 값 보존 |
| 6시간 폴링 | raw만 재로딩 (reco 소실) | raw + reco re-merge |

### 구체적 결함 목록

1. **`reco-loader.js`의 `adaptV2Item()`**: reco 아이템으로 새 상품 객체를 생성하고, raw는 `oldProductMap`에서 보조 필드만 가져옴
2. **`app.js`**: `loadRecoFeed(oldMap)` 결과로 `state.products`를 직접 대체
3. **`filter.js`의 `isInStock()`**: `product.v2`가 있으면 `product.v2.recommendable`만 확인, raw `in_stock` 무시
4. **`adaptV2Item()`**: `in_stock: true` 하드코딩 → 모든 상품이 재고 있는 것처럼 표시
5. **가격 불일치**: 겹치는 202개 상품 중 198개에서 reco 가격과 raw 가격 차이 확인
6. **6시간 폴링**: `initUpdateTickers()`에서 raw 데이터만 재로드하고 reco를 버림
7. **"실시간 재고" 문구**: 실제로는 6시간 주기 크롤링인데 "실시간"이라고 표기

## 2. 수정 파일 목록

### 수정한 파일

| 파일 | 변경 내용 |
|------|-----------|
| `js/reco-loader.js` | 전면 재작성. enrichment overlay 전용으로 재설계 |
| `js/app.js` | raw 기준 데이터 로딩 + reco merge 구조로 재작성 |
| `js/filter.js` | `isInStock()` 수정: raw `in_stock` 우선 + reco `recommendable` 교차 확인 |
| `index.html` | "실시간" 문구 제거, "정기 갱신"/"자동 재고 갱신"으로 수정 |

### 삭제한 파일

없음 (기존 파일 구조 유지)

### 새로 만든 파일

없음 (기존 파일만 수정)

## 3. 데이터 구조 설명

### raw source 경로

```
data/pc_data.json
├── last_updated: "2026-03-26T04:35:17+09:00" (크롤링 완료 시각)
├── products[]: 353개 상품
│   ├── id: 쇼핑몰 it_id (source of truth 식별자)
│   ├── name: 원본 상품명
│   ├── url: 원본 상품 링크
│   ├── price: 원본 가격 (원 단위, 1만원 절삭)
│   ├── price_display: "278만 원" 형식
│   ├── in_stock: true (크롤러가 품절 이미 제외)
│   ├── specs: { cpu, cpu_short, gpu, gpu_short, ram, ssd, ... }
│   ├── categories: { games, tier, price_range, usage }
│   ├── game_fps: { ... }
│   └── thumbnail, subtitle, badge, case_color, ...
```

### reco source 경로

```
data/reco/
├── manifest.json (active_version, 버전별 feed 경로)
└── v2.0.0/
    ├── feed.json (768개 consumer_general 아이템)
    │   ├── it_id → raw id와 매칭
    │   ├── recommendable, recommend_group
    │   ├── best_for_tags, selling_points, summary_reason
    │   ├── ai_ready, llm_entry_ready, local_ai_grade
    │   ├── gaming_grade_*, video_edit_grade, office_grade
    │   ├── frontend_rank_score, frontend_spec_band
    │   └── price_effective (참고용만, 화면에 사용 안 함)
    └── consult.json (104개 상담 그룹 아이템)
```

### merge 지점

```
app.js → init()
  1. fetchJson('pc_data.json')        → rawProducts (353개)
  2. loadRecoEnrichment()             → feedMap(768), consultMap(104)
  3. mergeRawWithReco(raw, feed, consult)
     ├── raw id가 consultMap에 있으면 → consultProducts (12개)
     ├── raw id가 feedMap에 있으면   → enrichProduct(raw, reco) → v2 필드 추가
     └── raw id가 feedMap에 없으면   → raw 그대로 (v2: null)
  4. state.products = mainProducts (340개)
  5. state.consultProducts = consultProducts (12개)
```

### 최종 view model 구조

```javascript
{
  // raw 기준 필드 (변경 불가)
  id: "2770358523",           // raw
  name: "네이버페이 ...",      // raw
  url: "https://www.youngjaecomputer.com/shop/...", // raw
  price: 2230000,             // raw
  price_display: "223만 원",  // raw
  in_stock: true,             // raw
  thumbnail: "...",           // raw
  specs: { cpu, gpu, ram, ... }, // raw
  game_fps: { ... },          // raw

  // reco enrichment (있으면)
  v2: {
    recommendable: true,
    best_for_tags: ["AI 공부용", "QHD 게이밍"],
    selling_points: ["32GB DDR5", "1TB NVMe"],
    summary_reason: "이 제품은 ...",
    ai_ready: true,
    frontend_rank_score: 82.5,
    // ... 기타 enrichment 필드
  } // 또는 null (reco 매칭 없는 경우)
}
```

## 4. 가격/품절 기준

### 가격

- **source**: raw crawl `product.price` (원 단위, 1만원 절삭)
- **표시**: raw crawl `product.price_display` ("223만 원" 형식)
- **reco 가격 사용 안 함**: `price_effective`는 v2 참고용으로만 저장, 화면에 미사용
- **할부**: raw crawl `price_monthly`, `installment_months`

### 품절

- **1차 기준**: raw `in_stock === true` (크롤러가 품절 이미 제외하므로 모든 raw 상품은 true)
- **2차 기준**: `SOLD_OUT_PRODUCT_IDS` 하드코딩 블록리스트
- **3차 기준**: 최소 가격 (`MIN_PC_PRICE = 500000`) 미만이고 비할부면 제외
- **4차 기준**: reco `v2.recommendable === false`이면 추가 제외
- **교차 조건**: raw에서 in_stock=true 이더라도, reco에서 recommendable=false이면 일반 추천에서 제외

### 예외 규칙

- reco에서 recommendable=true여도 raw에 없으면 노출 금지 (reco-only 유령 상품 방지)
- consult 그룹(recommend_group !== 'consumer_general') 상품은 상담 섹션으로 분리

## 5. 추천 필터 기준

### 일반 추천

- raw `in_stock === true`
- reco 매칭 시: `v2.recommendable !== false` AND `v2.recommend_group === 'consumer_general'`
- reco 미매칭: raw 상품 그대로 노출 (enrichment 없이)

### 상담 유도

- raw 상품이면서 reco `consult.json`에 매칭되는 경우
- `recommend_group`: office_apu_consult, bundle_consult, server_ws_consult, consumer_consult, manual_review, manual_consult
- 메인 그리드에서 제외, 별도 섹션 표시

### AI 추천 (bestFor 필터)

- `v2.best_for_tags`에 "AI 공부용" 포함 → AI 공부용 그룹
- `v2.best_for_tags`에 "로컬 LLM 입문" 포함 → 로컬 LLM 그룹
- 추가 scoring: `v2.ai_ready`, `v2.llm_entry_ready`, `v2.local_ai_grade`, `v2.gpu_tensor_class`, `v2.vram_class`

### 게임/영상편집/사무/감성 필터

- 게이밍: `categories.games` + `GAME_ALIASES` 정규화
- 영상편집/사무: `categories.usage` + `USAGE_ALIASES` 정규화
- 화이트 감성: `case_color === '화이트'` (raw 우선, reco 보강)
- QHD/4K 게이밍: `v2.best_for_tags` 기반

## 6. 업데이트 문구 기준

### 실제 스케줄

- **GitHub Actions**: `.github/workflows/update-data.yml` → `cron: '0 0,6,12,18 * * *'` (UTC 기준 6시간 주기)
- **Windows 스케줄러**: `scripts/setup-auto-update.ps1` → `schtasks /SC HOURLY /MO 6` (선택적 로컬 실행)

### 화면 노출 기준

- `last_updated` = `pc_data.json`의 `last_updated` 필드 (크롤링 완료 시각)
- "N시간 N분 전 업데이트" 형식으로 표시
- 1분마다 자동 갱신

### 문구 수정 사항

| 위치 | 이전 | 수정 후 |
|------|------|---------|
| 히어로 상단 | "실시간 재고 반영 중" | "정기 재고 확인" |
| 히어로 설명 | "6시간마다 실시간으로" | "6시간마다 자동으로" |
| 통계 | "자동 갱신 주기" | "크롤링 주기" |
| 체크마크 | "실시간 재고 확인 완료" | "최근 재고 확인 완료" |
| 마퀴 | "6시간마다 실시간 재고 갱신" | "6시간마다 자동 재고 갱신" |
| 특장점 카드 제목 | "실시간 재고 연동" | "자동 재고 연동" |
| 특장점 카드 설명 | "품절 상품을 즉시 제외...실시간 반영...모두 구매 가능" | "품절 상품을 제외...가격을 반영...차이가 있을 수 있습니다" |
| 푸터 | "6시간마다 자동으로 갱신" | "6시간 주기로 크롤링하여 갱신" |
| 제품 카운트 | "실시간 재고" | "정기 갱신" |

## 7. 테스트 결과

### 시나리오 A: 일반 추천 기본 화면

| 항목 | 결과 |
|------|------|
| 품절 상품 미노출 | **PASS** - 크롤러가 이미 품절 제외, raw `in_stock=true`만 노출 |
| 가격 raw 기준 일치 | **PASS** - "223만 원" = raw 2230000 (reco 2230700 무시) |
| 원본 상품 링크 | **PASS** - youngjaecomputer.com/shop/item.php?it_id=... |
| reco-only 미노출 | **PASS** - 566개 유령 상품 제거, 340개 표시 |
| 상품 수 | **PASS** - 340개 (raw 353 - consult 12 - 할부가격필터 1) |

### 시나리오 B: AI 공부용

| 항목 | 결과 |
|------|------|
| AI 공부용 그룹 | **PASS** - 192개 상품, `v2.best_for_tags`에 "AI 공부용" 포함 |
| enrichment 상품만 | **PASS** - `v2.ai_ready=true` 기반 필터링 |

### 시나리오 C: 로컬 LLM 입문용

| 항목 | 결과 |
|------|------|
| LLM 입문 그룹 | **PASS** - 65개 상품 |
| `llm_entry_ready` 기반 | **PASS** |

### 시나리오 D: QHD 게이밍

| 항목 | 결과 |
|------|------|
| QHD 게이밍 그룹 | **PASS** - 185개 상품 |
| `v2.best_for_tags` 기반 | **PASS** |

### 시나리오 E: 화이트 감성

| 항목 | 결과 |
|------|------|
| 화이트 감성 그룹 | **PASS** - 34개 상품 |
| `case_color` 기반 | **PASS** |

### 시나리오 F: 품절 상태

| 항목 | 결과 |
|------|------|
| raw 품절 상품 0개 | **PASS** - 크롤러가 품절 이미 제외 |
| 일반 추천에 품절 미노출 | **PASS** |

### 시나리오 G: 업데이트 표시

| 항목 | 결과 |
|------|------|
| last_updated 연결 | **PASS** - pc_data.json `last_updated` 기반 |
| "실시간" 제거 | **PASS** - "정기 재고 확인", "자동 재고 갱신" |
| 6시간 스케줄 | **PASS** - GitHub Actions cron 실제 존재 |

## 8. 배포 전 체크리스트

- [x] 품절 노출 없음 (크롤러 필터링 + isInStock 교차 확인)
- [x] 가격 일치 (raw `price` / `price_display` only)
- [x] 링크 일치 (raw `url` only)
- [x] 0개 fallback 정상 (빈 결과 시 필터 초기화 + 상담 유도 버튼)
- [x] 상담 섹션 정상 (12개 raw 상품 기반, 유령 상품 제거)
- [x] last_updated 정상 (pc_data.json 기준)
- [x] 콘솔 에러 없음 (앱 관련)
- [x] reco-only 유령 상품 제거 (566개 → 0개)
- [x] raw-only 상품 정상 노출 (151개 복원)
- [x] 6시간 폴링 시 raw + reco re-merge

## 9. 향후 버전 정책

### v2.0.1 (패치)

- reco feed 데이터만 업데이트 (태그/점수 보정)
- `data/reco/v2.0.1/feed.json` + `manifest.json` active_version 변경
- 코드 변경 없음

### v2.1.0 (마이너)

- 새 필터/그룹 추가 (예: "프로그래밍용", "학생 추천")
- `best_for_tags` 확장
- render.js 그룹 목록 추가
- reco-loader.js 변경 불필요

### v3.0.0 (메이저)

- 데이터 스키마 변경 시
- `enrichProduct()` 내 필드 매핑 업데이트
- manifest.json에 새 버전 엔트리 추가
- 하위 호환성: v2 adapter 유지, v3 adapter 추가
