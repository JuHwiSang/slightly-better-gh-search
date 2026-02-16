# ADR-006: Gateway JWT 검증 비활성화

## 상태

- 승인됨 (2026-02-17)

## 컨텍스트

Supabase Edge Functions를 호출할 때, 특히 Supabase Auth를 통해 발급된 유저의
JWT를 `Authorization: Bearer <JWT>` 헤더로 전송할 때 401 Unauthorized 에러가
발생하는 현상이 발견되었습니다.

### 분석 결과

- **알고리즘 불일치**: Supabase Auth SDK는 이제 ES256(비대칭 키)으로 JWT를
  서명하여 발급합니다.
- **게이트웨이 한계**: Supabase API Gateway의 자동 JWT 검증(`verify_jwt = true`)
  기능은 여전히 HS256(대칭 키)을 기대하거나, 특정 환경에서 ES256 토큰 검증에
  실패하는 버그가 있습니다.
- **결과**: 유효한 유저 JWT임에도 불구하고 Gateway 단계에서 401 에러를 반환하며
  Edge Function 코드가 실행조차 되지 않는 참사가 발생합니다.

## 결정

모든 Supabase Edge Function의 Gateway 레벨 JWT 검증을
비활성화(`verify_jwt = false`)합니다.

### 세부 원칙

1. **내부 검증 강제**: Gateway 검증을 끄는 대신, 모든 Edge Function은
   최우선적으로 내부 코드에서 `supabase.auth.getUser()` 등을 통해 직접 JWT의
   유효성을 검증해야 합니다.
2. **보안성 유지**: 현재 본 프로젝트의 `search` 및 `store-token` 함수는 이미
   내부적으로 `createAnonClient(authHeader)`를 통해 유저를 검증하고 있으므로,
   Gateway 설정을 꺼도 실질적인 보안 수준은 유지됩니다.
3. **일관성 확보**: 로컬 개발 환경과 프로덕션 환경 모두 동일하게
   `verify_jwt = false`를 적용하여 환경 간 차이를 없앱니다.

## 영향

- **긍정적**: ES256 JWT를 사용하는 유저의 요청이 Gateway에 막히지 않고
  정상적으로 처리됩니다.
- **부정적**: 개발자가 실수로 Edge Function 내부에서 인증 로직을 누락할 경우
  보안 취약점이 발생할 수 있습니다. 따라서 코드 리뷰 시 인증 로직 포함 여부를
  반드시 확인해야 합니다.

## 기술적 변경 사항

- `supabase/config.toml` 내 모든 함수의 `verify_jwt` 설정을 `false`로 변경.
- 테스트 스크립트(`package.json`)에서 더 이상 필요 없는 `--no-verify-jwt` 플래그
  제거.

## 변경 사항

- 2026-02-17: 초안 작성 및 승인
