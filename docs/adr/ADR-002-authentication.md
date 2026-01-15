ADR 002. 인증방법

# 상태
- 승인됨

# 컨텍스트
- 유저가 어떻게 회원가입하고 로그인하고 삭제할지, 그 인증 구조에 대해서 틀을 잡아야 한다.
- 그러나 Github API를 사용해야 하는 상황 상, Rate Limit에 매우 민감할 수 밖에 없다.

# 대안

## 1. Github SSO 외 인증수단
- 단점: Github API의 Rate limit를 관리자 계정 하나로 감당해야 함. 사실상 서비스 불가

## 2. Github OAuth
- Github OAuth를 사용하고, 이를 supabase에서 관리한다.
- Supabase Edge Function에서 OAuth Token을 가지고 응답을 제공한다.
- 유저는 Supabase JWT를 가지며, 이는 클라이언트와 서버에 공유된다.
- Delete API를 사용해 계정 허용을 삭제하고, supabase에서 유저를 삭제한다.
- 장점: refresh token 갱신이 필요 없다.
- 단점: 깃허브가 레거시 취급한다. 털리면 그대로 끝이다. 물론 콘솔에서 revoke가 가능하다.

## 3. Github App
- Github App을 사용하고, 이를 supabase에서 관리한다.
- Supabase Edge Function에서 App Token을 가지고 응답을 제공한다.
- Supabase Edge Function에서 토큰을 사용할 때 만료가 뜬다면, refresh token으로 갱신한다.
- 유저는 Supabase JWT를 가지며, 이는 클라이언트와 서버에 공유된다.
- Delete API를 사용해 계정 허용을 삭제하고, supabase에서 유저를 삭제한다.
- 장점: 현재 깃허브가 밀어주는 인증수단이다. RTR이 있다!
- 단점: 직접 refresh token에 의한 갱신이 필요하다. refresh token 만료에 의한 엣지케이스 처리는 물론, refresh token을 직접 잡아서 저장해주는 등 처리가 필요하다.

# 결과

- Github OAuth를 사용한다.
- 권한 스코프는 read email로 한다. 중복 로그인 시 두 유저가 아닌 한 유저임을 인지할 수 있어야 하기 때문이다.
- 털렸을 때 리스크가 있으나, 애초에 권한 없이 사용할 것이며, 최대한 토큰 사용범위를 줄인다.
- 이런저런 점을 고려하였을 때, 그냥 Github OAuth를 사용하는게 훨씬 좋아보인다.
- 프젝이 작으니 Refresh Token을 도입했을 때 생기는 다양한 처리가 복잡해진다.

# 영향

- 로직이 간단해진다..
- 이 연동 때문에 프로젝트 제작 지연은 발생하지 않을 것이다.
- 실무적인 구조에서는 조금 동떨어져있다.
- Best practice는 아니나, 주어진 자원을 종합적으로 고려해 최적의 선택을 고르는 경험이 될 수는 있다.

# 변경 사항
- 26. 01. 15) read email 권한 추가