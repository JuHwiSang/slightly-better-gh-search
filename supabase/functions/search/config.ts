/**
 * Configuration class for the Search Edge Function
 * Centralizes all settings and provides validation
 */
export class SearchConfig {
  // GitHub API 설정
  readonly github: {
    readonly resultsPerPage: number;
    readonly maxPage: number;
  };

  // 검색 제한 설정
  readonly search: {
    readonly maxPagesToFetch: number;
    readonly maxLimit: number;
    readonly defaultLimit: number;
  };

  // Redis 설정
  readonly redis: {
    readonly url: string | null;
    readonly token: string | null;
    readonly ttl: {
      readonly codeSearch: number;
      readonly repository: number;
    };
  };

  // Supabase 설정
  readonly supabase: {
    readonly url: string;
    readonly anonKey: string;
    readonly serviceRoleKey: string;
  };

  // CORS 설정
  readonly cors: {
    readonly allowedOrigins: string[];
  };

  constructor() {
    // GitHub 설정 (상수)
    this.github = {
      resultsPerPage: 100, // GitHub API maximum
      maxPage: 10, // GitHub Code Search limit (1000 results / 100 per page)
    };

    // 검색 설정 (상수)
    this.search = {
      maxPagesToFetch: 3, // Limit to avoid excessive API calls
      maxLimit: 30, // Maximum number of results per request
      defaultLimit: 30, // Default limit if not specified
    };

    // Redis 설정 (환경변수 + validation)
    this.redis = {
      url: this.getRedisUrl(),
      token: this.getRedisToken(),
      ttl: {
        codeSearch: this.validateTTL(
          Deno.env.get("REDIS_CODE_SEARCH_TTL"),
          3600,
          "REDIS_CODE_SEARCH_TTL",
        ),
        repository: this.validateTTL(
          Deno.env.get("REDIS_REPOSITORY_TTL"),
          86400,
          "REDIS_REPOSITORY_TTL",
        ),
      },
    };

    this.supabase = {
      url: this.validateRequired(
        Deno.env.get("SUPABASE_URL"),
        "SUPABASE_URL",
      ),
      anonKey: this.validateRequired(
        Deno.env.get("SUPABASE_ANON_KEY"),
        "SUPABASE_ANON_KEY",
      ),
      serviceRoleKey: this.validateRequired(
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), // Auto-provided by runtime
        "SUPABASE_SERVICE_ROLE_KEY",
      ),
    };

    // CORS 설정 (환경변수)
    this.cors = {
      allowedOrigins: this.parseAllowedOrigins(),
    };
  }

  // ========== Validation Methods ==========

  /**
   * Validate required environment variable
   * @throws Error if value is missing or empty
   */
  private validateRequired(value: string | undefined, name: string): string {
    if (!value || value.trim() === "") {
      throw new Error(`${name} environment variable is required`);
    }
    return value;
  }

  /**
   * Validate TTL value
   * @param value - Environment variable value
   * @param defaultValue - Default TTL in seconds
   * @param name - Environment variable name for error messages
   * @returns Validated TTL value
   * @throws Error if value is invalid
   */
  private validateTTL(
    value: string | undefined,
    defaultValue: number,
    name: string,
  ): number {
    if (!value) {
      return defaultValue;
    }

    const parsed = parseInt(value, 10);

    if (isNaN(parsed)) {
      throw new Error(`${name} must be a valid number, got: ${value}`);
    }

    if (parsed < 0) {
      throw new Error(`${name} must be non-negative, got: ${parsed}`);
    }

    return parsed;
  }

  /**
   * Get Redis URL from environment
   * @returns Redis URL or null if not configured
   */
  private getRedisUrl(): string | null {
    return Deno.env.get("UPSTASH_REDIS_REST_URL") || null;
  }

  /**
   * Get Redis token from environment
   * @returns Redis token or null if not configured
   */
  private getRedisToken(): string | null {
    return Deno.env.get("UPSTASH_REDIS_REST_TOKEN") || null;
  }

  /**
   * Parse allowed origins from environment
   * @returns Array of allowed origins
   */
  private parseAllowedOrigins(): string[] {
    const allowedOriginsEnv = Deno.env.get("ALLOWED_ORIGINS");
    if (!allowedOriginsEnv) {
      return [];
    }

    return allowedOriginsEnv
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  // ========== Helper Methods ==========

  /**
   * Check if Redis is properly configured
   */
  get isRedisEnabled(): boolean {
    return this.redis.url !== null && this.redis.token !== null;
  }

  /**
   * Check if CORS is enabled
   */
  get isCorsEnabled(): boolean {
    return this.cors.allowedOrigins.length > 0;
  }
}

// Singleton instance - initialized once and reused
export const config = new SearchConfig();
