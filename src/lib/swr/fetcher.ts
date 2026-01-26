export class FetchError extends Error {
  status: number;
  info?: unknown;

  constructor(message: string, status: number, info?: unknown) {
    super(message);
    this.status = status;
    this.info = info;
  }
}

export const createFetcher = (adminKey: string) => async (url: string) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${adminKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new FetchError(
      info.error || `API Error: ${res.status}`,
      res.status,
      info
    );
  }

  return res.json();
};

// POST/PUT/DELETE 请求的通用方法
export const createMutationFetcher = (adminKey: string) => async (
  url: string,
  { arg }: { arg: { method: 'POST' | 'PUT' | 'DELETE'; body?: unknown } }
) => {
  const res = await fetch(url, {
    method: arg.method,
    headers: {
      Authorization: `Bearer ${adminKey}`,
      'Content-Type': 'application/json',
    },
    body: arg.body ? JSON.stringify(arg.body) : undefined,
  });

  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new FetchError(
      info.error || `API Error: ${res.status}`,
      res.status,
      info
    );
  }

  // DELETE 可能返回空响应
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};
