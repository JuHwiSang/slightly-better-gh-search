# Antigravity AI Configuration

## Project Overview

**Project Name**: Slightly Better GitHub Search  
**Purpose**: Enhanced GitHub Code Search with custom filtering capabilities  
**Tech Stack**: SvelteKit (based on open files)

## Core Functionality

This project provides an upgraded version of GitHub Code Search with the following key features:

### Main Features
1. **Dual Input System**:
   - **Main Search Input**: Primary GitHub code search query
   - **Additional Filter Input**: Custom filter expression for advanced filtering
   
2. **Filter Expression**:
   - Single input field (not multiple checkboxes)
   - Safely evaluated as conditional expressions
   - Examples: `stars > 100 && language == 'js'`

### UI Design
- Minimalist interface with only 2 input fields
- Main search input
- Additional filter input

## AI Collaboration Rules

### File Modification Protocol
**CRITICAL**: When the user points out mistakes or issues during collaboration:
1. Document the mistake in this `GEMINI.md` file
2. Add it to the "Common Mistakes to Avoid" section below
3. This ensures the same mistake is not repeated in future interactions

### Documentation Update Protocol
**CRITICAL**: When implementing significant changes or receiving user feedback:
1. **GEMINI.md**: Update "User Feedback Log" with reusable patterns and lessons
2. **DEV_LOG.md**: Update with technical implementation details and iteration history
3. Both documents must be updated together - one without the other is incomplete

### Code Standards
- Follow SvelteKit best practices
- Maintain clean, readable code
- Prioritize safe evaluation of filter expressions (security is critical)

## Common Mistakes to Avoid

### 🚨 Critical Lessons from Development

#### 1. **디자인 참고 파일 사용법**
- ❌ **잘못된 접근**: 디자인 참고 파일(`docs/design/*.html`)을 **그대로** 복사
- ✅ **올바른 접근**: 디자인 파일은 **가이드**일 뿐, 프로젝트에 맞게 **적절히 변형**
- **이유**: 디자인 파일은 AI가 만든 예시일 뿐이며, 실제 프로젝트 요구사항과 다를 수 있음
- **실제 사례**: 
  - `SearchRepos` 타이틀을 그대로 사용 → 실제 프로젝트명 "Slightly Better GH Search"로 변경 필요
  - READY/MODE 상태 표시를 그대로 구현 → 불필요한 요소로 제거됨

#### 2. **브랜딩 및 상표 관리**
- ❌ **잘못된 접근**: 타이틀에 "GitHub" 전체 단어 사용
- ✅ **올바른 접근**: 타이틀은 "GH"로 축약, 부제목에만 "GitHub" 명시
- **이유**: GitHub 상표권 문제 회피
- **구현 예시**:
  ```
  타이틀: "Slightly Better GH Search"
  부제목: "Enhanced code search for GitHub with advanced filtering"
  ```

#### 3. **UI 단순화 원칙**
- ❌ **잘못된 접근**: 디자인에 있는 모든 요소 구현 (READY, MODE 등)
- ✅ **올바른 접근**: 실제로 필요한 기능만 구현, 불필요한 UI 요소 제거
- **판단 기준**: "이 요소가 사용자에게 실질적인 가치를 제공하는가?"
- **제거된 예시**: READY 상태 표시, MODE: REGEX_ENABLED 텍스트

#### 4. **아이콘 시스템**
- ❌ **잘못된 접근**: Material Symbols 폰트를 텍스트로 사용 (`<span>icon_name</span>`)
- ✅ **올바른 접근**: unplugin-icons로 실제 아이콘 컴포넌트 사용
- **이유**: 텍스트 기반 아이콘은 로딩 전까지 아이콘 이름만 표시됨
- **구현**: `~icons/lucide/*` 경로로 import하여 컴포넌트로 사용

#### 5. **CSS Import 순서**
- ❌ **잘못된 접근**: `@theme` 블록 후에 `@import` 사용
- ✅ **올바른 접근**: 모든 `@import`는 `@theme` 블록 **이전**에 위치
- **이유**: PostCSS/Tailwind CSS 요구사항 - @import는 최상단에 위치해야 함

#### 6. **SvelteKit 5 이벤트 핸들러**
- ❌ **잘못된 접근**: `on:click` 등 Svelte 전용 이벤트 핸들러 사용
- ✅ **올바른 접근**: `onclick` 등 표준 DOM 이벤트 속성 사용
- **이유**: SvelteKit 5부터 표준 DOM 이벤트 속성 지원, 더 간결하고 표준에 가까움
- **구현 예시**:
  ```svelte
  <!-- 올바른 방법 -->
  <button onclick={() => window.history.back()}>Back</button>
  
  <!-- 피해야 할 방법 -->
  <button on:click={() => window.history.back()}>Back</button>
  ```

