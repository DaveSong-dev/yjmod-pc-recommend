/**
 * app.js - 메인 애플리케이션 진입점
 *
 * 데이터 아키텍처:
 *   raw crawl (pc_data.json) = source of truth (가격, 품절, URL, 이름)
 *   reco v2 (feed.json)      = enrichment overlay (추천 태그, AI 분류)
 *   최종 상품 = raw + reco merge 결과
 */

import { fetchJson, observeScrollFade, debounce } from './utils.js';
import { filterState, filterProducts, resetFilters, isReasonableInstallmentPrice, isInStock } from './filter.js';
import { renderProductGrid, renderGroupedView, buildLoadMoreSkeleton } from './render.js';
import { loadRecoEnrichment, enrichProduct, buildConsultProduct } from './reco-loader.js';

const state = {
  products: [],
  consultProducts: [],
  fpsData: null,
  wizard: null,
  lastUpdated: null,
  recoVersion: null,
  recoFeedMap: null,
  recoConsultMap: null,
  currentView: 'main'
};

/**
 * raw 상품 배열 + reco maps → 병합된 상품 + 상담 상품 분리
 */
function mergeRawWithReco(rawProducts, feedMap, consultMap) {
  const mainProducts = [];
  const consultProducts = [];

  for (const raw of rawProducts) {
    const id = String(raw.id);

    // consult 그룹에 해당하면 상담 섹션으로 분리
    const consultItem = consultMap.get(id);
    if (consultItem) {
      consultProducts.push(buildConsultProduct(raw, consultItem));
      continue;
    }

    // feed(consumer_general)에 있으면 enrichment 적용
    const feedItem = feedMap.get(id);
    const enriched = enrichProduct(raw, feedItem || null);
    mainProducts.push(enriched);
  }

  // 정렬: reco enrichment 있는 상품 → frontend_rank_score 내림차순
  //        reco 없는 상품 → 원래 순서 유지 (뒤쪽 배치)
  mainProducts.sort((a, b) => {
    const sa = a.v2?.frontend_rank_score || 0;
    const sb = b.v2?.frontend_rank_score || 0;
    if (sa !== sb) return sb - sa;
    return 0;
  });

  return { mainProducts, consultProducts };
}

async function init() {
  showLoading(true);

  try {
    // 1단계: raw crawl 데이터 로드 (source of truth)
    const [pcData, fpsData] = await Promise.all([
      fetchJson('./data/pc_data.json'),
      fetchJson('./data/fps_reference.json')
    ]);

    state.fpsData = fpsData;

    if (!pcData?.products || pcData.products.length === 0) {
      console.error('[App] raw crawl 데이터(pc_data.json) 비어 있음');
      return;
    }

    // 2단계: reco enrichment 로드 (overlay)
    let feedMap = new Map();
    let consultMap = new Map();
    try {
      const reco = await loadRecoEnrichment();
      feedMap = reco.feedMap;
      consultMap = reco.consultMap;
      state.recoVersion = reco.version;
    } catch (recoErr) {
      console.error('[App] reco enrichment 로드 실패 (raw만 사용):', recoErr);
    }

    state.recoFeedMap = feedMap;
    state.recoConsultMap = consultMap;

    // 3단계: raw + reco merge
    const rawFiltered = pcData.products.filter(p =>
      isInStock(p) && isReasonableInstallmentPrice(p)
    );
    const { mainProducts, consultProducts } = mergeRawWithReco(rawFiltered, feedMap, consultMap);

    state.products = mainProducts;
    state.consultProducts = consultProducts;

    if (pcData.last_updated) {
      state.lastUpdated = pcData.last_updated;
      updateLastUpdatedTime(pcData.last_updated);
    }

  } catch (err) {
    console.error('[App] 데이터 로드 오류:', err);
  } finally {
    showLoading(false);
  }

  initProductGrid();
  initFilters();
  initGroupMoreDelegation();
  initFlatLoadMoreDelegation();
  initWizard();
  scheduleRecentShipping();
  initSearch();
  initScrollAnimations();
  initMobileMenu();
  initHeroStats();
  initUpdateTickers();
  initConsultSection();
}

/** 위자드 모듈은 첫 클릭 시 로드 — 초기 파싱·다운로드 분리 */
let wizardModulePromise = null;
function loadWizardModule() {
  if (!wizardModulePromise) {
    wizardModulePromise = import('./wizard.js');
  }
  return wizardModulePromise;
}

function scheduleRecentShipping() {
  const run = () => {
    import('./recent-shipping.js')
      .then(m => m.initRecentShipping())
      .catch(() => {});
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => run(), { timeout: 5000 });
  } else {
    window.setTimeout(run, 2500);
  }
}

function isAnyFilterActive() {
  return Object.entries(filterState).some(([k, v]) => {
    if (k === 'search') return v !== '';
    return v !== null;
  });
}

