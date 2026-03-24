# TRB-015: SvelteKit Vercel Edge 배포 시도 및 철회

## 문제 상황

SvelteKit 앱을 Vercel Edge Runtime으로 배포하려 했으나, 여러 문제에 부딪힌 뒤
Vercel 자체가 Edge Runtime을 deprecated하면서 의미가 없어짐.

## 겪었던 문제들 (참고용)

### 1. node:crypto 빌드 에러

Edge Runtime은 Node.js 빌트인 모듈(`fs`, `path`, `crypto` 등)을 사용할 수 없음.
Supabase SDK 내부에서 Web Crypto API 폴백으로 `node:crypto`를 조건부 import하는
코드가 있어 esbuild 정적 분석 시 에러 발생.

```
X [ERROR] Could not resolve "node:crypto"
  Cannot use "node:crypto" when deploying to Vercel Edge Functions.
```

`adapter({ external: ['node:crypto'] })`로 우회 가능했음.

### 2. runtime: 'edge' deprecated

adapter 옵션의 `runtime: 'edge'`가 deprecated됨. 라우트 파일에서
`export const config = { runtime: 'edge' }`로 설정하는 방식으로 전환 필요했음.

### 3. Windows 로컬 빌드 symlink 에러

adapter-vercel이 serverless 함수 번들링 시 symlink를 생성하는데, Windows에서
권한 부족으로 실패. Vercel CI(Linux)에서는 문제없음.

## 결론

**Vercel이 Edge Runtime을 제거하는 방향으로 전환함.** 모든 함수가 Node.js
런타임으로 통합될 예정. 따라서:

- `external: ['node:crypto']` → 불필요 (Node.js 런타임이면 node:crypto 사용 가능)
- `runtime: 'edge'` config → 불필요 (Edge Runtime 자체가 deprecated)
- `adapter-auto` → `adapter-vercel`로 교체만 하면 됨

### 최종 설정

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

const config = {
  kit: {
    adapter: adapter()
  }
};
```

## 관련 파일

- `svelte.config.js` — adapter 설정
