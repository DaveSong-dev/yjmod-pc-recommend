(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // js/utils.js
  function formatPrice(won) {
    const man = Math.floor(won / 1e4);
    if (man >= 100) {
      const eok = Math.floor(man / 100);
      const remain = man % 100;
      if (remain === 0) return `${eok}\uC5B5 \uC6D0`;
      return `${eok}\uC5B5 ${remain}\uB9CC \uC6D0`;
    }
    return `${man}\uB9CC \uC6D0`;
  }
  function normalizeGpuKey(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]+/g, "").trim();
  }
  function matchGpuFps(gpuKey, fpsData) {
    if (!gpuKey || !fpsData || !fpsData.gpus) return null;
    if (fpsData.gpus[gpuKey]) return fpsData.gpus[gpuKey];
    const normalizedTarget = normalizeGpuKey(gpuKey);
    const candidates = Object.keys(fpsData.gpus).map((key) => ({
      key,
      normalized: normalizeGpuKey(key)
    }));
    const exact = candidates.find((candidate) => candidate.normalized === normalizedTarget);
    if (exact) return fpsData.gpus[exact.key];
    const partial = candidates.filter(
      (candidate) => normalizedTarget.includes(candidate.normalized)
    ).sort((a, b) => b.normalized.length - a.normalized.length)[0];
    if (partial) return fpsData.gpus[partial.key];
    return null;
  }
  function tierToResolution(tier) {
    if (tier.includes("FHD")) return "FHD";
    if (tier.includes("QHD")) return "QHD";
    if (tier.includes("4K")) return "4K";
    return "FHD";
  }
  function getProductGameFpsEntry(product, gameName) {
    var _a;
    const entry = (_a = product == null ? void 0 : product.game_fps) == null ? void 0 : _a[gameName];
    if (!entry || !entry.fps) return null;
    return {
      fps: Number(entry.fps),
      resolution: entry.resolution || null,
      label: entry.label || gameName,
      source: "product"
    };
  }
  function formatGameFpsEntry(entry, fallbackGameName = "") {
    if (!entry || !entry.fps) return null;
    const label = entry.label || fallbackGameName;
    const fpsValue = Math.min(Number(entry.fps), 999);
    const fpsText = `${fpsValue} FPS`;
    const summaryText = entry.resolution ? `${entry.resolution} ${label} ${fpsText}` : `${label} ${fpsText}`;
    return {
      fpsText,
      summaryText,
      resolution: entry.resolution || null,
      label
    };
  }
  function getProductGameFpsHighlights(product, limit = 3, excludeGames = []) {
    const blocked = new Set(excludeGames.filter(Boolean));
    const entries = Object.entries((product == null ? void 0 : product.game_fps) || {}).filter(([game, entry]) => !blocked.has(game) && (entry == null ? void 0 : entry.fps)).slice(0, limit).map(([game, entry]) => formatGameFpsEntry({
      fps: entry.fps,
      resolution: entry.resolution,
      label: entry.label || game
    }, game)).filter(Boolean);
    return entries;
  }
  function buildMonthlyPaymentHint(product) {
    const months = Number(product == null ? void 0 : product.installment_months) || 0;
    const monthly = Number(product == null ? void 0 : product.price_monthly) || 0;
    const total = Number(product == null ? void 0 : product.price) || 0;
    if (months > 0 && monthly > 0) {
      return null;
    }
    if (total < 2e5) {
      return null;
    }
    const approx = Math.ceil(total / 24 / 1e4) * 1e4;
    return {
      primary: `24\uAC1C\uC6D4 \uADE0\uB4F1 \uC2DC \uC6D4 \uC57D ${formatPrice(approx)}`,
      disclaimer: "\uCC38\uACE0 \xB7 \uC774\uC790 \uBBF8\uD3EC\uD568"
    };
  }
  function getExpectedFps(product, gameName, fpsData) {
    var _a, _b, _c, _d;
    if (!gameName) return null;
    const productFps = getProductGameFpsEntry(product, gameName);
    if (productFps) {
      return formatGameFpsEntry(productFps, gameName);
    }
    if (!fpsData) return null;
    const gpuKey = ((_a = product == null ? void 0 : product.specs) == null ? void 0 : _a.gpu_key) || ((_b = product == null ? void 0 : product.specs) == null ? void 0 : _b.gpu_short) || ((_c = product == null ? void 0 : product.specs) == null ? void 0 : _c.gpu);
    const gpuFps = matchGpuFps(gpuKey, fpsData);
    if (!gpuFps || !gpuFps[gameName]) return null;
    const resolution = tierToResolution(((_d = product == null ? void 0 : product.categories) == null ? void 0 : _d.tier) || "");
    const fps = gpuFps[gameName][resolution];
    if (!fps) return null;
    const cappedFps = Math.min(fps, 300);
    return {
      fpsText: cappedFps >= 300 ? "\uC57D 300+ FPS" : `\uC57D ${cappedFps} FPS`,
      summaryText: `${resolution} ${gameName} ${cappedFps >= 300 ? "\uC57D 300+ FPS" : `\uC57D ${cappedFps} FPS`}`,
      resolution,
      label: gameName
    };
  }
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
  var KAKAO_CONSULT_CHAT_URL, PRICE_RANGES, BADGE_COLORS;
  var init_utils = __esm({
    "js/utils.js"() {
      KAKAO_CONSULT_CHAT_URL = "https://pf.kakao.com/_sxmjxgT/chat";
      PRICE_RANGES = {
        "100\uB9CC \uC6D0 \uC774\uD558": { min: 0, max: 1e6 },
        "100~200\uB9CC \uC6D0": { min: 1e6, max: 2e6 },
        "200~300\uB9CC \uC6D0": { min: 2e6, max: 3e6 },
        "300\uB9CC \uC6D0 \uC774\uC0C1": { min: 3e6, max: Infinity }
      };
      BADGE_COLORS = {
        green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        red: "bg-red-500/20 text-red-400 border-red-500/30",
        purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        gold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
        white: "bg-slate-300/20 text-slate-300 border-slate-300/30"
      };
    }
  });

  // js/recommendation_reasons.js
  function resolveGameToCanonical(input) {
    if (!input || typeof input !== "string") return input || "";
    const s = String(input).trim();
    for (const [canonical, aliases] of Object.entries(GAME_ALIASES)) {
      if (aliases.some((a) => a.toLowerCase() === s.toLowerCase())) return canonical;
    }
    return s;
  }
  function canonicalizeUsage(input) {
    if (!input) return null;
    const s = String(input).trim().toLowerCase();
    for (const [canonical, aliases] of Object.entries(USAGE_ALIASES)) {
      if (aliases.some(
        (a) => s.includes(String(a).toLowerCase()) || String(a).toLowerCase().includes(s)
      )) {
        return canonical;
      }
    }
    return null;
  }
  function inferUsageFromText(text) {
    const hits = /* @__PURE__ */ new Set();
    const t = String(text || "").toLowerCase();
    for (const [canonical, aliases] of Object.entries(USAGE_ALIASES)) {
      if (aliases.some((a) => t.includes(String(a).toLowerCase()))) {
        hits.add(canonical);
      }
    }
    return hits;
  }
  function getProductUsageTags(product) {
    var _a, _b, _c, _d, _e;
    const tags = /* @__PURE__ */ new Set();
    (((_a = product.categories) == null ? void 0 : _a.usage) || []).forEach((u) => {
      const c = canonicalizeUsage(u);
      if (c) tags.add(c);
    });
    const usageText = [
      product.name || "",
      product.subtitle || "",
      ((_b = product.specs) == null ? void 0 : _b.cpu) || "",
      ((_c = product.specs) == null ? void 0 : _c.gpu) || "",
      ((_d = product.specs) == null ? void 0 : _d.ram) || "",
      ((_e = product.specs) == null ? void 0 : _e.ssd) || ""
    ].join(" ");
    inferUsageFromText(usageText).forEach((u) => tags.add(u));
    return tags;
  }
  function usageSelectionMatches(selectedUsage, product) {
    if (!selectedUsage) return false;
    const tags = getProductUsageTags(product);
    if (tags.has(selectedUsage)) return true;
    const c = canonicalizeUsage(selectedUsage);
    return !!(c && tags.has(c));
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
  function productMatchesPriceRange(product, rangeKey) {
    const range = PRICE_RANGES[rangeKey];
    if (!range || product.price == null) return false;
    return product.price >= range.min && product.price < range.max;
  }
  function productPriceRangeLabelMatch(product, rangeKey) {
    var _a;
    return ((_a = product.categories) == null ? void 0 : _a.price_range) === rangeKey;
  }
  function shortGameTag(game) {
    const map = {
      \uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC: "\uBC30\uADF8",
      \uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC: "\uB864",
      \uB85C\uC2A4\uD2B8\uC544\uD06C: "\uB85C\uC544",
      "\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784": "AAA",
      \uBC1C\uB85C\uB780\uD2B8: "\uBC1C\uB85C",
      \uC624\uBC84\uC6CC\uCE582: "OW2",
      "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC": "\uBAAC\uD5CC",
      \uC544\uC774\uC6282: "\uC544\uC774\uC6282"
    };
    return map[game] || (String(game).length > 7 ? String(game).slice(0, 6) : game);
  }
  function tierShortLabel(tier) {
    if (tier === "\uAC00\uC131\uBE44(FHD)") return "FHD \uD2F0\uC5B4";
    if (tier === "\uD37C\uD3EC\uBA3C\uC2A4(QHD)") return "QHD \uD2F0\uC5B4";
    if (tier === "\uD558\uC774\uC5D4\uB4DC(4K)") return "4K \uD2F0\uC5B4";
    return null;
  }
  function usageShortTag(usage) {
    if (usage === "\uAC8C\uC774\uBC0D") return "\uAC8C\uC774\uBC0D";
    if (usage === "\uC601\uC0C1\uD3B8\uC9D1") return "\uC601\uC0C1\uD3B8\uC9D1";
    if (usage === "AI/\uB525\uB7EC\uB2DD") return "AI";
    if (usage === "\uC0AC\uBB34/\uB514\uC790\uC778") return "\uC0AC\uBB34\xB7\uB514\uC790\uC778";
    if (usage === "3D \uBAA8\uB378\uB9C1") return "3D";
    if (usage === "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D") return "\uBC29\uC1A1";
    return usage ? String(usage).slice(0, 8) : "";
  }
  function userSelectionsFromFilterState(fs) {
    if (!fs) {
      return {
        game: null,
        usage: null,
        priceRange: null,
        tier: null,
        caseColor: null,
        design: null,
        installment: null,
        purpose: null
      };
    }
    return {
      game: typeof fs.game === "string" && fs.game.trim() ? fs.game : null,
      usage: fs.usage || null,
      priceRange: fs.priceRange || null,
      tier: fs.tier || null,
      caseColor: fs.caseColor || null,
      design: null,
      installment: fs.installment != null ? fs.installment : null,
      purpose: null
    };
  }
  function userSelectionsFromWizard(selections) {
    var _a;
    if (!selections) return userSelectionsFromFilterState(null);
    const { purpose, game, budget, design } = selections;
    const usage = PURPOSE_TO_USAGE[purpose] || null;
    const gameCanon = purpose === "gaming" && game ? resolveGameToCanonical(game) : null;
    return {
      game: gameCanon,
      usage,
      priceRange: WIZARD_BUDGET_TO_RANGE[budget] || null,
      tier: null,
      caseColor: design ? (_a = DESIGN_TO_COLOR[design]) != null ? _a : null : null,
      design: design || null,
      installment: null,
      purpose: purpose || null
    };
  }
  function userSelectionsFromGroup(group) {
    if (!group) return userSelectionsFromFilterState(null);
    if (group.key === "installment") {
      return {
        game: null,
        usage: null,
        priceRange: null,
        tier: null,
        caseColor: null,
        design: null,
        installment: Number(group.value),
        purpose: null
      };
    }
    if (group.key === "usage") {
      return {
        game: null,
        usage: String(group.value),
        priceRange: null,
        tier: null,
        caseColor: null,
        design: null,
        installment: null,
        purpose: null
      };
    }
    if (group.key === "bestFor") {
      const val = String(group.value);
      const BESTFOR_MAP = {
        "AI \uACF5\uBD80\uC6A9": { usage: "AI/\uB525\uB7EC\uB2DD", purpose: "ai_study" },
        "\uB85C\uCEEC LLM \uC785\uBB38": { usage: "AI/\uB525\uB7EC\uB2DD", purpose: "local_llm" },
        "QHD \uAC8C\uC774\uBC0D": { usage: "\uAC8C\uC774\uBC0D", tier: "\uD37C\uD3EC\uBA3C\uC2A4(QHD)" },
        "4K \uAC8C\uC774\uBC0D": { usage: "\uAC8C\uC774\uBC0D", tier: "\uD558\uC774\uC5D4\uB4DC(4K)" },
        "\uD654\uC774\uD2B8 \uAC10\uC131": { design: "white", caseColor: "\uD654\uC774\uD2B8" }
      };
      const mapped = BESTFOR_MAP[val] || {};
      return {
        game: null,
        usage: mapped.usage || null,
        priceRange: null,
        tier: mapped.tier || null,
        caseColor: mapped.caseColor || null,
        design: mapped.design || null,
        installment: null,
        purpose: mapped.purpose || null
      };
    }
    return userSelectionsFromFilterState(null);
  }
  function hasStructuredSelection(us) {
    return !!(us.game || us.usage || us.priceRange || us.tier || us.caseColor || us.design || us.installment != null);
  }
  function badgeToReasonTag(product) {
    const raw = product == null ? void 0 : product.badge;
    if (typeof raw !== "string") return null;
    const t = raw.replace(/^\s*✦\s*/u, "").trim();
    if (t.length < 2) return null;
    if (/^[-–—.\s]+$/.test(t)) return null;
    if (t.length > 14) return `${t.slice(0, 13)}\u2026`;
    return t;
  }
  function buildRecommendationReasons(product, userSelections) {
    var _a;
    const us = userSelections || userSelectionsFromFilterState(null);
    const cats = (product == null ? void 0 : product.categories) || {};
    const games = Array.isArray(cats.games) ? cats.games : [];
    const gameCanonSet = new Set(games.map((g) => resolveGameToCanonical(g)));
    const usages = Array.isArray(cats.usage) ? cats.usage : [];
    const productTier = cats.tier || null;
    const usageTags = getProductUsageTags(product);
    const structured = hasStructuredSelection(us);
    const scored = [];
    const badgeTag = badgeToReasonTag(product);
    if (badgeTag) {
      scored.push({ p: 0, tag: badgeTag });
    }
    const selGameCanon = us.game ? resolveGameToCanonical(us.game) : null;
    if (selGameCanon && gameCanonSet.has(selGameCanon)) {
      scored.push({ p: 1, tag: `${shortGameTag(selGameCanon)} \uD0DC\uADF8 \uD3EC\uD568` });
    }
    const usageCanon = us.usage ? canonicalizeUsage(us.usage) || us.usage : null;
    if (usageCanon && usageSelectionMatches(us.usage, product)) {
      if (usageCanon === "\uAC8C\uC774\uBC0D") scored.push({ p: 2, tag: "\uAC8C\uC774\uBC0D \uC6A9\uB3C4 \uBD80\uD569" });
      else if (usageCanon === "\uC601\uC0C1\uD3B8\uC9D1") scored.push({ p: 2, tag: "\uD3B8\uC9D1 \uC6A9\uB3C4 \uBD80\uD569" });
      else if (usageCanon === "AI/\uB525\uB7EC\uB2DD") scored.push({ p: 2, tag: "AI \uC6A9\uB3C4 \uBD80\uD569" });
      else if (usageCanon === "\uC0AC\uBB34/\uB514\uC790\uC778") scored.push({ p: 2, tag: "\uC0AC\uBB34\xB7\uB514\uC790\uC778 \uBD80\uD569" });
      else if (usageCanon === "3D \uBAA8\uB378\uB9C1") scored.push({ p: 2, tag: "3D \uC6A9\uB3C4 \uBD80\uD569" });
      else if (usageCanon === "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D") scored.push({ p: 2, tag: "\uBC29\uC1A1\xB7\uC2A4\uD2B8\uB9AC\uBC0D \uBD80\uD569" });
      else scored.push({ p: 2, tag: "\uC120\uD0DD \uC6A9\uB3C4 \uBD80\uD569" });
    }
    if (us.priceRange) {
      if (productMatchesPriceRange(product, us.priceRange)) {
        scored.push({ p: 3, tag: "\uC608\uC0B0 \uAD6C\uAC04 \uBD80\uD569" });
      } else if (productPriceRangeLabelMatch(product, us.priceRange)) {
        scored.push({ p: 3, tag: "\uAC00\uACA9\uB300 \uD0DC\uADF8 \uC77C\uCE58" });
      }
    }
    if (us.tier && productTier === us.tier) {
      scored.push({ p: 4, tag: "\uD2F0\uC5B4 \uC870\uAC74 \uC77C\uCE58" });
    }
    if (us.design === "rgb" && matchesRgbStyle(product)) {
      scored.push({ p: 5, tag: "RGB \uC2A4\uD399" });
    } else if (us.design === "black" && product.case_color === "\uBE14\uB799") {
      scored.push({ p: 5, tag: "\uBE14\uB799 \uCF00\uC774\uC2A4 \uC77C\uCE58" });
    } else if (us.design === "white" && product.case_color === "\uD654\uC774\uD2B8") {
      scored.push({ p: 5, tag: "\uD654\uC774\uD2B8 \uCF00\uC774\uC2A4 \uC77C\uCE58" });
    } else if (us.caseColor && product.case_color === us.caseColor) {
      scored.push({ p: 5, tag: `${us.caseColor} \uCF00\uC774\uC2A4 \uC77C\uCE58` });
    }
    if (us.installment != null && Number(product.installment_months) === Number(us.installment)) {
      scored.push({ p: 6, tag: `${us.installment}\uAC1C\uC6D4 \uBB34\uC774\uC790` });
    }
    if (structured && product.in_stock === true) {
      scored.push({ p: 7, tag: "\uC7AC\uACE0 \uBCF4\uC720" });
    }
    scored.sort((a, b) => a.p - b.p);
    const meta = [];
    const tl = tierShortLabel(productTier);
    if (tl) meta.push({ p: 10, tag: tl });
    const primaryUsage = [...usageTags].find((u) => u === "\uAC8C\uC774\uBC0D") || [...usageTags].find((u) => u !== "\uAC8C\uC774\uBC0D") || usages[0];
    const uCanon = primaryUsage ? canonicalizeUsage(primaryUsage) || primaryUsage : null;
    if (uCanon === "\uAC8C\uC774\uBC0D") meta.push({ p: 11, tag: "\uAC8C\uC774\uBC0D \uACAC\uC801" });
    else if (uCanon === "\uC601\uC0C1\uD3B8\uC9D1") meta.push({ p: 11, tag: "\uC601\uC0C1 \uC791\uC5C5 \uACAC\uC801" });
    else if (uCanon === "AI/\uB525\uB7EC\uB2DD") meta.push({ p: 11, tag: "AI \uC791\uC5C5 \uACAC\uC801" });
    else if (uCanon === "\uC0AC\uBB34/\uB514\uC790\uC778") meta.push({ p: 11, tag: "\uC0AC\uBB34\xB7\uB514\uC790\uC778 \uACAC\uC801" });
    else if (uCanon === "3D \uBAA8\uB378\uB9C1") meta.push({ p: 11, tag: "3D \uC791\uC5C5 \uACAC\uC801" });
    else if (uCanon === "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D") meta.push({ p: 11, tag: "\uBC29\uC1A1\xB7\uC2A4\uD2B8\uB9AC\uBC0D \uACAC\uC801" });
    meta.sort((a, b) => a.p - b.p);
    const tags = [];
    const seen = /* @__PURE__ */ new Set();
    for (const row of [...scored, ...meta]) {
      if (tags.length >= 2) break;
      if (!row.tag || seen.has(row.tag)) continue;
      seen.add(row.tag);
      tags.push(row.tag);
    }
    const v2Bft = ((_a = product.v2) == null ? void 0 : _a.best_for_tags) || [];
    if (tags.length < 2 && v2Bft.length > 0) {
      for (const bft of v2Bft) {
        if (tags.length >= 2) break;
        if (!seen.has(bft)) {
          seen.add(bft);
          tags.push(bft);
        }
      }
    }
    if (tags.length === 0) {
      if (tl) tags.push(tl);
      else if (product.case_color) tags.push(`${product.case_color} \uCF00\uC774\uC2A4`);
      if (tags.length === 0 && product.in_stock === true) tags.push("\uC7AC\uACE0 \uBCF4\uC720");
    }
    if (tags.length === 0) {
      return { reasonTags: [], reasonSummary: "" };
    }
    const reasonTags = tags.slice(0, 2);
    const summaryParts = [];
    if (selGameCanon && gameCanonSet.has(selGameCanon)) {
      summaryParts.push(`${shortGameTag(selGameCanon)} \uAE30\uC900`);
    }
    if (usageCanon && usageSelectionMatches(us.usage, product)) {
      summaryParts.push(usageShortTag(usageCanon));
    }
    if (us.priceRange && (productMatchesPriceRange(product, us.priceRange) || productPriceRangeLabelMatch(product, us.priceRange))) {
      summaryParts.push(us.priceRange.replace(/\s/g, ""));
    }
    if (us.tier && productTier === us.tier) summaryParts.push(tierShortLabel(us.tier) || us.tier);
    if (us.design === "white" && product.case_color === "\uD654\uC774\uD2B8" || us.design === "black" && product.case_color === "\uBE14\uB799" || us.design === "rgb" && matchesRgbStyle(product)) {
      if (us.design === "rgb") summaryParts.push("RGB");
      else summaryParts.push(`${product.case_color} \uCF00\uC774\uC2A4`);
    }
    let reasonSummary = "";
    if (summaryParts.length > 0) {
      reasonSummary = `${summaryParts.join("\xB7")}\uC5D0 \uB9DE\uB294 \uAD6C\uC131`;
    } else if (tl || uCanon) {
      const tail = [tl, uCanon ? usageShortTag(uCanon) : ""].filter(Boolean).join("\xB7");
      reasonSummary = tail ? `${tail} \uC911\uC2EC \uACAC\uC801` : "";
    }
    if (reasonSummary.length > 40) {
      reasonSummary = `${reasonSummary.slice(0, 37)}\u2026`;
    }
    return { reasonTags, reasonSummary };
  }
  var GAME_ALIASES, USAGE_ALIASES, PURPOSE_TO_USAGE, WIZARD_BUDGET_TO_RANGE, DESIGN_TO_COLOR;
  var init_recommendation_reasons = __esm({
    "js/recommendation_reasons.js"() {
      init_utils();
      GAME_ALIASES = {
        "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC": ["\uBAAC\uD5CC", "\uBAAC\uC2A4\uD130\uD5CC\uD130", "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC", "MH", "Wilds", "\uBAAC\uC2A4\uD130\uD5CC\uD130\uC640\uC77C\uB4DC"],
        "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC": ["\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC", "\uB864", "LOL"],
        "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC": ["\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", "\uBC30\uADF8", "PUBG"],
        "\uB85C\uC2A4\uD2B8\uC544\uD06C": ["\uB85C\uC2A4\uD2B8\uC544\uD06C", "\uB85C\uC544"],
        "\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784": ["\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784", "\uC2A4\uD300 AAA", "AAA"],
        "\uBC1C\uB85C\uB780\uD2B8": ["\uBC1C\uB85C\uB780\uD2B8", "\uBC1C\uB85C"],
        "\uC624\uBC84\uC6CC\uCE582": ["\uC624\uBC84\uC6CC\uCE582", "\uC624\uBC84\uC6CC\uCE58"]
      };
      USAGE_ALIASES = {
        \uAC8C\uC774\uBC0D: ["\uAC8C\uC774\uBC0D"],
        "\uC0AC\uBB34/\uB514\uC790\uC778": ["\uC0AC\uBB34/\uB514\uC790\uC778", "\uC0AC\uBB34\uC6A9", "\uC0AC\uBB34", "\uC624\uD53C\uC2A4", "\uC5C5\uBB34"],
        \uC601\uC0C1\uD3B8\uC9D1: ["\uC601\uC0C1\uD3B8\uC9D1", "\uC601\uC0C1 \uD3B8\uC9D1", "\uD504\uB9AC\uBBF8\uC5B4", "\uC560\uD504\uD130\uC774\uD399\uD2B8", "\uC5D0\uD399", "\uD3B8\uC9D1"],
        "3D \uBAA8\uB378\uB9C1": ["3d \uBAA8\uB378\uB9C1", "3d/\uBAA8\uB378\uB9C1", "3d", "\uBAA8\uB378\uB9C1", "cad", "\uBE14\uB80C\uB354", "\uC2A4\uCF00\uCE58\uC5C5", "\uB80C\uB354\uB9C1", "maya"],
        "AI/\uB525\uB7EC\uB2DD": ["ai/\uB525\uB7EC\uB2DD", "ai", "\uB525\uB7EC\uB2DD", "\uBA38\uC2E0\uB7EC\uB2DD", "\uC0DD\uC131\uD615"],
        "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D": ["\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D", "\uBC29\uC1A1\xB7\uC2A4\uD2B8\uB9AC\uBC0D", "\uBC29\uC1A1", "\uC2A4\uD2B8\uB9AC\uBC0D", "\uB3D9\uC2DC\uC1A1\uCD9C", "obs", "\uC1A1\uCD9C"]
      };
      PURPOSE_TO_USAGE = {
        gaming: "\uAC8C\uC774\uBC0D",
        office: "\uC0AC\uBB34/\uB514\uC790\uC778",
        editing: "\uC601\uC0C1\uD3B8\uC9D1",
        "3d": "3D \uBAA8\uB378\uB9C1",
        ai: "AI/\uB525\uB7EC\uB2DD",
        ai_study: "AI/\uB525\uB7EC\uB2DD",
        local_llm: "AI/\uB525\uB7EC\uB2DD",
        streaming: "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D"
      };
      WIZARD_BUDGET_TO_RANGE = {
        budget_under100: "100\uB9CC \uC6D0 \uC774\uD558",
        budget_100_200: "100~200\uB9CC \uC6D0",
        budget_200_300: "200~300\uB9CC \uC6D0",
        budget_over300: "300\uB9CC \uC6D0 \uC774\uC0C1"
      };
      DESIGN_TO_COLOR = {
        black: "\uBE14\uB799",
        white: "\uD654\uC774\uD2B8",
        rgb: null
      };
    }
  });

  // js/filter.js
  function canonicalizeUsage2(input) {
    if (!input) return null;
    const s = String(input).trim().toLowerCase();
    for (const [canonical, aliases] of Object.entries(USAGE_ALIASES2)) {
      if (aliases.some((a) => s.includes(String(a).toLowerCase()) || String(a).toLowerCase().includes(s))) {
        return canonical;
      }
    }
    return null;
  }
  function inferUsageFromText2(text) {
    const hits = /* @__PURE__ */ new Set();
    const t = String(text || "").toLowerCase();
    for (const [canonical, aliases] of Object.entries(USAGE_ALIASES2)) {
      if (aliases.some((a) => t.includes(String(a).toLowerCase()))) {
        hits.add(canonical);
      }
    }
    return hits;
  }
  function resolveGameToCanonical2(input) {
    if (!input || typeof input !== "string") return input || "";
    const s = String(input).trim();
    for (const [canonical, aliases] of Object.entries(GAME_ALIASES2)) {
      if (aliases.some((a) => a.toLowerCase() === s.toLowerCase())) return canonical;
    }
    return s;
  }
  function minimumCredibleTotalWon(product) {
    var _a, _b, _c, _d;
    const name = (product.name || "").toUpperCase();
    const gpu = [
      (_a = product.components) == null ? void 0 : _a.gpu,
      (_b = product.specs) == null ? void 0 : _b.gpu_short,
      (_c = product.specs) == null ? void 0 : _c.gpu_key,
      (_d = product.specs) == null ? void 0 : _d.gpu
    ].filter(Boolean).join(" ").toUpperCase();
    const combined = `${name} ${gpu}`;
    if (/RTX\s*5090|9950X3D/.test(combined)) return 4e6;
    if (/RTX\s*5080/.test(combined)) return 3e6;
    if (/RTX\s*5070|9800X3D|RX\s*9070/.test(combined)) return 2e6;
    return 0;
  }
  function effectivePriceForBudgetRange(product) {
    var _a, _b, _c, _d, _e, _f;
    const months = product.installment_months | 0;
    const monthly = product.price_monthly | 0;
    if (months <= 0) {
      if (product.price_crawl_error === true) return null;
      const p2 = (_a = product.price) != null ? _a : 0;
      if (p2 <= 0) return null;
      const mc = minimumCredibleTotalWon(product);
      if (mc > 0 && p2 < mc) return mc;
      return p2;
    }
    if (monthly <= 0) {
      const tierFloor2 = (_c = TIER_INSTALLMENT_BUDGET_FLOOR[(_b = product.categories) == null ? void 0 : _b.tier]) != null ? _c : 0;
      return tierFloor2 > 0 ? tierFloor2 : null;
    }
    const implied = monthly * months;
    if (implied < MIN_IMPLIED_INSTALLMENT_FOR_BAND) {
      return null;
    }
    const p = (_d = product.price) != null ? _d : 0;
    let eff = p > implied * 0.5 ? p : implied;
    eff = Math.max(eff, implied);
    const tierFloor = (_f = TIER_INSTALLMENT_BUDGET_FLOOR[(_e = product.categories) == null ? void 0 : _e.tier]) != null ? _f : 0;
    const mcFloor = minimumCredibleTotalWon(product);
    eff = Math.max(eff, tierFloor, mcFloor);
    return eff;
  }
  function isInStock(product) {
    if (!product) return false;
    if (product.price_crawl_error === true) return false;
    if (product.in_stock !== true) return false;
    if (SOLD_OUT_PRODUCT_IDS.includes(product.id)) return false;
    if (product.price > 0 && product.price < MIN_PC_PRICE && !product.installment_months) return false;
    if (product.v2 && product.v2.recommendable === false) return false;
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
    var _a, _b, _c, _d, _e, _f, _g;
    const tags = {
      games: /* @__PURE__ */ new Set(),
      usage: /* @__PURE__ */ new Set(),
      design: null,
      longNoInterest: false,
      longNoInterest24: false,
      longNoInterest36: false
    };
    (((_a = product.categories) == null ? void 0 : _a.usage) || []).forEach((u) => {
      const canonical = canonicalizeUsage2(u);
      if (canonical) tags.usage.add(canonical);
    });
    const usageText = [
      product.name || "",
      product.subtitle || "",
      ((_b = product.specs) == null ? void 0 : _b.cpu) || "",
      ((_c = product.specs) == null ? void 0 : _c.gpu) || "",
      ((_d = product.specs) == null ? void 0 : _d.ram) || "",
      ((_e = product.specs) == null ? void 0 : _e.ssd) || ""
    ].join(" ");
    inferUsageFromText2(usageText).forEach((u) => tags.usage.add(u));
    (((_f = product.categories) == null ? void 0 : _f.games) || []).forEach((g) => {
      tags.games.add(resolveGameToCanonical2(g));
    });
    const fallbackText = `${product.name || ""} ${product.subtitle || ""}`.toLowerCase();
    for (const [canonical, aliases] of Object.entries(SAFE_GAME_FALLBACK_ALIASES)) {
      if (aliases.some((a) => fallbackText.includes(String(a).toLowerCase()))) {
        tags.games.add(canonical);
      }
    }
    const caseColor = product.case_color;
    const caseName = (((_g = product.specs) == null ? void 0 : _g.case) || "").trim();
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
      var _a, _b, _c, _d, _e, _f, _g;
      if (!isInStock(product)) return false;
      if (!isReasonableInstallmentPrice(product)) return false;
      const tags = normalizeProduct(product);
      if ((filters.game || filters.usage === "\uAC8C\uC774\uBC0D") && isIntegratedGpu(product)) return false;
      if (filters.game) {
        const canon = resolveGameToCanonical2(filters.game);
        if (!tags.games.has(canon)) return false;
      }
      if (filters.tier && product.categories.tier !== filters.tier) return false;
      if (filters.priceRange) {
        const range = PRICE_RANGES[filters.priceRange];
        if (range) {
          const eff = effectivePriceForBudgetRange(product);
          if (eff === null) return false;
          if (eff < range.min || eff >= range.max) return false;
        }
      }
      if (filters.usage && !tags.usage.has(filters.usage)) return false;
      if (filters.installment === "nointerest") {
        if (!tags.longNoInterest) return false;
      } else if (typeof filters.installment === "number") {
        if (filters.installment === 24 && !tags.longNoInterest24) return false;
        if (filters.installment === 36 && !tags.longNoInterest36) return false;
      }
      if (filters.caseColor && tags.design !== filters.caseColor) return false;
      if (filters.bestFor && ((_a = product.v2) == null ? void 0 : _a.best_for_tags)) {
        if (!product.v2.best_for_tags.some((t) => t === filters.bestFor)) return false;
      } else if (filters.bestFor && !product.v2) {
        return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchTarget = [
          product.name,
          ((_b = product.specs) == null ? void 0 : _b.cpu) || "",
          ((_c = product.specs) == null ? void 0 : _c.gpu) || "",
          ((_d = product.specs) == null ? void 0 : _d.ram) || "",
          ((_e = product.v2) == null ? void 0 : _e.summary_reason) || "",
          ...((_f = product.v2) == null ? void 0 : _f.best_for_tags) || [],
          ...((_g = product.v2) == null ? void 0 : _g.selling_points) || []
        ].join(" ").toLowerCase();
        if (!searchTarget.includes(q)) return false;
      }
      return true;
    });
  }
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
    const usage = PURPOSE_TO_USAGE2[purpose] || null;
    const gameCanon = purpose === "gaming" && game ? resolveGameToCanonical2(game) : null;
    const filters = {
      game: purpose === "gaming" ? gameCanon : null,
      tier: null,
      priceRange: budgetToRange[budget] || null,
      usage,
      installment: installment != null ? installment : null,
      caseColor: design ? (_a = designToColor[design]) != null ? _a : null : null,
      search: ""
    };
    const isImpossibleBudget = purpose === "gaming" && game && HIGH_END_GAMES.includes(resolveGameToCanonical2(game)) && budget === "budget_under100";
    let filtered = filterProducts(products, filters);
    let fallbackNotice = null;
    if (filtered.length === 0 && (filters.installment === 24 || filters.installment === 36)) {
      const relaxedInstallment = { ...filters, installment: null };
      filtered = filterProducts(products, relaxedInstallment);
      if (design === "rgb") {
        filtered = filtered.filter(matchesRgbStyle2);
      }
      if (filtered.length > 0) {
        fallbackNotice = "installment_relaxed";
      }
    }
    if (design === "rgb") {
      filtered = filtered.filter(matchesRgbStyle2);
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
        filtered = filtered.filter(matchesRgbStyle2);
      }
    }
    if (filtered.length === 0 && usage) {
      const relaxed = { ...filters, usage: null, priceRange: budgetToRange[budget] || null };
      filtered = filterProducts(products, relaxed);
      if (design === "rgb") {
        filtered = filtered.filter(matchesRgbStyle2);
      }
    }
    const withScore = filtered.map((p) => {
      const { score, reasons } = calcRelevanceScoreWithReasons(p, wizardSelections, filters);
      return { product: p, score, reasons: reasons || [] };
    });
    withScore.sort((a, b) => b.score - a.score);
    const top = selectWithDiversity(withScore, 6);
    const recommended = top.map((s) => s.product);
    const wizardUserSel = userSelectionsFromWizard(wizardSelections);
    const recommendationReasonsById = /* @__PURE__ */ new Map();
    for (const s of top) {
      recommendationReasonsById.set(
        String(s.product.id),
        buildRecommendationReasons(s.product, wizardUserSel)
      );
    }
    const result = { recommended, recommendationReasonsById };
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
    var _a, _b, _c, _d;
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
    if (design === "rgb" && matchesRgbStyle2(product)) {
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
    const v2 = product.v2;
    if (v2) {
      if (purpose === "ai" || purpose === "ai_study") {
        if (v2.ai_ready) {
          score += 15;
          reasons.push("v2:ai_ready");
        }
        if (v2.llm_entry_ready) {
          score += 10;
          reasons.push("v2:llm_entry");
        }
        if (v2.local_ai_grade >= 2) {
          score += 8;
          reasons.push("v2:local_ai_mid");
        }
        if (v2.local_ai_grade >= 3) {
          score += 10;
          reasons.push("v2:local_ai_high");
        }
        if ((_b = v2.gpu_tensor_class) == null ? void 0 : _b.startsWith("nvidia")) {
          score += 8;
          reasons.push("v2:nvidia_tensor");
        }
      }
      if (purpose === "local_llm") {
        if (v2.llm_entry_ready) {
          score += 20;
          reasons.push("v2:llm_ready");
        }
        if (v2.local_ai_grade >= 3) {
          score += 15;
          reasons.push("v2:local_ai_high");
        }
        if (v2.local_ai_grade >= 4) {
          score += 10;
          reasons.push("v2:local_ai_pro");
        }
        if (v2.gpu_vram_gb >= 16) {
          score += 15;
          reasons.push("v2:vram16+");
        } else if (v2.gpu_vram_gb >= 12) {
          score += 10;
          reasons.push("v2:vram12+");
        } else if (v2.gpu_vram_gb >= 8) {
          score += 5;
          reasons.push("v2:vram8+");
        }
        if ((_c = v2.gpu_tensor_class) == null ? void 0 : _c.startsWith("amd")) {
          score -= 10;
          reasons.push("v2:amd_limited");
        }
        if ((_d = v2.gpu_tensor_class) == null ? void 0 : _d.startsWith("intel_arc")) {
          score -= 8;
          reasons.push("v2:intel_arc_limited");
        }
      }
      if (purpose === "editing") {
        if (v2.video_edit_grade === "standard") {
          score += 10;
          reasons.push("v2:edit_standard");
        } else if (v2.video_edit_grade === "limited") {
          score -= 5;
          reasons.push("v2:edit_limited");
        }
      }
      if (purpose === "gaming") {
        if (v2.gaming_grade_qhd === "strong") {
          score += 8;
          reasons.push("v2:qhd_strong");
        }
        if (v2.gaming_grade_4k === "optimal") {
          score += 8;
          reasons.push("v2:4k_optimal");
        }
      }
      if (v2.frontend_rank_score) {
        score += Math.round(v2.frontend_rank_score / 10);
        reasons.push(`v2:rank_${v2.frontend_rank_score}`);
      }
    }
    return { score, reasons };
  }
  function matchesRgbStyle2(product) {
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
  var GAME_ALIASES2, SAFE_GAME_FALLBACK_ALIASES, USAGE_ALIASES2, filterState, MIN_INSTALLMENT_TOTAL, MIN_INSTALLMENT_MONTHLY, MIN_IMPLIED_INSTALLMENT_FOR_BAND, TIER_INSTALLMENT_BUDGET_FLOOR, HIGH_END_GAMES, SOLD_OUT_PRODUCT_IDS, MIN_PC_PRICE, NON_GAMING_PURPOSES, PURPOSE_TO_USAGE2;
  var init_filter = __esm({
    "js/filter.js"() {
      init_utils();
      init_recommendation_reasons();
      GAME_ALIASES2 = {
        "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC": ["\uBAAC\uD5CC", "\uBAAC\uC2A4\uD130\uD5CC\uD130", "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC", "MH", "Wilds", "\uBAAC\uC2A4\uD130\uD5CC\uD130\uC640\uC77C\uB4DC"],
        "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC": ["\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC", "\uB864", "LOL"],
        "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC": ["\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", "\uBC30\uADF8", "PUBG"],
        "\uB85C\uC2A4\uD2B8\uC544\uD06C": ["\uB85C\uC2A4\uD2B8\uC544\uD06C", "\uB85C\uC544"],
        "\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784": ["\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784", "\uC2A4\uD300 AAA", "AAA"],
        "\uBC1C\uB85C\uB780\uD2B8": ["\uBC1C\uB85C\uB780\uD2B8", "\uBC1C\uB85C"],
        "\uC624\uBC84\uC6CC\uCE582": ["\uC624\uBC84\uC6CC\uCE582", "\uC624\uBC84\uC6CC\uCE58"]
      };
      SAFE_GAME_FALLBACK_ALIASES = {
        "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC": ["\uBAAC\uD5CC", "\uBAAC\uC2A4\uD130\uD5CC\uD130", "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC", "\uBAAC\uC2A4\uD130\uD5CC\uD130\uC640\uC77C\uB4DC", "wilds", "\uC640\uC77C\uC988"],
        "\uC544\uC774\uC6282": ["\uC544\uC774\uC6282", "\uC544\uC774\uC628 2"],
        "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC": ["\uBC30\uADF8", "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC"],
        "\uB85C\uC2A4\uD2B8\uC544\uD06C": ["\uB85C\uC544", "\uB85C\uC2A4\uD2B8\uC544\uD06C"],
        "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC": ["\uB864", "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC"],
        "\uBC1C\uB85C\uB780\uD2B8": ["\uBC1C\uB85C", "\uBC1C\uB85C\uB780\uD2B8"],
        "\uC624\uBC84\uC6CC\uCE582": ["\uC624\uBC84\uC6CC\uCE582", "\uC624\uBC84\uC6CC\uCE58"]
      };
      USAGE_ALIASES2 = {
        "\uAC8C\uC774\uBC0D": ["\uAC8C\uC774\uBC0D"],
        "\uC0AC\uBB34/\uB514\uC790\uC778": ["\uC0AC\uBB34/\uB514\uC790\uC778", "\uC0AC\uBB34\uC6A9", "\uC0AC\uBB34", "\uC624\uD53C\uC2A4", "\uC5C5\uBB34"],
        "\uC601\uC0C1\uD3B8\uC9D1": ["\uC601\uC0C1\uD3B8\uC9D1", "\uC601\uC0C1 \uD3B8\uC9D1", "\uD504\uB9AC\uBBF8\uC5B4", "\uC560\uD504\uD130\uC774\uD399\uD2B8", "\uC5D0\uD399", "\uD3B8\uC9D1"],
        "3D \uBAA8\uB378\uB9C1": ["3d \uBAA8\uB378\uB9C1", "3d/\uBAA8\uB378\uB9C1", "3d", "\uBAA8\uB378\uB9C1", "cad", "\uBE14\uB80C\uB354", "\uC2A4\uCF00\uCE58\uC5C5", "\uB80C\uB354\uB9C1", "maya"],
        "AI/\uB525\uB7EC\uB2DD": ["ai/\uB525\uB7EC\uB2DD", "ai", "\uB525\uB7EC\uB2DD", "\uBA38\uC2E0\uB7EC\uB2DD", "\uC0DD\uC131\uD615"],
        "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D": ["\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D", "\uBC29\uC1A1\xB7\uC2A4\uD2B8\uB9AC\uBC0D", "\uBC29\uC1A1", "\uC2A4\uD2B8\uB9AC\uBC0D", "\uB3D9\uC2DC\uC1A1\uCD9C", "obs", "\uC1A1\uCD9C"]
      };
      filterState = {
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
        bestFor: null,
        // "AI 공부용" | "로컬 LLM 입문" | "QHD 게이밍" | ...
        search: ""
      };
      MIN_INSTALLMENT_TOTAL = 8e5;
      MIN_INSTALLMENT_MONTHLY = 3e4;
      MIN_IMPLIED_INSTALLMENT_FOR_BAND = 5e5;
      TIER_INSTALLMENT_BUDGET_FLOOR = {
        "\uD558\uC774\uC5D4\uB4DC(4K)": 2e6
      };
      HIGH_END_GAMES = ["\uB85C\uC2A4\uD2B8\uC544\uD06C", "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", "\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784", "\uC624\uBC84\uC6CC\uCE582"];
      SOLD_OUT_PRODUCT_IDS = ["2741770843"];
      MIN_PC_PRICE = 5e5;
      NON_GAMING_PURPOSES = ["office", "editing", "3d", "ai", "streaming", "ai_study", "local_llm"];
      PURPOSE_TO_USAGE2 = {
        gaming: "\uAC8C\uC774\uBC0D",
        office: "\uC0AC\uBB34/\uB514\uC790\uC778",
        editing: "\uC601\uC0C1\uD3B8\uC9D1",
        "3d": "3D \uBAA8\uB378\uB9C1",
        ai: "AI/\uB525\uB7EC\uB2DD",
        ai_study: "AI/\uB525\uB7EC\uB2DD",
        local_llm: "AI/\uB525\uB7EC\uB2DD",
        streaming: "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D"
      };
    }
  });

  // js/card-text-generator.js
  function groupToSectionKey(groupKey, groupValue) {
    return GROUP_TO_SECTION[`${groupKey}:${groupValue}`] || (groupKey === "installment" ? "installment" : "default");
  }
  function filterToSectionKey(filterState2) {
    if (!filterState2) return "default";
    if (filterState2.bestFor) {
      const m = GROUP_TO_SECTION[`bestFor:${filterState2.bestFor}`];
      if (m) return m;
    }
    if (filterState2.game) return "gaming";
    if (filterState2.usage) {
      const m = GROUP_TO_SECTION[`usage:${filterState2.usage}`];
      if (m) return m;
    }
    if (filterState2.caseColor === "\uD654\uC774\uD2B8") return "white";
    return "default";
  }
  function sl(gb) {
    if (!gb || gb <= 0) return "";
    return gb >= 1024 ? `${Math.round(gb / 1024)}TB` : `${gb}GB`;
  }
  function gpuTier(gpu) {
    if (!gpu) return "entry";
    if (/5090|6000/i.test(gpu)) return "flagship";
    if (/5080|4090/i.test(gpu)) return "high";
    if (/5070\s*Ti|4080/i.test(gpu)) return "upper";
    if (/5070(?!\s*Ti)|4070\s*Ti/i.test(gpu)) return "mid_high";
    if (/5060\s*Ti|4070(?!\s*Ti)|9070\s*XT/i.test(gpu)) return "mid";
    if (/5060(?!\s*Ti)|9060|4060/i.test(gpu)) return "entry_mid";
    return "entry";
  }
  function priceBand(product) {
    const p = product.price || 0;
    if (p >= 4e6) return "premium";
    if (p >= 3e6) return "high";
    if (p >= 2e6) return "mid";
    if (p >= 15e5) return "value";
    return "budget";
  }
  function priceLabel(product) {
    const m = Math.round((product.price || 0) / 1e4);
    if (m >= 100) return `${Math.floor(m / 50) * 50}\uB9CC \uC6D0\uB300`;
    return `${m}\uB9CC \uC6D0\uB300`;
  }
  function extract(v2, product) {
    var _a, _b;
    return {
      gpu: v2.gpu_norm || ((_a = product.specs) == null ? void 0 : _a.gpu_short) || "",
      cpu: v2.cpu_norm || ((_b = product.specs) == null ? void 0 : _b.cpu_short) || "",
      vram: v2.gpu_vram_gb || 0,
      ram: v2.ram_gb || 0,
      ssd: v2.ssd_total_gb || 0,
      wifi: !!v2.wifi_support,
      color: v2.case_color || product.case_color || "",
      qhd: v2.gaming_grade_qhd || "",
      g4k: v2.gaming_grade_4k || "",
      fhd: v2.gaming_grade_fhd || "",
      vidEd: v2.video_edit_grade || "",
      stream: v2.streaming_grade || "",
      model: v2.modeling_grade || "",
      aiGrade: v2.local_ai_grade || 0,
      tensor: v2.gpu_tensor_class || "",
      tier: gpuTier(v2.gpu_norm || ""),
      pos: priceBand(product),
      ssdLabel: sl(v2.ssd_total_gb),
      priceLabel: priceLabel(product)
    };
  }
  function suffix(d, usedAxes) {
    const extras = [];
    if (!usedAxes.has("color") && d.color === "white") extras.push("\uD654\uC774\uD2B8 \uAD6C\uC131");
    else if (!usedAxes.has("color") && d.color === "other") extras.push("\uD2B9\uBCC4 \uCEEC\uB7EC");
    if (!usedAxes.has("cpu") && d.cpu) extras.push(d.cpu);
    if (!usedAxes.has("wifi") && d.wifi) extras.push("Wi-Fi");
    if (!usedAxes.has("ssd") && d.ssd >= 2048) extras.push(`${sl(d.ssd)} \uB300\uC6A9\uB7C9`);
    else if (!usedAxes.has("ssd") && d.ssd >= 1024) extras.push(`${sl(d.ssd)} \uC800\uC7A5`);
    else if (!usedAxes.has("ssd") && d.ssd >= 512) extras.push(`${d.ssd}GB SSD`);
    if (!usedAxes.has("ram") && d.ram >= 64) extras.push(`${d.ram}GB \uB300\uC6A9\uB7C9`);
    if (!usedAxes.has("price") && d.priceLabel) extras.push(d.priceLabel);
    if (extras.length === 0) return "";
    return " \u2014 " + extras.slice(0, 3).join(" \xB7 ");
  }
  function gamingSummary(d, product) {
    const used = /* @__PURE__ */ new Set(["gpu", "vram"]);
    let base;
    if (d.tier === "flagship" || d.tier === "high") {
      if (d.g4k === "optimal") {
        used.add("ram");
        base = `${d.gpu} ${d.vram}GB\uB85C 4K \uC6B8\uD2B8\uB77C \uC138\uD305 \uCF8C\uC801, ${d.ram}GB \uBA54\uBAA8\uB9AC\uB85C \uAC8C\uC784+\uC791\uC5C5 \uBCD1\uD589`;
      } else {
        base = `${d.gpu} ${d.vram}GB\uB85C QHD~4K \uACE0\uC635\uC158 \uAC8C\uC774\uBC0D \uB300\uC751, \uD558\uC774\uC5D4\uB4DC \uBE4C\uB4DC`;
      }
    } else if (d.tier === "upper") {
      if (d.qhd === "strong") {
        used.add("ram");
        base = `${d.gpu} ${d.vram}GB VRAM\uC73C\uB85C QHD \uCD5C\uACE0 \uC635\uC158 144Hz \uC548\uC815, ${d.ram}GB \uAD6C\uC131`;
      } else {
        base = `${d.gpu} ${d.vram}GB\uB85C QHD \uACE0\uD504\uB808\uC784 \uAC8C\uC774\uBC0D\uC5D0 \uCD5C\uC801\uD654`;
      }
    } else if (d.tier === "mid_high" || d.tier === "mid") {
      if (d.pos === "value" || d.pos === "budget") {
        used.add("price");
        base = `${d.gpu} ${d.vram}GB\uB85C QHD \uC911\uC635\uC158 \uAC8C\uC774\uBC0D \uAC00\uC131\uBE44 \uAD6C\uC131, FHD \uACE0\uD504\uB808\uC784`;
      } else {
        used.add("ram");
        base = `${d.gpu} ${d.vram}GB\uB85C QHD \uBC38\uB7F0\uC2A4 \uAC8C\uC774\uBC0D, ${d.ram}GB \uBA54\uBAA8\uB9AC`;
      }
    } else {
      if (d.pos === "budget") {
        used.add("price");
        base = `${d.gpu}\uB85C FHD \uAC8C\uC774\uBC0D \uC785\uBB38 \uAC00\uC131\uBE44 \uAD6C\uC131`;
      } else {
        base = `${d.gpu} ${d.vram}GB\uB85C FHD \uACE0\uD504\uB808\uC784 \uAC8C\uC774\uBC0D, QHD \uC124\uC815 \uC870\uC815 \uAC00\uB2A5`;
      }
    }
    return base + suffix(d, used);
  }
  function qhdGamingSummary(d) {
    const used = /* @__PURE__ */ new Set(["gpu", "vram"]);
    let base;
    if (d.qhd === "strong") {
      used.add("ssd");
      base = `${d.gpu} ${d.vram}GB\uB85C QHD \uCD5C\uACE0 \uC635\uC158 \uC548\uC815 \uD504\uB808\uC784, ${d.ssdLabel || "1TB"} AAA \uB2E4\uC218 \uC124\uCE58`;
    } else if (d.qhd === "good") {
      used.add("ram");
      base = `${d.gpu} ${d.vram}GB \uAE30\uBC18 QHD \uC911~\uACE0\uC635\uC158 \uCF8C\uC801, ${d.ram}GB \uBA40\uD2F0\uD0DC\uC2A4\uD0B9 \uC5EC\uC720`;
    } else {
      base = `${d.gpu}\uB85C QHD \uC785\uBB38\uAE09 \uAC8C\uC774\uBC0D, \uC124\uC815 \uCD5C\uC801\uD654 \uC2DC 60fps \uBAA9\uD45C`;
    }
    return base + suffix(d, used);
  }
  function fourKGamingSummary(d) {
    const used = /* @__PURE__ */ new Set(["gpu", "vram"]);
    let base;
    if (d.g4k === "optimal") {
      used.add("ram");
      base = `${d.gpu} ${d.vram}GB\uB85C 4K \uC6B8\uD2B8\uB77C 60fps \uC774\uC0C1 \uC548\uC815, ${d.ram}GB RAM \uBC30\uACBD \uC791\uC5C5 \uBCD1\uD589`;
    } else if (d.g4k === "possible") {
      base = `${d.gpu} ${d.vram}GB\uB85C 4K \uC911\uC635\uC158 \uB3C4\uC804 \uAC00\uB2A5, QHD \uACE0\uD504\uB808\uC784 \uD655\uBCF4`;
    } else {
      base = `${d.gpu} ${d.vram}GB \uAE30\uBC18 4K \uC800\uC635\uC158 \uCCB4\uD5D8, QHD \uC911\uC2EC \uCD94\uCC9C`;
    }
    return base + suffix(d, used);
  }
  function aiStudySummary(d) {
    const used = /* @__PURE__ */ new Set(["gpu", "vram"]);
    let base;
    if (d.aiGrade >= 4) {
      used.add("ram");
      base = `${d.gpu} ${d.vram}GB VRAM + ${d.ram}GB RAM\uC73C\uB85C \uC911\uB300\uD615 \uBAA8\uB378 \uD559\uC2B5\xB7\uCD94\uB860, \uC804\uBB38 AI \uD658\uACBD`;
    } else if (d.aiGrade >= 3) {
      base = `${d.gpu} ${d.vram}GB VRAM\uACFC \uD150\uC11C\uCF54\uC5B4\uB85C Stable Diffusion\xB7\uC911\uADDC\uBAA8 \uD559\uC2B5 \uAC00\uB2A5`;
    } else if (d.aiGrade >= 2) {
      base = `${d.gpu} ${d.vram}GB\uB85C CUDA \uD559\uC2B5\uACFC \uC18C\uADDC\uBAA8 \uB525\uB7EC\uB2DD \uC801\uD569, AI \uC785\uBB38 \uCD94\uCC9C`;
    } else if (d.tensor.startsWith("nvidia")) {
      base = `${d.gpu} ${d.vram}GB + CUDA \uCF54\uC5B4\uB85C \uB525\uB7EC\uB2DD \uCCAB \uAC78\uC74C, PyTorch\xB7TensorFlow \uD559\uC2B5\uC6A9`;
    } else if (d.tensor.startsWith("amd")) {
      base = `${d.gpu} ${d.vram}GB \uAE30\uBC18 ROCm \uD65C\uC6A9 \uAC00\uB2A5, AMD \uC0DD\uD0DC\uACC4 AI \uC785\uBB38`;
    } else {
      base = `${d.gpu} ${d.vram}GB\uB85C \uAE30\uCD08 AI \uD559\uC2B5 \uAC00\uB2A5`;
    }
    return base + suffix(d, used);
  }
  function localLlmSummary(d) {
    const used = /* @__PURE__ */ new Set(["gpu", "vram"]);
    let base;
    if (d.aiGrade >= 5) {
      used.add("ram");
      base = `${d.gpu} ${d.vram}GB\uB85C 13B+ LLM \uB85C\uCEEC \uCD94\uB860 \uAC00\uB2A5, ${d.ram}GB RAM \uB300\uD615 \uCEE8\uD14D\uC2A4\uD2B8 \uCC98\uB9AC`;
    } else if (d.aiGrade >= 4) {
      base = `${d.gpu} ${d.vram}GB\uB85C 7B LLM \uC2E4\uC2DC\uAC04 \uCD94\uB860 \uCF8C\uC801, \uB85C\uCEEC AI \uC5B4\uC2DC\uC2A4\uD134\uD2B8 \uAD6C\uCD95`;
    } else if (d.aiGrade >= 3) {
      base = `${d.gpu} ${d.vram}GB\uB85C \uC18C\uD615 LLM \uCD94\uB860 \uAC00\uB2A5, llama.cpp\xB7Ollama \uD65C\uC6A9 \uC801\uD569`;
    } else if (d.vram >= 12) {
      used.add("ram");
      base = `${d.gpu} ${d.vram}GB VRAM \uAE30\uBC18 \uACBD\uB7C9 LLM \uCD94\uB860 \uC785\uBB38, ${d.ram}GB RAM`;
    } else {
      base = `${d.gpu} ${d.vram}GB\uB85C \uCD08\uC18C\uD615 \uBAA8\uB378 \uCD94\uB860 \uCCB4\uD5D8, \uBCF8\uACA9 LLM\uC5D0\uB294 VRAM \uC5C5\uADF8\uB808\uC774\uB4DC \uAD8C\uC7A5`;
    }
    return base + suffix(d, used);
  }
  function editingSummary(d) {
    const used = /* @__PURE__ */ new Set(["gpu", "vram"]);
    let base;
    if (d.vidEd === "standard" && d.ram >= 64) {
      used.add("ram").add("cpu");
      base = `${d.cpu} + ${d.gpu} ${d.vram}GB\uC5D0 ${d.ram}GB RAM \uB300\uC6A9\uB7C9, 4K \uD504\uB9AC\uBBF8\uC5B4\xB7\uB2E4\uBE48\uCE58 \uC548\uC815`;
    } else if (d.vidEd === "standard" && d.ram >= 32) {
      used.add("ram").add("ssd");
      base = `${d.gpu} ${d.vram}GB + ${d.ram}GB\uB85C FHD~QHD \uD3B8\uC9D1 \uCF8C\uC801, ${d.ssdLabel} \uD504\uB85C\uC81D\uD2B8 \uC800\uC7A5`;
    } else if (d.vidEd === "standard") {
      used.add("ssd");
      base = `${d.gpu} CUDA \uAC00\uC18D\uC73C\uB85C \uD504\uB9AC\uBBF8\uC5B4 \uC778\uCF54\uB529 \uCF8C\uC801, ${d.ssdLabel} \uC18C\uC2A4 \uC800\uC7A5`;
    } else if (d.vidEd === "entry") {
      used.add("ram");
      base = `${d.gpu}\uB85C FHD \uCEF7\uD3B8\uC9D1\xB7\uC790\uB9C9 \uC791\uC5C5 \uC785\uBB38 \uC801\uD569, ${d.ram}GB \uBA54\uBAA8\uB9AC`;
    } else {
      base = `${d.gpu} \uAE30\uBC18 \uAE30\uCD08 \uD3B8\uC9D1 \uAC00\uB2A5, \uC804\uBB38 \uC791\uC5C5\uC5D0\uB294 \uBA54\uBAA8\uB9AC\xB7VRAM \uC5C5\uADF8\uB808\uC774\uB4DC \uAD8C\uC7A5`;
    }
    return base + suffix(d, used);
  }
  function streamingSummary(d) {
    const used = /* @__PURE__ */ new Set(["gpu", "cpu"]);
    let base;
    if (d.tier === "flagship" || d.tier === "high") {
      used.add("ram");
      base = `${d.cpu} + ${d.gpu}\uB85C \uACE0\uD654\uC9C8 \uAC8C\uC784+OBS 4K \uC1A1\uCD9C \uB3D9\uC2DC \uAC00\uB2A5, ${d.ram}GB RAM \uC5EC\uC720`;
    } else if (d.tier === "upper" || d.tier === "mid_high") {
      used.add("vram").add("ssd");
      base = `${d.cpu} + ${d.gpu} ${d.vram}GB\uB85C QHD \uAC8C\uC784+FHD \uC1A1\uCD9C \uCD5C\uC801\uD654, ${d.ssdLabel} \uB179\uD654`;
    } else if (d.tier === "mid") {
      used.add("ram");
      base = `${d.gpu} NVENC \uC778\uCF54\uB354\uB85C FHD \uC6D0\uCEF4\uBC29\uC1A1 \uCF8C\uC801, ${d.ram}GB\uB85C OBS+\uAC8C\uC784 \uB3D9\uC2DC \uAD6C\uB3D9`;
    } else {
      base = `${d.gpu}\uB85C FHD \uC785\uBB38 \uBC29\uC1A1, \uACBD\uB7C9 \uAC8C\uC784+\uC1A1\uCD9C \uC6D0\uCEF4 \uAD6C\uC131`;
    }
    return base + suffix(d, used);
  }
  function officeSummary(d) {
    const used = /* @__PURE__ */ new Set(["cpu"]);
    let base;
    if (d.pos === "premium" || d.pos === "high") {
      used.add("gpu").add("ram").add("price");
      base = `${d.cpu} + ${d.gpu}\uB85C \uB514\uC790\uC778\xB7CAD \uACB8\uC6A9 \uACE0\uC131\uB2A5 \uC0AC\uBB34 \uD658\uACBD, ${d.ram}GB RAM`;
    } else if (d.ram >= 32) {
      used.add("ram");
      base = `${d.cpu} \uAE30\uBC18 \uBA40\uD2F0\uD0ED\xB7\uBB38\uC11C \uCF8C\uC801, ${d.ram}GB RAM \uB300\uC6A9\uB7C9 \uC5D1\uC140\xB7\uD3EC\uD1A0\uC0F5 \uB300\uC751`;
    } else if (d.wifi) {
      used.add("wifi").add("ssd");
      base = `${d.cpu} + Wi-Fi \uB0B4\uC7A5\uC73C\uB85C \uAE54\uB054\uD55C \uC0AC\uBB34 \uD658\uACBD, ${d.ssdLabel} \uC800\uC7A5`;
    } else {
      used.add("ssd");
      base = `${d.cpu} \uAE30\uBC18 \uC5C5\uBB34\xB7\uBB38\uC11C\xB7\uC6F9 \uC791\uC5C5 \uCF8C\uC801, ${d.ssdLabel} SSD \uBE60\uB978 \uBD80\uD305`;
    }
    return base + suffix(d, used);
  }
  function modelingSummary(d) {
    const used = /* @__PURE__ */ new Set(["gpu", "vram"]);
    let base;
    if (d.model === "standard" && d.vram >= 16) {
      used.add("ram");
      base = `${d.gpu} ${d.vram}GB\uB85C \uBE14\uB80C\uB354\xB7\uC194\uB9AC\uB4DC\uC6CD\uC2A4 \uBDF0\uD3EC\uD2B8 \uCF8C\uC801, ${d.ram}GB RAM \uB300\uD615 \uC5B4\uC148\uBE14\uB9AC`;
    } else if (d.model === "standard") {
      used.add("ram").add("ssd");
      base = `${d.gpu} ${d.vram}GB + ${d.ram}GB RAM\uC73C\uB85C CAD\xB73D \uC911\uAE09 \uC791\uC5C5, ${d.ssdLabel} \uD504\uB85C\uC81D\uD2B8 \uC800\uC7A5`;
    } else if (d.model === "entry") {
      used.add("ram");
      base = `${d.gpu}\uB85C \uAE30\uCD08 3D \uBAA8\uB378\uB9C1\xB7\uB80C\uB354\uB9C1 \uC785\uBB38, ${d.ram}GB \uBA54\uBAA8\uB9AC`;
    } else {
      base = `${d.gpu} \uAE30\uBC18 \uACBD\uB7C9 3D \uC791\uC5C5, \uB300\uADDC\uBAA8 \uB80C\uB354\uB9C1\uC5D0\uB294 VRAM \uC5C5\uADF8\uB808\uC774\uB4DC \uAD8C\uC7A5`;
    }
    return base + suffix(d, used);
  }
  function whiteSummary(d, product) {
    const used = /* @__PURE__ */ new Set(["gpu", "color"]);
    const base = `\uD654\uC774\uD2B8 \uCF00\uC774\uC2A4 \uD1B5\uC77C\uC5D0 ${d.gpu}`;
    if (d.wifi && (d.pos === "premium" || d.pos === "high")) {
      used.add("wifi").add("price");
      return base + " \uD0D1\uC7AC, Wi-Fi \uB0B4\uC7A5 \uC120\uC815\uB9AC \uCD5C\uC18C\uD654, \uD504\uB9AC\uBBF8\uC5C4 \uAC10\uC131 \uC644\uC131" + suffix(d, used);
    }
    if (d.wifi) {
      used.add("wifi");
      return base + " + Wi-Fi \uB0B4\uC7A5, \uCF00\uC774\uBE14 \uCD5C\uC18C\uD654 \uAE54\uB054\uD55C \uB370\uC2A4\uD06C \uC14B\uC5C5" + suffix(d, used);
    }
    if (d.ram >= 64) {
      used.add("ram");
      return base + ` + ${d.ram}GB \uB300\uC6A9\uB7C9, \uAC10\uC131\uACFC \uD37C\uD3EC\uBA3C\uC2A4 \uBAA8\uB450 \uAC16\uCD98 \uD654\uC774\uD2B8` + suffix(d, used);
    }
    if (d.ram >= 32) {
      used.add("ram");
      return base + ` + ${d.ram}GB RAM, \uAC10\uC131\uACFC \uC131\uB2A5 \uBAA8\uB450 \uAC16\uCD98 \uD654\uC774\uD2B8 \uBE4C\uB4DC` + suffix(d, used);
    }
    used.add("ssd");
    return base + `, ${d.ssdLabel} SSD, \uC778\uD14C\uB9AC\uC5B4 \uAC10\uC131 \uB370\uC2A4\uD06C\uD1B1` + suffix(d, used);
  }
  function installmentSummary(d, product) {
    const used = /* @__PURE__ */ new Set(["gpu", "ram", "price"]);
    const months = product.installment_months || 0;
    const monthly = product.price_monthly || 0;
    let base;
    if (monthly > 0) {
      const mm = Math.round(monthly / 1e4);
      base = `${d.gpu} + ${d.ram}GB \uAD6C\uC131\uC744 \uC6D4 ${mm}\uB9CC \uC6D0(${months}\uAC1C\uC6D4 \uBB34\uC774\uC790), \uBD80\uB2F4 \uC5C6\uB294 \uACE0\uC131\uB2A5`;
    } else if (months > 0) {
      const tm = Math.round((product.price || 0) / 1e4);
      const em = Math.round(tm / months);
      base = `${d.gpu} + ${d.ram}GB RAM, ${months}\uAC1C\uC6D4 \uBB34\uC774\uC790 \uC2DC \uC6D4 \uC57D ${em}\uB9CC \uC6D0`;
    } else {
      base = `${d.gpu} + ${d.ram}GB RAM \uAD6C\uC131`;
    }
    return base + suffix(d, used);
  }
  function defaultSummary(d) {
    const parts = [`${d.gpu} ${d.vram}GB`];
    if (d.cpu) parts.push(d.cpu);
    if (d.qhd === "strong") parts.push("QHD \uACE0\uC635\uC158");
    else if (d.qhd === "good") parts.push("QHD \uBC38\uB7F0\uC2A4");
    else parts.push("FHD");
    if (d.vidEd === "standard") parts.push("\uC601\uC0C1\uD3B8\uC9D1");
    if (d.ram >= 128) parts.push(`${d.ram}GB \uC11C\uBC84\uAE09`);
    else if (d.ram >= 64) parts.push(`${d.ram}GB \uB300\uC6A9\uB7C9`);
    else if (d.ram >= 32) parts.push(`${d.ram}GB`);
    else if (d.ram >= 16) parts.push(`${d.ram}GB RAM`);
    if (d.ssd >= 2048) parts.push(`${sl(d.ssd)} \uB300\uC6A9\uB7C9`);
    else if (d.ssd >= 1024) parts.push(`${sl(d.ssd)}`);
    else if (d.ssd > 0) parts.push(`${d.ssd}GB SSD`);
    const extras = [];
    if (d.color === "white") extras.push("\uD654\uC774\uD2B8");
    if (d.wifi) extras.push("Wi-Fi");
    if (extras.length) parts.push(extras.join("+"));
    if (d.priceLabel) parts.push(d.priceLabel);
    return parts.join(" \xB7 ");
  }
  function generateSummary(product, sectionKey) {
    const v2 = product.v2;
    if (!v2) return "";
    const d = extract(v2, product);
    if (!d.gpu) return "";
    switch (sectionKey) {
      case "gaming":
        return gamingSummary(d, product);
      case "qhd_gaming":
        return qhdGamingSummary(d);
      case "4k_gaming":
        return fourKGamingSummary(d);
      case "ai_study":
        return aiStudySummary(d);
      case "local_llm":
        return localLlmSummary(d);
      case "editing":
        return editingSummary(d);
      case "streaming":
        return streamingSummary(d);
      case "office":
        return officeSummary(d);
      case "modeling":
        return modelingSummary(d);
      case "white":
        return whiteSummary(d, product);
      case "installment":
        return installmentSummary(d, product);
      default:
        return defaultSummary(d);
    }
  }
  function generateSellingPoints(product, sectionKey) {
    const v2 = product.v2;
    if (!v2) return [];
    const d = extract(v2, product);
    const points = [];
    if (d.gpu && d.vram) points.push(`${d.gpu} ${d.vram}GB`);
    else if (d.gpu) points.push(d.gpu);
    switch (sectionKey) {
      case "ai_study":
      case "local_llm":
        if (d.tensor.startsWith("nvidia")) points.push("CUDA \uD150\uC11C\uCF54\uC5B4");
        if (d.aiGrade >= 4) points.push("\uB85C\uCEEC AI Pro");
        else if (d.aiGrade >= 3) points.push("\uB85C\uCEEC AI \uAC00\uB2A5");
        else if (d.aiGrade >= 2) points.push("AI \uC785\uBB38 \uC801\uD569");
        break;
      case "gaming":
      case "qhd_gaming":
      case "4k_gaming":
        if (d.g4k === "optimal") points.push("4K \uCF8C\uC801");
        else if (d.qhd === "strong") points.push("QHD \uCD5C\uACE0");
        else if (d.qhd === "good") points.push("QHD \uCF8C\uC801");
        else points.push("FHD \uACE0\uD504\uB808\uC784");
        break;
      case "editing":
        if (d.vidEd === "standard") points.push("\uD3B8\uC9D1 \uD45C\uC900");
        else points.push("\uD3B8\uC9D1 \uC785\uBB38");
        if (d.cpu) points.push(d.cpu);
        break;
      case "streaming":
        if (d.tensor.startsWith("nvidia")) points.push("NVENC \uC778\uCF54\uB354");
        points.push("\uC6D0\uCEF4\uBC29\uC1A1");
        break;
      case "modeling":
        if (d.model === "standard") points.push("CAD\xB7\uB80C\uB354\uB9C1");
        break;
      case "white":
        points.push("\uD654\uC774\uD2B8 \uD1B5\uC77C");
        break;
      case "installment":
        if (product.installment_months) points.push(`${product.installment_months}\uAC1C\uC6D4 \uBB34\uC774\uC790`);
        break;
    }
    if (d.ram >= 128) points.push(`${d.ram}GB \uC11C\uBC84\uAE09`);
    else if (d.ram >= 64) points.push(`${d.ram}GB \uB300\uC6A9\uB7C9`);
    else if (d.ram >= 32) points.push(`DDR5 ${d.ram}GB`);
    else if (d.ram >= 16) points.push(`${d.ram}GB RAM`);
    if (d.ssd >= 4096) points.push(`${sl(d.ssd)} \uB300\uC6A9\uB7C9`);
    else if (d.ssd >= 2048) points.push(`${sl(d.ssd)} NVMe`);
    else if (d.ssd >= 1024) points.push("1TB NVMe");
    else if (d.ssd >= 512) points.push(`${d.ssd}GB SSD`);
    if (d.wifi) points.push("Wi-Fi \uB0B4\uC7A5");
    if (d.color === "white" && sectionKey !== "white") points.push("\uD654\uC774\uD2B8 \uCF00\uC774\uC2A4");
    return [...new Set(points)].slice(0, 4);
  }
  var GROUP_TO_SECTION;
  var init_card_text_generator = __esm({
    "js/card-text-generator.js"() {
      GROUP_TO_SECTION = {
        "usage:\uAC8C\uC774\uBC0D": "gaming",
        "usage:\uC601\uC0C1\uD3B8\uC9D1": "editing",
        "usage:\uC0AC\uBB34/\uB514\uC790\uC778": "office",
        "usage:3D \uBAA8\uB378\uB9C1": "modeling",
        "usage:\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D": "streaming",
        "bestFor:AI \uACF5\uBD80\uC6A9": "ai_study",
        "bestFor:\uB85C\uCEEC LLM \uC785\uBB38": "local_llm",
        "bestFor:QHD \uAC8C\uC774\uBC0D": "qhd_gaming",
        "bestFor:4K \uAC8C\uC774\uBC0D": "4k_gaming",
        "bestFor:\uD654\uC774\uD2B8 \uAC10\uC131": "white"
      };
    }
  });

  // js/render.js
  function renderCardConsultRow(size = "default") {
    const linkCls = size === "wizard" ? "text-xs font-semibold text-[#FEE500]/90 hover:text-[#FEE500] underline decoration-[#FEE500]/35 underline-offset-2" : "text-[11px] sm:text-xs font-semibold text-[#FEE500]/90 hover:text-[#FEE500] underline decoration-[#FEE500]/35 underline-offset-2";
    return `
        <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1">
          <a href="${KAKAO_CONSULT_CHAT_URL}" target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center ${linkCls} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FEE500]/45 rounded px-0.5 -mx-0.5"
             aria-label="\uCE74\uCE74\uC624\uD1A1 24\uC2DC\uAC04 \uC0C1\uB2F4, \uC0C8 \uCC3D">
            24\uC2DC\uAC04 \uCE74\uD1A1 \uC0C1\uB2F4
          </a>
          <span class="text-[10px] text-gray-600 hidden sm:inline">\uC9C0\uAE08 \uC0C1\uB2F4 \uAC00\uB2A5</span>
        </div>`;
  }
  function renderInstallmentPolicyLine(product, { marginClass = "mt-0.5" } = {}) {
    const badge = String(product.badge || "").trim();
    if (badge.includes("\uAC1C\uC6D4")) {
      return `<p class="text-xs text-purple-400 font-semibold ${marginClass}">${badge}</p>`;
    }
    return `<p class="text-xs text-purple-400 font-semibold ${marginClass}">${product.installment_months}\uAC1C\uC6D4 \uAE30\uC900</p>`;
  }
  function renderProductPriceStack(product) {
    const hint = buildMonthlyPaymentHint(product);
    const isInstallment = (product.installment_months || 0) > 0 && (product.price_monthly || 0) > 0;
    if (isInstallment) {
      return `
            <p class="text-[10px] font-semibold text-gray-500 tracking-wide">\uC6D4 \uD560\uBD80\uAC00</p>
            ${renderInstallmentPolicyLine(product)}
            <p class="text-2xl font-black text-white tracking-tight">${product.price_display}</p>
            <p class="text-xs text-gray-500 mt-0.5">\uCD1D ${Math.round((product.price || 0) / 1e4)}\uB9CC \uC6D0</p>`;
    }
    return `
            <p class="text-[10px] font-semibold text-gray-500 tracking-wide">\uD310\uB9E4\uAC00</p>
            <p class="text-2xl font-black text-white tracking-tight">${product.price_display}</p>
            ${hint ? `<p class="text-xs text-gray-300 font-semibold mt-1 leading-snug">${hint.primary}</p>
                   <p class="text-[10px] text-gray-600 mt-0.5">${hint.disclaimer}</p>` : ""}`;
  }
  function renderWizardPriceStack(product) {
    const hint = buildMonthlyPaymentHint(product);
    const months = product.installment_months | 0;
    const monthly = product.price_monthly | 0;
    const isInstallment = months > 0 && monthly > 0;
    if (isInstallment) {
      const scheduleTotal = monthly * months;
      const totalLabel = formatPrice(scheduleTotal);
      return `
              <p class="text-[10px] font-semibold text-gray-500 tracking-wide">\uC6D4 \uD560\uBD80\uAC00</p>
              <p class="text-3xl font-black text-white tracking-tight leading-snug">${product.price_display}
                <span class="block text-sm font-bold text-gray-400 mt-1 sm:inline sm:mt-0 sm:ml-2">
                  (${months}\uAC1C\uC6D4 \xB7 \uCD1D ${totalLabel})
                </span>
              </p>`;
    }
    return `
              <p class="text-[10px] font-semibold text-gray-500 tracking-wide">\uACAC\uC801\uAC00</p>
              <p class="text-xs text-gray-500 mb-0.5">\uAE30\uBCF8 \uC0AC\uC591 \xB7 \uCD1D\uC561</p>
              <p class="text-3xl font-black text-white tracking-tight">${product.price_display}</p>
              ${hint ? `<p class="text-sm text-gray-300 font-semibold mt-1 leading-snug">${hint.primary}</p>
                     <p class="text-[11px] text-gray-600 mt-0.5">${hint.disclaimer}</p>` : ""}`;
  }
  function renderRecReasonsBlock(rec, { wizard = false } = {}) {
    const { reasonTags = [], reasonSummary = "" } = rec || {};
    if (!reasonTags.length && !reasonSummary) return "";
    const tagBase = "inline-flex max-w-full items-center rounded-md border border-accent/25 bg-accent/10 px-2 py-0.5 font-semibold text-gray-200";
    const tagCls = wizard ? `${tagBase} text-[11px]` : `${tagBase} text-[10px]`;
    const tagsHtml = reasonTags.slice(0, 2).map(
      (t) => `
    <span class="${tagCls} truncate" title="${t}">${t}</span>`
    ).join("");
    const summaryCls = wizard ? "mt-1.5 text-xs text-gray-300/95 leading-snug line-clamp-1" : "mt-1.5 text-[11px] text-gray-400 leading-snug line-clamp-1";
    return `
        <div class="rec-reasons mt-2 w-full min-w-0" data-rec-reasons>
          <div class="flex flex-wrap gap-1.5">${tagsHtml}</div>
          ${reasonSummary ? `<p class="${summaryCls}">${reasonSummary}</p>` : ""}
        </div>`;
  }
  function getSelectedGameSummary(product, selectedGame, fpsData) {
    const result = selectedGame ? getExpectedFps(product, selectedGame, fpsData) : null;
    if (!result) return null;
    return {
      fpsText: result.fpsText,
      summaryText: result.summaryText
    };
  }
  function renderProductCard(product, selectedGame = null, fpsData = null, recommendationReasons = null, sectionKey = "default", thumbAttrs = null) {
    var _a;
    const imgLoading = (thumbAttrs == null ? void 0 : thumbAttrs.loading) || "lazy";
    const imgFetchPriority = (thumbAttrs == null ? void 0 : thumbAttrs.fetchPriority) || "low";
    const badgeClass = getBadgeClass(product.badge_color);
    const gameSummary = getSelectedGameSummary(product, selectedGame, fpsData);
    const fpsText = (gameSummary == null ? void 0 : gameSummary.fpsText) || null;
    const gameHighlights = getProductGameFpsHighlights(product, selectedGame ? 3 : 4, selectedGame ? [selectedGame] : []);
    const tierBadge = {
      "\uAC00\uC131\uBE44(FHD)": { label: "FHD", cls: "text-emerald-400 bg-emerald-400/10" },
      "\uD37C\uD3EC\uBA3C\uC2A4(QHD)": { label: "QHD", cls: "text-blue-400 bg-blue-400/10" },
      "\uD558\uC774\uC5D4\uB4DC(4K)": { label: "4K", cls: "text-purple-400 bg-purple-400/10" }
    };
    const tier = tierBadge[product.categories.tier] || { label: "FHD", cls: "text-gray-400 bg-gray-400/10" };
    const v2 = product.v2 || null;
    const v2Badges = (v2 == null ? void 0 : v2.display_badges) || [];
    const summaryReason = generateSummary(product, sectionKey) || (v2 == null ? void 0 : v2.summary_reason) || "";
    const sellingPts = generateSellingPoints(product, sectionKey);
    if (sellingPts.length === 0 && ((_a = v2 == null ? void 0 : v2.selling_points) == null ? void 0 : _a.length)) sellingPts.push(...v2.selling_points.slice(0, 4));
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
          loading="${imgLoading}"
          decoding="async"
          fetchpriority="${imgFetchPriority}"
          onerror="this.src='https://via.placeholder.com/400x300/16213e/e94560?text=YJMOD'"
        />
        <!-- \uD488\uC9C8 \uD2F0\uC5B4 \uBC43\uC9C0 -->
        <span class="absolute top-3 left-3 px-2 py-0.5 rounded-md text-xs font-bold ${tier.cls}">
          ${tier.label}
        </span>
        <!-- \uCF00\uC774\uC2A4 \uC0C9\uC0C1 -->
        <span class="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-white/20 ${product.case_color === "\uD654\uC774\uD2B8" ? "bg-white" : "bg-gray-800"}"
              title="${product.case_color || ""} \uCF00\uC774\uC2A4"></span>
      </div>

      <!-- \uCF58\uD150\uCE20 -->
      <div class="flex flex-col flex-1 p-5 gap-3">
        <!-- \uBC30\uC9C0 + \uC81C\uD488\uBA85 -->
        <div>
          ${v2Badges.length > 0 ? `
          <div class="flex flex-wrap gap-1.5 mb-2">
            ${v2Badges.slice(0, 4).map((b) => `<span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border border-accent/25 bg-accent/10 text-gray-200">${b}</span>`).join("")}
          </div>` : product.badge ? `
          <span class="inline-block px-2 py-0.5 rounded-md text-xs font-semibold border mb-2 ${badgeClass}">
            ${product.badge}
          </span>` : ""}
          ${gameSummary ? `
          <p class="text-[11px] font-semibold text-accent mb-1">${gameSummary.summaryText}</p>` : ""}
          <h3 class="text-sm font-bold text-white leading-snug line-clamp-2">${product.name}</h3>
          <p class="text-xs text-gray-400 mt-1">${product.subtitle || ""}</p>
          ${summaryReason ? `<p class="text-[11px] text-emerald-400/80 mt-1.5 leading-snug line-clamp-2">${summaryReason}</p>` : ""}
          ${renderRecReasonsBlock(recommendationReasons, { wizard: false })}
          ${gameHighlights.length ? `
          <div class="flex flex-wrap gap-1.5 mt-2">
            ${gameHighlights.map((item) => `
            <span class="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
              ${item.summaryText}
            </span>`).join("")}
          </div>` : ""}
          ${sellingPts.length > 0 ? `
          <div class="flex flex-wrap gap-1 mt-2">
            ${sellingPts.slice(0, 3).map((sp) => `<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 text-gray-400 border border-white/5">${sp}</span>`).join("")}
          </div>` : ""}
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

        <!-- \uAC00\uACA9 + CTA + \uC0C1\uB2F4 -->
        <div class="mt-auto pt-3 border-t border-white/5 flex flex-col gap-2">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              ${renderProductPriceStack(product)}
            </div>
            <a href="${product.url}" target="_blank" rel="noopener noreferrer"
               class="flex-shrink-0 self-center px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-semibold
                      rounded-xl transition-colors duration-200 whitespace-nowrap">
              \uAD6C\uB9E4\uD558\uAE30
            </a>
          </div>
          ${renderCardConsultRow("default")}
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
  function forceShowCards(container) {
    container.querySelectorAll(".fade-in-up").forEach((el) => {
      el.classList.add("visible");
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  }
  function renderProductGrid(container, products, selectedGame = null, fpsData = null, filterState2 = null) {
    if (!container) return;
    container._flatProducts = products;
    container._flatSelectedGame = selectedGame;
    container._flatFpsData = fpsData;
    container._flatFilterState = filterState2;
    const userSel = userSelectionsFromFilterState(filterState2);
    const sectionKey = filterToSectionKey(filterState2);
    if (products.length === 0) {
      container.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <svg class="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-gray-400 text-lg font-medium">\uD574\uB2F9 \uC870\uAC74\uC758 \uC81C\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4</p>
        <p class="text-gray-600 text-sm mt-1">\uD544\uD130\uB97C \uBCC0\uACBD\uD558\uAC70\uB098 \uB9DE\uCDA4 \uC0C1\uB2F4\uC744 \uC694\uCCAD\uD574 \uBCF4\uC138\uC694</p>
        <div class="flex gap-3 mt-4">
          <button onclick="window.resetAllFilters()"
                  class="px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent text-sm rounded-lg transition-colors">
            \uD544\uD130 \uCD08\uAE30\uD654
          </button>
          <a href="${KAKAO_CONSULT_CHAT_URL}" target="_blank" rel="noopener noreferrer"
             class="px-4 py-2 bg-[#FEE500]/20 hover:bg-[#FEE500]/30 text-[#FEE500] text-sm rounded-lg transition-colors">
            \uB9DE\uCDA4 \uACAC\uC801 \uC0C1\uB2F4
          </a>
        </div>
      </div>
    `;
      return;
    }
    let visibleCount = parseInt(container.dataset.visibleCount || FLAT_PAGE_SIZE);
    const visible = products.slice(0, visibleCount);
    const remaining = products.length - visibleCount;
    container.dataset.visibleCount = visibleCount;
    container.innerHTML = visible.map((p) => renderProductCard(p, selectedGame, fpsData, buildRecommendationReasons(p, userSel), sectionKey)).join("");
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
  function renderWizardResultCard(product, selectedGame, fpsData, matchReasons = [], recommendationReasons = null) {
    var _a;
    let wizardInstallmentBadge = "";
    const instM = product.installment_months | 0;
    const instMo = product.price_monthly | 0;
    if (instM > 0 && instMo > 0) {
      if (instM === 24) wizardInstallmentBadge = "24\uAC1C\uC6D4 \uBB34\uC774\uC790";
      else if (instM === 36) wizardInstallmentBadge = "36\uAC1C\uC6D4 \uBB34\uC774\uC790";
      else if (String(product.badge || "").includes("\uAC1C\uC6D4")) wizardInstallmentBadge = product.badge;
      else wizardInstallmentBadge = `${instM}\uAC1C\uC6D4 \uBB34\uC774\uC790`;
    }
    const badgeClass = getBadgeClass(product.badge_color);
    const gameSummary = getSelectedGameSummary(product, selectedGame, fpsData);
    const fpsText = (gameSummary == null ? void 0 : gameSummary.fpsText) || null;
    const gameHighlights = getProductGameFpsHighlights(product, selectedGame ? 3 : 4, selectedGame ? [selectedGame] : []);
    const tierBadge = {
      "\uAC00\uC131\uBE44(FHD)": { label: "FHD \uAC00\uC131\uBE44", cls: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
      "\uD37C\uD3EC\uBA3C\uC2A4(QHD)": { label: "QHD \uD37C\uD3EC\uBA3C\uC2A4", cls: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
      "\uD558\uC774\uC5D4\uB4DC(4K)": { label: "4K \uD558\uC774\uC5D4\uB4DC", cls: "text-purple-400 border-purple-400/30 bg-purple-400/10" }
    };
    const tier = tierBadge[product.categories.tier] || { label: "PC", cls: "text-gray-400 border-gray-400/30 bg-gray-400/10" };
    const v2w = product.v2 || null;
    const v2wBadges = (v2w == null ? void 0 : v2w.display_badges) || [];
    const v2wSelling = generateSellingPoints(product, "default");
    if (v2wSelling.length === 0 && ((_a = v2w == null ? void 0 : v2w.selling_points) == null ? void 0 : _a.length)) v2wSelling.push(...v2w.selling_points.slice(0, 4));
    const v2wSummary = generateSummary(product, "default") || (v2w == null ? void 0 : v2w.summary_reason) || "";
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

        ${wizardInstallmentBadge ? `<span class="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold border border-purple-400/40 bg-purple-500/20 text-purple-100">
          ${wizardInstallmentBadge}
        </span>` : ""}
        <!-- \uD2F0\uC5B4 \uBC43\uC9C0 -->
        <span class="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold border ${tier.cls}">
          ${tier.label}
        </span>
      </div>

      <!-- \uCF58\uD150\uCE20 -->
      <div class="flex flex-col flex-1 p-5 gap-4">
        <div>
          ${v2wBadges.length > 0 ? `
          <div class="flex flex-wrap gap-1.5 mb-2">
            ${v2wBadges.slice(0, 4).map((b) => `<span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border border-accent/25 bg-accent/10 text-gray-200">${b}</span>`).join("")}
          </div>` : product.badge ? `
          <span class="inline-block px-2 py-0.5 rounded-md text-xs font-semibold border mb-2 ${badgeClass}">
            \u2726 ${product.badge}
          </span>` : ""}
          ${gameSummary ? `
          <p class="text-xs font-semibold text-accent mb-1">${gameSummary.summaryText}</p>` : ""}
          <h3 class="text-base font-bold text-white leading-snug">${product.name}</h3>
          <p class="text-sm text-gray-400 mt-1">${product.subtitle || ""}</p>
          ${v2wSummary ? `<p class="text-xs text-emerald-400/80 mt-1.5 leading-snug line-clamp-2">${v2wSummary}</p>` : ""}
          ${gameHighlights.length ? `
          <div class="flex flex-wrap gap-1.5 mt-3">
            ${gameHighlights.map((item) => `
            <span class="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-gray-300">
              ${item.summaryText}
            </span>`).join("")}
          </div>` : ""}
          ${v2wSelling.length > 0 ? `
          <div class="flex flex-wrap gap-1 mt-2">
            ${v2wSelling.slice(0, 4).map((sp) => `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-gray-400 border border-white/5">${sp}</span>`).join("")}
          </div>` : ""}
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

        <!-- \uAC00\uACA9 + CTA + \uC0C1\uB2F4 -->
        <div class="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              ${renderWizardPriceStack(product)}
            </div>
            <a href="${product.url}" target="_blank" rel="noopener noreferrer"
               class="flex-shrink-0 self-center px-5 py-3 bg-accent hover:bg-red-500 text-white font-bold
                      rounded-xl transition-colors duration-200 text-sm">
              \uACAC\uC801 \uD655\uC778
            </a>
          </div>
          ${renderCardConsultRow("wizard")}
        </div>
        ${renderRecReasonsBlock(recommendationReasons, { wizard: true })}
      </div>
    </article>
  `;
  }
  function collectGroupProducts(group, allProducts) {
    if (group.key === "installment") {
      return allProducts.filter((p) => (p.installment_months || 0) === group.value);
    }
    if (group.key === "bestFor") {
      return allProducts.filter((p) => {
        var _a, _b;
        return (_b = (_a = p.v2) == null ? void 0 : _a.best_for_tags) == null ? void 0 : _b.includes(group.value);
      });
    }
    return allProducts.filter(
      (p) => {
        var _a;
        return (((_a = p.categories) == null ? void 0 : _a.usage) || []).includes(group.value) && !(p.installment_months > 0 && group.value === "\uAC8C\uC774\uBC0D");
      }
    );
  }
  function renderGroupedView(container, allProducts, fpsData, onMoreClick) {
    if (!container) return;
    container._groupMoreHandler = onMoreClick;
    const groupedMeta = GROUPS.map((group) => {
      const products = collectGroupProducts(group, allProducts);
      return { ...group, products };
    }).filter((g) => g.products.length > 0);
    const usedInMainPreview = /* @__PURE__ */ new Set();
    container.innerHTML = groupedMeta.map((group) => {
      const fresh = group.products.filter((p) => !usedInMainPreview.has(String(p.id)));
      const preview = fresh.slice(0, CARDS_PER_GROUP);
      preview.forEach((p) => usedInMainPreview.add(String(p.id)));
      const remaining = group.products.length - CARDS_PER_GROUP;
      return `
      <div class="col-span-full group-section mb-2">
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

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-2">
          ${preview.map(
        (p) => renderProductCard(
          p,
          null,
          fpsData,
          buildRecommendationReasons(p, userSelectionsFromGroup(group)),
          groupToSectionKey(group.key, group.value)
        )
      ).join("")}
        </div>

        <div class="border-b border-white/5 mt-6 mb-6"></div>
      </div>
    `;
    }).join("");
    forceShowCards(container);
  }
  var FLAT_PAGE_SIZE, GROUPS, CARDS_PER_GROUP;
  var init_render = __esm({
    "js/render.js"() {
      init_utils();
      init_recommendation_reasons();
      init_card_text_generator();
      FLAT_PAGE_SIZE = 12;
      GROUPS = [
        { key: "usage", value: "\uAC8C\uC774\uBC0D", label: "\u{1F3AE} \uAC8C\uC774\uBC0D PC", desc: "\uAC8C\uC784 \uD2B9\uD654 \uCD5C\uC801\uD654 \uACAC\uC801" },
        { key: "bestFor", value: "AI \uACF5\uBD80\uC6A9", label: "\u{1F916} AI \uACF5\uBD80\uC6A9 PC", desc: "AI \uC785\uBB38 \xB7 CUDA \uD559\uC2B5 \xB7 \uB525\uB7EC\uB2DD \uC2DC\uC791" },
        { key: "bestFor", value: "\uB85C\uCEEC LLM \uC785\uBB38", label: "\u{1F9E0} \uB85C\uCEEC LLM \uC785\uBB38 PC", desc: "\uB85C\uCEEC AI \xB7 LLM \uCD94\uB860 \uAC00\uB2A5" },
        { key: "usage", value: "\uC601\uC0C1\uD3B8\uC9D1", label: "\u{1F3AC} \uC601\uC0C1\uD3B8\uC9D1 PC", desc: "4K \uD3B8\uC9D1 \xB7 \uB80C\uB354\uB9C1 \uD2B9\uD654" },
        { key: "bestFor", value: "QHD \uAC8C\uC774\uBC0D", label: "\u{1F5A5}\uFE0F QHD \uAC8C\uC774\uBC0D PC", desc: "QHD \uD574\uC0C1\uB3C4 \uCF8C\uC801 \uAC8C\uC774\uBC0D" },
        { key: "bestFor", value: "4K \uAC8C\uC774\uBC0D", label: "\u{1F3C6} 4K \uAC8C\uC774\uBC0D PC", desc: "4K UHD \uCD5C\uACE0 \uD654\uC9C8 \uAC8C\uC774\uBC0D" },
        { key: "usage", value: "\uC0AC\uBB34/\uB514\uC790\uC778", label: "\u{1F4BC} \uC0AC\uBB34 \xB7 \uB514\uC790\uC778 PC", desc: "\uC5C5\uBB34 \xB7 \uBB38\uC11C \xB7 \uB514\uC790\uC778 \uCD5C\uC801\uD654" },
        { key: "usage", value: "3D \uBAA8\uB378\uB9C1", label: "\u{1F3A8} 3D \uBAA8\uB378\uB9C1 PC", desc: "CAD \xB7 \uBE14\uB80C\uB354 \xB7 \uC194\uB9AC\uB4DC\uC6CD\uC2A4" },
        { key: "usage", value: "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D", label: "\u{1F4FA} \uBC29\uC1A1 \xB7 \uC2A4\uD2B8\uB9AC\uBC0D PC", desc: "OBS \xB7 \uC6D0\uCEF4\uBC29\uC1A1 \xB7 \uB77C\uC774\uBE0C" },
        { key: "bestFor", value: "\uD654\uC774\uD2B8 \uAC10\uC131", label: "\u{1F90D} \uD654\uC774\uD2B8 \uAC10\uC131 PC", desc: "\uD654\uC774\uD2B8 \uCF00\uC774\uC2A4 \uAC10\uC131 \uCD94\uCC9C" },
        { key: "installment", value: 24, label: "\u{1F4B3} 24\uAC1C\uC6D4 \uBB34\uC774\uC790", desc: "\uC6D4 \uB0A9\uBD80\uAE08\uC73C\uB85C \uBD80\uB2F4 \uC5C6\uC774" },
        { key: "installment", value: 36, label: "\u{1F4B3} 36\uAC1C\uC6D4 \uBB34\uC774\uC790", desc: "\uAC00\uC7A5 \uB0AE\uC740 \uC6D4 \uB0A9\uBD80\uAE08" }
      ];
      CARDS_PER_GROUP = 3;
    }
  });

  // js/wizard.js
  var wizard_exports = {};
  __export(wizard_exports, {
    BUDGET_OPTIONS: () => BUDGET_OPTIONS,
    DESIGN_OPTIONS: () => DESIGN_OPTIONS,
    GAME_OPTIONS: () => GAME_OPTIONS,
    PURPOSE_OPTIONS: () => PURPOSE_OPTIONS,
    TOTAL_STEPS: () => TOTAL_STEPS,
    Wizard: () => Wizard,
    getStepConfig: () => getStepConfig
  });
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
  var TOTAL_STEPS, PURPOSE_OPTIONS, GAME_OPTIONS, BUDGET_OPTIONS, DESIGN_OPTIONS, Wizard;
  var init_wizard = __esm({
    "js/wizard.js"() {
      init_filter();
      init_render();
      init_utils();
      TOTAL_STEPS = 4;
      PURPOSE_OPTIONS = [
        { id: "gaming", label: "\uAC8C\uC774\uBC0D", value: "gaming", icon: "\u{1F3AE}", desc: "\uAC8C\uC784 \uC804\uC6A9 PC" },
        { id: "ai_study", label: "AI \uACF5\uBD80\uC6A9", value: "ai_study", icon: "\u{1F9E0}", desc: "CUDA \uC785\uBB38\xB7\uB525\uB7EC\uB2DD \uD559\uC2B5" },
        { id: "local_llm", label: "\uB85C\uCEEC LLM", value: "local_llm", icon: "\u{1F916}", desc: "\uB85C\uCEEC AI\xB7LLM \uCD94\uB860" },
        { id: "editing", label: "\uC601\uC0C1\uD3B8\uC9D1", value: "editing", icon: "\u{1F3AC}", desc: "\uD504\uB9AC\uBBF8\uC5B4\xB7\uC5D0\uD399 \uB4F1" },
        { id: "office", label: "\uC0AC\uBB34\uC6A9", value: "office", icon: "\u{1F4BC}", desc: "\uBB38\uC11C\xB7\uC5C5\uBB34\uC6A9" },
        { id: "3d", label: "3D \uBAA8\uB378\uB9C1", value: "3d", icon: "\u{1F3A8}", desc: "\uBE14\uB80C\uB354\xB7CAD \uB4F1" },
        { id: "ai", label: "\uC0DD\uC131\uD615 AI", value: "ai", icon: "\u{1F52C}", desc: "\uC774\uBBF8\uC9C0\uC0DD\uC131\xB7\uD559\uC2B5\xB7\uCD94\uB860" },
        { id: "streaming", label: "\uBC29\uC1A1\xB7\uC2A4\uD2B8\uB9AC\uBC0D", value: "streaming", icon: "\u{1F4FA}", desc: "\uBC29\uC1A1\xB7\uC778\uCF54\uB529" }
      ];
      GAME_OPTIONS = [
        { id: "lol", label: "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC", value: "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC", icon: "\u{1F3AE}", desc: "\uB864 / \uB864 \uC544\uB808\uB098" },
        { id: "pubg", label: "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", value: "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", icon: "\u{1F52B}", desc: "\uBC30\uADF8 / \uC18C\uCD1D \uAC8C\uC784" },
        { id: "loa", label: "\uB85C\uC2A4\uD2B8\uC544\uD06C", value: "\uB85C\uC2A4\uD2B8\uC544\uD06C", icon: "\u2694\uFE0F", desc: "\uB85C\uC544 / MMORPG" },
        { id: "aaa", label: "\uC2A4\uD300 AAA \uAC8C\uC784", value: "\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784", icon: "\u{1F3B2}", desc: "\uC0AC\uC774\uBC84\uD391\uD06C / \uC640\uC77C\uC988 \uB4F1" },
        { id: "valorant", label: "\uBC1C\uB85C\uB780\uD2B8", value: "\uBC1C\uB85C\uB780\uD2B8", icon: "\u{1F3AF}", desc: "\uBC1C\uB85C / FPS \uACBD\uC7C1\uC804" },
        { id: "ow2", label: "\uC624\uBC84\uC6CC\uCE582", value: "\uC624\uBC84\uC6CC\uCE582", icon: "\u{1F9B8}", desc: "\uC624\uBC84\uC6CC\uCE58 / \uD300 FPS" }
      ];
      BUDGET_OPTIONS = [
        { id: "budget_under100", label: "100\uB9CC \uC6D0 \uC774\uD558", value: "budget_under100", icon: "\u{1F4B0}", desc: "\uAC00\uC131\uBE44 \uCD5C\uAC15 \uC785\uBB38\uC6A9" },
        { id: "budget_100_200", label: "100 ~ 200\uB9CC \uC6D0", value: "budget_100_200", icon: "\u{1F4B5}", desc: "FHD\xB7QHD \uD37C\uD3EC\uBA3C\uC2A4" },
        { id: "budget_200_300", label: "200 ~ 300\uB9CC \uC6D0", value: "budget_200_300", icon: "\u{1F48E}", desc: "QHD\xB74K \uD558\uC774\uC5D4\uB4DC" },
        { id: "budget_over300", label: "300\uB9CC \uC6D0 \uC774\uC0C1", value: "budget_over300", icon: "\u{1F451}", desc: "\uCD5C\uACE0 \uC0AC\uC591 \uBB34\uC81C\uD55C" }
      ];
      DESIGN_OPTIONS = [
        { id: "black", label: "\uBE14\uB799 & \uB2E4\uD06C", value: "black", icon: "\u{1F5A4}", desc: "\uAC15\uB82C\uD558\uACE0 \uC138\uB828\uB41C \uB2E4\uD06C \uD1A4" },
        { id: "white", label: "\uD654\uC774\uD2B8 & \uD074\uB9B0", value: "white", icon: "\u{1F90D}", desc: "\uAE54\uB054\uD558\uACE0 \uAC10\uC131\uC801\uC778 \uD654\uC774\uD2B8" },
        { id: "rgb", label: "RGB \uD480\uCEE4\uC2A4\uD140", value: "rgb", icon: "\u{1F308}", desc: "RGB \uD29C\uB2DD \uD654\uB824\uD55C \uC5F0\uCD9C" }
      ];
      Wizard = class {
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
          const { recommended, noResultsReason, matchReasons, recommendationReasonsById } = getWizardRecommendations(this.products, this.selections);
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
                ai: "\u{1F52C} \uC0DD\uC131\uD615 AI",
                ai_study: "\u{1F9E0} AI \uACF5\uBD80\uC6A9",
                local_llm: "\u{1F916} \uB85C\uCEEC LLM",
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
              emptyMessage = this.selections.purpose === "gaming" ? "100\uB9CC \uC6D0 \uC774\uD558 \uAC8C\uC784\uC6A9 PC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. 100~200\uB9CC \uC6D0 \uAD6C\uAC04\uC744 \uCD94\uCC9C\uB4DC\uB9BD\uB2C8\uB2E4." : "\uC120\uD0DD\uD55C \uC608\uC0B0(100\uB9CC \uC6D0 \uC774\uD558)\uC5D0 \uB9DE\uB294 \uC81C\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. 100~200\uB9CC \uC6D0 \uAD6C\uAC04\uC744 \uC120\uD0DD\uD574 \uBCF4\uC2DC\uAC70\uB098 \uB2E4\uB978 \uC870\uAC74\uC744 \uC870\uC815\uD574 \uBCF4\uC138\uC694.";
            }
            this.resultContainer.innerHTML = `
        <div class="col-span-full text-center py-12">
          <p class="text-gray-400">${emptyMessage}</p>
        </div>
      `;
          } else {
            const reasonMap = new Map((matchReasons || []).map((m) => [String(m.productId), m.reasons || []]));
            this.resultContainer.innerHTML = recommended.map(
              (p) => renderWizardResultCard(
                p,
                selectedGame,
                this.fpsData,
                reasonMap.get(String(p.id)) || [],
                (recommendationReasonsById == null ? void 0 : recommendationReasonsById.get(String(p.id))) || null
              )
            ).join("");
          }
          setTimeout(() => {
            this.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
            observeScrollFade(".wizard-result-card");
          }, 100);
        }
      };
    }
  });

  // js/recent-shipping.js
  var recent_shipping_exports = {};
  __export(recent_shipping_exports, {
    initRecentShipping: () => initRecentShipping
  });
  function formatDate(iso) {
    if (!iso || typeof iso !== "string") return "";
    return iso.slice(0, 10).replace(/-/g, ".");
  }
  function setText(el, text) {
    if (!el) return;
    el.textContent = text == null ? "" : String(text);
  }
  function urlPathBase(href) {
    try {
      const u = new URL(href, window.location.origin);
      return `${u.origin}${u.pathname}`;
    } catch (e) {
      return String(href || "").split("?")[0];
    }
  }
  function footLabel(item, galleryUrl) {
    const g = urlPathBase(galleryUrl || "");
    const c = urlPathBase(item.cafeUrl || "");
    const art = (item.cafeUrl || "").includes("/articles/");
    if (art && c && g && c !== g) return "\uCE74\uD398 \uC6D0\uBB38 \uBCF4\uAE30";
    if (c && g && c === g) return "\uC804\uCCB4 \uCD9C\uACE0 \uC0AC\uC9C4 \uBCF4\uAE30";
    return "\uCE74\uD398\uC5D0\uC11C \uBCF4\uAE30";
  }
  async function loadShippingShowcase() {
    let r;
    try {
      r = await fetch("/api/shipping-public", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
    } catch (_) {
      const file = await fetchJson("./data/recent_shipping.json");
      if (!file) return null;
      return {
        galleryMenuUrl: file.galleryMenuUrl || DEFAULT_GALLERY,
        items: Array.isArray(file.items) ? file.items : [],
        _source: "json_fallback"
      };
    }
    if (r.ok) {
      const j = await r.json();
      if (j && Array.isArray(j.items)) {
        return {
          galleryMenuUrl: j.galleryMenuUrl || DEFAULT_GALLERY,
          items: j.items,
          _source: j.source || "api"
        };
      }
    }
    if (r.status === 404) {
      const file = await fetchJson("./data/recent_shipping.json");
      if (!file) return null;
      return {
        galleryMenuUrl: file.galleryMenuUrl || DEFAULT_GALLERY,
        items: Array.isArray(file.items) ? file.items : [],
        _source: "json_fallback"
      };
    }
    return null;
  }
  async function initRecentShipping() {
    const grid = document.getElementById("recent-shipping-grid");
    const galleryBtn = document.getElementById("recent-shipping-gallery-btn");
    const section = document.getElementById("recent-shipping-section");
    if (!grid || !section) return;
    const data = await loadShippingShowcase();
    if (!data) {
      console.warn(
        "[RecentShipping] /api/shipping-public \uC744 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC5B4 \uC139\uC158\uC744 \uC228\uAE41\uB2C8\uB2E4. Vercel Production\uC5D0 BLOB_READ_WRITE_TOKEN\xB7SHIPPING_PAYLOAD_SECRET(16\uC790+)\uB97C \uC124\uC815\uD588\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694."
      );
      section.classList.add("hidden");
      return;
    }
    const items = data.items.slice(0, 6);
    const galleryUrl = typeof data.galleryMenuUrl === "string" && data.galleryMenuUrl ? data.galleryMenuUrl : DEFAULT_GALLERY;
    if (galleryBtn) galleryBtn.href = galleryUrl;
    if (!items.length) {
      section.classList.add("hidden");
      return;
    }
    grid.replaceChildren();
    items.forEach((item, index) => {
      const url = item.cafeUrl;
      if (!url || typeof url !== "string") return;
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "recent-shipping-card group flex flex-col bg-card border border-white/5 rounded-2xl overflow-hidden hover:border-emerald-500/35 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50";
      const media = document.createElement("div");
      media.className = "recent-shipping-card__media relative w-full overflow-hidden bg-surface";
      const imgUrl = typeof item.image === "string" ? item.image.trim() : "";
      if (imgUrl) {
        const img = document.createElement("img");
        img.src = imgUrl;
        img.alt = "";
        img.width = 480;
        img.height = 300;
        img.loading = "lazy";
        img.decoding = "async";
        img.className = "absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]";
        if (index === 0) img.fetchPriority = "low";
        media.appendChild(img);
      } else {
        const ph = document.createElement("div");
        ph.className = "recent-shipping-card__ph";
        ph.setAttribute("aria-hidden", "true");
        media.appendChild(ph);
      }
      const body = document.createElement("div");
      body.className = "flex flex-col flex-1 p-4 gap-2";
      const meta = document.createElement("div");
      meta.className = "flex items-center justify-between gap-2 text-[11px] text-gray-500";
      const dateEl = document.createElement("time");
      dateEl.dateTime = item.date || "";
      setText(dateEl, formatDate(item.date));
      const badge = document.createElement("span");
      badge.className = "shrink-0 rounded-md bg-emerald-500/10 text-emerald-400/90 px-2 py-0.5 font-semibold";
      setText(badge, "\uCD9C\uACE0");
      meta.appendChild(dateEl);
      meta.appendChild(badge);
      const title = document.createElement("h3");
      title.className = "text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-emerald-300/95 transition-colors";
      setText(title, item.title || "\uCD9C\uACE0 \uC0AC\uB840");
      const specStr = typeof item.specs === "string" ? item.specs.trim() : "";
      const specs = document.createElement("p");
      specs.className = "text-xs text-gray-400 font-medium line-clamp-1";
      setText(specs, specStr);
      const summary = document.createElement("p");
      summary.className = "text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1";
      setText(summary, item.summary || "");
      const foot = document.createElement("div");
      foot.className = "flex items-center gap-1 pt-1 text-xs font-semibold text-emerald-500/70 group-hover:text-emerald-400 transition-colors";
      const footLabelText = footLabel(item, galleryUrl);
      const footLabelEl = document.createElement("span");
      footLabelEl.textContent = footLabelText;
      const footIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      footIcon.setAttribute("class", "w-3.5 h-3.5");
      footIcon.setAttribute("fill", "none");
      footIcon.setAttribute("viewBox", "0 0 24 24");
      footIcon.setAttribute("stroke", "currentColor");
      footIcon.setAttribute("aria-hidden", "true");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("stroke-width", "2");
      path.setAttribute(
        "d",
        "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      );
      footIcon.appendChild(path);
      foot.appendChild(footLabelEl);
      foot.appendChild(footIcon);
      body.appendChild(meta);
      body.appendChild(title);
      if (specStr) body.appendChild(specs);
      body.appendChild(summary);
      body.appendChild(foot);
      a.appendChild(media);
      a.appendChild(body);
      grid.appendChild(a);
    });
    try {
      window.dispatchEvent(new Event("resize"));
    } catch (_) {
    }
  }
  var DEFAULT_GALLERY;
  var init_recent_shipping = __esm({
    "js/recent-shipping.js"() {
      init_utils();
      DEFAULT_GALLERY = "https://cafe.naver.com/f-e/cafes/31248285/menus/1?viewType=I&page=1&size=20";
    }
  });

  // js/app.js
  init_utils();
  init_filter();
  init_render();

  // js/reco-loader.js
  init_utils();
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
      wizardModulePromise = Promise.resolve().then(() => (init_wizard(), wizard_exports));
    }
    return wizardModulePromise;
  }
  function scheduleRecentShipping() {
    const run = () => {
      Promise.resolve().then(() => (init_recent_shipping(), recent_shipping_exports)).then((m) => m.initRecentShipping()).catch(() => {
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
        const { Wizard: Wizard2 } = await loadWizardModule();
        if (!state.wizard) {
          state.wizard = new Wizard2("wizard-modal", state.products, state.fpsData);
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
      const { Wizard: Wizard2 } = await loadWizardModule();
      if (!state.wizard) {
        state.wizard = new Wizard2("wizard-modal", state.products, state.fpsData);
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
})();
