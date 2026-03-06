import { config } from "./config.ts";

/**
 * Parsed cursor position.
 */
export interface CursorPosition {
    page: number;
    index: number;
}

/**
 * Cursor parsing, validation, normalization, and generation.
 *
 * Cursor format: "{page}:{index}" where:
 * - page: 1-based GitHub API page (1 to maxPage)
 * - index: 0-based item index within the page (0 to resultsPerPage-1)
 */
export class CursorManager {
    /**
     * Parse and validate cursor parameter.
     * @param cursor - Cursor string in format "page:index" or just "page" (backward compat)
     * @returns Validated cursor position, or null if invalid
     */
    static parse(cursor: string | null): CursorPosition | null {
        if (!cursor) {
            return null;
        }

        const parts = cursor.split(":");

        if (parts.length === 2) {
            // New format: "page:index"
            const page = parseInt(parts[0], 10);
            const index = parseInt(parts[1], 10);

            if (
                isNaN(page) || isNaN(index) ||
                page < 1 || page > config.github.maxPage ||
                index < 0 || index >= config.github.resultsPerPage
            ) {
                return null;
            }

            return { page, index };
        } else if (parts.length === 1) {
            // Backward compatibility: treat as page number only
            const page = parseInt(parts[0], 10);

            if (isNaN(page) || page < 1 || page > config.github.maxPage) {
                return null;
            }

            return { page, index: 0 };
        }

        return null;
    }

    /**
     * Normalize cursor position: if index overflows the page, advance to next page.
     */
    static normalize(pos: CursorPosition): CursorPosition {
        if (pos.index >= config.github.resultsPerPage) {
            return { page: pos.page + 1, index: 0 };
        }
        return pos;
    }

    /**
     * Build the next_cursor string for the response.
     * Returns null when there are no more results to fetch.
     */
    static buildNextCursor(params: {
        hasMore: boolean;
        filteredCount: number;
        limit: number;
        position: CursorPosition;
    }): string | null {
        const normalized = CursorManager.normalize(params.position);
        return (params.hasMore && params.filteredCount >= params.limit)
            ? `${normalized.page}:${normalized.index}`
            : null;
    }
}
