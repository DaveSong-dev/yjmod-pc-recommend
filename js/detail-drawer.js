/**
 * detail-drawer.js — 제품 상세 슬라이드 드로어
 *
 * 사용법:
 *   import { initDetailDrawer, openDetailDrawer } from './detail-drawer.js';
 *   initDetailDrawer(fpsData);          // 앱 초기화 시 1회
 *   openDetailDrawer(product, fpsData); // 카드 클릭 시
 */

import { KAKAO_CONSULT_CHAT_URL, getExpectedFps } from './utils.js';
import { buildProductAnalyticsMeta } from './analytics.js';

/* ─── 내부 상태 ─────────────────────────────────────────── */
let _fpsData = null;
let _drawer = null;
let _backdrop = null;
let _isOpen = false;

/* ─── FPS 모든 게임 목록 렌더 ────────────────────────────── */
const KNOWN_GAMES = [
  '리그오브레전드', '배틀그라운드', '로스트아크', '발로란트',
  '오버워치2', '아이온2', '스팀 AAA급 게임'
];

// v2 FPS 딕셔너리 키 → 표시명 매핑
const V2_FPS_GAME_LABELS = {
  lol: '리그오브레전드', pubg: '배틀그라운드', lostark: '로스트아크',
  valorant: '발로란트', overwatch2: '오버워치2', aion2: '아이온2',
  diablo4: '디아블로4', cyberpunk2077: '사이버펑크2077', eldenring: '엘든링',
  tft: 'TFT', '2xko': '2XKO', hogwarts: '호그와츠 레거시',
};

function renderFpsTable(product) {
  const v2 = product.v2 || null;

  // v2 FPS 데이터 우선 사용 (1080p / 1440p / 4K)
  if (v2?.fps_1080p && Object.keys(v2.fps_1080p).length > 0) {
    const allGames = new Set([
      ...Object.keys(v2.fps_1080p || {}),
      ...Object.keys(v2.fps_1440p || {}),
    ]);
    const rows = [...allGames].slice(0, 8).map(key => {
      const label = V2_FPS_GAME_LABELS[key] || key;
      const fps1080 = v2.fps_1080p?.[key];
      const fps1440 = v2.fps_1440p?.[key];
      if (!fps1080 && !fps1440) return null;
      const parts = [];
      if (fps1080) parts.push(`FHD ${fps1080}`);
      if (fps1440) parts.push(`QHD ${fps1440}`);
      return { label, fpsText: parts.join(' / ') + ' fps' };
    }).filter(Boolean);

    if (rows.length > 0) {
      return `
    <div class="detail-drawer__section">
      <h4 class="detail-drawer__section-title">
        <svg class="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        게임별 예상 FPS
      </h4>
      <div class="detail-drawer__fps-grid">
        ${rows.map(r => `
          <div class="detail-drawer__fps-row">
            <span class="text-gray-400 text-xs truncate">${r.label}</span>
            <span class="text-accent text-xs font-bold whitespace-nowrap">${r.fpsText}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
    }
  }

  // fallback: fps_reference.json 기반
  if (!_fpsData) return '';
  const rows = KNOWN_GAMES.map(game => {
    const result = getExpectedFps(product, game, _fpsData);
    if (!result) return null;
    return { label: game, fpsText: result.fpsText };
  }).filter(Boolean);

  if (!rows.length) return '';

  return `
    <div class="detail-drawer__section">
      <h4 class="detail-drawer__section-title">
        <svg class="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        게임별 예상 FPS
      </h4>
      <div class="detail-drawer__fps-grid">
        ${rows.map(r => `
          <div class="detail-drawer__fps-row">
            <span class="text-gray-400 text-xs truncate">${r.label}</span>
            <span class="text-accent text-xs font-bold whitespace-nowrap">${r.fpsText}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
}

/* ─── 게이밍 등급 렌더 ────────────────────────────────────── */
const GRADE_LABEL = {
  excellent: { text: '최고', cls: 'text-purple-400' },
  strong:    { text: '우수', cls: 'text-blue-400'   },
  good:      { text: '양호', cls: 'text-emerald-400' },
  standard:  { text: '보통', cls: 'text-yellow-400'  },
  poor:      { text: '미흡', cls: 'text-gray-500'    },
};

