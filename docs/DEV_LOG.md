# Development Log

> **Note**: 최신 항목이 위에 위치합니다.

---

## 2026-01-21 (Evening)

### Centralized Configuration with SearchConfig Class

#### Overview

- **변경사항**: Edge Function 설정을 클래스 기반 시스템으로 중앙화
- **목적**: 환경변수 읽기 로직 분산 문제 해결 및 validation 강화
- **주요 개선**:
  - 모든 설정을 `config.ts`로 통합
  - 생성자에서 환경변수 validation 수행
  - 하드코딩된 상수를 config 프로퍼티로 이동

#### Implementation Details

**신규 모듈** (`supabase/functions/search/config.ts`):

```typescript
export class SearchConfig {
  readonly github: { resultsPerPage: number; maxPage: number };
  readonly search: {
    maxPagesToFetch: number;
    maxLimit: number;
    defaultLimit: number;
  };
  readonly redis: {
    url: string | null;
    token: string | null;
    ttl: { codeSearch: number; repository: number };
  };
  readonly supabase: { url: string; serviceRoleKey: string };
  readonly cors: { allowedOrigins: string[] };

  constructor() {
    // Validation methods for each setting
    this.redis.ttl.codeSearch = this.validateTTL(
      Deno.env.get("REDIS_CODE_SEARCH_TTL"),
      3600,
      "REDIS_CODE_SEARCH_TTL",
    );
    this.supabase.url = this.validateRequired(
      Deno.env.get("SUPABASE_URL"),
      "SUPABASE_URL",
    );
    // ...
  }

  private validateRequired(value: string | undefined, name: string): string {
    /* ... */
  }
  private validateTTL(
    value: string | undefined,
    defaultValue: number,
    name: string,
  ): number {/* ... */}

  get isRedisEnabled(): boolean {
    return this.redis.url !== null && this.redis.token !== null;
  }
  get isCorsEnabled(): boolean {
    return this.cors.allowedOrigins.length > 0;
  }
}

export const config = new SearchConfig(); // Singleton
```

**Validation Methods**:

- `validateRequired()`: 필수 환경변수 검증 (throw on missing)
- `validateTTL()`: TTL 값 파싱 및 검증 (음수 불허)
- `getRedisUrl()`, `getRedisToken()`: Redis 설정 추출
- `parseAllowedOrigins()`: CORS origins 파싱

**Helper Properties**:

- `isRedisEnabled`: Redis 사용 가능 여부 체크
- `isCorsEnabled`: CORS 활성화 여부 체크

#### Changes by File

**Before/After 비교**:

| 파일        | Before                     | After                                          |
| ----------- | -------------------------- | ---------------------------------------------- |
| `index.ts`  | 하드코딩된 상수 4개        | `config.github.*`, `config.search.*` 사용      |
| `cache.ts`  | `Deno.env.get()` 직접 호출 | `config.redis.*`, `config.isRedisEnabled` 사용 |
| `auth.ts`   | `Deno.env.get()` 직접 호출 | `config.supabase.*` 사용                       |
| `cors.ts`   | 환경변수 파싱 로직 포함    | `config.cors.allowedOrigins` 사용              |
| `github.ts` | `Deno.env.get()` 직접 호출 | `config.redis.ttl.*` 사용                      |

**1. index.ts**:

- 제거: `RESULTS_PER_PAGE`, `MAX_PAGES_TO_FETCH`, `MAX_GITHUB_PAGE`, `MAX_LIMIT`
  상수
- 추가: `import { config } from "./config.ts"`
- 변경: 모든 상수 참조를 `config.*` 프로퍼티로 교체 (9곳)

**2. cache.ts**:

- 제거: `createRedisClient()` 내부의 환경변수 읽기 로직
- 변경: `config.isRedisEnabled` 체크 후 `config.redis.url!`,
  `config.redis.token!` 사용

**3. auth.ts**:

- 제거: `createSupabaseClient()` 내부의 환경변수 읽기
- 변경: `config.supabase.url`, `config.supabase.serviceRoleKey` 사용

**4. cors.ts**:

- 제거: `parseCorsConfig()` 내부의 `ALLOWED_ORIGINS` 파싱 로직
- 변경: `config.cors.allowedOrigins` 직접 사용

**5. github.ts**:

- 제거: `fetchCodeSearch()`, `fetchRepository()` 내부의 TTL 환경변수 읽기
- 변경: `config.redis.ttl.codeSearch`, `config.redis.ttl.repository` 사용

#### Benefits

1. **중앙화된 설정 관리**:
   - 모든 설정이 한 곳에 위치
   - 설정 변경 시 `config.ts`만 수정

2. **강력한 Validation**:
   - 앱 시작 시 모든 환경변수 검증
   - 잘못된 설정은 즉시 에러 발생
   - 런타임 에러 대신 시작 시점 에러

3. **타입 안전성**:
   - `readonly` 프로퍼티로 불변성 보장
   - `string | undefined` 대신 명확한 타입
   - Helper 메서드로 타입 가드 제공

4. **코드 가독성**:
   - `config.github.maxPage` vs `MAX_GITHUB_PAGE`
   - 설정의 계층 구조가 명확
   - 환경변수 읽기 로직 중복 제거

5. **테스트 용이성**:
   - 싱글톤 패턴으로 일관된 설정
   - Mock 설정 주입 가능 (필요 시)

#### Error Messages

더 명확한 에러 메시지:

```typescript
// Before
throw new Error("Missing SUPABASE_URL");

// After
throw new Error("SUPABASE_URL environment variable is required");
throw new Error("REDIS_CODE_SEARCH_TTL must be a valid number, got: abc");
throw new Error("REDIS_REPOSITORY_TTL must be non-negative, got: -100");
```

#### Files Created

- `supabase/functions/search/config.ts` - 중앙화된 설정 클래스

#### Files Modified

- `supabase/functions/search/index.ts` - config 사용
- `supabase/functions/search/cache.ts` - config 사용
- `supabase/functions/search/auth.ts` - config 사용
- `supabase/functions/search/cors.ts` - config 사용
- `supabase/functions/search/github.ts` - config 사용

---

## 2026-01-21 (Late Afternoon)

### Separate Cache TTL Configurations

#### Overview

- **변경사항**: 코드 검색 결과와 저장소 메타데이터에 대해 별도의 캐시 TTL 설정
- **목적**: 데이터 변동성에 따른 캐시 전략 최적화
- **주요 변경**:
  - 코드 검색 결과: 1시간 TTL (자주 변경되는 데이터)
  - 저장소 메타데이터: 24시간 TTL (안정적인 데이터)
  - 환경변수 2개로 분리
  - 문서 전반에 걸쳐 `.env.local` → `.env` 통일

#### Implementation Details

**1. Cache Module 리팩토링** (`supabase/functions/search/cache.ts`):

**Before**:

```typescript
export async function setCachedData<T>(
  redis: Redis | null,
  key: string,
  data: T,
  etag?: string,
  ttlSeconds?: number,
): Promise<void> {
  const defaultTTL = parseInt(Deno.env.get("CACHE_TTL_SECONDS") || "86400", 10);
  const ttl = ttlSeconds ?? defaultTTL;
  // ...
}
```

**After**:

```typescript
export async function setCachedData<T>(
  redis: Redis | null,
  key: string,
  data: T,
  etag: string | undefined,
  ttlSeconds: number, // Required parameter
): Promise<void> {
  // TTL must be provided by caller
  // ...
}
```

**변경 이유**: TTL 결정 책임을 호출자에게 위임하여 각 API 특성에 맞는 TTL 설정
가능

**2. GitHub API Client 업데이트** (`supabase/functions/search/github.ts`):

**Code Search API** (1시간 TTL):

```typescript
// Cache the new data with ETag (1 hour TTL for volatile search results)
const searchTTL = parseInt(
  Deno.env.get("CACHE_TTL_CODE_SEARCH_SECONDS") || "3600",
  10,
);
await setCachedData(redis, cacheKey, searchData, newEtag, searchTTL);
```

**Repository API** (24시간 TTL):

```typescript
// Cache the new data with ETag (24 hour TTL for stable repo metadata)
const repoTTL = parseInt(
  Deno.env.get("CACHE_TTL_REPOSITORY_SECONDS") || "86400",
  10,
);
await setCachedData(redis, repoCacheKey, repoData, repoEtag, repoTTL);
```

#### Environment Variables

**신규 환경변수**:

- `CACHE_TTL_CODE_SEARCH_SECONDS`: 코드 검색 결과 캐시 TTL (기본값: 3600초 =
  1시간)
- `CACHE_TTL_REPOSITORY_SECONDS`: 저장소 메타데이터 캐시 TTL (기본값: 86400초 =
  24시간)

**기존 환경변수 제거**:

- `CACHE_TTL_SECONDS` (단일 TTL 설정)

**로컬 개발** (`supabase/.env`):

