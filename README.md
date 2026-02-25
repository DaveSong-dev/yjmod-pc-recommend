# YJMOD × 영재컴퓨터 PC 추천 웹사이트

영재컴퓨터(youngjaecomputer.com)의 조립PC 제품을 게임·예산·디자인 기준으로 추천해주는 다크 모드 SPA 웹사이트입니다.

---

## 기능 개요

- **AI 추천 위자드**: 게임 → 예산 → 디자인 선호를 3단계로 선택하면 최적 PC 추천
- **위자드 열기 안정화**: `PC 추천받기` 버튼을 이벤트 위임으로 처리해 임베드/CMS 환경에서도 클릭 반응 보장
- **예상 FPS 표시**: 선택한 게임 기준으로 각 제품의 예상 FPS를 실시간 계산
- **다중 필터**: 게임별 / 사양별(FHD·QHD·4K) / 금액별 / 용도별 필터링
- **품절 자동 제외**: 크롤러 수집 시 품절/재고확인 상품 제외 + 프론트엔드 `in_stock`·블록리스트로 이중 필터
- **가격 직관 표시**: 1만 원 단위 절삭 (예: 2,159,000원 → 215만 원)
- **실시간 출고사진**: 영재컴퓨터 네이버 카페 출고사진 슬라이딩 카드
- **메뉴+메인페이지 확장 수집**: 상단 추천 메뉴(이달의 추천PC/무이자/방송·스트리밍/게임별PC/작업용PC/AI 전문가용)와 메인 노출 상품까지 ID 수집
- **6시간 자동 갱신 + 배포 게이트**: 수집 품질 검증 통과 시에만 자동 배포

---

## Windows에서 빠르게 시작하기

1. **프로젝트 폴더로 이동** (경로에 공백이 있으면 반드시 따옴표로 감싸기)
   ```powershell
   cd "C:\Users\pc\Desktop\소프트웨어 개발\상품 추천 페이지"
   ```
2. **로컬 테스트**: `.\scripts\serve-local.ps1` 또는 탐색기에서 `scripts\serve-local.cmd` 더블클릭 → http://localhost:8000
3. **Vercel 배포** 또는 **6시간 자동화 등록** 시 `"이 시스템에서 스크립트를 실행할 수 없으므로"` 오류가 나면:
   ```powershell
   powershell -ExecutionPolicy Bypass -File ".\scripts\deploy_vercel.ps1"
   powershell -ExecutionPolicy Bypass -File ".\scripts\setup-auto-update.ps1" -RunNow
   ```
   자세한 명령어는 아래 **Windows PowerShell 명령어 모음** 참고.

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
├── scripts/
│   ├── serve-local.cmd         # 로컬 HTTP 서버 (더블클릭)
│   ├── deploy_vercel.ps1      # Vercel 프로덕션 배포 (빌드 + 배포)
│   ├── deploy_vercel.cmd      # Vercel 배포 (CMD, 더블클릭 가능)
│   ├── export_single_html.py  # 단일 HTML·번들 생성
│   ├── run-auto-update.ps1    # 6시간 자동 갱신 실행
│   └── setup-auto-update.ps1  # 자동 갱신 작업 스케줄 등록
├── build/                     # Vercel 배포용 (export_single_html.py 출력)
├── .env.example               # 환경 변수 예시 (복사 후 .env.local 등 사용)
├── .env.local.ps1.example     # PowerShell 자동화용 env 예시
└── .github/
    └── workflows/
        └── update-data.yml     # 6시간 주기 자동 크롤링 워크플로우
