# GitHub Repository API Documentation

## Overview

The GitHub Repository API allows you to retrieve detailed information about a
specific repository. This endpoint provides comprehensive metadata including
repository statistics, settings, owner information, and fork relationships.

## Endpoint

```
GET /repos/{owner}/{repo}
```

## Authentication

- **Required**: No (for public repositories)
- **Supported Token Types**:
  - GitHub App user access tokens
  - GitHub App installation access tokens
  - Fine-grained personal access tokens
- **Required Permissions**:
  - "Metadata" repository permissions (read)
  - Additional permissions required for certain fields:
    - `security_and_analysis`: Admin permissions or organization owner/security
      manager role
    - Merge-related settings: `contents:read` and `contents:write` permissions

## Parameters

### Headers

| Name                   | Type   | Description                                             |
| ---------------------- | ------ | ------------------------------------------------------- |
| `accept`               | string | Setting to `application/vnd.github+json` is recommended |
| `X-GitHub-Api-Version` | string | API version (e.g., `2022-11-28`)                        |

### Path Parameters

| Name    | Type   | Required | Description                                                       |
| ------- | ------ | -------- | ----------------------------------------------------------------- |
| `owner` | string | ✅ Yes   | The account owner of the repository (not case sensitive)          |
| `repo`  | string | ✅ Yes   | The repository name without `.git` extension (not case sensitive) |

## Response Format

### HTTP Status Codes

| Status Code | Description             |
| ----------- | ----------------------- |
| 200         | OK - Successful request |
| 301         | Moved permanently       |
| 403         | Forbidden               |
| 404         | Resource not found      |

### Response Body Structure

The response contains extensive repository metadata organized into several
categories:

#### Basic Information

**Access path**: `data`

| Field         | Type    | Description                       |
| ------------- | ------- | --------------------------------- |
| `id`          | integer | Repository ID                     |
| `node_id`     | string  | GraphQL node ID                   |
| `name`        | string  | Repository name                   |
| `full_name`   | string  | Full repository name (owner/repo) |
| `description` | string  | Repository description            |
| `private`     | boolean | Whether the repository is private |
| `fork`        | boolean | Whether the repository is a fork  |
| `url`         | string  | API URL for the repository        |
| `html_url`    | string  | Web URL for the repository        |
| `homepage`    | string  | Repository homepage URL           |

#### Owner Information

**Access path**: `data.owner`

| Field        | Type    | Description                          |
| ------------ | ------- | ------------------------------------ |
| `login`      | string  | Owner username                       |
| `id`         | integer | Owner user ID                        |
| `avatar_url` | string  | Owner avatar URL                     |
| `type`       | string  | Owner type: "User" or "Organization" |
| `site_admin` | boolean | Whether owner is a site admin        |

#### Statistics

**Access path**: `data`

| Field               | Type    | Description                           |
| ------------------- | ------- | ------------------------------------- |
| `stargazers_count`  | integer | Number of stars                       |
| `watchers_count`    | integer | Number of watchers                    |
| `watchers`          | integer | Number of watchers (duplicate)        |
| `forks_count`       | integer | Number of forks                       |
| `forks`             | integer | Number of forks (duplicate)           |
| `open_issues_count` | integer | Number of open issues                 |
| `open_issues`       | integer | Number of open issues (duplicate)     |
| `size`              | integer | Repository size in KB                 |
| `subscribers_count` | integer | Number of subscribers                 |
| `network_count`     | integer | Number of repositories in the network |

#### Repository Settings

**Access path**: `data`

| Field             | Type    | Description                                               |
| ----------------- | ------- | --------------------------------------------------------- |
| `default_branch`  | string  | Default branch name (e.g., "master", "main")              |
| `visibility`      | string  | Repository visibility: "public", "private", or "internal" |
| `archived`        | boolean | Whether the repository is archived                        |
| `disabled`        | boolean | Whether the repository is disabled                        |
| `is_template`     | boolean | Whether the repository is a template                      |
| `has_issues`      | boolean | Whether issues are enabled                                |
| `has_projects`    | boolean | Whether projects are enabled                              |
| `has_wiki`        | boolean | Whether wiki is enabled                                   |
| `has_pages`       | boolean | Whether GitHub Pages is enabled                           |
| `has_downloads`   | boolean | Whether downloads are enabled                             |
| `has_discussions` | boolean | Whether discussions are enabled                           |

#### Merge Settings

**Access path**: `data`

| Field                    | Type    | Description                           |
| ------------------------ | ------- | ------------------------------------- |
| `allow_rebase_merge`     | boolean | Whether rebase merging is allowed     |
| `allow_squash_merge`     | boolean | Whether squash merging is allowed     |
| `allow_merge_commit`     | boolean | Whether merge commits are allowed     |
| `allow_auto_merge`       | boolean | Whether auto-merge is allowed         |
| `delete_branch_on_merge` | boolean | Whether branches are deleted on merge |
| `allow_forking`          | boolean | Whether forking is allowed            |

