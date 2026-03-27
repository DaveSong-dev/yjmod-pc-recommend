/**
 * card-text-generator.js — 섹션/스펙 기반 동적 카드 설명 생성
 *
 * 핵심 원칙:
 *   - 같은 상품이라도 표시되는 섹션에 따라 다른 문구를 생성한다
 *   - GPU/VRAM/RAM/SSD/색상/Wi-Fi/CPU/등급/가격 조합으로 최대한 다양한 문구를 만든다
 *   - reco v2의 정적 summary_reason/selling_points 대신 런타임 생성을 사용한다
 */

// ─── 섹션 키 매핑 ─────────────────────────────────────────────
const GROUP_TO_SECTION = {
  'usage:게이밍':          'gaming',
  'usage:영상편집':        'editing',
  'usage:사무/디자인':     'office',
  'usage:3D 모델링':       'modeling',
  'usage:방송/스트리밍':   'streaming',
  'bestFor:AI 공부용':     'ai_study',
  'bestFor:로컬 LLM 입문': 'local_llm',
  'bestFor:QHD 게이밍':    'qhd_gaming',
  'bestFor:4K 게이밍':     '4k_gaming',
  'bestFor:화이트 감성':   'white',
};

export function groupToSectionKey(groupKey, groupValue) {
  return GROUP_TO_SECTION[`${groupKey}:${groupValue}`]
    || (groupKey === 'installment' ? 'installment' : 'default');
}

export function filterToSectionKey(filterState) {
  if (!filterState) return 'default';
  if (filterState.bestFor) {
    const m = GROUP_TO_SECTION[`bestFor:${filterState.bestFor}`];
    if (m) return m;
  }
  if (filterState.game) return 'gaming';
  if (filterState.usage) {
    const m = GROUP_TO_SECTION[`usage:${filterState.usage}`];
    if (m) return m;
  }
  if (filterState.caseColor === '화이트') return 'white';
  return 'default';
}

// ─── 헬퍼 ──────────────────────────────────────────────────────
function sl(gb) {
  if (!gb || gb <= 0) return '';
  return gb >= 1024 ? `${Math.round(gb / 1024)}TB` : `${gb}GB`;
}

function gpuTier(gpu) {
  if (!gpu) return 'entry';
  if (/5090|6000/i.test(gpu)) return 'flagship';
  if (/5080|4090/i.test(gpu)) return 'high';
  if (/5070\s*Ti|4080/i.test(gpu)) return 'upper';
  if (/5070(?!\s*Ti)|4070\s*Ti/i.test(gpu)) return 'mid_high';
  if (/5060\s*Ti|4070(?!\s*Ti)|9070\s*XT/i.test(gpu)) return 'mid';
  if (/5060(?!\s*Ti)|9060|4060/i.test(gpu)) return 'entry_mid';
  return 'entry';
}

function priceBand(product) {
  const p = product.price || 0;
  if (p >= 4000000) return 'premium';
  if (p >= 3000000) return 'high';
  if (p >= 2000000) return 'mid';
  if (p >= 1500000) return 'value';
  return 'budget';
}

function priceLabel(product) {
  const m = Math.round((product.price || 0) / 10000);
  if (m >= 100) return `${Math.floor(m / 50) * 50}만 원대`;
  return `${m}만 원대`;
}

function extract(v2, product) {
  return {
    gpu:    v2.gpu_norm || product.specs?.gpu_short || '',
    cpu:    v2.cpu_norm || product.specs?.cpu_short || '',
    vram:   v2.gpu_vram_gb || 0,
    ram:    v2.ram_gb || 0,
    ssd:    v2.ssd_total_gb || 0,
    wifi:   !!v2.wifi_support,
    color:  v2.case_color || product.case_color || '',
    qhd:   v2.gaming_grade_qhd || '',
    g4k:   v2.gaming_grade_4k || '',
    fhd:   v2.gaming_grade_fhd || '',
    vidEd:  v2.video_edit_grade || '',
    stream: v2.streaming_grade || '',
    model:  v2.modeling_grade || '',
    aiGrade: v2.local_ai_grade || 0,
    tensor: v2.gpu_tensor_class || '',
    tier:   gpuTier(v2.gpu_norm || ''),
    pos:    priceBand(product),
    ssdLabel: sl(v2.ssd_total_gb),
    priceLabel: priceLabel(product),
  };
}

