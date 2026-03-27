/**
 * recommendation_reasons.js — 사용자 선택값 + 상품 메타만으로 추천 이유(태그·요약) 생성
 * API 호출 없음, 증명 가능한 조건만 사용
 */

import { PRICE_RANGES } from './utils.js';

/** filter.js GAME_ALIASES와 동일한 정규화(순환 import 방지) */
const GAME_ALIASES = {
  '몬스터헌터 와일드': ['몬헌', '몬스터헌터', '몬스터헌터 와일드', 'MH', 'Wilds', '몬스터헌터와일드'],
  '리그오브레전드': ['리그오브레전드', '롤', 'LOL'],
  '배틀그라운드': ['배틀그라운드', '배그', 'PUBG'],
  '로스트아크': ['로스트아크', '로아'],
  '스팀 AAA급 게임': ['스팀 AAA급 게임', '스팀 AAA', 'AAA'],
  '발로란트': ['발로란트', '발로'],
  '오버워치2': ['오버워치2', '오버워치']
};

function resolveGameToCanonical(input) {
  if (!input || typeof input !== 'string') return input || '';
  const s = String(input).trim();
  for (const [canonical, aliases] of Object.entries(GAME_ALIASES)) {
    if (aliases.some(a => a.toLowerCase() === s.toLowerCase())) return canonical;
  }
  return s;
}

/** filter.js USAGE_ALIASES와 동일 (순환 import 방지) */
const USAGE_ALIASES = {
  게이밍: ['게이밍'],
  '사무/디자인': ['사무/디자인', '사무용', '사무', '오피스', '업무'],
  영상편집: ['영상편집', '영상 편집', '프리미어', '애프터이펙트', '에펙', '편집'],
  '3D 모델링': ['3d 모델링', '3d/모델링', '3d', '모델링', 'cad', '블렌더', '스케치업', '렌더링', 'maya'],
  'AI/딥러닝': ['ai/딥러닝', 'ai', '딥러닝', '머신러닝', '생성형'],
  '방송/스트리밍': ['방송/스트리밍', '방송·스트리밍', '방송', '스트리밍', '동시송출', 'obs', '송출']
};

function canonicalizeUsage(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(USAGE_ALIASES)) {
    if (
      aliases.some(
        a => s.includes(String(a).toLowerCase()) || String(a).toLowerCase().includes(s)
      )
    ) {
      return canonical;
    }
  }
  return null;
}

function inferUsageFromText(text) {
  const hits = new Set();
  const t = String(text || '').toLowerCase();
  for (const [canonical, aliases] of Object.entries(USAGE_ALIASES)) {
    if (aliases.some(a => t.includes(String(a).toLowerCase()))) {
      hits.add(canonical);
    }
  }
  return hits;
}

/** normalizeProduct와 동일한 usage 태그 집합 (필터와 동일 근거) */
function getProductUsageTags(product) {
  const tags = new Set();
  (product.categories?.usage || []).forEach(u => {
    const c = canonicalizeUsage(u);
    if (c) tags.add(c);
  });
  const usageText = [
    product.name || '',
    product.subtitle || '',
    product.specs?.cpu || '',
    product.specs?.gpu || '',
    product.specs?.ram || '',
    product.specs?.ssd || ''
  ].join(' ');
  inferUsageFromText(usageText).forEach(u => tags.add(u));
  return tags;
}

function usageSelectionMatches(selectedUsage, product) {
  if (!selectedUsage) return false;
  const tags = getProductUsageTags(product);
  if (tags.has(selectedUsage)) return true;
  const c = canonicalizeUsage(selectedUsage);
  return !!(c && tags.has(c));
}

const PURPOSE_TO_USAGE = {
  gaming: '게이밍',
  office: '사무/디자인',
  editing: '영상편집',
  '3d': '3D 모델링',
  ai: 'AI/딥러닝',
  ai_study: 'AI/딥러닝',
  local_llm: 'AI/딥러닝',
  streaming: '방송/스트리밍'
};

const WIZARD_BUDGET_TO_RANGE = {
  budget_under100: '100만 원 이하',
  budget_100_200: '100~200만 원',
  budget_200_300: '200~300만 원',
  budget_over300: '300만 원 이상'
};

const DESIGN_TO_COLOR = {
  black: '블랙',
  white: '화이트',
  rgb: null
};

function matchesRgbStyle(product) {
  const text = [
    product?.name || '',
    product?.specs?.case || '',
    product?.specs?.ram || '',
    product?.specs?.gpu || ''
  ].join(' ').toLowerCase();
  return /(argb|rgb|icue|aura|sync)/i.test(text);
}

function productMatchesPriceRange(product, rangeKey) {
  const range = PRICE_RANGES[rangeKey];
  if (!range || product.price == null) return false;
  return product.price >= range.min && product.price < range.max;
}

function productPriceRangeLabelMatch(product, rangeKey) {
  return product.categories?.price_range === rangeKey;
}