```

---

## 로컬 vs Vercel — 어떤 명령이 뭘 반영하는지

| 실행 대상 | 명령 | 로컬(localhost) | Vercel(라이브) |
|-----------|------|------------------|----------------|
| **테스트용** | `serve-local.cmd` / `python -m http.server 8000` | ✅ 프로젝트 루트(소스) 그대로 서빙. 코드/데이터 수정 후 새로고침만 하면 반영 | ❌ 영향 없음 |
| **라이브 반영** | `deploy_vercel.cmd` 또는 `deploy_vercel.ps1` | ❌ 영향 없음 | ✅ `build/` 빌드 후 Vercel 프로덕션에만 배포 |
| **자동 갱신** | `run-auto-update.ps1` (또는 작업 스케줄러 6시간) | ✅ `data/` 갱신됨 → 로컬 서버 새로고침 시 새 데이터 표시 | ✅ 품질 통과 시 빌드 후 Vercel 자동 배포 |

- **로컬**: 테스트할 때만 쓰면 됨. `serve-local`은 **Vercel에 배포하지 않고**, 루트의 `index.html`·`js/`·`data/`를 그대로 서빙합니다.
- **Vercel 반영**: 코드/UI를 라이브에 올리려면 **`deploy_vercel`** 실행. 데이터만 갱신해서 라이브에 반영하려면 **`run-auto-update`** 실행(크롤링 후 Vercel 배포까지 수행).

---

## Windows PowerShell 명령어 모음

아래는 **프로젝트 폴더를 현재 디렉터리로 연 PowerShell**에서 사용하는 명령어입니다.  
(탐색기에서 프로젝트 폴더 열고 주소창에 `powershell` 입력 후 Enter 하면 해당 경로에서 PowerShell이 열립니다.)

### 폴더 이동

| 용도 | PowerShell 명령어 |
|------|-------------------|
| **프로젝트 폴더로 이동** | `Set-Location "C:\Users\pc\Desktop\소프트웨어 개발\상품 추천 페이지"` (경로에 **공백이 있으면 반드시 큰따옴표**로 감싸기) |
| **한 단계 위로(상위 폴더)** | `Set-Location ..` 또는 `cd ..` |
| **crawler 폴더로** | `Set-Location .\crawler` 또는 `cd .\crawler` |
| **build 폴더로** | `Set-Location .\build` 또는 `cd .\build` |
| **현재 위치 확인** | `Get-Location` 또는 `pwd` |

**주의:** 경로에 공백이 있을 때 따옴표 없이 쓰면 오류가 납니다.  
예: `Set-Location C:\Users\pc\Desktop\소프트웨어 개발\상품 추천 페이지` → ❌  
올바른 예: `Set-Location "C:\Users\pc\Desktop\소프트웨어 개발\상품 추천 페이지"` → ✅  

프로젝트 경로가 다르면 아래 경로를 본인 PC에 맞게 바꿔서, **항상 큰따옴표로 감싼 뒤** 사용하세요.

**프로젝트 폴더로 이동 (복사해서 사용):**
```powershell
Set-Location "C:\Users\pc\Desktop\소프트웨어 개발\상품 추천 페이지"
```
또는
```powershell
cd "C:\Users\pc\Desktop\소프트웨어 개발\상품 추천 페이지"
```

### 자주 쓰는 명령어

| 용도 | PowerShell 명령어 |
|------|-------------------|
| **로컬 서버(테스트)** | `.\scripts\serve-local.ps1` 또는 `python -m http.server 8000` |
| **단일 HTML 빌드** | `python .\scripts\export_single_html.py` |
| **Vercel 배포** | `.\scripts\deploy_vercel.ps1` (실행 정책 오류 시 아래 참고) |
| **데이터 갱신 + Vercel 배포** | `.\scripts\run-auto-update.ps1` |
| **6시간 자동화 등록(1회)** | 아래 "실행 정책 오류 시" 참고 |
| **환경 변수 파일 복사** | `Copy-Item .\.env.example .\.env.local` / `Copy-Item .\.env.local.ps1.example .\.env.local.ps1` |

**"이 시스템에서 스크립트를 실행할 수 없으므로" 오류가 날 때**  
PowerShell 실행 정책 때문에 `.ps1`이 막혀 있으면, 아래처럼 **Bypass**로 실행하세요.

| 하고 싶은 작업 | 한 줄 명령 (실행 정책 우회) |
|----------------|-----------------------------|
| 6시간 자동화 등록 | `powershell -ExecutionPolicy Bypass -File ".\scripts\setup-auto-update.ps1" -RunNow` |
| Vercel 배포 | `powershell -ExecutionPolicy Bypass -File ".\scripts\deploy_vercel.ps1"` |
| 데이터 갱신 + Vercel 배포 | `powershell -ExecutionPolicy Bypass -File ".\scripts\run-auto-update.ps1"` |

**또는** 현재 세션에서만 스크립트 허용한 뒤 실행:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\scripts\setup-auto-update.ps1 -RunNow   # 또는 deploy_vercel.ps1, run-auto-update.ps1
```

**크롤러만 실행 (PowerShell)**  
프로젝트 루트에서:

```powershell
Set-Location .\crawler
pip install -r requirements.txt
python crawl_products.py
# 카페 크롤러 (네이버 API 키 설정 후)
$env:NAVER_CLIENT_ID="your_id"; $env:NAVER_CLIENT_SECRET="your_secret"; python crawl_cafe.py
Set-Location ..
```

---

## 로컬 개발 환경 설정

### 1. 웹사이트 실행 (로컬 미리보기, 테스트용)

**index.html을 더블클릭해서 열면 동작하지 않습니다.**  
ES 모듈(`import/export`)과 `fetch()`는 `file://` 프로토콜에서 CORS/보안 제한으로 막히므로, **반드시 HTTP 서버**로 띄워야 합니다.

