/**
 * render.js - 제품 카드 및 UI 렌더링
 */

import {
  formatPrice,
  getBadgeClass,
  getExpectedFps,
  getProductGameFpsHighlights,
  KAKAO_CONSULT_CHAT_URL,
  buildMonthlyPaymentHint
} from './utils.js';
import {
  buildRecommendationReasons,
  userSelectionsFromFilterState,
  userSelectionsFromGroup
} from './recommendation_reasons.js';
import {
  generateSummary,
  generateSellingPoints,
  groupToSectionKey,
  filterToSectionKey
} from './card-text-generator.js';
import { buildProductAnalyticsMeta } from './analytics.js';

function escapeAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderPurchaseConfidenceStrip(product, { compact = false } = {}) {
  const shippingText = compact ? '순차 출고 안내' : '평일 주문 기준 순차 출고 안내';
  const installmentText =
    (product.installment_months || 0) === 24 || (product.installment_months || 0) === 36
      ? `${product.installment_months}개월 무이자`
      : '24/36개월 가능';
  const items = [
    '오늘 상담 가능',
    '부품 변경 상담 가능',
    '1년 무상 A/S',
    installmentText,
    shippingText
  ];

  return `
        <div class="purchase-confidence ${compact ? 'purchase-confidence--compact' : ''}">
          ${items.map(item => `<span class="purchase-confidence__item">${item}</span>`).join('')}
        </div>`;
}

function renderCardConsultRow(size = 'default', product = null, sourceSection = 'default') {
  const linkCls =
    size === 'wizard'
      ? 'text-xs font-semibold text-[#FEE500]/90 hover:text-[#FEE500] underline decoration-[#FEE500]/35 underline-offset-2'
      : 'text-[11px] sm:text-xs font-semibold text-[#FEE500]/90 hover:text-[#FEE500] underline decoration-[#FEE500]/35 underline-offset-2';
  const meta = buildProductAnalyticsMeta(product);
  const analyticsAttrs = [
    'data-track-click="consult"',
    `data-source-section="${escapeAttr(sourceSection)}"`,
    meta.product_id ? `data-product-id="${escapeAttr(meta.product_id)}"` : '',
    meta.product_name ? `data-product-name="${escapeAttr(meta.product_name)}"` : '',
    meta.category ? `data-category="${escapeAttr(meta.category)}"` : '',
    meta.price_band ? `data-price-band="${escapeAttr(meta.price_band)}"` : ''
  ]
    .filter(Boolean)
    .join(' ');
  return `
        <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1">
          <a href="${KAKAO_CONSULT_CHAT_URL}" target="_blank" rel="noopener noreferrer"
             ${analyticsAttrs}
             class="inline-flex items-center ${linkCls} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FEE500]/45 rounded px-0.5 -mx-0.5"
             aria-label="카카오톡 24시간 상담, 새 창">
            24시간 카톡 상담
          </a>
          <span class="text-[10px] text-gray-600 hidden sm:inline">지금 상담 가능</span>
        </div>`;
}

function renderInstallmentPolicyLine(product, { marginClass = 'mt-0.5' } = {}) {
  const badge = String(product.badge || '').trim();
  if (badge.includes('개월')) {
    return `<p class="text-xs text-purple-400 font-semibold ${marginClass}">${badge}</p>`;
  }
  return `<p class="text-xs text-purple-400 font-semibold ${marginClass}">${product.installment_months}개월 기준</p>`;
}

