/**
 * cafe-slider.js - 네이버 카페 실시간 출고사진 슬라이더
 * 자동 무한 슬라이딩 + 터치/드래그 지원
 */

import { formatDate } from './utils.js';

class CafeSlider {
  constructor(containerId, posts) {
    this.container = document.getElementById(containerId);
    this.posts = posts || [];
    this.currentIndex = 0;
    this.autoPlayInterval = null;
    this.autoPlayDelay = 4000;
    this.isDragging = false;
    this.startX = 0;
    this.translateX = 0;
    this.isAnimating = false;

    if (!this.container || this.posts.length === 0) return;
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.startAutoPlay();
  }

  render() {
    // 무한 루프를 위해 앞뒤에 클론 추가
    const allPosts = [
      ...this.posts.slice(-3),  // 마지막 3개를 앞에 복제
      ...this.posts,
      ...this.posts.slice(0, 3) // 처음 3개를 뒤에 복제
    ];

    this.container.innerHTML = `
      <div class="cafe-slider-wrapper relative overflow-hidden">
        <!-- 슬라이드 트랙 -->
        <div class="cafe-slider-track flex gap-4 transition-transform duration-500 ease-out will-change-transform"
             id="cafe-track">
          ${allPosts.map(post => this.renderCard(post)).join('')}
        </div>

        <!-- 이전/다음 버튼 -->
        <button id="cafe-prev"
                class="absolute left-2 top-1/2 -translate-y-1/2 z-10
                       w-10 h-10 rounded-full bg-black/60 hover:bg-accent/80 border border-white/10
                       flex items-center justify-center text-white transition-all duration-200
                       backdrop-blur-sm hover:scale-110">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <button id="cafe-next"
                class="absolute right-2 top-1/2 -translate-y-1/2 z-10
                       w-10 h-10 rounded-full bg-black/60 hover:bg-accent/80 border border-white/10
                       flex items-center justify-center text-white transition-all duration-200
                       backdrop-blur-sm hover:scale-110">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>

        <!-- 좌우 페이드 그라디언트 -->
        <div class="pointer-events-none absolute inset-y-0 left-0 w-16
                    bg-gradient-to-r from-bg to-transparent z-[5]"></div>
        <div class="pointer-events-none absolute inset-y-0 right-0 w-16
                    bg-gradient-to-l from-bg to-transparent z-[5]"></div>
      </div>

      <!-- 인디케이터 -->
      <div class="flex justify-center gap-2 mt-5" id="cafe-dots">
        ${this.posts.map((_, i) => `
          <button class="cafe-dot w-2 h-2 rounded-full transition-all duration-300
                         ${i === 0 ? 'bg-accent w-6' : 'bg-white/20'}"
                  data-index="${i}"></button>
        `).join('')}
      </div>
    `;

    this.track = document.getElementById('cafe-track');
    this.prevBtn = document.getElementById('cafe-prev');
    this.nextBtn = document.getElementById('cafe-next');
    this.dots = document.querySelectorAll('.cafe-dot');
    this.cloneOffset = 3; // 앞에 복제한 수

    // 초기 위치 설정 (클론 오프셋 적용)
    this.currentIndex = this.cloneOffset;
    this.updateTrack(false);
  }

  renderCard(post) {
    return `
      <article class="cafe-card flex-shrink-0 w-64 sm:w-72 bg-card border border-white/5 rounded-2xl overflow-hidden
                      hover:border-accent/30 hover:shadow-[0_0_20px_rgba(233,69,96,0.1)]
                      transition-all duration-300 cursor-pointer group"
               onclick="window.open('${post.url}', '_blank', 'noopener')">
        <!-- 이미지 -->
        <div class="relative h-40 overflow-hidden bg-surface">
          <img
            src="${post.thumbnail}"
            alt="${post.title}"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onerror="this.src='https://via.placeholder.com/400x300/16213e/e94560?text=출고사진'"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-card/70 to-transparent"></div>
          <!-- 날짜 -->
          <span class="absolute bottom-2 right-2 text-xs text-gray-300 bg-black/50 rounded-md px-2 py-0.5 backdrop-blur-sm">
            ${formatDate(post.date)}
          </span>
        </div>

        <!-- 내용 -->
        <div class="p-4">
          <p class="text-sm font-medium text-white line-clamp-2 leading-snug group-hover:text-accent transition-colors">
            ${post.title}
          </p>
          ${post.tags && post.tags.length > 0 ? `
          <div class="flex flex-wrap gap-1 mt-2">
            ${post.tags.slice(0, 3).map(tag =>
              `<span class="text-xs text-accent/70 bg-accent/10 rounded-md px-1.5 py-0.5">#${tag}</span>`
            ).join('')}
          </div>` : ''}
          <div class="flex items-center gap-1 mt-3 text-xs text-gray-500 group-hover:text-accent/60 transition-colors">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            네이버 카페에서 보기
          </div>
        </div>
      </article>
    `;
  }