**방법 A – 추천: 스크립트로 실행 (한글 경로 OK)**  
- **Windows**: 탐색기에서 `scripts\serve-local.cmd` 더블클릭  
  → 서버 시작 + 브라우저에서 `http://localhost:8000` 자동 오픈  
- **PowerShell**: 프로젝트 폴더에서  
  `.\scripts\serve-local.ps1`

**방법 B – 터미널에서 직접**  
프로젝트 폴더가 현재 디렉터리인 상태에서:

```bash
python -m http.server 8000
```

브라우저에서 **http://localhost:8000** 접속

**방법 C – VS Code / Cursor**  
- **Live Server** 확장 설치 후 `index.html`에서 우클릭 → "Open with Live Server"

### 2. 크롤러 설정

```bash
cd crawler
pip install -r requirements.txt

# 제품 크롤러 실행
python crawl_products.py

# 카페 크롤러 실행 (네이버 API 키 필요)
NAVER_CLIENT_ID=your_id NAVER_CLIENT_SECRET=your_secret python crawl_cafe.py
```

**품절 감지 (크롤러)**  
상품 상세 페이지에서 아래 조건이면 수집 대상에서 제외합니다.  
- 페이지 제목(h2)이 "품절"  
- 클래스명에 `soldout`/`it_soldout`  
- 본문에 "재고확인", "재고 확인", "품절", "일시품절", "재고없음" 등 키워드

### 3. 데이터 갱신 + Vercel 배포 한 번에 (수동 실행)

**크롤링 → 품질 검증 → 빌드 → Vercel 프로덕션 배포**까지 한 번에 진행됩니다.  
(로컬은 `data/`만 갱신되므로, 테스트 시에는 `serve-local` 띄운 뒤 새로고침하면 새 데이터가 보입니다.)

**PowerShell (프로젝트 폴더에서):**
```powershell
.\scripts\run-auto-update.ps1
```

**실행 정책 오류 시 또는 CMD 등에서 호출:**
```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\run-auto-update.ps1"
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
- 워크플로에서 **크롤 → 단일 HTML 빌드 → `data/`·`build/` 커밋·푸시**까지 수행

### PC 없이 6시간 자동 갱신 (권장)

**PowerShell을 PC에서 돌릴 필요 없습니다.** GitHub Actions가 크롤링·빌드까지 하고 푸시하면, Vercel이 그걸 받아서 자동 배포합니다.

1. **이 레포를 Vercel에 연결**  
   [Vercel](https://vercel.com) → Add New Project → 이 GitHub 저장소 선택
2. **Vercel 프로젝트 설정**
   - **Root Directory**: 비워 두기 (저장소 루트)
   - **Output Directory**: `build` 로 설정 (워크플로가 푸시한 `build/` 폴더를 그대로 배포)
   - **Build Command**: 비워 두기 (빌드는 GitHub Actions에서 이미 완료)
3. **푸시 시 자동 배포**  
   워크플로가 데이터·빌드 변경 시 `git push` 하면 Vercel이 자동으로 새 배포를 띄웁니다.

이렇게 하면 **PC 전원/작업 스케줄러와 무관하게** 6시간마다 갱신·배포됩니다.  
로컬에서 `setup-auto-update.ps1`·작업 스케줄러는 **선택 사항**(백업·수동 실행용)입니다.

---

## 서버 배포 (가비아 / 오라클 등)

이 프로젝트는 순수 정적 파일로 구성되어 있어 별도 백엔드 없이 웹 서버만으로 운영 가능합니다.

- **Vercel 권장**: 위 "Vercel + CMS 배포" 절차대로 하면 `build/` 기준으로 자동 배포됩니다.
- **자체 서버** 사용 시:

```bash
# 정적 파일을 서버로 복사 (build/ 또는 루트 index.html+js+data)
scp -r ./* user@your-server:/var/www/html/

# 크롤러는 서버 cron으로 전환
crontab -e
# 0 */6 * * * cd /path/to/crawler && python crawl_products.py && python crawl_cafe.py
```

---

## Windows 6시간 자동화 (명령어 1회)

작업 스케줄러 등록 + 의존성 설치 + 자동 갱신(6시간 주기) 설정이 완료됩니다.

**"이 시스템에서 스크립트를 실행할 수 없으므로" 오류가 나면**  
PowerShell 기본 보안 설정 때문에 `.ps1` 스크립트 실행이 막혀 있는 상태입니다. 아래처럼 **실행 정책 Bypass**를 써서 실행하세요.

**권장 (프로젝트 폴더에서 복사해 실행):**
```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\setup-auto-update.ps1" -RunNow
```

**또는:** 현재 세션에서만 실행 정책을 풀고 실행
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\scripts\setup-auto-update.ps1 -RunNow
```