```bash
# Cache TTL for code search results (optional, default: 3600 seconds = 1 hour)
CACHE_TTL_CODE_SEARCH_SECONDS=3600

# Cache TTL for repository metadata (optional, default: 86400 seconds = 24 hours)
CACHE_TTL_REPOSITORY_SECONDS=86400
```

**배포** (Supabase CLI):

```bash
# Set cache TTL
supabase secrets set CACHE_TTL_CODE_SEARCH_SECONDS=3600
supabase secrets set CACHE_TTL_REPOSITORY_SECONDS=86400
```

#### Documentation Updates

**README.md**:

- Environment Variables 테이블 업데이트 (2개 TTL 변수 추가)
- Development Setup 섹션 업데이트
- Deployment 섹션 업데이트
- `.env.local` → `.env` 통일

**Environment Configuration Files**:

- `supabase/.env.example`: 2개 TTL 변수로 교체
- `.env.example`: 배포 명령어 예시 업데이트, `.env.local` → `.env` 변경

#### Rationale

**코드 검색 결과 (1시간)**:

- 저장소 코드가 자주 업데이트됨
- 검색 결과가 빠르게 변경될 수 있음
- 짧은 TTL로 신선도 유지

**저장소 메타데이터 (24시간)**:

- Stars, forks, language 등은 상대적으로 안정적
- 자주 변경되지 않음
- 긴 TTL로 API 호출 절약

#### Files Modified

- `supabase/functions/search/cache.ts` - TTL 파라미터 필수화
- `supabase/functions/search/github.ts` - 각 API별 TTL 설정
- `supabase/.env.example` - 2개 TTL 변수로 교체
- `.env.example` - 배포 명령어 업데이트, `.env.local` → `.env`
- `README.md` - 환경변수 문서화, `.env.local` → `.env`

---

## 2026-01-21 (Afternoon)

### GitHub Provider Token Vault Storage

#### Overview

- **변경사항**: GitHub OAuth `provider_token`을 Supabase Vault에 안전하게 저장
  및 조회
- **목적**: TRB-003, TRB-004에서 확인한 provider_token 획득 및 저장 방법 구현
- **주요 구현**:
  - 새 Edge Function `store-token` 생성
  - `search` function의 인증 로직을 Vault 기반으로 리팩토링
  - OAuth callback에서 provider_token 추출 및 저장
  - 모든 Edge Functions를 `service_role` 키 사용으로 전환

#### Implementation Details

**1. 새 Edge Function: `store-token`**
(`supabase/functions/store-token/index.ts`):

- **목적**: OAuth callback에서 호출되어 `provider_token`을 Vault에 저장
- **인증**: Authorization 헤더로 사용자 JWT 검증
- **요청 형식**:
  ```typescript
  POST /functions/v1/store-token
  Authorization: Bearer {access_token}
  {
    "provider_token": "gho_xxxxx"
  }
  ```
- **저장 로직**:
  1. `service_role` 키로 Supabase 클라이언트 초기화
  2. JWT에서 사용자 ID 추출
  3. Secret name 생성: `github_token_{user_id}`
  4. `vault.decrypted_secrets`에서 기존 토큰 확인
  5. 존재하면 `vault.secrets` UPDATE, 없으면 INSERT
- **에러 처리**:
  - 400: `provider_token` 누락 또는 잘못된 형식
  - 401: Authorization 헤더 누락 또는 잘못된 JWT
  - 500: Vault 저장 실패

**2. Search Function 인증 리팩토링** (`supabase/functions/search/auth.ts`):

**Before**:

```typescript
// SUPABASE_ANON_KEY 사용
export function createSupabaseClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
}

// user_metadata에서 토큰 조회 (작동하지 않음)
export async function getGitHubToken(
  supabaseClient: SupabaseClient,
): Promise<string> {
  const { data: { user } } = await supabaseClient.auth.getUser();
  const token = user.user_metadata?.provider_token; // ❌ undefined
  return token;
}
```

**After**:

```typescript
// SUPABASE_SERVICE_ROLE_KEY 사용
export function createSupabaseClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
}

// Vault에서 토큰 조회
export async function getGitHubToken(
  supabaseClient: SupabaseClient,
): Promise<string> {
  const { data: { user } } = await supabaseClient.auth.getUser();

  const secretName = `github_token_${user.id}`;
  const { data, error } = await supabaseClient
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .eq("name", secretName)
    .single();

  if (error || !data) {
    throw new ApiError(
      401,
      "GitHub token not found. Please re-authenticate with GitHub.",
    );
  }

  return data.decrypted_secret;
}
```

**3. OAuth Callback 수정** (`src/routes/auth/callback/+server.ts`):

**Before**:

```typescript
const { error } = await supabase.auth.exchangeCodeForSession(code);
if (!error) {
  // provider_token을 저장하지 않음
  throw redirect(307, nextUrl.pathname + nextUrl.search);
}
```

**After**:

```typescript
const { data, error } = await supabase.auth.exchangeCodeForSession(code);
if (!error && data.session) {
  // provider_token 추출 (오직 여기서만 가능)
  const providerToken = data.session.provider_token;

  if (providerToken) {
    // store-token Edge Function 호출
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/store-token`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${data.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider_token: providerToken }),
      });

      if (!response.ok) {
        console.error("Failed to store GitHub token:", await response.json());
      }
    } catch (storeError) {
      console.error("Error storing GitHub token:", storeError);
    }
  }

  throw redirect(307, nextUrl.pathname + nextUrl.search);
}
```

**주요 변경사항**:

- `exchangeCodeForSession()` 반환값에서 `data` 추출
- `data.session.provider_token` 획득 (TRB-003에서 확인한 유일한 방법)
- 토큰 저장 실패 시 에러 로그만 출력 (사용자 리다이렉트는 계속 진행)

#### Environment Variables

**신규 환경변수**: `SUPABASE_SERVICE_ROLE_KEY`

**로컬 개발** (`.env.local`):

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Edge Functions (service_role key for Vault access)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# CORS
ALLOWED_ORIGINS=http://localhost:5173

# Redis Cache
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**배포** (Supabase CLI):

```bash
# Service role key 설정
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 설정 확인
supabase secrets list

# Edge Functions 배포
supabase functions deploy search
supabase functions deploy store-token
```

#### Security Considerations

1. **`service_role` 키 사용**:
   - Vault 접근을 위해 필수
   - Authorization 헤더로 사용자 인증을 수행하므로 안전
   - 클라이언트에 노출되지 않음 (Edge Function 내부에서만 사용)

2. **토큰 저장 실패 처리**:
   - 토큰 저장 실패 시에도 사용자 리다이렉트는 계속 진행
   - 에러 로그만 출력 (사용자 경험 방해 최소화)
   - 다음 로그인 시 재시도 가능

3. **Vault 보안**:
   - 자동 암호화/복호화
   - `service_role` 키로만 접근 가능
   - 클라이언트에서 직접 접근 불가

#### Files Created

- `supabase/functions/store-token/index.ts` - 새 Edge Function
- `.env.example` - 환경변수 템플릿

#### Files Modified

- `supabase/functions/search/auth.ts` - Vault 기반 토큰 조회
- `src/routes/auth/callback/+server.ts` - 토큰 저장 로직 추가
- `README.md` - 환경변수 문서화

#### Next Steps

- [ ] 로컬 환경에서 OAuth 플로우 테스트
- [ ] Vault에 토큰 저장 확인
- [ ] Search function에서 Vault 토큰 조회 확인
- [ ] 에러 케이스 테스트 (토큰 없을 때)
- [ ] GEMINI.md 패턴 추가

---

## 2026-01-21 (Early Morning)

### Error Handling Refactoring with ApiError Class

#### Overview

- **변경사항**: Edge Function의 에러 처리 로직을 `ApiError` 클래스 기반으로
  리팩토링
- **목적**: 반복적인 Response 생성 코드 제거 및 유지보수성 향상
- **주요 개선**:
  - 5개의 중복된 에러 Response 생성 코드 제거
  - Helper 함수들이 `null` 반환 대신 에러를 throw하도록 변경
  - 중앙 집중식 에러 처리 로직

#### Implementation Details

**신규 모듈** (`supabase/functions/search/errors.ts`):

```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

**Before (반복적인 패턴)**:

```typescript
if (!query || query.trim() === "") {
  return new Response(
    JSON.stringify({ error: "Query parameter is required" }),
    {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
```

**After (간결한 throw)**:

```typescript
if (!query || query.trim() === "") {
  throw new ApiError(400, "Query parameter is required");
}
```

#### Changes by File

**`auth.ts`**:

- `getGitHubToken()` 반환 타입 변경: `Promise<string | null>` →
  `Promise<string>`
- `null` 반환 대신 `ApiError(401, "GitHub OAuth token not found...")` throw
- JSDoc 업데이트: `@throws {ApiError}` 추가

**`index.ts`**:

