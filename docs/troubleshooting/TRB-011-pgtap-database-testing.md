# TRB-011: pgTAP Database 테스트 세팅

## 배경

RPC 함수(`store_github_token`, `delete_secret_by_name`)를 DB 레벨에서 테스트하기
위해 pgTAP 세팅을 조사한 내용.

## 알아본 것들

### pgTAP

Jest 같은 테스트 프레임워크. `plan()`, `is()`, `throws_ok()` 같은 테스트용
함수를 추가해줌. Supabase에 이미 설치되어 있고, `supabase test db`를 사용하면
알아서 활성화됨. 별도 설치 및 활성화 필요 없음.

### dbdev

npm 같은 커뮤니티 extension 패키지 매니저. 원격에서 extension을 다운로드하고
버전 관리해줌.

**설치가 좀 까다로움**: 단순 `CREATE EXTENSION`이 아니라 **GitHub에서 직접 SQL을
복사**해와서 설치해야 함. 공식 설치 SQL은
[https://github.com/supabase/dbdev](https://github.com/supabase/dbdev)에 있음.

### pg_tle

신뢰 가능한 언어만 실행시켜주는 안전한 샌드박스 같은 녀석. dbdev가 이 위에서
돌아감. pg_tle 자체는 원격 다운로드나 버전 관리 같은 건 안 해주고, 안전한 실행만
해줌. 그래서 dbdev가 필요한 거.

### basejump-supabase_test_helpers

테스트용 헬퍼 함수 모음. 핵심은 `tests.authenticate_as('유저')` — 이걸로
`auth.uid()`를 시뮬레이션할 수 있음. dbdev로 설치함.

### dbdev.install() vs CREATE EXTENSION

- `dbdev.install('패키지')` — 로컬에 extension 파일을 **다운로드**. CREATE
  EXTENSION 하려면 일단 파일이 있어야 하니까 이게 먼저.
- `CREATE EXTENSION "패키지"` — 다운받은 extension을 실제로 DB에 **생성**.
  테이블 만드는 것처럼 그냥 생성하는 거.

### BEGIN / ROLLBACK

각 테스트 파일에서 `BEGIN; CREATE EXTENSION ...; ROLLBACK;` 패턴을 씀. 트랜잭션
안에서 테스트용 extension을 활성화하고, 끝나면 rollback으로 싹 돌려버림.

## 설치 순서 요약

1. GitHub에서 dbdev 설치 SQL 복사 → 실행
2. `SELECT dbdev.install('basejump-supabase_test_helpers')`
3. 각 테스트 파일에서 `CREATE EXTENSION "basejump-supabase_test_helpers"`를
   `BEGIN ROLLBACK` 안에서 실행

## 관련 파일

- Seed: `supabase/seed.sql` (dbdev + test_helpers 설치)
  - 원래 migration이었으나 seed.sql로 이동됨 — [TRB-012](TRB-012-seed-sql-select-in-top-level.md) 참고
- Tests: `supabase/tests/rpc-*.sql`
