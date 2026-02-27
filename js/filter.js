/**
 * filter.js - 제품 필터링 엔진
 * 게임별 / 사양별(티어) / 금액별 / 용도별 + 품절 제외
 * tags 기반 매칭, normalizeProduct 레이어, GAME_ALIASES 지원
 */

import { PRICE_RANGES } from './utils.js';

/** 게임 정규명 ↔ 별칭 매핑 (입력/상품 태그 양방향 정규화) */
const GAME_ALIASES = {
  '몬스터헌터 와일드': ['몬헌', '몬스터헌터', '몬스터헌터 와일드', 'MH', 'Wilds', '몬스터헌터와일드'],
  '리그오브레전드': ['리그오브레전드', '롤', 'LOL'],
  '배틀그라운드': ['배틀그라운드', '배그', 'PUBG'],
  '로스트아크': ['로스트아크', '로아'],
  '스팀 AAA급 게임': ['스팀 AAA급 게임', '스팀 AAA', 'AAA'],
  '발로란트': ['발로란트', '발로'],
  '오버워치2': ['오버워치2', '오버워치']
};

/** title fallback에서 사용할 안전한 별칭만 별도 정의(오검출 최소화) */
const SAFE_GAME_FALLBACK_ALIASES = {
  '몬스터헌터 와일드': ['몬헌', '몬스터헌터', '몬스터헌터 와일드', '몬스터헌터와일드', 'wilds', '와일즈'],
  '아이온2': ['아이온2', '아이온 2'],
  '배틀그라운드': ['배그', '배틀그라운드'],
  '로스트아크': ['로아', '로스트아크'],
  '리그오브레전드': ['롤', '리그오브레전드'],
  '발로란트': ['발로', '발로란트'],
  '오버워치2': ['오버워치2', '오버워치']
};

/** usage 정규화 매핑 (데이터 편차/표기 차이 흡수) */
const USAGE_ALIASES = {
  '게이밍': ['게이밍'],
  '사무/디자인': ['사무/디자인', '사무용', '사무', '오피스', '업무'],
  '영상편집': ['영상편집', '영상 편집', '프리미어', '애프터이펙트', '에펙', '편집'],
  '3D 모델링': ['3d 모델링', '3d/모델링', '3d', '모델링', 'cad', '블렌더', '스케치업', '렌더링', 'maya'],
  'AI/딥러닝': ['ai/딥러닝', 'ai', '딥러닝', '머신러닝', '생성형'],
  '방송/스트리밍': ['방송/스트리밍', '방송·스트리밍', '방송', '스트리밍', '동시송출', 'obs', '송출']
};

function canonicalizeUsage(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(USAGE_ALIASES)) {
    if (aliases.some(a => s.includes(String(a).toLowerCase()) || String(a).toLowerCase().includes(s))) {
      return canonical;
    }
  }
  return null;
}

function inferUsageFromText(text) {
  const hits = new Set();
  const t = String(text || '').toLowerCase();
  for (const [canonical, aliases] of Object.entries(USAGE_ALIASES)) {
    if (aliases.some(a => t.includes(String(a).toLowerCase()))) {
      hits.add(canonical);
    }
  }
  return hits;
}

/** alias → canonical 게임명 해석 */
function resolveGameToCanonical(input) {
  if (!input || typeof input !== 'string') return input || '';
  const s = String(input).trim();
  for (const [canonical, aliases] of Object.entries(GAME_ALIASES)) {
    if (aliases.some(a => a.toLowerCase() === s.toLowerCase())) return canonical;
  }
  return s;
}

/**
 * 현재 활성 필터 상태
 */
const filterState = {
  game: null,        // "리그오브레전드" | "배틀그라운드" | ...
  tier: null,        // "가성비(FHD)" | "퍼포먼스(QHD)" | "하이엔드(4K)"
  priceRange: null,  // "100만 원 이하" | "100~200만 원" | ...
  usage: null,       // "게이밍" | "영상편집" | "AI/딥러닝" | "사무/디자인" | "방송/스트리밍"
  installment: null, // 24 | 36 (개월)
  caseColor: null,   // "블랙" | "화이트"
  search: ''
};

