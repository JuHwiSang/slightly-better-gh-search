// Shared types for search API (frontend + backend)

export interface SearchResponse {
    items: SearchResultItem[];
    next_cursor: string | null;
    total_count: number;
    has_more: boolean;
    incomplete_results: boolean;
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
    text_matches?: TextMatch[];
}

export interface TextMatch {
    object_url: string;
    object_type: string;
    property: string;
    fragment: string;
    matches: Match[];
}

export interface Match {
    text: string;
    indices: [number, number];
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
