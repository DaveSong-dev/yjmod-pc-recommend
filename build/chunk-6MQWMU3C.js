import {
  KAKAO_CONSULT_CHAT_URL,
  PRICE_RANGES,
  buildMonthlyPaymentHint,
  formatPrice,
  getBadgeClass,
  getExpectedFps,
  getProductGameFpsHighlights
} from "./chunk-3K2RG6CP.js";

// js/recommendation_reasons.js
var GAME_ALIASES = {
  "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC": ["\uBAAC\uD5CC", "\uBAAC\uC2A4\uD130\uD5CC\uD130", "\uBAAC\uC2A4\uD130\uD5CC\uD130 \uC640\uC77C\uB4DC", "MH", "Wilds", "\uBAAC\uC2A4\uD130\uD5CC\uD130\uC640\uC77C\uB4DC"],
  "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC": ["\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC", "\uB864", "LOL"],
  "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC": ["\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", "\uBC30\uADF8", "PUBG"],
  "\uB85C\uC2A4\uD2B8\uC544\uD06C": ["\uB85C\uC2A4\uD2B8\uC544\uD06C", "\uB85C\uC544"],
  "\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784": ["\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784", "\uC2A4\uD300 AAA", "AAA"],
  "\uBC1C\uB85C\uB780\uD2B8": ["\uBC1C\uB85C\uB780\uD2B8", "\uBC1C\uB85C"],
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
var USAGE_ALIASES = {
  \uAC8C\uC774\uBC0D: ["\uAC8C\uC774\uBC0D"],
  "\uC0AC\uBB34/\uB514\uC790\uC778": ["\uC0AC\uBB34/\uB514\uC790\uC778", "\uC0AC\uBB34\uC6A9", "\uC0AC\uBB34", "\uC624\uD53C\uC2A4", "\uC5C5\uBB34"],
  \uC601\uC0C1\uD3B8\uC9D1: ["\uC601\uC0C1\uD3B8\uC9D1", "\uC601\uC0C1 \uD3B8\uC9D1", "\uD504\uB9AC\uBBF8\uC5B4", "\uC560\uD504\uD130\uC774\uD399\uD2B8", "\uC5D0\uD399", "\uD3B8\uC9D1"],
  "3D \uBAA8\uB378\uB9C1": ["3d \uBAA8\uB378\uB9C1", "3d/\uBAA8\uB378\uB9C1", "3d", "\uBAA8\uB378\uB9C1", "cad", "\uBE14\uB80C\uB354", "\uC2A4\uCF00\uCE58\uC5C5", "\uB80C\uB354\uB9C1", "maya"],
  "AI/\uB525\uB7EC\uB2DD": ["ai/\uB525\uB7EC\uB2DD", "ai", "\uB525\uB7EC\uB2DD", "\uBA38\uC2E0\uB7EC\uB2DD", "\uC0DD\uC131\uD615"],
  "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D": ["\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D", "\uBC29\uC1A1\xB7\uC2A4\uD2B8\uB9AC\uBC0D", "\uBC29\uC1A1", "\uC2A4\uD2B8\uB9AC\uBC0D", "\uB3D9\uC2DC\uC1A1\uCD9C", "obs", "\uC1A1\uCD9C"]
};
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
var PURPOSE_TO_USAGE = {
  gaming: "\uAC8C\uC774\uBC0D",
  office: "\uC0AC\uBB34/\uB514\uC790\uC778",
  editing: "\uC601\uC0C1\uD3B8\uC9D1",
  "3d": "3D \uBAA8\uB378\uB9C1",
  ai: "AI/\uB525\uB7EC\uB2DD",
  ai_study: "AI/\uB525\uB7EC\uB2DD",
  local_llm: "AI/\uB525\uB7EC\uB2DD",
  streaming: "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D"
};
var WIZARD_BUDGET_TO_RANGE = {
  budget_under100: "100\uB9CC \uC6D0 \uC774\uD558",
  budget_100_200: "100~200\uB9CC \uC6D0",
  budget_200_300: "200~300\uB9CC \uC6D0",
  budget_over300: "300\uB9CC \uC6D0 \uC774\uC0C1"
};
var DESIGN_TO_COLOR = {
  black: "\uBE14\uB799",
  white: "\uD654\uC774\uD2B8",
  rgb: null
};
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

// js/filter.js
var GAME_ALIASES2 = {
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
var USAGE_ALIASES2 = {
  "\uAC8C\uC774\uBC0D": ["\uAC8C\uC774\uBC0D"],
  "\uC0AC\uBB34/\uB514\uC790\uC778": ["\uC0AC\uBB34/\uB514\uC790\uC778", "\uC0AC\uBB34\uC6A9", "\uC0AC\uBB34", "\uC624\uD53C\uC2A4", "\uC5C5\uBB34"],
  "\uC601\uC0C1\uD3B8\uC9D1": ["\uC601\uC0C1\uD3B8\uC9D1", "\uC601\uC0C1 \uD3B8\uC9D1", "\uD504\uB9AC\uBBF8\uC5B4", "\uC560\uD504\uD130\uC774\uD399\uD2B8", "\uC5D0\uD399", "\uD3B8\uC9D1"],
  "3D \uBAA8\uB378\uB9C1": ["3d \uBAA8\uB378\uB9C1", "3d/\uBAA8\uB378\uB9C1", "3d", "\uBAA8\uB378\uB9C1", "cad", "\uBE14\uB80C\uB354", "\uC2A4\uCF00\uCE58\uC5C5", "\uB80C\uB354\uB9C1", "maya"],
  "AI/\uB525\uB7EC\uB2DD": ["ai/\uB525\uB7EC\uB2DD", "ai", "\uB525\uB7EC\uB2DD", "\uBA38\uC2E0\uB7EC\uB2DD", "\uC0DD\uC131\uD615"],
  "\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D": ["\uBC29\uC1A1/\uC2A4\uD2B8\uB9AC\uBC0D", "\uBC29\uC1A1\xB7\uC2A4\uD2B8\uB9AC\uBC0D", "\uBC29\uC1A1", "\uC2A4\uD2B8\uB9AC\uBC0D", "\uB3D9\uC2DC\uC1A1\uCD9C", "obs", "\uC1A1\uCD9C"]
};
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
  bestFor: null,
  // "AI 공부용" | "로컬 LLM 입문" | "QHD 게이밍" | ...
  search: ""
};
var MIN_INSTALLMENT_TOTAL = 8e5;
var MIN_INSTALLMENT_MONTHLY = 3e4;
var MIN_IMPLIED_INSTALLMENT_FOR_BAND = 5e5;
var TIER_INSTALLMENT_BUDGET_FLOOR = {
  "\uD558\uC774\uC5D4\uB4DC(4K)": 2e6
};
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
var HIGH_END_GAMES = ["\uB85C\uC2A4\uD2B8\uC544\uD06C", "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", "\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784", "\uC624\uBC84\uC6CC\uCE582"];
var SOLD_OUT_PRODUCT_IDS = ["2741770843"];
var MIN_PC_PRICE = 5e5;
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
var NON_GAMING_PURPOSES = ["office", "editing", "3d", "ai", "streaming", "ai_study", "local_llm"];
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
var PURPOSE_TO_USAGE2 = {
  gaming: "\uAC8C\uC774\uBC0D",
  office: "\uC0AC\uBB34/\uB514\uC790\uC778",
  editing: "\uC601\uC0C1\uD3B8\uC9D1",
  "3d": "3D \uBAA8\uB378\uB9C1",
  ai: "AI/\uB525\uB7EC\uB2DD",
  ai_study: "AI/\uB525\uB7EC\uB2DD",
  local_llm: "AI/\uB525\uB7EC\uB2DD",
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

// js/card-text-generator.js
var GROUP_TO_SECTION = {
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
      <a href="${product.url}" target="_blank" rel="noopener noreferrer"
         class="relative overflow-hidden h-52 bg-[#0d1117] flex-shrink-0 flex items-center justify-center block cursor-pointer">
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
      </a>

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
          <h3 class="text-sm font-bold leading-snug line-clamp-2">
            <a href="${product.url}" target="_blank" rel="noopener noreferrer"
               class="text-white hover:text-accent transition-colors duration-200">${product.name}</a>
          </h3>
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
var FLAT_PAGE_SIZE = 12;
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
      <a href="${product.url}" target="_blank" rel="noopener noreferrer"
         class="relative overflow-hidden h-56 bg-[#0d1117] flex-shrink-0 flex items-center justify-center block cursor-pointer">
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
      </a>

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
          <h3 class="text-base font-bold leading-snug">
            <a href="${product.url}" target="_blank" rel="noopener noreferrer"
               class="text-white hover:text-accent transition-colors duration-200">${product.name}</a>
          </h3>
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
var GROUPS = [
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
var CARDS_PER_GROUP = 3;
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

export {
  filterState,
  isInStock,
  isReasonableInstallmentPrice,
  filterProducts,
  getWizardRecommendations,
  resetFilters,
  renderProductGrid,
  buildLoadMoreSkeleton,
  renderWizardResultCard,
  renderGroupedView
};
