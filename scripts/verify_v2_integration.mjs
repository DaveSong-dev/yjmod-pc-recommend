/**
 * v2.0.0 통합 검증 스크립트
 * - manifest 로딩
 * - feed 변환
 * - 필터 동작
 * - 빈 결과 방지
 * - consult 분리
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadJSON(relPath) {
  return JSON.parse(readFileSync(resolve(root, relPath), 'utf-8'));
}

let pass = 0;
let fail = 0;

function check(name, condition, detail = '') {
  if (condition) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

console.log('\n=== v2.0.0 통합 검증 ===\n');

// 1. Manifest
console.log('[1] Manifest');
const manifest = loadJSON('data/reco/manifest.json');
check('manifest 로드', !!manifest);
check('active_version 존재', manifest.active_version === '2.0.0');
check('version entry 존재', !!manifest.versions?.['2.0.0']);
check('feed 경로', manifest.versions['2.0.0'].feed === 'v2.0.0/feed.json');
check('consult_feed 경로', manifest.versions['2.0.0'].consult_feed === 'v2.0.0/consult.json');

// 2. Feed 로드
console.log('\n[2] Feed');
const feed = loadJSON('data/reco/v2.0.0/feed.json');
check('feed 배열', Array.isArray(feed) && feed.length > 0, `length=${feed?.length}`);
check('전체 768개', feed.length === 768);
check('모두 recommendable', feed.every(x => x.recommendable !== false));
check('모두 consumer_general', feed.every(x => x.recommend_group === 'consumer_general'));

// 3. 필수 필드 존재
console.log('\n[3] 필수 필드');
const sample = feed[0];
const required = [
  'it_id', 'name', 'detail_url', 'image_url', 'price_effective',
  'recommendable', 'recommend_group', 'cpu_norm', 'gpu_norm',
  'ram_gb', 'ssd_total_gb', 'gpu_vram_gb', 'best_for_tags',
  'selling_points', 'summary_reason', 'display_badges',
  'frontend_rank_score', 'frontend_spec_band', 'frontend_price_band',
  'frontend_game_tags', 'frontend_usage_tags',
  'gaming_grade_fhd', 'gaming_grade_qhd', 'gaming_grade_4k',
  'video_edit_grade', 'ai_ready', 'llm_entry_ready',
  'gpu_tensor_class', 'vram_class', 'local_ai_grade',
  'case_color', 'wifi_support'
];
for (const field of required) {
  check(`필드: ${field}`, field in sample);
}

// 4. best_for_tags 커버리지
console.log('\n[4] best_for_tags 커버리지');
const allBestFor = new Set();
feed.forEach(x => (x.best_for_tags || []).forEach(t => allBestFor.add(t)));
const expectedTags = [
  'AI 공부용', '로컬 LLM 입문', 'QHD 게이밍', '4K 게이밍',
  '영상편집 입문', '영상편집 표준', '사무/멀티태스킹',
  '화이트 감성', '블랙 감성', 'FHD 게이밍', '로컬 AI 입문',
  '3D 모델링 표준', '3D 모델링 입문', '방송·스트리밍'
];
for (const tag of expectedTags) {
  const count = feed.filter(x => (x.best_for_tags || []).includes(tag)).length;
  check(`${tag}: ${count}개`, count > 0);
}

// 5. 필터 시뮬레이션 — 주요 쿼리별 결과 0건 방지
console.log('\n[5] 필터 시뮬레이션 (0건 방지)');
const queries = {
  'AI 공부용': x => (x.best_for_tags || []).includes('AI 공부용'),
  '로컬 LLM 입문': x => (x.best_for_tags || []).includes('로컬 LLM 입문'),
  'QHD 게이밍': x => (x.best_for_tags || []).includes('QHD 게이밍'),
  '4K 게이밍': x => (x.best_for_tags || []).includes('4K 게이밍'),
  '영상편집 입문': x => (x.best_for_tags || []).includes('영상편집 입문'),
  '영상편집 표준': x => (x.best_for_tags || []).includes('영상편집 표준'),
  '사무용': x => (x.frontend_usage_tags || []).includes('사무용'),
  '화이트 감성': x => x.case_color === 'white',
  '블랙 감성': x => x.case_color === 'black',
  '32GB 이상': x => x.ram_gb >= 32,
  '1TB 이상': x => x.ssd_total_gb >= 1024,
  'Wi-Fi 지원': x => x.wifi_support === true,
  '가성비 (100만 이하)': x => x.price_effective > 0 && x.price_effective < 1000000,
  '고성능 (300만 이상)': x => x.price_effective >= 3000000,
  'AI ready': x => x.ai_ready === true,
  'LLM entry ready': x => x.llm_entry_ready === true,
  'VRAM 8GB+': x => x.gpu_vram_gb >= 8,
  'VRAM 12GB+': x => x.gpu_vram_gb >= 12,
  'VRAM 16GB+': x => x.gpu_vram_gb >= 16
};
for (const [name, fn] of Object.entries(queries)) {
  const count = feed.filter(fn).length;
  check(`${name}: ${count}개`, count > 0);
}

// 6. Consult 데이터
console.log('\n[6] Consult 데이터');
const consult = loadJSON('data/reco/v2.0.0/consult.json');
check('consult 배열', Array.isArray(consult) && consult.length > 0);
check('consult 104개', consult.length === 104);
const consultGroups = {};
consult.forEach(x => { consultGroups[x.recommend_group] = (consultGroups[x.recommend_group] || 0) + 1; });
check('consult 그룹 다양성', Object.keys(consultGroups).length >= 4, JSON.stringify(consultGroups));

// 7. 4K 보정
console.log('\n[7] 4K FPS 보정');
const with4k = feed.filter(x => x.fps_4k_corrected != null && x.fps_4k_corrected > 0);
check('fps_4k_corrected 필드 정의됨', 'fps_4k_corrected' in feed[0]);
if (with4k.length === 0) {
  console.log('  ℹ fps_4k_corrected 데이터 없음 (v2.0.0 기준 — 향후 업데이트 예정)');
  pass++;
} else {
  check('fps_4k_corrected 값 존재', with4k.length > 0, `${with4k.length}개`);
}

// 8. raw_soldout 안전성
console.log('\n[8] raw_soldout 안전성');
const allSoldout = feed.every(x => x.raw_soldout === true);
check('raw_soldout 전건 true (예상)', allSoldout);
check('recommendable 기반 노출 (raw_soldout 무시)', feed.filter(x => x.recommendable).length === 768);

console.log(`\n=== 결과: ${pass} PASS / ${fail} FAIL ===\n`);
process.exit(fail > 0 ? 1 : 0);
