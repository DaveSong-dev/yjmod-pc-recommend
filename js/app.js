/**
 * app.js - 메인 애플리케이션 진입점
 * 데이터 로드, UI 초기화, 이벤트 바인딩
 */

import { fetchJson, observeScrollFade, debounce } from './utils.js';
import { filterState, filterProducts, resetFilters, isReasonableInstallmentPrice, isInStock } from './filter.js';
import { renderProductGrid, renderGroupedView, buildLoadMoreSkeleton } from './render.js';
import { Wizard } from './wizard.js';

// ─── 앱 상태 ────────────────────────────────────────────────
const state = {
  products: [],
  fpsData: null,
  wizard: null,
  lastUpdated: null,
  currentView: 'main' // 'main' | 'filtered'
};

// ─── 초기화 ─────────────────────────────────────────────────
async function init() {
  showLoading(true);

  try {
    // 병렬로 데이터 로드
    const [pcData, fpsData] = await Promise.all([
      fetchJson('./data/pc_data.json'),
      fetchJson('./data/fps_reference.json')
    ]);

    if (pcData?.products) {
      state.products = pcData.products.filter(p =>
        isInStock(p) && isReasonableInstallmentPrice(p)
      );
    }

    state.fpsData = fpsData;

    // 마지막 업데이트 시각 표시
    if (pcData?.last_updated) {
      state.lastUpdated = pcData.last_updated;
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
  initGroupMoreDelegation();
  initFlatLoadMoreDelegation();
  initWizard();
  initSearch();
  initScrollAnimations();
  initMobileMenu();
  initHeroStats();
  initUpdateTickers();
}

// ─── 필터 활성 여부 확인 ─────────────────────────────────────
function isAnyFilterActive() {
  return Object.entries(filterState).some(([k, v]) => {
    if (k === 'search') return v !== '';
    return v !== null;
  });
}

// ─── 제품 그리드 ─────────────────────────────────────────────
function initProductGrid() {
  renderView();
  observeScrollFade('.product-card');
}

function renderView() {
  const container = document.getElementById('product-grid');
  if (!container) return;

  if (isAnyFilterActive()) {
    // 필터 적용 시: 필터링된 결과 전체 목록 (품절 제외는 filterProducts 내부에서 처리)
    const filtered = filterProducts(state.products, filterState);
    renderProductGrid(container, filtered, null, state.fpsData);
    updateProductCount(filtered.length);
  } else {
    // 기본 상태: 그룹별 섹션 보기 (state.products는 이미 재고 있는 상품만 포함)
    renderGroupedView(container, state.products, state.fpsData, handleGroupFilter);
    updateProductCount(state.products.length);
  }

  // 일부 환경에서 opacity-0가 남아 카드가 안 보이는 현상 방지
  container.classList.remove('opacity-0');
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.classList.add('hidden');
}

function refreshGrid() {
  renderView();
  const container = document.getElementById('product-grid');
  if (container) container.classList.remove('opacity-0');
  requestAnimationFrame(() => observeScrollFade('.product-card'));
}

// 그룹 "더보기" 클릭 시 해당 필터 적용
function handleGroupFilter(key, value) {
  // 모든 필터 초기화 후 해당 필터만 적용
  resetFilters();
  document.querySelectorAll('.filter-active').forEach(b => b.classList.remove('filter-active'));

  filterState[key] = value;

  // 해당 탭과 버튼 활성화
  const targetTabMap = { usage: 'filter-usage', installment: 'filter-usage', game: 'filter-game' };
  const targetTab = document.querySelector(`[data-target="${targetTabMap[key] || 'filter-usage'}"]`);
  if (targetTab) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    targetTab.classList.add('active');
    document.querySelectorAll('.filter-panel').forEach(p => {
      p.classList.toggle('active', p.id === targetTab.dataset.target);
      p.classList.toggle('hidden', p.id !== targetTab.dataset.target);
    });
  }

  // 버튼 활성화
  const matchBtn = document.querySelector(`.filter-btn[data-filter-key="${key}"][data-filter-value="${value}"]`);
  if (matchBtn) matchBtn.classList.add('filter-active');

  // 그룹 전환 시 하단 더보기 페이지네이션 초기화
  const grid = document.getElementById('product-grid');
  if (grid) delete grid.dataset.visibleCount;

  refreshGrid();
  updateActiveFiltersDisplay();

  // 일부 환경에서 렌더 타이밍 이슈로 카드가 비어 보이는 현상 보정
  requestAnimationFrame(() => {
    const grid = document.getElementById('product-grid');
    if (!grid || state.products.length === 0) return;

    const cardCount = grid.querySelectorAll('.product-card').length;
    const hasEmptyState = !!grid.querySelector('.col-span-full');
    if (cardCount > 0 || hasEmptyState) return;

    const fallbackProducts = key === 'installment'
      ? state.products.filter(p => (p.installment_months || 0) === Number(value))
      : state.products.filter(p => (p.categories?.usage || []).includes(String(value)));

    renderProductGrid(grid, fallbackProducts, null, state.fpsData);
    updateProductCount(fallbackProducts.length);
    observeScrollFade('.product-card');
    grid.classList.remove('opacity-0');
  });

  // 제품 섹션으로 스크롤
  const section = document.getElementById('products-section');
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateProductCount(count) {
  const el = document.getElementById('product-count');
  if (el) el.textContent = `${count}개 제품`;
}

// ─── 필터 ───────────────────────────────────────────────────
function initFilters() {
  // 모든 필터 버튼에 이벤트 등록 (data-filter-key 기반)
  document.querySelectorAll('.filter-btn[data-filter-value]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.filterKey || btn.closest('[data-filter-key-group]')?.dataset.filterKeyGroup || 'game';
      let value = btn.dataset.filterValue;

      // installment 필터는 숫자로 변환
      if (key === 'installment') value = parseInt(value, 10);

      // 같은 key를 가진 버튼들에서 active 제거 (단, 다른 key 버튼은 유지)
      const isActive = btn.classList.contains('filter-active');
      document.querySelectorAll(`.filter-btn[data-filter-key="${key}"]`).forEach(b => {
        b.classList.remove('filter-active');
      });

      if (!isActive) {
        btn.classList.add('filter-active');
        filterState[key] = value;
      } else {
        filterState[key] = null;
      }

      // 더보기 카운트 리셋
      const grid = document.getElementById('product-grid');
      if (grid) delete grid.dataset.visibleCount;

      refreshGrid();
      updateActiveFiltersDisplay();
    });
  });

  // 필터 초기화 버튼
  document.getElementById('btn-reset-filter')?.addEventListener('click', () => {
    window.resetAllFilters();
  });

  // 전역 함수로 노출 (render.js의 빈 결과 버튼에서 호출)
  window.resetAllFilters = () => {
    resetFilters();
    document.querySelectorAll('.filter-active').forEach(btn => {
      btn.classList.remove('filter-active');
    });
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    // 더보기 카운트 리셋
    const grid = document.getElementById('product-grid');
    if (grid) delete grid.dataset.visibleCount;
    refreshGrid();
    updateActiveFiltersDisplay();
  };
}

