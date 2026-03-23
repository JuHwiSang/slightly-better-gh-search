# TRB-014: deno outdated --update가 deno.json을 수정하지 않음

## 문제 상황

Deno 의존성 자동 업데이트를 위해 `deno outdated --update`를 시도했으나,
deno.json 파일이 전혀 수정되지 않음.

### 증상

버전을 일부러 낮춰서 테스트해봄:

```json
// deno.json - 의도적으로 낮은 버전으로 변경
"filtrex": "npm:filtrex@^2.2.3"
```

`deno install` 후 `deno outdated --update .\deno.json` 실행 → **deno.json 변경
없음**. 실제 파일 수정이 일어나지 않음.

원인은 불명. Windows 환경 문제일 수도 있고, `npm:` specifier와의 호환성 문제일
수도 있음.

## 시도한 것들

### ❌ deno outdated --update

```bash
deno outdated --update .\deno.json
```

outdated 패키지를 감지는 하지만 deno.json을 수정하지 않음.

### ❌ dependabot-deno.yaml 워크플로우

Dependabot이 Deno를 지원하지 않아서, `udd`(URL Dependency Updater)를 사용하는
커스텀 워크플로우를 만들어 CI에서 돌리는 방식을 시도함.

```yaml
# .github/workflows/dependabot-deno.yaml
- name: Run udd
  run: |
    deno install -A -f -n udd https://deno.land/x/udd/main.ts
    udd supabase/functions/deno.json
```

**결과**: 에러만 발생. `udd`는 `https://deno.land/x/` URL 기반 import를 대상으로
만들어진 도구인데, 이 프로젝트의 deno.json은 `npm:` specifier를 사용하므로
호환되지 않음.

## 현재 결론

Deno 의존성 자동 업데이트는 현재 실용적인 방법이 없음.

- `deno outdated --update` → 파일 수정 안 됨
- `udd` → `npm:` specifier 미지원
- Dependabot → Deno ecosystem 미지원

의존성이 4개뿐이므로 수동 업데이트로 충분. `dependabot-deno.yaml` 워크플로우는
삭제함.

## 관련 파일

- `supabase/functions/deno.json`
- ~~`.github/workflows/dependabot-deno.yaml`~~ (삭제됨)
