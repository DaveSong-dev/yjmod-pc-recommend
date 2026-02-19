/**
 * app.js - 메인 애플리케이션 진입점
 * 데이터 로드, UI 초기화, 이벤트 바인딩
 */

import { fetchJson, observeScrollFade, debounce } from './utils.js';
import { filterState, filterProducts, toggleFilterButton, resetFilters } from './filter.js';
import { renderProductGrid } from './render.js';
import { CafeSlider } from './cafe-slider.js';
import { Wizard } from './wizard.js';

// ─── 앱 상태 ────────────────────────────────────────────────
const state = {
  products: [],
  cafePosts: [],
  fpsData: null,
  wizard: null,
  slider: null,
  currentView: 'main' // 'main' | 'filtered'
};

// ─── 초기화 ─────────────────────────────────────────────────
async function init() {
  showLoading(true);

  try {
    // 병렬로 데이터 로드
    const [pcData, cafeData, fpsData] = await Promise.all([
      fetchJson('./data/pc_data.json'),
      fetchJson('./data/cafe_posts.json'),
      fetchJson('./data/fps_reference.json')
    ]);

    if (pcData?.products) {
      // 품절 제외는 filter.js에서 처리하지만, 데이터 레이어에서도 확인
      state.products = pcData.products.filter(p => p.in_stock !== false);
    }

    if (cafeData?.posts) {
      state.cafePosts = cafeData.posts;
    }

    state.fpsData = fpsData;

    // 마지막 업데이트 시각 표시
    if (pcData?.last_updated) {
      updateLastUpdatedTime(pcData.last_updated);
    }

  } catch (err) {
    console.error('[App] 데이터 로드 오류:', err);
  } finally {
    showLoading(false);
  }

  // UI 초기화
  initProductGrid();
  initFilters();
  initWizard();
  initCafeSlider();
  initSearch();
  initScrollAnimations();
  initMobileMenu();
  initHeroStats();
}

// ─── 제품 그리드 ─────────────────────────────────────────────
function initProductGrid() {
  const container = document.getElementById('product-grid');
  const filtered = filterProducts(state.products, filterState);
  renderProductGrid(container, filtered, null, state.fpsData);
  updateProductCount(filtered.length);
  observeScrollFade('.product-card');
}

function refreshGrid() {
  const container = document.getElementById('product-grid');
  const filtered = filterProducts(state.products, filterState);
  renderProductGrid(container, filtered, null, state.fpsData);
  updateProductCount(filtered.length);

  // 애니메이션 재적용
  requestAnimationFrame(() => observeScrollFade('.product-card'));
}

function updateProductCount(count) {
  const el = document.getElementById('product-count');
  if (el) el.textContent = `${count}개 제품`;
}

// ─── 필터 ───────────────────────────────────────────────────
function initFilters() {
  // 탭 필터 그룹들
  const filterGroups = [
    { groupId: 'filter-game', key: 'game' },
    { groupId: 'filter-tier', key: 'tier' },
    { groupId: 'filter-price', key: 'priceRange' },
    { groupId: 'filter-usage', key: 'usage' }
  ];

  filterGroups.forEach(({ groupId, key }) => {
    const group = document.getElementById(groupId);
    if (!group) return;

    group.querySelectorAll('[data-filter-value]').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleFilterButton(group, btn, key, btn.dataset.filterValue);
        refreshGrid();
        updateActiveFiltersDisplay();
      });
    });
  });

  // 필터 초기화 버튼
  document.getElementById('btn-reset-filter')?.addEventListener('click', () => {
    window.resetAllFilters();
  });

  // 전역 함수로 노출 (render.js의 빈 결과 버튼에서 호출)
  window.resetAllFilters = () => {
    resetFilters();
    document.querySelectorAll('[data-filter-value].filter-active').forEach(btn => {
      btn.classList.remove('filter-active');
    });
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    refreshGrid();
    updateActiveFiltersDisplay();
  };
}

function updateActiveFiltersDisplay() {
  const indicator = document.getElementById('active-filter-count');
  if (!indicator) return;

  const activeCount = Object.values(filterState).filter(v => v && v !== '').length;
  if (activeCount > 0) {
    indicator.textContent = activeCount;
    indicator.classList.remove('hidden');
  } else {
    indicator.classList.add('hidden');
  }
}