// ─── 그룹 더보기 위임(안정성 보강) ─────────────────────────────
function initGroupMoreDelegation() {
  if (window.__groupMoreDelegationBound) return;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-group-more');
    if (!btn) return;

    const key = btn.dataset.groupKey;
    const raw = btn.dataset.groupValue || '';
    let value = null;
    try {
      value = JSON.parse(decodeURIComponent(raw));
    } catch {
      value = raw;
    }

    handleGroupFilter(key, value);
  });

  window.__groupMoreDelegationBound = true;
}

// ─── 하단 더보기 위임(전역 강제 바인딩) ─────────────────────────
function initFlatLoadMoreDelegation() {
  if (window.__flatMoreDelegationBound) return;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-load-more');
    if (!btn) return;
    if (btn.dataset.loading === 'true') return;

    e.preventDefault();
    const container = document.getElementById('product-grid');
    if (!container) return;

    const pageSize = 12;
    const current = parseInt(container.dataset.visibleCount || pageSize, 10);
    const total = (container._flatProducts || []).length;
    const addedCount = Math.min(pageSize, Math.max(0, total - current));
    if (!addedCount) return;

    btn.dataset.loading = 'true';
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.innerHTML = `
      <span class="load-more-inline-spinner" aria-hidden="true"></span>
      로딩 중...
    `;

    const skeletonWrap = document.createElement('div');
    skeletonWrap.className = 'js-load-more-skeleton col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5';
    skeletonWrap.innerHTML = buildLoadMoreSkeleton(Math.min(4, addedCount));
    container.appendChild(skeletonWrap);

    window.setTimeout(() => {
      container.dataset.visibleCount = String(current + pageSize);

      renderProductGrid(
        container,
        container._flatProducts || [],
        container._flatSelectedGame || null,
        container._flatFpsData || null
      );
      showLoadMoreToast(addedCount);

      requestAnimationFrame(() => {
        const cards = container.querySelectorAll('.product-card');
        if (cards[current]) {
          cards[current].scrollIntoView({ behavior: 'smooth', block: 'start' });
          cards[current].classList.add('just-loaded-card');
          setTimeout(() => cards[current]?.classList.remove('just-loaded-card'), 1200);
        }
      });
    }, 120);
  });

  window.__flatMoreDelegationBound = true;
}

