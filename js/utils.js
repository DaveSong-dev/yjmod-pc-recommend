/**
 * utils.js - 공통 유틸리티 함수 모음
 */

/** 카드·플로팅 CTA 공통 (운영 채널 단일 출처) */
const KAKAO_CONSULT_CHAT_URL = 'https://pf.kakao.com/_sxmjxgT/chat';

/**
 * 가격을 1만원 단위로 절삭하여 표시
 * @param {number} won - 원화 가격 (원 단위)
 * @returns {string} 포맷된 가격 문자열 (예: "79만 원")
 */
function formatPrice(won) {
  const man = Math.floor(won / 10000);
  if (man >= 100) {
    const eok = Math.floor(man / 100);
    const remain = man % 100;
    if (remain === 0) return `${eok}억 원`;
    return `${eok}억 ${remain}만 원`;
  }
  return `${man}만 원`;
}

/**
 * 가격대 텍스트를 범위 객체로 변환
 */
const PRICE_RANGES = {
  '100만 원 이하': { min: 0, max: 1000000 },
  '100~200만 원': { min: 1000000, max: 2000000 },
  '200~300만 원': { min: 2000000, max: 3000000 },
  '300만 원 이상': { min: 3000000, max: Infinity }
};

/**
 * GPU 키를 FPS 참조 데이터 키와 매칭
 * @param {string} gpuKey - 상품 데이터의 gpu_key
 * @param {Object} fpsData - fps_reference.json 데이터
 * @returns {Object|null} 해당 GPU의 FPS 데이터
 */
function normalizeGpuKey(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .trim();
}

function matchGpuFps(gpuKey, fpsData) {
  if (!gpuKey || !fpsData || !fpsData.gpus) return null;
  // 직접 매칭
  if (fpsData.gpus[gpuKey]) return fpsData.gpus[gpuKey];

  const normalizedTarget = normalizeGpuKey(gpuKey);
  const candidates = Object.keys(fpsData.gpus).map(key => ({
    key,
    normalized: normalizeGpuKey(key)
  }));

  const exact = candidates.find(candidate => candidate.normalized === normalizedTarget);
  if (exact) return fpsData.gpus[exact.key];

  // 부분 매칭은 가장 긴 키를 우선하여 "RTX 5060 TI"가 "RTX 5060"으로 잘못 붙는 문제를 방지
  const partial = candidates
    .filter(candidate =>
      normalizedTarget.includes(candidate.normalized)
    )
    .sort((a, b) => b.normalized.length - a.normalized.length)[0];

  if (partial) return fpsData.gpus[partial.key];
  return null;
}

/**
 * 티어에 해당하는 해상도 키 반환
 * @param {string} tier - "가성비(FHD)" | "퍼포먼스(QHD)" | "하이엔드(4K)"
 * @returns {string} "FHD" | "QHD" | "4K"
 */
function tierToResolution(tier) {
  if (tier.includes('FHD')) return 'FHD';
  if (tier.includes('QHD')) return 'QHD';
  if (tier.includes('4K')) return '4K';
  return 'FHD';
}

function getProductGameFpsEntry(product, gameName) {
  const entry = product?.game_fps?.[gameName];
  if (!entry || !entry.fps) return null;
  return {
    fps: Number(entry.fps),
    resolution: entry.resolution || null,
    label: entry.label || gameName,
    source: 'product'
  };
}

function formatGameFpsEntry(entry, fallbackGameName = '') {
  if (!entry || !entry.fps) return null;
  const label = entry.label || fallbackGameName;
  const fpsValue = Math.min(Number(entry.fps), 999);
  const fpsText = `${fpsValue} FPS`;
  const summaryText = entry.resolution
    ? `${entry.resolution} ${label} ${fpsText}`
    : `${label} ${fpsText}`;

  return {
    fpsText,
    summaryText,
    resolution: entry.resolution || null,
    label
  };
}

