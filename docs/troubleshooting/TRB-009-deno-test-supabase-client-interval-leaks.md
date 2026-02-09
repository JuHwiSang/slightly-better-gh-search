# TRB-009: Deno Test에서 Supabase Client Interval Leaks 해결

## 문제 상황

`store-token` Edge Function의 E2E 테스트 실행 시 interval leaks가 발생하여
테스트가 실패함.

### 증상

특정 테스트(`should return 400 when missing provider_token`)가 다음과 같은
interval leak 에러로 실패:

```
error: Leaks detected:
  - 3 intervals were started in this test, but never completed.
    This is often caused by not calling `clearInterval`.
```

### 에러 메시지

--trace-leaks 플래그 추가해서 나온 결과

```
store-token: should return 400 when missing provider_token => ./supabase/functions/store-token/index_test.ts:142:6
error: Leaks detected:
  - 3 intervals were started in this test, but never completed. This is often caused by not calling `clearInterval`. The operation were started here:
    at Object.queueUserTimer (ext:core/01_core.js:784:9)
    at setInterval (ext:deno_web/02_timers.js:93:15)
    at Timeout.<computed> (ext:deno_node/internal/timers.mjs:67:7)
    at new Timeout (ext:deno_node/internal/timers.mjs:55:37)
    at setInterval (node:timers:37:10)
    at SupabaseAuthClient._startAutoRefresh (file:///C:/Users/.../npm/registry.npmjs.org/@supabase/auth-js/2.91.0/dist/main/GoTrueClient.js:2107:24)
    at eventLoopTick (ext:core/01_core.js:175:7)
    at async SupabaseAuthClient.startAutoRefresh (...)
```

## 잘못된 접근 및 시도들

### ❌ 시도 1: Response body 수동 정리

Response body가 문제라고 생각하여 `finally` 블록에 다음 코드를 추가:

```typescript
if (response && response?.body && !response.bodyUsed) {
  await response.body.cancel();
}
```

**결과**: 여전히 실패. Response가 문제가 아니었음.

## 원인 분석

Deno 테스트는 기본적으로 **resource leak detection**을 수행하며, 테스트 종료 시
정리되지 않은 리소스(interval, timeout 등)가 있으면 실패함.

에러 스택 트레이스를 분석한 결과:

- **근본 원인**: `SupabaseAuthClient._startAutoRefresh()`가 Client 세션 유지
  목적으로 자동으로 interval을 생성
- **발생 위치**: Supabase 클라이언트 생성 시 (`createAdminClient()`,
  `createAnonClient()`)
- **문제**: 테스트 종료 시 이 interval들이 정리되지 않음

### 참고 자료

- [Deno Test Resource Sanitizer 문서](https://docs.deno.com/runtime/fundamentals/testing/#resource-sanitizer)
- Supabase Auth 클라이언트는 기본적으로 `autoRefreshToken: true`로 설정되어 자동
  갱신을 위한 interval을 생성함

## ✅ 해결 방법

### 방법 1: Client 생성 시 autoRefreshToken 비활성화 (권장)

테스트용 Supabase 클라이언트 생성 시 auth 옵션을 추가하여 자동 갱신을 비활성화:

```typescript
export function createAdminClient(): SupabaseClient {
  const env = getTestEnv();
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false, // ✅ 핵심: interval 생성 방지
    },
  });
}

export function createAnonClient(): SupabaseClient {
  const env = getTestEnv();
  return createClient(env.supabaseUrl, env.anonKey, {
    auth: {
      autoRefreshToken: false, // ✅ 핵심: interval 생성 방지
    },
  });
}
```

#### 추가 옵션 (선택적)

AI는 다음 옵션들도 함께 권장하지만, `autoRefreshToken: false`만으로도 충분:

```typescript
{
  auth: {
    autoRefreshToken: false,    // interval 생성 방지 (필수)
    persistSession: false,      // 세션 저장 비활성화 (선택)
    detectSessionInUrl: false,  // URL 기반 세션 감지 비활성화 (선택)
  },
}
```

**검증 결과**: `autoRefreshToken: false` 하나만 추가해도 leak 에러가 완전히
해결됨.

### 방법 2: Test Sanitizer 비활성화 (비권장)

```typescript
Deno.test({
  name: "test name",
  sanitizeResources: false, // ❌ leak 무시 (문제 해결이 아님)
  fn: async () => {
    // ...
  },
});
```

**문제점**: 근본 원인을 해결하지 않고 경고만 숨기는 방식이므로 권장하지 않음.

## 현재 상태

- `test_utils.ts`의 `createAdminClient()`와 `createAnonClient()`에
  `autoRefreshToken: false` 옵션 추가
- 모든 `store-token` E2E 테스트가 leak 없이 성공적으로 통과

## 핵심 교훈

1. ✅ Deno 테스트에서 Supabase 클라이언트를 사용할 때는 **반드시**
   `autoRefreshToken: false` 설정 필요
2. ✅ E2E 테스트 환경에서는 토큰 자동 갱신이 필요 없으므로 비활성화하는 것이
   안전
3. ⚠️ 에러 메시지의 스택 트레이스를 주의 깊게 분석하면 근본 원인을 찾을 수 있음
4. ❌ Response body나 다른 리소스 정리는 이 문제와 무관했음

## 관련 파일

- [`test_utils.ts`](file:///f:/usr/project/slightly-better-gh-search/supabase/functions/test_utils.ts) -
  테스트 유틸리티 함수 (클라이언트 생성)
- [`store-token/index_test.ts`](file:///f:/usr/project/slightly-better-gh-search/supabase/functions/store-token/index_test.ts) -
  Store Token E2E 테스트

---

> **참고**: 프로덕션 코드에서는 `autoRefreshToken`을 활성화하여 토큰 자동 갱신을
> 지원해야 하지만, 테스트 환경에서는 비활성화하는 것이 적절함.
