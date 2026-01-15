# Development Log

> **Note**: 최신 항목이 위에 위치합니다.

---

---

## 2026-01-15

### GitHub OAuth Implementation (Supabase)
- **변경사항**: GitHub OAuth 로그인 기능 구현 완료
- **주요 구현**:
  - **Supabase 클라이언트** (`src/lib/supabase.ts`):
    - `@supabase/ssr`의 `createBrowserClient` 사용
    - 환경 변수: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
  - **서버 훅** (`src/hooks.server.ts`):
    - 모든 요청에서 Supabase 서버 클라이언트 생성
    - 쿠키 기반 세션 관리
    - `event.locals.supabase`, `event.locals.safeGetSession` 제공
  - **OAuth Callback** (`src/routes/auth/callback/+server.ts`):
    - `code` → `session` 교환 (`exchangeCodeForSession`)
    - `next` 파라미터로 리다이렉트 경로 지정
    - **보안**: Origin 검증으로 Open Redirect 방지
      ```typescript
      const nextUrl = new URL(next, url.origin);
      if (nextUrl.origin === url.origin) {
        redirect(303, nextUrl.pathname + nextUrl.search);
      }
      ```
  - **인증 상태 관리** (`src/lib/stores/auth.svelte.ts`):
    - Svelte 5 `$state` runes 사용
    - `signInWithGitHub(redirectPath?)`: 로그인 후 리다이렉트 경로 지정 가능
    - `signOut()`: 로그아웃
    - `loadSession()`: 세션 로드 및 `onAuthStateChange` 리스너 등록
  - **UI 연동**:
    - `SearchBar.svelte`: 로그인 버튼에서 검색 URL 생성 후 `signInWithGitHub(redirectPath)` 호출
    - `Header.svelte`: 실제 사용자 데이터 표시 (avatar, name, email)
    - `+layout.svelte`: `onMount`에서 `loadSession()` 호출
  - **TypeScript 타입** (`src/app.d.ts`):
    - `App.Locals`에 `supabase`, `safeGetSession` 추가
    - `App.PageData`에 `session` 추가

### OAuth Flow
1. 사용자가 검색어 입력 후 "Sign in with GitHub" 클릭
2. `handleGitHubLogin()`이 `/search?query=xxx&filter=yyy` URL 생성
3. `signInWithGitHub('/search?query=xxx&filter=yyy')` 호출
4. Callback URL에 `next` 파라미터 포함: `/auth/callback?next=/search?query=xxx`
5. GitHub OAuth 페이지로 리다이렉트
6. GitHub 인증 완료 → `/auth/callback?code=xxx&next=/search?query=xxx`
7. Callback handler:
   - `code` → `session` 교환
   - Origin 검증 (`new URL(next, url.origin)`)
   - `/search?query=xxx`로 리다이렉트
8. 클라이언트에서 세션 로드 및 검색 결과 표시

### Security Improvements
- **Open Redirect 방지**:
  - ❌ 초기: `next.startsWith('/')` 단순 체크
  - ✅ 최종: `new URL(next, url.origin)` 파싱 후 origin 검증
  - 악의적인 절대 URL 차단

### User Feedback & Iterations
1. **Redirect 경로 지정**:
   - ❌ 초기: 현재 페이지로만 리다이렉트
   - ✅ 최종: `signInWithGitHub(redirectPath?)` 파라미터로 지정 가능
   - 예: 메인 페이지에서 검색어 입력 → 로그인 → 검색 결과 페이지
2. **Origin 검증**:
   - ❌ 초기: `startsWith('/')` 단순 체크
   - ✅ 최종: `new URL()` 파싱 후 origin 비교
3. **문서화 실수**:
   - ❌ TRB-001 파일 수정 (트러블슈팅 가이드는 원본 유지해야 함)
   - ❌ DEV_LOG.md 업데이트 누락
   - **교훈**: 구현 완료 시 DEV_LOG.md 업데이트 필수

### Files Created
- `src/lib/supabase.ts`
- `src/hooks.server.ts`
- `src/routes/auth/callback/+server.ts`

### Files Modified
- `src/lib/stores/auth.svelte.ts`
- `src/lib/components/SearchBar.svelte`
- `src/lib/components/Header.svelte`
- `src/routes/+layout.svelte`
- `src/app.d.ts`
- `GEMINI.md` (인증 흐름 문서화)

### Known Issues
- 일부 버그 존재 (추후 수정 예정)

### Next Steps
- [ ] 버그 수정
- [ ] 로그인 필요한 페이지 보호 (middleware)
- [ ] 에러 핸들링 개선

---

## 2026-01-12/13