/** 메인 요약 문장 뒤에 추가될 차별화 접미사 — 아직 문장에서 언급되지 않은 축을 사용 */
function suffix(d, usedAxes) {
  const extras = [];
  if (!usedAxes.has('color') && d.color === 'white') extras.push('화이트 구성');
  else if (!usedAxes.has('color') && d.color === 'other') extras.push('특별 컬러');
  if (!usedAxes.has('cpu') && d.cpu) extras.push(d.cpu);
  if (!usedAxes.has('wifi') && d.wifi) extras.push('Wi-Fi');
  if (!usedAxes.has('ssd') && d.ssd >= 2048) extras.push(`${sl(d.ssd)} 대용량`);
  else if (!usedAxes.has('ssd') && d.ssd >= 1024) extras.push(`${sl(d.ssd)} 저장`);
  else if (!usedAxes.has('ssd') && d.ssd >= 512) extras.push(`${d.ssd}GB SSD`);
  if (!usedAxes.has('ram') && d.ram >= 64) extras.push(`${d.ram}GB 대용량`);
  if (!usedAxes.has('price') && d.priceLabel) extras.push(d.priceLabel);
  if (extras.length === 0) return '';
  return ' — ' + extras.slice(0, 3).join(' · ');
}

// ─── 섹션별 요약 생성 ───────────────────────────────────────────

function gamingSummary(d, product) {
  const used = new Set(['gpu', 'vram']);
  let base;
  if (d.tier === 'flagship' || d.tier === 'high') {
    if (d.g4k === 'optimal') {
      used.add('ram');
      base = `${d.gpu} ${d.vram}GB로 4K 울트라 세팅 쾌적, ${d.ram}GB 메모리로 게임+작업 병행`;
    } else {
      base = `${d.gpu} ${d.vram}GB로 QHD~4K 고옵션 게이밍 대응, 하이엔드 빌드`;
    }
  } else if (d.tier === 'upper') {
    if (d.qhd === 'strong') {
      used.add('ram');
      base = `${d.gpu} ${d.vram}GB VRAM으로 QHD 최고 옵션 144Hz 안정, ${d.ram}GB 구성`;
    } else {
      base = `${d.gpu} ${d.vram}GB로 QHD 고프레임 게이밍에 최적화`;
    }
  } else if (d.tier === 'mid_high' || d.tier === 'mid') {
    if (d.pos === 'value' || d.pos === 'budget') {
      used.add('price');
      base = `${d.gpu} ${d.vram}GB로 QHD 중옵션 게이밍 가성비 구성, FHD 고프레임`;
    } else {
      used.add('ram');
      base = `${d.gpu} ${d.vram}GB로 QHD 밸런스 게이밍, ${d.ram}GB 메모리`;
    }
  } else {
    if (d.pos === 'budget') {
      used.add('price');
      base = `${d.gpu}로 FHD 게이밍 입문 가성비 구성`;
    } else {
      base = `${d.gpu} ${d.vram}GB로 FHD 고프레임 게이밍, QHD 설정 조정 가능`;
    }
  }
  return base + suffix(d, used);
}

function qhdGamingSummary(d) {
  const used = new Set(['gpu', 'vram']);
  let base;
  if (d.qhd === 'strong') {
    used.add('ssd');
    base = `${d.gpu} ${d.vram}GB로 QHD 최고 옵션 안정 프레임, ${d.ssdLabel || '1TB'} AAA 다수 설치`;
  } else if (d.qhd === 'good') {
    used.add('ram');
    base = `${d.gpu} ${d.vram}GB 기반 QHD 중~고옵션 쾌적, ${d.ram}GB 멀티태스킹 여유`;
  } else {
    base = `${d.gpu}로 QHD 입문급 게이밍, 설정 최적화 시 60fps 목표`;
  }
  return base + suffix(d, used);
}

function fourKGamingSummary(d) {
  const used = new Set(['gpu', 'vram']);
  let base;
  if (d.g4k === 'optimal') {
    used.add('ram');
    base = `${d.gpu} ${d.vram}GB로 4K 울트라 60fps 이상 안정, ${d.ram}GB RAM 배경 작업 병행`;
  } else if (d.g4k === 'possible') {
    base = `${d.gpu} ${d.vram}GB로 4K 중옵션 도전 가능, QHD 고프레임 확보`;
  } else {
    base = `${d.gpu} ${d.vram}GB 기반 4K 저옵션 체험, QHD 중심 추천`;
  }
  return base + suffix(d, used);
}

