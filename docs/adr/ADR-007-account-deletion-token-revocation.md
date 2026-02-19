ADR 007. 계정 삭제 시 GitHub OAuth 토큰 미철회

# 상태

- 승인됨

# 컨텍스트

계정 삭제 기능 구현 시, Supabase Vault에 저장된 GitHub OAuth 토큰 자체를 GitHub
쪽에서 revoke할지 여부를 결정해야 했다.

GitHub OAuth 토큰 철회는 GitHub API `DELETE /applications/{client_id}/token`를
호출해야 하므로, Edge Function에서 GitHub API를 직접 호출하는 로직이 필요하다.

# 대안

## 1. 계정 삭제 시 GitHub API 호출로 토큰 철회

- Edge Function이 `DELETE /applications/{client_id}/token`을 직접 호출
- 장점: 토큰이 완전히 무효화됨
- 단점:
  - OAuth App의 `client_secret`을 Edge Function 환경변수에 주입해야 함
  - 구현 복잡도 증가
  - GitHub API 추가 의존성

## 2. Vault secret만 삭제, GitHub 토큰은 미철회 (채택)

- Supabase Vault에서 `github_token_{userId}` 레코드만 삭제
- GitHub쪽 토큰 자체는 유효하게 유지됨
- 장점:
  - 구현 단순
  - `client_secret` 불필요
- 단점:
  - 토큰이 탈취된 적 있다면 여전히 유효 (단, scope가 read:user/email뿐이라 실질
    피해 미미)

# 결과

**2번 채택** — Vault secret만 삭제하고 GitHub 토큰은 미철회.

**근거**:

- 토큰 scope: `read:user` (이메일 조회만 가능), 코드 읽기/쓰기 권한 없음
- 탈취 시 피해: 이메일 주소 노출 수준으로 리스크 최소
- 유저는 직접 GitHub Settings → Applications → Authorized OAuth Apps에서 수동
  revoke 가능

# 영향

- 계정 삭제 후 GitHub 쪽 토큰은 만료(아마도 1년)까지 유효하게 남음
- 추후 리스크가 커질 경우 `client_secret` 주입 방식으로 전환 가능

# 변경 사항

-
  26.
      2.
         19. 초안 작성
