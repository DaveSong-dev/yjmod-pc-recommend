import {
  getWizardRecommendations,
  renderWizardResultCard
} from "./chunk-6MQWMU3C.js";
import {
  observeScrollFade
} from "./chunk-3K2RG6CP.js";

// js/wizard.js
var TOTAL_STEPS = 4;
var PURPOSE_OPTIONS = [
  { id: "gaming", label: "\uAC8C\uC774\uBC0D", value: "gaming", icon: "\u{1F3AE}", desc: "\uAC8C\uC784 \uC804\uC6A9 PC" },
  { id: "ai_study", label: "AI \uACF5\uBD80\uC6A9", value: "ai_study", icon: "\u{1F9E0}", desc: "CUDA \uC785\uBB38\xB7\uB525\uB7EC\uB2DD \uD559\uC2B5" },
  { id: "local_llm", label: "\uB85C\uCEEC LLM", value: "local_llm", icon: "\u{1F916}", desc: "\uB85C\uCEEC AI\xB7LLM \uCD94\uB860" },
  { id: "editing", label: "\uC601\uC0C1\uD3B8\uC9D1", value: "editing", icon: "\u{1F3AC}", desc: "\uD504\uB9AC\uBBF8\uC5B4\xB7\uC5D0\uD399 \uB4F1" },
  { id: "office", label: "\uC0AC\uBB34\uC6A9", value: "office", icon: "\u{1F4BC}", desc: "\uBB38\uC11C\xB7\uC5C5\uBB34\uC6A9" },
  { id: "3d", label: "3D \uBAA8\uB378\uB9C1", value: "3d", icon: "\u{1F3A8}", desc: "\uBE14\uB80C\uB354\xB7CAD \uB4F1" },
  { id: "ai", label: "\uC0DD\uC131\uD615 AI", value: "ai", icon: "\u{1F52C}", desc: "\uC774\uBBF8\uC9C0\uC0DD\uC131\xB7\uD559\uC2B5\xB7\uCD94\uB860" },
  { id: "streaming", label: "\uBC29\uC1A1\xB7\uC2A4\uD2B8\uB9AC\uBC0D", value: "streaming", icon: "\u{1F4FA}", desc: "\uBC29\uC1A1\xB7\uC778\uCF54\uB529" }
];
var GAME_OPTIONS = [
  { id: "lol", label: "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC", value: "\uB9AC\uADF8\uC624\uBE0C\uB808\uC804\uB4DC", icon: "\u{1F3AE}", desc: "\uB864 / \uB864 \uC544\uB808\uB098" },
  { id: "pubg", label: "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", value: "\uBC30\uD2C0\uADF8\uB77C\uC6B4\uB4DC", icon: "\u{1F52B}", desc: "\uBC30\uADF8 / \uC18C\uCD1D \uAC8C\uC784" },
  { id: "loa", label: "\uB85C\uC2A4\uD2B8\uC544\uD06C", value: "\uB85C\uC2A4\uD2B8\uC544\uD06C", icon: "\u2694\uFE0F", desc: "\uB85C\uC544 / MMORPG" },
  { id: "aaa", label: "\uC2A4\uD300 AAA \uAC8C\uC784", value: "\uC2A4\uD300 AAA\uAE09 \uAC8C\uC784", icon: "\u{1F3B2}", desc: "\uC0AC\uC774\uBC84\uD391\uD06C / \uC640\uC77C\uC988 \uB4F1" },
  { id: "valorant", label: "\uBC1C\uB85C\uB780\uD2B8", value: "\uBC1C\uB85C\uB780\uD2B8", icon: "\u{1F3AF}", desc: "\uBC1C\uB85C / FPS \uACBD\uC7C1\uC804" },
  { id: "ow2", label: "\uC624\uBC84\uC6CC\uCE582", value: "\uC624\uBC84\uC6CC\uCE582", icon: "\u{1F9B8}", desc: "\uC624\uBC84\uC6CC\uCE58 / \uD300 FPS" }
];
var BUDGET_OPTIONS = [
  { id: "budget_under100", label: "100\uB9CC \uC6D0 \uC774\uD558", value: "budget_under100", icon: "\u{1F4B0}", desc: "\uAC00\uC131\uBE44 \uCD5C\uAC15 \uC785\uBB38\uC6A9" },
  { id: "budget_100_200", label: "100 ~ 200\uB9CC \uC6D0", value: "budget_100_200", icon: "\u{1F4B5}", desc: "FHD\xB7QHD \uD37C\uD3EC\uBA3C\uC2A4" },
  { id: "budget_200_300", label: "200 ~ 300\uB9CC \uC6D0", value: "budget_200_300", icon: "\u{1F48E}", desc: "QHD\xB74K \uD558\uC774\uC5D4\uB4DC" },
  { id: "budget_over300", label: "300\uB9CC \uC6D0 \uC774\uC0C1", value: "budget_over300", icon: "\u{1F451}", desc: "\uCD5C\uACE0 \uC0AC\uC591 \uBB34\uC81C\uD55C" }
];
var DESIGN_OPTIONS = [
  { id: "black", label: "\uBE14\uB799 & \uB2E4\uD06C", value: "black", icon: "\u{1F5A4}", desc: "\uAC15\uB82C\uD558\uACE0 \uC138\uB828\uB41C \uB2E4\uD06C \uD1A4" },
  { id: "white", label: "\uD654\uC774\uD2B8 & \uD074\uB9B0", value: "white", icon: "\u{1F90D}", desc: "\uAE54\uB054\uD558\uACE0 \uAC10\uC131\uC801\uC778 \uD654\uC774\uD2B8" },
  { id: "rgb", label: "RGB \uD480\uCEE4\uC2A4\uD140", value: "rgb", icon: "\u{1F308}", desc: "RGB \uD29C\uB2DD \uD654\uB824\uD55C \uC5F0\uCD9C" }
];
function getStepConfig(step, selections) {
  switch (step) {
    case 1:
      return {
        title: "PC \uC6A9\uB3C4\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694",
        subtitle: "\uC8FC\uB85C \uC5B4\uB5A4 \uC6A9\uB3C4\uB85C \uC0AC\uC6A9\uD558\uC2E4 \uC608\uC815\uC778\uAC00\uC694?",
        options: PURPOSE_OPTIONS,
        stepKey: "purpose",
        required: true
      };
    case 2:
      return {
        title: "\uC5B4\uB5A4 \uAC8C\uC784\uC744 \uC990\uAE30\uC2DC\uB098\uC694?",
        subtitle: "\uC8FC\uB85C \uD50C\uB808\uC774\uD558\uB294 \uAC8C\uC784\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694",
        options: GAME_OPTIONS,
        stepKey: "game",
        required: false
      };
    case 3:
      return {
        title: "\uC608\uC0B0\uC774 \uC5BC\uB9C8\uB098 \uB418\uC2DC\uB098\uC694?",
        subtitle: "\uC120\uD0DD\uD558\uC2E0 \uC608\uC0B0 \uB0B4\uC5D0\uC11C \uCD5C\uC801\uC758 \uACAC\uC801\uC744 \uCD94\uCC9C\uD574 \uB4DC\uB9BD\uB2C8\uB2E4",
        options: BUDGET_OPTIONS,
        stepKey: "budget",
        required: true
      };
    case 4:
      return {
        title: "\uCF00\uC774\uC2A4 \uC2A4\uD0C0\uC77C\uC744 \uACE8\uB77C\uC8FC\uC138\uC694",
        subtitle: "\uCDE8\uD5A5\uC5D0 \uB9DE\uB294 \uB514\uC790\uC778\uC73C\uB85C \uC644\uC131\uB3C4\uB97C \uB192\uC5EC\uBCF4\uC138\uC694",
        options: DESIGN_OPTIONS,
        stepKey: "design",
        required: false
      };
    default:
      return null;
  }
}
function getStepLabel(step) {
  const labels = ["\uC6A9\uB3C4", "\uAC8C\uC784", "\uC608\uC0B0", "\uB514\uC790\uC778"];
  return labels[step - 1] || "";
}
var Wizard = class {
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
    this.resultContainer = document.getElementById("wizard-result-container");
    this.resultSection = document.getElementById("wizard-result-section");
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
    const presetGame = (options == null ? void 0 : options.game) && String(options.game).trim();
    if (presetGame) {
      this.selections.purpose = "gaming";
      this.selections.game = presetGame;
      this.currentStep = 3;
    }
    this.renderStep(this.currentStep);
    this.modal.classList.remove("hidden");
    this.modal.classList.add("flex");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      const panel = this.modal.querySelector(".wizard-panel");
      if (panel) {
        panel.classList.remove("scale-95", "opacity-0");
        panel.classList.add("scale-100", "opacity-100");
      }
    });
  }
  close() {
    const panel = this.modal.querySelector(".wizard-panel");
    if (panel) {
      panel.classList.add("scale-95", "opacity-0");
      panel.classList.remove("scale-100", "opacity-100");
    }
    setTimeout(() => {
      this.modal.classList.add("hidden");
      this.modal.classList.remove("flex");
      document.body.style.overflow = "";
    }, 200);
  }
  bindModalClose() {
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.modal.classList.contains("hidden")) {
        this.close();
      }
    });
  }
  renderStep(step) {
    const config = getStepConfig(step, this.selections);
    if (!config) return;
    const panel = this.modal.querySelector(".wizard-panel") || this.modal;
    let content = panel.querySelector(".wizard-content");
    if (!content) {
      content = document.createElement("div");
      content.className = "wizard-content px-6 pb-6 overflow-y-auto";
      panel.appendChild(content);
    } else {
      content.className = "wizard-content px-6 pb-6 overflow-y-auto";
    }
    const progressBtns = panel.querySelectorAll(".step-indicator");
    progressBtns.forEach((btn, i) => {
      const stepNum = i + 1;
      btn.classList.toggle("step-active", stepNum === step);
      btn.classList.toggle("step-done", stepNum < step);
      btn.classList.toggle("step-pending", stepNum > step);
    });
    const labelEl = panel.querySelector(".step-label");
    if (labelEl) labelEl.textContent = getStepLabel(step);
    const connectors = panel.querySelectorAll(".step-connector");
    connectors.forEach((conn, i) => {
      conn.classList.toggle("done", i + 1 < step);
    });
    content.style.opacity = "0";
    content.style.transform = "translateX(20px)";
    const showSkip = !config.required;
    const skipBtn = showSkip ? '<button id="wizard-skip" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">\uAC74\uB108\uB6F0\uAE30</button>' : "<span></span>";
    content.innerHTML = `
      <div class="mb-6">
        <h3 class="text-xl font-bold text-white">${config.title}</h3>
        <p class="text-sm text-gray-400 mt-1">${config.subtitle}</p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        ${config.options.map((opt) => `
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
        `).join("")}
      </div>

      <div class="flex justify-between mt-6">
        ${step > 1 ? `
          <button id="wizard-prev" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            \u2190 \uC774\uC804
          </button>` : "<div></div>"}
        ${skipBtn}
      </div>
    `;
    requestAnimationFrame(() => {
      content.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      content.style.opacity = "1";
      content.style.transform = "translateX(0)";
    });
    this.bindStepEvents(step, config);
  }
  bindStepEvents(step, config) {
    var _a;
    const content = this.modal.querySelector(".wizard-content");
    const stepKey = config.stepKey;
    content.querySelectorAll(".wizard-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        content.querySelectorAll(".wizard-option").forEach((b) => {
          var _a2;
          b.classList.remove("border-accent", "bg-accent/10");
          (_a2 = b.querySelector(".wizard-check")) == null ? void 0 : _a2.classList.add("opacity-0", "scale-0");
        });
        btn.classList.add("border-accent", "bg-accent/10");
        const check = btn.querySelector(".wizard-check");
        check == null ? void 0 : check.classList.remove("opacity-0", "scale-0");
        const value = btn.dataset.value;
        this.selections[stepKey] = value;
        setTimeout(() => {
          if (step < TOTAL_STEPS) {
            let nextStep = step + 1;
            if (nextStep === 2 && this.selections.purpose !== "gaming") nextStep = 3;
            this.currentStep = nextStep;
            this.renderStep(this.currentStep);
          } else {
            this.showResults();
          }
        }, 350);
      });
    });
    (_a = document.getElementById("wizard-prev")) == null ? void 0 : _a.addEventListener("click", () => {
      let prevStep = step - 1;
      if (prevStep === 2 && this.selections.purpose !== "gaming") prevStep = 1;
      this.currentStep = prevStep;
      this.renderStep(this.currentStep);
    });
    const skipBtn = document.getElementById("wizard-skip");
    if (skipBtn) {
      skipBtn.addEventListener("click", () => {
        if (step < TOTAL_STEPS) {
          let nextStep = step + 1;
          if (nextStep === 2 && this.selections.purpose !== "gaming") nextStep = 3;
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
    const { recommended, noResultsReason, matchReasons, recommendationReasonsById } = getWizardRecommendations(this.products, this.selections);
    if (!this.resultSection || !this.resultContainer) return;
    const selectedGame = this.selections.game;
    this.resultSection.classList.remove("hidden");
    const summaryEl = document.getElementById("wizard-result-summary");
    if (summaryEl) {
      const parts = [];
      if (this.selections.purpose) {
        const purposeLabels = {
          gaming: "\u{1F3AE} \uAC8C\uC774\uBC0D",
          office: "\u{1F4BC} \uC0AC\uBB34\uC6A9",
          editing: "\u{1F3AC} \uC601\uC0C1\uD3B8\uC9D1",
          "3d": "\u{1F3A8} 3D \uBAA8\uB378\uB9C1",
          ai: "\u{1F52C} \uC0DD\uC131\uD615 AI",
          ai_study: "\u{1F9E0} AI \uACF5\uBD80\uC6A9",
          local_llm: "\u{1F916} \uB85C\uCEEC LLM",
          streaming: "\u{1F4FA} \uBC29\uC1A1\xB7\uC2A4\uD2B8\uB9AC\uBC0D"
        };
        parts.push(purposeLabels[this.selections.purpose] || "");
      }
      if (selectedGame) parts.push(`\u{1F3AE} ${selectedGame}`);
      if (this.selections.budget) {
        const labels = {
          budget_under100: "\u{1F4B0} 100\uB9CC \uC6D0 \uC774\uD558",
          budget_100_200: "\u{1F4B5} 100~200\uB9CC \uC6D0",
          budget_200_300: "\u{1F48E} 200~300\uB9CC \uC6D0",
          budget_over300: "\u{1F451} 300\uB9CC \uC6D0+"
        };
        parts.push(labels[this.selections.budget] || "");
      }
      if (this.selections.design) {
        const labels = { black: "\u{1F5A4} \uBE14\uB799", white: "\u{1F90D} \uD654\uC774\uD2B8", rgb: "\u{1F308} RGB" };
        parts.push(labels[this.selections.design] || "");
      }
      summaryEl.textContent = parts.filter(Boolean).join("  \xB7  ") || "\uC804\uCCB4 \uCD94\uCC9C";
    }
    if (recommended.length === 0) {
      let emptyMessage = "\uC870\uAC74\uC5D0 \uB9DE\uB294 \uC81C\uD488\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uD544\uD130\uB97C \uC870\uC815\uD574 \uBCF4\uC138\uC694.";
      if (noResultsReason === "impossible_budget") {
        emptyMessage = "\uC120\uD0DD\uD558\uC2E0 \uAC8C\uC784(\uB85C\uC2A4\uD2B8\uC544\uD06C, \uBC30\uADF8 \uB4F1)\uC744 100\uB9CC \uC6D0 \uB300\uB85C \uCF8C\uC801\uD558\uAC8C \uC990\uAE30\uAE30\uC5D0\uB294 \uB9DE\uB294 \uC81C\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. 100~200\uB9CC \uC6D0 \uC774\uC0C1 \uAD6C\uAC04\uC744 \uCD94\uCC9C\uB4DC\uB9BD\uB2C8\uB2E4.";
      } else if (noResultsReason === "no_products_under_budget") {
        emptyMessage = this.selections.purpose === "gaming" ? "100\uB9CC \uC6D0 \uC774\uD558 \uAC8C\uC784\uC6A9 PC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. 100~200\uB9CC \uC6D0 \uAD6C\uAC04\uC744 \uCD94\uCC9C\uB4DC\uB9BD\uB2C8\uB2E4." : "\uC120\uD0DD\uD55C \uC608\uC0B0(100\uB9CC \uC6D0 \uC774\uD558)\uC5D0 \uB9DE\uB294 \uC81C\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. 100~200\uB9CC \uC6D0 \uAD6C\uAC04\uC744 \uC120\uD0DD\uD574 \uBCF4\uC2DC\uAC70\uB098 \uB2E4\uB978 \uC870\uAC74\uC744 \uC870\uC815\uD574 \uBCF4\uC138\uC694.";
      }
      this.resultContainer.innerHTML = `
        <div class="col-span-full text-center py-12">
          <p class="text-gray-400">${emptyMessage}</p>
        </div>
      `;
    } else {
      const reasonMap = new Map((matchReasons || []).map((m) => [String(m.productId), m.reasons || []]));
      this.resultContainer.innerHTML = recommended.map(
        (p) => renderWizardResultCard(
          p,
          selectedGame,
          this.fpsData,
          reasonMap.get(String(p.id)) || [],
          (recommendationReasonsById == null ? void 0 : recommendationReasonsById.get(String(p.id))) || null
        )
      ).join("");
    }
    setTimeout(() => {
      this.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
      observeScrollFade(".wizard-result-card");
    }, 100);
  }
};
export {
  BUDGET_OPTIONS,
  DESIGN_OPTIONS,
  GAME_OPTIONS,
  PURPOSE_OPTIONS,
  TOTAL_STEPS,
  Wizard,
  getStepConfig
};
