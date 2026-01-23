ADR 004. 테스트 전략 결정

# 상태

- 승인됨 (2026-01-22)

# 컨텍스트

Supabase Edge Functions (`search`, `store-token`)에 대한 테스트 전략을 수립해야
합니다.

## 핵심 문제

1. **테스트 범위 결정**
   - 유닛 테스트 vs E2E 테스트
   - Edge Functions의 로직이 작고 외부 의존성이 많음 (GitHub API, Vault, Redis)
   - 유닛 테스트를 위한 모킹 비용 vs 실제 통합 테스트의 가치

2. **OAuth 토큰 테스트**
   - GitHub OAuth 콜백은 실제 GitHub 인증 필요
   - 테스트 환경에서 `provider_token` 획득 어려움
   - OAuth 플로우 전체를 테스트할 필요성 검토

3. **환경 파일 관리**
   - 이미 SvelteKit용 `.env`, Supabase용 `supabase/.env` 존재
   - 테스트용 환경 파일 추가 시 총 6개 파일로 증가
   - 파일 위치와 명명 규칙 결정 필요

4. **테스트 인프라**
   - Deno 런타임 (Edge Functions)
   - 로컬 Supabase CLI 활용
   - 실제 외부 서비스 (Upstash Redis, GitHub API) 사용 여부

# 결정

## 1. E2E 테스트만 구현 (유닛 테스트 제외)

Edge Functions에 대해 **E2E 테스트만** 작성합니다.

### 선택 이유

- ✅ **로직 크기**: 각 함수의 비즈니스 로직이 작아 E2E로 충분히 커버 가능
- ✅ **통합 테스트 가치**: 실제 Vault, Redis, GitHub API 통합이 핵심 기능
- ✅ **모킹 비용 절감**: 외부 의존성 모킹보다 실제 서비스 사용이 더 간단
- ✅ **유지보수 용이**: 테스트 코드 양 최소화, 실제 동작 검증

### 포기한 것

- ❌ 세밀한 단위 로직 테스트
- ❌ 빠른 테스트 실행 속도 (외부 API 호출 포함)

## 2. GitHub PAT를 OAuth 토큰으로 사용

실제 OAuth 플로우 대신 **GitHub Personal Access Token (PAT)**을 사용합니다.

### 선택 이유

- ✅ **OAuth 콜백 분리**: OAuth 콜백은 별도 관심사 (SvelteKit 라우트)
- ✅ **Edge Function 집중**: Edge Functions는 토큰 저장/사용만 담당
- ✅ **테스트 단순화**: PAT도 Vault에 동일하게 저장 가능
- ✅ **충분한 검증**: Edge Function 로직 테스트에 충분

### 동작 방식

```typescript
// 테스트에서 PAT를 provider_token처럼 사용
const testGitHubToken = Deno.env.get("TEST_GITHUB_TOKEN"); // ghp_xxxxx
await storeTokenFunction({ provider_token: testGitHubToken });
```

## 3. 환경 파일을 `supabase/` 디렉토리에 유지

테스트 환경 파일을 **`supabase/.env.test`**에 배치합니다.

### 선택 이유

- ✅ **명확한 책임 분리**: SvelteKit = 루트, Supabase = `supabase/`
- ✅ **CLI 일관성**: `--env-file supabase/.env.test` 명시적 경로
- ✅ **루트 정리**: 루트에 6개 env 파일 방지
- ✅ **스케일링**: 추가 환경 (CI, integration) 모두 `supabase/`에 그룹화
- ✅ **혼동 방지**: SvelteKit .env vs Supabase .env 명확히 구분

### 최종 구조

```
/.env                        # SvelteKit (개발)
/.env.example                # SvelteKit (템플릿)
/supabase/.env               # Edge Functions (개발)
/supabase/.env.example       # Edge Functions (템플릿)
/supabase/.env.test          # Edge Functions (테스트)
/supabase/.env.test.example  # Edge Functions (테스트 템플릿)
```

## 4. 로컬 Supabase CLI + 실제 외부 서비스 사용

**로컬 Supabase**와 **실제 Upstash Redis, GitHub API**를 사용합니다.

### 선택 이유

- ✅ **Supabase 로컬**: Auth, Vault 등 Supabase 서비스 완전 재현
- ✅ **Redis 실제 사용**: 개발 환경과 동일한 Redis 인스턴스 (캐싱 동작 검증)
- ✅ **GitHub API 실제 사용**: PAT로 실제 검색 테스트 가능
- ✅ **설정 단순화**: 별도 모킹 인프라 불필요

### 수동 설정 필요

- `supabase start` 후 `supabase status`에서 service role key 복사
- `.env.test`에 수동 입력 필요 (자동화 어려움)

## 5. Deno 내장 테스트 러너 사용

별도 테스트 프레임워크 없이 **Deno의 `deno test`** 사용합니다.

### 선택 이유

- ✅ **추가 의존성 없음**: Deno 런타임에 포함
- ✅ **Edge Functions 환경 일치**: 실제 배포 환경과 동일
- ✅ **충분한 기능**: 기본 assertion, async 지원
- ✅ **Watch 모드**: TDD 워크플로우 지원

# 영향

## 긍정적 영향

- 테스트 코드 양 최소화 (E2E만)
- 실제 통합 동작 검증으로 높은 신뢰도
- 간단한 테스트 인프라 (Deno + 로컬 Supabase)
- 환경 파일 구조 명확화

## 부정적 영향

- 테스트 실행 속도 느림 (외부 API 호출)
- 수동 설정 필요 (service role key)
- 외부 서비스 의존성 (Redis, GitHub API)
- 세밀한 단위 로직 테스트 불가

## 기술 스택 추가

- **Deno**: 테스트 러너
- **로컬 Supabase CLI**: Auth, Vault 서비스
- **Upstash Redis**: 캐싱 테스트 (개발 환경과 동일)

## 테스트 커버리지

### `store-token` 함수

- Admin 유저 생성
- 토큰 저장 (insert)
- 토큰 업데이트 (update)
- Vault 통합 검증
- 에러 처리 (401, 400)

### `search` 함수

- 기본 검색
- 필터 표현식 적용
- 페이지네이션 (cursor)
- Redis 캐싱 동작
- ETag 기반 조건부 요청
- `incomplete_results` 플래그
- `text_matches` 반환
- 에러 처리 (400, 401)

# 변경 사항

- 2026-01-22: 초안 작성 및 승인
