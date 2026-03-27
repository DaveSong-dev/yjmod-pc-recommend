import {
  fetchJson
} from "./chunk-3K2RG6CP.js";

// js/recent-shipping.js
var DEFAULT_GALLERY = "https://cafe.naver.com/f-e/cafes/31248285/menus/1?viewType=I&page=1&size=20";
function formatDate(iso) {
  if (!iso || typeof iso !== "string") return "";
  return iso.slice(0, 10).replace(/-/g, ".");
}
function setText(el, text) {
  if (!el) return;
  el.textContent = text == null ? "" : String(text);
}
function urlPathBase(href) {
  try {
    const u = new URL(href, window.location.origin);
    return `${u.origin}${u.pathname}`;
  } catch (e) {
    return String(href || "").split("?")[0];
  }
}
function footLabel(item, galleryUrl) {
  const g = urlPathBase(galleryUrl || "");
  const c = urlPathBase(item.cafeUrl || "");
  const art = (item.cafeUrl || "").includes("/articles/");
  if (art && c && g && c !== g) return "\uCE74\uD398 \uC6D0\uBB38 \uBCF4\uAE30";
  if (c && g && c === g) return "\uC804\uCCB4 \uCD9C\uACE0 \uC0AC\uC9C4 \uBCF4\uAE30";
  return "\uCE74\uD398\uC5D0\uC11C \uBCF4\uAE30";
}
async function loadShippingShowcase() {
  let r;
  try {
    r = await fetch("/api/shipping-public", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
  } catch (_) {
    const file = await fetchJson("./data/recent_shipping.json");
    if (!file) return null;
    return {
      galleryMenuUrl: file.galleryMenuUrl || DEFAULT_GALLERY,
      items: Array.isArray(file.items) ? file.items : [],
      _source: "json_fallback"
    };
  }
  if (r.ok) {
    const j = await r.json();
    if (j && Array.isArray(j.items)) {
      return {
        galleryMenuUrl: j.galleryMenuUrl || DEFAULT_GALLERY,
        items: j.items,
        _source: j.source || "api"
      };
    }
  }
  if (r.status === 404) {
    const file = await fetchJson("./data/recent_shipping.json");
    if (!file) return null;
    return {
      galleryMenuUrl: file.galleryMenuUrl || DEFAULT_GALLERY,
      items: Array.isArray(file.items) ? file.items : [],
      _source: "json_fallback"
    };
  }
  return null;
}
async function initRecentShipping() {
  const grid = document.getElementById("recent-shipping-grid");
  const galleryBtn = document.getElementById("recent-shipping-gallery-btn");
  const section = document.getElementById("recent-shipping-section");
  if (!grid || !section) return;
  const data = await loadShippingShowcase();
  if (!data) {
    console.warn(
      "[RecentShipping] /api/shipping-public \uC744 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC5B4 \uC139\uC158\uC744 \uC228\uAE41\uB2C8\uB2E4. Vercel Production\uC5D0 BLOB_READ_WRITE_TOKEN\xB7SHIPPING_PAYLOAD_SECRET(16\uC790+)\uB97C \uC124\uC815\uD588\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694."
    );
    section.classList.add("hidden");
    return;
  }
  const items = data.items.slice(0, 6);
  const galleryUrl = typeof data.galleryMenuUrl === "string" && data.galleryMenuUrl ? data.galleryMenuUrl : DEFAULT_GALLERY;
  if (galleryBtn) galleryBtn.href = galleryUrl;
  if (!items.length) {
    section.classList.add("hidden");
    return;
  }
  grid.replaceChildren();
  items.forEach((item, index) => {
    const url = item.cafeUrl;
    if (!url || typeof url !== "string") return;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "recent-shipping-card group flex flex-col bg-card border border-white/5 rounded-2xl overflow-hidden hover:border-emerald-500/35 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50";
    const media = document.createElement("div");
    media.className = "recent-shipping-card__media relative w-full overflow-hidden bg-surface";
    const imgUrl = typeof item.image === "string" ? item.image.trim() : "";
    if (imgUrl) {
      const img = document.createElement("img");
      img.src = imgUrl;
      img.alt = "";
      img.width = 480;
      img.height = 300;
      img.loading = "lazy";
      img.decoding = "async";
      img.className = "absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]";
      if (index === 0) img.fetchPriority = "low";
      media.appendChild(img);
    } else {
      const ph = document.createElement("div");
      ph.className = "recent-shipping-card__ph";
      ph.setAttribute("aria-hidden", "true");
      media.appendChild(ph);
    }
    const body = document.createElement("div");
    body.className = "flex flex-col flex-1 p-4 gap-2";
    const meta = document.createElement("div");
    meta.className = "flex items-center justify-between gap-2 text-[11px] text-gray-500";
    const dateEl = document.createElement("time");
    dateEl.dateTime = item.date || "";
    setText(dateEl, formatDate(item.date));
    const badge = document.createElement("span");
    badge.className = "shrink-0 rounded-md bg-emerald-500/10 text-emerald-400/90 px-2 py-0.5 font-semibold";
    setText(badge, "\uCD9C\uACE0");
    meta.appendChild(dateEl);
    meta.appendChild(badge);
    const title = document.createElement("h3");
    title.className = "text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-emerald-300/95 transition-colors";
    setText(title, item.title || "\uCD9C\uACE0 \uC0AC\uB840");
    const specStr = typeof item.specs === "string" ? item.specs.trim() : "";
    const specs = document.createElement("p");
    specs.className = "text-xs text-gray-400 font-medium line-clamp-1";
    setText(specs, specStr);
    const summary = document.createElement("p");
    summary.className = "text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1";
    setText(summary, item.summary || "");
    const foot = document.createElement("div");
    foot.className = "flex items-center gap-1 pt-1 text-xs font-semibold text-emerald-500/70 group-hover:text-emerald-400 transition-colors";
    const footLabelText = footLabel(item, galleryUrl);
    const footLabelEl = document.createElement("span");
    footLabelEl.textContent = footLabelText;
    const footIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    footIcon.setAttribute("class", "w-3.5 h-3.5");
    footIcon.setAttribute("fill", "none");
    footIcon.setAttribute("viewBox", "0 0 24 24");
    footIcon.setAttribute("stroke", "currentColor");
    footIcon.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-width", "2");
    path.setAttribute(
      "d",
      "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    );
    footIcon.appendChild(path);
    foot.appendChild(footLabelEl);
    foot.appendChild(footIcon);
    body.appendChild(meta);
    body.appendChild(title);
    if (specStr) body.appendChild(specs);
    body.appendChild(summary);
    body.appendChild(foot);
    a.appendChild(media);
    a.appendChild(body);
    grid.appendChild(a);
  });
  try {
    window.dispatchEvent(new Event("resize"));
  } catch (_) {
  }
}
export {
  initRecentShipping
};
