/**
 * wizard.js - 4단계 PC 추천 위자드 (용도 우선)
 * 권장 흐름: 용도 → (게이밍이면 게임선택) → 예산 → 디자인 → 결과
 * 비게이밍 선택 시 2단계(게임) 생략, 1→3으로 이동
 * 작업강도(workTier) step 없음 - state에 미포함, 필터 충돌 방지
 */

import { getWizardRecommendations } from './filter.js';
import { renderWizardResultCard } from './render.js';
import {
  createFlowLogger,
  debugDomUpdate,
  debugEvent,
  debugRender,
  debugResultCount,
  debugState,
  debugStep,
  isDebugMode
} from './debug.js';
import { observeScrollFade } from './utils.js';
import { buildPriceBand, serializeWizardSelections, trackEvent } from './analytics.js';

const TOTAL_STEPS = 4;

/** 용도별 선택지 (1단계) */
const PURPOSE_OPTIONS = [
  { id: 'gaming', label: '게이밍', value: 'gaming', icon: '🎮', desc: '게임 전용 PC' },
  { id: 'ai_study', label: 'AI 공부용', value: 'ai_study', icon: '🧠', desc: 'CUDA 입문·딥러닝 학습' },
  { id: 'local_llm', label: '로컬 LLM', value: 'local_llm', icon: '🤖', desc: '로컬 AI·LLM 추론' },
  { id: 'editing', label: '영상편집', value: 'editing', icon: '🎬', desc: '프리미어·에펙 등' },
  { id: 'office', label: '사무용', value: 'office', icon: '💼', desc: '문서·업무용' },
  { id: '3d', label: '3D 모델링', value: '3d', icon: '🎨', desc: '블렌더·CAD 등' },
  { id: 'ai', label: '생성형 AI', value: 'ai', icon: '🔬', desc: '이미지생성·학습·추론' },
  { id: 'streaming', label: '방송·스트리밍', value: 'streaming', icon: '📺', desc: '방송·인코딩' }
];

/** 게임 선택지 (2단계 - 게이밍 분기) */
const GAME_OPTIONS = [
  { id: 'lol', label: '리그오브레전드', value: '리그오브레전드', icon: '🎮', desc: '롤 / 롤 아레나' },
  { id: 'pubg', label: '배틀그라운드', value: '배틀그라운드', icon: '🔫', desc: '배그 / 소총 게임' },
  { id: 'loa', label: '로스트아크', value: '로스트아크', icon: '⚔️', desc: '로아 / MMORPG' },
  { id: 'aaa', label: '스팀 AAA 게임', value: '스팀 AAA급 게임', icon: '🎲', desc: '사이버펑크 / 와일즈 등' },
  { id: 'valorant', label: '발로란트', value: '발로란트', icon: '🎯', desc: '발로 / FPS 경쟁전' },
  { id: 'ow2', label: '오버워치2', value: '오버워치2', icon: '🦸', desc: '오버워치 / 팀 FPS' }
];

/** 예산 프리셋 (3단계 — 새 UI) */
const BUDGET_PRESETS = [
  { value: 100,    label: '~100만원',  icon: '💰', desc: '가성비 입문·사무용' },
  { value: 150,    label: '150만원',   icon: '💵', desc: 'FHD 게이밍 중급' },
  { value: 200,    label: '200만원',   icon: '💵', desc: 'QHD 게이밍·편집' },
  { value: 300,    label: '300만원',   icon: '💎', desc: '고성능·4K 게이밍' },
  { value: 500,    label: '500만원',   icon: '👑', desc: '하이엔드·딥러닝' },
  { value: 1000,   label: '1000만원',  icon: '🏅', desc: '워크스테이션급' },
  { value: 'custom', label: '직접 입력', icon: '✏️', desc: '원하는 금액 직접' }
];

/** 레거시 호환용 (export 유지) */
const BUDGET_OPTIONS = BUDGET_PRESETS;

/** 디자인 선택지 (4단계) */
const DESIGN_OPTIONS = [
  { id: 'black', label: '블랙 & 다크', value: 'black', icon: '🖤', desc: '강렬하고 세련된 다크 톤' },
  { id: 'white', label: '화이트 & 클린', value: 'white', icon: '🤍', desc: '깔끔하고 감성적인 화이트' },
  { id: 'rgb', label: 'RGB 풀커스텀', value: 'rgb', icon: '🌈', desc: 'RGB 튜닝 화려한 연출' }
];

