@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo 재고/상품 데이터 갱신 중... (완료까지 수 분 소요)
cd crawler
python crawl_products.py
cd ..
if exist "data\pc_data.json" (
  echo 완료. data\pc_data.json 이 갱신되었습니다.
) else (
  echo data\pc_data.json 을 확인해 주세요.
)
pause
