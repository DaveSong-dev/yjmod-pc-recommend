/**
 * supabase-categories.js
 * Supabase product_codes 테이블에서 카테고리 데이터를 로드해 캐시합니다.
 *
 * 카테고리 코드:
 *   GY = 게이밍 PC
 *   VY = 영상편집 / 작업용 PC
 *   HY = 하이엔드 PC
 *   OY = 오피스용 PC
 *   DY = 기타
 */

const SUPA2_URL = 'https://daqfcpwnhbaolizupaia.supabase.co/rest/v1';
const SUPA2_KEY = 'sb_publishable_pTkulMYCgBth-r5CJXWiTg_hnzDsxrN';

let _categoryMap = null; // Map<it_id_string, 'GY'|'VY'|'HY'|'OY'|'DY'>

/**
 * Supabase product_codes에서 카테고리 매핑을 로드합니다.
 * 한 번 로드하면 캐시되어 재사용됩니다.
 * @returns {Promise<Map<string, string>>}
 */
export async function loadCategoryMap() {
  if (_categoryMap) return _categoryMap;

  try {
    const res = await fetch(
      `${SUPA2_URL}/product_codes?limit=500&select=category,product_url`,
      {
        headers: {
          apikey: SUPA2_KEY,
          Authorization: `Bearer ${SUPA2_KEY}`,
          Accept: 'application/json'
        }
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const rows = await res.json();
    _categoryMap = new Map();

    rows.forEach(row => {
      const { category, product_url } = row;
      if (!category || !product_url) return;
      product_url.split(',').forEach(url => {
        const m = url.trim().match(/it_id=(\d+)/);
        if (m) _categoryMap.set(m[1], category);
      });
    });

    console.log(`[categories] ${_categoryMap.size}개 상품 카테고리 로드 완료 (GY/VY/HY/OY/DY)`);
  } catch (e) {
    console.warn('[categories] 카테고리 로드 실패, fallback 동작:', e.message);
    _categoryMap = new Map();
  }

  return _categoryMap;
}

/**
 * 상품의 Supabase 카테고리 코드를 반환합니다.
 * @param {string|number} productId - 상품 ID (it_id)
 * @returns {'GY'|'VY'|'HY'|'OY'|'DY'|null}
 */
export function getCategoryCode(productId) {
  if (!_categoryMap) return null;
  return _categoryMap.get(String(productId)) || null;
}