/** 24/36개월 무이자 상품의 비정상 가격(품절·플레이스홀더) 최소 기준 */
const MIN_INSTALLMENT_TOTAL = 800000;   // 총액 80만 원 미만이면 비정상
const MIN_INSTALLMENT_MONTHLY = 30000;  // 월 납부 3만 원 미만이면 플레이스홀더

/** 고사양 게임: 100만 원 이하와 조합 시 예산 완화하지 않고 0건 + 전용 안내 */
const HIGH_END_GAMES = ['로스트아크', '배틀그라운드', '스팀 AAA급 게임', '오버워치2'];

/** 품절로 확인된 상품 ID (데이터 갱신 전까지 노출 제외) */
export const SOLD_OUT_PRODUCT_IDS = ['2741770843'];

/**
 * 재고 있는 상품인지 여부 (품절·블록리스트 제외)
 * 모든 노출 경로에서 이 조건으로만 표시함.
 */
const MIN_PC_PRICE = 500000;

export function isInStock(product) {
  if (!product || product.in_stock !== true) return false;
  if (SOLD_OUT_PRODUCT_IDS.includes(product.id)) return false;
  if (product.price > 0 && product.price < MIN_PC_PRICE && !product.installment_months) return false;
  return true;
}

/** 내장그래픽 여부 (게임용에서 제외) */
function isIntegratedGpu(product) {
  const g = product.specs?.gpu_short || product.specs?.gpu_key || product.specs?.gpu || '';
  return /내장\s*그래픽|iGPU/i.test(g);
}

/**
 * 무이자 할부 상품이 품절/플레이스홀더가 아닌지 가격으로 검증
 * @param {Object} product
 * @returns {boolean}
 */
function isReasonableInstallmentPrice(product) {
  const months = product.installment_months || 0;
  if (months !== 24 && months !== 36) return true;
  if (product.price < MIN_INSTALLMENT_TOTAL) return false;
  const monthly = product.price_monthly || 0;
  if (monthly > 0 && monthly < MIN_INSTALLMENT_MONTHLY) return false;
  return true;
}

/**
 * 상품을 tags 기반으로 정규화 (usage/design/games/installment)
 * design: case_color + specs.case 크로스체크만 사용 (title contains 금지)
 * @param {Object} product - 원본 상품
 * @returns {{ games: Set<string>, usage: Set<string>, design: string|null, longNoInterest: boolean, longNoInterest24: boolean, longNoInterest36: boolean }}
 */
function normalizeProduct(product) {
  const tags = {
    games: new Set(),
    usage: new Set(),
    design: null,
    longNoInterest: false,
    longNoInterest24: false,
    longNoInterest36: false
  };

  (product.categories?.usage || []).forEach(u => {
    const canonical = canonicalizeUsage(u);
    if (canonical) tags.usage.add(canonical);
  });
  // usage가 부족한 상품 보강: 이름/부제/스펙 기반으로 추론
  const usageText = [
    product.name || '',
    product.subtitle || '',
    product.specs?.cpu || '',
    product.specs?.gpu || '',
    product.specs?.ram || '',
    product.specs?.ssd || ''
  ].join(' ');
  inferUsageFromText(usageText).forEach(u => tags.usage.add(u));

  (product.categories?.games || []).forEach(g => {
    tags.games.add(resolveGameToCanonical(g));
  });
  // categories.games에 누락이 있을 수 있어, 제목 기반은 "최후 fallback"으로만 보강
  // (안전 별칭만 적용해 오검출을 최소화)
  const fallbackText = `${product.name || ''} ${product.subtitle || ''}`.toLowerCase();
  for (const [canonical, aliases] of Object.entries(SAFE_GAME_FALLBACK_ALIASES)) {
    if (aliases.some(a => fallbackText.includes(String(a).toLowerCase()))) {
      tags.games.add(canonical);
    }
  }

  const caseColor = product.case_color;
  const caseName = (product.specs?.case || '').trim();
  if (caseColor === '블랙' && !/화이트|WHITE/i.test(caseName)) tags.design = '블랙';
  else if (caseColor === '화이트' && !/블랙|BLACK/i.test(caseName)) tags.design = '화이트';

  const m = product.installment_months || 0;
  tags.longNoInterest = m === 24 || m === 36;
  tags.longNoInterest24 = m === 24;
  tags.longNoInterest36 = m === 36;

  return tags;
}