#### 7. **Svelte 5 Runes 사용**
- ❌ **잘못된 접근**: `writable` store 사용 (Svelte 4 방식)
- ✅ **올바른 접근**: `$state` runes 사용 (Svelte 5 방식)
- **이유**: 더 간결하고 직관적인 문법, 타입 안정성 향상
- **구현 예시**:
  ```typescript
  // ✅ Svelte 5 방식
  class AuthState {
    user = $state<User | null>(null);
    isAuthenticated = $state(false);
  }
  export const authState = new AuthState();
  
  // ❌ Svelte 4 방식
  export const user = writable<User | null>(null);
  export const isAuthenticated = writable(false);
  ```

#### 8. **조건부 스타일링 패턴**
- ❌ **잘못된 접근**: 여러 개의 `class:` 디렉티브 사용
- ✅ **올바른 접근**: 삼항 연산자로 한 번에 처리
- **이유**: 
  - Tailwind의 `/` 문자 (opacity 구분자) 처리 문제 회피
  - 가독성 향상 (로그인 전/후 스타일 비교 용이)
  - 성능 (조건 체크 1번만 수행)
- **구현 예시**:
  ```svelte
  <!-- ✅ 올바른 방법 -->
  <div class="{authState.isAuthenticated
    ? 'border-gray-700 bg-dark'
    : 'border-blue-500 bg-blue-900'} base-classes">
  
  <!-- ❌ 피해야 할 방법 -->
  <div class="base-classes"
    class:border-gray-700={authState.isAuthenticated}
    class:bg-dark={authState.isAuthenticated}
    class:border-blue-500={!authState.isAuthenticated}
    class:bg-blue-900={!authState.isAuthenticated}>
  ```

#### 9. **인증 상태 UI 패턴**
- ❌ **잘못된 접근**: 로그인 전/후 완전히 다른 레이아웃 구성
- ✅ **올바른 접근**: 기본 레이아웃 유지, 핵심 요소만 조건부 렌더링
- **이유**: 일관된 사용자 경험, 코드 중복 최소화
- **구현 예시**:
  ```svelte
  <!-- ✅ 올바른 방법: 버튼만 변경 -->
  <SearchBar>
    {#if !authState.isAuthenticated}
      <button>Sign in with GitHub</button>
    {:else}
      <button>Execute</button>
    {/if}
  </SearchBar>
  
  <!-- ❌ 피해야 할 방법: 전체 레이아웃 분기 -->
  {#if !authState.isAuthenticated}
    <LoginLayout />
  {:else}
    <SearchLayout />
  {/if}
  ```

### 📝 User Feedback Log (2026-01-11)

오늘 작업 중 받은 피드백과 **재사용 가능한** 교훈:

#### 1. **디자인 가이드 활용 원칙** (재확인)
- **상황**: 로그인 전/후 완전히 다른 레이아웃 구현
- **피드백**: "로그인전/로그인후 메인화면이 아주 그냥 천차만별이야? 딱 github 버튼과 execute 버튼, 딱 그 부분만 달라야지"
- **재사용 가능한 교훈**: 
  - 디자인 파일은 **영감**일 뿐, 프로젝트 요구사항에 맞게 조정
  - 상태 변화 시 **최소한의 UI 변경**만 적용 (일관성 유지)
  - 이미 위의 "Common Mistakes #1, #9"에 문서화됨

#### 2. **조건부 스타일링 베스트 프랙티스** (재확인)
- **상황**: 여러 `class:` 디렉티브 사용 → Tailwind `/` 문자 오류
- **피드백**: "'/'는 처리가 안된다. 걍 한번만 해라. {authState.isAuthenticated ? ~ : ~} 이거 써라"
- **재사용 가능한 교훈**:
  - 삼항 연산자로 조건부 스타일 한 번에 처리
  - 이미 위의 "Common Mistakes #8"에 문서화됨

#### 3. **시각적 효과의 절제**
- **상황**: 과도한 링, 글로우, 애니메이션 효과
- **피드백**: "너무 반짝반짝하잖음. 걍 버튼 스타일만 좀 그 로그인처럼 만들어보셈"
- **재사용 가능한 교훈**:
  - 디자인 파일의 **핵심 요소**만 차용 (버튼 스타일)
  - 과도한 장식(글로우, 펄스 등)은 제거
  - **원칙**: "디자인 파일처럼"이 아니라 "디자인 파일의 의도처럼"

