# TRB-005: 로컬 Edge Function JWT 검증 실패

## 문제 상황

`pnpm supabase start`로 로컬 Supabase를 띄우고 `pnpm test:supabase:serve`로 Edge
Function을 실행한 후 `pnpm test:supabase`를 실행하면 모든 요청에서 **401
Unauthorized** 에러가 발생함.

### 증상

- 어떤 인증 방식을 사용해도 401 에러 발생:
  - Anon key (Bearer 접두사 있음/없음)
  - Service role key (Bearer 접두사 있음/없음)
  - Supabase JWT 토큰
- `--no-verify-jwt` 플래그를 추가하면 정상 작동
- **결론**: Gateway 레벨의 JWT 검증 문제

### 에러 메시지

```
TypeError: Key for the ES256 algorithm must be of type CryptoKey. 
Received an instance of Uint8Array
```

## 원인 분석

### 버전 불일치 가설

가장 유력한 원인은 **GoTrue와 Edge Function Runtime 간의 알고리즘 불일치**:

1. **GoTrue (인증 서비스)**: ES256 알고리즘 사용 (최신 표준)
2. **Edge Function Runtime**: HS256 키 형식 기대 (레거시)

### 기술적 세부사항

- **`.env`의 JWT Secret**: 평문 플레이스홀더
  ```
  super-secret-jwt-token-with-at-least-32-characters-long
  ```

- **ES256이 기대하는 형식**: `CryptoKey` 객체 (공개키/비밀키 쌍)

- **실제 동작**:
  1. GoTrue는 자체 키 쌍으로 ES256 토큰 생성
  2. Edge Function Runtime은 평문 문자열로 HS256 검증 시도
  3. 타입 불일치 → 검증 실패

## 시도한 해결 방법들

모두 실패함:

- ❌ 다양한 API 키 형식 (anon/service role)
- ❌ Bearer 토큰 접두사 변형
- ❌ Supabase CLI 재시작/리셋
- ❌ 컴퓨터 리부트
- ❌ `Supabase stop --no-backup`으로 전체 삭제

## ✅ 해결 방법 (Workaround)

### 구현된 해결책

#### 1. package.json 수정

`test:supabase:serve` 스크립트에 `--no-verify-jwt` 플래그 추가:

```json
"test:supabase:serve": "supabase functions serve --env-file supabase/.env.test --no-verify-jwt"
```

#### 2. Ping Function 생성

`supabase/functions/ping/index.ts`에 간단한 ping/pong 엔드포인트 구현:

```typescript
Deno.serve(() => {
  return new Response(JSON.stringify({ message: "pong" }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

#### 3. 검증 전략

1. **로컬 테스트**: `pnpm test:supabase:serve`로 `--no-verify-jwt` 플래그와 함께
   실행
2. **원격 배포**: ping function을 원격 Supabase 인스턴스에 배포
3. **프로덕션 검증**: 원격 배포가 JWT 검증과 함께 정상 작동하는지 확인
4. **로컬 개발 계속**: 확인 후 로컬에서 `--no-verify-jwt` 사용

### 사용 방법

```bash
# Edge Function 서버 시작 (JWT 검증 우회)
pnpm test:supabase:serve

# 테스트 실행
pnpm test:supabase

# 또는 ping 엔드포인트 직접 호출
curl http://127.0.0.1:54321/functions/v1/ping
```

> **⚠️ 주의**: `--no-verify-jwt`는 인증 검사를 비활성화함. 로컬 개발 환경에서만
> 사용할 것. 프로덕션 배포 시에는 자동으로 JWT 검증이 활성화됨.

## 관련 이슈

- [supabase/cli#4524](https://github.com/supabase/cli/issues/4524) - 현재 진행
  중인 이슈로 아직 해결되지 않음

## 현재 상태

- **로컬 개발**: `--no-verify-jwt` 우회 방법 사용 예정 (사용 중)
- **프로덕션**: 문제 없음을 검증할 예정 (검증 완료)
- **업스트림 수정**: Supabase CLI 해결 대기 중
