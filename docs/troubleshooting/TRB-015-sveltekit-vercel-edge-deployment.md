# TRB-015: SvelteKit Vercel Edge 배포 설정

## 문제 상황

SvelteKit 앱을 Vercel Edge Runtime으로 배포하려고 `@sveltejs/adapter-vercel`을
설정했으나 빌드 에러 발생.

### 증상

```
X [ERROR] Could not resolve "node:crypto"

  The package "node:crypto" wasn't found on the file system but is built into node.
  Cannot use "node:crypto" when deploying to Vercel Edge Functions.
```

## 원인

Edge Runtime은 브라우저와 유사한 환경이라 `fs`, `path`, `crypto` 등 Node.js
빌트인 모듈을 사용할 수 없음. Supabase SDK(`@supabase/ssr`) 내부에서 Web Crypto
API 폴백으로 `node:crypto`를 조건부 import하는 코드가 있음:

```javascript
// SvelteKit 빌드 출력 (번들된 코드)
crypto ??= globalThis.crypto?.subtle?.digest
  ? globalThis.crypto
  : (await import("node:crypto")).webcrypto;
```

런타임에는 Edge 환경에 `globalThis.crypto`가 존재하므로 `node:crypto` import는
실행되지 않지만, esbuild가 정적 분석 시 resolve를 시도하면서 에러 발생.

## 해결

### 1. adapter-vercel 설치 및 설정

```bash
pnpm add -D @sveltejs/adapter-vercel
pnpm remove @sveltejs/adapter-auto
```

`svelte.config.js`에서 adapter 교체 + `external` 옵션으로 `node:crypto` 제외:

```javascript
import adapter from '@sveltejs/adapter-vercel';

const config = {
  kit: {
    adapter: adapter({
      external: ['node:crypto']
    })
  }
};
```

`external`은 esbuild에게 해당 모듈을 번들에 포함하지 말라고 지시함. 런타임에
해당 코드 경로를 타지 않으므로 문제없음.

### 2. runtime: 'edge' 는 deprecated

`adapter()` 옵션에 `runtime: 'edge'`를 넣는 방식은 deprecated됨. 대신 라우트
파일에서 `export const config`로 설정:

```typescript
// src/routes/+layout.server.ts (전체 앱에 적용)
import type { Config } from "@sveltejs/adapter-vercel";

export const config: Config = {
  runtime: "edge",
};
```

### 3. Windows 로컬 빌드 시 symlink 에러

```
Error: EPERM: operation not permitted, symlink ...
```

Windows에서 symlink 생성 권한이 없어서 발생. Vercel CI(Linux)에서는 문제없음.
로컬에서 확인이 필요하면 관리자 권한으로 실행하거나 Windows 개발자 모드 활성화.

## 관련 파일

- `svelte.config.js` — adapter 설정
- `src/routes/+layout.server.ts` — edge runtime config
