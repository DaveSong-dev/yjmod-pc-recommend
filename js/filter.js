/**
 * filter.js - 제품 필터링 엔진
 * 게임별 / 사양별(티어) / 금액별 / 용도별 + 품절 제외
 */

import { PRICE_RANGES } from './utils.js';

/**
 * 현재 활성 필터 상태
 */
const filterState = {
  game: null,       // "리그오브레전드" | "배틀그라운드" | ...
  tier: null,       // "가성비(FHD)" | "퍼포먼스(QHD)" | "하이엔드(4K)"
  priceRange: null, // "100만 원 이하" | "100~200만 원" | ...
  usage: null,      // "게이밍" | "영상편집" | "AI/딥러닝" | "사무/디자인"
  caseColor: null,  // "블랙" | "화이트"
  search: ''
};

/**
 * 제품 목록을 필터링하여 반환
 * @param {Array} products - pc_data.json의 products 배열
 * @param {Object} filters - 적용할 필터 객체 (filterState 형식)
 * @returns {Array} 필터링된 제품 배열
 */
function filterProducts(products, filters = filterState) {
  return products.filter(product => {
    // 품절 제외 (항상 적용)
    if (!product.in_stock) return false;

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

    // 케이스 색상 필터
    if (filters.caseColor && product.case_color !== filters.caseColor) {
      return false;
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

/**
 * 위자드 선택값으로 필터를 생성하여 제품 목록 반환
 * @param {Array} products - 전체 제품 배열
 * @param {Object} wizardSelections - { game, budget, design }
 * @returns {Array} 추천 제품 배열 (최대 4개, 관련도 순 정렬)
 */
function getWizardRecommendations(products, wizardSelections) {
  const { game, budget, design } = wizardSelections;

  // 예산 -> 가격대 매핑
  const budgetToRange = {
    'budget_under100': '100만 원 이하',
    'budget_100_200': '100~200만 원',
    'budget_200_300': '200~300만 원',
    'budget_over300': '300만 원 이상'
  };

  // 디자인 -> 케이스 색상 매핑
  const designToColor = {
    'black': '블랙',
    'white': '화이트',
    'rgb': null  // RGB는 색상 필터 없이 모두 허용
  };

  const filters = {
    game: game || null,
    tier: null,
    priceRange: budgetToRange[budget] || null,
    usage: null,
    caseColor: design ? (designToColor[design] ?? null) : null,
    search: ''
  };

  let filtered = filterProducts(products, filters);

  // 결과가 없으면 색상 필터 제거 후 재시도
  if (filtered.length === 0 && filters.caseColor) {
    filtered = filterProducts(products, { ...filters, caseColor: null });
  }

  // 결과가 없으면 가격 필터만 제거
  if (filtered.length === 0) {
    filtered = filterProducts(products, { ...filters, priceRange: null, caseColor: null });
  }

  // 관련도 점수 계산 후 정렬
  const scored = filtered.map(p => ({
    product: p,
    score: calcRelevanceScore(p, wizardSelections, filters)
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 6).map(s => s.product);
}

/**
 * 제품 관련도 점수 계산
 */
function calcRelevanceScore(product, wizardSelections, filters) {
  let score = 0;
  const { game, budget, design } = wizardSelections;

  // 게임 매칭
  if (game && product.categories.games.includes(game)) score += 30;

  // 가격 범위 매칭
  if (filters.priceRange && product.categories.price_range === filters.priceRange) score += 20;

  // 케이스 색상 매칭
  if (design === 'black' && product.case_color === '블랙') score += 10;
  if (design === 'white' && product.case_color === '화이트') score += 10;
  if (design === 'rgb') score += 5;

  return score;
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

export {
  filterState,
  filterProducts,
  getWizardRecommendations,
  toggleFilterButton,
  resetFilters
};
