# TRB-007: Supabase Vault 접근 방식 변경

## 문제 상황

`vault.secrets`를 사용하여 암호화된 데이터를 저장하고 조회하는 과정에서 여러
권한 및 접근 방식 문제가 발생함.

### 증상

1. **스키마 접근 오류**: 초기에 `public.vault.secrets`로 접근하려 했으나 실패
2. **스키마 누락 오류**: `.schema('vault').from('secrets')` 형식으로 수정 후
   `vault` 스키마가 없다는 에러 발생
3. **권한 거부 오류**: 스키마 추가 후
   `permission denied for function _crypto_aead_det_noncegen` 에러 발생

### 에러 메시지

```
permission denied for function _crypto_aead_det_noncegen
```

## 잘못된 접근 및 시도들

### ❌ 시도 1: pgsodium 스키마 권한 부여

```sql
-- pgsodium 스키마 권한 부여
GRANT USAGE ON SCHEMA pgsodium TO service_role;
GRANT USAGE ON SCHEMA pgsodium TO postgres;

-- pgsodium 내 모든 함수 실행 권한 부여
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgsodium TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgsodium TO postgres;

-- Vault 복호화 뷰 접근 권한 부여
GRANT SELECT ON vault.decrypted_secrets TO service_role;
```

**문제**:

- `ERROR: schema "pgsodium" does not exist (SQLSTATE 3F000)` 발생
- AI가 환각을 보이며 pgsodium 스키마 권한 부여를 제안하였으나, 해당 스키마가
  존재하지 않음

### ❌ 시도 2: 일부 권한만 부여

pgsodium 관련 4줄을 제거하고 마지막 줄(Vault 뷰 권한)만 남겨서 시도했으나
동일하게 실패.

## 원인 분석

Supabase Vault의 **접근 방식이 변경됨**. 과거에는 직접 테이블 접근(`INSERT`,
`UPDATE`, `DELETE`)이 가능했으나, 현재는 **보안상의 이유로 RPC 함수를 통해서만
쓰기 작업이 가능**하도록 정책이 변경됨.

### 참고 자료

- [Reddit: Permission denied for function crypto_aead](https://www.reddit.com/r/Supabase/comments/1lt1sjt/42501_permission_denied_for_function_crypto_aead/)
- [Supabase Vault 공식 문서](https://supabase.com/docs/guides/database/vault)

> **교훈**: AI는 이런 최신 정책 변경사항을 제대로 반영하지 못하는 경우가 많음.
> 공식 문서와 커뮤니티 검색이 더 신뢰할 수 있음.

## ✅ 해결 방법

### 읽기: `vault.decrypted_secrets` 뷰 사용

```typescript
// 읽기는 뷰를 통해 가능
const { data } = await supabaseClient
  .schema("vault")
  .from("decrypted_secrets")
  .select("decrypted_secret")
  .eq("name", secretName)
  .maybeSingle();

const githubToken = data?.decrypted_secret;
```

### 쓰기: RPC 함수 사용

기본 제공되는 RPC 함수:

- `vault.create_secret(new_secret text, new_name text DEFAULT NULL, new_description text DEFAULT '', new_key_id uuid DEFAULT NULL)`
- `vault.update_secret(secret_id uuid, new_secret text DEFAULT NULL, new_name text DEFAULT NULL, new_description text DEFAULT NULL, new_key_id uuid DEFAULT NULL)`

> **⚠️ 중요**: 파라미터 이름이 직관적이지 않으므로 주의 필요
>
> - `create_secret`: `new_secret`, `new_name` 사용 (~~`secret`, `name`~~ 아님)
> - `update_secret`: `secret_id`, `new_secret` 사용 (~~`id`, `secret`~~ 아님)

```typescript
// Upsert 패턴: 읽기 → 쓰기 분리
const secretName = `github_token_${user.id}`;

// 1. 기존 시크릿 확인 (읽기: 뷰 사용)
const { data: existing } = await vaultClient
  .from("decrypted_secrets")
  .select("id")
  .eq("name", secretName)
  .maybeSingle();

if (existing) {
  // 2-a. 업데이트 (쓰기: RPC 함수)
  await vaultClient.rpc("update_secret", {
    secret_id: existing.id, // ✅ secret_id (NOT id)
    new_secret: providerToken, // ✅ new_secret (NOT secret)
  });
} else {
  // 2-b. 생성 (쓰기: RPC 함수)
  await vaultClient.rpc("create_secret", {
    new_secret: providerToken, // ✅ new_secret (NOT secret)
    new_name: secretName, // ✅ new_name (NOT name)
  });
}
```

### 삭제: 커스텀 RPC 함수 생성

기본적으로 `delete_secret` RPC는 제공되지 않으므로 직접 생성해야 함.

#### Migration 생성

```bash
pnpm supabase migration new create_delete_secret_function
```

#### 함수 정의

```sql
CREATE OR REPLACE FUNCTION public.delete_secret_by_name(secret_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, vault
AS $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO target_id
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  
  IF target_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = target_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_secret_by_name(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_secret_by_name(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_secret_by_name(text) TO service_role;
```

#### 주의사항

1. **스키마 제약**: `vault` 스키마에 함수를 선언하는 것은 불가능하므로 `public`
   스키마에 선언해야 함
2. **권한 관리**: `public` 스키마에 선언하므로 모든 기본 권한을 `REVOKE`하고
   `service_role`에만 `GRANT` 해야 함
3. **구문 오류**: `SECURITY DEFINER SET search_path = public, vault` 뒤에 `;`를
   붙이면 안 됨
4. **적용 방법**:
   - 로컬: `pnpm supabase db reset`
   - 클라우드: `pnpm supabase db push`

#### 트러블슈팅

- `db reset`이 간헐적으로 실패하는 경우가 있음
- **권장**: `pnpm supabase stop` 후 `pnpm supabase start`를 다시 실행하여
  깔끔하게 재시작

## 현재 상태

- **읽기**: `vault.decrypted_secrets` 뷰 사용
- **쓰기**: `vault.create_secret()`, `vault.update_secret()` RPC 함수 사용
- **삭제**: `public.delete_secret_by_name()` 커스텀 RPC 함수 사용

## 핵심 교훈

1. ❌ 직접 테이블 접근 (`INSERT`, `UPDATE`, `DELETE`) 불가능
2. ✅ 읽기는 `vault.decrypted_secrets` 뷰 사용
3. ✅ 쓰기는 RPC 함수 (`vault.create_secret`, `vault.update_secret`) 사용
4. ✅ 삭제는 커스텀 RPC 함수 생성 필요
5. ⚠️ AI의 제안을 맹신하지 말고 공식 문서와 커뮤니티를 참고할 것

## 관련 파일

- [TRB-004: Supabase Vault로 GitHub OAuth Token 저장하기](file:///f:/usr/project/slightly-better-gh-search/docs/troubleshooting/TRB-004-storing-github-token-in-vault.md)

---

> **참고**: Supabase Vault의 정책은 계속 업데이트될 수 있으므로, 공식 문서를
> 정기적으로 확인하는 것이 중요함.
