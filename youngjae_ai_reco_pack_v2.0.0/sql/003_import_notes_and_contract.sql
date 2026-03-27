-- 003_import_notes_and_contract.sql
-- 권장 적재 순서
-- 1. 001_create_youngjae_pc_reco_table.sql 실행
-- 2. CSV 또는 JSON을 staging 테이블로 적재
-- 3. youngjae_pc_reco로 upsert

-- psql 예시:
-- \copy public.youngjae_pc_reco FROM 'datasets/v2.0.0/youngjae_ai_reco_dataset_v2.0.0.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- 매우 중요:
-- 현재 원본 SQL 기준 raw_soldout=true 가 전건 감지되었습니다.
-- 따라서 라이브 서비스에서는 아래처럼 노출 조건을 사용하십시오.
--
-- 임시 권장:
--   where recommendable = true
--
-- 재고 크롤러 정상화 후:
--   where recommendable = true and raw_soldout = false

insert into public.youngjae_pc_reco_version_log
(dataset_version, parser_version, rules_version, tag_version, note)
values
('2.0.0', '2.1.0', '2.0.0', '2.0.0', 'Initial rebuilt AI recommendation dataset package');
