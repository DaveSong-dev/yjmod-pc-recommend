-- 001_create_youngjae_pc_reco_table.sql
create table if not exists public.youngjae_pc_reco (
  it_id text primary key,
  dataset_version text not null,
  parser_version text not null,
  rules_version text not null,
  tag_version text not null,

  name text not null,
  detail_url text,
  image_url text,

  selling_price integer,
  benefit_price integer,
  price_raw integer,
  price_effective integer,
  price_is_estimated boolean not null default false,
  price_source text,
  frontend_price_band text,

  raw_soldout boolean not null default false,
  inventory_sync_warning boolean not null default false,

  recommendable boolean not null default false,
  recommendable_live boolean not null default false,
  recommend_group text not null default 'consumer_general',
  product_type text not null,
  exclude_reason text[] not null default '{}',

  parse_confidence numeric(4,3) not null default 0.000,
  parse_flags text[] not null default '{}',
  needs_review boolean not null default false,

  cpu_raw text,
  cpu_norm text,
  cpu_parse_rule text,
  gpu_raw text,
  gpu_norm text,
  gpu_parse_rule text,

  ram_gb smallint,
  ram_ddr_gen smallint,
  ram_channels smallint,
  ssd_total_gb integer,
  gpu_vram_gb smallint,
  power_watt smallint,
  case_color text,
  wifi_support boolean,

  has_32gb_plus boolean,
  has_1tb_plus boolean,
  qhd_gaming_fit boolean,
  uhd4k_fit boolean,
  video_edit_level text,
  ai_entry_fit boolean,
  llm_local_fit boolean,
  value_position text,
  performance_position text,
  design_position text,
  upgrade_headroom text,
  consult_required boolean,

  gaming_grade_fhd text,
  gaming_grade_qhd text,
  gaming_grade_4k text,
  video_edit_grade text,
  office_grade text,
  modeling_grade text,
  ai_entry_grade text,
  streaming_grade text,

  ai_ready boolean,
  llm_entry_ready boolean,
  llm_standard_ready boolean,
  gpu_vendor text,
  gpu_tensor_class text,
  vram_class text,
  local_ai_grade smallint,
  image_gen_local_grade smallint,

  frontend_primary_usage text,
  frontend_game_tags text[] not null default '{}',
  frontend_usage_tags text[] not null default '{}',
  frontend_installment_tags text[] not null default '{}',
  frontend_spec_band text,
  frontend_rank_score integer,

  best_for_tags text[] not null default '{}',
  avoid_for_tags text[] not null default '{}',
  selling_points text[] not null default '{}',
  display_badges text[] not null default '{}',
  search_tags text[] not null default '{}',
  summary_reason text,

  fps_1080p jsonb,
  fps_1440p jsonb,
  fps_4k_raw jsonb,
  fps_4k_corrected jsonb,
  usage_score jsonb,
  resolution jsonb,
  tier text,
  perf_updated_at timestamptz,

  imported_at timestamptz not null default now()
);

create index if not exists idx_youngjae_pc_reco_recommendable
  on public.youngjae_pc_reco (recommendable, recommend_group, frontend_rank_score desc);

create index if not exists idx_youngjae_pc_reco_game_tags
  on public.youngjae_pc_reco using gin (frontend_game_tags);

create index if not exists idx_youngjae_pc_reco_usage_tags
  on public.youngjae_pc_reco using gin (frontend_usage_tags);

create index if not exists idx_youngjae_pc_reco_best_for_tags
  on public.youngjae_pc_reco using gin (best_for_tags);

create index if not exists idx_youngjae_pc_reco_exclude_reason
  on public.youngjae_pc_reco using gin (exclude_reason);
