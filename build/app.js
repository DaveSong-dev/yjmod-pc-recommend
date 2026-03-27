import {
  buildLoadMoreSkeleton,
  filterProducts,
  filterState,
  isInStock,
  isReasonableInstallmentPrice,
  renderGroupedView,
  renderProductGrid,
  resetFilters
} from "./chunk-6MQWMU3C.js";
import {
  debounce,
  fetchJson,
  observeScrollFade
} from "./chunk-3K2RG6CP.js";

// js/reco-loader.js
var RECO_BASE = "./data/reco";
var FALLBACK_FEED = `${RECO_BASE}/v2.0.0/feed.json`;
var SPEC_BAND_TO_TIER = {
  "FHD \uAC00\uC131\uBE44": "\uAC00\uC131\uBE44(FHD)",
  "QHD \uD37C\uD3EC\uBA3C\uC2A4": "\uD37C\uD3EC\uBA3C\uC2A4(QHD)",
  "4K \uD558\uC774\uC5D4\uB4DC": "\uD558\uC774\uC5D4\uB4DC(4K)"
};
var COLOR_KR = { white: "\uD654\uC774\uD2B8", black: "\uBE14\uB799", other: null };
var USAGE_TAG_NORMALIZE = {
  "\uC0AC\uBB34\uC6A9": "\uC0AC\uBB34/\uB514\uC790\uC778",
  "AI\xB7\uB525\uB7EC\uB2DD": "AI/\uB525\uB7EC\uB2DD",
  "\uBC29\uC1A1\xB7\uC2A4\uD2B8\uB9AC\uBC0D": "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D"
};
function normalizeUsageTag(tag) {
  return USAGE_TAG_NORMALIZE[tag] || tag;
}
var CONSULT_GROUP_LABELS = {
  office_apu_consult: "\uC0AC\uBB34/\uB0B4\uC7A5\uADF8\uB798\uD53D \uC0C1\uB2F4",
  bundle_consult: "\uBC18\uBCF8\uCCB4/\uBD80\uD488 \uC0C1\uB2F4",
  server_ws_consult: "\uC11C\uBC84/\uC6CC\uD06C\uC2A4\uD14C\uC774\uC158 \uC0C1\uB2F4",
  consumer_consult: "\uB9DE\uCDA4 \uACAC\uC801 \uC0C1\uB2F4",
  manual_review: "\uC218\uB3D9 \uAC80\uD1A0 \uD544\uC694",
  manual_consult: "\uB9DE\uCDA4 \uC0C1\uB2F4"
};
async function loadRecoEnrichment() {
  var _a;
  let feedPath = FALLBACK_FEED;
  let consultPath = null;
  let version = "2.0.0";
  try {
    const manifest = await fetchJson(`${RECO_BASE}/manifest.json`);
    if ((manifest == null ? void 0 : manifest.active_version) && ((_a = manifest.versions) == null ? void 0 : _a[manifest.active_version])) {
      version = manifest.active_version;
      const entry = manifest.versions[version];
      feedPath = `${RECO_BASE}/${entry.feed}`;
      if (entry.consult_feed) {
        consultPath = `${RECO_BASE}/${entry.consult_feed}`;
      }
    }
  } catch (_) {
  }
  const feedMap = /* @__PURE__ */ new Map();
  try {
    const rawFeed = await fetchJson(feedPath);
    if (Array.isArray(rawFeed)) {
      for (const item of rawFeed) {
        if (item.it_id) feedMap.set(String(item.it_id), item);
      }
    }
  } catch (_) {
  }
  const consultMap = /* @__PURE__ */ new Map();
  if (consultPath) {
    try {
      const rawConsult = await fetchJson(consultPath);
      if (Array.isArray(rawConsult)) {
        for (const item of rawConsult) {
          if (item.it_id) consultMap.set(String(item.it_id), item);
        }
      }
    } catch (_) {
    }
  }
  return { feedMap, consultMap, version };
}
function enrichProduct(rawProduct, recoItem) {
  var _a, _b, _c, _d, _e;
  if (!recoItem) {
    return { ...rawProduct, v2: null };
  }
  const enriched = { ...rawProduct };
  const rawGames = new Set(((_a = enriched.categories) == null ? void 0 : _a.games) || []);
  const rawUsage = new Set(((_b = enriched.categories) == null ? void 0 : _b.usage) || []);
  (recoItem.frontend_game_tags || []).forEach((g) => rawGames.add(g));
  (recoItem.frontend_usage_tags || []).map(normalizeUsageTag).forEach((u) => rawUsage.add(u));
  enriched.categories = {
    ...enriched.categories,
    games: [...rawGames],
    usage: [...rawUsage],
    tier: SPEC_BAND_TO_TIER[recoItem.frontend_spec_band] || ((_c = enriched.categories) == null ? void 0 : _c.tier) || "",
    price_range: recoItem.frontend_price_band || ((_d = enriched.categories) == null ? void 0 : _d.price_range) || ""
  };
  if (!enriched.case_color && recoItem.case_color) {
    enriched.case_color = (_e = COLOR_KR[recoItem.case_color]) != null ? _e : null;
  }
  enriched.specs = { ...enriched.specs };
  if (!enriched.specs.cpu_short && recoItem.cpu_norm) {
    enriched.specs.cpu_short = recoItem.cpu_norm;
  }
  if (!enriched.specs.gpu_short && recoItem.gpu_norm) {
    enriched.specs.gpu_short = recoItem.gpu_norm;
  }
  if (!enriched.specs.gpu_key && recoItem.gpu_norm) {
    enriched.specs.gpu_key = recoItem.gpu_norm;
  }
  enriched.v2 = {
    dataset_version: recoItem.dataset_version,
    recommendable: recoItem.recommendable !== false,
    recommend_group: recoItem.recommend_group || "consumer_general",
    product_type: recoItem.product_type || "",
    raw_soldout: recoItem.raw_soldout,
    inventory_sync_warning: recoItem.inventory_sync_warning,
    price_is_estimated: recoItem.price_is_estimated,
    price_source: recoItem.price_source,
    cpu_norm: recoItem.cpu_norm,
    gpu_norm: recoItem.gpu_norm,
    ram_gb: recoItem.ram_gb,
    ssd_total_gb: recoItem.ssd_total_gb,
    gpu_vram_gb: recoItem.gpu_vram_gb,
    power_watt: recoItem.power_watt,
    case_color_raw: recoItem.case_color,
    wifi_support: recoItem.wifi_support,
    gaming_grade_fhd: recoItem.gaming_grade_fhd,
    gaming_grade_qhd: recoItem.gaming_grade_qhd,
    gaming_grade_4k: recoItem.gaming_grade_4k,
    video_edit_grade: recoItem.video_edit_grade,
    office_grade: recoItem.office_grade,
    modeling_grade: recoItem.modeling_grade,
    ai_ready: recoItem.ai_ready,
    llm_entry_ready: recoItem.llm_entry_ready,
    gpu_tensor_class: recoItem.gpu_tensor_class,
    vram_class: recoItem.vram_class,
    local_ai_grade: recoItem.local_ai_grade,
    image_gen_local_grade: recoItem.image_gen_local_grade,
    frontend_primary_usage: recoItem.frontend_primary_usage,
    frontend_spec_band: recoItem.frontend_spec_band,
    frontend_rank_score: recoItem.frontend_rank_score || 0,
    best_for_tags: recoItem.best_for_tags || [],
    selling_points: recoItem.selling_points || [],
    display_badges: recoItem.display_badges || [],
    summary_reason: recoItem.summary_reason || "",
    frontend_game_tags: recoItem.frontend_game_tags || [],
    frontend_usage_tags: recoItem.frontend_usage_tags || [],
    fps_1080p: recoItem.fps_1080p,
    fps_1440p: recoItem.fps_1440p,
    fps_4k_corrected: recoItem.fps_4k_corrected
  };
  return enriched;
}
function buildConsultProduct(rawProduct, consultItem) {
  var _a;
  return {
    id: rawProduct.id,
    name: rawProduct.name,
    subtitle: rawProduct.subtitle || `${consultItem.cpu_norm || ""} + ${consultItem.gpu_norm || ""}`.trim(),
    url: rawProduct.url,
    thumbnail: rawProduct.thumbnail,
    price: rawProduct.price,
    price_display: rawProduct.price_display,
    in_stock: rawProduct.in_stock,
    case_color: rawProduct.case_color || ((_a = COLOR_KR[consultItem.case_color]) != null ? _a : null),
    recommend_group: consultItem.recommend_group || "",
    consult_label: CONSULT_GROUP_LABELS[consultItem.recommend_group] || "\uC0C1\uB2F4 \uD544\uC694",
    exclude_reason: consultItem.exclude_reason || [],
    summary_reason: consultItem.summary_reason || "",
    selling_points: consultItem.selling_points || [],
    display_badges: consultItem.display_badges || [],
    consult_required: consultItem.consult_required !== false
  };
}

