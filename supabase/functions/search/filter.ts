import { compileExpression } from "filtrex";
import type { RepositoryInfo } from "./types.ts";

/**
 * Safely evaluates a filter expression against repository data
 * Uses filtrex library to avoid eval() security issues
 *
 * @param filterExpression - User-provided filter expression (e.g., "stars > 100 && language == 'TypeScript'")
 * @param repo - Repository information to filter against
 * @returns true if the repository matches the filter, false otherwise
 */
export function evaluateFilter(
  filterExpression: string,
  repo: RepositoryInfo,
): boolean {
  if (!filterExpression || filterExpression.trim() === "") {
    return true; // No filter means all items pass
  }

  try {
    // Compile the filter expression
    const filterFn = compileExpression(filterExpression, {
      extraFunctions: {
        // Add custom functions if needed
      },
    });

    // Create a context object with repository fields
    const context = {
      // Statistics
      stars: repo.stargazers_count,
      watchers: repo.watchers_count,
      forks: repo.forks_count,
      issues: repo.open_issues_count,
      size: repo.size,
      subscribers: repo.subscribers_count,
      network: repo.network_count,

      // Metadata
      language: repo.language || "",
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || "",
      homepage: repo.homepage || "",
      license: repo.license?.spdx_id || "",
      default_branch: repo.default_branch,
      topics: repo.topics || [],

      // Status flags
      is_fork: repo.fork,
      is_private: repo.private,
      visibility: repo.visibility,
      archived: repo.archived,
      disabled: repo.disabled,
      is_template: repo.is_template,
      allow_forking: repo.allow_forking,

      // Feature flags
      has_issues: repo.has_issues,
      has_wiki: repo.has_wiki,
      has_pages: repo.has_pages,
      has_downloads: repo.has_downloads,
      has_discussions: repo.has_discussions,
      has_projects: repo.has_projects,

      // Dates (convert to timestamps for comparison)
      created_at: new Date(repo.created_at).getTime(),
      updated_at: new Date(repo.updated_at).getTime(),
      pushed_at: new Date(repo.pushed_at).getTime(),

      // Owner
      owner: repo.owner.login,
      owner_type: repo.owner.type,
    };

    // Evaluate the filter
    return Boolean(filterFn(context));
  } catch (error: unknown) {
    console.error("Filter evaluation error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // If filter is invalid, log error and return false
    throw new Error(`Invalid filter expression: ${errorMessage}`);
  }
}

/**
 * Validates a filter expression without evaluating it
 * Useful for checking syntax before processing
 */
export function validateFilter(filterExpression: string): {
  valid: boolean;
  error?: string;
} {
  if (!filterExpression || filterExpression.trim() === "") {
    return { valid: true };
  }

  try {
    compileExpression(filterExpression);
    return { valid: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      error: errorMessage,
    };
  }
}
