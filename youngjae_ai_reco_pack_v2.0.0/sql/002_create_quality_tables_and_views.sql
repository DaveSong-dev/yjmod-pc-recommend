-- 002_create_quality_tables_and_views.sql
create table if not exists public.youngjae_pc_reco_version_log (
  id bigserial primary key,
  dataset_version text not null,
  parser_version text not null,
  rules_version text not null,
  tag_version text not null,
  generated_at timestamptz not null default now(),
  note text
);

create or replace view public.youngjae_pc_reco_frontend_v as
select
  it_id,
  name,
  detail_url,
  image_url,
  price_effective,
  price_is_estimated,
  price_source,
  frontend_price_band,
  frontend_spec_band,
  frontend_primary_usage,
  frontend_game_tags,
  frontend_usage_tags,
  frontend_installment_tags,
  display_badges,
  best_for_tags,
  selling_points,
  summary_reason,
  cpu_norm,
  gpu_norm,
  ram_gb,
  ssd_total_gb,
  gpu_vram_gb,
  case_color,
  wifi_support,
  gaming_grade_fhd,
  gaming_grade_qhd,
  gaming_grade_4k,
  video_edit_grade,
  office_grade,
  modeling_grade,
  ai_ready,
  llm_entry_ready,
  gpu_tensor_class,
  vram_class,
  local_ai_grade,
  image_gen_local_grade,
  fps_1080p,
  fps_1440p,
  fps_4k_corrected,
  frontend_rank_score,
  raw_soldout,
  inventory_sync_warning
from public.youngjae_pc_reco
where recommendable = true
order by frontend_rank_score desc, price_effective asc nulls last;

create or replace view public.youngjae_pc_reco_consult_v as
select *
from public.youngjae_pc_reco
where recommendable = false
order by recommend_group, consult_required desc, price_effective desc nulls last;