#### 4. **피드백 문서화 메타 원칙** ⭐
- **상황**: 상황별 해결책(패딩 추가)을 피드백으로 기록
- **피드백**: "'이 피드백을 쓰면 나중에 이 실수를 안할 수 있겠네' 이런 거만 써야지, 뭔 '패딩좀 넣자' 이런걸 하고 있니"
- **재사용 가능한 교훈**:
  - ✅ **패턴/원칙**만 기록: "삼항 연산자 사용", "최소 UI 변경"
  - ❌ **특정 해결책**은 기록 안 함: "패딩 추가", "색상 변경"
  - **판단 기준**: "이 피드백이 다른 상황에서도 도움이 될까?"
  - **목적**: 미래의 실수 방지, 작업 일지가 아님

### 📝 User Feedback Log (2026-01-12)

#### 5. **ADR 작성 기준** ⭐
- **상황**: URL 쿼리 파라미터 구조를 ADR-002로 작성 (대안 3개, 구현 세부사항 포함, 79줄)
- **피드백**: "ADR 너무 복잡함. 좀 간단히좀 해라. 대안 넣을 필요도 없어 임마. 너무 당연한거다라... 구현세부사항같은 소리하네"
- **최종 결정**: ADR 삭제, `docs/endpoints/search.md`로 이동 (15줄)
- **재사용 가능한 교훈**:
  - ✅ **ADR은 중요하고 복잡한 아키텍처 결정에만 사용**
    - 예: 시스템 아키텍처 선택 (SvelteKit vs Next.js, Supabase vs Firebase)
    - 예: 보안 관련 중요 결정 (인증 방식, 데이터 암호화)
  - ✅ **간단하고 당연한 결정은 별도 문서로**
    - URL 구조 → `docs/endpoints/`
    - API 스펙 → `docs/api/`
  - ❌ **ADR에 불필요한 내용**:
    - 너무 당연한 대안들 (URL vs localStorage 등)
    - 구현 세부사항 (코드에 있는 내용)
  - **판단 기준**: "이 결정이 나중에 바뀌면 시스템 전체에 큰 영향을 주는가?"

### 📝 User Feedback Log (2026-01-12/13)

#### 6. **버튼 Disable 상태 처리** ⭐
- **상황**: Query 없을 때 alert 표시
- **피드백**: "query 없을땐 alert하는 게 아니라 button 자체가 disable되어야함. 이때 disable되었다는게 시각적으로 잘 보여야겠지?"
- **재사용 가능한 교훈**:
  - ✅ **입력 검증은 버튼 상태로 표현**
    - Alert/경고 메시지 대신 버튼 disable
    - `$derived`로 입력값 검증 상태 계산
    - 시각적 피드백: 회색 텍스트, `cursor-not-allowed`, `pointer-events-none`
  - ✅ **실제로 클릭 불가능하게 만들기**
    - `disabled` 속성만으로는 부족 (aria-disabled만 있는 경우)
    - `pointer-events-none` 추가로 모든 마우스 이벤트 차단
  - **구현 예시**:
    ```svelte
    let isQueryEmpty = $derived(!query.trim());
    
    <button
      disabled={isQueryEmpty}
      class="{isQueryEmpty 
        ? 'pointer-events-none cursor-not-allowed text-gray-600' 
        : 'hover:text-white'}"
    >
    ```

#### 7. **키보드 네비게이션 UX** ⭐
- **상황**: Enter 키 힌트만 표시, 실제 동작 없음
- **피드백**: "ENTER to execute 만들려면 search나 filter쪽에 좀 로직 추가해야겠지?"
- **추가 피드백**: "얌마. input에서 enter 쳤을때 현재 로그아웃이면 알아서 깃헙클릭으로 들어가야지...."
- **재사용 가능한 교훈**:
  - ✅ **키보드 힌트는 실제 동작과 일치해야 함**
    - 힌트만 표시하고 기능 없으면 안 됨
    - `onkeydown` 핸들러로 Enter 키 처리
  - ✅ **상태에 따른 Enter 키 동작 분기**
    - 로그아웃 상태: Enter → GitHub 로그인
    - 로그인 상태: Enter → 검색 실행
  - **구현 예시**:
    ```svelte
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        if (authState.isAuthenticated) {
          handleExecute();
        } else {
          handleGitHubLogin();
        }
      }
    }
    ```

