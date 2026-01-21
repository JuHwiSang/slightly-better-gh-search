# TRB-003: GitHub Provider Token 얻기

## 문제 상황

Supabase Auth를 통한 GitHub OAuth 인증 후, GitHub API를 호출하기 위해 필요한
`provider_token`을 어떻게 얻을 수 있는가?

## 잘못된 접근 방법들

AI나 문서에서 제안하는 다음 방법들은 **작동하지 않음**:

### ❌ 방법 1: `auth.identities` 테이블에서 조회

```typescript
// 작동하지 않음
const { data } = await supabase
    .from("auth.identities")
    .select("provider_token");
```

- **문제**: `auth.identities` 테이블에는 `provider_token`이 저장되지 않음

### ❌ 방법 2: `getSession()`으로 조회

```typescript
// 작동하지 않음
const { data: { session } } = await supabase.auth.getSession();
console.log(session?.provider_token); // undefined
```

- **문제**: `getSession()`이 반환하는 세션 객체에는 `provider_token`이 포함되지
  않음

## ✅ 유일하게 작동하는 방법

`provider_token`은 **오직 `exchangeCodeForSession()` 호출 시에만** 반환됨:

```typescript
// OAuth callback 핸들러에서 (/auth/callback/+server.ts)
const { data, error } = await supabase.auth.exchangeCodeForSession(code);

if (data.session) {
    const providerToken = data.session.provider_token; // ✅ 여기서만 얻을 수 있음

    // 이 토큰을 저장해야 함 (예: Supabase 테이블)
    await supabase
        .from("user_tokens")
        .upsert({
            user_id: data.session.user.id,
            provider_token: providerToken,
            updated_at: new Date().toISOString(),
        });
}
```

## 해결 방법

1. **OAuth Callback 시점에 토큰 저장**
   - `exchangeCodeForSession()` 호출 직후 `provider_token`을 추출
   - Supabase 테이블에 저장 (예: `user_tokens` 테이블)

2. **이후 사용 시 저장된 토큰 조회**
   ```typescript
   const { data } = await supabase
       .from("user_tokens")
       .select("provider_token")
       .eq("user_id", userId)
       .single();

   const githubToken = data.provider_token;
   ```

## 주의사항

- `provider_token`은 **한 번만** 얻을 수 있음 (OAuth callback 시점)
- 이후 `getSession()`, `getUser()` 등에서는 제공되지 않음
- 반드시 callback 시점에 저장해야 함

## 관련 파일

- [`src/routes/auth/callback/+server.ts`](file:///f:/usr/project/slightly-better-gh-search/src/routes/auth/callback/+server.ts) -
  OAuth callback 핸들러

## 참고

- Supabase 공식 문서에서도 이 부분이 명확하게 설명되어 있지 않음
- 여러 AI 도구들이 잘못된 방법을 제안하는 경우가 많음
