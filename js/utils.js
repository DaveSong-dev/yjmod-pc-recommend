/**
 * utils.js - 공통 유틸리티 함수 모음
 */

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
function matchGpuFps(gpuKey, fpsData) {
  if (!gpuKey || !fpsData || !fpsData.gpus) return null;
  // 직접 매칭
  if (fpsData.gpus[gpuKey]) return fpsData.gpus[gpuKey];
  // 부분 매칭 (예: "COLORFUL RTX 5060 8GB" -> "RTX 5060")
  const keys = Object.keys(fpsData.gpus);
  for (const key of keys) {
    if (gpuKey.includes(key) || key.includes(gpuKey)) {
      return fpsData.gpus[key];
    }
  }
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

/**
 * 예상 FPS 텍스트 생성
 * @param {Object} product - 제품 데이터
 * @param {string} gameName - 선택한 게임 이름
 * @param {Object} fpsData - fps_reference.json 데이터
 * @returns {string} FPS 텍스트
 */
function getExpectedFps(product, gameName, fpsData) {
  if (!gameName || !fpsData) return null;
  const gpuFps = matchGpuFps(product.specs.gpu_key, fpsData);
  if (!gpuFps || !gpuFps[gameName]) return null;
  const resolution = tierToResolution(product.categories.tier);
  const fps = gpuFps[gameName][resolution];
  if (!fps) return null;
  const cappedFps = Math.min(fps, 300);
  if (cappedFps >= 300) return `약 300+ FPS`;
  return `약 ${cappedFps} FPS`;
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
  PRICE_RANGES,
  matchGpuFps,
  tierToResolution,
  getExpectedFps,
  getBadgeClass,
  debounce,
  formatDate,
  fetchJson,
  observeScrollFade
};