#### 8. **Pagination UI 단순화** ⭐
- **상황**: 복잡한 ellipsis 로직 (7개 요소, 조건부 `...` 표시)
- **피드백**: "이것보단 걍 << < 숫자5개 > >> 이 구조로 하는게 어떰"
- **추가 피드백**: "임마 <<랑 >> 아이콘으로 해야지.... 뭔 텍스트로 하고앉아있어"
- **재사용 가능한 교훈**:
  - ✅ **복잡한 로직보다 단순하고 일관된 UI**
    - Ellipsis 조건 분기 제거
    - 항상 5개 페이지 표시 (현재 페이지 중심)
    - First/Last 버튼 추가로 모든 페이지 접근 가능
  - ✅ **아이콘 일관성**
    - 텍스트(`«`, `»`) 대신 Lucide 아이콘 사용
    - `IconLucideChevronsLeft`, `IconLucideChevronsRight`
  - **최종 구조**: `« < [5개 숫자] > »`
    - 너비 일정, 예측 가능한 레이아웃
    - 모든 disabled 버튼에 `pointer-events-none`

#### 9. **URL 쿼리 파라미터 유지** ⭐
- **상황**: Pagination 클릭 시 query/filter 초기화
- **피드백**: "search 페이지에서 하단 page 바꿀때 초기화되는 이슈나 해결하슈.... url 어디로 갈지를 선택해야지..."
- **재사용 가능한 교훈**:
  - ✅ **네비게이션 시 상태 유지**
    - URL 파라미터로 모든 검색 상태 관리
    - Pagination에 query/filter props 전달
    - `buildPageUrl()` 헬퍼로 모든 파라미터 포함
  - **구현 예시**:
    ```typescript
    function buildPageUrl(page: number): string {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (filter) params.set('filter', filter);
      params.set('page', page.toString());
      return `/search?${params.toString()}`;
    }
    ```


### 📝 User Feedback Log (2026-01-15)

#### 10. **문서 업데이트 프로토콜 위반** ⭐⭐⭐
- **상황**: GitHub OAuth 구현 완료 후 TRB-001 파일을 수정하고 DEV_LOG.md 업데이트를 누락
- **재사용 가능한 교훈**:
  - ❌ **TRB (Troubleshooting) 파일은 절대 수정하지 않음**
    - TRB는 문제 해결 가이드로, 원본 그대로 유지
    - 완료 여부나 구현 세부사항을 TRB에 추가하면 안 됨
  - ✅ **구현 완료 시 반드시 DEV_LOG.md 업데이트**
    - 기술적 구현 세부사항
    - 변경 이력 및 날짜
    - 주요 결정 사항
  - ✅ **문서 업데이트 체크리스트** (GEMINI.md 라인 36-40 참조):
    1. GEMINI.md: 재사용 가능한 패턴/원칙만 기록
    2. DEV_LOG.md: 기술 구현 세부사항 및 이력
    3. **둘 다 업데이트해야 완전함**
  - **판단 기준**: 
    - "이 변경사항이 다른 개발자가 알아야 할 구현 이력인가?" → DEV_LOG.md
    - "이 실수가 미래에 반복될 수 있는 패턴인가?" → GEMINI.md
    - "이 파일이 문제 해결 가이드인가?" → 수정 금지 (TRB)


### 📋 개발 체크리스트

새로운 UI 요소 구현 시:
1. [ ] 디자인 참고 파일을 **참고**만 하고, 프로젝트 요구사항에 맞게 조정했는가?
2. [ ] 상표권 문제가 없는가? (GitHub → GH 등)
3. [ ] 모든 UI 요소가 실제로 필요한가?
4. [ ] 아이콘은 컴포넌트로 구현했는가?
5. [ ] CSS import 순서가 올바른가?
6. [ ] Svelte 5 runes (`$state`, `$derived`)를 사용했는가?
7. [ ] 조건부 스타일링은 삼항 연산자로 간결하게 처리했는가?
8. [ ] 인증 상태 UI는 최소한의 변경만 적용했는가?


## Project Structure

### Page Architecture

프로젝트는 **3개의 주요 페이지**로 구성됩니다:

#### 1. **메인 페이지** (`/`)
- **목적**: 검색 시작점, 프로젝트 소개
- **주요 요소**:
  - 프로젝트 이름 및 설명 (중앙 정렬, 터미널 스타일)
  - 검색창 (Search input)
  - 필터 입력창 (Filter input)
  - 우측 상단 프로필 아이콘 (드롭다운 메뉴 트리거)