function renderProductPriceStack(product) {
  const hint = buildMonthlyPaymentHint(product);
  const isInstallment = (product.installment_months || 0) > 0 && (product.price_monthly || 0) > 0;

  if (isInstallment) {
    return `
            <p class="text-[10px] font-semibold text-gray-500 tracking-wide">월 할부가</p>
            ${renderInstallmentPolicyLine(product)}
            <p class="text-2xl font-black text-white tracking-tight">${product.price_display}</p>
            <p class="text-xs text-gray-500 mt-0.5">총 ${Math.round((product.price || 0) / 10000)}만 원</p>`;
  }

  return `
            <p class="text-[10px] font-semibold text-gray-500 tracking-wide">판매가</p>
            <p class="text-2xl font-black text-white tracking-tight">${product.price_display}</p>
            ${
              hint
                ? `<p class="text-xs text-gray-300 font-semibold mt-1 leading-snug">${hint.primary}</p>
                   <p class="text-[10px] text-gray-600 mt-0.5">${hint.disclaimer}</p>`
                : ''
            }`;
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
              <p class="text-[10px] font-semibold text-gray-500 tracking-wide">월 할부가</p>
              <p class="text-3xl font-black text-white tracking-tight leading-snug">${product.price_display}
                <span class="block text-sm font-bold text-gray-400 mt-1 sm:inline sm:mt-0 sm:ml-2">
                  (${months}개월 · 총 ${totalLabel})
                </span>
              </p>`;
  }

  return `
              <p class="text-[10px] font-semibold text-gray-500 tracking-wide">견적가</p>
              <p class="text-xs text-gray-500 mb-0.5">기본 사양 · 총액</p>
              <p class="text-3xl font-black text-white tracking-tight">${product.price_display}</p>
              ${
                hint
                  ? `<p class="text-sm text-gray-300 font-semibold mt-1 leading-snug">${hint.primary}</p>
                     <p class="text-[11px] text-gray-600 mt-0.5">${hint.disclaimer}</p>`
                  : ''
              }`;
}

function renderRecReasonsBlock(rec, { wizard = false } = {}) {
  const { reasonTags = [], reasonSummary = '' } = rec || {};
  if (!reasonTags.length && !reasonSummary) return '';

  const tagBase =
    'inline-flex max-w-full items-center rounded-md border border-accent/25 bg-accent/10 px-2 py-0.5 font-semibold text-gray-200';
  const tagCls = wizard ? `${tagBase} text-[11px]` : `${tagBase} text-[10px]`;

  const tagsHtml = reasonTags
    .slice(0, 2)
    .map(
      t => `
    <span class="${tagCls} truncate" title="${t}">${t}</span>`
    )
    .join('');

  const summaryCls = wizard
    ? 'mt-1.5 text-xs text-gray-300/95 leading-snug line-clamp-1'
    : 'mt-1.5 text-[11px] text-gray-400 leading-snug line-clamp-1';

  return `
        <div class="rec-reasons mt-2 w-full min-w-0" data-rec-reasons>
          <div class="flex flex-wrap gap-1.5">${tagsHtml}</div>
          ${reasonSummary ? `<p class="${summaryCls}">${reasonSummary}</p>` : ''}
        </div>`;
}

function getSelectedGameSummary(product, selectedGame, fpsData) {
  const result = selectedGame
    ? getExpectedFps(product, selectedGame, fpsData)
    : null;
  if (!result) return null;

  return {
    fpsText: result.fpsText,
    summaryText: result.summaryText
  };
}

/**
 * 제품 카드 HTML 생성
 * @param {Object} product - 제품 데이터
 * @param {string|null} selectedGame - 위자드에서 선택한 게임 (FPS 표시용)
 * @param {Object|null} fpsData - fps_reference.json 데이터
 * @param {{ reasonTags: string[], reasonSummary: string }|null} recommendationReasons - 사전 계산된 추천 이유
 * @returns {string} HTML 문자열
 */
function renderProductCard(
  product,
  selectedGame = null,
  fpsData = null,
  recommendationReasons = null,
  sectionKey = 'default',
  thumbAttrs = null
) {
  const imgLoading = thumbAttrs?.loading || 'lazy';
  const imgFetchPriority = thumbAttrs?.fetchPriority || 'low';
  const badgeClass = getBadgeClass(product.badge_color);
  const analyticsMeta = buildProductAnalyticsMeta(product);
  const gameSummary = getSelectedGameSummary(product, selectedGame, fpsData);
  const fpsText = gameSummary?.fpsText || null;
  const gameHighlights = getProductGameFpsHighlights(product, selectedGame ? 3 : 4, selectedGame ? [selectedGame] : []);

  const tierBadge = {
    '가성비(FHD)': { label: 'FHD', cls: 'text-emerald-400 bg-emerald-400/10' },
    '퍼포먼스(QHD)': { label: 'QHD', cls: 'text-blue-400 bg-blue-400/10' },
    '하이엔드(4K)': { label: '4K', cls: 'text-purple-400 bg-purple-400/10' }
  };
  const tier = tierBadge[product.categories.tier] || { label: 'FHD', cls: 'text-gray-400 bg-gray-400/10' };
  const v2 = product.v2 || null;
  const v2Badges = v2?.display_badges || [];
  const summaryReason = generateSummary(product, sectionKey) || v2?.summary_reason || '';
  const sellingPts = generateSellingPoints(product, sectionKey);
  if (sellingPts.length === 0 && v2?.selling_points?.length) sellingPts.push(...v2.selling_points.slice(0, 4));

  return `
    <article class="product-card fade-in-up group relative bg-card border border-white/5 rounded-2xl overflow-hidden
                    hover:border-accent/40 hover:shadow-[0_0_30px_rgba(233,69,96,0.15)] transition-all duration-300
                    flex flex-col"
             data-id="${product.id}"
             data-source-section="${escapeAttr(sectionKey)}"
             data-category="${escapeAttr(analyticsMeta.category || '')}"
             data-price-band="${escapeAttr(analyticsMeta.price_band || '')}">
      <!-- 썸네일 (클릭 → 상세 드로어) -->
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
        <!-- 품질 티어 뱃지 -->
        <span class="absolute top-3 left-3 px-2 py-0.5 rounded-md text-xs font-bold ${tier.cls}">
          ${tier.label}
        </span>
        <!-- 케이스 색상 -->
        <span class="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-white/20 ${product.case_color === '화이트' ? 'bg-white' : 'bg-gray-800'}"
              title="${product.case_color || ''} 케이스"></span>
        <!-- 썸네일 클릭 트리거 -->
        <button class="product-card__thumb-btn" data-open-detail="${escapeAttr(product.id)}" aria-label="${escapeAttr(product.name)} 상세 보기" tabindex="-1"></button>
      </div>

      <!-- 콘텐츠 -->
      <div class="flex flex-col flex-1 p-5 gap-3">
        <!-- 배지 + 제품명 -->
        <div>
          ${v2Badges.length > 0 ? `
          <div class="flex flex-wrap gap-1.5 mb-2">
            ${v2Badges.slice(0, 4).map(b => `<span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border border-accent/25 bg-accent/10 text-gray-200">${b}</span>`).join('')}
          </div>` : (product.badge ? `
          <span class="inline-block px-2 py-0.5 rounded-md text-xs font-semibold border mb-2 ${badgeClass}">
            ${product.badge}
          </span>` : '')}
          ${gameSummary ? `
          <p class="text-[11px] font-semibold text-accent mb-1">${gameSummary.summaryText}</p>` : ''}
          <button class="product-card__name-btn text-sm font-bold leading-snug line-clamp-2" data-open-detail="${escapeAttr(product.id)}">${product.name}</button>
          <p class="text-xs text-gray-400 mt-1">${product.subtitle || ''}</p>
          ${summaryReason ? `<p class="text-[11px] text-emerald-400/80 mt-1.5 leading-snug line-clamp-2">${summaryReason}</p>` : ''}
          ${renderRecReasonsBlock(recommendationReasons, { wizard: false })}
          ${gameHighlights.length ? `
          <div class="flex flex-wrap gap-1.5 mt-2">
            ${gameHighlights.map(item => `
            <span class="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-gray-300">
              ${item.summaryText}
            </span>`).join('')}
          </div>` : ''}
          ${sellingPts.length > 0 ? `
          <div class="flex flex-wrap gap-1 mt-2">
            ${sellingPts.slice(0, 3).map(sp => `<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 text-gray-400 border border-white/5">${sp}</span>`).join('')}
          </div>` : ''}
        </div>

        <!-- 스펙 정보 -->
        <div class="grid grid-cols-1 gap-1.5">
          ${renderSpecRow('cpu', product.specs.cpu_short || product.specs.cpu)}
          ${renderSpecRow('gpu', product.specs.gpu_short || product.specs.gpu)}
          ${renderSpecRow('ram', product.specs.ram)}
          ${renderSpecRow('ssd', product.specs.ssd)}
        </div>

        <!-- FPS 배지 (위자드 선택 시) -->
        ${fpsText ? `
        <div class="fps-badge flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
          <svg class="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span class="text-xs text-accent font-semibold">
            ${selectedGame} ${fpsText}
          </span>
        </div>` : ''}

        <!-- 가격 + CTA + 상담 -->
        <div class="mt-auto pt-3 border-t border-white/5 flex flex-col gap-2">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              ${renderProductPriceStack(product)}
            </div>
            <a href="${product.url}"
               data-track-click="product"
               data-source-section="${escapeAttr(sectionKey)}"
               data-product-id="${escapeAttr(analyticsMeta.product_id || '')}"
               data-product-name="${escapeAttr(analyticsMeta.product_name || '')}"
               data-category="${escapeAttr(analyticsMeta.category || '')}"
               data-price-band="${escapeAttr(analyticsMeta.price_band || '')}"
               class="flex-shrink-0 self-center px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-semibold
                      rounded-xl transition-colors duration-200 whitespace-nowrap">
              구매하기
            </a>
          </div>
          ${renderPurchaseConfidenceStrip(product, { compact: true })}
          ${renderCardConsultRow('default', product, sectionKey)}
        </div>
      </div>
    </article>
  `;
}

/**
 * 스펙 행 렌더링
 */
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

  const labels = { cpu: 'CPU', gpu: 'GPU', ram: 'RAM', ssd: 'SSD' };
  const colors = {
    cpu: 'text-orange-400',
    gpu: 'text-green-400',
    ram: 'text-blue-400',
    ssd: 'text-purple-400'
  };

  return `
    <div class="flex items-center gap-2 text-xs">
      <svg class="w-3.5 h-3.5 ${colors[type]} flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        ${icons[type]}
      </svg>
      <span class="text-gray-500 font-medium w-6">${labels[type]}</span>
      <span class="text-gray-300 truncate">${value || '-'}</span>
    </div>
  `;
}