function aiStudySummary(d) {
  const used = new Set(['gpu', 'vram']);
  let base;
  if (d.aiGrade >= 4) {
    used.add('ram');
    base = `${d.gpu} ${d.vram}GB VRAM + ${d.ram}GB RAM으로 중대형 모델 학습·추론, 전문 AI 환경`;
  } else if (d.aiGrade >= 3) {
    base = `${d.gpu} ${d.vram}GB VRAM과 텐서코어로 Stable Diffusion·중규모 학습 가능`;
  } else if (d.aiGrade >= 2) {
    base = `${d.gpu} ${d.vram}GB로 CUDA 학습과 소규모 딥러닝 적합, AI 입문 추천`;
  } else if (d.tensor.startsWith('nvidia')) {
    base = `${d.gpu} ${d.vram}GB + CUDA 코어로 딥러닝 첫 걸음, PyTorch·TensorFlow 학습용`;
  } else if (d.tensor.startsWith('amd')) {
    base = `${d.gpu} ${d.vram}GB 기반 ROCm 활용 가능, AMD 생태계 AI 입문`;
  } else {
    base = `${d.gpu} ${d.vram}GB로 기초 AI 학습 가능`;
  }
  return base + suffix(d, used);
}

function localLlmSummary(d) {
  const used = new Set(['gpu', 'vram']);
  let base;
  if (d.aiGrade >= 5) {
    used.add('ram');
    base = `${d.gpu} ${d.vram}GB로 13B+ LLM 로컬 추론 가능, ${d.ram}GB RAM 대형 컨텍스트 처리`;
  } else if (d.aiGrade >= 4) {
    base = `${d.gpu} ${d.vram}GB로 7B LLM 실시간 추론 쾌적, 로컬 AI 어시스턴트 구축`;
  } else if (d.aiGrade >= 3) {
    base = `${d.gpu} ${d.vram}GB로 소형 LLM 추론 가능, llama.cpp·Ollama 활용 적합`;
  } else if (d.vram >= 12) {
    used.add('ram');
    base = `${d.gpu} ${d.vram}GB VRAM 기반 경량 LLM 추론 입문, ${d.ram}GB RAM`;
  } else {
    base = `${d.gpu} ${d.vram}GB로 초소형 모델 추론 체험, 본격 LLM에는 VRAM 업그레이드 권장`;
  }
  return base + suffix(d, used);
}

function editingSummary(d) {
  const used = new Set(['gpu', 'vram']);
  let base;
  if (d.vidEd === 'standard' && d.ram >= 64) {
    used.add('ram').add('cpu');
    base = `${d.cpu} + ${d.gpu} ${d.vram}GB에 ${d.ram}GB RAM 대용량, 4K 프리미어·다빈치 안정`;
  } else if (d.vidEd === 'standard' && d.ram >= 32) {
    used.add('ram').add('ssd');
    base = `${d.gpu} ${d.vram}GB + ${d.ram}GB로 FHD~QHD 편집 쾌적, ${d.ssdLabel} 프로젝트 저장`;
  } else if (d.vidEd === 'standard') {
    used.add('ssd');
    base = `${d.gpu} CUDA 가속으로 프리미어 인코딩 쾌적, ${d.ssdLabel} 소스 저장`;
  } else if (d.vidEd === 'entry') {
    used.add('ram');
    base = `${d.gpu}로 FHD 컷편집·자막 작업 입문 적합, ${d.ram}GB 메모리`;
  } else {
    base = `${d.gpu} 기반 기초 편집 가능, 전문 작업에는 메모리·VRAM 업그레이드 권장`;
  }
  return base + suffix(d, used);
}

function streamingSummary(d) {
  const used = new Set(['gpu', 'cpu']);
  let base;
  if (d.tier === 'flagship' || d.tier === 'high') {
    used.add('ram');
    base = `${d.cpu} + ${d.gpu}로 고화질 게임+OBS 4K 송출 동시 가능, ${d.ram}GB RAM 여유`;
  } else if (d.tier === 'upper' || d.tier === 'mid_high') {
    used.add('vram').add('ssd');
    base = `${d.cpu} + ${d.gpu} ${d.vram}GB로 QHD 게임+FHD 송출 최적화, ${d.ssdLabel} 녹화`;
  } else if (d.tier === 'mid') {
    used.add('ram');
    base = `${d.gpu} NVENC 인코더로 FHD 원컴방송 쾌적, ${d.ram}GB로 OBS+게임 동시 구동`;
  } else {
    base = `${d.gpu}로 FHD 입문 방송, 경량 게임+송출 원컴 구성`;
  }
  return base + suffix(d, used);
}