#### Timestamps

**Access path**: `data`

| Field        | Type   | Description                       |
| ------------ | ------ | --------------------------------- |
| `created_at` | string | ISO 8601 timestamp of creation    |
| `updated_at` | string | ISO 8601 timestamp of last update |
| `pushed_at`  | string | ISO 8601 timestamp of last push   |

#### Additional Metadata

**Access path**: `data`

| Field              | Type   | Description                          |
| ------------------ | ------ | ------------------------------------ |
| `topics`           | array  | Array of topic strings               |
| `language`         | string | Primary programming language         |
| `license`          | object | License information (see below)      |
| `permissions`      | object | User permissions (admin, push, pull) |
| `organization`     | object | Organization details (if applicable) |
| `temp_clone_token` | string | Temporary clone token                |

#### License Object

**Access path**: `data.license`

| Field      | Type   | Description                        |
| ---------- | ------ | ---------------------------------- |
| `key`      | string | License key (e.g., "mit")          |
| `name`     | string | License name (e.g., "MIT License") |
| `spdx_id`  | string | SPDX identifier                    |
| `url`      | string | API URL for license details        |
| `node_id`  | string | GraphQL node ID                    |
| `html_url` | string | Web URL for license details        |

#### Fork Relationships

> **Note**: The `parent` and `source` objects are only present when the
> repository is a fork.

| Field    | Type   | Description                                    |
| -------- | ------ | ---------------------------------------------- |
| `parent` | object | Direct parent repository (if forked)           |
| `source` | object | Ultimate source repository in the fork network |

Both `parent` and `source` objects contain the same structure as the main
repository object.

#### Template Repository

| Field                 | Type   | Description                                            |
| --------------------- | ------ | ------------------------------------------------------ |
| `template_repository` | object | Template repository details (if created from template) |

The `template_repository` object contains the same structure as the main
repository object.

#### Security and Analysis

> **Note**: Requires admin permissions or organization owner/security manager
> role.

**Access path**: `data.security_and_analysis`

| Field                                   | Type   | Description                          |
| --------------------------------------- | ------ | ------------------------------------ |
| `advanced_security`                     | object | Advanced security status             |
| `secret_scanning`                       | object | Secret scanning status               |
| `secret_scanning_push_protection`       | object | Push protection status               |
| `secret_scanning_non_provider_patterns` | object | Non-provider pattern scanning status |

Each security feature object contains a `status` field with values: "enabled" or
"disabled".

#### API Resource URLs

The response includes numerous URL templates for accessing related resources:

- `archive_url` - Download repository archives
- `assignees_url` - Issue assignees
- `blobs_url` - Git blobs
- `branches_url` - Repository branches
- `collaborators_url` - Repository collaborators
- `comments_url` - Commit comments
- `commits_url` - Repository commits
- `compare_url` - Compare commits
- `contents_url` - Repository contents
- `contributors_url` - Repository contributors
- `deployments_url` - Deployments
- `downloads_url` - Downloads
- `events_url` - Repository events
- `forks_url` - Repository forks
- `git_commits_url` - Git commits
- `git_refs_url` - Git references
- `git_tags_url` - Git tags
- `hooks_url` - Webhooks
- `issue_comment_url` - Issue comments
- `issue_events_url` - Issue events
- `issues_url` - Issues
- `keys_url` - Deploy keys
- `labels_url` - Issue labels
- `languages_url` - Repository languages
- `merges_url` - Merges
- `milestones_url` - Milestones
- `notifications_url` - Notifications
- `pulls_url` - Pull requests
- `releases_url` - Releases
- `stargazers_url` - Stargazers
- `statuses_url` - Commit statuses
- `subscribers_url` - Subscribers
- `subscription_url` - Subscription
- `tags_url` - Tags
- `teams_url` - Teams
- `trees_url` - Git trees

#### Clone URLs

**Access path**: `data`

| Field        | Type   | Description                |
| ------------ | ------ | -------------------------- |
| `clone_url`  | string | HTTPS clone URL            |
| `git_url`    | string | Git protocol URL           |
| `ssh_url`    | string | SSH clone URL              |
| `svn_url`    | string | SVN URL                    |
| `mirror_url` | string | Mirror URL (if applicable) |

## Usage Example (Octokit.js)

