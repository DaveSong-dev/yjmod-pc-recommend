/**
 * 출고 한 줄 입력 파싱 · 공개용 필드 변환 (전화 원문 비노출)
 */

const DEFAULT_GALLERY =
  'https://cafe.naver.com/f-e/cafes/31248285/menus/1?viewType=I&page=1&size=20';

/**
 * @param {string} line
 * @returns {{ customerName: string, customerPhone: string, engineerName: string }}
 */
function parseShippingLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) {
    const err = new Error('한 줄을 입력해 주세요.');
    err.code = 'EMPTY';
    throw err;
  }

  const slashParts = trimmed
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
  if (slashParts.length < 2) {
    const err = new Error('형식: 고객명 전화번호 / 엔지니어명  (예: 이승표 010 8290 3934 / 임재원)');
    err.code = 'FORMAT';
    throw err;
  }

  const engineerName = slashParts.slice(1).join(' / ').trim();
  const left = slashParts[0];

  const phoneRe = /^(.+?)\s+(01[016789][\s\-]?\d{3,4}[\s\-]?\d{4})\s*$/;
  const m = left.match(phoneRe);
  if (!m) {
    const err = new Error(
      '고객명과 휴대전화 번호를 찾을 수 없습니다. 끝부분이 010-xxxx-xxxx 형태인지 확인해 주세요.'
    );
    err.code = 'PHONE';
    throw err;
  }

  const customerName = m[1].trim();
  const phoneDigits = m[2].replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    const err = new Error('전화번호 자릿수가 올바르지 않습니다.');
    err.code = 'PHONE_LEN';
    throw err;
  }
  if (!customerName) {
    const err = new Error('고객명이 비어 있습니다.');
    err.code = 'NAME';
    throw err;
  }
  if (!engineerName) {
    const err = new Error('엔지니어명을 입력해 주세요. / 오른쪽에 이름을 적어 주세요.');
    err.code = 'ENGINEER';
    throw err;
  }

  return { customerName, customerPhone: phoneDigits, engineerName };
}

function maskPhone(digits) {
  const d = String(digits || '').replace(/\D/g, '');
  if (d.length === 11) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-****`;
  }
  if (d.length === 10) {
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-****`;
  }
  return '***-****-****';
}

function buildInternalRecord(input) {
  const {
    id,
    date,
    customerName,
    customerPhone,
    engineerName,
    imageUrl,
    cafeUrl,
  } = input;

  const customerDisplay = `${customerName} 고객님`;
  const title = `${customerName} 고객님 출고`;
  const summary = `${engineerName} 엔지니어 조립·출고`;
  const specs = '';

  return {
    id,
    date,
    createdAt: input.createdAt || new Date().toISOString(),
    customerName,
    customerPhone,
    customerPhoneMasked: maskPhone(customerPhone),
    customerDisplay,
    engineerName,
    title,
    summary,
    specs,
    imageUrl,
    cafeUrl: cafeUrl && String(cafeUrl).trim() ? String(cafeUrl).trim() : '',
    isPublic: true,
  };
}

/**
 * 공개 API·프론트용 (원번호·실명 원문 그대로 노출 금지)
 * @param {object} internal
 * @param {string} galleryMenuUrl
 */
function toPublicItem(internal, galleryMenuUrl) {
  const gallery = galleryMenuUrl || DEFAULT_GALLERY;
  const cafeUrl =
    internal.cafeUrl && String(internal.cafeUrl).trim()
      ? String(internal.cafeUrl).trim()
      : gallery;

  return {
    id: internal.id,
    title: internal.title,
    image: internal.imageUrl,
    summary: internal.summary,
    date: internal.date,
    specs: internal.specs && String(internal.specs).trim() ? internal.specs : '',
    cafeUrl,
  };
}

module.exports = {
  parseShippingLine,
  maskPhone,
  buildInternalRecord,
  toPublicItem,
  DEFAULT_GALLERY,
};
