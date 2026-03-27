/**
 * reco-loader.js — reco v2 enrichment overlay 로더
 *
 * 핵심 원칙:
 *   raw crawl products = source of truth (가격, 품절, URL, 이름, 스펙)
 *   reco v2 dataset   = enrichment overlay (추천 태그, AI 분류, 요약, 등급)
 *
 * 이 모듈은 reco 데이터를 "독립 상품 목록"으로 쓰지 않는다.
 * raw 상품에 id 기준으로 reco 메타데이터를 병합하는 헬퍼만 제공한다.
 */

import { fetchJson } from './utils.js';

const RECO_BASE = './data/reco';
const FALLBACK_FEED = `${RECO_BASE}/v2.0.0/feed.json`;

const SPEC_BAND_TO_TIER = {
  'FHD 가성비': '가성비(FHD)',
  'QHD 퍼포먼스': '퍼포먼스(QHD)',
  '4K 하이엔드': '하이엔드(4K)'
};

const COLOR_KR = { white: '화이트', black: '블랙', other: null };

const USAGE_TAG_NORMALIZE = {
  '사무용': '사무/디자인',
  'AI·딥러닝': 'AI/딥러닝',
  '방송·스트리밍': '방송/스트리밍'
};

function normalizeUsageTag(tag) {
  return USAGE_TAG_NORMALIZE[tag] || tag;
}

const CONSULT_GROUP_LABELS = {
  office_apu_consult: '사무/내장그래픽 상담',
  bundle_consult: '반본체/부품 상담',
  server_ws_consult: '서버/워크스테이션 상담',
  consumer_consult: '맞춤 견적 상담',
  manual_review: '수동 검토 필요',
  manual_consult: '맞춤 상담'
};

/**
 * manifest → active version → feed.json + consult.json 로드
 * reco 아이템을 it_id 기준 Map으로 반환 (상품 객체를 만들지 않음)
 */
export async function loadRecoEnrichment() {
  let feedPath = FALLBACK_FEED;
  let consultPath = null;
  let version = '2.0.0';

  try {
    const manifest = await fetchJson(`${RECO_BASE}/manifest.json`);
    if (manifest?.active_version && manifest.versions?.[manifest.active_version]) {
      version = manifest.active_version;
      const entry = manifest.versions[version];
      feedPath = `${RECO_BASE}/${entry.feed}`;
      if (entry.consult_feed) {
        consultPath = `${RECO_BASE}/${entry.consult_feed}`;
      }
    }
  } catch (_) { /* manifest 없으면 fallback */ }

  const feedMap = new Map();
  try {
    const rawFeed = await fetchJson(feedPath);
    if (Array.isArray(rawFeed)) {
      for (const item of rawFeed) {
        if (item.it_id) feedMap.set(String(item.it_id), item);
      }
    }
  } catch (_) { /* feed 로드 실패 → 빈 맵 */ }

  const consultMap = new Map();
  if (consultPath) {
    try {
      const rawConsult = await fetchJson(consultPath);
      if (Array.isArray(rawConsult)) {
        for (const item of rawConsult) {
          if (item.it_id) consultMap.set(String(item.it_id), item);
        }
      }
    } catch (_) { /* consult 로드 실패 → 빈 맵 */ }
  }

  return { feedMap, consultMap, version };
}

/**
 * raw 상품에 reco enrichment 병합
 * raw 필드(name, url, price, price_display, in_stock, specs, game_fps)는 보존
 * reco 필드(v2.*)만 추가
 */