function officeSummary(d) {
  const used = new Set(['cpu']);
  let base;
  if (d.pos === 'premium' || d.pos === 'high') {
    used.add('gpu').add('ram').add('price');
    base = `${d.cpu} + ${d.gpu}로 디자인·CAD 겸용 고성능 사무 환경, ${d.ram}GB RAM`;
  } else if (d.ram >= 32) {
    used.add('ram');
    base = `${d.cpu} 기반 멀티탭·문서 쾌적, ${d.ram}GB RAM 대용량 엑셀·포토샵 대응`;
  } else if (d.wifi) {
    used.add('wifi').add('ssd');
    base = `${d.cpu} + Wi-Fi 내장으로 깔끔한 사무 환경, ${d.ssdLabel} 저장`;
  } else {
    used.add('ssd');
    base = `${d.cpu} 기반 업무·문서·웹 작업 쾌적, ${d.ssdLabel} SSD 빠른 부팅`;
  }
  return base + suffix(d, used);
}

function modelingSummary(d) {
  const used = new Set(['gpu', 'vram']);
  let base;
  if (d.model === 'standard' && d.vram >= 16) {
    used.add('ram');
    base = `${d.gpu} ${d.vram}GB로 블렌더·솔리드웍스 뷰포트 쾌적, ${d.ram}GB RAM 대형 어셈블리`;
  } else if (d.model === 'standard') {
    used.add('ram').add('ssd');
    base = `${d.gpu} ${d.vram}GB + ${d.ram}GB RAM으로 CAD·3D 중급 작업, ${d.ssdLabel} 프로젝트 저장`;
  } else if (d.model === 'entry') {
    used.add('ram');
    base = `${d.gpu}로 기초 3D 모델링·렌더링 입문, ${d.ram}GB 메모리`;
  } else {
    base = `${d.gpu} 기반 경량 3D 작업, 대규모 렌더링에는 VRAM 업그레이드 권장`;
  }
  return base + suffix(d, used);
}

function whiteSummary(d, product) {
  const used = new Set(['gpu', 'color']);
  const base = `화이트 케이스 통일에 ${d.gpu}`;
  if (d.wifi && (d.pos === 'premium' || d.pos === 'high')) {
    used.add('wifi').add('price');
    return base + ' 탑재, Wi-Fi 내장 선정리 최소화, 프리미엄 감성 완성' + suffix(d, used);
  }
  if (d.wifi) {
    used.add('wifi');
    return base + ' + Wi-Fi 내장, 케이블 최소화 깔끔한 데스크 셋업' + suffix(d, used);
  }
  if (d.ram >= 64) {
    used.add('ram');
    return base + ` + ${d.ram}GB 대용량, 감성과 퍼포먼스 모두 갖춘 화이트` + suffix(d, used);
  }
  if (d.ram >= 32) {
    used.add('ram');
    return base + ` + ${d.ram}GB RAM, 감성과 성능 모두 갖춘 화이트 빌드` + suffix(d, used);
  }
  used.add('ssd');
  return base + `, ${d.ssdLabel} SSD, 인테리어 감성 데스크톱` + suffix(d, used);
}

function installmentSummary(d, product) {
  const used = new Set(['gpu', 'ram', 'price']);
  const months = product.installment_months || 0;
  const monthly = product.price_monthly || 0;
  let base;
  if (monthly > 0) {
    const mm = Math.round(monthly / 10000);
    base = `${d.gpu} + ${d.ram}GB 구성을 월 ${mm}만 원(${months}개월 무이자), 부담 없는 고성능`;
  } else if (months > 0) {
    const tm = Math.round((product.price || 0) / 10000);
    const em = Math.round(tm / months);
    base = `${d.gpu} + ${d.ram}GB RAM, ${months}개월 무이자 시 월 약 ${em}만 원`;
  } else {
    base = `${d.gpu} + ${d.ram}GB RAM 구성`;
  }
  return base + suffix(d, used);
}

