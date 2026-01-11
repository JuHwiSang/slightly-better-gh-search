# Search Endpoint

## URL Structure

`/search?query={검색어}&filter={필터표현식}`

## Parameters

- `query` (required): GitHub code search 검색어
- `filter` (optional): 추가 필터 표현식, 없으면 빈 문자열

## Examples

```
/search?query=useState&filter=
/search?query=useState&filter=stars>100
/search?query=react+hooks&filter=language==js
```

## Behavior

- `query` 파라미터가 없으면 메인 페이지(`/`)로 리다이렉트
- URL 파라미터는 SearchBar 컴포넌트의 입력 필드에 자동으로 채워짐
- 검색어/필터 수정 후 EXECUTE 시 URL 업데이트