### SearchBar UX Improvements
- **변경사항**: 입력 검증 및 키보드 네비게이션 개선
- **주요 구현**:
  - **버튼 Disable 상태**:
    - `isQueryEmpty = $derived(!query.trim())` 추가
    - Query 비어있을 때 GitHub 로그인 버튼과 Execute 버튼 모두 disable
    - 시각적 피드백: `pointer-events-none`, `cursor-not-allowed`, 회색 텍스트
    - Alert 제거 → 버튼 상태로 검증 표현
  - **Enter 키 지원**:
    - `handleKeyDown()` 함수 추가
    - 로그아웃 상태: Enter → GitHub 로그인 트리거
    - 로그인 상태: Enter → 검색 실행
    - 두 input 모두에 `onkeydown` 핸들러 적용
  - **레이블 제거**: "Search:", "Filter:" 레이블 제거 (UI 단순화)

### Pagination Redesign
- **변경사항**: 복잡한 ellipsis 로직 → 단순한 5개 숫자 구조
- **주요 구현**:
  - **새로운 구조**: `« < [5개 숫자] > »`
    - First (`«`): 첫 페이지로 이동
    - Previous (`<`): 이전 페이지
    - 5개 페이지 숫자 (현재 페이지 중심)
    - Next (`>`): 다음 페이지
    - Last (`»`): 마지막 페이지로 이동
  - **아이콘 사용**:
    - `IconLucideChevronsLeft` / `IconLucideChevronsRight` (First/Last)
    - `IconLucideChevronLeft` / `IconLucideChevronRight` (Prev/Next)
  - **페이지 번호 로직**:
    - 항상 5개 페이지 표시 (현재 페이지 중심 ±2)
    - 시작/끝 부근에서 자동 조정
    - 일정한 너비 유지
  - **Disable 처리**:
    - 현재 페이지: `<span>` 태그로 클릭 불가 + `pointer-events-none`
    - First/Prev 버튼: 첫 페이지일 때 `pointer-events-none`
    - Last/Next 버튼: 마지막 페이지일 때 `pointer-events-none`

### URL Parameter Persistence
- **변경사항**: Pagination 이동 시 query/filter 유지
- **주요 구현**:
  - `search/+page.svelte`:
    - `currentPage = $derived(parseInt($page.url.searchParams.get('page') || '1', 10))`
    - Pagination에 `{currentPage}`, `{query}`, `{filter}` props 전달
  - `Pagination.svelte`:
    - `query`, `filter` props 추가
    - `buildPageUrl(page)` 헬퍼 함수:
      ```typescript
      function buildPageUrl(page: number): string {
        const params = new URLSearchParams();
        if (query) params.set('query', query);
        if (filter) params.set('filter', filter);
        params.set('page', page.toString());
        return `/search?${params.toString()}`;
      }
      ```
    - 모든 페이지 링크에 `buildPageUrl()` 적용

### Minor UI Adjustments
- **Header**: 패딩 조정 (`py-6` → `py-4`)
- **Header**: 로그아웃 버튼에 `onclick={handleLogout}` 추가
- **SearchBar**: Status bar 레이아웃 조정 (로그인 전/후 일관성)

### Files Modified
- `src/lib/components/SearchBar.svelte`
- `src/lib/components/Pagination.svelte`
- `src/lib/components/Header.svelte`
- `src/routes/search/+page.svelte`
- `docs/adr/ADR-001-system-architecture.md` (GitHub SSO Token 보안 정책 추가)

### User Feedback & Iterations
1. **버튼 Disable 처리**:
   - ❌ 초기: Alert으로 검증
   - ✅ 최종: 버튼 disable + 시각적 피드백
2. **Enter 키 동작**:
   - ❌ 초기: 힌트만 표시, 기능 없음
   - ✅ 최종: 로그인/로그아웃 상태에 따라 분기 처리
3. **Pagination 구조**:
   - ❌ 1차: 7개 요소 (ellipsis 포함)
   - ❌ 2차: 텍스트 기반 `«`, `»`
   - ✅ 최종: 5개 숫자 + Lucide 아이콘
4. **Disable 처리**:
   - ❌ 초기: `aria-disabled`만 사용
   - ✅ 최종: `pointer-events-none` 추가로 실제 클릭 차단

---

## 2026-01-12

### Search URL Parameter Implementation
- **변경사항**: 검색 기능에 URL 쿼리 파라미터 지원 추가
- **주요 구현**:
  - `SearchBar.svelte`: 
    - `$state` runes로 `query`, `filter` 상태 관리
    - `initialQuery`, `initialFilter` props 추가 (URL에서 받은 값으로 초기화)
    - `handleExecute()`: `URLSearchParams`로 URL 생성 후 `/search`로 이동
    - 검색어 빈 값 검증 추가
  - `search/+page.svelte`:
    - `$page.url.searchParams`로 URL 파라미터 읽기
    - `$derived`로 `query`, `filter` 값 추출
    - `query` 없을 시 메인 페이지로 리다이렉트
    - SearchBar에 초기값 전달
    - 디버그 박스 추가 (임시)
  - URL 구조: `/search?query={검색어}&filter={필터표현식}`