function initProductGrid() {
  renderView();
  observeScrollFade('.product-card');
}

function getActiveSelectedGame() {
  return typeof filterState.game === 'string' && filterState.game.trim() ? filterState.game : null;
}

function renderView() {
  const container = document.getElementById('product-grid');
  if (!container) return;

  if (isAnyFilterActive()) {
    const filtered = filterProducts(state.products, filterState);
    renderProductGrid(container, filtered, getActiveSelectedGame(), state.fpsData, filterState);
    updateProductCount(filtered.length);
  } else {
    renderGroupedView(container, state.products, state.fpsData, handleGroupFilter);
    updateProductCount(state.products.length);
  }

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

function handleGroupFilter(key, value) {
  resetFilters();
  document.querySelectorAll('.filter-active').forEach(b => b.classList.remove('filter-active'));

  filterState[key] = value;

  const targetTabMap = { usage: 'filter-usage', installment: 'filter-usage', game: 'filter-game', bestFor: 'filter-usage' };
  const targetTab = document.querySelector(`[data-target="${targetTabMap[key] || 'filter-usage'}"]`);
  if (targetTab) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    targetTab.classList.add('active');
    document.querySelectorAll('.filter-panel').forEach(p => {
      p.classList.toggle('active', p.id === targetTab.dataset.target);
      p.classList.toggle('hidden', p.id !== targetTab.dataset.target);
    });
  }

  const matchBtn = document.querySelector(`.filter-btn[data-filter-key="${key}"][data-filter-value="${value}"]`);
  if (matchBtn) matchBtn.classList.add('filter-active');

  const grid = document.getElementById('product-grid');
  if (grid) delete grid.dataset.visibleCount;

  refreshGrid();
  updateActiveFiltersDisplay();

  requestAnimationFrame(() => {
    const grid = document.getElementById('product-grid');
    if (!grid || state.products.length === 0) return;

    const cardCount = grid.querySelectorAll('.product-card').length;
    const hasEmptyState = !!grid.querySelector('.col-span-full');
    if (cardCount > 0 || hasEmptyState) return;

    let fallbackProducts;
    if (key === 'installment') {
      fallbackProducts = state.products.filter(p => (p.installment_months || 0) === Number(value));
    } else if (key === 'bestFor') {
      fallbackProducts = state.products.filter(p => p.v2?.best_for_tags?.includes(String(value)));
    } else {
      fallbackProducts = state.products.filter(p => (p.categories?.usage || []).includes(String(value)));
    }

    renderProductGrid(grid, fallbackProducts, getActiveSelectedGame(), state.fpsData, filterState);
    updateProductCount(fallbackProducts.length);
    observeScrollFade('.product-card');
    grid.classList.remove('opacity-0');
  });

  const section = document.getElementById('products-section');
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateProductCount(count) {
  const el = document.getElementById('product-count');
  if (el) el.textContent = `${count}개 제품`;
}

function initFilters() {
  document.querySelectorAll('.filter-btn[data-filter-value]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.filterKey || btn.closest('[data-filter-key-group]')?.dataset.filterKeyGroup || 'game';
      let value = btn.dataset.filterValue;

      if (key === 'installment') value = parseInt(value, 10);

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

      const grid = document.getElementById('product-grid');
      if (grid) delete grid.dataset.visibleCount;

      refreshGrid();
      updateActiveFiltersDisplay();
    });
  });

  document.getElementById('btn-reset-filter')?.addEventListener('click', () => {
    window.resetAllFilters();
  });

  window.resetAllFilters = () => {
    resetFilters();
    document.querySelectorAll('.filter-active').forEach(btn => {
      btn.classList.remove('filter-active');
    });
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const grid = document.getElementById('product-grid');
    if (grid) delete grid.dataset.visibleCount;
    refreshGrid();
    updateActiveFiltersDisplay();
  };
}

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
        container._flatFpsData || null,
        container._flatFilterState ?? null
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

function initWizard() {
  if (!window.__wizardOpenDelegationBound) {
    document.addEventListener('click', async e => {
      const btn = e.target.closest('[data-open-wizard]');
      if (!btn) return;

      e.preventDefault();
      const { Wizard } = await loadWizardModule();
      if (!state.wizard) {
        state.wizard = new Wizard('wizard-modal', state.products, state.fpsData);
      }
      const game = btn.dataset.game || null;
      state.wizard.open(game ? { game } : {});
    });
    window.__wizardOpenDelegationBound = true;
  }

  document.getElementById('wizard-close')?.addEventListener('click', () => {
    state.wizard?.close();
  });

  document.getElementById('btn-wizard-retry')?.addEventListener('click', async () => {
    const { Wizard } = await loadWizardModule();
    if (!state.wizard) {
      state.wizard = new Wizard('wizard-modal', state.products, state.fpsData);
    }
    state.wizard.open();
  });
}

