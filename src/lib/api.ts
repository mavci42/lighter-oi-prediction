export async function apiGet<T=any>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`GET ${path} failed`);
  return r.json();
}

export async function apiPost<T=any>(path: string, body: any): Promise<T> {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    // return backend message if present
    let msg = `POST ${path} failed`;
    try { const j = await r.json(); if (j?.message) msg = j.message; } catch {}
    throw new Error(msg);
  }
  return r.json();
}
