ADR 009. 계층 캐시 + 옵티미스틱 병렬 페치 아키텍처

# 상태

- 승인됨 (2026-03-06)

# 컨텍스트

## 문제

ADR-008에서 캐시 레이어를 Upstash Redis → Supabase DB로 마이그레이션하여 cold
start 문제를 해결했으나, 추가적인 성능 병목이 발견되었다:

1. **순차 실행 병목**: 캐시 읽기 → GitHub API → repo fetch → 캐시 쓰기가 모두
   순차적으로 실행. 캐시 히트 시에도 conditional request (304 확인) 완료까지
   repo fetch 시작 불가.
2. **캐시 쓰기 블로킹**: `await setCachedData()`가 응답 반환을 블로킹. 성능을
   위한 캐시 때문에 오히려 성능 병목 발생.
3. **Repo 캐시의 과도한 DB 조회**: 검색 결과에 포함된 repo 매번 DB 조회. 여러
   페이지에서 동일 repo 반복 조회. Rate limit과 DB 쿼리 모두 낭비.
4. **Repo ETag 불필요한 복잡도**: repo 메타데이터는 변동성이 낮은데, ETag 기반
   conditional request가 오히려 latency를 추가.

## 측정 결과

- Repo 캐시 비활성화(직접 API 호출): 상당한 응답 속도 개선 확인
- 캐시 쓰기 fire-and-forget 전환: 추가 응답 속도 개선 확인
- 근본적 구조 변경 필요성 확인됨

# 결정

## 1. 계층 캐시 (Tiered Cache)

In-memory L1 + DB L2 2레벨 캐시 구조를 도입한다.

### 구조

```
L1 (In-Memory Map)  →  L2 (Supabase DB)  →  GitHub API
     즉시 반환            DB 조회              API 호출
```

- **L1**: 모듈 레벨 `Map`. Edge Function 수명과 동일. TTL/크기 제한 없음.
- **L2**: 기존 Supabase DB 캐시 (ADR-008 그대로 유지).
- **Singleflight**: 동일 key에 대한 중복 DB 조회를 방지. Promise를 공유하여 첫
  번째 요청만 DB에 접근, 나머지는 같은 Promise를 await.

### 적용 대상

Repository 메타데이터 캐시에만 적용. Code search 캐시는 기존 DB 캐시 유지
(ETag를 통한 conditional request가 rate limit 절약에 효과적이므로).

## 2. Repo ETag 제거

Repository fetch에서 ETag/304 conditional request를 제거하고 순수 TTL 기반
캐시만 사용한다.

### 근거

- 계층 캐시 L1에서 대부분 hit → GitHub API 호출 자체가 대폭 감소
- Repo 메타데이터 변동성이 낮아 TTL 기반만으로 충분
- Conditional request 자체가 latency 추가 → 제거 시 체감 성능 향상

## 3. 옵티미스틱 병렬 페치

Search 캐시 히트 시, conditional request와 repo prefetch를 병렬 실행한다.

### 동작 방식

```
캐시 히트:
  ┌─ [A] fetchCodeSearchFresh(etag) ─── 304 / 새 데이터
  │
  └─ [B] fetchRepositories(캐시된 검색 결과 기반) ─── repo 데이터
  
  A가 304 → B 결과 그대로 사용
  A가 새 데이터 → B에서 이미 가져온 repo 재활용 + 빠진 것만 추가 fetch

캐시 미스:
  순차 실행 (기존과 동일)
```

### 핵심 효과

- **304 케이스**: 대기시간 ≈ max(conditional request, repo fetch). 기존 대비
  repo fetch 시간만큼 절약.
- **새 데이터 케이스**: 대부분의 repo가 중복 → L1 캐시에서 즉시 반환. 실제로
  추가 fetch가 필요한 repo만 API 호출.
- **캐시 미스**: 기존과 동일한 순차 실행. 성능 저하 없음.

## 4. 캐시 쓰기 Fire-and-Forget

모든 캐시 쓰기(`setCachedData`, `setTieredCache`)를 `await` 없이 실행한다.
에러는 `setCachedData` 내부에서 이미 로깅하므로 `.catch()`는 안전장치.

# 영향

## 긍정적 영향

- **응답 속도 대폭 개선**: 순차 → 병렬 전환, 캐시 쓰기 비블로킹
- **DB 쿼리 감소**: L1 캐시로 동일 repo 반복 조회 제거
- **Rate limit 절약**: repo 캐시 복구 + L1으로 API 호출 최소화
- **코드 단순화**: repo에서 ETag/304 로직 제거

## 부정적 영향

- **캐시 쓰기 실패 무시**: fire-and-forget이므로 쓰기 실패 시 다음 요청에서
  재시도하지 않고 API를 직접 호출. (graceful degradation으로 허용)
- **L1 캐시 일관성**: 같은 worker에서 DB 캐시보다 L1이 더 오래 살 수 있음. (Edge
  Function 수명이 짧으므로 실질적 문제 없음)

## 변경된 파일

- `supabase/functions/search/cache.ts` — 계층 캐시 함수 추가
- `supabase/functions/search/github.ts` — two-phase search, repo 계층 캐시
- `supabase/functions/search/index.ts` — 옵티미스틱 병렬 오케스트레이션

## 관련 ADR

- ADR-008: 캐시 레이어 마이그레이션 — DB(L2) 캐시는 그대로 유지, 그 위에 L1
  레이어링

# 변경 사항

- 2026-03-06: 초안 작성 및 승인
- 2026-03-07: Code Search API가 ETag를 지원하지 않음을 발견하여 옵티미스틱 병렬
  페치를 Code Search의 경우 순수 TTL 기반 캐싱으로 단순화함.