- **디자인 참고**: `docs/design/main.html`
  - 터미널 테마 (다크 모드, 모노스페이스 폰트)
  - 중앙 정렬 레이아웃
  - 그리드 배경 패턴
  - 검색/필터 입력창이 터미널 패널처럼 보임

#### 2. **검색 결과 페이지** (`/search`)
- **목적**: GitHub 검색 결과 표시 및 필터링
- **주요 요소**:
  - 상단 헤더 (프로젝트 이름, 프로필 아이콘)
  - 검색창 + 필터 입력창 (상단 고정, 메인 페이지와 동일한 형태)
  - 검색 결과 목록:
    - 레포지토리 이름 (링크)
    - 파일 경로
    - 코드 스니펫 (라인 번호 포함)
    - 메타데이터 (언어, 스타 수, 업데이트 시간)
  - 페이지네이션
- **디자인 참고**: `docs/design/search-result.html`
  - 코드 스니펫에 syntax highlighting
  - 라인 번호 표시
  - 커스텀 스크롤바
  - 반응형 레이아웃

#### 3. **프로필 페이지** (`/profile`)
- **목적**: 사용자 정보 및 계정 관리
- **주요 요소**:
  - **뒤로가기 버튼** (좌측 상단): 브라우저 히스토리 뒤로가기 (`window.history.back()`)
  - 프로필 사진
  - 사용자 이름 및 이메일
  - GitHub 연동 상태 표시
  - API 사용량 표시 (프로그레스 바)
  - 로그아웃 버튼
  - **계정 탈퇴 버튼**: 클릭 시 확인 다이얼로그 표시
    - Native HTML `<dialog>` 요소 사용
    - 경고 아이콘과 명확한 경고 메시지
    - Cancel / Delete Account 버튼
- **디자인 참고**: `docs/design/profile.html`
  - 카드 기반 레이아웃
  - 사용량 시각화 (프로그레스 바)
  - 위험한 액션(탈퇴)은 시각적으로 구분 (빨간색 테두리 + 배경)
  - 삭제 확인 다이얼로그는 화면 중앙에 표시

### Component Architecture

#### 공통 컴포넌트
- **Header** (모든 페이지)
  - 프로젝트 로고/이름
  - 프로필 아이콘 + 드롭다운 메뉴
    - 프로필 사진
    - 사용자 이름
    - API 사용량 (간략)
    - "프로필 상세" 버튼 → `/profile`로 이동
    - 로그아웃 버튼

- **SearchBar** (메인, 검색 결과 페이지)
  - 검색 입력창
  - 필터 입력창
  - 터미널 스타일 UI
  - **조건부 버튼**: 
    - 로그인 전: "Sign in with GitHub" (파란색 버튼)
    - 로그인 후: "Execute" (텍스트 버튼)

#### 페이지별 컴포넌트
- **SearchResultCard** (검색 결과 페이지)
  - 레포지토리 정보
  - 파일 경로
  - 코드 스니펫
  - 메타데이터

- **Pagination** (검색 결과 페이지)
  - 페이지 번호
  - 이전/다음 버튼

- **ProfileCard** (프로필 페이지)
  - 사용자 정보 표시 (프로필 사진, 이름, 이메일, GitHub 연동 상태)

- **UsageCard** (프로필 페이지)
  - API 사용량 시각화
  - 리셋 일정 안내

### Routing Structure

```
slightly-better-gh-search/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte           # 공통 레이아웃 (세션 초기화)
│   │   ├── +page.svelte              # 메인 페이지 (/)
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── +server.ts        # OAuth callback 처리
│   │   ├── search/
│   │   │   └── +page.svelte          # 검색 결과 페이지 (/search)
│   │   └── profile/
│   │       └── +page.svelte          # 프로필 페이지 (/profile)
│   ├── lib/
│   │   ├── supabase.ts               # Supabase 브라우저 클라이언트
│   │   ├── components/
│   │   │   ├── Header.svelte
│   │   │   ├── SearchBar.svelte
│   │   │   ├── SearchResultCard.svelte
│   │   │   ├── Pagination.svelte
│   │   │   ├── ProfileCard.svelte
│   │   │   └── UsageCard.svelte
│   │   ├── stores/
│   │   │   ├── auth.svelte.ts        # 인증 상태 관리 (Svelte 5 runes)
│   │   │   └── search.ts             # 검색 상태 관리
│   │   └── utils/
│   │       ├── filterEvaluator.ts    # 필터 표현식 안전 평가
│   │       └── github.ts             # GitHub API 호출 (Supabase Edge Function 경유)
│   ├── hooks.server.ts               # 서버 훅 (세션 관리)
│   ├── app.d.ts                      # TypeScript 타입 정의
│   └── app.css                       # 글로벌 스타일
├── supabase/
│   └── functions/
│       └── github-search/            # Supabase Edge Function
│           └── index.ts              # GitHub API 호출 및 캐싱 로직
├── docs/
│   ├── design/                       # 디자인 참고 파일
│   ├── adr/                          # Architecture Decision Records
│   ├── troubleshooting/              # 트러블슈팅 가이드
│   └── github/                       # GitHub API 문서
└── GEMINI.md                         # 이 파일
```

