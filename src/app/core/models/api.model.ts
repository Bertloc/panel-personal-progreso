export type ApiPayload = Record<string, unknown>;
export type ApiResponse<T> = T | { data: T };

export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  return typeof response === 'object' && response !== null && 'data' in response
    ? response.data
    : response;
}
