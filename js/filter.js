/**
 * filter.js - 제품 필터링 엔진
 * 게임별 / 사양별(티어) / 금액별 / 용도별 + 품절 제외
 */

import { PRICE_RANGES } from './utils.js';

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
 * 제품 목록을 필터링하여 반환
 * @param {Array} products - pc_data.json의 products 배열
 * @param {Object} filters - 적용할 필터 객체 (filterState 형식)
 * @returns {Array} 필터링된 제품 배열
 */
function filterProducts(products, filters = filterState) {
  return products.filter(product => {
    // 품절·블록리스트 제외 (전 제품 공통)
    if (!isInStock(product)) return false;

    // 24/36 무이자 상품 중 비정상 가격(품절·플레이스홀더) 제외
    if (!isReasonableInstallmentPrice(product)) return false;

    // 게임용(게임 필터 또는 용도=게이밍)일 때 내장그래픽 제품 제외
    if ((filters.game || filters.usage === '게이밍') && isIntegratedGpu(product)) {
      return false;
    }

    // 게임 필터
    if (filters.game && !product.categories.games.includes(filters.game)) {
      return false;
    }

    // 사양 티어 필터
    if (filters.tier && product.categories.tier !== filters.tier) {
      return false;
    }

    // 금액 필터
    if (filters.priceRange) {
      const range = PRICE_RANGES[filters.priceRange];
      if (range && (product.price < range.min || product.price >= range.max)) {
        return false;
      }
    }

    // 용도 필터
    if (filters.usage && !product.categories.usage.includes(filters.usage)) {
      return false;
    }

    // 할부 필터 ('nointerest' = 24 또는 36개월 무이자 상품만)
    if (filters.installment === 'nointerest') {
      const months = product.installment_months || 0;
      if (months !== 24 && months !== 36) return false;
    }

    // 케이스 색상 필터 (case_color 필드 + specs.case 크로스체크)
    // case_color 필드가 크롤러 오분류로 틀릴 수 있어 케이스명으로 2차 검증
    if (filters.caseColor) {
      if (product.case_color !== filters.caseColor) return false;
      const caseName = product.specs?.case || '';
      if (filters.caseColor === '화이트' && /블랙|BLACK/i.test(caseName)) return false;
      if (filters.caseColor === '블랙' && /화이트|WHITE/i.test(caseName)) return false;
    }

    // 검색어 필터
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const searchTarget = [
        product.name,
        product.specs.cpu,
        product.specs.gpu,
        product.specs.ram
      ].join(' ').toLowerCase();
      if (!searchTarget.includes(q)) return false;
    }

    return true;
  });
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
 * 위자드 선택값으로 필터를 생성하여 제품 목록 반환
 * @param {Array} products - 전체 제품 배열
 * @param {Object} wizardSelections - { purpose, game, budget, design }
 * @returns {{ recommended: Array, noResultsReason?: string }}
 */
function getWizardRecommendations(products, wizardSelections) {
  const { purpose, game, budget, design } = wizardSelections;

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

  const filters = {
    game: purpose === 'gaming' ? (game || null) : null,
    tier: null,
    priceRange: budgetToRange[budget] || null,
    usage,
    installment: null,
    caseColor: design ? (designToColor[design] ?? null) : null,
    search: ''
  };

  const isImpossibleBudget = purpose === 'gaming' && HIGH_END_GAMES.includes(game) && budget === 'budget_under100';

  let filtered = filterProducts(products, filters);

  if (design === 'rgb') {
    filtered = filtered.filter(matchesRgbStyle);
  }

  // 고사양 게임 + 100만 이하: 예산 완화 없이 0건 + 전용 안내
  if (filtered.length === 0 && isImpossibleBudget) {
    return { recommended: [], noResultsReason: 'impossible_budget' };
  }

  // 100만 원 이하 선택 시: 예산 완화 금지 (발로란트·롤 등 모든 게임 동일)
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

  const scored = filtered.map(p => ({
    product: p,
    score: calcRelevanceScore(p, wizardSelections, filters)
  }));

  scored.sort((a, b) => b.score - a.score);

  const recommended = scored.slice(0, 6).map(s => s.product);
  return { recommended };
}

/**
 * 제품 관련도 점수 계산 (purpose, game, budget, design 반영)
 */
function calcRelevanceScore(product, wizardSelections, filters) {
  let score = 0;
  const { purpose, game, design } = wizardSelections;

  // 용도(usage) 매칭
  if (filters.usage && product.categories.usage && product.categories.usage.includes(filters.usage)) {
    score += 30;
  }

  // 게임 매칭 (게이밍일 때)
  if (purpose === 'gaming' && game && product.categories.games && product.categories.games.includes(game)) {
    score += 25;
  }

  // 가격 범위 매칭
  if (filters.priceRange && product.categories.price_range === filters.priceRange) {
    score += 20;
  }

  // 케이스 색상 매칭
  if (design === 'black' && product.case_color === '블랙') score += 10;
  if (design === 'white' && product.case_color === '화이트') score += 10;
  if (design === 'rgb' && matchesRgbStyle(product)) score += 10;

  return score;
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
