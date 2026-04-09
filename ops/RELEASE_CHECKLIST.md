# Release Checklist

## 1. 배포 전

- [ ] `npm run build`
- [ ] `npm run qa:all`
- [ ] `git status`에서 생성물(`build/`)과 로컬 툴 디렉터리가 섞여 보이지 않는지 확인
- [ ] 이번 변경이 프론트엔드인지, 데이터 갱신인지 경로가 명확한지 확인

## 2. 프론트엔드 배포

- [ ] `powershell -ExecutionPolicy Bypass -File ".\scripts\deploy_vercel.ps1"`
- [ ] 운영 URL이 `200` 응답인지 확인
- [ ] 운영 URL에서 위자드 열기, 단계 이동, 결과 렌더, 상담 링크를 실제 클릭으로 확인

## 3. 데이터 갱신 배포

- [ ] `powershell -ExecutionPolicy Bypass -File ".\scripts\run-auto-update.ps1"`
- [ ] 크롤링 결과 최소 수량, 품절 명칭, 스펙 누락 게이트 통과 확인
- [ ] 라이브 FPS 검증 통과 확인

## 4. 캐시 / 빌드 일치

- [ ] 운영 `index.html`이 `js/app.js?v=<build-id>` 형식으로 로드되는지 확인
- [ ] 배포 직후 운영 브라우저에서 새 세션으로 열어 최신 UI와 JS가 함께 반영되는지 확인

## 5. 역할 분리

- [ ] 로컬 개발은 `npm run dev`
- [ ] 운영 배포는 `deploy_vercel.ps1`
- [ ] 데이터 갱신은 `run-auto-update.ps1`
- [ ] 오프라인 파일은 `build/yjmod-single.html`
