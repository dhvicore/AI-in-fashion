// Tiny client for the Divara backend (server/). All calls go to /api/*,
// which Vite proxies to the server in development.

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  signal ??= AbortSignal.timeout(15_000);
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (signal?.aborted) throw new ApiError(408, 'The request timed out or was cancelled. Please try again.');
    throw new ApiError(0, 'Can’t reach the Divara server. Is it running?');
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // The Vite proxy answers 500/502 with no JSON when the backend is down.
    const message = data?.error ?? (res.status >= 500 ? 'Can’t reach the Divara server. Is it running?' : `Request failed (${res.status})`);
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>('POST', path, body ?? {}, signal),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};

// Upload one image; resolves to its URL (e.g. /uploads/abc.png).
export async function uploadImage(file: File, source: 'photo' | 'camera' = 'photo'): Promise<string> {
  const signal = AbortSignal.timeout(45_000);
  // Check the session before streaming a large file through the dev proxy.
  await request('GET', '/auth/me', undefined, signal);
  const form = new FormData();
  form.append('image', file);
  form.append('source', source);
  const { upload } = await request<{ upload: { url: string } }>('POST', '/uploads', form, signal);
  return upload.url;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}
