# YJMOD × 영재컴퓨터 PC 추천 웹사이트

영재컴퓨터(youngjaecomputer.com)의 조립PC 제품을 게임·예산·디자인 기준으로 추천해주는 다크 모드 SPA 웹사이트입니다.

---

## 기능 개요

- **AI 추천 위자드**: 게임 → 예산 → 디자인 선호를 3단계로 선택하면 최적 PC 추천
- **예상 FPS 표시**: 선택한 게임 기준으로 각 제품의 예상 FPS를 실시간 계산
- **다중 필터**: 게임별 / 사양별(FHD·QHD·4K) / 금액별 / 용도별 필터링
- **품절 자동 제외**: 크롤러가 수집 시 품절 상품을 JSON에서 제외
- **가격 직관 표시**: 1만 원 단위 절삭 (예: 2,159,000원 → 215만 원)
- **실시간 출고사진**: 영재컴퓨터 네이버 카페 출고사진 슬라이딩 카드
- **6시간 자동 갱신**: GitHub Actions로 데이터 자동 업데이트

---

## 프로젝트 구조

```
상품 추천 페이지/
├── index.html                  # 메인 SPA
├── css/
│   └── style.css               # 커스텀 스타일 (다크모드 디자인 시스템)
├── js/
│   ├── app.js                  # 앱 초기화, 데이터 로드, 이벤트 바인딩
│   ├── wizard.js               # 3단계 AI 추천 위자드
│   ├── filter.js               # 필터링 엔진 (게임/사양/금액/용도)
│   ├── render.js               # 제품 카드 렌더링
│   ├── cafe-slider.js          # 카페 출고사진 무한 슬라이더
│   └── utils.js                # 가격 포맷팅, FPS 계산, 공통 유틸
├── data/
│   ├── pc_data.json            # 크롤링된 제품 데이터 (자동 갱신)
│   ├── cafe_posts.json         # 카페 출고사진 데이터 (자동 갱신)
│   └── fps_reference.json      # GPU별 게임 예상 FPS 참조 테이블
├── crawler/
│   ├── requirements.txt
│   ├── config.py               # 크롤러 설정, 카테고리 매핑
│   ├── crawl_products.py       # 영재컴퓨터 제품 크롤러
│   └── crawl_cafe.py           # 네이버 카페 출고사진 크롤러
└── .github/
    └── workflows/
        └── update-data.yml     # 6시간 주기 자동 크롤링 워크플로우
```

---

## 로컬 개발 환경 설정

### 1. 웹사이트 실행

순수 정적 파일이므로 로컬 서버만 있으면 됩니다.

```bash
# Python 내장 서버
python -m http.server 8000

# VS Code Live Server 플러그인 사용 권장
```

브라우저에서 `http://localhost:8000` 접속

> **주의**: `fetch('./data/pc_data.json')`은 파일 직접 열기(`file://`)에서 CORS 오류가 발생합니다. 반드시 로컬 서버를 통해 실행하세요.

### 2. 크롤러 설정

```bash
cd crawler
pip install -r requirements.txt

# 제품 크롤러 실행
python crawl_products.py

# 카페 크롤러 실행 (네이버 API 키 필요)
NAVER_CLIENT_ID=your_id NAVER_CLIENT_SECRET=your_secret python crawl_cafe.py
```

---

## GitHub Actions 설정

### 필수 Secrets 등록

GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret

| Secret 이름 | 설명 | 필수 여부 |
|-------------|------|----------|
| `NAVER_CLIENT_ID` | 네이버 개발자센터 Client ID | 선택 (카페 API 사용 시) |
| `NAVER_CLIENT_SECRET` | 네이버 개발자센터 Client Secret | 선택 (카페 API 사용 시) |
| `NAVER_ID` | 네이버 로그인 ID | 선택 (Selenium 로그인 시) |
| `NAVER_PW` | 네이버 로그인 PW | 선택 (Selenium 로그인 시) |

### 네이버 Search API 키 발급

1. [네이버 개발자센터](https://developers.naver.com) 접속
2. 내 애플리케이션 → 애플리케이션 등록
3. 검색 API 선택 → Client ID / Secret 발급

### 자동 갱신 스케줄

- UTC 기준 0시, 6시, 12시, 18시 (KST 기준 9시, 15시, 21시, 3시)
- 데이터 변경 시에만 자동 커밋 (변경 없으면 커밋 생략)

---

## 서버 배포 (가비아 + 오라클)

이 프로젝트는 순수 정적 파일로 구성되어 있어 별도 백엔드 없이 웹 서버만으로 운영 가능합니다.

```bash
# 정적 파일을 서버로 복사
scp -r ./* user@oracle-server:/var/www/html/

# 크롤러는 서버 cron으로 전환
crontab -e
# 0 */6 * * * cd /path/to/crawler && python crawl_products.py && python crawl_cafe.py
```

---

## 데이터 스키마

### pc_data.json

```json
{
  "last_updated": "2026-02-19T12:00:00+09:00",
  "products": [
    {
      "id": "상품ID",
      "name": "제품명",
      "subtitle": "한줄 설명",
      "url": "영재컴퓨터 상품 URL",
      "thumbnail": "썸네일 이미지 URL",
      "price": 790000,
      "price_display": "79만 원",
      "in_stock": true,
      "specs": {
        "cpu": "AMD 라이젠5-4세대 5600",
        "cpu_short": "R5 5600",
        "gpu": "COLORFUL RTX 5060 8GB",
        "gpu_short": "RTX 5060",
        "gpu_key": "RTX 5060",
        "ram": "DDR4 16GB",
        "ssd": "512GB NVMe",
        "mainboard": "ASUS PRIME A520M-K",
        "power": "잘만 EcoMax 500W",
        "case": "DAVEN SPIDER (블랙)",
        "cooler": "PCCOOLER CPS R400 ARGB"
      },
      "categories": {
        "games": ["리그오브레전드", "배틀그라운드"],
        "tier": "가성비(FHD)",
        "price_range": "100만 원 이하",
        "usage": ["게이밍"]
      },
      "case_color": "블랙",
      "badge": "가성비 베스트",
      "badge_color": "green"
    }
  ]
}
```

### fps_reference.json

GPU 모델별 게임 예상 FPS 참조 테이블 (FHD / QHD / 4K)

```json
{
  "gpus": {
    "RTX 5060": {
      "리그오브레전드": { "FHD": 300, "QHD": 260, "4K": 140 },
      "배틀그라운드": { "FHD": 155, "QHD": 100, "4K": 55 }
    }
  }
}
```

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | HTML5, Tailwind CSS CDN, Vanilla JS (ES Modules) |
| 폰트 | Pretendard (cdn.jsdelivr.net) |
| 크롤러 | Python 3.11, Selenium 4, BeautifulSoup4 |
| 자동화 | GitHub Actions |
| 데이터 | JSON 파일 (정적) |

---

## 문의

- 영재컴퓨터 공식 홈페이지: https://www.youngjaecomputer.com
- 네이버 카페: https://cafe.naver.com/no1yjmod
- 고객센터: 02-716-5232
