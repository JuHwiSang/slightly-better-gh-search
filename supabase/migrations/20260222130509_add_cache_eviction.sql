-- 캐시 크기 기반 제거 (size-based eviction)
-- 행 수가 임계값을 초과하면 가장 오래된 항목부터 삭제한다.
-- 기존 TTL 기반 정리(cache-cleanup-daily)와는 별개의 관심사.

-- 설정 테이블: 캐시 제거 파라미터 저장
CREATE TABLE public.cache_config (
  key   text NOT NULL PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.cache_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.cache_config (key, value) VALUES
  ('max_size', '1000'),     -- 이 행 수를 초과하면 제거 시작
  ('evict_count', '100');   -- 한 번에 제거할 행 수

-- 크기 기반 캐시 제거 함수
CREATE OR REPLACE FUNCTION public.cache_evict_by_size()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_size    int;
  v_evict_count int;
  v_current     int;
BEGIN
  SELECT value::int INTO v_max_size    FROM public.cache_config WHERE key = 'max_size';
  SELECT value::int INTO v_evict_count FROM public.cache_config WHERE key = 'evict_count';

  SELECT count(*) INTO v_current FROM public.cache;

  IF v_current > v_max_size THEN
    DELETE FROM public.cache
    WHERE key IN (
      SELECT c.key FROM public.cache c
      ORDER BY c.created_at ASC
      LIMIT v_evict_count
    );
  END IF;
END;
$$;

-- pg_cron: 15분마다 캐시 크기 확인 및 제거
DO $$
BEGIN
  PERFORM cron.schedule(
    'cache-evict-by-size',
    '*/15 * * * *',
    'SELECT public.cache_evict_by_size()'
  );
EXCEPTION
  WHEN invalid_schema_name THEN
    RAISE NOTICE 'pg_cron not available (local dev). Skipping.';
  WHEN undefined_function THEN
    RAISE NOTICE 'pg_cron not available (local dev). Skipping.';
END $$;