### Documentation Structure Decision
- **피드백**: "ADR 너무 복잡함. 간단히 해라. 대안 넣을 필요도 없어"
- **결정**: ADR-002 삭제, `docs/endpoints/search.md`로 이동
- **이유**: 
  - URL 파라미터 구조는 너무 작고 당연한 결정이라 ADR로 하기엔 과함
  - 간단한 엔드포인트 문서가 더 적합
- **교훈**: 
  - ✅ ADR은 **중요하고 복잡한 아키텍처 결정**에만 사용
  - ✅ 간단한 API/엔드포인트 구조는 **별도 문서**로 관리
  - ❌ 모든 결정을 ADR로 만들 필요 없음

### User Feedback & Iterations
1. **ADR 간소화**:
   - ❌ 초기: 대안 3개, 구현 세부사항 포함 (79줄)
   - ✅ 1차 수정: 대안 제거, 핵심만 유지 (34줄)
   - ✅ 최종: ADR 삭제, `docs/endpoints/search.md`로 이동 (15줄)
2. **Placeholder 가시성**:
   - 문제: `placeholder-gray-700`이 너무 어두워 안 보임
   - 해결: `placeholder-gray-500`으로 변경

### Files Modified
- `src/lib/components/SearchBar.svelte`
- `src/routes/search/+page.svelte`
- `docs/endpoints/search.md` (신규)
- `docs/adr/ADR-002-search-url-parameters.md` (삭제)

### Testing Results
- ✅ 기본 검색: `/search?query=useState&filter=`
- ✅ 필터 포함: `/search?query=react+hooks&filter=stars%3E100`
- ✅ 직접 URL 접근 정상 작동
- ✅ query 없을 시 메인 페이지로 리다이렉트
- ✅ 브라우저 뒤로가기/앞으로가기 정상 작동

---

## 2026-01-11

### Authentication UI Implementation
- **변경사항**: 로그인/로그아웃 상태에 따른 조건부 UI 구현
- **주요 구현**:
  - `auth.svelte.ts`: Svelte 5 runes 기반 인증 상태 관리
    - `$state`를 사용한 반응형 상태 (`isAuthenticated`, `user`)
    - `login()`, `logout()` 메서드
  - `SearchBar.svelte`: 조건부 버튼 렌더링
    - 로그인 전: "Sign in with GitHub" (파란색 버튼, h-12, 아이콘 포함)
    - 로그인 후: "Execute" (텍스트 버튼)
  - `Header.svelte`: 로그아웃 기능 연결
  - `+page.svelte`: 하단 패딩 추가 (`pb-24`)로 중앙 정렬 개선

### User Feedback & Iterations
1. **파일명 변경**: `auth.ts` → `auth.svelte.ts` (Svelte 5 runes 사용 명시)
2. **디자인 가이드 활용**:
   - ❌ 초기: 디자인 파일(`main-login-required.html`)을 그대로 복사 시도
   - ✅ 최종: 디자인은 참고만 하고 프로젝트에 맞게 조정
   - **교훈**: 로그인 전/후 완전히 다른 레이아웃 대신, 버튼만 변경하여 일관성 유지
3. **Svelte 5 문법 전환**:
   - ❌ 초기: `writable` store 사용 (Svelte 4 방식)
   - ✅ 최종: `$state` runes 사용 (Svelte 5 방식)
4. **조건부 스타일링 개선**:
   - ❌ 초기: 여러 개의 `class:` 디렉티브 사용 → Tailwind `/` 문자 처리 오류
   - ✅ 최종: 삼항 연산자로 간결하게 처리
5. **시각적 효과 조정**:
   - ❌ 초기: 파란색 링, 글로우, `animate-pulse` 등 과도한 효과
   - ✅ 최종: 버튼 스타일만 강조 (디자인 파일 참고)
6. **레이아웃 조정**:
   - 문제: Header로 인해 콘텐츠가 아래로 밀림
   - 해결: 메인 페이지 하단 패딩 추가 (`pb-24`)

### Technical Decisions
- **상태 관리**: Svelte 5 `$state` runes 사용 (store 대신)
  - 더 간결한 문법, 타입 안정성 향상
  - 클래스 기반으로 메서드 추가 가능
- **UI 패턴**: 최소 변경 원칙
  - 전체 레이아웃은 동일하게 유지
  - 핵심 요소(버튼)만 조건부 렌더링
- **스타일링**: 삼항 연산자 활용
  - Tailwind opacity 구분자(`/`) 문제 회피
  - 가독성 향상 (로그인 전/후 비교 용이)