1. **에러 문서화** (라인 56-64):
   ```typescript
   /**
    * Search Edge Function
    *
    * Possible API errors:
    * - 400: Missing/empty query, invalid cursor format, filter evaluation error
    * - 401: Missing Authorization header, GitHub token not found
    * - 500: Unexpected internal errors
    */
   ```

2. **에러 처리 간소화** (5개 케이스):
   - Missing query (라인 74-76)
   - Missing auth header (라인 86-88)
   - Missing GitHub token (라인 97 - 제거됨, `getGitHubToken()`이 throw)
   - Invalid cursor (라인 115-120)
   - Filter evaluation error (라인 189-194)

3. **중앙 집중식 catch 블록** (라인 255-281):
   ```typescript
   catch (error: unknown) {
     // Handle ApiError with specific status codes
     if (error instanceof ApiError) {
       return new Response(
         JSON.stringify({
           error: error.message,
           ...(error.details && { details: error.details }),
         }),
         { status: error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
     // Handle unexpected errors (500)
     // ...
   }
   ```

#### Benefits

- **코드 라인 수 감소**: ~40줄 제거
- **일관성 보장**: 모든 에러 응답이 동일한 형식 (`corsHeaders` + `Content-Type`)
- **가독성 향상**: 비즈니스 로직과 HTTP 응답 생성 코드 분리
- **유지보수 용이**: 에러 응답 형식 변경 시 catch 블록만 수정
- **타입 안전성**: `| null` 제거로 null 체크 불필요

#### Error Response Format

모든 에러는 동일한 JSON 형식으로 반환:

```json
{
  "error": "Error message",
  "details": "Optional additional details"
}
```

#### Files Created

- `supabase/functions/search/errors.ts`

#### Files Modified

- `supabase/functions/search/auth.ts`
- `supabase/functions/search/index.ts`

---

## 2026-01-20 (Evening)

### Enhanced GitHub Code Search API Integration

#### Overview

- **변경사항**: GitHub Code Search API 문서 업데이트에 따른 새 기능 통합
- **목적**: Text-match metadata, cursor-based pagination, incomplete_results
  지원
- **주요 기능**:
  - 검색어 하이라이팅을 위한 text-match metadata
  - 페이지+인덱스 기반 정밀 커서 시스템 (`{page}:{index}`)
  - GitHub API 타임아웃 추적 (`incomplete_results`)

#### Documentation Updates

**GitHub API 문서** (`docs/github/code-search-api.md`):

- **General Search Behavior**: 1,000개 결과 제한, 랭킹 정보
- **Custom Rate Limits**: Code Search 10 req/min, 기타 30 req/min
- **Query Construction**: 쿼리 길이 제한 (256자), 연산자 제한 (5개)
- **Search Scope Limits**: 최대 4,000 저장소 검색
- **Timeouts and Incomplete Results**: `incomplete_results` 필드 설명
- **Access Errors**: 인증 및 권한 관련 에러 처리
- **Text Match Metadata**: 검색어 하이라이팅을 위한 메타데이터 구조

#### Type Definitions (`supabase/functions/search/types.ts`)

**신규 인터페이스**:

```typescript
// Text match metadata for highlighting search terms
export interface TextMatch {
  object_url: string;
  object_type: string;
  property: string; // e.g., "body", "path"
  fragment: string; // Subset of property value containing matches
  matches: Match[];
}

export interface Match {
  text: string; // The matching search term
  indices: [number, number]; // [start, end] position in fragment
}
```

**업데이트된 인터페이스**:

- `SearchRequest.cursor`: `{page}:{index}` 형식 문서화
- `SearchResponse`:
  - `nextCursor`: 새 형식 문서화
  - `incomplete_results: boolean` 필드 추가
- `SearchResultItem`: `text_matches?: TextMatch[]` 필드 추가
- `GitHubCodeSearchItem`: `text_matches?: TextMatch[]` 필드 추가

#### GitHub API Client (`supabase/functions/search/github.ts`)

**Accept 헤더 변경**:

```typescript
// Before
Accept: "application/vnd.github+json";

// After
Accept: "application/vnd.github.text-match+json";
```

**효과**: GitHub API가 응답에 `text_matches` 배열 포함

#### Edge Function Logic (`supabase/functions/search/index.ts`)

**1. Cursor 파싱** (라인 71-84):

```typescript
// Parse cursor as "{page}:{index}" format
let startPage = 1;
let startIndex = 0;
if (cursor) {
  const parts = cursor.split(":");
  if (parts.length === 2) {
    startPage = parseInt(parts[0], 10);
    startIndex = parseInt(parts[1], 10);
  } else {
    // Backward compatibility: treat as page number only
    startPage = parseInt(cursor, 10);
  }
}
```

**2. Incomplete Results 추적** (라인 91, 93):

```typescript
let incompleteResults = false;

// In fetch loop
incompleteResults = incompleteResults || searchData.incomplete_results;
```

**3. 인덱스 기반 필터링** (라인 107-115):

```typescript
for (let i = 0; i < searchData.items.length; i++) {
  const item = searchData.items[i];

  // Skip items before cursor index on the starting page
  if (currentPage === startPage && i < startIndex) {
    continue;
  }

  // ... filter logic ...

  currentIndex = i + 1; // Track position for next cursor
}
```

**4. Cursor 생성** (라인 157-166):

```typescript
let nextCursor: string | null = null;
if (hasMore && filteredItems.length >= limit) {
  // If we stopped mid-page, use current index; otherwise use next page
  if (currentIndex > 0 && currentIndex < RESULTS_PER_PAGE) {
    nextCursor = `${currentPage - 1}:${currentIndex}`;
  } else {
    nextCursor = `${currentPage}:0`;
  }
}
```

**5. Text-Match Passthrough** (라인 141):

```typescript
filteredItems.push({
  // ... other fields ...
  text_matches: item.text_matches,
});
```

#### Frontend Component (`src/lib/components/SearchResultCard.svelte`)

**TextMatch 인터페이스 추가**:

```typescript
interface TextMatch {
  object_url: string;
  object_type: string;
  property: string;
  fragment: string;
  matches: Array<{
    text: string;
    indices: [number, number];
  }>;
}

interface SearchResult {
  // ... existing fields ...
  text_matches?: TextMatch[];
}
```

**하이라이팅 함수** (라인 25-77):

```typescript
function highlightLine(line: string, lineIndex: number): string {
  if (!result.text_matches) return line;

  // Calculate line position in full text
  const lineStart =
    result.codeSnippet.lines.slice(0, lineIndex).join("\n").length + lineIndex;
  const lineEnd = lineStart + line.length;

  // Collect all matches that overlap with this line
  const highlights: Array<{ start: number; end: number; text: string }> = [];

  for (const textMatch of result.text_matches) {
    // Only process matches for file content
    if (textMatch.property !== "body" && textMatch.property !== "path") {
      continue;
    }

    for (const match of textMatch.matches) {
      const [matchStart, matchEnd] = match.indices;
      if (matchStart < lineEnd && matchEnd > lineStart) {
        highlights.push({
          start: Math.max(0, matchStart - lineStart),
          end: Math.min(line.length, matchEnd - lineStart),
          text: match.text,
        });
      }
    }
  }

  // Build HTML with <mark> tags
  // ...
}
```

**템플릿 업데이트**:

```svelte
{#each result.codeSnippet.lines as line, index}
  <div>{@html highlightLine(line, index)}</div>
{/each}
```

**스타일링**: `bg-yellow-400/30 text-yellow-200` (노란색 반투명 배경)

#### Cursor Format Specification

**형식**: `{page}:{index}`

**예시**:

- `1:0` - 1페이지 시작
- `2:15` - 2페이지의 15번 아이템 (0-indexed)
- `3:0` - 3페이지 시작

**하위 호환성**: 기존 페이지 전용 커서 (예: `"2"`)는 `{page}:0`으로 처리

#### Documentation Updates

**GEMINI.md**:

- **GitHub API Integration** 섹션 추가:
  - Cursor 형식 (`{page}:{index}`)
  - Text-match metadata 요청 방법
  - `incomplete_results` 추적 패턴
  - `text_matches` passthrough
- **Text-Match Highlighting** 섹션 추가:
  - `{@html}` 사용법
  - `<mark>` 태그 스타일링
  - XSS 방지 주의사항

#### Known Limitations

1. **Search Page**: 현재 mock 데이터 사용, Edge Function 미연동
2. **Incomplete Results Warning**: UI 미구현 (API 연동 필요)
3. **Highlighting Algorithm**: `text_matches` 인덱스가 전체 파일 기준이라고 가정
   - 실제 GitHub API 동작에 따라 조정 필요할 수 있음

#### Files Created

- None (모두 기존 파일 수정)

#### Files Modified

- `supabase/functions/search/types.ts` - Type definitions
- `supabase/functions/search/github.ts` - Accept header
- `supabase/functions/search/index.ts` - Cursor logic, incomplete_results
- `src/lib/components/SearchResultCard.svelte` - Text-match highlighting
- `GEMINI.md` - New patterns documentation

