# YJMOD 추천 PC 서비스

영재컴퓨터 조립 PC 추천 프론트엔드입니다. 추천 위자드, 직접 필터, 제품 카드, 상담 연결, 데이터 기반 추천 흐름을 포함합니다.

## 표준 실행 기준

- 개발/QA: `http://127.0.0.1:4173/index.html`
- 운영: [https://ai.youngjaecomputer.com/](https://ai.youngjaecomputer.com/)
- 오프라인 파일: `build/yjmod-single.html`

`index.html`은 개발 기준으로는 HTTP/HTTPS 엔트리입니다. `file://`로 직접 열면 자동으로 `build/yjmod-single.html`로 이동해 오프라인 위자드 흐름을 이어줍니다.

## 빠른 시작

```powershell
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:4173/index.html`을 엽니다.

## 표준 명령

### 개발 서버

```powershell
npm run dev
```

또는 Windows에서:

```powershell
.\scripts\serve-local.ps1
```

### 오프라인 산출물 생성

```powershell
npm run build
```

생성 결과:

- `build/yjmod-single.html`
- `build/cms-embed.html`

`build/`는 생성물 전용 디렉터리입니다. 소스 오브 트루스가 아닙니다.

### 로컬 QA

```powershell
npm run qa:wizard-scroll
npm run qa:conversion
npm run qa:file
```

한 번에:

```powershell
npm run qa:all
```

### 프론트엔드 프로덕션 배포

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\deploy_vercel.ps1"
```

이 스크립트는 다음만 수행합니다.

1. 프론트엔드 빌드
2. 루트 프로젝트를 Vercel 프로덕션으로 배포
3. 운영 URL에서 위자드/전환 QA 검증

### 데이터 갱신 + 배포

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\run-auto-update.ps1"
```

이 경로만 크롤링, 데이터 갱신, FPS 보강, 라이브 FPS 검증을 수행합니다.

## 역할 분리

### 1. 로컬 HTTP

- 유일한 개발/디버그 기준
- 루트 `index.html`, `js/`, `css/`, `data/`를 그대로 사용
- 위자드/필터/이벤트/렌더링 QA는 이 환경 기준으로 검증

### 2. 운영 URL

- 유일한 배포 검증 기준
- 배포 후 실제 클릭 기준으로 위자드와 전환 흐름 확인
- 캐시 불일치 방지를 위해 `index.html`은 `app.js?v=<build-id>` 형태로 모듈을 로드

### 3. file://

- 오프라인 데모 전용
- 실제 실행 파일은 `build/yjmod-single.html`
- 루트 `index.html`을 직접 열면 자동으로 같은 파일로 연결

## 저장소 규칙

- 소스 오브 트루스: `index.html`, `js/`, `css/`, `api/`, `data/`, `scripts/`, `vercel.json`
- 생성물: `build/`
- 로컬 도구/메모: `.claude/`, `.cursor/`, `work/`, `subagents/`는 Git 추적 대상 아님
- 프론트 변경과 데이터 크롤링 변경은 한 작업으로 섞지 않는 것을 권장

## 디버그 기준

- 기본 콘솔은 조용해야 합니다.
- 상세 추적은 `?debug=1` 또는 `localStorage.yjmodDebug=1`일 때만 활성화됩니다.
- 운영성 진단 포인트:
  - `[BUILD]`
  - `[CATALOG READY]`
  - 위자드 단계/상태/렌더 추적 로그

## 관련 문서

- [ops/RUNTIME_GUIDE.md](ops/RUNTIME_GUIDE.md)
- [ops/RELEASE_CHECKLIST.md](ops/RELEASE_CHECKLIST.md)
- [ops/OPERATIONAL_MEMO.md](ops/OPERATIONAL_MEMO.md)