function showLoadMoreToast(addedCount) {
  if (!addedCount) return;

  let toast = document.getElementById('load-more-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'load-more-toast';
    toast.className = 'load-more-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = `${addedCount}개 항목이 추가되었습니다`;
  toast.classList.add('show');
  clearTimeout(window.__loadMoreToastTimer);
  window.__loadMoreToastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 1200);
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

  // 위자드 열기 버튼: 이벤트 위임으로 안정 처리
  if (!window.__wizardOpenDelegationBound) {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-wizard]');
      if (!btn) return;

      e.preventDefault();
      if (!state.wizard) {
        state.wizard = new Wizard('wizard-modal', state.products, state.fpsData);
      }
      const game = btn.dataset.game || null;
      state.wizard.open(game ? { game } : {});
    });
    window.__wizardOpenDelegationBound = true;
  }

  // 위자드 닫기 버튼
  document.getElementById('wizard-close')?.addEventListener('click', () => {
    state.wizard.close();
  });

  // 결과 섹션 재검색 버튼
  document.getElementById('btn-wizard-retry')?.addEventListener('click', () => {
    state.wizard.open();
  });
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
    const diffMs = Math.max(0, now - date);
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor((diffMs % 3600000) / 60000);
    el.textContent = diffH > 0 ? `${diffH}시간 ${diffM}분 전` : `${diffM}분 전`;
  } catch {
    el.textContent = '최근';
  }
}

// ─── 자동 업데이트(표시 + 데이터 폴링) ───────────────────────
function initUpdateTickers() {
  // 1) "몇 분 전" 텍스트를 1분마다 갱신
  setInterval(() => {
    if (state.lastUpdated) updateLastUpdatedTime(state.lastUpdated);
  }, 60_000);

  // 2) 데이터 자동 새로고침(6시간 주기)
  setInterval(async () => {
    try {
      const pcData = await fetchJson(`./data/pc_data.json?v=${Date.now()}`);
      if (!pcData?.products) return;

      const nextUpdated = pcData.last_updated || null;
      if (nextUpdated && nextUpdated !== state.lastUpdated) {
        state.lastUpdated = nextUpdated;
        state.products = pcData.products.filter(p =>
          isInStock(p) && isReasonableInstallmentPrice(p)
        );
        updateLastUpdatedTime(nextUpdated);
        renderView();
        updateActiveFiltersDisplay();
      }
    } catch {
      // 폴링 실패는 무시 (다음 주기 재시도)
    }
  }, 6 * 60 * 60_000);
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
