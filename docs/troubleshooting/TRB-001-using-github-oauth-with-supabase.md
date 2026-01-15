TRB. 001. Supabase랑 Github OAuth 사용하기

# 순서

## 기본 세팅
1. Supabase에서 프로젝트를 만들고, Authenticaiton - Sign In / Providers에서 Github를 선택한다. 그리고 Callback URL을 복사한다.
2. Github의 Settings - Developer Settings - Github OAuth에서 Callback URL과 함께 생성한다. Homepage URL은 아무렇게나 해도 된다.
3. Github에서 얻은 Client ID와 Secret을 Supabase에 넣는다.

## 프론트앤드와 연동
4. Supabase의 URL Configuration에서 Redirect될 URL을 추가한다. SvelteKit이므로, `http://localhost:5173/auth/callback` 처럼 추가한다.
5. 필요한 supabase 패키지 두개(`@supabase/supabase-js @supabase/ssr`)를 설치한다.
6. Supabase의 URL과 ANON_KEY를 `.env`에 추가한다.
7. SSR을 위해 서버 훅을 추가하고, callback url에 미리 code -> token을 만들어둔다.
8. 프론트앤드에서 버튼을 누르면 `signInWithOAuth`룰 호출하게 한다.