// js/app.js
var state = {
  products: [],
  consultProducts: [],
  fpsData: null,
  wizard: null,
  lastUpdated: null,
  recoVersion: null,
  recoFeedMap: null,
  recoConsultMap: null,
  currentView: "main"
};
function mergeRawWithReco(rawProducts, feedMap, consultMap) {
  const mainProducts = [];
  const consultProducts = [];
  for (const raw of rawProducts) {
    const id = String(raw.id);
    const consultItem = consultMap.get(id);
    if (consultItem) {
      consultProducts.push(buildConsultProduct(raw, consultItem));
      continue;
    }
    const feedItem = feedMap.get(id);
    const enriched = enrichProduct(raw, feedItem || null);
    mainProducts.push(enriched);
  }
  mainProducts.sort((a, b) => {
    var _a, _b;
    const sa = ((_a = a.v2) == null ? void 0 : _a.frontend_rank_score) || 0;
    const sb = ((_b = b.v2) == null ? void 0 : _b.frontend_rank_score) || 0;
    if (sa !== sb) return sb - sa;
    return 0;
  });
  return { mainProducts, consultProducts };
}
async function init() {
  showLoading(true);
  try {
    const [pcData, fpsData] = await Promise.all([
      fetchJson("./data/pc_data.json"),
      fetchJson("./data/fps_reference.json")
    ]);
    state.fpsData = fpsData;
    if (!(pcData == null ? void 0 : pcData.products) || pcData.products.length === 0) {
      console.error("[App] raw crawl \uB370\uC774\uD130(pc_data.json) \uBE44\uC5B4 \uC788\uC74C");
      return;
    }
    let feedMap = /* @__PURE__ */ new Map();
    let consultMap = /* @__PURE__ */ new Map();
    try {
      const reco = await loadRecoEnrichment();
      feedMap = reco.feedMap;
      consultMap = reco.consultMap;
      state.recoVersion = reco.version;
    } catch (recoErr) {
      console.error("[App] reco enrichment \uB85C\uB4DC \uC2E4\uD328 (raw\uB9CC \uC0AC\uC6A9):", recoErr);
    }
    state.recoFeedMap = feedMap;
    state.recoConsultMap = consultMap;
    const rawFiltered = pcData.products.filter(
      (p) => isInStock(p) && isReasonableInstallmentPrice(p)
    );
    const { mainProducts, consultProducts } = mergeRawWithReco(rawFiltered, feedMap, consultMap);
    state.products = mainProducts;
    state.consultProducts = consultProducts;
    if (pcData.last_updated) {
      state.lastUpdated = pcData.last_updated;
      updateLastUpdatedTime(pcData.last_updated);
    }
  } catch (err) {
    console.error("[App] \uB370\uC774\uD130 \uB85C\uB4DC \uC624\uB958:", err);
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
var wizardModulePromise = null;
function loadWizardModule() {
  if (!wizardModulePromise) {
    wizardModulePromise = import("./chunk-2ZNKSIU5.js");
  }
  return wizardModulePromise;
}
function scheduleRecentShipping() {
  const run = () => {
    import("./chunk-AYW4CJIL.js").then((m) => m.initRecentShipping()).catch(() => {
    });
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => run(), { timeout: 5e3 });
  } else {
    window.setTimeout(run, 2500);
  }
}
function isAnyFilterActive() {
  return Object.entries(filterState).some(([k, v]) => {
    if (k === "search") return v !== "";
    return v !== null;
  });
}
function initProductGrid() {
  renderView();
  observeScrollFade(".product-card");
}
function getActiveSelectedGame() {
  return typeof filterState.game === "string" && filterState.game.trim() ? filterState.game : null;
}
function renderView() {
  const container = document.getElementById("product-grid");
  if (!container) return;
  if (isAnyFilterActive()) {
    const filtered = filterProducts(state.products, filterState);
    renderProductGrid(container, filtered, getActiveSelectedGame(), state.fpsData, filterState);
    updateProductCount(filtered.length);
  } else {
    renderGroupedView(container, state.products, state.fpsData, handleGroupFilter);
    updateProductCount(state.products.length);
  }
  container.classList.remove("opacity-0");
  const spinner = document.getElementById("loading-spinner");
  if (spinner) spinner.classList.add("hidden");
}
function refreshGrid() {
  renderView();
  const container = document.getElementById("product-grid");
  if (container) container.classList.remove("opacity-0");
  requestAnimationFrame(() => observeScrollFade(".product-card"));
}
function handleGroupFilter(key, value) {
  resetFilters();
  document.querySelectorAll(".filter-active").forEach((b) => b.classList.remove("filter-active"));
  filterState[key] = value;
  const targetTabMap = { usage: "filter-usage", installment: "filter-usage", game: "filter-game", bestFor: "filter-usage" };
  const targetTab = document.querySelector(`[data-target="${targetTabMap[key] || "filter-usage"}"]`);
  if (targetTab) {
    document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
    targetTab.classList.add("active");
    document.querySelectorAll(".filter-panel").forEach((p) => {
      p.classList.toggle("active", p.id === targetTab.dataset.target);
      p.classList.toggle("hidden", p.id !== targetTab.dataset.target);
    });
  }
  const matchBtn = document.querySelector(`.filter-btn[data-filter-key="${key}"][data-filter-value="${value}"]`);
  if (matchBtn) matchBtn.classList.add("filter-active");
  const grid = document.getElementById("product-grid");
  if (grid) delete grid.dataset.visibleCount;
  refreshGrid();
  updateActiveFiltersDisplay();
  requestAnimationFrame(() => {
    const grid2 = document.getElementById("product-grid");
    if (!grid2 || state.products.length === 0) return;
    const cardCount = grid2.querySelectorAll(".product-card").length;
    const hasEmptyState = !!grid2.querySelector(".col-span-full");
    if (cardCount > 0 || hasEmptyState) return;
    let fallbackProducts;
    if (key === "installment") {
      fallbackProducts = state.products.filter((p) => (p.installment_months || 0) === Number(value));
    } else if (key === "bestFor") {
      fallbackProducts = state.products.filter((p) => {
        var _a, _b;
        return (_b = (_a = p.v2) == null ? void 0 : _a.best_for_tags) == null ? void 0 : _b.includes(String(value));
      });
    } else {
      fallbackProducts = state.products.filter((p) => {
        var _a;
        return (((_a = p.categories) == null ? void 0 : _a.usage) || []).includes(String(value));
      });
    }
    renderProductGrid(grid2, fallbackProducts, getActiveSelectedGame(), state.fpsData, filterState);
    updateProductCount(fallbackProducts.length);
    observeScrollFade(".product-card");
    grid2.classList.remove("opacity-0");
  });
  const section = document.getElementById("products-section");
  if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
}
function updateProductCount(count) {
  const el = document.getElementById("product-count");
  if (el) el.textContent = `${count}\uAC1C \uC81C\uD488`;
}
function initFilters() {
  var _a;
  document.querySelectorAll(".filter-btn[data-filter-value]").forEach((btn) => {
    btn.addEventListener("click", () => {
      var _a2;
      const key = btn.dataset.filterKey || ((_a2 = btn.closest("[data-filter-key-group]")) == null ? void 0 : _a2.dataset.filterKeyGroup) || "game";
      let value = btn.dataset.filterValue;
      if (key === "installment") value = parseInt(value, 10);
      const isActive = btn.classList.contains("filter-active");
      document.querySelectorAll(`.filter-btn[data-filter-key="${key}"]`).forEach((b) => {
        b.classList.remove("filter-active");
      });
      if (!isActive) {
        btn.classList.add("filter-active");
        filterState[key] = value;
      } else {
        filterState[key] = null;
      }
      const grid = document.getElementById("product-grid");
      if (grid) delete grid.dataset.visibleCount;
      refreshGrid();
      updateActiveFiltersDisplay();
    });
  });
  (_a = document.getElementById("btn-reset-filter")) == null ? void 0 : _a.addEventListener("click", () => {
    window.resetAllFilters();
  });
  window.resetAllFilters = () => {
    resetFilters();
    document.querySelectorAll(".filter-active").forEach((btn) => {
      btn.classList.remove("filter-active");
    });
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = "";
    const grid = document.getElementById("product-grid");
    if (grid) delete grid.dataset.visibleCount;
    refreshGrid();
    updateActiveFiltersDisplay();
  };
}
function initGroupMoreDelegation() {
  if (window.__groupMoreDelegationBound) return;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-group-more");
    if (!btn) return;
    const key = btn.dataset.groupKey;
    const raw = btn.dataset.groupValue || "";
    let value = null;
    try {
      value = JSON.parse(decodeURIComponent(raw));
    } catch (e2) {
      value = raw;
    }
    handleGroupFilter(key, value);
  });
  window.__groupMoreDelegationBound = true;
}
function initFlatLoadMoreDelegation() {
  if (window.__flatMoreDelegationBound) return;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-load-more");
    if (!btn) return;
    if (btn.dataset.loading === "true") return;
    e.preventDefault();
    const container = document.getElementById("product-grid");
    if (!container) return;
    const pageSize = 12;
    const current = parseInt(container.dataset.visibleCount || pageSize, 10);
    const total = (container._flatProducts || []).length;
    const addedCount = Math.min(pageSize, Math.max(0, total - current));
    if (!addedCount) return;
    btn.dataset.loading = "true";
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.innerHTML = `
      <span class="load-more-inline-spinner" aria-hidden="true"></span>
      \uB85C\uB529 \uC911...
    `;
    const skeletonWrap = document.createElement("div");
    skeletonWrap.className = "js-load-more-skeleton col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5";
    skeletonWrap.innerHTML = buildLoadMoreSkeleton(Math.min(4, addedCount));
    container.appendChild(skeletonWrap);
    window.setTimeout(() => {
      var _a;
      container.dataset.visibleCount = String(current + pageSize);
      renderProductGrid(
        container,
        container._flatProducts || [],
        container._flatSelectedGame || null,
        container._flatFpsData || null,
        (_a = container._flatFilterState) != null ? _a : null
      );
      showLoadMoreToast(addedCount);
      requestAnimationFrame(() => {
        const cards = container.querySelectorAll(".product-card");
        if (cards[current]) {
          cards[current].scrollIntoView({ behavior: "smooth", block: "start" });
          cards[current].classList.add("just-loaded-card");
          setTimeout(() => {
            var _a2;
            return (_a2 = cards[current]) == null ? void 0 : _a2.classList.remove("just-loaded-card");
          }, 1200);
        }
      });
    }, 120);
  });
  window.__flatMoreDelegationBound = true;
}
function showLoadMoreToast(addedCount) {
  if (!addedCount) return;
  let toast = document.getElementById("load-more-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "load-more-toast";
    toast.className = "load-more-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = `${addedCount}\uAC1C \uD56D\uBAA9\uC774 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4`;
  toast.classList.add("show");
  clearTimeout(window.__loadMoreToastTimer);
  window.__loadMoreToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1200);
}
function updateActiveFiltersDisplay() {
  const indicator = document.getElementById("active-filter-count");
  if (!indicator) return;
  const activeCount = Object.values(filterState).filter((v) => v && v !== "").length;
  if (activeCount > 0) {
    indicator.textContent = activeCount;
    indicator.classList.remove("hidden");
  } else {
    indicator.classList.add("hidden");
  }
}
function initWizard() {
  var _a, _b;
  if (!window.__wizardOpenDelegationBound) {
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-open-wizard]");
      if (!btn) return;
      e.preventDefault();
      const { Wizard } = await loadWizardModule();
      if (!state.wizard) {
        state.wizard = new Wizard("wizard-modal", state.products, state.fpsData);
      }
      const game = btn.dataset.game || null;
      state.wizard.open(game ? { game } : {});
    });
    window.__wizardOpenDelegationBound = true;
  }
  (_a = document.getElementById("wizard-close")) == null ? void 0 : _a.addEventListener("click", () => {
    var _a2;
    (_a2 = state.wizard) == null ? void 0 : _a2.close();
  });
  (_b = document.getElementById("btn-wizard-retry")) == null ? void 0 : _b.addEventListener("click", async () => {
    const { Wizard } = await loadWizardModule();
    if (!state.wizard) {
      state.wizard = new Wizard("wizard-modal", state.products, state.fpsData);
    }
    state.wizard.open();
  });
}
function initSearch() {
  var _a;
  const input = document.getElementById("search-input");
  if (!input) return;
  const debouncedSearch = debounce((value) => {
    filterState.search = value.trim();
    refreshGrid();
  }, 300);
  input.addEventListener("input", (e) => debouncedSearch(e.target.value));
  (_a = document.getElementById("search-clear")) == null ? void 0 : _a.addEventListener("click", () => {
    input.value = "";
    filterState.search = "";
    refreshGrid();
    input.focus();
  });
}
function initScrollAnimations() {
  observeScrollFade(".fade-in-up");
  animateCounter("hero-stat-products", state.products.length, 0, 1e3);
}
function animateCounter(id, target, start = 0, duration = 1e3) {
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
  const statsEl = document.getElementById("hero-stat-products");
  if (statsEl) {
    setTimeout(() => animateCounter("hero-stat-products", state.products.length), 500);
  }
}
function initMobileMenu() {
  const toggle = document.getElementById("mobile-menu-toggle");
  const menu = document.getElementById("mobile-menu");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    const isOpen = !menu.classList.contains("hidden");
    if (isOpen) {
      menu.classList.add("hidden");
      toggle.setAttribute("aria-expanded", "false");
    } else {
      menu.classList.remove("hidden");
      toggle.setAttribute("aria-expanded", "true");
    }
  });
  document.addEventListener("click", (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add("hidden");
    }
  });
}
function initConsultSection() {
  const container = document.getElementById("consult-section-grid");
  if (!container || state.consultProducts.length === 0) return;
  const section = container.closest(".consult-section");
  if (section) section.classList.remove("hidden");
  const grouped = {};
  for (const p of state.consultProducts) {
    const g = p.consult_label || "\uC0C1\uB2F4 \uD544\uC694";
    (grouped[g] = grouped[g] || []).push(p);
  }
  const KAKAO = "https://pf.kakao.com/_sxmjxgT/chat";
  let html = "";
  for (const [label, items] of Object.entries(grouped)) {
    const preview = items.slice(0, 3);
    html += `
      <div class="col-span-full mb-4">
        <h4 class="text-sm font-bold text-gray-300 mb-3">${label} <span class="text-xs text-gray-600">${items.length}\uAC1C</span></h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          ${preview.map((p) => `
          <div class="bg-surface border border-white/5 rounded-xl p-4 flex gap-3 items-start hover:border-accent/30 transition-colors">
            <img src="${p.thumbnail}" alt="${String(p.name || "\uC0C1\uB2F4 \uB300\uC0C1 PC").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}" class="w-16 h-16 rounded-lg object-contain bg-[#0d1117] flex-shrink-0"
                 loading="lazy" onerror="this.src='https://via.placeholder.com/100x100/16213e/e94560?text=PC'"/>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-white line-clamp-2">${p.name}</p>
              <p class="text-[10px] text-gray-500 mt-1">${p.subtitle}</p>
              ${p.price > 0 ? `<p class="text-[10px] text-accent font-bold mt-1">${p.price_display}</p>` : ""}
              ${p.summary_reason ? `<p class="text-[10px] text-gray-400 mt-1 line-clamp-2">${p.summary_reason}</p>` : ""}
              <div class="flex gap-2 mt-2">
                <a href="${p.url}" target="_blank" rel="noopener noreferrer"
                   class="text-[10px] text-accent hover:text-accent/80 font-semibold">\uC0C1\uC138\uBCF4\uAE30</a>
                <a href="${KAKAO}" target="_blank" rel="noopener noreferrer"
                   class="text-[10px] text-[#FEE500] hover:text-[#FEE500]/80 font-semibold">\uC0C1\uB2F4\uD558\uAE30</a>
              </div>
            </div>
          </div>`).join("")}
        </div>
      </div>`;
  }
  container.innerHTML = html;
}
function showLoading(show) {
  const spinner = document.getElementById("loading-spinner");
  const grid = document.getElementById("product-grid");
  if (spinner) spinner.classList.toggle("hidden", !show);
  if (grid) grid.classList.toggle("opacity-0", show);
}
function updateLastUpdatedTime(isoString) {
  const el = document.getElementById("last-updated-time");
  if (!el) return;
  try {
    const date = new Date(isoString);
    const now = /* @__PURE__ */ new Date();
    const diffMs = Math.max(0, now - date);
    const diffH = Math.floor(diffMs / 36e5);
    const diffM = Math.floor(diffMs % 36e5 / 6e4);
    el.textContent = diffH > 0 ? `${diffH}\uC2DC\uAC04 ${diffM}\uBD84 \uC804` : `${diffM}\uBD84 \uC804`;
  } catch (e) {
    el.textContent = "\uCD5C\uADFC";
  }
}
function initUpdateTickers() {
  setInterval(() => {
    if (state.lastUpdated) updateLastUpdatedTime(state.lastUpdated);
  }, 6e4);
  setInterval(async () => {
    try {
      const pcData = await fetchJson(`./data/pc_data.json?v=${Date.now()}`);
      if (!(pcData == null ? void 0 : pcData.products)) return;
      const nextUpdated = pcData.last_updated || null;
      if (nextUpdated && nextUpdated !== state.lastUpdated) {
        state.lastUpdated = nextUpdated;
        const rawFiltered = pcData.products.filter(
          (p) => isInStock(p) && isReasonableInstallmentPrice(p)
        );
        const feedMap = state.recoFeedMap || /* @__PURE__ */ new Map();
        const consultMap = state.recoConsultMap || /* @__PURE__ */ new Map();
        const { mainProducts, consultProducts } = mergeRawWithReco(rawFiltered, feedMap, consultMap);
        state.products = mainProducts;
        state.consultProducts = consultProducts;
        updateLastUpdatedTime(nextUpdated);
        renderView();
        updateActiveFiltersDisplay();
      }
    } catch (e) {
    }
  }, 6 * 60 * 6e4);
}
window.addEventListener("scroll", debounce(() => {
  const header = document.getElementById("main-header");
  if (!header) return;
  if (window.scrollY > 50) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
}, 50));
document.addEventListener("click", (e) => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  e.preventDefault();
  const target = document.querySelector(anchor.getAttribute("href"));
  target == null ? void 0 : target.scrollIntoView({ behavior: "smooth", block: "start" });
});
document.addEventListener("DOMContentLoaded", init);
