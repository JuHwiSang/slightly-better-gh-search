# TRB-004: Supabase Vault로 GitHub OAuth Token 안전하게 저장하기

## 개요

GitHub OAuth를 통해 얻은 `provider_token`을 안전하게 저장하기 위해 Supabase의
`vault.secrets` 기능을 사용할 수 있음. 이 기능은 자동으로 암호화를 제공하며,
`service_role` 권한이 필요하므로 Edge Function 내에서 사용하기 적합함.

## Vault 기본 개념

### 테이블 구조

- **`vault.secrets`**: 암호화된 데이터 저장 (쓰기용)
  - `id`: UUID (자동 생성, 직접 지정 불가)
  - `name`: 식별자 (unique 제약 없음, 일반적으로 사용)
  - `secret`: 암호화할 데이터

- **`vault.decrypted_secrets`**: 복호화된 데이터 조회 (읽기용)
  - `decrypted_secret`: 복호화된 데이터

### 권한 요구사항

- **읽기/쓰기 모두 `service_role` KEY 필요**
- `anon` key로는 접근 불가

## 구현 패턴

### 1. Edge Function에서 사용자 인증

```typescript
// Authorization 헤더에서 JWT 토큰 추출
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
    throw new ApiError(401, "Unauthorized");
}

// service_role 클라이언트로 사용자 확인
const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service_role 필요
    {
        global: {
            headers: { Authorization: authHeader },
        },
    },
);

const { data: { user }, error } = await supabaseClient.auth.getUser();
if (error || !user) {
    throw new ApiError(401, "Invalid token");
}
```

### 2. GitHub Token 저장

```typescript
// 사용자 ID 기반 name 생성
const secretName = `github_token_${user.id}`;

// 기존 토큰 확인
const { data: existing } = await supabaseClient
    .from("vault.decrypted_secrets")
    .select("id, name")
    .eq("name", secretName)
    .single();

if (existing) {
    // 업데이트
    await supabaseClient
        .from("vault.secrets")
        .update({ secret: providerToken })
        .eq("id", existing.id);
} else {
    // 생성
    await supabaseClient
        .from("vault.secrets")
        .insert({
            name: secretName,
            secret: providerToken,
        });
}
```

### 3. GitHub Token 조회

```typescript
const secretName = `github_token_${user.id}`;

const { data, error } = await supabaseClient
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .eq("name", secretName)
    .single();

if (error || !data) {
    throw new ApiError(404, "GitHub token not found");
}

const githubToken = data.decrypted_secret;
```

## 장점

1. **자동 암호화**: Vault가 자동으로 암호화/복호화 처리
2. **안전한 접근 제어**: `service_role`만 접근 가능
3. **Edge Function 전용**: 클라이언트에서 직접 접근 불가
4. **간단한 구현**: 일반 테이블처럼 사용 가능

## 주의사항

- `name` 필드는 unique 제약이 없으므로 중복 방지 로직 필요
- `id` 필드는 직접 지정할 수 없으므로 `name`으로 식별
- 반드시 `service_role` **key** 사용 (`anon` key로는 접근 불가)
- Edge Function 외부에서는 사용하지 말 것 (클라이언트는 `anon` key 사용)

## 관련 문서

- [TRB-003: GitHub Provider Token 얻기](file:///f:/usr/project/slightly-better-gh-search/docs/troubleshooting/TRB-003-obtaining-github-provider-token.md)
