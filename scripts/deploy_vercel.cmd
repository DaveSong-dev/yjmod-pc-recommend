@echo off
chcp 65001 >nul
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo [1/3] 단일 HTML 생성
python "%~dp0export_single_html.py"
if errorlevel 1 (
  echo 빌드 실패. Node.js 설치 후 npm install -g vercel 및 npx 사용 가능한 터미널에서 다시 시도하세요.
  pause
  exit /b 1
)

echo [2/3] vercel.json 복사
copy /Y "%ROOT%\vercel.json" "%ROOT%\build\vercel.json" >nul

echo [3/3] Vercel 프로덕션 배포
cd "%ROOT%\build"
call vercel --prod
if errorlevel 1 (
  echo Vercel 배포 실패. vercel CLI: npm i -g vercel
  pause
  exit /b 1
)

echo.
echo 완료: build/index.html 기준으로 배포되었습니다.
pause
