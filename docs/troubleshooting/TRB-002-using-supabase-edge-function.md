TRB. 002. Supabase Edge Function 사용하기

# 순서

## Supabase 세팅

1. `pnpm add -D supabase`로 Supabase를 설치한다.
2. `pnpm supabase login`으로 로그인한다.
3. `pnpm supabase function new myfuncname`으로 생성한다.

## Deno 세팅

1. `irm https://deno.land/install.ps1 | iex`로 Deno를 설치한다.
2. Deno Extension을 설치한다.
3. `deno.json`에 import map을 작성한다.

### 트러블슈팅

- 만약 모듈을 찾을 수 없다고 에러를 낸다면,
  `deno cache --reload supabase/functions/search/filter.ts` 처럼 해당 ts 파일을
  캐싱하자. `deno.lock` 파일이 생성되며 캐싱된다.