#### Next Steps

- [ ] Search 페이지를 Edge Function API에 연동
- [ ] Incomplete results 경고 UI 구현
- [ ] 실제 GitHub API 응답으로 테스트
- [ ] Text-match 하이라이팅 검증
- [ ] Pagination 컴포넌트를 cursor-based로 업데이트

---

## 2026-01-20 (Late Night)

### Edge Function Refactoring

#### Overview

- **변경사항**: `index.ts`를 모듈화하여 가독성 개선
- **목적**: 353줄의 복잡한 핸들러를 ~190줄로 단순화
- **방법**: 로직을 역할별로 분리

#### Module Structure

**신규 모듈**:

1. **`cors.ts`**: CORS 설정 및 헤더 생성
   - `parseCorsConfig()`: 환경변수 및 요청에서 CORS 설정 파싱
   - `generateCorsHeaders()`: CORS 헤더 생성
2. **`auth.ts`**: 인증 관련 로직
   - `createSupabaseClient()`: Supabase 클라이언트 초기화
   - `getGitHubToken()`: GitHub OAuth 토큰 조회
3. **`github.ts`**: GitHub API 호출 (캐싱 포함)
   - `fetchCodeSearch()`: Code Search API 호출 + ETag 캐싱
   - `fetchRepository()`: Repository API 호출 + ETag 캐싱
   - `fetchRepositories()`: 병렬 레포지토리 조회

**기존 모듈**:

- `cache.ts`: Redis 캐싱 유틸리티
- `filter.ts`: 필터 표현식 평가
- `types.ts`: TypeScript 타입 정의

#### Refactoring Benefits

**Before**:

- 353줄의 단일 파일
- CORS, 인증, GitHub API, 캐싱 로직이 모두 섞여 있음
- 가독성 낮음, 유지보수 어려움

**After**:

- ~190줄의 간결한 핸들러
- 역할별로 명확히 분리된 모듈
- 각 모듈은 단일 책임 원칙 준수
- 테스트 및 유지보수 용이

#### Code Organization

**Main Handler** (`index.ts`):

```typescript
// 1. CORS 처리
const corsConfig = parseCorsConfig(req);
const corsHeaders = generateCorsHeaders(corsConfig);

// 2. 인증
const supabaseClient = createSupabaseClient(authHeader);
const githubToken = await getGitHubToken(supabaseClient);

// 3. GitHub API 호출
const searchData = await fetchCodeSearch(
  redis,
  githubToken,
  query,
  page,
  perPage,
);
const repoMap = await fetchRepositories(redis, githubToken, uniqueRepos);

// 4. 필터링 및 응답
```

#### Files Created

- `supabase/functions/search/cors.ts`
- `supabase/functions/search/auth.ts`
- `supabase/functions/search/github.ts`

#### Files Modified

- `supabase/functions/search/index.ts` (전체 재작성, 353줄 → ~190줄)

---

## 2026-01-20

### Upstash Redis Caching Implementation

#### Overview

- **변경사항**: Supabase Edge Function에 Upstash Redis 캐싱 추가
- **목적**: GitHub API 호출 최적화 및 Rate Limit 절약
- **주요 기능**:
  - ETag 기반 조건부 요청 (`If-None-Match`)
  - Code Search API 및 Repository API 캐싱
  - Redis 연결 실패 시 자동 fallback
  - 병렬 캐시 조회 및 저장

#### Cache Strategy

- **캐시 키 구조**:
  - Code Search: `github:search:query:{query}:page:{page}`
  - Repository: `github:repo:fullName:{owner/repo}`
- **TTL**: 24시간 (86400초, `CACHE_TTL_SECONDS`로 조정 가능)
- **ETag 활용**:
  1. GitHub API 응답의 `ETag` 헤더를 Redis에 함께 저장
  2. 다음 요청 시 `If-None-Match: {etag}` 헤더 전송
  3. `304 Not Modified` 응답 시 캐시된 데이터 재사용
  4. `200 OK` 응답 시 새 데이터 + 새 ETag로 캐시 갱신

#### Implementation Details

**Cache Module** (`supabase/functions/search/cache.ts`):

- `createRedisClient()`: Upstash Redis 클라이언트 초기화
  - 환경변수 미설정 시 `null` 반환 (캐싱 비활성화)
  - 초기화 실패 시 에러 로그 출력 후 `null` 반환
- `generateCacheKey(prefix, params)`: 캐시 키 생성
  - 파라미터를 정렬하여 일관된 키 생성
- `getCachedData<T>(redis, key)`: 캐시 조회
  - 캐시 히트/미스 로그 출력
  - 에러 발생 시 `null` 반환 (fallback)
- `setCachedData<T>(redis, key, data, etag, ttl)`: 캐시 저장
  - `CachedData<T>` 타입으로 data + etag 함께 저장
  - TTL 기본값: 환경변수 또는 86400초

**Edge Function** (`supabase/functions/search/index.ts`):

- **Redis 클라이언트 초기화** (라인 121):
  ```typescript
  const redis = createRedisClient();
  ```
- **Code Search API 캐싱** (라인 137-205):
  1. 캐시 키 생성 (`query`, `page` 기반)
  2. 캐시 조회 → ETag 확인
  3. GitHub API 요청 시 `If-None-Match: {etag}` 헤더 추가
  4. 응답 처리:
     - `304 Not Modified` → 캐시된 데이터 사용
     - `200 OK` → 새 데이터 파싱 + ETag 추출 + 캐시 저장
     - 에러 → 기존 에러 처리 로직
- **Repository API 캐싱** (라인 221-267):
  1. 각 레포지토리별 캐시 키 생성
  2. 병렬 캐시 조회 (`Promise.all`)
  3. ETag 기반 조건부 요청
  4. 응답 처리 (Code Search와 동일)
  5. 병렬 캐시 저장

**Fallback Handling**:

- Redis 클라이언트 초기화 실패 → `redis = null`
- 모든 캐시 함수는 `redis === null` 체크 후 early return
- 캐시 없이 GitHub API 직접 호출 (기존 로직 유지)

#### Dependencies

- **Deno Import Map** (`supabase/functions/deno.json`):
  ```json
  {
    "imports": {
      "@upstash/redis": "npm:@upstash/redis@1.34.3"
    }
  }
  ```

#### Environment Variables

**Development** (`supabase/.env`):

```bash
ALLOWED_ORIGINS=http://localhost:5173
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
CACHE_TTL_SECONDS=86400  # Optional
```

**Production** (Supabase Dashboard):

- Project Settings → Edge Functions → Environment Variables
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `CACHE_TTL_SECONDS` (선택사항)

#### Documentation Updates

- **README.md**:
  - Supabase Edge Functions 환경변수 테이블에 Redis 관련 변수 추가
  - Development Setup 예시 업데이트
  - Deployment 가이드에 Redis 환경변수 설정 추가

#### Performance Benefits

- **캐시 히트 시**: GitHub API 호출 0회 (304 응답 또는 캐시 재사용)
- **Rate Limit 절약**: 동일 검색 반복 시 API 호출 최소화
- **응답 속도**: 캐시된 데이터는 즉시 반환 (네트워크 레이턴시 제거)
- **병렬 처리**: 여러 레포지토리 캐시 조회/저장을 동시에 수행

#### Files Created

- `supabase/functions/search/cache.ts`

#### Files Modified

- `supabase/functions/search/index.ts`
- `supabase/functions/deno.json`
- `README.md`

#### Next Steps

- [ ] 로컬 테스트 (Redis 연결, 캐시 동작 확인)
- [ ] ETag 조건부 요청 검증
- [ ] Fallback 동작 테스트
- [ ] Walkthrough 작성

---

## 2026-01-18/19 (Late Night)

### Search API Refactoring & Security Improvements

#### POST → GET Method Conversion

- **변경사항**: 검색 API를 POST에서 GET으로 변경
- **이유**:
  - RESTful 원칙 준수 (검색은 데이터 조회 → GET)
  - 브라우저/CDN 캐싱 가능
  - URL 공유 및 북마크 가능
  - 브라우저 히스토리 정상 작동
- **주요 구현**:
  - Request body 파싱 → URL query parameters 파싱
  - `SearchRequest` 타입 제거 (더 이상 사용 안 함)
  - Before: `const requestBody = await req.json()`
  - After:
    `const url = new URL(req.url); const query = url.searchParams.get("query")`
- **API 호출 예시**:
  ```
  GET /functions/v1/search?query=useState&filter=stars>100&cursor=2&limit=30
  ```

#### CORS Security Enhancement

- **변경사항**: CORS `Access-Control-Allow-Origin`을 `*`에서 환경 변수 기반
  검증으로 변경
- **문제점**:
  - `*` 사용 시 CSRF 공격 위험
  - 악의적인 사이트에서 사용자 GitHub 토큰으로 API 호출 가능
  - Rate limit 소진 위험