/**
 * step과 selections에 따라 표시할 스텝 설정 반환
 * @param {number} step - 1..4
 */
function getStepConfig(step, selections) {
  switch (step) {
    case 1:
      return {
        title: 'PC 용도를 선택해 주세요',
        subtitle: '주로 어떤 용도로 사용하실 예정인가요?',
        options: PURPOSE_OPTIONS,
        stepKey: 'purpose',
        required: true
      };
    case 2:
      return {
        title: '어떤 게임을 즐기시나요?',
        subtitle: '주로 플레이하는 게임을 선택해 주세요',
        options: GAME_OPTIONS,
        stepKey: 'game',
        required: false
      };
    case 3:
      return {
        title: '예산이 얼마나 되시나요?',
        subtitle: '선택하신 예산 내에서 최적의 견적을 추천해 드립니다',
        options: BUDGET_OPTIONS,
        stepKey: 'budget',
        required: true
      };
    case 4:
      return {
        title: '케이스 스타일을 골라주세요',
        subtitle: '취향에 맞는 디자인으로 완성도를 높여보세요',
        options: DESIGN_OPTIONS,
        stepKey: 'design',
        required: false
      };
    default:
      return null;
  }
}

/** 스텝별 상단 레이블 */
function getStepLabel(step) {
  const labels = ['용도', '게임', '예산', '디자인'];
  return labels[step - 1] || '';
}

class Wizard {
  constructor(modalId, products, fpsData) {
    this.modal = document.getElementById(modalId);
    this.products = products;
    this.fpsData = fpsData;
    this.flowLog = createFlowLogger('Wizard');
    this.currentStep = 1;
    this.selections = {
      purpose: null,
      game: null,
      budget: null,
      design: null
    };
    this.resultContainer = document.getElementById('wizard-result-container');
    this.resultSection = document.getElementById('wizard-result-section');
    this._resultScrollTimers = [];
    this._resultScrollRunId = 0;
    this._stepAdvanceTimer = null;
    this._isAdvancing = false;

    if (!this.modal) return;
    this.init();
  }

  setCatalog(products = [], fpsData = null) {
    this.products = Array.isArray(products) ? products : [];
    this.fpsData = fpsData;
    this.flowLog('catalog:update', {
      productCount: this.products.length,
      hasFpsData: Boolean(this.fpsData)
    });
  }

  init() {
    this.flowLog('init', { productCount: this.products?.length || 0 });
    this.renderStep(1);
    this.bindModalClose();
    this.modal.querySelector('[data-close-wizard]')?.addEventListener('click', () => this.close());
  }

  /**
   * @param {{ game?: string, purpose?: string, sourceSection?: string }} options
   * game: 게임별 추천 버튼에서 선택한 게임이면 3단계(예산)부터 열림
   * purpose: 용도 프리셋이면 게이밍은 2단계부터, 비게이밍은 3단계부터 진입
   */
  open(options = {}) {
    this.clearPendingResultScroll();
    window.clearTimeout(this._stepAdvanceTimer);
    this._isAdvancing = false;
    this.currentStep = 1;
    this.selections = {
      purpose: null,
      game: null,
      budget: null,
      design: null
    };
    this.entrySourceSection = options?.sourceSection || 'wizard_entry';

    const presetGame = options?.game && String(options.game).trim();
    const presetPurpose = options?.purpose && String(options.purpose).trim();
    if (presetGame) {
      this.selections.purpose = 'gaming';
      this.selections.game = presetGame;
      this.currentStep = 3; // 예산 단계부터
    } else if (presetPurpose) {
      this.selections.purpose = presetPurpose;
      this.currentStep = presetPurpose === 'gaming' ? 2 : 3;
    }

    this.flowLog('open', {
      sourceSection: this.entrySourceSection,
      currentStep: this.currentStep,
      selections: this.selections,
      productCount: this.products?.length || 0
    });
    debugEvent('wizard_open', {
      sourceSection: this.entrySourceSection,
      currentStep: this.currentStep,
      presetPurpose: this.selections.purpose,
      presetGame: this.selections.game
    });

    this._savedScrollY = window.pageYOffset;
    this.renderStep(this.currentStep);
    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    debugDomUpdate({
      modal_visible: !this.modal.classList.contains('hidden'),
      currentStep: this.currentStep
    });

    requestAnimationFrame(() => {
      const panel = this.modal.querySelector('.wizard-panel');
      if (panel) {
        panel.classList.remove('scale-95', 'opacity-0');
        panel.classList.add('scale-100', 'opacity-100');
      }
    });
  }

