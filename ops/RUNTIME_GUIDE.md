# Runtime Guide

## 소스 오브 트루스

- 루트 `index.html`
- `js/`
- `css/`
- `api/`
- `data/`
- `scripts/`
- `vercel.json`

`build/`는 생성물 전용이며, 개발/배포의 기준 파일이 아닙니다.

## 환경별 역할

### 로컬 HTTP

- 주소: `http://127.0.0.1:4173/index.html`
- 목적: 개발, 디버그, Playwright QA
- 실행: `npm run dev`

### 운영 URL

- 주소: [https://ai.youngjaecomputer.com/](https://ai.youngjaecomputer.com/)
- 목적: 실제 배포 검증
- 실행: `deploy_vercel.ps1`

### file:// 오프라인

- 파일: `build/yjmod-single.html`
- 목적: 오프라인 데모, 단일 파일 전달
- 실행 전: `npm run build`
- 루트 `index.html`을 직접 열면 자동으로 이 파일로 이동

## 표준 절차

1. 프론트 변경
   - `npm run build`
   - `npm run qa:all`
   - `deploy_vercel.ps1`

2. 데이터 변경
   - `run-auto-update.ps1`

3. 운영 검증
   - 위자드 오픈
   - 단계 이동
   - 결과 렌더
   - CTA / 상담 링크
   - 필요 시 `?debug=1`
