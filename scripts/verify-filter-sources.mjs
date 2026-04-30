import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function productsFromPcData(data) {
  return Array.isArray(data) ? data : data.products || [];
}

function feedItems(data) {
  return Array.isArray(data) ? data : data.items || data.products || [];
}

const pcData = readJson('data/pc_data.json');
const feed = readJson('data/reco/v2.0.0/feed.json');
const products = productsFromPcData(pcData);
const inStock = products.filter(p => p.in_stock === true);
const feedMap = new Map(
  feedItems(feed)
    .filter(item => item && item.it_id != null)
    .map(item => [String(item.it_id), item])
);

const tiers = ['가성비(FHD)', '퍼포먼스(QHD)', '하이엔드(4K)'];
const tierCounts = Object.fromEntries(
  tiers.map(tier => [
    tier,
    inStock.filter(p => p.categories?.tier === tier).length,
  ])
);

const gaming = inStock.filter(p => (p.categories?.usage || []).includes('게이밍'));
const qhdGaming = gaming.filter(p => p.categories?.tier === '퍼포먼스(QHD)');
const fourKGaming = gaming.filter(p => p.categories?.tier === '하이엔드(4K)');

const specBandToTier = {
  'FHD 가성비': '가성비(FHD)',
  'QHD 퍼포먼스': '퍼포먼스(QHD)',
  '4K 하이엔드': '하이엔드(4K)',
};

const conflicts = [];
for (const p of inStock) {
  const reco = feedMap.get(String(p.id));
  if (!reco) continue;
  const usage = p.categories?.usage || [];
  const tier = p.categories?.tier || '';
  const bestForTags = reco.best_for_tags || [];
  const specTier = specBandToTier[reco.frontend_spec_band] || '';

  if (specTier && tier && specTier !== tier) {
    conflicts.push({ id: p.id, type: 'spec_band_vs_pc_tier', pc: tier, v2: reco.frontend_spec_band });
  }
  if (bestForTags.includes('QHD 게이밍') && (tier !== '퍼포먼스(QHD)' || !usage.includes('게이밍'))) {
    conflicts.push({ id: p.id, type: 'v2_qhd_tag_vs_pc_data', pc: `${tier} / ${usage.join(',')}` });
  }
  if (bestForTags.includes('4K 게이밍') && (tier !== '하이엔드(4K)' || !usage.includes('게이밍'))) {
    conflicts.push({ id: p.id, type: 'v2_4k_tag_vs_pc_data', pc: `${tier} / ${usage.join(',')}` });
  }
}

const report = {
  total_crawled_products: products.length,
  in_stock_products: inStock.length,
  in_stock_by_tier: tierCounts,
  in_stock_gaming_products: gaming.length,
  qhd_gaming_products: qhdGaming.length,
  four_k_gaming_products: fourKGaming.length,
  v2_vs_pc_data_conflicts: conflicts.length,
  conflict_examples: conflicts.slice(0, 20),
};

console.log(JSON.stringify(report, null, 2));

if (qhdGaming.some(p => p.categories?.tier !== '퍼포먼스(QHD)' || !(p.categories?.usage || []).includes('게이밍'))) {
  throw new Error('QHD 게이밍 검증 실패');
}
if (fourKGaming.some(p => p.categories?.tier !== '하이엔드(4K)' || !(p.categories?.usage || []).includes('게이밍'))) {
  throw new Error('4K 게이밍 검증 실패');
}