function shortGameTag(game) {
  const map = {
    배틀그라운드: '배그',
    리그오브레전드: '롤',
    로스트아크: '로아',
    '스팀 AAA급 게임': 'AAA',
    발로란트: '발로',
    오버워치2: 'OW2',
    '몬스터헌터 와일드': '몬헌',
    아이온2: '아이온2'
  };
  return map[game] || (String(game).length > 7 ? String(game).slice(0, 6) : game);
}

function tierShortLabel(tier) {
  if (tier === '가성비(FHD)') return 'FHD 티어';
  if (tier === '퍼포먼스(QHD)') return 'QHD 티어';
  if (tier === '하이엔드(4K)') return '4K 티어';
  return null;
}

function usageShortTag(usage) {
  if (usage === '게이밍') return '게이밍';
  if (usage === '영상편집') return '영상편집';
  if (usage === 'AI/딥러닝') return 'AI';
  if (usage === '사무/디자인') return '사무·디자인';
  if (usage === '3D 모델링') return '3D';
  if (usage === '방송/스트리밍') return '방송';
  return usage ? String(usage).slice(0, 8) : '';
}

/**
 * 메인 그리드 필터 상태 → 추천 이유 입력
 */
export function userSelectionsFromFilterState(fs) {
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
    game: typeof fs.game === 'string' && fs.game.trim() ? fs.game : null,
    usage: fs.usage || null,
    priceRange: fs.priceRange || null,
    tier: fs.tier || null,
    caseColor: fs.caseColor || null,
    design: null,
    installment: fs.installment != null ? fs.installment : null,
    purpose: null
  };
}

/**
 * 위자드 selections → 동일 스키마
 */
export function userSelectionsFromWizard(selections) {
  if (!selections) return userSelectionsFromFilterState(null);
  const { purpose, game, budget, design } = selections;
  const usage = PURPOSE_TO_USAGE[purpose] || null;
  const gameCanon =
    purpose === 'gaming' && game ? resolveGameToCanonical(game) : null;
  return {
    game: gameCanon,
    usage,
    priceRange: WIZARD_BUDGET_TO_RANGE[budget] || null,
    tier: null,
    caseColor: design ? DESIGN_TO_COLOR[design] ?? null : null,
    design: design || null,
    installment: null,
    purpose: purpose || null
  };
}

/**
 * 그룹 섹션(홈) 맥락
 */
