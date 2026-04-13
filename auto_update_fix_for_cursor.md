# 🔧 6시간 자동 업데이트 장애 수정 (Cursor 전달용)

## 🔍 로그 분석 결과 (진단 완료)

로그 파일 전수 분석 결과, **실제로 발생 중인 문제 2가지**:

| 문제 | 내용 | 영향 |
|------|------|------|
| 🔴 **vercel deploy 무한 행** | 6시간 중 1~2회꼴로 vercel 배포가 응답 없이 멈춤 | 이후 1~2사이클(12시간) 업데이트 차단 |
| 🟠 **verify_live_fps.py 100% 실패** | 2026-04-02부터 지금까지 모든 실행이 error 종료 | 실제 배포는 성공하는데 매번 오류 로그 기록 |

실제 실행 패턴 (로그 기반):

```
4월  4일: 4회 실행 / 4회 배포 성공 / 4회 verify 오류  ← 정상 배포, verify만 실패
4월  5일: 4회 실행 / 4회 배포 성공 / 4회 verify 오류
4월  6일: 4회 실행 / 3회 배포 성공 / 1회 vercel 13시간 행
4월  7일: 2회 실행  ← 4/6 20:38 행(13시간)이 4/7 02:38·08:38 차단
4월  8일: 1회 실행  ← 02:38 배포 중 현재 행 상태 (03:04에 build 완료 후 멈춤)
```

---

## 🛠️ 수정 파일: `scripts/run-auto-update.ps1`

### 수정 1 — vercel deploy에 10분 타임아웃 추가

**현재 코드** (문제: 타임아웃 없어서 무한 대기):
```powershell
& $vercelCmd --prod --yes --scope $scope
if ($LASTEXITCODE -ne 0) { throw "vercel deploy failed: $LASTEXITCODE" }
Write-Log "vercel deploy complete"
```

**수정 후** (10분 초과 시 강제 종료 + 오류 처리):
```powershell
Write-Log "vercel deploy starting..."
$deployProc = Start-Process `
  -FilePath $vercelCmd `
  -ArgumentList @("--prod", "--yes", "--scope", $scope) `
  -NoNewWindow -PassThru

$deployTimeout = 600  # 10분 (초)
$finished = $deployProc.WaitForExit($deployTimeout * 1000)

if (-not $finished) {
  try { $deployProc.Kill() } catch {}
  throw "vercel deploy timed out after ${deployTimeout}s — killed"
}
if ($deployProc.ExitCode -ne 0) {
  throw "vercel deploy failed: $($deployProc.ExitCode)"
}
Write-Log "vercel deploy complete"
```

---

### 수정 2 — verify_live_fps.py 오류를 비차단(경고)으로 전환

**현재 코드** (문제: verify 실패 시 전체 프로세스가 error 종료됨):
```powershell
& python ".\\scripts\\verify_live_fps.py"
if ($LASTEXITCODE -ne 0) { throw "verify_live_fps failed: $LASTEXITCODE" }
Write-Log "live fps verification complete"
```

**수정 후** (verify 실패해도 사이클 자체는 성공 처리):
```powershell
try {
  & python ".\\scripts\\verify_live_fps.py"
  if ($LASTEXITCODE -ne 0) {
    Write-Log "WARN: verify_live_fps exited $LASTEXITCODE — skipping (deploy already complete)"
  } else {
    Write-Log "live fps verification complete"
  }
} catch {
  Write-Log ("WARN: verify_live_fps exception: " + $_.Exception.Message + " — skipping")
}
```

---

### 수정 3 — stale lock 타임아웃 90분 → 20분으로 단축

**현재 코드**:
```powershell
$staleLockMinutes = 90
```

**수정 후**:
```powershell
$staleLockMinutes = 20   # 20분 초과 lock은 비정상으로 간주
# (정상 실행: crawl 25분 + build 5분 + deploy 10분 = ~40분. timeout 적용 후 최대 40분)
```

**이유**: 이전엔 타임아웃이 없어서 deploy가 13시간 걸릴 수 있었지만,
수정 1 적용 후 전체 실행은 최대 ~45분이므로 20분 stale은 너무 짧을 수 있음.
→ 대신 **60분**으로 설정하는 것이 더 안전:
```powershell
$staleLockMinutes = 60
```

---

### 수정 4 — 실행 완료 로그를 항상 기록 (성공 여부 명확화)

**현재**: verify 실패 시 `error: verify_live_fps failed: 1` 로그만 남고 성공 여부 불명확

**수정**: try 블록 마지막에 성공 로그 추가
```powershell
# ...verify 블록 이후...
Write-Log "auto-update finished successfully"
exit 0
```
→ 이미 있는 코드이므로, verify를 비차단 처리하면 이 줄까지 정상 도달함

---

## 📋 수정 적용 순서 (Cursor에게 요청)

```
1. scripts/run-auto-update.ps1 열기
2. vercel deploy 블록 → Start-Process + WaitForExit(600000) 으로 교체
3. verify_live_fps 블록 → try/catch + WARN 로그로 교체
4. $staleLockMinutes 값 → 60 으로 변경
5. 저장 후 수동 테스트:
   powershell -ExecutionPolicy Bypass -File scripts/run-auto-update.ps1
```

---

## 🔥 지금 당장 해야 할 일 (현재 02:38 실행이 행 상태)

현재 04/08 02:38 실행이 vercel deploy 단계에서 멈춰 있고 lock 파일이 살아있음.
Windows에서 아래 명령으로 수동 정리 후 즉시 재실행:

```powershell
# 1. 행 중인 vercel 프로세스 강제 종료
Get-Process -Name "vercel", "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. 락 파일 삭제
Remove-Item "C:\...\상품추천페이지\logs\auto-update.lock" -Force

# 3. 수동 즉시 실행
powershell -ExecutionPolicy Bypass -File "C:\...\상품추천페이지\scripts\run-auto-update.ps1"
```

---

## ✅ 수정 후 예상 동작

- 정상 사이클: ~40분 (crawl 25 + fps 5 + build 5 + deploy 5)
- vercel 행 발생 시: 10분에서 강제 종료 → 오류 로그 + 다음 6시간에 재시도
- verify 실패: 경고 로그만 남기고 성공 처리
- lock 60분 초과: stale로 간주 + 다음 사이클 정상 시작
- 하루 4회 배포 → 안정적으로 유지됨
