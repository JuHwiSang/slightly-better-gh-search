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

### 📋 개발 체크리스트

새로운 UI 요소 구현 시:
1. [ ] 디자인 참고 파일을 **참고**만 하고, 프로젝트 요구사항에 맞게 조정했는가?
2. [ ] 상표권 문제가 없는가? (GitHub → GH 등)
3. [ ] 모든 UI 요소가 실제로 필요한가?
4. [ ] 아이콘은 컴포넌트로 구현했는가?
5. [ ] CSS import 순서가 올바른가?


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
  - 프로필 사진 (편집 가능)
  - 사용자 이름 및 이메일
  - GitHub 연동 상태 표시
  - API 사용량 표시 (프로그레스 바)
  - 로그아웃 버튼
  - 계정 탈퇴 버튼
- **디자인 참고**: `docs/design/profile.html`
  - 카드 기반 레이아웃
  - 사용량 시각화 (프로그레스 바)
  - 위험한 액션(탈퇴)은 시각적으로 구분

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
  - 상태 표시 (READY, SEARCHING 등)

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
  - 사용자 정보 표시
  - 편집 기능

- **UsageCard** (프로필 페이지)
  - API 사용량 시각화
  - 리셋 일정 안내

### Routing Structure

```
slightly-better-gh-search/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte           # 공통 레이아웃 (Header 포함)
│   │   ├── +page.svelte              # 메인 페이지 (/)
│   │   ├── search/
│   │   │   └── +page.svelte          # 검색 결과 페이지 (/search)
│   │   └── profile/
│   │       └── +page.svelte          # 프로필 페이지 (/profile)
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Header.svelte
│   │   │   ├── SearchBar.svelte
│   │   │   ├── SearchResultCard.svelte
│   │   │   ├── Pagination.svelte
│   │   │   ├── ProfileCard.svelte
│   │   │   └── UsageCard.svelte
│   │   ├── stores/
│   │   │   ├── auth.ts               # 인증 상태 관리
│   │   │   └── search.ts             # 검색 상태 관리
│   │   └── utils/
│   │       ├── filterEvaluator.ts    # 필터 표현식 안전 평가
│   │       └── github.ts             # GitHub API 호출 (Supabase Edge Function 경유)
│   └── app.css                       # 글로벌 스타일
├── supabase/
│   └── functions/
│       └── github-search/            # Supabase Edge Function
│           └── index.ts              # GitHub API 호출 및 캐싱 로직
├── docs/
│   ├── design/                       # 디자인 참고 파일
│   ├── adr/                          # Architecture Decision Records
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

#### 2. **인증 흐름** (Supabase Auth)
- GitHub OAuth 로그인
- 세션 관리 (Supabase Auth)
- 보호된 라우트: `/search`, `/profile`

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

*Last Updated: 2026-01-09*  
*This file should be updated whenever the user identifies issues or provides important feedback.*