### Technical Implementation Notes

#### 1. **GitHub API 호출 구조** (ADR-001 기반)
- **클라이언트** → **Supabase Edge Function** → **GitHub API**
- Edge Function에서:
  - GitHub API 호출
  - Redis (Upstash) 캐싱 (24시간)
  - Rate limit 관리
  - 결과 반환

#### 2. **인증 흐름** (Supabase Auth + GitHub OAuth)
- **구현 완료**: GitHub OAuth 로그인 (2026-01-15)
- **권한 스코프**: `read:user` (이메일 접근으로 중복 로그인 방지)
- **세션 관리**: Supabase Auth (서버 사이드 세션)
- **보호된 라우트**: `/search`, `/profile`

**인증 플로우**:
1. 사용자가 "Sign in with GitHub" 버튼 클릭
2. `authState.signInWithGitHub(redirectPath?)` 호출
   - 현재 페이지 또는 지정된 경로를 `next` 파라미터로 전달
3. GitHub OAuth 페이지로 리다이렉트
4. GitHub 인증 완료 → `/auth/callback?code=xxx&next=/search`
5. Callback handler에서:
   - `code` → `session` 교환 (`exchangeCodeForSession`)
   - Origin 검증 (Open Redirect 방지)
   - `next` 경로로 리다이렉트
6. 클라이언트에서 세션 로드 (`loadSession()`)

**주요 파일**:
- `src/lib/supabase.ts`: Supabase 브라우저 클라이언트
- `src/hooks.server.ts`: 서버 훅 (모든 요청에서 세션 확인)
- `src/routes/auth/callback/+server.ts`: OAuth callback 처리
- `src/lib/stores/auth.svelte.ts`: 인증 상태 관리

**상태 관리** (`auth.svelte.ts`):
- Svelte 5 `$state` runes 사용
- `authState.isAuthenticated`: 로그인 여부
- `authState.user`: 사용자 정보 (id, name, email, avatar_url)
- `authState.signInWithGitHub(redirectPath?)`: GitHub OAuth 로그인
- `authState.signOut()`: 로그아웃
- `authState.loadSession()`: 세션 로드 및 변경 감지

#### 3. **필터 표현식 평가**
- **보안 우선**: `eval()` 사용 금지
- 안전한 파서 구현 또는 라이브러리 사용
- 허용된 연산자: `>`, `<`, `>=`, `<=`, `==`, `!=`, `&&`, `||`
- 허용된 필드: `stars`, `forks`, `language`, `path`, 등

#### 4. **스타일링 방향**
- 디자인 참고 파일의 **터미널/코드 에디터 테마** 유지
- 다크 모드 기본
- 모노스페이스 폰트 (JetBrains Mono, Fira Code)
- **아이콘**: Lucide 아이콘 (unplugin-icons 사용)
- Tailwind CSS 사용 (디자인 파일에서 사용 중)

#### 5. **배포 구조** (ADR-001 기반)
- **Frontend**: Vercel (자동 배포)
- **Edge Function**: Supabase (GitHub Actions로 자동 배포)
- **캐시**: Upstash Redis
- **인증**: Supabase Auth

## Development Notes

- **Primary Audience**: This documentation is written for AI assistants to understand project context
- **Update Frequency**: Update this file whenever user feedback reveals areas for improvement
- **Filter Safety**: All filter expressions must be safely evaluated to prevent code injection

## Future Considerations

- Filter expression syntax documentation
- Error handling for invalid filter expressions
- Performance optimization for large result sets
- Caching strategy for GitHub API responses

---

*Last Updated: 2026-01-15*  
*This file should be updated whenever the user identifies issues or provides important feedback.*
