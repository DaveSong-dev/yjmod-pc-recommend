(() => {
  // js/utils.js
  var PRICE_RANGES = {
    "100\uB9CC \uC6D0 \uC774\uD558": { min: 0, max: 1e6 },
    "100~200\uB9CC \uC6D0": { min: 1e6, max: 2e6 },
    "200~300\uB9CC \uC6D0": { min: 2e6, max: 3e6 },
    "300\uB9CC \uC6D0 \uC774\uC0C1": { min: 3e6, max: Infinity }
  };
  function matchGpuFps(gpuKey, fpsData) {
    if (!gpuKey || !fpsData || !fpsData.gpus) return null;
    if (fpsData.gpus[gpuKey]) return fpsData.gpus[gpuKey];
    const keys = Object.keys(fpsData.gpus);
    for (const key of keys) {
      if (gpuKey.includes(key) || key.includes(gpuKey)) {
        return fpsData.gpus[key];
      }
    }
    return null;
  }
  function tierToResolution(tier) {
    if (tier.includes("FHD")) return "FHD";
    if (tier.includes("QHD")) return "QHD";
    if (tier.includes("4K")) return "4K";
    return "FHD";
  }
  function getExpectedFps(product, gameName, fpsData) {
    if (!gameName || !fpsData) return null;
    const gpuFps = matchGpuFps(product.specs.gpu_key, fpsData);
    if (!gpuFps || !gpuFps[gameName]) return null;
    const resolution = tierToResolution(product.categories.tier);
    const fps = gpuFps[gameName][resolution];
    if (!fps) return null;
    const cappedFps = Math.min(fps, 300);
    if (cappedFps >= 300) return `\uC57D 300+ FPS`;
    return `\uC57D ${cappedFps} FPS`;
  }
  var BADGE_COLORS = {
    green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    gold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    white: "bg-slate-300/20 text-slate-300 border-slate-300/30"
  };
  function getBadgeClass(color) {
    return BADGE_COLORS[color] || BADGE_COLORS.blue;
  }
  function debounce(fn, delay = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
  async function fetchJson(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`[fetchJson] \uB85C\uB4DC \uC2E4\uD328: ${path}`, err);
      return null;
    }
  }
  function observeScrollFade(selector = ".fade-in-up") {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll(selector).forEach((el) => observer.observe(el));
  }

  // js/filter.js
  var GAME_ALIASES = {
    "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC": ["\uBAAC\uD5CC", "\uBAAC\uC2A4\uD130\uD5CC\uD130", "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC", "MH", "Wilds", "\uBAAC\uC2A4\uD130\uD5CC\uD130\uC640\uC77C\uB4DC"],
    "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC": ["\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC", "\uB864", "LOL"],
    "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC": ["\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", "\uBC30\uADF8", "PUBG"],
    "\uB85C\uC2A4\uD2B8\uC544\uD06C": ["\uB85C\uC2A4\uD2B8\uC544\uD06C", "\uB85C\uC544"],
    "\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784": ["\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784", "\uC2A4\uD300 AAA", "AAA"],
    "\uBC1C\uB85C\uB780\uD2B8": ["\uBC1C\uB85C\uB780\uD2B8", "\uBC1C\uB85C"],
    "\uC624\uBC84\uC6CC\uCE582": ["\uC624\uBC84\uC6CC\uCE582", "\uC624\uBC84\uC6CC\uCE58"]
  };
  var SAFE_GAME_FALLBACK_ALIASES = {
    "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC": ["\uBAAC\uD5CC", "\uBAAC\uC2A4\uD130\uD5CC\uD130", "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC", "\uBAAC\uC2A4\uD130\uD5CC\uD130\uC640\uC77C\uB4DC", "wilds", "\uC640\uC77C\uC988"],
    "\uC544\uC774\uC6282": ["\uC544\uC774\uC6282", "\uC544\uC774\uC628 2"],
    "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC": ["\uBC30\uADF8", "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC"],
    "\uB85C\uC2A4\uD2B8\uC544\uD06C": ["\uB85C\uC544", "\uB85C\uC2A4\uD2B8\uC544\uD06C"],
    "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC": ["\uB864", "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC"],
    "\uBC1C\uB85C\uB780\uD2B8": ["\uBC1C\uB85C", "\uBC1C\uB85C\uB780\uD2B8"],
    "\uC624\uBC84\uC6CC\uCE582": ["\uC624\uBC84\uC6CC\uCE582", "\uC624\uBC84\uC6CC\uCE58"]
  };
  function resolveGameToCanonical(input) {
    if (!input || typeof input !== "string") return input || "";
    const s = String(input).trim();
    for (const [canonical, aliases] of Object.entries(GAME_ALIASES)) {
      if (aliases.some((a) => a.toLowerCase() === s.toLowerCase())) return canonical;
    }
    return s;
  }
  var filterState = {
    game: null,
    // "리그오브레전드" | "배틀그라운드" | ...
    tier: null,
    // "가성비(FHD)" | "퍼포먼스(QHD)" | "하이엔드(4K)"
    priceRange: null,
    // "100만 원 이하" | "100~200만 원" | ...
    usage: null,
    // "게이밍" | "영상편집" | "AI/딥러닝" | "사무/디자인" | "방송/스트리밍"
    installment: null,
    // 24 | 36 (개월)
    caseColor: null,
    // "블랙" | "화이트"
    search: ""
  };
  var MIN_INSTALLMENT_TOTAL = 8e5;
  var MIN_INSTALLMENT_MONTHLY = 3e4;
  var HIGH_END_GAMES = ["\uB85C\uC2A4\uD2B8\uC544\uD06C", "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", "\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784", "\uC624\uBC84\uC6CC\uCE582"];
  var SOLD_OUT_PRODUCT_IDS = ["2741770843"];
  var MIN_PC_PRICE = 5e5;
  function isInStock(product) {
    if (!product || product.in_stock !== true) return false;
    if (SOLD_OUT_PRODUCT_IDS.includes(product.id)) return false;
    if (product.price > 0 && product.price < MIN_PC_PRICE && !product.installment_months) return false;
    return true;
  }
  function isIntegratedGpu(product) {
    var _a, _b, _c;
    const g = ((_a = product.specs) == null ? void 0 : _a.gpu_short) || ((_b = product.specs) == null ? void 0 : _b.gpu_key) || ((_c = product.specs) == null ? void 0 : _c.gpu) || "";
    return /내장\s*그래픽|iGPU/i.test(g);
  }
  function isReasonableInstallmentPrice(product) {
    const months = product.installment_months || 0;
    if (months !== 24 && months !== 36) return true;
    if (product.price < MIN_INSTALLMENT_TOTAL) return false;
    const monthly = product.price_monthly || 0;
    if (monthly > 0 && monthly < MIN_INSTALLMENT_MONTHLY) return false;
    return true;
  }
  function normalizeProduct(product) {
    var _a, _b, _c;
    const tags = {
      games: /* @__PURE__ */ new Set(),
      usage: /* @__PURE__ */ new Set(),
      design: null,
      longNoInterest: false,
      longNoInterest24: false,
      longNoInterest36: false
    };
    (((_a = product.categories) == null ? void 0 : _a.usage) || []).forEach((u) => tags.usage.add(u));
    (((_b = product.categories) == null ? void 0 : _b.games) || []).forEach((g) => {
      tags.games.add(resolveGameToCanonical(g));
    });
    const fallbackText = `${product.name || ""} ${product.subtitle || ""}`.toLowerCase();
    for (const [canonical, aliases] of Object.entries(SAFE_GAME_FALLBACK_ALIASES)) {
      if (aliases.some((a) => fallbackText.includes(String(a).toLowerCase()))) {
        tags.games.add(canonical);
      }
    }
    const caseColor = product.case_color;
    const caseName = (((_c = product.specs) == null ? void 0 : _c.case) || "").trim();
    if (caseColor === "\uBE14\uB799" && !/화이트|WHITE/i.test(caseName)) tags.design = "\uBE14\uB799";
    else if (caseColor === "\uD654\uC774\uD2B8" && !/블랙|BLACK/i.test(caseName)) tags.design = "\uD654\uC774\uD2B8";
    const m = product.installment_months || 0;
    tags.longNoInterest = m === 24 || m === 36;
    tags.longNoInterest24 = m === 24;
    tags.longNoInterest36 = m === 36;
    return tags;
  }
  function filterProducts(products, filters = filterState) {
    return products.filter((product) => {
      var _a, _b, _c;
      if (!isInStock(product)) return false;
      if (!isReasonableInstallmentPrice(product)) return false;
      const tags = normalizeProduct(product);
      if ((filters.game || filters.usage === "\uAC8C\uC774\uBC0D") && isIntegratedGpu(product)) return false;
      if (filters.game) {
        const canon = resolveGameToCanonical(filters.game);
        if (!tags.games.has(canon)) return false;
      }
      if (filters.tier && product.categories.tier !== filters.tier) return false;
      if (filters.priceRange) {
        const range = PRICE_RANGES[filters.priceRange];
        if (range && (product.price < range.min || product.price >= range.max)) return false;
      }
      if (filters.usage && !tags.usage.has(filters.usage)) return false;
      if (filters.installment === "nointerest") {
        if (!tags.longNoInterest) return false;
      } else if (typeof filters.installment === "number") {
        if (filters.installment === 24 && !tags.longNoInterest24) return false;
        if (filters.installment === 36 && !tags.longNoInterest36) return false;
      }
      if (filters.caseColor && tags.design !== filters.caseColor) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchTarget = [
          product.name,
          ((_a = product.specs) == null ? void 0 : _a.cpu) || "",
          ((_b = product.specs) == null ? void 0 : _b.gpu) || "",
          ((_c = product.specs) == null ? void 0 : _c.ram) || ""
        ].join(" ").toLowerCase();
        if (!searchTarget.includes(q)) return false;
      }
      return true;
    });
  }
  var NON_GAMING_PURPOSES = ["office", "editing", "3d", "ai", "streaming"];
  function classifyCpu(product) {
    var _a, _b;
    const text = (((_a = product == null ? void 0 : product.specs) == null ? void 0 : _a.cpu_short) || ((_b = product == null ? void 0 : product.specs) == null ? void 0 : _b.cpu) || "").toLowerCase();
    if (!text) return "unknown";
    const isIntel = /인텔|intel|^i[3-9]-\d/i.test(text);
    const isAmd = /amd|라이젠|^r[0-9]/i.test(text);
    if (isIntel) {
      const hasNoIgu = /\d+f\b|\d+kf\b/i.test(text);
      return hasNoIgu ? "intel_f" : "intel_nonf";
    }
    if (isAmd) return "amd";
    return "unknown";
  }
  var PURPOSE_TO_USAGE = {
    gaming: "\uAC8C\uC774\uBC0D",
    office: "\uC0AC\uBB34/\uB514\uC790\uC778",
    editing: "\uC601\uC0C1\uD3B8\uC9D1",
    "3d": "3D \uBAA8\uB378\uB9C1",
    ai: "AI/\uB525\uB7EC\uB2DD",
    streaming: "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D"
  };
  function selectWithDiversity(withScore, limit = 6) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const selected = [];
    const comboCount = {};
    const MAX_PER_COMBO = 1;
    for (const item of withScore) {
      if (selected.length >= limit) break;
      const cpu = ((_b = (_a = item.product) == null ? void 0 : _a.specs) == null ? void 0 : _b.cpu_short) || ((_d = (_c = item.product) == null ? void 0 : _c.specs) == null ? void 0 : _d.cpu) || "";
      const gpu = ((_f = (_e = item.product) == null ? void 0 : _e.specs) == null ? void 0 : _f.gpu_key) || ((_h = (_g = item.product) == null ? void 0 : _g.specs) == null ? void 0 : _h.gpu_short) || "";
      const combo = `${cpu}|${gpu}`;
      const count = comboCount[combo] || 0;
      if (count >= MAX_PER_COMBO) continue;
      selected.push(item);
      comboCount[combo] = count + 1;
    }
    if (selected.length < limit) {
      const pickedIds = new Set(selected.map((s) => {
        var _a2;
        return (_a2 = s.product) == null ? void 0 : _a2.id;
      }));
      for (const item of withScore) {
        if (selected.length >= limit) break;
        if (pickedIds.has((_i = item.product) == null ? void 0 : _i.id)) continue;
        selected.push(item);
        pickedIds.add((_j = item.product) == null ? void 0 : _j.id);
      }
    }
    return selected;
  }
  function isDebugMode(options = {}) {
    var _a;
    if (options.debug === true) return true;
    try {
      if (typeof window !== "undefined" && ((_a = window.location) == null ? void 0 : _a.search)) {
        return new URLSearchParams(window.location.search).get("debug") === "1";
      }
    } catch (_) {
    }
    return false;
  }
  function getWizardRecommendations(products, wizardSelections, options = {}) {
    var _a;
    const { purpose, game, budget, installment, design } = wizardSelections;
    if (!purpose) {
      return { recommended: [] };
    }
    const budgetToRange = {
      "budget_under100": "100\uB9CC \uC6D0 \uC774\uD558",
      "budget_100_200": "100~200\uB9CC \uC6D0",
      "budget_200_300": "200~300\uB9CC \uC6D0",
      "budget_over300": "300\uB9CC \uC6D0 \uC774\uC0C1"
    };
    const designToColor = {
      "black": "\uBE14\uB799",
      "white": "\uD654\uC774\uD2B8",
      "rgb": null
    };
    const usage = PURPOSE_TO_USAGE[purpose] || null;
    const gameCanon = purpose === "gaming" && game ? resolveGameToCanonical(game) : null;
    const filters = {
      game: purpose === "gaming" ? gameCanon : null,
      tier: null,
      priceRange: budgetToRange[budget] || null,
      usage,
      installment: installment != null ? installment : null,
      caseColor: design ? (_a = designToColor[design]) != null ? _a : null : null,
      search: ""
    };
    const isImpossibleBudget = purpose === "gaming" && game && HIGH_END_GAMES.includes(resolveGameToCanonical(game)) && budget === "budget_under100";
    let filtered = filterProducts(products, filters);
    let fallbackNotice = null;
    if (filtered.length === 0 && (filters.installment === 24 || filters.installment === 36)) {
      const relaxedInstallment = { ...filters, installment: null };
      filtered = filterProducts(products, relaxedInstallment);
      if (design === "rgb") {
        filtered = filtered.filter(matchesRgbStyle);
      }
      if (filtered.length > 0) {
        fallbackNotice = "installment_relaxed";
      }
    }
    if (design === "rgb") {
      filtered = filtered.filter(matchesRgbStyle);
    }
    if (filtered.length === 0 && isImpossibleBudget) {
      return { recommended: [], noResultsReason: "impossible_budget" };
    }
    if (filtered.length === 0 && budget === "budget_under100") {
      return { recommended: [], noResultsReason: "no_products_under_budget" };
    }
    if (filtered.length === 0) {
      const relaxed = { ...filters, priceRange: null };
      filtered = filterProducts(products, relaxed);
      if (design === "rgb") {
        filtered = filtered.filter(matchesRgbStyle);
      }
    }
    if (filtered.length === 0 && usage) {
      const relaxed = { ...filters, usage: null, priceRange: budgetToRange[budget] || null };
      filtered = filterProducts(products, relaxed);
      if (design === "rgb") {
        filtered = filtered.filter(matchesRgbStyle);
      }
    }
    const withScore = filtered.map((p) => {
      const { score, reasons } = calcRelevanceScoreWithReasons(p, wizardSelections, filters);
      return { product: p, score, reasons: reasons || [] };
    });
    withScore.sort((a, b) => b.score - a.score);
    const top = selectWithDiversity(withScore, 6);
    const recommended = top.map((s) => s.product);
    const result = { recommended };
    if (fallbackNotice) {
      result.fallbackNotice = fallbackNotice;
    }
    if (isDebugMode(options)) {
      result.matchReasons = top.map((s) => ({
        productId: s.product.id,
        reasons: s.reasons
      }));
    }
    return result;
  }
  function calcRelevanceScoreWithReasons(product, wizardSelections, filters) {
    var _a;
    let score = 0;
    const reasons = [];
    const { purpose, game, design } = wizardSelections;
    const tags = normalizeProduct(product);
    if (filters.usage && tags.usage.has(filters.usage)) {
      score += 30;
      reasons.push(`usage:${filters.usage}`);
    }
    if (purpose === "gaming" && filters.game && tags.games.has(filters.game)) {
      score += 25;
      reasons.push(`game:${filters.game}`);
    }
    if (filters.priceRange && ((_a = product.categories) == null ? void 0 : _a.price_range) === filters.priceRange) {
      score += 20;
      reasons.push(`priceRange:${filters.priceRange}`);
    }
    if (filters.installment === 24 && tags.longNoInterest24) {
      score += 15;
      reasons.push("installment:24");
    } else if (filters.installment === 36 && tags.longNoInterest36) {
      score += 15;
      reasons.push("installment:36");
    } else if (filters.installment === "24_36_priority" && tags.longNoInterest) {
      score += 12;
      reasons.push("installment:24_36_priority");
    }
    if (design === "black" && tags.design === "\uBE14\uB799") {
      score += 10;
      reasons.push("design:\uBE14\uB799");
    }
    if (design === "white" && tags.design === "\uD654\uC774\uD2B8") {
      score += 10;
      reasons.push("design:\uD654\uC774\uD2B8");
    }
    if (design === "rgb" && matchesRgbStyle(product)) {
      score += 10;
      reasons.push("design:rgb");
    }
    if (NON_GAMING_PURPOSES.includes(purpose)) {
      const cpuType = classifyCpu(product);
      if (cpuType === "intel_nonf") {
        score += 25;
        reasons.push("cpu_pref:intel_nonf");
      } else if (cpuType === "intel_f") {
        score += 3;
        reasons.push("cpu_pref:intel_f_lower");
      } else if (cpuType === "amd") {
        score -= 5;
        reasons.push("cpu_pref:amd");
      }
    }
    return { score, reasons };
  }
  function matchesRgbStyle(product) {
    var _a, _b, _c;
    const text = [
      (product == null ? void 0 : product.name) || "",
      ((_a = product == null ? void 0 : product.specs) == null ? void 0 : _a.case) || "",
      ((_b = product == null ? void 0 : product.specs) == null ? void 0 : _b.ram) || "",
      ((_c = product == null ? void 0 : product.specs) == null ? void 0 : _c.gpu) || ""
    ].join(" ").toLowerCase();
    return /(argb|rgb|icue|aura|sync)/i.test(text);
  }
  function resetFilters() {
    Object.keys(filterState).forEach((k) => {
      filterState[k] = k === "search" ? "" : null;
    });
  }

  // js/render.js
  function renderProductCard(product, selectedGame = null, fpsData = null) {
    const badgeClass = getBadgeClass(product.badge_color);
    const fpsText = selectedGame && fpsData ? getExpectedFps(product, selectedGame, fpsData) : null;
    const tierBadge = {
      "\uAC00\uC131\uBE44(FHD)": { label: "FHD", cls: "text-emerald-400 bg-emerald-400/10" },
      "\uD37C\uD3EC\uBA3C\uC2A4(QHD)": { label: "QHD", cls: "text-blue-400 bg-blue-400/10" },
      "\uD558\uC774\uC5D4\uB4DC(4K)": { label: "4K", cls: "text-purple-400 bg-purple-400/10" }
    };
    const tier = tierBadge[product.categories.tier] || { label: "FHD", cls: "text-gray-400 bg-gray-400/10" };
    return `
    <article class="product-card fade-in-up group relative bg-card border border-white/5 rounded-2xl overflow-hidden
                    hover:border-accent/40 hover:shadow-[0_0_30px_rgba(233,69,96,0.15)] transition-all duration-300
                    flex flex-col" data-id="${product.id}">
      <!-- \uC378\uB124\uC77C -->
      <div class="relative overflow-hidden h-52 bg-[#0d1117] flex-shrink-0 flex items-center justify-center">
        <img
          src="${product.thumbnail}"
          alt="${product.name}"
          class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 p-1"
          loading="lazy"
          decoding="async"
          fetchpriority="low"
          onerror="this.src='https://via.placeholder.com/400x300/16213e/e94560?text=YJMOD'"
        />
        <!-- \uD488\uC9C8 \uD2F0\uC5B4 \uBC43\uC9C0 -->
        <span class="absolute top-3 left-3 px-2 py-0.5 rounded-md text-xs font-bold ${tier.cls}">
          ${tier.label}
        </span>
        <!-- \uCF00\uC774\uC2A4 \uC0C9\uC0C1 -->
        <span class="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-white/20 ${product.case_color === "\uD654\uC774\uD2B8" ? "bg-white" : "bg-gray-800"}"
              title="${product.case_color} \uCF00\uC774\uC2A4"></span>
      </div>

      <!-- \uCF58\uD150\uCE20 -->
      <div class="flex flex-col flex-1 p-5 gap-3">
        <!-- \uBC30\uC9C0 + \uC81C\uD488\uBA85 -->
        <div>
          ${product.badge ? `
          <span class="inline-block px-2 py-0.5 rounded-md text-xs font-semibold border mb-2 ${badgeClass}">
            ${product.badge}
          </span>` : ""}
          <h3 class="text-sm font-bold text-white leading-snug line-clamp-2">${product.name}</h3>
          <p class="text-xs text-gray-400 mt-1">${product.subtitle || ""}</p>
        </div>

        <!-- \uC2A4\uD399 \uC815\uBCF4 -->
        <div class="grid grid-cols-1 gap-1.5">
          ${renderSpecRow("cpu", product.specs.cpu_short || product.specs.cpu)}
          ${renderSpecRow("gpu", product.specs.gpu_short || product.specs.gpu)}
          ${renderSpecRow("ram", product.specs.ram)}
          ${renderSpecRow("ssd", product.specs.ssd)}
        </div>

        <!-- FPS \uBC30\uC9C0 (\uC704\uC790\uB4DC \uC120\uD0DD \uC2DC) -->
        ${fpsText ? `
        <div class="fps-badge flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
          <svg class="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span class="text-xs text-accent font-semibold">
            ${selectedGame} ${fpsText}
          </span>
        </div>` : ""}

        <!-- \uAC00\uACA9 + CTA -->
        <div class="mt-auto pt-3 border-t border-white/5 flex items-center justify-between gap-2">
          <div>
            ${product.installment_months > 0 ? `<p class="text-xs text-purple-400 font-semibold">${product.installment_months}\uAC1C\uC6D4 \uBB34\uC774\uC790</p>
                 <p class="text-2xl font-black text-white tracking-tight">${product.price_display}</p>
                 <p class="text-xs text-gray-500 mt-0.5">\uCD1D ${Math.round((product.price || 0) / 1e4)}\uB9CC \uC6D0</p>` : `<p class="text-xs text-gray-500">\uD310\uB9E4\uAC00</p>
                 <p class="text-2xl font-black text-white tracking-tight">${product.price_display}</p>`}
          </div>
          <a href="${product.url}" target="_blank" rel="noopener noreferrer"
             class="flex-shrink-0 px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-semibold
                    rounded-xl transition-colors duration-200 whitespace-nowrap">
            \uAD6C\uB9E4\uD558\uAE30
          </a>
        </div>
      </div>
    </article>
  `;
  }
  function renderSpecRow(type, value) {
    const icons = {
      cpu: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m0 0h2m-2 0v2M3 9v2m0 0v2M3 9H1m2 2H1m2 2H1M9 21H7a2 2 0 01-2-2v-2m4 4h6m-6 0v-2m6 2h2a2 2 0 002-2v-2m0 0h2m-2 0v-2m-14 2v-2m2 2v-2"/>`,
      gpu: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>`,
      ram: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 10h18M3 14h18M10 10v4m4-4v4"/>`,
      ssd: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>`
    };
    const labels = { cpu: "CPU", gpu: "GPU", ram: "RAM", ssd: "SSD" };
    const colors = {
      cpu: "text-orange-400",
      gpu: "text-green-400",
      ram: "text-blue-400",
      ssd: "text-purple-400"
    };
    return `
    <div class="flex items-center gap-2 text-xs">
      <svg class="w-3.5 h-3.5 ${colors[type]} flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        ${icons[type]}
      </svg>
      <span class="text-gray-500 font-medium w-6">${labels[type]}</span>
      <span class="text-gray-300 truncate">${value || "-"}</span>
    </div>
  `;
  }
  var FLAT_PAGE_SIZE = 12;
  function forceShowCards(container) {
    container.querySelectorAll(".fade-in-up").forEach((el) => {
      el.classList.add("visible");
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  }
  function renderProductGrid(container, products, selectedGame = null, fpsData = null) {
    if (!container) return;
    container._flatProducts = products;
    container._flatSelectedGame = selectedGame;
    container._flatFpsData = fpsData;
    if (products.length === 0) {
      container.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <svg class="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-gray-400 text-lg font-medium">\uD574\uB2F9 \uC870\uAC74\uC758 \uC81C\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4</p>
        <p class="text-gray-600 text-sm mt-1">\uD544\uD130\uB97C \uBCC0\uACBD\uD558\uAC70\uB098 \uCD08\uAE30\uD654\uD574 \uBCF4\uC138\uC694</p>
        <button onclick="window.resetAllFilters()"
                class="mt-4 px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent text-sm rounded-lg transition-colors">
          \uD544\uD130 \uCD08\uAE30\uD654
        </button>
      </div>
    `;
      return;
    }
    let visibleCount = parseInt(container.dataset.visibleCount || FLAT_PAGE_SIZE);
    const visible = products.slice(0, visibleCount);
    const remaining = products.length - visibleCount;
    container.dataset.visibleCount = visibleCount;
    container.innerHTML = visible.map((p) => renderProductCard(p, selectedGame, fpsData)).join("");
    if (remaining > 0) {
      const loadMoreEl = document.createElement("div");
      loadMoreEl.className = "col-span-full flex justify-center pt-4 pb-2";
      loadMoreEl.innerHTML = `
      <button class="js-load-more flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10
                     border border-white/10 hover:border-accent/40 text-sm font-semibold
                     text-gray-300 hover:text-accent rounded-xl transition-all duration-200">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
        ${remaining}\uAC1C \uB354 \uBCF4\uAE30
      </button>
    `;
      container.appendChild(loadMoreEl);
    }
    forceShowCards(container);
  }
  function buildLoadMoreSkeleton(count = 4) {
    return Array.from({ length: count }, () => `
    <article class="product-skeleton rounded-2xl border border-white/5 overflow-hidden bg-card">
      <div class="h-52 skeleton-shimmer"></div>
      <div class="p-5 space-y-3">
        <div class="h-4 w-3/4 skeleton-shimmer rounded"></div>
        <div class="h-3 w-full skeleton-shimmer rounded"></div>
        <div class="h-3 w-5/6 skeleton-shimmer rounded"></div>
        <div class="h-9 w-full skeleton-shimmer rounded-lg mt-4"></div>
      </div>
    </article>
  `).join("");
  }
  function renderWizardResultCard(product, selectedGame, fpsData, matchReasons = []) {
    const badgeClass = getBadgeClass(product.badge_color);
    const fpsText = selectedGame && fpsData ? getExpectedFps(product, selectedGame, fpsData) : null;
    const tierBadge = {
      "\uAC00\uC131\uBE44(FHD)": { label: "FHD \uAC00\uC131\uBE44", cls: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
      "\uD37C\uD3EC\uBA3C\uC2A4(QHD)": { label: "QHD \uD37C\uD3EC\uBA3C\uC2A4", cls: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
      "\uD558\uC774\uC5D4\uB4DC(4K)": { label: "4K \uD558\uC774\uC5D4\uB4DC", cls: "text-purple-400 border-purple-400/30 bg-purple-400/10" }
    };
    const tier = tierBadge[product.categories.tier] || { label: "PC", cls: "text-gray-400 border-gray-400/30 bg-gray-400/10" };
    return `
    <article class="wizard-result-card group relative bg-card border border-white/5 rounded-2xl overflow-hidden
                    hover:border-accent/40 hover:shadow-[0_0_40px_rgba(233,69,96,0.2)] transition-all duration-300
                    flex flex-col" data-id="${product.id}">
      <!-- \uC0C1\uB2E8 \uC774\uBBF8\uC9C0 -->
      <div class="relative overflow-hidden h-56 bg-[#0d1117] flex-shrink-0 flex items-center justify-center">
        <img
          src="${product.thumbnail}"
          alt="${product.name}"
          class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 p-1"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/400x300/16213e/e94560?text=YJMOD'"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent"></div>

        <!-- \uD2F0\uC5B4 \uBC43\uC9C0 -->
        <span class="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold border ${tier.cls}">
          ${tier.label}
        </span>
      </div>

      <!-- \uCF58\uD150\uCE20 -->
      <div class="flex flex-col flex-1 p-5 gap-4">
        <div>
          ${product.badge ? `
          <span class="inline-block px-2 py-0.5 rounded-md text-xs font-semibold border mb-2 ${badgeClass}">
            \u2726 ${product.badge}
          </span>` : ""}
          <h3 class="text-base font-bold text-white leading-snug">${product.name}</h3>
          <p class="text-sm text-gray-400 mt-1">${product.subtitle || ""}</p>
        </div>

        <!-- \uC0C1\uC138 \uC2A4\uD399 -->
        <div class="bg-surface rounded-xl p-3 grid grid-cols-1 gap-2">
          ${renderSpecRow("cpu", product.specs.cpu || product.specs.cpu_short)}
          ${renderSpecRow("gpu", product.specs.gpu || product.specs.gpu_short)}
          ${renderSpecRow("ram", product.specs.ram)}
          ${renderSpecRow("ssd", product.specs.ssd)}
        </div>

        <!-- FPS \uD558\uC774\uB77C\uC774\uD2B8 -->
        ${fpsText ? `
        <div class="fps-highlight flex items-center gap-3 bg-gradient-to-r from-accent/20 to-accent/5
                    border border-accent/30 rounded-xl px-4 py-3">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div>
            <p class="text-xs text-gray-400">${selectedGame} \uC608\uC0C1 \uC131\uB2A5</p>
            <p class="text-lg font-black text-accent">${fpsText}</p>
          </div>
        </div>` : ""}

        ${matchReasons.length > 0 ? `
        <div class="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2">
          <p class="text-[11px] text-cyan-200 font-semibold mb-1">debug \uB9E4\uCE6D \uADFC\uAC70</p>
          <p class="text-[11px] text-cyan-100/90">${matchReasons.join(" \xB7 ")}</p>
        </div>` : ""}

        <!-- \uAC00\uACA9 + CTA -->
        <div class="mt-auto pt-4 border-t border-white/5">
          <div class="flex items-center justify-between gap-3">
            <div>
              ${product.installment_months > 0 ? `<p class="text-xs text-purple-400 font-semibold mb-0.5">${product.installment_months}\uAC1C\uC6D4 \uBB34\uC774\uC790</p>
                   <p class="text-3xl font-black text-white tracking-tight">${product.price_display}</p>
                   <p class="text-xs text-gray-500 mt-0.5">\uCD1D ${Math.round((product.price || 0) / 1e4)}\uB9CC \uC6D0</p>` : `<p class="text-xs text-gray-500 mb-0.5">\uACAC\uC801\uAC00 (\uAE30\uBCF8 \uC0AC\uC591)</p>
                   <p class="text-3xl font-black text-white tracking-tight">${product.price_display}</p>`}
            </div>
            <a href="${product.url}" target="_blank" rel="noopener noreferrer"
               class="flex-shrink-0 px-5 py-3 bg-accent hover:bg-red-500 text-white font-bold
                      rounded-xl transition-colors duration-200 text-sm">
              \uACAC\uC801 \uD655\uC778
            </a>
          </div>
        </div>
      </div>
    </article>
  `;
  }
  var GROUPS = [
    { key: "usage", value: "\uAC8C\uC774\uBC0D", label: "\u{1F3AE} \uAC8C\uC774\uBC0D PC", desc: "\uAC8C\uC784 \uD2B9\uD654 \uCD5C\uC801\uD654 \uACAC\uC801" },
    { key: "usage", value: "AI/\uB525\uB7EC\uB2DD", label: "\u{1F916} AI \xB7 \uB525\uB7EC\uB2DD PC", desc: "AI \uC774\uBBF8\uC9C0\uC0DD\uC131 \xB7 \uBA38\uC2E0\uB7EC\uB2DD \uC804\uC6A9" },
    { key: "usage", value: "\uC601\uC0C1\uD3B8\uC9D1", label: "\u{1F3AC} \uC601\uC0C1\uD3B8\uC9D1 PC", desc: "4K \uD3B8\uC9D1 \xB7 \uB80C\uB354\uB9C1 \uD2B9\uD654" },
    { key: "usage", value: "\uC0AC\uBB34/\uB514\uC790\uC778", label: "\u{1F4BC} \uC0AC\uBB34 \xB7 \uB514\uC790\uC778 PC", desc: "\uC5C5\uBB34 \xB7 \uBB38\uC11C \xB7 \uB514\uC790\uC778 \uCD5C\uC801\uD654" },
    { key: "usage", value: "3D/\uBAA8\uB378\uB9C1", label: "\u{1F3A8} 3D \uBAA8\uB378\uB9C1 PC", desc: "CAD \xB7 \uBE14\uB80C\uB354 \xB7 \uC194\uB9AC\uB4DC\uC6CD\uC2A4" },
    { key: "usage", value: "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D", label: "\u{1F4FA} \uBC29\uC1A1 \xB7 \uC2A4\uD2B8\uB9AC\uBC0D PC", desc: "OBS \xB7 \uC6D0\uCEF4\uBC29\uC1A1 \xB7 \uB77C\uC774\uBE0C" },
    { key: "installment", value: 24, label: "\u{1F4B3} 24\uAC1C\uC6D4 \uBB34\uC774\uC790", desc: "\uC6D4 \uB0A9\uBD80\uAE08\uC73C\uB85C \uBD80\uB2F4 \uC5C6\uC774" },
    { key: "installment", value: 36, label: "\u{1F4B3} 36\uAC1C\uC6D4 \uBB34\uC774\uC790", desc: "\uAC00\uC7A5 \uB0AE\uC740 \uC6D4 \uB0A9\uBD80\uAE08" }
  ];
  var CARDS_PER_GROUP = 3;
  function renderGroupedView(container, allProducts, fpsData, onMoreClick) {
    if (!container) return;
    container._groupMoreHandler = onMoreClick;
    const grouped = GROUPS.map((group) => {
      let products;
      if (group.key === "installment") {
        products = allProducts.filter((p) => (p.installment_months || 0) === group.value);
      } else {
        products = allProducts.filter(
          (p) => {
            var _a;
            return (((_a = p.categories) == null ? void 0 : _a.usage) || []).includes(group.value) && !(p.installment_months > 0 && group.value === "\uAC8C\uC774\uBC0D");
          }
        );
      }
      return { ...group, products };
    }).filter((g) => g.products.length > 0);
    container.innerHTML = grouped.map((group) => {
      const preview = group.products.slice(0, CARDS_PER_GROUP);
      const remaining = group.products.length - CARDS_PER_GROUP;
      return `
      <div class="col-span-full group-section mb-2">
        <!-- \uC139\uC158 \uD5E4\uB354 -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-bold text-white">${group.label}</h3>
            <p class="text-xs text-gray-500 mt-0.5">${group.desc} \xB7 ${group.products.length}\uAC1C</p>
          </div>
          ${remaining > 0 ? `
          <button
            data-group-key="${group.key}"
            data-group-value="${encodeURIComponent(JSON.stringify(group.value))}"
            class="js-group-more flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-400
                   hover:text-accent border border-white/10 hover:border-accent/40
                   rounded-lg transition-all duration-200 whitespace-nowrap"
          >
            ${remaining}\uAC1C \uB354\uBCF4\uAE30
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>` : ""}
        </div>

        <!-- \uCE74\uB4DC \uADF8\uB9AC\uB4DC -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-2">
          ${preview.map((p) => renderProductCard(p, null, fpsData)).join("")}
        </div>

        <!-- \uAD6C\uBD84\uC120 -->
        <div class="border-b border-white/5 mt-6 mb-6"></div>
      </div>
    `;
    }).join("");
    forceShowCards(container);
  }

  // js/wizard.js
  var TOTAL_STEPS = 4;
  var PURPOSE_OPTIONS = [
    { id: "gaming", label: "\uAC8C\uC774\uBC0D", value: "gaming", icon: "\u{1F3AE}", desc: "\uAC8C\uC784 \uC804\uC6A9 PC" },
    { id: "office", label: "\uC0AC\uBB34\uC6A9", value: "office", icon: "\u{1F4BC}", desc: "\uBB38\uC11C\xB7\uC5C5\uBB34\uC6A9" },
    { id: "editing", label: "\uC601\uC0C1\uD3B8\uC9D1", value: "editing", icon: "\u{1F3AC}", desc: "\uD504\uB9AC\uBBF8\uC5B4\xB7\uC5D0\uD399 \uB4F1" },
    { id: "3d", label: "3D \uBAA8\uB378\uB9C1", value: "3d", icon: "\u{1F3A8}", desc: "\uBE14\uB80C\uB354\xB7CAD \uB4F1" },
    { id: "ai", label: "AI\xB7\uB525\uB7EC\uB2DD", value: "ai", icon: "\u{1F916}", desc: "\uD559\uC2B5\xB7\uCD94\uB860\uC6A9" },
    { id: "streaming", label: "\uBC29\uC1A1\xB7\uC2A4\uD2B8\uB9AC\uBC0D", value: "streaming", icon: "\u{1F4FA}", desc: "\uBC29\uC1A1\xB7\uC778\uCF54\uB529" }
  ];
  var GAME_OPTIONS = [
    { id: "lol", label: "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC", value: "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC", icon: "\u{1F3AE}", desc: "\uB864 / \uB864 \uC544\uB808\uB098" },
    { id: "pubg", label: "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", value: "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", icon: "\u{1F52B}", desc: "\uBC30\uADF8 / \uC18C\uCD1D \uAC8C\uC784" },
    { id: "loa", label: "\uB85C\uC2A4\uD2B8\uC544\uD06C", value: "\uB85C\uC2A4\uD2B8\uC544\uD06C", icon: "\u2694\uFE0F", desc: "\uB85C\uC544 / MMORPG" },
    { id: "aaa", label: "\uC2A4\uD300 AAA \uAC8C\uC784", value: "\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784", icon: "\u{1F3B2}", desc: "\uC0AC\uC774\uBC84\uD391\uD06C / \uC640\uC77C\uC988 \uB4F1" },
    { id: "valorant", label: "\uBC1C\uB85C\uB780\uD2B8", value: "\uBC1C\uB85C\uB780\uD2B8", icon: "\u{1F3AF}", desc: "\uBC1C\uB85C / FPS \uACBD\uC7C1\uC804" },
    { id: "ow2", label: "\uC624\uBC84\uC6CC\uCE582", value: "\uC624\uBC84\uC6CC\uCE582", icon: "\u{1F9B8}", desc: "\uC624\uBC84\uC6CC\uCE58 / \uD300 FPS" }
  ];
  var BUDGET_OPTIONS = [
    { id: "budget_under100", label: "100\uB9CC \uC6D0 \uC774\uD558", value: "budget_under100", icon: "\u{1F4B0}", desc: "\uAC00\uC131\uBE44 \uCD5C\uAC15 \uC785\uBB38\uC6A9" },
    { id: "budget_100_200", label: "100 ~ 200\uB9CC \uC6D0", value: "budget_100_200", icon: "\u{1F4B5}", desc: "FHD\xB7QHD \uD37C\uD3EC\uBA3C\uC2A4" },
    { id: "budget_200_300", label: "200 ~ 300\uB9CC \uC6D0", value: "budget_200_300", icon: "\u{1F48E}", desc: "QHD\xB74K \uD558\uC774\uC5D4\uB4DC" },
    { id: "budget_over300", label: "300\uB9CC \uC6D0 \uC774\uC0C1", value: "budget_over300", icon: "\u{1F451}", desc: "\uCD5C\uACE0 \uC0AC\uC591 \uBB34\uC81C\uD55C" }
  ];
  var DESIGN_OPTIONS = [
    { id: "black", label: "\uBE14\uB799 & \uB2E4\uD06C", value: "black", icon: "\u{1F5A4}", desc: "\uAC15\uB82C\uD558\uACE0 \uC138\uB828\uB41C \uB2E4\uD06C \uD1A4" },
    { id: "white", label: "\uD654\uC774\uD2B8 & \uD074\uB9B0", value: "white", icon: "\u{1F90D}", desc: "\uAE54\uB054\uD558\uACE0 \uAC10\uC131\uC801\uC778 \uD654\uC774\uD2B8" },
    { id: "rgb", label: "RGB \uD480\uCEE4\uC2A4\uD140", value: "rgb", icon: "\u{1F308}", desc: "RGB \uD29C\uB2DD \uD654\uB824\uD55C \uC5F0\uCD9C" }
  ];
  function getStepConfig(step, selections) {
    switch (step) {
      case 1:
        return {
          title: "PC \uC6A9\uB3C4\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694",
          subtitle: "\uC8FC\uB85C \uC5B4\uB5A4 \uC6A9\uB3C4\uB85C \uC0AC\uC6A9\uD558\uC2E4 \uC608\uC815\uC778\uAC00\uC694?",
          options: PURPOSE_OPTIONS,
          stepKey: "purpose",
          required: true
        };
      case 2:
        return {
          title: "\uC5B4\uB5A4 \uAC8C\uC784\uC744 \uC990\uAE30\uC2DC\uB098\uC694?",
          subtitle: "\uC8FC\uB85C \uD50C\uB808\uC774\uD558\uB294 \uAC8C\uC784\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694",
          options: GAME_OPTIONS,
          stepKey: "game",
          required: false
        };
      case 3:
        return {
          title: "\uC608\uC0B0\uC774 \uC5BC\uB9C8\uB098 \uB418\uC2DC\uB098\uC694?",
          subtitle: "\uC120\uD0DD\uD558\uC2E0 \uC608\uC0B0 \uB0B4\uC5D0\uC11C \uCD5C\uC801\uC758 \uACAC\uC801\uC744 \uCD94\uCC9C\uD574 \uB4DC\uB9BD\uB2C8\uB2E4",
          options: BUDGET_OPTIONS,
          stepKey: "budget",
          required: true
        };
      case 4:
        return {
          title: "\uCF00\uC774\uC2A4 \uC2A4\uD0C0\uC77C\uC744 \uACE8\uB77C\uC8FC\uC138\uC694",
          subtitle: "\uCDE8\uD5A5\uC5D0 \uB9DE\uB294 \uB514\uC790\uC778\uC73C\uB85C \uC644\uC131\uB3C4\uB97C \uB192\uC5EC\uBCF4\uC138\uC694",
          options: DESIGN_OPTIONS,
          stepKey: "design",
          required: false
        };
      default:
        return null;
    }
  }
  function getStepLabel(step) {
    const labels = ["\uC6A9\uB3C4", "\uAC8C\uC784", "\uC608\uC0B0", "\uB514\uC790\uC778"];
    return labels[step - 1] || "";
  }
  var Wizard = class {
    constructor(modalId, products, fpsData) {
      this.modal = document.getElementById(modalId);
      this.products = products;
      this.fpsData = fpsData;
      this.currentStep = 1;
      this.selections = {
        purpose: null,
        game: null,
        budget: null,
        design: null
      };
      this.resultContainer = document.getElementById("wizard-result-container");
      this.resultSection = document.getElementById("wizard-result-section");
      if (!this.modal) return;
      this.init();
    }
    init() {
      this.renderStep(1);
      this.bindModalClose();
    }
    /**
     * @param {{ game?: string }} options - game: 게임별 추천 버튼에서 선택한 게임이면 3단계(예산)부터 열림
     */
    open(options = {}) {
      this.currentStep = 1;
      this.selections = {
        purpose: null,
        game: null,
        budget: null,
        design: null
      };
      const presetGame = (options == null ? void 0 : options.game) && String(options.game).trim();
      if (presetGame) {
        this.selections.purpose = "gaming";
        this.selections.game = presetGame;
        this.currentStep = 3;
      }
      this.renderStep(this.currentStep);
      this.modal.classList.remove("hidden");
      this.modal.classList.add("flex");
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => {
        const panel = this.modal.querySelector(".wizard-panel");
        if (panel) {
          panel.classList.remove("scale-95", "opacity-0");
          panel.classList.add("scale-100", "opacity-100");
        }
      });
    }
    close() {
      const panel = this.modal.querySelector(".wizard-panel");
      if (panel) {
        panel.classList.add("scale-95", "opacity-0");
        panel.classList.remove("scale-100", "opacity-100");
      }
      setTimeout(() => {
        this.modal.classList.add("hidden");
        this.modal.classList.remove("flex");
        document.body.style.overflow = "";
      }, 200);
    }
    bindModalClose() {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) this.close();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !this.modal.classList.contains("hidden")) {
          this.close();
        }
      });
    }
    renderStep(step) {
      const config = getStepConfig(step, this.selections);
      if (!config) return;
      const panel = this.modal.querySelector(".wizard-panel") || this.modal;
      let content = panel.querySelector(".wizard-content");
      if (!content) {
        content = document.createElement("div");
        content.className = "wizard-content px-6 pb-6 overflow-y-auto";
        panel.appendChild(content);
      } else {
        content.className = "wizard-content px-6 pb-6 overflow-y-auto";
      }
      const progressBtns = panel.querySelectorAll(".step-indicator");
      progressBtns.forEach((btn, i) => {
        const stepNum = i + 1;
        btn.classList.toggle("step-active", stepNum === step);
        btn.classList.toggle("step-done", stepNum < step);
        btn.classList.toggle("step-pending", stepNum > step);
      });
      const labelEl = panel.querySelector(".step-label");
      if (labelEl) labelEl.textContent = getStepLabel(step);
      const connectors = panel.querySelectorAll(".step-connector");
      connectors.forEach((conn, i) => {
        conn.classList.toggle("done", i + 1 < step);
      });
      content.style.opacity = "0";
      content.style.transform = "translateX(20px)";
      const showSkip = !config.required;
      const skipBtn = showSkip ? '<button id="wizard-skip" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">\uAC74\uB108\uB6F0\uAE30</button>' : "<span></span>";
      content.innerHTML = `
      <div class="mb-6">
        <h3 class="text-xl font-bold text-white">${config.title}</h3>
        <p class="text-sm text-gray-400 mt-1">${config.subtitle}</p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        ${config.options.map((opt) => `
          <button
            class="wizard-option group relative flex flex-col items-center gap-2 p-4 rounded-xl
                   border border-white/10 bg-surface hover:border-accent/50 hover:bg-accent/5
                   transition-all duration-200 text-center cursor-pointer"
            data-value="${opt.value}"
            data-step="${step}"
          >
            <span class="text-2xl">${opt.icon}</span>
            <span class="text-sm font-semibold text-white">${opt.label}</span>
            <span class="text-xs text-gray-500">${opt.desc}</span>
            <div class="wizard-check absolute top-2 right-2 w-5 h-5 rounded-full bg-accent
                        flex items-center justify-center opacity-0 scale-0 transition-all duration-200">
              <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </button>
        `).join("")}
      </div>

      <div class="flex justify-between mt-6">
        ${step > 1 ? `
          <button id="wizard-prev" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            \u2190 \uC774\uC804
          </button>` : "<div></div>"}
        ${skipBtn}
      </div>
    `;
      requestAnimationFrame(() => {
        content.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        content.style.opacity = "1";
        content.style.transform = "translateX(0)";
      });
      this.bindStepEvents(step, config);
    }
    bindStepEvents(step, config) {
      var _a;
      const content = this.modal.querySelector(".wizard-content");
      const stepKey = config.stepKey;
      content.querySelectorAll(".wizard-option").forEach((btn) => {
        btn.addEventListener("click", () => {
          content.querySelectorAll(".wizard-option").forEach((b) => {
            var _a2;
            b.classList.remove("border-accent", "bg-accent/10");
            (_a2 = b.querySelector(".wizard-check")) == null ? void 0 : _a2.classList.add("opacity-0", "scale-0");
          });
          btn.classList.add("border-accent", "bg-accent/10");
          const check = btn.querySelector(".wizard-check");
          check == null ? void 0 : check.classList.remove("opacity-0", "scale-0");
          const value = btn.dataset.value;
          this.selections[stepKey] = value;
          setTimeout(() => {
            if (step < TOTAL_STEPS) {
              let nextStep = step + 1;
              if (nextStep === 2 && this.selections.purpose !== "gaming") nextStep = 3;
              this.currentStep = nextStep;
              this.renderStep(this.currentStep);
            } else {
              this.showResults();
            }
          }, 350);
        });
      });
      (_a = document.getElementById("wizard-prev")) == null ? void 0 : _a.addEventListener("click", () => {
        let prevStep = step - 1;
        if (prevStep === 2 && this.selections.purpose !== "gaming") prevStep = 1;
        this.currentStep = prevStep;
        this.renderStep(this.currentStep);
      });
      const skipBtn = document.getElementById("wizard-skip");
      if (skipBtn) {
        skipBtn.addEventListener("click", () => {
          if (step < TOTAL_STEPS) {
            let nextStep = step + 1;
            if (nextStep === 2 && this.selections.purpose !== "gaming") nextStep = 3;
            this.currentStep = nextStep;
            this.renderStep(this.currentStep);
          } else {
            this.showResults();
          }
        });
      }
    }
    showResults() {
      this.close();
      const { recommended, noResultsReason, matchReasons } = getWizardRecommendations(this.products, this.selections);
      if (!this.resultSection || !this.resultContainer) return;
      const selectedGame = this.selections.game;
      this.resultSection.classList.remove("hidden");
      const summaryEl = document.getElementById("wizard-result-summary");
      if (summaryEl) {
        const parts = [];
        if (this.selections.purpose) {
          const purposeLabels = {
            gaming: "\u{1F3AE} \uAC8C\uC774\uBC0D",
            office: "\u{1F4BC} \uC0AC\uBB34\uC6A9",
            editing: "\u{1F3AC} \uC601\uC0C1\uD3B8\uC9D1",
            "3d": "\u{1F3A8} 3D \uBAA8\uB378\uB9C1",
            ai: "\u{1F916} AI\xB7\uB525\uB7EC\uB2DD",
            streaming: "\u{1F4FA} \uBC29\uC1A1\xB7\uC2A4\uD2B8\uB9AC\uBC0D"
          };
          parts.push(purposeLabels[this.selections.purpose] || "");
        }
        if (selectedGame) parts.push(`\u{1F3AE} ${selectedGame}`);
        if (this.selections.budget) {
          const labels = {
            budget_under100: "\u{1F4B0} 100\uB9CC \uC6D0 \uC774\uD558",
            budget_100_200: "\u{1F4B5} 100~200\uB9CC \uC6D0",
            budget_200_300: "\u{1F48E} 200~300\uB9CC \uC6D0",
            budget_over300: "\u{1F451} 300\uB9CC \uC6D0+"
          };
          parts.push(labels[this.selections.budget] || "");
        }
        if (this.selections.design) {
          const labels = { black: "\u{1F5A4} \uBE14\uB799", white: "\u{1F90D} \uD654\uC774\uD2B8", rgb: "\u{1F308} RGB" };
          parts.push(labels[this.selections.design] || "");
        }
        summaryEl.textContent = parts.filter(Boolean).join("  \xB7  ") || "\uC804\uCCB4 \uCD94\uCC9C";
      }
      if (recommended.length === 0) {
        let emptyMessage = "\uC870\uAC74\uC5D0 \uB9DE\uB294 \uC81C\uD488\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uD544\uD130\uB97C \uC870\uC815\uD574 \uBCF4\uC138\uC694.";
        if (noResultsReason === "impossible_budget") {
          emptyMessage = "\uC120\uD0DD\uD558\uC2E0 \uAC8C\uC784(\uB85C\uC2A4\uD2B8\uC544\uD06C, \uBC30\uADF8 \uB4F1)\uC744 100\uB9CC \uC6D0 \uB300\uB85C \uCF8C\uC801\uD558\uAC8C \uC990\uAE30\uAE30\uC5D0\uB294 \uB9DE\uB294 \uC81C\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. 100~200\uB9CC \uC6D0 \uC774\uC0C1 \uAD6C\uAC04\uC744 \uCD94\uCC9C\uB4DC\uB9BD\uB2C8\uB2E4.";
        } else if (noResultsReason === "no_products_under_budget") {
          emptyMessage = "\uC120\uD0DD\uD55C \uC608\uC0B0(100\uB9CC \uC6D0 \uC774\uD558)\uC5D0 \uB9DE\uB294 \uC81C\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. 100~200\uB9CC \uC6D0 \uAD6C\uAC04\uC744 \uC120\uD0DD\uD574 \uBCF4\uC2DC\uAC70\uB098 \uB2E4\uB978 \uC870\uAC74\uC744 \uC870\uC815\uD574 \uBCF4\uC138\uC694.";
        }
        this.resultContainer.innerHTML = `
        <div class="col-span-full text-center py-12">
          <p class="text-gray-400">${emptyMessage}</p>
        </div>
      `;
      } else {
        const reasonMap = new Map((matchReasons || []).map((m) => [String(m.productId), m.reasons || []]));
        this.resultContainer.innerHTML = recommended.map((p) => renderWizardResultCard(p, selectedGame, this.fpsData, reasonMap.get(String(p.id)) || [])).join("");
      }
      setTimeout(() => {
        this.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
        observeScrollFade(".wizard-result-card");
      }, 100);
    }
  };

  // js/app.js
  var state = {
    products: [],
    fpsData: null,
    wizard: null,
    lastUpdated: null,
    currentView: "main"
    // 'main' | 'filtered'
  };
  async function init() {
    showLoading(true);
    try {
      const [pcData, fpsData] = await Promise.all([
        fetchJson("./data/pc_data.json"),
        fetchJson("./data/fps_reference.json")
      ]);
      if (pcData == null ? void 0 : pcData.products) {
        state.products = pcData.products.filter(
          (p) => isInStock(p) && isReasonableInstallmentPrice(p)
        );
      }
      state.fpsData = fpsData;
      if (pcData == null ? void 0 : pcData.last_updated) {
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
    initSearch();
    initScrollAnimations();
    initMobileMenu();
    initHeroStats();
    initUpdateTickers();
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
  function renderView() {
    const container = document.getElementById("product-grid");
    if (!container) return;
    if (isAnyFilterActive()) {
      const filtered = filterProducts(state.products, filterState);
      renderProductGrid(container, filtered, null, state.fpsData);
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
    const targetTabMap = { usage: "filter-usage", installment: "filter-usage", game: "filter-game" };
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
      const fallbackProducts = key === "installment" ? state.products.filter((p) => (p.installment_months || 0) === Number(value)) : state.products.filter((p) => {
        var _a;
        return (((_a = p.categories) == null ? void 0 : _a.usage) || []).includes(String(value));
      });
      renderProductGrid(grid2, fallbackProducts, null, state.fpsData);
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
        container.dataset.visibleCount = String(current + pageSize);
        renderProductGrid(
          container,
          container._flatProducts || [],
          container._flatSelectedGame || null,
          container._flatFpsData || null
        );
        showLoadMoreToast(addedCount);
        requestAnimationFrame(() => {
          const cards = container.querySelectorAll(".product-card");
          if (cards[current]) {
            cards[current].scrollIntoView({ behavior: "smooth", block: "start" });
            cards[current].classList.add("just-loaded-card");
            setTimeout(() => {
              var _a;
              return (_a = cards[current]) == null ? void 0 : _a.classList.remove("just-loaded-card");
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
    state.wizard = new Wizard("wizard-modal", state.products, state.fpsData);
    if (!window.__wizardOpenDelegationBound) {
      document.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-open-wizard]");
        if (!btn) return;
        e.preventDefault();
        if (!state.wizard) {
          state.wizard = new Wizard("wizard-modal", state.products, state.fpsData);
        }
        const game = btn.dataset.game || null;
        state.wizard.open(game ? { game } : {});
      });
      window.__wizardOpenDelegationBound = true;
    }
    (_a = document.getElementById("wizard-close")) == null ? void 0 : _a.addEventListener("click", () => {
      state.wizard.close();
    });
    (_b = document.getElementById("btn-wizard-retry")) == null ? void 0 : _b.addEventListener("click", () => {
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
          state.products = pcData.products.filter(
            (p) => isInStock(p) && isReasonableInstallmentPrice(p)
          );
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
})();