function defaultSummary(d) {
  const parts = [`${d.gpu} ${d.vram}GB`];

  if (d.cpu) parts.push(d.cpu);

  if (d.qhd === 'strong') parts.push('QHD 고옵션');
  else if (d.qhd === 'good') parts.push('QHD 밸런스');
  else parts.push('FHD');

  if (d.vidEd === 'standard') parts.push('영상편집');

  if (d.ram >= 128) parts.push(`${d.ram}GB 서버급`);
  else if (d.ram >= 64) parts.push(`${d.ram}GB 대용량`);
  else if (d.ram >= 32) parts.push(`${d.ram}GB`);
  else if (d.ram >= 16) parts.push(`${d.ram}GB RAM`);

  if (d.ssd >= 2048) parts.push(`${sl(d.ssd)} 대용량`);
  else if (d.ssd >= 1024) parts.push(`${sl(d.ssd)}`);
  else if (d.ssd > 0) parts.push(`${d.ssd}GB SSD`);

  const extras = [];
  if (d.color === 'white') extras.push('화이트');
  if (d.wifi) extras.push('Wi-Fi');
  if (extras.length) parts.push(extras.join('+'));

  if (d.priceLabel) parts.push(d.priceLabel);

  return parts.join(' · ');
}

// ─── 메인 요약 생성 ──────────────────────────────────────────────

export function generateSummary(product, sectionKey) {
  const v2 = product.v2;
  if (!v2) return '';
  const d = extract(v2, product);
  if (!d.gpu) return '';

  switch (sectionKey) {
    case 'gaming':      return gamingSummary(d, product);
    case 'qhd_gaming':  return qhdGamingSummary(d);
    case '4k_gaming':   return fourKGamingSummary(d);
    case 'ai_study':    return aiStudySummary(d);
    case 'local_llm':   return localLlmSummary(d);
    case 'editing':     return editingSummary(d);
    case 'streaming':   return streamingSummary(d);
    case 'office':      return officeSummary(d);
    case 'modeling':    return modelingSummary(d);
    case 'white':       return whiteSummary(d, product);
    case 'installment': return installmentSummary(d, product);
    default:            return defaultSummary(d);
  }
}

// ─── 셀링 포인트 생성 ────────────────────────────────────────────

export function generateSellingPoints(product, sectionKey) {
  const v2 = product.v2;
  if (!v2) return [];
  const d = extract(v2, product);
  const points = [];

  if (d.gpu && d.vram) points.push(`${d.gpu} ${d.vram}GB`);
  else if (d.gpu) points.push(d.gpu);

  switch (sectionKey) {
    case 'ai_study':
    case 'local_llm':
      if (d.tensor.startsWith('nvidia')) points.push('CUDA 텐서코어');
      if (d.aiGrade >= 4) points.push('로컬 AI Pro');
      else if (d.aiGrade >= 3) points.push('로컬 AI 가능');
      else if (d.aiGrade >= 2) points.push('AI 입문 적합');
      break;
    case 'gaming':
    case 'qhd_gaming':
    case '4k_gaming':
      if (d.g4k === 'optimal') points.push('4K 쾌적');
      else if (d.qhd === 'strong') points.push('QHD 최고');
      else if (d.qhd === 'good') points.push('QHD 쾌적');
      else points.push('FHD 고프레임');
      break;
    case 'editing':
      if (d.vidEd === 'standard') points.push('편집 표준');
      else points.push('편집 입문');
      if (d.cpu) points.push(d.cpu);
      break;
    case 'streaming':
      if (d.tensor.startsWith('nvidia')) points.push('NVENC 인코더');
      points.push('원컴방송');
      break;
    case 'modeling':
      if (d.model === 'standard') points.push('CAD·렌더링');
      break;
    case 'white':
      points.push('화이트 통일');
      break;
    case 'installment':
      if (product.installment_months) points.push(`${product.installment_months}개월 무이자`);
      break;
  }

  if (d.ram >= 128) points.push(`${d.ram}GB 서버급`);
  else if (d.ram >= 64) points.push(`${d.ram}GB 대용량`);
  else if (d.ram >= 32) points.push(`DDR5 ${d.ram}GB`);
  else if (d.ram >= 16) points.push(`${d.ram}GB RAM`);

  if (d.ssd >= 4096) points.push(`${sl(d.ssd)} 대용량`);
  else if (d.ssd >= 2048) points.push(`${sl(d.ssd)} NVMe`);
  else if (d.ssd >= 1024) points.push('1TB NVMe');
  else if (d.ssd >= 512) points.push(`${d.ssd}GB SSD`);

  if (d.wifi) points.push('Wi-Fi 내장');
  if (d.color === 'white' && sectionKey !== 'white') points.push('화이트 케이스');

  return [...new Set(points)].slice(0, 4);
}
