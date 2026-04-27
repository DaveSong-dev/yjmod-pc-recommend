/**
 * app.js - 메인 애플리케이션 진입점
 *
 * 데이터 아키텍처:
 *   raw crawl (pc_data.json) = source of truth (가격, 품절, URL, 이름)
 *   reco v2 (feed.json)      = enrichment overlay (추천 태그, AI 분류)
 *   최종 상품 = raw + reco merge 결과
 */

import { fetchJson, observeScrollFade, debounce } from './utils.js';
import { initDetailDrawer, openDetailDrawer } from './detail-drawer.js';
import {
  createFlowLogger,
  debugCatalog,
  debugDomUpdate,
  debugEvent,
  debugRender,
  debugState,
  getBuildId,
  isDebugMode
} from './debug.js';
import { initFilterCompactBar, syncFilterCompactChips } from './filter-compact.js';
import { filterState, filterProducts, resetFilters, isReasonableInstallmentPrice, isInStock } from './filter.js';
import { renderProductGrid, renderGroupedView, buildLoadMoreSkeleton } from './render.js';
import { loadRecoEnrichment, enrichProduct, consultItemToRecoOverlay } from './reco-loader.js';
import { loadCategoryMap, getCategoryCode } from './supabase-categories.js';
import {
  buildPriceBand,
  serializeFilterState,
  serializeWizardSelections,
  trackEvent
} from './analytics.js';

const state = {
  products: [],
  fpsData: null,
  wizard: null,
  lastUpdated: null,
  recoVersion: null,
  recoFeedMap: null,
  recoConsultMap: null,
  soldoutIds: new Set(),
  currentView: 'main',
  bootPromise: null,
  shellBound: false,
  dataUiBound: false,
  catalogReady: false,
  catalogError: null,
  catalogLoadPromise: null,
  updateTickersBound: false
};

const appLog = createFlowLogger('App');
const CATALOG_READY_TIMEOUT_MS = 8000;

/**
 * raw 상품 배열 + reco maps → 병합 (feed 우선, 없으면 consult.json 오버레이로 메인 그리드에 포함)
 */
function mergeRawWithReco(rawProducts, feedMap, consultMap) {
  const mainProducts = [];

  for (const raw of rawProducts) {
    const id = String(raw.id);
    const feedItem = feedMap.get(id);
    const consultItem = consultMap.get(id);

    let enriched;
    if (feedItem) {
      enriched = enrichProduct(raw, feedItem);
    } else if (consultItem) {
      enriched = enrichProduct(raw, consultItemToRecoOverlay(consultItem));
    } else {
      enriched = enrichProduct(raw, null);
    }
    mainProducts.push(enriched);
  }

  mainProducts.sort((a, b) => {
    const sa = a.v2?.frontend_rank_score || 0;
    const sb = b.v2?.frontend_rank_score || 0;
    if (sa !== sb) return sb - sa;
    return 0;
  });

  return mainProducts;
}

function syncWizardCatalog() {
  state.wizard?.setCatalog?.(state.products, state.fpsData);
}

