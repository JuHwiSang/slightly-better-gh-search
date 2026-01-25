# TRB-006: Edge Function 배포 시 os error 2 발생

## 문제 상황

`pnpm supabase functions deploy <function-name>` 명령어로 Edge Function을
배포하려고 할 때, 번들링 단계에서 에러가 발생하며 배포가 중단됨.

### 증상

- `Bundling Function: <function-name>` 단계에서 진행이 멈추거나 실패함.
- `No such file or directory (os error 2)` 에러 발생.
- `error running container: exit 1` 메시지가 함께 출력됨.

### 에러 메시지

```
> pnpm supabase functions deploy ping
Bundling Function: ping
Error: No such file or directory (os error 2)
error running container: exit 1
Try rerunning the command with --debug to troubleshoot the error.
```

## 원인 분석

Supabase CLI는 기본적으로 **Docker 컨테이너**를 사용하여 Edge Function을
번들링하고 배포 준비를 함.

`os error 2`와 `error running container` 에러는 다음과 같은 상황에서 발생할 수
있음:

1. **Docker 컨테이너와 호스트 파일 시스템 간의 경로 맵핑 문제**: Docker 엔진이
   로컬 프로젝트 파일을 컨테이너 내부로 마운트하는 과정에서 경로를 찾지 못함.
2. **Docker 실행 환경 불안정**: Docker Desktop의 설정이 꼬였거나 리소스 부족으로
   컨테이너가 정상적으로 실행되지 않음.
3. **가상화 기반 오버헤드**: @types/node 등 복잡한 의존성 번들링 시 Docker
   환경의 가상화 레이어에서 예기치 못한 실패가 발생함.

## 시도한 해결 방법들 (효과 없음)

- ❌ `config.toml`의 `import_map` 설정 주석 처리: `deprecated` 관련 경고는
  사라지나 본질적인 배포 실패 이슈는 해결되지 않음.
- ❌ `deno.json`의 `npm:` 의존성을 `esm.sh`로 변경: `npm:` 의존성이 가상화를
  필요로 한다기에 시도하였으나, `@types/node`가 기본으로 존재하여 언제나
  가상화가 필요함
- ❌ Supabase 임시 파일 삭제: `.supabase/.temp` 디렉토리를 지우고
  재인증(`login`) 및 재링크(`link`)를 시도했으나 동일 증상 반복.

## ✅ 해결 방법

로컬 환경에 **Deno**가 설치되어 있다면, Supabase CLI는 Docker를 거치지 않고
로컬의 Deno를 사용하여 직접 번들링을 수행할 수 있음. 이 방식이 가상화 오버헤드나
경로 문제로부터 훨씬 자유롭고 안정적임.

1. 실행 중인 **Docker Desktop을 완전히 종료**함.
2. 다시 배포 명령 실행:
   ```bash
   pnpm supabase functions deploy ping
   ```

## 현재 상태

- **임시 조치**: Docker Desktop을 끄고 로컬 Deno 환경에서 배포하는 방식으로 해결
  완료.

---

> **참고**: Supabase CLI 버전 업그레이드 시 Docker 기반 번들링 안정성이 개선될
> 수 있으나, 현재로서는 로컬 Deno 사용이 가장 확실한 우회책임.
