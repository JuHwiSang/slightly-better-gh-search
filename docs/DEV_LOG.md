# Development Log

> **Note**: 최신 항목이 위에 위치합니다.

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
