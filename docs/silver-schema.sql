-- MenuGraph silver-layer schema.
-- Dialect target: PostgreSQL 15+ with jsonb. DuckDB can use JSON/VARCHAR
-- substitutions for local analysis.
--
-- Design rule: source records are immutable. OCR, model outputs, LLM outputs,
-- human review, and analytics are derived claims written through extraction_run
-- and evidence tables. The future OCR enricher should insert into these tables
-- instead of creating a separate model that must be migrated later.

create table if not exists source_registry (
  source_id text primary key,
  name text not null,
  source_type text not null,
  priority int not null default 3,
  access_method text not null,
  source_url text,
  api_url text,
  bulk_available text,
  license text,
  rights_category text not null,
  grok_safe_default boolean not null default false,
  publish_source_images boolean not null default false,
  publish_derived_metadata boolean not null default true,
  require_rights_review_for_external_export boolean not null default true,
  manifest_json jsonb not null default '{}',
  last_ingested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists source_artifact (
  artifact_id text primary key,
  source_id text not null references source_registry(source_id),
  source_record_id text,
  artifact_type text not null,
  artifact_uri text not null,
  media_type text,
  byte_size bigint,
  checksum_sha256 text,
  width int,
  height int,
  rights_category text,
  capture_method text not null,
  captured_at timestamptz not null default now(),
  provenance_json jsonb not null default '{}'
);

create table if not exists collection_item (
  item_id text primary key,
  source_id text not null references source_registry(source_id),
  source_record_id text not null,
  title text,
  item_url text,
  image_url text,
  raw_date_text text,
  raw_place_text text,
  raw_metadata_json jsonb not null default '{}',
  rights_category text,
  created_at timestamptz not null default now(),
  unique (source_id, source_record_id)
);

create table if not exists canonical_venue (
  canonical_venue_id text primary key,
  canonical_name text not null,
  aliases jsonb not null default '[]',
  venue_type text,
  city text,
  region text,
  country text,
  latitude numeric,
  longitude numeric,
  first_seen_year int,
  last_seen_year int,
  authority_links jsonb not null default '[]',
  confidence numeric,
  provenance_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists menu (
  menu_id text primary key,
  item_id text references collection_item(item_id),
  source_id text not null references source_registry(source_id),
  source_record_id text not null,
  title text,
  restaurant_text text,
  canonical_venue_id text references canonical_venue(canonical_venue_id),
  date_text text,
  year int,
  lower_year int,
  upper_year int,
  date_confidence text,
  decade text,
  city text,
  region text,
  country text,
  menu_types text[] not null default '{}',
  cuisine_tags text[] not null default '{}',
  language text,
  currency_text text,
  page_count int,
  source_confidence text,
  rights_category text,
  provenance_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_record_id)
);

create table if not exists menu_page (
  page_id text primary key,
  menu_id text not null references menu(menu_id),
  source_page_id text,
  page_number int,
  image_artifact_id text references source_artifact(artifact_id),
  image_url text,
  iiif_manifest_url text,
  width int,
  height int,
  rotation_degrees numeric,
  page_role text,
  rights_category text,
  provenance_json jsonb not null default '{}',
  unique (menu_id, page_number)
);

create table if not exists extraction_run (
  extraction_run_id text primary key,
  source_id text references source_registry(source_id),
  processor_name text not null,
  processor_version text,
  processor_type text not null,
  run_tier int not null default 0,
  input_scope text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  local_only boolean not null default true,
  external_provider text,
  external_model text,
  prompt_hash text,
  cost_usd numeric,
  storage_bytes_written bigint not null default 0,
  config_json jsonb not null default '{}',
  metrics_json jsonb not null default '{}',
  error_text text
);

create table if not exists extracted_text_span (
  span_id text primary key,
  extraction_run_id text not null references extraction_run(extraction_run_id),
  menu_id text not null references menu(menu_id),
  page_id text references menu_page(page_id),
  span_type text not null,
  text text not null,
  normalized_text text,
  line_number int,
  bbox_json jsonb,
  ocr_confidence numeric,
  language text,
  is_public_safe boolean not null default false,
  provenance_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists canonical_dish (
  canonical_dish_id text primary key,
  canonical_name text not null,
  aliases jsonb not null default '[]',
  dish_type text,
  cuisine_tags text[] not null default '{}',
  ingredient_tags text[] not null default '{}',
  first_seen_year int,
  last_seen_year int,
  linked_recipe_clusters jsonb not null default '[]',
  confidence numeric,
  provenance_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dish_mention (
  dish_mention_id text primary key,
  extraction_run_id text references extraction_run(extraction_run_id),
  menu_id text not null references menu(menu_id),
  page_id text references menu_page(page_id),
  span_id text references extracted_text_span(span_id),
  raw_name text not null,
  normalized_name text,
  canonical_dish_id text references canonical_dish(canonical_dish_id),
  section_name text,
  dish_type text,
  extraction_method text not null,
  confidence numeric not null,
  bbox_json jsonb,
  provenance_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists price_observation (
  price_observation_id text primary key,
  extraction_run_id text references extraction_run(extraction_run_id),
  menu_id text not null references menu(menu_id),
  page_id text references menu_page(page_id),
  span_id text references extracted_text_span(span_id),
  dish_mention_id text references dish_mention(dish_mention_id),
  raw_price_text text not null,
  amount numeric,
  high_amount numeric,
  currency_code text,
  currency_symbol text,
  price_scale text,
  scale_confidence numeric,
  normalized_usd numeric,
  today_usd_estimate numeric,
  extraction_method text not null,
  confidence numeric not null,
  context_json jsonb not null default '{}',
  provenance_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists date_evidence (
  date_evidence_id text primary key,
  extraction_run_id text references extraction_run(extraction_run_id),
  menu_id text not null references menu(menu_id),
  page_id text references menu_page(page_id),
  span_id text references extracted_text_span(span_id),
  method text not null,
  lower_year int,
  upper_year int,
  point_year int,
  confidence text not null check (confidence in ('A', 'B', 'C', 'D', 'X')),
  evidence_text text,
  evidence_json jsonb not null default '{}',
  is_hard_bound boolean not null default false,
  reviewer_status text not null default 'machine_inferred',
  provenance_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists image_feature (
  image_feature_id text primary key,
  extraction_run_id text not null references extraction_run(extraction_run_id),
  menu_id text not null references menu(menu_id),
  page_id text references menu_page(page_id),
  feature_type text not null,
  model_name text not null,
  model_version text,
  vector_ref text,
  scalar_json jsonb not null default '{}',
  confidence numeric,
  provenance_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists embedding (
  embedding_id text primary key,
  extraction_run_id text references extraction_run(extraction_run_id),
  entity_type text not null,
  entity_id text not null,
  embedding_model text not null,
  embedding_version text,
  dimensions int not null,
  vector_ref text not null,
  text_hash text,
  is_public_safe boolean not null default false,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, embedding_model, embedding_version)
);

create table if not exists entity_link (
  entity_link_id text primary key,
  extraction_run_id text references extraction_run(extraction_run_id),
  from_entity_type text not null,
  from_entity_id text not null,
  to_entity_type text not null,
  to_entity_id text not null,
  relation_type text not null,
  confidence numeric not null,
  method text not null,
  evidence_json jsonb not null default '{}',
  reviewer_status text not null default 'machine_inferred',
  created_at timestamptz not null default now()
);

create table if not exists recipe_cluster (
  recipe_cluster_id text primary key,
  canonical_name text not null,
  aliases jsonb not null default '[]',
  ingredient_tags text[] not null default '{}',
  technique_tags text[] not null default '{}',
  nutrition_proxy_json jsonb not null default '{}',
  source_cluster_json jsonb not null default '{}',
  rights_category text,
  confidence numeric,
  provenance_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_menu_source on menu(source_id, source_record_id);
create index if not exists idx_menu_year on menu(year);
create index if not exists idx_menu_date_range on menu(lower_year, upper_year);
create index if not exists idx_text_span_menu on extracted_text_span(menu_id, page_id);
create index if not exists idx_dish_mention_menu on dish_mention(menu_id, canonical_dish_id);
create index if not exists idx_price_observation_menu on price_observation(menu_id, dish_mention_id);
create index if not exists idx_date_evidence_menu on date_evidence(menu_id, method, confidence);
create index if not exists idx_entity_link_from on entity_link(from_entity_type, from_entity_id);
create index if not exists idx_entity_link_to on entity_link(to_entity_type, to_entity_id);

