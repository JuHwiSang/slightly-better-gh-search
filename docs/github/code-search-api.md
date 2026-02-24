# GitHub Code Search API Documentation

## Overview

The GitHub Code Search API allows you to search for code across GitHub
repositories. This endpoint returns up to 100 results per page and supports text
match metadata for file content and file path fields.

### General Search Behavior

- **Result Limit**: Up to **1,000 results** total for each search (across all
  pages)
- **Ranking**: Results are sorted by **best match** in descending order by
  default
  - Multiple factors are combined to boost the most relevant items to the top
  - Custom sort options can be provided via query parameters (though this is
    being phased out)
- **Pagination**: Like Google search, you can browse multiple pages to find the
  best match

### Custom Rate Limits for Search

> [!IMPORTANT]
> The Search API has different rate limits than other GitHub REST API endpoints.

- **Authenticated requests**:
  - **Code Search**: 10 requests per minute (requires authentication)
  - **Other search endpoints**: 30 requests per minute
- **Unauthenticated requests**: 10 requests per minute (all search endpoints)

For information about determining your current rate limit status, see the
[Rate Limit documentation](https://docs.github.com/en/rest/rate-limit).

## Endpoint

```
GET /search/code
```

## Authentication

- **Required**: No (for public resources only)
- **Rate Limit**: 10 requests per minute (when authenticated)
- **Supported Token Types**:
  - GitHub App user access tokens
  - GitHub App installation access tokens
  - Fine-grained personal access tokens (no specific permissions required)

## Parameters

### Headers

| Name                   | Type   | Description                                             |
| ---------------------- | ------ | ------------------------------------------------------- |
| `accept`               | string | Setting to `application/vnd.github+json` is recommended |
| `X-GitHub-Api-Version` | string | API version (e.g., `2022-11-28`)                        |

### Query Parameters

| Name       | Type    | Required | Description                                                                | Default    |
| ---------- | ------- | -------- | -------------------------------------------------------------------------- | ---------- |
| `q`        | string  | ✅ Yes   | Search query containing keywords and qualifiers                            | -          |
| `sort`     | string  | No       | Sort results by recency of indexing. **Note: This field is closing down.** | best match |
| `order`    | string  | No       | Sort order: `desc` or `asc`. **Note: This field is closing down.**         | `desc`     |
| `per_page` | integer | No       | Results per page (max 100)                                                 | 30         |
| `page`     | integer | No       | Page number for pagination                                                 | 1          |

## Query Syntax

The `q` parameter supports various qualifiers to refine your search.

### Query Construction

A query can contain any combination of search qualifiers supported on GitHub.
The format is:

```
SEARCH_KEYWORD_1 SEARCH_KEYWORD_N QUALIFIER_1 QUALIFIER_N
```

> [!CAUTION]
> Be sure to use your language's preferred HTML-encoder to construct query
> strings.

**JavaScript Example**:

```javascript
const queryString = "q=" +
  encodeURIComponent("GitHub Octocat in:readme user:defunkt");
```

### Query Length Limitations

You **cannot** use queries that:

- Are longer than **256 characters** (not including operators or qualifiers)
- Have more than **five** `AND`, `OR`, or `NOT` operators

Queries exceeding these limits will return a **"Validation failed"** error
message.

### Example Query

```
q=addClass+in:file+language:js+repo:jquery/jquery
```

This searches for:

- Keyword: `addClass`
- Location: `in:file` (within file contents)
- Language: `language:js` (JavaScript files)
- Repository: `repo:jquery/jquery` (specific repository)

### Common Qualifiers

- `in:file` - Search in file contents
- `in:path` - Search in file paths
- `language:LANGUAGE` - Filter by programming language
- `repo:OWNER/REPO` - Search in specific repository
- `user:USERNAME` - Search in user's repositories
- `org:ORGNAME` - Search in organization's repositories
- `path:PATH` - Search in specific path
- `filename:FILENAME` - Search by filename
- `extension:EXT` - Search by file extension

## Search Restrictions

Due to the complexity of searching code, the following restrictions apply:

1. **Default Branch Only**: Only the default branch (usually `master` or `main`)
   is searched
2. **File Size Limit**: Only files smaller than 384 KB are searchable
3. **Minimum Search Term**: At least one search term is required
   - ❌ Invalid: `language:go`
   - ✅ Valid: `amazing language:go`

### Search Scope Limits

> [!NOTE]
> To keep the API fast for everyone, GitHub limits the number of repositories
> searched.

- The API will find up to **4,000 repositories** that match your filters
- Results are returned only from those repositories
- Use specific qualifiers (`repo:`, `user:`, `org:`) to narrow your search scope

### Timeouts and Incomplete Results

> [!NOTE]
> To keep the API fast for everyone, individual queries have time limits.

- For queries that **exceed the time limit**:
  - The API returns matches found **before the timeout**
  - The response has `incomplete_results` set to `true`
- **Important**: Reaching a timeout does NOT necessarily mean results are
  incomplete
  - More results might have been found, but also might not

### Access Errors and Missing Results

> [!WARNING]
> You must successfully authenticate and have access to repositories in your
> search queries.

**Authentication Required**:

- Without proper authentication and access, you'll receive:
  - **422 Unprocessable Entry** error
  - Message: "Validation Failed"

**Partial Results Behavior**:

- When your query requests **multiple resources** (e.g., multiple repos):
  - Response contains **only resources you have access to**
  - **No error message** for inaccessible resources
  - This mimics how search works on GitHub.com

**Example**:

```
Query: repo:octocat/test repo:codertocat/test
Access: Only octocat/test
Result: Only shows results from octocat/test (no error for codertocat/test)
```

## Response Format

### HTTP Status Codes

| Status Code | Description                                         |
| ----------- | --------------------------------------------------- |
| 200         | OK - Successful request                             |
| 304         | Not modified                                        |
| 403         | Forbidden                                           |
| 422         | Validation failed, or the endpoint has been spammed |
| 503         | Service unavailable                                 |

### Response Body Structure

```json
{
  "total_count": 7,
  "incomplete_results": false,
  "items": [
    {
      "name": "classes.js",
      "path": "src/attributes/classes.js",
      "sha": "d7212f9dee2dcc18f084d7df8f417b80846ded5a",
      "url": "https://api.github.com/repositories/167174/contents/src/attributes/classes.js?ref=825ac3773694e0cd23ee74895fd5aeb535b27da4",
      "git_url": "https://api.github.com/repositories/167174/git/blobs/d7212f9dee2dcc18f084d7df8f417b80846ded5a",
      "html_url": "https://github.com/jquery/jquery/blob/825ac3773694e0cd23ee74895fd5aeb535b27da4/src/attributes/classes.js",
      "repository": {
        "id": 167174,
        "node_id": "MDEwOlJlcG9zaXRvcnkxNjcxNzQ=",
        "name": "jquery",
        "full_name": "jquery/jquery",
        "owner": {
          "login": "jquery",
          "id": 70142,
          "node_id": "MDQ6VXNlcjcwMTQy",
          "avatar_url": "https://0.gravatar.com/avatar/6906f317a4733f4379b06c32229ef02f?d=https%3A%2F%2Fidenticons.github.com%2Ff426f04f2f9813718fb806b30e0093de.png",
          "gravatar_id": "",
          "url": "https://api.github.com/users/jquery",
          "html_url": "https://github.com/jquery",
          "type": "Organization",
          "site_admin": false
        },
        "private": false,
        "html_url": "https://github.com/jquery/jquery",
        "description": "jQuery JavaScript Library",
        "fork": false
      },
      "score": 1
    }
  ]
}
```

### Response Fields

#### Top-Level Fields

**Access path**: `data`

| Field                | Type    | Description                        |
| -------------------- | ------- | ---------------------------------- |
| `total_count`        | integer | Total number of matching results   |
| `incomplete_results` | boolean | Whether the results are incomplete |
| `items`              | array   | Array of search result items       |

#### Item Fields

**Access path**: `data.items[i]`

| Field        | Type   | Description                             |
| ------------ | ------ | --------------------------------------- |
| `name`       | string | File name                               |
| `path`       | string | Full path to the file in the repository |
| `sha`        | string | Git SHA hash of the file                |
| `url`        | string | API URL to fetch file contents          |
| `git_url`    | string | Git API URL for the blob                |
| `html_url`   | string | Web URL to view the file on GitHub      |
| `repository` | object | Repository information (see below)      |
| `score`      | number | Search relevance score                  |

#### Repository Object

**Access path**: `data.items[i].repository`

| Field         | Type    | Description                       |
| ------------- | ------- | --------------------------------- |
| `id`          | integer | Repository ID                     |
| `node_id`     | string  | GraphQL node ID                   |
| `name`        | string  | Repository name                   |
| `full_name`   | string  | Full repository name (owner/repo) |
| `owner`       | object  | Owner information                 |
| `private`     | boolean | Whether the repository is private |
| `html_url`    | string  | Repository web URL                |
| `description` | string  | Repository description            |
| `fork`        | boolean | Whether the repository is a fork  |

## Usage Example (Octokit.js)

```javascript
// Octokit.js
// https://github.com/octokit/core.js#readme
const octokit = new Octokit({
  auth: "YOUR_PERSONAL_ACCESS_TOKEN", // Optional for public repos
});

const response = await octokit.request("GET /search/code", {
  q: "addClass in:file language:js repo:jquery/jquery",
  per_page: 30,
  page: 1,
  headers: {
    "X-GitHub-Api-Version": "2022-11-28",
  },
});

console.log(`Found ${response.data.total_count} results`);
console.log(response.data.items);
```

## Text Match Metadata

> [!TIP]
> On GitHub, you can use context provided by code snippets and highlights in
> search results.

The Search API returns additional metadata that allows you to **highlight
matching search terms** when displaying results.

### Requesting Text Match Metadata

To receive text match metadata, specify the `text-match` media type in your
`Accept` header:

```
Accept: application/vnd.github.text-match+json
```

### Response Structure

When you provide the `text-match` media type, you'll receive an extra key called
`text_matches` in the JSON payload.

#### Text Match Object Fields

| Field         | Description                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| `object_url`  | URL for the resource containing a string property matching search terms      |
| `object_type` | Type of resource at the given `object_url`                                   |
| `property`    | Name of the property in the resource that matches (e.g., `"body"`, `"path"`) |
| `fragment`    | Subset of the `property` value containing the matching text                  |
| `matches`     | Array of search terms present in `fragment` with their positions             |

#### Match Object Fields

| Field     | Description                                                                |
| --------- | -------------------------------------------------------------------------- |
| `text`    | The matching search term                                                   |
| `indices` | Array of two integers `[start, end]` indicating the position in `fragment` (**UTF-8 byte offsets**, not character offsets) |

### Example Request

```bash
curl -H 'Accept: application/vnd.github.text-match+json' \
  'https://api.github.com/search/issues?q=windows+label:bug+language:python+state:open&sort=created&order=asc'
```

### Example Response

```json
{
  "text_matches": [
    {
      "object_url": "https://api.github.com/repositories/215335/issues/132",
      "object_type": "Issue",
      "property": "body",
      "fragment": "comprehensive windows font I know of).\n\nIf we can find a commonly distributed windows font that supports them then no problem (we can use html font tags) but otherwise the '(21)' style is probably better.\n",
      "matches": [
        {
          "text": "windows",
          "indices": [14, 21]
        },
        {
          "text": "windows",
          "indices": [78, 85]
        }
      ]
    },
    {
      "object_url": "https://api.github.com/repositories/215335/issues/comments/25688",
      "object_type": "IssueComment",
      "property": "body",
      "fragment": " right after that are a bit broken IMHO :). I suppose we could have some hack that maxes out at whatever the font does...\n\nI'll check what the state of play is on Windows.\n",
      "matches": [
        {
          "text": "Windows",
          "indices": [163, 170]
        }
      ]
    }
  ]
}
```

### Understanding the Example

**First text match**:

- **Location**: Issue body (`property: "body"`)
- **Fragment**: Excerpt from the issue body
- **Matches**: The term "windows" appears **twice** in the fragment
  - First occurrence: characters 14-21
  - Second occurrence: characters 78-85

**Second text match**:

- **Location**: Issue comment body (`object_type: "IssueComment"`)
- **Fragment**: Excerpt from the comment body
- **Matches**: The term "Windows" appears **once** at characters 163-170

> [!NOTE]
> The indices in `matches` are **relative to the fragment**, not the full
> property content.

> [!WARNING]
> The `indices` values are **UTF-8 byte offsets**, not character offsets.
> For ASCII-only text these are identical, but for multi-byte characters
> (e.g., CJK, emoji, accented characters) they will differ.
> For example, the Korean string "테스트" is 3 characters but 9 UTF-8 bytes,
> so its indices span 9 rather than 3.
> When consuming these values in JavaScript (which uses UTF-16 string indexing),
> you must convert byte offsets to character offsets before using `String.prototype.slice()`.

## Best Practices

1. **Use Specific Queries**: Narrow down your search with qualifiers to get more
   relevant results
2. **Handle Rate Limits**: Implement proper rate limit handling (10
   requests/minute when authenticated)
3. **Pagination**: Use `per_page` and `page` parameters to navigate through
   large result sets (max 1,000 results total)
4. **Authentication**: Use a personal access token to increase rate limits and
   access private repositories
5. **Error Handling**: Handle 422 (validation errors) and 503 (service
   unavailable) responses gracefully
6. **Check `incomplete_results`**: Always check this field to know if results
   were truncated due to timeout
7. **Use Text Match Metadata**: Request text match metadata to highlight search
   terms in your UI
8. **Scope Your Search**: Use `repo:`, `user:`, or `org:` qualifiers to stay
   within the 4,000 repository limit

## Limitations

- **Results per page**: Maximum 100 results per page
- **Total results**: Maximum 1,000 results across all pages
- **Search scope**: Up to 4,000 repositories searched per query
- **Branch**: Only default branch is searched
- **File size**: Only files smaller than 384 KB are searchable
- **Rate limit**: 10 requests/minute (authenticated), 10 requests/minute
  (unauthenticated)
- **Query length**: Maximum 256 characters (excluding operators/qualifiers)
- **Operators**: Maximum 5 `AND`, `OR`, or `NOT` operators
- **Search term**: At least one search term required (qualifiers alone are
  invalid)
- **Timeouts**: Queries may timeout and return `incomplete_results: true`

## Related Documentation

- [GitHub Search API Documentation](https://docs.github.com/en/rest/search)
- [Searching Code on GitHub](https://docs.github.com/en/search-github/searching-on-github/searching-code)
- [Text Match Metadata](https://docs.github.com/en/rest/search#text-match-metadata)

---

_Last Updated: 2026-01-20_
