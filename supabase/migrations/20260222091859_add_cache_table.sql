-- cache 테이블: Edge Function의 GitHub API 응답 캐시
-- Upstash Redis를 대체한다. service_role만 접근 가능.
CREATE TABLE public.cache (
  key        text        NOT NULL PRIMARY KEY,
  data       jsonb       NOT NULL,
  etag       text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS 활성화 + 정책 없음 = anon/authenticated 차단, service_role은 RLS 무시
ALTER TABLE public.cache ENABLE ROW LEVEL SECURITY;

-- 만료된 캐시 정리를 위한 인덱스
CREATE INDEX cache_expires_at_idx ON public.cache (expires_at);

-- pg_cron: 매일 03:00 UTC에 만료된 캐시 삭제
-- 로컬 환경에서는 pg_cron이 없으므로 예외 처리
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.schedule(
    'cache-cleanup-daily',
    '0 3 * * *',
    'DELETE FROM public.cache WHERE expires_at < now()'
  );
EXCEPTION
  WHEN invalid_schema_name THEN
    RAISE NOTICE 'pg_cron not available (local dev). Skipping.';
  WHEN undefined_function THEN
    RAISE NOTICE 'pg_cron not available (local dev). Skipping.';
END $$;