  close() {
    window.clearTimeout(this._stepAdvanceTimer);
    this._isAdvancing = false;
    const panel = this.modal.querySelector('.wizard-panel');
    if (panel) {
      panel.classList.add('scale-95', 'opacity-0');
      panel.classList.remove('scale-100', 'opacity-100');
    }
    setTimeout(() => {
      this.modal.classList.add('hidden');
      this.modal.classList.remove('flex');
      document.body.style.overflow = '';
      debugDomUpdate({
        modal_visible: !this.modal.classList.contains('hidden'),
        currentStep: this.currentStep
      });
    }, 200);
    this.flowLog('close');
  }

  bindModalClose() {
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  renderStep(step) {
    const config = getStepConfig(step, this.selections);
    if (!config) return;
    this.currentStep = step;
    this.flowLog('step:render', {
      step,
      stepKey: config.stepKey,
      selections: this.selections
    });
    debugRender(`renderStep(${step})`, {
      stepKey: config.stepKey
    });
    debugStep(step);
    debugState(this.selections);

    const panel = this.modal.querySelector('.wizard-panel') || this.modal;
    let content = panel.querySelector('.wizard-content');

    if (!content) {
      content = document.createElement('div');
      content.className = 'wizard-content px-6 pb-6 overflow-y-auto';
      panel.appendChild(content);
    } else {
      content.className = 'wizard-content px-6 pb-6 overflow-y-auto';
    }

    // 프로그레스 바: 4단계
    const progressBtns = panel.querySelectorAll('.step-indicator');
    progressBtns.forEach((btn, i) => {
      const stepNum = i + 1;
      btn.classList.toggle('step-active', stepNum === step);
      btn.classList.toggle('step-done', stepNum < step);
      btn.classList.toggle('step-pending', stepNum > step);
    });

    const labelEl = panel.querySelector('.step-label');
    if (labelEl) labelEl.textContent = getStepLabel(step);

    // 모바일 단계 카운터 "N/4 단계" 업데이트
    const counterEl = panel.querySelector('.step-counter');
    if (counterEl) counterEl.textContent = ` · ${step}/${TOTAL_STEPS} 단계`;

    const connectors = panel.querySelectorAll('.step-connector');
    connectors.forEach((conn, i) => {
      conn.classList.toggle('done', i + 1 < step);
    });

    content.style.opacity = '0';
    content.style.transform = 'translateX(20px)';

    // 용도/예산 필수, 나머지(게임·디자인) 건너뛰기 허용
    const showSkip = !config.required;
    const selectedValue = this.selections[config.stepKey];
    const skipBtn = showSkip
      ? '<button id="wizard-skip" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">건너뛰기</button>'
      : '<span></span>';

    // 이전 단계 선택 내역 태그 생성
    const _pL = { gaming: '🎮 게이밍', office: '💼 사무용', editing: '🎬 영상편집', '3d': '🎨 3D 모델링', ai: '🔬 생성형 AI', ai_study: '🧠 AI 공부용', local_llm: '🤖 로컬 LLM', streaming: '📺 방송·스트리밍' };
    const _bL = { budget_under100: '💰 100만원 이하', budget_100_200: '💵 100~200만원', budget_200_300: '💎 200~300만원', budget_over300: '👑 300만원+' };
    const _dL = { black: '🖤 블랙', white: '🤍 화이트', rgb: '🌈 RGB' };
    const _prevTags = [];
    if (step > 1 && this.selections.purpose) _prevTags.push(_pL[this.selections.purpose] || this.selections.purpose);
    if (step > 2 && this.selections.game) _prevTags.push(`🎮 ${this.selections.game}`);
    if (step > 3 && this.selections.budget && this.selections.budget !== 'custom') {
      const budgetLabel = typeof this.selections.budget === 'number'
        ? `💰 ~${this.selections.budget}만원`
        : (_bL[this.selections.budget] || this.selections.budget);
      _prevTags.push(budgetLabel);
    }
    const prevTagsHtml = _prevTags.length
      ? `<div class="flex flex-wrap gap-1.5 mb-3">${_prevTags.map(t => `<span class="wizard-prev-tag">${t}</span>`).join('')}</div>`
      : '';

    const isBudgetStep = config.stepKey === 'budget';
    const mainContent = isBudgetStep
      ? this.renderBudgetContent(selectedValue)
      : `
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          ${config.options.map(opt => `
            <button
              class="wizard-option group relative flex flex-col items-center gap-2 p-4 rounded-xl
                     border ${selectedValue === opt.value ? 'border-accent bg-accent/10' : 'border-white/10 bg-surface'} hover:border-accent/50 hover:bg-accent/5
                     transition-all duration-200 text-center cursor-pointer"
              data-value="${opt.value}"
              data-step="${step}"
            >
              <span class="text-2xl">${opt.icon}</span>
              <span class="text-sm font-semibold text-white">${opt.label}</span>
              <span class="text-xs text-gray-500">${opt.desc}</span>
              <div class="wizard-check absolute top-2 right-2 w-5 h-5 rounded-full bg-accent
                          flex items-center justify-center ${selectedValue === opt.value ? 'opacity-100 scale-100' : 'opacity-0 scale-0'} transition-all duration-200">
                <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </button>
          `).join('')}
        </div>`;

    content.innerHTML = `
      <div class="mb-4">
        ${prevTagsHtml}
        <h3 class="text-xl font-bold text-white">${config.title}</h3>
        <p class="text-sm text-gray-400 mt-1">${config.subtitle}</p>
      </div>

      ${mainContent}

      <div class="flex justify-between mt-6">
        ${step > 1 ? `
          <button id="wizard-prev" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            ← 이전
          </button>` : '<div></div>'}
        ${skipBtn}
      </div>
    `;

    requestAnimationFrame(() => {
      content.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      content.style.opacity = '1';
      content.style.transform = 'translateX(0)';
      debugDomUpdate({
        step,
        stepKey: config.stepKey,
        optionCount: config.options.length
      });
    });

    this.bindStepEventsDelegated(step, config);
  }

  /** 예산 스텝 전용 콘텐츠 HTML 생성 */
  renderBudgetContent(selectedValue) {
    const isCustom = selectedValue === 'custom';
    const isNumeric = typeof selectedValue === 'number';

    const checkSvg = `<svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
    </svg>`;

    const chips = BUDGET_PRESETS.map((p, i) => {
      const isSelected = p.value === 'custom' ? isCustom : selectedValue === p.value;
      const isLast = i === BUDGET_PRESETS.length - 1;
      return `
        <button
          class="wizard-option group relative flex flex-col items-center gap-2 p-4 rounded-xl
                 border ${isSelected ? 'border-accent bg-accent/10' : 'border-white/10 bg-surface'}
                 hover:border-accent/50 hover:bg-accent/5 transition-all duration-200 text-center cursor-pointer
                 ${isLast ? 'col-span-2 sm:col-span-1' : ''}"
          data-budget-preset="${p.value}"
        >
          <span class="text-2xl">${p.icon}</span>
          <span class="text-sm font-semibold text-white">${p.label}</span>
          <span class="text-xs text-gray-500">${p.desc}</span>
          <div class="wizard-check absolute top-2 right-2 w-5 h-5 rounded-full bg-accent
                      flex items-center justify-center ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-0'} transition-all duration-200">
            ${checkSvg}
          </div>
        </button>`;
    }).join('');

    return `
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3" id="budget-preset-grid">
        ${chips}
      </div>
      <div id="budget-custom-area" class="${isCustom ? '' : 'hidden'} mt-1 p-4 bg-white/5 rounded-xl border border-white/10">
        <label class="block text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">최대 예산 입력</label>
        <div class="flex items-center gap-3">
          <div class="relative flex-1">
            <input
              id="budget-custom-input"
              type="number" min="50" max="10000" step="10"
              placeholder="예: 170"
              value="${isNumeric ? selectedValue : ''}"
              class="budget-custom-input w-full bg-bg border border-white/15 rounded-xl px-4 py-3
                     text-white text-lg font-semibold focus:outline-none focus:border-accent
                     transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">만원</span>
          </div>
          <button
            id="budget-custom-confirm"
            class="px-5 py-3 bg-accent hover:bg-red-500 text-white text-sm font-bold rounded-xl
                   transition-all duration-200 whitespace-nowrap flex-shrink-0"
          >다음 →</button>
        </div>
        <p class="text-xs text-gray-600 mt-2">50 ~ 10,000 만원 사이 숫자만 입력</p>
      </div>`;
  }

  /** 예산 스텝 이벤트 핸들러 */
  bindBudgetStepEvents(step, content) {
    content.onclick = (event) => {
      // 이전 버튼
      if (event.target.closest('#wizard-prev')) {
        if (this._isAdvancing) return;
        let prev = step - 1;
        if (prev === 2 && this.selections.purpose !== 'gaming') prev = 1;
        this.renderStep(prev);
        return;
      }
      // 건너뛰기
      if (event.target.closest('#wizard-skip')) {
        if (this._isAdvancing) return;
        if (this.selections.budget === 'custom') this.selections.budget = null;
        this.renderStep(step + 1);
        return;
      }
      // 직접 입력 확인 버튼
      if (event.target.closest('#budget-custom-confirm')) {
        const input = content.querySelector('#budget-custom-input');
        const val = parseInt(input?.value || '0', 10);
        if (!val || val < 50 || val > 10000) {
          input?.classList.add('!border-red-500');
          setTimeout(() => input?.classList.remove('!border-red-500'), 900);
          input?.focus();
          return;
        }
        this.selections.budget = val;
        this._isAdvancing = false;
        this.renderStep(step + 1);
        return;
      }
      // 프리셋 칩
      const presetBtn = event.target.closest('[data-budget-preset]');
      if (!presetBtn || !content.contains(presetBtn)) return;

      const raw = presetBtn.dataset.budgetPreset;

      // 시각적 선택 상태 갱신
      content.querySelectorAll('[data-budget-preset]').forEach(b => {
        b.classList.remove('border-accent', 'bg-accent/10');
        b.querySelector('.wizard-check')?.classList.add('opacity-0', 'scale-0');
      });
      presetBtn.classList.add('border-accent', 'bg-accent/10');
      presetBtn.querySelector('.wizard-check')?.classList.remove('opacity-0', 'scale-0');

      if (raw === 'custom') {
        // 직접 입력 영역 표시
        this.selections.budget = 'custom';
        const area = content.querySelector('#budget-custom-area');
        area?.classList.remove('hidden');
        setTimeout(() => content.querySelector('#budget-custom-input')?.focus(), 80);
        return;
      }

      // 숫자 프리셋 → 자동 다음 단계
      const numVal = parseInt(raw, 10);
      this.selections.budget = numVal;
      this._isAdvancing = true;
      window.clearTimeout(this._stepAdvanceTimer);
      this.flowLog('budget:select', { value: numVal });

      this._stepAdvanceTimer = window.setTimeout(() => {
        this._isAdvancing = false;
        this.renderStep(step + 1);
      }, 350);
    };

    // Enter 키로 직접 입력 확인
    content.querySelector('#budget-custom-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') content.querySelector('#budget-custom-confirm')?.click();
    });
  }

  bindStepEvents(step, config) {
    const content = this.modal.querySelector('.wizard-content');
    if (!content) return;
    const stepKey = config.stepKey;

    content.querySelectorAll('.wizard-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this._isAdvancing) return;

        content.querySelectorAll('.wizard-option').forEach(b => {
          b.classList.remove('border-accent', 'bg-accent/10');
          b.querySelector('.wizard-check')?.classList.add('opacity-0', 'scale-0');
        });
        btn.classList.add('border-accent', 'bg-accent/10');
        const check = btn.querySelector('.wizard-check');
        check?.classList.remove('opacity-0', 'scale-0');

        const value = btn.dataset.value;
        this.selections[stepKey] = value;
        this._isAdvancing = true;
        window.clearTimeout(this._stepAdvanceTimer);
        this.flowLog('step:select', {
          step,
          stepKey,
          value,
          selections: this.selections
        });

        this._stepAdvanceTimer = window.setTimeout(() => {
          this._isAdvancing = false;
          if (step < TOTAL_STEPS) {
            let nextStep = step + 1;
            // 비게이밍: 1단계 후 2단계(게임) 생략 → 3단계(예산)로
            if (nextStep === 2 && this.selections.purpose !== 'gaming') nextStep = 3;
            this.flowLog('step:advance', { from: step, to: nextStep });
            this.renderStep(nextStep);
          } else {
            this.showResults();
          }
        }, 350);
      });
    });

    document.getElementById('wizard-prev')?.addEventListener('click', () => {
      if (this._isAdvancing) return;
      let prevStep = step - 1;
      // 3단계에서 이전: 게이밍이면 2단계, 비게이밍이면 1단계
      if (prevStep === 2 && this.selections.purpose !== 'gaming') prevStep = 1;
      this.flowLog('step:back', { from: step, to: prevStep });
      this.renderStep(prevStep);
    });

    const skipBtn = document.getElementById('wizard-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        if (this._isAdvancing) return;
        if (step < TOTAL_STEPS) {
          let nextStep = step + 1;
          if (nextStep === 2 && this.selections.purpose !== 'gaming') nextStep = 3;
          this.flowLog('step:skip', { from: step, to: nextStep });
          this.renderStep(nextStep);
        } else {
          this.showResults();
        }
      });
    }
  }

  bindStepEventsDelegated(step, config) {
    const content = this.modal.querySelector('.wizard-content');
    if (!content) return;

    // 예산 스텝은 전용 핸들러로 위임
    if (config.stepKey === 'budget') {
      this.bindBudgetStepEvents(step, content);
      return;
    }

    const stepKey = config.stepKey;
    const allowedValues = new Set(config.options.map(option => String(option.value)));

    content.onclick = (event) => {
      const prevBtn = event.target.closest('#wizard-prev');
      if (prevBtn) {
        debugEvent('wizard_prev_click', { step });
        if (this._isAdvancing) {
          debugEvent('wizard_prev_blocked', {
            step,
            reason: 'is_advancing'
          });
          return;
        }
        let prevStep = step - 1;
        if (prevStep === 2 && this.selections.purpose !== 'gaming') prevStep = 1;
        this.flowLog('step:back', { from: step, to: prevStep });
        this.renderStep(prevStep);
        return;
      }

      const skipBtn = event.target.closest('#wizard-skip');
      if (skipBtn) {
        debugEvent('wizard_skip_click', { step });
        if (this._isAdvancing) {
          debugEvent('wizard_skip_blocked', {
            step,
            reason: 'is_advancing'
          });
          return;
        }
        if (step < TOTAL_STEPS) {
          let nextStep = step + 1;
          if (nextStep === 2 && this.selections.purpose !== 'gaming') nextStep = 3;
          this.flowLog('step:skip', { from: step, to: nextStep });
          this.renderStep(nextStep);
        } else {
          this.showResults();
        }
        return;
      }

      const btn = event.target.closest('.wizard-option');
      if (!btn || !content.contains(btn)) return;

      const value = String(btn.dataset.value || '');
      debugEvent('wizard_option_click', {
        step,
        stepKey,
        value
      });

      if (this._isAdvancing) {
        debugEvent('wizard_option_blocked', {
          step,
          stepKey,
          value,
          reason: 'is_advancing'
        });
        return;
      }

      if (!allowedValues.has(value)) {
        debugEvent('wizard_option_invalid', {
          step,
          stepKey,
          value,
          allowedValues: Array.from(allowedValues)
        });
        return;
      }

      content.querySelectorAll('.wizard-option').forEach(optionBtn => {
        optionBtn.classList.remove('border-accent', 'bg-accent/10');
        optionBtn.querySelector('.wizard-check')?.classList.add('opacity-0', 'scale-0');
      });
      btn.classList.add('border-accent', 'bg-accent/10');
      btn.querySelector('.wizard-check')?.classList.remove('opacity-0', 'scale-0');

      this.selections[stepKey] = value;
      this._isAdvancing = true;
      window.clearTimeout(this._stepAdvanceTimer);
      this.flowLog('step:select', {
        step,
        stepKey,
        value,
        selections: this.selections
      });
      debugStep(step);
      debugState(this.selections);

      this._stepAdvanceTimer = window.setTimeout(() => {
        this._isAdvancing = false;
        if (step < TOTAL_STEPS) {
          let nextStep = step + 1;
          if (nextStep === 2 && this.selections.purpose !== 'gaming') nextStep = 3;
          this.flowLog('step:advance', { from: step, to: nextStep });
          this.renderStep(nextStep);
        } else {
          this.showResults();
        }
      }, 350);
    };
  }

  clearPendingResultScroll() {
    this._resultScrollRunId += 1;
    this._resultScrollTimers.forEach(timerId => window.clearTimeout(timerId));
    this._resultScrollTimers = [];
  }

  runAfterLayout(callback) {
    requestAnimationFrame(() => {
      requestAnimationFrame(callback);
    });
  }

  getResultScrollTop() {
    if (!this.resultSection) return 0;
    const fallbackScrollY = this._savedScrollY || 0;
    const scrollY = window.pageYOffset || window.scrollY || fallbackScrollY;
    return Math.max(0, this.resultSection.getBoundingClientRect().top + scrollY - 8);
  }

  scrollResultsIntoView() {
    if (!this.resultSection) return;

    this.clearPendingResultScroll();
    const runId = this._resultScrollRunId;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const settleThreshold = 24;
    const maxAttempts = 6;
    const firstDelay = 400;
    const retryDelay = isMobile ? 450 : 500;

    const attemptScroll = (attemptIndex) => {
      if (runId !== this._resultScrollRunId || !this.resultSection) return;

      this.runAfterLayout(() => {
        if (runId !== this._resultScrollRunId || !this.resultSection) return;

        const currentTop = this.resultSection.getBoundingClientRect().top;
        if (Math.abs(currentTop - 8) > settleThreshold) {
          const targetTop = this.getResultScrollTop();
          const behavior = !isMobile && attemptIndex === 0 ? 'smooth' : 'auto';
          const previousInlineBehavior = document.documentElement.style.scrollBehavior;

          if (behavior === 'auto') {
            document.documentElement.style.scrollBehavior = 'auto';
          }

          window.scrollTo({ top: targetTop, behavior });

          if (behavior === 'auto') {
            requestAnimationFrame(() => {
              if (runId === this._resultScrollRunId) {
                document.documentElement.style.scrollBehavior = previousInlineBehavior;
              }
            });
          }
        }

        observeScrollFade('.wizard-result-card');

        if (attemptIndex + 1 < maxAttempts) {
          const timerId = window.setTimeout(() => attemptScroll(attemptIndex + 1), retryDelay);
          this._resultScrollTimers.push(timerId);
        }
      });
    };

    const timerId = window.setTimeout(() => attemptScroll(0), firstDelay);
    this._resultScrollTimers.push(timerId);
  }

  showResults() {
    this.close();
    debugRender('showResults()');

    const { recommended, noResultsReason, recommendationReasonsById } =
      getWizardRecommendations(this.products, this.selections);

    this.flowLog('results:computed', {
      selections: this.selections,
      productCount: this.products?.length || 0,
      recommendedCount: recommended.length,
      noResultsReason: noResultsReason || null
    });

    if (!this.resultSection || !this.resultContainer) return;

    const selectedGame = this.selections.game;

    this.resultSection.classList.remove('hidden');

    const summaryEl = document.getElementById('wizard-result-summary');
    if (summaryEl) {
      const parts = [];
      if (this.selections.purpose) {
        const purposeLabels = {
          gaming: '🎮 게이밍',
          office: '💼 사무용',
          editing: '🎬 영상편집',
          '3d': '🎨 3D 모델링',
          ai: '🔬 생성형 AI',
          ai_study: '🧠 AI 공부용',
          local_llm: '🤖 로컬 LLM',
          streaming: '📺 방송·스트리밍'
        };
        parts.push(purposeLabels[this.selections.purpose] || '');
      }
      if (selectedGame) parts.push(`🎮 ${selectedGame}`);
      if (this.selections.budget && this.selections.budget !== 'custom') {
        if (typeof this.selections.budget === 'number') {
          parts.push(`💰 ~${this.selections.budget}만원`);
        } else {
          const labels = {
            budget_under100: '💰 100만 원 이하',
            budget_100_200: '💵 100~200만 원',
            budget_200_300: '💎 200~300만 원',
            budget_over300: '👑 300만 원+'
          };
          parts.push(labels[this.selections.budget] || '');
        }
      }
      if (this.selections.design) {
        const labels = { black: '🖤 블랙', white: '🤍 화이트', rgb: '🌈 RGB' };
        parts.push(labels[this.selections.design] || '');
      }
      summaryEl.textContent = parts.filter(Boolean).join('  ·  ') || '전체 추천';
    }

    // 카카오 문의 버튼에 선택 요약 주입
    const kakaoBtn = document.getElementById('btn-wizard-kakao-consult');
    if (kakaoBtn) {
      const purposeLabels = {
        gaming: '게이밍', office: '사무용', editing: '영상편집',
        '3d': '3D 모델링', ai: '생성형 AI', ai_study: 'AI 공부용',
        local_llm: '로컬 LLM', streaming: '방송·스트리밍'
      };
      const budgetLabels = {
        budget_under100: '100만 원 이하', budget_100_200: '100~200만 원',
        budget_200_300: '200~300만 원', budget_over300: '300만 원 이상'
      };
      const msgParts = ['[YJMOD AI 추천 결과 문의]'];
      if (this.selections.purpose) msgParts.push(`용도: ${purposeLabels[this.selections.purpose] || this.selections.purpose}`);
      if (selectedGame) msgParts.push(`게임: ${selectedGame}`);
      if (this.selections.budget && this.selections.budget !== 'custom') {
        const budgetStr = typeof this.selections.budget === 'number'
          ? `${this.selections.budget}만원 이하`
          : (budgetLabels[this.selections.budget] || String(this.selections.budget));
        msgParts.push(`예산: ${budgetStr}`);
      }
      if (this.selections.design) {
        const dl = { black: '블랙', white: '화이트', rgb: 'RGB' };
        msgParts.push(`케이스: ${dl[this.selections.design] || this.selections.design}`);
      }
      msgParts.push('');
      msgParts.push('위 조건으로 추천 받았는데 상담 부탁드립니다.');
      const encodedMsg = encodeURIComponent(msgParts.join('\n'));
      kakaoBtn.href = `https://pf.kakao.com/_sxmjxgT/chat?text=${encodedMsg}`;
      kakaoBtn.classList.remove('hidden');
      kakaoBtn.classList.add('flex');
    }

    if (recommended.length === 0) {
      let emptyMessage = '조건에 맞는 제품을 찾지 못했습니다. 필터를 조정해 보세요.';
      if (noResultsReason === 'impossible_budget') {
        emptyMessage = '선택하신 게임(로스트아크, 배그 등)을 100만 원 대로 쾌적하게 즐기기에는 맞는 제품이 없습니다. 100~200만 원 이상 구간을 추천드립니다.';
      } else if (noResultsReason === 'no_products_under_budget') {
        emptyMessage =
          this.selections.purpose === 'gaming'
            ? '100만 원 이하 게임용 PC가 없습니다. 100~200만 원 구간을 추천드립니다.'
            : '선택한 예산(100만 원 이하)에 맞는 제품이 없습니다. 100~200만 원 구간을 선택해 보시거나 다른 조건을 조정해 보세요.';
      }
      this.resultContainer.innerHTML = `
        <div class="col-span-full text-center py-12">
          <p class="text-gray-400">${emptyMessage}</p>
        </div>
      `;
    } else {
      this.resultContainer.innerHTML = recommended
        .map(p =>
          renderWizardResultCard(
            p,
            selectedGame,
            this.fpsData,
            [],
            recommendationReasonsById?.get(String(p.id)) || null
          )
        )
        .join('');
    }

    // 모달 닫힘(200ms) + body overflow 해제 이후 스크롤(400ms) — 경합 방지
    // double rAF: 레이아웃 확정 후 getBoundingClientRect
    // scrollY: iOS에서 overflow:hidden 시 pageYOffset 오염 → open 시 저장값 보조
    // 모바일: html scroll-behavior 임시 auto로 CSS smooth와 충돌 방지 후 원복
    const renderedCardCount = this.resultContainer.querySelectorAll('.wizard-result-card').length;
    debugResultCount(renderedCardCount, {
      recommendedCount: recommended.length,
      noResultsReason: noResultsReason || null
    });
    debugDomUpdate({
      result_section_visible: !this.resultSection.classList.contains('hidden'),
      renderedCardCount
    });

    trackEvent('wizard_complete', {
      source_section: this.entrySourceSection || 'wizard_entry',
      selected_filters: serializeWizardSelections(this.selections),
      price_band: buildPriceBand(
        typeof this.selections.budget === 'number'
          ? `~${this.selections.budget}만원`
          : (this.selections.budget && this.selections.budget !== 'custom'
              ? ({ budget_under100: '100만 원 이하', budget_100_200: '100~200만 원',
                   budget_200_300: '200~300만 원', budget_over300: '300만 원 이상' })[this.selections.budget]
              : null)
      ),
      result_count: recommended.length,
      result_product_ids: recommended.slice(0, 6).map(product => String(product.id))
    });
    this.scrollResultsIntoView();
  }
}

export { Wizard, TOTAL_STEPS, getStepConfig, PURPOSE_OPTIONS, GAME_OPTIONS, BUDGET_OPTIONS, DESIGN_OPTIONS };