function renderGamingGrades(v2) {
  if (!v2) return '';
  const fhd = GRADE_LABEL[v2.gaming_grade_fhd] || null;
  const qhd = GRADE_LABEL[v2.gaming_grade_qhd] || null;
  const g4k = GRADE_LABEL[v2.gaming_grade_4k]  || null;
  if (!fhd && !qhd && !g4k) return '';

  const cols = [
    fhd ? `<div class="text-center"><p class="text-[10px] text-gray-500 mb-0.5">FHD</p><p class="text-xs font-bold ${fhd.cls}">${fhd.text}</p></div>` : '',
    qhd ? `<div class="text-center"><p class="text-[10px] text-gray-500 mb-0.5">QHD</p><p class="text-xs font-bold ${qhd.cls}">${qhd.text}</p></div>` : '',
    g4k ? `<div class="text-center"><p class="text-[10px] text-gray-500 mb-0.5">4K</p><p class="text-xs font-bold ${g4k.cls}">${g4k.text}</p></div>` : '',
  ].filter(Boolean);

  return `
    <div class="detail-drawer__section">
      <h4 class="detail-drawer__section-title">
        <svg class="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        해상도별 게이밍 등급
      </h4>
      <div class="flex gap-6 justify-start pl-1">
        ${cols.join('')}
      </div>
    </div>`;
}

/* ─── AI 적합도 렌더 ─────────────────────────────────────── */
function renderAiReadiness(v2) {
  if (!v2) return '';
  const aiReady  = v2.ai_ready;
  const llmReady = v2.llm_entry_ready;
  if (aiReady === null && aiReady === undefined) return '';
  if (!aiReady && !llmReady) return '';

  const chips = [];
  if (aiReady)  chips.push('<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/15 border border-violet-400/30 text-violet-300">AI 학습 가능</span>');
  if (llmReady) chips.push('<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">로컬 LLM 구동</span>');
  if ((v2.local_ai_grade || 0) >= 3) chips.push('<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/15 border border-blue-400/30 text-blue-300">이미지 생성</span>');

  return `
    <div class="detail-drawer__section">
      <h4 class="detail-drawer__section-title">
        <svg class="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
        AI 활용 적합도
      </h4>
      <div class="flex flex-wrap gap-1.5">${chips.join('')}</div>
    </div>`;
}

/* ─── 추천 요약 + 셀링포인트 렌더 ───────────────────────── */
function renderV2Summary(product) {
  const v2 = product.v2 || null;
  const summaryReason = v2?.summary_reason || '';
  const sellingPoints = v2?.selling_points || [];
  const bestForTags   = product.best_for_tags || v2?.best_for_tags || [];

  if (!summaryReason && !sellingPoints.length && !bestForTags.length) return '';

  return `
    <div class="detail-drawer__section">
      <h4 class="detail-drawer__section-title">
        <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        추천 포인트
      </h4>
      ${summaryReason ? `<p class="text-xs text-gray-300 leading-relaxed mb-2">${summaryReason}</p>` : ''}
      ${sellingPoints.length > 0 ? `
      <ul class="flex flex-wrap gap-1.5 mb-2">
        ${sellingPoints.slice(0, 5).map(sp => `<li class="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/10 text-gray-300">${sp}</li>`).join('')}
      </ul>` : ''}
      ${bestForTags.length > 0 ? `
      <div class="flex flex-wrap gap-1 mt-1">
        ${bestForTags.slice(0, 5).map(t => `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-accent/20 bg-accent/8 text-gray-300">${t}</span>`).join('')}
      </div>` : ''}
    </div>`;
}

/* ─── 스펙 행 ────────────────────────────────────────────── */
const SPEC_META = {
  cpu:       { label: 'CPU',    color: 'text-orange-400' },
  gpu:       { label: 'GPU',    color: 'text-green-400'  },
  ram:       { label: 'RAM',    color: 'text-blue-400'   },
  ssd:       { label: 'SSD',    color: 'text-purple-400' },
  mainboard: { label: 'MB',     color: 'text-yellow-400' },
  power:     { label: 'PSU',    color: 'text-pink-400'   },
  case:      { label: 'CASE',   color: 'text-cyan-400'   },
  cooler:    { label: 'COOLER', color: 'text-indigo-400' }
};

function renderSpecTable(specs) {
  const entries = Object.entries(SPEC_META).map(([key, meta]) => {
    const val = (key === 'cpu' ? specs.cpu_short || specs.cpu
               : key === 'gpu' ? specs.gpu_short || specs.gpu
               : specs[key]) || '';
    if (!val || val === '-') return null;
    return { meta, val };
  }).filter(Boolean);

  return `
    <div class="detail-drawer__section">
      <h4 class="detail-drawer__section-title">
        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m0 0h2m-2 0v2M3 9v2m0 0v2M3 9H1m2 2H1m2 2H1M9 21H7a2 2 0 01-2-2v-2m4 4h6m-6 0v-2m6 2h2a2 2 0 002-2v-2m0 0h2m-2 0v-2m-14 2v-2m2 2v-2"/>
        </svg>
        상세 스펙
      </h4>
      <div class="detail-drawer__spec-table">
        ${entries.map(({ meta, val }) => `
          <div class="detail-drawer__spec-row">
            <span class="detail-drawer__spec-label ${meta.color}">${meta.label}</span>
            <span class="detail-drawer__spec-val">${val}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
}

