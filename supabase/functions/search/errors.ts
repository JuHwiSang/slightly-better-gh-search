/**
 * Custom API Error class for Edge Functions
 *
 * Provides structured error handling with HTTP status codes.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
