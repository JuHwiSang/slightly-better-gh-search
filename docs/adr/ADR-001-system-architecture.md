ADR 001. 시스템 아키텍처 결정

# 상태
- 승인됨

# 컨텍스트

- Advanced Code Search for Github를 만들기 위한 아키텍처는 다양할 수 있다.
- 현재 나는 Spring 프로젝트가 하나 즈음은 필요하다. OAuth와 같은 것도 사용해보고 싶다.
- 그러나 Advanced Code Search for Github의 최소기능은 BFF, Backend 없이도 충분히 제작 가능하다.

# 대안

## 1. 작은 아키텍처

- 단순히 js의 http 모듈 사용. object를 캐시로 사용.
- 장점: 휴대성 좋음. 의존성 적음. 골드 플레이팅/오버 엔지니어링 없음.
- 단점: 확장성 없음.

## 2. 거대한 아키텍처

- NextJS/SveltKit + Google OAuth + Spring으로 구현된 거대 아키텍처.
- 장점: 새로운 기술 경험 가능. 확장성 좋음.
- 단점: 상당한 오버엔지니어링. 이를 막기 위해서는 상당한 기능 추가가 필요.

## 3. 중간크기 아키텍처

- NextJS/SveltKit 하나만 사용핸 중간 정도의 아키텍처.
- 장점: 오버 엔지니어링 없음.
- 단점: 휴대성 없음.

## 고려 중인 기능들

- (메인) github code search에 고급 검색 기능을 추가 (BFF)
- Github API 결과 24시간 캐싱 기능 (Redis)
- 검색기록 기억 기능
- CI/CD 기능 (Github + Vercel)
- Github OAuth를 통한 로그인 (Supabase)

# 결과

- SvelteKit + Supabase + Redis를 사용해서 구현한다.
- SvelteKit으로 기본적인 프론트를 만든다.
- Supabase를 사용해서 Github OAuth 로그인을 구현한다.
- Supabase Edge Function을 사용해서 고급 검색 기능을 구현한다.
- Supabase DB를 캐시 저장소로 사용한다 (ADR-008 참조).
- Github Action을 사용해서 Supabase Edge Function에 자동 배포한다.
- Vercel을 사용해서 Github Repository를 자동으로 배포한다.
- 이 모든 것은 기본적으로 무료 티어로 사용 가능하다.

- Github Repository는 sveltekit 세팅으로 사용하고, supabase/ 폴더를 추가해 사용한다.

- Github SSO Token은 안전해야 하니, Edge Function 외부로 나오지 않게 한다.

# 영향

- 시스템 아키텍처의 커다란 틀이 결정된다.
- SvelteKit, Supabase를 사용해보는 경험을 가질 수 있게 된다.
- Spring 기술스택 경험과 휴대성을 포기한다.

# 변경 사항
- 26. 01. 12) Github SSO Token의 사용 범위 제한 내용 추가
- 26. 02. 22) Upstash Redis → Supabase DB 캐시 마이그레이션 (ADR-008)