실행 정책 오류 없이 이미 스크립트 실행이 허용된 환경이라면:
```powershell
.\scripts\setup-auto-update.ps1 -RunNow
```

- 자동 실행 작업명: `YJMOD-PC-Data-AutoUpdate`
- 런처: `C:\YJMOD-AutoUpdate\run.bat` → `launch.ps1` → `run-auto-update.ps1`
- 로그 파일: `logs/auto-update-YYYYMMDD.log`
- **권장**: 위 "PC 없이 6시간 자동 갱신"대로 GitHub Actions + Vercel을 쓰면 PC 작업 스케줄러는 생략 가능

**수동 실행 테스트**: `schtasks /Run /TN YJMOD-PC-Data-AutoUpdate` 또는  
`powershell -ExecutionPolicy Bypass -File ".\scripts\run-auto-update.ps1"`

### 자동 배포 품질 게이트(중요)

`scripts/run-auto-update.ps1`에는 아래 차단 규칙이 포함되어 있습니다.

- 제품 수가 기준 미만이면 배포 차단 (기본: 200 미만)
- 품절 키워드가 상품명에 섞여 있으면 배포 차단
- CPU/GPU 누락 상품이 존재하면 배포 차단

즉, **크롤링이 불완전하면 자동 업로드가 되지 않도록** 설계되어 있습니다.

### 환경 변수 (선택: 네이버 카페 API/로그인)

| 파일 | 용도 |
|------|------|
| `.env.example` | 필요한 환경 변수 목록 (커밋됨, 값 없음) |
| `.env.local.ps1.example` | PowerShell 자동화용 예시 → `.env.local.ps1`로 복사 후 사용 |

```powershell
# 일반 env (필요 시)
copy .env.example .env.local
# PowerShell 자동화용
copy .env.local.ps1.example .env.local.ps1
```

복사 후 해당 파일에 NAVER 관련 값(`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_ID`, `NAVER_PW`)을 채우면, 자동화 실행 시 함께 로드됩니다.  
실제 값이 들어간 `.env`, `.env.local`은 `.gitignore`로 커밋되지 않습니다.

---

## Vercel + CMS(HTML 코드만) 배포

이 방식은 사이트 본체를 Vercel에 올리고, 쇼핑몰 CMS 본문에는 iframe HTML 코드만 넣는 운영 방식입니다.

### 1) 단일 HTML 생성

```powershell
python .\scripts\export_single_html.py
```

생성 파일:
- `build/index.html` (Vercel 배포 엔트리)
- `build/yjmod-single.html` (동일 내용 백업)
- `build/cms-embed.html` (CMS 붙여넣기용 코드)

### 2) Vercel 배포

**방법 A – CMD (더블클릭 가능)**  
`scripts\deploy_vercel.cmd` 실행 → 빌드 후 `vercel --prod` 자동 실행

**방법 B – PowerShell (프로젝트 폴더에서)**

```powershell
.\scripts\deploy_vercel.ps1
```

실행 정책 오류 시: `powershell -ExecutionPolicy Bypass -File ".\scripts\deploy_vercel.ps1"`

- 스크립트가 `export_single_html.py` 실행 → `vercel.json` 복사 → `build` 폴더에서 `vercel --prod` 실행
- **프로덕션 URL**: https://ai.youngjaecomputer.com  
- 최초 1회는 `npm i -g vercel` 및 `vercel login` 필요할 수 있음

### 3) CMS에 붙여넣기

- 관리자 에디터 `HTML` 모드에서 `build/cms-embed.html` 내용을 그대로 붙여넣기
- 기본 iframe 주소는 `https://ai.youngjaecomputer.com` 으로 생성됨
- 필요 시 환경변수로 변경 가능:

```powershell
$env:YJMOD_EMBED_URL="https://원하는-도메인"
python .\scripts\export_single_html.py
```

### 4) CMS 스크롤 여백 최소화

`build/cms-embed.html`은 iframe 높이를 `postMessage`로 자동 조절합니다.

- 초기 높이: 1200px
- 실측 높이 반영: `콘텐츠 높이 + 8px`
- 목적: 하단 과도한 빈 여백 없이 다음 콘텐츠가 바로 보이도록 처리

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
| 배포 | Vercel (정적), `build/` 단일 HTML + 번들 |
| 크롤러 | Python 3.11+, Selenium 4, BeautifulSoup4 |
| 자동화 | GitHub Actions, Windows 작업 스케줄러 |
| 데이터 | JSON 파일 (정적), 품절·재고확인 제외 |

---

## 문의

- 영재컴퓨터 공식 홈페이지: https://www.youngjaecomputer.com
- 네이버 카페: https://cafe.naver.com/no1yjmod
- 고객센터: 02-716-5232
