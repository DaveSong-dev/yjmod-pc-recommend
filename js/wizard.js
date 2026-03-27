/**
 * wizard.js - 4단계 PC 추천 위자드 (용도 우선)
 * 권장 흐름: 용도 → (게이밍이면 게임선택) → 예산 → 디자인 → 결과
 * 비게이밍 선택 시 2단계(게임) 생략, 1→3으로 이동
 * 작업강도(workTier) step 없음 - state에 미포함, 필터 충돌 방지
 */

import { getWizardRecommendations } from './filter.js';
import { renderWizardResultCard } from './render.js';
import { observeScrollFade } from './utils.js';

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

/** 예산 선택지 (3단계) */
const BUDGET_OPTIONS = [
  { id: 'budget_under100', label: '100만 원 이하', value: 'budget_under100', icon: '💰', desc: '가성비 최강 입문용' },
  { id: 'budget_100_200', label: '100 ~ 200만 원', value: 'budget_100_200', icon: '💵', desc: 'FHD·QHD 퍼포먼스' },
  { id: 'budget_200_300', label: '200 ~ 300만 원', value: 'budget_200_300', icon: '💎', desc: 'QHD·4K 하이엔드' },
  { id: 'budget_over300', label: '300만 원 이상', value: 'budget_over300', icon: '👑', desc: '최고 사양 무제한' }
];

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
    this.currentStep = 1;
    this.selections = {
      purpose: null,
      game: null,
      budget: null,
      design: null
    };
    this.resultContainer = document.getElementById('wizard-result-container');
    this.resultSection = document.getElementById('wizard-result-section');

    if (!this.modal) return;
    this.init();
  }

  init() {
    this.renderStep(1);
    this.bindModalClose();
  }

  /**
   * @param {{ game?: string }} options - game: 게임별 추천 버튼에서 선택한 게임이면 3단계(예산)부터 열림
   */
  open(options = {}) {
    this.currentStep = 1;
    this.selections = {
      purpose: null,
      game: null,
      budget: null,
      design: null
    };

    const presetGame = options?.game && String(options.game).trim();
    if (presetGame) {
      this.selections.purpose = 'gaming';
      this.selections.game = presetGame;
      this.currentStep = 3; // 예산 단계부터
    }

    this.renderStep(this.currentStep);
    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      const panel = this.modal.querySelector('.wizard-panel');
      if (panel) {
        panel.classList.remove('scale-95', 'opacity-0');
        panel.classList.add('scale-100', 'opacity-100');
      }
    });
  }

  close() {
    const panel = this.modal.querySelector('.wizard-panel');
    if (panel) {
      panel.classList.add('scale-95', 'opacity-0');
      panel.classList.remove('scale-100', 'opacity-100');
    }
    setTimeout(() => {
      this.modal.classList.add('hidden');
      this.modal.classList.remove('flex');
      document.body.style.overflow = '';
    }, 200);
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

    const connectors = panel.querySelectorAll('.step-connector');
    connectors.forEach((conn, i) => {
      conn.classList.toggle('done', i + 1 < step);
    });

    content.style.opacity = '0';
    content.style.transform = 'translateX(20px)';

    // 용도/예산 필수, 나머지(게임·디자인) 건너뛰기 허용
    const showSkip = !config.required;
    const skipBtn = showSkip
      ? '<button id="wizard-skip" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">건너뛰기</button>'
      : '<span></span>';

    content.innerHTML = `
      <div class="mb-6">
        <h3 class="text-xl font-bold text-white">${config.title}</h3>
        <p class="text-sm text-gray-400 mt-1">${config.subtitle}</p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        ${config.options.map(opt => `
          <button
            class="wizard-option group relative flex flex-col items-center gap-2 p-4 rounded-xl
                   border border-white/10 bg-surface hover:border-accent/50 hover:bg-accent/5
                   transition-all duration-200 text-center cursor-pointer"
            data-value="${opt.value}"
            data-step="${step}"
          >
            <span class="text-2xl">${opt.icon}</span>
            <span class="text-sm font-semibold text-white">${opt.label}</span>
            <span class="text-xs text-gray-500">${opt.desc}</span>
            <div class="wizard-check absolute top-2 right-2 w-5 h-5 rounded-full bg-accent
                        flex items-center justify-center opacity-0 scale-0 transition-all duration-200">
              <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </button>
        `).join('')}
      </div>

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
    });

    this.bindStepEvents(step, config);
  }

  bindStepEvents(step, config) {
    const content = this.modal.querySelector('.wizard-content');
    const stepKey = config.stepKey;

    content.querySelectorAll('.wizard-option').forEach(btn => {
      btn.addEventListener('click', () => {
        content.querySelectorAll('.wizard-option').forEach(b => {
          b.classList.remove('border-accent', 'bg-accent/10');
          b.querySelector('.wizard-check')?.classList.add('opacity-0', 'scale-0');
        });
        btn.classList.add('border-accent', 'bg-accent/10');
        const check = btn.querySelector('.wizard-check');
        check?.classList.remove('opacity-0', 'scale-0');

        const value = btn.dataset.value;
        this.selections[stepKey] = value;

        setTimeout(() => {
          if (step < TOTAL_STEPS) {
            let nextStep = step + 1;
            // 비게이밍: 1단계 후 2단계(게임) 생략 → 3단계(예산)로
            if (nextStep === 2 && this.selections.purpose !== 'gaming') nextStep = 3;
            this.currentStep = nextStep;
            this.renderStep(this.currentStep);
          } else {
            this.showResults();
          }
        }, 350);
      });
    });

    document.getElementById('wizard-prev')?.addEventListener('click', () => {
      let prevStep = step - 1;
      // 3단계에서 이전: 게이밍이면 2단계, 비게이밍이면 1단계
      if (prevStep === 2 && this.selections.purpose !== 'gaming') prevStep = 1;
      this.currentStep = prevStep;
      this.renderStep(this.currentStep);
    });

    const skipBtn = document.getElementById('wizard-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        if (step < TOTAL_STEPS) {
          let nextStep = step + 1;
          if (nextStep === 2 && this.selections.purpose !== 'gaming') nextStep = 3;
          this.currentStep = nextStep;
          this.renderStep(this.currentStep);
        } else {
          this.showResults();
        }
      });
    }
  }

  showResults() {
    this.close();

    const { recommended, noResultsReason, matchReasons, recommendationReasonsById } =
      getWizardRecommendations(this.products, this.selections);

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
      if (this.selections.budget) {
        const labels = {
          budget_under100: '💰 100만 원 이하',
          budget_100_200: '💵 100~200만 원',
          budget_200_300: '💎 200~300만 원',
          budget_over300: '👑 300만 원+'
        };
        parts.push(labels[this.selections.budget] || '');
      }
      if (this.selections.design) {
        const labels = { black: '🖤 블랙', white: '🤍 화이트', rgb: '🌈 RGB' };
        parts.push(labels[this.selections.design] || '');
      }
      summaryEl.textContent = parts.filter(Boolean).join('  ·  ') || '전체 추천';
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
      const reasonMap = new Map((matchReasons || []).map(m => [String(m.productId), m.reasons || []]));
      this.resultContainer.innerHTML = recommended
        .map(p =>
          renderWizardResultCard(
            p,
            selectedGame,
            this.fpsData,
            reasonMap.get(String(p.id)) || [],
            recommendationReasonsById?.get(String(p.id)) || null
          )
        )
        .join('');
    }

    setTimeout(() => {
      this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      observeScrollFade('.wizard-result-card');
    }, 100);
  }
}

export { Wizard, TOTAL_STEPS, getStepConfig, PURPOSE_OPTIONS, GAME_OPTIONS, BUDGET_OPTIONS, DESIGN_OPTIONS };