```javascript
// Octokit.js
// https://github.com/octokit/core.js#readme
const octokit = new Octokit({
  auth: "YOUR-TOKEN", // Optional for public repos
});

const response = await octokit.request("GET /repos/{owner}/{repo}", {
  owner: "octocat",
  repo: "Hello-World",
  headers: {
    "X-GitHub-Api-Version": "2022-11-28",
  },
});

console.log(`Repository: ${response.data.full_name}`);
console.log(`Stars: ${response.data.stargazers_count}`);
console.log(`Forks: ${response.data.forks_count}`);
console.log(`Language: ${response.data.language}`);
console.log(`Description: ${response.data.description}`);

// Check if it's a fork
if (response.data.fork) {
  console.log(`Forked from: ${response.data.parent.full_name}`);
  console.log(`Original source: ${response.data.source.full_name}`);
}

// Access license information
if (response.data.license) {
  console.log(`License: ${response.data.license.name}`);
}
```

## Response Example

```json
{
  "id": 1296269,
  "node_id": "MDEwOlJlcG9zaXRvcnkxMjk2MjY5",
  "name": "Hello-World",
  "full_name": "octocat/Hello-World",
  "owner": {
    "login": "octocat",
    "id": 1,
    "type": "User",
    "site_admin": false
  },
  "private": false,
  "html_url": "https://github.com/octocat/Hello-World",
  "description": "This your first repo!",
  "fork": false,
  "stargazers_count": 80,
  "watchers_count": 80,
  "forks_count": 9,
  "open_issues_count": 0,
  "default_branch": "master",
  "topics": ["octocat", "atom", "electron", "api"],
  "visibility": "public",
  "license": {
    "key": "mit",
    "name": "MIT License",
    "spdx_id": "MIT",
    "url": "https://api.github.com/licenses/mit"
  }
}
```

## Use Cases

### 1. Display Repository Statistics

Fetch repository metadata to display stars, forks, and other statistics in your
application.

```javascript
const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
  owner: "jquery",
  repo: "jquery",
});

// Use data.stargazers_count, data.forks_count, etc.
```

### 2. Check Repository Settings

Determine if a repository has certain features enabled.

```javascript
const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
  owner: "owner",
  repo: "repo",
});

if (data.has_issues) {
  // Issues are enabled
}

if (data.is_template) {
  // This is a template repository
}
```

### 3. Analyze Fork Relationships

Trace the fork network to find the original source repository.

```javascript
const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
  owner: "forked-owner",
  repo: "forked-repo",
});

if (data.fork) {
  console.log(`Direct parent: ${data.parent.full_name}`);
  console.log(`Original source: ${data.source.full_name}`);
}
```

### 4. Filter by Programming Language

Use the language field to filter repositories by their primary language.

```javascript
const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
  owner: "owner",
  repo: "repo",
});

if (data.language === "JavaScript") {
  // This is primarily a JavaScript repository
}
```

## Best Practices

1. **Cache Repository Data**: Repository metadata doesn't change frequently, so
   implement caching to reduce API calls
2. **Handle 404 Errors**: Always handle cases where repositories might not exist
   or have been deleted
3. **Check Permissions**: Be aware that some fields require specific permissions
   to view
4. **Use Conditional Requests**: Use ETags and `If-None-Match` headers to avoid
   unnecessary data transfer
5. **Respect Rate Limits**: Implement proper rate limit handling for your
   application
6. **Parse Fork Relationships**: Check the `fork` boolean before accessing
   `parent` or `source` objects

## Common Patterns

### Filtering Repositories for Search Results

When displaying code search results, you can fetch repository details to enable
additional filtering:

```javascript
// After getting code search results
const repositories = new Map();

for (const item of searchResults.items) {
  const repoFullName = item.repository.full_name;

  if (!repositories.has(repoFullName)) {
    const [owner, repo] = repoFullName.split("/");
    const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
      owner,
      repo,
    });
    repositories.set(repoFullName, data);
  }
}

// Now filter by stars, language, etc.
const filtered = Array.from(repositories.values()).filter((repo) =>
  repo.stargazers_count > 100 && repo.language === "JavaScript"
);
```

## Limitations

- **Rate Limits**: Subject to GitHub API rate limits (5,000 requests/hour for
  authenticated requests)
- **Permission-Based Fields**: Some fields require specific permissions to view
- **Public vs Private**: Authentication required for private repositories
- **Fork Depth**: The API only provides direct `parent` and ultimate `source`,
  not the full fork chain

## Related Documentation

- [GitHub Repositories API Documentation](https://docs.github.com/en/rest/repos/repos)
- [Repository Permissions](https://docs.github.com/en/rest/overview/permissions-required-for-fine-grained-personal-access-tokens)
- [Rate Limiting](https://docs.github.com/en/rest/overview/rate-limits-for-the-rest-api)

---

_Last Updated: 2026-01-09_
