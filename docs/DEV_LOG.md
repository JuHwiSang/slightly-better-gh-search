# Development Log

> **Note**: 최신 항목이 위에 위치합니다.

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