function renderCatalogLoadFailure(message = '상품 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.') {
  const container = document.getElementById('product-grid');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full rounded-2xl border border-white/10 bg-card px-6 py-12 text-center">
      <p class="text-sm font-semibold text-white">상품 목록을 준비하지 못했습니다.</p>
      <p class="mt-2 text-sm text-gray-400">${message}</p>
      <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          data-open-wizard
          data-source-section="catalog_failure_retry"
          class="px-4 py-2 rounded-xl bg-accent hover:bg-red-500 text-white text-sm font-semibold transition-colors"
        >
          맞춤 추천 다시 시도
        </button>
        <a
          href="#products-section"
          class="px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 text-sm text-gray-300 hover:text-white transition-colors"
        >
          전체 제품 보기
        </a>
      </div>
    </div>
  `;
  container.classList.remove('opacity-0');
  updateProductCount(0);
}

function bindAppShell() {
  if (state.shellBound) return;

  initFilters();
  initFilterCompactBar();
  initGroupMoreDelegation();
  initFlatLoadMoreDelegation();
  initWizard();
  initAnalyticsDelegation();
  initSearch();
  initMobileMenu();

  state.shellBound = true;
  appLog('shell:bound');
  debugRender('bindAppShell()', {
    shellBound: state.shellBound
  });
}

function bindDataUi() {
  if (state.dataUiBound) {
    renderView();
    updateActiveFiltersDisplay();
    requestAnimationFrame(() => observeScrollFade('.product-card'));
    return;
  }

  initProductGrid();
  updateActiveFiltersDisplay();
  initScrollAnimations();
  initHeroStats();
  initUpdateTickers();
  scheduleRecentShipping();
  initDetailDrawerDelegation();

  state.dataUiBound = true;
  appLog('shell:data-bound', { productCount: state.products.length });
}

async function loadCatalogData({ force = false, source = 'init' } = {}) {
  if (state.catalogReady && !force) return true;
  if (state.catalogLoadPromise && !force) return state.catalogLoadPromise;

  state.catalogLoadPromise = (async () => {
    appLog('catalog:load:start', { force, source });

    try {
      const [pcData, fpsData] = await Promise.all([
        fetchJson('./data/pc_data.json'),
        fetchJson('./data/fps_reference.json')
      ]);

      if (!pcData?.products || pcData.products.length === 0) {
        state.catalogReady = false;
        state.catalogError = 'missing_pc_data';
        console.error('[App] raw crawl 데이터(pc_data.json) 비어 있음');
        return false;
      }

      state.fpsData = fpsData;

      let feedMap = new Map();
      let consultMap = new Map();
      try {
        const reco = await loadRecoEnrichment();
        feedMap = reco.feedMap;
        consultMap = reco.consultMap;
        state.recoVersion = reco.version;
      } catch (recoErr) {
        appLog('catalog:reco-fallback', {
          source,
          reason: String(recoErr?.message || recoErr || 'unknown')
        });
      }

      state.recoFeedMap = feedMap;
      state.recoConsultMap = consultMap;

      const soldoutIds = new Set();
      try {
        const soldoutLog = await fetchJson('./data/soldout_log.json');
        for (const entry of soldoutLog?.soldout ?? []) {
          if (entry.revived !== true) soldoutIds.add(String(entry.id));
        }
      } catch (error) {
        appLog('catalog:soldout-fallback', {
          source,
          reason: String(error?.message || error || 'unknown')
        });
      }
      state.soldoutIds = soldoutIds;

      const rawFiltered = pcData.products.filter((product) =>
        isInStock(product, soldoutIds) && isReasonableInstallmentPrice(product)
      );

      state.products = mergeRawWithReco(rawFiltered, feedMap, consultMap);
      // v2 병합 후 재필터: raw_soldout/inventory_sync_warning 등 v2 품절 신호 반영
      state.products = state.products.filter(p => isInStock(p, soldoutIds));

      // Supabase product_codes 카테고리 로드 → 각 상품에 supaCat 첨부
      try {
        const catMap = await loadCategoryMap();
        state.products.forEach(p => {
          p.supaCat = getCategoryCode(p.id) || null;
        });
      } catch (catErr) {
        appLog('catalog:category-fallback', { reason: String(catErr?.message || catErr) });
      }

      state.lastUpdated = pcData.last_updated || null;
      state.catalogReady = state.products.length > 0;
      state.catalogError = state.catalogReady ? null : 'empty_after_filter';

      if (state.lastUpdated) {
        updateLastUpdatedTime(state.lastUpdated);
      }

      syncWizardCatalog();
      appLog('catalog:load:success', {
        source,
        productCount: state.products.length,
        recoVersion: state.recoVersion || null
      });
      return state.catalogReady;
    } catch (error) {
      state.catalogReady = false;
      state.catalogError = error;
      console.error('[App] 데이터 로드 오류:', error);
      appLog('catalog:load:error', {
        source,
        error: String(error?.message || error || 'unknown')
      });
      return false;
    } finally {
      if (!state.catalogReady) {
        state.catalogLoadPromise = null;
      }
    }
  })();

  return state.catalogLoadPromise;
}

async function ensureCatalogReady(source = 'unknown') {
  debugCatalog('start', {
    source,
    catalogReady: state.catalogReady,
    hasPendingPromise: Boolean(state.catalogLoadPromise)
  });

  const ready = await Promise.race([
    loadCatalogData({ source }),
    new Promise(resolve => {
      window.setTimeout(() => resolve('__timeout__'), CATALOG_READY_TIMEOUT_MS);
    })
  ]);

  if (ready === '__timeout__') {
    state.catalogError = 'catalog_timeout';
    state.catalogLoadPromise = null;
    appLog('catalog:load:timeout', {
      source,
      timeoutMs: CATALOG_READY_TIMEOUT_MS
    });
    debugCatalog('timeout', {
      source,
      timeoutMs: CATALOG_READY_TIMEOUT_MS
    });
    renderCatalogLoadFailure('상품 데이터를 불러오는 데 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요.');
    return false;
  }

  if (!ready) {
    debugCatalog('failed', {
      source,
      catalogError: String(state.catalogError?.message || state.catalogError || 'unknown')
    });
    renderCatalogLoadFailure();
    return false;
  }

  bindDataUi();
  debugCatalog('success', {
    source,
    productCount: state.products.length,
    recoVersion: state.recoVersion || null
  });
  return true;
}

async function init() {
  if (state.bootPromise) return state.bootPromise;

  state.bootPromise = (async () => {
    appLog('init:start', {
      protocol: window.location.protocol,
      readyState: document.readyState
    });
    if (isDebugMode()) {
      console.log(`[BUILD] ${getBuildId()}`);
    }
    debugRender('init()', {
      protocol: window.location.protocol,
      readyState: document.readyState,
      buildId: getBuildId()
    });

    bindAppShell();
    showLoading(true);

    const ready = await ensureCatalogReady('init');

    showLoading(false);

    if (!ready) {
      appLog('init:catalog-unavailable');
      return;
    }

    appLog('init:complete', {
      productCount: state.products.length,
      wizardReady: Boolean(state.wizard)
    });
    debugState({
      catalogReady: state.catalogReady,
      productCount: state.products.length,
      wizardReady: Boolean(state.wizard)
    });
  })();

  return state.bootPromise;
}

/** 위자드 모듈은 첫 클릭 시 로드 — 초기 파싱·다운로드 분리 */
let wizardModulePromise = null;
function loadWizardModule() {
  if (!wizardModulePromise) {
    wizardModulePromise = import('./wizard.js');
  }
  return wizardModulePromise;
}

function getWizardPriceBand(selections) {
  if (!selections?.budget) return null;
  return buildPriceBand({
    budget_under100: '100만 원 이하',
    budget_100_200: '100~200만 원',
    budget_200_300: '200~300만 원',
    budget_over300: '300만 원 이상'
  }[selections.budget]);
}

function getSelectionSnapshot(sourceSection = '') {
  if (String(sourceSection).startsWith('wizard')) {
    return {
      selected_filters: serializeWizardSelections(state.wizard?.selections),
      price_band: getWizardPriceBand(state.wizard?.selections)
    };
  }

  return {
    selected_filters: serializeFilterState(filterState),
    price_band: buildPriceBand(filterState.priceRange)
  };
}

function closeMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;
  menu.classList.add('hidden');
  toggle.setAttribute('aria-expanded', 'false');
}

function initAnalyticsDelegation() {
  if (window.__yjmodAnalyticsDelegationBound) return;

  document.addEventListener('click', (event) => {
    const trackEl = event.target.closest('[data-track-click]');
    if (!trackEl) return;

    const eventName = `${trackEl.dataset.trackClick}_click`;
    const sourceSection = trackEl.dataset.sourceSection || 'unknown';
    const selectionSnapshot = getSelectionSnapshot(sourceSection);

    trackEvent(eventName, {
      source_section: sourceSection,
      ...selectionSnapshot,
      product_id: trackEl.dataset.productId || null,
      product_name: trackEl.dataset.productName || null,
      category: trackEl.dataset.category || null,
      price_band: trackEl.dataset.priceBand || selectionSnapshot.price_band || null
    });
  });

  window.__yjmodAnalyticsDelegationBound = true;
}

function scheduleRecentShipping() {
  if (window.location?.protocol === 'file:') {
    document.getElementById('recent-shipping-section')?.classList.add('hidden');
    return;
  }

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
      fallbackProducts = state.products.filter(p => isInStock(p) && (p.installment_months || 0) === Number(value));
    } else if (key === 'bestFor') {
      fallbackProducts = state.products.filter(p => isInStock(p) && (p.best_for_tags || []).includes(String(value)));
    } else if (key === 'game') {
      fallbackProducts = state.products.filter(p => isInStock(p) && (p.categories?.games || []).includes(String(value)));
    } else {
      fallbackProducts = state.products.filter(p => isInStock(p) && (p.categories?.usage || []).includes(String(value)));
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
      // 같은 key의 모든 버튼(퀵필터 행 + 탭 패널 내 중복) 해제
      document.querySelectorAll(`.filter-btn[data-filter-key="${key}"]`).forEach(b => {
        b.classList.remove('filter-active');
      });

      if (!isActive) {
        // 동일 key+value를 가진 버튼 모두 활성화 (퀵필터 ↔ 탭 동기화)
        document.querySelectorAll(`.filter-btn[data-filter-key="${key}"][data-filter-value="${String(value)}"]`).forEach(b => {
          b.classList.add('filter-active');
        });
        filterState[key] = value;
        // priceRange 변경 시 priceMax 초기화 (위자드 예산과 충돌 방지)
        if (key === 'priceRange') filterState.priceMax = null;
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
  syncFilterCompactChips();
}

function initWizard() {
  if (!window.__wizardOpenDelegationBound) {
    document.addEventListener('click', async e => {
      const btn = e.target.closest('[data-open-wizard]');
      if (!btn) return;

      e.preventDefault();
      const game = btn.dataset.game || null;
      const purpose = btn.dataset.purpose || null;
      const sourceSection = btn.dataset.sourceSection || 'wizard_entry';

      appLog('wizard:trigger', {
        sourceSection,
        purpose,
        game,
        catalogReady: state.catalogReady
      });
      debugEvent('wizard_open', {
        sourceSection,
        purpose,
        game,
        buildId: getBuildId()
      });
      debugState({
        sourceSection,
        purpose,
        game,
        catalogReady: state.catalogReady
      });

      showLoading(true);
      const ready = await ensureCatalogReady(`wizard:${sourceSection}`);
      showLoading(false);
      if (!ready) return;

      const { Wizard } = await loadWizardModule();
      if (!state.wizard) {
        state.wizard = new Wizard('wizard-modal', state.products, state.fpsData);
      } else {
        syncWizardCatalog();
      }
      state.wizard.open({
        ...(game ? { game } : {}),
        ...(purpose ? { purpose } : {}),
        sourceSection
      });
      debugDomUpdate({
        modal_visible: !state.wizard.modal?.classList.contains('hidden'),
        sourceSection
      });
      trackEvent('wizard_open', {
        source_section: sourceSection,
        selected_filters: serializeWizardSelections({
          purpose: game ? 'gaming' : purpose,
          game,
          budget: null,
          design: null
        }),
        price_band: null
      });
      closeMobileMenu();
    });
    window.__wizardOpenDelegationBound = true;
  }

  document.getElementById('btn-wizard-retry')?.addEventListener('click', async () => {
    debugEvent('retry_click', {
      sourceSection: 'wizard_result'
    });
    showLoading(true);
    const ready = await ensureCatalogReady('wizard:retry');
    showLoading(false);
    if (!ready) return;

    const { Wizard } = await loadWizardModule();
    if (!state.wizard) {
      state.wizard = new Wizard('wizard-modal', state.products, state.fpsData);
    } else {
      syncWizardCatalog();
    }
    trackEvent('retry_click', {
      source_section: 'wizard_result',
      selected_filters: serializeWizardSelections(state.wizard?.selections),
      price_band: getWizardPriceBand(state.wizard?.selections)
    });
    state.wizard.open({ sourceSection: 'wizard_result_retry' });
    debugDomUpdate({
      modal_visible: !state.wizard.modal?.classList.contains('hidden'),
      sourceSection: 'wizard_result_retry'
    });
  });
}

function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  const debouncedSearch = debounce((value) => {
    filterState.search = value.trim();
    refreshGrid();
    updateActiveFiltersDisplay();
  }, 300);

  input.addEventListener('input', (e) => debouncedSearch(e.target.value));

  document.getElementById('search-clear')?.addEventListener('click', () => {
    input.value = '';
    filterState.search = '';
    refreshGrid();
    updateActiveFiltersDisplay();
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
  // 히어로 중앙 CTA 인라인 카운터 동기화
  const statsEl2 = document.getElementById('hero-stat-products-2');
  if (statsEl2) {
    setTimeout(() => animateCounter('hero-stat-products-2', state.products.length), 500);
  }
}

function initDetailDrawerDelegation() {
  initDetailDrawer(state.fpsData);

  if (!window.__detailDrawerBound) {
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-open-detail]');
      if (!btn) return;
      e.preventDefault();
      const productId = String(btn.dataset.openDetail);
      const product = state.products.find(p => String(p.id) === productId);
      if (product) openDetailDrawer(product);
    });
    window.__detailDrawerBound = true;
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
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  menu.addEventListener('click', (event) => {
    const actionable = event.target.closest('a, button');
    if (!actionable) return;
    menu.classList.add('hidden');
    toggle.setAttribute('aria-expanded', 'false');
  });
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
 * 12시간 주기 데이터 폴링 — raw 재로드 후 reco re-merge
 */
function initUpdateTickers() {
  if (state.updateTickersBound) return;
  state.updateTickersBound = true;

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
          isInStock(p, state.soldoutIds) && isReasonableInstallmentPrice(p)
        );

        const feedMap = state.recoFeedMap || new Map();
        const consultMap = state.recoConsultMap || new Map();
        state.products = mergeRawWithReco(rawFiltered, feedMap, consultMap);
        // v2 병합 후 재필터 (자동 갱신 경로)
        state.products = state.products.filter(p => isInStock(p, state.soldoutIds));
        syncWizardCatalog();

        updateLastUpdatedTime(nextUpdated);
        renderView();
        updateActiveFiltersDisplay();
      }
    } catch {
      // 폴링 실패는 무시
    }
  }, 6 * 60 * 60_000);
}

function scrollToAnchorTarget(target) {
  if (!target) return;
  const headerHeight = document.getElementById('main-header')?.offsetHeight || 64;
  const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 12;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
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
  const target = document.querySelector(anchor.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  closeMobileMenu();
  scrollToAnchorTarget(target);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void init();
  }, { once: true });
} else {
  queueMicrotask(() => {
    void init();
  });
}
