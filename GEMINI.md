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

> **Note**: This section will be populated as the user provides feedback during development.

<!-- User-reported issues will be documented here -->

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
- Material Symbols 아이콘
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
