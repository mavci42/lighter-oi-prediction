// src/lib/api.ts

// If we're on localhost (dev), talk to the same origin (/api/...)
// If we're on any other host (Vercel / Farcaster), always talk to the Render backend.
const API_BASE =
  window.location.hostname === "localhost"
    ? ""
    : "https://lighter-oi-prediction.onrender.com";

async function request<T = any>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const base = API_BASE.replace(/\/$/, "");
  const url = `${base}${path}`;

  const r = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!r.ok) {
    let msg = `${options?.method || "GET"} ${path} failed`;
    try {
      const j = await r.json();
      if ((j as any)?.message) msg = (j as any).message;
    } catch {
      // ignore JSON parse error
    }
    console.error("[API ERROR]", msg, "status=", r.status);
    throw new Error(msg);
  }

  return r.json();
}

export function apiGet<T = any>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T = any>(path: string, body: any): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
