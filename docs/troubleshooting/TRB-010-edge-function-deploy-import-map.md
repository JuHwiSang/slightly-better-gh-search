# TRB-010: Edge Function 배포 시 Import Map 미인식

## 문제 상황

Edge Function 개발을 완료한 뒤 `pnpm supabase functions deploy`로 배포하려고
하면, `deno.json`에 정의된 import map의 의존성을 찾지 못해 배포가 실패함.

### 증상

- 배포 시 `filtrex` 등 import map에 매핑된 패키지를 resolve하지 못함.

### 배경

이 프로젝트의 `supabase/functions/deno.json`에는 다음과 같은 import map이
정의되어 있음:

```json
{
    "imports": {
        "filtrex": "npm:filtrex@^3.1.0",
        "@upstash/redis": "npm:@upstash/redis@1.34.3"
    }
}
```

소스코드에서는 이 매핑을 사용하여 bare specifier로 import함:

```ts
import { compileExpression } from "filtrex";
```

## 원인 분석

`supabase functions deploy` 명령은 기본적으로 `deno.json`의 import map을
자동으로 인식하지 않음. deploy 시에는 CLI가 import map 경로를 명시적으로
전달받아야 함.

## ✅ 해결 방법

### 방법 1: `--import-map` 플래그 지정 (즉시 해결)

배포 명령에 `--import-map` 옵션으로 `deno.json` 경로를 명시적으로 지정함:

```bash
pnpm supabase functions deploy search --import-map .\supabase\functions\deno.json
```

### 방법 2: 소스코드에서 직접 npm specifier 사용 (근본 해결)

import map에 의존하지 않고, 소스코드에서 직접 `npm:` specifier를 사용하면
`--import-map` 없이도 배포가 가능함:

```ts
// Before (import map 의존)
import { compileExpression } from "filtrex";

// After (직접 specifier)
import { compileExpression } from "npm:filtrex@^3.1.0";
```

이 경우 `deno.json`의 import map이 필요 없어지므로 deploy 시 추가 플래그도
불필요. 단, 버전 관리가 소스코드 곳곳에 분산되는 단점이 있음.

## 현재 상태

- **방법 1 적용**: `--import-map` 플래그를 사용하여 배포 성공 확인.

---

> **참고**: `supabase functions serve`는 로컬에서
> `supabase/functions/deno.json`을 자동으로 인식하기 때문에 이 문제가 발생하지
> 않음. deploy 시에만 주의가 필요함.