  getCardWidth() {
    const card = this.track.querySelector('.cafe-card');
    if (!card) return 288; // w-72 = 288px
    return card.offsetWidth + 16; // gap-4 = 16px
  }

  updateTrack(animate = true) {
    if (!this.track) return;
    const offset = -(this.currentIndex * this.getCardWidth());
    if (!animate) {
      this.track.style.transition = 'none';
    } else {
      this.track.style.transition = 'transform 0.5s ease-out';
    }
    this.track.style.transform = `translateX(${offset}px)`;
    this.updateDots();
  }

  updateDots() {
    const realIndex = (this.currentIndex - this.cloneOffset + this.posts.length) % this.posts.length;
    this.dots.forEach((dot, i) => {
      dot.classList.toggle('bg-accent', i === realIndex);
      dot.classList.toggle('w-6', i === realIndex);
      dot.classList.toggle('bg-white/20', i !== realIndex);
      dot.classList.toggle('w-2', i !== realIndex);
    });
  }

  goTo(index) {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.currentIndex = index;
    this.updateTrack(true);

    // 무한 루프 처리
    this.track.addEventListener('transitionend', () => {
      const totalReal = this.posts.length;

      if (this.currentIndex <= this.cloneOffset - 1) {
        // 앞 클론 영역 -> 실제 마지막으로 점프
        this.currentIndex = totalReal + this.cloneOffset - (this.cloneOffset - this.currentIndex);
        this.updateTrack(false);
      } else if (this.currentIndex >= totalReal + this.cloneOffset) {
        // 뒤 클론 영역 -> 실제 처음으로 점프
        this.currentIndex = this.cloneOffset + (this.currentIndex - totalReal - this.cloneOffset);
        this.updateTrack(false);
      }

      this.isAnimating = false;
    }, { once: true });
  }

  prev() {
    this.goTo(this.currentIndex - 1);
    this.resetAutoPlay();
  }

  next() {
    this.goTo(this.currentIndex + 1);
    this.resetAutoPlay();
  }

  startAutoPlay() {
    this.autoPlayInterval = setInterval(() => this.next(), this.autoPlayDelay);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  resetAutoPlay() {
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  bindEvents() {
    // 버튼 클릭
    this.prevBtn?.addEventListener('click', () => this.prev());
    this.nextBtn?.addEventListener('click', () => this.next());

    // 인디케이터 클릭
    this.dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        this.goTo(i + this.cloneOffset);
        this.resetAutoPlay();
      });
    });

    // 터치/마우스 드래그
    const trackEl = this.track;
    let startX = 0;

    const onStart = (e) => {
      startX = e.touches ? e.touches[0].clientX : e.clientX;
      this.isDragging = true;
      this.stopAutoPlay();
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
    };

    const onEnd = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const diff = startX - endX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? this.next() : this.prev();
      }
      this.resetAutoPlay();
    };

    trackEl.addEventListener('touchstart', onStart, { passive: true });
    trackEl.addEventListener('touchmove', onMove, { passive: false });
    trackEl.addEventListener('touchend', onEnd);
    trackEl.addEventListener('mousedown', onStart);
    trackEl.addEventListener('mouseup', onEnd);

    // 호버 시 자동재생 일시정지
    this.container.addEventListener('mouseenter', () => this.stopAutoPlay());
    this.container.addEventListener('mouseleave', () => this.startAutoPlay());
  }
}

export { CafeSlider };
