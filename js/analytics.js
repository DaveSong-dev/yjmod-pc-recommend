const ANALYTICS_ENDPOINT = '/api/track-event';
const SESSION_KEY = 'yjmod_session_id';

const WIZARD_BUDGET_TO_RANGE = {
  budget_under100: '100만 원 이하',
  budget_100_200: '100~200만 원',
  budget_200_300: '200~300만 원',
  budget_over300: '300만 원 이상'
};

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `yjmod-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function getSessionId() {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = createSessionId();
    window.sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return createSessionId();
  }
}

function buildPriceBand(value) {
  if (typeof value === 'string' && value.trim()) return value;
  const price = Number(value) || 0;
  if (price <= 0) return null;
  if (price < 1000000) return '100만 원 이하';
  if (price < 2000000) return '100~200만 원';
  if (price < 3000000) return '200~300만 원';
  return '300만 원 이상';
}

function serializeWizardSelections(selections) {
  if (!selections) return null;
  const next = {
    purpose: selections.purpose || null,
    game: selections.game || null,
    budget: selections.budget || null,
    budget_label: WIZARD_BUDGET_TO_RANGE[selections.budget] || null,
    design: selections.design || null
  };
  return Object.values(next).some(Boolean) ? next : null;
}

function serializeFilterState(filters) {
  if (!filters) return null;
  const next = {
    game: filters.game || null,
    usage: filters.usage || null,
    tier: filters.tier || null,
    priceRange: filters.priceRange || null,
    installment: filters.installment ?? null,
    caseColor: filters.caseColor || null,
    bestFor: filters.bestFor || null,
    search: filters.search || null
  };
  return Object.values(next).some(value => value !== null && value !== '') ? next : null;
}

function buildProductAnalyticsMeta(product) {
  const usage = Array.isArray(product?.categories?.usage) ? product.categories.usage[0] : product?.categories?.usage;
  return {
    product_id: product?.id != null ? String(product.id) : null,
    product_name: product?.name || null,
    category: usage || product?.categories?.tier || product?.subtitle || null,
    price_band: product?.categories?.price_range || buildPriceBand(product?.price)
  };
}

function sanitizeValue(value, depth = 0) {
  if (value == null) return null;
  if (depth > 3) return null;
  if (Array.isArray(value)) {
    return value
      .slice(0, 12)
      .map(item => sanitizeValue(item, depth + 1))
      .filter(item => item != null);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      const sanitized = sanitizeValue(nested, depth + 1);
      if (sanitized != null && sanitized !== '') out[key] = sanitized;
    }
    return Object.keys(out).length ? out : null;
  }
  if (typeof value === 'string') return value.trim().slice(0, 240);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  return null;
}

function postAnalytics(payload) {
  if (typeof window === 'undefined') return;
  if (window.location?.protocol === 'file:') return;

  let shouldPost = true;
  try {
    const params = new URLSearchParams(window.location.search || '');
    const hostname = window.location.hostname || '';
    const isLocalHttp = hostname === '127.0.0.1' || hostname === 'localhost';
    if (isLocalHttp && params.get('analytics') !== '1' && window.__YJMOD_ENABLE_LOCAL_ANALYTICS__ !== true) {
      shouldPost = false;
    }
  } catch {
    shouldPost = true;
  }

  if (!shouldPost) return;

  const body = JSON.stringify(payload);
  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(ANALYTICS_ENDPOINT, blob)) return;
    }
  } catch {
    // noop
  }

  fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true
  }).catch(() => {});
}

function trackEvent(event, payload = {}) {
  if (typeof window === 'undefined') return;

  const merged = {
    event,
    occurred_at: new Date().toISOString(),
    session_id: getSessionId(),
    path: window.location.pathname,
    url: window.location.href,
    referrer: document.referrer || null,
    viewport: {
      width: window.innerWidth || null,
      height: window.innerHeight || null
    },
    ...payload
  };
  const sanitized = sanitizeValue(merged) || { event };

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event, ...sanitized });
  }
  if (typeof window.gtag === 'function') {
    window.gtag('event', event, sanitized);
  }

  postAnalytics(sanitized);
}

export {
  buildPriceBand,
  buildProductAnalyticsMeta,
  serializeFilterState,
  serializeWizardSelections,
  trackEvent
};
