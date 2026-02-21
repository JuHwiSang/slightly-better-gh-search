# TRB-012: seed.sql에서 SELECT 문이 스키마 에러를 일으킴

## 증상

`supabase db reset` 또는 `supabase start` 시 seed.sql 실행 단계에서 에러 발생.

- 첫 번째 에러: `pgtle 스키마 없음`
- 수정 시도 후: `dbdev 스키마 없음`

`--debug` 옵션을 붙여도 정확한 원인이 나오지 않음.

## 원인

seed.sql 최상위 레벨에서 `SELECT` 문을 사용한 것이 문제.

dbdev 설치 스크립트는 원래 migration 파일이었는데
(`20260219164536_install_dbdev_with_test_helpers.sql`), `supabase db push` 시
에러가 나서 seed.sql로 옮긴 상태였음. migration에서는 잘 동작하던 SQL이 seed.sql
에서는 동작하지 않았음.

정확한 내부 메커니즘은 불명확하지만, seed.sql에서 결과를 반환하는 `SELECT` 문
(특히 `pgtle.install_extension(...)`, `dbdev.install(...)` 같은 함수 호출을
`SELECT`로 실행하는 것)이 스키마 해석 문제를 일으키는 것으로 보임.

## 해결

전체를 `DO $$ BEGIN ... END $$;` 블록으로 감싸고, `SELECT`를 전부 `PERFORM`으로
교체.

```sql
-- Before (에러)
SELECT pgtle.install_extension(...);
SELECT dbdev.install('supabase-dbdev');

-- After (정상)
DO $$
BEGIN
    PERFORM pgtle.install_extension(...);
    PERFORM dbdev.install('supabase-dbdev');
END $$;
```

`PERFORM`은 PL/pgSQL에서 결과를 버리고 함수만 실행하는 구문. `DO` 블록 안에서만
사용 가능.

## 관련 커밋

- `0bdcc17` — migration → seed.sql 이동
- `1d60cc1` — DO 블록 + PERFORM으로 수정

## 관련 파일

- `supabase/seed.sql`
