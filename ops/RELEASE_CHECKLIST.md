# 반영 확인 체크리스트 (필수)

배포/반영 작업 시 아래 순서를 반드시 지킨다.

## A. 머지/실행 전
- [ ] PR이 `MERGED` 상태인지 확인
- [ ] 대상 브랜치가 `master`인지 확인
- [ ] 로컬 dirty 상태(`data/*.json`, `build/`)가 반영 판단에 영향을 주지 않는지 확인

## B. 자동 갱신 실행
- [ ] `gh workflow run "데이터 자동 갱신 (6시간 주기)" --ref master` 실행
- [ ] run ID 기록
- [ ] `gh run list`로 상태 추적 (`queued -> in_progress -> completed`)

## C. 완료 판정(3중 확인)
- [ ] Actions가 `completed/success`
- [ ] `origin/master` 최신 커밋에 기대 변경 반영 확인
- [ ] 라이브 URL 기능 검증:
  - [ ] 정적 문자열(예: 단계 수, 옵션 문구) 확인
  - [ ] 실제 기능 시나리오 1개 이상 확인

## D. 라이브 미반영 시
- [ ] `?v=<timestamp>` 캐시 우회 재확인
- [ ] `build/app.bundle.js` 기대 문자열 확인
- [ ] 필요 시 `scripts/deploy_vercel.ps1` 수동 배포
- [ ] 배포 후 C 단계 재검증

## E. 사용자 안내 규칙
- [ ] `in_progress` 단계에서는 "진행 중"으로만 안내
- [ ] 3중 확인 완료 전 "반영 완료" 표현 금지