export function enrichProduct(rawProduct, recoItem) {
  if (!recoItem) {
    return { ...rawProduct, v2: null };
  }

  const enriched = { ...rawProduct };

  // categories: reco 태그를 raw에 합산
  const rawGames = new Set(enriched.categories?.games || []);
  const rawUsage = new Set(enriched.categories?.usage || []);
  (recoItem.frontend_game_tags || []).forEach(g => rawGames.add(g));
  (recoItem.frontend_usage_tags || []).map(normalizeUsageTag).forEach(u => rawUsage.add(u));

  enriched.categories = {
    ...enriched.categories,
    games: [...rawGames],
    usage: [...rawUsage],
    tier: SPEC_BAND_TO_TIER[recoItem.frontend_spec_band] || enriched.categories?.tier || '',
    price_range: recoItem.frontend_price_band || enriched.categories?.price_range || ''
  };

  // case_color: raw에 없을 때만 reco 값으로 보강
  if (!enriched.case_color && recoItem.case_color) {
    enriched.case_color = COLOR_KR[recoItem.case_color] ?? null;
  }

  // 짧은 스펙 보강 (raw에 없을 때만)
  enriched.specs = { ...enriched.specs };
  if (!enriched.specs.cpu_short && recoItem.cpu_norm) {
    enriched.specs.cpu_short = recoItem.cpu_norm;
  }
  if (!enriched.specs.gpu_short && recoItem.gpu_norm) {
    enriched.specs.gpu_short = recoItem.gpu_norm;
  }
  if (!enriched.specs.gpu_key && recoItem.gpu_norm) {
    enriched.specs.gpu_key = recoItem.gpu_norm;
  }

  enriched.v2 = {
    dataset_version: recoItem.dataset_version,
    recommendable: recoItem.recommendable !== false,
    recommend_group: recoItem.recommend_group || 'consumer_general',
    product_type: recoItem.product_type || '',
    raw_soldout: recoItem.raw_soldout,
    inventory_sync_warning: recoItem.inventory_sync_warning,
    price_is_estimated: recoItem.price_is_estimated,
    price_source: recoItem.price_source,
    cpu_norm: recoItem.cpu_norm,
    gpu_norm: recoItem.gpu_norm,
    ram_gb: recoItem.ram_gb,
    ssd_total_gb: recoItem.ssd_total_gb,
    gpu_vram_gb: recoItem.gpu_vram_gb,
    power_watt: recoItem.power_watt,
    case_color_raw: recoItem.case_color,
    wifi_support: recoItem.wifi_support,
    gaming_grade_fhd: recoItem.gaming_grade_fhd,
    gaming_grade_qhd: recoItem.gaming_grade_qhd,
    gaming_grade_4k: recoItem.gaming_grade_4k,
    video_edit_grade: recoItem.video_edit_grade,
    office_grade: recoItem.office_grade,
    modeling_grade: recoItem.modeling_grade,
    ai_ready: recoItem.ai_ready,
    llm_entry_ready: recoItem.llm_entry_ready,
    gpu_tensor_class: recoItem.gpu_tensor_class,
    vram_class: recoItem.vram_class,
    local_ai_grade: recoItem.local_ai_grade,
    image_gen_local_grade: recoItem.image_gen_local_grade,
    frontend_primary_usage: recoItem.frontend_primary_usage,
    frontend_spec_band: recoItem.frontend_spec_band,
    frontend_rank_score: recoItem.frontend_rank_score || 0,
    best_for_tags: recoItem.best_for_tags || [],
    selling_points: recoItem.selling_points || [],
    display_badges: recoItem.display_badges || [],
    summary_reason: recoItem.summary_reason || '',
    frontend_game_tags: recoItem.frontend_game_tags || [],
    frontend_usage_tags: recoItem.frontend_usage_tags || [],
    fps_1080p: recoItem.fps_1080p,
    fps_1440p: recoItem.fps_1440p,
    fps_4k_corrected: recoItem.fps_4k_corrected
  };

  return enriched;
}

/**
 * raw 상품 + consult reco 아이템 → 상담 유도 카드
 * 가격/URL/이름은 raw 기준
 */
export function buildConsultProduct(rawProduct, consultItem) {
  return {
    id: rawProduct.id,
    name: rawProduct.name,
    subtitle: rawProduct.subtitle || `${consultItem.cpu_norm || ''} + ${consultItem.gpu_norm || ''}`.trim(),
    url: rawProduct.url,
    thumbnail: rawProduct.thumbnail,
    price: rawProduct.price,
    price_display: rawProduct.price_display,
    in_stock: rawProduct.in_stock,
    case_color: rawProduct.case_color || (COLOR_KR[consultItem.case_color] ?? null),
    recommend_group: consultItem.recommend_group || '',
    consult_label: CONSULT_GROUP_LABELS[consultItem.recommend_group] || '상담 필요',
    exclude_reason: consultItem.exclude_reason || [],
    summary_reason: consultItem.summary_reason || '',
    selling_points: consultItem.selling_points || [],
    display_badges: consultItem.display_badges || [],
    consult_required: consultItem.consult_required !== false
  };
}