- **해결 방법**:
  - `ALLOWED_ORIGINS` 환경 변수로 허용된 도메인만 설정
  - Origin 헤더 검증 후 허용된 경우에만 응답
  - `Access-Control-Allow-Credentials: true` 추가
- **구현**:
  ```typescript
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",");
  const origin = req.headers.get("Origin") || "";
  const isAllowedOrigin = allowedOrigins.includes(origin);

  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "null",
    "Access-Control-Allow-Credentials": "true",
  };
  ```

#### Deno Configuration Restructuring

- **변경사항**: `deno.json`을 함수별 설정에서 공유 설정으로 이동
- **구조 변경**:
  - ❌ 삭제: `supabase/functions/search/deno.json`
  - ✅ 생성: `supabase/functions/deno.json` (모든 Edge Functions 공유)
- **VS Code 설정 추가**:
  - `.vscode/settings.json`에
    `"deno.importMap": "./supabase/functions/deno.json"` 추가
  - 모든 Edge Functions에서 자동으로 import map 인식
- **장점**:
  - 중복 설정 제거
  - 새 함수 추가 시 별도 `deno.json` 불필요
  - VS Code IntelliSense 개선
  - 의존성 관리 일원화

#### Documentation Updates

- **README.md**: 환경 변수 문서화
  - SvelteKit 환경 변수 (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`)
  - Supabase Edge Functions 환경 변수 (`ALLOWED_ORIGINS`)
  - 개발/배포 설정 방법 (Vercel, GitHub Actions)
  - 플랫폼별 섹션 구조 (SvelteKit/Supabase)
- **ADR-003**: API 스펙 제거 (구현 세부사항은 ADR에 불필요)

#### Minor Improvements

- **Filter evaluator**: 날짜 필드를 타임스탬프로 변환 (`getTime()`)
  - Filtrex가 Date 객체 비교를 지원하지 않음
  - 숫자 비교로 변환하여 필터링 가능하게 함
- **CORS headers**: 불필요한 헤더 유지 결정
  - `x-client-info`, `apikey`는 Supabase SDK가 자동으로 추가하는 헤더
  - Supabase 공식 권장사항에 따라 유지

### Files Modified

- `supabase/functions/search/index.ts` (POST → GET 변경, CORS 개선)
- `supabase/functions/deno.json` (신규, 공유 설정)
- `.vscode/settings.json` (deno.importMap 추가)
- `README.md` (환경 변수 문서화)
- `docs/adr/ADR-003-search-architecture.md` (API 스펙 제거)

### Commits

- `feature: temporary add supabase edge function without redis` (8785de0)

---

## 2026-01-17 (Evening)

### Search Edge Function Implementation

- **변경사항**: GitHub Code Search API 통합 및 필터링 기능 구현
- **주요 구현**:
  - **ADR-003 작성**: 검색 기능 아키텍처 결정 문서화
    - Cursor-based infinite scroll 채택
    - Filtrex 라이브러리 사용 결정
    - Repository 정보 전체 fetch 전략
  - **타입 정의** (`supabase/functions/search/types.ts`):
    - `SearchRequest`, `SearchResponse` 인터페이스
    - `SearchResultItem`, `RepositoryInfo` 타입
    - GitHub API 응답 타입 (`GitHubCodeSearchResponse`)
  - **필터 평가기** (`supabase/functions/search/filter.ts`):
    - Filtrex 라이브러리 사용 (안전한 표현식 평가)
    - Repository 컨텍스트 매핑 (stars, forks, language 등)
    - `evaluateFilter()`: 필터 표현식 평가
    - `validateFilter()`: 필터 문법 검증
  - **Edge Function** (`supabase/functions/search/index.ts`):
    - GitHub OAuth 토큰 조회 (Supabase Auth)
    - GitHub Code Search API 호출
    - Repository 정보 병렬 fetch (`Promise.all`)
    - 필터 적용 및 결과 부족 시 자동 다음 페이지 fetch
    - Cursor 기반 페이지네이션
    - CORS 헤더 설정
  - **의존성 설정** (`deno.json`):
    - `@supabase/supabase-js`: JSR 패키지
    - `filtrex`: npm 패키지 (3.0.1)

### Architecture Decisions (ADR-003)

1. **Cursor-based Infinite Scroll**:
   - 페이지네이션 대신 커서 기반 무한 스크롤 채택
   - 효율적인 API 사용 (필요한 만큼만 fetch)
   - Rate limit 관리 용이 (10 req/min)
   - 자연스러운 UX (GitHub, Twitter 패턴)

2. **Filtrex 라이브러리**:
   - 직접 구현 대신 검증된 라이브러리 사용
   - 안전한 표현식 평가 (`eval()` 사용 안 함)
   - 개발 시간 단축 및 유지보수 용이

3. **Repository 정보 전체 Fetch**:
   - 모든 repository 필드 가져오기
   - Redis 캐싱 준비 (Phase 3)
   - 병렬 API 호출로 성능 최적화

### API Specification

**Request**:

```typescript
POST /functions/v1/search
{
  "query": "useState",
  "filter": "stars > 100",
  "cursor": null,
  "limit": 30
}
```

**Response**:

```typescript
{
  "items": [...],
  "nextCursor": "2",
  "totalCount": 2341,
  "hasMore": true
}
```

### Filter Expression Examples

- `stars > 100 && language == 'TypeScript'`
- `forks >= 50 || updated_at > 1704067200000`
- `is_fork == false && visibility == 'public'`

### Implementation Details

- **최대 페이지 fetch**: 3페이지 (과도한 API 호출 방지)
- **페이지당 결과**: 100개 (GitHub 최대값)
- **기본 limit**: 30개
- **에러 처리**: TypeScript `unknown` 타입 사용, 명시적 타입 체크

### TypeScript Lint Fixes

- ❌ 초기: `jsr:` prefix 직접 사용
- ✅ 최종: `deno.json` import map 활용
- ❌ 초기: `error.message` 직접 접근
- ✅ 최종: `error instanceof Error` 체크 후 안전하게 접근
- ❌ 초기: 사용하지 않는 `GitHubCodeSearchItem` import
- ✅ 최종: 불필요한 import 제거

### Files Created

- `docs/adr/ADR-003-search-architecture.md`
- `supabase/functions/search/types.ts`
- `supabase/functions/search/filter.ts`

### Files Modified

- `supabase/functions/search/index.ts` (전체 재작성)
- `supabase/functions/search/deno.json` (의존성 추가)

### Next Steps (Phase 2)

- [ ] Frontend: Infinite scroll UI 구현
- [ ] Frontend: `IntersectionObserver` 설정
- [ ] Frontend: 로딩 상태 관리
- [ ] Frontend: Pagination 컴포넌트 제거
- [ ] Frontend: Edge Function 호출 로직

---

## 2026-01-17 (Afternoon)

### UI/UX Improvements - Login Flow Refinement

#### SearchBar GitHub Login Button Redesign

- **변경사항**: GitHub 로그인 버튼을 EXECUTE 버튼과 동일한 스타일로 변경
- **주요 구현**:
  - 큰 파란색 버튼 → 작고 간결한 텍스트 버튼
  - Enter 키 아이콘 추가 (일관성)
  - GitHub 아이콘 크기 축소 (`h-4 w-4`)
  - 우측 정렬 유지
  - Before:
    ```svelte
    <button class="flex h-12 items-center justify-center gap-2.5 rounded-lg bg-accent-blue px-6 text-base font-medium text-white shadow-md">
      <IconLucideGithub class="text-[20px]" />
      <span>Sign in with GitHub</span>
    </button>
    ```
  - After:
    ```svelte
    <button class="group flex items-center gap-2 tracking-wider uppercase transition-colors hover:text-white">
      <IconLucideGithub class="h-4 w-4" />
      <span>Sign in with GitHub</span>
      <IconLucideCornerDownLeft class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </button>
    ```
- **효과**: SearchBar의 로그인 전/후 UI 일관성 향상

#### Header Profile Dropdown - Login Card

- **변경사항**: 로그인 안 된 사용자를 위한 드롭다운 카드 추가
- **주요 구현**:
  - 조건부 렌더링: `{#if !authState.isAuthenticated}`
  - 로그인 카드 구성:
    - "Not signed in" 타이틀
    - "Sign in to start searching" 설명 (유저 친화적 문구)
    - GitHub 로그인 버튼 (카드 스타일, 파란색 테두리 + 반투명 배경)
  - 드롭다운 너비 증가: `w-64` → `w-72` (텍스트 잘림 방지)
  - 설명 텍스트에 `leading-relaxed` 추가
- **디폴트 프로필 아이콘 변경**:
  - ❌ 초기: dicebear 아바타
  - ❌ 2차: GitHub 아이콘 (상표권 문제)
  - ❌ 3차: UserCircle 아이콘 (이중 원 효과)
  - ✅ 최종: User 아이콘 (사람 실루엣, `h-5 w-5`)
- **효과**: 로그인 전 상태가 명확하게 표시되고, 로그인 유도 개선

#### Profile Page Authentication Protection

- **변경사항**: 서버 사이드 인증 체크로 `/profile` 페이지 보호
- **주요 구현**:
  - `profile/+page.server.ts` 신규 생성:
    ```typescript
    export const load: PageServerLoad = async ({ locals }) => {
      const { session } = await locals.safeGetSession();
      if (!session) {
        throw redirect(303, "/");
      }
      return { session };
    };
    ```
  - ❌ 초기: 클라이언트 사이드 체크 (`$effect`)
  - ✅ 최종: 서버 사이드 체크 (`+page.server.ts`)
- **장점**:
  - 더 안전함 (클라이언트 우회 불가)
  - 깜빡임 없음 (페이지 렌더링 전 리다이렉트)
  - 성능 향상 (불필요한 렌더링 방지)

#### ProfileCard Props Cleanup

- **변경사항**: 디폴트값 제거, required props로 변경
- **이유**: `/profile` 페이지가 인증된 사용자만 접근 가능하므로 디폴트값 불필요
- **주요 구현**:
  - Props 타입 변경: `name?: string` → `name: string`
  - 디폴트값 제거: `name = 'Dev User'` 등 삭제
  - `+page.svelte`에서 non-null assertion 추가:
    ```svelte
    <ProfileCard
      name={authState.user?.name!}
      email={authState.user?.email!}
      avatarUrl={authState.user?.avatar_url!}
      isGitHubConnected={authState.isAuthenticated}
    />
    ```
- **효과**: 코드 명확성 향상, 불필요한 fallback 로직 제거

### User Feedback & Iterations

1. **SearchBar 버튼 디자인**:
   - 피드백: "서치바 저거 디자인 상태가 좀 영.... 메롱함... 버튼은 EXECUTE처럼
     작게 해야하고"
   - 해결: 큰 버튼 → 작은 텍스트 버튼으로 변경
2. **프로필 드롭다운**:
   - 피드백: "로그인 안되어있을 때, 프로필카드는 로그인 그거여야함"
   - 해결: 조건부 렌더링으로 로그인 카드 추가
3. **디폴트 아이콘**:
   - 피드백: "지금꺼 너무 안어울림" → "깃헙보단 다른걸로" → "원 안에 또 원....?"
   - 최종: User 아이콘 (사람 실루엣)
4. **설명 텍스트**:
   - 피드백: "'Sign in to access GitHub code search'? 뉘양스가 좀 이상하잖음"
   - 해결: "Sign in to start searching" (유저 친화적)
5. **텍스트 잘림**:
   - 피드백: "설명 이거 짤림"
   - 해결: 드롭다운 너비 증가 + `leading-relaxed`
6. **인증 체크 방식**:
   - 질문: "+page.server.ts 에서는 못하나?"
   - 답변: 서버 사이드가 더 권장됨 (보안, 성능)
   - 해결: 클라이언트 체크 → 서버 체크로 변경
7. **ProfileCard 디폴트값**:
   - 피드백: "이제 디폴트값들 이거 없어야하지 않나?"
   - 해결: 모든 props를 required로 변경

### Files Modified

- `src/lib/components/SearchBar.svelte`
- `src/lib/components/Header.svelte`
- `src/lib/components/ProfileCard.svelte`
- `src/routes/profile/+page.svelte`
- `src/routes/profile/+page.server.ts` (신규)

### Commits

- `ui: make github login button more simple` (2314f1b)
- `ui: make default user profile more pretty` (5940fb3)
- `feat: redirect to '/' when access /profile without authentication` (aa497bd)

---

## 2026-01-17

### Profile Page User Data Integration

- **변경사항**: 프로필 페이지가 실제 사용자 데이터를 사용하도록 수정
- **주요 구현**:
  - `profile/+page.svelte`:
    - `authState` import 추가
    - `ProfileCard`에 실제 사용자 데이터 전달:
      ```svelte
      <ProfileCard
        name={authState.user?.name}
        email={authState.user?.email}
        avatarUrl={authState.user?.avatar_url}
        isGitHubConnected={authState.isAuthenticated}
      />
      ```
    - 로그아웃 핸들러 구현:
      ```typescript
      async function handleLogout() {
        await authState.signOut();
        goto("/");
      }
      ```
    - 로그아웃 버튼에 `onclick={handleLogout}` 연결
- **효과**:
  - 하드코딩된 더미 데이터 대신 실제 GitHub 사용자 정보 표시
  - 로그아웃 시 홈(`/`)으로 자동 리다이렉트

### GitHub Login Button UX Improvement

- **변경사항**: GitHub 로그인 버튼이 항상 활성화되도록 수정
- **이유**: 사용자가 검색어를 입력하지 않아도 언제든지 로그인할 수 있어야 함
- **주요 구현**:
  - `SearchBar.svelte`:
    - GitHub 로그인 버튼에서 `disabled={isQueryEmpty}` 제거
    - 조건부 스타일링 제거 (항상 파란색 활성 상태)
    - Execute 버튼은 여전히 query 검증 유지
- **Before**:
  ```svelte
  <button
    disabled={isQueryEmpty}
    class="{isQueryEmpty ? 'cursor-not-allowed bg-gray-700' : 'bg-accent-blue'}"
  >
  ```
- **After**:
  ```svelte
  <button
    class="bg-accent-blue hover:bg-blue-600"
  >
  ```

### OAuth Redirect Bug Fix

- **문제**: GitHub 로그인 후 `next` 파라미터가 무시되고 항상 `/`로 리다이렉트됨
- **원인**: SvelteKit의 `redirect()`는 throw해야 하는데, throw 없이 호출하여
  코드가 계속 실행됨
- **해결**:
  - `auth/callback/+server.ts`:
    1. **1차 시도**: `redirect()` → `throw redirect()` 변경
       - 문제: catch 블록에서 `err instanceof Response` 체크가 실패
    2. **2차 시도**: catch 블록에서 `TypeError`만 잡도록 수정
       - URL 파싱 에러만 catch, redirect는 re-throw
    3. **최종 해결**: URL 파싱만 try-catch로 감싸고, 검증/리다이렉트는 밖으로
       분리
       ```typescript
       let nextUrl: URL | null = null;
       try {
         nextUrl = new URL(next, url.origin);
       } catch {
         // Invalid URL
         throw redirect(307, "/");
       }

       if (nextUrl && nextUrl.origin === url.origin) {
         throw redirect(307, nextUrl.pathname + nextUrl.search);
       }
       ```
- **효과**:
  - 검색어 입력 → 로그인 → 검색 결과 페이지로 정상 리다이렉트
  - Open Redirect 방지 로직 유지

### User Feedback & Iterations

1. **프로필 페이터 데이터**:
   - ❌ 초기: 하드코딩된 더미 데이터 (`name = 'Dev User'`)
   - ✅ 최종: `authState.user` 실제 데이터 사용
2. **로그아웃 리다이렉트**:
   - 요구사항: "로그아웃하면 로그아웃됨 + '/'로 이동까지도"
   - 구현: `handleLogout()` 함수에서 `goto('/')` 추가
3. **GitHub 로그인 버튼**:
   - 피드백: "깃헙 로그인 버튼은 기본적으로 언제나 활성화되어 있어야함"
   - 구현: `disabled` 속성 및 조건부 스타일 제거
4. **OAuth 리다이렉트 버그**:
   - 피드백: "왜째선지 로그인 후에 리다이렉트가 '/'로만 됨. next로 안가고..."
   - 디버깅: "err instanceof Response에 안잡혀서 throw
     redirect('/')되어버린다야"
   - 최종 피드백: "얌마 걍 URL 에러만 잡고 비교와 throw 로직은 try catch 밖으로
     빼"
   - 해결: 코드 구조 개선으로 명확성 향상

### Files Modified

- `src/routes/profile/+page.svelte`
- `src/lib/components/SearchBar.svelte`
- `src/routes/auth/callback/+server.ts`

### Commits

- `feat: able to click github login even with empty query` (cace9d2)
- `fix: now able to redirect to search after login` (887c700)

---

## 2026-01-15

### GitHub OAuth Implementation (Supabase)

- **변경사항**: GitHub OAuth 로그인 기능 구현 완료
- **주요 구현**:
  - **Supabase 클라이언트** (`src/lib/supabase.ts`):
    - `@supabase/ssr`의 `createBrowserClient` 사용
    - 환경 변수: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
  - **서버 훅** (`src/hooks.server.ts`):
    - 모든 요청에서 Supabase 서버 클라이언트 생성
    - 쿠키 기반 세션 관리
    - `event.locals.supabase`, `event.locals.safeGetSession` 제공
  - **OAuth Callback** (`src/routes/auth/callback/+server.ts`):
    - `code` → `session` 교환 (`exchangeCodeForSession`)
    - `next` 파라미터로 리다이렉트 경로 지정
    - **보안**: Origin 검증으로 Open Redirect 방지
      ```typescript
      const nextUrl = new URL(next, url.origin);
      if (nextUrl.origin === url.origin) {
        redirect(303, nextUrl.pathname + nextUrl.search);
      }
      ```
  - **인증 상태 관리** (`src/lib/stores/auth.svelte.ts`):
    - Svelte 5 `$state` runes 사용
    - `signInWithGitHub(redirectPath?)`: 로그인 후 리다이렉트 경로 지정 가능
    - `signOut()`: 로그아웃
    - `loadSession()`: 세션 로드 및 `onAuthStateChange` 리스너 등록
  - **UI 연동**:
    - `SearchBar.svelte`: 로그인 버튼에서 검색 URL 생성 후
      `signInWithGitHub(redirectPath)` 호출
    - `Header.svelte`: 실제 사용자 데이터 표시 (avatar, name, email)
    - `+layout.svelte`: `onMount`에서 `loadSession()` 호출
  - **TypeScript 타입** (`src/app.d.ts`):
    - `App.Locals`에 `supabase`, `safeGetSession` 추가
    - `App.PageData`에 `session` 추가

### OAuth Flow

1. 사용자가 검색어 입력 후 "Sign in with GitHub" 클릭
2. `handleGitHubLogin()`이 `/search?query=xxx&filter=yyy` URL 생성
3. `signInWithGitHub('/search?query=xxx&filter=yyy')` 호출
4. Callback URL에 `next` 파라미터 포함: `/auth/callback?next=/search?query=xxx`
5. GitHub OAuth 페이지로 리다이렉트
6. GitHub 인증 완료 → `/auth/callback?code=xxx&next=/search?query=xxx`
7. Callback handler:
   - `code` → `session` 교환
   - Origin 검증 (`new URL(next, url.origin)`)
   - `/search?query=xxx`로 리다이렉트
8. 클라이언트에서 세션 로드 및 검색 결과 표시

### Security Improvements

- **Open Redirect 방지**:
  - ❌ 초기: `next.startsWith('/')` 단순 체크
  - ✅ 최종: `new URL(next, url.origin)` 파싱 후 origin 검증
  - 악의적인 절대 URL 차단

### User Feedback & Iterations

1. **Redirect 경로 지정**:
   - ❌ 초기: 현재 페이지로만 리다이렉트
   - ✅ 최종: `signInWithGitHub(redirectPath?)` 파라미터로 지정 가능
   - 예: 메인 페이지에서 검색어 입력 → 로그인 → 검색 결과 페이지
2. **Origin 검증**:
   - ❌ 초기: `startsWith('/')` 단순 체크
   - ✅ 최종: `new URL()` 파싱 후 origin 비교
3. **문서화 실수**:
   - ❌ TRB-001 파일 수정 (트러블슈팅 가이드는 원본 유지해야 함)
   - ❌ DEV_LOG.md 업데이트 누락
   - **교훈**: 구현 완료 시 DEV_LOG.md 업데이트 필수

### Files Created

- `src/lib/supabase.ts`
- `src/hooks.server.ts`
- `src/routes/auth/callback/+server.ts`

### Files Modified

- `src/lib/stores/auth.svelte.ts`
- `src/lib/components/SearchBar.svelte`
- `src/lib/components/Header.svelte`
- `src/routes/+layout.svelte`
- `src/app.d.ts`
- `GEMINI.md` (인증 흐름 문서화)

### Known Issues

- 일부 버그 존재 (추후 수정 예정)

### Next Steps

- [ ] 버그 수정
- [ ] 로그인 필요한 페이지 보호 (middleware)
- [ ] 에러 핸들링 개선

---

## 2026-01-12/13

### SearchBar UX Improvements

- **변경사항**: 입력 검증 및 키보드 네비게이션 개선
- **주요 구현**:
  - **버튼 Disable 상태**:
    - `isQueryEmpty = $derived(!query.trim())` 추가
    - Query 비어있을 때 GitHub 로그인 버튼과 Execute 버튼 모두 disable
    - 시각적 피드백: `pointer-events-none`, `cursor-not-allowed`, 회색 텍스트
    - Alert 제거 → 버튼 상태로 검증 표현
  - **Enter 키 지원**:
    - `handleKeyDown()` 함수 추가
    - 로그아웃 상태: Enter → GitHub 로그인 트리거
    - 로그인 상태: Enter → 검색 실행
    - 두 input 모두에 `onkeydown` 핸들러 적용
  - **레이블 제거**: "Search:", "Filter:" 레이블 제거 (UI 단순화)

### Pagination Redesign

- **변경사항**: 복잡한 ellipsis 로직 → 단순한 5개 숫자 구조
- **주요 구현**:
  - **새로운 구조**: `« < [5개 숫자] > »`
    - First (`«`): 첫 페이지로 이동
    - Previous (`<`): 이전 페이지
    - 5개 페이지 숫자 (현재 페이지 중심)
    - Next (`>`): 다음 페이지
    - Last (`»`): 마지막 페이지로 이동
  - **아이콘 사용**:
    - `IconLucideChevronsLeft` / `IconLucideChevronsRight` (First/Last)
    - `IconLucideChevronLeft` / `IconLucideChevronRight` (Prev/Next)
  - **페이지 번호 로직**:
    - 항상 5개 페이지 표시 (현재 페이지 중심 ±2)
    - 시작/끝 부근에서 자동 조정
    - 일정한 너비 유지
  - **Disable 처리**:
    - 현재 페이지: `<span>` 태그로 클릭 불가 + `pointer-events-none`
    - First/Prev 버튼: 첫 페이지일 때 `pointer-events-none`
    - Last/Next 버튼: 마지막 페이지일 때 `pointer-events-none`

### URL Parameter Persistence

- **변경사항**: Pagination 이동 시 query/filter 유지
- **주요 구현**:
  - `search/+page.svelte`:
    - `currentPage = $derived(parseInt($page.url.searchParams.get('page') || '1', 10))`
    - Pagination에 `{currentPage}`, `{query}`, `{filter}` props 전달
  - `Pagination.svelte`:
    - `query`, `filter` props 추가
    - `buildPageUrl(page)` 헬퍼 함수:
      ```typescript
      function buildPageUrl(page: number): string {
        const params = new URLSearchParams();
        if (query) params.set("query", query);
        if (filter) params.set("filter", filter);
        params.set("page", page.toString());
        return `/search?${params.toString()}`;
      }
      ```
    - 모든 페이지 링크에 `buildPageUrl()` 적용

### Minor UI Adjustments

- **Header**: 패딩 조정 (`py-6` → `py-4`)
- **Header**: 로그아웃 버튼에 `onclick={handleLogout}` 추가
- **SearchBar**: Status bar 레이아웃 조정 (로그인 전/후 일관성)

### Files Modified

- `src/lib/components/SearchBar.svelte`
- `src/lib/components/Pagination.svelte`
- `src/lib/components/Header.svelte`
- `src/routes/search/+page.svelte`
- `docs/adr/ADR-001-system-architecture.md` (GitHub SSO Token 보안 정책 추가)

### User Feedback & Iterations

1. **버튼 Disable 처리**:
   - ❌ 초기: Alert으로 검증
   - ✅ 최종: 버튼 disable + 시각적 피드백
2. **Enter 키 동작**:
   - ❌ 초기: 힌트만 표시, 기능 없음
   - ✅ 최종: 로그인/로그아웃 상태에 따라 분기 처리
3. **Pagination 구조**:
   - ❌ 1차: 7개 요소 (ellipsis 포함)
   - ❌ 2차: 텍스트 기반 `«`, `»`
   - ✅ 최종: 5개 숫자 + Lucide 아이콘
4. **Disable 처리**:
   - ❌ 초기: `aria-disabled`만 사용
   - ✅ 최종: `pointer-events-none` 추가로 실제 클릭 차단

---

## 2026-01-12

### Search URL Parameter Implementation

- **변경사항**: 검색 기능에 URL 쿼리 파라미터 지원 추가
- **주요 구현**:
  - `SearchBar.svelte`:
    - `$state` runes로 `query`, `filter` 상태 관리
    - `initialQuery`, `initialFilter` props 추가 (URL에서 받은 값으로 초기화)
    - `handleExecute()`: `URLSearchParams`로 URL 생성 후 `/search`로 이동
    - 검색어 빈 값 검증 추가
  - `search/+page.svelte`:
    - `$page.url.searchParams`로 URL 파라미터 읽기
    - `$derived`로 `query`, `filter` 값 추출
    - `query` 없을 시 메인 페이지로 리다이렉트
    - SearchBar에 초기값 전달
    - 디버그 박스 추가 (임시)
  - URL 구조: `/search?query={검색어}&filter={필터표현식}`

### Documentation Structure Decision

- **피드백**: "ADR 너무 복잡함. 간단히 해라. 대안 넣을 필요도 없어"
- **결정**: ADR-002 삭제, `docs/endpoints/search.md`로 이동
- **이유**:
  - URL 파라미터 구조는 너무 작고 당연한 결정이라 ADR로 하기엔 과함
  - 간단한 엔드포인트 문서가 더 적합
- **교훈**:
  - ✅ ADR은 **중요하고 복잡한 아키텍처 결정**에만 사용
  - ✅ 간단한 API/엔드포인트 구조는 **별도 문서**로 관리
  - ❌ 모든 결정을 ADR로 만들 필요 없음

### User Feedback & Iterations

1. **ADR 간소화**:
   - ❌ 초기: 대안 3개, 구현 세부사항 포함 (79줄)
   - ✅ 1차 수정: 대안 제거, 핵심만 유지 (34줄)
   - ✅ 최종: ADR 삭제, `docs/endpoints/search.md`로 이동 (15줄)
2. **Placeholder 가시성**:
   - 문제: `placeholder-gray-700`이 너무 어두워 안 보임
   - 해결: `placeholder-gray-500`으로 변경

### Files Modified

- `src/lib/components/SearchBar.svelte`
- `src/routes/search/+page.svelte`
- `docs/endpoints/search.md` (신규)
- `docs/adr/ADR-002-search-url-parameters.md` (삭제)

### Testing Results

- ✅ 기본 검색: `/search?query=useState&filter=`
- ✅ 필터 포함: `/search?query=react+hooks&filter=stars%3E100`
- ✅ 직접 URL 접근 정상 작동
- ✅ query 없을 시 메인 페이지로 리다이렉트
- ✅ 브라우저 뒤로가기/앞으로가기 정상 작동

---

## 2026-01-11

### Authentication UI Implementation

- **변경사항**: 로그인/로그아웃 상태에 따른 조건부 UI 구현
- **주요 구현**:
  - `auth.svelte.ts`: Svelte 5 runes 기반 인증 상태 관리
    - `$state`를 사용한 반응형 상태 (`isAuthenticated`, `user`)
    - `login()`, `logout()` 메서드
  - `SearchBar.svelte`: 조건부 버튼 렌더링
    - 로그인 전: "Sign in with GitHub" (파란색 버튼, h-12, 아이콘 포함)
    - 로그인 후: "Execute" (텍스트 버튼)
  - `Header.svelte`: 로그아웃 기능 연결
  - `+page.svelte`: 하단 패딩 추가 (`pb-24`)로 중앙 정렬 개선

### User Feedback & Iterations

1. **파일명 변경**: `auth.ts` → `auth.svelte.ts` (Svelte 5 runes 사용 명시)
2. **디자인 가이드 활용**:
   - ❌ 초기: 디자인 파일(`main-login-required.html`)을 그대로 복사 시도
   - ✅ 최종: 디자인은 참고만 하고 프로젝트에 맞게 조정
   - **교훈**: 로그인 전/후 완전히 다른 레이아웃 대신, 버튼만 변경하여 일관성
     유지
3. **Svelte 5 문법 전환**:
   - ❌ 초기: `writable` store 사용 (Svelte 4 방식)
   - ✅ 최종: `$state` runes 사용 (Svelte 5 방식)
4. **조건부 스타일링 개선**:
   - ❌ 초기: 여러 개의 `class:` 디렉티브 사용 → Tailwind `/` 문자 처리 오류
   - ✅ 최종: 삼항 연산자로 간결하게 처리
5. **시각적 효과 조정**:
   - ❌ 초기: 파란색 링, 글로우, `animate-pulse` 등 과도한 효과
   - ✅ 최종: 버튼 스타일만 강조 (디자인 파일 참고)
6. **레이아웃 조정**:
   - 문제: Header로 인해 콘텐츠가 아래로 밀림
   - 해결: 메인 페이지 하단 패딩 추가 (`pb-24`)

### Technical Decisions

- **상태 관리**: Svelte 5 `$state` runes 사용 (store 대신)
  - 더 간결한 문법, 타입 안정성 향상
  - 클래스 기반으로 메서드 추가 가능
- **UI 패턴**: 최소 변경 원칙
  - 전체 레이아웃은 동일하게 유지
  - 핵심 요소(버튼)만 조건부 렌더링
- **스타일링**: 삼항 연산자 활용
  - Tailwind opacity 구분자(`/`) 문제 회피
  - 가독성 향상 (로그인 전/후 비교 용이)

### Files Modified

- `src/lib/stores/auth.svelte.ts` (신규)
- `src/lib/components/SearchBar.svelte`
- `src/lib/components/Header.svelte`
- `src/routes/+page.svelte`
- `docs/design/main-login-required.html` (신규, 참고용)

### Documentation Updates

- `GEMINI.md`: 3개 새로운 교훈 추가
  - Svelte 5 Runes 사용
  - 조건부 스타일링 패턴
  - 인증 상태 UI 패턴
- 개발 체크리스트 3개 항목 추가
- Component Architecture 업데이트

---

## 2026-01-10

### UI Simplification - Profile Page

- **변경사항**: ProfileCard에서 프로필 사진 편집 버튼 제거
- **이유**: 불필요한 UI 요소 제거 (UI 단순화 원칙)
- **영향받은 파일**:
  - `ProfileCard.svelte`: 편집 버튼 및 관련 wrapper div 제거
  - `IconLucidePencil` import 제거
- **배경**: 프로필 사진 편집 기능이 실제로 구현되지 않았으며, 현재 단계에서
  불필요한 UI 요소로 판단

---

## 2026-01-09

### Icon System Implementation

- **변경사항**: Material Symbols 폰트 → unplugin-icons (lucide) 전환
- **이유**: 텍스트 기반 아이콘 대신 실제 아이콘 컴포넌트 사용
- **영향받은 파일**:
  - `Header.svelte`: search, git-branch, bar-chart-2, log-out
  - `SearchBar.svelte`: corner-down-left
  - `SearchResultCard.svelte`: folder-open
  - `Pagination.svelte`: chevron-left, chevron-right
  - `ProfileCard.svelte`: pencil, git-branch
  - `UsageCard.svelte`: bar-chart-2, info
  - `profile/+page.svelte`: log-out, user-minus
- **설정**: `vite.config.ts`에 unplugin-icons 추가

### CSS Import Order Fix

- **문제**: PostCSS 에러 - `@import`가 `@theme` 블록 이후에 위치
- **해결**: `layout.css`에서 모든 `@import`를 최상단으로 이동
- **제거**: Material Symbols 폰트 import 및 관련 스타일

### UI Refinement (User Feedback)

- **브랜딩 변경**:
  - 헤더: "GitScout_" → "Slightly Better GH Search"
  - 메인 타이틀: "SearchRepos" → "Slightly Better GH Search"
  - 부제목: "for GitHub" 명시 추가
- **불필요한 요소 제거**:
  - SearchBar의 READY 상태 표시 제거
  - SearchBar의 MODE: REGEX_ENABLED 제거
- **아이콘 개선**: terminal → search (헤더)

### Initial Frontend Implementation

- **완료된 페이지** (3개):
  - `/`: 메인 랜딩 페이지 (중앙 정렬, 그리드 배경)
  - `/search`: 검색 결과 페이지 (mock 데이터)
  - `/profile`: 프로필 페이지
- **완료된 컴포넌트** (6개):
  - `Header.svelte`: 브랜딩 + 프로필 드롭다운
  - `SearchBar.svelte`: 듀얼 입력 (검색 + 필터)
  - `SearchResultCard.svelte`: 코드 스니펫 + 메타데이터
  - `Pagination.svelte`: 페이지 네비게이션
  - `ProfileCard.svelte`: 사용자 정보
  - `UsageCard.svelte`: API 사용량 시각화
- **스타일 시스템**:
  - Tailwind CSS 4.x 설정
  - 터미널 테마 색상 팔레트
  - 커스텀 폰트 (Inter, JetBrains Mono)
  - 커스텀 스크롤바
- **접근성**:
  - autofocus 제거
  - ARIA roles 추가
  - 키보드 이벤트 핸들러

### Dependencies Installed

- `jsep`: 필터 표현식 파싱용
- `unplugin-icons`: 아이콘 컴포넌트 시스템
- `@iconify/json`: 아이콘 데이터

---

## 향후 작업 (TODO)

### Phase 6: Navigation & Interactions

- [ ] URL 쿼리 파라미터 처리
- [ ] 검색어 상태 관리
- [ ] 페이지 간 라우팅 구현

### Phase 7: Filter Expression Evaluation

- [ ] jsep를 사용한 필터 파서 구현
- [ ] 안전한 표현식 평가 로직
- [ ] 에러 핸들링

### Phase 8: Backend Integration

- [ ] Supabase 설정
- [ ] GitHub OAuth 구현
- [ ] Edge Function 개발 (GitHub API 호출)
- [ ] Upstash Redis 캐싱

### Additional Tasks

- [ ] 반응형 디자인 개선
- [ ] 실제 GitHub API 연동
- [ ] 검색 기록 저장
- [ ] 다크/라이트 모드 토글