/* ─── 드로어 내용 빌드 ────────────────────────────────────── */
function buildDrawerContent(product) {
  const meta = buildProductAnalyticsMeta(product);
  const isInstallment = (product.installment_months || 0) > 0 && (product.price_monthly || 0) > 0;
  const priceHtml = isInstallment
    ? `<span class="text-2xl font-black text-white">${product.price_display}</span>
       <span class="text-sm text-gray-400 ml-1">(${product.installment_months}개월 · 총 ${Math.round((product.price||0)/10000)}만원)</span>`
    : `<span class="text-2xl font-black text-white">${product.price_display}</span>`;

  const tierMap = {
    '가성비(FHD)':   { label: 'FHD', cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
    '퍼포먼스(QHD)': { label: 'QHD', cls: 'text-blue-400 bg-blue-400/10 border-blue-400/30'         },
    '하이엔드(4K)':  { label: '4K',  cls: 'text-purple-400 bg-purple-400/10 border-purple-400/30'   }
  };
  const tier = tierMap[product.categories?.tier] || { label: '', cls: 'text-gray-400 bg-gray-400/10 border-gray-400/30' };

  return `
    <!-- 드래그 핸들 (모바일 전용) -->
    <div class="detail-drawer__drag-handle" id="detail-drawer-drag" aria-hidden="true"></div>

    <!-- 헤더 -->
    <div class="detail-drawer__header">
      <button class="detail-drawer__close" id="detail-drawer-close" aria-label="닫기">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      <span class="text-xs text-gray-500 font-medium">상품 상세</span>
    </div>

    <!-- 스크롤 바디 -->
    <div class="detail-drawer__body">

      <!-- 이미지 -->
      <div class="detail-drawer__img-wrap">
        <img
          src="${product.thumbnail}"
          alt="${product.name}"
          class="detail-drawer__img"
          onerror="this.src='https://via.placeholder.com/600x400/16213e/e94560?text=YJMOD'"
        />
        <div class="absolute inset-0 pointer-events-none">
          ${tier.label ? `<span class="absolute top-3 left-3 px-2 py-0.5 rounded-md text-xs font-bold border ${tier.cls}">${tier.label}</span>` : ''}
          <span class="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-white/20 ${product.case_color === '화이트' ? 'bg-white' : 'bg-gray-800'}"
                title="${product.case_color || ''} 케이스"></span>
        </div>
      </div>

      <!-- 뱃지 + 제품명 -->
      <div class="px-5 pt-5">
        ${product.badge ? `<span class="inline-block px-2 py-0.5 rounded-md text-xs font-semibold border border-accent/30 bg-accent/10 text-accent mb-2">${product.badge}</span>` : ''}
        <h2 class="text-lg font-black text-white leading-snug">${product.name}</h2>
        ${product.subtitle ? `<p class="text-sm text-gray-400 mt-1">${product.subtitle}</p>` : ''}
      </div>

      <!-- 가격 -->
      <div class="detail-drawer__price-row">
        <div class="flex items-baseline gap-1 flex-wrap">
          ${priceHtml}
        </div>
        ${(product.installment_months||0) > 0 && (product.price_monthly||0) > 0
          ? `<p class="text-xs text-gray-500 mt-0.5">월 ${Math.round(product.price_monthly/10000)}만원 × ${product.installment_months}개월 무이자</p>`
          : ''}
      </div>

      <!-- 추천 요약 + 셀링포인트 -->
      ${renderV2Summary(product)}

      <!-- 상세 스펙 -->
      ${renderSpecTable(product.specs || {})}

      <!-- 해상도별 게이밍 등급 -->
      ${renderGamingGrades(product.v2 || null)}

      <!-- AI 적합도 -->
      ${renderAiReadiness(product.v2 || null)}

      <!-- FPS 테이블 -->
      ${renderFpsTable(product)}

      <!-- 구매 확신 -->
      <div class="detail-drawer__section">
        <div class="detail-drawer__assurance">
          <span>오늘 상담 가능</span>
          <span>부품 변경 가능</span>
          <span>1년 무상 A/S</span>
          <span>24/36개월 무이자</span>
        </div>
      </div>

    </div>

    <!-- 고정 하단 CTA -->
    <div class="detail-drawer__footer">
      <a href="${product.url}"
         data-track-click="product"
         data-source-section="detail_drawer"
         data-product-id="${meta.product_id || ''}"
         data-product-name="${meta.product_name || ''}"
         class="detail-drawer__btn-primary">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
        공식 페이지에서 구매하기
      </a>
      <a href="${KAKAO_CONSULT_CHAT_URL}" target="_blank" rel="noopener noreferrer"
         data-track-click="consult"
         data-source-section="detail_drawer"
         data-product-id="${meta.product_id || ''}"
         class="detail-drawer__btn-kakao">
        <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C6.48 3 2 6.58 2 11c0 2.77 1.61 5.21 4.06 6.75L5.25 21l4.05-2.04C10.07 19.3 11.02 19.5 12 19.5c5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
        </svg>
        카카오 상담
      </a>
    </div>
  `;
}

/* ─── 스와이프 다운 닫기 (모바일) ────────────────────────── */
let _touchStartY = 0;
let _touchCurrentY = 0;
let _isSwiping = false;

function _bindSwipeClose() {
  const handle = _drawer.querySelector('#detail-drawer-drag');
  const body   = _drawer.querySelector('.detail-drawer__body');
  if (!handle) return;

  function onTouchStart(e) {
    _touchStartY = e.touches[0].clientY;
    _touchCurrentY = _touchStartY;
    _isSwiping = true;
    _drawer.style.transition = 'none';
  }

  function onTouchMove(e) {
    if (!_isSwiping) return;
    _touchCurrentY = e.touches[0].clientY;
    const delta = Math.max(0, _touchCurrentY - _touchStartY);
    _drawer.style.transform = `translateY(${delta}px)`;
  }

  function onTouchEnd() {
    if (!_isSwiping) return;
    _isSwiping = false;
    _drawer.style.transition = '';
    const delta = _touchCurrentY - _touchStartY;
    if (delta > 120) {
      _drawer.style.transform = '';
      closeDetailDrawer();
    } else {
      // 스냅백
      _drawer.style.transform = '';
    }
  }

  // 핸들에서 스와이프
  handle.addEventListener('touchstart', onTouchStart, { passive: true });
  handle.addEventListener('touchmove', onTouchMove, { passive: true });
  handle.addEventListener('touchend', onTouchEnd, { passive: true });

  // 바디 상단에서도 스와이프 (스크롤이 맨 위일 때만)
  body?.addEventListener('touchstart', e => {
    if (body.scrollTop === 0) onTouchStart(e);
  }, { passive: true });
  body?.addEventListener('touchmove', e => {
    if (_isSwiping && body.scrollTop === 0) onTouchMove(e);
  }, { passive: true });
  body?.addEventListener('touchend', onTouchEnd, { passive: true });
}

/* ─── 열기 / 닫기 ─────────────────────────────────────────── */
export function openDetailDrawer(product) {
  if (!_drawer || !_backdrop) return;
  _drawer.innerHTML = buildDrawerContent(product);
  _drawer.querySelector('#detail-drawer-close')?.addEventListener('click', closeDetailDrawer);

  // 모바일 스와이프 닫기 바인딩
  _bindSwipeClose();

  _backdrop.classList.remove('hidden');
  requestAnimationFrame(() => {
    _backdrop.classList.add('detail-backdrop--visible');
    _drawer.classList.add('detail-drawer--open');
  });

  document.body.style.overflow = 'hidden';
  _isOpen = true;

  // ESC 키 닫기
  document.addEventListener('keydown', _onKeyDown);
}

export function closeDetailDrawer() {
  if (!_drawer || !_backdrop) return;
  _drawer.classList.remove('detail-drawer--open');
  _backdrop.classList.remove('detail-backdrop--visible');

  setTimeout(() => {
    if (!_isOpen) {
      _backdrop.classList.add('hidden');
      _drawer.innerHTML = '';
    }
  }, 320);

  document.body.style.overflow = '';
  _isOpen = false;
  document.removeEventListener('keydown', _onKeyDown);
}

function _onKeyDown(e) {
  if (e.key === 'Escape') closeDetailDrawer();
}

/* ─── 초기화 ─────────────────────────────────────────────── */
export function initDetailDrawer(fpsData) {
  _fpsData = fpsData;
  _drawer   = document.getElementById('detail-drawer');
  _backdrop = document.getElementById('detail-drawer-backdrop');

  if (!_drawer || !_backdrop) return;

  // 백드롭 클릭 닫기
  _backdrop.addEventListener('click', e => {
    if (e.target === _backdrop) closeDetailDrawer();
  });
}
