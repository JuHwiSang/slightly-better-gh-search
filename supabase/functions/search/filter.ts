import { compileExpression } from "filtrex";
import type { RepositoryInfo } from "./types.ts";
import { ApiError } from "./errors.ts";

/**
 * Compiled filter engine for evaluating filter expressions against repositories.
 *
 * Compiles the expression once on construction and reuses it for every evaluate() call.
 * Uses filtrex library to avoid eval() security issues.
 *
 * @example
 * ```ts
 * const engine = new FilterEngine("stars > 100 && language == 'TypeScript'");
 * const passes = engine.evaluate(repoInfo); // true/false
 * ```
 */
export class FilterEngine {
  private readonly filterFn:
    | ((context: Record<string, unknown>) => unknown)
    | null;

  /**
   * Compile the filter expression.
   * Empty/blank expression → pass-through (all items match).
   * Invalid expression → throws ApiError(400).
   */
  constructor(filterExpression: string) {
    if (!filterExpression || filterExpression.trim() === "") {
      this.filterFn = null;
      return;
    }

    try {
      this.filterFn = compileExpression(filterExpression, {
        extraFunctions: {},
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      throw new ApiError(
        400,
        `Invalid filter expression: ${errorMessage}`,
      );
    }
  }

  /** Whether this engine has an active filter (non-empty expression). */
  get isActive(): boolean {
    return this.filterFn !== null;
  }

  /**
   * Evaluate the compiled filter against a repository.
   * Returns true if the repository matches (or no filter is active).
   * @throws {ApiError} 400 if evaluation fails at runtime.
   */
  evaluate(repo: RepositoryInfo): boolean {
    if (!this.filterFn) return true;

    try {
      const context = FilterEngine.buildContext(repo);
      return Boolean(this.filterFn(context));
    } catch (error: unknown) {
      console.error("Filter evaluation error:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      throw new ApiError(400, `Filter evaluation error: ${errorMessage}`);
    }
  }

  /**
   * Build the evaluation context from repository info.
   * Maps repository fields to user-friendly filter variable names.
   */
  private static buildContext(
    repo: RepositoryInfo,
  ): Record<string, unknown> {
    return {
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

      // Dates (timestamps for comparison)
      created_at: new Date(repo.created_at).getTime(),
      updated_at: new Date(repo.updated_at).getTime(),
      pushed_at: new Date(repo.pushed_at).getTime(),

      // Owner
      owner: repo.owner.login,
      owner_type: repo.owner.type,
    };
  }
}
