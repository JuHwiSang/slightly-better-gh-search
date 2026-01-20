// Type definitions for search functionality

export interface SearchRequest {
  query: string;
  filter?: string;
  cursor?: string | null; // Format: "{page}:{index}" e.g., "2:15"
  limit?: number;
}

export interface SearchResponse {
  items: SearchResultItem[];
  nextCursor: string | null; // Format: "{page}:{index}"
  totalCount: number;
  hasMore: boolean;
  incomplete_results: boolean; // True if GitHub API timed out
}

export interface SearchResultItem {
  name: string;
  path: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
  repository: RepositoryInfo;
  score: number;
  text_matches?: TextMatch[]; // Search term highlighting metadata
}

// Text match metadata for highlighting search terms
export interface TextMatch {
  object_url: string;
  object_type: string;
  property: string; // e.g., "body", "path"
  fragment: string; // Subset of property value containing matches
  matches: Match[];
}

export interface Match {
  text: string; // The matching search term
  indices: [number, number]; // [start, end] position in fragment
}

export interface RepositoryInfo {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  private: boolean;
  html_url: string;
  description: string;
  fork: boolean;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string;
  topics: string[];
  visibility: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubCodeSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubCodeSearchItem[];
}

export interface GitHubCodeSearchItem {
  name: string;
  path: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
      avatar_url: string;
      type: string;
    };
    private: boolean;
    html_url: string;
    description: string;
    fork: boolean;
  };
  score: number;
  text_matches?: TextMatch[]; // Available when Accept header includes text-match
}
