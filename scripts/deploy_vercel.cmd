@echo off
chcp 65001 >nul
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo [1/5] 실제 게임 FPS 보강
python "%~dp0enrich_game_fps.py"
if errorlevel 1 (
  echo FPS 보강 실패.
  pause
  exit /b 1
)

echo [2/5] 단일 HTML 생성
python "%~dp0export_single_html.py"
if errorlevel 1 (
  echo 빌드 실패. Node.js 설치 후 npm install -g vercel 및 npx 사용 가능한 터미널에서 다시 시도하세요.
  pause
  exit /b 1
)

echo [3/5] vercel.json 복사
copy /Y "%ROOT%\vercel.json" "%ROOT%\build\vercel.json" >nul

echo [4/5] Vercel 프로덕션 배포
cd "%ROOT%\build"
call vercel --prod
if errorlevel 1 (
  echo Vercel 배포 실패. vercel CLI: npm i -g vercel
  pause
  exit /b 1
)

cd /d "%ROOT%"
timeout /t 8 /nobreak >nul

echo [5/5] 라이브 FPS 자동 검증
python "%~dp0verify_live_fps.py"
if errorlevel 1 (
  echo 라이브 FPS 검증 실패.
  pause
  exit /b 1
)

echo.
echo 완료: build/index.html 기준으로 배포되었습니다.
pause