function getProductGameFpsHighlights(product, limit = 3, excludeGames = []) {
  const blocked = new Set(excludeGames.filter(Boolean));
  const entries = Object.entries(product?.game_fps || {})
    .filter(([game, entry]) => !blocked.has(game) && entry?.fps)
    .slice(0, limit)
    .map(([game, entry]) => formatGameFpsEntry({
      fps: entry.fps,
      resolution: entry.resolution,
      label: entry.label || game
    }, game))
    .filter(Boolean);

  return entries;
}

/**
 * 예상 FPS 텍스트 생성
 * 참조 추정 분기의 summary/fpsText에 "약"이 포함됨 — scripts/verify_live_fps.py 규칙과 맞출 것(ops/OPERATIONAL_MEMO.md).
 * @param {Object} product - 제품 데이터
 * @param {string} gameName - 선택한 게임 이름
 * @param {Object} fpsData - fps_reference.json 데이터
 * @returns {string} FPS 텍스트
 */
/**
 * 일시불 상품 카드용: 총액을 24로 나눈 만 원 올림 참고치(이자·수수료·실제 할부 조건 미반영).
 * 무이자 할부 상품(installment_months>0 & price_monthly>0)은 null — 메인 가격이 이미 월 납부.
 * @returns {{ primary: string, disclaimer: string } | null}
 */
function buildMonthlyPaymentHint(product) {
  const months = Number(product?.installment_months) || 0;
  const monthly = Number(product?.price_monthly) || 0;
  const total = Number(product?.price) || 0;

  if (months > 0 && monthly > 0) {
    return null;
  }
  if (total < 200000) {
    return null;
  }
  const approx = Math.ceil(total / 24 / 10000) * 10000;
  return {
    primary: `24개월 균등 시 월 약 ${formatPrice(approx)}`,
    disclaimer: '참고 · 이자 미포함'
  };
}

function getExpectedFps(product, gameName, fpsData) {
  if (!gameName) return null;
  const productFps = getProductGameFpsEntry(product, gameName);
  if (productFps) {
    return formatGameFpsEntry(productFps, gameName);
  }

  if (!fpsData) return null;
  const gpuKey = product?.specs?.gpu_key || product?.specs?.gpu_short || product?.specs?.gpu;
  const gpuFps = matchGpuFps(gpuKey, fpsData);
  if (!gpuFps || !gpuFps[gameName]) return null;
  const resolution = tierToResolution(product?.categories?.tier || '');
  const fps = gpuFps[gameName][resolution];
  if (!fps) return null;
  const cappedFps = Math.min(fps, 300);
  return {
    fpsText: cappedFps >= 300 ? '약 300+ FPS' : `약 ${cappedFps} FPS`,
    summaryText: `${resolution} ${gameName} ${cappedFps >= 300 ? '약 300+ FPS' : `약 ${cappedFps} FPS`}`,
    resolution,
    label: gameName
  };
}

/**
 * 배지 색상 클래스 매핑
 */
const BADGE_COLORS = {
  green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  white: 'bg-slate-300/20 text-slate-300 border-slate-300/30'
};

function getBadgeClass(color) {
  return BADGE_COLORS[color] || BADGE_COLORS.blue;
}

/**
 * 디바운스 함수
 */
function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 날짜 포맷 (YYYY-MM-DD -> MM/DD)
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

/**
 * 로컬 JSON 파일 페치
 */
async function fetchJson(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[fetchJson] 로드 실패: ${path}`, err);
    return null;
  }
}

/**
 * 스크롤 애니메이션 트리거 (IntersectionObserver)
 */
function observeScrollFade(selector = '.fade-in-up') {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(selector).forEach(el => observer.observe(el));
}

export {
  formatPrice,
  KAKAO_CONSULT_CHAT_URL,
  buildMonthlyPaymentHint,
  PRICE_RANGES,
  matchGpuFps,
  tierToResolution,
  getProductGameFpsEntry,
  formatGameFpsEntry,
  getProductGameFpsHighlights,
  getExpectedFps,
  getBadgeClass,
  debounce,
  formatDate,
  fetchJson,
  observeScrollFade
};
