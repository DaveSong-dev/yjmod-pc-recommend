/**
 * wizard.js - 3단계 PC 추천 위자드
 * Step 1: 게임 선택 -> Step 2: 예산 선택 -> Step 3: 디자인 선호 -> 결과
 */

import { getWizardRecommendations } from './filter.js';
import { renderWizardResultCard } from './render.js';
import { observeScrollFade } from './utils.js';

const WIZARD_STEPS = {
  1: {
    title: '어떤 게임을 즐기시나요?',
    subtitle: '주로 플레이하는 게임을 선택해 주세요',
    options: [
      { id: 'lol', label: '리그오브레전드', value: '리그오브레전드', icon: '🎮', desc: '롤 / 롤 아레나' },
      { id: 'pubg', label: '배틀그라운드', value: '배틀그라운드', icon: '🔫', desc: '배그 / 소총 게임' },
      { id: 'loa', label: '로스트아크', value: '로스트아크', icon: '⚔️', desc: '로아 / MMORPG' },
      { id: 'aaa', label: '스팀 AAA 게임', value: '스팀 AAA급 게임', icon: '🎲', desc: '사이버펑크 / 와일즈 등' },
      { id: 'valorant', label: '발로란트', value: '발로란트', icon: '🎯', desc: '발로 / FPS 경쟁전' },
      { id: 'ow2', label: '오버워치2', value: '오버워치2', icon: '🦸', desc: '오버워치 / 팀 FPS' }
    ]
  },
  2: {
    title: '예산이 얼마나 되시나요?',
    subtitle: '선택하신 예산 내에서 최적의 견적을 추천해 드립니다',
    options: [
      { id: 'budget_under100', label: '100만 원 이하', value: 'budget_under100', icon: '💰', desc: '가성비 최강 입문용' },
      { id: 'budget_100_200', label: '100 ~ 200만 원', value: 'budget_100_200', icon: '💵', desc: 'FHD·QHD 퍼포먼스' },
      { id: 'budget_200_300', label: '200 ~ 300만 원', value: 'budget_200_300', icon: '💎', desc: 'QHD·4K 하이엔드' },
      { id: 'budget_over300', label: '300만 원 이상', value: 'budget_over300', icon: '👑', desc: '최고 사양 무제한' }
    ]
  },
  3: {
    title: '케이스 스타일을 골라주세요',
    subtitle: '취향에 맞는 디자인으로 완성도를 높여보세요',
    options: [
      { id: 'black', label: '블랙 & 다크', value: 'black', icon: '🖤', desc: '강렬하고 세련된 다크 톤' },
      { id: 'white', label: '화이트 & 클린', value: 'white', icon: '🤍', desc: '깔끔하고 감성적인 화이트' },
      { id: 'rgb', label: 'RGB 풀커스텀', value: 'rgb', icon: '🌈', desc: 'RGB 튜닝 화려한 연출' }
    ]
  }
};

class Wizard {
  constructor(modalId, products, fpsData) {
    this.modal = document.getElementById(modalId);
    this.products = products;
    this.fpsData = fpsData;
    this.currentStep = 1;
    this.selections = { game: null, budget: null, design: null };
    this.resultContainer = document.getElementById('wizard-result-container');
    this.resultSection = document.getElementById('wizard-result-section');

    if (!this.modal) return;
    this.init();
  }

  init() {
    this.renderStep(1);
    this.bindModalClose();
  }

