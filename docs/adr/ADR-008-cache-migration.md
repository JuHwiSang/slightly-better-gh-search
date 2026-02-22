ADR 008. 캐시 레이어 마이그레이션: Upstash Redis → Supabase DB

# 상태

- 승인됨 (2026-02-22)

# 컨텍스트

## 문제

Search Edge Function은 GitHub API 응답을 캐싱하기 위해 Upstash Redis를 사용하고
있었다 (ADR-001 참조). 그러나 심각한 성능 문제가 발견되었다:

- **Upstash Redis 첫 연결에 ~2초 소요**
- Supabase Edge Function은 serverless이므로 매 요청마다 새 연결을 생성
- 캐시가 오히려 응답 시간을 악화시키는 역설적 상황
- `retries: 0`, `AbortSignal.timeout(2000)` 같은 완화책을 적용했지만 근본적 해결 불가

## 캐싱 대상

1. **GitHub Code Search 결과** — TTL: 3600초 (1시간)
2. **Repository 메타데이터** — TTL: 86400초 (24시간)

각 캐시 항목은 데이터와 ETag를 함께 저장하여 GitHub API의 조건부 요청
(`If-None-Match` / `304 Not Modified`)을 지원한다.

# 대안

## 1. Upstash Redis 유지 + 최적화

- Connection pooling, keep-alive 등 시도
- **기각**: Serverless 환경에서 연결 재사용이 근본적으로 불가능

## 2. Supabase PostgreSQL DB를 캐시로 사용

- Edge Function과 같은 인프라에 위치 → 연결 지연 없음
- `pg_cron`으로 만료된 캐시를 매일 정리
- 외부 의존성 하나 제거 (Upstash)

## 3. 캐시 완전 제거

- 가장 단순하지만 GitHub API Rate Limit 문제 발생
- 같은 쿼리 반복 시 불필요한 API 호출 증가
- **기각**: 캐싱 자체는 필요

# 결정

**대안 2: Supabase PostgreSQL DB를 캐시 저장소로 사용한다.**

## 구현 방식

### DB 스키마

```sql
CREATE TABLE public.cache (
  key        text        NOT NULL PRIMARY KEY,
  data       jsonb       NOT NULL,
  etag       text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

- RLS 활성화 + 정책 없음 → `service_role`만 접근 가능
- `expires_at` 인덱스로 정리 작업 최적화

### TTL 처리

- Redis의 `SETEX` 대신 `expires_at` 타임스탬프 사용
- SELECT 시 `WHERE expires_at > now()` 필터로 만료된 항목 제외
- `pg_cron`으로 매일 03:00 UTC에 만료된 행 삭제

### 캐시 연산

- **읽기**: `.from("cache").select().eq("key", key).gt("expires_at", now).maybeSingle()`
- **쓰기**: `.from("cache").upsert({...}, { onConflict: "key" })`
- 기존 admin client (service_role) 재사용 → 별도 연결 설정 불필요

### Graceful Degradation 유지

- 캐시 함수의 첫 번째 파라미터를 `SupabaseClient | null`로 유지
- `null`이면 즉시 return (캐시 비활성화)
- try/catch로 모든 DB 에러 흡수 → 캐시 실패가 검색을 방해하지 않음

# 영향

## 긍정적 영향

- **첫 요청 ~2초 지연 해소**: DB는 같은 인프라에 있으므로 연결 지연 없음
- **외부 의존성 제거**: Upstash 계정/크레덴셜 관리 불필요
- **인프라 단순화**: Supabase만으로 모든 백엔드 기능 처리
- **환경변수 감소**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 제거
- **테스트 단순화**: Redis 설정 여부에 따른 조건부 테스트 제거

## 부정적 영향

- **PostgreSQL은 캐시 전용 DB가 아님**: 인메모리 캐시 대비 읽기 성능이 낮을 수 있음
  (그러나 Upstash REST API의 cold start보다는 빠름)
- **pg_cron 의존**: 로컬 개발 환경에서는 pg_cron이 없어 만료된 캐시가 수동 정리 필요
  (SELECT 시 `expires_at` 필터로 기능적으로는 문제없음)

## 변경된 파일

- `supabase/migrations/` — cache 테이블 + pg_cron 마이그레이션
- `supabase/functions/search/cache.ts` — Redis → Supabase DB
- `supabase/functions/search/config.ts` — redis 블록 → cache 블록
- `supabase/functions/search/github.ts` — 타입 변경
- `supabase/functions/search/index.ts` — 클라이언트 변경
- `supabase/functions/deno.json` — `@upstash/redis` 제거
- `supabase/functions/test_utils.ts` — `isRedisConfigured()` 제거
- `supabase/.env.example`, `supabase/.env.test.example` — Redis 변수 제거

## 관련 ADR

- ADR-001: 시스템 아키텍처 — Upstash Redis 관련 내용 업데이트
- ADR-004: 테스트 전략 — Redis 관련 내용 업데이트

# 변경 사항

- 2026-02-22: 초안 작성 및 승인
