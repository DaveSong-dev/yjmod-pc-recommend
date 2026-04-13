/**
 * 스크롤 시 큰 필터 블록은 문서 흐름대로 지나가고, 상단에 compact 요약 바만 고정.
 */
import { debounce } from './utils.js';
import { filterState } from './filter.js';

let scrollRaf = 0;

const MAX_VISIBLE_CHIPS = 3;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

export function collectActiveFilterLabels() {
  const items = [];
  if (filterState.game) items.push({ label: filterState.game });
  if (filterState.usage) items.push({ label: filterState.usage });
  if (filterState.tier) items.push({ label: filterState.tier });
  if (filterState.priceMax != null) {
    items.push({ label: `~${filterState.priceMax}만원` });
  } else if (filterState.priceRange) {
    items.push({ label: filterState.priceRange });
  }
  if (filterState.bestFor) items.push({ label: filterState.bestFor });
  if (filterState.installment) items.push({ label: `${filterState.installment}개월 무이자` });
  const q = filterState.search && String(filterState.search).trim();
  if (q) {
    const short = q.length > 22 ? `${q.slice(0, 22)}…` : q;
    items.push({ label: `검색: ${short}` });
  }
  return items;
}

export function syncFilterCompactChips() {
  const root = document.getElementById('filter-compact-chips');
  const live = document.getElementById('filter-compact-live');
  if (!root) return;

  const items = collectActiveFilterLabels();
  const visible = items.slice(0, MAX_VISIBLE_CHIPS);
  const rest = items.length - visible.length;

  let html = visible
    .map(item => `<span class="filter-compact-chip">${escapeHtml(item.label)}</span>`)
    .join('');
  if (rest > 0) {
    html += `<span class="filter-compact-more" title="추가 ${rest}개 필터">+${rest}</span>`;
  }
  root.innerHTML = html;

  if (live) {
    live.textContent = items.length
      ? `적용된 필터 ${items.length}개. ${items.map(x => x.label).join(', ')}`
      : '적용된 필터 없음';
  }
}

function getHeaderHeight() {
  const el = document.getElementById('main-header');
  return el ? Math.round(el.getBoundingClientRect().height) : 64;
}

function scrollToExpandedFilters() {
  const expanded = document.getElementById('filter-expanded-block');
  if (!expanded) return;
  expanded.scrollIntoView({ behavior: 'smooth', block: 'start' });
  requestAnimationFrame(() => {
    const tab = expanded.querySelector('.filter-tab.active, .filter-tab');
    tab?.focus({ preventScroll: true });
  });
}

export function initFilterCompactBar() {
  const bar = document.getElementById('filter-compact-bar');
  const sentinel = document.getElementById('filter-scroll-sentinel');
  const openBtn = document.getElementById('filter-compact-open');
  const resetCompact = document.getElementById('btn-reset-filter-compact');
  const scrollTargets = document.querySelectorAll('[data-filter-compact-scroll-target]');

  if (!bar || !sentinel) return;

  function measureAndSetBarHeight() {
    if (!bar.hasAttribute('hidden')) {
      const h = Math.ceil(bar.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--filter-compact-bar-h', `${h}px`);
    } else {
      document.documentElement.style.removeProperty('--filter-compact-bar-h');
    }
  }

  function setCompactMode(on) {
    const prev = document.body.classList.contains('filter-compact-mode');
    if (prev === on) {
      if (on) measureAndSetBarHeight();
      return;
    }
    document.body.classList.toggle('filter-compact-mode', on);
    if (on) {
      bar.removeAttribute('hidden');
      bar.setAttribute('aria-hidden', 'false');
    } else {
      bar.setAttribute('hidden', '');
      bar.setAttribute('aria-hidden', 'true');
    }
    requestAnimationFrame(measureAndSetBarHeight);
  }

  function updateFromScroll() {
    const hh = getHeaderHeight();
    const top = sentinel.getBoundingClientRect().top;
    setCompactMode(top < hh);
  }

  function onScrollRaf() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      updateFromScroll();
    });
  }

  window.addEventListener('scroll', onScrollRaf, { passive: true });
  window.addEventListener('resize', debounce(updateFromScroll, 120));

  openBtn?.addEventListener('click', scrollToExpandedFilters);

  resetCompact?.addEventListener('click', e => {
    e.stopPropagation();
    window.resetAllFilters?.();
  });

  scrollTargets.forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('#btn-reset-filter-compact')) return;
      scrollToExpandedFilters();
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollToExpandedFilters();
      }
    });
  });

  updateFromScroll();
  syncFilterCompactChips();
}