### Files Modified
- `src/lib/stores/auth.svelte.ts` (신규)
- `src/lib/components/SearchBar.svelte`
- `src/lib/components/Header.svelte`
- `src/routes/+page.svelte`
- `docs/design/main-login-required.html` (신규, 참고용)

### Documentation Updates
- `GEMINI.md`: 3개 새로운 교훈 추가
  - Svelte 5 Runes 사용
  - 조건부 스타일링 패턴
  - 인증 상태 UI 패턴
- 개발 체크리스트 3개 항목 추가
- Component Architecture 업데이트

---

## 2026-01-10

### UI Simplification - Profile Page
- **변경사항**: ProfileCard에서 프로필 사진 편집 버튼 제거
- **이유**: 불필요한 UI 요소 제거 (UI 단순화 원칙)
- **영향받은 파일**:
  - `ProfileCard.svelte`: 편집 버튼 및 관련 wrapper div 제거
  - `IconLucidePencil` import 제거
- **배경**: 프로필 사진 편집 기능이 실제로 구현되지 않았으며, 현재 단계에서 불필요한 UI 요소로 판단

---

## 2026-01-09

### Icon System Implementation
- **변경사항**: Material Symbols 폰트 → unplugin-icons (lucide) 전환
- **이유**: 텍스트 기반 아이콘 대신 실제 아이콘 컴포넌트 사용
- **영향받은 파일**:
  - `Header.svelte`: search, git-branch, bar-chart-2, log-out
  - `SearchBar.svelte`: corner-down-left
  - `SearchResultCard.svelte`: folder-open
  - `Pagination.svelte`: chevron-left, chevron-right
  - `ProfileCard.svelte`: pencil, git-branch
  - `UsageCard.svelte`: bar-chart-2, info
  - `profile/+page.svelte`: log-out, user-minus
- **설정**: `vite.config.ts`에 unplugin-icons 추가

### CSS Import Order Fix
- **문제**: PostCSS 에러 - `@import`가 `@theme` 블록 이후에 위치
- **해결**: `layout.css`에서 모든 `@import`를 최상단으로 이동
- **제거**: Material Symbols 폰트 import 및 관련 스타일

### UI Refinement (User Feedback)
- **브랜딩 변경**:
  - 헤더: "GitScout_" → "Slightly Better GH Search"
  - 메인 타이틀: "SearchRepos" → "Slightly Better GH Search"
  - 부제목: "for GitHub" 명시 추가
- **불필요한 요소 제거**:
  - SearchBar의 READY 상태 표시 제거
  - SearchBar의 MODE: REGEX_ENABLED 제거
- **아이콘 개선**: terminal → search (헤더)

### Initial Frontend Implementation
- **완료된 페이지** (3개):
  - `/`: 메인 랜딩 페이지 (중앙 정렬, 그리드 배경)
  - `/search`: 검색 결과 페이지 (mock 데이터)
  - `/profile`: 프로필 페이지
- **완료된 컴포넌트** (6개):
  - `Header.svelte`: 브랜딩 + 프로필 드롭다운
  - `SearchBar.svelte`: 듀얼 입력 (검색 + 필터)
  - `SearchResultCard.svelte`: 코드 스니펫 + 메타데이터
  - `Pagination.svelte`: 페이지 네비게이션
  - `ProfileCard.svelte`: 사용자 정보
  - `UsageCard.svelte`: API 사용량 시각화
- **스타일 시스템**:
  - Tailwind CSS 4.x 설정
  - 터미널 테마 색상 팔레트
  - 커스텀 폰트 (Inter, JetBrains Mono)
  - 커스텀 스크롤바
- **접근성**:
  - autofocus 제거
  - ARIA roles 추가
  - 키보드 이벤트 핸들러

### Dependencies Installed
- `jsep`: 필터 표현식 파싱용
- `unplugin-icons`: 아이콘 컴포넌트 시스템
- `@iconify/json`: 아이콘 데이터

---

## 향후 작업 (TODO)

### Phase 6: Navigation & Interactions
- [ ] URL 쿼리 파라미터 처리
- [ ] 검색어 상태 관리
- [ ] 페이지 간 라우팅 구현

### Phase 7: Filter Expression Evaluation
- [ ] jsep를 사용한 필터 파서 구현
- [ ] 안전한 표현식 평가 로직
- [ ] 에러 핸들링

### Phase 8: Backend Integration
- [ ] Supabase 설정
- [ ] GitHub OAuth 구현
- [ ] Edge Function 개발 (GitHub API 호출)
- [ ] Upstash Redis 캐싱

### Additional Tasks
- [ ] 반응형 디자인 개선
- [ ] 실제 GitHub API 연동
- [ ] 검색 기록 저장
- [ ] 다크/라이트 모드 토글
