import { createFlowLogger } from './debug.js';
import { fetchJson } from './utils.js';

const DEFAULT_GALLERY =
  'https://cafe.naver.com/f-e/cafes/31248285/menus/1?viewType=I&page=1&size=20';

const shippingLog = createFlowLogger('RecentShipping');

function formatDate(iso) {
  if (!iso || typeof iso !== 'string') return '';
  return iso.slice(0, 10).replace(/-/g, '.');
}

function setText(el, text) {
  if (!el) return;
  el.textContent = text == null ? '' : String(text);
}

function urlPathBase(href) {
  try {
    const url = new URL(href, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return String(href || '').split('?')[0];
  }
}

function footLabel(item, galleryUrl) {
  const galleryBase = urlPathBase(galleryUrl || '');
  const cafeBase = urlPathBase(item.cafeUrl || '');
  const isArticle = (item.cafeUrl || '').includes('/articles/');

  if (isArticle && cafeBase && galleryBase && cafeBase !== galleryBase) {
    return '카페 본문 보기';
  }
  if (cafeBase && galleryBase && cafeBase === galleryBase) {
    return '전체 출고 사진 보기';
  }
  return '카페에서 보기';
}

async function loadStaticShippingShowcase() {
  const file = await fetchJson('./data/recent_shipping.json');
  if (!file) return null;

  return {
    galleryMenuUrl: file.galleryMenuUrl || DEFAULT_GALLERY,
    items: Array.isArray(file.items) ? file.items : [],
    _source: 'json_fallback',
  };
}

function shouldUseShippingApiFirst() {
  try {
    if (window.__YJMOD_USE_SHIPPING_API__ === true) return true;
    const params = new URLSearchParams(window.location.search || '');
    return params.get('shippingApi') === '1';
  } catch {
    return false;
  }
}

async function loadApiShippingShowcase() {
  try {
    const response = await fetch('/api/shipping-public', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!response.ok) {
      shippingLog('api:status-fallback', { status: response.status });
      return null;
    }

    const json = await response.json();
    if (!json || !Array.isArray(json.items)) return null;

    shippingLog('source:api', { itemCount: json.items.length });
    return {
      galleryMenuUrl: json.galleryMenuUrl || DEFAULT_GALLERY,
      items: json.items,
      _source: json.source || 'api',
    };
  } catch (error) {
    shippingLog('api:network-fallback', {
      error: String(error?.message || error || 'unknown'),
    });
    return null;
  }
}

async function loadShippingShowcase() {
  if (shouldUseShippingApiFirst()) {
    return (await loadApiShippingShowcase()) || loadStaticShippingShowcase();
  }

  const fallback = await loadStaticShippingShowcase();
  if (fallback) {
    shippingLog('source:static', { itemCount: fallback.items.length });
    return fallback;
  }

  return loadApiShippingShowcase();
}

export async function initRecentShipping() {
  const grid = document.getElementById('recent-shipping-grid');
  const galleryBtn = document.getElementById('recent-shipping-gallery-btn');
  const section = document.getElementById('recent-shipping-section');

  if (!grid || !section) return;

  const data = await loadShippingShowcase();
  if (!data) {
    shippingLog('section:hidden:no-data');
    section.classList.add('hidden');
    return;
  }

  const items = data.items.slice(0, 6);
  const galleryUrl =
    typeof data.galleryMenuUrl === 'string' && data.galleryMenuUrl
      ? data.galleryMenuUrl
      : DEFAULT_GALLERY;

  if (galleryBtn) galleryBtn.href = galleryUrl;

  if (!items.length) {
    shippingLog('section:hidden:empty-items');
    section.classList.add('hidden');
    return;
  }

  grid.replaceChildren();

  items.forEach((item, index) => {
    const url = item.cafeUrl;
    if (!url || typeof url !== 'string') return;

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className =
      'recent-shipping-card group flex flex-col bg-card border border-white/5 rounded-2xl overflow-hidden ' +
      'hover:border-emerald-500/35 transition-all duration-200 focus:outline-none focus-visible:ring-2 ' +
      'focus-visible:ring-emerald-500/50';

    const media = document.createElement('div');
    media.className = 'recent-shipping-card__media relative w-full overflow-hidden bg-surface';

    const imgUrl = typeof item.image === 'string' ? item.image.trim() : '';
    if (imgUrl) {
      const img = document.createElement('img');
      img.src = imgUrl;
      img.alt = '';
      img.width = 480;
      img.height = 300;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.className =
        'absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]';
      if (index === 0) img.fetchPriority = 'low';
      media.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'recent-shipping-card__ph';
      placeholder.setAttribute('aria-hidden', 'true');
      media.appendChild(placeholder);
    }

    const body = document.createElement('div');
    body.className = 'flex flex-col flex-1 p-4 gap-2';

    const meta = document.createElement('div');
    meta.className = 'flex items-center justify-between gap-2 text-[11px] text-gray-500';

    const dateEl = document.createElement('time');
    dateEl.dateTime = item.date || '';
    setText(dateEl, formatDate(item.date));

    const badge = document.createElement('span');
    badge.className =
      'shrink-0 rounded-md bg-emerald-500/10 text-emerald-400/90 px-2 py-0.5 font-semibold';
    setText(badge, '출고');

    meta.appendChild(dateEl);
    meta.appendChild(badge);

    const title = document.createElement('h3');
    title.className =
      'text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-emerald-300/95 transition-colors';
    setText(title, item.title || '출고 후기');

    const specText = typeof item.specs === 'string' ? item.specs.trim() : '';
    const specs = document.createElement('p');
    specs.className = 'text-xs text-gray-400 font-medium line-clamp-1';
    setText(specs, specText);

    const summary = document.createElement('p');
    summary.className = 'text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1';
    setText(summary, item.summary || '');

    const foot = document.createElement('div');
    foot.className =
      'flex items-center gap-1 pt-1 text-xs font-semibold text-emerald-500/70 group-hover:text-emerald-400 transition-colors';

    const footLabelEl = document.createElement('span');
    footLabelEl.textContent = footLabel(item, galleryUrl);

    const footIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    footIcon.setAttribute('class', 'w-3.5 h-3.5');
    footIcon.setAttribute('fill', 'none');
    footIcon.setAttribute('viewBox', '0 0 24 24');
    footIcon.setAttribute('stroke', 'currentColor');
    footIcon.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('d', 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14');
    footIcon.appendChild(path);

    foot.appendChild(footLabelEl);
    foot.appendChild(footIcon);

    body.appendChild(meta);
    body.appendChild(title);
    if (specText) body.appendChild(specs);
    body.appendChild(summary);
    body.appendChild(foot);

    link.appendChild(media);
    link.appendChild(body);
    grid.appendChild(link);
  });

  try {
    window.dispatchEvent(new Event('resize'));
  } catch {
    // noop
  }
}