// ─── 위자드 ─────────────────────────────────────────────────
function initWizard() {
  state.wizard = new Wizard('wizard-modal', state.products, state.fpsData);

  // 위자드 열기 버튼들 (게임 퀵 선택 포함)
  document.querySelectorAll('[data-open-wizard]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.wizard.open();
      // 게임 퀵 선택: data-game 속성이 있으면 Step1을 자동 선택
      const preGame = btn.dataset.game;
      if (preGame) {
        // 약간의 딜레이 후 해당 게임 옵션 자동 클릭
        setTimeout(() => {
          const gameBtn = document.querySelector(
            `#wizard-modal .wizard-option[data-value="${preGame}"]`
          );
          if (gameBtn) gameBtn.click();
        }, 350);
      }
    });
  });

  // 위자드 닫기 버튼
  document.getElementById('wizard-close')?.addEventListener('click', () => {
    state.wizard.close();
  });

  // 결과 섹션 재검색 버튼
  document.getElementById('btn-wizard-retry')?.addEventListener('click', () => {
    state.wizard.open();
  });
}

// ─── 카페 슬라이더 ───────────────────────────────────────────
function initCafeSlider() {
  if (state.cafePosts.length === 0) {
    document.getElementById('cafe-section')?.classList.add('hidden');
    return;
  }

  state.slider = new CafeSlider('cafe-slider-container', state.cafePosts);
}

// ─── 검색 ───────────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  const debouncedSearch = debounce((value) => {
    filterState.search = value.trim();
    refreshGrid();
  }, 300);

  input.addEventListener('input', (e) => debouncedSearch(e.target.value));

  // 검색 지우기
  document.getElementById('search-clear')?.addEventListener('click', () => {
    input.value = '';
    filterState.search = '';
    refreshGrid();
    input.focus();
  });
}

// ─── 스크롤 애니메이션 ───────────────────────────────────────
function initScrollAnimations() {
  observeScrollFade('.fade-in-up');

  // 히어로 카운터 애니메이션
  animateCounter('hero-stat-products', state.products.length, 0, 1000);
}

function animateCounter(id, target, start = 0, duration = 1000) {
  const el = document.getElementById(id);
  if (!el) return;

  const step = (target - start) / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.floor(current);
    if (current >= target) clearInterval(timer);
  }, 16);
}

// ─── 히어로 통계 ─────────────────────────────────────────────
function initHeroStats() {
  // 제품 수 표시
  const statsEl = document.getElementById('hero-stat-products');
  if (statsEl) {
    setTimeout(() => animateCounter('hero-stat-products', state.products.length), 500);
  }
}

// ─── 모바일 메뉴 ─────────────────────────────────────────────
function initMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = !menu.classList.contains('hidden');
    if (isOpen) {
      menu.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');
    } else {
      menu.classList.remove('hidden');
      toggle.setAttribute('aria-expanded', 'true');
    }
  });

  // 메뉴 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
}

// ─── 로딩 스피너 ─────────────────────────────────────────────
function showLoading(show) {
  const spinner = document.getElementById('loading-spinner');
  const grid = document.getElementById('product-grid');
  if (spinner) spinner.classList.toggle('hidden', !show);
  if (grid) grid.classList.toggle('opacity-0', show);
}

// ─── 마지막 업데이트 시간 ─────────────────────────────────────
function updateLastUpdatedTime(isoString) {
  const el = document.getElementById('last-updated-time');
  if (!el) return;

  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor((diffMs % 3600000) / 60000);

    if (diffH > 0) {
      el.textContent = `${diffH}시간 ${diffM}분 전`;
    } else {
      el.textContent = `${diffM}분 전`;
    }
  } catch {
    el.textContent = '최근';
  }
}

// ─── 헤더 스크롤 효과 ────────────────────────────────────────
window.addEventListener('scroll', debounce(() => {
  const header = document.getElementById('main-header');
  if (!header) return;
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}, 50));

// ─── 스무스 앵커 스크롤 ──────────────────────────────────────
document.addEventListener('click', (e) => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  e.preventDefault();
  const target = document.querySelector(anchor.getAttribute('href'));
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ─── 앱 시작 ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