function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  const debouncedSearch = debounce((value) => {
    filterState.search = value.trim();
    refreshGrid();
  }, 300);

  input.addEventListener('input', (e) => debouncedSearch(e.target.value));

  document.getElementById('search-clear')?.addEventListener('click', () => {
    input.value = '';
    filterState.search = '';
    refreshGrid();
    input.focus();
  });
}

function initScrollAnimations() {
  observeScrollFade('.fade-in-up');
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

function initHeroStats() {
  const statsEl = document.getElementById('hero-stat-products');
  if (statsEl) {
    setTimeout(() => animateCounter('hero-stat-products', state.products.length), 500);
  }
}

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

  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
}

function initConsultSection() {
  const container = document.getElementById('consult-section-grid');
  if (!container || state.consultProducts.length === 0) return;

  const section = container.closest('.consult-section');
  if (section) section.classList.remove('hidden');

  const grouped = {};
  for (const p of state.consultProducts) {
    const g = p.consult_label || '상담 필요';
    (grouped[g] = grouped[g] || []).push(p);
  }

  const KAKAO = 'https://pf.kakao.com/_sxmjxgT/chat';
  let html = '';
  for (const [label, items] of Object.entries(grouped)) {
    const preview = items.slice(0, 3);
    html += `
      <div class="col-span-full mb-4">
        <h4 class="text-sm font-bold text-gray-300 mb-3">${label} <span class="text-xs text-gray-600">${items.length}개</span></h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          ${preview.map(p => `
          <div class="bg-surface border border-white/5 rounded-xl p-4 flex gap-3 items-start hover:border-accent/30 transition-colors">
            <img src="${p.thumbnail}" alt="${String(p.name || '상담 대상 PC').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}" class="w-16 h-16 rounded-lg object-contain bg-[#0d1117] flex-shrink-0"
                 loading="lazy" onerror="this.src='https://via.placeholder.com/100x100/16213e/e94560?text=PC'"/>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-white line-clamp-2">${p.name}</p>
              <p class="text-[10px] text-gray-500 mt-1">${p.subtitle}</p>
              ${p.price > 0 ? `<p class="text-[10px] text-accent font-bold mt-1">${p.price_display}</p>` : ''}
              ${p.summary_reason ? `<p class="text-[10px] text-gray-400 mt-1 line-clamp-2">${p.summary_reason}</p>` : ''}
              <div class="flex gap-2 mt-2">
                <a href="${p.url}" target="_blank" rel="noopener noreferrer"
                   class="text-[10px] text-accent hover:text-accent/80 font-semibold">상세보기</a>
                <a href="${KAKAO}" target="_blank" rel="noopener noreferrer"
                   class="text-[10px] text-[#FEE500] hover:text-[#FEE500]/80 font-semibold">상담하기</a>
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>`;
  }

  container.innerHTML = html;
}

function showLoading(show) {
  const spinner = document.getElementById('loading-spinner');
  const grid = document.getElementById('product-grid');
  if (spinner) spinner.classList.toggle('hidden', !show);
  if (grid) grid.classList.toggle('opacity-0', show);
}

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

/**
 * 6시간 주기 데이터 폴링 — raw 재로드 후 reco re-merge
 */
function initUpdateTickers() {
  setInterval(() => {
    if (state.lastUpdated) updateLastUpdatedTime(state.lastUpdated);
  }, 60_000);

  setInterval(async () => {
    try {
      const pcData = await fetchJson(`./data/pc_data.json?v=${Date.now()}`);
      if (!pcData?.products) return;

      const nextUpdated = pcData.last_updated || null;
      if (nextUpdated && nextUpdated !== state.lastUpdated) {
        state.lastUpdated = nextUpdated;

        const rawFiltered = pcData.products.filter(p =>
          isInStock(p) && isReasonableInstallmentPrice(p)
        );

        const feedMap = state.recoFeedMap || new Map();
        const consultMap = state.recoConsultMap || new Map();
        const { mainProducts, consultProducts } = mergeRawWithReco(rawFiltered, feedMap, consultMap);

        state.products = mainProducts;
        state.consultProducts = consultProducts;

        updateLastUpdatedTime(nextUpdated);
        renderView();
        updateActiveFiltersDisplay();
      }
    } catch {
      // 폴링 실패는 무시
    }
  }, 6 * 60 * 60_000);
}

window.addEventListener('scroll', debounce(() => {
  const header = document.getElementById('main-header');
  if (!header) return;
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}, 50));

document.addEventListener('click', (e) => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  e.preventDefault();
  const target = document.querySelector(anchor.getAttribute('href'));
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.addEventListener('DOMContentLoaded', init);
