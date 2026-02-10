ADR 005. API 응답 필드 네이밍 컨벤션

# 상태

- 승인됨 (2026-02-10)

# 컨텍스트

Supabase Edge Functions는 HTTP API를 통해 클라이언트와 통신하며, GitHub API를
프록시하는 역할을 합니다.

## 핵심 문제

1. **네이밍 컨벤션 불일치**
   - GitHub API는 snake_case를 사용 (예: `total_count`, `incomplete_results`)
   - TypeScript/JavaScript 생태계는 일반적으로 camelCase를 사용
   - 우리 Edge Functions의 일부 필드는 camelCase를 사용 중 (예: `nextCursor`,
     `totalCount`, `hasMore`)

2. **일관성 부족**
   - 같은 응답 객체 내에서 snake_case와 camelCase가 혼재
   - `SearchResponse`: `incomplete_results` (snake_case)와 `nextCursor`
     (camelCase)가 공존
   - GitHub API 필드를 그대로 전달할 때와 자체 필드를 추가할 때 스타일이 다름

3. **유지보수 비용**
   - GitHub API에서 가져온 필드와 자체 생성 필드의 구분이 모호
   - 개발자가 어떤 컨벤션을 사용해야 할지 혼란

# 결정

## Supabase Edge Functions의 HTTP API 응답은 **snake_case**를 사용

모든 Edge Function의 응답 필드명을 snake_case로 통일합니다.

### 적용 범위

- ✅ **Supabase Edge Functions의 HTTP 응답**: 모든 필드를 snake_case로
- ❌ **TypeScript 내부 변수/함수명**: camelCase 유지 (TypeScript 컨벤션)
- ❌ **Frontend 코드**: 별도 결정 (이 ADR의 범위 밖)

### 구체적 변경사항

#### Search Function (`SearchResponse`)

```typescript
// Before (혼재)
{
  "nextCursor": "2:15",           // camelCase
  "totalCount": 1000,              // camelCase
  "hasMore": true,                 // camelCase
  "incomplete_results": false      // snake_case (GitHub API)
}

// After (통일)
{
  "next_cursor": "2:15",           // snake_case
  "total_count": 1000,             // snake_case
  "has_more": true,                // snake_case
  "incomplete_results": false      // snake_case
}
```

#### Store-Token Function

현재 이미 snake_case 사용 중이므로 변경 없음:

```typescript
{
  "success": true,
  "message": "Token stored successfully"
}
```

### 선택 이유

1. **GitHub API와의 일관성**
   - 우리 서비스의 핵심은 GitHub API 프록시
   - GitHub API가 snake_case를 사용하므로 동일한 컨벤션 채택이 자연스러움
   - GitHub API 필드를 그대로 전달할 때 변환 불필요

2. **단일 컨벤션 유지**
   - API 응답 내에서 하나의 스타일로 통일
   - 개발자가 필드명 스타일을 고민할 필요 없음
   - 코드 리뷰 시 일관성 유지 용이

3. **REST API 모범 사례**
   - 많은 REST API 가이드가 snake_case를 권장 (Google API Design Guide 등)
   - 언어 중립적인 표현

## TypeScript 내부 코드는 camelCase 유지

함수 내부의 변수명, 함수명은 TypeScript 컨벤션을 따라 camelCase를 유지합니다.

```typescript
// 내부 변수: camelCase
let nextCursor: string | null = null;
const totalCount = searchData.total_count;

// HTTP 응답: snake_case
const response: SearchResponse = {
    next_cursor: nextCursor,
    total_count: totalCount,
    has_more: hasMore,
};
```

# 영향

## 긍정적 영향

- HTTP API 응답의 일관성 확보
- GitHub API와의 스타일 통일로 혼란 감소
- REST API 모범 사례 준수

## 부정적 영향

- 기존 클라이언트 코드 수정 필요 (Breaking Change)
- TypeScript 타입과 런타임 응답 간 변환 코드 필요

## 완화 전략

- 버전 관리를 통한 점진적 마이그레이션 (필요시)
- 타입 정의를 명확히 하여 컴파일 타임에 오류 검출

# 변경 이력

- 2026-02-10: 초안 작성 및 승인