/**
 * 제품 목록을 필터링하여 반환
 * @param {Array} products - pc_data.json의 products 배열
 * @param {Object} filters - 적용할 필터 객체 (filterState 형식)
 * @returns {Array} 필터링된 제품 배열
 */
function filterProducts(products, filters = filterState) {
  return products.filter(product => {
    if (!isInStock(product)) return false;
    if (!isReasonableInstallmentPrice(product)) return false;

    const tags = normalizeProduct(product);

    if ((filters.game || filters.usage === '게이밍') && isIntegratedGpu(product)) return false;

    // 게임 필터: tags.games 기반 (alias 정규화)
    if (filters.game) {
      const canon = resolveGameToCanonical(filters.game);
      if (!tags.games.has(canon)) return false;
    }

    if (filters.tier && product.categories.tier !== filters.tier) return false;

    if (filters.priceRange) {
      const range = PRICE_RANGES[filters.priceRange];
      if (range && (product.price < range.min || product.price >= range.max)) return false;
    }

    // 용도 필터: tags.usage 기반
    if (filters.usage && !tags.usage.has(filters.usage)) return false;

    // 할부 필터: longNoInterest(24/36) tags
    if (filters.installment === 'nointerest') {
      if (!tags.longNoInterest) return false;
    } else if (typeof filters.installment === 'number') {
      if (filters.installment === 24 && !tags.longNoInterest24) return false;
      if (filters.installment === 36 && !tags.longNoInterest36) return false;
    }

    // 케이스 색상 필터: tags.design만 사용 (title contains 금지)
    if (filters.caseColor && tags.design !== filters.caseColor) return false;

    // 검색어: title/specs contains 최후 fallback (다른 필터 전부 통과 후)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const searchTarget = [
        product.name,
        (product.specs?.cpu || ''),
        (product.specs?.gpu || ''),
        (product.specs?.ram || '')
      ].join(' ').toLowerCase();
      if (!searchTarget.includes(q)) return false;
    }

    return true;
  });
}

/** 비게이밍 용도 (Intel non-F 우선 추천 대상) */
const NON_GAMING_PURPOSES = ['office', 'editing', '3d', 'ai', 'streaming'];

/** CPU 제조사·통합그래픽 여부 분류 (cpu_short 또는 cpu 문자열 기준) */
function classifyCpu(product) {
  const text = (product?.specs?.cpu_short || product?.specs?.cpu || '').toLowerCase();
  if (!text) return 'unknown';
  const isIntel = /인텔|intel|^i[3-9]-\d/i.test(text);
  const isAmd = /amd|라이젠|^r[0-9]/i.test(text);
  if (isIntel) {
    // F, KF 접미사 = 내장그래픽 없음 → non-F가 우선
    const hasNoIgu = /\d+f\b|\d+kf\b/i.test(text);
    return hasNoIgu ? 'intel_f' : 'intel_nonf';
  }
  if (isAmd) return 'amd';
  return 'unknown';
}

/** 용도(purpose) → product.categories.usage 값 매핑 */
const PURPOSE_TO_USAGE = {
  gaming: '게이밍',
  office: '사무/디자인',
  editing: '영상편집',
  '3d': '3D 모델링',
  ai: 'AI/딥러닝',
  streaming: '방송/스트리밍'
};

/** 작업강도(workTier) → product.categories.tier 매핑 */
const WORK_TIER_TO_TIER = {
  light: '가성비(FHD)',
  standard: '퍼포먼스(QHD)',
  pro: '하이엔드(4K)'
};

/**
 * 점수 정렬된 목록에서 diversity를 반영해 상위 N개 선택
 * - 동일 CPU+GPU 조합은 최대 2건까지
 * - 가능하면 서로 다른 CPU/GPU 조합 우선
 */
function selectWithDiversity(withScore, limit = 6) {
  const selected = [];
  const comboCount = {};
  const MAX_PER_COMBO = 1;

  for (const item of withScore) {
    if (selected.length >= limit) break;
    const cpu = item.product?.specs?.cpu_short || item.product?.specs?.cpu || '';
    const gpu = item.product?.specs?.gpu_key || item.product?.specs?.gpu_short || '';
    const combo = `${cpu}|${gpu}`;
    const count = comboCount[combo] || 0;
    if (count >= MAX_PER_COMBO) continue;
    selected.push(item);
    comboCount[combo] = count + 1;
  }

  // 부족하면 combo 제한 완화하여 채우기
  if (selected.length < limit) {
    const pickedIds = new Set(selected.map(s => s.product?.id));
    for (const item of withScore) {
      if (selected.length >= limit) break;
      if (pickedIds.has(item.product?.id)) continue;
      selected.push(item);
      pickedIds.add(item.product?.id);
    }
  }

  return selected;
}

