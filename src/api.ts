import { useCallback, useEffect, useState } from 'react';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, options: { method?: string; data?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const { method = 'GET', data, signal } = options;
  const response = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    signal,
    ...(data === undefined ? {} : data instanceof FormData ? { body: data } : { body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => null);
  if (!response.ok || result === null) {
    throw new ApiError(response.status, result?.error || 'Layanan sedang tidak tersedia. Coba lagi.');
  }
  return result as T;
}

export function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : 'Koneksi terputus. Coba lagi.';
}

export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [request, setRequest] = useState(0);
  const retry = useCallback(() => {
    setError('');
    setRequest((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal }).then(setData, (cause) => {
      if (!controller.signal.aborted) setError(errorText(cause));
    });
    return () => controller.abort();
  }, [path, request]);

  return { data, error, retry };
}
