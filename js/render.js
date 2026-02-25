/**
 * render.js - 제품 카드 및 UI 렌더링
 */

import { formatPrice, getBadgeClass, getExpectedFps } from './utils.js';

/**
 * 제품 카드 HTML 생성
 * @param {Object} product - 제품 데이터
 * @param {string|null} selectedGame - 위자드에서 선택한 게임 (FPS 표시용)
 * @param {Object|null} fpsData - fps_reference.json 데이터
 * @returns {string} HTML 문자열
 */
function renderProductCard(product, selectedGame = null, fpsData = null) {
  const badgeClass = getBadgeClass(product.badge_color);
  const fpsText = selectedGame && fpsData
    ? getExpectedFps(product, selectedGame, fpsData)
    : null;

  const tierBadge = {
    '가성비(FHD)': { label: 'FHD', cls: 'text-emerald-400 bg-emerald-400/10' },
    '퍼포먼스(QHD)': { label: 'QHD', cls: 'text-blue-400 bg-blue-400/10' },
    '하이엔드(4K)': { label: '4K', cls: 'text-purple-400 bg-purple-400/10' }
  };
  const tier = tierBadge[product.categories.tier] || { label: 'FHD', cls: 'text-gray-400 bg-gray-400/10' };

  return `
    <article class="product-card fade-in-up group relative bg-card border border-white/5 rounded-2xl overflow-hidden
                    hover:border-accent/40 hover:shadow-[0_0_30px_rgba(233,69,96,0.15)] transition-all duration-300
                    flex flex-col" data-id="${product.id}">
      <!-- 썸네일 -->
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
        <!-- 품질 티어 뱃지 -->
        <span class="absolute top-3 left-3 px-2 py-0.5 rounded-md text-xs font-bold ${tier.cls}">
          ${tier.label}
        </span>
        <!-- 케이스 색상 -->
        <span class="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-white/20 ${product.case_color === '화이트' ? 'bg-white' : 'bg-gray-800'}"
              title="${product.case_color} 케이스"></span>
      </div>

      <!-- 콘텐츠 -->
      <div class="flex flex-col flex-1 p-5 gap-3">
        <!-- 배지 + 제품명 -->
        <div>
          ${product.badge ? `
          <span class="inline-block px-2 py-0.5 rounded-md text-xs font-semibold border mb-2 ${badgeClass}">
            ${product.badge}
          </span>` : ''}
          <h3 class="text-sm font-bold text-white leading-snug line-clamp-2">${product.name}</h3>
          <p class="text-xs text-gray-400 mt-1">${product.subtitle || ''}</p>
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

        <!-- 가격 + CTA -->
        <div class="mt-auto pt-3 border-t border-white/5 flex items-center justify-between gap-2">
          <div>
            ${product.installment_months > 0
              ? `<p class="text-xs text-purple-400 font-semibold">${product.installment_months}개월 무이자</p>
                 <p class="text-2xl font-black text-white tracking-tight">${product.price_display}</p>
                 <p class="text-xs text-gray-500 mt-0.5">총 ${Math.round((product.price||0)/10000)}만 원</p>`
              : `<p class="text-xs text-gray-500">판매가</p>
                 <p class="text-2xl font-black text-white tracking-tight">${product.price_display}</p>`
            }
          </div>
          <a href="${product.url}" target="_blank" rel="noopener noreferrer"
             class="flex-shrink-0 px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-semibold
                    rounded-xl transition-colors duration-200 whitespace-nowrap">
            구매하기
          </a>
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
 */
const FLAT_PAGE_SIZE = 12;

function forceShowCards(container) {
  container.querySelectorAll('.fade-in-up').forEach((el) => {
    el.classList.add('visible');
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
}

function renderProductGrid(container, products, selectedGame = null, fpsData = null) {
  if (!container) return;

  // 현재 렌더 컨텍스트 저장 (이벤트 위임 핸들러에서 재사용)
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
        <p class="text-gray-400 text-lg font-medium">해당 조건의 제품이 없습니다</p>
        <p class="text-gray-600 text-sm mt-1">필터를 변경하거나 초기화해 보세요</p>
        <button onclick="window.resetAllFilters()"
                class="mt-4 px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent text-sm rounded-lg transition-colors">
          필터 초기화
        </button>
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
    .map(p => renderProductCard(p, selectedGame, fpsData))
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
function renderWizardResultCard(product, selectedGame, fpsData) {
  const badgeClass = getBadgeClass(product.badge_color);
  const fpsText = selectedGame && fpsData
    ? getExpectedFps(product, selectedGame, fpsData)
    : null;

  const tierBadge = {
    '가성비(FHD)': { label: 'FHD 가성비', cls: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
    '퍼포먼스(QHD)': { label: 'QHD 퍼포먼스', cls: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
    '하이엔드(4K)': { label: '4K 하이엔드', cls: 'text-purple-400 border-purple-400/30 bg-purple-400/10' }
  };
  const tier = tierBadge[product.categories.tier] || { label: 'PC', cls: 'text-gray-400 border-gray-400/30 bg-gray-400/10' };

  return `
    <article class="wizard-result-card group relative bg-card border border-white/5 rounded-2xl overflow-hidden
                    hover:border-accent/40 hover:shadow-[0_0_40px_rgba(233,69,96,0.2)] transition-all duration-300
                    flex flex-col" data-id="${product.id}">
      <!-- 상단 이미지 -->
      <div class="relative overflow-hidden h-56 bg-[#0d1117] flex-shrink-0 flex items-center justify-center">
        <img
          src="${product.thumbnail}"
          alt="${product.name}"
          class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 p-1"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/400x300/16213e/e94560?text=YJMOD'"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent"></div>

        <!-- 티어 뱃지 -->
        <span class="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold border ${tier.cls}">
          ${tier.label}
        </span>
      </div>

      <!-- 콘텐츠 -->
      <div class="flex flex-col flex-1 p-5 gap-4">
        <div>
          ${product.badge ? `
          <span class="inline-block px-2 py-0.5 rounded-md text-xs font-semibold border mb-2 ${badgeClass}">
            ✦ ${product.badge}
          </span>` : ''}
          <h3 class="text-base font-bold text-white leading-snug">${product.name}</h3>
          <p class="text-sm text-gray-400 mt-1">${product.subtitle || ''}</p>
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

        <!-- 가격 + CTA -->
        <div class="mt-auto pt-4 border-t border-white/5">
          <div class="flex items-center justify-between gap-3">
            <div>
              ${product.installment_months > 0
                ? `<p class="text-xs text-purple-400 font-semibold mb-0.5">${product.installment_months}개월 무이자</p>
                   <p class="text-3xl font-black text-white tracking-tight">${product.price_display}</p>
                   <p class="text-xs text-gray-500 mt-0.5">총 ${Math.round((product.price||0)/10000)}만 원</p>`
                : `<p class="text-xs text-gray-500 mb-0.5">견적가 (기본 사양)</p>
                   <p class="text-3xl font-black text-white tracking-tight">${product.price_display}</p>`
              }
            </div>
            <a href="${product.url}" target="_blank" rel="noopener noreferrer"
               class="flex-shrink-0 px-5 py-3 bg-accent hover:bg-red-500 text-white font-bold
                      rounded-xl transition-colors duration-200 text-sm">
              견적 확인
            </a>
          </div>
        </div>
      </div>
    </article>
  `;
}

// ─── 그룹별 뷰 (기본 화면) ──────────────────────────────────────

const GROUPS = [
  { key: 'usage',       value: '게이밍',        label: '🎮 게이밍 PC',         desc: '게임 특화 최적화 견적' },
  { key: 'usage',       value: 'AI/딥러닝',      label: '🤖 AI · 딥러닝 PC',    desc: 'AI 이미지생성 · 머신러닝 전용' },
  { key: 'usage',       value: '영상편집',        label: '🎬 영상편집 PC',        desc: '4K 편집 · 렌더링 특화' },
  { key: 'usage',       value: '사무/디자인',     label: '💼 사무 · 디자인 PC',   desc: '업무 · 문서 · 디자인 최적화' },
  { key: 'usage',       value: '3D/모델링',       label: '🎨 3D 모델링 PC',       desc: 'CAD · 블렌더 · 솔리드웍스' },
  { key: 'usage',       value: '방송/스트리밍',   label: '📺 방송 · 스트리밍 PC', desc: 'OBS · 원컴방송 · 라이브' },
  { key: 'installment', value: 24,                label: '💳 24개월 무이자',       desc: '월 납부금으로 부담 없이' },
  { key: 'installment', value: 36,                label: '💳 36개월 무이자',       desc: '가장 낮은 월 납부금' },
];

const CARDS_PER_GROUP = 3;

/**
 * 그룹별 섹션 렌더링 (기본 화면)
 */
function renderGroupedView(container, allProducts, fpsData, onMoreClick) {
  if (!container) return;

  // 현재 핸들러 참조 저장 (위임 이벤트에서 사용)
  container._groupMoreHandler = onMoreClick;

  // 그룹별 상품 분류
  const grouped = GROUPS.map(group => {
    let products;
    if (group.key === 'installment') {
      products = allProducts.filter(p => (p.installment_months || 0) === group.value);
    } else {
      products = allProducts.filter(p =>
        (p.categories?.usage || []).includes(group.value) &&
        !(p.installment_months > 0 && group.value === '게이밍')
      );
    }
    return { ...group, products };
  }).filter(g => g.products.length > 0);

  container.innerHTML = grouped.map(group => {
    const preview = group.products.slice(0, CARDS_PER_GROUP);
    const remaining = group.products.length - CARDS_PER_GROUP;

    return `
      <div class="col-span-full group-section mb-2">
        <!-- 섹션 헤더 -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-bold text-white">${group.label}</h3>
            <p class="text-xs text-gray-500 mt-0.5">${group.desc} · ${group.products.length}개</p>
          </div>
          ${remaining > 0 ? `
          <button
            data-group-key="${group.key}"
            data-group-value="${encodeURIComponent(JSON.stringify(group.value))}"
            class="js-group-more flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-400
                   hover:text-accent border border-white/10 hover:border-accent/40
                   rounded-lg transition-all duration-200 whitespace-nowrap"
          >
            ${remaining}개 더보기
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>` : ''}
        </div>

        <!-- 카드 그리드 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-2">
          ${preview.map(p => renderProductCard(p, null, fpsData)).join('')}
        </div>

        <!-- 구분선 -->
        <div class="border-b border-white/5 mt-6 mb-6"></div>
      </div>
    `;
  }).join('');

  // 상단 그룹 더보기는 app.js 문서 위임에서 일괄 처리

  // 그룹 카드도 렌더 직후 강제 노출 처리
  forceShowCards(container);
}

export { renderProductCard, renderProductGrid, renderGroupedView, renderWizardResultCard, buildLoadMoreSkeleton };
