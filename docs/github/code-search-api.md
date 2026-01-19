# GitHub Code Search API Documentation

## Overview

The GitHub Code Search API allows you to search for code across GitHub
repositories. This endpoint returns up to 100 results per page and supports text
match metadata for file content and file path fields.

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

The `q` parameter supports various qualifiers to refine your search:

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

## Best Practices

1. **Use Specific Queries**: Narrow down your search with qualifiers to get more
   relevant results
2. **Handle Rate Limits**: Implement proper rate limit handling (10
   requests/minute when authenticated)
3. **Pagination**: Use `per_page` and `page` parameters to navigate through
   large result sets
4. **Authentication**: Use a personal access token to increase rate limits and
   access private repositories
5. **Error Handling**: Handle 422 (validation errors) and 503 (service
   unavailable) responses gracefully

## Limitations

- Maximum 100 results per page
- Only default branch is searched
- File size limit: 384 KB
- Rate limit: 10 requests/minute (authenticated)
- At least one search term required

## Related Documentation

- [GitHub Search API Documentation](https://docs.github.com/en/rest/search)
- [Searching Code on GitHub](https://docs.github.com/en/search-github/searching-on-github/searching-code)
- [Text Match Metadata](https://docs.github.com/en/rest/search#text-match-metadata)

---

_Last Updated: 2026-01-09_