/** debug=1 여부 (URL ?debug=1 또는 options.debug) */
function isDebugMode(options = {}) {
  if (options.debug === true) return true;
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      return new URLSearchParams(window.location.search).get('debug') === '1';
    }
  } catch (_) {}
  return false;
}

/**
 * 위자드 선택값으로 필터를 생성하여 제품 목록 반환
 * @param {Array} products - 전체 제품 배열
 * @param {Object} wizardSelections - { purpose, game, budget, design }
 * @param {Object} [options] - { debug: boolean }
 * @returns {{ recommended: Array, noResultsReason?: string, matchReasons?: Array<{ productId: string, reasons: string[] }> }}
 */
function getWizardRecommendations(products, wizardSelections, options = {}) {
  const { purpose, game, budget, installment, design } = wizardSelections;

  if (!purpose) {
    return { recommended: [] };
  }

  const budgetToRange = {
    'budget_under100': '100만 원 이하',
    'budget_100_200': '100~200만 원',
    'budget_200_300': '200~300만 원',
    'budget_over300': '300만 원 이상'
  };

  const designToColor = {
    'black': '블랙',
    'white': '화이트',
    'rgb': null
  };

  const usage = PURPOSE_TO_USAGE[purpose] || null;
  const gameCanon = purpose === 'gaming' && game ? resolveGameToCanonical(game) : null;

  const filters = {
    game: purpose === 'gaming' ? gameCanon : null,
    tier: null,
    priceRange: budgetToRange[budget] || null,
    usage,
    installment: installment ?? null,
    caseColor: design ? (designToColor[design] ?? null) : null,
    search: ''
  };

  const isImpossibleBudget = purpose === 'gaming' && game && HIGH_END_GAMES.includes(resolveGameToCanonical(game)) && budget === 'budget_under100';

  let filtered = filterProducts(products, filters);
  let fallbackNotice = null;

  // 24/36개월 강제 필터에서 결과가 0건이면, 조건 해제 후 추천 유지
  if (filtered.length === 0 && (filters.installment === 24 || filters.installment === 36)) {
    const relaxedInstallment = { ...filters, installment: null };
    filtered = filterProducts(products, relaxedInstallment);
    if (design === 'rgb') {
      filtered = filtered.filter(matchesRgbStyle);
    }
    if (filtered.length > 0) {
      fallbackNotice = 'installment_relaxed';
    }
  }

  if (design === 'rgb') {
    filtered = filtered.filter(matchesRgbStyle);
  }

  if (filtered.length === 0 && isImpossibleBudget) {
    return { recommended: [], noResultsReason: 'impossible_budget' };
  }

  if (filtered.length === 0 && budget === 'budget_under100') {
    return { recommended: [], noResultsReason: 'no_products_under_budget' };
  }

  if (filtered.length === 0) {
    const relaxed = { ...filters, priceRange: null };
    filtered = filterProducts(products, relaxed);
    if (design === 'rgb') {
      filtered = filtered.filter(matchesRgbStyle);
    }
  }

  if (filtered.length === 0 && usage) {
    const relaxed = { ...filters, usage: null, priceRange: budgetToRange[budget] || null };
    filtered = filterProducts(products, relaxed);
    if (design === 'rgb') {
      filtered = filtered.filter(matchesRgbStyle);
    }
  }

  const withScore = filtered.map(p => {
    const { score, reasons } = calcRelevanceScoreWithReasons(p, wizardSelections, filters);
    return { product: p, score, reasons: reasons || [] };
  });

  withScore.sort((a, b) => b.score - a.score);

  // 동일 CPU+GPU 조합 중복 억제, CPU/GPU 다양성 확보
  const top = selectWithDiversity(withScore, 6);
  const recommended = top.map(s => s.product);

  const result = { recommended };
  if (fallbackNotice) {
    result.fallbackNotice = fallbackNotice;
  }

  if (isDebugMode(options)) {
    result.matchReasons = top.map(s => ({
      productId: s.product.id,
      reasons: s.reasons
    }));
  }

  return result;
}