  open() {
    this.currentStep = 1;
    this.selections = { game: null, budget: null, design: null };
    this.renderStep(1);
    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    // 진입 애니메이션
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
    // 배경 클릭으로 닫기
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // ESC 키
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  renderStep(step) {
    const config = WIZARD_STEPS[step];
    if (!config) return;

    const panel = this.modal.querySelector('.wizard-panel') || this.modal;
    let content = panel.querySelector('.wizard-content');

    // wizard-content가 없으면 생성
    if (!content) {
      content = document.createElement('div');
      content.className = 'wizard-content px-6 pb-6';
      panel.appendChild(content);
    }

    // 프로그레스 바 업데이트
    const progressBtns = panel.querySelectorAll('.step-indicator');
    progressBtns.forEach((btn, i) => {
      const stepNum = i + 1;
      btn.classList.toggle('step-active', stepNum === step);
      btn.classList.toggle('step-done', stepNum < step);
      btn.classList.toggle('step-pending', stepNum > step);
    });

    // 스텝 레이블 업데이트
    const stepLabels = ['게임', '예산', '디자인'];
    const labelEl = panel.querySelector('.step-label');
    if (labelEl) labelEl.textContent = stepLabels[step - 1] || '';

    // 연결선 상태 업데이트
    const connectors = panel.querySelectorAll('.step-connector');
    connectors.forEach((conn, i) => {
      conn.classList.toggle('done', i + 1 < step);
    });

    // 슬라이드 인 애니메이션
    content.style.opacity = '0';
    content.style.transform = 'translateX(20px)';

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
            <!-- 선택 표시 -->
            <div class="wizard-check absolute top-2 right-2 w-5 h-5 rounded-full bg-accent
                        flex items-center justify-center opacity-0 scale-0 transition-all duration-200">
              <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </button>
        `).join('')}
      </div>

      <!-- 이전/건너뛰기 버튼 -->
      <div class="flex justify-between mt-6">
        ${step > 1 ? `
          <button id="wizard-prev" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            ← 이전
          </button>` : '<div></div>'}
        <button id="wizard-skip" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          건너뛰기
        </button>
      </div>
    `;

    // 애니메이션
    requestAnimationFrame(() => {
      content.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      content.style.opacity = '1';
      content.style.transform = 'translateX(0)';
    });

    this.bindStepEvents(step);
  }

  bindStepEvents(step) {
    const content = this.modal.querySelector('.wizard-content');
    const stepKeys = ['game', 'budget', 'design'];

    // 옵션 선택
    content.querySelectorAll('.wizard-option').forEach(btn => {
      btn.addEventListener('click', () => {
        // 선택 표시
        content.querySelectorAll('.wizard-option').forEach(b => {
          b.classList.remove('border-accent', 'bg-accent/10');
          b.querySelector('.wizard-check')?.classList.add('opacity-0', 'scale-0');
        });
        btn.classList.add('border-accent', 'bg-accent/10');
        const check = btn.querySelector('.wizard-check');
        check?.classList.remove('opacity-0', 'scale-0');

        // 값 저장
        this.selections[stepKeys[step - 1]] = btn.dataset.value;

        // 잠깐 후 다음 스텝
        setTimeout(() => {
          if (step < 3) {
            this.currentStep = step + 1;
            this.renderStep(this.currentStep);
          } else {
            this.showResults();
          }
        }, 350);
      });
    });

    // 이전 버튼
    document.getElementById('wizard-prev')?.addEventListener('click', () => {
      this.currentStep = step - 1;
      this.renderStep(this.currentStep);
    });

    // 건너뛰기
    document.getElementById('wizard-skip')?.addEventListener('click', () => {
      if (step < 3) {
        this.currentStep = step + 1;
        this.renderStep(this.currentStep);
      } else {
        this.showResults();
      }
    });
  }

  showResults() {
    this.close();

    const recommended = getWizardRecommendations(this.products, this.selections);

    if (!this.resultSection || !this.resultContainer) return;

    // 선택한 게임 (FPS 표시용)
    const selectedGame = this.selections.game;

    // 결과 섹션 표시
    this.resultSection.classList.remove('hidden');

    // 결과 요약 텍스트
    const summaryEl = document.getElementById('wizard-result-summary');
    if (summaryEl) {
      const parts = [];
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

    // 결과 카드 렌더링
    if (recommended.length === 0) {
      this.resultContainer.innerHTML = `
        <div class="col-span-full text-center py-12">
          <p class="text-gray-400">조건에 맞는 제품을 찾지 못했습니다. 필터를 조정해 보세요.</p>
        </div>
      `;
    } else {
      this.resultContainer.innerHTML = recommended
        .map(p => renderWizardResultCard(p, selectedGame, this.fpsData))
        .join('');
    }

    // 결과 섹션으로 스크롤
    setTimeout(() => {
      this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      observeScrollFade('.wizard-result-card');
    }, 100);
  }
}

export { Wizard, WIZARD_STEPS };