export function userSelectionsFromGroup(group) {
  if (!group) return userSelectionsFromFilterState(null);
  if (group.key === 'installment') {
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
  if (group.key === 'usage') {
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
  if (group.key === 'bestFor') {
    const val = String(group.value);
    const BESTFOR_MAP = {
      'AI 공부용':     { usage: 'AI/딥러닝', purpose: 'ai_study' },
      '로컬 LLM 입문': { usage: 'AI/딥러닝', purpose: 'local_llm' },
      'QHD 게이밍':    { usage: '게이밍', tier: '퍼포먼스(QHD)' },
      '4K 게이밍':     { usage: '게이밍', tier: '하이엔드(4K)' },
      '화이트 감성':   { design: 'white', caseColor: '화이트' },
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
  return !!(
    us.game ||
    us.usage ||
    us.priceRange ||
    us.tier ||
    us.caseColor ||
    us.design ||
    us.installment != null
  );
}

/** 카탈로그 badge 필드만 사용(빈값·플레이스홀더 제외), 태그용으로만 짧게 */
function badgeToReasonTag(product) {
  const raw = product?.badge;
  if (typeof raw !== 'string') return null;
  const t = raw.replace(/^\s*✦\s*/u, '').trim();
  if (t.length < 2) return null;
  if (/^[-–—.\s]+$/.test(t)) return null;
  if (t.length > 14) return `${t.slice(0, 13)}…`;
  return t;
}

/**
 * @param {Object} product
 * @param {ReturnType<typeof userSelectionsFromFilterState>} userSelections
 * @returns {{ reasonTags: string[], reasonSummary: string }}
 */
export function buildRecommendationReasons(product, userSelections) {
  const us = userSelections || userSelectionsFromFilterState(null);
  const cats = product?.categories || {};
  const games = Array.isArray(cats.games) ? cats.games : [];
  const gameCanonSet = new Set(games.map(g => resolveGameToCanonical(g)));
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
    scored.push({ p: 1, tag: `${shortGameTag(selGameCanon)} 태그 포함` });
  }

  const usageCanon = us.usage ? canonicalizeUsage(us.usage) || us.usage : null;
  if (usageCanon && usageSelectionMatches(us.usage, product)) {
    if (usageCanon === '게이밍') scored.push({ p: 2, tag: '게이밍 용도 부합' });
    else if (usageCanon === '영상편집') scored.push({ p: 2, tag: '편집 용도 부합' });
    else if (usageCanon === 'AI/딥러닝') scored.push({ p: 2, tag: 'AI 용도 부합' });
    else if (usageCanon === '사무/디자인') scored.push({ p: 2, tag: '사무·디자인 부합' });
    else if (usageCanon === '3D 모델링') scored.push({ p: 2, tag: '3D 용도 부합' });
    else if (usageCanon === '방송/스트리밍') scored.push({ p: 2, tag: '방송·스트리밍 부합' });
    else scored.push({ p: 2, tag: '선택 용도 부합' });
  }

  if (us.priceRange) {
    if (productMatchesPriceRange(product, us.priceRange)) {
      scored.push({ p: 3, tag: '예산 구간 부합' });
    } else if (productPriceRangeLabelMatch(product, us.priceRange)) {
      scored.push({ p: 3, tag: '가격대 태그 일치' });
    }
  }

  if (us.tier && productTier === us.tier) {
    scored.push({ p: 4, tag: '티어 조건 일치' });
  }

  if (us.design === 'rgb' && matchesRgbStyle(product)) {
    scored.push({ p: 5, tag: 'RGB 스펙' });
  } else if (us.design === 'black' && product.case_color === '블랙') {
    scored.push({ p: 5, tag: '블랙 케이스 일치' });
  } else if (us.design === 'white' && product.case_color === '화이트') {
    scored.push({ p: 5, tag: '화이트 케이스 일치' });
  } else if (us.caseColor && product.case_color === us.caseColor) {
    scored.push({ p: 5, tag: `${us.caseColor} 케이스 일치` });
  }

  if (us.installment != null && Number(product.installment_months) === Number(us.installment)) {
    scored.push({ p: 6, tag: `${us.installment}개월 무이자` });
  }

  if (structured && product.in_stock === true) {
    scored.push({ p: 7, tag: '재고 보유' });
  }

  scored.sort((a, b) => a.p - b.p);

  const meta = [];
  const tl = tierShortLabel(productTier);
  if (tl) meta.push({ p: 10, tag: tl });
  const primaryUsage =
    [...usageTags].find(u => u === '게이밍') ||
    [...usageTags].find(u => u !== '게이밍') ||
    usages[0];
  const uCanon = primaryUsage ? canonicalizeUsage(primaryUsage) || primaryUsage : null;
  if (uCanon === '게이밍') meta.push({ p: 11, tag: '게이밍 견적' });
  else if (uCanon === '영상편집') meta.push({ p: 11, tag: '영상 작업 견적' });
  else if (uCanon === 'AI/딥러닝') meta.push({ p: 11, tag: 'AI 작업 견적' });
  else if (uCanon === '사무/디자인') meta.push({ p: 11, tag: '사무·디자인 견적' });
  else if (uCanon === '3D 모델링') meta.push({ p: 11, tag: '3D 작업 견적' });
  else if (uCanon === '방송/스트리밍') meta.push({ p: 11, tag: '방송·스트리밍 견적' });
  meta.sort((a, b) => a.p - b.p);

  const tags = [];
  const seen = new Set();
  for (const row of [...scored, ...meta]) {
    if (tags.length >= 2) break;
    if (!row.tag || seen.has(row.tag)) continue;
    seen.add(row.tag);
    tags.push(row.tag);
  }

  // v2 best_for_tags 활용: 아직 태그가 부족하면 보강
  const v2Bft = product.v2?.best_for_tags || [];
  if (tags.length < 2 && v2Bft.length > 0) {
    for (const bft of v2Bft) {
      if (tags.length >= 2) break;
      if (!seen.has(bft)) { seen.add(bft); tags.push(bft); }
    }
  }

  if (tags.length === 0) {
    if (tl) tags.push(tl);
    else if (product.case_color) tags.push(`${product.case_color} 케이스`);
    if (tags.length === 0 && product.in_stock === true) tags.push('재고 보유');
  }
  if (tags.length === 0) {
    return { reasonTags: [], reasonSummary: '' };
  }

  const reasonTags = tags.slice(0, 2);

  const summaryParts = [];
  if (selGameCanon && gameCanonSet.has(selGameCanon)) {
    summaryParts.push(`${shortGameTag(selGameCanon)} 기준`);
  }
  if (usageCanon && usageSelectionMatches(us.usage, product)) {
    summaryParts.push(usageShortTag(usageCanon));
  }
  if (
    us.priceRange &&
    (productMatchesPriceRange(product, us.priceRange) ||
      productPriceRangeLabelMatch(product, us.priceRange))
  ) {
    summaryParts.push(us.priceRange.replace(/\s/g, ''));
  }
  if (us.tier && productTier === us.tier) summaryParts.push(tierShortLabel(us.tier) || us.tier);
  if (
    (us.design === 'white' && product.case_color === '화이트') ||
    (us.design === 'black' && product.case_color === '블랙') ||
    (us.design === 'rgb' && matchesRgbStyle(product))
  ) {
    if (us.design === 'rgb') summaryParts.push('RGB');
    else summaryParts.push(`${product.case_color} 케이스`);
  }

  let reasonSummary = '';
  if (summaryParts.length > 0) {
    reasonSummary = `${summaryParts.join('·')}에 맞는 구성`;
  } else if (tl || uCanon) {
    const tail = [tl, uCanon ? usageShortTag(uCanon) : ''].filter(Boolean).join('·');
    reasonSummary = tail ? `${tail} 중심 견적` : '';
  }

  if (reasonSummary.length > 40) {
    reasonSummary = `${reasonSummary.slice(0, 37)}…`;
  }

  return { reasonTags: reasonTags, reasonSummary };
}