/**
 * 제품 그리드 렌더링
 * @param {HTMLElement} container - 렌더링할 컨테이너
 * @param {Array} products - 필터링된 제품 배열
 * @param {string|null} selectedGame - 선택한 게임
 * @param {Object|null} fpsData - FPS 참조 데이터
 * @param {Object|null} filterState - 필터 상태(추천 이유 1회 계산용, 선택)
 */
const FLAT_PAGE_SIZE = 12;

function forceShowCards(container) {
  container.querySelectorAll('.fade-in-up').forEach((el) => {
    el.classList.add('visible');
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
}

function renderProductGrid(container, products, selectedGame = null, fpsData = null, filterState = null) {
  if (!container) return;

  container._flatProducts = products;
  container._flatSelectedGame = selectedGame;
  container._flatFpsData = fpsData;
  container._flatFilterState = filterState;

  const userSel = userSelectionsFromFilterState(filterState);
  const sectionKey = filterToSectionKey(filterState);

  if (products.length === 0) {
    container.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <svg class="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-gray-400 text-lg font-medium">해당 조건의 제품이 없습니다</p>
        <p class="text-gray-600 text-sm mt-1">필터를 변경하거나 맞춤 상담을 요청해 보세요</p>
        <div class="flex gap-3 mt-4">
          <button onclick="window.resetAllFilters()"
                  class="px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent text-sm rounded-lg transition-colors">
            필터 초기화
          </button>
          <a href="${KAKAO_CONSULT_CHAT_URL}" target="_blank" rel="noopener noreferrer"
             data-track-click="consult" data-source-section="empty_state_consult"
             class="px-4 py-2 bg-[#FEE500]/20 hover:bg-[#FEE500]/30 text-[#FEE500] text-sm rounded-lg transition-colors">
            맞춤 견적 상담
          </a>
        </div>
      </div>
    `;
    return;
  }

  // 초기 노출: FLAT_PAGE_SIZE 개, 이후 더보기
  let visibleCount = parseInt(container.dataset.visibleCount || FLAT_PAGE_SIZE);
  const visible = products.slice(0, visibleCount);
  const remaining = products.length - visibleCount;

  container.dataset.visibleCount = visibleCount;

  container.innerHTML = visible
    .map(p => renderProductCard(p, selectedGame, fpsData, buildRecommendationReasons(p, userSel), sectionKey))
    .join('');

  // 더보기 버튼
  if (remaining > 0) {
    const loadMoreEl = document.createElement('div');
    loadMoreEl.className = 'col-span-full flex justify-center pt-4 pb-2';
    loadMoreEl.innerHTML = `
      <button class="js-load-more flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10
                     border border-white/10 hover:border-accent/40 text-sm font-semibold
                     text-gray-300 hover:text-accent rounded-xl transition-all duration-200">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
        ${remaining}개 더 보기
      </button>
    `;
    container.appendChild(loadMoreEl);
  }

  // 일부 환경에서 IntersectionObserver가 누락되어 카드가 숨겨지는 문제 방지
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
  `).join('');
}

/**
 * 위자드 추천 결과 카드 (더 큰 레이아웃)
 */
function renderWizardResultCard(
  product,
  selectedGame,
  fpsData,
  matchReasons = [],
  recommendationReasons = null
) {
  let wizardInstallmentBadge = '';
  const analyticsMeta = buildProductAnalyticsMeta(product);
  const instM = product.installment_months | 0;
  const instMo = product.price_monthly | 0;
  if (instM > 0 && instMo > 0) {
    if (instM === 24) wizardInstallmentBadge = '24개월 무이자';
    else if (instM === 36) wizardInstallmentBadge = '36개월 무이자';
    else if (String(product.badge || '').includes('개월')) wizardInstallmentBadge = product.badge;
    else wizardInstallmentBadge = `${instM}개월 무이자`;
  }

  const badgeClass = getBadgeClass(product.badge_color);
  const gameSummary = getSelectedGameSummary(product, selectedGame, fpsData);
  const fpsText = gameSummary?.fpsText || null;
  const gameHighlights = getProductGameFpsHighlights(product, selectedGame ? 3 : 4, selectedGame ? [selectedGame] : []);

  const tierBadge = {
    '가성비(FHD)': { label: 'FHD 가성비', cls: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
    '퍼포먼스(QHD)': { label: 'QHD 퍼포먼스', cls: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
    '하이엔드(4K)': { label: '4K 하이엔드', cls: 'text-purple-400 border-purple-400/30 bg-purple-400/10' }
  };
  const tier = tierBadge[product.categories.tier] || { label: 'PC', cls: 'text-gray-400 border-gray-400/30 bg-gray-400/10' };
  const v2w = product.v2 || null;
  const v2wBadges = v2w?.display_badges || [];
  const v2wSelling = generateSellingPoints(product, 'default');
  if (v2wSelling.length === 0 && v2w?.selling_points?.length) v2wSelling.push(...v2w.selling_points.slice(0, 4));
  const v2wSummary = generateSummary(product, 'default') || v2w?.summary_reason || '';

  return `
    <article class="wizard-result-card group relative bg-card border border-white/5 rounded-2xl overflow-hidden
                    hover:border-accent/40 hover:shadow-[0_0_40px_rgba(233,69,96,0.2)] transition-all duration-300
                    flex flex-col"
             data-id="${product.id}"
             data-source-section="wizard_result"
             data-category="${escapeAttr(analyticsMeta.category || '')}"
             data-price-band="${escapeAttr(analyticsMeta.price_band || '')}">
      <!-- 상단 이미지 (클릭 → 상세 드로어) -->
      <div class="relative overflow-hidden h-56 bg-[#0d1117] flex-shrink-0 flex items-center justify-center">
        <img
          src="${product.thumbnail}"
          alt="${product.name}"
          class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 p-1"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/400x300/16213e/e94560?text=YJMOD'"
        />
        <button class="product-card__thumb-btn" data-open-detail="${escapeAttr(product.id)}" aria-label="${escapeAttr(product.name)} 상세 보기" tabindex="-1"></button>
        <div class="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent"></div>

        ${
          wizardInstallmentBadge
            ? `<span class="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold border border-purple-400/40 bg-purple-500/20 text-purple-100">
          ${wizardInstallmentBadge}
        </span>`
            : ''
        }
        <!-- 티어 뱃지 -->
        <span class="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold border ${tier.cls}">
          ${tier.label}
        </span>
      </div>

      <!-- 콘텐츠 -->
      <div class="flex flex-col flex-1 p-5 gap-4">
        <div>
          ${v2wBadges.length > 0 ? `
          <div class="flex flex-wrap gap-1.5 mb-2">
            ${v2wBadges.slice(0, 4).map(b => `<span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border border-accent/25 bg-accent/10 text-gray-200">${b}</span>`).join('')}
          </div>` : (product.badge ? `
          <span class="inline-block px-2 py-0.5 rounded-md text-xs font-semibold border mb-2 ${badgeClass}">
            ✦ ${product.badge}
          </span>` : '')}
          ${gameSummary ? `
          <p class="text-xs font-semibold text-accent mb-1">${gameSummary.summaryText}</p>` : ''}
          <button class="product-card__name-btn text-base font-bold leading-snug" data-open-detail="${escapeAttr(product.id)}">${product.name}</button>
          <p class="text-sm text-gray-400 mt-1">${product.subtitle || ''}</p>
          ${v2wSummary ? `<p class="text-xs text-emerald-400/80 mt-1.5 leading-snug line-clamp-2">${v2wSummary}</p>` : ''}
          ${gameHighlights.length ? `
          <div class="flex flex-wrap gap-1.5 mt-3">
            ${gameHighlights.map(item => `
            <span class="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-gray-300">
              ${item.summaryText}
            </span>`).join('')}
          </div>` : ''}
          ${v2wSelling.length > 0 ? `
          <div class="flex flex-wrap gap-1 mt-2">
            ${v2wSelling.slice(0, 4).map(sp => `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-gray-400 border border-white/5">${sp}</span>`).join('')}
          </div>` : ''}
        </div>

        <!-- 상세 스펙 -->
        <div class="bg-surface rounded-xl p-3 grid grid-cols-1 gap-2">
          ${renderSpecRow('cpu', product.specs.cpu || product.specs.cpu_short)}
          ${renderSpecRow('gpu', product.specs.gpu || product.specs.gpu_short)}
          ${renderSpecRow('ram', product.specs.ram)}
          ${renderSpecRow('ssd', product.specs.ssd)}
        </div>

        <!-- FPS 하이라이트 -->
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
            <p class="text-xs text-gray-400">${selectedGame} 예상 성능</p>
            <p class="text-lg font-black text-accent">${fpsText}</p>
          </div>
        </div>` : ''}

        <!-- 가격 + CTA + 상담 -->
        <div class="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              ${renderWizardPriceStack(product)}
            </div>
            <a href="${product.url}"
               data-track-click="product"
               data-source-section="wizard_result"
               data-product-id="${escapeAttr(analyticsMeta.product_id || '')}"
               data-product-name="${escapeAttr(analyticsMeta.product_name || '')}"
               data-category="${escapeAttr(analyticsMeta.category || '')}"
               data-price-band="${escapeAttr(analyticsMeta.price_band || '')}"
               class="flex-shrink-0 self-center px-5 py-3 bg-accent hover:bg-red-500 text-white font-bold
                      rounded-xl transition-colors duration-200 text-sm">
              견적 확인
            </a>
          </div>
          ${renderPurchaseConfidenceStrip(product)}
          ${renderCardConsultRow('wizard', product, 'wizard_result')}
        </div>
        ${renderRecReasonsBlock(recommendationReasons, { wizard: true })}
      </div>
    </article>
  `;
}

// ─── 그룹별 뷰 (기본 화면) ──────────────────────────────────────

const GROUPS = [
  { key: 'usage',       value: '게이밍',        label: '🎮 게이밍 PC',         desc: '게임 특화 최적화 견적' },
  { key: 'bestFor',     value: 'AI 공부용',     label: '🤖 AI 공부용 PC',     desc: 'AI 입문 · CUDA 학습 · 딥러닝 시작' },
  { key: 'bestFor',     value: '로컬 LLM 입문', label: '🧠 로컬 LLM 입문 PC', desc: '로컬 AI · LLM 추론 가능' },
  { key: 'usage',       value: '영상편집',       label: '🎬 영상편집 PC',       desc: '4K 편집 · 렌더링 특화' },
  { key: 'bestFor',     value: 'QHD 게이밍',    label: '🖥️ QHD 게이밍 PC',    desc: 'QHD 해상도 쾌적 게이밍' },
  { key: 'bestFor',     value: '4K 게이밍',     label: '🏆 4K 게이밍 PC',     desc: '4K UHD 최고 화질 게이밍' },
  { key: 'usage',       value: '사무/디자인',    label: '💼 사무 · 디자인 PC',  desc: '업무 · 문서 · 디자인 최적화' },
  { key: 'usage',       value: '3D 모델링',     label: '🎨 3D 모델링 PC',      desc: 'CAD · 블렌더 · 솔리드웍스' },
  { key: 'usage',       value: '방송/스트리밍',  label: '📺 방송 · 스트리밍 PC', desc: 'OBS · 원컴방송 · 라이브' },
  { key: 'bestFor',     value: '화이트 감성',   label: '🤍 화이트 감성 PC',    desc: '화이트 케이스 감성 추천' },
  { key: 'installment', value: 24,               label: '💳 24개월 무이자',      desc: '월 납부금으로 부담 없이' },
  { key: 'installment', value: 36,               label: '💳 36개월 무이자',      desc: '가장 낮은 월 납부금' },
];

const CARDS_PER_GROUP = 3;

/**
 * 스펙 기반 best_for_tags 추론 (DB에 태그가 없을 때 폴백)
 * GPU 모델명 + 가격 + usage로 카테고리를 자동 판별
 */
function inferBestForTags(product) {
  const gpu   = (product.specs?.gpu || product.specs?.gpu_short || '').toLowerCase();
  const price = product.price || 0;
  const usage = product.categories?.usage || [];
  const isWhite = product.tags?.design === 'white' ||
                  (product.specs?.case || '').includes('화이트');

  const tags = [];

  // 4K 게이밍: 최상위 GPU (RTX 5090, 5080, 4090, 4080)
  if (/rtx\s*5090|rtx\s*5080|rtx\s*4090|rtx\s*4080/.test(gpu)) {
    tags.push('4K 게이밍');
  }

  // QHD 게이밍: 상위 GPU (RTX 5070 Ti, 5070, 4070 Ti, RX 9070 XT)
  if (/rtx\s*5070|rtx\s*4070|rx\s*9070/.test(gpu) && !tags.includes('4K 게이밍')) {
    tags.push('QHD 게이밍');
  }

  // AI 공부용: AI 용도이고 비교적 저렴한 구성 (< 300만)
  if (usage.includes('AI/딥러닝') && price < 3000000) {
    tags.push('AI 공부용');
  }

  // 로컬 LLM 입문: AI 용도이고 RTX 5070 이상 또는 가격 300만 이상
  if (usage.includes('AI/딥러닝') && (price >= 3000000 || /rtx\s*5070|rtx\s*5080|rtx\s*5090/.test(gpu))) {
    tags.push('로컬 LLM 입문');
  }

  // 화이트 감성: 화이트 케이스
  if (isWhite) {
    tags.push('화이트 감성');
  }

  return tags;
}

/**
 * 각 제품의 primary 그룹 우선순위 결정
 * 여러 usage 태그를 가진 제품은 가장 특화된 그룹에 우선 배치
 * 우선순위(낮을수록 높음): 영상편집 > 3D 모델링 > 방송/스트리밍 > AI/딥러닝 > 사무/디자인 > 게이밍
 */
const USAGE_PRIORITY = {
  '영상편집':    1,
  '3D 모델링':   2,
  '방송/스트리밍': 3,
  'AI/딥러닝':   4,
  '사무/디자인':  5,
  '게이밍':      6,
};

function getPrimaryUsage(product) {
  const usages = product.categories?.usage || [];
  if (usages.length === 0) return null;
  return usages.slice().sort((a, b) =>
    (USAGE_PRIORITY[a] || 99) - (USAGE_PRIORITY[b] || 99)
  )[0];
}

function collectGroupProducts(group, allProducts) {
  if (group.key === 'installment') {
    return allProducts.filter(p => (p.installment_months || 0) === group.value);
  }

  if (group.key === 'bestFor') {
    // DB 태그 우선, 없으면 스펙 기반 추론 태그로 폴백
    const matched = allProducts.filter(p => {
      const dbTags   = p.v2?.best_for_tags || p.best_for_tags || [];
      const inferred = inferBestForTags(p);
      return dbTags.includes(group.value) || inferred.includes(group.value);
    });
    // 4K/QHD 게이밍은 가격 내림차순 정렬 (고사양 먼저)
    if (group.value === '4K 게이밍' || group.value === 'QHD 게이밍') {
      matched.sort((a, b) => (b.price || 0) - (a.price || 0));
    }
    return matched;
  }

  // usage 기반 그룹: primary usage가 이 그룹인 제품을 앞에 배치 (중복 최소화)
  const primary   = allProducts.filter(p => getPrimaryUsage(p) === group.value &&
                                            !(p.installment_months > 0 && group.value === '게이밍'));
  const secondary = allProducts.filter(p => getPrimaryUsage(p) !== group.value &&
                                            (p.categories?.usage || []).includes(group.value) &&
                                            !(p.installment_months > 0 && group.value === '게이밍'));
  return [...primary, ...secondary];
}

/**
 * 그룹별 탭+가로스크롤 렌더링 (기본 화면)
 * 카테고리 탭을 클릭하면 해당 그룹의 제품을 가로 스크롤로 표시
 */
function renderGroupedView(container, allProducts, fpsData, onMoreClick) {
  if (!container) return;

  container._groupMoreHandler = onMoreClick;

  const groupedMeta = GROUPS.map(group => {
    const products = collectGroupProducts(group, allProducts);
    return { ...group, products };
  }).filter(g => g.products.length > 0);

  if (groupedMeta.length === 0) return;

  // 탭 바 + 패널 영역 HTML
  container.innerHTML = `
    <div class="col-span-full">
      <div class="catalog-tab-bar" id="catalog-tab-bar">
        ${groupedMeta.map((g, i) => `
          <button class="catalog-tab${i === 0 ? ' active' : ''}" data-tab-idx="${i}">
            ${g.label}
          </button>
        `).join('')}
      </div>
      <div id="catalog-tab-panel"></div>
    </div>
  `;

  // 패널 렌더 함수
  function renderPanel(idx) {
    const group = groupedMeta[idx];
    const panel = container.querySelector('#catalog-tab-panel');
    if (!panel) return;

    const preview = group.products.slice(0, CARDS_PER_GROUP * 2); // 가로스크롤이므로 최대 6개
    const remaining = group.products.length - preview.length;

    panel.innerHTML = `
      <div class="group-section">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-gray-500">${group.desc} · ${group.products.length}개</p>
          ${remaining > 0 ? `
          <button
            data-group-key="${group.key}"
            data-group-value="${encodeURIComponent(JSON.stringify(group.value))}"
            class="js-group-more flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-400
                   hover:text-accent border border-white/10 hover:border-accent/40
                   rounded-lg transition-all duration-200 whitespace-nowrap"
          >
            전체 ${group.products.length}개 보기
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>` : ''}
        </div>
        <div class="catalog-hscroll">
          ${preview.map(p =>
            renderProductCard(
              p,
              null,
              fpsData,
              buildRecommendationReasons(p, userSelectionsFromGroup(group)),
              groupToSectionKey(group.key, group.value)
            )
          ).join('')}
          ${remaining > 0 ? `
          <button
            data-group-key="${group.key}"
            data-group-value="${encodeURIComponent(JSON.stringify(group.value))}"
            class="catalog-more-card js-group-more"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            +${remaining}개<br/>더 보기
          </button>` : ''}
        </div>
      </div>
    `;
    forceShowCards(panel);
  }

  // 첫 탭 렌더
  renderPanel(0);

  // 탭 클릭 이벤트
  const tabBar = container.querySelector('#catalog-tab-bar');
  if (tabBar) {
    tabBar.addEventListener('click', e => {
      const btn = e.target.closest('[data-tab-idx]');
      if (!btn) return;
      const idx = parseInt(btn.dataset.tabIdx, 10);
      tabBar.querySelectorAll('.catalog-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      renderPanel(idx);
    });
  }
}

export { renderProductCard, renderProductGrid, renderGroupedView, renderWizardResultCard, buildLoadMoreSkeleton };