/**
 * 제품 관련도 점수 계산 + 매칭 근거 수집 (debug용)
 * @returns {{ score: number, reasons: string[] }}
 */
function calcRelevanceScoreWithReasons(product, wizardSelections, filters) {
  let score = 0;
  const reasons = [];
  const { purpose, game, design } = wizardSelections;
  const tags = normalizeProduct(product);

  if (filters.usage && tags.usage.has(filters.usage)) {
    score += 30;
    reasons.push(`usage:${filters.usage}`);
  }

  if (purpose === 'gaming' && filters.game && tags.games.has(filters.game)) {
    score += 25;
    reasons.push(`game:${filters.game}`);
  }

  if (filters.priceRange && product.categories?.price_range === filters.priceRange) {
    score += 20;
    reasons.push(`priceRange:${filters.priceRange}`);
  }

  if (filters.installment === 24 && tags.longNoInterest24) {
    score += 15;
    reasons.push('installment:24');
  } else if (filters.installment === 36 && tags.longNoInterest36) {
    score += 15;
    reasons.push('installment:36');
  } else if (filters.installment === '24_36_priority' && tags.longNoInterest) {
    score += 12;
    reasons.push('installment:24_36_priority');
  }

  if (design === 'black' && tags.design === '블랙') {
    score += 10;
    reasons.push('design:블랙');
  }
  if (design === 'white' && tags.design === '화이트') {
    score += 10;
    reasons.push('design:화이트');
  }
  if (design === 'rgb' && matchesRgbStyle(product)) {
    score += 10;
    reasons.push('design:rgb');
  }

  // 비게이밍 용도: Intel non-F(내장그래픽) 우선, Intel 기타 중간, AMD 비중 낮춤
  if (NON_GAMING_PURPOSES.includes(purpose)) {
    const cpuType = classifyCpu(product);
    if (cpuType === 'intel_nonf') {
      score += 25;
      reasons.push('cpu_pref:intel_nonf');
    } else if (cpuType === 'intel_f') {
      score += 3;
      reasons.push('cpu_pref:intel_f_lower');
    } else if (cpuType === 'amd') {
      score -= 5;
      reasons.push('cpu_pref:amd');
    }
  }

  return { score, reasons };
}

/**
 * RGB 튜닝 스타일 여부 판별
 * - 케이스, 제품명, 램, GPU 문자열의 RGB/ARGB 키워드 기반
 */
function matchesRgbStyle(product) {
  const text = [
    product?.name || '',
    product?.specs?.case || '',
    product?.specs?.ram || '',
    product?.specs?.gpu || ''
  ].join(' ').toLowerCase();

  return /(argb|rgb|icue|aura|sync)/i.test(text);
}

/**
 * 필터 버튼 그룹 활성화 상태 토글
 * @param {HTMLElement} container - 버튼 그룹 컨테이너
 * @param {HTMLElement} clicked - 클릭된 버튼
 * @param {string} filterKey - filterState의 키
 * @param {string} value - 필터 값
 */
function toggleFilterButton(container, clicked, filterKey, value) {
  const buttons = container.querySelectorAll('[data-filter-value]');
  const isActive = clicked.classList.contains('filter-active');

  buttons.forEach(btn => btn.classList.remove('filter-active'));

  if (!isActive) {
    clicked.classList.add('filter-active');
    filterState[filterKey] = value;
  } else {
    filterState[filterKey] = null;
  }
}

/**
 * 모든 필터 초기화
 */
function resetFilters() {
  Object.keys(filterState).forEach(k => {
    filterState[k] = k === 'search' ? '' : null;
  });
}

/**
 * 활성 필터 개수 반환 (검색어 제외)
 */
function getActiveFilterCount() {
  return Object.entries(filterState)
    .filter(([k, v]) => k !== 'search' && v !== null)
    .length;
}

export {
  filterState,
  filterProducts,
  getWizardRecommendations,
  isReasonableInstallmentPrice,
  toggleFilterButton,
  resetFilters,
  getActiveFilterCount
};
