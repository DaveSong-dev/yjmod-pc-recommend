// js/utils.js
var KAKAO_CONSULT_CHAT_URL = "https://pf.kakao.com/_sxmjxgT/chat";
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
var PRICE_RANGES = {
  "100\uB9CC \uC6D0 \uC774\uD558": { min: 0, max: 1e6 },
  "100~200\uB9CC \uC6D0": { min: 1e6, max: 2e6 },
  "200~300\uB9CC \uC6D0": { min: 2e6, max: 3e6 },
  "300\uB9CC \uC6D0 \uC774\uC0C1": { min: 3e6, max: Infinity }
};
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

export {
  KAKAO_CONSULT_CHAT_URL,
  PRICE_RANGES,
  getProductGameFpsHighlights,
  buildMonthlyPaymentHint,
  getExpectedFps,
  getBadgeClass,
  debounce,
  fetchJson,
  observeScrollFade
};
